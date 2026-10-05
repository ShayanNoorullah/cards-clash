/**
 * The effect pipeline: Trigger → Condition → Target Selector → Effect(s).
 *
 * Abilities are queued (FIFO) by mutations and actions, then `drainQueue`
 * resolves them one by one. Anything an effect causes (a creature dying, a
 * creature being damaged, ...) queues further abilities, which resolve after
 * the current one finishes. Every ability and every effect-target application
 * counts toward the per-action resolution cap (infinite-loop protection).
 */
import { evalAmount, matchesFilter, nextTurnOf, starsOf, type AmountScope } from './amounts';
import { chosenEffect, getCard } from './cards';
import {
  buffCreature,
  changeMp,
  chargeUltimate,
  convertLandscape,
  countResolution,
  cycleHand,
  dealDamage,
  destroyBuilding,
  destroyCreature,
  discardHand,
  discardRandom,
  drawCards,
  flipLandscape,
  freezeCreature,
  grantKeyword,
  healTarget,
  isOver,
  moveBuildingRandomly,
  moveCreatureRandomly,
  MP_EFFECT_CAP,
  poisonCreature,
  recoverFromDiscard,
  resetCreature,
  restoreLandscape,
  returnBuildingToHand,
  returnCreatureToHand,
  setCreatureStatus,
  shieldCreature,
  sourceLane,
  summonToken,
  swapCreatureStats,
  takeFromDeck,
  type EffectSource,
  type Exec,
  type PendingAbility,
} from './mutations';
import { levelBonus } from './balance';
import { cardLevelOf, countLandscapes } from './state';
import { creatureAtk, creatureDef, spellPower } from './statics';
import { strike } from './turn';
import type {
  CardInstance,
  Condition,
  Effect,
  GameState,
  PlayerId,
  RulesContext,
  TargetFilter,
  TargetRef,
  TargetSelector,
} from './types';
import { other } from './types';

// ---------------------------------------------------------------------------
// Chosen targets (validation, highlighting, AI)
// ---------------------------------------------------------------------------

/** Whether `target` is a legal pick for a chosen selector used by `chooser`. */
export function isValidChosenTarget(
  state: GameState,
  selector: TargetSelector,
  chooser: PlayerId,
  target: TargetRef,
  ctx?: RulesContext,
  filter?: TargetFilter,
): boolean {
  if (target.player !== 0 && target.player !== 1) return false;
  if (target.kind === 'hero') return false;
  const lane = state.players[target.player].lanes[target.lane];
  const enemy = target.player !== chooser;
  switch (selector) {
    case 'chosenCreature':
    case 'chosenEnemyCreature':
    case 'chosenAllyCreature': {
      if (target.kind !== 'creature' || !lane?.creature) return false;
      if (enemy && lane.creature.stealth) return false;
      if (filter && ctx && !matchesFilter(ctx, lane.creature, filter)) return false;
      if (selector === 'chosenEnemyCreature') return enemy;
      if (selector === 'chosenAllyCreature') return !enemy;
      return true;
    }
    case 'chosenEnemyLandscape':
    case 'chosenAllyLandscape': {
      if (target.kind !== 'landscape' || !lane || lane.landscape === null) return false;
      return selector === 'chosenEnemyLandscape' ? enemy : !enemy;
    }
    case 'chosenEnemyBuilding':
    case 'chosenAllyBuilding': {
      if (target.kind !== 'building' || !lane?.building) return false;
      return selector === 'chosenEnemyBuilding' ? enemy : !enemy;
    }
    default:
      return false;
  }
}

function refKind(selector: TargetSelector): TargetRef['kind'] {
  if (selector.endsWith('Landscape')) return 'landscape';
  if (selector.endsWith('Building')) return 'building';
  return 'creature';
}

/** All legal picks for a chosen selector. */
export function listChosenTargets(
  state: GameState,
  selector: TargetSelector,
  chooser: PlayerId,
  ctx?: RulesContext,
  filter?: TargetFilter,
): TargetRef[] {
  const out: TargetRef[] = [];
  const kind = refKind(selector);
  for (const p of state.players) {
    for (let lane = 0; lane < p.lanes.length; lane++) {
      const t = { kind, player: p.id, lane } as TargetRef;
      if (isValidChosenTarget(state, selector, chooser, t, ctx, filter)) out.push(t);
    }
  }
  return out;
}

/** Legal picks for the chosen target of an effect list ([] if it has none). */
export function choicesFor(
  state: GameState,
  ctx: RulesContext,
  effects: readonly Effect[],
  chooser: PlayerId,
): TargetRef[] {
  const e = chosenEffect(effects);
  if (!e || !('target' in e)) return [];
  return listChosenTargets(state, e.target, chooser, ctx, e.filter);
}

/** Whether `target` is a legal pick for the chosen target of an effect list. */
export function isValidChoiceFor(
  state: GameState,
  ctx: RulesContext,
  effects: readonly Effect[],
  chooser: PlayerId,
  target: TargetRef,
): boolean {
  const e = chosenEffect(effects);
  if (!e || !('target' in e)) return false;
  return isValidChosenTarget(state, e.target, chooser, target, ctx, e.filter);
}

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

export function checkCondition(x: Exec, cond: Condition, src: EffectSource): boolean {
  const me = x.s.players[src.player];
  const opp = x.s.players[other(src.player)];
  const who = (w: 'self' | 'enemy') => (w === 'self' ? me : opp);
  switch (cond.type) {
    case 'landscapeCount':
      return countLandscapes(me, cond.landscape) >= cond.atLeast;
    case 'opposingLaneEmpty':
    case 'opposingLaneOccupied': {
      const lane = sourceLane(x, src);
      if (lane === null) return false;
      const occupied = !!opp.lanes[lane]?.creature;
      return cond.type === 'opposingLaneOccupied' ? occupied : !occupied;
    }
    case 'heroHpAtMost':
      return who(cond.who).hp <= cond.value;
    case 'creatureCountAtLeast':
      return who(cond.who).lanes.filter((l) => l.creature).length >= cond.value;
    case 'creatureCountAtMost':
      return who(cond.who).lanes.filter((l) => l.creature).length <= cond.value;
    case 'handSizeAtMost':
      return me.hand.length <= cond.value;
    case 'handSizeAtLeast':
      return me.hand.length >= cond.value;
  }
}

// ---------------------------------------------------------------------------
// Target resolution
// ---------------------------------------------------------------------------

function creaturesOf(state: GameState, player: PlayerId, exceptIid?: string | null): TargetRef[] {
  const out: TargetRef[] = [];
  state.players[player].lanes.forEach((l, lane) => {
    if (l.creature && l.creature.iid !== exceptIid) out.push({ kind: 'creature', player, lane });
  });
  return out;
}

function buildingsOf(state: GameState, player: PlayerId): TargetRef[] {
  const out: TargetRef[] = [];
  state.players[player].lanes.forEach((l, lane) => {
    if (l.building) out.push({ kind: 'building', player, lane });
  });
  return out;
}

function landscapesOf(
  state: GameState,
  player: PlayerId,
  filter: (flipped: boolean) => boolean,
): TargetRef[] {
  const out: TargetRef[] = [];
  state.players[player].lanes.forEach((l, lane) => {
    if (l.landscape !== null && filter(l.flipped)) out.push({ kind: 'landscape', player, lane });
  });
  return out;
}

function creatureIn(state: GameState, player: PlayerId, lane: number | null): TargetRef[] {
  if (lane === null || !state.players[player].lanes[lane]?.creature) return [];
  return [{ kind: 'creature', player, lane }];
}

function buildingIn(state: GameState, player: PlayerId, lane: number | null): TargetRef[] {
  if (lane === null || !state.players[player].lanes[lane]?.building) return [];
  return [{ kind: 'building', player, lane }];
}

/** The ally creature with the lowest cost (then lowest ATK + DEF), for "destroy one of yours". */
function weakestAlly(x: Exec, player: PlayerId): TargetRef[] {
  let best: TargetRef | null = null;
  let bestScore = Infinity;
  for (const t of creaturesOf(x.s, player)) {
    if (t.kind !== 'creature') continue;
    const c = x.s.players[player].lanes[t.lane]!.creature!;
    const card = getCard(x.ctx.cards, c.cardId);
    const score =
      card.cost * 1000 + creatureAtk(x.s, x.ctx, c, t.lane) + Math.max(0, creatureDef(x.s, x.ctx, c, t.lane));
    if (score < bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best ? [best] : [];
}

export function resolveTargets(
  x: Exec,
  selector: TargetSelector,
  src: EffectSource,
  chosen: TargetRef | undefined,
  count = 1,
): TargetRef[] {
  const s = x.s;
  const me = src.player;
  const opp = other(me);
  const lane = sourceLane(x, src);
  switch (selector) {
    case 'self': {
      if (lane === null || src.iid === null) return [];
      return s.players[me].lanes[lane]?.creature?.iid === src.iid
        ? [{ kind: 'creature', player: me, lane }]
        : [];
    }
    case 'opposingCreature':
      return creatureIn(s, opp, lane);
    case 'laneCreature':
      return creatureIn(s, me, lane);
    case 'adjacentAllies':
      return lane === null ? [] : [...creatureIn(s, me, lane - 1), ...creatureIn(s, me, lane + 1)];
    case 'adjacentEnemies':
      return lane === null ? [] : [...creatureIn(s, opp, lane - 1), ...creatureIn(s, opp, lane + 1)];
    case 'allAllyCreatures':
      return creaturesOf(s, me);
    case 'otherAllyCreatures':
      return creaturesOf(s, me, src.iid);
    case 'allEnemyCreatures':
      return creaturesOf(s, opp);
    case 'allCreatures':
      return [...creaturesOf(s, me), ...creaturesOf(s, opp)];
    case 'randomEnemyCreature':
      return x.rng.sample(creaturesOf(s, opp), count);
    case 'randomAllyCreature':
      return x.rng.sample(creaturesOf(s, me), count);
    case 'randomCreature':
      return x.rng.sample([...creaturesOf(s, me), ...creaturesOf(s, opp)], count);
    case 'weakestAllyCreature':
      return weakestAlly(x, me);
    case 'chosenCreature':
    case 'chosenEnemyCreature':
    case 'chosenAllyCreature':
    case 'chosenEnemyLandscape':
    case 'chosenAllyLandscape':
    case 'chosenEnemyBuilding':
    case 'chosenAllyBuilding':
      // Stealth was checked when the target was chosen; now it only has to still exist.
      if (!chosen || chosen.kind === 'hero') return [];
      if (chosen.kind === 'creature') return creatureIn(s, chosen.player, chosen.lane);
      if (chosen.kind === 'building') return buildingIn(s, chosen.player, chosen.lane);
      return s.players[chosen.player].lanes[chosen.lane]?.landscape != null ? [chosen] : [];
    case 'ownHero':
      return [{ kind: 'hero', player: me }];
    case 'enemyHero':
      return [{ kind: 'hero', player: opp }];
    case 'bothHeroes':
      return [
        { kind: 'hero', player: me },
        { kind: 'hero', player: opp },
      ];
    case 'thisLandscape':
      return lane === null ? [] : [{ kind: 'landscape', player: me, lane }];
    case 'opposingLandscape':
      return lane === null ? [] : [{ kind: 'landscape', player: opp, lane }];
    case 'randomEnemyLandscape':
      return x.rng.sample(
        landscapesOf(s, opp, (f) => !f),
        count,
      );
    case 'allAllyLandscapes':
      return landscapesOf(s, me, () => true);
    case 'allEnemyLandscapes':
      return landscapesOf(s, opp, () => true);
    case 'thisBuilding': {
      if (lane === null || src.iid === null) return [];
      return s.players[me].lanes[lane]?.building?.iid === src.iid
        ? [{ kind: 'building', player: me, lane }]
        : [];
    }
    case 'opposingBuilding':
      return buildingIn(s, opp, lane);
    case 'allEnemyBuildings':
      return buildingsOf(s, opp);
    case 'allAllyBuildings':
      return buildingsOf(s, me);
    case 'allBuildings':
      return [...buildingsOf(s, me), ...buildingsOf(s, opp)];
  }
}

/** Targets after filters and splash (creatures next to each target join in). */
function finalTargets(
  x: Exec,
  effect: Effect,
  src: EffectSource,
  chosen: TargetRef | undefined,
): TargetRef[] {
  if (!('target' in effect)) return [];
  const count = 'count' in effect ? (effect.count ?? 1) : 1;
  let targets = resolveTargets(x, effect.target, src, chosen, count);
  if (effect.filter) {
    targets = targets.filter((t) => {
      if (t.kind !== 'creature') return true;
      const c = x.s.players[t.player].lanes[t.lane]?.creature;
      return !!c && matchesFilter(x.ctx, c, effect.filter);
    });
  }
  if (effect.splash) {
    const out: TargetRef[] = [];
    const seen = new Set<string>();
    const add = (t: TargetRef) => {
      const key = `${t.kind}:${t.player}:${'lane' in t ? t.lane : -1}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(t);
      }
    };
    for (const t of targets) {
      add(t);
      if (t.kind === 'creature') for (const n of creatureIn(x.s, t.player, t.lane - 1)) add(n);
      if (t.kind === 'creature') for (const n of creatureIn(x.s, t.player, t.lane + 1)) add(n);
    }
    targets = out;
  }
  return targets;
}

// ---------------------------------------------------------------------------
// Effect application
// ---------------------------------------------------------------------------

function summonLanes(x: Exec, src: EffectSource, where: string, count: number): number[] {
  const p = x.s.players[src.player];
  const empty = (i: number) => {
    const l = p.lanes[i];
    return !!l && !l.creature && !l.flipped && l.landscape !== null;
  };
  const lane = sourceLane(x, src);
  const all = p.lanes.map((_l, i) => i).filter(empty);
  switch (where) {
    case 'sourceLane':
      return lane !== null && empty(lane) ? [lane] : [];
    case 'adjacentEmptyLanes':
      return lane === null ? [] : [lane - 1, lane + 1].filter(empty);
    case 'randomEmptyLane':
      return x.rng.sample(all, count);
    case 'allEmptyLanes':
      return all;
    default:
      return [];
  }
}

/** Ability upgrade from the source card's level (damage, heal and poison amounts). */
function abilityBonus(x: Exec, src: EffectSource): number {
  if (src.kind === 'hero' || !src.cardId) return 0;
  return levelBonus(cardLevelOf(x.s, src.player, src.cardId)).ability;
}

function scopeOf(x: Exec, src: EffectSource, target?: TargetRef): AmountScope {
  return {
    owner: src.player,
    lane: sourceLane(x, src),
    iid: src.iid,
    target: target && target.kind === 'creature' ? { player: target.player, lane: target.lane } : null,
  };
}

/** Picks a target for an ability used automatically (Punk Cat): the strongest enemy or the most hurt ally. */
function autoChoose(x: Exec, effects: readonly Effect[], player: PlayerId): TargetRef | undefined {
  const options = choicesFor(x.s, x.ctx, effects, player);
  if (options.length === 0) return undefined;
  const score = (t: TargetRef): number => {
    if (t.kind !== 'creature') return t.player === player ? 0 : 1;
    const c = x.s.players[t.player].lanes[t.lane]!.creature!;
    return t.player === player ? c.damage : 1000 + creatureAtk(x.s, x.ctx, c, t.lane);
  };
  return [...options].sort((a, b) => score(b) - score(a))[0];
}

function applyToTarget(x: Exec, effect: Effect, t: TargetRef, src: EffectSource): void {
  const lane = t.kind === 'hero' ? -1 : t.lane;
  const amount = (a: Parameters<typeof evalAmount>[2]) => evalAmount(x.s, x.ctx, a, scopeOf(x, src, t));
  switch (effect.type) {
    case 'damage': {
      const bonus = (src.kind === 'spell' ? spellPower(x.s, x.ctx, src.player) : 0) + abilityBonus(x, src);
      const base = amount(effect.amount);
      if (base <= 0) break;
      dealDamage(x, t, base + bonus, {
        player: src.player,
        ...(effect.stealOnKill ? { stealer: src.player } : {}),
      });
      break;
    }
    case 'heal': {
      const base = amount(effect.amount);
      if (base > 0) healTarget(x, t, base + abilityBonus(x, src));
      break;
    }
    case 'buff': {
      const duration = effect.duration ?? (effect.temporary ? 'turn' : 'permanent');
      buffCreature(x, t.player, lane, amount(effect.atk), amount(effect.def), duration);
      break;
    }
    case 'destroy':
      if (t.kind === 'creature') destroyCreature(x, t.player, lane);
      break;
    case 'returnToHand':
      returnCreatureToHand(x, t.player, lane);
      break;
    case 'move':
      moveCreatureRandomly(x, t.player, lane);
      break;
    case 'freeze':
      freezeCreature(x, t.player, lane);
      break;
    case 'poison':
      poisonCreature(x, t.player, lane, effect.amount + abilityBonus(x, src));
      break;
    case 'shield':
      shieldCreature(x, t.player, lane);
      break;
    case 'grantKeyword':
      grantKeyword(x, t.player, lane, effect.keyword);
      break;
    case 'flip':
      flipLandscape(x, t.player, lane);
      break;
    case 'convert':
      convertLandscape(x, t.player, lane, effect.to);
      break;
    case 'restore':
      restoreLandscape(x, t.player, lane);
      break;
    case 'reset':
      resetCreature(x, t.player, lane);
      break;
    case 'swapStats': {
      const c = x.s.players[t.player].lanes[lane]?.creature;
      if (c) {
        const def = Math.max(0, creatureDef(x.s, x.ctx, c, lane));
        swapCreatureStats(x, t.player, lane, creatureAtk(x.s, x.ctx, c, lane), def);
      }
      break;
    }
    case 'lockFloop':
      setCreatureStatus(x, t.player, lane, 'floopLocked', nextTurnOf(x.s, t.player));
      break;
    case 'lockAttack':
      setCreatureStatus(x, t.player, lane, 'attackLocked', nextTurnOf(x.s, t.player));
      break;
    case 'redirect':
      setCreatureStatus(x, t.player, lane, 'redirect', nextTurnOf(x.s, src.player));
      break;
    case 'forceAttack':
      strike(x, t.player, lane, true);
      break;
    case 'activateFloop': {
      const c = x.s.players[t.player].lanes[lane]?.creature;
      if (!c) break;
      const card = getCard(x.ctx.cards, c.cardId);
      if (card.type !== 'creature' || !card.floop) break;
      // A creature activating another Punk Cat-style floop would loop forever.
      if (card.floop.effects.some((e) => e.type === 'activateFloop')) break;
      const chosen = autoChoose(x, card.floop.effects, t.player);
      x.queue.push({
        source: { player: t.player, kind: 'creature', iid: c.iid, cardId: c.cardId, lane },
        trigger: 'floop',
        effects: card.floop.effects,
        ...(chosen ? { chosen } : {}),
      });
      break;
    }
    case 'seal': {
      const l = x.s.players[t.player].lanes[lane];
      if (!l) break;
      l.sealedUntil = Math.max(l.sealedUntil ?? 0, nextTurnOf(x.s, t.player));
      x.events.push({ type: 'laneSealed', player: t.player, lane });
      break;
    }
    case 'wipeLane':
      for (const p of [0, 1] as const) {
        if (x.s.players[p].lanes[lane]?.creature) destroyCreature(x, p, lane);
        if (x.s.players[p].lanes[lane]?.building) destroyBuilding(x, p, lane);
      }
      break;
    case 'destroyBuilding':
      destroyBuilding(x, t.player, lane);
      break;
    case 'returnBuilding':
      returnBuildingToHand(x, t.player, lane);
      break;
    case 'moveBuilding':
      moveBuildingRandomly(x, t.player, lane);
      break;
    default:
      break;
  }
}

/** The most valuable card first: highest cost, then most stars. */
function bestFirst(x: Exec, cards: CardInstance[]): CardInstance[] {
  const value = (c: CardInstance) => {
    const def = getCard(x.ctx.cards, c.cardId);
    return def.cost * 10 + starsOf(def);
  };
  return [...cards].sort((a, b) => value(b) - value(a));
}

function applyEffect(x: Exec, effect: Effect, pending: PendingAbility): void {
  const src = pending.source;
  const me = src.player;
  if (effect.when && !checkCondition(x, effect.when, src)) return;
  const n = (a: Parameters<typeof evalAmount>[2]) => evalAmount(x.s, x.ctx, a, scopeOf(x, src));
  switch (effect.type) {
    case 'draw': {
      if (!countResolution(x)) return;
      const amount = n(effect.amount);
      if (amount > 0) drawCards(x, effect.who === 'enemy' ? other(me) : me, amount);
      return;
    }
    case 'discard':
      if (!countResolution(x)) return;
      discardRandom(x, effect.who === 'self' ? me : other(me), effect.amount);
      return;
    case 'gainMp': {
      if (!countResolution(x)) return;
      const amount = n(effect.amount);
      if (amount <= 0) return;
      if (effect.nextTurn) {
        // A negative penalty is a bonus at the next refresh.
        const p = x.s.players[me];
        p.mpPenalty -= amount;
        x.events.push({ type: 'mpPenalty', player: me, amount: p.mpPenalty });
      } else changeMp(x, me, amount, MP_EFFECT_CAP);
      return;
    }
    case 'loseMp': {
      if (!countResolution(x)) return;
      const opp = other(me);
      x.s.players[opp].mpPenalty += effect.amount;
      x.events.push({ type: 'mpPenalty', player: opp, amount: x.s.players[opp].mpPenalty });
      return;
    }
    case 'chargeUltimate':
      if (!countResolution(x)) return;
      chargeUltimate(x, me, effect.amount);
      return;
    case 'summon':
      for (const lane of summonLanes(x, src, effect.where, effect.count ?? 1)) {
        if (isOver(x) || !countResolution(x)) return;
        summonToken(x, me, lane, effect.cardId);
      }
      return;
    case 'costMod': {
      if (!countResolution(x)) return;
      const who = effect.who === 'self' ? me : other(me);
      const turn = effect.who === 'self' ? x.s.turn : nextTurnOf(x.s, who);
      const p = x.s.players[who];
      p.costMods = [
        ...(p.costMods ?? []).filter((m) => m.turn >= x.s.turn),
        {
          kind: effect.kind,
          amount: effect.amount,
          turn,
          ...(effect.landscape !== undefined ? { landscape: effect.landscape } : {}),
        },
      ];
      x.events.push({ type: 'costChanged', player: who, kind: effect.kind, amount: effect.amount });
      return;
    }
    case 'block': {
      if (!countResolution(x)) return;
      const opp = other(me);
      const p = x.s.players[opp];
      p.blocks = [
        ...(p.blocks ?? []).filter((b) => b.turn >= x.s.turn),
        { what: effect.what, turn: nextTurnOf(x.s, opp) },
      ];
      x.events.push({ type: 'playBlocked', player: opp, what: effect.what });
      return;
    }
    case 'recover': {
      if (!countResolution(x)) return;
      const pile = x.s.players[me].discard.filter(
        (c) => !effect.cardType || getCard(x.ctx.cards, c.cardId).type === effect.cardType,
      );
      const picked =
        effect.pick === 'random'
          ? x.rng.sample(pile, effect.count ?? 1)
          : bestFirst(x, pile).slice(0, effect.count ?? 1);
      recoverFromDiscard(
        x,
        me,
        picked.map((c) => c.iid),
      );
      return;
    }
    case 'recoverDestroyed': {
      if (!countResolution(x) || !pending.subject) return;
      recoverFromDiscard(x, pending.subject.player, [pending.subject.iid]);
      return;
    }
    case 'tutor': {
      if (!countResolution(x)) return;
      const pool = x.s.players[me].deck.filter(
        (c) => !effect.cardType || getCard(x.ctx.cards, c.cardId).type === effect.cardType,
      );
      if (pool.length > 0) takeFromDeck(x, me, x.rng.pick(pool).iid);
      return;
    }
    case 'cycleHand':
      if (!countResolution(x)) return;
      cycleHand(x, me, effect.draw);
      return;
    case 'discardHand':
      if (!countResolution(x)) return;
      discardHand(x, me);
      return;
    default: {
      for (const t of finalTargets(x, effect, src, pending.chosen)) {
        if (isOver(x) || !countResolution(x)) return;
        // Re-check targets: an earlier hit may have removed them.
        if (t.kind === 'creature' && !x.s.players[t.player].lanes[t.lane]?.creature) continue;
        if (t.kind === 'building' && !x.s.players[t.player].lanes[t.lane]?.building) continue;
        applyToTarget(x, effect, t, src);
      }
    }
  }
}

function resolveAbility(x: Exec, pending: PendingAbility): void {
  if (pending.condition && !checkCondition(x, pending.condition, pending.source)) return;
  if (pending.trigger !== 'spell' && pending.trigger !== 'floop' && pending.trigger !== 'ultimate') {
    x.events.push({
      type: 'triggered',
      player: pending.source.player,
      trigger: pending.trigger,
      cardId: pending.source.cardId,
      iid: pending.source.iid,
    });
  }
  for (const effect of pending.effects) {
    if (isOver(x) || x.limitHit) return;
    applyEffect(x, effect, pending);
  }
}

/** Resolves queued abilities (and whatever they queue) until the queue is empty. */
export function drainQueue(x: Exec): void {
  while (x.queue.length > 0 && !isOver(x)) {
    if (!countResolution(x)) return;
    resolveAbility(x, x.queue.shift()!);
  }
  x.queue.length = 0;
}
