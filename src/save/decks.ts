/**
 * Deck-slot helpers: validation (rules + ownership), mana curve, auto-fill and
 * shareable deck codes. Pure (no Phaser).
 */
import type { GameContent } from '../engine/content';
import { maxCopiesFor, validateDeck } from '../engine/deck';
import { countLandscapesIn } from '../engine/requirements';
import { hashString } from '../engine/rng';
import {
  LANDSCAPE_TYPES,
  type CardDef,
  type DeckList,
  type LandscapeType,
  type RulesContext,
} from '../engine/types';
import { ownedCount } from './collection';
import type { DeckSlot, SaveData } from './saveData';

export function deckSize(slot: DeckSlot): number {
  return Object.values(slot.cards).reduce((a, b) => a + b, 0);
}

export function slotToDeckList(slot: DeckSlot): DeckList {
  const cards: string[] = [];
  for (const [id, n] of Object.entries(slot.cards)) for (let i = 0; i < n; i++) cards.push(id);
  return { id: slot.id, name: slot.name, heroId: slot.heroId, landscapes: [...slot.landscapes], cards };
}

/** Engine deck list with this player's card levels from the collection. */
export function slotToLeveledDeckList(slot: DeckSlot, save: SaveData): DeckList {
  const list = slotToDeckList(slot);
  const levels: Record<string, number> = {};
  for (const id of Object.keys(slot.cards)) {
    const lvl = save.collection[id]?.level ?? 1;
    if (lvl > 1) levels[id] = lvl;
  }
  return { ...list, levels };
}

export function castable(card: CardDef, landscapes: readonly LandscapeType[]): boolean {
  return card.requirements.every((r) => countLandscapesIn(landscapes, r.landscape) >= r.count);
}

export interface DeckIssues {
  /** Problems that make the deck unplayable. */
  errors: string[];
  /** Legal but probably a mistake (e.g. cards your landscapes can't cast). */
  warnings: string[];
}

export function deckIssues(slot: DeckSlot, save: SaveData, ctx: RulesContext): DeckIssues {
  const errors = validateDeck(slotToDeckList(slot), ctx);
  const warnings: string[] = [];
  for (const [id, n] of Object.entries(slot.cards)) {
    const card = ctx.cards.byId.get(id);
    if (!card) continue;
    const owned = ownedCount(save, id);
    if (n > owned) errors.push(`${card.name}: you own ${owned}, the deck uses ${n}.`);
    if (!castable(card, slot.landscapes)) {
      const need = card.requirements.map((r) => `${r.count} ${r.landscape}`).join(', ');
      warnings.push(`${card.name} needs ${need} — your landscapes can't cast it.`);
    }
  }
  return { errors, warnings };
}

export function isPlayable(slot: DeckSlot, save: SaveData, ctx: RulesContext): boolean {
  return deckIssues(slot, save, ctx).errors.length === 0;
}

/** Card counts per cost: index 0..5, index 6 = 6 or more. */
export function manaCurve(slot: DeckSlot, ctx: RulesContext): number[] {
  const curve = [0, 0, 0, 0, 0, 0, 0];
  for (const [id, n] of Object.entries(slot.cards)) {
    const card = ctx.cards.byId.get(id);
    if (card) curve[Math.min(6, card.cost)]! += n;
  }
  return curve;
}

/** Why a card can't be added (null = it can). */
export function canAdd(slot: DeckSlot, cardId: string, save: SaveData, ctx: RulesContext): string | null {
  const card = ctx.cards.byId.get(cardId);
  if (!card || card.token) return 'That card cannot go in a deck.';
  if (deckSize(slot) >= ctx.balance.deckSize) return `The deck already has ${ctx.balance.deckSize} cards.`;
  const inDeck = slot.cards[cardId] ?? 0;
  const max = maxCopiesFor(card.rarity, ctx.balance);
  if (inDeck >= max) return `Max ${max} ${max === 1 ? 'copy' : 'copies'} of a ${card.rarity} card.`;
  if (inDeck >= ownedCount(save, cardId)) return `You only own ${ownedCount(save, cardId)}.`;
  return null;
}

export function addCard(slot: DeckSlot, cardId: string, now: number): DeckSlot {
  return { ...slot, cards: { ...slot.cards, [cardId]: (slot.cards[cardId] ?? 0) + 1 }, updatedAt: now };
}

export function removeCard(slot: DeckSlot, cardId: string, now: number): DeckSlot {
  const cards = { ...slot.cards };
  const n = (cards[cardId] ?? 0) - 1;
  if (n > 0) cards[cardId] = n;
  else delete cards[cardId];
  return { ...slot, cards, updatedAt: now };
}

/** Ideal share of each cost bucket (0..6+) for a 40-card deck. */
const TARGET_CURVE = [0, 6, 9, 9, 7, 5, 4];

/**
 * Fills the deck up to 40 with owned cards the deck's landscapes can cast,
 * filling the most under-represented cost buckets first and preferring
 * creatures (about 60%). Deterministic.
 */
export function autoFill(slot: DeckSlot, save: SaveData, ctx: RulesContext, now: number): DeckSlot {
  let deck = { ...slot, cards: { ...slot.cards } };
  const pool = ctx.cards.all
    .filter((c) => !c.token && ownedCount(save, c.id) > 0 && castable(c, slot.landscapes))
    .sort((a, b) => {
      // Prefer on-theme cards (not neutral), then higher rarity, then id for stability.
      const theme = Number(b.landscape !== 'neutral') - Number(a.landscape !== 'neutral');
      return theme || b.requirements.length - a.requirements.length || a.id.localeCompare(b.id);
    });
  const size = ctx.balance.deckSize;
  for (let guard = 0; guard < size * 4 && deckSize(deck) < size; guard++) {
    const curve = manaCurve(deck, ctx);
    const creatures = Object.entries(deck.cards).reduce(
      (n, [id, c]) => n + (ctx.cards.byId.get(id)?.type === 'creature' ? c : 0),
      0,
    );
    const wantCreature = creatures < deckSize(deck) * 0.6 + 1;
    let best: CardDef | null = null;
    let bestScore = -Infinity;
    for (const card of pool) {
      if (canAdd(deck, card.id, save, ctx)) continue;
      const bucket = Math.min(6, card.cost);
      const deficit = TARGET_CURVE[bucket]! - curve[bucket]!;
      const score = deficit * 2 + ((card.type === 'creature') === wantCreature ? 3 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = card;
      }
    }
    if (!best) break;
    deck = addCard(deck, best.id, now);
  }
  return { ...deck, updatedAt: now };
}

// ---------------------------------------------------------------------------
// Deck codes: "CC1-" + base64url( [version][hero:2][landscapes:2][n][count,card:2]*n [checksum] )
// Cards and heroes are identified by a 16-bit hash of their id, so adding new
// cards never changes existing codes (a test guards against hash collisions).
// ---------------------------------------------------------------------------

const CODE_PREFIX = 'CC1-';
const CODE_VERSION = 2;

/** 24-bit code for a card or hero id (wide enough that 470+ ids never collide; a test checks). */
export function idCode(id: string): number {
  return hashString(`code:${id}`) & 0xffffff;
}

function toBase64Url(bytes: number[]): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): number[] {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  const bin = atob(b64);
  return Array.from(bin, (ch) => ch.charCodeAt(0));
}

export function encodeDeck(slot: Pick<DeckSlot, 'heroId' | 'landscapes' | 'cards'>): string {
  const bytes: number[] = [CODE_VERSION];
  const hero = idCode(slot.heroId);
  bytes.push(hero >> 16, (hero >> 8) & 0xff, hero & 0xff);
  const l = slot.landscapes.map((x) => LANDSCAPE_TYPES.indexOf(x));
  bytes.push(((l[0]! & 0xf) << 4) | (l[1]! & 0xf), ((l[2]! & 0xf) << 4) | (l[3]! & 0xf));
  const entries = Object.entries(slot.cards)
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  bytes.push(entries.length);
  for (const [id, n] of entries) {
    const code = idCode(id);
    bytes.push(n, code >> 16, (code >> 8) & 0xff, code & 0xff);
  }
  bytes.push(bytes.reduce((s, b) => (s + b) & 0xff, 0));
  return CODE_PREFIX + toBase64Url(bytes);
}

export type DecodeResult =
  | { ok: true; heroId: string; landscapes: LandscapeType[]; cards: Record<string, number> }
  | { ok: false; error: string };

export function decodeDeck(code: string, content: GameContent): DecodeResult {
  const trimmed = code.trim();
  if (!trimmed.startsWith(CODE_PREFIX)) return { ok: false, error: 'Deck codes start with "CC1-".' };
  let bytes: number[];
  try {
    bytes = fromBase64Url(trimmed.slice(CODE_PREFIX.length));
  } catch {
    return { ok: false, error: 'That deck code is damaged.' };
  }
  if (bytes.length < 8) return { ok: false, error: 'That deck code is too short.' };
  const checksum = bytes.pop()!;
  if (bytes.reduce((s, b) => (s + b) & 0xff, 0) !== checksum)
    return { ok: false, error: 'That deck code is damaged (checksum).' };
  if (bytes[0] !== CODE_VERSION)
    return { ok: false, error: 'That deck code is from a different game version.' };
  const heroCode = (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!;
  const hero = content.ctx.heroes.all.find((h) => !h.boss && idCode(h.id) === heroCode);
  if (!hero) return { ok: false, error: 'Unknown hero in deck code.' };
  const lIdx = [bytes[4]! >> 4, bytes[4]! & 0xf, bytes[5]! >> 4, bytes[5]! & 0xf];
  if (lIdx.some((i) => i >= LANDSCAPE_TYPES.length))
    return { ok: false, error: 'Unknown landscape in deck code.' };
  const n = bytes[6]!;
  if (bytes.length !== 7 + n * 4) return { ok: false, error: 'That deck code is damaged (length).' };
  const byCode = new Map(content.ctx.cards.all.filter((c) => !c.token).map((c) => [idCode(c.id), c.id]));
  const cards: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const at = 7 + i * 4;
    const count = bytes[at]!;
    const id = byCode.get((bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!);
    if (!id) return { ok: false, error: 'The deck code contains a card this version does not have.' };
    cards[id] = count;
  }
  return {
    ok: true,
    heroId: hero.id,
    landscapes: lIdx.map((i) => LANDSCAPE_TYPES[i]!) as LandscapeType[],
    cards,
  };
}
