import type Phaser from 'phaser';

/**
 * Colorblind-safe landscape icons: every landscape has a distinct SHAPE in
 * addition to its color, drawn procedurally with Phaser Graphics.
 */
export type LandscapeIcon = 'snowflake' | 'sun' | 'droplet' | 'triangle' | 'heart' | 'flame' | 'compass';

export const LANDSCAPE_ICONS: readonly LandscapeIcon[] = [
  'snowflake',
  'sun',
  'droplet',
  'triangle',
  'heart',
  'flame',
];

export function isLandscapeIcon(value: string): value is LandscapeIcon {
  return (LANDSCAPE_ICONS as readonly string[]).includes(value);
}

/** Draws `icon` centered on (cx, cy) fitting inside a `size` x `size` box. */
export function drawLandscapeIcon(
  g: Phaser.GameObjects.Graphics,
  icon: LandscapeIcon,
  cx: number,
  cy: number,
  size: number,
  color: number,
  outline = 0x120c2b,
): void {
  const r = size / 2;
  const stroke = Math.max(2, size * 0.07);
  g.fillStyle(color, 1);
  g.lineStyle(stroke, outline, 1);

  switch (icon) {
    case 'compass': {
      g.fillCircle(cx, cy, r * 0.85);
      g.strokeCircle(cx, cy, r * 0.85);
      g.fillStyle(outline, 1);
      g.fillTriangle(cx, cy - r * 0.7, cx + r * 0.2, cy, cx - r * 0.2, cy);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(cx, cy + r * 0.7, cx + r * 0.2, cy, cx - r * 0.2, cy);
      break;
    }
    case 'snowflake': {
      g.lineStyle(size * 0.12, outline, 1);
      strokeSnowflake(g, cx, cy, r * 0.85);
      g.lineStyle(size * 0.07, color, 1);
      strokeSnowflake(g, cx, cy, r * 0.85);
      break;
    }
    case 'sun': {
      const rays = 8;
      const pts: Phaser.Types.Math.Vector2Like[] = [];
      for (let i = 0; i < rays * 2; i++) {
        const a = (Math.PI * i) / rays;
        const rr = i % 2 === 0 ? r * 0.95 : r * 0.62;
        pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
      }
      g.fillPoints(pts, true);
      g.strokePoints(pts, true);
      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(cx, cy, r * 0.4);
      break;
    }
    case 'droplet': {
      const pts: Phaser.Types.Math.Vector2Like[] = [{ x: cx, y: cy - r * 0.95 }];
      const baseY = cy + r * 0.3;
      const br = r * 0.6;
      for (let i = 0; i <= 16; i++) {
        const a = -Math.PI * 0.15 + (Math.PI * 1.3 * i) / 16;
        pts.push({ x: cx + Math.cos(a) * br, y: baseY + Math.sin(a) * br });
      }
      g.fillPoints(pts, true);
      g.strokePoints(pts, true);
      break;
    }
    case 'triangle': {
      const pts = [
        { x: cx, y: cy - r * 0.85 },
        { x: cx + r * 0.95, y: cy + r * 0.75 },
        { x: cx - r * 0.95, y: cy + r * 0.75 },
      ];
      g.fillPoints(pts, true);
      g.strokePoints(pts, true);
      g.lineStyle(stroke, outline, 0.6);
      g.lineBetween(cx, cy - r * 0.85, cx + r * 0.15, cy + r * 0.75);
      break;
    }
    case 'heart': {
      const pts: Phaser.Types.Math.Vector2Like[] = [];
      for (let i = 0; i < 40; i++) {
        const t = (Math.PI * 2 * i) / 40;
        const x = 16 * Math.sin(t) ** 3;
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        pts.push({ x: cx + (x / 17) * r, y: cy - (y / 17) * r + r * 0.05 });
      }
      g.fillPoints(pts, true);
      g.strokePoints(pts, true);
      break;
    }
    case 'flame': {
      const pts: Phaser.Types.Math.Vector2Like[] = [
        { x: cx, y: cy - r * 0.95 },
        { x: cx + r * 0.3, y: cy - r * 0.35 },
        { x: cx + r * 0.5, y: cy - r * 0.55 },
        { x: cx + r * 0.75, y: cy + r * 0.15 },
        { x: cx + r * 0.55, y: cy + r * 0.75 },
        { x: cx, y: cy + r * 0.95 },
        { x: cx - r * 0.55, y: cy + r * 0.75 },
        { x: cx - r * 0.75, y: cy + r * 0.1 },
        { x: cx - r * 0.35, y: cy - r * 0.3 },
      ];
      g.fillPoints(pts, true);
      g.strokePoints(pts, true);
      g.fillStyle(0xffffff, 0.35);
      g.fillEllipse(cx, cy + r * 0.35, r * 0.5, r * 0.7);
      break;
    }
  }
}

function strokeSnowflake(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
  for (let i = 0; i < 3; i++) {
    const a = (Math.PI * i) / 3 + Math.PI / 2;
    const dx = Math.cos(a) * r;
    const dy = Math.sin(a) * r;
    g.lineBetween(cx - dx, cy - dy, cx + dx, cy + dy);
    for (const s of [1, -1]) {
      const bx = cx + dx * 0.55 * s;
      const by = cy + dy * 0.55 * s;
      for (const side of [1, -1]) {
        const ba = a + (s > 0 ? 0 : Math.PI) + side * (Math.PI / 4) * 3;
        g.lineBetween(bx, by, bx + Math.cos(ba) * r * 0.32, by + Math.sin(ba) * r * 0.32);
      }
    }
  }
}
