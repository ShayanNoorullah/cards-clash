import { getSettings } from '../services/settings';
import Phaser from 'phaser';
import { ArtCache } from '../art/ArtCache';
import {
  ART,
  ATK_BADGE,
  BANNER,
  CARD_H,
  CARD_W,
  COST_BADGE,
  DEF_BADGE,
  FOOTER,
  INNER,
  NAME,
  PIP,
  RULES,
  TYPE_STRIP,
} from '../art/cardLayout';
import { ART_KEYS } from '../art/frames';
import { CARD_BODY_FONT, CARD_TITLE_FONT } from '../config/display';
import { getContent } from '../engine/content';
import type { CardDef } from '../engine/types';
import {
  rarityLabel,
  requirementLabel,
  requirementPips,
  statView,
  typeLabel,
  type StatView,
} from './cardText';

const TEXT_RES = 2;
const DARK = '#2a2320';
const GOLD = '#f2a900';

function title(size: number, color: string, overrides: Phaser.Types.GameObjects.Text.TextStyle = {}) {
  return {
    fontFamily: CARD_TITLE_FONT,
    fontSize: `${size}px`,
    fontStyle: '700',
    color,
    resolution: TEXT_RES,
    ...overrides,
  } satisfies Phaser.Types.GameObjects.Text.TextStyle;
}

function body(size: number, color: string, overrides: Phaser.Types.GameObjects.Text.TextStyle = {}) {
  return {
    fontFamily: CARD_BODY_FONT,
    fontSize: `${size}px`,
    fontStyle: '600',
    color,
    resolution: TEXT_RES,
    ...overrides,
  } satisfies Phaser.Types.GameObjects.Text.TextStyle;
}

/** Shrinks a text object's font until it fits the given box. */
export function fitText(
  t: Phaser.GameObjects.Text,
  maxW: number,
  maxH: number,
  maxSize: number,
  minSize: number,
): void {
  for (let size = maxSize; size >= minSize; size--) {
    t.setFontSize(size);
    if (t.width <= maxW && t.height <= maxH) return;
  }
}

let setNumbers: Map<string, number> | null = null;

/** Collector number: position among collectible cards ("017/130"); tokens have none. */
function collectorNumber(card: CardDef): string {
  if (!setNumbers) {
    setNumbers = new Map();
    const collectible = getContent().ctx.cards.all.filter((c) => !c.token);
    collectible.forEach((c, i) => setNumbers!.set(c.id, i + 1));
    setNumbers.set('__total', collectible.length);
  }
  const n = setNumbers.get(card.id);
  const total = setNumbers.get('__total') ?? 0;
  return n ? `${String(n).padStart(3, '0')}/${total}` : 'TOKEN';
}

/**
 * A full card face built from baked parts + live text. Coordinates are in base
 * card units (300 × 420) centered on the container, so callers just scale it.
 */
export class CardView extends Phaser.GameObjects.Container {
  readonly card: CardDef;
  private readonly art: Phaser.GameObjects.Image;
  private atkText: Phaser.GameObjects.Text | null = null;
  private defText: Phaser.GameObjects.Text | null = null;
  private foil: Phaser.GameObjects.Image | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, card: CardDef) {
    super(scene, x, y);
    this.card = card;
    const ox = -CARD_W / 2;
    const oy = -CARD_H / 2;
    const img = (key: string, cx: number, cy: number, w: number, h: number) =>
      scene.add.image(ox + cx, oy + cy, key).setDisplaySize(w, h);
    const text = (tx: number, ty: number, s: string, st: Phaser.Types.GameObjects.Text.TextStyle) =>
      scene.add.text(ox + tx, oy + ty, s, st);

    // Frame, artwork, then the rounded corners and fade over the artwork.
    this.add(img(ART_KEYS.frame(card.landscape), CARD_W / 2, CARD_H / 2, CARD_W, CARD_H));
    this.art = ArtCache.cardImage(scene, ox + ART.x + ART.w / 2, oy + ART.y + ART.h / 2, card).setDisplaySize(
      ART.w,
      ART.h,
    );
    this.add(this.art);
    this.add(img(ART_KEYS.frameTop, CARD_W / 2, CARD_H / 2, CARD_W, CARD_H));
    // Gold printings shimmer like the rarest cards.
    if (card.rarity === 'epic' || card.rarity === 'legendary' || card.variant === 'Gold') {
      const foil = img(
        ART_KEYS.cardFoil,
        INNER.x + INNER.w / 2,
        INNER.y + INNER.h / 2,
        INNER.w,
        INNER.h,
      ).setBlendMode(Phaser.BlendModes.SCREEN);
      this.add(foil);
      this.foil = foil;
      // A slow shimmer so rare cards feel alive.
      if (!getSettings().reducedMotion)
        scene.tweens.add({
          targets: foil,
          alpha: 0.35,
          duration: 1600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
    }

    // Name banner: name and requirement line.
    const stats = statView(card);
    const nameRight = stats ? NAME.right : NAME.rightNoStats;
    const label = card.variant ? `${card.name} · ${card.variant}` : card.name;
    const name = text(
      NAME.x,
      NAME.y,
      label.toUpperCase(),
      title(19, card.variant === 'Gold' ? '#ffe27a' : '#ffffff'),
    )
      .setOrigin(0, 0.5)
      .setShadow(0, 1.5, 'rgba(0,0,0,0.4)', 0, false, true);
    fitText(name, nameRight - NAME.x, BANNER.h * 0.5, 19, 11);
    const sub = text(NAME.x, NAME.subY, requirementLabel(card), body(12, '#fff3d6')).setOrigin(0, 0.5);
    fitText(sub, nameRight - NAME.x, 16, 12, 9);
    this.add([name, sub]);

    // Stats: ATK circle and DEF shield sitting on the banner.
    if (stats) {
      this.add(
        img(ART_KEYS.cardAtk, ATK_BADGE.x, ATK_BADGE.y + 1, (ATK_BADGE.r + 3) * 2, (ATK_BADGE.r + 4) * 2),
      );
      this.add(
        img(
          ART_KEYS.cardDef(card.landscape),
          DEF_BADGE.x,
          BANNER.y - 12 + (DEF_BADGE.h + 6) / 2,
          DEF_BADGE.w + 4,
          DEF_BADGE.h + 6,
        ),
      );
      this.atkText = text(ATK_BADGE.x, ATK_BADGE.y, '', title(23, DARK, { fontStyle: '600' })).setOrigin(0.5);
      this.defText = text(
        DEF_BADGE.x,
        DEF_BADGE.y - 4,
        '',
        title(23, '#ffffff', { fontStyle: '600' }),
      ).setOrigin(0.5);
      this.add([this.atkText, this.defText]);
      this.setStats(stats);
    }

    // Type strip.
    this.add(
      img(ART_KEYS.landIcon(card.landscape), TYPE_STRIP.x + 15, TYPE_STRIP.y + TYPE_STRIP.h / 2, 13, 13),
    );
    const type = text(
      CARD_W / 2,
      TYPE_STRIP.y + TYPE_STRIP.h / 2,
      typeLabel(card),
      body(13, '#f1e4c3', { fontStyle: 'italic 600' }),
    ).setOrigin(0.5);
    fitText(type, TYPE_STRIP.w - 60, TYPE_STRIP.h, 13, 9);
    this.add(type);

    // Requirement pips down the right side of the rules box.
    const pips = Math.min(3, requirementPips(card));
    for (let i = 0; i < pips; i++) {
      this.add(img(ART_KEYS.cardPip, PIP.x, PIP.y + i * (PIP.h + PIP.gap), PIP.w, PIP.h));
    }

    // Rules text, a diamond divider, and flavour text when there is room.
    this.addRules(scene, ox, oy, pips > 0 ? RULES.w : RULES.wNoPips);

    // Footer.
    const footY = FOOTER.y + FOOTER.h / 2;
    this.add(
      text(
        FOOTER.x + 10,
        footY,
        `Art: ${card.image ? 'SD-Turbo' : 'Procedural'}\nCC · ${collectorNumber(card)}`,
        {
          ...body(8, '#c9c4b8', { fontStyle: '500' }),
          lineSpacing: -1,
        },
      ).setOrigin(0, 0.5),
    );
    const pill = scene.add.graphics();
    pill.fillStyle(0xffffff, 1);
    pill.fillRoundedRect(ox + CARD_W / 2 - 16, oy + footY - 8, 32, 16, 4);
    this.add(pill);
    this.add(img(ART_KEYS.rarityGem(card.rarity), CARD_W / 2, footY, 14, 14).setName(rarityLabel(card)));
    this.add(
      text(FOOTER.x + FOOTER.w - 10, footY, `Cards Clash\n${rarityLabel(card).toUpperCase()}`, {
        ...body(8, '#c9c4b8', { fontStyle: '500', align: 'right' }),
        lineSpacing: -1,
      })
        .setOrigin(1, 0.5)
        .setColor('#c9c4b8'),
    );

    // Cost badge over the top-left corner.
    this.add(
      img(ART_KEYS.cardCost, COST_BADGE.x, COST_BADGE.y + 1, COST_BADGE.size + 4, COST_BADGE.size + 6),
    );
    this.add(text(COST_BADGE.x, COST_BADGE.y, String(card.cost), title(25, GOLD)).setOrigin(0.5));

    this.setSize(CARD_W, CARD_H);
    scene.add.existing(this);
  }

  private addRules(scene: Phaser.Scene, ox: number, oy: number, width: number): void {
    const card = this.card;
    const rulesText = card.text || (card.token ? 'Token.' : '');
    const height = RULES.bottom - RULES.top;
    let y = RULES.top;
    if (rulesText) {
      const rules = scene.add
        .text(ox + RULES.x, oy + y, rulesText, body(17, DARK, { wordWrap: { width, useAdvancedWrap: true } }))
        .setOrigin(0, 0);
      fitText(rules, width, height, 17, 10);
      this.add(rules);
      y += rules.height + 4;
    }
    const left = RULES.bottom - y;
    if (left < 22) return;
    if (rulesText) {
      const g = scene.add.graphics();
      const dy = oy + y + 4;
      g.lineStyle(1, 0x8a6a2a, 1);
      g.strokeRect(ox + RULES.x + 1, dy - 3, 5, 5);
      g.lineBetween(ox + RULES.x + 10, dy, ox + RULES.x + width, dy);
      this.add(g);
      y += 10;
    }
    const flavor = scene.add
      .text(ox + RULES.x, oy + y, card.flavorText, {
        ...body(14, '#4a3e33', { fontStyle: 'italic 500' }),
        wordWrap: { width, useAdvancedWrap: true },
      })
      .setOrigin(0, 0);
    fitText(flavor, width, RULES.bottom - y, 14, 9);
    if (flavor.height > RULES.bottom - y) flavor.destroy();
    else this.add(flavor);
  }

  /** Updates the ATK/DEF badges (green = buffed, red = damaged/debuffed). */
  setStats(stats: StatView): void {
    const color = (trend: -1 | 0 | 1, base: string) => (trend > 0 ? '#1f8a3a' : trend < 0 ? '#c0392b' : base);
    this.atkText?.setText(String(stats.atk)).setColor(color(stats.atkTrend, DARK));
    this.defText
      ?.setText(String(stats.def))
      .setColor(stats.defTrend > 0 ? '#9dff9d' : stats.defTrend < 0 ? '#ffb0a8' : '#ffffff');
  }

  override destroy(fromScene?: boolean): void {
    if (this.scene) {
      if (this.foil) this.scene.tweens.killTweensOf(this.foil);
      ArtCache.releaseImage(this.scene, this.art);
    }
    super.destroy(fromScene);
  }
}
