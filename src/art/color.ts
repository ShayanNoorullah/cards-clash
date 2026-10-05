/**
 * Pure color helpers (no Phaser), shared by art generators and tests.
 * Colors are 24-bit integers (0xRRGGBB).
 */

export interface Hsl {
  h: number; // 0..360
  s: number; // 0..1
  l: number; // 0..1
}

export function hexToInt(hex: string): number {
  const cleaned = hex.replace('#', '');
  const n = Number.parseInt(cleaned, 16);
  if (cleaned.length !== 6 || Number.isNaN(n)) throw new Error(`Invalid hex color: ${hex}`);
  return n;
}

export function intToHex(color: number): string {
  return `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;
}

export function toHsl(color: number): Hsl {
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}

export function fromHsl({ h, s, l }: Hsl): number {
  const hh = (((h % 360) + 360) % 360) / 360;
  const ss = Math.max(0, Math.min(1, s));
  const ll = Math.max(0, Math.min(1, l));
  if (ss === 0) {
    const v = Math.round(ll * 255);
    return (v << 16) | (v << 8) | v;
  }
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const channel = (t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const r = Math.round(channel(hh + 1 / 3) * 255);
  const g = Math.round(channel(hh) * 255);
  const b = Math.round(channel(hh - 1 / 3) * 255);
  return (r << 16) | (g << 8) | b;
}

/** Shifts hue (degrees), saturation and lightness (additive, clamped). */
export function adjust(color: number, dh = 0, ds = 0, dl = 0): number {
  const c = toHsl(color);
  return fromHsl({ h: c.h + dh, s: c.s + ds, l: c.l + dl });
}

export function lighten(color: number, amount: number): number {
  return adjust(color, 0, 0, amount);
}

export function darken(color: number, amount: number): number {
  return adjust(color, 0, 0, -amount);
}

/** Linear blend between two colors, t in 0..1. */
export function mix(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const ch = (shift: number) => Math.round(((a >> shift) & 0xff) * (1 - k) + ((b >> shift) & 0xff) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Relative luminance (0..1) for picking readable text colors. */
export function luminance(color: number): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((color >> 16) & 0xff) + 0.7152 * lin((color >> 8) & 0xff) + 0.0722 * lin(color & 0xff);
}
