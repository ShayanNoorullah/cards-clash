/**
 * Card face layout in base units. Textures are baked at TEXTURE_SCALE for crisp
 * zooming and displayed at base size by CardView.
 *
 * The face is a dark outer frame around a cream card: tall artwork, a coloured
 * name banner with ATK/DEF badges, a dark type strip, the rules box with
 * landscape-requirement pips, and a dark footer. A hexagonal cost badge sits on
 * the top-left corner.
 */
export const CARD_W = 300;
export const CARD_H = 420;
export const CARD_RADIUS = 14;
export const TEXTURE_SCALE = 1.5;

/** The cream card inside the dark outer frame. */
export const INNER = { x: 9, y: 9, w: 282, h: 402, r: 8 };
export const ART = { x: 9, y: 9, w: 282, h: 224 };
/** Darkening fade over the bottom of the artwork. */
export const ART_FADE_H = 44;
export const BANNER = { x: 9, y: 233, w: 282, h: 48 };
/** Name and subtitle start here; creatures leave room on the right for stats. */
export const NAME = { x: 21, right: 186, rightNoStats: 281, y: 249, subY: 270 };
export const ATK_BADGE = { x: 215, y: 242, r: 21 };
export const DEF_BADGE = { x: 261, y: 243, w: 40, h: 45 };
export const TYPE_STRIP = { x: 9, y: 281, w: 282, h: 20 };
export const TEXT_BOX = { x: 9, y: 301, w: 282, h: 85 };
/** Rules text column inside the text box (right side holds the pips). */
export const RULES = { x: 21, w: 232, wNoPips: 258, top: 307, bottom: 382 };
export const PIP = { x: 274, y: 316, w: 18, h: 20, gap: 5 };
export const FOOTER = { x: 9, y: 386, w: 282, h: 25 };
export const COST_BADGE = { x: 29, y: 29, size: 50 };

export const HERO_PORTRAIT = 200;
/** Square texture for board figures (creature without backdrop). */
export const FIGURE_SIZE = 220;
export const TILE = { w: 240, h: 150 };
