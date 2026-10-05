import { expect } from 'vitest';
import type { Rng } from '../src/engine';
import {
  BALANCE,
  applyAction,
  createCardDb,
  createHeroDb,
  createGame,
  maxCopiesFor,
  type Action,
  type ActionErrorCode,
  type CreatureInPlay,
  type DeckList,
  type GameEvent,
  type GameState,
  type LandscapeType,
  type MatchBalance,
  type PlayerId,
  type RulesContext,
} from '../src/engine';
import testCards from './fixtures/test-cards.json';
import testHeroes from './fixtures/test-heroes.json';

export const TEST_DB = createCardDb(testCards);
export const TEST_HEROES = createHeroDb(testHeroes, TEST_DB);
/**
 * The engine tests use a small fixture card pool with small numbers, so they
 * keep the match numbers it was written for (the shipped balance is scaled
 * for the real card pool).
 */
export const TEST_BALANCE: MatchBalance = { ...BALANCE.match, heroMaxHp: 25, maxMp: 6, fatigueDamage: 2 };
export const CTX: RulesContext = { cards: TEST_DB, heroes: TEST_HEROES, balance: TEST_BALANCE };

export function ctxWith(overrides: Partial<MatchBalance>): RulesContext {
  return { cards: TEST_DB, heroes: TEST_HEROES, balance: { ...TEST_BALANCE, ...overrides } };
}

/** Builds a legal 40-card deck by cycling through `ids`, respecting copy limits. */
export function makeDeck(landscapes: LandscapeType[], ids: string[], ctx: RulesContext = CTX): DeckList {
  const cards: string[] = [];
  const counts = new Map<string, number>();
  let progress = true;
  while (cards.length < ctx.balance.deckSize && progress) {
    progress = false;
    for (const id of ids) {
      if (cards.length >= ctx.balance.deckSize) break;
      const max = maxCopiesFor(ctx.cards.byId.get(id)!.rarity, ctx.balance);
      const n = counts.get(id) ?? 0;
      if (n < max) {
        cards.push(id);
        counts.set(id, n + 1);
        progress = true;
      }
    }
  }
  if (cards.length !== ctx.balance.deckSize) throw new Error('makeDeck: not enough distinct cards');
  return { heroId: 'test_hero', landscapes, cards };
}

/** A random legal deck from the test pool, biased toward its own landscapes. */
export function randomDeck(rng: Rng, ctx: RulesContext = CTX): DeckList {
  const types: LandscapeType[] = ['azure', 'golden', 'murk', 'dune', 'candy', 'ember'];
  const landscapes = [rng.pick(types), rng.pick(types), rng.pick(types), rng.pick(types)];
  const onTheme = ctx.cards.all.filter((c) => c.landscape === 'neutral' || landscapes.includes(c.landscape));
  const offTheme = ctx.cards.all.filter((c) => !onTheme.includes(c));
  const ids = [...rng.shuffle(onTheme), ...rng.shuffle(offTheme)].map((c) => c.id);
  return makeDeck(landscapes, ids, ctx);
}

export const GOLDEN_EMBER_DECK = makeDeck(
  ['golden', 'golden', 'ember', 'ember'],
  [
    'golden_sprout',
    'golden_knight',
    'golden_banner',
    'golden_blessing',
    'ember_imp',
    'ember_bolt',
    'ember_forge',
    'ember_brute',
    'neutral_wanderer',
    'neutral_mana_gem',
    'neutral_titan',
    'dune_scorpion',
    'murk_slime',
    'candy_healer',
    'azure_wisp',
  ],
);

export const AZURE_DUNE_DECK = makeDeck(
  ['azure', 'dune', 'dune', 'murk'],
  [
    'azure_wisp',
    'azure_sentinel',
    'azure_insight',
    'dune_scorpion',
    'dune_blast',
    'dune_sandstorm',
    'murk_slime',
    'murk_hex',
    'neutral_wanderer',
    'neutral_mana_gem',
    'neutral_titan',
    'candy_healer',
    'golden_sprout',
    'ember_imp',
  ],
);

/** Applies an action that must succeed; returns the new state and events. */
export function act(
  state: GameState,
  action: Action,
  ctx: RulesContext = CTX,
): { state: GameState; events: GameEvent[] } {
  const result = applyAction(state, action, ctx);
  if (!result.ok)
    throw new Error(`Expected ${action.type} to succeed: ${result.error.code} ${result.error.message}`);
  return { state: result.state, events: result.events };
}

export function expectError(
  state: GameState,
  action: Action,
  code: ActionErrorCode,
  ctx: RulesContext = CTX,
): void {
  const result = applyAction(state, action, ctx);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe(code);
}

/**
 * A game already in the main phase: both players arranged their landscapes in
 * deck order and kept their hands. `firstPlayer` forces who starts.
 */
export function startedGame(
  options: {
    seed?: number | string;
    decks?: [DeckList, DeckList];
    firstPlayer?: PlayerId;
    ctx?: RulesContext;
  } = {},
): GameState {
  const ctx = options.ctx ?? CTX;
  const decks = options.decks ?? [GOLDEN_EMBER_DECK, AZURE_DUNE_DECK];
  let seed = options.seed ?? 1;
  let state = createGame({ seed, decks }, ctx).state;
  // Find a seed with the requested first player (deterministic search).
  if (options.firstPlayer !== undefined) {
    let n = 0;
    while (state.firstPlayer !== options.firstPlayer) {
      seed = `${String(options.seed ?? 1)}#${++n}`;
      state = createGame({ seed, decks }, ctx).state;
    }
  }
  for (const p of [0, 1] as const) {
    state = act(state, { type: 'arrangeLandscapes', player: p, order: [...decks[p].landscapes] }, ctx).state;
  }
  for (const p of [0, 1] as const) state = act(state, { type: 'mulligan', player: p, iids: [] }, ctx).state;
  return state;
}

let testIid = 100_000;

/** Test-only: puts a new copy of a card into a player's hand and returns its iid. */
export function give(state: GameState, player: PlayerId, cardId: string): string {
  const iid = `t${testIid++}`;
  state.players[player].hand.push({ iid, cardId, owner: player });
  return iid;
}

/** Test-only: places a ready creature directly on the board. */
export function summon(
  state: GameState,
  player: PlayerId,
  lane: number,
  cardId: string,
  overrides: Partial<CreatureInPlay> = {},
): CreatureInPlay {
  const c: CreatureInPlay = {
    iid: `t${testIid++}`,
    cardId,
    owner: player,
    damage: 0,
    atkMod: 0,
    defMod: 0,
    tempAtk: 0,
    tempDef: 0,
    exhausted: false,
    summoningSick: false,
    movesThisTurn: 0,
    shield: false,
    frozen: false,
    poison: 0,
    stealth: false,
    grantedKeywords: [],
    token: false,
    ...overrides,
  };
  state.players[player].lanes[lane]!.creature = c;
  return c;
}

/** Test-only: places a building directly on the board. */
export function build(state: GameState, player: PlayerId, lane: number, cardId: string): void {
  state.players[player].lanes[lane]!.building = { iid: `t${testIid++}`, cardId, owner: player };
}

export function setMp(state: GameState, player: PlayerId, mp: number): void {
  state.players[player].mp = mp;
}

/** Ends the active player's turn and the opponent's, returning to the same player. */
export function passRound(state: GameState, ctx: RulesContext = CTX): GameState {
  const a = state.activePlayer;
  let s = act(state, { type: 'endTurn', player: a }, ctx).state;
  s = act(s, { type: 'endTurn', player: s.activePlayer }, ctx).state;
  return s;
}

export function eventsOf<T extends GameEvent['type']>(
  events: GameEvent[],
  type: T,
): Extract<GameEvent, { type: T }>[] {
  return events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}
