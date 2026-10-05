/**
 * Content validation (cards and heroes) and lookup helpers. Invalid content
 * fails loudly at load time with every problem listed.
 */
import { addKeywords, parseKeyword } from './keywords';
import {
  BUILDING_SELECTORS,
  CARD_TYPES,
  CHOSEN_SELECTORS,
  CREATURE_SELECTORS,
  HERO_SELECTORS,
  LANDSCAPE_SELECTORS,
  LANDSCAPE_TYPES,
  LANE_SOURCE_SELECTORS,
  QUANTITIES,
  RANDOM_SELECTORS,
  RARITIES,
  STAT_QUANTITIES,
  STATIC_SCOPES,
  SUMMON_LOCATIONS,
  TRIGGERS,
  type CardDb,
  type CardDef,
  type CreatureDef,
  type Effect,
  type HeroDb,
  type HeroDef,
  type MatchRule,
  type KeywordValues,
  type TargetSelector,
  type TriggeredAbility,
} from './types';

type Rec = Record<string, unknown>;
/** What kind of thing produces an effect list; decides which selectors make sense. */
export type SourceKind = 'creature' | 'building' | 'spell' | 'hero';

function isRecord(v: unknown): v is Rec {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function isNonNegInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}
function isPosInt(v: unknown): v is number {
  return isNonNegInt(v) && v > 0;
}
function isInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v);
}
function includes<T extends string>(list: readonly T[], v: unknown): v is T {
  return typeof v === 'string' && (list as readonly string[]).includes(v);
}

const CREATURE_ONLY_EFFECTS = [
  'buff',
  'destroy',
  'returnToHand',
  'move',
  'freeze',
  'poison',
  'shield',
  'grantKeyword',
  'reset',
  'swapStats',
  'lockFloop',
  'lockAttack',
  'redirect',
  'forceAttack',
  'activateFloop',
];
const LANDSCAPE_EFFECTS = ['flip', 'convert', 'restore', 'seal', 'wipeLane'];
const BUILDING_EFFECTS = ['destroyBuilding', 'returnBuilding', 'moveBuilding'];
/** Effects without a target selector. */
const UNTARGETED_EFFECTS = [
  'draw',
  'discard',
  'gainMp',
  'loseMp',
  'summon',
  'chargeUltimate',
  'costMod',
  'block',
  'recover',
  'recoverDestroyed',
  'tutor',
  'cycleHand',
  'discardHand',
];
const COST_KINDS = ['card', 'creature', 'spell', 'building', 'floop'];
const PLAY_KINDS = ['creature', 'spell', 'building'];
const BUFF_DURATIONS = ['permanent', 'turn', 'round'];

/** A number, or a valid AmountExpr. `allowStat` = may read creature stats. */
function validateAmount(v: unknown, path: string, errors: string[], allowStat = true): void {
  if (typeof v === 'number') {
    if (!Number.isInteger(v)) errors.push(`${path} must be an integer`);
    return;
  }
  if (!isRecord(v) || !includes(QUANTITIES, v.of)) {
    errors.push(`${path} must be a number or { of: quantity, ... }`);
    return;
  }
  if (!allowStat && (STAT_QUANTITIES.includes(v.of) || STAT_QUANTITIES.includes(v.sub as never)))
    errors.push(`${path}: "${v.of}" cannot be used here`);
  if (v.mul !== undefined && typeof v.mul !== 'number') errors.push(`${path}.mul must be a number`);
  if (v.add !== undefined && typeof v.add !== 'number') errors.push(`${path}.add must be a number`);
  if (v.div !== undefined && !isPosInt(v.div)) errors.push(`${path}.div must be a positive integer`);
  if (v.sub !== undefined && !includes(QUANTITIES, v.sub)) errors.push(`${path}.sub must be a quantity`);
  if (v.of === 'ownLandscapesOf' && !includes(LANDSCAPE_TYPES, v.landscape))
    errors.push(`${path}.landscape is required for ownLandscapesOf`);
}

function isPositiveAmount(v: unknown): boolean {
  return typeof v === 'number' ? isPosInt(v) : isRecord(v);
}

function validateFilter(f: unknown, path: string, errors: string[]): void {
  if (!isRecord(f)) {
    errors.push(`${path} must be an object`);
    return;
  }
  if (f.landscape !== undefined && f.landscape !== 'neutral' && !includes(LANDSCAPE_TYPES, f.landscape))
    errors.push(`${path}.landscape is invalid`);
  for (const k of ['maxStars', 'minStars'] as const)
    if (f[k] !== undefined && !isPosInt(f[k])) errors.push(`${path}.${k} must be a positive integer`);
  if (f.damaged !== undefined && typeof f.damaged !== 'boolean')
    errors.push(`${path}.damaged must be boolean`);
}

interface EffectListOptions {
  source: SourceKind;
  /** Whether a player choice is possible here (spells, onPlay, floop, ultimates). */
  allowChosen: boolean;
}

export function validateCondition(c: unknown, path: string, errors: string[]): void {
  if (!isRecord(c)) {
    errors.push(`${path} must be an object`);
    return;
  }
  switch (c.type) {
    case 'landscapeCount':
      if (!includes(LANDSCAPE_TYPES, c.landscape) || !isPosInt(c.atLeast)) {
        errors.push(`${path} needs landscape and atLeast >= 1`);
      }
      break;
    case 'opposingLaneEmpty':
    case 'opposingLaneOccupied':
      break;
    case 'heroHpAtMost':
    case 'creatureCountAtLeast':
      if ((c.who !== 'self' && c.who !== 'enemy') || !isNonNegInt(c.value)) {
        errors.push(`${path} needs who (self|enemy) and a non-negative value`);
      }
      break;
    case 'handSizeAtMost':
    case 'handSizeAtLeast':
      if (!isNonNegInt(c.value)) errors.push(`${path} needs a non-negative value`);
      break;
    case 'creatureCountAtMost':
      if ((c.who !== 'self' && c.who !== 'enemy') || !isNonNegInt(c.value)) {
        errors.push(`${path} needs who (self|enemy) and a non-negative value`);
      }
      break;
    default:
      errors.push(`${path}.type "${String(c.type)}" is not a known condition`);
  }
}

function validateSelector(
  e: Rec,
  p: string,
  opts: EffectListOptions,
  errors: string[],
): TargetSelector | null {
  const t = e.target;
  const kind = String(e.type);
  let ok: boolean;
  if (LANDSCAPE_EFFECTS.includes(kind)) ok = includes(LANDSCAPE_SELECTORS, t);
  else if (BUILDING_EFFECTS.includes(kind)) ok = includes(BUILDING_SELECTORS, t);
  else if (CREATURE_ONLY_EFFECTS.includes(kind)) ok = includes(CREATURE_SELECTORS, t);
  else ok = includes(CREATURE_SELECTORS, t) || includes(HERO_SELECTORS, t);
  if (!ok) {
    errors.push(`${p}.target "${String(t)}" is not valid for a ${kind} effect`);
    return null;
  }
  const sel = t as TargetSelector;
  if (sel === 'self' && opts.source !== 'creature') errors.push(`${p}.target "self" is only for creatures`);
  else if (sel === 'thisBuilding' && opts.source !== 'building')
    errors.push(`${p}.target "thisBuilding" is only for buildings`);
  else if (LANE_SOURCE_SELECTORS.includes(sel) && opts.source !== 'creature' && opts.source !== 'building') {
    errors.push(`${p}.target "${sel}" needs a card in a lane and is not allowed on a ${opts.source}`);
  }
  if (CHOSEN_SELECTORS.includes(sel) && !opts.allowChosen) {
    errors.push(`${p}.target "${sel}" needs a player choice, which is not possible here`);
  }
  if (e.count !== undefined) {
    if (!RANDOM_SELECTORS.includes(sel)) errors.push(`${p}.count is only allowed with random selectors`);
    else if (!isPosInt(e.count)) errors.push(`${p}.count must be a positive integer`);
  }
  return sel;
}

export function validateEffects(
  effects: unknown,
  path: string,
  opts: EffectListOptions,
  errors: string[],
): void {
  if (!Array.isArray(effects) || effects.length === 0) {
    errors.push(`${path} must be a non-empty array`);
    return;
  }
  const chosenKinds = new Set<TargetSelector>();
  effects.forEach((e: unknown, i) => {
    const p = `${path}[${i}]`;
    if (!isRecord(e)) {
      errors.push(`${p} must be an object`);
      return;
    }
    const needsTarget = !UNTARGETED_EFFECTS.includes(String(e.type));
    if (needsTarget) {
      const sel = validateSelector(e, p, opts, errors);
      if (sel && CHOSEN_SELECTORS.includes(sel)) chosenKinds.add(sel);
    }
    if (e.when !== undefined) validateCondition(e.when, `${p}.when`, errors);
    if (e.filter !== undefined) validateFilter(e.filter, `${p}.filter`, errors);
    if (e.splash !== undefined && typeof e.splash !== 'boolean') errors.push(`${p}.splash must be boolean`);
    switch (e.type) {
      case 'damage':
      case 'heal':
        if (!isPositiveAmount(e.amount)) errors.push(`${p}.amount must be a positive integer or an amount`);
        else validateAmount(e.amount, `${p}.amount`, errors);
        if (e.type === 'damage' && e.stealOnKill !== undefined && typeof e.stealOnKill !== 'boolean')
          errors.push(`${p}.stealOnKill must be boolean`);
        break;
      case 'poison':
        if (!isPosInt(e.amount)) errors.push(`${p}.amount must be a positive integer`);
        break;
      case 'buff':
        validateAmount(e.atk, `${p}.atk`, errors);
        validateAmount(e.def, `${p}.def`, errors);
        if (e.atk === 0 && e.def === 0) errors.push(`${p} must change atk or def`);
        if (e.temporary !== undefined && typeof e.temporary !== 'boolean')
          errors.push(`${p}.temporary must be boolean`);
        if (e.duration !== undefined && !BUFF_DURATIONS.includes(String(e.duration)))
          errors.push(`${p}.duration must be one of ${BUFF_DURATIONS.join(', ')}`);
        break;
      case 'draw':
        if (!isPositiveAmount(e.amount)) errors.push(`${p}.amount must be a positive integer or an amount`);
        else validateAmount(e.amount, `${p}.amount`, errors);
        if (e.who !== undefined && e.who !== 'self' && e.who !== 'enemy')
          errors.push(`${p}.who must be self or enemy`);
        break;
      case 'discard':
        if (!isPosInt(e.amount)) errors.push(`${p}.amount must be a positive integer`);
        if (e.who !== undefined && e.who !== 'self' && e.who !== 'enemy')
          errors.push(`${p}.who must be self or enemy`);
        break;
      case 'gainMp':
        if (!isPositiveAmount(e.amount)) errors.push(`${p}.amount must be a positive integer or an amount`);
        else validateAmount(e.amount, `${p}.amount`, errors);
        if (e.nextTurn !== undefined && typeof e.nextTurn !== 'boolean')
          errors.push(`${p}.nextTurn must be boolean`);
        break;
      case 'loseMp':
      case 'chargeUltimate':
        if (!isPosInt(e.amount)) errors.push(`${p}.amount must be a positive integer`);
        break;
      case 'costMod':
        if (e.who !== 'self' && e.who !== 'enemy') errors.push(`${p}.who must be self or enemy`);
        if (!COST_KINDS.includes(String(e.kind)))
          errors.push(`${p}.kind must be one of ${COST_KINDS.join(', ')}`);
        if (!isInt(e.amount) || e.amount === 0) errors.push(`${p}.amount must be a non-zero integer`);
        if (e.landscape !== undefined && e.landscape !== 'neutral' && !includes(LANDSCAPE_TYPES, e.landscape))
          errors.push(`${p}.landscape is invalid`);
        break;
      case 'block':
        if (!PLAY_KINDS.includes(String(e.what)))
          errors.push(`${p}.what must be one of ${PLAY_KINDS.join(', ')}`);
        break;
      case 'recover':
        if (e.pick !== 'best' && e.pick !== 'random') errors.push(`${p}.pick must be best or random`);
        if (e.cardType !== undefined && !includes(CARD_TYPES, e.cardType))
          errors.push(`${p}.cardType is invalid`);
        if (e.count !== undefined && !isPosInt(e.count)) errors.push(`${p}.count must be a positive integer`);
        break;
      case 'tutor':
        if (e.cardType !== undefined && !includes(CARD_TYPES, e.cardType))
          errors.push(`${p}.cardType is invalid`);
        break;
      case 'cycleHand':
        if (!isPosInt(e.draw)) errors.push(`${p}.draw must be a positive integer`);
        break;
      case 'recoverDestroyed':
      case 'discardHand':
      case 'reset':
      case 'swapStats':
      case 'lockFloop':
      case 'lockAttack':
      case 'redirect':
      case 'forceAttack':
      case 'activateFloop':
      case 'seal':
      case 'wipeLane':
      case 'destroyBuilding':
      case 'returnBuilding':
      case 'moveBuilding':
        break;
      case 'summon':
        if (typeof e.cardId !== 'string') errors.push(`${p}.cardId is required`);
        if (!includes(SUMMON_LOCATIONS, e.where))
          errors.push(`${p}.where must be one of ${SUMMON_LOCATIONS.join(', ')}`);
        else if (
          (e.where === 'sourceLane' || e.where === 'adjacentEmptyLanes') &&
          opts.source !== 'creature' &&
          opts.source !== 'building'
        ) {
          errors.push(`${p}.where "${e.where}" needs a card in a lane`);
        }
        if (e.count !== undefined && !isPosInt(e.count)) errors.push(`${p}.count must be a positive integer`);
        break;
      case 'grantKeyword':
        if (typeof e.keyword !== 'string' || !parseKeyword(e.keyword))
          errors.push(`${p}.keyword "${String(e.keyword)}" is invalid`);
        break;
      case 'convert':
        if (!includes(LANDSCAPE_TYPES, e.to)) errors.push(`${p}.to must be a landscape type`);
        break;
      case 'destroy':
      case 'returnToHand':
      case 'move':
      case 'freeze':
      case 'shield':
      case 'flip':
      case 'restore':
        break;
      default:
        errors.push(`${p}.type "${String(e.type)}" is not a known effect type`);
    }
  });
  if (chosenKinds.size > 1) {
    errors.push(`${path} may use only one kind of chosen target (found ${[...chosenKinds].join(', ')})`);
  }
}

function validateAbilities(raw: unknown, path: string, source: SourceKind, errors: string[]): void {
  if (raw === undefined) return;
  if (!Array.isArray(raw)) {
    errors.push(`${path} must be an array`);
    return;
  }
  raw.forEach((a: unknown, i) => {
    const p = `${path}[${i}]`;
    if (!isRecord(a)) {
      errors.push(`${p} must be an object`);
      return;
    }
    if (!includes(TRIGGERS, a.trigger)) {
      errors.push(`${p}.trigger must be one of ${TRIGGERS.join(', ')}`);
      return;
    }
    if (source === 'spell') errors.push(`${p}: spells cannot have triggered abilities`);
    if (
      source === 'hero' &&
      (a.trigger === 'onPlay' ||
        a.trigger === 'onDestroy' ||
        a.trigger === 'onAttack' ||
        a.trigger === 'onDamaged')
    ) {
      errors.push(`${p}: heroes cannot use trigger ${a.trigger}`);
    }
    if (
      source === 'building' &&
      (a.trigger === 'onDestroy' || a.trigger === 'onAttack' || a.trigger === 'onDamaged')
    ) {
      errors.push(`${p}: buildings cannot use trigger ${a.trigger}`);
    }
    const laneTrigger = a.trigger === 'onLaneCreatureDestroyed' || a.trigger === 'onLaneCreaturePlayed';
    if (laneTrigger && source !== 'building')
      errors.push(`${p}: only buildings can use trigger ${a.trigger}`);
    if (a.trigger === 'onFloop' && source !== 'building' && source !== 'creature')
      errors.push(`${p}: trigger onFloop needs a card in a lane`);
    if (a.condition !== undefined) validateCondition(a.condition, `${p}.condition`, errors);
    validateEffects(a.effects, `${p}.effects`, { source, allowChosen: a.trigger === 'onPlay' }, errors);
  });
}

function validateStatics(raw: unknown, path: string, source: SourceKind, errors: string[]): void {
  if (raw === undefined) return;
  if (!Array.isArray(raw)) {
    errors.push(`${path} must be an array`);
    return;
  }
  raw.forEach((s: unknown, i) => {
    const p = `${path}[${i}]`;
    if (!isRecord(s)) {
      errors.push(`${p} must be an object`);
      return;
    }
    if (s.kind === 'spellPower') {
      if (!isPosInt(s.amount)) errors.push(`${p}.amount must be a positive integer`);
      return;
    }
    if (s.kind === 'laneRarityCap') {
      if (source !== 'building') errors.push(`${p}: laneRarityCap is only for buildings`);
      if (!isPosInt(s.maxStars)) errors.push(`${p}.maxStars must be a positive integer`);
      return;
    }
    const kinds = ['stat', 'keyword', 'swapStats', 'armor', 'floopCost'];
    if (!kinds.includes(String(s.kind))) {
      errors.push(`${p}.kind must be one of ${[...kinds, 'spellPower', 'laneRarityCap'].join(', ')}`);
      return;
    }
    if ((s.kind === 'armor' || s.kind === 'floopCost') && (!isInt(s.amount) || s.amount === 0))
      errors.push(`${p}.amount must be a non-zero integer`);
    if (!includes(STATIC_SCOPES, s.scope))
      errors.push(`${p}.scope must be one of ${STATIC_SCOPES.join(', ')}`);
    else {
      if (s.scope === 'self' && source !== 'creature') errors.push(`${p}.scope "self" is only for creatures`);
      if ((s.scope === 'lane' || s.scope === 'adjacent') && source !== 'creature' && source !== 'building') {
        errors.push(`${p}.scope "${s.scope}" needs a card in a lane`);
      }
      if (s.scope === 'lane' && source === 'creature')
        errors.push(`${p}.scope "lane" on a creature: use "self"`);
    }
    if (s.onLandscape !== undefined && !includes(LANDSCAPE_TYPES, s.onLandscape)) {
      errors.push(`${p}.onLandscape must be a landscape type`);
    }
    if (s.kind === 'stat') {
      validateAmount(s.atk, `${p}.atk`, errors, false);
      validateAmount(s.def, `${p}.def`, errors, false);
      if (s.atk === 0 && s.def === 0) errors.push(`${p} needs non-zero atk/def`);
    } else if (s.kind === 'keyword') {
      const parsed = typeof s.keyword === 'string' ? parseKeyword(s.keyword) : null;
      if (!parsed) errors.push(`${p}.keyword "${String(s.keyword)}" is invalid`);
      else if (parsed[0] === 'shield' || parsed[0] === 'stealth') {
        errors.push(`${p}: "${parsed[0]}" cannot be granted continuously (it is a one-time status)`);
      }
    }
  });
}

/** Validates one raw card. Returns problems prefixed with the card id. */
export function validateCardDef(raw: unknown, index = 0): string[] {
  const errors: string[] = [];
  if (!isRecord(raw)) return [`cards[${index}] must be an object`];
  const id = typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : `cards[${index}]`;
  const err = (m: string) => errors.push(`${id}: ${m}`);
  const sub: string[] = [];

  if (typeof raw.id !== 'string' || !/^[a-z0-9_]+$/.test(raw.id)) err('id must match /^[a-z0-9_]+$/');
  if (typeof raw.name !== 'string' || raw.name.trim() === '') err('name is required');
  if (!includes(CARD_TYPES, raw.type)) err(`type must be one of ${CARD_TYPES.join(', ')}`);
  if (raw.landscape !== 'neutral' && !includes(LANDSCAPE_TYPES, raw.landscape)) {
    err('landscape must be a landscape type or "neutral"');
  }
  if (!includes(RARITIES, raw.rarity)) err(`rarity must be one of ${RARITIES.join(', ')}`);
  if (!isNonNegInt(raw.cost)) err('cost must be a non-negative integer');
  if (typeof raw.text !== 'string') err('text must be a string');
  if (typeof raw.flavorText !== 'string') err('flavorText must be a string');
  if (typeof raw.artKey !== 'string' || raw.artKey === '') err('artKey is required');
  if (raw.token !== undefined && typeof raw.token !== 'boolean') err('token must be a boolean');
  if (raw.token === true && raw.type !== 'creature') err('only creatures can be tokens');
  if (raw.stars !== undefined && !isPosInt(raw.stars)) err('stars must be a positive integer');
  if (raw.variant !== undefined && typeof raw.variant !== 'string') err('variant must be a string');
  if (raw.image !== undefined && (typeof raw.image !== 'string' || raw.image === ''))
    err('image must be a path');

  if (!Array.isArray(raw.requirements)) {
    err('requirements must be an array');
  } else {
    const seen = new Set<string>();
    let total = 0;
    raw.requirements.forEach((r: unknown, i) => {
      if (!isRecord(r) || !includes(LANDSCAPE_TYPES, r.landscape) || !isPosInt(r.count)) {
        err(`requirements[${i}] must be { landscape, count >= 1 }`);
        return;
      }
      if (seen.has(r.landscape)) err(`requirements lists ${r.landscape} twice`);
      seen.add(r.landscape);
      total += r.count;
    });
    if (total > 4) err('requirements need more than 4 landscapes and can never be met');
  }

  const source: SourceKind =
    raw.type === 'creature' ? 'creature' : raw.type === 'building' ? 'building' : 'spell';
  validateAbilities(raw.abilities, `${id}: abilities`, source, sub);
  validateStatics(raw.statics, `${id}: statics`, source, sub);

  const hasRules =
    (Array.isArray(raw.abilities) && raw.abilities.length > 0) ||
    (Array.isArray(raw.statics) && raw.statics.length > 0) ||
    raw.floop !== undefined ||
    raw.type !== 'creature';
  if (hasRules && (typeof raw.text !== 'string' || raw.text.trim() === ''))
    err('text must describe the abilities');

  if (raw.type === 'creature') {
    if (!isNonNegInt(raw.atk)) err('atk must be a non-negative integer');
    if (!isPosInt(raw.def)) err('def must be a positive integer');
    if (!Array.isArray(raw.keywords)) err('keywords must be an array');
    else {
      for (const k of raw.keywords) {
        if (typeof k !== 'string' || !parseKeyword(k)) err(`keyword "${String(k)}" is invalid`);
      }
    }
    if (raw.floop !== undefined) {
      if (!isRecord(raw.floop)) err('floop must be an object');
      else {
        if (!isNonNegInt(raw.floop.cost)) err('floop.cost must be a non-negative integer');
        if (raw.floop.condition !== undefined)
          validateCondition(raw.floop.condition, `${id}: floop.condition`, sub);
        validateEffects(
          raw.floop.effects,
          `${id}: floop.effects`,
          { source: 'creature', allowChosen: true },
          sub,
        );
      }
    }
  } else if (raw.type === 'spell') {
    validateEffects(raw.effects, `${id}: effects`, { source: 'spell', allowChosen: true }, sub);
  } else if (raw.type === 'building') {
    const any =
      (Array.isArray(raw.abilities) && raw.abilities.length > 0) ||
      (Array.isArray(raw.statics) && raw.statics.length > 0);
    if (!any) err('buildings need at least one ability or static');
  }
  return [...errors, ...sub];
}

function summonIds(effects: readonly Effect[] | undefined): string[] {
  return (effects ?? []).filter((e) => e.type === 'summon').map((e) => (e as { cardId: string }).cardId);
}

/** All effect lists on a card (spell effects, floop, triggered abilities). */
export function allEffectLists(card: CardDef): Effect[][] {
  const lists: Effect[][] = [];
  if (card.type === 'spell') lists.push(card.effects);
  if (card.type === 'creature' && card.floop) lists.push(card.floop.effects);
  for (const a of card.abilities ?? []) lists.push(a.effects);
  return lists;
}

/** Builds a CardDb from raw JSON, throwing with every validation problem if invalid. */
export function createCardDb(raw: unknown): CardDb {
  if (!Array.isArray(raw)) throw new Error('Card data must be an array of cards');
  const errors = raw.flatMap((c, i) => validateCardDef(c, i));
  const byId = new Map<string, CardDef>();
  for (const c of raw as CardDef[]) {
    if (byId.has(c.id)) errors.push(`${c.id}: duplicate card id`);
    byId.set(c.id, c);
  }
  if (errors.length === 0) {
    for (const c of byId.values()) {
      for (const list of allEffectLists(c)) {
        for (const id of summonIds(list)) {
          const t = byId.get(id);
          if (!t || t.type !== 'creature' || !t.token)
            errors.push(`${c.id}: summons "${id}", which is not a token creature`);
        }
      }
    }
  }
  if (errors.length > 0) throw new Error(`Invalid card data:\n- ${errors.join('\n- ')}`);
  return { byId, all: [...byId.values()] };
}

export function validateHeroDef(raw: unknown, index = 0): string[] {
  if (!isRecord(raw)) return [`heroes[${index}] must be an object`];
  const id = typeof raw.id === 'string' ? raw.id : `heroes[${index}]`;
  const errors: string[] = [];
  const err = (m: string) => errors.push(`${id}: ${m}`);
  if (typeof raw.id !== 'string' || !/^[a-z0-9_]+$/.test(raw.id)) err('id must match /^[a-z0-9_]+$/');
  for (const f of ['name', 'title', 'artKey'] as const) {
    if (typeof raw[f] !== 'string' || raw[f] === '') err(`${f} is required`);
  }
  if (typeof raw.flavorText !== 'string') err('flavorText must be a string');
  if (raw.landscape !== 'neutral' && !includes(LANDSCAPE_TYPES, raw.landscape)) err('landscape is invalid');
  if (raw.boss !== undefined && typeof raw.boss !== 'boolean') err('boss must be true or false');
  if (
    !isRecord(raw.passive) ||
    typeof raw.passive.name !== 'string' ||
    typeof raw.passive.text !== 'string'
  ) {
    err('passive needs name and text');
  } else {
    validateAbilities(raw.passive.abilities, `${id}: passive.abilities`, 'hero', errors);
    validateStatics(raw.passive.statics, `${id}: passive.statics`, 'hero', errors);
  }
  if (
    !isRecord(raw.ultimate) ||
    typeof raw.ultimate.name !== 'string' ||
    typeof raw.ultimate.text !== 'string'
  ) {
    err('ultimate needs name and text');
  } else {
    validateEffects(
      raw.ultimate.effects,
      `${id}: ultimate.effects`,
      { source: 'hero', allowChosen: true },
      errors,
    );
    if (raw.ultimate.cooldown !== undefined && !isPosInt(raw.ultimate.cooldown))
      err('ultimate.cooldown must be a positive integer');
  }
  if (raw.image !== undefined && (typeof raw.image !== 'string' || raw.image === ''))
    err('image must be a path');
  return errors;
}

export function createHeroDb(raw: unknown, cards?: CardDb): HeroDb {
  if (!Array.isArray(raw)) throw new Error('Hero data must be an array');
  const errors = raw.flatMap((h, i) => validateHeroDef(h, i));
  const byId = new Map<string, HeroDef>();
  for (const h of raw as HeroDef[]) {
    if (byId.has(h.id)) errors.push(`${h.id}: duplicate hero id`);
    byId.set(h.id, h);
  }
  if (cards && errors.length === 0) {
    for (const h of byId.values()) {
      const lists = [h.ultimate.effects, ...(h.passive.abilities ?? []).map((a) => a.effects)];
      for (const list of lists) {
        for (const cid of summonIds(list)) {
          const t = cards.byId.get(cid);
          if (!t || t.type !== 'creature' || !t.token)
            errors.push(`${h.id}: summons "${cid}", which is not a token`);
        }
      }
    }
  }
  if (errors.length > 0) throw new Error(`Invalid hero data:\n- ${errors.join('\n- ')}`);
  return { byId, all: [...byId.values()] };
}

export function validateMatchRule(raw: unknown, index = 0): string[] {
  if (!isRecord(raw)) return [`rules[${index}] must be an object`];
  const id = typeof raw.id === 'string' ? raw.id : `rules[${index}]`;
  const errors: string[] = [];
  const err = (m: string) => errors.push(`${id}: ${m}`);
  if (typeof raw.id !== 'string' || !/^[a-z0-9_]+$/.test(raw.id)) err('id must match /^[a-z0-9_]+$/');
  for (const f of ['name', 'text'] as const) {
    if (typeof raw[f] !== 'string' || raw[f] === '') err(`${f} is required`);
  }
  validateAbilities(raw.abilities, `${id}: abilities`, 'hero', errors);
  validateStatics(raw.statics, `${id}: statics`, 'hero', errors);
  if (raw.heroHpDelta !== undefined && (!isInt(raw.heroHpDelta) || raw.heroHpDelta < -95))
    err('heroHpDelta must be an integer >= -95');
  if (raw.startingCharge !== undefined && (!isNonNegInt(raw.startingCharge) || raw.startingCharge > 100))
    err('startingCharge must be 0..100');
  if (raw.extraCards !== undefined && (!isInt(raw.extraCards) || Math.abs(raw.extraCards) > 3))
    err('extraCards must be -3..3');
  return errors;
}

/** Validates match rules (campaign modifiers, boss rules) and indexes them by id. */
export function createRuleDb(raw: unknown, cards: CardDb): ReadonlyMap<string, MatchRule> {
  if (!Array.isArray(raw)) throw new Error('Match rule data must be an array');
  const errors = raw.flatMap((r, i) => validateMatchRule(r, i));
  const byId = new Map<string, MatchRule>();
  for (const r of raw as MatchRule[]) {
    if (byId.has(r.id)) errors.push(`${r.id}: duplicate rule id`);
    byId.set(r.id, r);
  }
  if (errors.length === 0) {
    for (const r of byId.values()) {
      for (const a of r.abilities ?? []) {
        for (const cid of summonIds(a.effects)) {
          const t = cards.byId.get(cid);
          if (!t || t.type !== 'creature' || !t.token)
            errors.push(`${r.id}: summons "${cid}", which is not a token`);
        }
      }
    }
  }
  if (errors.length > 0) throw new Error(`Invalid match rules:\n- ${errors.join('\n- ')}`);
  return byId;
}

export function getCard(db: CardDb, id: string): CardDef {
  const card = db.byId.get(id);
  if (!card) throw new Error(`Unknown card id: ${id}`);
  return card;
}

export function getHero(db: HeroDb, id: string): HeroDef {
  const hero = db.byId.get(id);
  if (!hero) throw new Error(`Unknown hero id: ${id}`);
  return hero;
}

/** Heroes a player can build decks with (campaign bosses excluded). */
export function playableHeroes(db: HeroDb): HeroDef[] {
  return db.all.filter((h) => !h.boss);
}

/** Collectible (non-token) cards, e.g. for deck building and packs. */
export function collectibleCards(db: CardDb): CardDef[] {
  return db.all.filter((c) => !c.token);
}

const keywordCache = new WeakMap<CreatureDef, KeywordValues>();

/** Printed keywords of a creature card, parsed and cached. */
export function printedKeywords(card: CreatureDef): KeywordValues {
  let kw = keywordCache.get(card);
  if (!kw) {
    kw = addKeywords({}, card.keywords);
    keywordCache.set(card, kw);
  }
  return kw;
}

/** onPlay abilities of a card. */
export function onPlayAbilities(card: CardDef): TriggeredAbility[] {
  return (card.abilities ?? []).filter((a) => a.trigger === 'onPlay');
}

/** Effects whose targets are chosen when the card is played. */
export function playEffects(card: CardDef): Effect[] {
  if (card.type === 'spell') return card.effects;
  return onPlayAbilities(card).flatMap((a) => a.effects);
}

/** The single "chosen" selector used by a list of effects, if any. */
export function chosenSelector(effects: readonly Effect[]): TargetSelector | null {
  return chosenEffect(effects)?.target ?? null;
}

/** The first effect whose target the player chooses (its filter limits the choice). */
export function chosenEffect(effects: readonly Effect[]): (Effect & { target: TargetSelector }) | null {
  for (const e of effects) {
    if ('target' in e && CHOSEN_SELECTORS.includes(e.target)) return e;
  }
  return null;
}
