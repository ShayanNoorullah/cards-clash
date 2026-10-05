/**
 * Turn search: a beam search over the AI's own action sequences within the
 * current turn. Every candidate is scored by simulating the rest of the turn
 * (End Turn → combat) on engine clones and evaluating the result, so lethal is
 * found naturally (a winning state scores WIN_SCORE).
 */
import type { Action } from '../engine/actions';
import { applyAction } from '../engine/apply';
import { getLegalActions } from '../engine/legal';
import type { Rng } from '../engine/rng';
import type { GameState, PlayerId, RulesContext } from '../engine/types';
import { evaluate, WIN_SCORE } from './evaluate';
import type { AiProfile } from './profiles';

export interface SearchBudget {
  /** Max board evaluations for this decision. */
  maxEvaluations: number;
  /** Absolute deadline from `now()` (ms), or Infinity. */
  deadline: number;
  now: () => number;
}

export interface ScoredAction {
  action: Action;
  score: number;
}

class Search {
  evaluations = 0;

  constructor(
    private readonly ctx: RulesContext,
    private readonly me: PlayerId,
    private readonly profile: AiProfile,
    private readonly budget: SearchBudget,
  ) {}

  get exhausted(): boolean {
    return this.evaluations >= this.budget.maxEvaluations || this.budget.now() >= this.budget.deadline;
  }

  /** Score of ending the turn right now from `state`. */
  endScore(state: GameState): number {
    this.evaluations++;
    if (state.phase === 'ended' || state.activePlayer !== this.me) {
      return evaluate(state, this.ctx, this.me, this.profile.weights);
    }
    const r = applyAction(state, { type: 'endTurn', player: this.me }, this.ctx);
    if (!r.ok) return evaluate(state, this.ctx, this.me, this.profile.weights);
    let after = r.state;
    if (this.profile.lookaheadOpponentCombat && after.phase === 'main' && after.activePlayer !== this.me) {
      // Let the opponent's current board attack back (no plays: their hand is hidden).
      const back = applyAction(after, { type: 'endTurn', player: after.activePlayer }, this.ctx);
      if (back.ok) after = back.state;
    }
    return evaluate(after, this.ctx, this.me, this.profile.weights);
  }

  bias(action: Action, state: GameState): number {
    const hooks = this.profile.hooks;
    if (!hooks?.cardBias || action.type !== 'playCard') return 0;
    const cardId = state.players[this.me].hand.find((c) => c.iid === action.iid)?.cardId;
    return cardId ? (hooks.cardBias[cardId] ?? 0) : 0;
  }

  /** Scores every legal action one step deep, then refines the best `beam` with deeper search. */
  rank(state: GameState, depth: number): ScoredAction[] {
    // End Turn first, so it is always scored even when the budget runs out.
    const legal = getLegalActions(state, this.me, this.ctx).sort(
      (a, b) => Number(b.type === 'endTurn') - Number(a.type === 'endTurn'),
    );
    const scored: (ScoredAction & { next?: GameState })[] = [];
    for (const action of legal) {
      if (action.type === 'endTurn') {
        scored.push({ action, score: this.endScore(state) });
        continue;
      }
      if (this.exhausted && scored.length > 0) break;
      const r = applyAction(state, action, this.ctx);
      if (!r.ok) continue;
      const score = this.endScore(r.state) + this.bias(action, state);
      scored.push({ action, score, next: r.state });
    }
    scored.sort((x, y) => y.score - x.score);

    if (depth > 1) {
      for (const cand of scored.slice(0, this.profile.beam)) {
        if (!cand.next || cand.score >= WIN_SCORE / 2 || this.exhausted) continue;
        if (cand.next.phase !== 'main' || cand.next.activePlayer !== this.me) continue;
        const follow = this.rank(cand.next, depth - 1)[0];
        // A line is worth what its best continuation is worth (ending the turn is always a continuation).
        if (follow) cand.score = Math.max(cand.score, follow.score);
      }
      scored.sort((x, y) => y.score - x.score);
    }
    return scored.map(({ action, score }) => ({ action, score }));
  }
}

export interface SearchResult {
  ranked: ScoredAction[];
  evaluations: number;
}

export function searchTurn(
  state: GameState,
  me: PlayerId,
  ctx: RulesContext,
  profile: AiProfile,
  budget: SearchBudget,
): SearchResult {
  const s = new Search(ctx, me, profile, budget);
  const ranked = s.rank(state, profile.depth);
  return { ranked, evaluations: s.evaluations };
}

/** Picks among the top candidates with a softmax (temperature 0 = best only). */
export function pickFromRanked(ranked: readonly ScoredAction[], profile: AiProfile, rng: Rng): Action | null {
  if (ranked.length === 0) return null;
  const top = ranked.slice(0, Math.max(1, profile.topK));
  if (profile.temperature <= 0 || top.length === 1) return top[0]!.action;
  // Never gamble away a found win.
  if (top[0]!.score >= WIN_SCORE / 2) return top[0]!.action;
  const best = top[0]!.score;
  const weights = top.map((c) => Math.exp((c.score - best) / profile.temperature));
  return rng.weighted(
    top.map((c) => c.action),
    weights,
  );
}
