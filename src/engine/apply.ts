/**
 * applyAction: the single entry point that advances the game.
 * Pure from the caller's point of view: the input state is never modified.
 */
import type {
  Action,
  ArrangeLandscapesAction,
  FloopAction,
  MoveCreatureAction,
  MulliganAction,
  PlayCardAction,
  UseUltimateAction,
} from './actions';
import { getCard, getHero } from './cards';
import { cardCost, floopCost } from './costs';
import { drainQueue } from './effects';
import type { ActionError } from './errors';
import type { GameEvent } from './events';
import {
  changeMp,
  checkDeaths,
  createExec,
  drawCards,
  endGame,
  newCreature,
  queueBuildingTrigger,
  queueCardTrigger,
  queuePlayerTrigger,
  replaceCreature,
  type Exec,
} from './mutations';
import { cloneState } from './state';
import { endTurn, startTurn } from './turn';
import type { CardInstance, GameState, RulesContext } from './types';
import { other } from './types';
import { moveCost, validateAction } from './validate';

export type ActionResult =
  { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: ActionError };

function doArrange(x: Exec, a: ArrangeLandscapesAction): void {
  const p = x.s.players[a.player];
  a.order.forEach((landscape, i) => {
    p.lanes[i]!.landscape = landscape;
  });
  p.arranged = true;
  x.events.push({ type: 'landscapesArranged', player: a.player, order: [...a.order] });

  if (x.s.players.every((pl) => pl.arranged)) {
    x.s.phase = 'mulligan';
    if (x.ctx.balance.mulligansAllowed === 0) {
      for (const pl of x.s.players) pl.mulliganDone = true;
      beginFirstTurn(x);
    }
  }
}

function doMulligan(x: Exec, a: MulliganAction): void {
  const p = x.s.players[a.player];
  if (a.iids.length > 0) {
    const returned = p.hand.filter((c) => a.iids.includes(c.iid));
    p.hand = p.hand.filter((c) => !a.iids.includes(c.iid));
    p.deck = x.rng.shuffle([...p.deck, ...returned]);
    p.mulligansUsed++;
    x.events.push({ type: 'mulligan', player: a.player, returned: returned.length });
    drawCards(x, a.player, returned.length);
  } else {
    x.events.push({ type: 'mulligan', player: a.player, returned: 0 });
  }
  p.mulliganDone = true;
  if (x.s.players.every((pl) => pl.mulliganDone)) beginFirstTurn(x);
}

function beginFirstTurn(x: Exec): void {
  x.s.phase = 'main';
  startTurn(x, x.s.firstPlayer);
}

function takeFromHand(x: Exec, a: PlayCardAction): CardInstance {
  const p = x.s.players[a.player];
  const idx = p.hand.findIndex((c) => c.iid === a.iid);
  return p.hand.splice(idx, 1)[0]!;
}

function doPlayCard(x: Exec, a: PlayCardAction): void {
  const p = x.s.players[a.player];
  const card = getCard(x.ctx.cards, p.hand.find((c) => c.iid === a.iid)!.cardId);
  const cost = cardCost(x.s, a.player, card);
  const inst = takeFromHand(x, a);
  changeMp(x, a.player, -cost);
  x.events.push({
    type: 'cardPlayed',
    player: a.player,
    iid: inst.iid,
    cardId: inst.cardId,
    lane: a.lane ?? null,
    target: a.target ?? null,
  });

  if (card.type === 'spell') {
    p.discard.push(inst);
    const pending = {
      source: { player: a.player, kind: 'spell' as const, iid: inst.iid, cardId: inst.cardId, lane: null },
      trigger: 'spell' as const,
      effects: card.effects,
      ...(a.target ? { chosen: a.target } : {}),
    };
    x.queue.push(pending);
    queuePlayerTrigger(x, a.player, 'onSpellCast');
    drainQueue(x);
    return;
  }

  const laneIndex = a.lane!;
  const lane = p.lanes[laneIndex]!;
  if (card.type === 'creature') {
    if (lane.creature) replaceCreature(x, a.player, laneIndex);
    lane.creature = newCreature(x, inst, false);
    x.events.push({
      type: 'creatureSummoned',
      player: a.player,
      iid: inst.iid,
      cardId: inst.cardId,
      lane: laneIndex,
      token: false,
    });
    checkDeaths(x);
    const src = {
      player: a.player,
      kind: 'creature' as const,
      iid: inst.iid,
      cardId: inst.cardId,
      lane: laneIndex,
    };
    queueCardTrigger(x, src, 'onPlay', a.target);
    queuePlayerTrigger(x, a.player, 'onAllyCreaturePlayed', inst.iid);
    queueBuildingTrigger(x, a.player, laneIndex, 'onLaneCreaturePlayed');
  } else {
    if (lane.building) {
      const old = lane.building;
      lane.building = null;
      p.discard.push(old);
      x.events.push({
        type: 'cardReplaced',
        player: a.player,
        iid: old.iid,
        cardId: old.cardId,
        lane: laneIndex,
      });
    }
    lane.building = inst;
    x.events.push({
      type: 'buildingPlaced',
      player: a.player,
      iid: inst.iid,
      cardId: inst.cardId,
      lane: laneIndex,
    });
    // A changed building can lower DEF below marked damage.
    checkDeaths(x);
    const src = {
      player: a.player,
      kind: 'building' as const,
      iid: inst.iid,
      cardId: inst.cardId,
      lane: laneIndex,
    };
    queueCardTrigger(x, src, 'onPlay', a.target);
  }
  drainQueue(x);
}

function doFloop(x: Exec, a: FloopAction): void {
  const p = x.s.players[a.player];
  const c = p.lanes[a.lane]!.creature!;
  const card = getCard(x.ctx.cards, c.cardId);
  if (card.type !== 'creature' || !card.floop) return;
  changeMp(x, a.player, -floopCost(x.s, x.ctx, a.player, a.lane)!);
  c.exhausted = true;
  c.floopCount = (c.floopCount ?? 0) + 1;
  p.floopsThisTurn = (p.floopsThisTurn ?? 0) + 1;
  x.events.push({ type: 'floop', player: a.player, iid: c.iid, lane: a.lane });
  const src = { player: a.player, kind: 'creature' as const, iid: c.iid, cardId: c.cardId, lane: a.lane };
  x.queue.push({
    source: src,
    trigger: 'floop',
    effects: card.floop.effects,
    ...(a.target ? { chosen: a.target } : {}),
  });
  queueCardTrigger(x, src, 'onFloop');
  queueBuildingTrigger(x, a.player, a.lane, 'onFloop');
  queuePlayerTrigger(x, a.player, 'onAllyFloop');
  drainQueue(x);
}

function doUltimate(x: Exec, a: UseUltimateAction): void {
  const p = x.s.players[a.player];
  const hero = getHero(x.ctx.heroes, p.heroId);
  p.ultimateCharge = 0;
  p.ultimatesUsed++;
  x.events.push({ type: 'ultimateUsed', player: a.player, heroId: hero.id });
  x.events.push({ type: 'ultimateCharge', player: a.player, charge: 0 });
  x.queue.push({
    source: { player: a.player, kind: 'hero', iid: null, cardId: null, lane: null },
    trigger: 'ultimate',
    effects: hero.ultimate.effects,
    ...(a.target ? { chosen: a.target } : {}),
  });
  drainQueue(x);
}

function doMove(x: Exec, a: MoveCreatureAction, cost: number): void {
  const p = x.s.players[a.player];
  const c = p.lanes[a.from]!.creature!;
  changeMp(x, a.player, -cost);
  p.lanes[a.from]!.creature = null;
  p.lanes[a.to]!.creature = c;
  c.movesThisTurn++;
  x.events.push({ type: 'creatureMoved', player: a.player, iid: c.iid, from: a.from, to: a.to, cost });
  // Leaving a building's lane or an aura can lower DEF below marked damage.
  checkDeaths(x);
  drainQueue(x);
}

/**
 * Validates and applies an action. On success returns the new state and the
 * events to animate; on failure returns the reason and no state change.
 */
export function applyAction(state: GameState, action: Action, ctx: RulesContext): ActionResult {
  const error = validateAction(state, action, ctx);
  if (error) return { ok: false, error };

  const moveCostValue = action.type === 'moveCreature' ? moveCost(state, action, ctx) : 0;
  const x = createExec(cloneState(state), ctx);

  switch (action.type) {
    case 'arrangeLandscapes':
      doArrange(x, action);
      break;
    case 'mulligan':
      doMulligan(x, action);
      break;
    case 'playCard':
      doPlayCard(x, action);
      break;
    case 'floop':
      doFloop(x, action);
      break;
    case 'moveCreature':
      doMove(x, action, moveCostValue);
      break;
    case 'buyDraw': {
      const p = x.s.players[action.player];
      changeMp(x, action.player, -ctx.balance.extraDrawCost);
      p.extraDrawsThisTurn++;
      drawCards(x, action.player, 1);
      break;
    }
    case 'useUltimate':
      doUltimate(x, action);
      break;
    case 'endTurn':
      endTurn(x, action.player, action.discard);
      break;
    case 'surrender':
      endGame(x, other(action.player), 'surrender');
      break;
  }

  x.s.rng = x.rng.state;
  return { ok: true, state: x.s, events: x.events };
}
