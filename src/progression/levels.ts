/**
 * Player XP, levels and level-based unlocks. Pure.
 */
import { PROGRESSION } from './config';

const T = PROGRESSION.xp.levelThresholds;
const AFTER_TABLE_STEP = 1100;

/** Total XP needed to reach `level` (level 1 = 0). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= T.length) return T[level - 1]!;
  return T[T.length - 1]! + (level - T.length) * AFTER_TABLE_STEP;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

/** Progress inside the current level, 0..1. */
export function levelProgress(xp: number): { level: number; into: number; needed: number; ratio: number } {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: xp - base, needed: next - base, ratio: (xp - base) / (next - base) };
}

export function deckSlotsUnlocked(level: number, totalSlots: number): number {
  const u = PROGRESSION.unlocks;
  return Math.min(totalSlots, u.deckSlotsBase + (level - 1) * u.deckSlotsPerLevel);
}

export function heroUnlockLevel(heroId: string): number {
  return PROGRESSION.unlocks.heroes[heroId] ?? 1;
}

export function heroUnlocked(heroId: string, level: number): boolean {
  return level >= heroUnlockLevel(heroId);
}

export function modeUnlockLevel(mode: string): number {
  return PROGRESSION.unlocks.modes[mode] ?? 1;
}

export function modeUnlocked(mode: string, level: number): boolean {
  return level >= modeUnlockLevel(mode);
}

/** Everything newly unlocked when going from `from` to `to` (for level-up popups). */
export function unlocksBetween(from: number, to: number, totalSlots: number): string[] {
  const out: string[] = [];
  for (const [hero, lvl] of Object.entries(PROGRESSION.unlocks.heroes))
    if (lvl > from && lvl <= to) out.push(`hero:${hero}`);
  for (const [mode, lvl] of Object.entries(PROGRESSION.unlocks.modes))
    if (lvl > from && lvl <= to) out.push(`mode:${mode}`);
  const slots = deckSlotsUnlocked(to, totalSlots) - deckSlotsUnlocked(from, totalSlots);
  if (slots > 0) out.push(`deckSlots:${slots}`);
  return out;
}
