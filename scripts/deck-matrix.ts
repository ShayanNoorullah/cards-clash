/**
 * Starter-deck balance report: every pair of starter decks plays N games with
 * the same AI on both sides (seats alternate), in parallel processes.
 *
 *   npm run sim:decks                 # normal AI, 4 games per pairing
 *   npm run sim:decks -- 8 hard       # 8 games per pairing with the Hard AI
 */
import { spawn } from 'node:child_process';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { aiPolicy } from '../src/ai/policy';
import { getProfile, type Difficulty } from '../src/ai/profiles';
import { getContent } from '../src/engine/content';
import { runMatch } from '../src/engine/simulate';

const [perPairArg, diffArg, shardArg, shardsArg] = process.argv.slice(2);
const PER_PAIR = Number(perPairArg ?? 4);
const DIFF = (diffArg ?? 'normal') as Difficulty;

type Wins = Record<string, { wins: number; games: number }>;

function jobs(n: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) for (let g = 0; g < PER_PAIR; g++) out.push([a, b, g]);
  return out;
}

function runShard(shard: number, shards: number): Wins {
  const { ctx, starterDecks } = getContent();
  const policy = aiPolicy(getProfile(DIFF), ctx);
  const wins: Wins = {};
  const all = jobs(starterDecks.length);
  for (let i = shard; i < all.length; i += shards) {
    const [a, b, g] = all[i]!;
    const [first, second] = g % 2 === 0 ? [a, b] : [b, a];
    const { state } = runMatch(
      {
        seed: `matrix-${a}-${b}-${g}`,
        decks: [starterDecks[first]!, starterDecks[second]!],
        policies: [policy, policy],
      },
      ctx,
    );
    for (const [seat, deck] of [
      [0, first],
      [1, second],
    ] as const) {
      const id = starterDecks[deck]!.id;
      wins[id] ??= { wins: 0, games: 0 };
      wins[id].games++;
      if (state.winner === seat) wins[id].wins++;
      else if (state.winner === 'draw') wins[id].wins += 0.5;
    }
  }
  return wins;
}

async function main(): Promise<void> {
  if (shardArg !== undefined) {
    console.log(`RESULT ${JSON.stringify(runShard(Number(shardArg), Number(shardsArg)))}`);
    return;
  }
  const { starterDecks } = getContent();
  const total = jobs(starterDecks.length).length;
  const workers = Math.max(1, Math.min(total, cpus().length - 1));
  const script = fileURLToPath(import.meta.url);
  console.log(`Playing ${total} games (${PER_PAIR} per pairing, ${DIFF} AI) on ${workers} processes...`);
  const parts = await Promise.all(
    Array.from(
      { length: workers },
      (_, shard) =>
        new Promise<Wins>((resolve, reject) => {
          const child = spawn(
            process.execPath,
            [
              'node_modules/vite-node/vite-node.mjs',
              script,
              String(PER_PAIR),
              DIFF,
              String(shard),
              String(workers),
            ],
            { stdio: ['ignore', 'pipe', 'inherit'] },
          );
          let out = '';
          child.stdout.on('data', (d: Buffer) => (out += d.toString()));
          child.on('exit', (code) => {
            const line = out.split('\n').find((l) => l.startsWith('RESULT '));
            if (code !== 0 || !line) reject(new Error(`shard ${shard} failed\n${out}`));
            else resolve(JSON.parse(line.slice(7)) as Wins);
          });
        }),
    ),
  );
  const merged: Wins = {};
  for (const p of parts) {
    for (const [id, w] of Object.entries(p)) {
      merged[id] ??= { wins: 0, games: 0 };
      merged[id].wins += w.wins;
      merged[id].games += w.games;
    }
  }
  const rows = Object.entries(merged)
    .map(([id, w]) => ({ id, rate: w.wins / w.games, games: w.games }))
    .sort((x, y) => y.rate - x.rate);
  for (const r of rows) console.log(`${(r.rate * 100).toFixed(1).padStart(5)}%  ${r.id} (${r.games} games)`);
}

void main();
