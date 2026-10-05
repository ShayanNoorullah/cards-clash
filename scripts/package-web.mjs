/**
 * Zips dist/ into release/cards-clash-web-<version>.zip for itch.io (HTML game:
 * upload the zip and tick "This file will be played in the browser").
 * Run after `npm run build`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
if (!existsSync(join(dist, 'index.html'))) throw new Error('Run `npm run build` first.');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const outDir = join(root, 'release');
mkdirSync(outDir, { recursive: true });
const zip = join(outDir, `cards-clash-web-${version}.zip`);
rmSync(zip, { force: true });
// bsdtar (built into Windows 10+, macOS) writes a standard zip with "/" paths;
// PowerShell's Compress-Archive would use "\" paths, which itch.io mishandles.
if (process.platform === 'linux') execFileSync('zip', ['-qr', zip, '.'], { cwd: dist });
else {
  // On Windows use its own bsdtar (Git's GNU tar can't write zips).
  const tar =
    process.platform === 'win32'
      ? join(process.env.SystemRoot ?? 'C:/Windows', 'System32', 'tar.exe')
      : 'tar';
  execFileSync(tar, ['-a', '-c', '-f', zip, ...readdirSync(dist)], { cwd: dist });
}
console.log(`Wrote ${zip}`);
