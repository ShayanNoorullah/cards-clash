/**
 * Low-level state mutations used while resolving an action. They operate on a
 * private draft (a clone of the input state), never on the caller's state, and
 * record a GameEvent for everything that changes. Triggered abilities are only
 * queued here; effects.ts drains the queue.
 */
import { getCard, getHero, type SourceKind } from './cards';
import type { GameEvent } from './events';
import { Rng } from './rng';
import { creatureDef, creatureMaxDef, keywordValue } from './statics';
import type {
  CardInstance,
  Condition,
  CreatureInPlay,
  Effect,
  EndReason,
  GameState,
  LandscapeType,
  PlayerId,
  RulesContext,
  TargetRef,
  TriggerType,
  Winner,
} from './types';
import { other } from './types';

/** Who/what produced an effect. `lane` is a snapshot used if the source has left play. */
export interface EffectSource {
  player: PlayerId;
  kind: SourceKind;
  iid: string | null;
  cardId: string | null;
  lane: number | null;
}

export interface PendingAbility {
  source: EffectSource;
  trigger: TriggerType | 'spell' | 'floop' | 'ultimate';
  effects: readonly Effect[];
  condition?: Condition;
  chosen?: TargetRef;
  /** The card that caused the trigger (e.g. the destroyed creature). */
  subject?: { player: PlayerId; iid: string; cardId: string };
}

/** Mutable working context for one action resolution. */
export interface Exec {
  s: GameState;
  ctx: RulesContext;
  events: GameEvent[];
  rng: Rng;
  queue: PendingAbility[];
  resolutions: number;
  limitHit: boolean;
}

export function createExec(draft: GameState, ctx: RulesContext): Exec {
  return {
    s: draft,
    ctx,
    events: [],
    rng: Rng.fromState(draft.rng),
    queue: [],
    resolutions: 0,
    limitHit: false,
  };
}

export function isOver(x: Exec): boolean {
  return x.s.phase === 'ended';
}

/**
 * Counts one resolution step. Returns false (and emits an event once) when the
 * per-action cap is exceeded, which stops runaway effect loops.
 */
export function countResolution(x: Exec): boolean {
  if (x.limitHit) return false;
  x.resolutions++;
  if (x.resolutions > x.ctx.balance.maxEffectResolutionsPerAction) {
    x.limitHit = true;
    x.queue.length = 0;
    x.events.push({ type: 'effectLimitReached', limit: x.ctx.balance.maxEffectResolutionsPerAction });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function creatureAt(x: Exec, player: PlayerId, lane: number): CreatureInPlay | null {
  return x.s.players[player].lanes[lane]?.creature ?? null;
}

/** Finds the lane currently holding the card with `iid` (creature or building). */
export function findLaneOf(x: Exec, player: PlayerId, iid: string): number | null {
  const idx = x.s.players[player].lanes.findIndex((l) => l.creature?.iid === iid || l.building?.iid === iid);
  return idx < 0 ? null : idx;
}

/** The source's current lane, or its snapshot lane if it has left play. */
export function sourceLane(x: Exec, src: EffectSource): number | null {
  if (src.iid !== null) {
    const now = findLaneOf(x, src.player, src.iid);
    if (now !== null) return now;
  }
  return src.lane;
}

export function sourceFor(
  x: Exec,
  player: PlayerId,
  lane: number,
  which: 'creature' | 'building',
): EffectSource {
  const inst = x.s.players[player].lanes[lane]![which]!;
  return { player, kind: which, iid: inst.iid, cardId: inst.cardId, lane };
}

// ---------------------------------------------------------------------------
// Trigger queueing
// ---------------------------------------------------------------------------

/** Queues the matching abilities of one specific card instance. */
export function queueCardTrigger(
  x: Exec,
  source: EffectSource,
  trigger: TriggerType,
  chosen?: TargetRef,
  subject?: PendingAbility['subject'],
): void {
  if (!source.cardId) return;
  const card = getCard(x.ctx.cards, source.cardId);
  for (const a of card.abilities ?? []) {
    if (a.trigger !== trigger) continue;
    const pending: PendingAbility = { source, trigger, effects: a.effects };
    if (a.condition) pending.condition = a.condition;
    if (chosen) pending.chosen = chosen;
    if (subject) pending.subject = subject;
    x.queue.push(pending);
  }
}

/** Queues a trigger on the building in `lane` (if any). */
export function queueBuildingTrigger(
  x: Exec,
  player: PlayerId,
  lane: number,
  trigger: TriggerType,
  subject?: PendingAbility['subject'],
): void {
  if (!x.s.players[player].lanes[lane]?.building) return;
  queueCardTrigger(x, sourceFor(x, player, lane, 'building'), trigger, undefined, subject);
}

/**
 * Queues a player-wide trigger on their hero, then their creatures and
 * buildings from left to right. `excludeIid` skips the card that caused it.
 */
export function queuePlayerTrigger(
  x: Exec,
  player: PlayerId,
  trigger: TriggerType,
  excludeIid?: string,
): void {
  const p = x.s.players[player];
  const hero = getHero(x.ctx.heroes, p.heroId);
  const heroAbilities = [...(hero.passive.abilities ?? []), ...p.rules.flatMap((r) => r.abilities ?? [])];
  for (const a of heroAbilities) {
    if (a.trigger !== trigger) continue;
    const pending: PendingAbility = {
      source: { player, kind: 'hero', iid: null, cardId: null, lane: null },
      trigger,
      effects: a.effects,
    };
    if (a.condition) pending.condition = a.condition;
    x.queue.push(pending);
  }
  p.lanes.forEach((l, lane) => {
    if (l.creature && l.creature.iid !== excludeIid)
      queueCardTrigger(x, sourceFor(x, player, lane, 'creature'), trigger);
    if (l.building && l.building.iid !== excludeIid)
      queueCardTrigger(x, sourceFor(x, player, lane, 'building'), trigger);
  });
}

// ---------------------------------------------------------------------------
// Game end, MP, ultimate
// ---------------------------------------------------------------------------

export function endGame(x: Exec, winner: Winner, reason: EndReason): void {
  if (isOver(x)) return;
  x.s.phase = 'ended';
  x.s.winner = winner;
  x.s.endReason = reason;
  x.queue.length = 0;
  x.events.push({ type: 'gameEnded', winner, reason });
}

/** Ends the game if a hero is at 0 HP. Both at 0 = draw. */
export function checkHeroes(x: Exec): void {
  if (isOver(x)) return;
  const dead0 = x.s.players[0].hp <= 0;
  const dead1 = x.s.players[1].hp <= 0;
  if (dead0 && dead1) endGame(x, 'draw', 'heroDefeated');
  else if (dead0) endGame(x, 1, 'heroDefeated');
  else if (dead1) endGame(x, 0, 'heroDefeated');
}

export function chargeUltimate(x: Exec, player: PlayerId, percent: number): void {
  if (percent <= 0) return;
  const p = x.s.players[player];
  const next = Math.min(x.ctx.balance.ultimateChargeMax, p.ultimateCharge + percent);
  if (next !== p.ultimateCharge) {
    p.ultimateCharge = next;
    x.events.push({ type: 'ultimateCharge', player, charge: next });
  }
}

function chargeFromDamage(x: Exec, player: PlayerId, damage: number): void {
  // Heroes with a turn cooldown charge per turn instead (see startTurn).
  if (getHero(x.ctx.heroes, x.s.players[player].heroId).ultimate.cooldown) return;
  chargeUltimate(x, player, damage * x.ctx.balance.ultimateChargePerDamage);
}

/** Hard cap for MP gained from effects (above the normal per-turn maximum). */
export const MP_EFFECT_CAP = 20;

/** Changes MP, capped at `cap` (gains never lower MP that is already above the cap). */
export function changeMp(x: Exec, player: PlayerId, delta: number, cap = x.ctx.balance.maxMp): void {
  const p = x.s.players[player];
  const next = Math.max(0, delta < 0 ? p.mp + delta : Math.max(p.mp, Math.min(cap, p.mp + delta)));
  if (next === p.mp) return;
  const applied = next - p.mp;
  p.mp = next;
  x.events.push({ type: 'mpChanged', player, mp: next, delta: applied });
}

// ---------------------------------------------------------------------------
// Damage and healing
// ---------------------------------------------------------------------------

/** Damage from `player`. `attacker` is set for creature combat damage (lifesteal/poison). */
export interface DamageSource {
  player: PlayerId;
  attacker?: { player: PlayerId; iid: string };
  /** A creature destroyed by this damage goes to this player's hand. */
  stealer?: PlayerId;
}

export function damageHero(x: Exec, target: PlayerId, amount: number, src: DamageSource): number {
  if (amount <= 0 || isOver(x)) return 0;
  const p = x.s.players[target];
  p.hp = Math.max(0, p.hp - amount);
  x.events.push({
    type: 'damage',
    target: { kind: 'hero', player: target },
    amount,
    sourcePlayer: src.player,
  });
  chargeFromDamage(x, target, amount);
  if (src.player !== target) chargeFromDamage(x, src.player, amount);
  checkHeroes(x);
  return amount;
}

/**
 * Damages a creature. Shield absorbs the whole hit. Returns the damage actually
 * dealt. Destroys the creature at 0 DEF, otherwise queues its onDamaged.
 */
export function damageCreature(
  x: Exec,
  owner: PlayerId,
  lane: number,
  amount: number,
  src: DamageSource,
): number {
  if (amount <= 0 || isOver(x)) return 0;
  const c = creatureAt(x, owner, lane);
  if (!c) return 0;
  if ((c.redirectUntil ?? 0) >= x.s.turn) return damageHero(x, owner, amount, src);
  if (c.shield) {
    c.shield = false;
    x.events.push({ type: 'shieldBroken', player: owner, lane, iid: c.iid });
    return 0;
  }
  c.damage += amount;
  x.events.push({
    type: 'damage',
    target: { kind: 'creature', player: owner, lane },
    amount,
    sourcePlayer: src.player,
  });
  chargeFromDamage(x, owner, amount);
  if (src.player !== owner) chargeFromDamage(x, src.player, amount);
  if (creatureDef(x.s, x.ctx, c, lane) <= 0) destroyCreature(x, owner, lane, src.stealer);
  else queueCardTrigger(x, sourceFor(x, owner, lane, 'creature'), 'onDamaged');
  checkDeaths(x);
  return amount;
}

export function dealDamage(x: Exec, target: TargetRef, amount: number, src: DamageSource): number {
  if (target.kind === 'hero') return damageHero(x, target.player, amount, src);
  if (target.kind === 'creature') return damageCreature(x, target.player, target.lane, amount, src);
  return 0;
}

export function healTarget(x: Exec, target: TargetRef, amount: number): void {
  if (amount <= 0 || isOver(x)) return;
  if (target.kind === 'hero') {
    const p = x.s.players[target.player];
    const healed = Math.min(amount, p.maxHp - p.hp);
    if (healed <= 0) return;
    p.hp += healed;
    x.events.push({ type: 'heal', target, amount: healed });
    return;
  }
  if (target.kind !== 'creature') return;
  const c = creatureAt(x, target.player, target.lane);
  if (!c) return;
  const healed = Math.min(amount, c.damage);
  if (healed <= 0) return;
  c.damage -= healed;
  x.events.push({ type: 'heal', target, amount: healed });
}

// ---------------------------------------------------------------------------
// Creature changes
// ---------------------------------------------------------------------------

function emitStats(x: Exec, owner: PlayerId, lane: number, c: CreatureInPlay): void {
  const card = getCard(x.ctx.cards, c.cardId);
  if (card.type !== 'creature') return;
  x.events.push({
    type: 'statsChanged',
    player: owner,
    lane,
    iid: c.iid,
    atk: Math.max(0, card.atk + c.atkMod + c.tempAtk),
    def: creatureMaxDef(x.s, x.ctx, c, lane),
  });
}

export function buffCreature(
  x: Exec,
  owner: PlayerId,
  lane: number,
  atk: number,
  def: number,
  duration: 'permanent' | 'turn' | 'round' | boolean,
): void {
  if (isOver(x) || (atk === 0 && def === 0)) return;
  const c = creatureAt(x, owner, lane);
  if (!c) return;
  if (duration === true || duration === 'turn') {
    c.tempAtk += atk;
    c.tempDef += def;
  } else if (duration === 'round') {
    c.roundAtk = (c.roundAtk ?? 0) + atk;
    c.roundDef = (c.roundDef ?? 0) + def;
  } else {
    c.atkMod += atk;
    c.defMod += def;
  }
  emitStats(x, owner, lane, c);
  checkDeaths(x);
}

/** State-based check: every creature at 0 DEF or less is destroyed, P0 first, left to right. */
export function checkDeaths(x: Exec): void {
  for (const p of x.s.players) {
    for (let lane = 0; lane < p.lanes.length; lane++) {
      const c = p.lanes[lane]!.creature;
      if (c && creatureDef(x.s, x.ctx, c, lane) <= 0) destroyCreature(x, p.id, lane);
    }
  }
}

/** Removes a creature from its lane without destroying it (replace, return, token vanish). */
function removeCreature(x: Exec, owner: PlayerId, lane: number): CreatureInPlay | null {
  const l = x.s.players[owner].lanes[lane];
  const c = l?.creature ?? null;
  if (l) l.creature = null;
  return c;
}

function toZoneCard(c: CreatureInPlay): CardInstance {
  return { iid: c.iid, cardId: c.cardId, owner: c.owner };
}

/**
 * Destroys a creature. With `stealer`, the card goes to that player's hand
 * (and becomes theirs) instead of its owner's discard pile.
 */
export function destroyCreature(x: Exec, owner: PlayerId, lane: number, stealer?: PlayerId): void {
  const c = removeCreature(x, owner, lane);
  if (!c) return;
  x.events.push({ type: 'creatureDestroyed', player: owner, iid: c.iid, cardId: c.cardId, lane });
  if (!c.token) {
    if (stealer !== undefined && stealer !== owner) {
      x.s.players[stealer].hand.push({ iid: c.iid, cardId: c.cardId, owner: stealer });
      x.events.push({
        type: 'cardRecovered',
        player: stealer,
        iid: c.iid,
        cardId: c.cardId,
        from: 'discard',
        stolen: true,
      });
    } else x.s.players[owner].discard.push(toZoneCard(c));
  }
  const snapshot: EffectSource = { player: owner, kind: 'creature', iid: c.iid, cardId: c.cardId, lane };
  queueCardTrigger(x, snapshot, 'onDestroy');
  queueBuildingTrigger(x, owner, lane, 'onLaneCreatureDestroyed', {
    player: owner,
    iid: c.iid,
    cardId: c.cardId,
  });
  queuePlayerTrigger(x, owner, 'onAllyCreatureDestroyed', c.iid);
  queuePlayerTrigger(x, other(owner), 'onEnemyCreatureDestroyed');
  // Losing an aura source can drop other creatures to 0 DEF.
  checkDeaths(x);
}

/** Replacement: the old creature goes to the discard pile without "destroy" triggers. */
export function replaceCreature(x: Exec, owner: PlayerId, lane: number): void {
  const c = removeCreature(x, owner, lane);
  if (!c) return;
  if (!c.token) x.s.players[owner].discard.push(toZoneCard(c));
  x.events.push({ type: 'cardReplaced', player: owner, iid: c.iid, cardId: c.cardId, lane });
  checkDeaths(x);
}

export function returnCreatureToHand(x: Exec, owner: PlayerId, lane: number): void {
  const c = removeCreature(x, owner, lane);
  if (!c) return;
  if (c.token) {
    x.events.push({ type: 'tokenVanished', player: owner, iid: c.iid, lane });
  } else {
    x.s.players[owner].hand.push(toZoneCard(c));
    x.events.push({ type: 'returnedToHand', player: owner, iid: c.iid, cardId: c.cardId, lane });
  }
  checkDeaths(x);
}

/** A fresh creature entering play. */
export function newCreature(x: Exec, inst: CardInstance, token: boolean): CreatureInPlay {
  const card = getCard(x.ctx.cards, inst.cardId);
  const printed = card.type === 'creature' ? card.keywords : [];
  return {
    iid: inst.iid,
    cardId: inst.cardId,
    owner: inst.owner,
    damage: 0,
    atkMod: 0,
    defMod: 0,
    tempAtk: 0,
    tempDef: 0,
    exhausted: false,
    summoningSick: true,
    movesThisTurn: 0,
    shield: printed.includes('shield'),
    frozen: false,
    poison: 0,
    stealth: printed.includes('stealth'),
    grantedKeywords: [],
    token,
  };
}

export function summonToken(x: Exec, player: PlayerId, lane: number, cardId: string): void {
  const l = x.s.players[player].lanes[lane];
  if (!l || l.creature || l.flipped || l.landscape === null) return;
  const iid = `c${x.s.nextInstanceId++}`;
  l.creature = newCreature(x, { iid, cardId, owner: player }, true);
  x.events.push({ type: 'creatureSummoned', player, iid, cardId, lane, token: true });
  checkDeaths(x);
}

/** Moves a creature to a random empty, un-flipped lane of its owner (effect-driven). */
export function moveCreatureRandomly(x: Exec, owner: PlayerId, lane: number): void {
  const p = x.s.players[owner];
  const c = p.lanes[lane]?.creature;
  if (!c) return;
  const options = p.lanes
    .map((l, i) => ({ l, i }))
    .filter(({ l, i }) => i !== lane && !l.creature && !l.flipped && l.landscape !== null)
    .map(({ i }) => i);
  if (options.length === 0) return;
  const to = x.rng.pick(options);
  p.lanes[lane]!.creature = null;
  p.lanes[to]!.creature = c;
  x.events.push({ type: 'creatureMoved', player: owner, iid: c.iid, from: lane, to, cost: 0 });
  checkDeaths(x);
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

function removeBuilding(x: Exec, owner: PlayerId, lane: number): CardInstance | null {
  const l = x.s.players[owner].lanes[lane];
  const b = l?.building ?? null;
  if (l) l.building = null;
  return b;
}

export function destroyBuilding(x: Exec, owner: PlayerId, lane: number): void {
  const b = removeBuilding(x, owner, lane);
  if (!b) return;
  x.s.players[owner].discard.push(b);
  x.events.push({ type: 'buildingDestroyed', player: owner, iid: b.iid, cardId: b.cardId, lane });
  // Losing a building's bonus can drop a creature to 0 DEF.
  checkDeaths(x);
}

export function returnBuildingToHand(x: Exec, owner: PlayerId, lane: number): void {
  const b = removeBuilding(x, owner, lane);
  if (!b) return;
  x.s.players[owner].hand.push(b);
  x.events.push({ type: 'buildingReturned', player: owner, iid: b.iid, cardId: b.cardId, lane });
  checkDeaths(x);
}

/** Moves a building to a random lane of its owner that has a landscape and no building. */
export function moveBuildingRandomly(x: Exec, owner: PlayerId, lane: number): void {
  const p = x.s.players[owner];
  const b = p.lanes[lane]?.building;
  if (!b) return;
  const options = p.lanes
    .map((l, i) => ({ l, i }))
    .filter(({ l, i }) => i !== lane && !l.building && l.landscape !== null)
    .map(({ i }) => i);
  if (options.length === 0) return;
  const to = x.rng.pick(options);
  p.lanes[lane]!.building = null;
  p.lanes[to]!.building = b;
  x.events.push({ type: 'buildingMoved', player: owner, iid: b.iid, from: lane, to });
  checkDeaths(x);
}

// ---------------------------------------------------------------------------
// Creature statuses
// ---------------------------------------------------------------------------

/** Removes all damage and stat modifiers (not statics or card levels). */
export function resetCreature(x: Exec, owner: PlayerId, lane: number): void {
  const c = creatureAt(x, owner, lane);
  if (!c) return;
  c.damage = 0;
  c.atkMod = 0;
  c.defMod = 0;
  c.tempAtk = 0;
  c.tempDef = 0;
  c.roundAtk = 0;
  c.roundDef = 0;
  x.events.push({ type: 'status', player: owner, lane, iid: c.iid, status: 'reset' });
  emitStats(x, owner, lane, c);
  checkDeaths(x);
}

/**
 * Swaps a creature's stats: its ATK becomes its remaining DEF and its DEF
 * becomes its ATK (damage is cleared). `atk`/`def` are the current values.
 */
export function swapCreatureStats(x: Exec, owner: PlayerId, lane: number, atk: number, def: number): void {
  const c = creatureAt(x, owner, lane);
  if (!c) return;
  const maxDef = def + c.damage;
  c.damage = 0;
  c.atkMod += def - atk;
  c.defMod += atk - maxDef;
  x.events.push({ type: 'status', player: owner, lane, iid: c.iid, status: 'swapped' });
  emitStats(x, owner, lane, c);
  checkDeaths(x);
}

export function setCreatureStatus(
  x: Exec,
  owner: PlayerId,
  lane: number,
  status: 'floopLocked' | 'attackLocked' | 'redirect',
  untilTurn: number,
): void {
  const c = creatureAt(x, owner, lane);
  if (!c) return;
  if (status === 'floopLocked') c.floopLock = Math.max(c.floopLock ?? 0, untilTurn);
  else if (status === 'attackLocked') c.attackLock = Math.max(c.attackLock ?? 0, untilTurn);
  else c.redirectUntil = Math.max(c.redirectUntil ?? 0, untilTurn);
  x.events.push({ type: 'status', player: owner, lane, iid: c.iid, status });
}

export function freezeCreature(x: Exec, owner: PlayerId, lane: number): void {
  const c = creatureAt(x, owner, lane);
  if (!c || c.frozen) return;
  c.frozen = true;
  x.events.push({ type: 'frozen', player: owner, lane, iid: c.iid });
}

export function poisonCreature(x: Exec, owner: PlayerId, lane: number, amount: number): void {
  const c = creatureAt(x, owner, lane);
  if (!c || amount <= 0) return;
  c.poison += amount;
  x.events.push({ type: 'poisoned', player: owner, lane, iid: c.iid, poison: c.poison });
}

export function shieldCreature(x: Exec, owner: PlayerId, lane: number): void {
  const c = creatureAt(x, owner, lane);
  if (!c || c.shield) return;
  c.shield = true;
  x.events.push({ type: 'shieldGained', player: owner, lane, iid: c.iid });
}

export function grantKeyword(x: Exec, owner: PlayerId, lane: number, keyword: string): void {
  const c = creatureAt(x, owner, lane);
  if (!c) return;
  if (keyword === 'shield') return shieldCreature(x, owner, lane);
  if (keyword === 'stealth') c.stealth = true;
  else c.grantedKeywords.push(keyword);
  x.events.push({ type: 'keywordGranted', player: owner, lane, iid: c.iid, keyword });
}

/** Lifesteal and poison for combat damage dealt by a creature. */
export function afterCreatureDamage(
  x: Exec,
  attackerOwner: PlayerId,
  attackerLane: number,
  target: TargetRef,
  dealt: number,
): void {
  if (dealt <= 0 || isOver(x)) return;
  const attacker = creatureAt(x, attackerOwner, attackerLane);
  if (!attacker) return;
  if (keywordValue(x.s, x.ctx, attacker, attackerLane, 'lifesteal') > 0) {
    healTarget(x, { kind: 'hero', player: attackerOwner }, dealt);
  }
  const poison = keywordValue(x.s, x.ctx, attacker, attackerLane, 'poison');
  if (poison > 0 && target.kind === 'creature') poisonCreature(x, target.player, target.lane, poison);
}

// ---------------------------------------------------------------------------
// Landscapes
// ---------------------------------------------------------------------------

export function flipLandscape(x: Exec, player: PlayerId, lane: number): void {
  const l = x.s.players[player].lanes[lane];
  if (!l || l.landscape === null) return;
  l.flipped = true;
  l.flipTimer = 1;
  x.events.push({ type: 'landscapeFlipped', player, lane });
  // Landscape-based bonuses (e.g. hero passives) switch off while flipped.
  checkDeaths(x);
}

export function restoreLandscape(x: Exec, player: PlayerId, lane: number): void {
  const l = x.s.players[player].lanes[lane];
  if (!l || !l.flipped) return;
  l.flipped = false;
  l.flipTimer = null;
  x.events.push({ type: 'landscapeRestored', player, lane });
  checkDeaths(x);
}

export function convertLandscape(x: Exec, player: PlayerId, lane: number, to: LandscapeType): void {
  const l = x.s.players[player].lanes[lane];
  if (!l || l.landscape === null || l.landscape === to) return;
  const from = l.landscape;
  l.landscape = to;
  x.events.push({ type: 'landscapeConverted', player, lane, from, to });
  checkDeaths(x);
}

// ---------------------------------------------------------------------------
// Cards in hand / deck
// ---------------------------------------------------------------------------

/** Draws `count` cards; each draw from an empty deck deals fatigue damage instead. */
export function drawCards(x: Exec, player: PlayerId, count: number): void {
  const p = x.s.players[player];
  for (let i = 0; i < count && !isOver(x); i++) {
    const card = p.deck.shift();
    if (!card) {
      const dmg = x.ctx.balance.fatigueDamage;
      x.events.push({ type: 'fatigue', player, damage: dmg });
      // Self-inflicted: only the damaged hero's Ultimate charges.
      damageHero(x, player, dmg, { player });
      continue;
    }
    p.hand.push(card);
    x.events.push({ type: 'cardDrawn', player, iid: card.iid, cardId: card.cardId });
  }
}

export function discardFromHand(x: Exec, player: PlayerId, iid: string): void {
  const p = x.s.players[player];
  const idx = p.hand.findIndex((c) => c.iid === iid);
  if (idx < 0) return;
  const [card] = p.hand.splice(idx, 1) as [CardInstance];
  p.discard.push(card);
  x.events.push({ type: 'cardDiscarded', player, iid: card.iid, cardId: card.cardId, from: 'hand' });
}

/** Moves cards from a player's discard pile to their hand. */
export function recoverFromDiscard(x: Exec, player: PlayerId, iids: readonly string[]): void {
  const p = x.s.players[player];
  for (const iid of iids) {
    const idx = p.discard.findIndex((c) => c.iid === iid);
    if (idx < 0) continue;
    const [card] = p.discard.splice(idx, 1) as [CardInstance];
    p.hand.push(card);
    x.events.push({ type: 'cardRecovered', player, iid: card.iid, cardId: card.cardId, from: 'discard' });
  }
}

/** Moves one card from a player's deck to their hand (the rest stays in order). */
export function takeFromDeck(x: Exec, player: PlayerId, iid: string): void {
  const p = x.s.players[player];
  const idx = p.deck.findIndex((c) => c.iid === iid);
  if (idx < 0) return;
  const [card] = p.deck.splice(idx, 1) as [CardInstance];
  p.hand.push(card);
  x.events.push({ type: 'cardRecovered', player, iid: card.iid, cardId: card.cardId, from: 'deck' });
}

/** Shuffles the hand into the deck, then draws `count`. */
export function cycleHand(x: Exec, player: PlayerId, count: number): void {
  const p = x.s.players[player];
  const returned = p.hand.length;
  p.deck = x.rng.shuffle([...p.deck, ...p.hand]);
  p.hand = [];
  x.events.push({ type: 'handCycled', player, count: returned });
  drawCards(x, player, count);
}

export function discardHand(x: Exec, player: PlayerId): void {
  for (const c of [...x.s.players[player].hand]) discardFromHand(x, player, c.iid);
}

export function discardRandom(x: Exec, player: PlayerId, count: number): void {
  const p = x.s.players[player];
  for (let i = 0; i < count && p.hand.length > 0; i++) {
    discardFromHand(x, player, x.rng.pick(p.hand).iid);
  }
}
