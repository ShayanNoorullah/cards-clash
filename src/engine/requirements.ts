import type { LandscapeType } from './types';

/** Counts a landscape type in a plain list (deck lists, before a match). */
export function countLandscapesIn(list: readonly LandscapeType[], type: LandscapeType): number {
  return list.filter((l) => l === type).length;
}
