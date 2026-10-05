import { describe, expect, it } from 'vitest';
import {
  AI_TIMING,
  aiRoll,
  MISS_SPAN,
  PERFECT_SPAN,
  randomDial,
  rollAt,
  strikesFor,
} from '../src/match/strikeTiming';
import { sanitizeSettings } from '../src/services/settings';

/** A seeded stand-in for Math.random. */
function seq(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

describe('attack timing dial', () => {
  const dial = { missStart: 300, missSpan: 80, perfectStart: 100, perfectSpan: 28 };

  it('scores the needle by zone, wrapping past 12 o’clock', () => {
    expect(rollAt(dial, 100)).toBe('perfect');
    expect(rollAt(dial, 127.9)).toBe('perfect');
    expect(rollAt(dial, 128)).toBe('hit');
    expect(rollAt(dial, 310)).toBe('miss');
    expect(rollAt(dial, 10)).toBe('miss'); // 300° + 80° wraps to 20°
    expect(rollAt(dial, 20)).toBe('hit');
    expect(rollAt(dial, -50)).toBe('miss');
  });

  it('never overlaps the Perfect and Miss zones', () => {
    const random = seq(7);
    for (let i = 0; i < 500; i++) {
      const d = randomDial(random);
      let perfect = 0;
      let miss = 0;
      for (let a = 0; a < 360; a++) {
        const r = rollAt(d, a);
        if (r === 'perfect') perfect++;
        if (r === 'miss') miss++;
      }
      expect(perfect).toBe(PERFECT_SPAN);
      expect(miss).toBe(MISS_SPAN);
    }
  });
});

describe('AI attack timing', () => {
  it('matches the difficulty odds and favours stronger opponents', () => {
    const random = seq(11);
    for (const [difficulty, odds] of Object.entries(AI_TIMING)) {
      const n = 20000;
      let miss = 0;
      let perfect = 0;
      for (let i = 0; i < n; i++) {
        const r = aiRoll(difficulty as keyof typeof AI_TIMING, random);
        if (r === 'miss') miss++;
        if (r === 'perfect') perfect++;
      }
      expect(miss / n).toBeCloseTo(odds.miss, 1);
      expect(perfect / n).toBeCloseTo(odds.perfect, 1);
    }
    expect(AI_TIMING.nightmare.miss).toBeLessThan(AI_TIMING.easy.miss);
    expect(AI_TIMING.nightmare.perfect).toBeGreaterThan(AI_TIMING.easy.perfect);
  });

  it('builds end-turn results for the attacking lanes only', () => {
    expect(strikesFor([1, 3], (lane) => (lane === 1 ? 'perfect' : 'miss'))).toEqual([
      null,
      'perfect',
      null,
      'miss',
    ]);
    expect(strikesFor([], () => 'hit')).toEqual([]);
  });
});

describe('attack timing setting', () => {
  it('is on by default and can be turned off', () => {
    expect(sanitizeSettings({}).attackTiming).toBe(true);
    expect(sanitizeSettings({ attackTiming: false }).attackTiming).toBe(false);
    expect(sanitizeSettings({ attackTiming: 'no' as never }).attackTiming).toBe(true);
  });
});
