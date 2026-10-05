import { MP_EFFECT_CAP } from '../../src/engine/mutations';
import { describe, expect, it } from 'vitest';
import {
  Rng,
  collectibleCards,
  countOwnedCards,
  creatureDef,
  getContent,
  runMatch,
  type GameState,
  type RulesContext,
} from '../../src/engine';

const MATCHES = 1000;
const { ctx, starterDecks } = getContent();

function checkInvariants(state: GameState, c: RulesContext): void {
  const iids = new Set<string>();
  for (const p of state.players) {
    if (countOwnedCards(state, p.id) !== c.balance.deckSize)
      throw new Error(`card count broken for P${p.id}`);
    if (p.hp < 0 || p.hp > p.maxHp) throw new Error(`hp out of range: ${p.hp}`);
    if (p.mp < 0 || p.mp > MP_EFFECT_CAP) throw new Error(`mp out of range: ${p.mp}`);
    if (p.ultimateCharge < 0 || p.ultimateCharge > c.balance.ultimateChargeMax)
      throw new Error('charge out of range');
    if (p.lanes.length !== c.balance.laneCount) throw new Error('lane count changed');
    const zones = [...p.deck, ...p.hand, ...p.discard];
    for (const card of zones) {
      if (c.cards.byId.get(card.cardId)?.token) throw new Error(`token ${card.cardId} outside the board`);
    }
    p.lanes.forEach((l, lane) => {
      if (l.creature) {
        zones.push(l.creature);
        if (creatureDef(state, c, l.creature, lane) <= 0) throw new Error('dead creature on board');
        if (l.creature.owner !== p.id) throw new Error('creature on wrong side');
        if (l.creature.poison < 0) throw new Error('negative poison');
      }
      if (l.building) zones.push(l.building);
      if (!l.flipped && l.flipTimer !== null) throw new Error('flip timer on an unflipped landscape');
    });
    for (const card of zones) {
      if (iids.has(card.iid)) throw new Error(`duplicate iid ${card.iid}`);
      iids.add(card.iid);
    }
  }
  if ((state.phase === 'ended') !== (state.winner !== null)) throw new Error('winner/phase mismatch');
}

describe(`starter-deck simulation (${MATCHES} random-vs-random matches)`, () => {
  it('every match finishes, no crashes, all invariants hold, every deck card gets played', () => {
    const rng = new Rng('starter-sim');
    const results = { p0: 0, p1: 0, draw: 0 };
    const reasons: Record<string, number> = {};
    const played = new Set<string>();
    let ultimates = 0;
    let limitHits = 0;
    let totalTurns = 0;

    for (let i = 0; i < MATCHES; i++) {
      const decks: [(typeof starterDecks)[number], (typeof starterDecks)[number]] = [
        rng.pick(starterDecks),
        rng.pick(starterDecks),
      ];
      const { state } = runMatch(
        {
          seed: `starter-${i}`,
          decks,
          onStep: (s, action, events) => {
            checkInvariants(s, ctx);
            // The hand limit applies at the end of your own turn (effects may add cards during the opponent's turn).
            if (
              action.type === 'endTurn' &&
              s.phase !== 'ended' &&
              s.players[action.player].hand.length > ctx.balance.maxHandSize
            ) {
              throw new Error('hand limit not enforced');
            }
            if (action.type === 'useUltimate') ultimates++;
            for (const e of events) {
              if (e.type === 'cardPlayed') played.add(e.cardId);
              if (e.type === 'effectLimitReached') limitHits++;
            }
          },
        },
        ctx,
      );
      expect(state.phase).toBe('ended');
      if (state.winner === 'draw') results.draw++;
      else if (state.winner === 0) results.p0++;
      else results.p1++;
      reasons[state.endReason!] = (reasons[state.endReason!] ?? 0) + 1;
      totalTurns += state.turn;
    }

    const inDecks = new Set(starterDecks.flatMap((d) => d.cards));
    expect([...inDecks].filter((id) => !played.has(id))).toEqual([]);
    expect(reasons.heroDefeated ?? 0).toBeGreaterThan(MATCHES * 0.5);
    expect(ultimates).toBeGreaterThan(0);
    expect(limitHits).toBe(0);
    console.info(
      `[sim] ${MATCHES} starter-deck matches: P0 ${results.p0}, P1 ${results.p1}, draws ${results.draw}; ` +
        `avg ${(totalTurns / MATCHES).toFixed(1)} turns; ultimates ${ultimates}; ` +
        `cards played ${played.size}/${collectibleCards(ctx.cards).length}; reasons ${JSON.stringify(reasons)}`,
    );
  }, 600_000);
});
