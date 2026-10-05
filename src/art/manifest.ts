/**
 * Asset manifest: lets any procedural texture key be replaced by a real image
 * file later, without code changes. Pure (no Phaser).
 */
import rawManifest from '../data/asset-manifest.json';

export interface AssetManifest {
  version: number;
  images: Record<string, string>;
}

const KEY_PATTERN = /^(art|hero|card-back|tile|frame|icon|land|gem|badge)-[a-z0-9_-]+$/;
const PATH_PATTERN = /^[a-zA-Z0-9_./-]+\.(png|webp|jpg|jpeg)$/;

/** Returns every problem with a manifest (empty = valid). `knownKeys` limits keys to real textures. */
export function validateManifest(raw: unknown, knownKeys?: ReadonlySet<string>): string[] {
  if (typeof raw !== 'object' || raw === null) return ['manifest must be an object'];
  const m = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof m.version !== 'number') errors.push('version must be a number');
  if (typeof m.images !== 'object' || m.images === null || Array.isArray(m.images)) {
    return [...errors, 'images must be an object of { textureKey: path }'];
  }
  for (const [key, path] of Object.entries(m.images as Record<string, unknown>)) {
    if (!KEY_PATTERN.test(key)) errors.push(`"${key}" is not a valid texture key`);
    else if (knownKeys && !knownKeys.has(key))
      errors.push(`"${key}" does not match any card, hero or texture`);
    if (typeof path !== 'string' || !PATH_PATTERN.test(path) || path.includes('..')) {
      errors.push(
        `"${key}" has an invalid path (${JSON.stringify(path)}); use a relative .png/.webp/.jpg path`,
      );
    }
  }
  return errors;
}

export function loadManifest(): AssetManifest {
  const errors = validateManifest(rawManifest);
  if (errors.length > 0) throw new Error(`Invalid asset-manifest.json:\n- ${errors.join('\n- ')}`);
  return rawManifest as AssetManifest;
}

export const MANIFEST: AssetManifest = loadManifest();
