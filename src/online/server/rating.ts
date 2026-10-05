/**
 * Elo-style rating with seasonal tiers and a soft reset between seasons. Pure.
 */
import raw from '../../data/online.json';

export const ONLINE = raw;

export function tierOf(rating: number): string {
  let name = ONLINE.rating.tiers[0]!.name;
  for (const t of ONLINE.rating.tiers) if (rating >= t.min) name = t.name;
  return name;
}

/** Expected score of A against B. */
export function expectedScore(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

/**
 * New rating after one game. `score` is 1 for a win, 0.5 for a draw, 0 for a
 * loss. New players (few games) move faster.
 */
export function updateRating(rating: number, opponent: number, score: number, gamesPlayed: number): number {
  const k = gamesPlayed < ONLINE.rating.newPlayerGames ? ONLINE.rating.kNew : ONLINE.rating.k;
  return Math.max(0, Math.round(rating + k * (score - expectedScore(rating, opponent))));
}

/** Start of a new season: everyone moves halfway back to the starting rating. */
export function softReset(rating: number): number {
  const start = ONLINE.rating.start;
  return Math.round(start + (rating - start) * ONLINE.rating.softResetFactor);
}

/** Matchmaking window (rating difference) that widens the longer you wait. */
export function matchWindow(waitSeconds: number): number {
  const m = ONLINE.matchmaking;
  return Math.min(m.maxWindow, m.baseWindow + m.windowPerSecond * Math.max(0, waitSeconds));
}
