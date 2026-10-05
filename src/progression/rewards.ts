/**
 * Rewards: granting currencies/XP/cards, chests (victory slots, timed unlock,
 * free chest), and packs. Pure: every function takes the RNG and clock it needs
 * and returns a new SaveData plus a description of what was gained (for the
 * reveal animation).
 */
import type { GameContent } from '../engine/content';
import type { Rng } from '../engine/rng';
import { RARITIES, type CardDef, type CardLandscape, type Rarity } from '../engine/types';
import type { ChestSlot, ChestType, SaveData } from '../save/saveData';
import { CHEST_TYPES } from '../save/saveData';
import { PROGRESSION, type Odds, type Reward } from './config';
import { levelFromXp, unlocksBetween } from './levels';

export interface RewardSummary {
  coins: number;
  gems: number;
  dust: number;
  xp: number;
  cards: string[];
  /** Chest that was opened as part of this reward (its contents are already included). */
  chestOpened: ChestType | null;
  levelUps: number[];
  unlocks: string[];
}

export function emptySummary(): RewardSummary {
  return { coins: 0, gems: 0, dust: 0, xp: 0, cards: [], chestOpened: null, levelUps: [], unlocks: [] };
}

export type RewardResult =
  { ok: true; save: SaveData; summary: RewardSummary } | { ok: false; error: string };

const RANK: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

function clone(save: SaveData): SaveData {
  return structuredClone(save);
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export function rollRarity(odds: Odds, rng: Rng): Rarity {
  return rng.weighted(
    RARITIES,
    RARITIES.map((r) => odds[r]),
  );
}

/**
 * Rolls `count` random collectible cards. `guaranteed` upgrades the last card
 * if nothing at or above that rarity was rolled. `landscape` limits the pool.
 */
export function rollCards(
  content: GameContent,
  odds: Odds,
  count: number,
  rng: Rng,
  options: { guaranteed?: Rarity; landscape?: CardLandscape } = {},
): string[] {
  const pool = content.ctx.cards.all.filter(
    (c) => !c.token && (!options.landscape || c.landscape === options.landscape),
  );
  const byRarity = new Map<Rarity, CardDef[]>();
  for (const r of RARITIES)
    byRarity.set(
      r,
      pool.filter((c) => c.rarity === r),
    );
  const pick = (rarity: Rarity): string => {
    // Fall back to the nearest lower rarity if a pool is empty.
    for (let i = RANK[rarity]; i >= 0; i--) {
      const list = byRarity.get(RARITIES[i]!)!;
      if (list.length > 0) return rng.pick(list).id;
    }
    return rng.pick(pool).id;
  };
  const rarities = Array.from({ length: count }, () => rollRarity(odds, rng));
  if (options.guaranteed && count > 0 && !rarities.some((r) => RANK[r] >= RANK[options.guaranteed!])) {
    rarities[count - 1] = options.guaranteed;
  }
  return rarities.map(pick);
}

function addCards(save: SaveData, cards: readonly string[]): void {
  for (const id of cards) {
    const owned = save.collection[id] ?? { count: 0, level: 1 };
    save.collection[id] = { ...owned, count: owned.count + 1 };
  }
  save.lifetime.cardsOpened += cards.length;
}

// ---------------------------------------------------------------------------
// XP and currencies
// ---------------------------------------------------------------------------

/** Adds XP, applying level-up rewards. Mutates the draft and summary. */
function addXp(save: SaveData, xp: number, summary: RewardSummary): void {
  if (xp <= 0) return;
  const before = save.progression.level;
  save.progression.xp += xp;
  summary.xp += xp;
  const after = levelFromXp(save.progression.xp);
  save.progression.level = after;
  const r = PROGRESSION.xp.levelUpReward;
  for (let lvl = before + 1; lvl <= after; lvl++) {
    summary.levelUps.push(lvl);
    save.currencies.coins += r.coins;
    summary.coins += r.coins;
    if (lvl % 5 === 0) {
      save.currencies.gems += r.gemsEvery5Levels;
      summary.gems += r.gemsEvery5Levels;
    }
  }
  if (after > before) summary.unlocks.push(...unlocksBetween(before, after, save.decks.length));
}

/** Rolls a chest's contents into the draft (no slot involved). */
function openChestContents(
  save: SaveData,
  type: ChestType,
  content: GameContent,
  rng: Rng,
  summary: RewardSummary,
): void {
  const def = PROGRESSION.chests.types[type];
  const coins = rng.int(def.coins[0], def.coins[1]);
  const dust = rng.int(def.dust[0], def.dust[1]);
  const gems = rng.chance(def.gemsChance) ? rng.int(def.gems[0], def.gems[1]) : 0;
  const cards = rollCards(content, def.odds, def.cards, rng);
  save.currencies.coins += coins;
  save.currencies.dust += dust;
  save.currencies.gems += gems;
  addCards(save, cards);
  save.lifetime.chestsOpened++;
  summary.coins += coins;
  summary.dust += dust;
  summary.gems += gems;
  summary.cards.push(...cards);
  summary.chestOpened = type;
}

/** Grants a reward bundle. A `chest` in a reward is opened immediately. */
export function grantReward(
  save: SaveData,
  reward: Reward,
  content: GameContent,
  rng: Rng,
): { save: SaveData; summary: RewardSummary } {
  const next = clone(save);
  const summary = emptySummary();
  next.currencies.coins += reward.coins ?? 0;
  next.currencies.gems += reward.gems ?? 0;
  next.currencies.dust += reward.dust ?? 0;
  summary.coins += reward.coins ?? 0;
  summary.gems += reward.gems ?? 0;
  summary.dust += reward.dust ?? 0;
  if (reward.chest) openChestContents(next, reward.chest, content, rng, summary);
  addXp(next, reward.xp ?? 0, summary);
  return { save: next, summary };
}

// ---------------------------------------------------------------------------
// Chest slots
// ---------------------------------------------------------------------------

export function chestReadyAt(slot: ChestSlot): number | null {
  if (slot.unlockStartedAt === null) return null;
  return slot.unlockStartedAt + PROGRESSION.chests.types[slot.type].unlockMinutes * 60_000;
}

export function isChestReady(slot: ChestSlot, now: number): boolean {
  const at = chestReadyAt(slot);
  return at !== null && now >= at;
}

export function isUnlocking(save: SaveData, now: number): boolean {
  return save.chests.slots.some((s) => s && s.unlockStartedAt !== null && !isChestReady(s, now));
}

/** Gems to open a chest right now (0 if ready). */
export function openNowCost(slot: ChestSlot, now: number): number {
  const def = PROGRESSION.chests.types[slot.type];
  const readyAt = chestReadyAt(slot);
  const remainingMs = readyAt === null ? def.unlockMinutes * 60_000 : Math.max(0, readyAt - now);
  return Math.ceil(remainingMs / 60_000 / PROGRESSION.chests.minutesPerGem);
}

/** After a win: rolls a chest type and puts it in the first free slot (null if all full). */
export function awardVictoryChest(save: SaveData, rng: Rng): { save: SaveData; chest: ChestType | null } {
  const index = save.chests.slots.findIndex((s) => s === null);
  if (index < 0) return { save, chest: null };
  const drop = PROGRESSION.chests.victoryDrop;
  const type = rng.weighted(
    CHEST_TYPES,
    CHEST_TYPES.map((t) => drop[t]),
  );
  const next = clone(save);
  next.chests.slots[index] = { type, unlockStartedAt: null };
  return { save: next, chest: type };
}

export function startUnlock(save: SaveData, index: number, now: number): RewardResult {
  const slot = save.chests.slots[index];
  if (!slot) return { ok: false, error: 'That chest slot is empty.' };
  if (slot.unlockStartedAt !== null) return { ok: false, error: 'This chest is already unlocking.' };
  if (isUnlocking(save, now))
    return { ok: false, error: 'Another chest is already unlocking. One at a time!' };
  const next = clone(save);
  next.chests.slots[index] = { ...slot, unlockStartedAt: now };
  return { ok: true, save: next, summary: emptySummary() };
}

/** Opens a chest from a slot: free when ready, otherwise for Gems (useGems must be true). */
export function openChestSlot(
  save: SaveData,
  index: number,
  now: number,
  content: GameContent,
  rng: Rng,
  useGems: boolean,
): RewardResult {
  const slot = save.chests.slots[index];
  if (!slot) return { ok: false, error: 'That chest slot is empty.' };
  const cost = isChestReady(slot, now) ? 0 : openNowCost(slot, now);
  if (cost > 0 && !useGems)
    return { ok: false, error: `This chest is still locked (open now for ${cost} Gems).` };
  if (cost > save.currencies.gems)
    return { ok: false, error: `Opening now costs ${cost} Gems (you have ${save.currencies.gems}).` };
  const next = clone(save);
  next.currencies.gems -= cost;
  next.chests.slots[index] = null;
  const summary = emptySummary();
  openChestContents(next, slot.type, content, rng, summary);
  summary.gems -= cost;
  return { ok: true, save: next, summary };
}

export function freeChestReady(save: SaveData, now: number): boolean {
  return now >= save.chests.freeReadyAt;
}

export function claimFreeChest(save: SaveData, now: number, content: GameContent, rng: Rng): RewardResult {
  if (!freeChestReady(save, now)) return { ok: false, error: 'The free chest is not ready yet.' };
  const next = clone(save);
  const free = PROGRESSION.chests.freeChest;
  next.chests.freeReadyAt = now + free.intervalHours * 3_600_000;
  const summary = emptySummary();
  openChestContents(next, free.type, content, rng, summary);
  return { ok: true, save: next, summary };
}

// ---------------------------------------------------------------------------
// Packs
// ---------------------------------------------------------------------------

export function buyPack(
  save: SaveData,
  packId: string,
  content: GameContent,
  rng: Rng,
  landscape?: CardLandscape,
): RewardResult {
  const pack = PROGRESSION.packs.find((p) => p.id === packId);
  if (!pack) return { ok: false, error: 'Unknown pack.' };
  if (pack.landscapeChoice && !landscape) return { ok: false, error: 'Choose a landscape for this pack.' };
  const coins = pack.cost.coins ?? 0;
  const gems = pack.cost.gems ?? 0;
  if (save.currencies.coins < coins)
    return { ok: false, error: `This pack costs ${coins} Coins (you have ${save.currencies.coins}).` };
  if (save.currencies.gems < gems)
    return { ok: false, error: `This pack costs ${gems} Gems (you have ${save.currencies.gems}).` };
  const next = clone(save);
  next.currencies.coins -= coins;
  next.currencies.gems -= gems;
  const options: { guaranteed: Rarity; landscape?: CardLandscape } = { guaranteed: pack.guaranteed };
  if (pack.landscapeChoice && landscape) options.landscape = landscape;
  const cards = rollCards(content, pack.odds, pack.cards, rng, options);
  addCards(next, cards);
  const summary = emptySummary();
  summary.cards = cards;
  summary.coins = -coins;
  summary.gems = -gems;
  return { ok: true, save: next, summary };
}

/** Human-readable drop rates, e.g. "Common 70% · Uncommon 22% · ...". */
export function formatOdds(odds: Odds): string {
  const label: Record<Rarity, string> = {
    common: 'Common',
    uncommon: 'Uncommon',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary',
  };
  return RARITIES.filter((r) => odds[r] > 0)
    .map((r) => `${label[r]} ${Math.round(odds[r] * 1000) / 10}%`)
    .join(' · ');
}
