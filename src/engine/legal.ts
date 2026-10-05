/**
 * Enumerates every legal action for a player. Candidates are generated
 * generously and then filtered through validateAction, so legality is defined
 * in exactly one place.
 */
import type { Action } from './actions';
import { chosenSelector, playEffects } from './cards';
import { choicesFor } from './effects';
import type { Effect, GameState, LandscapeType, PlayerId, RulesContext, TargetRef } from './types';
import { validateAction } from './validate';

export interface LegalActionOptions {
  /** Surrender is always legal; most callers (AI, random play) do not want it listed. */
  includeSurrender?: boolean;
}

/** Unique permutations of a multiset (e.g. two Golden Fields are interchangeable). */
export function uniquePermutations<T>(items: readonly T[]): T[][] {
  const sorted = [...items].sort();
  const out: T[][] = [];
  const used = new Array<boolean>(sorted.length).fill(false);
  const current: T[] = [];
  const walk = (): void => {
    if (current.length === sorted.length) {
      out.push([...current]);
      return;
    }
    for (let i = 0; i < sorted.length; i++) {
      if (used[i]) continue;
      if (i > 0 && sorted[i] === sorted[i - 1] && !used[i - 1]) continue;
      used[i] = true;
      current.push(sorted[i]!);
      walk();
      current.pop();
      used[i] = false;
    }
  };
  walk();
  return out;
}

/** Target options for an effect list: every chosen target, or [undefined] if none is needed/possible. */
function targetOptions(
  state: GameState,
  ctx: RulesContext,
  player: PlayerId,
  effects: readonly Effect[],
): (TargetRef | undefined)[] {
  if (!chosenSelector(effects)) return [undefined];
  const list = choicesFor(state, ctx, effects, player);
  return list.length > 0 ? list : [undefined];
}

function candidates(state: GameState, player: PlayerId, ctx: RulesContext): Action[] {
  const p = state.players[player];
  const out: Action[] = [];

  if (state.phase === 'arrange') {
    for (const order of uniquePermutations<LandscapeType>(p.landscapePool)) {
      out.push({ type: 'arrangeLandscapes', player, order });
    }
    return out;
  }

  if (state.phase === 'mulligan') {
    const n = p.hand.length;
    for (let mask = 0; mask < 1 << n; mask++) {
      const iids = p.hand.filter((_c, i) => (mask & (1 << i)) !== 0).map((c) => c.iid);
      out.push({ type: 'mulligan', player, iids });
    }
    return out;
  }

  if (state.phase !== 'main' || state.activePlayer !== player) return out;

  const laneCount = p.lanes.length;
  for (const inst of p.hand) {
    const card = ctx.cards.byId.get(inst.cardId);
    if (!card) continue;
    const targets = targetOptions(state, ctx, player, playEffects(card));
    if (card.type === 'spell') {
      for (const target of targets) {
        out.push(
          target
            ? { type: 'playCard', player, iid: inst.iid, target }
            : { type: 'playCard', player, iid: inst.iid },
        );
      }
      continue;
    }
    for (let lane = 0; lane < laneCount; lane++) {
      for (const target of targets) {
        out.push(
          target
            ? { type: 'playCard', player, iid: inst.iid, lane, target }
            : { type: 'playCard', player, iid: inst.iid, lane },
        );
      }
    }
  }

  p.lanes.forEach((l, lane) => {
    if (!l.creature) return;
    const card = ctx.cards.byId.get(l.creature.cardId);
    if (card?.type === 'creature' && card.floop) {
      for (const target of targetOptions(state, ctx, player, card.floop.effects)) {
        out.push(target ? { type: 'floop', player, lane, target } : { type: 'floop', player, lane });
      }
    }
    for (let to = 0; to < laneCount; to++) {
      if (to !== lane) out.push({ type: 'moveCreature', player, from: lane, to });
    }
  });

  const hero = ctx.heroes.byId.get(p.heroId);
  if (hero && p.ultimateCharge >= ctx.balance.ultimateChargeMax) {
    for (const target of targetOptions(state, ctx, player, hero.ultimate.effects)) {
      out.push(target ? { type: 'useUltimate', player, target } : { type: 'useUltimate', player });
    }
  }

  out.push({ type: 'buyDraw', player });
  out.push({ type: 'endTurn', player });
  return out;
}

export function getLegalActions(
  state: GameState,
  player: PlayerId,
  ctx: RulesContext,
  options: LegalActionOptions = {},
): Action[] {
  if (state.phase === 'ended') return [];
  const legal = candidates(state, player, ctx).filter((a) => validateAction(state, a, ctx) === null);
  if (options.includeSurrender) legal.push({ type: 'surrender', player });
  return legal;
}

/** Players who currently have a decision to make (both during setup). */
export function playersToAct(state: GameState): PlayerId[] {
  switch (state.phase) {
    case 'arrange':
      return state.players.filter((p) => !p.arranged).map((p) => p.id);
    case 'mulligan':
      return state.players.filter((p) => !p.mulliganDone).map((p) => p.id);
    case 'main':
      return [state.activePlayer];
    case 'ended':
      return [];
  }
}
