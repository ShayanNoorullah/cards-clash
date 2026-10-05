import type { Policy } from '../engine/simulate';
import type { RulesContext } from '../engine/types';
import { decide } from './AiPlayer';
import type { AiProfile } from './profiles';

/**
 * Adapts an AI profile to the engine's headless `Policy` interface
 * (simulations, balance tools). Uses the evaluation budget only, so results are
 * deterministic regardless of machine speed.
 */
export function aiPolicy(profile: AiProfile, ctx: RulesContext): Policy {
  return (state, player, legal) => {
    const { action } = decide(state, player, ctx, profile, { timeBudgetMs: Infinity });
    // Defensive: the AI only returns legal actions, but never trust a policy blindly.
    return legal.some((a) => JSON.stringify(a) === JSON.stringify(action)) ? action : legal[0]!;
  };
}
