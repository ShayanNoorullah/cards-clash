import { describe, expect, it } from 'vitest';
import { Rng, hashString, nextFloat, toSeed } from '../src/engine/rng';

describe('mulberry32 RNG', () => {
  it('produces the known reference sequence (guards against accidental algorithm changes)', () => {
    const rng = new Rng(1);
    const values = Array.from({ length: 5 }, () => rng.next());
    expect(values).toEqual(GOLDEN_SEED_1);
  });

  it('is deterministic for the same seed', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next());
  });

  it('differs for different seeds', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('accepts string seeds deterministically', () => {
    expect(new Rng('2026-09-30').next()).toBe(new Rng('2026-09-30').next());
    expect(new Rng('2026-09-30').next()).not.toBe(new Rng('2026-10-01').next());
  });

  it('pure nextFloat matches the class wrapper and never mutates input', () => {
    const rng = new Rng(99);
    let state = toSeed(99);
    for (let i = 0; i < 50; i++) {
      const [value, next] = nextFloat(state);
      expect(rng.next()).toBe(value);
      expect(rng.state).toBe(next);
      state = next;
    }
  });

  it('can be saved and resumed from its state (serializable)', () => {
    const rng = new Rng('save-me');
    for (let i = 0; i < 17; i++) rng.next();
    const saved = JSON.parse(JSON.stringify({ s: rng.state })) as { s: number };
    const resumed = Rng.fromState(saved.s);
    for (let i = 0; i < 100; i++) expect(resumed.next()).toBe(rng.next());
  });

  it('next() stays in [0, 1)', () => {
    const rng = new Rng(7);
    let outOfRange = 0;
    for (let i = 0; i < 100_000; i++) {
      const v = rng.next();
      if (!(v >= 0 && v < 1)) outOfRange++;
    }
    expect(outOfRange).toBe(0);
  });

  it('int() is inclusive and roughly uniform', () => {
    const rng = new Rng(42);
    const counts = new Array<number>(6).fill(0);
    const n = 60_000;
    for (let i = 0; i < n; i++) {
      counts[rng.int(1, 6) - 1]!++;
    }
    // Chi-square with 5 degrees of freedom; 20.5 ≈ p < 0.001.
    expect(counts.reduce((a, b) => a + b, 0)).toBe(n); // every value landed in 1..6
    const expected = n / 6;
    const chi = counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
    expect(chi).toBeLessThan(20.5);
  });

  it('int() rejects invalid bounds', () => {
    const rng = new Rng(1);
    expect(() => rng.int(5, 1)).toThrow();
    expect(() => rng.int(0.5, 2)).toThrow();
    expect(rng.int(3, 3)).toBe(3);
  });

  it('shuffle() returns a permutation without mutating the input', () => {
    const rng = new Rng(3);
    const input = Array.from({ length: 40 }, (_, i) => i);
    const copy = input.slice();
    const out = rng.shuffle(input);
    expect(input).toEqual(copy);
    expect(out).not.toEqual(input);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it('shuffle() is deterministic per seed', () => {
    const deck = Array.from({ length: 40 }, (_, i) => `card-${i}`);
    expect(new Rng('deck').shuffle(deck)).toEqual(new Rng('deck').shuffle(deck));
  });

  it('pick(), sample() and weighted() behave', () => {
    const rng = new Rng(5);
    expect(() => rng.pick([])).toThrow();
    expect(['a', 'b', 'c']).toContain(rng.pick(['a', 'b', 'c']));

    const sample = rng.sample([1, 2, 3, 4, 5], 3);
    expect(sample).toHaveLength(3);
    expect(new Set(sample).size).toBe(3);
    expect(rng.sample([1, 2], 5)).toHaveLength(2);

    const hits = { a: 0, b: 0 };
    for (let i = 0; i < 10_000; i++) hits[rng.weighted(['a', 'b'] as const, [1, 0])]++;
    expect(hits.b).toBe(0);
    expect(() => rng.weighted(['a'], [0])).toThrow();
    expect(() => rng.weighted(['a'], [-1])).toThrow();
  });

  it('fork() gives independent but reproducible children', () => {
    const a = new Rng(10).fork('ai');
    const b = new Rng(10).fork('ai');
    const c = new Rng(10).fork('other');
    expect(a.next()).toBe(b.next());
    expect(new Rng(10).fork('ai').next()).not.toBe(c.next());
  });

  it('hashString is stable and 32-bit', () => {
    expect(hashString('cards-clash')).toBe(hashString('cards-clash'));
    expect(hashString('a')).not.toBe(hashString('b'));
    const h = hashString('anything');
    expect(Number.isInteger(h) && h >= 0 && h <= 0xffffffff).toBe(true);
  });

  it('toSeed rejects non-finite numbers', () => {
    expect(() => toSeed(Number.NaN)).toThrow();
    expect(() => toSeed(Infinity)).toThrow();
    expect(toSeed(-1)).toBe(0xffffffff);
  });
});

// Reference output of canonical mulberry32 seeded with 1.
const GOLDEN_SEED_1 = [
  0.6270739405881613, 0.002735721180215478, 0.5274470399599522, 0.9810509674716741, 0.9683778982143849,
];
