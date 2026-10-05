/**
 * Turns a finished match into progression: per-match stats from engine events,
 * lifetime stats, quest progress, XP, Coins and a victory chest. Pure.
 */
import type { GameContent } from '../engine/content';
import type { GameEvent } from '../engine/events';
import type { Rng } from '../engine/rng';
import type { PlayerId, RulesContext } from '../engine/types';
import type { ChestType, SaveData, StatKey } from '../save/saveData';
import { PROGRESSION } from './config';
import { addStats, ensureDailyQuests, questComplete } from './daily';
import { awardVictoryChest, grantReward, type RewardSummary } from './rewards';

export type MatchStats = Pick<
  Record<StatKey, number>,
  'creaturesPlayed' | 'spellsCast' | 'heroDamage' | 'creaturesDestroyed' | 'ultimatesUsed' | 'floops'
>;

export function emptyMatchStats(): MatchStats {
  return {
    creaturesPlayed: 0,
    spellsCast: 0,
    heroDamage: 0,
    creaturesDestroyed: 0,
    ultimatesUsed: 0,
    floops: 0,
  };
}

/** Adds one batch of events to a player's match stats (mutates `stats`). */
export function accumulateMatchStats(
  stats: MatchStats,
  events: readonly GameEvent[],
  player: PlayerId,
  ctx: RulesContext,
): void {
  for (const e of events) {
    switch (e.type) {
      case 'cardPlayed':
        if (e.player !== player) break;
        if (ctx.cards.byId.get(e.cardId)?.type === 'creature') stats.creaturesPlayed++;
        else if (ctx.cards.byId.get(e.cardId)?.type === 'spell') stats.spellsCast++;
        break;
      case 'damage':
        if (e.target.kind === 'hero' && e.target.player !== player && e.sourcePlayer === player)
          stats.heroDamage += e.amount;
        break;
      case 'creatureDestroyed':
        if (e.player !== player) stats.creaturesDestroyed++;
        break;
      case 'ultimateUsed':
        if (e.player === player) stats.ultimatesUsed++;
        break;
      case 'floop':
        if (e.player === player) stats.floops++;
        break;
      default:
        break;
    }
  }
}

export type Outcome = 'win' | 'loss' | 'draw';

export interface MatchRewardSummary extends RewardSummary {
  outcome: Outcome;
  xpBefore: number;
  levelBefore: number;
  /** Victory chest placed in a slot; 'full' when a win found no free slot. */
  victoryChest: ChestType | 'full' | null;
  questsCompleted: string[];
}

/**
 * Applies a vs-AI match result. (Hot-seat matches give no rewards, so a single
 * player can't farm by playing both sides.)
 */
export function applyMatchResult(
  save: SaveData,
  outcome: Outcome,
  stats: MatchStats,
  now: number,
  content: GameContent,
  rng: Rng,
): { save: SaveData; summary: MatchRewardSummary } {
  const withQuests = ensureDailyQuests(save, now);
  const doneBefore = new Set(withQuests.quests.active.filter(questComplete).map((q) => q.id));
  let next = addStats(withQuests, {
    ...stats,
    matches: 1,
    wins: outcome === 'win' ? 1 : 0,
    losses: outcome === 'loss' ? 1 : 0,
    draws: outcome === 'draw' ? 1 : 0,
  });
  const questsCompleted = next.quests.active
    .filter((q) => questComplete(q) && !doneBefore.has(q.id))
    .map((q) => q.id);

  const granted = grantReward(
    next,
    { xp: PROGRESSION.xp.match[outcome], coins: PROGRESSION.matchCoins[outcome] },
    content,
    rng,
  );
  next = granted.save;
  let victoryChest: MatchRewardSummary['victoryChest'] = null;
  if (outcome === 'win') {
    const chest = awardVictoryChest(next, rng);
    next = chest.save;
    victoryChest = chest.chest ?? 'full';
  }
  return {
    save: next,
    summary: {
      ...granted.summary,
      outcome,
      xpBefore: save.progression.xp,
      levelBefore: save.progression.level,
      victoryChest,
      questsCompleted,
    },
  };
}
