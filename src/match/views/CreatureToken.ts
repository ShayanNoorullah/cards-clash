import { getSettings } from '../../services/settings';
import Phaser from 'phaser';
import { ArtCache } from '../../art/ArtCache';
import { ART_KEYS } from '../../art/frames';
import { PALETTE } from '../../art/palette';
import { CARD_TITLE_FONT, FONT_FAMILY } from '../../config/display';
import { creatureAtk, creatureDef, creatureKeywords, creatureMaxDef } from '../../engine/statics';
import type { CardDef, CreatureInPlay, GameState, KeywordValues, RulesContext } from '../../engine/types';
import { TOKEN_H, TOKEN_W } from '../layout';

const KEYWORD_ORDER = [
  'rush',
  'guard',
  'ranged',
  'lifesteal',
  'thorns',
  'counter',
  'poison',
  'regenerate',
  'swift',
] as const;

const FIGURE = 210;
/** Where the figure's feet stand, relative to the token origin. */
const FEET_Y = 18;
const PLATE_Y = 70;
const ARC_R = 74;

function label(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color = '#ffffff') {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT_FAMILY,
      fontSize: `${size}px`,
      color,
      stroke: '#120c2b',
      strokeThickness: Math.max(3, Math.round(size / 5)),
      resolution: 2,
    })
    .setOrigin(0.5);
}

function statText(scene: Phaser.Scene, x: number, y: number) {
  return scene.add
    .text(x, y, '0', {
      fontFamily: CARD_TITLE_FONT,
      fontSize: '27px',
      fontStyle: '700',
      color: '#ffffff',
      stroke: '#120c2b',
      strokeThickness: 4,
      resolution: 2,
    })
    .setOrigin(0.5);
}

/**
 * A creature standing on its lane: the figure (art without backdrop) and a
 * stat plate with a health arc, ATK and DEF, plus keyword icons and status
 * effects (frozen, poison, shield, stealth, exhausted, summoning sick).
 * `baseScale` is the perspective scale of its spot on the board.
 */
export class CreatureToken extends Phaser.GameObjects.Container {
  readonly iid: string;
  readonly card: CardDef;
  baseScale = 1;

  private readonly figure: Phaser.GameObjects.Image;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly arc: Phaser.GameObjects.Graphics;
  private readonly atkText: Phaser.GameObjects.Text;
  private readonly defText: Phaser.GameObjects.Text;
  private readonly icons: Phaser.GameObjects.Container;
  private readonly status: Phaser.GameObjects.Container;
  private readonly shieldRing: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, card: CardDef, iid: string) {
    super(scene, x, y);
    this.iid = iid;
    this.card = card;
    const pal = PALETTE[card.landscape];

    // Ground ring under the feet (landscape colour) so the figure reads on any strip.
    this.frame = scene.add.graphics();
    this.frame.fillStyle(0x000000, 0.3);
    this.frame.fillEllipse(0, FEET_Y + 4, 150, 34);
    this.frame.lineStyle(4, pal.ink, 0.9);
    this.frame.strokeEllipse(0, FEET_Y + 2, 150, 34);
    this.add(this.frame);

    this.figure = ArtCache.figureImage(scene, 0, FEET_Y, card).setOrigin(0.5, 0.9);
    // Illustrated creatures stand as cards (narrower than the square silhouettes).
    this.figure.setDisplaySize(card.image ? FIGURE * 0.82 : FIGURE, FIGURE);
    this.add(this.figure);
    // Idle breathing (from the feet, so the figure stays planted).
    if (!getSettings().reducedMotion) {
      const sy = this.figure.scaleY;
      scene.tweens.add({
        targets: this.figure,
        scaleY: sy * 1.035,
        duration: 1300 + Math.random() * 500,
        delay: Math.random() * 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }

    this.shieldRing = scene.add.graphics().setVisible(false);
    this.shieldRing.lineStyle(6, 0x7fdcff, 0.95);
    this.shieldRing.fillStyle(0x7fdcff, 0.14);
    this.shieldRing.fillEllipse(0, FEET_Y - 82, 190, 210);
    this.shieldRing.strokeEllipse(0, FEET_Y - 82, 190, 210);
    this.add(this.shieldRing);

    // Stat plate: health arc between the ATK and DEF circles, name underneath.
    this.arc = scene.add.graphics();
    this.add(this.arc);
    const circle = scene.add.graphics();
    for (const [cx, color] of [
      [-ARC_R, 0xe0413a],
      [ARC_R, 0x3f6fd8],
    ] as const) {
      circle.fillStyle(0x120c2b, 1);
      circle.fillCircle(cx, PLATE_Y + 8, 26);
      circle.fillStyle(color, 1);
      circle.fillCircle(cx, PLATE_Y + 8, 21);
      circle.fillStyle(0xffffff, 0.25);
      circle.fillCircle(cx - 6, PLATE_Y + 1, 7);
    }
    this.add(circle);
    this.atkText = statText(scene, -ARC_R, PLATE_Y + 8);
    this.defText = statText(scene, ARC_R, PLATE_Y + 8);
    this.add([this.atkText, this.defText]);
    const name = scene.add
      .text(0, PLATE_Y + 34, card.name.toUpperCase(), {
        fontFamily: CARD_TITLE_FONT,
        fontSize: '17px',
        fontStyle: '700',
        color: '#ffffff',
        stroke: '#120c2b',
        strokeThickness: 4,
        resolution: 2,
      })
      .setOrigin(0.5);
    if (name.width > 190) name.setScale(190 / name.width);
    this.add(name);

    this.icons = scene.add.container(0, FEET_Y - FIGURE * 0.86);
    this.status = scene.add.container(0, 0);
    this.add([this.icons, this.status]);

    this.setSize(TOKEN_W, TOKEN_H);
    scene.add.existing(this);
  }

  /** Refreshes stats, keyword icons and status overlays from the live state. */
  refresh(state: GameState, ctx: RulesContext, c: CreatureInPlay, lane: number): void {
    const card = this.card;
    const atk = creatureAtk(state, ctx, c, lane);
    const def = creatureDef(state, ctx, c, lane);
    const maxDef = creatureMaxDef(state, ctx, c, lane);
    const printedAtk = card.type === 'creature' ? card.atk : 0;
    const printedDef = card.type === 'creature' ? card.def : 0;
    this.atkText
      .setText(String(atk))
      .setColor(atk > printedAtk ? '#b8ffb0' : atk < printedAtk ? '#ffc4c4' : '#ffffff');
    this.defText
      .setText(String(def))
      .setColor(c.damage > 0 || def < printedDef ? '#ffc4c4' : def > printedDef ? '#b8ffb0' : '#ffffff');
    this.drawArc(maxDef > 0 ? Math.max(0, def) / maxDef : 0);

    const kw = creatureKeywords(state, ctx, c, lane);
    this.renderIcons(kw);
    this.renderStatus(c, (kw.rush ?? 0) > 0);
  }

  private drawArc(ratio: number): void {
    const g = this.arc;
    g.clear();
    const start = Phaser.Math.DegToRad(200);
    const end = Phaser.Math.DegToRad(340);
    g.lineStyle(16, 0x120c2b, 1);
    g.beginPath();
    g.arc(0, PLATE_Y + 70, ARC_R + 2, start, end);
    g.strokePath();
    g.lineStyle(10, 0x2a2f3a, 1);
    g.beginPath();
    g.arc(0, PLATE_Y + 70, ARC_R + 2, start, end);
    g.strokePath();
    if (ratio > 0) {
      const color = ratio > 0.6 ? 0x6dd34a : ratio > 0.3 ? 0xf2c230 : 0xe0413a;
      g.lineStyle(10, color, 1);
      g.beginPath();
      g.arc(0, PLATE_Y + 70, ARC_R + 2, start, start + (end - start) * Math.min(1, ratio));
      g.strokePath();
    }
  }

  private renderIcons(kw: KeywordValues): void {
    this.icons.removeAll(true);
    const ids = KEYWORD_ORDER.filter((k) => (kw[k] ?? 0) > 0).slice(0, 4);
    const size = 30;
    ids.forEach((id, i) => {
      const x = (i - (ids.length - 1) / 2) * (size + 4);
      this.icons.add(this.scene.add.image(x, 0, ART_KEYS.icon(id)).setDisplaySize(size, size));
      const v = kw[id] ?? 0;
      if ((id === 'poison' || id === 'thorns' || id === 'regenerate') && v > 0) {
        this.icons.add(label(this.scene, x + 11, 10, String(v), 16));
      }
    });
  }

  private renderStatus(c: CreatureInPlay, hasRush: boolean): void {
    this.status.removeAll(true);
    this.shieldRing.setVisible(c.shield);
    this.figure.clearTint();
    if (c.frozen) this.figure.setTint(0x9fdcff);
    else if (c.exhausted) this.figure.setTint(0x9a96b0);
    this.setAlpha(c.stealth ? 0.65 : 1);
    const badges: { icon: string; text?: string }[] = [];
    if (c.frozen) badges.push({ icon: ART_KEYS.icon('frozen') });
    if (c.poison > 0) badges.push({ icon: ART_KEYS.icon('poison'), text: String(c.poison) });
    if (c.stealth) badges.push({ icon: ART_KEYS.icon('stealth') });
    if (c.exhausted) badges.push({ icon: ART_KEYS.icon('floop') });
    badges.forEach((b, i) => {
      const x = TOKEN_W / 2 - 14;
      const y = -150 + i * 40;
      this.status.add(this.scene.add.image(x, y, b.icon).setDisplaySize(36, 36));
      if (b.text) this.status.add(label(this.scene, x + 12, y + 12, b.text, 18));
    });
    if (c.summoningSick && !hasRush && !c.exhausted)
      this.status.add(label(this.scene, -TOKEN_W / 2 + 22, -150, 'Zz', 26, '#d9e4ff'));
    if (c.token) this.status.add(label(this.scene, 0, PLATE_Y + 54, 'TOKEN', 14, '#ffe98a'));
  }

  override destroy(fromScene?: boolean): void {
    if (this.scene) {
      this.scene.tweens.killTweensOf(this.figure);
      ArtCache.releaseImage(this.scene, this.figure);
    }
    super.destroy(fromScene);
  }
}
