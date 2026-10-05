/**
 * Typed, validated access to the campaign content: src/data/campaign.json
 * (regions, nodes, bosses, story), campaign-decks.json (boss decks) and
 * match-rules.json (node modifiers and boss rules). Pure: no Phaser.
 */
import rawCampaign from '../data/campaign.json';
import rawDecks from '../data/campaign-decks.json';
import rawRules from '../data/match-rules.json';
import { DIFFICULTIES, type BossHooks, type Difficulty } from '../ai/profiles';
import { createRuleDb } from '../engine/cards';
import { getContent, type GameContent } from '../engine/content';
import { expandCounts, validateDeck } from '../engine/deck';
import { countLandscapesIn } from '../engine/requirements';
import { LANDSCAPE_TYPES, type DeckList, type LandscapeType, type MatchRule } from '../engine/types';

export const OBJECTIVE_TYPES = [
  'winWithinTurns',
  'heroHpAtLeast',
  'destroyCreatures',
  'playCreatures',
  'castSpells',
  'useUltimate',
  'noUltimate',
  'floops',
] as const;
export type ObjectiveType = (typeof OBJECTIVE_TYPES)[number];

/** A star objective. The first star is always "win"; each node lists two more. */
export interface Objective {
  type: ObjectiveType;
  value: number;
}

export interface BossDef {
  id: string;
  heroId: string;
  deck: string;
  ai: Difficulty;
  level: number;
  /** The boss's special rule (a match-rules.json id). */
  rule: string;
  hooks?: BossHooks;
  /** Said before the fight and after losing it. */
  intro: string;
  defeat: string;
}

export interface CampaignNode {
  id: string;
  name: string;
  /** Region index (0-based) and position in the region (0..9). */
  region: number;
  index: number;
  boss: BossDef | null;
  deck: string;
  ai: Difficulty;
  /** Level of every card in the enemy deck (1..5). */
  level: number;
  enemyRules: string[];
  playerRules: string[];
  stars: Objective[];
}

export interface Region {
  id: string;
  name: string;
  landscape: LandscapeType;
  intro: string;
  outro: string;
  nodes: CampaignNode[];
}

export interface NamedDeck extends DeckList {
  id: string;
  name: string;
}

export interface Campaign {
  regions: Region[];
  nodes: ReadonlyMap<string, CampaignNode>;
  bosses: ReadonlyMap<string, BossDef>;
  rules: ReadonlyMap<string, MatchRule>;
  /** Every deck a node can use: starter decks and boss decks. */
  decks: ReadonlyMap<string, NamedDeck>;
}

interface RawNode {
  id: string;
  name: string;
  boss?: string;
  deck?: string;
  ai?: string;
  level?: number;
  enemyRules?: string[];
  playerRules?: string[];
  stars: Objective[];
}

interface RawRegion {
  id: string;
  name: string;
  landscape: string;
  intro: string;
  outro: string;
  nodes: RawNode[];
}

interface RawCampaign {
  bosses: BossDef[];
  regions: RawRegion[];
}

interface RawDeck {
  id: string;
  name: string;
  heroId: string;
  landscapes: string[];
  cards: Record<string, number>;
}

export const NODES_PER_REGION = 10;
export const REGION_COUNT = 8;

/** Builds and validates the campaign (exported for tests). Throws with every problem found. */
export function buildCampaign(
  raw: unknown,
  deckData: unknown,
  ruleData: unknown,
  content: GameContent,
): Campaign {
  const { ctx } = content;
  const errors: string[] = [];
  const rules = createRuleDb(ruleData, ctx.cards);

  const decks = new Map<string, NamedDeck>();
  for (const d of content.starterDecks) decks.set(d.id, d);
  for (const d of deckData as RawDeck[]) {
    const deck: NamedDeck = {
      id: d.id,
      name: d.name,
      heroId: d.heroId,
      landscapes: d.landscapes as LandscapeType[],
      cards: expandCounts(d.cards),
    };
    if (decks.has(d.id)) errors.push(`deck ${d.id}: duplicate id`);
    decks.set(d.id, deck);
    if (!ctx.heroes.byId.get(d.heroId)) errors.push(`deck ${d.id}: unknown hero ${d.heroId}`);
    for (const e of validateDeck(deck, ctx)) errors.push(`deck ${d.id}: ${e}`);
    for (const id of new Set(deck.cards)) {
      for (const r of ctx.cards.byId.get(id)?.requirements ?? []) {
        if (countLandscapesIn(deck.landscapes, r.landscape) < r.count)
          errors.push(`deck ${d.id}: ${id} needs ${r.count} ${r.landscape}`);
      }
    }
  }

  const c = raw as RawCampaign;
  const bosses = new Map<string, BossDef>();
  for (const b of c.bosses ?? []) {
    if (bosses.has(b.id)) errors.push(`boss ${b.id}: duplicate id`);
    bosses.set(b.id, b);
    const deck = decks.get(b.deck);
    if (!deck) errors.push(`boss ${b.id}: unknown deck ${b.deck}`);
    else if (deck.heroId !== b.heroId) errors.push(`boss ${b.id}: deck hero is not ${b.heroId}`);
    if (!ctx.heroes.byId.get(b.heroId)) errors.push(`boss ${b.id}: unknown hero ${b.heroId}`);
    if (!rules.has(b.rule)) errors.push(`boss ${b.id}: unknown rule ${b.rule}`);
    if (!DIFFICULTIES.includes(b.ai)) errors.push(`boss ${b.id}: unknown ai ${b.ai}`);
    if (!Number.isInteger(b.level) || b.level < 1 || b.level > 5)
      errors.push(`boss ${b.id}: level must be 1..5`);
    if (!b.intro || !b.defeat) errors.push(`boss ${b.id}: intro and defeat lines are required`);
  }

  const nodes = new Map<string, CampaignNode>();
  const regions: Region[] = (c.regions ?? []).map((r, ri) => {
    if (!(LANDSCAPE_TYPES as readonly string[]).includes(r.landscape))
      errors.push(`region ${r.id}: unknown landscape ${r.landscape}`);
    if (!r.intro || !r.outro) errors.push(`region ${r.id}: intro and outro are required`);
    if (r.nodes.length !== NODES_PER_REGION) errors.push(`region ${r.id}: needs ${NODES_PER_REGION} nodes`);
    const regionNodes = r.nodes.map((n, ni): CampaignNode => {
      const where = `node ${n.id}`;
      const boss = n.boss ? (bosses.get(n.boss) ?? null) : null;
      if (n.boss && !boss) errors.push(`${where}: unknown boss ${n.boss}`);
      if ((ni === NODES_PER_REGION - 1) !== Boolean(n.boss))
        errors.push(`${where}: the last node of a region (and only it) must be a boss`);
      const node: CampaignNode = {
        id: n.id,
        name: n.name,
        region: ri,
        index: ni,
        boss,
        deck: boss?.deck ?? n.deck ?? '',
        ai: boss?.ai ?? (n.ai as Difficulty),
        level: boss?.level ?? n.level ?? 1,
        enemyRules: boss ? [boss.rule, ...(n.enemyRules ?? [])] : (n.enemyRules ?? []),
        playerRules: n.playerRules ?? [],
        stars: n.stars,
      };
      if (nodes.has(n.id)) errors.push(`${where}: duplicate id`);
      nodes.set(n.id, node);
      if (!decks.has(node.deck)) errors.push(`${where}: unknown deck ${node.deck}`);
      if (!DIFFICULTIES.includes(node.ai)) errors.push(`${where}: unknown ai ${String(node.ai)}`);
      if (!Number.isInteger(node.level) || node.level < 1 || node.level > 5)
        errors.push(`${where}: level must be 1..5`);
      for (const id of [...node.enemyRules, ...node.playerRules])
        if (!rules.has(id)) errors.push(`${where}: unknown rule ${id}`);
      if (!Array.isArray(n.stars) || n.stars.length !== 2)
        errors.push(`${where}: needs exactly 2 star objectives`);
      for (const o of n.stars ?? []) {
        if (!OBJECTIVE_TYPES.includes(o.type)) errors.push(`${where}: unknown objective ${String(o.type)}`);
        if (!Number.isInteger(o.value) || o.value < 1) errors.push(`${where}: objective value must be >= 1`);
      }
      return node;
    });
    return {
      id: r.id,
      name: r.name,
      landscape: r.landscape as LandscapeType,
      intro: r.intro,
      outro: r.outro,
      nodes: regionNodes,
    };
  });
  if (regions.length !== REGION_COUNT) errors.push(`campaign needs ${REGION_COUNT} regions`);
  if (errors.length > 0) throw new Error(`Invalid campaign data:\n- ${errors.join('\n- ')}`);
  return { regions, nodes, bosses, rules, decks };
}

let cached: Campaign | null = null;

/** The validated shipped campaign (loaded lazily, once). */
export function getCampaign(): Campaign {
  cached ??= buildCampaign(rawCampaign, rawDecks, rawRules, getContent());
  return cached;
}

/** Looks up match rules by id (campaign modifiers, boss rules, tutorial rules). */
export function rulesById(campaign: Campaign, ids: readonly string[]): MatchRule[] {
  return ids.map((id) => {
    const r = campaign.rules.get(id);
    if (!r) throw new Error(`Unknown match rule ${id}`);
    return r;
  });
}

export function describeObjective(o: Objective): string {
  switch (o.type) {
    case 'winWithinTurns':
      return `Win within ${o.value} of your turns`;
    case 'heroHpAtLeast':
      return `Win with at least ${o.value} Hero HP`;
    case 'destroyCreatures':
      return `Destroy ${o.value} enemy creatures`;
    case 'playCreatures':
      return `Play ${o.value} creatures`;
    case 'castSpells':
      return `Cast ${o.value} spells`;
    case 'useUltimate':
      return 'Use your Hero Ability';
    case 'noUltimate':
      return 'Win without using your Hero Ability';
    case 'floops':
      return `Floop ${o.value} ${o.value === 1 ? 'time' : 'times'}`;
  }
}
