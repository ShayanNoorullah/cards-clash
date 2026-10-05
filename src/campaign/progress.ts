/**
 * Campaign progress: unlocks, star objectives, rewards and story beats.
 * Pure: takes the save and returns a new one.
 */
import type { GameContent } from '../engine/content';
import type { Rng } from '../engine/rng';
import type { DeckList, MatchRule } from '../engine/types';
import type { BossHooks, Difficulty } from '../ai/profiles';
import { PROGRESSION, type Reward } from '../progression/config';
import type { MatchStats } from '../progression/matchRewards';
import { grantReward, type RewardSummary } from '../progression/rewards';
import type { SaveData } from '../save/saveData';
import { rulesById, type Campaign, type CampaignNode, type Objective, type Region } from './config';

export function nodeStars(save: SaveData, nodeId: string): number {
  return save.campaign.stars[nodeId] ?? 0;
}

export function regionStars(save: SaveData, region: Region): number {
  return region.nodes.reduce((n, node) => n + nodeStars(save, node.id), 0);
}

export function totalStars(save: SaveData, campaign: Campaign): number {
  return campaign.regions.reduce((n, r) => n + regionStars(save, r), 0);
}

/** A region opens when the previous region's boss is beaten. */
export function regionUnlocked(save: SaveData, campaign: Campaign, regionIndex: number): boolean {
  if (regionIndex <= 0) return true;
  const prev = campaign.regions[regionIndex - 1];
  const boss = prev?.nodes[prev.nodes.length - 1];
  return boss !== undefined && nodeStars(save, boss.id) > 0;
}

/** A node opens when its region is open and the node before it has at least one star. */
export function nodeUnlocked(save: SaveData, campaign: Campaign, node: CampaignNode): boolean {
  if (!regionUnlocked(save, campaign, node.region)) return false;
  if (node.index === 0) return true;
  const prev = campaign.regions[node.region]?.nodes[node.index - 1];
  return prev !== undefined && nodeStars(save, prev.id) > 0;
}

/** The furthest node the player can play next (the first unlocked node without stars), or the last node. */
export function currentNode(save: SaveData, campaign: Campaign): CampaignNode {
  for (const r of campaign.regions) {
    for (const n of r.nodes) {
      if (nodeUnlocked(save, campaign, n) && nodeStars(save, n.id) === 0) return n;
    }
  }
  const last = campaign.regions[campaign.regions.length - 1]!;
  return last.nodes[last.nodes.length - 1]!;
}

export function campaignComplete(save: SaveData, campaign: Campaign): boolean {
  const last = campaign.regions[campaign.regions.length - 1]!;
  return nodeStars(save, last.nodes[last.nodes.length - 1]!.id) > 0;
}

// ---------------------------------------------------------------------------
// Stars
// ---------------------------------------------------------------------------

/** What the stars are judged on, from the finished match (human seat's view). */
export interface NodeResult {
  won: boolean;
  /** Turns the player took. */
  turnsTaken: number;
  heroHp: number;
  stats: MatchStats;
}

export function objectiveMet(o: Objective, r: NodeResult): boolean {
  switch (o.type) {
    case 'winWithinTurns':
      return r.won && r.turnsTaken <= o.value;
    case 'heroHpAtLeast':
      return r.won && r.heroHp >= o.value;
    case 'destroyCreatures':
      return r.stats.creaturesDestroyed >= o.value;
    case 'playCreatures':
      return r.stats.creaturesPlayed >= o.value;
    case 'castSpells':
      return r.stats.spellsCast >= o.value;
    case 'useUltimate':
      return r.stats.ultimatesUsed >= o.value;
    case 'noUltimate':
      return r.won && r.stats.ultimatesUsed === 0;
    case 'floops':
      return r.stats.floops >= o.value;
  }
}

/** Winning gives the first star; each objective met (in a win) adds one more. Losing gives none. */
export function evaluateStars(node: CampaignNode, r: NodeResult): { stars: number; met: boolean[] } {
  const met = node.stars.map((o) => r.won && objectiveMet(o, r));
  return { stars: r.won ? 1 + met.filter(Boolean).length : 0, met };
}

// ---------------------------------------------------------------------------
// Result and rewards
// ---------------------------------------------------------------------------

export interface CampaignResultSummary {
  nodeId: string;
  stars: number;
  previousStars: number;
  met: boolean[];
  firstClear: boolean;
  bossCleared: boolean;
  /** Region index opened by this win, if any. */
  regionUnlocked: number | null;
  reward: RewardSummary;
}

/** Records stars for a node and grants first-clear, new-star and boss rewards (on top of match rewards). */
export function applyCampaignResult(
  save: SaveData,
  campaign: Campaign,
  nodeId: string,
  result: NodeResult,
  content: GameContent,
  rng: Rng,
): { save: SaveData; summary: CampaignResultSummary } {
  const node = campaign.nodes.get(nodeId);
  if (!node) throw new Error(`Unknown campaign node ${nodeId}`);
  const previousStars = nodeStars(save, nodeId);
  const { stars, met } = evaluateStars(node, result);
  const best = Math.max(previousStars, stars);
  const firstClear = previousStars === 0 && stars > 0;
  const nextRegionWasLocked = !regionUnlocked(save, campaign, node.region + 1);

  const cfg = PROGRESSION.campaign;
  const reward: Reward = { gems: (best - previousStars) * cfg.gemsPerNewStar };
  if (firstClear) {
    reward.coins = cfg.firstClearCoins[node.region] ?? 0;
    reward.xp = cfg.firstClearXp[node.region] ?? 0;
    const bossReward = node.boss ? cfg.bossFirstClear[node.region] : undefined;
    if (bossReward) {
      reward.gems = (reward.gems ?? 0) + (bossReward.gems ?? 0);
      reward.coins += bossReward.coins ?? 0;
      if (bossReward.chest) reward.chest = bossReward.chest;
    }
  }
  const withStars: SaveData = {
    ...save,
    campaign: { ...save.campaign, stars: { ...save.campaign.stars, [nodeId]: best } },
  };
  if (best === 0) delete withStars.campaign.stars[nodeId];
  const granted = grantReward(withStars, reward, content, rng);
  const bossCleared = node.boss !== null && firstClear;
  const opened =
    bossCleared &&
    nextRegionWasLocked &&
    node.region + 1 < campaign.regions.length &&
    regionUnlocked(granted.save, campaign, node.region + 1);
  return {
    save: granted.save,
    summary: {
      nodeId,
      stars,
      previousStars,
      met,
      firstClear,
      bossCleared,
      regionUnlocked: opened ? node.region + 1 : null,
      reward: granted.summary,
    },
  };
}

// ---------------------------------------------------------------------------
// Match setup
// ---------------------------------------------------------------------------

export interface CampaignOpponent {
  name: string;
  deck: DeckList;
  ai: Difficulty;
  hooks?: BossHooks;
  /** Rules for [player, enemy]. */
  rules: [MatchRule[], MatchRule[]];
}

/** The enemy for a node: its deck at the node's card level, AI, boss hooks and rules. */
export function campaignOpponent(
  campaign: Campaign,
  node: CampaignNode,
  content: GameContent,
): CampaignOpponent {
  const deck = campaign.decks.get(node.deck);
  if (!deck) throw new Error(`Unknown campaign deck ${node.deck}`);
  const levels: Record<string, number> = {};
  for (const id of new Set(deck.cards)) levels[id] = node.level;
  const hero = content.ctx.heroes.byId.get(deck.heroId);
  const out: CampaignOpponent = {
    name: hero?.name ?? node.name,
    deck: { heroId: deck.heroId, landscapes: [...deck.landscapes], cards: [...deck.cards], levels },
    ai: node.ai,
    rules: [rulesById(campaign, node.playerRules), rulesById(campaign, node.enemyRules)],
  };
  if (node.boss?.hooks) out.hooks = node.boss.hooks;
  return out;
}

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------

export interface StoryBeat {
  key: string;
  region: Region;
  kind: 'intro' | 'outro';
  text: string;
}

/** The next story text the player has not seen yet: a region's outro, then the next region's intro. */
export function pendingStory(save: SaveData, campaign: Campaign): StoryBeat | null {
  const seen = new Set(save.campaign.storySeen);
  for (let i = 0; i < campaign.regions.length; i++) {
    const region = campaign.regions[i]!;
    if (!regionUnlocked(save, campaign, i)) break;
    const intro = `${region.id}:intro`;
    if (!seen.has(intro)) return { key: intro, region, kind: 'intro', text: region.intro };
    const boss = region.nodes[region.nodes.length - 1]!;
    const outro = `${region.id}:outro`;
    if (nodeStars(save, boss.id) > 0 && !seen.has(outro))
      return { key: outro, region, kind: 'outro', text: region.outro };
  }
  return null;
}

export function markStorySeen(save: SaveData, key: string): SaveData {
  if (save.campaign.storySeen.includes(key)) return save;
  return { ...save, campaign: { ...save.campaign, storySeen: [...save.campaign.storySeen, key] } };
}
