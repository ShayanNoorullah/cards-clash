import { audio } from '../services/audio';
import Phaser from 'phaser';
import { PALETTE } from '../art/palette';
import { addBackground } from '../art/proceduralTextures';
import { FONT_FAMILY, GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { getContent } from '../engine/content';
import type { LandscapeType } from '../engine/types';
import { applyReward } from '../progression/client';
import { PROGRESSION, type PackDef } from '../progression/config';
import { buyPack, formatOdds } from '../progression/rewards';
import { saves } from '../save';
import { Button } from '../ui/Button';
import { Chips } from '../ui/Chips';
import { drawChest } from '../ui/RewardReveal';
import { COLORS, hex, textStyle } from '../ui/theme';
import { fadeIn, goToScene } from '../ui/transitions';

/** Card packs for Coins or Gems (both earned in play — there are no real-money purchases). */
export class ShopScene extends Phaser.Scene {
  private wallet!: Phaser.GameObjects.Text;
  private landscape: LandscapeType = 'golden';

  constructor() {
    super(SCENE_KEYS.Shop);
  }

  create(): void {
    fadeIn(this);
    addBackground(this);
    audio.playMusic('menu');
    this.add.text(GAME_WIDTH / 2, 70, 'Shop', textStyle(76, { color: hex(COLORS.accent) })).setOrigin(0.5);
    new Button(this, 100, 70, 'Back', {
      width: 160,
      height: 80,
      fontSize: 34,
      color: COLORS.danger,
      shadowColor: COLORS.dangerDark,
      onClick: () => goToScene(this, SCENE_KEYS.MainMenu),
    });
    this.wallet = this.add.text(GAME_WIDTH / 2, 150, '', textStyle(34, { color: '#fff3c4' })).setOrigin(0.5);
    this.add
      .text(
        GAME_WIDTH / 2,
        195,
        'Everything here is bought with Coins and Gems you earn by playing. No real money, ever.',
        {
          fontFamily: FONT_FAMILY,
          fontSize: '26px',
          color: hex(COLORS.textDim),
          align: 'center',
          wordWrap: { width: 980 },
        },
      )
      .setOrigin(0.5, 0);
    PROGRESSION.packs.forEach((pack, i) => this.packPanel(pack, 470 + i * 480));
    this.updateWallet();
    this.input.keyboard?.on('keydown-ESC', () => goToScene(this, SCENE_KEYS.MainMenu));
  }

  private updateWallet(): void {
    const c = saves().save.currencies;
    this.wallet.setText(`${c.coins} Coins   ·   ${c.gems} Gems`);
  }

  private packPanel(pack: PackDef, y: number): void {
    const w = GAME_WIDTH - 60;
    const g = this.add.graphics();
    g.fillStyle(COLORS.outline, 1);
    g.fillRoundedRect(30 - 4, y - 214, w + 8, 438, 34);
    g.fillStyle(COLORS.panel, 0.95);
    g.fillRoundedRect(30, y - 210, w, 430, 30);
    drawChest(this, 160, y - 60, pack.cost.gems ? 'magic' : pack.landscapeChoice ? 'golden' : 'silver', 0.9);
    this.add.text(290, y - 170, pack.name, textStyle(46, { color: hex(COLORS.accent) })).setOrigin(0, 0.5);
    this.add.text(290, y - 115, pack.description, textStyle(28, { strokeThickness: 4 })).setOrigin(0, 0.5);
    this.add
      .text(290, y - 70, `Drop rates: ${formatOdds(pack.odds)}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        color: hex(COLORS.textDim),
        wordWrap: { width: w - 290 },
      })
      .setOrigin(0, 0);
    if (pack.landscapeChoice) {
      new Chips(
        this,
        GAME_WIDTH / 2 + 110,
        y + 50,
        (['azure', 'golden', 'murk', 'dune', 'candy', 'ember'] as const).map((l) => ({
          value: l,
          label: PALETTE[l].name.split(' ')[0]!,
          color: PALETTE[l].dark,
        })),
        this.landscape,
        (v) => {
          this.landscape = v;
        },
        { fontSize: 22, height: 50, maxWidth: 760 },
      );
    }
    const price = pack.cost.coins ? `${pack.cost.coins} Coins` : `${pack.cost.gems} Gems`;
    new Button(this, GAME_WIDTH - 230, y + 150, `Buy · ${price}`, {
      width: 380,
      height: 100,
      fontSize: 34,
      color: pack.cost.gems ? 0x3fa9ff : COLORS.primary,
      shadowColor: pack.cost.gems ? 0x1d5fa8 : COLORS.primaryDark,
      onClick: () =>
        void applyReward(
          this,
          (s, rng) =>
            buyPack(s, pack.id, getContent(), rng, pack.landscapeChoice ? this.landscape : undefined),
          pack.name,
        ).then(() => this.updateWallet()),
    });
  }
}
