/**
 * Attack timing (the spinning disc shown when your creatures attack): where the
 * Miss and Perfect zones sit on the dial, what a stopped needle scores, and the
 * results AI opponents roll. Angles are degrees clockwise from 12 o'clock.
 */
import type { StrikeRoll } from '../engine/actions';
import type { Difficulty } from '../ai/profiles';

export interface StrikeDial {
  missStart: number;
  missSpan: number;
  perfectStart: number;
  perfectSpan: number;
}

export const MISS_SPAN = 80;
export const PERFECT_SPAN = 22;
/** Needle speed in degrees per second (a full turn in about 1.1 s). */
export const NEEDLE_SPEED = 330;

/** Normalises an angle to [0, 360). */
export function norm(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function within(angle: number, start: number, span: number): boolean {
  return norm(angle - start) < span;
}

/** A dial with the Perfect and Miss zones at random, non-overlapping spots. */
export function randomDial(random: () => number = Math.random): StrikeDial {
  const perfectStart = norm(Math.floor(random() * 360));
  // Leave at least 40° of normal Hit on both sides of the Miss zone.
  const gapRoom = 360 - PERFECT_SPAN - MISS_SPAN - 80;
  const missStart = norm(perfectStart + PERFECT_SPAN + 40 + Math.floor(random() * gapRoom));
  return { missStart, missSpan: MISS_SPAN, perfectStart, perfectSpan: PERFECT_SPAN };
}

/** What the needle scores when stopped at `angle`. */
export function rollAt(dial: StrikeDial, angle: number): StrikeRoll {
  if (within(angle, dial.perfectStart, dial.perfectSpan)) return 'perfect';
  if (within(angle, dial.missStart, dial.missSpan)) return 'miss';
  return 'hit';
}

/** Miss / Perfect chances for AI attacks: stronger opponents time them better. */
export const AI_TIMING: Record<Difficulty, { miss: number; perfect: number }> = {
  easy: { miss: 0.3, perfect: 0.05 },
  normal: { miss: 0.2, perfect: 0.1 },
  hard: { miss: 0.12, perfect: 0.15 },
  nightmare: { miss: 0.06, perfect: 0.22 },
};

export function aiRoll(difficulty: Difficulty, random: () => number = Math.random): StrikeRoll {
  const odds = AI_TIMING[difficulty];
  const r = random();
  if (r < odds.miss) return 'miss';
  if (r < odds.miss + odds.perfect) return 'perfect';
  return 'hit';
}

/** End-turn timing results for the given attacking lanes (other lanes stay null). */
export function strikesFor(
  lanes: readonly number[],
  roll: (lane: number) => StrikeRoll,
): (StrikeRoll | null)[] {
  const out: (StrikeRoll | null)[] = [];
  for (const lane of lanes) {
    while (out.length < lane) out.push(null);
    out[lane] = roll(lane);
  }
  return out;
}
