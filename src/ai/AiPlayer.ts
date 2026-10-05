/**
 * The AI's single entry point: given a state where `player` must decide,
 * returns one legal action. Pure apart from the injectable clock, so it runs
 * identically in tests, simulations, the main thread and a Web Worker.
 */
import type { Action } from '../engine/actions';
import { getLegalActions } from '../engine/legal';
import { Rng } from '../engine/rng';
import type { GameState, PlayerId, RulesContext } from '../engine/types';
import type { AiProfile } from './profiles';
import { pickFromRanked, searchTurn } from './search';
import { chooseArrangement, chooseMulligan } from './setup';

export interface DecideOptions {
  /** Clock for the time budget (defaults to performance.now / Date.now). */
  now?: () => number;
  /** Override the profile's time budget (Infinity = evaluation budget only). */
  timeBudgetMs?: number;
}

export interface Decision {
  action: Action;
  evaluations: number;
  thinkMs: number;
  reason: 'setup' | 'script' | 'mistake' | 'search' | 'fallback';
}

const defaultNow = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Deterministic per-decision randomness derived from the (serializable) state. */
function decisionRng(state: GameState, player: PlayerId, profile: AiProfile): Rng {
  const extra = state.players[player].hand.length * 31 + state.players[player].mp * 7;
  return new Rng(`ai:${profile.id}:${state.rng}:${state.turn}:${player}:${extra}`);
}

export function decide(
  state: GameState,
  player: PlayerId,
  ctx: RulesContext,
  profile: AiProfile,
  options: DecideOptions = {},
): Decision {
  const now = options.now ?? defaultNow;
  const started = now();
  const done = (action: Action, reason: Decision['reason'], evaluations = 0): Decision => ({
    action,
    evaluations,
    thinkMs: now() - started,
    reason,
  });

  if (state.phase === 'arrange') return done(chooseArrangement(state, player), 'setup');
  if (state.phase === 'mulligan') return done(chooseMulligan(state, player, ctx), 'setup');

  const legal = getLegalActions(state, player, ctx);
  const endTurn: Action = { type: 'endTurn', player };
  if (legal.length === 0) return done(endTurn, 'fallback');

  // Boss hook: scripted opening plays, when legal.
  const script = profile.hooks?.openingSequence;
  if (script && script.length > 0) {
    const hand = state.players[player].hand;
    for (const cardId of script) {
      const inst = hand.find((c) => c.cardId === cardId);
      const play = inst && legal.find((a) => a.type === 'playCard' && a.iid === inst.iid);
      if (play) return done(play, 'script');
    }
  }

  const rng = decisionRng(state, player, profile);
  if (profile.mistakeRate > 0 && rng.chance(profile.mistakeRate)) {
    return done(rng.pick(legal), 'mistake');
  }

  const budgetMs = options.timeBudgetMs ?? profile.timeBudgetMs;
  const { ranked, evaluations } = searchTurn(state, player, ctx, profile, {
    maxEvaluations: profile.maxEvaluations,
    deadline: started + budgetMs,
    now,
  });
  const action = pickFromRanked(ranked, profile, rng) ?? endTurn;
  return done(action, 'search', evaluations);
}
