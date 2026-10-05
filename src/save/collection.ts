/**
 * Collection operations (craft, scrap, level up). Pure: each returns a new
 * SaveData or a readable error. Values come from src/data/economy.json.
 */
import economy from '../data/economy.json';
import { maxCopiesFor } from '../engine/deck';
import type { CardDef, RulesContext } from '../engine/types';
import type { SaveData } from './saveData';

export type OpResult = { ok: true; save: SaveData } | { ok: false; error: string };

export const ECONOMY = economy;

export function ownedCount(save: SaveData, cardId: string): number {
  return save.collection[cardId]?.count ?? 0;
}

export function cardLevel(save: SaveData, cardId: string): number {
  return save.collection[cardId]?.level ?? 1;
}

/** Copies beyond what a deck can hold; these can be scrapped or used to level up. */
export function spareCopies(save: SaveData, card: CardDef, ctx: RulesContext): number {
  return Math.max(0, ownedCount(save, card.id) - maxCopiesFor(card.rarity, ctx.balance));
}

export function craftCost(card: CardDef): number {
  return economy.craftCost[card.rarity];
}

export function scrapValue(card: CardDef): number {
  return economy.scrapValue[card.rarity];
}

export function levelUpCost(level: number): { copies: number; coins: number } | null {
  const step = economy.levelUp.find((s) => s.toLevel === level + 1);
  return step ? { copies: step.copies, coins: step.coins } : null;
}

function clone(save: SaveData): SaveData {
  return structuredClone(save);
}

function lookup(cardId: string, ctx: RulesContext): CardDef | null {
  const card = ctx.cards.byId.get(cardId);
  return card && !card.token ? card : null;
}

export function craft(save: SaveData, cardId: string, ctx: RulesContext): OpResult {
  const card = lookup(cardId, ctx);
  if (!card) return { ok: false, error: 'That card cannot be crafted.' };
  const cost = craftCost(card);
  if (save.currencies.dust < cost)
    return { ok: false, error: `Crafting needs ${cost} Dust (you have ${save.currencies.dust}).` };
  const next = clone(save);
  next.currencies.dust -= cost;
  const owned = next.collection[cardId] ?? { count: 0, level: 1 };
  next.collection[cardId] = { ...owned, count: owned.count + 1 };
  return { ok: true, save: next };
}

export function scrap(save: SaveData, cardId: string, ctx: RulesContext): OpResult {
  const card = lookup(cardId, ctx);
  if (!card) return { ok: false, error: 'That card cannot be scrapped.' };
  if (spareCopies(save, card, ctx) < 1) {
    return { ok: false, error: 'Only spare copies (beyond what a deck can use) can be scrapped.' };
  }
  const next = clone(save);
  next.collection[cardId]!.count -= 1;
  next.currencies.dust += scrapValue(card);
  return { ok: true, save: next };
}

export function levelUp(save: SaveData, cardId: string, ctx: RulesContext): OpResult {
  const card = lookup(cardId, ctx);
  if (!card || ownedCount(save, cardId) === 0) return { ok: false, error: 'You do not own that card.' };
  const level = cardLevel(save, cardId);
  const cost = levelUpCost(level);
  if (!cost) return { ok: false, error: `Already at the maximum level (${economy.maxLevel}).` };
  const spare = spareCopies(save, card, ctx);
  if (spare < cost.copies)
    return { ok: false, error: `Needs ${cost.copies} spare copies (you have ${spare}).` };
  if (save.currencies.coins < cost.coins)
    return { ok: false, error: `Needs ${cost.coins} Coins (you have ${save.currencies.coins}).` };
  const next = clone(save);
  next.currencies.coins -= cost.coins;
  next.collection[cardId] = { count: ownedCount(save, cardId) - cost.copies, level: level + 1 };
  return { ok: true, save: next };
}
