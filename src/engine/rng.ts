/**
 * Deterministic, serializable pseudo-random number generation.
 *
 * The whole RNG state is a single unsigned 32-bit integer, so it can live inside
 * GameState, be sent over the network and be replayed exactly. Every random
 * decision in the engine MUST go through this module (Math.random is banned in
 * /src/engine by ESLint).
 *
 * Algorithm: mulberry32 (public domain, Tommy Ettinger).
 */

export type RngState = number;

/** Advances the state and returns [float in [0, 1), nextState]. Pure. */
export function nextFloat(state: RngState): [number, RngState] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/**
 * Hashes any string into a 32-bit seed (cyrb53 folded to 32 bits).
 * Used for date seeds ("2026-09-30"), room codes, card ids, etc.
 */
export function hashString(input: string): RngState {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

/** Normalizes a numeric or string seed to a valid RngState. */
export function toSeed(seed: number | string): RngState {
  if (typeof seed === 'string') return hashString(seed);
  if (!Number.isFinite(seed)) throw new Error(`Invalid RNG seed: ${seed}`);
  return Math.floor(seed) >>> 0;
}

/**
 * Mutable convenience wrapper around the pure functions above.
 * Read `state` back after use to persist it into GameState.
 */
export class Rng {
  private s: RngState;

  constructor(seed: number | string) {
    this.s = toSeed(seed);
  }

  /** Restores a generator from a previously saved state (no re-hashing). */
  static fromState(state: RngState): Rng {
    const rng = new Rng(0);
    rng.s = state >>> 0;
    return rng;
  }

  get state(): RngState {
    return this.s;
  }

  /** Float in [0, 1). */
  next(): number {
    const [value, next] = nextFloat(this.s);
    this.s = next;
    return value;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max)) throw new Error('Rng.int bounds must be integers');
    if (max < min) throw new Error(`Rng.int: max (${max}) < min (${min})`);
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** True with the given probability (0..1). */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /** Uniformly picks one element. Throws on an empty array. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: empty array');
    return items[this.int(0, items.length - 1)] as T;
  }

  /** Picks one element using non-negative weights. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    if (items.length === 0 || items.length !== weights.length) {
      throw new Error('Rng.weighted: items and weights must be non-empty and equal length');
    }
    let total = 0;
    for (const w of weights) {
      if (w < 0 || !Number.isFinite(w)) throw new Error('Rng.weighted: invalid weight');
      total += w;
    }
    if (total <= 0) throw new Error('Rng.weighted: total weight must be > 0');
    let roll = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i] as number;
      if (roll < 0) return items[i] as T;
    }
    return items[items.length - 1] as T;
  }

  /** Returns a new shuffled array (Fisher-Yates). The input is not modified. */
  shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const tmp = out[i] as T;
      out[i] = out[j] as T;
      out[j] = tmp;
    }
    return out;
  }

  /** Picks `count` distinct elements (or all of them, if fewer exist). */
  sample<T>(items: readonly T[], count: number): T[] {
    return this.shuffle(items).slice(0, Math.max(0, count));
  }

  /** Derives an independent child generator, e.g. one per AI simulation. */
  fork(label: string): Rng {
    return new Rng((hashString(label) ^ this.int(0, 0xffffffff)) >>> 0);
  }
}
