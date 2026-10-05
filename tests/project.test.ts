import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import credits from '../src/data/credits.json';
import landscapes from '../src/data/landscapes.json';

const ROOT = join(__dirname, '..');

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

describe('project invariants', () => {
  it('the engine never imports Phaser, the DOM layer or client services', () => {
    const offenders: string[] = [];
    for (const file of listFiles(join(ROOT, 'src', 'engine')).filter((f) => f.endsWith('.ts'))) {
      const src = readFileSync(file, 'utf8');
      if (/from\s+['"]phaser['"]/.test(src) || /from\s+['"][./]*\/(scenes|ui|services|art)\//.test(src)) {
        offenders.push(file);
      }
      if (/Math\.random\s*\(/.test(src)) offenders.push(`${file} (Math.random)`);
    }
    expect(offenders).toEqual([]);
  });

  it('every in-game credit is listed in CREDITS.md with its license', () => {
    const md = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
    for (const entry of credits.entries) {
      expect(md, `CREDITS.md is missing "${entry.name}"`).toContain(entry.name);
      expect(md, `CREDITS.md is missing the URL for "${entry.name}"`).toContain(entry.url);
      expect(md, `CREDITS.md is missing the license for "${entry.name}"`).toContain(entry.license);
    }
  });

  it('credit entries are complete', () => {
    for (const e of credits.entries) {
      expect(e.name && e.author && e.license && e.url && e.kind).toBeTruthy();
      expect(e.url).toMatch(/^https:\/\//);
    }
  });

  it('defines six landscapes with unique ids, unique colorblind icons and valid colors', () => {
    const list = landscapes.landscapes;
    expect(list).toHaveLength(6);
    expect(new Set(list.map((l) => l.id)).size).toBe(6);
    expect(new Set(list.map((l) => l.icon)).size).toBe(6);
    for (const l of list) {
      for (const c of [l.color, l.dark, l.light]) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(list.map((l) => l.name)).toEqual([
      'Blue Plains',
      'Corn Fields',
      'Useless Swamp',
      'Sandy Lands',
      'Nice Lands',
      'Ember Rocks',
    ]);
  });
});
