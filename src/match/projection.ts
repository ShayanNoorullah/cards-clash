/**
 * Board projection. Every board position is defined on a flat "plane"
 * (the 2D layout) and mapped to the screen through a projection: identity in
 * 2D, a perspective tilt in 3D (the far rows shrink and squeeze toward the
 * top). `unproject` inverts it for tap hit-testing. Pure.
 */
import { GAME_WIDTH } from '../config/display';

export type BoardViewMode = '2d' | '3d';

/** Board plane bounds (screen space in 2D). */
export const PLANE = { top: 200, mid: 677, bottom: 1160 } as const;

/** 3D: scale of the far edge, and where the far edge sits on screen. */
const FAR_SCALE = 0.64;
const FAR_SCREEN_Y = 232;

export interface Projected {
  x: number;
  y: number;
  /** Scale for things standing at this point (figures, markers). */
  s: number;
}

export class BoardProjection {
  constructor(readonly mode: BoardViewMode) {}

  /** 0 at the far edge, 1 at the near edge. */
  private depth(py: number): number {
    return Math.min(1, Math.max(0, (py - PLANE.top) / (PLANE.bottom - PLANE.top)));
  }

  scaleAt(py: number): number {
    if (this.mode === '2d') return 1;
    return FAR_SCALE + (1 - FAR_SCALE) * this.depth(py);
  }

  private screenY(t: number): number {
    // Quadratic easing compresses the far rows like a camera tilted over the table.
    return FAR_SCREEN_Y + (PLANE.bottom - FAR_SCREEN_Y) * (0.45 * t + 0.55 * t * t);
  }

  project(px: number, py: number): Projected {
    if (this.mode === '2d') return { x: px, y: py, s: 1 };
    const t = this.depth(py);
    const s = this.scaleAt(py);
    // Points outside the plane (above/below) keep moving linearly so overlays still line up.
    const extra = py < PLANE.top ? py - PLANE.top : py > PLANE.bottom ? py - PLANE.bottom : 0;
    return { x: GAME_WIDTH / 2 + (px - GAME_WIDTH / 2) * s, y: this.screenY(t) + extra * s, s };
  }

  /** Screen point → plane point (inside the plane's vertical range). */
  unproject(x: number, y: number): { px: number; py: number } {
    if (this.mode === '2d') return { px: x, py: y };
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (this.screenY(mid) < y) lo = mid;
      else hi = mid;
    }
    const t = (lo + hi) / 2;
    const py = PLANE.top + t * (PLANE.bottom - PLANE.top);
    const s = this.scaleAt(py);
    return { px: GAME_WIDTH / 2 + (x - GAME_WIDTH / 2) / s, py };
  }

  /** A plane rectangle as a screen polygon (curved edges sampled in 3D). */
  quad(x0: number, y0: number, x1: number, y1: number, steps = 10): { x: number; y: number }[] {
    const n = this.mode === '2d' ? 1 : steps;
    const left: { x: number; y: number }[] = [];
    const right: { x: number; y: number }[] = [];
    for (let i = 0; i <= n; i++) {
      const py = y0 + ((y1 - y0) * i) / n;
      const a = this.project(x0, py);
      const b = this.project(x1, py);
      left.push({ x: a.x, y: a.y });
      right.push({ x: b.x, y: b.y });
    }
    return [...left, ...right.reverse()];
  }
}
