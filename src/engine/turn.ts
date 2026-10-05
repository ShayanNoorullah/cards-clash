/**
 * Turn structure: Start → Draw → Main (player actions) → Combat → End.
 * Start/Draw run when a turn begins; Combat/End run when the player ends it.
 */
import { drainQueue } from './effects';
import {
  afterCreatureDamage,
  changeMp,
  checkDeaths,
  creatureAt,
  damageCreature,
  dealDamage,
  discardFromHand,
  drawCards,
  endGame,
  healTarget,
  isOver,
  MP_EFFECT_CAP,
  chargeUltimate,
  createExec,
  queueCardTrigger,
  queuePlayerTrigger,
  restoreLandscape,
  sourceFor,
  type Exec,
} from './mutations';
import { getHero } from './cards';
import { mpForTurn } from './state';
import { creatureArmor, creatureAtk, creatureDef, keywordValue } from './statics';
import type { StrikeRoll } from './actions';
import type { CreatureInPlay, GameState, PlayerId, RulesContext, TargetRef } from './types';
import { other } from './types';

export function canAttack(x: Exec, c: CreatureInPlay, lane: number): boolean {
  if (c.exhausted || c.frozen) return false;
  if ((c.attackLock ?? 0) >= x.s.turn) return false;
  if (c.summoningSick && keywordValue(x.s, x.ctx, c, lane, 'rush') === 0) return false;
  return creatureAtk(x.s, x.ctx, c, lane) > 0;
}

export function startTurn(x: Exec, player: PlayerId): void {
  if (isOver(x)) return;
  const s = x.s;
  s.turn++;
  if (s.turn > x.ctx.balance.maxTurns) {
    endGame(x, 'draw', 'turnLimit');
    return;
  }
  s.activePlayer = player;
  const p = s.players[player];
  p.turnsTaken++;

  // Start phase: refresh MP (minus penalties), ready creatures.
  x.events.push({ type: 'phase', player, phase: 'start' });
  const mp = Math.max(0, mpForTurn(p.turnsTaken, x.ctx) - p.mpPenalty);
  p.mpPenalty = 0;
  changeMp(x, player, mp - p.mp, MP_EFFECT_CAP);
  p.extraDrawsThisTurn = 0;
  p.floopsThisTurn = 0;
  // Drop cost changes and play blocks from past turns.
  if (p.costMods?.length) p.costMods = p.costMods.filter((m) => m.turn >= s.turn);
  if (p.blocks?.length) p.blocks = p.blocks.filter((b) => b.turn >= s.turn);
  for (const lane of p.lanes) {
    if (!lane.creature) continue;
    const c = lane.creature;
    c.exhausted = false;
    c.summoningSick = false;
    c.movesThisTurn = 0;
    // "Until your next turn" bonuses end now.
    if (c.roundAtk || c.roundDef) {
      c.roundAtk = 0;
      c.roundDef = 0;
    }
  }
  x.events.push({ type: 'turnStarted', player, turn: s.turn, mp: p.mp });
  checkDeaths(x);

  // Hero Abilities with a cooldown charge once per turn.
  const cooldown = getHero(x.ctx.heroes, p.heroId).ultimate.cooldown;
  if (cooldown) chargeUltimate(x, player, Math.ceil(x.ctx.balance.ultimateChargeMax / cooldown));

  // Poison and Regenerate, left to right.
  for (let lane = 0; lane < p.lanes.length && !isOver(x); lane++) {
    const c = creatureAt(x, player, lane);
    if (!c) continue;
    if (c.poison > 0) {
      const amount = c.poison;
      damageCreature(x, player, lane, amount, { player: other(player) });
      const still = creatureAt(x, player, lane);
      if (still && still.iid === c.iid) still.poison = Math.max(0, still.poison - 1);
    }
    const alive = creatureAt(x, player, lane);
    if (alive && alive.iid === c.iid) {
      const regen = keywordValue(x.s, x.ctx, alive, lane, 'regenerate');
      if (regen > 0) healTarget(x, { kind: 'creature', player, lane }, regen);
    }
  }
  drainQueue(x);

  queuePlayerTrigger(x, player, 'startOfTurn');
  drainQueue(x);
  if (isOver(x)) return;

  // Draw phase.
  x.events.push({ type: 'phase', player, phase: 'draw' });
  const skipDraw = x.ctx.balance.firstPlayerSkipsFirstDraw && player === s.firstPlayer && p.turnsTaken === 1;
  if (!skipDraw) drawCards(x, player, 1);
  if (isOver(x)) return;

  x.events.push({ type: 'phase', player, phase: 'main' });
}

/** Picks what an attack from `lane` hits: opposing creature, an adjacent Guard, or the Hero. */
function attackTarget(x: Exec, player: PlayerId, lane: number, ranged: boolean): TargetRef {
  const opp = other(player);
  if (creatureAt(x, opp, lane)) return { kind: 'creature', player: opp, lane };
  if (!ranged) {
    for (const g of [lane - 1, lane + 1]) {
      const guard = creatureAt(x, opp, g);
      if (guard && keywordValue(x.s, x.ctx, guard, g, 'guard') > 0)
        return { kind: 'creature', player: opp, lane: g };
    }
  }
  return { kind: 'hero', player: opp };
}

/**
 * One creature attacks the opposing lane. `forced` attacks (from effects)
 * ignore exhaustion, summoning sickness and locks; they only need ATK > 0.
 * `roll` is the attack timing result: a miss deals nothing, a perfect hit doubles the damage.
 */
export function strike(
  x: Exec,
  player: PlayerId,
  lane: number,
  forced = false,
  roll: StrikeRoll = 'hit',
): void {
  const able = (c: CreatureInPlay) => (forced ? creatureAtk(x.s, x.ctx, c, lane) > 0 : canAttack(x, c, lane));
  const attacker = creatureAt(x, player, lane);
  if (!attacker || !able(attacker)) return;
  const iid = attacker.iid;
  attacker.stealth = false;

  queueCardTrigger(x, sourceFor(x, player, lane, 'creature'), 'onAttack');
  drainQueue(x);
  const a = creatureAt(x, player, lane);
  if (isOver(x) || !a || a.iid !== iid || !able(a)) return;

  const ranged = keywordValue(x.s, x.ctx, a, lane, 'ranged') > 0;
  const target = attackTarget(x, player, lane, ranged);
  x.events.push(
    roll === 'hit'
      ? { type: 'attack', player, lane, iid, target }
      : { type: 'attack', player, lane, iid, target, roll },
  );
  // A miss deals no damage and draws no retaliation.
  if (roll === 'miss') {
    drainQueue(x);
    return;
  }

  // Retaliation keywords are read before damage, so Thorns works even if the defender dies.
  let thorns = 0;
  let counter = false;
  let defenderIid: string | null = null;
  if (target.kind === 'creature') {
    const d = creatureAt(x, target.player, target.lane)!;
    defenderIid = d.iid;
    thorns = keywordValue(x.s, x.ctx, d, target.lane, 'thorns');
    counter = keywordValue(x.s, x.ctx, d, target.lane, 'counter') > 0;
  }

  let amount = creatureAtk(x.s, x.ctx, a, lane) * (roll === 'perfect' ? 2 : 1);
  if (target.kind === 'creature') {
    const d = creatureAt(x, target.player, target.lane)!;
    amount = Math.max(0, amount - creatureArmor(x.s, x.ctx, d, target.lane));
  }
  const dealt = dealDamage(x, target, amount, {
    player,
    attacker: { player, iid },
  });
  afterCreatureDamage(x, player, lane, target, dealt);

  // Feast: heal when this attack destroyed the defender.
  if (
    target.kind === 'creature' &&
    defenderIid &&
    creatureAt(x, target.player, target.lane)?.iid !== defenderIid
  ) {
    const me = creatureAt(x, player, lane);
    const feast = me && me.iid === iid ? keywordValue(x.s, x.ctx, me, lane, 'feast') : 0;
    if (feast > 0 && creatureDef(x.s, x.ctx, me!, lane) > 0)
      healTarget(x, { kind: 'creature', player, lane }, feast);
  }

  if (target.kind === 'creature' && !ranged && !isOver(x)) {
    const opp = target.player;
    if (thorns > 0 && creatureAt(x, player, lane)?.iid === iid) {
      damageCreature(x, player, lane, thorns, { player: opp });
    }
    const defender = creatureAt(x, opp, target.lane);
    if (counter && defender && defender.iid === defenderIid && creatureAt(x, player, lane)?.iid === iid) {
      const back = creatureAtk(x.s, x.ctx, defender, target.lane);
      const dealtBack = damageCreature(x, player, lane, back, {
        player: opp,
        attacker: { player: opp, iid: defender.iid },
      });
      afterCreatureDamage(x, opp, target.lane, { kind: 'creature', player, lane }, dealtBack);
    }
  }
  drainQueue(x);
}

/** Combat: each able creature, left lane to right, attacks the opposing lane. */
export function runCombat(x: Exec, player: PlayerId, strikes: readonly (StrikeRoll | null)[] = []): void {
  x.events.push({ type: 'phase', player, phase: 'combat' });
  const laneCount = x.s.players[player].lanes.length;
  for (let lane = 0; lane < laneCount && !isOver(x); lane++)
    strike(x, player, lane, false, strikes[lane] ?? 'hit');
}

/** Lanes whose creature will attack when `player` ends the turn now (before any combat effects). */
export function attackingLanes(state: GameState, ctx: RulesContext, player: PlayerId): number[] {
  const x = createExec(state, ctx);
  const out: number[] = [];
  state.players[player].lanes.forEach((l, lane) => {
    if (l.creature && canAttack(x, l.creature, lane)) out.push(lane);
  });
  return out;
}

/** End phase: End of Turn triggers, thaw, flip timers, temporary buffs, hand limit, MP loss. */
export function runEndPhase(x: Exec, player: PlayerId, preferredDiscards: readonly string[] = []): void {
  x.events.push({ type: 'phase', player, phase: 'end' });
  queuePlayerTrigger(x, player, 'endOfTurn');
  drainQueue(x);
  if (isOver(x)) return;

  const p = x.s.players[player];
  p.lanes.forEach((l, lane) => {
    if (l.creature?.frozen) {
      l.creature.frozen = false;
      x.events.push({ type: 'thawed', player, lane, iid: l.creature.iid });
    }
    if (l.flipped && l.flipTimer !== null) {
      l.flipTimer--;
      if (l.flipTimer <= 0) restoreLandscape(x, player, lane);
    }
  });

  // Temporary buffs expire for everyone.
  for (const pl of x.s.players) {
    for (const l of pl.lanes) {
      if (l.creature) {
        l.creature.tempAtk = 0;
        l.creature.tempDef = 0;
      }
    }
  }
  checkDeaths(x);
  drainQueue(x);
  if (isOver(x)) return;

  const limit = x.ctx.balance.maxHandSize;
  for (const iid of preferredDiscards) {
    if (p.hand.length <= limit) break;
    discardFromHand(x, player, iid);
  }
  while (p.hand.length > limit) discardFromHand(x, player, p.hand[p.hand.length - 1]!.iid);
  // Unspent MP is lost.
  changeMp(x, player, -p.mp);
}

export function endTurn(
  x: Exec,
  player: PlayerId,
  preferredDiscards?: readonly string[],
  strikes?: readonly (StrikeRoll | null)[],
): void {
  runCombat(x, player, strikes);
  if (isOver(x)) return;
  runEndPhase(x, player, preferredDiscards);
  if (isOver(x)) return;
  x.events.push({ type: 'turnEnded', player });
  startTurn(x, other(player));
}
