/**
 * Action validation. This is the ONLY place that decides whether an action is
 * legal; applyAction and getLegalActions both rely on it.
 */
import type {
  Action,
  ArrangeLandscapesAction,
  EndTurnAction,
  FloopAction,
  MoveCreatureAction,
  MulliganAction,
  PlayCardAction,
  UseUltimateAction,
} from './actions';
import { starsOf } from './amounts';
import { chosenSelector, playEffects } from './cards';
import { cardCost, floopCost } from './costs';
import { checkCondition, choicesFor, isValidChoiceFor } from './effects';
import { actionError, type ActionError } from './errors';
import { createExec } from './mutations';
import { isValidLane, unmetRequirements } from './state';
import { keywordValue, laneStarCap } from './statics';
import type { Effect, GameState, PlayerId, RulesContext, TargetRef } from './types';

function isPlayerId(v: unknown): v is PlayerId {
  return v === 0 || v === 1;
}

function isTargetRef(v: unknown): v is TargetRef {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Record<string, unknown>;
  if (!isPlayerId(t.player)) return false;
  if (t.kind === 'hero') return true;
  return (
    (t.kind === 'creature' || t.kind === 'landscape' || t.kind === 'building') &&
    typeof t.lane === 'number' &&
    Number.isInteger(t.lane)
  );
}

/**
 * `required`: spells, floops and ultimates need a valid target to be used at
 * all. Creature/building onPlay abilities simply fizzle when nothing can be chosen.
 */
function validateTarget(
  state: GameState,
  ctx: RulesContext,
  effects: readonly Effect[],
  player: PlayerId,
  target: unknown,
  required: boolean,
): ActionError | null {
  const selector = chosenSelector(effects);
  if (!selector) {
    return target === undefined ? null : actionError('TARGET_NOT_ALLOWED', 'This does not take a target.');
  }
  if (target === undefined) {
    const any = choicesFor(state, ctx, effects, player).length > 0;
    if (any) return actionError('TARGET_REQUIRED', 'Choose a target.');
    return required ? actionError('NO_VALID_TARGET', 'There is no valid target.') : null;
  }
  if (!isTargetRef(target) || !isValidChoiceFor(state, ctx, effects, player, target)) {
    return actionError('INVALID_TARGET', 'That is not a valid target.');
  }
  return null;
}

function validateArrange(
  state: GameState,
  a: ArrangeLandscapesAction,
  ctx: RulesContext,
): ActionError | null {
  if (state.phase !== 'arrange')
    return actionError('WRONG_PHASE', 'Landscapes can only be arranged before the match.');
  const p = state.players[a.player];
  if (p.arranged) return actionError('ALREADY_DONE', 'Landscapes are already arranged.');
  if (!Array.isArray(a.order) || a.order.length !== ctx.balance.laneCount) {
    return actionError('INVALID_ARRANGEMENT', `Place exactly ${ctx.balance.laneCount} landscapes.`);
  }
  const pool = [...p.landscapePool].sort();
  const given = [...a.order].sort();
  if (pool.some((l, i) => l !== given[i])) {
    return actionError(
      'INVALID_ARRANGEMENT',
      'The arrangement must use exactly the landscapes in your deck.',
    );
  }
  return null;
}

function validateMulligan(state: GameState, a: MulliganAction, ctx: RulesContext): ActionError | null {
  if (state.phase !== 'mulligan')
    return actionError('WRONG_PHASE', 'Mulligans happen before the first turn.');
  const p = state.players[a.player];
  if (p.mulliganDone) return actionError('ALREADY_DONE', 'You already kept or mulliganed your hand.');
  if (!Array.isArray(a.iids)) return actionError('INVALID_MULLIGAN', 'Mulligan must list cards.');
  if (a.iids.length > 0 && p.mulligansUsed >= ctx.balance.mulligansAllowed) {
    return actionError('INVALID_MULLIGAN', 'No mulligans left.');
  }
  if (new Set(a.iids).size !== a.iids.length)
    return actionError('INVALID_MULLIGAN', 'A card is listed twice.');
  if (!a.iids.every((iid) => p.hand.some((c) => c.iid === iid))) {
    return actionError('CARD_NOT_IN_HAND', 'You can only mulligan cards in your hand.');
  }
  return null;
}

function validatePlayCard(state: GameState, a: PlayCardAction, ctx: RulesContext): ActionError | null {
  const p = state.players[a.player];
  const inst = p.hand.find((c) => c.iid === a.iid);
  if (!inst) return actionError('CARD_NOT_IN_HAND', 'That card is not in your hand.');
  const card = ctx.cards.byId.get(inst.cardId);
  if (!card) return actionError('UNKNOWN_CARD', `Unknown card ${inst.cardId}.`);

  const unmet = unmetRequirements(p, card.requirements);
  if (unmet.length > 0) {
    const r = unmet[0]!;
    return actionError('REQUIREMENT_NOT_MET', `${card.name} needs ${r.count} ${r.landscape} landscape(s).`);
  }
  const cost = cardCost(state, a.player, card);
  if (cost > p.mp) return actionError('NOT_ENOUGH_MP', `${card.name} costs ${cost} MP; you have ${p.mp}.`);
  if ((p.blocks ?? []).some((b) => b.what === card.type && b.turn === state.turn)) {
    return actionError('BLOCKED', `You cannot play ${card.type}s this turn.`);
  }

  if (card.type === 'spell') {
    if (a.lane !== undefined) return actionError('LANE_NOT_ALLOWED', 'Spells are not played into a lane.');
    // Spells that only change the board need something to change ("no valid target" otherwise).
    return validateTarget(state, ctx, card.effects, a.player, a.target, true);
  }

  if (a.lane === undefined) return actionError('INVALID_LANE', `Choose a lane for ${card.name}.`);
  if (!isValidLane(state, a.lane)) return actionError('INVALID_LANE', 'That lane does not exist.');
  const lane = p.lanes[a.lane]!;
  if (lane.landscape === null) return actionError('INVALID_LANE', 'That lane has no landscape.');
  if (lane.flipped) return actionError('LANE_FLIPPED', 'You cannot play cards onto a flipped landscape.');
  if ((lane.sealedUntil ?? 0) >= state.turn)
    return actionError('LANE_SEALED', 'Nothing can be played there this turn.');
  if (card.type === 'creature' && starsOf(card) > laneStarCap(state, ctx, a.player, a.lane)) {
    const cap = laneStarCap(state, ctx, a.player, a.lane);
    return actionError(
      'RARITY_CAP',
      `Only creatures of ${cap} star${cap === 1 ? '' : 's'} or less can go there.`,
    );
  }
  return validateTarget(state, ctx, playEffects(card), a.player, a.target, false);
}

function validateFloop(state: GameState, a: FloopAction, ctx: RulesContext): ActionError | null {
  if (!isValidLane(state, a.lane)) return actionError('INVALID_LANE', 'That lane does not exist.');
  const p = state.players[a.player];
  const c = p.lanes[a.lane]!.creature;
  if (!c) return actionError('NO_CREATURE', 'There is no creature in that lane.');
  const card = ctx.cards.byId.get(c.cardId);
  if (!card || card.type !== 'creature' || !card.floop) {
    return actionError('NO_FLOOP', 'That creature has no floop ability.');
  }
  if (c.exhausted) return actionError('EXHAUSTED', 'That creature is already exhausted.');
  if (c.frozen) return actionError('FROZEN', 'Frozen creatures cannot floop.');
  if ((c.floopLock ?? 0) >= state.turn)
    return actionError('FLOOP_LOCKED', 'That creature cannot floop this turn.');
  const cost = floopCost(state, ctx, a.player, a.lane)!;
  if (cost > p.mp) {
    return actionError('NOT_ENOUGH_MP', `Flooping costs ${cost} MP; you have ${p.mp}.`);
  }
  if (card.floop.condition) {
    const view = createExec(state, ctx);
    const src = { player: a.player, kind: 'creature' as const, iid: c.iid, cardId: c.cardId, lane: a.lane };
    if (!checkCondition(view, card.floop.condition, src)) {
      return actionError('CONDITION_NOT_MET', "This floop's condition is not met.");
    }
  }
  return validateTarget(state, ctx, card.floop.effects, a.player, a.target, true);
}

export function moveCost(state: GameState, a: MoveCreatureAction, ctx: RulesContext): number {
  const c = state.players[a.player].lanes[a.from]?.creature;
  return c && keywordValue(state, ctx, c, a.from, 'swift') > 0 ? 0 : ctx.balance.moveCost;
}

function validateMove(state: GameState, a: MoveCreatureAction, ctx: RulesContext): ActionError | null {
  if (!isValidLane(state, a.from) || !isValidLane(state, a.to)) {
    return actionError('INVALID_LANE', 'That lane does not exist.');
  }
  if (a.from === a.to) return actionError('INVALID_LANE', 'Choose a different lane.');
  const p = state.players[a.player];
  const c = p.lanes[a.from]!.creature;
  if (!c) return actionError('NO_CREATURE', 'There is no creature in that lane.');
  const dest = p.lanes[a.to]!;
  if (dest.creature) return actionError('LANE_OCCUPIED', 'Creatures can only move to an empty lane.');
  if (dest.landscape === null || dest.flipped) {
    return actionError('LANE_FLIPPED', 'Creatures cannot move onto a flipped landscape.');
  }
  if (c.movesThisTurn >= ctx.balance.maxMovesPerCreaturePerTurn) {
    return actionError('MOVE_LIMIT', 'That creature already moved this turn.');
  }
  const cost = moveCost(state, a, ctx);
  if (cost > p.mp) return actionError('NOT_ENOUGH_MP', `Moving costs ${cost} MP; you have ${p.mp}.`);
  return null;
}

function validateBuyDraw(state: GameState, player: PlayerId, ctx: RulesContext): ActionError | null {
  const p = state.players[player];
  if (p.extraDrawsThisTurn >= ctx.balance.extraDrawsPerTurn) {
    return actionError('DRAW_LIMIT', 'You already bought a draw this turn.');
  }
  if (p.deck.length === 0) return actionError('DECK_EMPTY', 'Your deck is empty.');
  if (ctx.balance.extraDrawCost > p.mp) {
    return actionError('NOT_ENOUGH_MP', `Drawing costs ${ctx.balance.extraDrawCost} MP; you have ${p.mp}.`);
  }
  return null;
}

function validateUltimate(state: GameState, a: UseUltimateAction, ctx: RulesContext): ActionError | null {
  const p = state.players[a.player];
  if (p.ultimateCharge < ctx.balance.ultimateChargeMax) {
    return actionError('ULTIMATE_NOT_READY', `Ultimate is ${p.ultimateCharge}% charged.`);
  }
  const hero = ctx.heroes.byId.get(p.heroId);
  if (!hero) return actionError('UNKNOWN_CARD', `Unknown hero ${p.heroId}.`);
  return validateTarget(state, ctx, hero.ultimate.effects, a.player, a.target, true);
}

function validateEndTurn(state: GameState, a: EndTurnAction): ActionError | null {
  if (a.discard === undefined) return null;
  const p = state.players[a.player];
  if (!Array.isArray(a.discard) || new Set(a.discard).size !== a.discard.length) {
    return actionError('INVALID_DISCARD', 'Discard list is invalid.');
  }
  if (!a.discard.every((iid) => p.hand.some((c) => c.iid === iid))) {
    return actionError('CARD_NOT_IN_HAND', 'You can only discard cards in your hand.');
  }
  return null;
}

/** Returns null when the action is legal, otherwise the reason it is not. */
export function validateAction(state: GameState, action: Action, ctx: RulesContext): ActionError | null {
  if (typeof action !== 'object' || action === null)
    return actionError('UNKNOWN_ACTION', 'Malformed action.');
  if (state.phase === 'ended') return actionError('GAME_OVER', 'The game is over.');
  if (!isPlayerId(action.player)) return actionError('INVALID_PLAYER', 'Unknown player.');

  switch (action.type) {
    case 'surrender':
      return null;
    case 'arrangeLandscapes':
      return validateArrange(state, action, ctx);
    case 'mulligan':
      return validateMulligan(state, action, ctx);
    case 'playCard':
    case 'floop':
    case 'moveCreature':
    case 'buyDraw':
    case 'useUltimate':
    case 'endTurn': {
      if (state.phase !== 'main') return actionError('WRONG_PHASE', 'The match has not started yet.');
      if (action.player !== state.activePlayer) return actionError('NOT_YOUR_TURN', 'It is not your turn.');
      switch (action.type) {
        case 'playCard':
          return validatePlayCard(state, action, ctx);
        case 'floop':
          return validateFloop(state, action, ctx);
        case 'moveCreature':
          return validateMove(state, action, ctx);
        case 'buyDraw':
          return validateBuyDraw(state, action.player, ctx);
        case 'useUltimate':
          return validateUltimate(state, action, ctx);
        case 'endTurn':
          return validateEndTurn(state, action);
      }
      break;
    }
  }
  return actionError(
    'UNKNOWN_ACTION',
    `Unknown action type "${String((action as { type?: unknown }).type)}".`,
  );
}
