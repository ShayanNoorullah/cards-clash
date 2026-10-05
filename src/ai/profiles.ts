/**
 * AI difficulty profiles and evaluation weights, loaded from
 * src/data/ai-profiles.json. Boss hooks (M8) extend a base profile.
 */
import raw from '../data/ai-profiles.json';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'nightmare';
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard', 'nightmare'];

export type EvalWeights = typeof raw.weights;

export interface BossHooks {
  /** Card ids the boss tries to play first, in order, when legal. */
  openingSequence?: string[];
  /** Extra score for playing specific cards (positive = favoured). */
  cardBias?: Record<string, number>;
  /** Multipliers on evaluation weights (e.g. { pressure: 1.5 } for an aggressive boss). */
  weightScale?: Partial<Record<keyof EvalWeights, number>>;
}

export interface AiProfile {
  id: string;
  name: string;
  /** Actions looked ahead within the turn. */
  depth: number;
  /** Candidates expanded at each depth. */
  beam: number;
  /** Softmax temperature over the top candidates (0 = always best). */
  temperature: number;
  topK: number;
  /** Chance of playing a random legal action instead of thinking. */
  mistakeRate: number;
  /** Also simulate the opponent's board attacking back before evaluating. */
  lookaheadOpponentCombat: boolean;
  /** Hard cap on board evaluations per decision (deterministic budget). */
  maxEvaluations: number;
  /** Wall-clock budget per decision in the client. */
  timeBudgetMs: number;
  weights: EvalWeights;
  hooks?: BossHooks;
}

function validate(): string[] {
  const errors: string[] = [];
  for (const d of DIFFICULTIES) {
    const p = (raw.profiles as Record<string, Record<string, unknown>>)[d];
    if (!p) {
      errors.push(`missing profile "${d}"`);
      continue;
    }
    for (const k of ['depth', 'beam', 'topK', 'maxEvaluations', 'timeBudgetMs']) {
      const v = p[k];
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 1)
        errors.push(`${d}.${k} must be a positive integer`);
    }
    for (const k of ['temperature', 'mistakeRate']) {
      const v = p[k];
      if (typeof v !== 'number' || v < 0) errors.push(`${d}.${k} must be >= 0`);
    }
    if (typeof p.mistakeRate === 'number' && p.mistakeRate > 1) errors.push(`${d}.mistakeRate must be <= 1`);
  }
  for (const [k, v] of Object.entries(raw.weights)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) errors.push(`weights.${k} must be a number`);
  }
  return errors;
}

const errors = validate();
if (errors.length > 0) throw new Error(`Invalid ai-profiles.json:\n- ${errors.join('\n- ')}`);

export function getProfile(difficulty: Difficulty, hooks?: BossHooks): AiProfile {
  const { weightScale: profileScale, ...p } = raw.profiles[
    difficulty
  ] as (typeof raw.profiles)[Difficulty] & {
    weightScale?: Partial<Record<keyof EvalWeights, number>>;
  };
  const weights = { ...raw.weights };
  for (const [k, scale] of Object.entries(profileScale ?? {})) {
    const key = k as keyof EvalWeights;
    weights[key] = weights[key] * (scale ?? 1);
  }
  if (hooks?.weightScale) {
    for (const [k, scale] of Object.entries(hooks.weightScale)) {
      const key = k as keyof EvalWeights;
      weights[key] = weights[key] * (scale ?? 1);
    }
  }
  const profile: AiProfile = { id: difficulty, ...p, weights };
  if (hooks) profile.hooks = hooks;
  return profile;
}
