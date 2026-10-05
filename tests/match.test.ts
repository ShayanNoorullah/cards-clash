import { describe, expect, it } from 'vitest';
import { getContent, type Action } from '../src/engine';
import { describeEvent } from '../src/match/battleLog';
import {
  actionsForDrop,
  canBuyDraw,
  canEndTurn,
  creatureOptions,
  handOptions,
  pickTarget,
  targetKey,
  targetsOf,
  ultimateOptions,
} from '../src/match/interaction';
import { MatchController, type Seat } from '../src/match/MatchController';
import { DEFAULT_SETTINGS, durationScale, sanitizeSettings } from '../src/services/settings';

const { ctx, starterDecks } = getContent();
const seats = (): [Seat, Seat] => [
  { name: 'Ada', human: true, deck: starterDecks[0]! },
  { name: 'Bo', human: true, deck: starterDecks[5]! },
];

/** Drives a controller through landscape arrangement and mulligans. */
function toMainPhase(c: MatchController): void {
  for (let i = 0; i < 4 && c.state.phase !== 'main'; i++) {
    const p = c.decisionPlayer()!;
    const action: Action =
      c.state.phase === 'arrange'
        ? { type: 'arrangeLandscapes', player: p, order: [...c.state.players[p].landscapePool] }
        : { type: 'mulligan', player: p, iids: [] };
    expect(c.submit(action).ok).toBe(true);
  }
}

describe('MatchController', () => {
  it('walks both players through setup, then hands turns to the active player', () => {
    const c = new MatchController({ seed: 'ctrl', seats: seats(), ctx });
    expect(c.hotSeat).toBe(true);
    expect(c.state.phase).toBe('arrange');
    expect(c.decisionPlayer()).toBe(0);
    c.submit({ type: 'arrangeLandscapes', player: 0, order: [...c.state.players[0].landscapePool] });
    expect(c.decisionPlayer()).toBe(1);
    toMainPhase(c);
    expect(c.state.phase).toBe('main');
    expect(c.decisionPlayer()).toBe(c.state.firstPlayer);
    const before = c.state.activePlayer;
    expect(c.submit({ type: 'endTurn', player: before }).ok).toBe(true);
    expect(c.decisionPlayer()).toBe(before === 0 ? 1 : 0);
  });

  it('rejects illegal actions without changing state, and records history and a log', () => {
    const c = new MatchController({ seed: 'ctrl2', seats: seats(), ctx });
    toMainPhase(c);
    const snapshot = JSON.stringify(c.state);
    const wrong = c.state.activePlayer === 0 ? 1 : 0;
    const r = c.submit({ type: 'endTurn', player: wrong });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(c.state)).toBe(snapshot);
    expect(c.history).toHaveLength(4);
    expect(c.log.some((l) => l.includes('wins the coin flip'))).toBe(true);
    expect(c.log.some((l) => l.startsWith('— Turn 1:'))).toBe(true);
  });

  it('ends on surrender and supports a rematch with a new seed', () => {
    const c = new MatchController({ seed: 'ctrl3', seats: seats(), ctx });
    toMainPhase(c);
    c.submit({ type: 'surrender', player: 1 });
    expect(c.isOver).toBe(true);
    expect(c.decisionPlayer()).toBeNull();
    expect(c.log.at(-1)).toBe('Bo surrenders. Ada wins!');
    const next = c.rematch();
    expect(next.state.phase).toBe('arrange');
    expect(String(next.seed)).toBe('ctrl3:rematch');
  });

  it('plays a full hot-seat match to the end by always taking the first legal non-end action', () => {
    const c = new MatchController({ seed: 'full', seats: seats(), ctx });
    toMainPhase(c);
    let guard = 0;
    while (!c.isOver && guard++ < 3000) {
      const p = c.decisionPlayer()!;
      const legal = c.legalActions(p);
      const play = legal.find((a) => a.type === 'playCard' || a.type === 'useUltimate' || a.type === 'floop');
      expect(c.submit(play ?? { type: 'endTurn', player: p }).ok).toBe(true);
    }
    expect(c.isOver).toBe(true);
  });
});

describe('interaction mapping', () => {
  function mainPhaseController() {
    const c = new MatchController({ seed: 'ui', seats: seats(), ctx });
    toMainPhase(c);
    return c;
  }

  it('groups play actions per hand card with lanes and targets', () => {
    const c = mainPhaseController();
    const p = c.state.activePlayer;
    const hand = c.state.players[p].hand;
    const isSpell = (iid: string) =>
      ctx.cards.byId.get(hand.find((h) => h.iid === iid)!.cardId)!.type === 'spell';
    const opts = handOptions(c.legalActions(p), isSpell);
    expect(opts.size).toBeGreaterThan(0);
    for (const o of opts.values()) {
      expect(o.actions.length).toBeGreaterThan(0);
      if (!o.isSpell) expect(o.lanes.length).toBeGreaterThan(0);
      for (const a of o.actions) expect(a.iid).toBe(o.iid);
    }
  });

  it('maps drops to actions', () => {
    const creatureOpts = {
      iid: 'c1',
      isSpell: false,
      lanes: [0, 2],
      targets: [],
      actions: [
        { type: 'playCard' as const, player: 0 as const, iid: 'c1', lane: 0 },
        { type: 'playCard' as const, player: 0 as const, iid: 'c1', lane: 2 },
      ],
    };
    expect(actionsForDrop(creatureOpts, { kind: 'lane', lane: 2 })).toEqual([creatureOpts.actions[1]]);
    expect(actionsForDrop(creatureOpts, { kind: 'lane', lane: 1 })).toEqual([]);
    expect(actionsForDrop(creatureOpts, { kind: 'board' })).toEqual([]);

    const t1 = { kind: 'creature' as const, player: 1 as const, lane: 0 };
    const t2 = { kind: 'creature' as const, player: 1 as const, lane: 3 };
    const spellOpts = {
      iid: 's1',
      isSpell: true,
      lanes: [],
      targets: [t1, t2],
      actions: [
        { type: 'playCard' as const, player: 0 as const, iid: 's1', target: t1 },
        { type: 'playCard' as const, player: 0 as const, iid: 's1', target: t2 },
      ],
    };
    expect(actionsForDrop(spellOpts, { kind: 'board' })).toHaveLength(2);
    expect(actionsForDrop(spellOpts, { kind: 'lane', lane: 0 })).toEqual([]);
    expect(actionsForDrop(spellOpts, { kind: 'target', target: t2 })).toEqual([spellOpts.actions[1]]);
    expect(pickTarget(spellOpts.actions, t1)).toBe(spellOpts.actions[0]);
    expect(pickTarget(spellOpts.actions, { kind: 'hero', player: 1 })).toBeNull();
    expect(targetsOf(spellOpts.actions).map(targetKey)).toEqual(['creature:1:0', 'creature:1:3']);
  });

  it('exposes floop, move, draw, ultimate and end-turn availability', () => {
    const legal: Action[] = [
      { type: 'floop', player: 0, lane: 1 },
      { type: 'moveCreature', player: 0, from: 1, to: 2 },
      { type: 'moveCreature', player: 0, from: 3, to: 2 },
      { type: 'buyDraw', player: 0 },
      { type: 'useUltimate', player: 0 },
      { type: 'endTurn', player: 0 },
    ];
    expect(creatureOptions(legal, 1)).toEqual({ floops: [legal[0]], moves: [legal[1]] });
    expect(canBuyDraw(legal)).toBe(true);
    expect(ultimateOptions(legal)).toHaveLength(1);
    expect(canEndTurn(legal, 0)).toBe(true);
    expect(canEndTurn(legal, 1)).toBe(false);
  });
});

describe('battle log', () => {
  it('describes key events in plain English', () => {
    const c = new MatchController({ seed: 'log', seats: seats(), ctx });
    const names = { players: ['Ada', 'Bo'] as [string, string] };
    const s = c.state;
    expect(describeEvent({ type: 'fatigue', player: 1, damage: 2 }, s, ctx, names)).toBe(
      'Bo has no cards left and takes 2 fatigue damage.',
    );
    expect(
      describeEvent(
        { type: 'damage', target: { kind: 'hero', player: 0 }, amount: 3, sourcePlayer: 1 },
        s,
        ctx,
        names,
      ),
    ).toBe("Ada's Hero takes 3 damage.");
    expect(
      describeEvent(
        { type: 'creatureDestroyed', player: 0, iid: 'x', cardId: 'cornball', lane: 0 },
        s,
        ctx,
        names,
      ),
    ).toBe('Cornball is destroyed.');
    expect(describeEvent({ type: 'gameEnded', winner: 'draw', reason: 'turnLimit' }, s, ctx, names)).toMatch(
      /draw/,
    );
    expect(describeEvent({ type: 'mpChanged', player: 0, mp: 3, delta: 1 }, s, ctx, names)).toBeNull();
  });
});

describe('settings', () => {
  it('sanitizes stored values', () => {
    expect(sanitizeSettings({})).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ animationSpeed: 3 as never, sfxVolume: 4, textScale: 1.2 })).toMatchObject({
      animationSpeed: 1,
      sfxVolume: DEFAULT_SETTINGS.sfxVolume,
      textScale: 1.2,
    });
    expect(sanitizeSettings({ animationSpeed: 'instant', reducedMotion: true })).toMatchObject({
      animationSpeed: 'instant',
      reducedMotion: true,
    });
  });

  it('maps animation speed to a duration multiplier', () => {
    expect(durationScale({ ...DEFAULT_SETTINGS, animationSpeed: 1 })).toBe(1);
    expect(durationScale({ ...DEFAULT_SETTINGS, animationSpeed: 2 })).toBe(0.5);
    expect(durationScale({ ...DEFAULT_SETTINGS, animationSpeed: 'instant' })).toBe(0);
  });
});
