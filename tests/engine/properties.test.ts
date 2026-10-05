import { describe, expect, it } from 'vitest';
import { applyAction, getLegalActions, replayMatch, runMatch } from '../../src/engine';
import { AZURE_DUNE_DECK, CTX, GOLDEN_EMBER_DECK, startedGame, summon } from '../helpers';

describe('engine properties', () => {
  it('applyAction never mutates its input state', () => {
    const state = startedGame({ firstPlayer: 0 });
    summon(state, 0, 0, 'neutral_wanderer');
    const before = JSON.stringify(state);
    for (const a of getLegalActions(state, 0, CTX)) {
      applyAction(state, a, CTX);
      expect(JSON.stringify(state)).toBe(before);
    }
  });

  it('game state survives a JSON round trip unchanged', () => {
    const { state } = runMatch(
      { seed: 'json', decks: [GOLDEN_EMBER_DECK, AZURE_DUNE_DECK], maxActions: 60 * 1000 },
      CTX,
    );
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('matches are fully deterministic and replayable from seed + actions', () => {
    const decks: [typeof GOLDEN_EMBER_DECK, typeof AZURE_DUNE_DECK] = [GOLDEN_EMBER_DECK, AZURE_DUNE_DECK];
    const a = runMatch({ seed: 42, decks }, CTX);
    const b = runMatch({ seed: 42, decks }, CTX);
    expect(b.actions).toEqual(a.actions);
    expect(b.state).toEqual(a.state);
    expect(replayMatch(42, decks, a.actions, CTX)).toEqual(a.state);
  });

  it('rejects malformed actions safely', () => {
    const state = startedGame({ firstPlayer: 0 });
    expect(applyAction(state, null as never, CTX)).toMatchObject({
      ok: false,
      error: { code: 'UNKNOWN_ACTION' },
    });
    expect(applyAction(state, { type: 'dance', player: 0 } as never, CTX)).toMatchObject({
      ok: false,
      error: { code: 'UNKNOWN_ACTION' },
    });
    expect(applyAction(state, { type: 'endTurn', player: 2 } as never, CTX)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_PLAYER' },
    });
  });
});

describe('cloneState', () => {
  it('is a deep copy equal to structuredClone and shares no mutable objects', async () => {
    const { cloneState } = await import('../../src/engine');
    const { state } = runMatch(
      { seed: 'clone', decks: [GOLDEN_EMBER_DECK, AZURE_DUNE_DECK], maxActions: 200 },
      CTX,
    );
    const a = cloneState(state);
    expect(a).toEqual(structuredClone(state));
    a.players[0].hand.push({ iid: 'x', cardId: 'golden_sprout', owner: 0 });
    a.players[1].lanes[0]!.landscape = 'ember';
    for (const l of a.players[0].lanes) if (l.creature) l.creature.grantedKeywords.push('rush');
    expect(JSON.stringify(state)).not.toContain('"iid":"x"');
    expect(state.players[1].lanes[0]!.landscape).not.toBe('ember');
    for (const l of state.players[0].lanes)
      if (l.creature) expect(l.creature.grantedKeywords).not.toContain('rush');
  });
});
