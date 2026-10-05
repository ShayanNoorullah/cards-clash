import landscapeData from '../data/landscapes.json';
import { parseHexColor } from '../ui/theme';
import { isLandscapeIcon, type LandscapeIcon } from './landscapeIcons';

/** Client-side view of landscapes.json with numeric colors for Phaser. */
export interface LandscapeVisual {
  id: string;
  name: string;
  theme: string;
  color: number;
  dark: number;
  light: number;
  icon: LandscapeIcon;
}

export const LANDSCAPE_VISUALS: readonly LandscapeVisual[] = landscapeData.landscapes.map((l) => {
  if (!isLandscapeIcon(l.icon)) throw new Error(`landscapes.json: unknown icon "${l.icon}" for ${l.id}`);
  return {
    id: l.id,
    name: l.name,
    theme: l.theme,
    color: parseHexColor(l.color),
    dark: parseHexColor(l.dark),
    light: parseHexColor(l.light),
    icon: l.icon,
  };
});
