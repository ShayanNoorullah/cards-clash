/**
 * Game creation and read-only state queries.
 */
import { BALANCE } from './balance';
import { getCard, getHero } from './cards';
import { validateDeck } from './deck';
import type { GameEvent } from './events';
import { Rng, toSeed } from './rng';
import type {
  CardDef,
  CardInstance,
  DeckList,
  GameState,
  Lane,
  LandscapeRequirement,
  LandscapeType,
  MatchRule,
  PlayerId,
  PlayerState,
  RulesContext,
} from './types';

export interface CreateGameOptions {
  seed: number | string;
  decks: [DeckList, DeckList];
  /** Skip deck legality checks (sandbox / scripted boards / draft). */
  skipDeckValidation?: boolean;
  /** Starting hero HP per player (e.g. Gauntlet carries HP between battles). */
  startingHp?: [number, number];
  /** Overrides every card level (Ranked PvP plays everything at level 3). */
  fixedCardLevel?: number;
  /** Match rules per player (campaign modifiers, boss rules). */
  rules?: [MatchRule[], MatchRule[]];
  /** Keep deck lists in the given order (top card first) instead of shuffling. Tutorials. */
  stackedDecks?: boolean;
  /** Forces who goes first instead of the seeded coin flip. Tutorials. */
  firstPlayer?: PlayerId;
}

export interface CreateGameResult {
  state: GameState;
  events: GameEvent[];
}

/** Creates a new match: shuffles decks, flips the seeded coin, deals opening hands. */
export function createGame(options: CreateGameOptions, ctx: RulesContext): CreateGameResult {
  const b = ctx.balance;
  options.decks.forEach((deck, i) => {
    if (!options.skipDeckValidation) {
      const errors = validateDeck(deck, ctx);
      if (errors.length > 0) throw new Error(`Deck ${i + 1} is illegal:\n- ${errors.join('\n- ')}`);
    } else {
      getHero(ctx.heroes, deck.heroId);
      for (const id of deck.cards) getCard(ctx.cards, id);
    }
  });

  const seed = toSeed(options.seed);
  const rng = Rng.fromState(seed);
  let nextInstanceId = 1;

  const maxLevel = BALANCE.cardLevels.length;
  const cardLevelsFor = (deck: DeckList): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const id of new Set(deck.cards)) {
      const raw = options.fixedCardLevel ?? deck.levels?.[id] ?? 1;
      const level = Math.max(1, Math.min(maxLevel, Math.floor(raw)));
      if (level > 1) out[id] = level;
    }
    return out;
  };

  const makePlayer = (id: PlayerId, deck: DeckList): PlayerState => {
    const instances: CardInstance[] = deck.cards.map((cardId) => ({
      iid: `c${nextInstanceId++}`,
      cardId,
      owner: id,
    }));
    const lanes: Lane[] = Array.from({ length: b.laneCount }, () => ({
      landscape: null,
      flipped: false,
      flipTimer: null,
      creature: null,
      building: null,
    }));
    const rules = options.rules?.[id] ?? [];
    const sum = (f: (r: MatchRule) => number | undefined) => rules.reduce((n, r) => n + (f(r) ?? 0), 0);
    const maxHp = Math.max(1, b.heroMaxHp + sum((r) => r.heroHpDelta));
    const hp = options.startingHp?.[id] ?? maxHp;
    return {
      id,
      heroId: deck.heroId,
      hp: Math.max(1, Math.min(maxHp, hp)),
      maxHp,
      mp: 0,
      mpPenalty: 0,
      turnsTaken: 0,
      extraDrawsThisTurn: 0,
      ultimateCharge: Math.max(
        0,
        Math.min(
          b.ultimateChargeMax,
          sum((r) => r.startingCharge),
        ),
      ),
      ultimatesUsed: 0,
      landscapePool: [...deck.landscapes],
      cardLevels: cardLevelsFor(deck),
      rules,
      arranged: false,
      mulligansUsed: 0,
      mulliganDone: false,
      deck: options.stackedDecks ? instances : rng.shuffle(instances),
      hand: [],
      discard: [],
      lanes,
    };
  };

  const players: [PlayerState, PlayerState] = [
    makePlayer(0, options.decks[0]),
    makePlayer(1, options.decks[1]),
  ];
  const coin: PlayerId = rng.next() < 0.5 ? 0 : 1;
  const firstPlayer: PlayerId = options.firstPlayer ?? coin;
  const events: GameEvent[] = [{ type: 'gameCreated', firstPlayer }];

  for (const p of players) {
    const extra = p.rules.reduce((n, r) => n + (r.extraCards ?? 0), 0);
    const count = Math.max(
      0,
      (p.id === firstPlayer ? b.firstPlayerHandSize : b.secondPlayerHandSize) + extra,
    );
    p.hand = p.deck.splice(0, count);
  }

  const state: GameState = {
    version: 2,
    seed,
    rng: rng.state,
    phase: 'arrange',
    turn: 0,
    firstPlayer,
    activePlayer: firstPlayer,
    players,
    nextInstanceId,
    winner: null,
    endReason: null,
  };
  return { state, events };
}

export function getLane(player: PlayerState, lane: number): Lane {
  const l = player.lanes[lane];
  if (!l) throw new Error(`Invalid lane ${lane}`);
  return l;
}

export function isValidLane(state: GameState, lane: unknown): lane is number {
  return (
    typeof lane === 'number' && Number.isInteger(lane) && lane >= 0 && lane < state.players[0].lanes.length
  );
}

/** Number of un-flipped lanes of the given landscape type. */
export function countLandscapes(player: PlayerState, type: LandscapeType): number {
  return player.lanes.filter((l) => !l.flipped && l.landscape === type).length;
}

export function unmetRequirements(
  player: PlayerState,
  reqs: readonly LandscapeRequirement[],
): LandscapeRequirement[] {
  return reqs.filter((r) => countLandscapes(player, r.landscape) < r.count);
}

export function requirementsMet(player: PlayerState, card: CardDef): boolean {
  return unmetRequirements(player, card.requirements).length === 0;
}

/** MP a player receives at the start of their Nth turn (1-based), before penalties. */
export function mpForTurn(turnsTaken: number, ctx: RulesContext): number {
  const b = ctx.balance;
  return Math.min(b.maxMp, b.startingMp + Math.max(0, turnsTaken - 1) * b.mpPerTurn);
}

/** Level of a card for a player (1 if not levelled). */
export function cardLevelOf(state: GameState, player: PlayerId, cardId: string | null): number {
  return cardId ? (state.players[player].cardLevels[cardId] ?? 1) : 1;
}

/** Non-token cards a player owns across all zones (used by invariant checks). */
export function countOwnedCards(state: GameState, id: PlayerId): number {
  const p = state.players[id];
  let n = p.deck.length + p.hand.length + p.discard.length;
  for (const l of p.lanes) {
    if (l.creature && !l.creature.token) n++;
    if (l.building) n++;
  }
  return n;
}

const cloneCard = (c: CardInstance): CardInstance => ({ iid: c.iid, cardId: c.cardId, owner: c.owner });

function cloneLane(l: Lane): Lane {
  return {
    landscape: l.landscape,
    flipped: l.flipped,
    flipTimer: l.flipTimer,
    creature: l.creature ? { ...l.creature, grantedKeywords: [...l.creature.grantedKeywords] } : null,
    building: l.building ? cloneCard(l.building) : null,
    ...(l.sealedUntil !== undefined ? { sealedUntil: l.sealedUntil } : {}),
  };
}

function clonePlayer(p: PlayerState): PlayerState {
  return {
    ...p,
    landscapePool: [...p.landscapePool],
    cardLevels: { ...p.cardLevels },
    deck: p.deck.map(cloneCard),
    hand: p.hand.map(cloneCard),
    discard: p.discard.map(cloneCard),
    lanes: p.lanes.map(cloneLane),
    ...(p.costMods ? { costMods: p.costMods.map((m) => ({ ...m })) } : {}),
    ...(p.blocks ? { blocks: p.blocks.map((b) => ({ ...b })) } : {}),
  };
}

/**
 * Deep copy of a game state. Hand-written (instead of structuredClone) because
 * the AI clones thousands of states per decision; a test checks it stays
 * equivalent to a generic deep clone.
 */
export function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: [clonePlayer(state.players[0]), clonePlayer(state.players[1])],
  };
}
