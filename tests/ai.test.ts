import { describe, expect, it } from 'vitest';
import { decide } from '../src/ai/AiPlayer';
import { evaluate, WIN_SCORE } from '../src/ai/evaluate';
import { aiPolicy } from '../src/ai/policy';
import { DIFFICULTIES, getProfile } from '../src/ai/profiles';
import { chooseArrangement, chooseMulligan } from '../src/ai/setup';
import {
  applyAction,
  createGame,
  getContent,
  Rng,
  runMatch,
  type Action,
  type GameState,
} from '../src/engine';
import { RCTX, realGame } from './contentHelpers';
import { give, setMp, summon } from './helpers';

const hard = getProfile('hard');

/** Lets the AI play its whole turn (up to End Turn). */
function playTurn(state: GameState, profile = hard): { state: GameState; actions: Action[] } {
  const me = state.activePlayer;
  const actions: Action[] = [];
  let s = state;
  for (let i = 0; i < 30 && s.phase === 'main' && s.activePlayer === me; i++) {
    const { action } = decide(s, me, RCTX, profile, { timeBudgetMs: Infinity });
    actions.push(action);
    const r = applyAction(s, action, RCTX);
    if (!r.ok) throw new Error(`AI chose an illegal action: ${r.error.message}`);
    s = r.state;
  }
  return { state: s, actions };
}

describe('AI profiles', () => {
  it('define all four difficulties with increasing search effort', () => {
    const ps = DIFFICULTIES.map((d) => getProfile(d));
    expect(ps.map((p) => p.id)).toEqual(['easy', 'normal', 'hard', 'nightmare']);
    for (let i = 1; i < ps.length; i++) {
      expect(ps[i]!.maxEvaluations).toBeGreaterThanOrEqual(ps[i - 1]!.maxEvaluations);
      expect(ps[i]!.mistakeRate).toBeLessThanOrEqual(ps[i - 1]!.mistakeRate);
    }
  });

  it('boss hooks scale weights', () => {
    const base = getProfile('normal');
    const aggressive = getProfile('normal', { weightScale: { pressure: 2 } });
    expect(aggressive.weights.pressure).toBeCloseTo(base.weights.pressure * 2);
  });
});

describe('evaluation', () => {
  it('scores wins and losses as extremes', () => {
    const s = realGame({ firstPlayer: 0 });
    s.phase = 'ended';
    s.winner = 0;
    expect(evaluate(s, RCTX, 0, hard.weights)).toBeGreaterThan(WIN_SCORE / 2);
    expect(evaluate(s, RCTX, 1, hard.weights)).toBeLessThan(-WIN_SCORE / 2);
  });

  it('prefers more HP, more board and unblocked pressure', () => {
    const base = realGame({ firstPlayer: 0 });
    const hurt = structuredClone(base);
    hurt.players[0].hp = 15;
    expect(evaluate(base, RCTX, 0, hard.weights)).toBeGreaterThan(evaluate(hurt, RCTX, 0, hard.weights));

    const board = structuredClone(base);
    summon(board, 0, 1, 'neutral_sellsword');
    expect(evaluate(board, RCTX, 0, hard.weights)).toBeGreaterThan(evaluate(base, RCTX, 0, hard.weights));

    const blocked = structuredClone(board);
    summon(blocked, 1, 1, 'neutral_stone_sentry');
    const unblocked = structuredClone(board);
    summon(unblocked, 1, 3, 'neutral_stone_sentry');
    expect(evaluate(unblocked, RCTX, 0, hard.weights)).toBeGreaterThan(
      evaluate(blocked, RCTX, 0, hard.weights),
    );
  });

  it('never looks at hidden information (opponent hand contents / deck order)', () => {
    const a = realGame({ firstPlayer: 0 });
    const b = structuredClone(a);
    b.players[1].hand = b.players[1].hand.map((c) => ({ ...c, cardId: 'neutral_titan' }));
    b.players[1].deck = [...b.players[1].deck].reverse();
    b.players[0].deck = [...b.players[0].deck].reverse();
    expect(evaluate(a, RCTX, 0, hard.weights)).toBe(evaluate(b, RCTX, 0, hard.weights));
  });
});

describe('decisions', () => {
  it('finds lethal with a spell', () => {
    const s = realGame({
      firstPlayer: 0,
      lanes: [
        ['dune', 'dune', 'golden', 'ember'],
        ['azure', 'candy', 'golden', 'murk'],
      ],
    });
    s.players[1].hp = 3;
    setMp(s, 0, 6);
    give(s, 0, 'neutral_wanderer');
    const blast = give(s, 0, 'dune_blast');
    const { action } = decide(s, 0, RCTX, hard, { timeBudgetMs: Infinity });
    expect(action).toEqual({ type: 'playCard', player: 0, iid: blast });
  });

  it('finds lethal through combat by ending the turn', () => {
    const s = realGame({ firstPlayer: 0 });
    s.players[1].hp = 4;
    summon(s, 0, 2, 'neutral_sellsword'); // 4 ATK, unblocked
    const { state } = playTurn(s);
    expect(state.winner).toBe(0);
  });

  it('defends against a lethal threat', () => {
    const s = realGame({
      firstPlayer: 0,
      lanes: [
        ['murk', 'murk', 'golden', 'ember'],
        ['azure', 'candy', 'golden', 'murk'],
      ],
    });
    s.players[0].hp = 6;
    summon(s, 1, 2, 'neutral_titan'); // 7 ATK facing an empty lane
    setMp(s, 0, 6);
    give(s, 0, 'murk_swallow');
    give(s, 0, 'neutral_stone_sentry');
    const { state } = playTurn(s);
    // After the AI's turn, the opponent's attack must not kill us.
    const back = applyAction(state, { type: 'endTurn', player: 1 }, RCTX);
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.state.players[0].hp).toBeGreaterThan(0);
  });

  it('is deterministic for the same state', () => {
    const s = realGame({ firstPlayer: 0 });
    setMp(s, 0, 4);
    for (const id of ['neutral_wanderer', 'ember_imp', 'golden_blessing']) give(s, 0, id);
    summon(s, 1, 1, 'murk_slime');
    const a = decide(s, 0, RCTX, getProfile('normal'), { timeBudgetMs: Infinity }).action;
    const b = decide(s, 0, RCTX, getProfile('normal'), { timeBudgetMs: Infinity }).action;
    expect(a).toEqual(b);
  });

  it('respects the time budget', () => {
    const s = realGame({ firstPlayer: 0 });
    setMp(s, 0, 6);
    for (const id of ['neutral_wanderer', 'ember_imp', 'golden_blessing', 'neutral_sellsword', 'ember_bolt'])
      give(s, 0, id);
    let t = 0;
    const clock = () => (t += 20); // every clock read costs 20 "ms"
    const d = decide(s, 0, RCTX, getProfile('nightmare'), { now: clock, timeBudgetMs: 200 });
    expect(d.reason).toBe('search');
    expect(d.evaluations).toBeLessThan(40);
    const legal = applyAction(s, d.action, RCTX);
    expect(legal.ok).toBe(true);
  });

  it('follows a boss opening script when legal', () => {
    const s = realGame({ firstPlayer: 0 });
    setMp(s, 0, 6);
    give(s, 0, 'neutral_wanderer');
    const scout = give(s, 0, 'neutral_scout');
    const profile = getProfile('hard', { openingSequence: ['neutral_scout'] });
    const d = decide(s, 0, RCTX, profile);
    expect(d.reason).toBe('script');
    expect(d.action).toMatchObject({ type: 'playCard', iid: scout });
  });
});

describe('setup decisions', () => {
  const { ctx, starterDecks } = getContent();

  it('groups identical landscapes together', () => {
    const deck = { ...starterDecks[6]!, landscapes: ['golden', 'ember', 'golden', 'ember'] as never };
    const { state } = createGame({ seed: 1, decks: [deck, starterDecks[0]!] }, ctx);
    const a = chooseArrangement(state, 0);
    expect(a.type === 'arrangeLandscapes' && a.order).toSatisfy(
      (order: string[]) => order[0] === order[1] && order[2] === order[3],
    );
  });

  it('mulligans uncastable and top-heavy hands', () => {
    const { state } = createGame({ seed: 2, decks: [starterDecks[0]!, starterDecks[1]!] }, ctx);
    state.players[0].hand = state.players[0].hand.map((c, i) => ({
      ...c,
      cardId: i === 0 ? 'madame_seota' : 'legion_of_earlings',
    }));
    const m = chooseMulligan(state, 0, ctx);
    expect(m.type === 'mulligan' && m.iids.length).toBe(state.players[0].hand.length);
  });
});

describe('strength (smoke test; full benchmark: npm run sim:ai)', () => {
  it('Hard beats Easy in mirror matches', () => {
    const { ctx, starterDecks } = getContent();
    const rng = new Rng('ai-smoke');
    const hardP = aiPolicy(getProfile('hard'), ctx);
    const easyP = aiPolicy(getProfile('easy'), ctx);
    let hardWins = 0;
    const games = 6;
    for (let i = 0; i < games; i++) {
      const deck = rng.pick(starterDecks);
      const hardSeat = i % 2;
      const { state } = runMatch(
        {
          seed: `smoke-${i}`,
          decks: [deck, deck],
          policies: hardSeat === 0 ? [hardP, easyP] : [easyP, hardP],
        },
        ctx,
      );
      if (state.winner === hardSeat) hardWins++;
    }
    expect(hardWins).toBeGreaterThanOrEqual(5);
  }, 120_000);
});
