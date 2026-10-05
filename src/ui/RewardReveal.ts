import { darken, lighten, mix } from '../art/color';
import { audio } from '../services/audio';
import { cardBackKey } from './cosmetic';
import type Phaser from 'phaser';
import { CARD_H, CARD_W } from '../art/cardLayout';
import { RARITY_COLORS } from '../art/palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { getContent } from '../engine/content';
import type { Rarity } from '../engine/types';
import { burst, confetti, dur, tweenAsync, wait } from '../match/fx';
import { PROGRESSION } from '../progression/config';
import type { RewardSummary } from '../progression/rewards';
import type { ChestType } from '../save/saveData';
import { Button } from './Button';
import { CardView } from './CardView';
import { COLORS, hex, textStyle } from './theme';

const CHEST_COLORS: Record<ChestType, [number, number]> = {
  wooden: [0x7d838f, 0x3c414c],
  silver: [0xc8d2de, 0x7a8696],
  golden: [0xffc93c, 0xb4800a],
  magic: [0xb65cff, 0x5a2aa8],
};

/** A procedural chest: box, lid and lock, colored by type. */
export function drawChest(
  scene: Phaser.Scene,
  x: number,
  y: number,
  type: ChestType,
  scale = 1,
): Phaser.GameObjects.Container {
  const [main] = CHEST_COLORS[type];
  // Dark wood body, metal bands in the chest's colour, a glowing lock.
  const wood = 0x3a2416;
  const woodDark = 0x1f120a;
  const metal = main;
  const metalDark = darken(main, 0.45);
  const c = scene.add.container(x, y).setScale(scale);
  const aura = scene.add.graphics();
  for (let i = 8; i > 0; i--) {
    aura.fillStyle(metal, 0.035);
    aura.fillCircle(0, 10, 70 + i * 9);
  }
  const box = scene.add.graphics();
  box.fillStyle(0x000000, 0.45);
  box.fillEllipse(0, 92, 220, 26);
  box.fillStyle(0x05060c, 1);
  box.fillRoundedRect(-96, -14, 192, 106, 10);
  for (let i = 0; i < 8; i++) {
    box.fillStyle(mix(wood, woodDark, i / 7), 1);
    box.fillRect(-90, -8 + i * 11.5, 180, 12);
  }
  box.lineStyle(2, woodDark, 0.8);
  for (let i = 1; i < 4; i++) box.lineBetween(-90, -8 + i * 23, 90, -8 + i * 23);
  for (const bx of [-90, 74]) {
    box.fillStyle(metalDark, 1);
    box.fillRect(bx, -8, 16, 94);
    box.fillStyle(metal, 1);
    box.fillRect(bx + 2, -8, 10, 94);
  }
  box.fillStyle(metalDark, 1);
  box.fillRect(-90, 74, 180, 12);
  box.fillStyle(metal, 1);
  box.fillRect(-90, 74, 180, 6);
  const lid = scene.add.graphics();
  lid.fillStyle(0x05060c, 1);
  lid.fillRoundedRect(-100, -76, 200, 68, { tl: 44, tr: 44, bl: 4, br: 4 });
  for (let i = 0; i < 6; i++) {
    lid.fillStyle(mix(lighten(wood, 0.12), wood, i / 5), 1);
    lid.fillRoundedRect(-94, -70 + i * 9.5, 188, 11, i === 0 ? { tl: 40, tr: 40, bl: 0, br: 0 } : 0);
  }
  for (const bx of [-90, 74]) {
    lid.fillStyle(metal, 1);
    lid.fillRect(bx + 2, -66, 10, 58);
  }
  lid.fillStyle(metalDark, 1);
  lid.fillRect(-94, -14, 188, 8);
  // Lock plate with a glowing keyhole.
  lid.fillStyle(metalDark, 1);
  lid.fillRoundedRect(-18, -26, 36, 40, 6);
  lid.fillStyle(metal, 1);
  lid.fillRoundedRect(-14, -22, 28, 32, 5);
  for (let i = 5; i > 0; i--) {
    lid.fillStyle(0xffd27a, 0.1);
    lid.fillCircle(0, -8, 6 + i * 4);
  }
  lid.fillStyle(0xfff0c0, 1);
  lid.fillCircle(0, -10, 4);
  lid.fillRect(-2, -10, 4, 10);
  c.add([aura, box, lid]);
  c.setData('lid', lid);
  return c;
}

export interface RevealOptions {
  title: string;
  chest?: ChestType | null;
}

/** Full-screen reward reveal: chest opening, card flips, currency lines. Resolves on close. */
export async function showRewards(
  scene: Phaser.Scene,
  summary: RewardSummary,
  options: RevealOptions,
): Promise<void> {
  const { ctx } = getContent();
  const o = scene.add.container(0, 0).setDepth(2000);
  const dim = scene.add
    .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0820, 0.94)
    .setOrigin(0)
    .setInteractive();
  o.add(dim);
  const title = scene.add
    .text(GAME_WIDTH / 2, 150, options.title, textStyle(66, { color: hex(COLORS.accent) }))
    .setOrigin(0.5);
  o.add(title);

  const chestType = options.chest ?? summary.chestOpened;
  if (chestType) {
    const chest = drawChest(scene, GAME_WIDTH / 2, 420, chestType, 1.4);
    o.add(chest);
    o.add(
      scene.add
        .text(GAME_WIDTH / 2, 590, PROGRESSION.chests.types[chestType].name, textStyle(40))
        .setOrigin(0.5),
    );
    if (dur(300) > 0) {
      await tweenAsync(scene, {
        targets: chest,
        angle: { from: -6, to: 6 },
        duration: 90,
        yoyo: true,
        repeat: 3,
      });
      chest.setAngle(0);
      const lid = chest.getData('lid') as Phaser.GameObjects.Graphics;
      await tweenAsync(scene, {
        targets: lid,
        y: -60,
        angle: -25,
        alpha: 0.2,
        duration: 260,
        ease: 'Back.Out',
      });
      audio.play('chest');
      burst(scene, GAME_WIDTH / 2, 400, 0xffe98a, 30);
    }
  }
  if (summary.coins > 0 || summary.gems > 0) audio.play('coins');

  // Currency / XP lines
  const lines: string[] = [];
  if (summary.coins) lines.push(`${summary.coins > 0 ? '+' : ''}${summary.coins} Coins`);
  if (summary.gems) lines.push(`${summary.gems > 0 ? '+' : ''}${summary.gems} Gems`);
  if (summary.dust) lines.push(`+${summary.dust} Dust`);
  if (summary.xp) lines.push(`+${summary.xp} XP`);
  const linesY = chestType ? 660 : 260;
  if (lines.length)
    o.add(
      scene.add
        .text(GAME_WIDTH / 2, linesY, lines.join('    '), textStyle(40, { color: '#fff3c4' }))
        .setOrigin(0.5),
    );

  // Cards flip in one by one.
  const cards = summary.cards;
  const cols = cards.length > 6 ? 5 : Math.max(1, Math.min(3, cards.length));
  const scale = cards.length > 6 ? 0.58 : 0.82;
  const cellW = CARD_W * scale + 16;
  const cellH = CARD_H * scale + 20;
  const top = linesY + 70 + (CARD_H * scale) / 2;
  let best: Rarity = 'common';
  const rank: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
  for (let i = 0; i < cards.length; i++) {
    const card = ctx.cards.byId.get(cards[i]!);
    if (!card) continue;
    if (rank[card.rarity] > rank[best]) best = card.rarity;
    const row = Math.floor(i / cols);
    const col = i % cols;
    const inRow = Math.min(cols, cards.length - row * cols);
    const x = GAME_WIDTH / 2 + (col - (inRow - 1) / 2) * cellW;
    const y = top + row * cellH;
    if (rank[card.rarity] >= 2) {
      const glow = scene.add.graphics();
      glow.fillStyle(RARITY_COLORS[card.rarity], 0.45);
      glow.fillRoundedRect(
        x - (CARD_W * scale) / 2 - 12,
        y - (CARD_H * scale) / 2 - 12,
        CARD_W * scale + 24,
        CARD_H * scale + 24,
        26,
      );
      o.add(glow);
    }
    const back = scene.add.image(x, y, cardBackKey()).setDisplaySize(CARD_W * scale, CARD_H * scale);
    o.add(back);
    if (dur(200) > 0) {
      await tweenAsync(scene, { targets: back, scaleX: 0, duration: 120 });
    }
    back.destroy();
    const view = new CardView(scene, x, y, card).setScale(dur(200) > 0 ? 0.01 : scale, scale);
    o.add(view);
    if (dur(200) > 0) await tweenAsync(scene, { targets: view, scaleX: scale, duration: 120 });
    audio.play(rank[card.rarity] >= 3 ? 'rare' : 'reveal');
    if (rank[card.rarity] >= 3) burst(scene, x, y, RARITY_COLORS[card.rarity], 24);
    await wait(scene, 60);
  }
  if (rank[best] >= 3) confetti(scene);

  // Level ups and unlocks
  const notes: string[] = [];
  for (const lvl of summary.levelUps) notes.push(`Level up! You are now level ${lvl}.`);
  for (const u of summary.unlocks) {
    const [kind, id] = u.split(':');
    if (kind === 'hero') notes.push(`New hero unlocked: ${ctx.heroes.byId.get(id!)?.name ?? id}`);
    else if (kind === 'mode') notes.push(`New mode unlocked: ${id}`);
    else if (kind === 'deckSlots') notes.push(`+${id} deck slot(s)`);
  }
  if (summary.levelUps.length > 0) audio.play('levelUp');
  if (notes.length) {
    o.add(
      scene.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT - 330,
          notes.join('\n'),
          textStyle(36, { color: '#8dff7a', align: 'center' }),
        )
        .setOrigin(0.5),
    );
  }

  await new Promise<void>((resolve) => {
    o.add(
      new Button(scene, GAME_WIDTH / 2, GAME_HEIGHT - 150, 'Collect', {
        width: 480,
        height: 130,
        onClick: () => {
          o.destroy();
          resolve();
        },
      }),
    );
  });
}

/** "3h 05m", "12m 30s", "45s" */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}
