/**
 * Player save file: versioned JSON with step-by-step migrations and repair of
 * invalid entries. Pure (no Phaser, no storage) so it is fully unit-tested.
 */
import economy from '../data/economy.json';
import type { GameContent } from '../engine/content';
import { maxCopiesFor } from '../engine/deck';
import { LANDSCAPE_TYPES, type LandscapeType } from '../engine/types';

export const SAVE_VERSION = 6;

/** Card back styles (cosmetic; unlock rules live in progression.json). */
export const CARD_BACK_IDS = ['classic', 'starry', 'checker'] as const;

/** Lifetime counters (quests and achievements read these). */
export const STAT_KEYS = [
  'matches',
  'wins',
  'losses',
  'draws',
  'creaturesPlayed',
  'spellsCast',
  'heroDamage',
  'creaturesDestroyed',
  'ultimatesUsed',
  'floops',
  'chestsOpened',
  'cardsOpened',
] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type StatCounters = Record<StatKey, number>;

export function emptyStats(): StatCounters {
  return Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as StatCounters;
}

export const CHEST_TYPES = ['wooden', 'silver', 'golden', 'magic'] as const;
export type ChestType = (typeof CHEST_TYPES)[number];

export interface ChestSlot {
  type: ChestType;
  /** When unlocking started (ms), or null while waiting. Only one chest unlocks at a time. */
  unlockStartedAt: number | null;
}

export interface QuestState {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface OwnedCard {
  count: number;
  level: number;
}

export interface DeckSlot {
  id: string;
  name: string;
  heroId: string;
  landscapes: LandscapeType[];
  /** cardId → copies */
  cards: Record<string, number>;
  updatedAt: number;
}

/** A deck carried by a mode run (gauntlet / draft), independent of the deck slots. */
export interface RunDeck {
  name: string;
  heroId: string;
  landscapes: LandscapeType[];
  cards: string[];
  levels?: Record<string, number>;
}

export interface GauntletRun {
  seed: string;
  deck: RunDeck;
  /** Hero HP carried into the next battle. */
  hp: number;
  wins: number;
  /** True after a loss or after the last battle; rewards are claimed from the hub. */
  over: boolean;
}

export type DraftStage = 'hero' | 'landscape' | 'cards' | 'battles';

export interface DraftRun {
  seed: string;
  stage: DraftStage;
  heroOffer: string[];
  heroId: string | null;
  landscapeOffer: LandscapeType[];
  landscapes: LandscapeType[];
  /** The three cards currently offered (stage 'cards'). */
  offer: string[];
  picks: string[];
  wins: number;
  losses: number;
}

export interface ModeState {
  daily: { day: string | null; won: boolean; attempts: number };
  gauntlet: GauntletRun | null;
  draft: DraftRun | null;
}

export function emptyModeState(): ModeState {
  return { daily: { day: null, won: false, attempts: 0 }, gauntlet: null, draft: null };
}

export interface Currencies {
  coins: number;
  gems: number;
  dust: number;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  createdAt: number;
  updatedAt: number;
  /** `avatar` is a hero id (playable or boss); `cardBack` one of CARD_BACK_IDS. */
  profile: { name: string; avatar: string; cardBack: string };
  currencies: Currencies;
  collection: Record<string, OwnedCard>;
  decks: (DeckSlot | null)[];
  /** Slot used by default when starting a match. */
  selectedDeck: number;
  progression: { xp: number; level: number };
  chests: { slots: (ChestSlot | null)[]; freeReadyAt: number };
  /** lastClaimDay is a local calendar day 'YYYY-MM-DD'; streakIndex is the next login reward (0..6). */
  login: { lastClaimDay: string | null; streakIndex: number };
  quests: { day: string | null; active: QuestState[] };
  achievements: { claimed: string[] };
  lifetime: StatCounters;
  /** Best stars per campaign node id (1..3), and region stories already shown. */
  campaign: { stars: Record<string, number>; storySeen: string[] };
  /** Completed tutorial lessons, and whether the first-launch tutorial prompt was shown. */
  tutorial: { done: string[]; offered: boolean };
  modes: ModeState;
}

function starterCollection(content: GameContent): Record<string, OwnedCard> {
  const out: Record<string, OwnedCard> = {};
  for (const deck of content.starterDecks) {
    const counts = new Map<string, number>();
    for (const id of deck.cards) counts.set(id, (counts.get(id) ?? 0) + 1);
    for (const [id, n] of counts) out[id] = { count: Math.max(out[id]?.count ?? 0, n), level: 1 };
  }
  return out;
}

export function deckSlotFromList(
  id: string,
  name: string,
  heroId: string,
  landscapes: LandscapeType[],
  cards: readonly string[],
  now: number,
): DeckSlot {
  const counts: Record<string, number> = {};
  for (const c of cards) counts[c] = (counts[c] ?? 0) + 1;
  return { id, name, heroId, landscapes: [...landscapes], cards: counts, updatedAt: now };
}

/** A brand-new player: every starter-deck card, starting currencies, 3 starter decks in slots. */
export function createNewSave(content: GameContent, now: number): SaveData {
  const decks: (DeckSlot | null)[] = Array.from({ length: economy.deckSlots }, () => null);
  content.starterDecks.slice(0, 3).forEach((d, i) => {
    decks[i] = deckSlotFromList(`deck-${i + 1}`, d.name, d.heroId, d.landscapes, d.cards, now);
  });
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    profile: { name: 'Player', avatar: 'finn', cardBack: 'classic' },
    currencies: { ...economy.startingCurrencies },
    collection: starterCollection(content),
    decks,
    selectedDeck: 0,
    progression: { xp: 0, level: 1 },
    chests: { slots: [null, null, null, null], freeReadyAt: 0 },
    login: { lastClaimDay: null, streakIndex: 0 },
    quests: { day: null, active: [] },
    achievements: { claimed: [] },
    lifetime: emptyStats(),
    campaign: { stars: {}, storySeen: [] },
    tutorial: { done: [], offered: false },
    modes: emptyModeState(),
  };
}

// ---------------------------------------------------------------------------
// Migrations: each step upgrades from version N to N+1.
// ---------------------------------------------------------------------------

type AnySave = Record<string, unknown> & { version?: unknown };

const MIGRATIONS: Record<number, (s: AnySave) => AnySave> = {
  /**
   * v0 → v1: the pre-release prototype stored `cards: { id: count }` and a
   * single `deck` array. Kept as the reference example for future migrations.
   */
  0: (s) => {
    const cards = (s.cards ?? {}) as Record<string, number>;
    const collection: Record<string, OwnedCard> = {};
    for (const [id, count] of Object.entries(cards)) collection[id] = { count, level: 1 };
    const decks: (DeckSlot | null)[] = Array.from({ length: economy.deckSlots }, () => null);
    const legacyDeck = s.deck as
      { heroId?: string; landscapes?: LandscapeType[]; cards?: string[] } | undefined;
    if (legacyDeck?.cards) {
      decks[0] = deckSlotFromList(
        'deck-1',
        'My Deck',
        legacyDeck.heroId ?? 'finn',
        legacyDeck.landscapes ?? ['golden', 'golden', 'golden', 'golden'],
        legacyDeck.cards,
        0,
      );
    }
    return {
      version: 1,
      createdAt: 0,
      updatedAt: 0,
      profile: { name: typeof s.name === 'string' ? s.name : 'Player' },
      currencies: { coins: Number(s.coins ?? 0), gems: 0, dust: 0 },
      collection,
      decks,
      selectedDeck: 0,
      stats: { matchesPlayed: 0, wins: 0, losses: 0 },
    };
  },
  /** v1 → v2: progression, chests, login, quests, achievements; stats become lifetime counters. */
  1: (s) => {
    const old = (s.stats ?? {}) as { matchesPlayed?: number; wins?: number; losses?: number };
    const { stats: _stats, ...rest } = s;
    return {
      ...rest,
      version: 2,
      progression: { xp: 0, level: 1 },
      chests: { slots: [null, null, null, null], freeReadyAt: 0 },
      login: { lastClaimDay: null, streakIndex: 0 },
      quests: { day: null, active: [] },
      achievements: { claimed: [] },
      lifetime: {
        ...emptyStats(),
        matches: old.matchesPlayed ?? 0,
        wins: old.wins ?? 0,
        losses: old.losses ?? 0,
      },
    };
  },
  /** v2 → v3: campaign stars and tutorial progress. Existing players are not prompted for the tutorial. */
  2: (s) => ({
    ...s,
    version: 3,
    campaign: { stars: {}, storySeen: [] },
    tutorial: { done: [], offered: true },
  }),
  /** v3 → v4: daily dungeon, gauntlet and draft runs. */
  3: (s) => ({ ...s, version: 4, modes: emptyModeState() }),
  /** v4 → v5: profile avatar and card back. */
  4: (s) => ({
    ...s,
    version: 5,
    profile: { ...((s.profile ?? {}) as object), avatar: 'finn', cardBack: 'classic' },
  }),
  /**
   * v5 → v6: the card pool was replaced. Old cards become Dust (per copy, by
   * level), decks are cleared (repair puts the new starter decks in), and the
   * avatar resets because the old heroes are gone.
   */
  5: (s) => {
    let copies = 0;
    for (const v of Object.values((s.collection ?? {}) as Record<string, Partial<OwnedCard>>)) {
      copies += nonNegInt(v?.count) * Math.max(1, nonNegInt(v?.level, 1));
    }
    const cur = (s.currencies ?? {}) as Partial<Currencies>;
    return {
      ...s,
      version: 6,
      collection: {},
      decks: [],
      selectedDeck: 0,
      currencies: { ...cur, dust: nonNegInt(cur.dust) + Math.min(20_000, copies * CARD_POOL_REFUND_DUST) },
      profile: { ...((s.profile ?? {}) as object), avatar: 'finn' },
      modes: emptyModeState(),
    };
  },
};

/** Dust refunded per old card copy (times its level) when the card pool changed in save v6. */
export const CARD_POOL_REFUND_DUST = 10;

/** Upgrades any older save to the current version. Throws for unknown/newer versions. */
export function migrate(raw: unknown): AnySave {
  if (typeof raw !== 'object' || raw === null) throw new Error('Save is not an object');
  let s = raw as AnySave;
  let version = typeof s.version === 'number' ? s.version : 0;
  if (version > SAVE_VERSION)
    throw new Error(`Save version ${version} is newer than this game (${SAVE_VERSION})`);
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`No migration from save version ${version}`);
    s = step(s);
    version = s.version as number;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Repair: drop or fix anything invalid instead of crashing.
// ---------------------------------------------------------------------------

function nonNegInt(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
}

export function repairSave(
  s: AnySave,
  content: GameContent,
  now: number,
): { save: SaveData; fixes: string[] } {
  const fresh = createNewSave(content, now);
  const fixes: string[] = [];
  const cards = content.ctx.cards;

  const collection: Record<string, OwnedCard> = {};
  for (const [id, v] of Object.entries((s.collection ?? {}) as Record<string, unknown>)) {
    const card = cards.byId.get(id);
    if (!card || card.token) {
      fixes.push(`removed unknown card "${id}"`);
      continue;
    }
    const o = (v ?? {}) as Partial<OwnedCard>;
    const count = nonNegInt(o.count);
    const level = Math.min(economy.maxLevel, Math.max(1, nonNegInt(o.level, 1)));
    if (count > 0) collection[id] = { count, level };
  }
  // Every player owns the starter decks, even after their lists change in an update.
  for (const [id, owned] of Object.entries(starterCollection(content))) {
    const have = collection[id];
    if (!have || have.count < owned.count) {
      if (have) fixes.push(`topped up starter card "${id}"`);
      collection[id] = { count: owned.count, level: have?.level ?? 1 };
    }
  }

  // No decks at all (new card pool, or a wiped save): start from the starter decks.
  const decksIn =
    Array.isArray(s.decks) && s.decks.some(Boolean) ? (s.decks as unknown[]) : (fresh.decks as unknown[]);
  const decks: (DeckSlot | null)[] = Array.from({ length: economy.deckSlots }, (_, i) => {
    const d = decksIn[i] as Partial<DeckSlot> | null | undefined;
    if (!d) return null;
    const heroOk =
      typeof d.heroId === 'string' &&
      content.ctx.heroes.byId.has(d.heroId) &&
      !content.ctx.heroes.byId.get(d.heroId)?.boss;
    const landscapes = Array.isArray(d.landscapes)
      ? d.landscapes.filter((l) => (LANDSCAPE_TYPES as readonly string[]).includes(l))
      : [];
    while (landscapes.length < 4) landscapes.push('golden');
    const deckCards: Record<string, number> = {};
    for (const [id, n] of Object.entries(d.cards ?? {})) {
      const card = cards.byId.get(id);
      if (!card || card.token) {
        fixes.push(`deck ${i + 1}: removed unknown card "${id}"`);
        continue;
      }
      const c = Math.min(maxCopiesFor(card.rarity, content.ctx.balance), nonNegInt(n));
      if (c > 0) deckCards[id] = c;
    }
    if (!heroOk) fixes.push(`deck ${i + 1}: unknown hero, reset`);
    return {
      id: typeof d.id === 'string' && d.id ? d.id : `deck-${i + 1}`,
      name: typeof d.name === 'string' && d.name.trim() ? d.name.slice(0, 24) : `Deck ${i + 1}`,
      heroId: heroOk ? (d.heroId as string) : content.ctx.heroes.all[0]!.id,
      landscapes: landscapes.slice(0, 4) as LandscapeType[],
      cards: deckCards,
      updatedAt: nonNegInt(d.updatedAt, now),
    };
  });

  const cur = (s.currencies ?? {}) as Partial<Currencies>;
  const lifeIn = (s.lifetime ?? {}) as Partial<StatCounters>;
  const lifetime = emptyStats();
  for (const k of STAT_KEYS) lifetime[k] = nonNegInt(lifeIn[k]);
  const prog = (s.progression ?? {}) as { xp?: unknown; level?: unknown };
  const chestsIn = (s.chests ?? {}) as { slots?: unknown[]; freeReadyAt?: unknown };
  const slots: (ChestSlot | null)[] = Array.from({ length: 4 }, (_, i) => {
    const c = chestsIn.slots?.[i] as Partial<ChestSlot> | null | undefined;
    if (!c || !(CHEST_TYPES as readonly string[]).includes(c.type as string)) return null;
    return {
      type: c.type as ChestType,
      unlockStartedAt: typeof c.unlockStartedAt === 'number' ? c.unlockStartedAt : null,
    };
  });
  const loginIn = (s.login ?? {}) as { lastClaimDay?: unknown; streakIndex?: unknown };
  const questsIn = (s.quests ?? {}) as { day?: unknown; active?: unknown[] };
  const achIn = (s.achievements ?? {}) as { claimed?: unknown[] };
  const profile = (s.profile ?? {}) as { name?: unknown; avatar?: unknown; cardBack?: unknown };
  const campIn = (s.campaign ?? {}) as { stars?: unknown; storySeen?: unknown };
  const stars: Record<string, number> = {};
  if (typeof campIn.stars === 'object' && campIn.stars !== null) {
    for (const [id, v] of Object.entries(campIn.stars as Record<string, unknown>)) {
      const n = Math.min(3, nonNegInt(v));
      if (n > 0) stars[id] = n;
    }
  }
  const strings = (v: unknown): string[] =>
    Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string'))] : [];
  const tutIn = (s.tutorial ?? {}) as { done?: unknown; offered?: unknown };
  const selected = nonNegInt(s.selectedDeck);
  const save: SaveData = {
    version: SAVE_VERSION,
    createdAt: nonNegInt(s.createdAt, now),
    updatedAt: nonNegInt(s.updatedAt, now),
    profile: {
      name:
        typeof profile.name === 'string' && profile.name.trim()
          ? profile.name.slice(0, 20)
          : fresh.profile.name,
      avatar:
        typeof profile.avatar === 'string' && content.ctx.heroes.byId.has(profile.avatar)
          ? profile.avatar
          : fresh.profile.avatar,
      cardBack: (CARD_BACK_IDS as readonly string[]).includes(profile.cardBack as string)
        ? (profile.cardBack as string)
        : fresh.profile.cardBack,
    },
    currencies: { coins: nonNegInt(cur.coins), gems: nonNegInt(cur.gems), dust: nonNegInt(cur.dust) },
    collection,
    decks,
    selectedDeck: selected < economy.deckSlots ? selected : 0,
    progression: { xp: nonNegInt(prog.xp), level: Math.max(1, nonNegInt(prog.level, 1)) },
    chests: { slots, freeReadyAt: nonNegInt(chestsIn.freeReadyAt) },
    login: {
      lastClaimDay: typeof loginIn.lastClaimDay === 'string' ? loginIn.lastClaimDay : null,
      streakIndex: nonNegInt(loginIn.streakIndex) % 7,
    },
    quests: {
      day: typeof questsIn.day === 'string' ? questsIn.day : null,
      active: (questsIn.active ?? [])
        .filter(
          (q): q is QuestState =>
            typeof q === 'object' && q !== null && typeof (q as QuestState).id === 'string',
        )
        .map((q) => ({ id: q.id, progress: nonNegInt(q.progress), claimed: q.claimed === true })),
    },
    achievements: { claimed: (achIn.claimed ?? []).filter((x): x is string => typeof x === 'string') },
    lifetime,
    campaign: { stars, storySeen: strings(campIn.storySeen) },
    tutorial: { done: strings(tutIn.done), offered: tutIn.offered === true },
    modes: repairModes(s.modes, content),
  };
  return { save, fixes };
}

function isLandscape(v: unknown): v is LandscapeType {
  return (LANDSCAPE_TYPES as readonly string[]).includes(v as string);
}

function repairRunDeck(v: unknown, content: GameContent): RunDeck | null {
  const d = v as Partial<RunDeck> | null;
  if (!d || typeof d !== 'object') return null;
  if (typeof d.heroId !== 'string' || !content.ctx.heroes.byId.has(d.heroId)) return null;
  if (!Array.isArray(d.landscapes) || d.landscapes.length !== 4 || !d.landscapes.every(isLandscape))
    return null;
  if (
    !Array.isArray(d.cards) ||
    !d.cards.every((c) => typeof c === 'string' && content.ctx.cards.byId.has(c))
  )
    return null;
  const out: RunDeck = {
    name: typeof d.name === 'string' ? d.name.slice(0, 24) : 'Run deck',
    heroId: d.heroId,
    landscapes: [...d.landscapes],
    cards: [...d.cards],
  };
  if (d.levels && typeof d.levels === 'object') {
    out.levels = {};
    for (const [id, lv] of Object.entries(d.levels)) {
      const n = nonNegInt(lv, 1);
      if (n >= 1 && n <= economy.maxLevel) out.levels[id] = n;
    }
  }
  return out;
}

/** Keeps a mode run only if it is fully valid; a broken run is dropped rather than half-repaired. */
function repairModes(raw: unknown, content: GameContent): ModeState {
  const m = (raw ?? {}) as Partial<ModeState>;
  const out = emptyModeState();
  const daily = (m.daily ?? {}) as Partial<ModeState['daily']>;
  out.daily = {
    day: typeof daily.day === 'string' ? daily.day : null,
    won: daily.won === true,
    attempts: nonNegInt(daily.attempts),
  };
  const g = m.gauntlet as Partial<GauntletRun> | null | undefined;
  const gDeck = g ? repairRunDeck(g.deck, content) : null;
  if (g && gDeck && typeof g.seed === 'string') {
    out.gauntlet = {
      seed: g.seed,
      deck: gDeck,
      hp: Math.max(1, nonNegInt(g.hp, 1)),
      wins: nonNegInt(g.wins),
      over: g.over === true,
    };
  }
  const d = m.draft as Partial<DraftRun> | null | undefined;
  const stages: DraftStage[] = ['hero', 'landscape', 'cards', 'battles'];
  const ids = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');
  if (
    d &&
    typeof d.seed === 'string' &&
    stages.includes(d.stage as DraftStage) &&
    ids(d.heroOffer) &&
    (d.heroId === null || (typeof d.heroId === 'string' && content.ctx.heroes.byId.has(d.heroId))) &&
    Array.isArray(d.landscapeOffer) &&
    d.landscapeOffer.every(isLandscape) &&
    Array.isArray(d.landscapes) &&
    d.landscapes.every(isLandscape) &&
    ids(d.offer) &&
    ids(d.picks) &&
    [...(d.offer ?? []), ...(d.picks ?? [])].every((c) => content.ctx.cards.byId.has(c))
  ) {
    out.draft = {
      seed: d.seed,
      stage: d.stage as DraftStage,
      heroOffer: [...d.heroOffer!],
      heroId: d.heroId ?? null,
      landscapeOffer: [...d.landscapeOffer],
      landscapes: [...d.landscapes],
      offer: [...d.offer!],
      picks: [...d.picks!],
      wins: nonNegInt(d.wins),
      losses: nonNegInt(d.losses),
    };
  }
  return out;
}

/** Parses, migrates and repairs a stored save string. */
export function loadSaveString(
  text: string,
  content: GameContent,
  now: number,
): { save: SaveData; fixes: string[] } {
  return repairSave(migrate(JSON.parse(text) as unknown), content, now);
}
