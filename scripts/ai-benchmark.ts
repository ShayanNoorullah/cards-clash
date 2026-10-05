/**
 * AI strength benchmark: one difficulty against another over many matches.
 * Default "mirror" mode: both sides play the same random starter deck, so the
 * result measures skill, not deck strength (BENCH_MODE=swap plays random
 * pairings both ways instead). Seats alternate. Runs in parallel processes.
 *
 *   npm run sim:ai                        # 500 matches, hard vs easy
 *   npm run sim:ai -- 200 normal easy     # custom count / difficulties ("random" = random legal moves)
 *
 * Exits with code 1 if the first player wins less than 80% of decided games.
 */
import { spawn } from 'node:child_process';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { aiPolicy } from '../src/ai/policy';
import { getProfile, type Difficulty } from '../src/ai/profiles';
import { getContent } from '../src/engine/content';
import { Rng } from '../src/engine/rng';
import { randomPolicy, runMatch, type Policy } from '../src/engine/simulate';

interface Tally {
  winsA: number;
  winsB: number;
  draws: number;
  turns: number;
  games: number;
}

const TARGET = 0.8;
const [countArg, aArg, bArg, shardArg, shardsArg] = process.argv.slice(2);
const MATCHES = Number(countArg ?? 500);
const A = aArg ?? 'hard';
const B = bArg ?? 'easy';
/** mirror: both sides use the same random deck (measures pure skill). swap: random pairing played both ways. */
const MODE = process.env.BENCH_MODE === 'swap' ? 'swap' : 'mirror';

function runShard(shard: number, shards: number): Tally {
  const { ctx, starterDecks } = getContent();
  const policyFor = (d: string): Policy =>
    d === 'random' ? randomPolicy : aiPolicy(getProfile(d as Difficulty), ctx);
  const policyA = policyFor(A);
  const policyB = policyFor(B);
  const t: Tally = { winsA: 0, winsB: 0, draws: 0, turns: 0, games: 0 };
  for (let i = shard; i < MATCHES; i += shards) {
    const pairRng = new Rng(`bench:${A}:${B}:${Math.floor(i / 2)}`);
    const first = pairRng.pick(starterDecks);
    const pairing = [first, MODE === 'mirror' ? first : pairRng.pick(starterDecks)] as const;
    const [deckA, deckB] = i % 2 === 0 ? pairing : [pairing[1], pairing[0]];
    const aSeat = i % 4 < 2 ? 0 : 1;
    const decks: [typeof deckA, typeof deckB] = aSeat === 0 ? [deckA, deckB] : [deckB, deckA];
    const policies: [Policy, Policy] = aSeat === 0 ? [policyA, policyB] : [policyB, policyA];
    const { state } = runMatch({ seed: `bench-${i}`, decks, policies }, ctx);
    t.games++;
    t.turns += state.turn;
    if (state.winner === 'draw') t.draws++;
    else if (state.winner === aSeat) t.winsA++;
    else t.winsB++;
  }
  return t;
}

function report(t: Tally, seconds: number): number {
  const rate = t.winsA / Math.max(1, t.winsA + t.winsB);
  console.log(
    `${A} ${t.winsA} – ${t.winsB} ${B} (draws ${t.draws}) over ${t.games} games, ` +
      `avg ${(t.turns / Math.max(1, t.games)).toFixed(1)} turns, ${seconds.toFixed(0)}s`,
  );
  console.log(`Result: ${A} won ${(rate * 100).toFixed(1)}% of decided games (target ${TARGET * 100}%).`);
  return rate;
}

async function main(): Promise<void> {
  if (shardArg !== undefined) {
    // Child process: run one shard and print a machine-readable line.
    const t = runShard(Number(shardArg), Number(shardsArg));
    console.log(`RESULT ${JSON.stringify(t)}`);
    return;
  }
  const workers = Math.max(1, Math.min(MATCHES, Number(process.env.BENCH_WORKERS ?? cpus().length - 1)));
  const started = Date.now();
  const script = fileURLToPath(import.meta.url);
  console.log(`Running ${MATCHES} ${MODE} matches (${A} vs ${B}) on ${workers} processes...`);
  const results = await Promise.all(
    Array.from(
      { length: workers },
      (_, shard) =>
        new Promise<Tally>((resolve, reject) => {
          const child = spawn(
            process.execPath,
            [
              'node_modules/vite-node/vite-node.mjs',
              script,
              String(MATCHES),
              A,
              B,
              String(shard),
              String(workers),
            ],
            { stdio: ['ignore', 'pipe', 'inherit'] },
          );
          let out = '';
          child.stdout.on('data', (d: Buffer) => (out += d.toString()));
          child.on('exit', (code) => {
            const line = out.split('\n').find((l) => l.startsWith('RESULT '));
            if (code !== 0 || !line) reject(new Error(`shard ${shard} failed (code ${code})\n${out}`));
            else resolve(JSON.parse(line.slice(7)) as Tally);
          });
        }),
    ),
  );
  const total = results.reduce<Tally>(
    (s, t) => ({
      winsA: s.winsA + t.winsA,
      winsB: s.winsB + t.winsB,
      draws: s.draws + t.draws,
      turns: s.turns + t.turns,
      games: s.games + t.games,
    }),
    { winsA: 0, winsB: 0, draws: 0, turns: 0, games: 0 },
  );
  const rate = report(total, (Date.now() - started) / 1000);
  process.exit(rate >= TARGET ? 0 : 1);
}

void main();
