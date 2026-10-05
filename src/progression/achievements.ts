/**
 * Achievements: long-term goals read from lifetime stats (plus a few derived
 * values), each claimable once. Pure.
 */
import type { GameContent } from '../engine/content';
import type { Rng } from '../engine/rng';
import type { SaveData, StatKey } from '../save/saveData';
import { PROGRESSION, type AchievementDef } from './config';
import { grantReward, type RewardResult } from './rewards';

export function statValue(save: SaveData, stat: string): number {
  switch (stat) {
    case 'uniqueCards':
      return Object.values(save.collection).filter((c) => c.count > 0).length;
    case 'maxCardLevel':
      return Math.max(1, ...Object.values(save.collection).map((c) => c.level));
    case 'playerLevel':
      return save.progression.level;
    default:
      return save.lifetime[stat as StatKey] ?? 0;
  }
}

export interface AchievementStatus {
  def: AchievementDef;
  progress: number;
  done: boolean;
  claimed: boolean;
}

export function achievementStatus(save: SaveData, _content?: GameContent): AchievementStatus[] {
  return PROGRESSION.achievements.map((def) => {
    const progress = Math.min(def.target, statValue(save, def.stat));
    return {
      def,
      progress,
      done: progress >= def.target,
      claimed: save.achievements.claimed.includes(def.id),
    };
  });
}

export function claimableAchievements(save: SaveData): number {
  return achievementStatus(save).filter((a) => a.done && !a.claimed).length;
}

export function claimAchievement(save: SaveData, id: string, content: GameContent, rng: Rng): RewardResult {
  const status = achievementStatus(save).find((a) => a.def.id === id);
  if (!status) return { ok: false, error: 'Unknown achievement.' };
  if (status.claimed) return { ok: false, error: 'Already claimed.' };
  if (!status.done) return { ok: false, error: `Not done yet (${status.progress}/${status.def.target}).` };
  const { save: next, summary } = grantReward(save, status.def.reward, content, rng);
  next.achievements.claimed = [...next.achievements.claimed, id];
  return { ok: true, save: next, summary };
}
