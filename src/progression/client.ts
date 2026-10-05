/**
 * Client glue: run a pure reward operation against the live save, persist it,
 * and play the reveal animation (or show the error).
 */
import type Phaser from 'phaser';
import { Rng } from '../engine/rng';
import { saves } from '../save';
import type { SaveData } from '../save/saveData';
import { showRewards } from '../ui/RewardReveal';
import { showToast } from '../ui/Toast';
import type { RewardResult } from './rewards';

/** Fresh randomness for client-side rolls (chests, packs). The server re-rolls in M11. */
export function clientRng(): Rng {
  const seed =
    typeof crypto !== 'undefined' && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint32Array(1))[0]!
      : Date.now();
  return new Rng(seed);
}

export async function applyReward(
  scene: Phaser.Scene,
  op: (save: SaveData, rng: Rng) => RewardResult,
  title: string,
): Promise<boolean> {
  const result = op(saves().save, clientRng());
  if (!result.ok) {
    showToast(scene, result.error);
    return false;
  }
  await saves().commit(result.save);
  await showRewards(scene, result.summary, { title });
  return true;
}
