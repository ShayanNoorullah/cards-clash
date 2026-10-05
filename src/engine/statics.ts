/**
 * Continuous ("While in Play" / "Aura") effects. Nothing is cached in the
 * state: stats and keywords are recomputed from the board every time they are
 * read, so adding or removing a source can never leave stale bonuses behind.
 */
import { evalAmount, setStatReaders } from './amounts';
import { getCard, getHero, printedKeywords } from './cards';
import { levelBonus } from './balance';
import { addKeywords } from './keywords';
import { cardLevelOf } from './state';
import type {
  CreatureInPlay,
  GameState,
  Keyword,
  KeywordValues,
  PlayerId,
  RulesContext,
  StaticAbility,
} from './types';

interface StaticSource {
  owner: PlayerId;
  /** Lane of the source card; null for heroes. */
  lane: number | null;
  /** Instance id of the source card; null for heroes. */
  iid: string | null;
  ability: StaticAbility;
}

/** Every active static ability on the board and on both heroes. */
export function collectStatics(state: GameState, ctx: RulesContext): StaticSource[] {
  const out: StaticSource[] = [];
  for (const p of state.players) {
    const hero = ctx.heroes.byId.get(p.heroId);
    for (const ability of hero?.passive.statics ?? [])
      out.push({ owner: p.id, lane: null, iid: null, ability });
    for (const rule of p.rules)
      for (const ability of rule.statics ?? []) out.push({ owner: p.id, lane: null, iid: null, ability });
    p.lanes.forEach((l, lane) => {
      for (const inst of [l.creature, l.building]) {
        if (!inst) continue;
        for (const ability of getCard(ctx.cards, inst.cardId).statics ?? []) {
          out.push({ owner: p.id, lane, iid: inst.iid, ability });
        }
      }
    });
  }
  return out;
}

function applies(state: GameState, src: StaticSource, target: CreatureInPlay, lane: number): boolean {
  const a = src.ability;
  if (a.kind === 'spellPower' || a.kind === 'laneRarityCap') return false;
  if (a.onLandscape) {
    const l = state.players[target.owner].lanes[lane];
    if (!l || l.flipped || l.landscape !== a.onLandscape) return false;
  }
  const ally = src.owner === target.owner;
  switch (a.scope) {
    case 'self':
      return src.iid === target.iid;
    case 'lane':
      return ally && src.lane === lane && src.iid !== target.iid;
    case 'adjacent':
      return ally && src.lane !== null && Math.abs(src.lane - lane) === 1;
    case 'otherAllies':
      return ally && src.iid !== target.iid;
    case 'allAllies':
      return ally;
    case 'allEnemies':
      return !ally;
  }
}

/** Sum of static stat bonuses applying to a creature. */
export function staticStatBonus(
  state: GameState,
  ctx: RulesContext,
  c: CreatureInPlay,
  lane: number,
): { atk: number; def: number; swap: boolean } {
  let atk = 0;
  let def = 0;
  let swap = false;
  for (const src of collectStatics(state, ctx)) {
    if (src.ability.kind === 'swapStats' && applies(state, src, c, lane)) swap = true;
    if (src.ability.kind === 'stat' && applies(state, src, c, lane)) {
      const scope = { owner: src.owner, lane: src.lane, iid: src.iid };
      atk += evalAmount(state, ctx, src.ability.atk, scope);
      def += evalAmount(state, ctx, src.ability.def, scope);
    }
  }
  return { atk, def, swap };
}

/** All keywords a creature currently has: printed + granted by effects + statics. */
export function creatureKeywords(
  state: GameState,
  ctx: RulesContext,
  c: CreatureInPlay,
  lane: number,
): KeywordValues {
  const card = getCard(ctx.cards, c.cardId);
  const kw: KeywordValues = card.type === 'creature' ? { ...printedKeywords(card) } : {};
  addKeywords(kw, c.grantedKeywords);
  for (const src of collectStatics(state, ctx)) {
    if (src.ability.kind === 'keyword' && applies(state, src, c, lane))
      addKeywords(kw, [src.ability.keyword]);
  }
  return kw;
}

/** Keyword value (0 = absent; 1 for flag keywords; X for valued keywords). */
export function keywordValue(
  state: GameState,
  ctx: RulesContext,
  c: CreatureInPlay,
  lane: number,
  k: Keyword,
): number {
  return creatureKeywords(state, ctx, c, lane)[k] ?? 0;
}

export function hasKeyword(
  state: GameState,
  ctx: RulesContext,
  c: CreatureInPlay,
  lane: number,
  k: Keyword,
): boolean {
  return keywordValue(state, ctx, c, lane, k) > 0;
}

/** Extra damage added to each damage effect of a player's spells. */
export function spellPower(state: GameState, ctx: RulesContext, player: PlayerId): number {
  let total = 0;
  for (const src of collectStatics(state, ctx)) {
    if (src.owner === player && src.ability.kind === 'spellPower') total += src.ability.amount;
  }
  return total;
}

/** Sum of a numeric static ability kind applying to a creature. */
function staticSum(
  state: GameState,
  ctx: RulesContext,
  c: CreatureInPlay,
  lane: number,
  kind: 'armor' | 'floopCost',
): number {
  let n = 0;
  for (const src of collectStatics(state, ctx)) {
    if (src.ability.kind === kind && applies(state, src, c, lane)) n += src.ability.amount;
  }
  return n;
}

/** Combat damage the creature ignores (e.g. a building's armor). */
export function creatureArmor(state: GameState, ctx: RulesContext, c: CreatureInPlay, lane: number): number {
  return Math.max(0, staticSum(state, ctx, c, lane, 'armor'));
}

/** Static change to the creature's floop cost. */
export function floopCostStatic(
  state: GameState,
  ctx: RulesContext,
  c: CreatureInPlay,
  lane: number,
): number {
  return staticSum(state, ctx, c, lane, 'floopCost');
}

/** ATK and max DEF (min 0 each), after Swap statics. */
function stats(
  state: GameState,
  ctx: RulesContext,
  c: CreatureInPlay,
  lane: number,
): { atk: number; def: number } {
  const card = getCard(ctx.cards, c.cardId);
  if (card.type !== 'creature') throw new Error(`${c.cardId} is not a creature`);
  const lvl = c.token ? { atk: 0, def: 0 } : levelBonus(cardLevelOf(state, c.owner, c.cardId));
  const bonus = staticStatBonus(state, ctx, c, lane);
  const atk = Math.max(0, card.atk + lvl.atk + c.atkMod + c.tempAtk + (c.roundAtk ?? 0) + bonus.atk);
  const def = Math.max(0, card.def + lvl.def + c.defMod + c.tempDef + (c.roundDef ?? 0) + bonus.def);
  return bonus.swap ? { atk: def, def: atk } : { atk, def };
}

/** Current attack: printed + permanent + temporary modifiers + statics (min 0). */
export function creatureAtk(state: GameState, ctx: RulesContext, c: CreatureInPlay, lane: number): number {
  return stats(state, ctx, c, lane).atk;
}

/** Current maximum defense (min 0). */
export function creatureMaxDef(state: GameState, ctx: RulesContext, c: CreatureInPlay, lane: number): number {
  return stats(state, ctx, c, lane).def;
}

/**
 * Highest rarity (stars) `player` may play into `lane`, set by the enemy's
 * building across from it (Infinity when unrestricted).
 */
export function laneStarCap(state: GameState, ctx: RulesContext, player: PlayerId, lane: number): number {
  const enemy = state.players[player === 0 ? 1 : 0];
  const b = enemy.lanes[lane]?.building;
  let cap = Infinity;
  if (!b) return cap;
  for (const a of getCard(ctx.cards, b.cardId).statics ?? []) {
    if (a.kind === 'laneRarityCap') cap = Math.min(cap, a.maxStars);
  }
  return cap;
}

/** Remaining defense (max DEF minus damage). */
export function creatureDef(state: GameState, ctx: RulesContext, c: CreatureInPlay, lane: number): number {
  return creatureMaxDef(state, ctx, c, lane) - c.damage;
}

setStatReaders({ atk: creatureAtk, def: creatureDef, maxDef: creatureMaxDef });

/** Ensures a hero exists (throws a readable error otherwise). */
export function heroOf(state: GameState, ctx: RulesContext, player: PlayerId) {
  return getHero(ctx.heroes, state.players[player].heroId);
}
