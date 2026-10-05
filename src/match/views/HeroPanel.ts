import { cardBackKey } from '../../ui/cosmetic';
import Phaser from 'phaser';
import { ArtCache } from '../../art/ArtCache';
import { ART_KEYS, bakeRegion } from '../../art/frames';
import { PALETTE } from '../../art/palette';
import { FONT_FAMILY, GAME_WIDTH } from '../../config/display';
import type { HeroDef, PlayerState, RulesContext } from '../../engine/types';
import { abilityTurnsLeft } from '../../ui/cardText';

const INK = 0x120c2b;

function text(scene: Phaser.Scene, x: number, y: number, s: string, size: number, color = '#ffffff') {
  return scene.add
    .text(x, y, s, {
      fontFamily: FONT_FAMILY,
      fontSize: `${size}px`,
      color,
      stroke: '#120c2b',
      strokeThickness: Math.max(3, Math.round(size / 5)),
      resolution: 2,
    })
    .setOrigin(0, 0.5);
}

/**
 * A player's hero bar: portrait with Hero Ability charge ring, name, HP, MP gems,
 * deck/discard counts and (for the opponent) cards in hand.
 */
export class HeroPanel extends Phaser.GameObjects.Container {
  readonly portrait: Phaser.GameObjects.Image;
  readonly deckIcon: Phaser.GameObjects.Image;
  // Baked images instead of Graphics: these change rarely, and Graphics cost CPU every frame.
  private readonly ring: Phaser.GameObjects.Image;
  private readonly readyGlow: Phaser.GameObjects.Image;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly mpGems: Phaser.GameObjects.Image;
  private readonly mpText: Phaser.GameObjects.Text;
  private readonly deckText: Phaser.GameObjects.Text;
  private readonly discardText: Phaser.GameObjects.Text;
  private readonly handText: Phaser.GameObjects.Text;
  private readonly chargeText: Phaser.GameObjects.Text;
  private readyTween: Phaser.Tweens.Tween | null = null;
  private readonly hero: HeroDef;
  displayedHp = 0;

  constructor(scene: Phaser.Scene, y: number, hero: HeroDef, playerName: string, showEndTurnSpace: boolean) {
    super(scene, 0, y);
    this.hero = hero;
    const pal = PALETTE[hero.landscape];
    const bg = bakeRegion(
      scene,
      `heropanel-${pal.color}`,
      { x0: 4, y0: -86, x1: GAME_WIDTH - 4, y1: 86 },
      (g) => {
        g.fillStyle(INK, 0.85);
        g.fillRoundedRect(8, -82, GAME_WIDTH - 16, 164, 30);
        g.lineStyle(4, pal.color, 0.9);
        g.strokeRoundedRect(8, -82, GAME_WIDTH - 16, 164, 30);
      },
    );
    this.add(bg);

    this.readyGlow = bakeRegion(scene, 'heropanel-glow', { x0: 6, y0: -86, x1: 178, y1: 86 }, (g) => {
      g.fillStyle(0xffd23f, 0.35);
      g.fillCircle(92, 0, 84);
    }).setVisible(false);
    this.add(this.readyGlow);
    this.ring = scene.add.image(0, 0, '__DEFAULT');
    this.add(this.ring);
    this.portrait = ArtCache.heroImage(scene, 92, 0, hero).setDisplaySize(128, 128);
    this.add(this.portrait);
    this.chargeText = text(scene, 92, 58, '', 20).setOrigin(0.5);
    this.add(this.chargeText);

    this.nameText = text(scene, 180, -40, playerName, 30);
    this.add(this.nameText);
    this.add(scene.add.image(200, 18, ART_KEYS.icon('lifesteal')).setDisplaySize(46, 46));
    this.hpText = text(scene, 232, 18, '25', 50, '#ffdbe0');
    this.add(this.hpText);

    this.mpGems = scene.add.image(0, 0, '__DEFAULT');
    this.add(this.mpGems);
    this.mpText = text(scene, 360, 40, '', 22, '#bcd4ff');
    this.add(this.mpText);

    const deckX = showEndTurnSpace ? 640 : 820;
    this.deckIcon = scene.add.image(deckX, 0, cardBackKey()).setDisplaySize(72, 100);
    this.add(this.deckIcon);
    this.deckText = text(scene, deckX, 64, '', 20).setOrigin(0.5);
    this.add(this.deckText);
    this.discardText = text(scene, deckX + 70, 0, '', 22, '#d0c8f0');
    this.add(this.discardText);
    this.handText = text(scene, deckX + 70, -40, '', 22, '#fff3c4');
    this.add(this.handText);

    scene.add.existing(this);
  }

  refresh(p: PlayerState, ctx: RulesContext, showHandCount: boolean): void {
    this.displayedHp = p.hp;
    this.hpText.setText(String(p.hp));
    this.drawMp(p.mp, ctx.balance.maxMp);
    this.deckText.setText(`Deck ${p.deck.length}`);
    this.discardText.setText(`Discard\n${p.discard.length}`);
    this.handText.setText(showHandCount ? `Hand ${p.hand.length}` : '');
    this.drawCharge(p.ultimateCharge, ctx.balance.ultimateChargeMax);
  }

  /** Used by the animator to tick HP before the final sync. */
  setHp(hp: number): void {
    this.displayedHp = hp;
    this.hpText.setText(String(Math.max(0, hp)));
  }

  heroPoint(): { x: number; y: number } {
    return { x: this.x + 92, y: this.y };
  }

  private drawMp(mp: number, max: number): void {
    const shown = Math.min(mp, max);
    bakeRegion(
      this.scene,
      `mpgems-${shown}-${max}`,
      { x0: 350, y0: -14, x1: 370 + max * 32, y1: 26 },
      (g) => this.paintMp(g, shown, max),
      this.mpGems,
    );
    this.mpText.setText(`${mp} MP`);
  }

  private paintMp(g: Phaser.GameObjects.Graphics, mp: number, max: number): void {
    for (let i = 0; i < max; i++) {
      const x = 370 + i * 32;
      g.fillStyle(INK, 1);
      g.fillCircle(x, 6, 17);
      g.fillStyle(i < mp ? 0x4f8cff : 0x2a2f4a, 1);
      g.fillCircle(x, 6, 13);
      if (i < mp) {
        g.fillStyle(0xffffff, 0.45);
        g.fillCircle(x - 5, 1, 5);
      }
    }
  }

  private drawCharge(charge: number, max: number): void {
    const shown = Math.max(0, Math.min(charge, max));
    bakeRegion(
      this.scene,
      `charge-ring-${shown}-${max}`,
      { x0: 12, y0: -80, x1: 172, y1: 80 },
      (g) => {
        g.lineStyle(12, 0x2a2350, 1);
        g.strokeCircle(92, 0, 72);
        if (shown > 0) {
          g.lineStyle(12, shown >= max ? 0xffd23f : 0xff9a3c, 1);
          g.beginPath();
          g.arc(92, 0, 72, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * shown) / max);
          g.strokePath();
        }
      },
      this.ring,
    );
    const ready = charge >= max;
    const left = abilityTurnsLeft(this.hero, charge, max);
    this.chargeText.setText(
      ready ? 'READY!' : left === null ? `${charge}%` : `${left} turn${left === 1 ? '' : 's'}`,
    );
    this.readyGlow.setVisible(ready);
    if (ready && !this.readyTween) {
      this.readyTween = this.scene.tweens.add({
        targets: this.readyGlow,
        alpha: { from: 1, to: 0.3 },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    } else if (!ready && this.readyTween) {
      this.readyTween.stop();
      this.readyTween = null;
    }
  }
}
