/**
 * Typed, validated access to src/data/progression.json.
 */
import raw from '../data/progression.json';
import { DIFFICULTIES, type Difficulty } from '../ai/profiles';
import { RARITIES, type Rarity } from '../engine/types';
import { CHEST_TYPES, STAT_KEYS, type ChestType } from '../save/saveData';

export type Odds = Record<Rarity, number>;

export interface Reward {
  coins?: number;
  gems?: number;
  dust?: number;
  xp?: number;
  chest?: ChestType;
}

export interface ChestDef {
  name: string;
  unlockMinutes: number;
  coins: [number, number];
  cards: number;
  dust: [number, number];
  gemsChance: number;
  gems: [number, number];
  odds: Odds;
}

export interface PackDef {
  id: string;
  name: string;
  description: string;
  cost: { coins?: number; gems?: number };
  cards: number;
  guaranteed: Rarity;
  landscapeChoice?: boolean;
  odds: Odds;
}

export interface QuestDef {
  id: string;
  text: string;
  stat: string;
  target: number;
  reward: Reward;
}

export interface AchievementDef extends QuestDef {
  name: string;
}

export interface ProgressionConfig {
  xp: {
    match: { win: number; loss: number; draw: number };
    levelThresholds: number[];
    levelUpReward: { coins: number; gemsEvery5Levels: number };
  };
  matchCoins: { win: number; loss: number; draw: number };
  unlocks: {
    deckSlotsBase: number;
    deckSlotsPerLevel: number;
    heroes: Record<string, number>;
    modes: Record<string, number>;
  };
  chests: {
    slots: number;
    freeChest: { type: ChestType; intervalHours: number };
    minutesPerGem: number;
    victoryDrop: Record<ChestType, number>;
    types: Record<ChestType, ChestDef>;
  };
  packs: PackDef[];
  login: Reward[];
  quests: { perDay: number; pool: QuestDef[] };
  achievements: AchievementDef[];
  campaign: {
    /** Per region (index 0..7). */
    firstClearCoins: number[];
    firstClearXp: number[];
    gemsPerNewStar: number;
    bossFirstClear: Reward[];
  };
  modes: {
    daily: {
      reward: Reward;
      ai: Difficulty;
      cardLevel: number;
      /** Deck ids (starter or campaign decks) the dungeon can pick from. */
      decks: string[];
      enemyModifiers: string[];
      playerModifiers: string[];
    };
    gauntlet: {
      battles: number;
      /** Hero HP restored after each win (HP otherwise carries over). */
      healBetween: number;
      ai: Difficulty[];
      cardLevels: number[];
      /** Reward by number of wins (index 0..battles). */
      rewards: Reward[];
    };
    draft: {
      entry: { coins?: number; gems?: number };
      picks: number;
      maxWins: number;
      maxLosses: number;
      odds: Odds;
      basicsPerLandscape: number;
      /** Enemy AI by current win count. */
      ai: Difficulty[];
      cardLevel: number;
      /** Reward by number of wins (index 0..maxWins). */
      rewards: Reward[];
    };
    sandbox: { dummyHp: number };
  };
  cosmetics: {
    cardBacks: { id: string; name: string; unlock: { type: 'default' | 'level' | 'stars'; value: number } }[];
  };
}

const DERIVED_STATS = ['uniqueCards', 'maxCardLevel', 'playerLevel'];

export function validateProgression(c: ProgressionConfig): string[] {
  const errors: string[] = [];
  const checkOdds = (odds: Odds, where: string) => {
    for (const r of RARITIES)
      if (typeof odds[r] !== 'number' || odds[r] < 0) errors.push(`${where}: odds.${r} must be >= 0`);
    const sum = RARITIES.reduce((s, r) => s + (odds[r] ?? 0), 0);
    if (Math.abs(sum - 1) > 1e-6) errors.push(`${where}: odds must sum to 1 (got ${sum})`);
  };
  const t = c.xp.levelThresholds;
  if (t[0] !== 0 || t.some((v, i) => i > 0 && v <= t[i - 1]!))
    errors.push('xp.levelThresholds must start at 0 and increase');
  for (const type of CHEST_TYPES) {
    const def = c.chests.types[type];
    if (!def) errors.push(`chests.types.${type} is missing`);
    else checkOdds(def.odds, `chest ${type}`);
  }
  const drop = CHEST_TYPES.reduce((s, ty) => s + (c.chests.victoryDrop[ty] ?? 0), 0);
  if (Math.abs(drop - 1) > 1e-6) errors.push('chests.victoryDrop must sum to 1');
  for (const p of c.packs) checkOdds(p.odds, `pack ${p.id}`);
  if (c.login.length !== 7) errors.push('login must have 7 days');
  const statOk = (s: string) => (STAT_KEYS as readonly string[]).includes(s) || DERIVED_STATS.includes(s);
  for (const q of c.quests.pool) if (!statOk(q.stat)) errors.push(`quest ${q.id}: unknown stat ${q.stat}`);
  for (const a of c.achievements)
    if (!statOk(a.stat)) errors.push(`achievement ${a.id}: unknown stat ${a.stat}`);
  if (c.quests.pool.length < c.quests.perDay) errors.push('quest pool smaller than quests per day');
  const ids = [...c.quests.pool.map((q) => q.id), ...c.achievements.map((a) => a.id)];
  if (new Set(ids).size !== ids.length) errors.push('quest/achievement ids must be unique');
  const camp = c.campaign;
  for (const k of ['firstClearCoins', 'firstClearXp', 'bossFirstClear'] as const)
    if (!Array.isArray(camp[k]) || camp[k].length !== 8) errors.push(`campaign.${k} needs 8 entries`);
  const m = c.modes;
  const ais = [m.daily.ai, ...m.gauntlet.ai, ...m.draft.ai];
  if (ais.some((a) => !DIFFICULTIES.includes(a))) errors.push('modes: unknown AI difficulty');
  if (m.gauntlet.ai.length !== m.gauntlet.battles || m.gauntlet.cardLevels.length !== m.gauntlet.battles)
    errors.push('modes.gauntlet: ai and cardLevels need one entry per battle');
  if (m.gauntlet.rewards.length !== m.gauntlet.battles + 1)
    errors.push('modes.gauntlet.rewards needs battles + 1 entries');
  if (m.draft.rewards.length !== m.draft.maxWins + 1)
    errors.push('modes.draft.rewards needs maxWins + 1 entries');
  if (m.draft.ai.length < m.draft.maxWins + m.draft.maxLosses - 1)
    errors.push('modes.draft.ai needs an entry for every possible battle');
  checkOdds(m.draft.odds, 'draft');
  return errors;
}

export const PROGRESSION = raw as unknown as ProgressionConfig;
const problems = validateProgression(PROGRESSION);
if (problems.length > 0) throw new Error(`Invalid progression.json:\n- ${problems.join('\n- ')}`);
