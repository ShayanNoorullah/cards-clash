/**
 * Draft Arena: pay the entry, pick a hero (1 of 3), a second landscape (1 of 3),
 * then 30 cards (1 of 3 each, rarity-weighted). Ten landscape-matched basics
 * complete the 40-card deck. Battle until max wins or max losses; rewards
 * depend on wins. All offers come from the run seed, so a run can be resumed
 * and replayed exactly. Pure.
 */
import type { Difficulty } from '../ai/profiles';
import { playableHeroes } from '../engine/cards';
import type { GameContent } from '../engine/content';
import { countLandscapesIn } from '../engine/requirements';
import { Rng } from '../engine/rng';
import { PLAYABLE_LANDSCAPES, RARITIES, type CardDef, type DeckList, type LandscapeType } from '../engine/types';
import { PROGRESSION, type Reward } from '../progression/config';
import { grantReward, type RewardSummary } from '../progression/rewards';
import type { DraftRun, RunDeck, SaveData } from '../save/saveData';

export type DraftResult = { ok: true; save: SaveData } | { ok: false; error: string };

const MAX_COPIES: Record<string, number> = { common: 3, uncommon: 3, rare: 2, epic: 1, legendary: 1 };

function withDraft(save: SaveData, draft: DraftRun | null): SaveData {
  return { ...save, modes: { ...save.modes, draft } };
}

export function draftCostText(): string {
  const e = PROGRESSION.modes.draft.entry;
  return e.coins ? `${e.coins} Coins` : `${e.gems ?? 0} Gems`;
}

export function startDraft(save: SaveData, seed: string, content: GameContent): DraftResult {
  if (save.modes.draft) return { ok: false, error: 'Finish your current draft first.' };
  const e = PROGRESSION.modes.draft.entry;
  const c = save.currencies;
  if ((e.coins ?? 0) > c.coins || (e.gems ?? 0) > c.gems)
    return { ok: false, error: `The Draft Arena costs ${draftCostText()}.` };
  const rng = new Rng(`${seed}:heroes`);
  const run: DraftRun = {
    seed,
    stage: 'hero',
    heroOffer: rng.sample(playableHeroes(content.ctx.heroes), 3).map((h) => h.id),
    heroId: null,
    landscapeOffer: [],
    landscapes: [],
    offer: [],
    picks: [],
    wins: 0,
    losses: 0,
  };
  const paid: SaveData = {
    ...save,
    currencies: { ...c, coins: c.coins - (e.coins ?? 0), gems: c.gems - (e.gems ?? 0) },
  };
  return { ok: true, save: withDraft(paid, run) };
}

/** The hero's own landscape, or a seeded one for neutral heroes. */
export function primaryLandscape(run: DraftRun, content: GameContent): LandscapeType {
  const hero = run.heroId ? content.ctx.heroes.byId.get(run.heroId) : undefined;
  if (hero && hero.landscape !== 'neutral') return hero.landscape;
  return new Rng(`${run.seed}:primary`).pick(PLAYABLE_LANDSCAPES);
}

export function pickHero(save: SaveData, heroId: string, content: GameContent): DraftResult {
  const run = save.modes.draft;
  if (run?.stage !== 'hero' || !run.heroOffer.includes(heroId))
    return { ok: false, error: 'Pick one of the offered heroes.' };
  const withHero: DraftRun = { ...run, heroId };
  const primary = primaryLandscape(withHero, content);
  const others = PLAYABLE_LANDSCAPES.filter((l) => l !== primary);
  const landscapeOffer = new Rng(`${run.seed}:landscapes`).sample(others, 3);
  return { ok: true, save: withDraft(save, { ...withHero, stage: 'landscape', landscapeOffer }) };
}

/** Collectible cards castable with the draft's landscapes (2 of each type). */
export function draftPool(landscapes: readonly LandscapeType[], content: GameContent): CardDef[] {
  return content.ctx.cards.all.filter(
    (c) =>
      !c.token &&
      (c.landscape === 'neutral' || landscapes.includes(c.landscape)) &&
      c.requirements.every((r) => countLandscapesIn(landscapes, r.landscape) >= r.count),
  );
}

/** Three distinct cards for pick number `index`, rarity-weighted, respecting copy limits. */
export function makeOffer(run: DraftRun, index: number, content: GameContent): string[] {
  const rng = new Rng(`${run.seed}:pick:${index}`);
  const odds = PROGRESSION.modes.draft.odds;
  const count = (id: string) => run.picks.filter((p) => p === id).length;
  const pool = draftPool(run.landscapes, content).filter((c) => count(c.id) < (MAX_COPIES[c.rarity] ?? 1));
  const offer: string[] = [];
  for (let slot = 0; slot < 3; slot++) {
    const rarity = rng.weighted(
      RARITIES,
      RARITIES.map((r) => odds[r]),
    );
    let options = pool.filter((c) => c.rarity === rarity && !offer.includes(c.id));
    if (options.length === 0) options = pool.filter((c) => !offer.includes(c.id));
    if (options.length === 0) break;
    offer.push(rng.pick(options).id);
  }
  return offer;
}

export function pickLandscape(save: SaveData, landscape: LandscapeType, content: GameContent): DraftResult {
  const run = save.modes.draft;
  if (run?.stage !== 'landscape' || !run.landscapeOffer.includes(landscape))
    return { ok: false, error: 'Pick one of the offered landscapes.' };
  const primary = primaryLandscape(run, content);
  const next: DraftRun = { ...run, stage: 'cards', landscapes: [primary, primary, landscape, landscape] };
  next.offer = makeOffer(next, 0, content);
  return { ok: true, save: withDraft(save, next) };
}

export function pickCard(save: SaveData, cardId: string, content: GameContent): DraftResult {
  const run = save.modes.draft;
  if (run?.stage !== 'cards' || !run.offer.includes(cardId))
    return { ok: false, error: 'Pick one of the offered cards.' };
  const picks = [...run.picks, cardId];
  const done = picks.length >= PROGRESSION.modes.draft.picks;
  const next: DraftRun = { ...run, picks, stage: done ? 'battles' : 'cards', offer: [] };
  if (!done) next.offer = makeOffer(next, picks.length, content);
  return { ok: true, save: withDraft(save, next) };
}

/** Cheapest common creatures of each of the draft's landscapes. */
export function draftBasics(landscapes: readonly LandscapeType[], content: GameContent): string[] {
  const per = PROGRESSION.modes.draft.basicsPerLandscape;
  const out: string[] = [];
  for (const l of new Set(landscapes)) {
    const basics = content.ctx.cards.all
      .filter(
        (c) =>
          !c.token &&
          c.type === 'creature' &&
          c.rarity === 'common' &&
          c.landscape === l &&
          c.requirements.every((r) => countLandscapesIn(landscapes, r.landscape) >= r.count),
      )
      .sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id));
    for (let i = 0; i < per && basics.length > 0; i++) out.push(basics[i % basics.length]!.id);
  }
  return out;
}

export function draftDeck(run: DraftRun, content: GameContent): RunDeck {
  const cards = [...run.picks, ...draftBasics(run.landscapes, content)];
  const level = PROGRESSION.modes.draft.cardLevel;
  const levels: Record<string, number> = {};
  for (const id of new Set(cards)) levels[id] = level;
  return { name: 'Draft Deck', heroId: run.heroId ?? '', landscapes: [...run.landscapes], cards, levels };
}

export function draftOver(run: DraftRun): boolean {
  const cfg = PROGRESSION.modes.draft;
  return run.wins >= cfg.maxWins || run.losses >= cfg.maxLosses;
}

export interface DraftOpponent {
  name: string;
  deck: DeckList;
  ai: Difficulty;
}

export function draftOpponent(run: DraftRun, content: GameContent): DraftOpponent {
  const cfg = PROGRESSION.modes.draft;
  const battle = run.wins + run.losses;
  const pool = content.starterDecks.filter((d) => d.heroId !== run.heroId);
  const deck = new Rng(`${run.seed}:battle:${battle}`).pick(pool.length > 0 ? pool : content.starterDecks);
  const levels: Record<string, number> = {};
  for (const id of new Set(deck.cards)) levels[id] = cfg.cardLevel;
  return {
    name: content.ctx.heroes.byId.get(deck.heroId)?.name ?? deck.name,
    deck: { heroId: deck.heroId, landscapes: [...deck.landscapes], cards: [...deck.cards], levels },
    ai: cfg.ai[Math.min(run.wins, cfg.ai.length - 1)] ?? 'normal',
  };
}

export function recordDraft(save: SaveData, won: boolean): SaveData {
  const run = save.modes.draft;
  if (run?.stage !== 'battles' || draftOver(run)) return save;
  return withDraft(save, { ...run, wins: run.wins + (won ? 1 : 0), losses: run.losses + (won ? 0 : 1) });
}

export function draftReward(wins: number): Reward {
  const r = PROGRESSION.modes.draft.rewards;
  return r[Math.min(wins, r.length - 1)] ?? {};
}

/** Retiring during battles ends the run (rewards for the wins so far); before battles the entry is lost. */
export function retireDraft(save: SaveData): SaveData {
  const run = save.modes.draft;
  if (!run) return save;
  if (run.stage !== 'battles') return withDraft(save, null);
  return withDraft(save, { ...run, losses: PROGRESSION.modes.draft.maxLosses });
}

export function claimDraft(
  save: SaveData,
  content: GameContent,
  rng: Rng,
): { ok: true; save: SaveData; summary: RewardSummary } | { ok: false; error: string } {
  const run = save.modes.draft;
  if (!run || run.stage !== 'battles' || !draftOver(run))
    return { ok: false, error: 'The draft run is not over yet.' };
  const granted = grantReward(withDraft(save, null), draftReward(run.wins), content, rng);
  return { ok: true, save: granted.save, summary: granted.summary };
}
