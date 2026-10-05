/**
 * Cloud save merge, run on the server for every sync.
 *
 * - Ordinary progress (decks, campaign stars, quests, settings-like data) uses
 *   "latest timestamp wins".
 * - The economy (Coins, Gems, Dust, XP and card counts) is never taken from the
 *   client as-is. The server applies the client's *change since its last sync*
 *   (so two devices can both earn and spend offline), and caps gains by the
 *   time that passed. An edited client that adds 1,000,000 Coins only receives
 *   what could plausibly have been earned; the rest is refused and flagged.
 * Pure: takes the stored save and the request, returns the merged save.
 */
import type { GameContent } from '../../engine/content';
import { levelFromXp } from '../../progression/levels';
import { createNewSave, migrate, repairSave, type SaveData } from '../../save/saveData';
import type { EconomySnapshot } from '../protocol';
import { ONLINE } from './rating';

export interface StoredSave {
  data: SaveData;
  version: number;
  syncedAt: number;
}

export interface MergeResult {
  save: SaveData;
  version: number;
  base: EconomySnapshot;
  flags: string[];
}

const CURRENCIES = ['coins', 'gems', 'dust'] as const;

export function economyOf(save: SaveData): EconomySnapshot {
  const cards: Record<string, number> = {};
  for (const [id, c] of Object.entries(save.collection)) if (c.count > 0) cards[id] = c.count;
  return { ...save.currencies, xp: save.progression.xp, cards };
}

/** Hours of play the server will credit since the last accepted sync. */
export function creditedHours(sinceMs: number, now: number): number {
  const caps = ONLINE.saveCaps;
  const hours = Math.max(0, now - sinceMs) / 3_600_000;
  return Math.min(caps.maxHours, Math.max(caps.minHours, hours));
}

export function mergeSave(
  stored: StoredSave | null,
  req: { save: unknown; baseVersion: number | null; base: EconomySnapshot | null },
  now: number,
  content: GameContent,
): MergeResult {
  const caps = ONLINE.saveCaps;
  const flags: string[] = [];
  // Never trust the shape of what the client sent.
  const client = repairSave(migrate(req.save ?? {}), content, now).save;
  const fresh = createNewSave(content, now);
  const server = stored?.data ?? fresh;
  // First upload: compare against a brand-new save, crediting time since it was created.
  const since = stored ? stored.syncedAt : Math.min(now, client.createdAt || now);
  const hours = creditedHours(since, now);
  const base: EconomySnapshot = stored ? (req.base ?? economyOf(server)) : economyOf(fresh);

  // Ordinary data: the newer save wins.
  const newer = client.updatedAt >= server.updatedAt ? client : server;
  const merged: SaveData = structuredClone(newer);

  // Economy: server value + capped client delta.
  const clientEco = economyOf(client);
  const serverEco = economyOf(server);
  const capFor = { coins: caps.coinsPerHour, gems: caps.gemsPerHour, dust: caps.dustPerHour };
  for (const k of CURRENCIES) {
    const delta = clientEco[k] - base[k];
    const allowed = capFor[k] * hours;
    if (delta > allowed) flags.push(`${k}: +${delta} refused above +${Math.floor(allowed)}`);
    merged.currencies[k] = Math.max(0, serverEco[k] + Math.min(delta, Math.floor(allowed)));
  }
  const xpDelta = clientEco.xp - base.xp;
  const xpAllowed = Math.floor(caps.xpPerHour * hours);
  if (xpDelta > xpAllowed) flags.push(`xp: +${xpDelta} refused above +${xpAllowed}`);
  merged.progression.xp = Math.max(0, serverEco.xp + Math.max(0, Math.min(xpDelta, xpAllowed)));
  merged.progression.level = levelFromXp(merged.progression.xp);

  // Cards: per-card deltas; total new copies capped (lowest ids first, deterministic).
  let budget = Math.floor(caps.cardsPerHour * hours);
  const ids = [
    ...new Set([
      ...Object.keys(clientEco.cards),
      ...Object.keys(serverEco.cards),
      ...Object.keys(base.cards),
    ]),
  ].sort();
  const collection: SaveData['collection'] = {};
  let refused = 0;
  for (const id of ids) {
    const delta = (clientEco.cards[id] ?? 0) - (base.cards[id] ?? 0);
    let accepted = delta;
    if (delta > 0) {
      accepted = Math.min(delta, budget);
      budget -= accepted;
      refused += delta - accepted;
    }
    const count = Math.max(0, (serverEco.cards[id] ?? 0) + accepted);
    if (count <= 0) continue;
    const serverLevel = server.collection[id]?.level ?? 1;
    const clientLevel = client.collection[id]?.level ?? 1;
    // Level-ups cost coins and copies (both checked above); allow a few per credited hour.
    const level = Math.min(clientLevel, serverLevel + Math.ceil(hours) * 2);
    collection[id] = { count, level: Math.max(serverLevel, level) };
  }
  if (refused > 0) flags.push(`cards: ${refused} new copies refused`);
  merged.collection = collection;

  // Lifetime stats only ever go up.
  for (const k of Object.keys(merged.lifetime) as (keyof SaveData['lifetime'])[]) {
    merged.lifetime[k] = Math.max(server.lifetime[k] ?? 0, client.lifetime[k] ?? 0);
  }
  merged.updatedAt = Math.max(client.updatedAt, server.updatedAt);
  const version = (stored?.version ?? 0) + 1;
  return { save: merged, version, base: economyOf(merged), flags };
}

/** Server-side reward (ranked wins, season rewards) applied straight to the stored save. */
export function grantToSave(
  save: SaveData,
  reward: { coins?: number; gems?: number; dust?: number; xp?: number },
): SaveData {
  const next = structuredClone(save);
  next.currencies.coins += reward.coins ?? 0;
  next.currencies.gems += reward.gems ?? 0;
  next.currencies.dust += reward.dust ?? 0;
  next.progression.xp += reward.xp ?? 0;
  next.progression.level = levelFromXp(next.progression.xp);
  return next;
}
