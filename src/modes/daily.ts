/**
 * Daily Dungeon: one challenge per local calendar day, picked from the date
 * alone (same dungeon for everyone on that day). Unlimited attempts; the first
 * win of the day pays the dungeon reward. Pure.
 */
import type { Difficulty } from '../ai/profiles';
import { rulesById, type Campaign } from '../campaign/config';
import type { GameContent } from '../engine/content';
import { Rng } from '../engine/rng';
import type { DeckList, MatchRule } from '../engine/types';
import { PROGRESSION } from '../progression/config';
import { localDay } from '../progression/daily';
import { grantReward, type RewardSummary } from '../progression/rewards';
import type { SaveData } from '../save/saveData';

export interface DailyDungeon {
  day: string;
  seed: string;
  deckId: string;
  enemyName: string;
  enemyDeck: DeckList;
  ai: Difficulty;
  /** Rules for [player, enemy]. */
  rules: [MatchRule[], MatchRule[]];
}

export function dailyDungeon(day: string, campaign: Campaign, content: GameContent): DailyDungeon {
  const cfg = PROGRESSION.modes.daily;
  const rng = new Rng(`daily:${day}`);
  const deckId = rng.pick(cfg.decks);
  const deck = campaign.decks.get(deckId);
  if (!deck) throw new Error(`Daily dungeon deck ${deckId} does not exist`);
  const enemyRules = [rng.pick(cfg.enemyModifiers)];
  const playerRules = rng.chance(0.5) ? [rng.pick(cfg.playerModifiers)] : [];
  const levels: Record<string, number> = {};
  for (const id of new Set(deck.cards)) levels[id] = cfg.cardLevel;
  return {
    day,
    seed: `daily:${day}`,
    deckId,
    enemyName: content.ctx.heroes.byId.get(deck.heroId)?.name ?? deck.name,
    enemyDeck: { heroId: deck.heroId, landscapes: [...deck.landscapes], cards: [...deck.cards], levels },
    ai: cfg.ai,
    rules: [rulesById(campaign, playerRules), rulesById(campaign, enemyRules)],
  };
}

/** Today's progress (resets when the day changes). */
export function dailyStatus(save: SaveData, now: number): { day: string; won: boolean; attempts: number } {
  const day = localDay(now);
  const d = save.modes.daily;
  return d.day === day ? { day, won: d.won, attempts: d.attempts } : { day, won: false, attempts: 0 };
}

/** Milliseconds until the next local midnight (when a new dungeon appears). */
export function msUntilNextDungeon(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - now;
}

/** Records an attempt; the first win of the day pays the reward. */
export function recordDaily(
  save: SaveData,
  now: number,
  won: boolean,
  content: GameContent,
  rng: Rng,
): { save: SaveData; reward: RewardSummary | null } {
  const status = dailyStatus(save, now);
  const firstWin = won && !status.won;
  const next: SaveData = {
    ...save,
    modes: {
      ...save.modes,
      daily: { day: status.day, won: status.won || won, attempts: status.attempts + 1 },
    },
  };
  if (!firstWin) return { save: next, reward: null };
  const granted = grantReward(next, PROGRESSION.modes.daily.reward, content, rng);
  return { save: granted.save, reward: granted.summary };
}
