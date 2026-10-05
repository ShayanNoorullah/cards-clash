/**
 * Profile cosmetics, all earned in play: avatars (hero portraits unlock with
 * the hero, or by beating that hero as a campaign boss) and card backs (by
 * level or campaign stars). Pure.
 */
import { getCampaign } from '../campaign/config';
import { nodeStars, totalStars } from '../campaign/progress';
import { playableHeroes } from '../engine/cards';
import type { GameContent } from '../engine/content';
import type { SaveData } from '../save/saveData';
import { PROGRESSION } from './config';
import { heroUnlockLevel, heroUnlocked } from './levels';

export interface CosmeticStatus {
  id: string;
  name: string;
  unlocked: boolean;
  /** How to unlock it (shown while locked). */
  requirement: string;
}

export function cardBackStatus(save: SaveData): CosmeticStatus[] {
  const stars = totalStars(save, getCampaign());
  return PROGRESSION.cosmetics.cardBacks.map((b) => {
    const u = b.unlock;
    const unlocked =
      u.type === 'default' ||
      (u.type === 'level' && save.progression.level >= u.value) ||
      (u.type === 'stars' && stars >= u.value);
    const requirement =
      u.type === 'default'
        ? 'Always available'
        : u.type === 'level'
          ? `Reach level ${u.value}`
          : `Earn ${u.value} campaign stars`;
    return { id: b.id, name: b.name, unlocked, requirement };
  });
}

export function avatarStatus(save: SaveData, content: GameContent): CosmeticStatus[] {
  const campaign = getCampaign();
  // Campaign bosses are regular heroes: beating one unlocks its portrait early.
  const bossOf = new Map<string, { beaten: boolean; region: string }>();
  for (const region of campaign.regions) {
    const node = region.nodes[region.nodes.length - 1];
    if (!node?.boss) continue;
    bossOf.set(node.boss.heroId, { beaten: nodeStars(save, node.id) > 0, region: region.name });
  }
  return playableHeroes(content.ctx.heroes).map((h) => {
    const boss = bossOf.get(h.id);
    const byLevel = heroUnlocked(h.id, save.progression.level);
    return {
      id: h.id,
      name: h.name,
      unlocked: byLevel || (boss?.beaten ?? false),
      requirement: boss
        ? `Reach level ${heroUnlockLevel(h.id)} or defeat the boss of ${boss.region}`
        : `Reach level ${heroUnlockLevel(h.id)}`,
    };
  });
}

export type CosmeticResult = { ok: true; save: SaveData } | { ok: false; error: string };

export function setAvatar(save: SaveData, id: string, content: GameContent): CosmeticResult {
  const a = avatarStatus(save, content).find((x) => x.id === id);
  if (!a) return { ok: false, error: 'Unknown avatar.' };
  if (!a.unlocked) return { ok: false, error: `Locked: ${a.requirement}.` };
  return { ok: true, save: { ...save, profile: { ...save.profile, avatar: id } } };
}

export function setCardBack(save: SaveData, id: string): CosmeticResult {
  const b = cardBackStatus(save).find((x) => x.id === id);
  if (!b) return { ok: false, error: 'Unknown card back.' };
  if (!b.unlocked) return { ok: false, error: `Locked: ${b.requirement}.` };
  return { ok: true, save: { ...save, profile: { ...save.profile, cardBack: id } } };
}

/** Trims and limits the name; letters, numbers, spaces and a few symbols only. */
export function setProfileName(save: SaveData, raw: string): CosmeticResult {
  const name = raw.replace(/\s+/g, ' ').trim().slice(0, 16);
  if (name.length < 2) return { ok: false, error: 'Names need at least 2 characters.' };
  if (!/^[\p{L}\p{N} ._'-]+$/u.test(name))
    return { ok: false, error: 'Use letters, numbers and spaces only.' };
  return { ok: true, save: { ...save, profile: { ...save.profile, name } } };
}
