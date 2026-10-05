/**
 * Human-readable battle log lines from engine events. Pure (no Phaser).
 */
import type { GameEvent } from '../engine/events';
import type { GameState, PlayerId, RulesContext, TargetRef } from '../engine/types';

export interface LogNames {
  players: [string, string];
}

function cardName(ctx: RulesContext, id: string | null): string {
  if (!id) return 'Hero';
  return ctx.cards.byId.get(id)?.name ?? id;
}

const LANE_NAMES = ['lane 1', 'lane 2', 'lane 3', 'lane 4'];

function laneName(lane: number): string {
  return LANE_NAMES[lane] ?? `lane ${lane + 1}`;
}

function targetName(t: TargetRef, state: GameState, ctx: RulesContext, names: LogNames): string {
  if (t.kind === 'hero') return `${names.players[t.player]}'s Hero`;
  const lane = state.players[t.player].lanes[t.lane];
  if (t.kind === 'landscape')
    return `${names.players[t.player]}'s ${lane?.landscape ?? 'landscape'} (${laneName(t.lane)})`;
  if (t.kind === 'building')
    return lane?.building ? cardName(ctx, lane.building.cardId) : `the building in ${laneName(t.lane)}`;
  const c = lane?.creature;
  return c ? cardName(ctx, c.cardId) : `the creature in ${laneName(t.lane)}`;
}

/**
 * One log line per interesting event (null = not worth logging).
 * `state` should be the state AFTER the action (used only for names).
 */
export function describeEvent(
  e: GameEvent,
  state: GameState,
  ctx: RulesContext,
  names: LogNames,
): string | null {
  const who = (p: PlayerId) => names.players[p];
  switch (e.type) {
    case 'gameCreated':
      return `${who(e.firstPlayer)} wins the coin flip and goes first.`;
    case 'mulligan':
      return e.returned > 0
        ? `${who(e.player)} redraws ${e.returned} card(s).`
        : `${who(e.player)} keeps their hand.`;
    case 'turnStarted':
      return `— Turn ${e.turn}: ${who(e.player)} (${e.mp} MP) —`;
    case 'cardPlayed':
      return `${who(e.player)} plays ${cardName(ctx, e.cardId)}${e.lane !== null ? ` in ${laneName(e.lane)}` : ''}.`;
    case 'cardReplaced':
      return `${cardName(ctx, e.cardId)} is replaced.`;
    case 'creatureSummoned':
      return e.token ? `A ${cardName(ctx, e.cardId)} appears in ${laneName(e.lane)}.` : null;
    case 'creatureMoved':
      return `${cardName(ctx, state.players[e.player].lanes[e.to]?.creature?.cardId ?? null)} moves to ${laneName(e.to)}.`;
    case 'floop':
      return `${who(e.player)} floops ${cardName(ctx, state.players[e.player].lanes[e.lane]?.creature?.cardId ?? null)}.`;
    case 'ultimateUsed': {
      const hero = ctx.heroes.byId.get(e.heroId);
      return `${who(e.player)} uses ${hero ? `${hero.name}'s Hero Ability` : 'their Hero Ability'}!`;
    }
    case 'attack':
      return `${cardName(ctx, state.players[e.player].lanes[e.lane]?.creature?.cardId ?? findCard(state, e.iid))} attacks ${targetName(e.target, state, ctx, names)}.`;
    case 'damage':
      return `${targetName(e.target, state, ctx, names)} takes ${e.amount} damage.`;
    case 'heal':
      return `${targetName(e.target, state, ctx, names)} heals ${e.amount}.`;
    case 'creatureDestroyed':
      return `${cardName(ctx, e.cardId)} is destroyed.`;
    case 'returnedToHand':
      return `${cardName(ctx, e.cardId)} returns to ${who(e.player)}'s hand.`;
    case 'shieldBroken':
      return 'A shield breaks.';
    case 'frozen':
      return `A creature in ${laneName(e.lane)} is frozen.`;
    case 'poisoned':
      return `A creature in ${laneName(e.lane)} is poisoned (${e.poison}).`;
    case 'landscapeFlipped':
      return `${who(e.player)}'s ${laneName(e.lane)} landscape is flipped.`;
    case 'landscapeRestored':
      return `${who(e.player)}'s ${laneName(e.lane)} landscape is restored.`;
    case 'landscapeConverted':
      return `${who(e.player)}'s ${laneName(e.lane)} landscape becomes ${e.to}.`;
    case 'cardDiscarded':
      return `${who(e.player)} discards ${cardName(ctx, e.cardId)}.`;
    case 'fatigue':
      return `${who(e.player)} has no cards left and takes ${e.damage} fatigue damage.`;
    case 'mpPenalty':
      return e.amount < 0
        ? `${who(e.player)} will have ${-e.amount} extra MP next turn.`
        : `${who(e.player)} will have ${e.amount} less MP next turn.`;
    case 'buildingDestroyed':
      return `${cardName(ctx, e.cardId)} is destroyed.`;
    case 'buildingReturned':
      return `${cardName(ctx, e.cardId)} returns to ${who(e.player)}'s hand.`;
    case 'buildingMoved':
      return `A building moves to ${laneName(e.to)}.`;
    case 'cardRecovered':
      return e.stolen
        ? `${who(e.player)} steals ${cardName(ctx, e.cardId)}!`
        : `${who(e.player)} takes ${cardName(ctx, e.cardId)} from the ${e.from === 'deck' ? 'deck' : 'discard pile'}.`;
    case 'handCycled':
      return `${who(e.player)} shuffles their hand into the deck.`;
    case 'status':
      return {
        floopLocked: `The creature in ${laneName(e.lane)} can't floop next turn.`,
        attackLocked: `The creature in ${laneName(e.lane)} can't attack next turn.`,
        redirect: `Damage to the creature in ${laneName(e.lane)} now hits its Hero.`,
        reset: `The creature in ${laneName(e.lane)} is reset.`,
        swapped: `The creature in ${laneName(e.lane)} swaps ATK and DEF.`,
      }[e.status];
    case 'laneSealed':
      return `Nothing can be played in ${who(e.player)}'s ${laneName(e.lane)} next turn.`;
    case 'playBlocked':
      return `${who(e.player)} can't play ${e.what}s next turn.`;
    case 'costChanged':
      return e.amount < 0
        ? `${who(e.player)}'s ${e.kind === 'card' ? 'cards' : e.kind === 'floop' ? 'floops' : `${e.kind}s`} cost less.`
        : `${who(e.player)}'s ${e.kind === 'floop' ? 'floops' : `${e.kind}s`} cost more next turn.`;
    case 'effectLimitReached':
      return `Too many effects! The chain stops after ${e.limit}.`;
    case 'gameEnded':
      if (e.winner === 'draw')
        return e.reason === 'turnLimit'
          ? 'The match ends in a draw (turn limit).'
          : 'Both Heroes fall — a draw!';
      return e.reason === 'surrender'
        ? `${who(e.winner === 0 ? 1 : 0)} surrenders. ${who(e.winner)} wins!`
        : `${who(e.winner)} wins!`;
    default:
      return null;
  }
}

function findCard(state: GameState, iid: string): string | null {
  for (const p of state.players) {
    for (const c of [...p.discard, ...p.hand, ...p.deck]) if (c.iid === iid) return c.cardId;
  }
  return null;
}
