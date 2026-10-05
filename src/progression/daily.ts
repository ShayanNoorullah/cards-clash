/**
 * Daily login rewards (7-day cycle) and daily quests (3 per day, chosen by a
 * date-seeded RNG so everyone gets the same set on a given day). Pure.
 */
import type { GameContent } from '../engine/content';
import { Rng } from '../engine/rng';
import type { QuestState, SaveData, StatKey } from '../save/saveData';
import { PROGRESSION, type QuestDef, type Reward } from './config';
import { grantReward, type RewardResult } from './rewards';

/** Local calendar day 'YYYY-MM-DD' for a timestamp. */
export function localDay(now: number): string {
  const d = new Date(now);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export function loginRewardAvailable(save: SaveData, now: number): boolean {
  return save.login.lastClaimDay !== localDay(now);
}

/** The reward for the next claim, and which day of the cycle it is (1..7). */
export function nextLoginReward(save: SaveData): { day: number; reward: Reward } {
  const i = save.login.streakIndex % PROGRESSION.login.length;
  return { day: i + 1, reward: PROGRESSION.login[i]! };
}

export function claimLogin(save: SaveData, now: number, content: GameContent, rng: Rng): RewardResult {
  if (!loginRewardAvailable(save, now))
    return { ok: false, error: 'Come back tomorrow for the next reward!' };
  const { reward } = nextLoginReward(save);
  const { save: next, summary } = grantReward(save, reward, content, rng);
  next.login = {
    lastClaimDay: localDay(now),
    streakIndex: (save.login.streakIndex + 1) % PROGRESSION.login.length,
  };
  return { ok: true, save: next, summary };
}

// ---------------------------------------------------------------------------
// Quests
// ---------------------------------------------------------------------------

export function questDef(id: string): QuestDef | undefined {
  return PROGRESSION.quests.pool.find((q) => q.id === id);
}

/** Replaces yesterday's quests with today's (same for everyone on a given day). */
export function ensureDailyQuests(save: SaveData, now: number): SaveData {
  const day = localDay(now);
  if (save.quests.day === day && save.quests.active.length > 0) return save;
  const picked = new Rng(`quests:${day}`).sample(PROGRESSION.quests.pool, PROGRESSION.quests.perDay);
  return { ...save, quests: { day, active: picked.map((q) => ({ id: q.id, progress: 0, claimed: false })) } };
}

/** Adds match counters to lifetime stats and to today's quest progress. */
export function addStats(save: SaveData, delta: Partial<Record<StatKey, number>>): SaveData {
  const next = structuredClone(save);
  for (const [k, v] of Object.entries(delta)) {
    const key = k as StatKey;
    next.lifetime[key] += v ?? 0;
  }
  next.quests.active = next.quests.active.map((q): QuestState => {
    const def = questDef(q.id);
    if (!def || q.claimed) return q;
    const add = delta[def.stat as StatKey] ?? 0;
    return { ...q, progress: Math.min(def.target, q.progress + add) };
  });
  return next;
}

export function questComplete(q: QuestState): boolean {
  const def = questDef(q.id);
  return !!def && q.progress >= def.target;
}

export function claimQuest(save: SaveData, id: string, content: GameContent, rng: Rng): RewardResult {
  const q = save.quests.active.find((x) => x.id === id);
  const def = questDef(id);
  if (!q || !def) return { ok: false, error: 'Unknown quest.' };
  if (q.claimed) return { ok: false, error: 'Already claimed.' };
  if (!questComplete(q)) return { ok: false, error: `Not finished yet (${q.progress}/${def.target}).` };
  const { save: next, summary } = grantReward(save, def.reward, content, rng);
  next.quests.active = next.quests.active.map((x) => (x.id === id ? { ...x, claimed: true } : x));
  return { ok: true, save: next, summary };
}
