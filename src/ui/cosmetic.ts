/** The player's chosen cosmetics, for drawing (falls back to defaults before the save loads). */
import { ART_KEYS, CARD_BACK_STYLES, type CardBackStyle } from '../art/frames';
import { saves } from '../save';

export function cardBackKey(): string {
  const id = saves().loaded ? saves().save.profile.cardBack : 'classic';
  const style = (CARD_BACK_STYLES as readonly string[]).includes(id) ? (id as CardBackStyle) : 'classic';
  return ART_KEYS.cardBack(style);
}
