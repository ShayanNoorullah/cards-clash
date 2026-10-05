/**
 * Headless match runner. Used by tests, balance tools and (later) the AI.
 */
import type { Action } from './actions';
import { applyAction } from './apply';
import type { GameEvent } from './events';
import { getLegalActions, playersToAct } from './legal';
import { Rng } from './rng';
import { createGame } from './state';
import type { DeckList, GameState, PlayerId, RulesContext } from './types';

/** Chooses an action for `player`, given the legal options (never empty). */
export type Policy = (state: GameState, player: PlayerId, legal: Action[], rng: Rng) => Action;

export const randomPolicy: Policy = (_state, _player, legal, rng) => rng.pick(legal);

export interface MatchResult {
  state: GameState;
  actions: Action[];
  eventCount: number;
}

export interface RunMatchOptions {
  seed: number | string;
  decks: [DeckList, DeckList];
  policies?: [Policy, Policy];
  /** Hard cap on actions to guarantee termination even with a broken policy. */
  maxActions?: number;
  /** Called after every applied action (e.g. for invariant checks). */
  onStep?: (state: GameState, action: Action, events: GameEvent[]) => void;
}

export function runMatch(options: RunMatchOptions, ctx: RulesContext): MatchResult {
  const policies = options.policies ?? [randomPolicy, randomPolicy];
  const maxActions = options.maxActions ?? 20_000;
  const created = createGame({ seed: options.seed, decks: options.decks }, ctx);
  let state = created.state;
  let eventCount = created.events.length;
  const actions: Action[] = [];
  const decisionRng = new Rng(`policy:${String(options.seed)}`);

  while (state.phase !== 'ended') {
    if (actions.length >= maxActions) throw new Error(`Match exceeded ${maxActions} actions without ending`);
    const player = playersToAct(state)[0];
    if (player === undefined) throw new Error(`No player to act in phase ${state.phase}`);
    const legal = getLegalActions(state, player, ctx);
    if (legal.length === 0) throw new Error(`Player ${player} has no legal actions in phase ${state.phase}`);
    const action = policies[player](state, player, legal, decisionRng);
    const result = applyAction(state, action, ctx);
    if (!result.ok)
      throw new Error(`Policy chose an illegal action: ${result.error.code} ${result.error.message}`);
    state = result.state;
    eventCount += result.events.length;
    actions.push(action);
    options.onStep?.(state, action, result.events);
  }
  return { state, actions, eventCount };
}

/** Re-applies a recorded action list from a fresh game (replays, server checks). */
export function replayMatch(
  seed: number | string,
  decks: [DeckList, DeckList],
  actions: readonly Action[],
  ctx: RulesContext,
): GameState {
  let state = createGame({ seed, decks }, ctx).state;
  for (const action of actions) {
    const result = applyAction(state, action, ctx);
    if (!result.ok) throw new Error(`Replay failed: ${result.error.code} ${result.error.message}`);
    state = result.state;
  }
  return state;
}
