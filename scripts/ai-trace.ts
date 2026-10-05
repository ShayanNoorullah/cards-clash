/**
 * Prints an AI's decisions (with the top candidate scores) for one match, to
 * understand and tune its behaviour:  npx vite-node scripts/ai-trace.ts hard random 3
 */
import { decide } from '../src/ai/AiPlayer';
import { getProfile, type Difficulty } from '../src/ai/profiles';
import { searchTurn } from '../src/ai/search';
import { applyAction } from '../src/engine/apply';
import { getContent } from '../src/engine/content';
import { getLegalActions, playersToAct } from '../src/engine/legal';
import { Rng } from '../src/engine/rng';
import { createGame } from '../src/engine/state';
import type { Action } from '../src/engine/actions';

const [aArg, bArg, seedArg, deckA, deckB] = process.argv.slice(2);
const { ctx, starterDecks } = getContent();
const profileA = getProfile((aArg ?? 'hard') as Difficulty);
const rng = new Rng('trace');
const decks: [(typeof starterDecks)[number], (typeof starterDecks)[number]] = [
  starterDecks[Number(deckA ?? 0)]!,
  starterDecks[Number(deckB ?? 5)]!,
];
let state = createGame({ seed: `trace-${seedArg ?? 1}`, decks }, ctx).state;

function label(a: Action): string {
  if (a.type === 'playCard') {
    const card = state.players[a.player].hand.find((c) => c.iid === a.iid)?.cardId;
    return `play ${card}${a.lane !== undefined ? ` @${a.lane}` : ''}${a.target ? ` → ${JSON.stringify(a.target)}` : ''}`;
  }
  return JSON.stringify(a);
}

for (let step = 0; step < 400 && state.phase !== 'ended'; step++) {
  const p = playersToAct(state)[0]!;
  let action: Action;
  if (p === 0) {
    if (state.phase === 'main') {
      const { ranked } = searchTurn(state, 0, ctx, profileA, {
        maxEvaluations: profileA.maxEvaluations,
        deadline: Infinity,
        now: () => 0,
      });
      const top = ranked.slice(0, 3).map((r) => `${label(r.action)} = ${r.score.toFixed(1)}`);
      action = decide(state, 0, ctx, profileA, { timeBudgetMs: Infinity }).action;
      console.log(
        `T${state.turn} P0 mp${state.players[0].mp} hp${state.players[0].hp}/${state.players[1].hp} → ${label(action)}   [${top.join(' | ')}]`,
      );
    } else action = decide(state, 0, ctx, profileA).action;
  } else {
    const legal = getLegalActions(state, p, ctx);
    action =
      bArg === 'random' ? rng.pick(legal) : decide(state, p, ctx, getProfile(bArg as Difficulty)).action;
  }
  const r = applyAction(state, action, ctx);
  if (!r.ok) throw new Error(r.error.message);
  state = r.state;
}
console.log(`Winner: ${String(state.winner)} (${state.endReason}) turn ${state.turn}`);
