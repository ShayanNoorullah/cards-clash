/**
 * Game-dependent numbers ("2 damage for each card in your hand") and target
 * filters ("a Corn creature", "rarity 3 or lower"). Read-only helpers.
 */
import { getCard } from './cards';
import type {
  Amount,
  CardDef,
  CreatureInPlay,
  GameState,
  PlayerId,
  Quantity,
  RulesContext,
  TargetFilter,
} from './types';
import { other, RARITIES } from './types';

/** Stat readers are injected by statics.ts (which imports this module). */
export interface StatReaders {
  atk: (state: GameState, ctx: RulesContext, c: CreatureInPlay, lane: number) => number;
  def: (state: GameState, ctx: RulesContext, c: CreatureInPlay, lane: number) => number;
  maxDef: (state: GameState, ctx: RulesContext, c: CreatureInPlay, lane: number) => number;
}

let readers: StatReaders | null = null;
export function setStatReaders(r: StatReaders): void {
  readers = r;
}

export interface AmountScope {
  owner: PlayerId;
  /** Lane of the source card (null for spells and heroes). */
  lane: number | null;
  /** Source creature instance, if the source is a creature in play. */
  iid: string | null;
  /** The creature the effect is applied to (for target* quantities). */
  target?: { player: PlayerId; lane: number } | null;
}

function creatureCount(state: GameState, p: PlayerId): number {
  return state.players[p].lanes.filter((l) => l.creature).length;
}

function sourceCreature(state: GameState, scope: AmountScope): CreatureInPlay | null {
  if (scope.lane === null || scope.iid === null) return null;
  const c = state.players[scope.owner].lanes[scope.lane]?.creature;
  return c && c.iid === scope.iid ? c : null;
}

export function quantity(
  state: GameState,
  ctx: RulesContext,
  q: Quantity,
  scope: AmountScope,
  landscape?: string,
): number {
  const me = state.players[scope.owner];
  const opp = state.players[other(scope.owner)];
  const r = readers!;
  const self = () => sourceCreature(state, scope);
  const tgt = () => {
    const t = scope.target;
    if (!t) return null;
    const c = state.players[t.player].lanes[t.lane]?.creature;
    return c ? { c, lane: t.lane } : null;
  };
  switch (q) {
    case 'handSize':
      return me.hand.length;
    case 'enemyHandSize':
      return opp.hand.length;
    case 'ownCreatures':
      return creatureCount(state, scope.owner);
    case 'enemyCreatures':
      return creatureCount(state, other(scope.owner));
    case 'ownBuildings':
      return me.lanes.filter((l) => l.building).length;
    case 'enemyBuildings':
      return opp.lanes.filter((l) => l.building).length;
    case 'ownLandscapeTypes':
      return new Set(me.lanes.filter((l) => l.landscape && !l.flipped).map((l) => l.landscape)).size;
    case 'fieldLandscapeTypes':
      return new Set(
        [...me.lanes, ...opp.lanes].filter((l) => l.landscape && !l.flipped).map((l) => l.landscape),
      ).size;
    case 'ownLandscapesOf':
      return me.lanes.filter((l) => !l.flipped && l.landscape === landscape).length;
    case 'ownEmptyLanes':
      return me.lanes.filter((l) => !l.creature).length;
    case 'adjacentEmptyLanes': {
      if (scope.lane === null) return 0;
      return [scope.lane - 1, scope.lane + 1].filter((i) => me.lanes[i] && !me.lanes[i]!.creature).length;
    }
    case 'floopsThisTurn':
      return me.floopsThisTurn ?? 0;
    case 'timesFlooped':
      return self()?.floopCount ?? 0;
    case 'ownDiscard':
      return me.discard.length;
    case 'enemyDiscardCreatures':
      return opp.discard.filter((c) => ctx.cards.byId.get(c.cardId)?.type === 'creature').length;
    case 'selfAtk': {
      const c = self();
      return c ? r.atk(state, ctx, c, scope.lane!) : 0;
    }
    case 'selfDef': {
      const c = self();
      return c ? Math.max(0, r.def(state, ctx, c, scope.lane!)) : 0;
    }
    case 'selfDamage':
      return self()?.damage ?? 0;
    case 'opposingAtk': {
      if (scope.lane === null) return 0;
      const c = opp.lanes[scope.lane]?.creature;
      return c ? r.atk(state, ctx, c, scope.lane) : 0;
    }
    case 'targetAtk': {
      const t = tgt();
      return t ? r.atk(state, ctx, t.c, t.lane) : 0;
    }
    case 'targetDef': {
      const t = tgt();
      return t ? Math.max(0, r.def(state, ctx, t.c, t.lane)) : 0;
    }
    case 'targetMaxDef': {
      const t = tgt();
      return t ? r.maxDef(state, ctx, t.c, t.lane) : 0;
    }
    case 'targetDamage':
      return tgt()?.c.damage ?? 0;
  }
}

/** Evaluates an Amount (plain numbers pass through). */
export function evalAmount(state: GameState, ctx: RulesContext, a: Amount, scope: AmountScope): number {
  if (typeof a === 'number') return a;
  const q = quantity(state, ctx, a.of, scope, a.landscape);
  const base = a.div ? Math.floor(q / a.div) : q;
  let v = (a.mul ?? 1) * base + (a.add ?? 0);
  if (a.sub) v -= quantity(state, ctx, a.sub, scope);
  return Math.trunc(v);
}

/** Whether an Amount depends on the creature it is applied to. */
export function dependsOnTarget(a: Amount): boolean {
  return typeof a !== 'number' && (a.of.startsWith('target') || (a.sub?.startsWith('target') ?? false));
}

/** Rarity in stars (1-5; 7 for Unbelievably Rare). */
export function starsOf(card: CardDef): number {
  return card.stars ?? RARITIES.indexOf(card.rarity) + 1;
}

/** Whether a creature in play matches a filter. */
export function matchesFilter(
  ctx: RulesContext,
  c: CreatureInPlay,
  filter: TargetFilter | undefined,
): boolean {
  if (!filter) return true;
  const card = getCard(ctx.cards, c.cardId);
  if (filter.landscape !== undefined && card.landscape !== filter.landscape) return false;
  const stars = starsOf(card);
  if (filter.maxStars !== undefined && stars > filter.maxStars) return false;
  if (filter.minStars !== undefined && stars < filter.minStars) return false;
  if (filter.damaged && c.damage <= 0) return false;
  return true;
}

/** The turn number of `player`'s next turn (not the current one). */
export function nextTurnOf(state: GameState, player: PlayerId): number {
  return state.activePlayer === player ? state.turn + 2 : state.turn + 1;
}
