/**
 * Gauntlet: a run of consecutive battles with one deck. Hero HP carries over
 * between battles (with a small heal after each win); a loss ends the run.
 * Rewards depend on wins and are claimed when the run is over. Pure.
 */
import type { Difficulty } from '../ai/profiles';
import type { Campaign } from '../campaign/config';
import type { GameContent } from '../engine/content';
import { Rng } from '../engine/rng';
import type { DeckList } from '../engine/types';
import { PROGRESSION, type Reward } from '../progression/config';
import { grantReward, type RewardSummary } from '../progression/rewards';
import type { GauntletRun, RunDeck, SaveData } from '../save/saveData';

export type RunResult = { ok: true; save: SaveData } | { ok: false; error: string };

export function startGauntlet(save: SaveData, deck: RunDeck, seed: string, content: GameContent): RunResult {
  if (save.modes.gauntlet && !save.modes.gauntlet.over)
    return { ok: false, error: 'Finish or abandon your current Gauntlet first.' };
  if (save.modes.gauntlet?.over) return { ok: false, error: 'Claim your Gauntlet rewards first.' };
  const run: GauntletRun = { seed, deck, hp: content.ctx.balance.heroMaxHp, wins: 0, over: false };
  return { ok: true, save: { ...save, modes: { ...save.modes, gauntlet: run } } };
}

export interface GauntletOpponent {
  battle: number;
  name: string;
  deck: DeckList;
  ai: Difficulty;
  level: number;
  final: boolean;
}

/** The next opponent: starter decks first, a boss deck for the final battle. */
export function gauntletOpponent(
  run: GauntletRun,
  campaign: Campaign,
  content: GameContent,
): GauntletOpponent {
  const cfg = PROGRESSION.modes.gauntlet;
  const battle = Math.min(run.wins, cfg.battles - 1);
  const rng = new Rng(`${run.seed}:battle:${battle}`);
  const final = battle === cfg.battles - 1;
  const pool = final
    ? [...campaign.bosses.values()].slice(0, 6).map((b) => campaign.decks.get(b.deck)!)
    : content.starterDecks.filter((d) => d.heroId !== run.deck.heroId);
  const deck = rng.pick(pool.length > 0 ? pool : content.starterDecks);
  const level = cfg.cardLevels[battle] ?? 1;
  const levels: Record<string, number> = {};
  for (const id of new Set(deck.cards)) levels[id] = level;
  return {
    battle,
    name: content.ctx.heroes.byId.get(deck.heroId)?.name ?? deck.name,
    deck: { heroId: deck.heroId, landscapes: [...deck.landscapes], cards: [...deck.cards], levels },
    ai: cfg.ai[battle] ?? 'normal',
    level,
    final,
  };
}

/** Records a battle. A win heals a little and moves on; a loss (or the last win) ends the run. */
export function recordGauntlet(save: SaveData, won: boolean, hpLeft: number, content: GameContent): SaveData {
  const run = save.modes.gauntlet;
  if (!run || run.over) return save;
  const cfg = PROGRESSION.modes.gauntlet;
  const next: GauntletRun = { ...run };
  if (won) {
    next.wins = run.wins + 1;
    next.hp = Math.min(content.ctx.balance.heroMaxHp, Math.max(1, hpLeft) + cfg.healBetween);
    next.over = next.wins >= cfg.battles;
  } else {
    next.hp = 0;
    next.over = true;
  }
  return { ...save, modes: { ...save.modes, gauntlet: next } };
}

export function gauntletReward(wins: number): Reward {
  const r = PROGRESSION.modes.gauntlet.rewards;
  return r[Math.min(wins, r.length - 1)] ?? {};
}

/** Ends the run early; rewards for the wins so far can still be claimed. */
export function abandonGauntlet(save: SaveData): SaveData {
  const run = save.modes.gauntlet;
  if (!run || run.over) return save;
  return { ...save, modes: { ...save.modes, gauntlet: { ...run, over: true } } };
}

export function claimGauntlet(
  save: SaveData,
  content: GameContent,
  rng: Rng,
): { ok: true; save: SaveData; summary: RewardSummary } | { ok: false; error: string } {
  const run = save.modes.gauntlet;
  if (!run?.over) return { ok: false, error: 'The Gauntlet is not over yet.' };
  const cleared = { ...save, modes: { ...save.modes, gauntlet: null } };
  const granted = grantReward(cleared, gauntletReward(run.wins), content, rng);
  return { ok: true, save: granted.save, summary: granted.summary };
}
