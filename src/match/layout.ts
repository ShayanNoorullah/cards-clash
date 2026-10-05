/**
 * Match screen layout (1080 × 1920 portrait). The viewing player is always at
 * the bottom; in hot-seat the board flips when the device is passed.
 *
 * Board positions are on the flat board plane (see projection.ts), which is
 * also the screen layout of the 2D view; the 3D view projects them.
 */
import { PLANE } from './projection';

export const LANE_X = [135, 405, 675, 945] as const;
export const LANE_W = 256;
/** Gap between lane strips on the plane. */
export const LANE_GAP = 14;

/** Creature figures (base size, before perspective scaling). */
export const TOKEN_W = 200;
export const TOKEN_H = 260;

export interface SideLayout {
  heroY: number;
  /** Plane y of the creature's feet area (token origin). */
  creatureY: number;
  /** Plane y of the building chip. */
  buildingY: number;
  /** Plane y of the Floop button. */
  floopY: number;
  /** The side's half of the lanes on the plane. */
  bandTop: number;
  bandBottom: number;
}

export const TOP: SideLayout = {
  heroY: 100,
  creatureY: 445,
  buildingY: 630,
  floopY: 270,
  bandTop: PLANE.top,
  bandBottom: PLANE.mid,
};
export const BOTTOM: SideLayout = {
  heroY: 1250,
  creatureY: 925,
  buildingY: 728,
  floopY: 1105,
  bandTop: PLANE.mid,
  bandBottom: PLANE.bottom,
};

/** Arrange-landscapes screen tiles. */
export const TILE_W = 240;
export const TILE_H = 130;

export const HAND_Y = 1670;
export const HAND_SCALE = 0.8;
export const HAND_TOP = 1400;
export const HAND_LIFT = 120;

/** Round GO (end turn) button on the viewer's hero bar. */
export const END_TURN = { x: 975, y: 1250, w: 170, h: 170 };
/** Match menu buttons sit in the opponent bar, where the End Turn button is on the viewer bar. */
export const MENU_BTN = { x: 1010, y: 100 };
export const LOG_BTN = { x: 890, y: 100 };

export function laneAtX(x: number): number | null {
  for (let i = 0; i < LANE_X.length; i++) {
    if (Math.abs(x - LANE_X[i]!) <= LANE_W / 2) return i;
  }
  return null;
}
