import { createClient } from "@supabase/supabase-js";
const keywords = [{ "id": "rush", "name": "Rush", "valued": false, "icon": "rush", "description": "Can attack the turn it is played." }, { "id": "guard", "name": "Guard", "valued": false, "icon": "guard", "description": "When an enemy attacks an empty lane next to this creature, this creature blocks instead of your Hero." }, { "id": "ranged", "name": "Ranged", "valued": false, "icon": "ranged", "description": "Ignores Guard, and takes no damage from Thorns or Counter." }, { "id": "lifesteal", "name": "Lifesteal", "valued": false, "icon": "lifesteal", "description": "Combat damage this creature deals also heals your Hero." }, { "id": "thorns", "name": "Thorns", "valued": true, "icon": "thorns", "description": "When attacked, deals X damage to the attacker, even if this creature is destroyed." }, { "id": "counter", "name": "Counter", "valued": false, "icon": "counter", "description": "When attacked and it survives, strikes back with its full ATK." }, { "id": "shield", "name": "Shield", "valued": false, "icon": "shield", "description": "Blocks the next damage completely, then breaks." }, { "id": "poison", "name": "Poison", "valued": true, "icon": "poison", "description": "Creatures damaged by this one are poisoned for X. A poisoned creature takes that much damage at the start of its owner's turn, then the poison drops by 1." }, { "id": "regenerate", "name": "Regenerate", "valued": true, "icon": "regenerate", "description": "Heals X damage at the start of your turn." }, { "id": "swift", "name": "Swift", "valued": false, "icon": "swift", "description": "Moving this creature costs no MP." }, { "id": "stealth", "name": "Stealth", "valued": false, "icon": "stealth", "description": "Your opponent cannot target it with spells or abilities until it attacks." }, { "id": "feast", "name": "Feast", "valued": true, "icon": "lifesteal", "description": "Heals X damage whenever it destroys a creature in combat." }];
const keywordData = {
  keywords
};
const LANDSCAPE_TYPES = ["azure", "golden", "murk", "dune", "candy", "ember"];
const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];
const CARD_TYPES = ["creature", "spell", "building"];
const KEYWORDS = [
  "rush",
  "guard",
  "ranged",
  "lifesteal",
  "thorns",
  "counter",
  "shield",
  "poison",
  "regenerate",
  "swift",
  "stealth",
  "feast"
];
const VALUED_KEYWORDS = ["thorns", "poison", "regenerate", "feast"];
const CREATURE_SELECTORS = [
  "self",
  "opposingCreature",
  "laneCreature",
  "adjacentAllies",
  "adjacentEnemies",
  "allAllyCreatures",
  "otherAllyCreatures",
  "allEnemyCreatures",
  "allCreatures",
  "randomEnemyCreature",
  "randomAllyCreature",
  "randomCreature",
  "weakestAllyCreature",
  "chosenCreature",
  "chosenEnemyCreature",
  "chosenAllyCreature"
];
const HERO_SELECTORS = ["ownHero", "enemyHero", "bothHeroes"];
const BUILDING_SELECTORS = [
  "thisBuilding",
  "opposingBuilding",
  "chosenEnemyBuilding",
  "chosenAllyBuilding",
  "allEnemyBuildings",
  "allAllyBuildings",
  "allBuildings"
];
const LANDSCAPE_SELECTORS = [
  "thisLandscape",
  "opposingLandscape",
  "chosenEnemyLandscape",
  "chosenAllyLandscape",
  "randomEnemyLandscape",
  "allAllyLandscapes",
  "allEnemyLandscapes"
];
const CHOSEN_SELECTORS = [
  "chosenCreature",
  "chosenEnemyCreature",
  "chosenAllyCreature",
  "chosenEnemyLandscape",
  "chosenAllyLandscape",
  "chosenEnemyBuilding",
  "chosenAllyBuilding"
];
const LANE_SOURCE_SELECTORS = [
  "self",
  "opposingCreature",
  "laneCreature",
  "adjacentAllies",
  "adjacentEnemies",
  "thisLandscape",
  "opposingLandscape",
  "thisBuilding",
  "opposingBuilding"
];
const RANDOM_SELECTORS = [
  "randomEnemyCreature",
  "randomAllyCreature",
  "randomCreature",
  "randomEnemyLandscape"
];
const SUMMON_LOCATIONS = [
  "sourceLane",
  "adjacentEmptyLanes",
  "randomEmptyLane",
  "allEmptyLanes"
];
const QUANTITIES = [
  "handSize",
  "enemyHandSize",
  "ownCreatures",
  "enemyCreatures",
  "ownBuildings",
  "enemyBuildings",
  "ownLandscapeTypes",
  "fieldLandscapeTypes",
  "ownLandscapesOf",
  "ownEmptyLanes",
  "adjacentEmptyLanes",
  "floopsThisTurn",
  "timesFlooped",
  "ownDiscard",
  "enemyDiscardCreatures",
  "selfAtk",
  "selfDef",
  "selfDamage",
  "opposingAtk",
  "targetAtk",
  "targetDef",
  "targetMaxDef",
  "targetDamage"
];
const STAT_QUANTITIES = [
  "selfAtk",
  "selfDef",
  "selfDamage",
  "opposingAtk",
  "targetAtk",
  "targetDef",
  "targetMaxDef",
  "targetDamage",
  "timesFlooped"
];
const TRIGGERS = [
  "onPlay",
  "onDestroy",
  "startOfTurn",
  "endOfTurn",
  "onAttack",
  "onDamaged",
  "onAllyCreaturePlayed",
  "onAllyCreatureDestroyed",
  "onEnemyCreatureDestroyed",
  "onSpellCast",
  /** Creatures: when this floops. Buildings: when the creature in their lane floops. */
  "onFloop",
  /** When any of your creatures floops. */
  "onAllyFloop",
  /** Buildings: when your creature in their lane is destroyed. */
  "onLaneCreatureDestroyed",
  /** Buildings: when you play a creature into their lane. */
  "onLaneCreaturePlayed"
];
const STATIC_SCOPES = ["self", "lane", "adjacent", "otherAllies", "allAllies", "allEnemies"];
function other(player) {
  return player === 0 ? 1 : 0;
}
const KEYWORD_INFO = keywordData.keywords;
function isKeyword(value) {
  return KEYWORDS.includes(value);
}
function parseKeyword(entry) {
  const [name, raw2] = entry.split(":");
  if (!name || !isKeyword(name)) return null;
  const valued = VALUED_KEYWORDS.includes(name);
  if (raw2 === void 0) return valued ? null : [name, 1];
  if (!valued) return null;
  const value = Number(raw2);
  if (!Number.isInteger(value) || value < 1) return null;
  return [name, value];
}
function addKeywords(into, entries) {
  for (const entry of entries) {
    const parsed = parseKeyword(entry);
    if (!parsed) continue;
    const [k, v] = parsed;
    into[k] = VALUED_KEYWORDS.includes(k) ? (into[k] ?? 0) + v : 1;
  }
  return into;
}
function validateKeywordData() {
  const ids = KEYWORD_INFO.map((k) => k.id);
  const errors2 = [];
  for (const k of KEYWORDS) if (!ids.includes(k)) errors2.push(`keywords.json is missing "${k}"`);
  for (const id of ids) if (!isKeyword(id)) errors2.push(`keywords.json has unknown keyword "${id}"`);
  for (const k of KEYWORD_INFO) {
    if (k.valued !== VALUED_KEYWORDS.includes(k.id))
      errors2.push(`keywords.json: "${k.id}" valued flag is wrong`);
  }
  return errors2;
}
function isRecord$1(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isNonNegInt(v) {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}
function isPosInt(v) {
  return isNonNegInt(v) && v > 0;
}
function isInt(v) {
  return typeof v === "number" && Number.isInteger(v);
}
function includes(list2, v) {
  return typeof v === "string" && list2.includes(v);
}
const CREATURE_ONLY_EFFECTS = [
  "buff",
  "destroy",
  "returnToHand",
  "move",
  "freeze",
  "poison",
  "shield",
  "grantKeyword",
  "reset",
  "swapStats",
  "lockFloop",
  "lockAttack",
  "redirect",
  "forceAttack",
  "activateFloop"
];
const LANDSCAPE_EFFECTS = ["flip", "convert", "restore", "seal", "wipeLane"];
const BUILDING_EFFECTS = ["destroyBuilding", "returnBuilding", "moveBuilding"];
const UNTARGETED_EFFECTS = [
  "draw",
  "discard",
  "gainMp",
  "loseMp",
  "summon",
  "chargeUltimate",
  "costMod",
  "block",
  "recover",
  "recoverDestroyed",
  "tutor",
  "cycleHand",
  "discardHand"
];
const COST_KINDS = ["card", "creature", "spell", "building", "floop"];
const PLAY_KINDS = ["creature", "spell", "building"];
const BUFF_DURATIONS = ["permanent", "turn", "round"];
function validateAmount(v, path, errors2, allowStat = true) {
  if (typeof v === "number") {
    if (!Number.isInteger(v)) errors2.push(`${path} must be an integer`);
    return;
  }
  if (!isRecord$1(v) || !includes(QUANTITIES, v.of)) {
    errors2.push(`${path} must be a number or { of: quantity, ... }`);
    return;
  }
  if (!allowStat && (STAT_QUANTITIES.includes(v.of) || STAT_QUANTITIES.includes(v.sub)))
    errors2.push(`${path}: "${v.of}" cannot be used here`);
  if (v.mul !== void 0 && typeof v.mul !== "number") errors2.push(`${path}.mul must be a number`);
  if (v.add !== void 0 && typeof v.add !== "number") errors2.push(`${path}.add must be a number`);
  if (v.div !== void 0 && !isPosInt(v.div)) errors2.push(`${path}.div must be a positive integer`);
  if (v.sub !== void 0 && !includes(QUANTITIES, v.sub)) errors2.push(`${path}.sub must be a quantity`);
  if (v.of === "ownLandscapesOf" && !includes(LANDSCAPE_TYPES, v.landscape))
    errors2.push(`${path}.landscape is required for ownLandscapesOf`);
}
function isPositiveAmount(v) {
  return typeof v === "number" ? isPosInt(v) : isRecord$1(v);
}
function validateFilter(f, path, errors2) {
  if (!isRecord$1(f)) {
    errors2.push(`${path} must be an object`);
    return;
  }
  if (f.landscape !== void 0 && f.landscape !== "neutral" && !includes(LANDSCAPE_TYPES, f.landscape))
    errors2.push(`${path}.landscape is invalid`);
  for (const k of ["maxStars", "minStars"])
    if (f[k] !== void 0 && !isPosInt(f[k])) errors2.push(`${path}.${k} must be a positive integer`);
  if (f.damaged !== void 0 && typeof f.damaged !== "boolean")
    errors2.push(`${path}.damaged must be boolean`);
}
function validateCondition(c, path, errors2) {
  if (!isRecord$1(c)) {
    errors2.push(`${path} must be an object`);
    return;
  }
  switch (c.type) {
    case "landscapeCount":
      if (!includes(LANDSCAPE_TYPES, c.landscape) || !isPosInt(c.atLeast)) {
        errors2.push(`${path} needs landscape and atLeast >= 1`);
      }
      break;
    case "opposingLaneEmpty":
    case "opposingLaneOccupied":
      break;
    case "heroHpAtMost":
    case "creatureCountAtLeast":
      if (c.who !== "self" && c.who !== "enemy" || !isNonNegInt(c.value)) {
        errors2.push(`${path} needs who (self|enemy) and a non-negative value`);
      }
      break;
    case "handSizeAtMost":
    case "handSizeAtLeast":
      if (!isNonNegInt(c.value)) errors2.push(`${path} needs a non-negative value`);
      break;
    case "creatureCountAtMost":
      if (c.who !== "self" && c.who !== "enemy" || !isNonNegInt(c.value)) {
        errors2.push(`${path} needs who (self|enemy) and a non-negative value`);
      }
      break;
    default:
      errors2.push(`${path}.type "${String(c.type)}" is not a known condition`);
  }
}
function validateSelector(e, p, opts, errors2) {
  const t = e.target;
  const kind = String(e.type);
  let ok;
  if (LANDSCAPE_EFFECTS.includes(kind)) ok = includes(LANDSCAPE_SELECTORS, t);
  else if (BUILDING_EFFECTS.includes(kind)) ok = includes(BUILDING_SELECTORS, t);
  else if (CREATURE_ONLY_EFFECTS.includes(kind)) ok = includes(CREATURE_SELECTORS, t);
  else ok = includes(CREATURE_SELECTORS, t) || includes(HERO_SELECTORS, t);
  if (!ok) {
    errors2.push(`${p}.target "${String(t)}" is not valid for a ${kind} effect`);
    return null;
  }
  const sel = t;
  if (sel === "self" && opts.source !== "creature") errors2.push(`${p}.target "self" is only for creatures`);
  else if (sel === "thisBuilding" && opts.source !== "building")
    errors2.push(`${p}.target "thisBuilding" is only for buildings`);
  else if (LANE_SOURCE_SELECTORS.includes(sel) && opts.source !== "creature" && opts.source !== "building") {
    errors2.push(`${p}.target "${sel}" needs a card in a lane and is not allowed on a ${opts.source}`);
  }
  if (CHOSEN_SELECTORS.includes(sel) && !opts.allowChosen) {
    errors2.push(`${p}.target "${sel}" needs a player choice, which is not possible here`);
  }
  if (e.count !== void 0) {
    if (!RANDOM_SELECTORS.includes(sel)) errors2.push(`${p}.count is only allowed with random selectors`);
    else if (!isPosInt(e.count)) errors2.push(`${p}.count must be a positive integer`);
  }
  return sel;
}
function validateEffects(effects, path, opts, errors2) {
  if (!Array.isArray(effects) || effects.length === 0) {
    errors2.push(`${path} must be a non-empty array`);
    return;
  }
  const chosenKinds = /* @__PURE__ */ new Set();
  effects.forEach((e, i) => {
    const p = `${path}[${i}]`;
    if (!isRecord$1(e)) {
      errors2.push(`${p} must be an object`);
      return;
    }
    const needsTarget = !UNTARGETED_EFFECTS.includes(String(e.type));
    if (needsTarget) {
      const sel = validateSelector(e, p, opts, errors2);
      if (sel && CHOSEN_SELECTORS.includes(sel)) chosenKinds.add(sel);
    }
    if (e.when !== void 0) validateCondition(e.when, `${p}.when`, errors2);
    if (e.filter !== void 0) validateFilter(e.filter, `${p}.filter`, errors2);
    if (e.splash !== void 0 && typeof e.splash !== "boolean") errors2.push(`${p}.splash must be boolean`);
    switch (e.type) {
      case "damage":
      case "heal":
        if (!isPositiveAmount(e.amount)) errors2.push(`${p}.amount must be a positive integer or an amount`);
        else validateAmount(e.amount, `${p}.amount`, errors2);
        if (e.type === "damage" && e.stealOnKill !== void 0 && typeof e.stealOnKill !== "boolean")
          errors2.push(`${p}.stealOnKill must be boolean`);
        break;
      case "poison":
        if (!isPosInt(e.amount)) errors2.push(`${p}.amount must be a positive integer`);
        break;
      case "buff":
        validateAmount(e.atk, `${p}.atk`, errors2);
        validateAmount(e.def, `${p}.def`, errors2);
        if (e.atk === 0 && e.def === 0) errors2.push(`${p} must change atk or def`);
        if (e.temporary !== void 0 && typeof e.temporary !== "boolean")
          errors2.push(`${p}.temporary must be boolean`);
        if (e.duration !== void 0 && !BUFF_DURATIONS.includes(String(e.duration)))
          errors2.push(`${p}.duration must be one of ${BUFF_DURATIONS.join(", ")}`);
        break;
      case "draw":
        if (!isPositiveAmount(e.amount)) errors2.push(`${p}.amount must be a positive integer or an amount`);
        else validateAmount(e.amount, `${p}.amount`, errors2);
        if (e.who !== void 0 && e.who !== "self" && e.who !== "enemy")
          errors2.push(`${p}.who must be self or enemy`);
        break;
      case "discard":
        if (!isPosInt(e.amount)) errors2.push(`${p}.amount must be a positive integer`);
        if (e.who !== void 0 && e.who !== "self" && e.who !== "enemy")
          errors2.push(`${p}.who must be self or enemy`);
        break;
      case "gainMp":
        if (!isPositiveAmount(e.amount)) errors2.push(`${p}.amount must be a positive integer or an amount`);
        else validateAmount(e.amount, `${p}.amount`, errors2);
        if (e.nextTurn !== void 0 && typeof e.nextTurn !== "boolean")
          errors2.push(`${p}.nextTurn must be boolean`);
        break;
      case "loseMp":
      case "chargeUltimate":
        if (!isPosInt(e.amount)) errors2.push(`${p}.amount must be a positive integer`);
        break;
      case "costMod":
        if (e.who !== "self" && e.who !== "enemy") errors2.push(`${p}.who must be self or enemy`);
        if (!COST_KINDS.includes(String(e.kind)))
          errors2.push(`${p}.kind must be one of ${COST_KINDS.join(", ")}`);
        if (!isInt(e.amount) || e.amount === 0) errors2.push(`${p}.amount must be a non-zero integer`);
        if (e.landscape !== void 0 && e.landscape !== "neutral" && !includes(LANDSCAPE_TYPES, e.landscape))
          errors2.push(`${p}.landscape is invalid`);
        break;
      case "block":
        if (!PLAY_KINDS.includes(String(e.what)))
          errors2.push(`${p}.what must be one of ${PLAY_KINDS.join(", ")}`);
        break;
      case "recover":
        if (e.pick !== "best" && e.pick !== "random") errors2.push(`${p}.pick must be best or random`);
        if (e.cardType !== void 0 && !includes(CARD_TYPES, e.cardType))
          errors2.push(`${p}.cardType is invalid`);
        if (e.count !== void 0 && !isPosInt(e.count)) errors2.push(`${p}.count must be a positive integer`);
        break;
      case "tutor":
        if (e.cardType !== void 0 && !includes(CARD_TYPES, e.cardType))
          errors2.push(`${p}.cardType is invalid`);
        break;
      case "cycleHand":
        if (!isPosInt(e.draw)) errors2.push(`${p}.draw must be a positive integer`);
        break;
      case "recoverDestroyed":
      case "discardHand":
      case "reset":
      case "swapStats":
      case "lockFloop":
      case "lockAttack":
      case "redirect":
      case "forceAttack":
      case "activateFloop":
      case "seal":
      case "wipeLane":
      case "destroyBuilding":
      case "returnBuilding":
      case "moveBuilding":
        break;
      case "summon":
        if (typeof e.cardId !== "string") errors2.push(`${p}.cardId is required`);
        if (!includes(SUMMON_LOCATIONS, e.where))
          errors2.push(`${p}.where must be one of ${SUMMON_LOCATIONS.join(", ")}`);
        else if ((e.where === "sourceLane" || e.where === "adjacentEmptyLanes") && opts.source !== "creature" && opts.source !== "building") {
          errors2.push(`${p}.where "${e.where}" needs a card in a lane`);
        }
        if (e.count !== void 0 && !isPosInt(e.count)) errors2.push(`${p}.count must be a positive integer`);
        break;
      case "grantKeyword":
        if (typeof e.keyword !== "string" || !parseKeyword(e.keyword))
          errors2.push(`${p}.keyword "${String(e.keyword)}" is invalid`);
        break;
      case "convert":
        if (!includes(LANDSCAPE_TYPES, e.to)) errors2.push(`${p}.to must be a landscape type`);
        break;
      case "destroy":
      case "returnToHand":
      case "move":
      case "freeze":
      case "shield":
      case "flip":
      case "restore":
        break;
      default:
        errors2.push(`${p}.type "${String(e.type)}" is not a known effect type`);
    }
  });
  if (chosenKinds.size > 1) {
    errors2.push(`${path} may use only one kind of chosen target (found ${[...chosenKinds].join(", ")})`);
  }
}
function validateAbilities(raw2, path, source, errors2) {
  if (raw2 === void 0) return;
  if (!Array.isArray(raw2)) {
    errors2.push(`${path} must be an array`);
    return;
  }
  raw2.forEach((a, i) => {
    const p = `${path}[${i}]`;
    if (!isRecord$1(a)) {
      errors2.push(`${p} must be an object`);
      return;
    }
    if (!includes(TRIGGERS, a.trigger)) {
      errors2.push(`${p}.trigger must be one of ${TRIGGERS.join(", ")}`);
      return;
    }
    if (source === "spell") errors2.push(`${p}: spells cannot have triggered abilities`);
    if (source === "hero" && (a.trigger === "onPlay" || a.trigger === "onDestroy" || a.trigger === "onAttack" || a.trigger === "onDamaged")) {
      errors2.push(`${p}: heroes cannot use trigger ${a.trigger}`);
    }
    if (source === "building" && (a.trigger === "onDestroy" || a.trigger === "onAttack" || a.trigger === "onDamaged")) {
      errors2.push(`${p}: buildings cannot use trigger ${a.trigger}`);
    }
    const laneTrigger = a.trigger === "onLaneCreatureDestroyed" || a.trigger === "onLaneCreaturePlayed";
    if (laneTrigger && source !== "building")
      errors2.push(`${p}: only buildings can use trigger ${a.trigger}`);
    if (a.trigger === "onFloop" && source !== "building" && source !== "creature")
      errors2.push(`${p}: trigger onFloop needs a card in a lane`);
    if (a.condition !== void 0) validateCondition(a.condition, `${p}.condition`, errors2);
    validateEffects(a.effects, `${p}.effects`, { source, allowChosen: a.trigger === "onPlay" }, errors2);
  });
}
function validateStatics(raw2, path, source, errors2) {
  if (raw2 === void 0) return;
  if (!Array.isArray(raw2)) {
    errors2.push(`${path} must be an array`);
    return;
  }
  raw2.forEach((s, i) => {
    const p = `${path}[${i}]`;
    if (!isRecord$1(s)) {
      errors2.push(`${p} must be an object`);
      return;
    }
    if (s.kind === "spellPower") {
      if (!isPosInt(s.amount)) errors2.push(`${p}.amount must be a positive integer`);
      return;
    }
    if (s.kind === "laneRarityCap") {
      if (source !== "building") errors2.push(`${p}: laneRarityCap is only for buildings`);
      if (!isPosInt(s.maxStars)) errors2.push(`${p}.maxStars must be a positive integer`);
      return;
    }
    const kinds = ["stat", "keyword", "swapStats", "armor", "floopCost"];
    if (!kinds.includes(String(s.kind))) {
      errors2.push(`${p}.kind must be one of ${[...kinds, "spellPower", "laneRarityCap"].join(", ")}`);
      return;
    }
    if ((s.kind === "armor" || s.kind === "floopCost") && (!isInt(s.amount) || s.amount === 0))
      errors2.push(`${p}.amount must be a non-zero integer`);
    if (!includes(STATIC_SCOPES, s.scope))
      errors2.push(`${p}.scope must be one of ${STATIC_SCOPES.join(", ")}`);
    else {
      if (s.scope === "self" && source !== "creature") errors2.push(`${p}.scope "self" is only for creatures`);
      if ((s.scope === "lane" || s.scope === "adjacent") && source !== "creature" && source !== "building") {
        errors2.push(`${p}.scope "${s.scope}" needs a card in a lane`);
      }
      if (s.scope === "lane" && source === "creature")
        errors2.push(`${p}.scope "lane" on a creature: use "self"`);
    }
    if (s.onLandscape !== void 0 && !includes(LANDSCAPE_TYPES, s.onLandscape)) {
      errors2.push(`${p}.onLandscape must be a landscape type`);
    }
    if (s.kind === "stat") {
      validateAmount(s.atk, `${p}.atk`, errors2, false);
      validateAmount(s.def, `${p}.def`, errors2, false);
      if (s.atk === 0 && s.def === 0) errors2.push(`${p} needs non-zero atk/def`);
    } else if (s.kind === "keyword") {
      const parsed = typeof s.keyword === "string" ? parseKeyword(s.keyword) : null;
      if (!parsed) errors2.push(`${p}.keyword "${String(s.keyword)}" is invalid`);
      else if (parsed[0] === "shield" || parsed[0] === "stealth") {
        errors2.push(`${p}: "${parsed[0]}" cannot be granted continuously (it is a one-time status)`);
      }
    }
  });
}
function validateCardDef(raw2, index = 0) {
  const errors2 = [];
  if (!isRecord$1(raw2)) return [`cards[${index}] must be an object`];
  const id = typeof raw2.id === "string" && raw2.id.length > 0 ? raw2.id : `cards[${index}]`;
  const err = (m) => errors2.push(`${id}: ${m}`);
  const sub = [];
  if (typeof raw2.id !== "string" || !/^[a-z0-9_]+$/.test(raw2.id)) err("id must match /^[a-z0-9_]+$/");
  if (typeof raw2.name !== "string" || raw2.name.trim() === "") err("name is required");
  if (!includes(CARD_TYPES, raw2.type)) err(`type must be one of ${CARD_TYPES.join(", ")}`);
  if (raw2.landscape !== "neutral" && !includes(LANDSCAPE_TYPES, raw2.landscape)) {
    err('landscape must be a landscape type or "neutral"');
  }
  if (!includes(RARITIES, raw2.rarity)) err(`rarity must be one of ${RARITIES.join(", ")}`);
  if (!isNonNegInt(raw2.cost)) err("cost must be a non-negative integer");
  if (typeof raw2.text !== "string") err("text must be a string");
  if (typeof raw2.flavorText !== "string") err("flavorText must be a string");
  if (typeof raw2.artKey !== "string" || raw2.artKey === "") err("artKey is required");
  if (raw2.token !== void 0 && typeof raw2.token !== "boolean") err("token must be a boolean");
  if (raw2.token === true && raw2.type !== "creature") err("only creatures can be tokens");
  if (raw2.stars !== void 0 && !isPosInt(raw2.stars)) err("stars must be a positive integer");
  if (raw2.variant !== void 0 && typeof raw2.variant !== "string") err("variant must be a string");
  if (raw2.image !== void 0 && (typeof raw2.image !== "string" || raw2.image === ""))
    err("image must be a path");
  if (!Array.isArray(raw2.requirements)) {
    err("requirements must be an array");
  } else {
    const seen = /* @__PURE__ */ new Set();
    let total = 0;
    raw2.requirements.forEach((r, i) => {
      if (!isRecord$1(r) || !includes(LANDSCAPE_TYPES, r.landscape) || !isPosInt(r.count)) {
        err(`requirements[${i}] must be { landscape, count >= 1 }`);
        return;
      }
      if (seen.has(r.landscape)) err(`requirements lists ${r.landscape} twice`);
      seen.add(r.landscape);
      total += r.count;
    });
    if (total > 4) err("requirements need more than 4 landscapes and can never be met");
  }
  const source = raw2.type === "creature" ? "creature" : raw2.type === "building" ? "building" : "spell";
  validateAbilities(raw2.abilities, `${id}: abilities`, source, sub);
  validateStatics(raw2.statics, `${id}: statics`, source, sub);
  const hasRules = Array.isArray(raw2.abilities) && raw2.abilities.length > 0 || Array.isArray(raw2.statics) && raw2.statics.length > 0 || raw2.floop !== void 0 || raw2.type !== "creature";
  if (hasRules && (typeof raw2.text !== "string" || raw2.text.trim() === ""))
    err("text must describe the abilities");
  if (raw2.type === "creature") {
    if (!isNonNegInt(raw2.atk)) err("atk must be a non-negative integer");
    if (!isPosInt(raw2.def)) err("def must be a positive integer");
    if (!Array.isArray(raw2.keywords)) err("keywords must be an array");
    else {
      for (const k of raw2.keywords) {
        if (typeof k !== "string" || !parseKeyword(k)) err(`keyword "${String(k)}" is invalid`);
      }
    }
    if (raw2.floop !== void 0) {
      if (!isRecord$1(raw2.floop)) err("floop must be an object");
      else {
        if (!isNonNegInt(raw2.floop.cost)) err("floop.cost must be a non-negative integer");
        if (raw2.floop.condition !== void 0)
          validateCondition(raw2.floop.condition, `${id}: floop.condition`, sub);
        validateEffects(
          raw2.floop.effects,
          `${id}: floop.effects`,
          { source: "creature", allowChosen: true },
          sub
        );
      }
    }
  } else if (raw2.type === "spell") {
    validateEffects(raw2.effects, `${id}: effects`, { source: "spell", allowChosen: true }, sub);
  } else if (raw2.type === "building") {
    const any = Array.isArray(raw2.abilities) && raw2.abilities.length > 0 || Array.isArray(raw2.statics) && raw2.statics.length > 0;
    if (!any) err("buildings need at least one ability or static");
  }
  return [...errors2, ...sub];
}
function summonIds(effects) {
  return (effects ?? []).filter((e) => e.type === "summon").map((e) => e.cardId);
}
function allEffectLists(card) {
  const lists = [];
  if (card.type === "spell") lists.push(card.effects);
  if (card.type === "creature" && card.floop) lists.push(card.floop.effects);
  for (const a of card.abilities ?? []) lists.push(a.effects);
  return lists;
}
function createCardDb(raw2) {
  if (!Array.isArray(raw2)) throw new Error("Card data must be an array of cards");
  const errors2 = raw2.flatMap((c, i) => validateCardDef(c, i));
  const byId = /* @__PURE__ */ new Map();
  for (const c of raw2) {
    if (byId.has(c.id)) errors2.push(`${c.id}: duplicate card id`);
    byId.set(c.id, c);
  }
  if (errors2.length === 0) {
    for (const c of byId.values()) {
      for (const list2 of allEffectLists(c)) {
        for (const id of summonIds(list2)) {
          const t = byId.get(id);
          if (!t || t.type !== "creature" || !t.token)
            errors2.push(`${c.id}: summons "${id}", which is not a token creature`);
        }
      }
    }
  }
  if (errors2.length > 0) throw new Error(`Invalid card data:
- ${errors2.join("\n- ")}`);
  return { byId, all: [...byId.values()] };
}
function validateHeroDef(raw2, index = 0) {
  if (!isRecord$1(raw2)) return [`heroes[${index}] must be an object`];
  const id = typeof raw2.id === "string" ? raw2.id : `heroes[${index}]`;
  const errors2 = [];
  const err = (m) => errors2.push(`${id}: ${m}`);
  if (typeof raw2.id !== "string" || !/^[a-z0-9_]+$/.test(raw2.id)) err("id must match /^[a-z0-9_]+$/");
  for (const f of ["name", "title", "artKey"]) {
    if (typeof raw2[f] !== "string" || raw2[f] === "") err(`${f} is required`);
  }
  if (typeof raw2.flavorText !== "string") err("flavorText must be a string");
  if (raw2.landscape !== "neutral" && !includes(LANDSCAPE_TYPES, raw2.landscape)) err("landscape is invalid");
  if (raw2.boss !== void 0 && typeof raw2.boss !== "boolean") err("boss must be true or false");
  if (!isRecord$1(raw2.passive) || typeof raw2.passive.name !== "string" || typeof raw2.passive.text !== "string") {
    err("passive needs name and text");
  } else {
    validateAbilities(raw2.passive.abilities, `${id}: passive.abilities`, "hero", errors2);
    validateStatics(raw2.passive.statics, `${id}: passive.statics`, "hero", errors2);
  }
  if (!isRecord$1(raw2.ultimate) || typeof raw2.ultimate.name !== "string" || typeof raw2.ultimate.text !== "string") {
    err("ultimate needs name and text");
  } else {
    validateEffects(
      raw2.ultimate.effects,
      `${id}: ultimate.effects`,
      { source: "hero", allowChosen: true },
      errors2
    );
    if (raw2.ultimate.cooldown !== void 0 && !isPosInt(raw2.ultimate.cooldown))
      err("ultimate.cooldown must be a positive integer");
  }
  if (raw2.image !== void 0 && (typeof raw2.image !== "string" || raw2.image === ""))
    err("image must be a path");
  return errors2;
}
function createHeroDb(raw2, cards) {
  if (!Array.isArray(raw2)) throw new Error("Hero data must be an array");
  const errors2 = raw2.flatMap((h, i) => validateHeroDef(h, i));
  const byId = /* @__PURE__ */ new Map();
  for (const h of raw2) {
    if (byId.has(h.id)) errors2.push(`${h.id}: duplicate hero id`);
    byId.set(h.id, h);
  }
  if (cards && errors2.length === 0) {
    for (const h of byId.values()) {
      const lists = [h.ultimate.effects, ...(h.passive.abilities ?? []).map((a) => a.effects)];
      for (const list2 of lists) {
        for (const cid of summonIds(list2)) {
          const t = cards.byId.get(cid);
          if (!t || t.type !== "creature" || !t.token)
            errors2.push(`${h.id}: summons "${cid}", which is not a token`);
        }
      }
    }
  }
  if (errors2.length > 0) throw new Error(`Invalid hero data:
- ${errors2.join("\n- ")}`);
  return { byId, all: [...byId.values()] };
}
function getCard(db, id) {
  const card = db.byId.get(id);
  if (!card) throw new Error(`Unknown card id: ${id}`);
  return card;
}
function getHero(db, id) {
  const hero = db.byId.get(id);
  if (!hero) throw new Error(`Unknown hero id: ${id}`);
  return hero;
}
const keywordCache = /* @__PURE__ */ new WeakMap();
function printedKeywords(card) {
  let kw = keywordCache.get(card);
  if (!kw) {
    kw = addKeywords({}, card.keywords);
    keywordCache.set(card, kw);
  }
  return kw;
}
function onPlayAbilities(card) {
  return (card.abilities ?? []).filter((a) => a.trigger === "onPlay");
}
function playEffects(card) {
  if (card.type === "spell") return card.effects;
  return onPlayAbilities(card).flatMap((a) => a.effects);
}
function chosenSelector(effects) {
  return chosenEffect(effects)?.target ?? null;
}
function chosenEffect(effects) {
  for (const e of effects) {
    if ("target" in e && CHOSEN_SELECTORS.includes(e.target)) return e;
  }
  return null;
}
let readers = null;
function setStatReaders(r) {
  readers = r;
}
function creatureCount(state, p) {
  return state.players[p].lanes.filter((l) => l.creature).length;
}
function sourceCreature(state, scope) {
  if (scope.lane === null || scope.iid === null) return null;
  const c = state.players[scope.owner].lanes[scope.lane]?.creature;
  return c && c.iid === scope.iid ? c : null;
}
function quantity(state, ctx, q, scope, landscape) {
  const me = state.players[scope.owner];
  const opp = state.players[other(scope.owner)];
  const r = readers;
  const self = () => sourceCreature(state, scope);
  const tgt = () => {
    const t = scope.target;
    if (!t) return null;
    const c = state.players[t.player].lanes[t.lane]?.creature;
    return c ? { c, lane: t.lane } : null;
  };
  switch (q) {
    case "handSize":
      return me.hand.length;
    case "enemyHandSize":
      return opp.hand.length;
    case "ownCreatures":
      return creatureCount(state, scope.owner);
    case "enemyCreatures":
      return creatureCount(state, other(scope.owner));
    case "ownBuildings":
      return me.lanes.filter((l) => l.building).length;
    case "enemyBuildings":
      return opp.lanes.filter((l) => l.building).length;
    case "ownLandscapeTypes":
      return new Set(me.lanes.filter((l) => l.landscape && !l.flipped).map((l) => l.landscape)).size;
    case "fieldLandscapeTypes":
      return new Set(
        [...me.lanes, ...opp.lanes].filter((l) => l.landscape && !l.flipped).map((l) => l.landscape)
      ).size;
    case "ownLandscapesOf":
      return me.lanes.filter((l) => !l.flipped && l.landscape === landscape).length;
    case "ownEmptyLanes":
      return me.lanes.filter((l) => !l.creature).length;
    case "adjacentEmptyLanes": {
      if (scope.lane === null) return 0;
      return [scope.lane - 1, scope.lane + 1].filter((i) => me.lanes[i] && !me.lanes[i].creature).length;
    }
    case "floopsThisTurn":
      return me.floopsThisTurn ?? 0;
    case "timesFlooped":
      return self()?.floopCount ?? 0;
    case "ownDiscard":
      return me.discard.length;
    case "enemyDiscardCreatures":
      return opp.discard.filter((c) => ctx.cards.byId.get(c.cardId)?.type === "creature").length;
    case "selfAtk": {
      const c = self();
      return c ? r.atk(state, ctx, c, scope.lane) : 0;
    }
    case "selfDef": {
      const c = self();
      return c ? Math.max(0, r.def(state, ctx, c, scope.lane)) : 0;
    }
    case "selfDamage":
      return self()?.damage ?? 0;
    case "opposingAtk": {
      if (scope.lane === null) return 0;
      const c = opp.lanes[scope.lane]?.creature;
      return c ? r.atk(state, ctx, c, scope.lane) : 0;
    }
    case "targetAtk": {
      const t = tgt();
      return t ? r.atk(state, ctx, t.c, t.lane) : 0;
    }
    case "targetDef": {
      const t = tgt();
      return t ? Math.max(0, r.def(state, ctx, t.c, t.lane)) : 0;
    }
    case "targetMaxDef": {
      const t = tgt();
      return t ? r.maxDef(state, ctx, t.c, t.lane) : 0;
    }
    case "targetDamage":
      return tgt()?.c.damage ?? 0;
  }
}
function evalAmount(state, ctx, a, scope) {
  if (typeof a === "number") return a;
  const q = quantity(state, ctx, a.of, scope, a.landscape);
  const base = a.div ? Math.floor(q / a.div) : q;
  let v = (a.mul ?? 1) * base + (a.add ?? 0);
  if (a.sub) v -= quantity(state, ctx, a.sub, scope);
  return Math.trunc(v);
}
function starsOf(card) {
  return card.stars ?? RARITIES.indexOf(card.rarity) + 1;
}
function matchesFilter(ctx, c, filter) {
  if (!filter) return true;
  const card = getCard(ctx.cards, c.cardId);
  if (filter.landscape !== void 0 && card.landscape !== filter.landscape) return false;
  const stars = starsOf(card);
  if (filter.maxStars !== void 0 && stars > filter.maxStars) return false;
  if (filter.minStars !== void 0 && stars < filter.minStars) return false;
  if (filter.damaged && c.damage <= 0) return false;
  return true;
}
function nextTurnOf(state, player) {
  return state.activePlayer === player ? state.turn + 2 : state.turn + 1;
}
const version = 1;
const match = { "heroMaxHp": 100, "laneCount": 4, "deckSize": 40, "maxCopiesCommon": 3, "maxCopiesUncommon": 3, "maxCopiesRare": 3, "maxCopiesEpic": 1, "maxCopiesLegendary": 1, "firstPlayerHandSize": 5, "secondPlayerHandSize": 6, "firstPlayerSkipsFirstDraw": true, "mulligansAllowed": 1, "startingMp": 2, "mpPerTurn": 1, "maxMp": 8, "extraDrawCost": 1, "extraDrawsPerTurn": 1, "moveCost": 1, "maxMovesPerCreaturePerTurn": 1, "fatigueDamage": 5, "maxHandSize": 8, "ultimateChargePerDamage": 10, "ultimateChargeMax": 100, "maxEffectResolutionsPerAction": 200, "maxTurns": 60 };
const online = { "turnTimerSeconds": 60, "reconnectGraceSeconds": 60, "rankedCardLevel": 3 };
const cardLevels = [{ "level": 1, "atk": 0, "def": 0, "ability": 0 }, { "level": 2, "atk": 0, "def": 2, "ability": 0 }, { "level": 3, "atk": 2, "def": 3, "ability": 1 }, { "level": 4, "atk": 3, "def": 5, "ability": 2 }, { "level": 5, "atk": 5, "def": 7, "ability": 3 }];
const rawBalance = {
  version,
  match,
  online,
  cardLevels
};
const MATCH_INT_KEYS = [
  "heroMaxHp",
  "laneCount",
  "deckSize",
  "maxCopiesCommon",
  "maxCopiesUncommon",
  "maxCopiesRare",
  "maxCopiesEpic",
  "maxCopiesLegendary",
  "firstPlayerHandSize",
  "secondPlayerHandSize",
  "mulligansAllowed",
  "startingMp",
  "mpPerTurn",
  "maxMp",
  "extraDrawCost",
  "extraDrawsPerTurn",
  "moveCost",
  "maxMovesPerCreaturePerTurn",
  "fatigueDamage",
  "maxHandSize",
  "ultimateChargePerDamage",
  "ultimateChargeMax",
  "maxEffectResolutionsPerAction",
  "maxTurns"
];
const ONLINE_KEYS = [
  "turnTimerSeconds",
  "reconnectGraceSeconds",
  "rankedCardLevel"
];
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function checkNonNegativeInts(obj, keys, path, errors2) {
  if (!isRecord(obj)) {
    errors2.push(`${path} must be an object`);
    return;
  }
  for (const key of keys) {
    const v = obj[key];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
      errors2.push(`${path}.${key} must be a non-negative integer (got ${JSON.stringify(v)})`);
    }
  }
}
function validateBalance(value) {
  if (!isRecord(value)) return ["balance must be an object"];
  const errors2 = [];
  checkNonNegativeInts(value.match, MATCH_INT_KEYS, "match", errors2);
  if (isRecord(value.match) && typeof value.match.firstPlayerSkipsFirstDraw !== "boolean") {
    errors2.push("match.firstPlayerSkipsFirstDraw must be a boolean");
  }
  checkNonNegativeInts(value.online, ONLINE_KEYS, "online", errors2);
  if (!Array.isArray(value.cardLevels) || value.cardLevels.length === 0) {
    errors2.push("cardLevels must be a non-empty array");
  } else {
    value.cardLevels.forEach((l, i) => {
      checkNonNegativeInts(l, ["level", "atk", "def", "ability"], `cardLevels[${i}]`, errors2);
      if (isRecord(l) && l.level !== i + 1) errors2.push(`cardLevels[${i}].level must be ${i + 1}`);
    });
  }
  if (errors2.length > 0) return errors2;
  const m = value.match;
  if (m.heroMaxHp < 1) errors2.push("match.heroMaxHp must be >= 1");
  if (m.laneCount < 1) errors2.push("match.laneCount must be >= 1");
  if (m.deckSize < 1) errors2.push("match.deckSize must be >= 1");
  if (m.startingMp > m.maxMp) errors2.push("match.startingMp must be <= match.maxMp");
  if (m.firstPlayerHandSize > m.maxHandSize || m.secondPlayerHandSize > m.maxHandSize) {
    errors2.push("starting hand sizes must be <= match.maxHandSize");
  }
  if (m.ultimateChargeMax < 1) errors2.push("match.ultimateChargeMax must be >= 1");
  if (m.maxEffectResolutionsPerAction < 1) errors2.push("match.maxEffectResolutionsPerAction must be >= 1");
  return errors2;
}
function load() {
  const errors2 = validateBalance(rawBalance);
  if (errors2.length > 0) throw new Error(`Invalid balance.json:
- ${errors2.join("\n- ")}`);
  const b = rawBalance;
  return Object.freeze({
    ...b,
    match: Object.freeze({ ...b.match }),
    online: Object.freeze({ ...b.online }),
    cardLevels: Object.freeze(b.cardLevels.map((l) => Object.freeze({ ...l })))
  });
}
function levelBonus(level) {
  const table = BALANCE.cardLevels;
  return table[Math.max(1, Math.min(table.length, Math.floor(level))) - 1];
}
const BALANCE = load();
function maxCopiesFor(rarity, balance) {
  switch (rarity) {
    case "common":
      return balance.maxCopiesCommon;
    case "uncommon":
      return balance.maxCopiesUncommon;
    case "rare":
      return balance.maxCopiesRare;
    case "epic":
      return balance.maxCopiesEpic;
    case "legendary":
      return balance.maxCopiesLegendary;
  }
}
function validateDeck(deck, ctx) {
  const { cards, heroes, balance } = ctx;
  const errors2 = [];
  if (typeof deck.heroId !== "string" || deck.heroId === "") errors2.push("Deck needs a hero.");
  else if (!heroes.byId.has(deck.heroId)) errors2.push(`Unknown hero "${deck.heroId}".`);
  if (!Array.isArray(deck.landscapes) || deck.landscapes.length !== balance.laneCount) {
    errors2.push(`Deck needs exactly ${balance.laneCount} landscapes.`);
  } else {
    for (const l of deck.landscapes) {
      if (!LANDSCAPE_TYPES.includes(l)) errors2.push(`Unknown landscape "${l}".`);
    }
  }
  if (!Array.isArray(deck.cards)) return [...errors2, "Deck cards must be a list."];
  if (deck.cards.length !== balance.deckSize) {
    errors2.push(`Deck has ${deck.cards.length} cards; it needs exactly ${balance.deckSize}.`);
  }
  const counts = /* @__PURE__ */ new Map();
  for (const id of deck.cards) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, n] of counts) {
    const card = cards.byId.get(id);
    if (!card) {
      errors2.push(`Unknown card "${id}".`);
      continue;
    }
    if (card.token) {
      errors2.push(`${card.name} is a token and cannot be put in a deck.`);
      continue;
    }
    const max = maxCopiesFor(card.rarity, balance);
    if (n > max) errors2.push(`${card.name}: ${n} copies, max ${max} for ${card.rarity} cards.`);
  }
  return errors2;
}
function expandCounts(counts) {
  return Object.entries(counts).flatMap(([id, n]) => Array.from({ length: n }, () => id));
}
function nextFloat(state) {
  const next = state + 1831565813 >>> 0;
  let t = next;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  const value = ((t ^ t >>> 14) >>> 0) / 4294967296;
  return [value, next];
}
function hashString(input) {
  let h1 = 3735928559;
  let h2 = 1103547991;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
  h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
  return (h1 ^ h2) >>> 0;
}
function toSeed(seed) {
  if (typeof seed === "string") return hashString(seed);
  if (!Number.isFinite(seed)) throw new Error(`Invalid RNG seed: ${seed}`);
  return Math.floor(seed) >>> 0;
}
class Rng {
  s;
  constructor(seed) {
    this.s = toSeed(seed);
  }
  /** Restores a generator from a previously saved state (no re-hashing). */
  static fromState(state) {
    const rng = new Rng(0);
    rng.s = state >>> 0;
    return rng;
  }
  get state() {
    return this.s;
  }
  /** Float in [0, 1). */
  next() {
    const [value, next] = nextFloat(this.s);
    this.s = next;
    return value;
  }
  /** Integer in [min, max] inclusive. */
  int(min, max) {
    if (!Number.isInteger(min) || !Number.isInteger(max)) throw new Error("Rng.int bounds must be integers");
    if (max < min) throw new Error(`Rng.int: max (${max}) < min (${min})`);
    return min + Math.floor(this.next() * (max - min + 1));
  }
  /** True with the given probability (0..1). */
  chance(probability) {
    return this.next() < probability;
  }
  /** Uniformly picks one element. Throws on an empty array. */
  pick(items) {
    if (items.length === 0) throw new Error("Rng.pick: empty array");
    return items[this.int(0, items.length - 1)];
  }
  /** Picks one element using non-negative weights. */
  weighted(items, weights2) {
    if (items.length === 0 || items.length !== weights2.length) {
      throw new Error("Rng.weighted: items and weights must be non-empty and equal length");
    }
    let total = 0;
    for (const w of weights2) {
      if (w < 0 || !Number.isFinite(w)) throw new Error("Rng.weighted: invalid weight");
      total += w;
    }
    if (total <= 0) throw new Error("Rng.weighted: total weight must be > 0");
    let roll = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      roll -= weights2[i];
      if (roll < 0) return items[i];
    }
    return items[items.length - 1];
  }
  /** Returns a new shuffled array (Fisher-Yates). The input is not modified. */
  shuffle(items) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }
  /** Picks `count` distinct elements (or all of them, if fewer exist). */
  sample(items, count) {
    return this.shuffle(items).slice(0, Math.max(0, count));
  }
  /** Derives an independent child generator, e.g. one per AI simulation. */
  fork(label) {
    return new Rng((hashString(label) ^ this.int(0, 4294967295)) >>> 0);
  }
}
function createGame(options, ctx) {
  const b = ctx.balance;
  options.decks.forEach((deck, i) => {
    if (!options.skipDeckValidation) {
      const errors2 = validateDeck(deck, ctx);
      if (errors2.length > 0) throw new Error(`Deck ${i + 1} is illegal:
- ${errors2.join("\n- ")}`);
    } else {
      getHero(ctx.heroes, deck.heroId);
      for (const id of deck.cards) getCard(ctx.cards, id);
    }
  });
  const seed = toSeed(options.seed);
  const rng = Rng.fromState(seed);
  let nextInstanceId = 1;
  const maxLevel2 = BALANCE.cardLevels.length;
  const cardLevelsFor = (deck) => {
    const out = {};
    for (const id of new Set(deck.cards)) {
      const raw2 = options.fixedCardLevel ?? deck.levels?.[id] ?? 1;
      const level = Math.max(1, Math.min(maxLevel2, Math.floor(raw2)));
      if (level > 1) out[id] = level;
    }
    return out;
  };
  const makePlayer = (id, deck) => {
    const instances = deck.cards.map((cardId) => ({
      iid: `c${nextInstanceId++}`,
      cardId,
      owner: id
    }));
    const lanes = Array.from({ length: b.laneCount }, () => ({
      landscape: null,
      flipped: false,
      flipTimer: null,
      creature: null,
      building: null
    }));
    const rules = options.rules?.[id] ?? [];
    const sum = (f) => rules.reduce((n, r) => n + (f(r) ?? 0), 0);
    const maxHp = Math.max(1, b.heroMaxHp + sum((r) => r.heroHpDelta));
    const hp = options.startingHp?.[id] ?? maxHp;
    return {
      id,
      heroId: deck.heroId,
      hp: Math.max(1, Math.min(maxHp, hp)),
      maxHp,
      mp: 0,
      mpPenalty: 0,
      turnsTaken: 0,
      extraDrawsThisTurn: 0,
      ultimateCharge: Math.max(
        0,
        Math.min(
          b.ultimateChargeMax,
          sum((r) => r.startingCharge)
        )
      ),
      ultimatesUsed: 0,
      landscapePool: [...deck.landscapes],
      cardLevels: cardLevelsFor(deck),
      rules,
      arranged: false,
      mulligansUsed: 0,
      mulliganDone: false,
      deck: options.stackedDecks ? instances : rng.shuffle(instances),
      hand: [],
      discard: [],
      lanes
    };
  };
  const players = [
    makePlayer(0, options.decks[0]),
    makePlayer(1, options.decks[1])
  ];
  const coin = rng.next() < 0.5 ? 0 : 1;
  const firstPlayer = options.firstPlayer ?? coin;
  const events = [{ type: "gameCreated", firstPlayer }];
  for (const p of players) {
    const extra = p.rules.reduce((n, r) => n + (r.extraCards ?? 0), 0);
    const count = Math.max(
      0,
      (p.id === firstPlayer ? b.firstPlayerHandSize : b.secondPlayerHandSize) + extra
    );
    p.hand = p.deck.splice(0, count);
  }
  const state = {
    version: 2,
    seed,
    rng: rng.state,
    phase: "arrange",
    turn: 0,
    firstPlayer,
    activePlayer: firstPlayer,
    players,
    nextInstanceId,
    winner: null,
    endReason: null
  };
  return { state, events };
}
function isValidLane(state, lane) {
  return typeof lane === "number" && Number.isInteger(lane) && lane >= 0 && lane < state.players[0].lanes.length;
}
function countLandscapes(player, type) {
  return player.lanes.filter((l) => !l.flipped && l.landscape === type).length;
}
function unmetRequirements(player, reqs) {
  return reqs.filter((r) => countLandscapes(player, r.landscape) < r.count);
}
function mpForTurn(turnsTaken, ctx) {
  const b = ctx.balance;
  return Math.min(b.maxMp, b.startingMp + Math.max(0, turnsTaken - 1) * b.mpPerTurn);
}
function cardLevelOf(state, player, cardId) {
  return cardId ? state.players[player].cardLevels[cardId] ?? 1 : 1;
}
const cloneCard = (c) => ({ iid: c.iid, cardId: c.cardId, owner: c.owner });
function cloneLane(l) {
  return {
    landscape: l.landscape,
    flipped: l.flipped,
    flipTimer: l.flipTimer,
    creature: l.creature ? { ...l.creature, grantedKeywords: [...l.creature.grantedKeywords] } : null,
    building: l.building ? cloneCard(l.building) : null,
    ...l.sealedUntil !== void 0 ? { sealedUntil: l.sealedUntil } : {}
  };
}
function clonePlayer(p) {
  return {
    ...p,
    landscapePool: [...p.landscapePool],
    cardLevels: { ...p.cardLevels },
    deck: p.deck.map(cloneCard),
    hand: p.hand.map(cloneCard),
    discard: p.discard.map(cloneCard),
    lanes: p.lanes.map(cloneLane),
    ...p.costMods ? { costMods: p.costMods.map((m) => ({ ...m })) } : {},
    ...p.blocks ? { blocks: p.blocks.map((b) => ({ ...b })) } : {}
  };
}
function cloneState(state) {
  return {
    ...state,
    players: [clonePlayer(state.players[0]), clonePlayer(state.players[1])]
  };
}
function collectStatics(state, ctx) {
  const out = [];
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
function applies(state, src, target, lane) {
  const a = src.ability;
  if (a.kind === "spellPower" || a.kind === "laneRarityCap") return false;
  if (a.onLandscape) {
    const l = state.players[target.owner].lanes[lane];
    if (!l || l.flipped || l.landscape !== a.onLandscape) return false;
  }
  const ally = src.owner === target.owner;
  switch (a.scope) {
    case "self":
      return src.iid === target.iid;
    case "lane":
      return ally && src.lane === lane && src.iid !== target.iid;
    case "adjacent":
      return ally && src.lane !== null && Math.abs(src.lane - lane) === 1;
    case "otherAllies":
      return ally && src.iid !== target.iid;
    case "allAllies":
      return ally;
    case "allEnemies":
      return !ally;
  }
}
function staticStatBonus(state, ctx, c, lane) {
  let atk = 0;
  let def = 0;
  let swap = false;
  for (const src of collectStatics(state, ctx)) {
    if (src.ability.kind === "swapStats" && applies(state, src, c, lane)) swap = true;
    if (src.ability.kind === "stat" && applies(state, src, c, lane)) {
      const scope = { owner: src.owner, lane: src.lane, iid: src.iid };
      atk += evalAmount(state, ctx, src.ability.atk, scope);
      def += evalAmount(state, ctx, src.ability.def, scope);
    }
  }
  return { atk, def, swap };
}
function creatureKeywords(state, ctx, c, lane) {
  const card = getCard(ctx.cards, c.cardId);
  const kw = card.type === "creature" ? { ...printedKeywords(card) } : {};
  addKeywords(kw, c.grantedKeywords);
  for (const src of collectStatics(state, ctx)) {
    if (src.ability.kind === "keyword" && applies(state, src, c, lane))
      addKeywords(kw, [src.ability.keyword]);
  }
  return kw;
}
function keywordValue(state, ctx, c, lane, k) {
  return creatureKeywords(state, ctx, c, lane)[k] ?? 0;
}
function spellPower(state, ctx, player) {
  let total = 0;
  for (const src of collectStatics(state, ctx)) {
    if (src.owner === player && src.ability.kind === "spellPower") total += src.ability.amount;
  }
  return total;
}
function staticSum(state, ctx, c, lane, kind) {
  let n = 0;
  for (const src of collectStatics(state, ctx)) {
    if (src.ability.kind === kind && applies(state, src, c, lane)) n += src.ability.amount;
  }
  return n;
}
function creatureArmor(state, ctx, c, lane) {
  return Math.max(0, staticSum(state, ctx, c, lane, "armor"));
}
function floopCostStatic(state, ctx, c, lane) {
  return staticSum(state, ctx, c, lane, "floopCost");
}
function stats(state, ctx, c, lane) {
  const card = getCard(ctx.cards, c.cardId);
  if (card.type !== "creature") throw new Error(`${c.cardId} is not a creature`);
  const lvl = c.token ? { atk: 0, def: 0 } : levelBonus(cardLevelOf(state, c.owner, c.cardId));
  const bonus = staticStatBonus(state, ctx, c, lane);
  const atk = Math.max(0, card.atk + lvl.atk + c.atkMod + c.tempAtk + (c.roundAtk ?? 0) + bonus.atk);
  const def = Math.max(0, card.def + lvl.def + c.defMod + c.tempDef + (c.roundDef ?? 0) + bonus.def);
  return bonus.swap ? { atk: def, def: atk } : { atk, def };
}
function creatureAtk(state, ctx, c, lane) {
  return stats(state, ctx, c, lane).atk;
}
function creatureMaxDef(state, ctx, c, lane) {
  return stats(state, ctx, c, lane).def;
}
function laneStarCap(state, ctx, player, lane) {
  const enemy = state.players[player === 0 ? 1 : 0];
  const b = enemy.lanes[lane]?.building;
  let cap = Infinity;
  if (!b) return cap;
  for (const a of getCard(ctx.cards, b.cardId).statics ?? []) {
    if (a.kind === "laneRarityCap") cap = Math.min(cap, a.maxStars);
  }
  return cap;
}
function creatureDef(state, ctx, c, lane) {
  return creatureMaxDef(state, ctx, c, lane) - c.damage;
}
setStatReaders({ atk: creatureAtk, def: creatureDef, maxDef: creatureMaxDef });
function modifierTotal(state, player, kinds, landscape) {
  let total = 0;
  for (const m of state.players[player].costMods ?? []) {
    if (m.turn !== state.turn || !kinds.includes(m.kind)) continue;
    if (m.landscape !== void 0 && m.landscape !== landscape) continue;
    total += m.amount;
  }
  return total;
}
function cardCost(state, player, card) {
  return Math.max(0, card.cost + modifierTotal(state, player, ["card", card.type], card.landscape));
}
function floopCost(state, ctx, player, lane) {
  const c = state.players[player].lanes[lane]?.creature;
  if (!c) return null;
  const card = ctx.cards.byId.get(c.cardId);
  if (!card || card.type !== "creature" || !card.floop) return null;
  const mods = modifierTotal(state, player, ["floop"], card.landscape) + floopCostStatic(state, ctx, c, lane);
  return Math.max(0, card.floop.cost + mods);
}
function createExec(draft, ctx) {
  return {
    s: draft,
    ctx,
    events: [],
    rng: Rng.fromState(draft.rng),
    queue: [],
    resolutions: 0,
    limitHit: false
  };
}
function isOver(x) {
  return x.s.phase === "ended";
}
function countResolution(x) {
  if (x.limitHit) return false;
  x.resolutions++;
  if (x.resolutions > x.ctx.balance.maxEffectResolutionsPerAction) {
    x.limitHit = true;
    x.queue.length = 0;
    x.events.push({ type: "effectLimitReached", limit: x.ctx.balance.maxEffectResolutionsPerAction });
    return false;
  }
  return true;
}
function creatureAt(x, player, lane) {
  return x.s.players[player].lanes[lane]?.creature ?? null;
}
function findLaneOf(x, player, iid) {
  const idx = x.s.players[player].lanes.findIndex((l) => l.creature?.iid === iid || l.building?.iid === iid);
  return idx < 0 ? null : idx;
}
function sourceLane(x, src) {
  if (src.iid !== null) {
    const now = findLaneOf(x, src.player, src.iid);
    if (now !== null) return now;
  }
  return src.lane;
}
function sourceFor(x, player, lane, which) {
  const inst = x.s.players[player].lanes[lane][which];
  return { player, kind: which, iid: inst.iid, cardId: inst.cardId, lane };
}
function queueCardTrigger(x, source, trigger, chosen, subject) {
  if (!source.cardId) return;
  const card = getCard(x.ctx.cards, source.cardId);
  for (const a of card.abilities ?? []) {
    if (a.trigger !== trigger) continue;
    const pending = { source, trigger, effects: a.effects };
    if (a.condition) pending.condition = a.condition;
    if (chosen) pending.chosen = chosen;
    if (subject) pending.subject = subject;
    x.queue.push(pending);
  }
}
function queueBuildingTrigger(x, player, lane, trigger, subject) {
  if (!x.s.players[player].lanes[lane]?.building) return;
  queueCardTrigger(x, sourceFor(x, player, lane, "building"), trigger, void 0, subject);
}
function queuePlayerTrigger(x, player, trigger, excludeIid) {
  const p = x.s.players[player];
  const hero = getHero(x.ctx.heroes, p.heroId);
  const heroAbilities = [...hero.passive.abilities ?? [], ...p.rules.flatMap((r) => r.abilities ?? [])];
  for (const a of heroAbilities) {
    if (a.trigger !== trigger) continue;
    const pending = {
      source: { player, kind: "hero", iid: null, cardId: null, lane: null },
      trigger,
      effects: a.effects
    };
    if (a.condition) pending.condition = a.condition;
    x.queue.push(pending);
  }
  p.lanes.forEach((l, lane) => {
    if (l.creature && l.creature.iid !== excludeIid)
      queueCardTrigger(x, sourceFor(x, player, lane, "creature"), trigger);
    if (l.building && l.building.iid !== excludeIid)
      queueCardTrigger(x, sourceFor(x, player, lane, "building"), trigger);
  });
}
function endGame(x, winner, reason) {
  if (isOver(x)) return;
  x.s.phase = "ended";
  x.s.winner = winner;
  x.s.endReason = reason;
  x.queue.length = 0;
  x.events.push({ type: "gameEnded", winner, reason });
}
function checkHeroes(x) {
  if (isOver(x)) return;
  const dead0 = x.s.players[0].hp <= 0;
  const dead1 = x.s.players[1].hp <= 0;
  if (dead0 && dead1) endGame(x, "draw", "heroDefeated");
  else if (dead0) endGame(x, 1, "heroDefeated");
  else if (dead1) endGame(x, 0, "heroDefeated");
}
function chargeUltimate(x, player, percent) {
  if (percent <= 0) return;
  const p = x.s.players[player];
  const next = Math.min(x.ctx.balance.ultimateChargeMax, p.ultimateCharge + percent);
  if (next !== p.ultimateCharge) {
    p.ultimateCharge = next;
    x.events.push({ type: "ultimateCharge", player, charge: next });
  }
}
function chargeFromDamage(x, player, damage) {
  if (getHero(x.ctx.heroes, x.s.players[player].heroId).ultimate.cooldown) return;
  chargeUltimate(x, player, damage * x.ctx.balance.ultimateChargePerDamage);
}
const MP_EFFECT_CAP = 20;
function changeMp(x, player, delta, cap = x.ctx.balance.maxMp) {
  const p = x.s.players[player];
  const next = Math.max(0, delta < 0 ? p.mp + delta : Math.max(p.mp, Math.min(cap, p.mp + delta)));
  if (next === p.mp) return;
  const applied = next - p.mp;
  p.mp = next;
  x.events.push({ type: "mpChanged", player, mp: next, delta: applied });
}
function damageHero(x, target, amount, src) {
  if (amount <= 0 || isOver(x)) return 0;
  const p = x.s.players[target];
  p.hp = Math.max(0, p.hp - amount);
  x.events.push({
    type: "damage",
    target: { kind: "hero", player: target },
    amount,
    sourcePlayer: src.player
  });
  chargeFromDamage(x, target, amount);
  if (src.player !== target) chargeFromDamage(x, src.player, amount);
  checkHeroes(x);
  return amount;
}
function damageCreature(x, owner, lane, amount, src) {
  if (amount <= 0 || isOver(x)) return 0;
  const c = creatureAt(x, owner, lane);
  if (!c) return 0;
  if ((c.redirectUntil ?? 0) >= x.s.turn) return damageHero(x, owner, amount, src);
  if (c.shield) {
    c.shield = false;
    x.events.push({ type: "shieldBroken", player: owner, lane, iid: c.iid });
    return 0;
  }
  c.damage += amount;
  x.events.push({
    type: "damage",
    target: { kind: "creature", player: owner, lane },
    amount,
    sourcePlayer: src.player
  });
  chargeFromDamage(x, owner, amount);
  if (src.player !== owner) chargeFromDamage(x, src.player, amount);
  if (creatureDef(x.s, x.ctx, c, lane) <= 0) destroyCreature(x, owner, lane, src.stealer);
  else queueCardTrigger(x, sourceFor(x, owner, lane, "creature"), "onDamaged");
  checkDeaths(x);
  return amount;
}
function dealDamage(x, target, amount, src) {
  if (target.kind === "hero") return damageHero(x, target.player, amount, src);
  if (target.kind === "creature") return damageCreature(x, target.player, target.lane, amount, src);
  return 0;
}
function healTarget(x, target, amount) {
  if (amount <= 0 || isOver(x)) return;
  if (target.kind === "hero") {
    const p = x.s.players[target.player];
    const healed2 = Math.min(amount, p.maxHp - p.hp);
    if (healed2 <= 0) return;
    p.hp += healed2;
    x.events.push({ type: "heal", target, amount: healed2 });
    return;
  }
  if (target.kind !== "creature") return;
  const c = creatureAt(x, target.player, target.lane);
  if (!c) return;
  const healed = Math.min(amount, c.damage);
  if (healed <= 0) return;
  c.damage -= healed;
  x.events.push({ type: "heal", target, amount: healed });
}
function emitStats(x, owner, lane, c) {
  const card = getCard(x.ctx.cards, c.cardId);
  if (card.type !== "creature") return;
  x.events.push({
    type: "statsChanged",
    player: owner,
    lane,
    iid: c.iid,
    atk: Math.max(0, card.atk + c.atkMod + c.tempAtk),
    def: creatureMaxDef(x.s, x.ctx, c, lane)
  });
}
function buffCreature(x, owner, lane, atk, def, duration) {
  if (isOver(x) || atk === 0 && def === 0) return;
  const c = creatureAt(x, owner, lane);
  if (!c) return;
  if (duration === true || duration === "turn") {
    c.tempAtk += atk;
    c.tempDef += def;
  } else if (duration === "round") {
    c.roundAtk = (c.roundAtk ?? 0) + atk;
    c.roundDef = (c.roundDef ?? 0) + def;
  } else {
    c.atkMod += atk;
    c.defMod += def;
  }
  emitStats(x, owner, lane, c);
  checkDeaths(x);
}
function checkDeaths(x) {
  for (const p of x.s.players) {
    for (let lane = 0; lane < p.lanes.length; lane++) {
      const c = p.lanes[lane].creature;
      if (c && creatureDef(x.s, x.ctx, c, lane) <= 0) destroyCreature(x, p.id, lane);
    }
  }
}
function removeCreature(x, owner, lane) {
  const l = x.s.players[owner].lanes[lane];
  const c = l?.creature ?? null;
  if (l) l.creature = null;
  return c;
}
function toZoneCard(c) {
  return { iid: c.iid, cardId: c.cardId, owner: c.owner };
}
function destroyCreature(x, owner, lane, stealer) {
  const c = removeCreature(x, owner, lane);
  if (!c) return;
  x.events.push({ type: "creatureDestroyed", player: owner, iid: c.iid, cardId: c.cardId, lane });
  if (!c.token) {
    if (stealer !== void 0 && stealer !== owner) {
      x.s.players[stealer].hand.push({ iid: c.iid, cardId: c.cardId, owner: stealer });
      x.events.push({
        type: "cardRecovered",
        player: stealer,
        iid: c.iid,
        cardId: c.cardId,
        from: "discard",
        stolen: true
      });
    } else x.s.players[owner].discard.push(toZoneCard(c));
  }
  const snapshot = { player: owner, kind: "creature", iid: c.iid, cardId: c.cardId, lane };
  queueCardTrigger(x, snapshot, "onDestroy");
  queueBuildingTrigger(x, owner, lane, "onLaneCreatureDestroyed", {
    player: owner,
    iid: c.iid,
    cardId: c.cardId
  });
  queuePlayerTrigger(x, owner, "onAllyCreatureDestroyed", c.iid);
  queuePlayerTrigger(x, other(owner), "onEnemyCreatureDestroyed");
  checkDeaths(x);
}
function replaceCreature(x, owner, lane) {
  const c = removeCreature(x, owner, lane);
  if (!c) return;
  if (!c.token) x.s.players[owner].discard.push(toZoneCard(c));
  x.events.push({ type: "cardReplaced", player: owner, iid: c.iid, cardId: c.cardId, lane });
  checkDeaths(x);
}
function returnCreatureToHand(x, owner, lane) {
  const c = removeCreature(x, owner, lane);
  if (!c) return;
  if (c.token) {
    x.events.push({ type: "tokenVanished", player: owner, iid: c.iid, lane });
  } else {
    x.s.players[owner].hand.push(toZoneCard(c));
    x.events.push({ type: "returnedToHand", player: owner, iid: c.iid, cardId: c.cardId, lane });
  }
  checkDeaths(x);
}
function newCreature(x, inst, token) {
  const card = getCard(x.ctx.cards, inst.cardId);
  const printed = card.type === "creature" ? card.keywords : [];
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
    shield: printed.includes("shield"),
    frozen: false,
    poison: 0,
    stealth: printed.includes("stealth"),
    grantedKeywords: [],
    token
  };
}
function summonToken(x, player, lane, cardId) {
  const l = x.s.players[player].lanes[lane];
  if (!l || l.creature || l.flipped || l.landscape === null) return;
  const iid = `c${x.s.nextInstanceId++}`;
  l.creature = newCreature(x, { iid, cardId, owner: player }, true);
  x.events.push({ type: "creatureSummoned", player, iid, cardId, lane, token: true });
  checkDeaths(x);
}
function moveCreatureRandomly(x, owner, lane) {
  const p = x.s.players[owner];
  const c = p.lanes[lane]?.creature;
  if (!c) return;
  const options = p.lanes.map((l, i) => ({ l, i })).filter(({ l, i }) => i !== lane && !l.creature && !l.flipped && l.landscape !== null).map(({ i }) => i);
  if (options.length === 0) return;
  const to = x.rng.pick(options);
  p.lanes[lane].creature = null;
  p.lanes[to].creature = c;
  x.events.push({ type: "creatureMoved", player: owner, iid: c.iid, from: lane, to, cost: 0 });
  checkDeaths(x);
}
function removeBuilding(x, owner, lane) {
  const l = x.s.players[owner].lanes[lane];
  const b = l?.building ?? null;
  if (l) l.building = null;
  return b;
}
function destroyBuilding(x, owner, lane) {
  const b = removeBuilding(x, owner, lane);
  if (!b) return;
  x.s.players[owner].discard.push(b);
  x.events.push({ type: "buildingDestroyed", player: owner, iid: b.iid, cardId: b.cardId, lane });
  checkDeaths(x);
}
function returnBuildingToHand(x, owner, lane) {
  const b = removeBuilding(x, owner, lane);
  if (!b) return;
  x.s.players[owner].hand.push(b);
  x.events.push({ type: "buildingReturned", player: owner, iid: b.iid, cardId: b.cardId, lane });
  checkDeaths(x);
}
function moveBuildingRandomly(x, owner, lane) {
  const p = x.s.players[owner];
  const b = p.lanes[lane]?.building;
  if (!b) return;
  const options = p.lanes.map((l, i) => ({ l, i })).filter(({ l, i }) => i !== lane && !l.building && l.landscape !== null).map(({ i }) => i);
  if (options.length === 0) return;
  const to = x.rng.pick(options);
  p.lanes[lane].building = null;
  p.lanes[to].building = b;
  x.events.push({ type: "buildingMoved", player: owner, iid: b.iid, from: lane, to });
  checkDeaths(x);
}
function resetCreature(x, owner, lane) {
  const c = creatureAt(x, owner, lane);
  if (!c) return;
  c.damage = 0;
  c.atkMod = 0;
  c.defMod = 0;
  c.tempAtk = 0;
  c.tempDef = 0;
  c.roundAtk = 0;
  c.roundDef = 0;
  x.events.push({ type: "status", player: owner, lane, iid: c.iid, status: "reset" });
  emitStats(x, owner, lane, c);
  checkDeaths(x);
}
function swapCreatureStats(x, owner, lane, atk, def) {
  const c = creatureAt(x, owner, lane);
  if (!c) return;
  const maxDef = def + c.damage;
  c.damage = 0;
  c.atkMod += def - atk;
  c.defMod += atk - maxDef;
  x.events.push({ type: "status", player: owner, lane, iid: c.iid, status: "swapped" });
  emitStats(x, owner, lane, c);
  checkDeaths(x);
}
function setCreatureStatus(x, owner, lane, status, untilTurn) {
  const c = creatureAt(x, owner, lane);
  if (!c) return;
  if (status === "floopLocked") c.floopLock = Math.max(c.floopLock ?? 0, untilTurn);
  else if (status === "attackLocked") c.attackLock = Math.max(c.attackLock ?? 0, untilTurn);
  else c.redirectUntil = Math.max(c.redirectUntil ?? 0, untilTurn);
  x.events.push({ type: "status", player: owner, lane, iid: c.iid, status });
}
function freezeCreature(x, owner, lane) {
  const c = creatureAt(x, owner, lane);
  if (!c || c.frozen) return;
  c.frozen = true;
  x.events.push({ type: "frozen", player: owner, lane, iid: c.iid });
}
function poisonCreature(x, owner, lane, amount) {
  const c = creatureAt(x, owner, lane);
  if (!c || amount <= 0) return;
  c.poison += amount;
  x.events.push({ type: "poisoned", player: owner, lane, iid: c.iid, poison: c.poison });
}
function shieldCreature(x, owner, lane) {
  const c = creatureAt(x, owner, lane);
  if (!c || c.shield) return;
  c.shield = true;
  x.events.push({ type: "shieldGained", player: owner, lane, iid: c.iid });
}
function grantKeyword(x, owner, lane, keyword) {
  const c = creatureAt(x, owner, lane);
  if (!c) return;
  if (keyword === "shield") return shieldCreature(x, owner, lane);
  if (keyword === "stealth") c.stealth = true;
  else c.grantedKeywords.push(keyword);
  x.events.push({ type: "keywordGranted", player: owner, lane, iid: c.iid, keyword });
}
function afterCreatureDamage(x, attackerOwner, attackerLane, target, dealt) {
  if (dealt <= 0 || isOver(x)) return;
  const attacker = creatureAt(x, attackerOwner, attackerLane);
  if (!attacker) return;
  if (keywordValue(x.s, x.ctx, attacker, attackerLane, "lifesteal") > 0) {
    healTarget(x, { kind: "hero", player: attackerOwner }, dealt);
  }
  const poison = keywordValue(x.s, x.ctx, attacker, attackerLane, "poison");
  if (poison > 0 && target.kind === "creature") poisonCreature(x, target.player, target.lane, poison);
}
function flipLandscape(x, player, lane) {
  const l = x.s.players[player].lanes[lane];
  if (!l || l.landscape === null) return;
  l.flipped = true;
  l.flipTimer = 1;
  x.events.push({ type: "landscapeFlipped", player, lane });
  checkDeaths(x);
}
function restoreLandscape(x, player, lane) {
  const l = x.s.players[player].lanes[lane];
  if (!l || !l.flipped) return;
  l.flipped = false;
  l.flipTimer = null;
  x.events.push({ type: "landscapeRestored", player, lane });
  checkDeaths(x);
}
function convertLandscape(x, player, lane, to) {
  const l = x.s.players[player].lanes[lane];
  if (!l || l.landscape === null || l.landscape === to) return;
  const from = l.landscape;
  l.landscape = to;
  x.events.push({ type: "landscapeConverted", player, lane, from, to });
  checkDeaths(x);
}
function drawCards(x, player, count) {
  const p = x.s.players[player];
  for (let i = 0; i < count && !isOver(x); i++) {
    const card = p.deck.shift();
    if (!card) {
      const dmg = x.ctx.balance.fatigueDamage;
      x.events.push({ type: "fatigue", player, damage: dmg });
      damageHero(x, player, dmg, { player });
      continue;
    }
    p.hand.push(card);
    x.events.push({ type: "cardDrawn", player, iid: card.iid, cardId: card.cardId });
  }
}
function discardFromHand(x, player, iid) {
  const p = x.s.players[player];
  const idx = p.hand.findIndex((c) => c.iid === iid);
  if (idx < 0) return;
  const [card] = p.hand.splice(idx, 1);
  p.discard.push(card);
  x.events.push({ type: "cardDiscarded", player, iid: card.iid, cardId: card.cardId, from: "hand" });
}
function recoverFromDiscard(x, player, iids) {
  const p = x.s.players[player];
  for (const iid of iids) {
    const idx = p.discard.findIndex((c) => c.iid === iid);
    if (idx < 0) continue;
    const [card] = p.discard.splice(idx, 1);
    p.hand.push(card);
    x.events.push({ type: "cardRecovered", player, iid: card.iid, cardId: card.cardId, from: "discard" });
  }
}
function takeFromDeck(x, player, iid) {
  const p = x.s.players[player];
  const idx = p.deck.findIndex((c) => c.iid === iid);
  if (idx < 0) return;
  const [card] = p.deck.splice(idx, 1);
  p.hand.push(card);
  x.events.push({ type: "cardRecovered", player, iid: card.iid, cardId: card.cardId, from: "deck" });
}
function cycleHand(x, player, count) {
  const p = x.s.players[player];
  const returned = p.hand.length;
  p.deck = x.rng.shuffle([...p.deck, ...p.hand]);
  p.hand = [];
  x.events.push({ type: "handCycled", player, count: returned });
  drawCards(x, player, count);
}
function discardHand(x, player) {
  for (const c of [...x.s.players[player].hand]) discardFromHand(x, player, c.iid);
}
function discardRandom(x, player, count) {
  const p = x.s.players[player];
  for (let i = 0; i < count && p.hand.length > 0; i++) {
    discardFromHand(x, player, x.rng.pick(p.hand).iid);
  }
}
function canAttack(x, c, lane) {
  if (c.exhausted || c.frozen) return false;
  if ((c.attackLock ?? 0) >= x.s.turn) return false;
  if (c.summoningSick && keywordValue(x.s, x.ctx, c, lane, "rush") === 0) return false;
  return creatureAtk(x.s, x.ctx, c, lane) > 0;
}
function startTurn(x, player) {
  if (isOver(x)) return;
  const s = x.s;
  s.turn++;
  if (s.turn > x.ctx.balance.maxTurns) {
    endGame(x, "draw", "turnLimit");
    return;
  }
  s.activePlayer = player;
  const p = s.players[player];
  p.turnsTaken++;
  x.events.push({ type: "phase", player, phase: "start" });
  const mp = Math.max(0, mpForTurn(p.turnsTaken, x.ctx) - p.mpPenalty);
  p.mpPenalty = 0;
  changeMp(x, player, mp - p.mp, MP_EFFECT_CAP);
  p.extraDrawsThisTurn = 0;
  p.floopsThisTurn = 0;
  if (p.costMods?.length) p.costMods = p.costMods.filter((m) => m.turn >= s.turn);
  if (p.blocks?.length) p.blocks = p.blocks.filter((b) => b.turn >= s.turn);
  for (const lane of p.lanes) {
    if (!lane.creature) continue;
    const c = lane.creature;
    c.exhausted = false;
    c.summoningSick = false;
    c.movesThisTurn = 0;
    if (c.roundAtk || c.roundDef) {
      c.roundAtk = 0;
      c.roundDef = 0;
    }
  }
  x.events.push({ type: "turnStarted", player, turn: s.turn, mp: p.mp });
  checkDeaths(x);
  const cooldown = getHero(x.ctx.heroes, p.heroId).ultimate.cooldown;
  if (cooldown) chargeUltimate(x, player, Math.ceil(x.ctx.balance.ultimateChargeMax / cooldown));
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
      const regen = keywordValue(x.s, x.ctx, alive, lane, "regenerate");
      if (regen > 0) healTarget(x, { kind: "creature", player, lane }, regen);
    }
  }
  drainQueue(x);
  queuePlayerTrigger(x, player, "startOfTurn");
  drainQueue(x);
  if (isOver(x)) return;
  x.events.push({ type: "phase", player, phase: "draw" });
  const skipDraw = x.ctx.balance.firstPlayerSkipsFirstDraw && player === s.firstPlayer && p.turnsTaken === 1;
  if (!skipDraw) drawCards(x, player, 1);
  if (isOver(x)) return;
  x.events.push({ type: "phase", player, phase: "main" });
}
function attackTarget(x, player, lane, ranged) {
  const opp = other(player);
  if (creatureAt(x, opp, lane)) return { kind: "creature", player: opp, lane };
  if (!ranged) {
    for (const g of [lane - 1, lane + 1]) {
      const guard = creatureAt(x, opp, g);
      if (guard && keywordValue(x.s, x.ctx, guard, g, "guard") > 0)
        return { kind: "creature", player: opp, lane: g };
    }
  }
  return { kind: "hero", player: opp };
}
function strike(x, player, lane, forced = false) {
  const able = (c) => forced ? creatureAtk(x.s, x.ctx, c, lane) > 0 : canAttack(x, c, lane);
  const attacker = creatureAt(x, player, lane);
  if (!attacker || !able(attacker)) return;
  const iid = attacker.iid;
  attacker.stealth = false;
  queueCardTrigger(x, sourceFor(x, player, lane, "creature"), "onAttack");
  drainQueue(x);
  const a = creatureAt(x, player, lane);
  if (isOver(x) || !a || a.iid !== iid || !able(a)) return;
  const ranged = keywordValue(x.s, x.ctx, a, lane, "ranged") > 0;
  const target = attackTarget(x, player, lane, ranged);
  x.events.push({ type: "attack", player, lane, iid, target });
  let thorns = 0;
  let counter = false;
  let defenderIid = null;
  if (target.kind === "creature") {
    const d = creatureAt(x, target.player, target.lane);
    defenderIid = d.iid;
    thorns = keywordValue(x.s, x.ctx, d, target.lane, "thorns");
    counter = keywordValue(x.s, x.ctx, d, target.lane, "counter") > 0;
  }
  let amount = creatureAtk(x.s, x.ctx, a, lane);
  if (target.kind === "creature") {
    const d = creatureAt(x, target.player, target.lane);
    amount = Math.max(0, amount - creatureArmor(x.s, x.ctx, d, target.lane));
  }
  const dealt = dealDamage(x, target, amount, {
    player
  });
  afterCreatureDamage(x, player, lane, target, dealt);
  if (target.kind === "creature" && defenderIid && creatureAt(x, target.player, target.lane)?.iid !== defenderIid) {
    const me = creatureAt(x, player, lane);
    const feast = me && me.iid === iid ? keywordValue(x.s, x.ctx, me, lane, "feast") : 0;
    if (feast > 0 && creatureDef(x.s, x.ctx, me, lane) > 0)
      healTarget(x, { kind: "creature", player, lane }, feast);
  }
  if (target.kind === "creature" && !ranged && !isOver(x)) {
    const opp = target.player;
    if (thorns > 0 && creatureAt(x, player, lane)?.iid === iid) {
      damageCreature(x, player, lane, thorns, { player: opp });
    }
    const defender = creatureAt(x, opp, target.lane);
    if (counter && defender && defender.iid === defenderIid && creatureAt(x, player, lane)?.iid === iid) {
      const back = creatureAtk(x.s, x.ctx, defender, target.lane);
      const dealtBack = damageCreature(x, player, lane, back, {
        player: opp,
        attacker: { iid: defender.iid }
      });
      afterCreatureDamage(x, opp, target.lane, { kind: "creature", player, lane }, dealtBack);
    }
  }
  drainQueue(x);
}
function runCombat(x, player) {
  x.events.push({ type: "phase", player, phase: "combat" });
  const laneCount = x.s.players[player].lanes.length;
  for (let lane = 0; lane < laneCount && !isOver(x); lane++) strike(x, player, lane);
}
function runEndPhase(x, player, preferredDiscards = []) {
  x.events.push({ type: "phase", player, phase: "end" });
  queuePlayerTrigger(x, player, "endOfTurn");
  drainQueue(x);
  if (isOver(x)) return;
  const p = x.s.players[player];
  p.lanes.forEach((l, lane) => {
    if (l.creature?.frozen) {
      l.creature.frozen = false;
      x.events.push({ type: "thawed", player, lane, iid: l.creature.iid });
    }
    if (l.flipped && l.flipTimer !== null) {
      l.flipTimer--;
      if (l.flipTimer <= 0) restoreLandscape(x, player, lane);
    }
  });
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
  while (p.hand.length > limit) discardFromHand(x, player, p.hand[p.hand.length - 1].iid);
  changeMp(x, player, -p.mp);
}
function endTurn(x, player, preferredDiscards) {
  runCombat(x, player);
  if (isOver(x)) return;
  runEndPhase(x, player, preferredDiscards);
  if (isOver(x)) return;
  x.events.push({ type: "turnEnded", player });
  startTurn(x, other(player));
}
function isValidChosenTarget(state, selector, chooser, target, ctx, filter) {
  if (target.player !== 0 && target.player !== 1) return false;
  if (target.kind === "hero") return false;
  const lane = state.players[target.player].lanes[target.lane];
  const enemy = target.player !== chooser;
  switch (selector) {
    case "chosenCreature":
    case "chosenEnemyCreature":
    case "chosenAllyCreature": {
      if (target.kind !== "creature" || !lane?.creature) return false;
      if (enemy && lane.creature.stealth) return false;
      if (filter && ctx && !matchesFilter(ctx, lane.creature, filter)) return false;
      if (selector === "chosenEnemyCreature") return enemy;
      if (selector === "chosenAllyCreature") return !enemy;
      return true;
    }
    case "chosenEnemyLandscape":
    case "chosenAllyLandscape": {
      if (target.kind !== "landscape" || !lane || lane.landscape === null) return false;
      return selector === "chosenEnemyLandscape" ? enemy : !enemy;
    }
    case "chosenEnemyBuilding":
    case "chosenAllyBuilding": {
      if (target.kind !== "building" || !lane?.building) return false;
      return selector === "chosenEnemyBuilding" ? enemy : !enemy;
    }
    default:
      return false;
  }
}
function refKind(selector) {
  if (selector.endsWith("Landscape")) return "landscape";
  if (selector.endsWith("Building")) return "building";
  return "creature";
}
function listChosenTargets(state, selector, chooser, ctx, filter) {
  const out = [];
  const kind = refKind(selector);
  for (const p of state.players) {
    for (let lane = 0; lane < p.lanes.length; lane++) {
      const t = { kind, player: p.id, lane };
      if (isValidChosenTarget(state, selector, chooser, t, ctx, filter)) out.push(t);
    }
  }
  return out;
}
function choicesFor(state, ctx, effects, chooser) {
  const e = chosenEffect(effects);
  if (!e || !("target" in e)) return [];
  return listChosenTargets(state, e.target, chooser, ctx, e.filter);
}
function isValidChoiceFor(state, ctx, effects, chooser, target) {
  const e = chosenEffect(effects);
  if (!e || !("target" in e)) return false;
  return isValidChosenTarget(state, e.target, chooser, target, ctx, e.filter);
}
function checkCondition(x, cond, src) {
  const me = x.s.players[src.player];
  const opp = x.s.players[other(src.player)];
  const who = (w) => w === "self" ? me : opp;
  switch (cond.type) {
    case "landscapeCount":
      return countLandscapes(me, cond.landscape) >= cond.atLeast;
    case "opposingLaneEmpty":
    case "opposingLaneOccupied": {
      const lane = sourceLane(x, src);
      if (lane === null) return false;
      const occupied = !!opp.lanes[lane]?.creature;
      return cond.type === "opposingLaneOccupied" ? occupied : !occupied;
    }
    case "heroHpAtMost":
      return who(cond.who).hp <= cond.value;
    case "creatureCountAtLeast":
      return who(cond.who).lanes.filter((l) => l.creature).length >= cond.value;
    case "creatureCountAtMost":
      return who(cond.who).lanes.filter((l) => l.creature).length <= cond.value;
    case "handSizeAtMost":
      return me.hand.length <= cond.value;
    case "handSizeAtLeast":
      return me.hand.length >= cond.value;
  }
}
function creaturesOf(state, player, exceptIid) {
  const out = [];
  state.players[player].lanes.forEach((l, lane) => {
    if (l.creature && l.creature.iid !== exceptIid) out.push({ kind: "creature", player, lane });
  });
  return out;
}
function buildingsOf(state, player) {
  const out = [];
  state.players[player].lanes.forEach((l, lane) => {
    if (l.building) out.push({ kind: "building", player, lane });
  });
  return out;
}
function landscapesOf(state, player, filter) {
  const out = [];
  state.players[player].lanes.forEach((l, lane) => {
    if (l.landscape !== null && filter(l.flipped)) out.push({ kind: "landscape", player, lane });
  });
  return out;
}
function creatureIn(state, player, lane) {
  if (lane === null || !state.players[player].lanes[lane]?.creature) return [];
  return [{ kind: "creature", player, lane }];
}
function buildingIn(state, player, lane) {
  if (lane === null || !state.players[player].lanes[lane]?.building) return [];
  return [{ kind: "building", player, lane }];
}
function weakestAlly(x, player) {
  let best = null;
  let bestScore = Infinity;
  for (const t of creaturesOf(x.s, player)) {
    if (t.kind !== "creature") continue;
    const c = x.s.players[player].lanes[t.lane].creature;
    const card = getCard(x.ctx.cards, c.cardId);
    const score = card.cost * 1e3 + creatureAtk(x.s, x.ctx, c, t.lane) + Math.max(0, creatureDef(x.s, x.ctx, c, t.lane));
    if (score < bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best ? [best] : [];
}
function resolveTargets(x, selector, src, chosen, count = 1) {
  const s = x.s;
  const me = src.player;
  const opp = other(me);
  const lane = sourceLane(x, src);
  switch (selector) {
    case "self": {
      if (lane === null || src.iid === null) return [];
      return s.players[me].lanes[lane]?.creature?.iid === src.iid ? [{ kind: "creature", player: me, lane }] : [];
    }
    case "opposingCreature":
      return creatureIn(s, opp, lane);
    case "laneCreature":
      return creatureIn(s, me, lane);
    case "adjacentAllies":
      return lane === null ? [] : [...creatureIn(s, me, lane - 1), ...creatureIn(s, me, lane + 1)];
    case "adjacentEnemies":
      return lane === null ? [] : [...creatureIn(s, opp, lane - 1), ...creatureIn(s, opp, lane + 1)];
    case "allAllyCreatures":
      return creaturesOf(s, me);
    case "otherAllyCreatures":
      return creaturesOf(s, me, src.iid);
    case "allEnemyCreatures":
      return creaturesOf(s, opp);
    case "allCreatures":
      return [...creaturesOf(s, me), ...creaturesOf(s, opp)];
    case "randomEnemyCreature":
      return x.rng.sample(creaturesOf(s, opp), count);
    case "randomAllyCreature":
      return x.rng.sample(creaturesOf(s, me), count);
    case "randomCreature":
      return x.rng.sample([...creaturesOf(s, me), ...creaturesOf(s, opp)], count);
    case "weakestAllyCreature":
      return weakestAlly(x, me);
    case "chosenCreature":
    case "chosenEnemyCreature":
    case "chosenAllyCreature":
    case "chosenEnemyLandscape":
    case "chosenAllyLandscape":
    case "chosenEnemyBuilding":
    case "chosenAllyBuilding":
      if (!chosen || chosen.kind === "hero") return [];
      if (chosen.kind === "creature") return creatureIn(s, chosen.player, chosen.lane);
      if (chosen.kind === "building") return buildingIn(s, chosen.player, chosen.lane);
      return s.players[chosen.player].lanes[chosen.lane]?.landscape != null ? [chosen] : [];
    case "ownHero":
      return [{ kind: "hero", player: me }];
    case "enemyHero":
      return [{ kind: "hero", player: opp }];
    case "bothHeroes":
      return [
        { kind: "hero", player: me },
        { kind: "hero", player: opp }
      ];
    case "thisLandscape":
      return lane === null ? [] : [{ kind: "landscape", player: me, lane }];
    case "opposingLandscape":
      return lane === null ? [] : [{ kind: "landscape", player: opp, lane }];
    case "randomEnemyLandscape":
      return x.rng.sample(
        landscapesOf(s, opp, (f) => !f),
        count
      );
    case "allAllyLandscapes":
      return landscapesOf(s, me, () => true);
    case "allEnemyLandscapes":
      return landscapesOf(s, opp, () => true);
    case "thisBuilding": {
      if (lane === null || src.iid === null) return [];
      return s.players[me].lanes[lane]?.building?.iid === src.iid ? [{ kind: "building", player: me, lane }] : [];
    }
    case "opposingBuilding":
      return buildingIn(s, opp, lane);
    case "allEnemyBuildings":
      return buildingsOf(s, opp);
    case "allAllyBuildings":
      return buildingsOf(s, me);
    case "allBuildings":
      return [...buildingsOf(s, me), ...buildingsOf(s, opp)];
  }
}
function finalTargets(x, effect, src, chosen) {
  if (!("target" in effect)) return [];
  const count = "count" in effect ? effect.count ?? 1 : 1;
  let targets = resolveTargets(x, effect.target, src, chosen, count);
  if (effect.filter) {
    targets = targets.filter((t) => {
      if (t.kind !== "creature") return true;
      const c = x.s.players[t.player].lanes[t.lane]?.creature;
      return !!c && matchesFilter(x.ctx, c, effect.filter);
    });
  }
  if (effect.splash) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    const add = (t) => {
      const key = `${t.kind}:${t.player}:${"lane" in t ? t.lane : -1}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(t);
      }
    };
    for (const t of targets) {
      add(t);
      if (t.kind === "creature") for (const n of creatureIn(x.s, t.player, t.lane - 1)) add(n);
      if (t.kind === "creature") for (const n of creatureIn(x.s, t.player, t.lane + 1)) add(n);
    }
    targets = out;
  }
  return targets;
}
function summonLanes(x, src, where, count) {
  const p = x.s.players[src.player];
  const empty = (i) => {
    const l = p.lanes[i];
    return !!l && !l.creature && !l.flipped && l.landscape !== null;
  };
  const lane = sourceLane(x, src);
  const all = p.lanes.map((_l, i) => i).filter(empty);
  switch (where) {
    case "sourceLane":
      return lane !== null && empty(lane) ? [lane] : [];
    case "adjacentEmptyLanes":
      return lane === null ? [] : [lane - 1, lane + 1].filter(empty);
    case "randomEmptyLane":
      return x.rng.sample(all, count);
    case "allEmptyLanes":
      return all;
    default:
      return [];
  }
}
function abilityBonus(x, src) {
  if (src.kind === "hero" || !src.cardId) return 0;
  return levelBonus(cardLevelOf(x.s, src.player, src.cardId)).ability;
}
function scopeOf(x, src, target) {
  return {
    owner: src.player,
    lane: sourceLane(x, src),
    iid: src.iid,
    target: target && target.kind === "creature" ? { player: target.player, lane: target.lane } : null
  };
}
function autoChoose(x, effects, player) {
  const options = choicesFor(x.s, x.ctx, effects, player);
  if (options.length === 0) return void 0;
  const score = (t) => {
    if (t.kind !== "creature") return t.player === player ? 0 : 1;
    const c = x.s.players[t.player].lanes[t.lane].creature;
    return t.player === player ? c.damage : 1e3 + creatureAtk(x.s, x.ctx, c, t.lane);
  };
  return [...options].sort((a, b) => score(b) - score(a))[0];
}
function applyToTarget(x, effect, t, src) {
  const lane = t.kind === "hero" ? -1 : t.lane;
  const amount = (a) => evalAmount(x.s, x.ctx, a, scopeOf(x, src, t));
  switch (effect.type) {
    case "damage": {
      const bonus = (src.kind === "spell" ? spellPower(x.s, x.ctx, src.player) : 0) + abilityBonus(x, src);
      const base = amount(effect.amount);
      if (base <= 0) break;
      dealDamage(x, t, base + bonus, {
        player: src.player,
        ...effect.stealOnKill ? { stealer: src.player } : {}
      });
      break;
    }
    case "heal": {
      const base = amount(effect.amount);
      if (base > 0) healTarget(x, t, base + abilityBonus(x, src));
      break;
    }
    case "buff": {
      const duration = effect.duration ?? (effect.temporary ? "turn" : "permanent");
      buffCreature(x, t.player, lane, amount(effect.atk), amount(effect.def), duration);
      break;
    }
    case "destroy":
      if (t.kind === "creature") destroyCreature(x, t.player, lane);
      break;
    case "returnToHand":
      returnCreatureToHand(x, t.player, lane);
      break;
    case "move":
      moveCreatureRandomly(x, t.player, lane);
      break;
    case "freeze":
      freezeCreature(x, t.player, lane);
      break;
    case "poison":
      poisonCreature(x, t.player, lane, effect.amount + abilityBonus(x, src));
      break;
    case "shield":
      shieldCreature(x, t.player, lane);
      break;
    case "grantKeyword":
      grantKeyword(x, t.player, lane, effect.keyword);
      break;
    case "flip":
      flipLandscape(x, t.player, lane);
      break;
    case "convert":
      convertLandscape(x, t.player, lane, effect.to);
      break;
    case "restore":
      restoreLandscape(x, t.player, lane);
      break;
    case "reset":
      resetCreature(x, t.player, lane);
      break;
    case "swapStats": {
      const c = x.s.players[t.player].lanes[lane]?.creature;
      if (c) {
        const def = Math.max(0, creatureDef(x.s, x.ctx, c, lane));
        swapCreatureStats(x, t.player, lane, creatureAtk(x.s, x.ctx, c, lane), def);
      }
      break;
    }
    case "lockFloop":
      setCreatureStatus(x, t.player, lane, "floopLocked", nextTurnOf(x.s, t.player));
      break;
    case "lockAttack":
      setCreatureStatus(x, t.player, lane, "attackLocked", nextTurnOf(x.s, t.player));
      break;
    case "redirect":
      setCreatureStatus(x, t.player, lane, "redirect", nextTurnOf(x.s, src.player));
      break;
    case "forceAttack":
      strike(x, t.player, lane, true);
      break;
    case "activateFloop": {
      const c = x.s.players[t.player].lanes[lane]?.creature;
      if (!c) break;
      const card = getCard(x.ctx.cards, c.cardId);
      if (card.type !== "creature" || !card.floop) break;
      if (card.floop.effects.some((e) => e.type === "activateFloop")) break;
      const chosen = autoChoose(x, card.floop.effects, t.player);
      x.queue.push({
        source: { player: t.player, kind: "creature", iid: c.iid, cardId: c.cardId, lane },
        trigger: "floop",
        effects: card.floop.effects,
        ...chosen ? { chosen } : {}
      });
      break;
    }
    case "seal": {
      const l = x.s.players[t.player].lanes[lane];
      if (!l) break;
      l.sealedUntil = Math.max(l.sealedUntil ?? 0, nextTurnOf(x.s, t.player));
      x.events.push({ type: "laneSealed", player: t.player, lane });
      break;
    }
    case "wipeLane":
      for (const p of [0, 1]) {
        if (x.s.players[p].lanes[lane]?.creature) destroyCreature(x, p, lane);
        if (x.s.players[p].lanes[lane]?.building) destroyBuilding(x, p, lane);
      }
      break;
    case "destroyBuilding":
      destroyBuilding(x, t.player, lane);
      break;
    case "returnBuilding":
      returnBuildingToHand(x, t.player, lane);
      break;
    case "moveBuilding":
      moveBuildingRandomly(x, t.player, lane);
      break;
  }
}
function bestFirst(x, cards) {
  const value = (c) => {
    const def = getCard(x.ctx.cards, c.cardId);
    return def.cost * 10 + starsOf(def);
  };
  return [...cards].sort((a, b) => value(b) - value(a));
}
function applyEffect(x, effect, pending) {
  const src = pending.source;
  const me = src.player;
  if (effect.when && !checkCondition(x, effect.when, src)) return;
  const n = (a) => evalAmount(x.s, x.ctx, a, scopeOf(x, src));
  switch (effect.type) {
    case "draw": {
      if (!countResolution(x)) return;
      const amount = n(effect.amount);
      if (amount > 0) drawCards(x, effect.who === "enemy" ? other(me) : me, amount);
      return;
    }
    case "discard":
      if (!countResolution(x)) return;
      discardRandom(x, effect.who === "self" ? me : other(me), effect.amount);
      return;
    case "gainMp": {
      if (!countResolution(x)) return;
      const amount = n(effect.amount);
      if (amount <= 0) return;
      if (effect.nextTurn) {
        const p = x.s.players[me];
        p.mpPenalty -= amount;
        x.events.push({ type: "mpPenalty", player: me, amount: p.mpPenalty });
      } else changeMp(x, me, amount, MP_EFFECT_CAP);
      return;
    }
    case "loseMp": {
      if (!countResolution(x)) return;
      const opp = other(me);
      x.s.players[opp].mpPenalty += effect.amount;
      x.events.push({ type: "mpPenalty", player: opp, amount: x.s.players[opp].mpPenalty });
      return;
    }
    case "chargeUltimate":
      if (!countResolution(x)) return;
      chargeUltimate(x, me, effect.amount);
      return;
    case "summon":
      for (const lane of summonLanes(x, src, effect.where, effect.count ?? 1)) {
        if (isOver(x) || !countResolution(x)) return;
        summonToken(x, me, lane, effect.cardId);
      }
      return;
    case "costMod": {
      if (!countResolution(x)) return;
      const who = effect.who === "self" ? me : other(me);
      const turn = effect.who === "self" ? x.s.turn : nextTurnOf(x.s, who);
      const p = x.s.players[who];
      p.costMods = [
        ...(p.costMods ?? []).filter((m) => m.turn >= x.s.turn),
        {
          kind: effect.kind,
          amount: effect.amount,
          turn,
          ...effect.landscape !== void 0 ? { landscape: effect.landscape } : {}
        }
      ];
      x.events.push({ type: "costChanged", player: who, kind: effect.kind, amount: effect.amount });
      return;
    }
    case "block": {
      if (!countResolution(x)) return;
      const opp = other(me);
      const p = x.s.players[opp];
      p.blocks = [
        ...(p.blocks ?? []).filter((b) => b.turn >= x.s.turn),
        { what: effect.what, turn: nextTurnOf(x.s, opp) }
      ];
      x.events.push({ type: "playBlocked", player: opp, what: effect.what });
      return;
    }
    case "recover": {
      if (!countResolution(x)) return;
      const pile = x.s.players[me].discard.filter(
        (c) => !effect.cardType || getCard(x.ctx.cards, c.cardId).type === effect.cardType
      );
      const picked = effect.pick === "random" ? x.rng.sample(pile, effect.count ?? 1) : bestFirst(x, pile).slice(0, effect.count ?? 1);
      recoverFromDiscard(
        x,
        me,
        picked.map((c) => c.iid)
      );
      return;
    }
    case "recoverDestroyed": {
      if (!countResolution(x) || !pending.subject) return;
      recoverFromDiscard(x, pending.subject.player, [pending.subject.iid]);
      return;
    }
    case "tutor": {
      if (!countResolution(x)) return;
      const pool = x.s.players[me].deck.filter(
        (c) => !effect.cardType || getCard(x.ctx.cards, c.cardId).type === effect.cardType
      );
      if (pool.length > 0) takeFromDeck(x, me, x.rng.pick(pool).iid);
      return;
    }
    case "cycleHand":
      if (!countResolution(x)) return;
      cycleHand(x, me, effect.draw);
      return;
    case "discardHand":
      if (!countResolution(x)) return;
      discardHand(x, me);
      return;
    default: {
      for (const t of finalTargets(x, effect, src, pending.chosen)) {
        if (isOver(x) || !countResolution(x)) return;
        if (t.kind === "creature" && !x.s.players[t.player].lanes[t.lane]?.creature) continue;
        if (t.kind === "building" && !x.s.players[t.player].lanes[t.lane]?.building) continue;
        applyToTarget(x, effect, t, src);
      }
    }
  }
}
function resolveAbility(x, pending) {
  if (pending.condition && !checkCondition(x, pending.condition, pending.source)) return;
  if (pending.trigger !== "spell" && pending.trigger !== "floop" && pending.trigger !== "ultimate") {
    x.events.push({
      type: "triggered",
      player: pending.source.player,
      trigger: pending.trigger,
      cardId: pending.source.cardId,
      iid: pending.source.iid
    });
  }
  for (const effect of pending.effects) {
    if (isOver(x) || x.limitHit) return;
    applyEffect(x, effect, pending);
  }
}
function drainQueue(x) {
  while (x.queue.length > 0 && !isOver(x)) {
    if (!countResolution(x)) return;
    resolveAbility(x, x.queue.shift());
  }
  x.queue.length = 0;
}
function actionError(code, message) {
  return { code, message };
}
function isPlayerId(v) {
  return v === 0 || v === 1;
}
function isTargetRef(v) {
  if (typeof v !== "object" || v === null) return false;
  const t = v;
  if (!isPlayerId(t.player)) return false;
  if (t.kind === "hero") return true;
  return (t.kind === "creature" || t.kind === "landscape" || t.kind === "building") && typeof t.lane === "number" && Number.isInteger(t.lane);
}
function validateTarget(state, ctx, effects, player, target, required) {
  const selector = chosenSelector(effects);
  if (!selector) {
    return target === void 0 ? null : actionError("TARGET_NOT_ALLOWED", "This does not take a target.");
  }
  if (target === void 0) {
    const any = choicesFor(state, ctx, effects, player).length > 0;
    if (any) return actionError("TARGET_REQUIRED", "Choose a target.");
    return required ? actionError("NO_VALID_TARGET", "There is no valid target.") : null;
  }
  if (!isTargetRef(target) || !isValidChoiceFor(state, ctx, effects, player, target)) {
    return actionError("INVALID_TARGET", "That is not a valid target.");
  }
  return null;
}
function validateArrange(state, a, ctx) {
  if (state.phase !== "arrange")
    return actionError("WRONG_PHASE", "Landscapes can only be arranged before the match.");
  const p = state.players[a.player];
  if (p.arranged) return actionError("ALREADY_DONE", "Landscapes are already arranged.");
  if (!Array.isArray(a.order) || a.order.length !== ctx.balance.laneCount) {
    return actionError("INVALID_ARRANGEMENT", `Place exactly ${ctx.balance.laneCount} landscapes.`);
  }
  const pool = [...p.landscapePool].sort();
  const given = [...a.order].sort();
  if (pool.some((l, i) => l !== given[i])) {
    return actionError(
      "INVALID_ARRANGEMENT",
      "The arrangement must use exactly the landscapes in your deck."
    );
  }
  return null;
}
function validateMulligan(state, a, ctx) {
  if (state.phase !== "mulligan")
    return actionError("WRONG_PHASE", "Mulligans happen before the first turn.");
  const p = state.players[a.player];
  if (p.mulliganDone) return actionError("ALREADY_DONE", "You already kept or mulliganed your hand.");
  if (!Array.isArray(a.iids)) return actionError("INVALID_MULLIGAN", "Mulligan must list cards.");
  if (a.iids.length > 0 && p.mulligansUsed >= ctx.balance.mulligansAllowed) {
    return actionError("INVALID_MULLIGAN", "No mulligans left.");
  }
  if (new Set(a.iids).size !== a.iids.length)
    return actionError("INVALID_MULLIGAN", "A card is listed twice.");
  if (!a.iids.every((iid) => p.hand.some((c) => c.iid === iid))) {
    return actionError("CARD_NOT_IN_HAND", "You can only mulligan cards in your hand.");
  }
  return null;
}
function validatePlayCard(state, a, ctx) {
  const p = state.players[a.player];
  const inst = p.hand.find((c) => c.iid === a.iid);
  if (!inst) return actionError("CARD_NOT_IN_HAND", "That card is not in your hand.");
  const card = ctx.cards.byId.get(inst.cardId);
  if (!card) return actionError("UNKNOWN_CARD", `Unknown card ${inst.cardId}.`);
  const unmet = unmetRequirements(p, card.requirements);
  if (unmet.length > 0) {
    const r = unmet[0];
    return actionError("REQUIREMENT_NOT_MET", `${card.name} needs ${r.count} ${r.landscape} landscape(s).`);
  }
  const cost = cardCost(state, a.player, card);
  if (cost > p.mp) return actionError("NOT_ENOUGH_MP", `${card.name} costs ${cost} MP; you have ${p.mp}.`);
  if ((p.blocks ?? []).some((b) => b.what === card.type && b.turn === state.turn)) {
    return actionError("BLOCKED", `You cannot play ${card.type}s this turn.`);
  }
  if (card.type === "spell") {
    if (a.lane !== void 0) return actionError("LANE_NOT_ALLOWED", "Spells are not played into a lane.");
    return validateTarget(state, ctx, card.effects, a.player, a.target, true);
  }
  if (a.lane === void 0) return actionError("INVALID_LANE", `Choose a lane for ${card.name}.`);
  if (!isValidLane(state, a.lane)) return actionError("INVALID_LANE", "That lane does not exist.");
  const lane = p.lanes[a.lane];
  if (lane.landscape === null) return actionError("INVALID_LANE", "That lane has no landscape.");
  if (lane.flipped) return actionError("LANE_FLIPPED", "You cannot play cards onto a flipped landscape.");
  if ((lane.sealedUntil ?? 0) >= state.turn)
    return actionError("LANE_SEALED", "Nothing can be played there this turn.");
  if (card.type === "creature" && starsOf(card) > laneStarCap(state, ctx, a.player, a.lane)) {
    const cap = laneStarCap(state, ctx, a.player, a.lane);
    return actionError(
      "RARITY_CAP",
      `Only creatures of ${cap} star${cap === 1 ? "" : "s"} or less can go there.`
    );
  }
  return validateTarget(state, ctx, playEffects(card), a.player, a.target, false);
}
function validateFloop(state, a, ctx) {
  if (!isValidLane(state, a.lane)) return actionError("INVALID_LANE", "That lane does not exist.");
  const p = state.players[a.player];
  const c = p.lanes[a.lane].creature;
  if (!c) return actionError("NO_CREATURE", "There is no creature in that lane.");
  const card = ctx.cards.byId.get(c.cardId);
  if (!card || card.type !== "creature" || !card.floop) {
    return actionError("NO_FLOOP", "That creature has no floop ability.");
  }
  if (c.exhausted) return actionError("EXHAUSTED", "That creature is already exhausted.");
  if (c.frozen) return actionError("FROZEN", "Frozen creatures cannot floop.");
  if ((c.floopLock ?? 0) >= state.turn)
    return actionError("FLOOP_LOCKED", "That creature cannot floop this turn.");
  const cost = floopCost(state, ctx, a.player, a.lane);
  if (cost > p.mp) {
    return actionError("NOT_ENOUGH_MP", `Flooping costs ${cost} MP; you have ${p.mp}.`);
  }
  if (card.floop.condition) {
    const view = createExec(state, ctx);
    const src = { player: a.player, iid: c.iid, cardId: c.cardId, lane: a.lane };
    if (!checkCondition(view, card.floop.condition, src)) {
      return actionError("CONDITION_NOT_MET", "This floop's condition is not met.");
    }
  }
  return validateTarget(state, ctx, card.floop.effects, a.player, a.target, true);
}
function moveCost(state, a, ctx) {
  const c = state.players[a.player].lanes[a.from]?.creature;
  return c && keywordValue(state, ctx, c, a.from, "swift") > 0 ? 0 : ctx.balance.moveCost;
}
function validateMove(state, a, ctx) {
  if (!isValidLane(state, a.from) || !isValidLane(state, a.to)) {
    return actionError("INVALID_LANE", "That lane does not exist.");
  }
  if (a.from === a.to) return actionError("INVALID_LANE", "Choose a different lane.");
  const p = state.players[a.player];
  const c = p.lanes[a.from].creature;
  if (!c) return actionError("NO_CREATURE", "There is no creature in that lane.");
  const dest = p.lanes[a.to];
  if (dest.creature) return actionError("LANE_OCCUPIED", "Creatures can only move to an empty lane.");
  if (dest.landscape === null || dest.flipped) {
    return actionError("LANE_FLIPPED", "Creatures cannot move onto a flipped landscape.");
  }
  if (c.movesThisTurn >= ctx.balance.maxMovesPerCreaturePerTurn) {
    return actionError("MOVE_LIMIT", "That creature already moved this turn.");
  }
  const cost = moveCost(state, a, ctx);
  if (cost > p.mp) return actionError("NOT_ENOUGH_MP", `Moving costs ${cost} MP; you have ${p.mp}.`);
  return null;
}
function validateBuyDraw(state, player, ctx) {
  const p = state.players[player];
  if (p.extraDrawsThisTurn >= ctx.balance.extraDrawsPerTurn) {
    return actionError("DRAW_LIMIT", "You already bought a draw this turn.");
  }
  if (p.deck.length === 0) return actionError("DECK_EMPTY", "Your deck is empty.");
  if (ctx.balance.extraDrawCost > p.mp) {
    return actionError("NOT_ENOUGH_MP", `Drawing costs ${ctx.balance.extraDrawCost} MP; you have ${p.mp}.`);
  }
  return null;
}
function validateUltimate(state, a, ctx) {
  const p = state.players[a.player];
  if (p.ultimateCharge < ctx.balance.ultimateChargeMax) {
    return actionError("ULTIMATE_NOT_READY", `Ultimate is ${p.ultimateCharge}% charged.`);
  }
  const hero = ctx.heroes.byId.get(p.heroId);
  if (!hero) return actionError("UNKNOWN_CARD", `Unknown hero ${p.heroId}.`);
  return validateTarget(state, ctx, hero.ultimate.effects, a.player, a.target, true);
}
function validateEndTurn(state, a) {
  if (a.discard === void 0) return null;
  const p = state.players[a.player];
  if (!Array.isArray(a.discard) || new Set(a.discard).size !== a.discard.length) {
    return actionError("INVALID_DISCARD", "Discard list is invalid.");
  }
  if (!a.discard.every((iid) => p.hand.some((c) => c.iid === iid))) {
    return actionError("CARD_NOT_IN_HAND", "You can only discard cards in your hand.");
  }
  return null;
}
function validateAction(state, action, ctx) {
  if (typeof action !== "object" || action === null)
    return actionError("UNKNOWN_ACTION", "Malformed action.");
  if (state.phase === "ended") return actionError("GAME_OVER", "The game is over.");
  if (!isPlayerId(action.player)) return actionError("INVALID_PLAYER", "Unknown player.");
  switch (action.type) {
    case "surrender":
      return null;
    case "arrangeLandscapes":
      return validateArrange(state, action, ctx);
    case "mulligan":
      return validateMulligan(state, action, ctx);
    case "playCard":
    case "floop":
    case "moveCreature":
    case "buyDraw":
    case "useUltimate":
    case "endTurn": {
      if (state.phase !== "main") return actionError("WRONG_PHASE", "The match has not started yet.");
      if (action.player !== state.activePlayer) return actionError("NOT_YOUR_TURN", "It is not your turn.");
      switch (action.type) {
        case "playCard":
          return validatePlayCard(state, action, ctx);
        case "floop":
          return validateFloop(state, action, ctx);
        case "moveCreature":
          return validateMove(state, action, ctx);
        case "buyDraw":
          return validateBuyDraw(state, action.player, ctx);
        case "useUltimate":
          return validateUltimate(state, action, ctx);
        case "endTurn":
          return validateEndTurn(state, action);
      }
      break;
    }
  }
  return actionError(
    "UNKNOWN_ACTION",
    `Unknown action type "${String(action.type)}".`
  );
}
function doArrange(x, a) {
  const p = x.s.players[a.player];
  a.order.forEach((landscape, i) => {
    p.lanes[i].landscape = landscape;
  });
  p.arranged = true;
  x.events.push({ type: "landscapesArranged", player: a.player, order: [...a.order] });
  if (x.s.players.every((pl) => pl.arranged)) {
    x.s.phase = "mulligan";
    if (x.ctx.balance.mulligansAllowed === 0) {
      for (const pl of x.s.players) pl.mulliganDone = true;
      beginFirstTurn(x);
    }
  }
}
function doMulligan(x, a) {
  const p = x.s.players[a.player];
  if (a.iids.length > 0) {
    const returned = p.hand.filter((c) => a.iids.includes(c.iid));
    p.hand = p.hand.filter((c) => !a.iids.includes(c.iid));
    p.deck = x.rng.shuffle([...p.deck, ...returned]);
    p.mulligansUsed++;
    x.events.push({ type: "mulligan", player: a.player, returned: returned.length });
    drawCards(x, a.player, returned.length);
  } else {
    x.events.push({ type: "mulligan", player: a.player, returned: 0 });
  }
  p.mulliganDone = true;
  if (x.s.players.every((pl) => pl.mulliganDone)) beginFirstTurn(x);
}
function beginFirstTurn(x) {
  x.s.phase = "main";
  startTurn(x, x.s.firstPlayer);
}
function takeFromHand(x, a) {
  const p = x.s.players[a.player];
  const idx = p.hand.findIndex((c) => c.iid === a.iid);
  return p.hand.splice(idx, 1)[0];
}
function doPlayCard(x, a) {
  const p = x.s.players[a.player];
  const card = getCard(x.ctx.cards, p.hand.find((c) => c.iid === a.iid).cardId);
  const cost = cardCost(x.s, a.player, card);
  const inst = takeFromHand(x, a);
  changeMp(x, a.player, -cost);
  x.events.push({
    type: "cardPlayed",
    player: a.player,
    iid: inst.iid,
    cardId: inst.cardId,
    lane: a.lane ?? null,
    target: a.target ?? null
  });
  if (card.type === "spell") {
    p.discard.push(inst);
    const pending = {
      source: { player: a.player, kind: "spell", iid: inst.iid, cardId: inst.cardId, lane: null },
      trigger: "spell",
      effects: card.effects,
      ...a.target ? { chosen: a.target } : {}
    };
    x.queue.push(pending);
    queuePlayerTrigger(x, a.player, "onSpellCast");
    drainQueue(x);
    return;
  }
  const laneIndex = a.lane;
  const lane = p.lanes[laneIndex];
  if (card.type === "creature") {
    if (lane.creature) replaceCreature(x, a.player, laneIndex);
    lane.creature = newCreature(x, inst, false);
    x.events.push({
      type: "creatureSummoned",
      player: a.player,
      iid: inst.iid,
      cardId: inst.cardId,
      lane: laneIndex,
      token: false
    });
    checkDeaths(x);
    const src = {
      player: a.player,
      kind: "creature",
      iid: inst.iid,
      cardId: inst.cardId,
      lane: laneIndex
    };
    queueCardTrigger(x, src, "onPlay", a.target);
    queuePlayerTrigger(x, a.player, "onAllyCreaturePlayed", inst.iid);
    queueBuildingTrigger(x, a.player, laneIndex, "onLaneCreaturePlayed");
  } else {
    if (lane.building) {
      const old = lane.building;
      lane.building = null;
      p.discard.push(old);
      x.events.push({
        type: "cardReplaced",
        player: a.player,
        iid: old.iid,
        cardId: old.cardId,
        lane: laneIndex
      });
    }
    lane.building = inst;
    x.events.push({
      type: "buildingPlaced",
      player: a.player,
      iid: inst.iid,
      cardId: inst.cardId,
      lane: laneIndex
    });
    checkDeaths(x);
    const src = {
      player: a.player,
      kind: "building",
      iid: inst.iid,
      cardId: inst.cardId,
      lane: laneIndex
    };
    queueCardTrigger(x, src, "onPlay", a.target);
  }
  drainQueue(x);
}
function doFloop(x, a) {
  const p = x.s.players[a.player];
  const c = p.lanes[a.lane].creature;
  const card = getCard(x.ctx.cards, c.cardId);
  if (card.type !== "creature" || !card.floop) return;
  changeMp(x, a.player, -floopCost(x.s, x.ctx, a.player, a.lane));
  c.exhausted = true;
  c.floopCount = (c.floopCount ?? 0) + 1;
  p.floopsThisTurn = (p.floopsThisTurn ?? 0) + 1;
  x.events.push({ type: "floop", player: a.player, iid: c.iid, lane: a.lane });
  const src = { player: a.player, kind: "creature", iid: c.iid, cardId: c.cardId, lane: a.lane };
  x.queue.push({
    source: src,
    trigger: "floop",
    effects: card.floop.effects,
    ...a.target ? { chosen: a.target } : {}
  });
  queueCardTrigger(x, src, "onFloop");
  queueBuildingTrigger(x, a.player, a.lane, "onFloop");
  queuePlayerTrigger(x, a.player, "onAllyFloop");
  drainQueue(x);
}
function doUltimate(x, a) {
  const p = x.s.players[a.player];
  const hero = getHero(x.ctx.heroes, p.heroId);
  p.ultimateCharge = 0;
  p.ultimatesUsed++;
  x.events.push({ type: "ultimateUsed", player: a.player, heroId: hero.id });
  x.events.push({ type: "ultimateCharge", player: a.player, charge: 0 });
  x.queue.push({
    source: { player: a.player, kind: "hero", iid: null, cardId: null, lane: null },
    trigger: "ultimate",
    effects: hero.ultimate.effects,
    ...a.target ? { chosen: a.target } : {}
  });
  drainQueue(x);
}
function doMove(x, a, cost) {
  const p = x.s.players[a.player];
  const c = p.lanes[a.from].creature;
  changeMp(x, a.player, -cost);
  p.lanes[a.from].creature = null;
  p.lanes[a.to].creature = c;
  c.movesThisTurn++;
  x.events.push({ type: "creatureMoved", player: a.player, iid: c.iid, from: a.from, to: a.to, cost });
  checkDeaths(x);
  drainQueue(x);
}
function applyAction(state, action, ctx) {
  const error = validateAction(state, action, ctx);
  if (error) return { ok: false, error };
  const moveCostValue = action.type === "moveCreature" ? moveCost(state, action, ctx) : 0;
  const x = createExec(cloneState(state), ctx);
  switch (action.type) {
    case "arrangeLandscapes":
      doArrange(x, action);
      break;
    case "mulligan":
      doMulligan(x, action);
      break;
    case "playCard":
      doPlayCard(x, action);
      break;
    case "floop":
      doFloop(x, action);
      break;
    case "moveCreature":
      doMove(x, action, moveCostValue);
      break;
    case "buyDraw": {
      const p = x.s.players[action.player];
      changeMp(x, action.player, -ctx.balance.extraDrawCost);
      p.extraDrawsThisTurn++;
      drawCards(x, action.player, 1);
      break;
    }
    case "useUltimate":
      doUltimate(x, action);
      break;
    case "endTurn":
      endTurn(x, action.player, action.discard);
      break;
    case "surrender":
      endGame(x, other(action.player), "surrender");
      break;
  }
  x.s.rng = x.rng.state;
  return { ok: true, state: x.s, events: x.events };
}
function playersToAct(state) {
  switch (state.phase) {
    case "arrange":
      return state.players.filter((p) => !p.arranged).map((p) => p.id);
    case "mulligan":
      return state.players.filter((p) => !p.mulliganDone).map((p) => p.id);
    case "main":
      return [state.activePlayer];
    case "ended":
      return [];
  }
}
const rating = { "start": 1e3, "kNew": 40, "k": 24, "newPlayerGames": 20, "softResetFactor": 0.5, "seasonDays": 42, "tiers": [{ "name": "Bronze", "min": 0 }, { "name": "Silver", "min": 1100 }, { "name": "Gold", "min": 1300 }, { "name": "Platinum", "min": 1500 }, { "name": "Diamond", "min": 1700 }, { "name": "Legend", "min": 1900 }] };
const matchmaking = { "baseWindow": 100, "windowPerSecond": 5, "maxWindow": 500, "queueTimeoutSeconds": 300 };
const rewards = { "rankedWin": { "coins": 60, "xp": 60 }, "rankedLoss": { "coins": 20, "xp": 25 }, "seasonEnd": { "Bronze": { "coins": 150 }, "Silver": { "coins": 300 }, "Gold": { "coins": 400, "gems": 20 }, "Platinum": { "coins": 500, "gems": 40 }, "Diamond": { "coins": 600, "gems": 80 }, "Legend": { "coins": 800, "gems": 150 } } };
const saveCaps = { "coinsPerHour": 2500, "gemsPerHour": 150, "dustPerHour": 1e3, "xpPerHour": 2500, "cardsPerHour": 60, "minHours": 1, "maxHours": 72 };
const raw$2 = {
  rating,
  matchmaking,
  rewards,
  saveCaps
};
const ONLINE = raw$2;
function tierOf(rating2) {
  let name = ONLINE.rating.tiers[0].name;
  for (const t of ONLINE.rating.tiers) if (rating2 >= t.min) name = t.name;
  return name;
}
function expectedScore(a, b) {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}
function updateRating(rating2, opponent, score, gamesPlayed) {
  const k = gamesPlayed < ONLINE.rating.newPlayerGames ? ONLINE.rating.kNew : ONLINE.rating.k;
  return Math.max(0, Math.round(rating2 + k * (score - expectedScore(rating2, opponent))));
}
function softReset(rating2) {
  const start = ONLINE.rating.start;
  return Math.round(start + (rating2 - start) * ONLINE.rating.softResetFactor);
}
function matchWindow(waitSeconds) {
  const m = ONLINE.matchmaking;
  return Math.min(m.maxWindow, m.baseWindow + m.windowPerSecond * Math.max(0, waitSeconds));
}
const HIDDEN_CARD = "__hidden";
const faceDown = (c, i, prefix) => ({
  iid: `${prefix}${i}`,
  cardId: HIDDEN_CARD,
  owner: c.owner
});
function redactState(state, viewer) {
  const s = cloneState(state);
  s.seed = 0;
  s.rng = 0;
  for (const p of s.players) {
    p.deck = p.deck.map((c, i) => faceDown(c, i, `deck${p.id}-`));
    if (p.id !== viewer) p.hand = p.hand.map((c, i) => faceDown(c, i, `hand${p.id}-`));
  }
  return s;
}
function redactEvents(events, viewer) {
  return events.map((e) => {
    if (e.type === "cardDrawn" && e.player !== viewer)
      return { ...e, cardId: HIDDEN_CARD, iid: `drawn-${e.iid}` };
    return e;
  });
}
const xp = { "match": { "win": 60, "loss": 25, "draw": 30 }, "levelThresholds": [0, 100, 250, 450, 700, 1e3, 1350, 1750, 2200, 2700, 3250, 3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10450], "levelUpReward": { "coins": 100, "gemsEvery5Levels": 20 } };
const chests = { "slots": 4, "freeChest": { "type": "wooden", "intervalHours": 4 }, "minutesPerGem": 10, "victoryDrop": { "wooden": 0.6, "silver": 0.3, "golden": 0.08, "magic": 0.02 }, "types": { "wooden": { "name": "Wooden Chest", "unlockMinutes": 60, "coins": [20, 40], "cards": 3, "dust": [0, 10], "gemsChance": 0, "gems": [0, 0], "odds": { "common": 0.75, "uncommon": 0.2, "rare": 0.05, "epic": 0, "legendary": 0 } }, "silver": { "name": "Silver Chest", "unlockMinutes": 180, "coins": [50, 90], "cards": 5, "dust": [10, 30], "gemsChance": 0.1, "gems": [2, 5], "odds": { "common": 0.62, "uncommon": 0.28, "rare": 0.09, "epic": 0.01, "legendary": 0 } }, "golden": { "name": "Golden Chest", "unlockMinutes": 480, "coins": [120, 200], "cards": 8, "dust": [30, 60], "gemsChance": 0.3, "gems": [5, 10], "odds": { "common": 0.5, "uncommon": 0.32, "rare": 0.14, "epic": 0.035, "legendary": 5e-3 } }, "magic": { "name": "Magic Chest", "unlockMinutes": 720, "coins": [200, 320], "cards": 10, "dust": [50, 100], "gemsChance": 0.6, "gems": [10, 20], "odds": { "common": 0.35, "uncommon": 0.35, "rare": 0.2, "epic": 0.08, "legendary": 0.02 } } } };
const packs = [{ "id": "basic", "name": "Basic Pack", "description": "5 cards, at least one Uncommon or better.", "cost": { "coins": 300 }, "cards": 5, "guaranteed": "uncommon", "odds": { "common": 0.7, "uncommon": 0.22, "rare": 0.07, "epic": 9e-3, "legendary": 1e-3 } }, { "id": "premium", "name": "Premium Pack", "description": "5 cards, at least one Rare or better.", "cost": { "gems": 60 }, "cards": 5, "guaranteed": "rare", "odds": { "common": 0.45, "uncommon": 0.33, "rare": 0.16, "epic": 0.05, "legendary": 0.01 } }, { "id": "landscape", "name": "Landscape Pack", "description": "5 cards from the landscape you choose.", "cost": { "coins": 400 }, "cards": 5, "guaranteed": "uncommon", "landscapeChoice": true, "odds": { "common": 0.7, "uncommon": 0.22, "rare": 0.07, "epic": 9e-3, "legendary": 1e-3 } }];
const login = [{ "coins": 100 }, { "coins": 150 }, { "dust": 50 }, { "coins": 200 }, { "gems": 10 }, { "chest": "silver" }, { "gems": 25, "chest": "golden" }];
const quests = { "perDay": 3, "pool": [{ "id": "win_2", "text": "Win 2 matches", "stat": "wins", "target": 2, "reward": { "coins": 80, "xp": 40 } }, { "id": "play_3", "text": "Play 3 matches", "stat": "matches", "target": 3, "reward": { "coins": 60, "xp": 30 } }, { "id": "creatures_15", "text": "Play 15 creatures", "stat": "creaturesPlayed", "target": 15, "reward": { "coins": 70, "xp": 35 } }, { "id": "spells_8", "text": "Cast 8 spells", "stat": "spellsCast", "target": 8, "reward": { "coins": 70, "xp": 35 } }, { "id": "damage_40", "text": "Deal 40 damage to enemy Heroes", "stat": "heroDamage", "target": 40, "reward": { "coins": 80, "xp": 40 } }, { "id": "destroy_10", "text": "Destroy 10 enemy creatures", "stat": "creaturesDestroyed", "target": 10, "reward": { "coins": 70, "xp": 35 } }, { "id": "ultimate_2", "text": "Use your Ultimate 2 times", "stat": "ultimatesUsed", "target": 2, "reward": { "coins": 60, "xp": 30 } }, { "id": "floop_5", "text": "Floop 5 times", "stat": "floops", "target": 5, "reward": { "coins": 60, "xp": 30 } }] };
const achievements = [{ "id": "first_win", "name": "First Victory", "text": "Win a match", "stat": "wins", "target": 1, "reward": { "gems": 10 } }, { "id": "wins_10", "name": "Seasoned", "text": "Win 10 matches", "stat": "wins", "target": 10, "reward": { "gems": 20 } }, { "id": "wins_50", "name": "Champion", "text": "Win 50 matches", "stat": "wins", "target": 50, "reward": { "gems": 50 } }, { "id": "creatures_100", "name": "Summoner", "text": "Play 100 creatures", "stat": "creaturesPlayed", "target": 100, "reward": { "coins": 300 } }, { "id": "spells_100", "name": "Spellslinger", "text": "Cast 100 spells", "stat": "spellsCast", "target": 100, "reward": { "coins": 300 } }, { "id": "damage_1000", "name": "Hero Hunter", "text": "Deal 1000 damage to enemy Heroes", "stat": "heroDamage", "target": 1e3, "reward": { "gems": 30 } }, { "id": "ultimate_25", "name": "Unleashed", "text": "Use your Ultimate 25 times", "stat": "ultimatesUsed", "target": 25, "reward": { "coins": 500 } }, { "id": "chests_10", "name": "Treasure Hunter", "text": "Open 10 chests", "stat": "chestsOpened", "target": 10, "reward": { "gems": 20 } }, { "id": "collector", "name": "Collector", "text": "Own every card", "stat": "uniqueCards", "target": 130, "reward": { "gems": 100 } }, { "id": "master_card", "name": "Master", "text": "Level a card to 5", "stat": "maxCardLevel", "target": 5, "reward": { "gems": 30 } }, { "id": "player_10", "name": "Veteran", "text": "Reach player level 10", "stat": "playerLevel", "target": 10, "reward": { "gems": 50 } }];
const campaign = { "firstClearCoins": [40, 50, 60, 70, 80, 90, 100, 120], "firstClearXp": [30, 35, 40, 45, 50, 55, 60, 70], "gemsPerNewStar": 2, "bossFirstClear": [{ "gems": 10, "chest": "silver" }, { "gems": 10, "chest": "silver" }, { "gems": 15, "chest": "golden" }, { "gems": 15, "chest": "golden" }, { "gems": 20, "chest": "golden" }, { "gems": 20, "chest": "magic" }, { "gems": 25, "chest": "magic" }, { "gems": 50, "chest": "magic" }] };
const modes = { "daily": { "reward": { "coins": 150, "gems": 10, "chest": "golden" }, "ai": "hard", "cardLevel": 3, "decks": ["starter_corn_fields", "starter_blue_plains", "starter_useless_swamp", "starter_sandy_lands", "starter_nice_lands", "starter_corn_swamp", "starter_corn_plains", "starter_plains_sand", "starter_nice_sand", "starter_rainbow_road", "boss_deck_haybale", "boss_deck_glacia", "boss_deck_mire", "boss_deck_scorch", "boss_deck_bonbon", "boss_deck_vex"], "enemyModifiers": ["fortified", "thick_hide", "sharp_claws", "thorny", "tailwind", "spell_echo", "healing_springs", "reinforcements", "war_drums", "toxic_fog", "ember_rain", "scholar", "head_start"], "playerModifiers": ["charged", "head_start", "weary", "healing_springs", "spell_echo"] }, "gauntlet": { "battles": 5, "healBetween": 4, "ai": ["easy", "normal", "normal", "hard", "hard"], "cardLevels": [1, 2, 2, 3, 4], "rewards": [{ "coins": 40 }, { "coins": 100 }, { "coins": 160, "dust": 20 }, { "coins": 220, "gems": 5, "dust": 40 }, { "coins": 300, "gems": 10, "chest": "silver" }, { "coins": 400, "gems": 20, "chest": "golden" }] }, "draft": { "entry": { "coins": 200 }, "picks": 30, "maxWins": 7, "maxLosses": 3, "odds": { "common": 0.6, "uncommon": 0.25, "rare": 0.11, "epic": 0.03, "legendary": 0.01 }, "basicsPerLandscape": 5, "ai": ["normal", "normal", "normal", "hard", "hard", "hard", "hard", "nightmare", "nightmare"], "cardLevel": 2, "rewards": [{ "coins": 60, "dust": 20 }, { "coins": 120, "dust": 30 }, { "coins": 180, "dust": 40 }, { "coins": 240, "gems": 5, "dust": 50 }, { "coins": 300, "gems": 10, "chest": "silver" }, { "coins": 360, "gems": 15, "chest": "silver" }, { "coins": 420, "gems": 25, "chest": "golden" }, { "coins": 500, "gems": 40, "chest": "magic" }] }, "sandbox": { "dummyHp": 100 } };
const raw$1 = {
  xp,
  chests,
  packs,
  login,
  quests,
  achievements,
  campaign,
  modes
};
const weights = { "heroHp": 1.2, "enemyLowHpBonus": 0.35, "creatureAtk": 1.1, "creatureDef": 0.7, "keyword": 0.6, "pressure": 0.9, "lethalThreat": 14, "card": 0.9, "deckOut": 0.8, "charge": 0.03, "building": 1.6, "flippedEnemyLandscape": 0.8, "frozenPenalty": 0.5, "poisonPenalty": 0.8 };
const profiles = { "easy": { "name": "Easy", "depth": 1, "beam": 1, "temperature": 6, "topK": 5, "mistakeRate": 0.45, "maxEvaluations": 150, "timeBudgetMs": 150, "lookaheadOpponentCombat": false, "weightScale": { "pressure": 0.3, "lethalThreat": 0.2 } }, "normal": { "name": "Normal", "depth": 2, "beam": 3, "temperature": 0.8, "topK": 3, "mistakeRate": 0.1, "maxEvaluations": 800, "timeBudgetMs": 400, "lookaheadOpponentCombat": true }, "hard": { "name": "Hard", "depth": 2, "beam": 5, "temperature": 0.15, "topK": 2, "mistakeRate": 0.02, "maxEvaluations": 2e3, "timeBudgetMs": 800, "lookaheadOpponentCombat": true, "weightScale": { "pressure": 1.5 } }, "nightmare": { "name": "Nightmare", "depth": 3, "beam": 6, "temperature": 0, "topK": 1, "mistakeRate": 0, "maxEvaluations": 5e3, "timeBudgetMs": 1e3, "lookaheadOpponentCombat": true } };
const raw = {
  weights,
  profiles
};
const DIFFICULTIES = ["easy", "normal", "hard", "nightmare"];
function validate() {
  const errors2 = [];
  for (const d of DIFFICULTIES) {
    const p = raw.profiles[d];
    if (!p) {
      errors2.push(`missing profile "${d}"`);
      continue;
    }
    for (const k of ["depth", "beam", "topK", "maxEvaluations", "timeBudgetMs"]) {
      const v = p[k];
      if (typeof v !== "number" || !Number.isInteger(v) || v < 1)
        errors2.push(`${d}.${k} must be a positive integer`);
    }
    for (const k of ["temperature", "mistakeRate"]) {
      const v = p[k];
      if (typeof v !== "number" || v < 0) errors2.push(`${d}.${k} must be >= 0`);
    }
    if (typeof p.mistakeRate === "number" && p.mistakeRate > 1) errors2.push(`${d}.mistakeRate must be <= 1`);
  }
  for (const [k, v] of Object.entries(raw.weights)) {
    if (typeof v !== "number" || !Number.isFinite(v)) errors2.push(`weights.${k} must be a number`);
  }
  return errors2;
}
const errors = validate();
if (errors.length > 0) throw new Error(`Invalid ai-profiles.json:
- ${errors.join("\n- ")}`);
const deckSlots = 10;
const startingCurrencies = { "coins": 500, "gems": 20, "dust": 150 };
const maxLevel = 5;
const economy = {
  deckSlots,
  startingCurrencies,
  maxLevel
};
const SAVE_VERSION = 6;
const CARD_BACK_IDS = ["classic", "starry", "checker"];
const STAT_KEYS = [
  "matches",
  "wins",
  "losses",
  "draws",
  "creaturesPlayed",
  "spellsCast",
  "heroDamage",
  "creaturesDestroyed",
  "ultimatesUsed",
  "floops",
  "chestsOpened",
  "cardsOpened"
];
function emptyStats() {
  return Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
}
const CHEST_TYPES = ["wooden", "silver", "golden", "magic"];
function emptyModeState() {
  return { daily: { day: null, won: false, attempts: 0 }, gauntlet: null, draft: null };
}
function starterCollection(content) {
  const out = {};
  for (const deck of content.starterDecks) {
    const counts = /* @__PURE__ */ new Map();
    for (const id of deck.cards) counts.set(id, (counts.get(id) ?? 0) + 1);
    for (const [id, n] of counts) out[id] = { count: Math.max(out[id]?.count ?? 0, n), level: 1 };
  }
  return out;
}
function deckSlotFromList(id, name, heroId, landscapes, cards, now) {
  const counts = {};
  for (const c of cards) counts[c] = (counts[c] ?? 0) + 1;
  return { id, name, heroId, landscapes: [...landscapes], cards: counts, updatedAt: now };
}
function createNewSave(content, now) {
  const decks = Array.from({ length: economy.deckSlots }, () => null);
  content.starterDecks.slice(0, 3).forEach((d, i) => {
    decks[i] = deckSlotFromList(`deck-${i + 1}`, d.name, d.heroId, d.landscapes, d.cards, now);
  });
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    profile: { name: "Player", avatar: "finn", cardBack: "classic" },
    currencies: { ...economy.startingCurrencies },
    collection: starterCollection(content),
    decks,
    selectedDeck: 0,
    progression: { xp: 0, level: 1 },
    chests: { slots: [null, null, null, null], freeReadyAt: 0 },
    login: { lastClaimDay: null, streakIndex: 0 },
    quests: { day: null, active: [] },
    achievements: { claimed: [] },
    lifetime: emptyStats(),
    campaign: { stars: {}, storySeen: [] },
    tutorial: { done: [], offered: false },
    modes: emptyModeState()
  };
}
const MIGRATIONS = {
  /**
   * v0 → v1: the pre-release prototype stored `cards: { id: count }` and a
   * single `deck` array. Kept as the reference example for future migrations.
   */
  0: (s) => {
    const cards = s.cards ?? {};
    const collection = {};
    for (const [id, count] of Object.entries(cards)) collection[id] = { count, level: 1 };
    const decks = Array.from({ length: economy.deckSlots }, () => null);
    const legacyDeck = s.deck;
    if (legacyDeck?.cards) {
      decks[0] = deckSlotFromList(
        "deck-1",
        "My Deck",
        legacyDeck.heroId ?? "finn",
        legacyDeck.landscapes ?? ["golden", "golden", "golden", "golden"],
        legacyDeck.cards,
        0
      );
    }
    return {
      version: 1,
      createdAt: 0,
      updatedAt: 0,
      profile: { name: typeof s.name === "string" ? s.name : "Player" },
      currencies: { coins: Number(s.coins ?? 0), gems: 0, dust: 0 },
      collection,
      decks,
      selectedDeck: 0,
      stats: { matchesPlayed: 0, wins: 0, losses: 0 }
    };
  },
  /** v1 → v2: progression, chests, login, quests, achievements; stats become lifetime counters. */
  1: (s) => {
    const old = s.stats ?? {};
    const { stats: _stats, ...rest } = s;
    return {
      ...rest,
      version: 2,
      progression: { xp: 0, level: 1 },
      chests: { slots: [null, null, null, null], freeReadyAt: 0 },
      login: { lastClaimDay: null, streakIndex: 0 },
      quests: { day: null, active: [] },
      achievements: { claimed: [] },
      lifetime: {
        ...emptyStats(),
        matches: old.matchesPlayed ?? 0,
        wins: old.wins ?? 0,
        losses: old.losses ?? 0
      }
    };
  },
  /** v2 → v3: campaign stars and tutorial progress. Existing players are not prompted for the tutorial. */
  2: (s) => ({
    ...s,
    version: 3,
    campaign: { stars: {}, storySeen: [] },
    tutorial: { done: [], offered: true }
  }),
  /** v3 → v4: daily dungeon, gauntlet and draft runs. */
  3: (s) => ({ ...s, version: 4, modes: emptyModeState() }),
  /** v4 → v5: profile avatar and card back. */
  4: (s) => ({
    ...s,
    version: 5,
    profile: { ...s.profile ?? {}, avatar: "finn", cardBack: "classic" }
  }),
  /**
   * v5 → v6: the card pool was replaced. Old cards become Dust (per copy, by
   * level), decks are cleared (repair puts the new starter decks in), and the
   * avatar resets because the old heroes are gone.
   */
  5: (s) => {
    let copies = 0;
    for (const v of Object.values(s.collection ?? {})) {
      copies += nonNegInt(v?.count) * Math.max(1, nonNegInt(v?.level, 1));
    }
    const cur = s.currencies ?? {};
    return {
      ...s,
      version: 6,
      collection: {},
      decks: [],
      selectedDeck: 0,
      currencies: { ...cur, dust: nonNegInt(cur.dust) + Math.min(2e4, copies * CARD_POOL_REFUND_DUST) },
      profile: { ...s.profile ?? {}, avatar: "finn" },
      modes: emptyModeState()
    };
  }
};
const CARD_POOL_REFUND_DUST = 10;
function migrate(raw2) {
  if (typeof raw2 !== "object" || raw2 === null) throw new Error("Save is not an object");
  let s = raw2;
  let version2 = typeof s.version === "number" ? s.version : 0;
  if (version2 > SAVE_VERSION)
    throw new Error(`Save version ${version2} is newer than this game (${SAVE_VERSION})`);
  while (version2 < SAVE_VERSION) {
    const step = MIGRATIONS[version2];
    if (!step) throw new Error(`No migration from save version ${version2}`);
    s = step(s);
    version2 = s.version;
  }
  return s;
}
function nonNegInt(v, fallback = 0) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
}
function repairSave(s, content, now) {
  const fresh = createNewSave(content, now);
  const fixes = [];
  const cards = content.ctx.cards;
  const collection = {};
  for (const [id, v] of Object.entries(s.collection ?? {})) {
    const card = cards.byId.get(id);
    if (!card || card.token) {
      fixes.push(`removed unknown card "${id}"`);
      continue;
    }
    const o = v ?? {};
    const count = nonNegInt(o.count);
    const level = Math.min(economy.maxLevel, Math.max(1, nonNegInt(o.level, 1)));
    if (count > 0) collection[id] = { count, level };
  }
  for (const [id, owned] of Object.entries(starterCollection(content))) {
    const have = collection[id];
    if (!have || have.count < owned.count) {
      if (have) fixes.push(`topped up starter card "${id}"`);
      collection[id] = { count: owned.count, level: have?.level ?? 1 };
    }
  }
  const decksIn = Array.isArray(s.decks) && s.decks.some(Boolean) ? s.decks : fresh.decks;
  const decks = Array.from({ length: economy.deckSlots }, (_, i) => {
    const d = decksIn[i];
    if (!d) return null;
    const heroOk = typeof d.heroId === "string" && content.ctx.heroes.byId.has(d.heroId) && !content.ctx.heroes.byId.get(d.heroId)?.boss;
    const landscapes = Array.isArray(d.landscapes) ? d.landscapes.filter((l) => LANDSCAPE_TYPES.includes(l)) : [];
    while (landscapes.length < 4) landscapes.push("golden");
    const deckCards = {};
    for (const [id, n] of Object.entries(d.cards ?? {})) {
      const card = cards.byId.get(id);
      if (!card || card.token) {
        fixes.push(`deck ${i + 1}: removed unknown card "${id}"`);
        continue;
      }
      const c = Math.min(maxCopiesFor(card.rarity, content.ctx.balance), nonNegInt(n));
      if (c > 0) deckCards[id] = c;
    }
    if (!heroOk) fixes.push(`deck ${i + 1}: unknown hero, reset`);
    return {
      id: typeof d.id === "string" && d.id ? d.id : `deck-${i + 1}`,
      name: typeof d.name === "string" && d.name.trim() ? d.name.slice(0, 24) : `Deck ${i + 1}`,
      heroId: heroOk ? d.heroId : content.ctx.heroes.all[0].id,
      landscapes: landscapes.slice(0, 4),
      cards: deckCards,
      updatedAt: nonNegInt(d.updatedAt, now)
    };
  });
  const cur = s.currencies ?? {};
  const lifeIn = s.lifetime ?? {};
  const lifetime = emptyStats();
  for (const k of STAT_KEYS) lifetime[k] = nonNegInt(lifeIn[k]);
  const prog = s.progression ?? {};
  const chestsIn = s.chests ?? {};
  const slots = Array.from({ length: 4 }, (_, i) => {
    const c = chestsIn.slots?.[i];
    if (!c || !CHEST_TYPES.includes(c.type)) return null;
    return {
      type: c.type,
      unlockStartedAt: typeof c.unlockStartedAt === "number" ? c.unlockStartedAt : null
    };
  });
  const loginIn = s.login ?? {};
  const questsIn = s.quests ?? {};
  const achIn = s.achievements ?? {};
  const profile = s.profile ?? {};
  const campIn = s.campaign ?? {};
  const stars = {};
  if (typeof campIn.stars === "object" && campIn.stars !== null) {
    for (const [id, v] of Object.entries(campIn.stars)) {
      const n = Math.min(3, nonNegInt(v));
      if (n > 0) stars[id] = n;
    }
  }
  const strings = (v) => Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === "string"))] : [];
  const tutIn = s.tutorial ?? {};
  const selected = nonNegInt(s.selectedDeck);
  const save = {
    version: SAVE_VERSION,
    createdAt: nonNegInt(s.createdAt, now),
    updatedAt: nonNegInt(s.updatedAt, now),
    profile: {
      name: typeof profile.name === "string" && profile.name.trim() ? profile.name.slice(0, 20) : fresh.profile.name,
      avatar: typeof profile.avatar === "string" && content.ctx.heroes.byId.has(profile.avatar) ? profile.avatar : fresh.profile.avatar,
      cardBack: CARD_BACK_IDS.includes(profile.cardBack) ? profile.cardBack : fresh.profile.cardBack
    },
    currencies: { coins: nonNegInt(cur.coins), gems: nonNegInt(cur.gems), dust: nonNegInt(cur.dust) },
    collection,
    decks,
    selectedDeck: selected < economy.deckSlots ? selected : 0,
    progression: { xp: nonNegInt(prog.xp), level: Math.max(1, nonNegInt(prog.level, 1)) },
    chests: { slots, freeReadyAt: nonNegInt(chestsIn.freeReadyAt) },
    login: {
      lastClaimDay: typeof loginIn.lastClaimDay === "string" ? loginIn.lastClaimDay : null,
      streakIndex: nonNegInt(loginIn.streakIndex) % 7
    },
    quests: {
      day: typeof questsIn.day === "string" ? questsIn.day : null,
      active: (questsIn.active ?? []).filter(
        (q) => typeof q === "object" && q !== null && typeof q.id === "string"
      ).map((q) => ({ id: q.id, progress: nonNegInt(q.progress), claimed: q.claimed === true }))
    },
    achievements: { claimed: (achIn.claimed ?? []).filter((x) => typeof x === "string") },
    lifetime,
    campaign: { stars, storySeen: strings(campIn.storySeen) },
    tutorial: { done: strings(tutIn.done), offered: tutIn.offered === true },
    modes: repairModes(s.modes, content)
  };
  return { save, fixes };
}
function isLandscape(v) {
  return LANDSCAPE_TYPES.includes(v);
}
function repairRunDeck(v, content) {
  const d = v;
  if (!d || typeof d !== "object") return null;
  if (typeof d.heroId !== "string" || !content.ctx.heroes.byId.has(d.heroId)) return null;
  if (!Array.isArray(d.landscapes) || d.landscapes.length !== 4 || !d.landscapes.every(isLandscape))
    return null;
  if (!Array.isArray(d.cards) || !d.cards.every((c) => typeof c === "string" && content.ctx.cards.byId.has(c)))
    return null;
  const out = {
    name: typeof d.name === "string" ? d.name.slice(0, 24) : "Run deck",
    heroId: d.heroId,
    landscapes: [...d.landscapes],
    cards: [...d.cards]
  };
  if (d.levels && typeof d.levels === "object") {
    out.levels = {};
    for (const [id, lv] of Object.entries(d.levels)) {
      const n = nonNegInt(lv, 1);
      if (n >= 1 && n <= economy.maxLevel) out.levels[id] = n;
    }
  }
  return out;
}
function repairModes(raw2, content) {
  const m = raw2 ?? {};
  const out = emptyModeState();
  const daily = m.daily ?? {};
  out.daily = {
    day: typeof daily.day === "string" ? daily.day : null,
    won: daily.won === true,
    attempts: nonNegInt(daily.attempts)
  };
  const g = m.gauntlet;
  const gDeck = g ? repairRunDeck(g.deck, content) : null;
  if (g && gDeck && typeof g.seed === "string") {
    out.gauntlet = {
      seed: g.seed,
      deck: gDeck,
      hp: Math.max(1, nonNegInt(g.hp, 1)),
      wins: nonNegInt(g.wins),
      over: g.over === true
    };
  }
  const d = m.draft;
  const stages = ["hero", "landscape", "cards", "battles"];
  const ids = (v) => Array.isArray(v) && v.every((x) => typeof x === "string");
  if (d && typeof d.seed === "string" && stages.includes(d.stage) && ids(d.heroOffer) && (d.heroId === null || typeof d.heroId === "string" && content.ctx.heroes.byId.has(d.heroId)) && Array.isArray(d.landscapeOffer) && d.landscapeOffer.every(isLandscape) && Array.isArray(d.landscapes) && d.landscapes.every(isLandscape) && ids(d.offer) && ids(d.picks) && [...d.offer ?? [], ...d.picks ?? []].every((c) => content.ctx.cards.byId.has(c))) {
    out.draft = {
      seed: d.seed,
      stage: d.stage,
      heroOffer: [...d.heroOffer],
      heroId: d.heroId ?? null,
      landscapeOffer: [...d.landscapeOffer],
      landscapes: [...d.landscapes],
      offer: [...d.offer],
      picks: [...d.picks],
      wins: nonNegInt(d.wins),
      losses: nonNegInt(d.losses)
    };
  }
  return out;
}
const DERIVED_STATS = ["uniqueCards", "maxCardLevel", "playerLevel"];
function validateProgression(c) {
  const errors2 = [];
  const checkOdds = (odds, where) => {
    for (const r of RARITIES)
      if (typeof odds[r] !== "number" || odds[r] < 0) errors2.push(`${where}: odds.${r} must be >= 0`);
    const sum = RARITIES.reduce((s, r) => s + (odds[r] ?? 0), 0);
    if (Math.abs(sum - 1) > 1e-6) errors2.push(`${where}: odds must sum to 1 (got ${sum})`);
  };
  const t = c.xp.levelThresholds;
  if (t[0] !== 0 || t.some((v, i) => i > 0 && v <= t[i - 1]))
    errors2.push("xp.levelThresholds must start at 0 and increase");
  for (const type of CHEST_TYPES) {
    const def = c.chests.types[type];
    if (!def) errors2.push(`chests.types.${type} is missing`);
    else checkOdds(def.odds, `chest ${type}`);
  }
  const drop = CHEST_TYPES.reduce((s, ty) => s + (c.chests.victoryDrop[ty] ?? 0), 0);
  if (Math.abs(drop - 1) > 1e-6) errors2.push("chests.victoryDrop must sum to 1");
  for (const p of c.packs) checkOdds(p.odds, `pack ${p.id}`);
  if (c.login.length !== 7) errors2.push("login must have 7 days");
  const statOk = (s) => STAT_KEYS.includes(s) || DERIVED_STATS.includes(s);
  for (const q of c.quests.pool) if (!statOk(q.stat)) errors2.push(`quest ${q.id}: unknown stat ${q.stat}`);
  for (const a of c.achievements)
    if (!statOk(a.stat)) errors2.push(`achievement ${a.id}: unknown stat ${a.stat}`);
  if (c.quests.pool.length < c.quests.perDay) errors2.push("quest pool smaller than quests per day");
  const ids = [...c.quests.pool.map((q) => q.id), ...c.achievements.map((a) => a.id)];
  if (new Set(ids).size !== ids.length) errors2.push("quest/achievement ids must be unique");
  const camp = c.campaign;
  for (const k of ["firstClearCoins", "firstClearXp", "bossFirstClear"])
    if (!Array.isArray(camp[k]) || camp[k].length !== 8) errors2.push(`campaign.${k} needs 8 entries`);
  const m = c.modes;
  const ais = [m.daily.ai, ...m.gauntlet.ai, ...m.draft.ai];
  if (ais.some((a) => !DIFFICULTIES.includes(a))) errors2.push("modes: unknown AI difficulty");
  if (m.gauntlet.ai.length !== m.gauntlet.battles || m.gauntlet.cardLevels.length !== m.gauntlet.battles)
    errors2.push("modes.gauntlet: ai and cardLevels need one entry per battle");
  if (m.gauntlet.rewards.length !== m.gauntlet.battles + 1)
    errors2.push("modes.gauntlet.rewards needs battles + 1 entries");
  if (m.draft.rewards.length !== m.draft.maxWins + 1)
    errors2.push("modes.draft.rewards needs maxWins + 1 entries");
  if (m.draft.ai.length < m.draft.maxWins + m.draft.maxLosses - 1)
    errors2.push("modes.draft.ai needs an entry for every possible battle");
  checkOdds(m.draft.odds, "draft");
  return errors2;
}
const PROGRESSION = raw$1;
const problems = validateProgression(PROGRESSION);
if (problems.length > 0) throw new Error(`Invalid progression.json:
- ${problems.join("\n- ")}`);
const T = PROGRESSION.xp.levelThresholds;
const AFTER_TABLE_STEP = 1100;
function xpForLevel(level) {
  if (level <= 1) return 0;
  if (level <= T.length) return T[level - 1];
  return T[T.length - 1] + (level - T.length) * AFTER_TABLE_STEP;
}
function levelFromXp(xp2) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp2) level++;
  return level;
}
const CURRENCIES = ["coins", "gems", "dust"];
function economyOf(save) {
  const cards = {};
  for (const [id, c] of Object.entries(save.collection)) if (c.count > 0) cards[id] = c.count;
  return { ...save.currencies, xp: save.progression.xp, cards };
}
function creditedHours(sinceMs, now) {
  const caps = ONLINE.saveCaps;
  const hours = Math.max(0, now - sinceMs) / 36e5;
  return Math.min(caps.maxHours, Math.max(caps.minHours, hours));
}
function mergeSave(stored, req, now, content) {
  const caps = ONLINE.saveCaps;
  const flags = [];
  const client = repairSave(migrate(req.save ?? {}), content, now).save;
  const fresh = createNewSave(content, now);
  const server = stored?.data ?? fresh;
  const since = stored ? stored.syncedAt : Math.min(now, client.createdAt || now);
  const hours = creditedHours(since, now);
  const base = stored ? req.base ?? economyOf(server) : economyOf(fresh);
  const newer = client.updatedAt >= server.updatedAt ? client : server;
  const merged = structuredClone(newer);
  const clientEco = economyOf(client);
  const serverEco = economyOf(server);
  const capFor = { coins: caps.coinsPerHour, gems: caps.gemsPerHour, dust: caps.dustPerHour };
  for (const k of CURRENCIES) {
    const delta = clientEco[k] - base[k];
    const allowed = capFor[k] * hours;
    if (delta > allowed) flags.push(`${k}: +${delta} refused above +${Math.floor(allowed)}`);
    merged.currencies[k] = Math.max(0, serverEco[k] + Math.min(delta, Math.floor(allowed)));
  }
  const xpDelta = clientEco.xp - base.xp;
  const xpAllowed = Math.floor(caps.xpPerHour * hours);
  if (xpDelta > xpAllowed) flags.push(`xp: +${xpDelta} refused above +${xpAllowed}`);
  merged.progression.xp = Math.max(0, serverEco.xp + Math.max(0, Math.min(xpDelta, xpAllowed)));
  merged.progression.level = levelFromXp(merged.progression.xp);
  let budget = Math.floor(caps.cardsPerHour * hours);
  const ids = [
    .../* @__PURE__ */ new Set([
      ...Object.keys(clientEco.cards),
      ...Object.keys(serverEco.cards),
      ...Object.keys(base.cards)
    ])
  ].sort();
  const collection = {};
  let refused = 0;
  for (const id of ids) {
    const delta = (clientEco.cards[id] ?? 0) - (base.cards[id] ?? 0);
    let accepted = delta;
    if (delta > 0) {
      accepted = Math.min(delta, budget);
      budget -= accepted;
      refused += delta - accepted;
    }
    const count = Math.max(0, (serverEco.cards[id] ?? 0) + accepted);
    if (count <= 0) continue;
    const serverLevel = server.collection[id]?.level ?? 1;
    const clientLevel = client.collection[id]?.level ?? 1;
    const level = Math.min(clientLevel, serverLevel + Math.ceil(hours) * 2);
    collection[id] = { count, level: Math.max(serverLevel, level) };
  }
  if (refused > 0) flags.push(`cards: ${refused} new copies refused`);
  merged.collection = collection;
  for (const k of Object.keys(merged.lifetime)) {
    merged.lifetime[k] = Math.max(server.lifetime[k] ?? 0, client.lifetime[k] ?? 0);
  }
  merged.updatedAt = Math.max(client.updatedAt, server.updatedAt);
  const version2 = (stored?.version ?? 0) + 1;
  return { save: merged, version: version2, base: economyOf(merged), flags };
}
function grantToSave(save, reward) {
  const next = structuredClone(save);
  next.currencies.coins += reward.coins ?? 0;
  next.currencies.gems += reward.gems ?? 0;
  next.currencies.dust += reward.dust ?? 0;
  next.progression.xp += reward.xp ?? 0;
  next.progression.level = levelFromXp(next.progression.xp);
  return next;
}
class ServiceError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    this.extra = extra;
  }
}
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_TTL_MS = 10 * 6e4;
const DEADLINE_GRACE_MS = 1500;
class GameService {
  constructor(d) {
    this.d = d;
  }
  get ctx() {
    return this.d.content.ctx;
  }
  turnMs() {
    return BALANCE.online.turnTimerSeconds * 1e3;
  }
  // -------------------------------------------------------------------------
  // Cloud save
  // -------------------------------------------------------------------------
  async sync(userId, req) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const stored = await this.d.store.getSave(userId);
      let merged;
      try {
        merged = mergeSave(stored, req, this.d.now(), this.d.content);
      } catch (err) {
        throw new ServiceError("BAD_REQUEST", `Save rejected: ${err.message}`);
      }
      const ok = await this.d.store.putSave(
        userId,
        { data: merged.save, version: merged.version, syncedAt: this.d.now() },
        stored?.version ?? null
      );
      if (!ok) continue;
      const p = merged.save.profile;
      await this.d.store.setProfile(userId, { name: p.name, avatar: p.avatar, cardBack: p.cardBack });
      return { save: merged.save, version: merged.version, base: merged.base, flags: merged.flags };
    }
    throw new ServiceError("BUSY", "Your save is being updated on another device. Try again.");
  }
  /** Applies a server-side reward to the stored save (ranked wins, season rewards). */
  async grant(userId, reward) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const stored = await this.d.store.getSave(userId);
      if (!stored) return;
      const ok = await this.d.store.putSave(
        userId,
        { data: grantToSave(stored.data, reward), version: stored.version + 1, syncedAt: stored.syncedAt },
        stored.version
      );
      if (ok) return;
    }
  }
  // -------------------------------------------------------------------------
  // Profile & ratings
  // -------------------------------------------------------------------------
  async ratingRow(userId, seasonId) {
    return await this.d.store.getRating(userId, seasonId) ?? {
      userId,
      seasonId,
      rating: ONLINE.rating.start,
      games: 0,
      wins: 0,
      losses: 0,
      peak: ONLINE.rating.start
    };
  }
  async profile(userId) {
    const season = await this.d.store.activeSeason();
    const r = await this.ratingRow(userId, season.id);
    return {
      name: await this.d.store.getProfileName(userId),
      season: { id: season.id, name: season.name, endsAt: season.endsAt },
      rating: r.rating,
      tier: tierOf(r.rating),
      games: r.games,
      wins: r.wins,
      losses: r.losses
    };
  }
  // -------------------------------------------------------------------------
  // Decks
  // -------------------------------------------------------------------------
  async checkDeck(userId, raw2, ranked) {
    if (!raw2 || typeof raw2 !== "object" || !Array.isArray(raw2.cards) || !Array.isArray(raw2.landscapes))
      throw new ServiceError("DECK_INVALID", "That deck is not valid.");
    const deck = {
      heroId: String(raw2.heroId),
      landscapes: [...raw2.landscapes],
      cards: raw2.cards.map(String)
    };
    const hero = this.ctx.heroes.byId.get(deck.heroId);
    const errors2 = validateDeck(deck, this.ctx);
    if (!hero || hero.boss || errors2.length > 0)
      throw new ServiceError("DECK_INVALID", errors2[0] ?? "That hero cannot be used online.");
    if (ranked) {
      const stored = await this.d.store.getSave(userId);
      if (!stored) throw new ServiceError("NOT_OWNED", "Sync your save to the cloud before playing Ranked.");
      const counts = /* @__PURE__ */ new Map();
      for (const id of deck.cards) counts.set(id, (counts.get(id) ?? 0) + 1);
      for (const [id, n] of counts) {
        if ((stored.data.collection[id]?.count ?? 0) < n) {
          const name = this.ctx.cards.byId.get(id)?.name ?? id;
          throw new ServiceError("NOT_OWNED", `You don't own ${n} × ${name}.`);
        }
      }
    }
    return deck;
  }
  // -------------------------------------------------------------------------
  // Matchmaking
  // -------------------------------------------------------------------------
  async queue(userId, rawDeck) {
    const active = await this.d.store.activeMatchOf(userId);
    if (active) return { status: "matched", matchId: active.id };
    const deck = await this.checkDeck(userId, rawDeck, true);
    const season = await this.d.store.activeSeason();
    const rating2 = (await this.ratingRow(userId, season.id)).rating;
    const entry = {
      userId,
      name: await this.d.store.getProfileName(userId),
      rating: rating2,
      deck,
      queuedAt: this.d.now()
    };
    await this.d.store.putQueue(entry);
    return this.tryPair(entry);
  }
  async queueStatus(userId) {
    const active = await this.d.store.activeMatchOf(userId);
    if (active) return { status: "matched", matchId: active.id };
    const me = (await this.d.store.queue()).find((e) => e.userId === userId);
    if (!me) return { status: "idle" };
    if (this.d.now() - me.queuedAt > ONLINE.matchmaking.queueTimeoutSeconds * 1e3) {
      await this.d.store.takeQueue(userId);
      return { status: "idle" };
    }
    return this.tryPair(me);
  }
  async cancelQueue(userId) {
    await this.d.store.takeQueue(userId);
    return { status: "idle" };
  }
  async tryPair(me) {
    const now = this.d.now();
    const others = (await this.d.store.queue()).filter((e) => e.userId !== me.userId);
    const wait = (e) => (now - e.queuedAt) / 1e3;
    const fits = others.filter((e) => Math.abs(e.rating - me.rating) <= matchWindow(Math.max(wait(e), wait(me)))).sort(
      (a, b) => Math.abs(a.rating - me.rating) - Math.abs(b.rating - me.rating) || a.queuedAt - b.queuedAt
    );
    for (const opp of fits) {
      if (!await this.d.store.takeQueue(opp.userId)) continue;
      if (!await this.d.store.takeQueue(me.userId)) {
        await this.d.store.putQueue(opp);
        const active = await this.d.store.activeMatchOf(me.userId);
        return active ? { status: "matched", matchId: active.id } : { status: "idle" };
      }
      const flip = this.d.random() < 0.5;
      const [a, b] = flip ? [opp, me] : [me, opp];
      const season = await this.d.store.activeSeason();
      const match2 = await this.startMatch(
        "ranked",
        [a.userId, b.userId],
        [a.name, b.name],
        [a.deck, b.deck],
        season.id,
        null
      );
      return { status: "matched", matchId: match2.id };
    }
    return { status: "queued", since: me.queuedAt };
  }
  // -------------------------------------------------------------------------
  // Friendly rooms
  // -------------------------------------------------------------------------
  async createRoom(userId, rawDeck) {
    const deck = await this.checkDeck(userId, rawDeck, false);
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = Array.from(
        { length: 6 },
        () => ROOM_ALPHABET[Math.floor(this.d.random() * ROOM_ALPHABET.length)]
      ).join("");
      if (await this.d.store.waitingRoom(code)) continue;
      const now = this.d.now();
      const m = {
        id: this.d.newId(),
        mode: "friendly",
        status: "waiting",
        roomCode: code,
        players: [userId, null],
        names: [await this.d.store.getProfileName(userId), ""],
        decks: [deck, null],
        state: null,
        seq: 0,
        deadline: null,
        lastSeen: [now, now],
        winner: null,
        seasonId: null,
        result: null,
        createdAt: now,
        updatedAt: now
      };
      if (await this.d.store.putMatch(m, null)) {
        await this.publish(m, []);
        return { matchId: m.id, code };
      }
    }
    throw new ServiceError("BUSY", "Could not create a room. Try again.");
  }
  async joinRoom(userId, rawCode, rawDeck) {
    const code = String(rawCode ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const room = await this.d.store.waitingRoom(code);
    if (!room || this.d.now() - room.createdAt > ROOM_TTL_MS)
      throw new ServiceError("NOT_FOUND", "No open room with that code.");
    if (room.players[0] === userId)
      throw new ServiceError("BAD_REQUEST", "That is your own room. Share the code with a friend.");
    const deck = await this.checkDeck(userId, rawDeck, false);
    const started = this.newGame([room.decks[0], deck]);
    const now = this.d.now();
    const m = {
      ...room,
      status: "active",
      players: [room.players[0], userId],
      names: [room.names[0], await this.d.store.getProfileName(userId)],
      decks: [room.decks[0], deck],
      state: started.state,
      seq: room.seq + 1,
      deadline: now + this.turnMs(),
      lastSeen: [now, now],
      updatedAt: now
    };
    if (!await this.d.store.putMatch(m, room.seq))
      throw new ServiceError("BUSY", "Someone else joined that room first.");
    await this.publish(m, started.events);
    return { matchId: m.id };
  }
  // -------------------------------------------------------------------------
  // Matches
  // -------------------------------------------------------------------------
  newGame(decks) {
    const seed = Math.floor(this.d.random() * 4294967295);
    return createGame({ seed, decks, fixedCardLevel: BALANCE.online.rankedCardLevel }, this.ctx);
  }
  async startMatch(mode, players, names, decks, seasonId, roomCode) {
    const now = this.d.now();
    const started = this.newGame(decks);
    const m = {
      id: this.d.newId(),
      mode,
      status: "active",
      roomCode,
      players,
      names,
      decks,
      state: started.state,
      seq: 1,
      deadline: now + this.turnMs(),
      lastSeen: [now, now],
      winner: null,
      seasonId,
      result: null,
      createdAt: now,
      updatedAt: now
    };
    await this.d.store.putMatch(m, null);
    await this.publish(m, started.events);
    return m;
  }
  async load(userId, matchId) {
    const m = await this.d.store.getMatch(String(matchId));
    if (!m) throw new ServiceError("NOT_FOUND", "Match not found.");
    const me = m.players.indexOf(userId);
    if (me < 0) throw new ServiceError("NOT_PARTICIPANT", "You are not in this match.");
    return { m, me };
  }
  /** Applies one player action after full validation. */
  async act(userId, matchId, seq, action) {
    const { m, me } = await this.load(userId, matchId);
    if (m.status !== "active" || !m.state)
      throw new ServiceError("NOT_ACTIVE", "This match is not in progress.");
    if (seq !== m.seq)
      throw new ServiceError("STALE", "Your game is out of date.", { view: this.viewFor(m, me, []) });
    if (!action || typeof action !== "object" || action.player !== me)
      throw new ServiceError("WRONG_PLAYER", "You can only act for yourself.");
    const now = this.d.now();
    m.lastSeen = [...m.lastSeen];
    m.lastSeen[me] = now;
    const applied = this.apply(m, action, now);
    if (!applied.ok) throw new ServiceError("ILLEGAL", applied.error);
    if (!await this.d.store.putMatch(applied.match, m.seq))
      throw new ServiceError("STALE", "Your game is out of date.", { view: this.viewFor(m, me, []) });
    await this.d.store.logAction(m.id, applied.match.seq, me, action);
    await this.afterChange(applied.match, applied.events);
    return this.viewFor(applied.match, me, applied.events);
  }
  apply(m, action, now) {
    const r = applyAction(m.state, action, this.ctx);
    if (!r.ok) return { ok: false, error: r.error.message };
    const next = { ...m, state: r.state, seq: m.seq + 1, updatedAt: now };
    const turnChanged = r.events.some((e) => e.type === "turnStarted");
    if (turnChanged || r.state.phase !== m.state.phase) next.deadline = now + this.turnMs();
    if (r.state.phase === "ended") {
      next.status = "ended";
      next.winner = r.state.winner;
      next.deadline = null;
    }
    return { ok: true, match: next, events: r.events };
  }
  /**
   * Called by clients every few seconds while a match is open: records that
   * they're still connected, ends a turn that ran out of time, and forfeits a
   * player who has been gone longer than the reconnect window.
   */
  async tick(userId, matchId) {
    const loaded = await this.load(userId, matchId);
    const me = loaded.me;
    let m = loaded.m;
    const loadedSeq = m.seq;
    const now = this.d.now();
    m.lastSeen = [...m.lastSeen];
    m.lastSeen[me] = now;
    let events = [];
    const taken = [];
    if (m.status === "active" && m.state) {
      const grace = BALANCE.online.reconnectGraceSeconds * 1e3;
      const gone = [0, 1].find((p) => p !== me && now - m.lastSeen[p] > grace);
      const actions = [];
      if (gone !== void 0) actions.push({ type: "surrender", player: gone });
      else if (m.deadline !== null && now > m.deadline + DEADLINE_GRACE_MS)
        actions.push(...this.timeoutActions(m.state));
      for (const a of actions) {
        const r = this.apply(m, a, now);
        if (!r.ok) break;
        m = r.match;
        events = [...events, ...r.events];
        taken.push({ seq: m.seq, action: a });
      }
    }
    if (!await this.d.store.putMatch(m, loadedSeq)) return this.view(userId, matchId);
    if (taken.length > 0) {
      for (const t of taken) await this.d.store.logAction(m.id, t.seq, t.action.player, t.action);
      await this.afterChange(m, events);
    }
    return this.viewFor(m, me, events);
  }
  /** What the server does for a player whose time ran out. */
  timeoutActions(state) {
    return playersToAct(state).map((p) => {
      const ps = state.players[p];
      if (state.phase === "arrange")
        return { type: "arrangeLandscapes", player: p, order: [...ps.landscapePool] };
      if (state.phase === "mulligan") return { type: "mulligan", player: p, iids: [] };
      const excess = ps.hand.length - this.ctx.balance.maxHandSize;
      return excess > 0 ? { type: "endTurn", player: p, discard: ps.hand.slice(-excess).map((c) => c.iid) } : { type: "endTurn", player: p };
    });
  }
  async view(userId, matchId) {
    const { m, me } = await this.load(userId, matchId);
    return this.viewFor(m, me, []);
  }
  async current(userId) {
    const m = await this.d.store.activeMatchOf(userId);
    if (!m) return null;
    return this.viewFor(m, m.players.indexOf(userId), []);
  }
  async afterChange(m, events) {
    if (m.status === "ended" && m.mode === "ranked" && !m.result) await this.finishRanked(m);
    await this.publish(m, events);
  }
  async finishRanked(m) {
    const seasonId = m.seasonId ?? (await this.d.store.activeSeason()).id;
    const ids = m.players;
    const rows = await Promise.all(ids.map((id) => this.ratingRow(id, seasonId)));
    const score = (p) => m.winner === "draw" ? 0.5 : m.winner === p ? 1 : 0;
    const ratings = [0, 1].map((p) => {
      const r = rows[p];
      const after = updateRating(r.rating, rows[p === 0 ? 1 : 0].rating, score(p), r.games);
      return { before: r.rating, after, row: r };
    });
    for (const p of [0, 1]) {
      const { after, row } = ratings[p];
      await this.d.store.putRating({
        ...row,
        rating: after,
        games: row.games + 1,
        wins: row.wins + (score(p) === 1 ? 1 : 0),
        losses: row.losses + (score(p) === 0 ? 1 : 0),
        peak: Math.max(row.peak, after)
      });
      await this.grant(ids[p], score(p) === 1 ? ONLINE.rewards.rankedWin : ONLINE.rewards.rankedLoss);
    }
    m.result = {
      ratings: [
        { before: ratings[0].before, after: ratings[0].after },
        { before: ratings[1].before, after: ratings[1].after }
      ]
    };
    await this.d.store.putMatch(m, m.seq);
  }
  viewFor(m, me, events) {
    const view = {
      matchId: m.id,
      mode: m.mode,
      status: m.status,
      seq: m.seq,
      you: me,
      names: m.names,
      state: m.state ? redactState(m.state, me) : null,
      events: redactEvents(events, me),
      deadline: m.deadline,
      serverNow: this.d.now(),
      winner: m.winner,
      roomCode: m.roomCode
    };
    const r = m.result?.ratings?.[me];
    if (r) view.rating = { before: r.before, after: r.after, tier: tierOf(r.after) };
    return view;
  }
  async publish(m, events) {
    for (const p of [0, 1]) {
      const user = m.players[p];
      if (user) await this.d.store.publishView(m.id, user, this.viewFor(m, p, events));
    }
  }
  // -------------------------------------------------------------------------
  // Seasons
  // -------------------------------------------------------------------------
  /** Ends the active season (if it's over): season rewards by tier, then a soft reset. */
  async seasonRollover(force = false) {
    const season = await this.d.store.activeSeason();
    const now = this.d.now();
    if (!force && now < season.endsAt) return { rolled: false, seasonId: season.id };
    const next = {
      id: season.id + 1,
      name: `Season ${season.id + 1}`,
      startsAt: now,
      endsAt: now + ONLINE.rating.seasonDays * 864e5,
      active: true
    };
    const rows = await this.d.store.ratingsOf(season.id);
    for (const r of rows) {
      if (r.games === 0) continue;
      const reward = ONLINE.rewards.seasonEnd[tierOf(r.rating)];
      if (reward) await this.grant(r.userId, reward);
    }
    await this.d.store.startSeason(next);
    for (const r of rows) {
      if (r.games === 0) continue;
      const rating2 = softReset(r.rating);
      await this.d.store.putRating({
        userId: r.userId,
        seasonId: next.id,
        rating: rating2,
        games: 0,
        wins: 0,
        losses: 0,
        peak: rating2
      });
    }
    return { rolled: true, seasonId: next.id };
  }
}
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const MAX_BODY_BYTES = 256 * 1024;
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}
const fail = (code, error, status, extra = {}) => json({ ok: false, code, error, ...extra }, status);
const STATUS = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  NOT_PARTICIPANT: 403,
  STALE: 409,
  BUSY: 409
};
async function handle(req, deps) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return fail("BAD_REQUEST", "Use POST.", 405);
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return fail("BAD_REQUEST", "Request too large.", 413);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return fail("BAD_REQUEST", "Invalid JSON.", 400);
  }
  if (!body || typeof body !== "object" || typeof body.op !== "string")
    return fail("BAD_REQUEST", "Missing op.", 400);
  const s = deps.service;
  try {
    if (body.op === "seasonRollover") {
      if (!deps.isAdmin(req)) return fail("FORBIDDEN", "Admin only.", 403);
      return json({ ok: true, ...await s.seasonRollover() });
    }
    const user = await deps.auth(req);
    if (!user) return fail("UNAUTHORIZED", "Sign in first.", 401);
    const id = user.userId;
    switch (body.op) {
      case "sync":
        return json({ ok: true, ...await s.sync(id, body) });
      case "profile":
        return json({ ok: true, ...await s.profile(id) });
      case "queue":
        return json({ ok: true, ...await s.queue(id, body.deck) });
      case "queueStatus":
        return json({ ok: true, ...await s.queueStatus(id) });
      case "cancelQueue":
        return json({ ok: true, ...await s.cancelQueue(id) });
      case "createRoom":
        return json({ ok: true, ...await s.createRoom(id, body.deck) });
      case "joinRoom":
        return json({ ok: true, ...await s.joinRoom(id, body.code, body.deck) });
      case "act":
        return json({
          ok: true,
          view: await s.act(id, body.matchId, Number(body.seq), body.action)
        });
      case "tick":
        return json({ ok: true, view: await s.tick(id, body.matchId) });
      case "view":
        return json({ ok: true, view: await s.view(id, body.matchId) });
      case "current":
        return json({ ok: true, view: await s.current(id) });
      default:
        return fail("BAD_REQUEST", "Unknown op.", 400);
    }
  } catch (err) {
    if (err instanceof ServiceError) return fail(err.code, err.message, STATUS[err.code] ?? 400, err.extra);
    console.error(err);
    return fail("BAD_REQUEST", "Server error.", 500);
  }
}
const cardData = /* @__PURE__ */ JSON.parse(`[{"id":"infinite_figure","name":"Infinite Figure","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":8,"def":22,"keywords":[],"floop":{"cost":1,"effects":[{"type":"costMod","who":"enemy","kind":"floop","amount":1}]},"text":"Floop (1 MP): Increase enemy's Flooping cost by 1 next turn.","flavorText":"","artKey":"infinite_figure","image":"cards/infinite_figure.webp"},{"id":"timmy_magic_eyes","name":"Timmy Magic Eyes","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":15,"def":15,"keywords":[],"floop":{"cost":1,"effects":[{"type":"costMod","who":"self","kind":"floop","amount":-1}]},"text":"Floop (1 MP): Lower the cost of Flooping creatures by 1 this turn.","flavorText":"","artKey":"timmy_magic_eyes","image":"cards/timmy_magic_eyes.webp"},{"id":"cool_dog","name":"Cool Dog","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"atk":3,"def":7,"keywords":[],"floop":{"cost":1,"effects":[{"type":"lockFloop","target":"opposingCreature"}]},"text":"Floop (1 MP): Creature in the opposing lane cannot use its Floop ability next turn.","flavorText":"","artKey":"cool_dog","image":"cards/cool_dog.webp"},{"id":"cool_dog_gold","name":"Cool Dog","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":4,"def":11,"keywords":[],"floop":{"cost":1,"effects":[{"type":"lockFloop","target":"opposingCreature"}]},"text":"Floop (1 MP): Creature in the opposing lane cannot use its Floop ability next turn.","flavorText":"","artKey":"cool_dog_gold","image":"cards/cool_dog_gold.webp"},{"id":"grape_slimey","name":"Grape Slimey","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"atk":2,"def":5,"keywords":[],"floop":{"cost":1,"effects":[{"type":"draw","amount":1},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Draw one card and send this creature to the Discard Pile.","flavorText":"","artKey":"grape_slimey","image":"cards/grape_slimey.webp"},{"id":"grape_slimey_gold","name":"Grape Slimey","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":8,"keywords":[],"floop":{"cost":1,"effects":[{"type":"draw","amount":1},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Draw one card and send this creature to the Discard Pile.","flavorText":"","artKey":"grape_slimey_gold","image":"cards/grape_slimey_gold.webp"},{"id":"heavenly_gazer","name":"Heavenly Gazer","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"atk":1,"def":6,"keywords":[],"floop":{"cost":2,"effects":[{"type":"draw","amount":1}]},"text":"Floop (2 MP): Draw 1 Card.","flavorText":"","artKey":"heavenly_gazer","image":"cards/heavenly_gazer.webp"},{"id":"heavenly_gazer_gold","name":"Heavenly Gazer","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":1,"def":9,"keywords":[],"floop":{"cost":2,"effects":[{"type":"draw","amount":1}]},"text":"Floop (2 MP): Draw 1 Card.","flavorText":"","artKey":"heavenly_gazer_gold","image":"cards/heavenly_gazer_gold.webp"},{"id":"the_poultrygeist","name":"The Poultrygeist","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"atk":2,"def":6,"keywords":[],"floop":{"cost":1,"effects":[{"type":"gainMp","amount":2,"nextTurn":true}]},"text":"Floop (1 MP): Gain +2 Magic Points next turn.","flavorText":"","artKey":"the_poultrygeist","image":"cards/the_poultrygeist.webp"},{"id":"the_poultrygeist_gold","name":"The Poultrygeist","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":9,"keywords":[],"floop":{"cost":1,"effects":[{"type":"gainMp","amount":2,"nextTurn":true}]},"text":"Floop (1 MP): Gain +2 Magic Points next turn.","flavorText":"","artKey":"the_poultrygeist_gold","image":"cards/the_poultrygeist_gold.webp"},{"id":"woadic_time_walker","name":"Woadic Time Walker","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"atk":5,"def":5,"keywords":[],"floop":{"cost":3,"effects":[{"type":"redirect","target":"opposingCreature"}]},"text":"Floop (3 MP): Damage done to opposing creature next Battle Phase is transferred to Hero.","flavorText":"","artKey":"woadic_time_walker","image":"cards/woadic_time_walker.webp"},{"id":"woadic_time_walker_gold","name":"Woadic Time Walker","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":7,"def":8,"keywords":[],"floop":{"cost":3,"effects":[{"type":"redirect","target":"opposingCreature"}]},"text":"Floop (3 MP): Damage done to opposing creature next Battle Phase is transferred to Hero.","flavorText":"","artKey":"woadic_time_walker_gold","image":"cards/woadic_time_walker_gold.webp"},{"id":"ancient_scholar","name":"Ancient Scholar","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":3,"def":13,"keywords":[],"floop":{"cost":3,"effects":[{"type":"recover","cardType":"creature","pick":"best"}]},"text":"Floop (3 MP): Return a creature the from Discard Pile to your hand.","flavorText":"","artKey":"ancient_scholar","image":"cards/ancient_scholar.webp"},{"id":"ancient_scholar_gold","name":"Ancient Scholar","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":4,"def":20,"keywords":[],"floop":{"cost":3,"effects":[{"type":"recover","cardType":"creature","pick":"best"}]},"text":"Floop (3 MP): Return a creature the from Discard Pile to your hand.","flavorText":"","artKey":"ancient_scholar_gold","image":"cards/ancient_scholar_gold.webp"},{"id":"axey","name":"Axey","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":13,"def":5,"keywords":[],"floop":{"cost":1,"effects":[{"type":"returnBuilding","target":"opposingBuilding"}]},"text":"Floop (1 MP): Send Building in opposing lane back to opponent's hand.","flavorText":"","artKey":"axey","image":"cards/axey.webp"},{"id":"axey_gold","name":"Axey","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":19,"def":8,"keywords":[],"floop":{"cost":1,"effects":[{"type":"returnBuilding","target":"opposingBuilding"}]},"text":"Floop (1 MP): Send Building in opposing lane back to opponent's hand.","flavorText":"","artKey":"axey_gold","image":"cards/axey_gold.webp"},{"id":"blue_slimey","name":"Blue Slimey","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":2,"rarity":"legendary","stars":5,"atk":7,"def":14,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"adjacentAllies","amount":{"of":"selfDef"}},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Heal adjacent creatures by this creature's current DEF and discard.","flavorText":"","artKey":"blue_slimey","image":"cards/blue_slimey.webp"},{"id":"dragon_claw","name":"Dragon Claw","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":5,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"recover","cardType":"building","pick":"best"}]},"text":"Floop (2 MP): Return a Building from the Discard Pile to your hand.","flavorText":"","artKey":"dragon_claw","image":"cards/dragon_claw.webp"},{"id":"dragon_claw_gold","name":"Dragon Claw","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":7,"def":23,"keywords":[],"floop":{"cost":2,"effects":[{"type":"recover","cardType":"building","pick":"best"}]},"text":"Floop (2 MP): Return a Building from the Discard Pile to your hand.","flavorText":"","artKey":"dragon_claw_gold","image":"cards/dragon_claw_gold.webp"},{"id":"spectre_hector","name":"Spectre Hector","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":2,"rarity":"common","stars":1,"atk":7,"def":14,"keywords":[],"floop":{"cost":2,"effects":[{"type":"returnToHand","target":"opposingCreature"}]},"text":"Floop (2 MP): Send Creature in opposing lane back to the opponent's hand.","flavorText":"","artKey":"spectre_hector","image":"cards/spectre_hector.webp"},{"id":"heifergeist","name":"Heifergeist","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":13,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"reset","target":"self"}]},"text":"Floop (2 MP): Negate all Damage, Defense, and Attack modifiers on this creature.","flavorText":"","artKey":"heifergeist","image":"cards/heifergeist.webp"},{"id":"heifergeist_gold","name":"Heifergeist","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":19,"def":23,"keywords":[],"floop":{"cost":2,"effects":[{"type":"reset","target":"self"}]},"text":"Floop (2 MP): Negate all Damage, Defense, and Attack modifiers on this creature.","flavorText":"","artKey":"heifergeist_gold","image":"cards/heifergeist_gold.webp"},{"id":"psionic_architect","name":"Psionic Architect","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":17,"def":8,"keywords":[],"floop":{"cost":2,"effects":[{"type":"recover","cardType":"spell","pick":"best"}]},"text":"Floop (2 MP): Return a Spell from the Discard Pile to your hand.","flavorText":"","artKey":"psionic_architect","image":"cards/psionic_architect.webp"},{"id":"psionic_architect_gold","name":"Psionic Architect","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":25,"def":12,"keywords":[],"floop":{"cost":2,"effects":[{"type":"recover","cardType":"spell","pick":"best"}]},"text":"Floop (2 MP): Return a Spell from the Discard Pile to your hand.","flavorText":"","artKey":"psionic_architect_gold","image":"cards/psionic_architect_gold.webp"},{"id":"punk_cat","name":"Punk Cat","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":8,"def":22,"keywords":[],"floop":{"cost":3,"effects":[{"type":"activateFloop","target":"adjacentAllies"}]},"text":"Floop (3 MP): Activate an adjacent creature's Floop Ability if applicable.","flavorText":"","artKey":"punk_cat","image":"cards/punk_cat.webp"},{"id":"punk_cat_gold","name":"Punk Cat","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":12,"def":33,"keywords":[],"floop":{"cost":3,"effects":[{"type":"activateFloop","target":"adjacentAllies"}]},"text":"Floop (3 MP): Activate an adjacent creature's Floop Ability if applicable.","flavorText":"","artKey":"punk_cat_gold","image":"cards/punk_cat_gold.webp"},{"id":"temporal_wisp","name":"Temporal Wisp","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":9,"def":17,"keywords":[],"floop":{"cost":2,"effects":[{"type":"lockAttack","target":"opposingCreature"}]},"text":"Floop (2 MP): Opposing creature cannot attack on opponent's next Battle Phase.","flavorText":"","artKey":"temporal_wisp","image":"cards/temporal_wisp.webp"},{"id":"temporal_wisp_gold","name":"Temporal Wisp","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":13,"def":26,"keywords":[],"floop":{"cost":2,"effects":[{"type":"lockAttack","target":"opposingCreature"}]},"text":"Floop (2 MP): Opposing creature cannot attack on opponent's next Battle Phase","flavorText":"","artKey":"temporal_wisp_gold","image":"cards/temporal_wisp_gold.webp"},{"id":"dragon_foot","name":"Dragon Foot","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":5,"def":32,"keywords":[],"floop":{"cost":3,"effects":[{"type":"destroyBuilding","target":"opposingBuilding"}]},"text":"Floop (3 MP): Destroy Building in the opposing lane.","flavorText":"","artKey":"dragon_foot","image":"cards/dragon_foot.webp"},{"id":"dragon_foot_gold","name":"Dragon Foot","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":7,"def":48,"keywords":[],"floop":{"cost":3,"effects":[{"type":"destroyBuilding","target":"opposingBuilding"}]},"text":"Floop (3 MP): Destroy a Building in the opposing lane.","flavorText":"","artKey":"dragon_foot_gold","image":"cards/dragon_foot_gold.webp"},{"id":"ghost_djini","name":"Ghost Djini","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":10,"def":28,"keywords":[],"floop":{"cost":6,"effects":[{"type":"cycleHand","draw":5}]},"text":"Floop (6 MP): Shuffle your hand back into your Deck and draw 5 cards.","flavorText":"","artKey":"ghost_djini","image":"cards/ghost_djini.webp"},{"id":"ghost_djini_gold","name":"Ghost Djini","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":15,"def":42,"keywords":[],"floop":{"cost":6,"effects":[{"type":"cycleHand","draw":5}]},"text":"Floop (6 MP): Shuffle your hand back into your Deck and draw 5 cards.","flavorText":"","artKey":"ghost_djini_gold","image":"cards/ghost_djini_gold.webp"},{"id":"ghost_hag","name":"Ghost Hag","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":10,"def":28,"keywords":[],"floop":{"cost":3,"effects":[{"type":"reset","target":"chosenAllyCreature"}]},"text":"Floop (3 MP): Choose a friendly creature and negate all Damage, Defense, and Attack modifiers on it.","flavorText":"","artKey":"ghost_hag","image":"cards/ghost_hag.webp"},{"id":"ghost_hag_gold","name":"Ghost Hag","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":15,"def":42,"keywords":[],"floop":{"cost":3,"effects":[{"type":"reset","target":"chosenAllyCreature"}]},"text":"Floop (3 MP): Choose a friendly creature and negate all Damage, Defense, and Attack modifiers on it.","flavorText":"","artKey":"ghost_hag_gold","image":"cards/ghost_hag_gold.webp"},{"id":"struzann_jinn","name":"Struzann Jinn","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":15,"def":25,"keywords":[],"floop":{"cost":3,"effects":[{"type":"returnToHand","target":"opposingCreature"}]},"text":"Floop (3 MP): Send Creature in opposing lane back to opponent's hand.","flavorText":"","artKey":"struzann_jinn","image":"cards/struzann_jinn.webp"},{"id":"struzann_jinn_gold","name":"Struzann Jinn","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":22,"def":38,"keywords":[],"floop":{"cost":3,"effects":[{"type":"returnToHand","target":"opposingCreature"}]},"text":"Floop (3 MP): Send Creature in opposing lane back to opponent's hand.","flavorText":"","artKey":"struzann_jinn_gold","image":"cards/struzann_jinn_gold.webp"},{"id":"woadic_marauder","name":"Woadic Marauder","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":22,"def":12,"keywords":[],"floop":{"cost":1,"effects":[{"type":"returnBuilding","target":"chosenEnemyBuilding"}]},"text":"Floop (1 MP): Choose an opposing Building and send it back to your opponent's hand.","flavorText":"","artKey":"woadic_marauder","image":"cards/woadic_marauder.webp"},{"id":"woadic_marauder_gold","name":"Woadic Marauder","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":33,"def":18,"keywords":[],"floop":{"cost":1,"effects":[{"type":"returnBuilding","target":"chosenEnemyBuilding"}]},"text":"Floop (1 MP): Choose an opposing Building and send it back to your opponent's hand.","flavorText":"","artKey":"woadic_marauder_gold","image":"cards/woadic_marauder_gold.webp"},{"id":"diamond_dan","name":"Diamond Dan","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":1,"def":47,"keywords":[],"floop":{"cost":1,"effects":[{"type":"gainMp","amount":6},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Destroy this creature and gain 6 Magic Points this turn.","flavorText":"","artKey":"diamond_dan","image":"cards/diamond_dan.webp"},{"id":"diamond_dan_gold","name":"Diamond Dan","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":1,"def":71,"keywords":[],"floop":{"cost":1,"effects":[{"type":"gainMp","amount":6},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Destroy this creature and gain 6 Magic Points this turn.","flavorText":"","artKey":"diamond_dan_gold","image":"cards/diamond_dan_gold.webp"},{"id":"embarrassing_bard","name":"Embarrassing Bard","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":10,"def":34,"keywords":[],"floop":{"cost":2,"effects":[{"type":"lockFloop","target":"chosenEnemyCreature"}]},"text":"Floop (2 MP): Choose an opposing creature. It cannot use its Floop ability next turn.","flavorText":"","artKey":"embarrassing_bard","image":"cards/embarrassing_bard.webp"},{"id":"embarrassing_bard_gold","name":"Embarrassing Bard","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":15,"def":51,"keywords":[],"floop":{"cost":2,"effects":[{"type":"lockFloop","target":"chosenEnemyCreature"}]},"text":"Floop (2 MP): Choose an opposing creature. It cannot use its Floop ability next turn.","flavorText":"","artKey":"embarrassing_bard_gold","image":"cards/embarrassing_bard_gold.webp"},{"id":"fantasmo","name":"Fantasmo","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":15,"def":38,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":4,"stealOnKill":true}]},"text":"Floop (3 MP): Does 4 damage. If the defending creature card dies, the card is added into the attacker's hand instead of going into the defender's discard pile.","flavorText":"","artKey":"fantasmo","image":"cards/fantasmo.webp"},{"id":"madame_seota","name":"Madame Seota","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":29,"def":19,"keywords":[],"floop":{"cost":6,"effects":[{"type":"draw","amount":3}]},"text":"Floop (6 MP): Draw 3 card.","flavorText":"","artKey":"madame_seota","image":"cards/madame_seota.webp"},{"id":"woadic_chief","name":"Woadic Chief","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":18,"def":30,"keywords":[],"floop":{"cost":3,"effects":[{"type":"seal","target":"opposingLandscape"}]},"text":"Floop (3 MP): No Creature or Building may be summoned on the opposing lane next turn.","flavorText":"","artKey":"woadic_chief","image":"cards/woadic_chief.webp"},{"id":"woadic_chief_gold","name":"Woadic Chief","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":27,"def":45,"keywords":[],"floop":{"cost":3,"effects":[{"type":"seal","target":"opposingLandscape"}]},"text":"Floop (3 MP): No Creature or Building may be summoned on the opposing lane next turn.","flavorText":"","artKey":"woadic_chief_gold","image":"cards/woadic_chief_gold.webp"},{"id":"x_large_spirit_soldier","name":"X-Large Spirit Soldier","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":5,"def":40,"keywords":[],"floop":{"cost":1,"effects":[{"type":"draw","amount":1},{"type":"returnToHand","target":"self"}]},"text":"Floop (1 MP): Return this creature to your hand and draw 1 card.","flavorText":"","artKey":"x_large_spirit_soldier","image":"cards/x_large_spirit_soldier.webp"},{"id":"x_large_spirit_soldier_gold","name":"X-Large Spirit Soldier","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":7,"def":60,"keywords":[],"floop":{"cost":1,"effects":[{"type":"draw","amount":1},{"type":"returnToHand","target":"self"}]},"text":"Floop (1 MP): Return this creature to your hand and draw 1 card.","flavorText":"","artKey":"x_large_spirit_soldier_gold","image":"cards/x_large_spirit_soldier_gold.webp"},{"id":"apple_tree","name":"Apple Tree","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":9,"def":21,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"allAllyCreatures","amount":{"of":"targetDamage"}},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Fully heal all your creatures and destroy this creature.","flavorText":"","artKey":"apple_tree","image":"cards/apple_tree.webp"},{"id":"fatapillar","name":"Fatapillar","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":3,"def":27,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"chosenCreature","amount":{"of":"floopsThisTurn","mul":5}}]},"text":"Floop (1 MP): Choose a creature and heal it 5 points for every creature you Flooped this turn.","flavorText":"","artKey":"fatapillar","image":"cards/fatapillar.webp"},{"id":"nicelands_cutie","name":"Nicelands Cutie","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":20,"def":10,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"ownHero","amount":{"of":"floopsThisTurn","mul":3}}]},"text":"Floop (2 MP): Heal your Hero 3 points for every creature you Flooped this turn.","flavorText":"","artKey":"nicelands_cutie","image":"cards/nicelands_cutie.webp"},{"id":"angel_heart","name":"Angel Heart","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"atk":1,"def":6,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":3}]},"text":"Floop (1 MP): Choose one of your creature and heal it 3 points.","flavorText":"","artKey":"angel_heart","image":"cards/angel_heart.webp"},{"id":"angel_heart_gold","name":"Angel Heart","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":1,"def":9,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":3}]},"text":"Floop (1 MP): Choose one of your creature and heal it 3 points.","flavorText":"","artKey":"angel_heart_gold","image":"cards/angel_heart_gold.webp"},{"id":"blueberry_djini","name":"Blueberry Djini","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"atk":2,"def":7,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"ownHero","amount":2}]},"text":"Floop (2 MP): Heal your Hero 2 points.","flavorText":"","artKey":"blueberry_djini","image":"cards/blueberry_djini.webp"},{"id":"blueberry_djini_gold","name":"Blueberry Djini","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":11,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"ownHero","amount":2}]},"text":"Floop (2 MP): Heal your Hero 2 points.","flavorText":"","artKey":"blueberry_djini_gold","image":"cards/blueberry_djini_gold.webp"},{"id":"fairy_shepard","name":"Fairy Shepard","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"atk":2,"def":7,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":3,"splash":true}]},"text":"Floop (3 MP): Choose one of your creatures. Heal it and its adjacent creatures 3 points.","flavorText":"","artKey":"fairy_shepard","image":"cards/fairy_shepard.webp"},{"id":"fairy_shepard_gold","name":"Fairy Shepard","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":11,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":3,"splash":true}]},"text":"Floop (3 MP): Choose one of your creatures. Heal it and its adjacent creatures 3 points.","flavorText":"","artKey":"fairy_shepard_gold","image":"cards/fairy_shepard_gold.webp"},{"id":"fluffapillar","name":"Fluffapillar","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"atk":2,"def":5,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"adjacentAllies","amount":3}]},"text":"Floop (2 MP): Heal adjacent creatures 3 points.","flavorText":"","artKey":"fluffapillar","image":"cards/fluffapillar.webp"},{"id":"fluffapillar_gold","name":"Fluffapillar","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":8,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"adjacentAllies","amount":3}]},"text":"Floop (2 MP): Heal adjacent creatures 3 points.","flavorText":"","artKey":"fluffapillar_gold","image":"cards/fluffapillar_gold.webp"},{"id":"soft_eyeling","name":"Soft Eyeling","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"atk":2,"def":6,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"chosenCreature","amount":{"of":"ownLandscapeTypes","mul":3}}]},"text":"Floop (3 MP): Choose a creature and heal 3 points for each of your different landscapes.","flavorText":"","artKey":"soft_eyeling","image":"cards/soft_eyeling.webp"},{"id":"soft_eyeling_gold","name":"Soft Eyeling","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":9,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"chosenCreature","amount":{"of":"ownLandscapeTypes","mul":3}}]},"text":"Floop (3 MP): Choose a creature and heal 3 points for each of your different landscapes.","flavorText":"","artKey":"soft_eyeling_gold","image":"cards/soft_eyeling_gold.webp"},{"id":"dr_phillip_flufferson","name":"Dr Phillip Flufferson","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"common","stars":1,"atk":5,"def":16,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"adjacentAllies","amount":5}]},"text":"Floop (2 MP): Heal adjacent creatures 5 points.","flavorText":"","artKey":"dr_phillip_flufferson","image":"cards/dr_phillip_flufferson.webp"},{"id":"music_mallard","name":"Music Mallard","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":4,"def":12,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"self","amount":5},{"type":"heal","target":"adjacentAllies","amount":5}]},"text":"Floop (3 MP): Heal this creature and adjacent creatures 5 points.","flavorText":"","artKey":"music_mallard","image":"cards/music_mallard.webp"},{"id":"music_mallard_gold","name":"Music Mallard","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":6,"def":18,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"self","amount":5},{"type":"heal","target":"adjacentAllies","amount":5}]},"text":"Floop (3 MP): Heal this creature and adjacent creatures 5 points.","flavorText":"","artKey":"music_mallard_gold","image":"cards/music_mallard_gold.webp"},{"id":"nicelands_eye_bat","name":"Nicelands Eye Bat","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":7,"def":10,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"handSize","mul":4}}]},"text":"Floop (3 MP): Choose one of your creatures and heal it 4 points for each card in your hand.","flavorText":"","artKey":"nicelands_eye_bat","image":"cards/nicelands_eye_bat.webp"},{"id":"nicelands_eye_bat_gold","name":"Nicelands Eye Bat","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":10,"def":15,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"handSize","mul":4}}]},"text":"Floop (3 MP): Choose one of your creatures and heal it 4 points for each card in your hand.","flavorText":"","artKey":"nicelands_eye_bat_gold","image":"cards/nicelands_eye_bat_gold.webp"},{"id":"snake_mint","name":"Snake Mint","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":9,"def":9,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":2},{"type":"heal","target":"self","amount":4}]},"text":"Floop (2 MP): Deal 2 Damage to creature in opposing lane and heal this creature 4 points.","flavorText":"","artKey":"snake_mint","image":"cards/snake_mint.webp"},{"id":"snake_mint_gold","name":"Snake Mint","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":13,"def":14,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":2},{"type":"heal","target":"self","amount":4}]},"text":"Floop (2 MP): Deal 2 Damage to creature in opposing lane and heal this creature 4 points.","flavorText":"","artKey":"snake_mint_gold","image":"cards/snake_mint_gold.webp"},{"id":"snowball","name":"Snowball","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"legendary","stars":5,"atk":5,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":{"of":"timesFlooped"},"def":0}]},"text":"Floop (2 MP): Raise Attack by the number of times you have flooped this creature.","flavorText":"","artKey":"snowball","image":"cards/snowball.webp"},{"id":"snuggle_tree","name":"Snuggle Tree","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":3,"def":15,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"self","amount":4},{"type":"heal","target":"adjacentAllies","amount":4}]},"text":"Floop (3 MP): Heal this creature and adjacent creatures 4 points.","flavorText":"","artKey":"snuggle_tree","image":"cards/snuggle_tree.webp"},{"id":"snuggle_tree_gold","name":"Snuggle Tree","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":4,"def":23,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"self","amount":4},{"type":"heal","target":"adjacentAllies","amount":4}]},"text":"Floop (3 MP): Heal this creature and adjacent creatures 4 points.","flavorText":"","artKey":"snuggle_tree_gold","image":"cards/snuggle_tree_gold.webp"},{"id":"bad_rose","name":"Bad Rose","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":19,"def":21,"keywords":[],"floop":{"cost":6,"effects":[{"type":"cycleHand","draw":5},{"type":"gainMp","amount":2,"nextTurn":true}]},"text":"Floop (6 MP): Return all cards, draw 5 cards, and gain 2 Magic points next turn.","flavorText":"","artKey":"bad_rose","image":"cards/bad_rose.webp"},{"id":"candyr_gold","name":"Candyr","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":10,"def":25,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":{"of":"targetMaxDef"},"duration":"round"}]},"text":"Floop (3 MP): Increased the defence critical area by 200% for all your creatures for the next time you defend.","flavorText":"","artKey":"candyr_gold","image":"cards/candyr_gold.webp"},{"id":"detective_bobby","name":"Detective Bobby","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":5,"def":21,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"adjacentAllies","amount":6}]},"text":"Floop (2 MP): Adjacent creatures heal 6 points.","flavorText":"","artKey":"detective_bobby","image":"cards/detective_bobby.webp"},{"id":"detective_bobby_gold","name":"Detective Bobby","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":7,"def":32,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"adjacentAllies","amount":6}]},"text":"Floop (2 MP): Adjacent creatures heal 6 points.","flavorText":"","artKey":"detective_bobby_gold","image":"cards/detective_bobby_gold.webp"},{"id":"dog_boy","name":"Dog Boy","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":13,"def":17,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":5},{"type":"heal","target":"self","amount":5}]},"text":"Floop (1 MP): Deal 5 Damage to creature in opposing lane and heal this creature 5 points.","flavorText":"","artKey":"dog_boy","image":"cards/dog_boy.webp"},{"id":"dog_boy_gold","name":"Dog Boy","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":19,"def":26,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":5},{"type":"heal","target":"self","amount":5}]},"text":"Floop (1 MP): Deal 5 Damage to creature in opposing lane and heal this creature 5 points.","flavorText":"","artKey":"dog_boy_gold","image":"cards/dog_boy_gold.webp"},{"id":"furious_hen","name":"Furious Hen","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":6,"def":24,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":3},{"type":"heal","target":"self","amount":4}]},"text":"Floop (2 MP): Deal 3 damage to creature in opposing lane and heal this creature 4 points.","flavorText":"","artKey":"furious_hen","image":"cards/furious_hen.webp"},{"id":"furious_hen_gold","name":"Furious Hen","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":9,"def":36,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":3},{"type":"heal","target":"self","amount":4}]},"text":"Floop (2 MP): Deal 3 damage to creature in opposing lane and heal this creature 4 points.","flavorText":"","artKey":"furious_hen_gold","image":"cards/furious_hen_gold.webp"},{"id":"the_cow","name":"The Cow","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":4,"def":26,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"allAllyCreatures","amount":5}]},"text":"Floop (3 MP): Heal all of your creatures 5 points.","flavorText":"","artKey":"the_cow","image":"cards/the_cow.webp"},{"id":"the_cow_gold","name":"The Cow","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":6,"def":39,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"allAllyCreatures","amount":5}]},"text":"Floop (3 MP): Heal all of your creatures 5 points.","flavorText":"","artKey":"the_cow_gold","image":"cards/the_cow_gold.webp"},{"id":"weak_candyr","name":"Weak Candyr","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":1,"atk":2,"def":20,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":3},{"type":"destroy","target":"self"}]},"text":"Floop (2 MP): Deal 3 damage to creature in the opposing lane and Discard this creature.","flavorText":"","artKey":"weak_candyr","image":"cards/weak_candyr.webp"},{"id":"well_dressed_wolf","name":"Well Dressed Wolf","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":10,"def":18,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"self","amount":{"of":"targetDamage"}}]},"text":"Floop (2 MP): Heal all Damage from this creature.","flavorText":"","artKey":"well_dressed_wolf","image":"cards/well_dressed_wolf.webp"},{"id":"well_dressed_wolf_gold","name":"Well Dressed Wolf","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":15,"def":27,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"self","amount":{"of":"targetDamage"}}]},"text":"Floop (2 MP): Heal all Damage from this creature.","flavorText":"","artKey":"well_dressed_wolf_gold","image":"cards/well_dressed_wolf_gold.webp"},{"id":"dr_stuffenstein_real","name":"Dr. Stuffenstein","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Real","atk":15,"def":22,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"ownBuildings","mul":4}}]},"text":"Floop (2 MP): Choose one of your creatures and heal it 4 points for each of your buildings.","flavorText":"","artKey":"dr_stuffenstein_real","image":"cards/dr_stuffenstein_real.webp"},{"id":"farmer_tom","name":"Farmer Tom","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":12,"def":21,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"ownBuildings","mul":6}}]},"text":"Floop (2 MP): Choose one of your creatures and heal it 6 points for each of your buildings.","flavorText":"","artKey":"farmer_tom","image":"cards/farmer_tom.webp"},{"id":"farmer_tom_gold","name":"Farmer Tom","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":18,"def":32,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"ownBuildings","mul":6}}]},"text":"Floop (2 MP): Choose one of your creatures and heal it 6 points for each of your buildings.","flavorText":"","artKey":"farmer_tom_gold","image":"cards/farmer_tom_gold.webp"},{"id":"intern_stuffenstein","name":"Intern Stuffenstein","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":0,"def":1,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"ownBuildings","mul":4}}]},"text":"Floop (2 MP): Choose one of your creatures and heal it 4 points for each of your buildings.","flavorText":"","artKey":"intern_stuffenstein","image":"cards/intern_stuffenstein.webp"},{"id":"lt_mushroom","name":"Lt. Mushroom","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":14,"def":25,"keywords":[],"floop":{"cost":6,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":14},{"type":"heal","target":"self","amount":25}]},"text":"Floop (6 MP): Choose an opposing creature. Deal 14 Damage to it and heal this creature 25 points.","flavorText":"","artKey":"lt_mushroom","image":"cards/lt_mushroom.webp"},{"id":"lt_mushroom_gold","name":"Lt. Mushroom","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":21,"def":37,"keywords":[],"floop":{"cost":6,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":14},{"type":"heal","target":"self","amount":25}]},"text":"Floop (6 MP): Choose an opposing creature. Deal 14 Damage to it and heal this creature 25 points.","flavorText":"","artKey":"lt_mushroom_gold","image":"cards/lt_mushroom_gold.webp"},{"id":"sack_o_pain","name":"Sack O' Pain","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":3,"def":33,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"adjacentAllies","amount":{"of":"selfDamage"}}]},"text":"Floop (3 MP): Heal adjacent creatures equal to the Damage on this creature.","flavorText":"","artKey":"sack_o_pain","image":"cards/sack_o_pain.webp"},{"id":"sack_o_pain_gold","name":"Sack O' Pain","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":4,"def":50,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"adjacentAllies","amount":{"of":"selfDamage"}}]},"text":"Floop (3 MP): Heal adjacent creatures equal to the Damage on this creature.","flavorText":"","artKey":"sack_o_pain_gold","image":"cards/sack_o_pain_gold.webp"},{"id":"sgt_mushroom","name":"Sgt. Mushroom","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":26,"def":14,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":4},{"type":"heal","target":"self","amount":6}]},"text":"Floop (1 MP): Choose an opposing creature. Deal 4 Damage to it and heal this creature 6 points.","flavorText":"","artKey":"sgt_mushroom","image":"cards/sgt_mushroom.webp"},{"id":"sgt_mushroom_gold","name":"Sgt. Mushroom","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":39,"def":21,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":4},{"type":"heal","target":"self","amount":6}]},"text":"Floop (1 MP): Choose an opposing creature. Deal 4 Damage to it and heal this creature 6 points.","flavorText":"","artKey":"sgt_mushroom_gold","image":"cards/sgt_mushroom_gold.webp"},{"id":"cottonpult","name":"Cottonpult","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":25,"def":20,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":7},{"type":"heal","target":"self","amount":7}]},"text":"Floop (3 MP): Deal 7 damage to creature in opposing lane and heal this creature 7 points.","flavorText":"","artKey":"cottonpult","image":"cards/cottonpult.webp"},{"id":"cottonpult_gold","name":"Cottonpult","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":37,"def":30,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":7},{"type":"heal","target":"self","amount":7}]},"text":"Floop (3 MP): Deal 7 damage to creature in opposing lane and heal this creature 7 points.","flavorText":"","artKey":"cottonpult_gold","image":"cards/cottonpult_gold.webp"},{"id":"cottonsaurus_rex","name":"Cottonsaurus Rex","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":7,"def":40,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"ownHero","amount":{"of":"selfAtk"}}]},"text":"Floop (3 MP): Heal your Hero equal to this creature's Attack.","flavorText":"","artKey":"cottonsaurus_rex","image":"cards/cottonsaurus_rex.webp"},{"id":"cottonsaurus_rex_gold","name":"Cottonsaurus Rex","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":10,"def":60,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"ownHero","amount":{"of":"selfAtk"}}]},"text":"Floop (3 MP): Heal your Hero equal to this creature's Attack.","flavorText":"","artKey":"cottonsaurus_rex_gold","image":"cards/cottonsaurus_rex_gold.webp"},{"id":"furious_rooster","name":"Furious Rooster","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":15,"def":28,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":10},{"type":"heal","target":"self","amount":6}]},"text":"Floop (2 MP): Deal 10 damage to creature in opposing lane and heal this creature 6 points.","flavorText":"","artKey":"furious_rooster","image":"cards/furious_rooster.webp"},{"id":"ghost_bull","name":"Ghost Bull","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":20,"def":28,"keywords":[],"floop":{"cost":6,"effects":[{"type":"damage","target":"opposingCreature","amount":20},{"type":"heal","target":"self","amount":28}]},"text":"Floop (6 MP): Deal 20 Damage to creature in opposing lane and heal this creature 28 points.","flavorText":"","artKey":"ghost_bull","image":"cards/ghost_bull.webp"},{"id":"good_king_wonderful","name":"Good King Wonderful","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":5,"def":40,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"targetDamage"}}]},"text":"Floop (3 MP): Choose one of your creatures and heal all Damage from it.","flavorText":"","artKey":"good_king_wonderful","image":"cards/good_king_wonderful.webp"},{"id":"good_king_wonderful_gold","name":"Good King Wonderful","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":7,"def":60,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"targetDamage"}}]},"text":"Floop (3 MP): Choose one of your creatures and heal all Damage from it.","flavorText":"","artKey":"good_king_wonderful_gold","image":"cards/good_king_wonderful_gold.webp"},{"id":"hate_bird","name":"Hate Bird","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":5,"def":40,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"self","amount":{"of":"opposingAtk"}}]},"text":"Floop (3 MP): Heals this creature with the amount of the opposing creature's attack.","flavorText":"","artKey":"hate_bird","image":"cards/hate_bird.webp"},{"id":"mother_fluff_bucket","name":"Mother Fluff Bucket","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":13,"def":30,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"ownHero","amount":5}]},"text":"Floop (3 MP): Heal your Hero 5 points","flavorText":"","artKey":"mother_fluff_bucket","image":"cards/mother_fluff_bucket.webp"},{"id":"mother_fluff_bucket_gold","name":"Mother Fluff Bucket","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":19,"def":45,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"ownHero","amount":5}]},"text":"Floop (3 MP): Heal your Hero 5 points.","flavorText":"","artKey":"mother_fluff_bucket_gold","image":"cards/mother_fluff_bucket_gold.webp"},{"id":"nice_bird","name":"Nice Bird","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":5,"def":35,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"adjacentAllies","amount":20},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Sacrifice this card and heal adjacent cards for 20 HP each.","flavorText":"","artKey":"nice_bird","image":"cards/nice_bird.webp"},{"id":"green_party_ogre","name":"Green Party Ogre","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":11,"def":19,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"chosenAllyCreature","atk":0,"def":{"of":"floopsThisTurn","mul":4}}]},"text":"Floop (2 MP): Choose a friendly creature and raise its Defense by 4 for every creature you Flooped this turn.","flavorText":"","artKey":"green_party_ogre","image":"cards/green_party_ogre.webp"},{"id":"sandasaurus_rex","name":"Sandasaurus Rex","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":14,"def":16,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"chosenEnemyCreature","atk":0,"def":{"of":"floopsThisTurn","mul":-5}}]},"text":"Floop (3 MP): Choose an enemy creature and lower its Defense by 5 for every creature you Flooped this turn.","flavorText":"","artKey":"sandasaurus_rex","image":"cards/sandasaurus_rex.webp"},{"id":"burning_hand","name":"Burning Hand","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"atk":5,"def":2,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"opposingCreature","atk":0,"def":-2}]},"text":"Floop (1 MP): Lower the Defense of creature in the opposite lane by 2.","flavorText":"","artKey":"burning_hand","image":"cards/burning_hand.webp"},{"id":"burning_hand_gold","name":"Burning Hand","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":7,"def":3,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"opposingCreature","atk":0,"def":-2}]},"text":"Floop (1 MP): Lower the Defense of creature in the opposite lane by 2.","flavorText":"","artKey":"burning_hand_gold","image":"cards/burning_hand_gold.webp"},{"id":"green_cactaball","name":"Green Cactaball","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"atk":4,"def":5,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":0,"def":2}]},"text":"Floop (1 MP): Gain +2 Defense.","flavorText":"","artKey":"green_cactaball","image":"cards/green_cactaball.webp"},{"id":"green_cactaball_gold","name":"Green Cactaball","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":6,"def":5,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":0,"def":2}]},"text":"Floop (1 MP): Gain +2 Defense.","flavorText":"","artKey":"green_cactaball_gold","image":"cards/green_cactaball_gold.webp"},{"id":"ms_mummy","name":"Ms.Mummy","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"atk":3,"def":6,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"adjacentAllies","atk":0,"def":3}]},"text":"Floop (3 MP): Adjacent creatures gain +3 Defense.","flavorText":"","artKey":"ms_mummy","image":"cards/ms_mummy.webp"},{"id":"ms_mummy_gold","name":"Ms.Mummy","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":4,"def":9,"keywords":[],"floop":{"cost":3,"effects":[{"type":"gainMp","amount":2,"nextTurn":true}]},"text":"Floop (3 MP): Gain +2 Magic Points next turn.","flavorText":"","artKey":"ms_mummy_gold","image":"cards/ms_mummy_gold.webp"},{"id":"mud_angel_gold","name":"Mud Angel","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"rare","stars":3,"variant":"Gold","atk":13,"def":32,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"chosenEnemyCreature","atk":0,"def":-6}]},"text":"Floop (1 MP): Choose an opposing creature and lower its Defense by 6.","flavorText":"","artKey":"mud_angel_gold","image":"cards/mud_angel_gold.webp"},{"id":"sand_angel","name":"Sand Angel","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"atk":2,"def":6,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"chosenAllyCreature","atk":0,"def":2}]},"text":"Floop (1 MP): Choose one of your creatures and give it +2 Defense.","flavorText":"","artKey":"sand_angel","image":"cards/sand_angel.webp"},{"id":"sand_angel_gold","name":"Sand Angel","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":9,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"chosenAllyCreature","atk":0,"def":2}]},"text":"Floop (1 MP): Choose one of your creatures and give it +2 Defense.","flavorText":"","artKey":"sand_angel_gold","image":"cards/sand_angel_gold.webp"},{"id":"sand_eyebat","name":"Sand Eyebat","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"atk":4,"def":4,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"chosenEnemyCreature","atk":0,"def":-2}]},"text":"Floop (1 MP): Choose an opposing creature and lower its Defense by 2","flavorText":"","artKey":"sand_eyebat","image":"cards/sand_eyebat.webp"},{"id":"sand_eyebat_gold","name":"Sand Eyebat","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":6,"def":6,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"chosenEnemyCreature","atk":0,"def":-2}]},"text":"Floop (1 MP): Choose and opposing creature and lower its Defense by 2","flavorText":"","artKey":"sand_eyebat_gold","image":"cards/sand_eyebat_gold.webp"},{"id":"beach_mum","name":"Beach Mum","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":9,"def":11,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":2,"def":3}]},"text":"Floop (3 MP): Gain +2 Attack and +3 Defense.","flavorText":"","artKey":"beach_mum","image":"cards/beach_mum.webp"},{"id":"beach_mum_gold","name":"Beach Mum","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":13,"def":17,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":2,"def":3}]},"text":"Floop (3 MP): Gain +2 Attack and +3 Defense.","flavorText":"","artKey":"beach_mum_gold","image":"cards/beach_mum_gold.webp"},{"id":"lime_slimey","name":"Lime Slimey","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":8,"def":8,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":0,"def":3},{"type":"buff","target":"adjacentAllies","atk":0,"def":3}]},"text":"Floop (3 MP): This creature and adjacent creatures gain +3 Defense.","flavorText":"","artKey":"lime_slimey","image":"cards/lime_slimey.webp"},{"id":"lime_slimey_gold","name":"Lime Slimey","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":12,"def":12,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":0,"def":3},{"type":"buff","target":"adjacentAllies","atk":0,"def":3}]},"text":"Floop (3 MP): This creature and adjacent creatures gain +3 Defense.","flavorText":"","artKey":"lime_slimey_gold","image":"cards/lime_slimey_gold.webp"},{"id":"mayonaise_angel","name":"Mayonaise Angel","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":4,"def":12,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"chosenAllyCreature","atk":0,"def":4}]},"text":"Floop (2 MP): Choose one of your creatures and give it +4 Defense each.","flavorText":"","artKey":"mayonaise_angel","image":"cards/mayonaise_angel.webp"},{"id":"mayonaise_angel_gold","name":"Mayonaise Angel","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":6,"def":18,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"chosenAllyCreature","atk":0,"def":4}]},"text":"Floop (2 MP): Choose one of your creatures and give it +4 Defense.","flavorText":"","artKey":"mayonaise_angel_gold","image":"cards/mayonaise_angel_gold.webp"},{"id":"sandbacho","name":"Sandbacho","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":2,"rarity":"common","stars":1,"atk":11,"def":10,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":0,"def":4},{"type":"buff","target":"adjacentAllies","atk":0,"def":4}]},"text":"Floop (3 MP): This creature and adjacent creatures gain +4 Defense.","flavorText":"","artKey":"sandbacho","image":"cards/sandbacho.webp"},{"id":"sandsnake","name":"Sandsnake","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":12,"def":7,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"opposingCreature","atk":0,"def":-5}]},"text":"Floop (3 MP): Lower the Defense of the creature in the opposite lane by 5.","flavorText":"","artKey":"sandsnake","image":"cards/sandsnake.webp"},{"id":"sandsnake_gold","name":"Sandsnake","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":18,"def":11,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"opposingCreature","atk":0,"def":-5}]},"text":"Floop (3 MP): Lower the Defense of the creature in the opposite lane by 5.","flavorText":"","artKey":"sandsnake_gold","image":"cards/sandsnake_gold.webp"},{"id":"mud_angel","name":"Mud Angel","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":9,"def":21,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"chosenEnemyCreature","atk":0,"def":-6}]},"text":"Floop (1 MP): Choose an opposing creature and lower its Defense by 6.","flavorText":"","artKey":"mud_angel","image":"cards/mud_angel.webp"},{"id":"prickle","name":"Prickle","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":9,"def":18,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":5},{"type":"damage","target":"enemyHero","amount":5}]},"text":"Floop (3 MP): Deal 5 Damage to the opposing creature and Hero.","flavorText":"","artKey":"prickle","image":"cards/prickle.webp"},{"id":"sand_jackal","name":"Sand Jackal","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":6,"def":21,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":0,"def":{"of":"selfAtk","mul":-1}}]},"text":"Floop (2 MP): Lower the Defense of the opposing creature equal to this creature's Attack.","flavorText":"","artKey":"sand_jackal","image":"cards/sand_jackal.webp"},{"id":"sand_jackal_gold","name":"Sand Jackal","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":9,"def":32,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":0,"def":{"of":"selfAtk","mul":-1}}]},"text":"Floop (2 MP): Lower the Defense of the opposing creature equal to this creature's Attack.","flavorText":"","artKey":"sand_jackal_gold","image":"cards/sand_jackal_gold.webp"},{"id":"sandfoot","name":"Sandfoot","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":10,"def":17,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":0,"def":{"of":"ownCreatures","mul":4}}]},"text":"Floop (3 MP): Gain +4 Defense for each of your creatures.","flavorText":"","artKey":"sandfoot","image":"cards/sandfoot.webp"},{"id":"sandfoot_gold","name":"Sandfoot","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":15,"def":26,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":0,"def":{"of":"ownCreatures","mul":4}}]},"text":"Floop (3 MP): Gain +4 Defense for each of your creatures.","flavorText":"","artKey":"sandfoot_gold","image":"cards/sandfoot_gold.webp"},{"id":"wall_of_sand","name":"Wall Of Sand","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":0,"def":26,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"adjacentAllies","atk":0,"def":4}]},"text":"Floop (2 MP): Adjacent creatures gain +4 Defense.","flavorText":"","artKey":"wall_of_sand","image":"cards/wall_of_sand.webp"},{"id":"wall_of_sand_gold","name":"Wall Of Sand","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":0,"def":39,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"adjacentAllies","atk":0,"def":4}]},"text":"Floop (2 MP): Adjacent creatures gain +4 Defense.","flavorText":"","artKey":"wall_of_sand_gold","image":"cards/wall_of_sand_gold.webp"},{"id":"wall_of_chocolate","name":"Wall of Chocolate","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":3,"rarity":"legendary","stars":5,"atk":5,"def":22,"keywords":[],"floop":{"cost":0,"effects":[{"type":"heal","target":"allCreatures","amount":5},{"type":"damage","target":"self","amount":2}]},"text":"Floop (0 MP): Heal all creatures for 5 and take 2 damage in return.","flavorText":"","artKey":"wall_of_chocolate","image":"cards/wall_of_chocolate.webp"},{"id":"fummy","name":"Fummy","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":10,"def":24,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":0,"def":6},{"type":"buff","target":"adjacentAllies","atk":0,"def":6}]},"text":"Floop (2 MP): This creature and adjacent creatures gain +6 Defense.","flavorText":"","artKey":"fummy","image":"cards/fummy.webp"},{"id":"fummy_gold","name":"Fummy","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":15,"def":36,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":0,"def":6},{"type":"buff","target":"adjacentAllies","atk":0,"def":6}]},"text":"Floop (2 MP): This creature and adjacent creatures gain +6 Defense.","flavorText":"","artKey":"fummy_gold","image":"cards/fummy_gold.webp"},{"id":"giant_mummy_hand","name":"Giant Mummy Hand","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":9,"def":29,"keywords":[],"floop":{"cost":6,"effects":[{"type":"buff","target":"self","atk":0,"def":10},{"type":"buff","target":"adjacentAllies","atk":0,"def":10}]},"text":"Floop (6 MP): This creature and adjacent creatures gain +10 Defense.","flavorText":"","artKey":"giant_mummy_hand","image":"cards/giant_mummy_hand.webp"},{"id":"giant_mummy_hand_gold","name":"Giant Mummy Hand","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":13,"def":43,"keywords":[],"floop":{"cost":6,"effects":[{"type":"buff","target":"self","atk":0,"def":10},{"type":"buff","target":"adjacentAllies","atk":0,"def":10}]},"text":"Floop (6 MP): This creature and adjacent creatures gain +10 Defense.","flavorText":"","artKey":"giant_mummy_hand_gold","image":"cards/giant_mummy_hand_gold.webp"},{"id":"lady_mary","name":"Lady Mary","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":18,"def":20,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":{"of":"ownBuildings","mul":2}}]},"text":"Floop (3 MP): Increase the Defense of all of your creatures by 2 for each building you control.","flavorText":"","artKey":"lady_mary","image":"cards/lady_mary.webp"},{"id":"lady_mary_gold","name":"Lady Mary","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":27,"def":30,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":{"of":"ownBuildings","mul":2}}]},"text":"Floop (3 MP): Increase the Defense of all of your creatures by 2 for each building you control.","flavorText":"","artKey":"lady_mary_gold","image":"cards/lady_mary_gold.webp"},{"id":"sand_knight","name":"Sand Knight","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":20,"def":20,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":5}]},"text":"Floop (2 MP): All of your creatures gain +5 Defense","flavorText":"","artKey":"sand_knight","image":"cards/sand_knight.webp"},{"id":"sand_knight_gold","name":"Sand Knight","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":30,"def":30,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":5}]},"text":"Floop (2 MP): All of your creatures gain +5 Defense","flavorText":"","artKey":"sand_knight_gold","image":"cards/sand_knight_gold.webp"},{"id":"sandwitch","name":"Sandwitch","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":25,"def":10,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"randomCreature","atk":0,"def":9}]},"text":"Floop (1 MP): +9 Defense to a random creature on the field, including your opponents..","flavorText":"","artKey":"sandwitch","image":"cards/sandwitch.webp"},{"id":"sandwitch_gold","name":"Sandwitch","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":37,"def":15,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"randomCreature","atk":0,"def":9}]},"text":"Floop (1 MP): +9 Defense to a random creature on the field, including your opponents..","flavorText":"","artKey":"sandwitch_gold","image":"cards/sandwitch_gold.webp"},{"id":"black_cat","name":"Black Cat","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":15,"def":35,"keywords":[],"floop":{"cost":6,"effects":[{"type":"buff","target":"chosenEnemyCreature","atk":0,"def":-30}]},"text":"Floop (6 MP): Choose an opposing creature and lower its Defense by 30.","flavorText":"","artKey":"black_cat","image":"cards/black_cat.webp"},{"id":"cactus_thug","name":"Cactus Thug","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":25,"def":12,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"selfDef"}}]},"text":"Floop (2 MP): Deal Damage to creature in opposing equal to this creature's Defense.","flavorText":"","artKey":"cactus_thug","image":"cards/cactus_thug.webp"},{"id":"cactus_thug_gold","name":"Cactus Thug","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":37,"def":18,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"selfDef"}}]},"text":"Floop (2 MP): Deal Damage to creature in opposing equal to this creature's Defense.","flavorText":"","artKey":"cactus_thug_gold","image":"cards/cactus_thug_gold.webp"},{"id":"count_cactus","name":"Count Cactus","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":5,"def":48,"keywords":[],"floop":{"cost":5,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":{"of":"targetMaxDef","mul":0.5},"duration":"round"}]},"text":"Floop (5 MP): Increase the defence area for all creatures next turn by 150%.","flavorText":"","artKey":"count_cactus","image":"cards/count_cactus.webp"},{"id":"lost_golem","name":"Lost Golem","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":10,"def":36,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":0,"def":8}]},"text":"Floop (1 MP): Gain +8 Defense.","flavorText":"","artKey":"lost_golem","image":"cards/lost_golem.webp"},{"id":"lost_golem_gold","name":"Lost Golem","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":15,"def":54,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":0,"def":8}]},"text":"Floop (1 MP): Gain +8 Defense.","flavorText":"","artKey":"lost_golem_gold","image":"cards/lost_golem_gold.webp"},{"id":"pieclops","name":"Pieclops","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":20,"def":25,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"allEnemyCreatures","atk":0,"def":-5}]},"text":"Floop (2 MP): Lower the Defense of all opposing creatures by 5.","flavorText":"","artKey":"pieclops","image":"cards/pieclops.webp"},{"id":"pieclops_gold","name":"Pieclops","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":30,"def":38,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"allEnemyCreatures","atk":0,"def":-5}]},"text":"Floop (2 MP): Lower the Defense of all opposing creatures by 5.","flavorText":"","artKey":"pieclops_gold","image":"cards/pieclops_gold.webp"},{"id":"sandy","name":"Sandy","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":28,"def":18,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":3,"def":7}]},"text":"Floop (2 MP): Gain +3 Attack and +7 Defense.","flavorText":"","artKey":"sandy","image":"cards/sandy.webp"},{"id":"sandy_gold","name":"Sandy","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":42,"def":27,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":3,"def":7}]},"text":"Floop (2 MP): Gain +3 Attack and +7 Defense.","flavorText":"","artKey":"sandy_gold","image":"cards/sandy_gold.webp"},{"id":"log_knight","name":"Log Knight","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":10,"def":20,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":{"of":"floopsThisTurn","mul":4},"def":0}]},"text":"Floop (2 MP): Raise this creature's Attack by 4 for each creature you Flooped this turn.","flavorText":"","artKey":"log_knight","image":"cards/log_knight.webp"},{"id":"sun_king","name":"Sun King","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":5,"def":25,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"chosenCreature","atk":{"of":"ownBuildings","mul":4},"def":0}]},"text":"Floop (3 MP): Choose a creature and raise its Attack 4 points for each building you control.","flavorText":"","artKey":"sun_king","image":"cards/sun_king.webp"},{"id":"yellow_gnome","name":"Yellow Gnome","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":0,"def":30,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"opposingCreature","atk":-4,"def":0},{"type":"buff","target":"self","atk":4,"def":0}]},"text":"Floop (1 MP): Lower opposing creature's Attack by 4 and raise this creature's Attack by 4.","flavorText":"","artKey":"yellow_gnome","image":"cards/yellow_gnome.webp"},{"id":"cornball","name":"Cornball","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"atk":2,"def":5,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":1,"def":0}]},"text":"Floop (2 MP): +1 Attack.","flavorText":"","artKey":"cornball","image":"cards/cornball.webp"},{"id":"cornball_gold","name":"Cornball","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":8,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":1,"def":0}]},"text":"Floop (2 MP): +1 Attack.","flavorText":"","artKey":"cornball_gold","image":"cards/cornball_gold.webp"},{"id":"ethan_allfire","name":"Ethan Allfire","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"atk":5,"def":1,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"opposingCreature","atk":-3,"def":0},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Lower the Attack of the opposing creature by 3 and destroy this creature.","flavorText":"","artKey":"ethan_allfire","image":"cards/ethan_allfire.webp"},{"id":"ethan_allfire_gold","name":"Ethan Allfire","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":7,"def":2,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"opposingCreature","atk":-3,"def":0},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Lower the Attack of the opposing creature by 3 and destroy this creature.","flavorText":"","artKey":"ethan_allfire_gold","image":"cards/ethan_allfire_gold.webp"},{"id":"husker_knight","name":"Husker Knight","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"atk":6,"def":3,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"adjacentAllies","atk":2,"def":0}]},"text":"Floop (3 MP): Adjacent creatures gain +2 Attack.","flavorText":"","artKey":"husker_knight","image":"cards/husker_knight.webp"},{"id":"husker_knight_gold","name":"Husker Knight","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":9,"def":5,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"adjacentAllies","atk":2,"def":0}]},"text":"Floop (3 MP): Adjacent creatures gain +2 Attack.","flavorText":"","artKey":"husker_knight_gold","image":"cards/husker_knight_gold.webp"},{"id":"husker_worm","name":"Husker Worm","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"atk":3,"def":5,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":-2,"def":0}]},"text":"Floop (2 MP): Lower the Attack of the creature in the opposing lane by 2.","flavorText":"","artKey":"husker_worm","image":"cards/husker_worm.webp"},{"id":"husker_worm_gold","name":"Husker Worm","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":4,"def":8,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":-2,"def":0}]},"text":"Floop (2 MP): Lower the Attack of the creature in the opposing lane by 2.","flavorText":"","artKey":"husker_worm_gold","image":"cards/husker_worm_gold.webp"},{"id":"travelin_farmer","name":"Travelin' Farmer","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"atk":5,"def":5,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":{"of":"adjacentEmptyLanes"},"def":0}]},"text":"Floop (1 MP): Gain +1 Attack for each adjacent empty lane.","flavorText":"","artKey":"travelin_farmer","image":"cards/travelin_farmer.webp"},{"id":"travelin_farmer_gold","name":"Travelin' Farmer","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":7,"def":8,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":{"of":"adjacentEmptyLanes"},"def":0}]},"text":"Floop (1 MP): Gain +1 Attack for each adjacent empty lane.","flavorText":"","artKey":"travelin_farmer_gold","image":"cards/travelin_farmer_gold.webp"},{"id":"archer_dan","name":"Archer Dan","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":12,"def":6,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"chosenEnemyCreature","atk":-4,"def":0}]},"text":"Floop (2 MP): Choose an opposing creature and lower its Attack by 4.","flavorText":"","artKey":"archer_dan","image":"cards/archer_dan.webp"},{"id":"archer_dan_gold","name":"Archer Dan","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":18,"def":9,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"chosenEnemyCreature","atk":-4,"def":0}]},"text":"Floop (2 MP): Choose an opposing creature and lower its Attack by 4.","flavorText":"","artKey":"archer_dan_gold","image":"cards/archer_dan_gold.webp"},{"id":"corn_dog","name":"Corn Dog","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":9,"def":11,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"adjacentAllies","atk":4,"def":0}]},"text":"Floop (3 MP): Adjacent creatures gain +4 Attack.","flavorText":"","artKey":"corn_dog","image":"cards/corn_dog.webp"},{"id":"corn_dog_gold","name":"Corn Dog","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":13,"def":17,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"adjacentAllies","atk":4,"def":0}]},"text":"Floop (3 MP): Adjacent creatures gain +4 Attack.","flavorText":"","artKey":"corn_dog_gold","image":"cards/corn_dog_gold.webp"},{"id":"rural_earl","name":"Rural Earl","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":2,"rarity":"common","stars":1,"atk":13,"def":8,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":{"of":"adjacentEmptyLanes","mul":2},"def":0}]},"text":"Floop (2 MP): Gain +2 Attack for each adjacent empty lane.","flavorText":"","artKey":"rural_earl","image":"cards/rural_earl.webp"},{"id":"wall_of_ears","name":"Wall of Ears","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":0,"def":18,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"self","amount":2},{"type":"buff","target":"self","atk":2,"def":0}]},"text":"Floop (1 MP): Inflict 2 Damage to this creature and gain +2 attack.","flavorText":"","artKey":"wall_of_ears","image":"cards/wall_of_ears.webp"},{"id":"wall_of_ears_gold","name":"Wall of Ears","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":0,"def":27,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"self","amount":2},{"type":"buff","target":"self","atk":2,"def":0}]},"text":"Floop (1 MP): Inflict 2 Damage to this creature and gain +2 attack.","flavorText":"","artKey":"wall_of_ears_gold","image":"cards/wall_of_ears_gold.webp"},{"id":"chupamaiz_gold","name":"ChupaMaiz","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":13,"def":13,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":{"of":"targetAtk"},"def":0,"duration":"turn"}]},"text":"Floop (3 MP): Increase the critical area for all your creatures on your next attack by 200%.","flavorText":"","artKey":"chupamaiz_gold","image":"cards/chupamaiz_gold.webp"},{"id":"corn_ronin","name":"Corn Ronin","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":18,"def":10,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":{"of":"handSize","mul":3},"def":0}]},"text":"Floop (2 MP): +3 Attack for every card in your hand.","flavorText":"","artKey":"corn_ronin","image":"cards/corn_ronin.webp"},{"id":"corn_ronin_gold","name":"Corn Ronin","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":27,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":{"of":"handSize","mul":3},"def":0}]},"text":"Floop (2 MP): +3 Attack for every card in your hand.","flavorText":"","artKey":"corn_ronin_gold","image":"cards/corn_ronin_gold.webp"},{"id":"huskerbat","name":"Huskerbat","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":4,"def":22,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":{"of":"selfAtk","mul":-1},"def":0}]},"text":"Floop (2 MP): Lower the Attack of the opposing creature equal to this creature's Attack.","flavorText":"","artKey":"huskerbat","image":"cards/huskerbat.webp"},{"id":"huskerbat_gold","name":"Huskerbat","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":6,"def":33,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":{"of":"selfAtk","mul":-1},"def":0}]},"text":"Floop (2 MP): Lower the Attack of the opposing creature equal to this creature's Attack.","flavorText":"","artKey":"huskerbat_gold","image":"cards/huskerbat_gold.webp"},{"id":"patchy_the_pumpkin","name":"Patchy the Pumpkin","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":22,"def":5,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":-5,"def":0}]},"text":"Floop (2 MP): Lower the Attack of the opposing creature by 5.","flavorText":"","artKey":"patchy_the_pumpkin","image":"cards/patchy_the_pumpkin.webp"},{"id":"purple_cow","name":"Purple Cow","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"legendary","stars":5,"atk":5,"def":20,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":5},{"type":"damage","target":"self","amount":5}]},"text":"Floop (2 MP): Damage all enemy creatures for 5 and take 5 damage in return.","flavorText":"","artKey":"purple_cow","image":"cards/purple_cow.webp"},{"id":"the_sludger","name":"The Sludger","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":15,"def":15,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"adjacentAllies","atk":4,"def":-2}]},"text":"Floop (1 MP): Lower the Defense of adjacent creatures by 2 and increase their Attack by 4.","flavorText":"","artKey":"the_sludger","image":"cards/the_sludger.webp"},{"id":"the_sludger_gold","name":"The Sludger","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":22,"def":23,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"adjacentAllies","atk":4,"def":-2}]},"text":"Floop (1 MP): Lower the Defense of adjacent creatures by 2 and increase their Attack by 4.","flavorText":"","artKey":"the_sludger_gold","image":"cards/the_sludger_gold.webp"},{"id":"weak_chupamaiz","name":"Weak ChupaMaiz","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"rare","stars":1,"atk":4,"def":10,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":3},{"type":"destroy","target":"self"}]},"text":"Floop (2 MP): Deal 3 damage to creature in the opposing lane and Discard this creature.","flavorText":"","artKey":"weak_chupamaiz","image":"cards/weak_chupamaiz.webp"},{"id":"cornataur","name":"Cornataur","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":17,"def":19,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":5,"def":0},{"type":"buff","target":"adjacentAllies","atk":5,"def":0}]},"text":"Floop (3 MP): This creature and adjacent creatures gain +5 Attack.","flavorText":"","artKey":"cornataur","image":"cards/cornataur.webp"},{"id":"cornataur_gold","name":"Cornataur","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":25,"def":29,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":5,"def":0},{"type":"buff","target":"adjacentAllies","atk":5,"def":0}]},"text":"Floop (3 MP): This creature and adjacent creatures gain +5 Attack.","flavorText":"","artKey":"cornataur_gold","image":"cards/cornataur_gold.webp"},{"id":"field_reaper","name":"Field Reaper","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":25,"def":13,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allEnemyCreatures","atk":-4,"def":0}]},"text":"Floop (3 MP): Lower the Attack of All opposing creatures by 4.","flavorText":"","artKey":"field_reaper","image":"cards/field_reaper.webp"},{"id":"field_reaper_gold","name":"Field Reaper","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":37,"def":20,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allEnemyCreatures","atk":-4,"def":0}]},"text":"Floop (3 MP): Lower the Attack of All opposing creatures by 4.","flavorText":"","artKey":"field_reaper_gold","image":"cards/field_reaper_gold.webp"},{"id":"field_stalker","name":"Field Stalker","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":5,"def":34,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":{"of":"selfAtk","sub":"targetAtk"},"def":0}]},"text":"Floop (2 MP): Make the Attack of the opposing creature equal to this creature's Attack.","flavorText":"","artKey":"field_stalker","image":"cards/field_stalker.webp"},{"id":"field_stalker_gold","name":"Field Stalker","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":7,"def":51,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":{"of":"selfAtk","sub":"targetAtk"},"def":0}]},"text":"Floop (2 MP): Make the Attack of the opposing creature equal to this creature's Attack.","flavorText":"","artKey":"field_stalker_gold","image":"cards/field_stalker_gold.webp"},{"id":"ghost_sludger","name":"Ghost Sludger","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":1,"def":37,"keywords":[],"floop":{"cost":6,"effects":[{"type":"buff","target":"self","atk":13,"def":0}]},"text":"Floop (6 MP): +13 Attack.","flavorText":"","artKey":"ghost_sludger","image":"cards/ghost_sludger.webp"},{"id":"ghost_sludger_gold","name":"Ghost Sludger","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":2,"def":55,"keywords":[],"floop":{"cost":6,"effects":[{"type":"buff","target":"self","atk":13,"def":0}]},"text":"Floop (6 MP): +13 Attack.","flavorText":"","artKey":"ghost_sludger_gold","image":"cards/ghost_sludger_gold.webp"},{"id":"mary_ann","name":"Mary-Ann","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":10,"def":27,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":5},{"type":"buff","target":"opposingCreature","atk":-5,"def":0}]},"text":"Floop (2 MP): Deal 5 Damage to the opposing creature and lower its Attack by 5.","flavorText":"","artKey":"mary_ann","image":"cards/mary_ann.webp"},{"id":"mary_ann_gold","name":"Mary-Ann","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":15,"def":41,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":5},{"type":"buff","target":"opposingCreature","atk":-5,"def":0}]},"text":"Floop (2 MP): Deal 5 Damage to the opposing creature and lower its Attack by 5.","flavorText":"","artKey":"mary_ann_gold","image":"cards/mary_ann_gold.webp"},{"id":"captain_taco","name":"Captain Taco","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":15,"def":30,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"opposingCreature","atk":{"of":"enemyHandSize","mul":-1},"def":0}]},"text":"Floop (1 MP): Lower the opposing creature's Attack by 1 for every card in your opponent's hand.","flavorText":"","artKey":"captain_taco","image":"cards/captain_taco.webp"},{"id":"captain_taco_gold","name":"Captain Taco","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":22,"def":45,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"opposingCreature","atk":{"of":"enemyHandSize","mul":-1},"def":0}]},"text":"Floop (1 MP): Lower the opposing creature's Attack by 1 for every card in your opponent's hand.","flavorText":"","artKey":"captain_taco_gold","image":"cards/captain_taco_gold.webp"},{"id":"corn_lord","name":"Corn Lord","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":10,"def":38,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"chosenCreature","atk":6,"def":0}]},"text":"Floop (2 MP): Choose a creature and give it +6 Attack.","flavorText":"","artKey":"corn_lord","image":"cards/corn_lord.webp"},{"id":"corn_lord_gold","name":"Corn Lord","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":15,"def":57,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"chosenCreature","atk":6,"def":0}]},"text":"Floop (2 MP): Choose a creature and give it +6 Attack.","flavorText":"","artKey":"corn_lord_gold","image":"cards/corn_lord_gold.webp"},{"id":"husker_giant","name":"Husker Giant","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":15,"def":30,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":{"of":"ownLandscapesOf","mul":2,"landscape":"golden"},"def":0}]},"text":"Floop (1 MP): +2 Attack for each of your Corn landscapes.","flavorText":"","artKey":"husker_giant","image":"cards/husker_giant.webp"},{"id":"husker_giant_gold","name":"Husker Giant","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":22,"def":45,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":{"of":"ownLandscapesOf","mul":2,"landscape":"golden"},"def":0}]},"text":"Floop (1 MP): +2 Attack for each of your Corn landscapes.","flavorText":"","artKey":"husker_giant_gold","image":"cards/husker_giant_gold.webp"},{"id":"legion_of_earlings","name":"Legion of Earlings","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":23,"def":23,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":5,"def":0}]},"text":"Floop (3 MP): All your creatures gain +5 Attack.","flavorText":"","artKey":"legion_of_earlings","image":"cards/legion_of_earlings.webp"},{"id":"ugly_tree","name":"Ugly Tree","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":15,"def":33,"keywords":[],"floop":{"cost":6,"effects":[{"type":"buff","target":"adjacentAllies","atk":9,"def":0}]},"text":"Floop (6 MP): Adjacent creatures gain +9 Attack.","flavorText":"","artKey":"ugly_tree","image":"cards/ugly_tree.webp"},{"id":"bald_mans_throne","name":"Bald Man's Throne","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":15,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"floopsThisTurn","mul":5}}]},"text":"Floop (2 MP): Deal 5 Damage to opposing creature for every creature you Flooped this turn.","flavorText":"","artKey":"bald_mans_throne","image":"cards/bald_mans_throne.webp"},{"id":"eye_guy","name":"Eye Guy","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":12,"def":18,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"enemyHero","amount":{"of":"floopsThisTurn","mul":3}}]},"text":"Floop (3 MP): Deal 3 Damage to opposing Hero for every creature you Flooped this turn.","flavorText":"","artKey":"eye_guy","image":"cards/eye_guy.webp"},{"id":"banshe_princess","name":"Banshe Princess","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"legendary","stars":1,"atk":7,"def":2,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":4}]},"text":"Floop (3 MP): Deal 4 damage to creature in the opposing lane.","flavorText":"","artKey":"banshe_princess","image":"cards/banshe_princess.webp"},{"id":"banshe_princess_gold","name":"Banshe Princess","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"legendary","stars":5,"variant":"Gold","atk":10,"def":3,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":4}]},"text":"Floop (3 MP): Deal 4 damage to creature in the opposing lane.","flavorText":"","artKey":"banshe_princess_gold","image":"cards/banshe_princess_gold.webp"},{"id":"gray_eyebat","name":"Gray Eyebat","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"atk":3,"def":5,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":2}]},"text":"Floop (2 MP): Deal 2 Damage to any opposing creature.","flavorText":"","artKey":"gray_eyebat","image":"cards/gray_eyebat.webp"},{"id":"gray_eyebat_gold","name":"Gray Eyebat","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":4,"def":8,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":2}]},"text":"Floop (2 MP): Deal 2 Damage to any opposing creature.","flavorText":"","artKey":"gray_eyebat_gold","image":"cards/gray_eyebat_gold.webp"},{"id":"mace_stump","name":"Mace Stump","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"atk":6,"def":3,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":3}]},"text":"Floop (3 MP): Deal 3 Damage to creature in the opposing lane.","flavorText":"","artKey":"mace_stump","image":"cards/mace_stump.webp"},{"id":"mace_stump_gold","name":"Mace Stump","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":9,"def":5,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":3}]},"text":"Floop (3 MP): Deal 3 Damage to creature in the opposing lane.","flavorText":"","artKey":"mace_stump_gold","image":"cards/mace_stump_gold.webp"},{"id":"orange_slimey","name":"Orange Slimey","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"atk":3,"def":4,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":4},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Deal 4 Damage to creature in the opposing lane and Discard this creature.","flavorText":"","artKey":"orange_slimey","image":"cards/orange_slimey.webp"},{"id":"orange_slimey_gold","name":"Orange Slimey","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":4,"def":6,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":4},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Deal 4 Damage to creature in the opposing lane and Discard this creature.","flavorText":"","artKey":"orange_slimey_gold","image":"cards/orange_slimey_gold.webp"},{"id":"teeth_leaf","name":"Teeth Leaf","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"atk":5,"def":3,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"enemyHero","amount":2}]},"text":"Floop (2 MP): Deal 2 Damage to the Opposing Hero.","flavorText":"","artKey":"teeth_leaf","image":"cards/teeth_leaf.webp"},{"id":"teeth_leaf_gold","name":"Teeth Leaf","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":7,"def":5,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"enemyHero","amount":2}]},"text":"Floop (2 MP): Deal 2 Damage to the Opposing Hero.","flavorText":"","artKey":"teeth_leaf_gold","image":"cards/teeth_leaf_gold.webp"},{"id":"wandering_bald_man","name":"Wandering Bald Man","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"atk":2,"def":5,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":2}]},"text":"Floop (2 MP): Deal 2 damage to creature in the opposing lane.","flavorText":"","artKey":"wandering_bald_man","image":"cards/wandering_bald_man.webp"},{"id":"wandering_bald_man_gold","name":"Wandering Bald Man","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":8,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":2}]},"text":"Floop (2 MP): Deal 2 damage to creature in the opposing lane.","flavorText":"","artKey":"wandering_bald_man_gold","image":"cards/wandering_bald_man_gold.webp"},{"id":"bog_bum","name":"Bog Bum","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":8,"def":10,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":5}]},"text":"Floop (2 MP): Deal 5 damage to creature in the opposing lane.","flavorText":"","artKey":"bog_bum","image":"cards/bog_bum.webp"},{"id":"bog_bum_gold","name":"Bog Bum","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":12,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":5}]},"text":"Floop (2 MP): Deal 5 damage to creature in the opposing lane.","flavorText":"","artKey":"bog_bum_gold","image":"cards/bog_bum_gold.webp"},{"id":"green_merman","name":"Green Merman","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":6,"def":12,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"enemyBuildings","mul":3}}]},"text":"Floop (2 MP): Deal 3 Damage for each enemy building to the creature in the opposing lane.","flavorText":"","artKey":"green_merman","image":"cards/green_merman.webp"},{"id":"green_merman_gold","name":"Green Merman","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":9,"def":18,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"enemyBuildings","mul":3}}]},"text":"Floop (2 MP): Deal 3 Damage for each enemy building to the creature in the opposing lane.","flavorText":"","artKey":"green_merman_gold","image":"cards/green_merman_gold.webp"},{"id":"herculeye","name":"Herculeye","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":11,"def":9,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"handSize","mul":2}}]},"text":"Floop (1 MP): Deal 2 Damage for each card in your hand to the creature in the opposing lane.","flavorText":"","artKey":"herculeye","image":"cards/herculeye.webp"},{"id":"herculeye_gold","name":"Herculeye","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":16,"def":14,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"handSize","mul":2}}]},"text":"Floop (1 MP): Deal 2 Damage for each card in your hand to the creature in the opposing lane.","flavorText":"","artKey":"herculeye_gold","image":"cards/herculeye_gold.webp"},{"id":"hot_eyebat","name":"Hot Eyebat","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":8,"def":9,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":4}]},"text":"Floop (2 MP): Deal 4 Damage to any opposing creature.","flavorText":"","artKey":"hot_eyebat","image":"cards/hot_eyebat.webp"},{"id":"hot_eyebat_gold","name":"Hot Eyebat","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":12,"def":14,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":4}]},"text":"Floop (2 MP): Deal 4 Damage to any opposing creature.","flavorText":"","artKey":"hot_eyebat_gold","image":"cards/hot_eyebat_gold.webp"},{"id":"pete_bog","name":"Pete Bog","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"common","stars":1,"atk":9,"def":12,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"handSize","mul":3}}]},"text":"Floop (2 MP): Deal 3 Damage for each card in your hand to the creature in the opposing lane.","flavorText":"","artKey":"pete_bog","image":"cards/pete_bog.webp"},{"id":"snappy_dresser","name":"Snappy Dresser","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":4,"def":14,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownLandscapeTypes","mul":2}}]},"text":"Floop (1 MP): Deal 2 Damage to creature in opposing lane for each of your different landscapes.","flavorText":"","artKey":"snappy_dresser","image":"cards/snappy_dresser.webp"},{"id":"snappy_dresser_gold","name":"Snappy Dresser","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":6,"def":21,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownLandscapeTypes","mul":2}}]},"text":"Floop (1 MP): Deal 2 Damage to creature in opposing lane for each of your different landscapes.","flavorText":"","artKey":"snappy_dresser_gold","image":"cards/snappy_dresser_gold.webp"},{"id":"baldferatu_gold","name":"Baldferatu","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":18,"def":17,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"selfDamage","mul":2}}]},"text":"Floop (2 MP): Deals 200% of the damage that it received last turn to the opposing creature.","flavorText":"","artKey":"baldferatu_gold","image":"cards/baldferatu_gold.webp"},{"id":"banshe_queen","name":"Banshe Queen","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"legendary","stars":3,"atk":10,"def":19,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":4}]},"text":"Floop (3 MP): Deal 4 damage to all opposing creatures.","flavorText":"","artKey":"banshe_queen","image":"cards/banshe_queen.webp"},{"id":"banshe_queen_gold","name":"Banshe Queen","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"legendary","stars":5,"variant":"Gold","atk":15,"def":28,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":4}]},"text":"Floop (3 MP): Deal 4 damage to all opposing creatures.","flavorText":"","artKey":"banshe_queen_gold","image":"cards/banshe_queen_gold.webp"},{"id":"green_mermaid","name":"Green Mermaid","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":11,"def":17,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownBuildings","mul":3}}]},"text":"Floop (1 MP): Deal 3 Damage for each of your buildings to the creature in the opposing lane.","flavorText":"","artKey":"green_mermaid","image":"cards/green_mermaid.webp"},{"id":"green_mermaid_gold","name":"Green Mermaid","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":16,"def":26,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownBuildings","mul":3}}]},"text":"Floop (1 MP): Deal 3 Damage for each of your buildings to the creature in the opposing lane.","flavorText":"","artKey":"green_mermaid_gold","image":"cards/green_mermaid_gold.webp"},{"id":"pea_soup_barfer","name":"Pea Soup Barfer","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"legendary","stars":5,"atk":10,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"adjacentAllies","atk":0,"def":-2},{"type":"buff","target":"self","atk":5,"def":0}]},"text":"Floop (2 MP): Lower the Defense of adjacent creatures by 2 and increase the Attack of this creature by 5.","flavorText":"","artKey":"pea_soup_barfer","image":"cards/pea_soup_barfer.webp"},{"id":"record_thug","name":"Record Thug","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":8,"def":20,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"selfDamage"}}]},"text":"Floop (2 MP): Deal Damage to the opposing creature equal to the Damage on this creature.","flavorText":"","artKey":"record_thug","image":"cards/record_thug.webp"},{"id":"record_thug_gold","name":"Record Thug","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":12,"def":30,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"selfDamage"}}]},"text":"Floop (2 MP): Deal Damage to the opposing creature equal to the Damage on this creature.","flavorText":"","artKey":"record_thug_gold","image":"cards/record_thug_gold.webp"},{"id":"red_eyeling","name":"Red Eyeling","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":7,"def":21,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":4,"splash":true}]},"text":"Floop (3 MP): Deal 4 Damage to creature in opposing lane and its adjacent creatures.","flavorText":"","artKey":"red_eyeling","image":"cards/red_eyeling.webp"},{"id":"red_eyeling_gold","name":"Red Eyeling","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":10,"def":32,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":4,"splash":true}]},"text":"Floop (3 MP): Deal 4 Damage to creature in opposing lane and its adjacent creatures.","flavorText":"","artKey":"red_eyeling_gold","image":"cards/red_eyeling_gold.webp"},{"id":"tree_of_underneath_gold","name":"Tree of Underneath","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":97,"def":78,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":2},{"type":"heal","target":"allAllyCreatures","amount":4}]},"text":"Floop (3 MP): Deal 2 Damage to all opposing creatures and heal all of your creatures 4 points.","flavorText":"","artKey":"tree_of_underneath_gold","image":"cards/tree_of_underneath_gold.webp"},{"id":"weak_baldferatu","name":"Weak Baldferatu","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"rare","stars":1,"atk":15,"def":18,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":3},{"type":"destroy","target":"self"}]},"text":"Floop (2 MP): Deal 3 damage to creature in the opposing lane and Discard this creature.","flavorText":"","artKey":"weak_baldferatu","image":"cards/weak_baldferatu.webp"},{"id":"bog_banshe_angel","name":"Bog BanShe Angel","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":24,"def":15,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"handSize","mul":4}}]},"text":"Floop (3 MP): Deal 4 Damage for each card in your hand to the creature in the opposing lane.","flavorText":"","artKey":"bog_banshe_angel","image":"cards/bog_banshe_angel.webp"},{"id":"bog_banshe_angel_gold","name":"Bog BanShe Angel","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":36,"def":22,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"handSize","mul":4}}]},"text":"Floop (3 MP): Deal 4 Damage for each card in your hand to the creature in the opposing lane.","flavorText":"","artKey":"bog_banshe_angel_gold","image":"cards/bog_banshe_angel_gold.webp"},{"id":"bog_frog_bomb","name":"Bog Frog Bomb","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":16,"def":18,"keywords":[],"floop":{"cost":4,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":7}]},"text":"Floop (4 MP): Deal 7 damage to all opposing creatures.","flavorText":"","artKey":"bog_frog_bomb","image":"cards/bog_frog_bomb.webp"},{"id":"chest_burster","name":"Chest Burster","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":12,"def":28,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"enemyHero","amount":{"of":"handSize","mul":2}}]},"text":"Floop (3 MP): Deal 2 Damage to opposing Hero for every card in your hand.","flavorText":"","artKey":"chest_burster","image":"cards/chest_burster.webp"},{"id":"chest_burster_gold","name":"Chest Burster","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":18,"def":42,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"enemyHero","amount":{"of":"handSize","mul":2}}]},"text":"Floop (3 MP): Deal 2 Damage to opposing Hero for every card in your hand.","flavorText":"","artKey":"chest_burster_gold","image":"cards/chest_burster_gold.webp"},{"id":"dark_angel","name":"Dark Angel","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":20,"def":15,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":5}]},"text":"Floop (3 MP): Deal 5 Damage to all opposing creatures.","flavorText":"","artKey":"dark_angel","image":"cards/dark_angel.webp"},{"id":"dark_angel_gold","name":"Dark Angel","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":30,"def":23,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":5}]},"text":"Floop (3 MP): Deal 5 Damage to all opposing creatures.","flavorText":"","artKey":"dark_angel_gold","image":"cards/dark_angel_gold.webp"},{"id":"ghost_tree","name":"Ghost Tree","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":19,"def":19,"keywords":[],"floop":{"cost":6,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownDiscard","mul":3}}]},"text":"Floop (6 MP): For every card in your Discard Pile, deal 3 Damage to creature in opposing lane.","flavorText":"","artKey":"ghost_tree","image":"cards/ghost_tree.webp"},{"id":"ghost_tree_gold","name":"Ghost Tree","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":28,"def":28,"keywords":[],"floop":{"cost":6,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownDiscard","mul":3}}]},"text":"Floop (6 MP): For every card in your Discard Pile, deal 3 Damage to creature in opposing lane.","flavorText":"","artKey":"ghost_tree_gold","image":"cards/ghost_tree_gold.webp"},{"id":"mama_spider","name":"Mama Spider","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":19,"def":19,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownDiscard","mul":4,"div":2}}]},"text":"Floop (3 MP): For every 2 cards in your Discard Pile, deal 4 damage to creature in opposing lane.","flavorText":"","artKey":"mama_spider","image":"cards/mama_spider.webp"},{"id":"mama_spider_gold","name":"Mama Spider","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":28,"def":29,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownDiscard","mul":4,"div":2}}]},"text":"Floop (3 MP): For every 2 cards in your Discard Pile, deal 4 damage to creature in opposing lane.","flavorText":"","artKey":"mama_spider_gold","image":"cards/mama_spider_gold.webp"},{"id":"steak_chop","name":"Steak Chop","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":20,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"enemyDiscardCreatures","mul":2}}]},"text":"Floop (2 MP): Deal 2 Damage to the opposing creature for each of your opponent's Discarded creatures.","flavorText":"","artKey":"steak_chop","image":"cards/steak_chop.webp"},{"id":"steak_chop_gold","name":"Steak Chop","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":30,"def":23,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"enemyDiscardCreatures","mul":2}}]},"text":"Floop (2 MP): Deal 2 Damage to the opposing creature for each of your opponent's Discarded creatures.","flavorText":"","artKey":"steak_chop_gold","image":"cards/steak_chop_gold.webp"},{"id":"davey_bear","name":"Davey Bear","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":17,"def":28,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":5},{"type":"damage","target":"enemyHero","amount":5}]},"text":"Floop (3 MP): Deal 5 Damage to the opposing creature and Hero","flavorText":"","artKey":"davey_bear","image":"cards/davey_bear.webp"},{"id":"davey_bear_gold","name":"Davey Bear","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":25,"def":42,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":5},{"type":"damage","target":"enemyHero","amount":5}]},"text":"Floop (3 MP): Deal 5 Damage to the opposing creature and Hero","flavorText":"","artKey":"davey_bear_gold","image":"cards/davey_bear_gold.webp"},{"id":"dr_death","name":"Dr. Death","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":35,"def":10,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":7},{"type":"heal","target":"self","amount":7}]},"text":"Floop (1 MP): Deal 7 damage to creature in opposing lane and heal this creature 7 points","flavorText":"","artKey":"dr_death","image":"cards/dr_death.webp"},{"id":"dr_death_gold","name":"Dr. Death","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":52,"def":15,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":7},{"type":"heal","target":"self","amount":7}]},"text":"Floop (1 MP): Deal 7 damage to creature in opposing lane and heal this creature 7 points","flavorText":"","artKey":"dr_death_gold","image":"cards/dr_death_gold.webp"},{"id":"immortal_maize_walker","name":"Immortal Maize Walker","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":11,"def":36,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":33,"filter":{"landscape":"golden"}}]},"text":"Floop (3 MP): Deal 33 Damage to any opposing Corn creature.","flavorText":"","artKey":"immortal_maize_walker","image":"cards/immortal_maize_walker.webp"},{"id":"immortal_maize_walker_gold","name":"Immortal Maize Walker","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":16,"def":54,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":33,"filter":{"landscape":"golden"}}]},"text":"Floop (3 MP): Deal 33 Damage to any opposing Corn creature.","flavorText":"","artKey":"immortal_maize_walker_gold","image":"cards/immortal_maize_walker_gold.webp"},{"id":"po_the_wizard","name":"Po the Wizard","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":7,"def":40,"keywords":[],"floop":{"cost":6,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":15}]},"text":"Floop (6 MP): Deal 15 Damage to all opposing creatures.","flavorText":"","artKey":"po_the_wizard","image":"cards/po_the_wizard.webp"},{"id":"rainbow_barfer","name":"Rainbow Barfer","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":16,"def":34,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownLandscapeTypes","mul":5}}]},"text":"Floop (1 MP): Deal 5 Damage to creature in opposing lane for each of your different landscapes.","flavorText":"","artKey":"rainbow_barfer","image":"cards/rainbow_barfer.webp"},{"id":"rainbow_barfer_gold","name":"Rainbow Barfer","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":24,"def":51,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownLandscapeTypes","mul":5}}]},"text":"Floop (1 MP): Deal 5 Damage to creature in opposing lane for each of your different landscapes.","flavorText":"","artKey":"rainbow_barfer_gold","image":"cards/rainbow_barfer_gold.webp"},{"id":"tree_of_underneath","name":"Tree of Underneath","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"rare","stars":5,"atk":97,"def":84,"keywords":[],"floop":{"cost":5,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":2},{"type":"heal","target":"allAllyCreatures","amount":4}]},"text":"Floop (5 MP): Deal 2 Damage to all opposing creatures and heal all of your creatures 4 points.","flavorText":"","artKey":"tree_of_underneath","image":"cards/tree_of_underneath.webp"},{"id":"unicylops","name":"Unicylops","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":20,"def":28,"keywords":[],"floop":{"cost":5,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":10}]},"text":"Floop (5 MP): Deal 10 damage to all opposing creatures.","flavorText":"","artKey":"unicylops","image":"cards/unicylops.webp"},{"id":"unicylops_gold","name":"Unicylops","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":30,"def":42,"keywords":[],"floop":{"cost":5,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":20}]},"text":"Floop (5 MP): Deal 20 damage to all opposing creatures.","flavorText":"","artKey":"unicylops_gold","image":"cards/unicylops_gold.webp"},{"id":"improved_sugar_imp","name":"Improved Sugar Imp","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"atk":1,"def":4,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"adjacentAllies","amount":2}]},"text":"Floop (1 MP): Heal adjacent creatures 2 points.","flavorText":"","artKey":"improved_sugar_imp","image":"cards/improved_sugar_imp.webp"},{"id":"improved_sugar_imp_gold","name":"Improved Sugar Imp","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":1,"def":6,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"adjacentAllies","amount":2}]},"text":"Floop (1 MP): Heal adjacent creatures 2 points.","flavorText":"","artKey":"improved_sugar_imp_gold","image":"cards/improved_sugar_imp_gold.webp"},{"id":"mouthball","name":"Mouthball","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"atk":3,"def":2,"keywords":[],"floop":{"cost":2,"effects":[{"type":"lockFloop","target":"opposingCreature"}]},"text":"Floop (2 MP): Creature in opposing lane cannot use Floop ability next turn.","flavorText":"","artKey":"mouthball","image":"cards/mouthball.webp"},{"id":"mouthball_gold","name":"Mouthball","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":4,"def":3,"keywords":[],"floop":{"cost":2,"effects":[{"type":"lockFloop","target":"opposingCreature"}]},"text":"Floop (2 MP): Creature in opposing lane cannot use Floop ability next turn.","flavorText":"","artKey":"mouthball_gold","image":"cards/mouthball_gold.webp"},{"id":"nice_ice_baby","name":"Nice Ice Baby","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"atk":2,"def":3,"keywords":[],"floop":{"cost":2,"effects":[{"type":"lockAttack","target":"opposingCreature"}]},"text":"Floop (2 MP): Creature in opposing lane cannot Attack next Battle Phase.","flavorText":"","artKey":"nice_ice_baby","image":"cards/nice_ice_baby.webp"},{"id":"nice_ice_baby_gold","name":"Nice Ice Baby","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":5,"keywords":[],"floop":{"cost":2,"effects":[{"type":"lockAttack","target":"opposingCreature"}]},"text":"Floop (2 MP): Creature in opposing lane cannot Attack next Battle Phase.","flavorText":"","artKey":"nice_ice_baby_gold","image":"cards/nice_ice_baby_gold.webp"},{"id":"ordinary_ninja","name":"Ordinary Ninja","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"atk":4,"def":1,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":3}]},"text":"Floop (2 MP): Deal 3 Damage to the creature in opposing lane.","flavorText":"","artKey":"ordinary_ninja","image":"cards/ordinary_ninja.webp"},{"id":"ordinary_ninja_gold","name":"Ordinary Ninja","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":6,"def":2,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":3}]},"text":"Floop (2 MP): Deal 3 Damage to the creature in opposing lane.","flavorText":"","artKey":"ordinary_ninja_gold","image":"cards/ordinary_ninja_gold.webp"},{"id":"snowy_mcsnow","name":"Snowy McSnow","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"atk":3,"def":10,"keywords":[],"floop":{"cost":10,"effects":[{"type":"buff","target":"self","atk":1,"def":0}]},"text":"Floop (10 MP): +1 Attack.","flavorText":"","artKey":"snowy_mcsnow","image":"cards/snowy_mcsnow.webp"},{"id":"the_pig","name":"The Pig","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"atk":1,"def":4,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allCreatures","atk":-1,"def":0,"filter":{"landscape":"golden"}}]},"text":"Floop (3 MP): Decrease the Attack of all Corn creatures by 1.","flavorText":"","artKey":"the_pig","image":"cards/the_pig.webp"},{"id":"the_pig_gold","name":"The Pig","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":1,"def":6,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allCreatures","atk":-1,"def":0,"filter":{"landscape":"golden"}}]},"text":"Floop (3 MP): Decrease the Attack of all Corn creatures by 1.","flavorText":"","artKey":"the_pig_gold","image":"cards/the_pig_gold.webp"},{"id":"travelin_skeleton","name":"Travelin' Skeleton","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"atk":2,"def":3,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"randomCreature","amount":4}]},"text":"Floop (1 MP): Deal 4 damage to a random creature, including your own.","flavorText":"","artKey":"travelin_skeleton","image":"cards/travelin_skeleton.webp"},{"id":"travelin_skeleton_gold","name":"Travelin' Skeleton","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":5,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"randomCreature","amount":4}]},"text":"Floop (1 MP): Deal 4 damage to a random creature, including your own.","flavorText":"","artKey":"travelin_skeleton_gold","image":"cards/travelin_skeleton_gold.webp"},{"id":"chad_bear","name":"Chad Bear","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"atk":5,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":2,"def":0}]},"text":"Floop (2 MP): +2 Attack.","flavorText":"","artKey":"chad_bear","image":"cards/chad_bear.webp"},{"id":"evil_eye","name":"Evil Eye","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"atk":5,"def":5,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"opposingCreature","atk":-4,"def":0}]},"text":"Floop (1 MP): Lower the Attack of the creature in the opposing lane by 4.","flavorText":"","artKey":"evil_eye","image":"cards/evil_eye.webp"},{"id":"evil_eye_gold","name":"Evil Eye","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":7,"def":8,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"opposingCreature","atk":-4,"def":0}]},"text":"Floop (1 MP): Lower the Attack of the creature in the opposing lane by 4.","flavorText":"","artKey":"evil_eye_gold","image":"cards/evil_eye_gold.webp"},{"id":"freezy_j","name":"Freezy J","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"atk":4,"def":6,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":0,"def":4}]},"text":"Floop (1 MP): Gain +4 Defense.","flavorText":"","artKey":"freezy_j","image":"cards/freezy_j.webp"},{"id":"freezy_j_gold","name":"Freezy J","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":6,"def":9,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":0,"def":4}]},"text":"Floop (1 MP): Gain +4 Defense.","flavorText":"","artKey":"freezy_j_gold","image":"cards/freezy_j_gold.webp"},{"id":"green_snakey","name":"Green Snakey","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"atk":6,"def":4,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":{"of":"enemyCreatures","mul":-2},"def":0}]},"text":"Floop (2 MP): Lower the Attack of the creature in opposing lane by 2 for each of your opponent's creatures.","flavorText":"","artKey":"green_snakey","image":"cards/green_snakey.webp"},{"id":"green_snakey_gold","name":"Green Snakey","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":9,"def":6,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":{"of":"enemyCreatures","mul":-2},"def":0}]},"text":"Floop (2 MP): Lower the Attack of the creature in opposing lane by 2 for each of your opponent's creatures.","flavorText":"","artKey":"green_snakey_gold","image":"cards/green_snakey_gold.webp"},{"id":"peach_djini","name":"Peach Djini","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"atk":2,"def":8,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":4}]},"text":"Floop (1 MP): Choose one of your creatures and heal it 4 points.","flavorText":"","artKey":"peach_djini","image":"cards/peach_djini.webp"},{"id":"peach_djini_gold","name":"Peach Djini","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":3,"def":12,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":4}]},"text":"Floop (1 MP): Choose one of your creatures and heal it 4 points.","flavorText":"","artKey":"peach_djini_gold","image":"cards/peach_djini_gold.webp"},{"id":"white_ninja","name":"White Ninja","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"atk":7,"def":3,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":3},{"type":"heal","target":"self","amount":3}]},"text":"Floop (2 MP): Deal 3 Damage to the opposing creature and heal 3 points to this creature.","flavorText":"","artKey":"white_ninja","image":"cards/white_ninja.webp"},{"id":"white_ninja_gold","name":"White Ninja","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":10,"def":5,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":3},{"type":"heal","target":"self","amount":3}]},"text":"Floop (2 MP): Deal 3 Damage to the opposing creature and heal 3 points to this creature.","flavorText":"","artKey":"white_ninja_gold","image":"cards/white_ninja_gold.webp"},{"id":"big_foot","name":"Big Foot","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"atk":7,"def":8,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":4,"splash":true}]},"text":"Floop (2 MP): Deal 4 Damage to opposing creature and its adjacent creatures.","flavorText":"","artKey":"big_foot","image":"cards/big_foot.webp"},{"id":"big_foot_gold","name":"Big Foot","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":10,"def":12,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":4,"splash":true}]},"text":"Floop (2 MP): Deal 4 Damage to opposing creature and its adjacent creatures.","flavorText":"","artKey":"big_foot_gold","image":"cards/big_foot_gold.webp"},{"id":"earl","name":"Earl","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"atk":10,"def":5,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"adjacentAllies","atk":3,"def":0}]},"text":"Floop (1 MP): Adjacent creatures gain +3 attack.","flavorText":"","artKey":"earl","image":"cards/earl.webp"},{"id":"earl_gold","name":"Earl","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":15,"def":8,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"adjacentAllies","atk":3,"def":0}]},"text":"Floop (1 MP): Adjacent creatures gain +3 attack.","flavorText":"","artKey":"earl_gold","image":"cards/earl_gold.webp"},{"id":"furious_chick","name":"Furious Chick","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"atk":7,"def":8,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"adjacentAllies","atk":3,"def":0}]},"text":"Floop (2 MP): Adjacent creatures gain +3 Attack.","flavorText":"","artKey":"furious_chick","image":"cards/furious_chick.webp"},{"id":"furious_chick_gold","name":"Furious Chick","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":10,"def":12,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"adjacentAllies","atk":3,"def":0}]},"text":"Floop (2 MP): Adjacent creatures gain +3 Attack.","flavorText":"","artKey":"furious_chick_gold","image":"cards/furious_chick_gold.webp"},{"id":"future_scholar","name":"Future Scholar","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"atk":2,"def":13,"keywords":[],"floop":{"cost":1,"effects":[{"type":"gainMp","amount":3,"nextTurn":true}]},"text":"Floop (1 MP): Gain 3 Magic Points next turn.","flavorText":"","artKey":"future_scholar","image":"cards/future_scholar.webp"},{"id":"future_scholar_gold","name":"Future Scholar","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":3,"def":20,"keywords":[],"floop":{"cost":1,"effects":[{"type":"gainMp","amount":3,"nextTurn":true}]},"text":"Floop (1 MP): Gain 3 Magic Points next turn.","flavorText":"","artKey":"future_scholar_gold","image":"cards/future_scholar_gold.webp"},{"id":"ghost_ninja","name":"Ghost Ninja","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"atk":5,"def":10,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":4},{"type":"heal","target":"self","amount":5}]},"text":"Floop (1 MP): Deal 4 Damage to creature in opposing lane and heal this creature 5 points.","flavorText":"","artKey":"ghost_ninja","image":"cards/ghost_ninja.webp"},{"id":"ghost_ninja_gold","name":"Ghost Ninja","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":7,"def":15,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":4},{"type":"heal","target":"self","amount":5}]},"text":"Floop (1 MP): Deal 4 Damage to creature in opposing lane and heal this creature 5 points.","flavorText":"","artKey":"ghost_ninja_gold","image":"cards/ghost_ninja_gold.webp"},{"id":"ice_paladin","name":"Ice Paladin","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"atk":3,"def":12,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"adjacentAllies","atk":0,"def":5}]},"text":"Floop (2 MP): Adjacent creatures gain +5 Defense.","flavorText":"","artKey":"ice_paladin","image":"cards/ice_paladin.webp"},{"id":"ice_paladin_gold","name":"Ice Paladin","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":4,"def":18,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"adjacentAllies","atk":0,"def":5}]},"text":"Floop (2 MP): Adjacent creatures gain +5 Defense.","flavorText":"","artKey":"ice_paladin_gold","image":"cards/ice_paladin_gold.webp"},{"id":"detective_sally","name":"Detective Sally","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":4,"atk":5,"def":15,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":0,"def":6},{"type":"buff","target":"adjacentAllies","atk":0,"def":6}]},"text":"Floop (3 MP): This creature and adjacent creature's gain +6 Defense.","flavorText":"","artKey":"detective_sally","image":"cards/detective_sally.webp"},{"id":"detective_sally_gold","name":"Detective Sally","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":7,"def":23,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":0,"def":6},{"type":"buff","target":"adjacentAllies","atk":0,"def":6}]},"text":"Floop (3 MP): This creature and adjacent creature's gain +6 Defense.","flavorText":"","artKey":"detective_sally_gold","image":"cards/detective_sally_gold.webp"},{"id":"phyllis","name":"Phyllis","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":4,"atk":5,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":4,"def":0},{"type":"buff","target":"adjacentAllies","atk":4,"def":0}]},"text":"Floop (2 MP): This creature and adjacent creatures gain +4 Attack.","flavorText":"","artKey":"phyllis","image":"cards/phyllis.webp"},{"id":"phyllis_gold","name":"Phyllis","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":7,"def":23,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":4,"def":0},{"type":"buff","target":"adjacentAllies","atk":4,"def":0}]},"text":"Floop (2 MP): This creature and adjacent creatures gain +4 Attack.","flavorText":"","artKey":"phyllis_gold","image":"cards/phyllis_gold.webp"},{"id":"polterclops","name":"Polterclops","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":4,"atk":2,"def":30,"keywords":[],"floop":{"cost":7,"effects":[{"type":"draw","amount":4},{"type":"returnToHand","target":"self"}]},"text":"Floop (7 MP): Return this creature to your hand and draw 4 card.","flavorText":"","artKey":"polterclops","image":"cards/polterclops.webp"},{"id":"quadurai","name":"Quadurai","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":4,"atk":15,"def":5,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":8}]},"text":"Floop (1 MP): Deal 8 Damage to creature in opposing lane.","flavorText":"","artKey":"quadurai","image":"cards/quadurai.webp"},{"id":"quadurai_gold","name":"Quadurai","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":22,"def":8,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":8}]},"text":"Floop (1 MP): Deal 8 Damage to creature in opposing lane.","flavorText":"","artKey":"quadurai_gold","image":"cards/quadurai_gold.webp"},{"id":"rainbow_gnome","name":"Rainbow Gnome","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"legendary","stars":4,"atk":7,"def":14,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":{"of":"opposingAtk","mul":0.5},"def":{"of":"opposingAtk","mul":-0.5}},{"type":"buff","target":"opposingCreature","atk":{"of":"targetAtk","mul":-0.5},"def":0}]},"text":"Floop (3 MP): Lower the Attack of opposing creature by half and raise this creature's Attack, and also reduce it's Defense, by that amount.","flavorText":"","artKey":"rainbow_gnome","image":"cards/rainbow_gnome.webp"},{"id":"the_pickler","name":"The Pickler","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":4,"atk":12,"def":8,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allEnemyCreatures","atk":0,"def":-5}]},"text":"Floop (3 MP): Lower the Defense of all opposing creatures by 5.","flavorText":"","artKey":"the_pickler","image":"cards/the_pickler.webp"},{"id":"the_pickler_gold","name":"The Pickler","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":18,"def":12,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allEnemyCreatures","atk":0,"def":-5}]},"text":"Floop (3 MP): Lower the Defense of all opposing creatures by 5.","flavorText":"","artKey":"the_pickler_gold","image":"cards/the_pickler_gold.webp"},{"id":"brian_gooey","name":"Brian Gooey","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"atk":5,"def":20,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"allEnemyCreatures","atk":-12,"def":0},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Lower Attack of all enemy creatures by 12 and destroy this creature.","flavorText":"","artKey":"brian_gooey","image":"cards/brian_gooey.webp"},{"id":"drooling_dude","name":"Drooling Dude","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"atk":14,"def":11,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":7,"def":3}]},"text":"Floop (2 MP): Gain +7 Attack and +3 Defense.","flavorText":"","artKey":"drooling_dude","image":"cards/drooling_dude.webp"},{"id":"drooling_dude_gold","name":"Drooling Dude","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":21,"def":17,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":7,"def":3}]},"text":"Floop (2 MP): Gain +7 Attack and +3 Defense.","flavorText":"","artKey":"drooling_dude_gold","image":"cards/drooling_dude_gold.webp"},{"id":"fisher_fish","name":"Fisher Fish","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"atk":0,"def":25,"keywords":[],"floop":{"cost":2,"effects":[{"type":"recover","pick":"random"}]},"text":"Floop (2 MP): Select a Random card from the Discard Pile and put it in your hand.","flavorText":"","artKey":"fisher_fish","image":"cards/fisher_fish.webp"},{"id":"paladim","name":"Paladim","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"atk":5,"def":20,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":5},{"type":"damage","target":"self","amount":2}]},"text":"Floop (1 MP): Deal 5 Damage to creature in opposing lane and damage this creature for 2 Damage.","flavorText":"","artKey":"paladim","image":"cards/paladim.webp"},{"id":"porcelain_guardian","name":"Porcelain Guardian","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"atk":10,"def":15,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"self","amount":2},{"type":"buff","target":"opposingCreature","atk":0,"def":-10}]},"text":"Floop (1 MP): Inflict 2 Damage on this creature and lower the Defense of the opposing creature by 10","flavorText":"","artKey":"porcelain_guardian","image":"cards/porcelain_guardian.webp"},{"id":"porcelain_guardian_gold","name":"Porcelain Guardian","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":15,"def":23,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"self","amount":2},{"type":"buff","target":"opposingCreature","atk":0,"def":-10}]},"text":"Floop (1 MP): Inflict 2 Damage on this creature and lower the Defense of the opposing creature by 10","flavorText":"","artKey":"porcelain_guardian_gold","image":"cards/porcelain_guardian_gold.webp"},{"id":"the_mariachi","name":"The Mariachi","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"atk":5,"def":20,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":4,"def":0}]},"text":"Floop (2 MP): All your creatures gain +4 Attack.","flavorText":"","artKey":"the_mariachi","image":"cards/the_mariachi.webp"},{"id":"the_mariachi_gold","name":"The Mariachi","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":7,"def":30,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":4,"def":0}]},"text":"Floop (2 MP): All your creatures gain +4 Attack.","flavorText":"","artKey":"the_mariachi_gold","image":"cards/the_mariachi_gold.webp"},{"id":"unicycle_knight","name":"Unicycle Knight","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"atk":12,"def":13,"keywords":[],"floop":{"cost":6,"effects":[{"type":"buff","target":"adjacentAllies","atk":0,"def":13}]},"text":"Floop (6 MP): Adjacent creatures gain +13 Defense.","flavorText":"","artKey":"unicycle_knight","image":"cards/unicycle_knight.webp"},{"id":"banana_butt","name":"Banana Butt","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"epic","stars":4,"effects":[{"type":"destroy","target":"chosenAllyCreature"},{"type":"draw","amount":1}],"text":"Destroy one of your Creatures and draw 1 card.","flavorText":"","artKey":"banana_butt","image":"cards/banana_butt.webp"},{"id":"brief_power","name":"Brief Power","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"effects":[{"type":"costMod","who":"self","kind":"card","amount":-1}],"text":"Every card cast this turn costs 1 less Magic Point.","flavorText":"","artKey":"brief_power","image":"cards/brief_power.webp"},{"id":"falling_star","name":"Falling Star","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"rare","stars":3,"effects":[{"type":"loseMp","amount":2}],"text":"Opponent gets 2 less Magic Point next turn.","flavorText":"","artKey":"falling_star","image":"cards/falling_star.webp"},{"id":"field_of_nightmares","name":"Field of Nightmares","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"rare","stars":3,"effects":[{"type":"lockFloop","target":"chosenEnemyCreature"}],"text":"Choose an opposing creature. It cannot use its Floop ability next turn.","flavorText":"","artKey":"field_of_nightmares","image":"cards/field_of_nightmares.webp"},{"id":"grape_butt","name":"Grape Butt","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"uncommon","stars":2,"effects":[{"type":"destroyBuilding","target":"chosenAllyBuilding"},{"type":"draw","amount":1}],"text":"Destroy one of your Buildings and draw 1 card.","flavorText":"","artKey":"grape_butt","image":"cards/grape_butt.webp"},{"id":"hot_dog_rain","name":"Hot Dog Rain","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"rare","stars":3,"effects":[{"type":"block","what":"building"}],"text":"Opponent cannot summon Buildings next turn.","flavorText":"","artKey":"hot_dog_rain","image":"cards/hot_dog_rain.webp"},{"id":"lonely_hearts","name":"Lonely Hearts","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"effects":[{"type":"destroy","target":"allEnemyCreatures","when":{"type":"creatureCountAtMost","who":"enemy","value":1}}],"text":"Instantly kills the lone creature on the opponent's side","flavorText":"","artKey":"lonely_hearts","image":"cards/lonely_hearts.webp"},{"id":"portal_to_nowhere","name":"Portal to Nowhere","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"epic","stars":4,"effects":[{"type":"returnToHand","target":"allAllyCreatures"}],"text":"Return all of your creatures on the field to your hand).","flavorText":"","artKey":"portal_to_nowhere","image":"cards/portal_to_nowhere.webp"},{"id":"psychic_tempest","name":"Psychic Tempest","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"uncommon","stars":2,"effects":[{"type":"block","what":"spell"}],"text":"Opponent cannot cast spells next turn.","flavorText":"","artKey":"psychic_tempest","image":"cards/psychic_tempest.webp"},{"id":"sand_pyramid","name":"Sand Pyramid","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"rare","stars":3,"effects":[{"type":"grantKeyword","target":"chosenAllyCreature","keyword":"feast:5"}],"text":"Creature in this lane heals 5 Damage when it destroys a creature.","flavorText":"","artKey":"sand_pyramid","image":"cards/sand_pyramid.webp"},{"id":"scroll_of_bad_breath","name":"Scroll of Bad Breath","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"effects":[{"type":"recover","cardType":"spell","pick":"best"}],"text":"Return a spell card from your Discard pile to your hand.","flavorText":"","artKey":"scroll_of_bad_breath","image":"cards/scroll_of_bad_breath.webp"},{"id":"scroll_of_fresh_breath","name":"Scroll of Fresh Breath","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"uncommon","stars":2,"effects":[{"type":"recover","cardType":"building","pick":"best"}],"text":"Return a Building card from the Discard Pile to your hand.","flavorText":"","artKey":"scroll_of_fresh_breath","image":"cards/scroll_of_fresh_breath.webp"},{"id":"tax_reduction","name":"Tax Reduction","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"effects":[{"type":"costMod","who":"self","kind":"floop","amount":-99}],"text":"All your creatures' FLOOP abilities cost 0 Magic Points this turn.","flavorText":"","artKey":"tax_reduction","image":"cards/tax_reduction.webp"},{"id":"teleport","name":"Teleport","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"effects":[{"type":"returnToHand","target":"chosenAllyCreature"}],"text":"Choose one of your creatures and return it to your hand.","flavorText":"","artKey":"teleport","image":"cards/teleport.webp"},{"id":"throne_of_doom","name":"Throne of Doom","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"epic","stars":4,"effects":[{"type":"destroy","target":"chosenAllyCreature"},{"type":"gainMp","amount":4}],"text":"Destroy any of your creatures and gain 4 Magic Points.","flavorText":"","artKey":"throne_of_doom","image":"cards/throne_of_doom.webp"},{"id":"throne_of_gloom","name":"Throne of Gloom","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"epic","stars":4,"effects":[{"type":"destroyBuilding","target":"chosenAllyBuilding"},{"type":"gainMp","amount":4}],"text":"Destroy any of your Buildings and gain 4 Magic Points.","flavorText":"","artKey":"throne_of_gloom","image":"cards/throne_of_gloom.webp"},{"id":"ufo_abduction","name":"UFO Abduction","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"effects":[{"type":"moveBuilding","target":"chosenAllyBuilding"}],"text":"Choose one of your Buildings and move it to one of your empty lanes.","flavorText":"","artKey":"ufo_abduction","image":"cards/ufo_abduction.webp"},{"id":"witch_way","name":"Witch Way","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"rare","stars":3,"effects":[{"type":"gainMp","amount":{"of":"fieldLandscapeTypes"}}],"text":"Gain 1 Magic Point for every different landscape on the field.","flavorText":"","artKey":"witch_way","image":"cards/witch_way.webp"},{"id":"wizard_migraine","name":"Wizard Migraine","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"effects":[{"type":"discardHand"},{"type":"gainMp","amount":4}],"text":"Discard your hand and gain 4 Magic Points","flavorText":"","artKey":"wizard_migraine","image":"cards/wizard_migraine.webp"},{"id":"zazos_magic_seeds","name":"ZaZo's Magic Seeds","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"effects":[{"type":"gainMp","amount":{"of":"ownCreatures"}}],"text":"Gain 1 Magic Point for each of your creatures on the field.","flavorText":"","artKey":"zazos_magic_seeds","image":"cards/zazos_magic_seeds.webp"},{"id":"bone_wand","name":"Bone Wand","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"effects":[{"type":"forceAttack","target":"chosenAllyCreature","filter":{"landscape":"murk"}}],"text":"Choose a Useless Swamp creature and attack the opposing creature in its lane.","flavorText":"","artKey":"bone_wand","image":"cards/bone_wand.webp"},{"id":"corn_scepter","name":"Corn Scepter","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"effects":[{"type":"forceAttack","target":"chosenAllyCreature","filter":{"landscape":"golden"}}],"text":"Choose a Corn creature and attack the opposing creature in its lane","flavorText":"","artKey":"corn_scepter","image":"cards/corn_scepter.webp"},{"id":"cough_syrup","name":"Cough Syrup","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"rare","stars":3,"effects":[{"type":"swapStats","target":"chosenAllyCreature"}],"text":"Choose one of your creatures and switch its Attack and Defense values.","flavorText":"","artKey":"cough_syrup","image":"cards/cough_syrup.webp"},{"id":"crystal_ball","name":"Crystal Ball","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"common","stars":1,"effects":[{"type":"cycleHand","draw":5}],"text":"Shuffle your hand back into your Deck and draw 5 new cards.","flavorText":"","artKey":"crystal_ball","image":"cards/crystal_ball.webp"},{"id":"dark_portal","name":"Dark Portal","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"rare","stars":3,"effects":[{"type":"moveBuilding","target":"chosenEnemyBuilding"}],"text":"Choose an opposing Building and move it to an empty lane.","flavorText":"","artKey":"dark_portal","image":"cards/dark_portal.webp"},{"id":"fountain_of_forgiveness","name":"Fountain of Forgiveness","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"targetAtk"},"filter":{"damaged":true}}],"text":"Choose one of your damaged creatures and heal it equal to its own Attack.","flavorText":"","artKey":"fountain_of_forgiveness","image":"cards/fountain_of_forgiveness.webp"},{"id":"incredible_egg","name":"Incredible Egg","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"legendary","stars":5,"effects":[{"type":"tutor","cardType":"creature"}],"text":"Put a random creature from your deck into your hand.","flavorText":"","artKey":"incredible_egg","image":"cards/incredible_egg.webp"},{"id":"puma_claw","name":"Puma Claw","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"effects":[{"type":"forceAttack","target":"chosenAllyCreature","filter":{"landscape":"azure"}}],"text":"Choose a Blue Plains creature and attack the opposing creature in its lane.","flavorText":"","artKey":"puma_claw","image":"cards/puma_claw.webp"},{"id":"super_hug","name":"Super Hug","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"effects":[{"type":"forceAttack","target":"chosenAllyCreature","filter":{"landscape":"candy"}}],"text":"Choose a Nice Lands creature and attack the creature in the opposing lane.","flavorText":"","artKey":"super_hug","image":"cards/super_hug.webp"},{"id":"tome_of_ankhs","name":"Tome of Ankhs","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"effects":[{"type":"forceAttack","target":"chosenAllyCreature","filter":{"landscape":"dune"}}],"text":"Choose a Sandy Lands creature and attack the opposing creature in its lane.","flavorText":"","artKey":"tome_of_ankhs","image":"cards/tome_of_ankhs.webp"},{"id":"unempty_coffin","name":"Unempty Coffin","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"epic","stars":4,"effects":[{"type":"recover","cardType":"creature","pick":"best"}],"text":"Return any creature from your Discard Pile to your hand.","flavorText":"","artKey":"unempty_coffin","image":"cards/unempty_coffin.webp"},{"id":"ancient_psychic_tandem_blast","name":"Ancient Psychic Tandem Blast","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"epic","stars":4,"effects":[{"type":"destroy","target":"chosenEnemyCreature"},{"type":"destroy","target":"weakestAllyCreature"},{"type":"draw","amount":1}],"text":"Destroy one of your creatures and an opposing creature. Also draw 1 card.","flavorText":"","artKey":"ancient_psychic_tandem_blast","image":"cards/ancient_psychic_tandem_blast.webp"},{"id":"blood_transfusion","name":"Blood Transfusion","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"effects":[{"type":"damage","target":"enemyHero","amount":5},{"type":"heal","target":"ownHero","amount":5}],"text":"Deal 5 damage to the opposing Leader and heal your Leader 5 points.","flavorText":"","artKey":"blood_transfusion","image":"cards/blood_transfusion.webp"},{"id":"cerebral_bloodstorm","name":"Cerebral Bloodstorm","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"common","stars":1,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":{"of":"targetAtk"}}],"text":"Choose an opposing creature and deal Damage equal to its own Attack.","flavorText":"","artKey":"cerebral_bloodstorm","image":"cards/cerebral_bloodstorm.webp"},{"id":"clairvoyant_daggerstorm","name":"Clairvoyant Daggerstorm","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":{"of":"targetDamage"}}],"text":"Choose an opposing creature and double the amount of Damage on it.","flavorText":"","artKey":"clairvoyant_daggerstorm","image":"cards/clairvoyant_daggerstorm.webp"},{"id":"door_of_strength","name":"Door of Strength","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"legendary","stars":5,"effects":[{"type":"block","what":"creature"}],"text":"Opponent cannot summon creatures next turn.","flavorText":"","artKey":"door_of_strength","image":"cards/door_of_strength.webp"},{"id":"pie_storm","name":"Pie Storm","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"epic","stars":4,"effects":[{"type":"heal","target":"allCreatures","amount":{"of":"targetDamage"}}],"text":"Heal all creatures on the field (including your opponent's).","flavorText":"","artKey":"pie_storm","image":"cards/pie_storm.webp"},{"id":"skull_juice","name":"Skull Juice","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"legendary","stars":5,"effects":[{"type":"swapStats","target":"chosenEnemyCreature"}],"text":"Choose one of your opponent's creatures and switch its Attack and Defense values.","flavorText":"","artKey":"skull_juice","image":"cards/skull_juice.webp"},{"id":"snake_eye_ring","name":"Snake Eye Ring","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"epic","stars":4,"effects":[{"type":"draw","amount":{"of":"ownEmptyLanes"}}],"text":"Draw 1 card for each of your empty lanes.","flavorText":"","artKey":"snake_eye_ring","image":"cards/snake_eye_ring.webp"},{"id":"spirit_torch","name":"Spirit Torch","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"epic","stars":4,"effects":[{"type":"seal","target":"chosenEnemyLandscape"}],"text":"Choose an opposing lane. No building or creature may be summoned on this lane next turn.","flavorText":"","artKey":"spirit_torch","image":"cards/spirit_torch.webp"},{"id":"strawberry_butt","name":"Strawberry Butt","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"common","stars":1,"effects":[{"type":"draw","amount":2}],"text":"Draw 2 cards.","flavorText":"","artKey":"strawberry_butt","image":"cards/strawberry_butt.webp"},{"id":"ultimate_magic_hands","name":"Ultimate Magic Hands","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"legendary","stars":5,"effects":[{"type":"returnToHand","target":"chosenEnemyCreature"}],"text":"Choose an opposing creature and send it back to your opponent's hand.","flavorText":"","artKey":"ultimate_magic_hands","image":"cards/ultimate_magic_hands.webp"},{"id":"wizard_rawk","name":"Wizard Rawk","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"epic","stars":4,"effects":[{"type":"buff","target":"chosenAllyCreature","atk":{"of":"targetDamage"},"def":0}],"text":"Choose one of your creatures and give it Attack equal to how much Damage it has taken.","flavorText":"","artKey":"wizard_rawk","image":"cards/wizard_rawk.webp"},{"id":"woad_blood","name":"Woad Blood","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"common","stars":1,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"targetDamage"}}],"text":"Choose one of your creatures and heal all damage.","flavorText":"","artKey":"woad_blood","image":"cards/woad_blood.webp"},{"id":"blackhole_pendant","name":"BlackHole Pendant","type":"spell","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":5,"effects":[{"type":"buff","target":"allCreatures","atk":0,"def":{"of":"targetDef","mul":-0.5}}],"text":"Reduce the defence of ALL creatures by 50%.","flavorText":"","artKey":"blackhole_pendant","image":"cards/blackhole_pendant.webp"},{"id":"volcano","name":"Volcano","type":"spell","landscape":"neutral","requirements":[],"cost":4,"rarity":"common","stars":1,"effects":[{"type":"wipeLane","target":"chosenEnemyLandscape"}],"text":"Choose a lane and destroy all buildings and creatures on it (player and opponent)","flavorText":"","artKey":"volcano","image":"cards/volcano.webp"},{"id":"bubblegum_butt","name":"Bubblegum Butt","type":"spell","landscape":"neutral","requirements":[],"cost":5,"rarity":"rare","stars":3,"effects":[{"type":"draw","amount":3}],"text":"Draw 3 Cards.","flavorText":"","artKey":"bubblegum_butt","image":"cards/bubblegum_butt.webp"},{"id":"kung_fu_power","name":"Kung Fu Power","type":"spell","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"effects":[{"type":"destroy","target":"allEnemyCreatures","filter":{"minStars":4}}],"text":"Destroy all enemy creatures of rarity 4 or higher.","flavorText":"","artKey":"kung_fu_power","image":"cards/kung_fu_power.webp"},{"id":"magic_hot_dog_pie","name":"Magic Hot Dog Pie","type":"spell","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"effects":[{"type":"damage","target":"enemyHero","amount":10},{"type":"heal","target":"ownHero","amount":10}],"text":"Deal 10 damage to the opposing Leader and heal your Leader by 10 points.","flavorText":"","artKey":"magic_hot_dog_pie","image":"cards/magic_hot_dog_pie.webp"},{"id":"pentaid","name":"Pentaid","type":"spell","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"effects":[{"type":"heal","target":"allAllyCreatures","amount":5},{"type":"heal","target":"ownHero","amount":5}],"text":"Heal 5 to all your creatures and Hero.","flavorText":"","artKey":"pentaid","image":"cards/pentaid.webp"},{"id":"subliminal_strength","name":"Subliminal Strength","type":"spell","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"effects":[{"type":"destroy","target":"allEnemyCreatures","filter":{"maxStars":3}}],"text":"Destroy all enemy creatures of rarity 3 or lower.","flavorText":"","artKey":"subliminal_strength","image":"cards/subliminal_strength.webp"},{"id":"astral_fortress","name":"Astral Fortress","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"statics":[{"kind":"stat","scope":"lane","atk":0,"def":4}],"text":"Creature in this lane gets +4 Defense","flavorText":"","artKey":"astral_fortress","image":"cards/astral_fortress.webp"},{"id":"autoplucker","name":"Autoplucker","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"abilities":[{"trigger":"onLaneCreatureDestroyed","effects":[{"type":"damage","target":"enemyHero","amount":5}]}],"text":"Deals 5 Damage to the opposing Hero when your creayure in this lane is destroyed.","flavorText":"","artKey":"autoplucker","image":"cards/autoplucker.webp"},{"id":"candy_igloo","name":"Candy Igloo","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"statics":[{"kind":"swapStats","scope":"lane"}],"text":"Creature in this lane swap Attack and Defense.","flavorText":"","artKey":"candy_igloo","image":"cards/candy_igloo.webp"},{"id":"cardboard_mansion","name":"Cardboard Mansion","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"uncommon","stars":2,"statics":[{"kind":"stat","scope":"lane","atk":0,"def":{"of":"ownCreatures","mul":2}}],"text":"Creature in this lane gets +2 Defense for each of your creatures on the field.","flavorText":"","artKey":"cardboard_mansion","image":"cards/cardboard_mansion.webp"},{"id":"cave_of_solitude","name":"Cave of Solitude","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"epic","stars":4,"statics":[{"kind":"stat","scope":"lane","atk":{"of":"ownEmptyLanes","mul":5},"def":{"of":"ownEmptyLanes","mul":5}}],"text":"Creatures in this lane get +5 Attack and +5 Defense for each of your empty lands.","flavorText":"","artKey":"cave_of_solitude","image":"cards/cave_of_solitude.webp"},{"id":"comfy_cave","name":"Comfy Cave","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"rare","stars":3,"abilities":[{"trigger":"startOfTurn","effects":[{"type":"heal","target":"laneCreature","amount":{"of":"ownCreatures","mul":2}}]}],"text":"Creature in this lane heals 2 Damage for each creature you control at start of turn.","flavorText":"","artKey":"comfy_cave","image":"cards/comfy_cave.webp"},{"id":"corn_dome","name":"Corn Dome","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"statics":[{"kind":"stat","scope":"lane","atk":3,"def":0}],"text":"Creature in this lane gets +3 Attack.","flavorText":"","artKey":"corn_dome","image":"cards/corn_dome.webp"},{"id":"corn_parthenon","name":"Corn Parthenon","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"epic","stars":4,"statics":[{"kind":"stat","scope":"lane","atk":{"of":"fieldLandscapeTypes","mul":2},"def":0}],"text":"Creatures in this lane get +2 Attack for each different landscape on the field.","flavorText":"","artKey":"corn_parthenon","image":"cards/corn_parthenon.webp"},{"id":"dark_pyramid","name":"Dark Pyramid","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":7,"statics":[{"kind":"laneRarityCap","maxStars":1}],"text":"Enemy can only summon creatures with rarity of 1 where hero places this building in a lane.","flavorText":"","artKey":"dark_pyramid","image":"cards/dark_pyramid.webp"},{"id":"funeral_home","name":"Funeral Home","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"uncommon","stars":2,"abilities":[{"trigger":"onLaneCreatureDestroyed","effects":[{"type":"recoverDestroyed"},{"type":"destroyBuilding","target":"thisBuilding"}]}],"text":"When creature in this lane is destroyed, return it to your hand and send this Building to the Discard Pile.","flavorText":"","artKey":"funeral_home","image":"cards/funeral_home.webp"},{"id":"ghost_castle","name":"Ghost Castle","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"statics":[{"kind":"stat","scope":"lane","atk":8,"def":8}],"text":"Creature in this lane gets +8 Attack and +8 Defense.","flavorText":"","artKey":"ghost_castle","image":"cards/ghost_castle.webp"},{"id":"haunted_windmill","name":"Haunted Windmill","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"epic","stars":4,"abilities":[{"trigger":"onFloop","effects":[{"type":"gainMp","amount":1}]}],"text":"Gain 1 Magic Point when a creature in this lane uses a Floop ability.","flavorText":"","artKey":"haunted_windmill","image":"cards/haunted_windmill.webp"},{"id":"mausoleum","name":"Mausoleum","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"abilities":[{"trigger":"onLaneCreatureDestroyed","effects":[{"type":"recoverDestroyed"},{"type":"destroyBuilding","target":"thisBuilding"}]}],"text":"When creature in this lane is destroyed return it to your hand send this building to the Discard Pile.","flavorText":"","artKey":"mausoleum","image":"cards/mausoleum.webp"},{"id":"nicelands_tower","name":"Nicelands Tower","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"epic","stars":4,"abilities":[{"trigger":"startOfTurn","effects":[{"type":"heal","target":"laneCreature","amount":5}]}],"text":"Creature in this lane heals 5 Damage at the start of your turn.","flavorText":"","artKey":"nicelands_tower","image":"cards/nicelands_tower.webp"},{"id":"obelisx_of_vengeance","name":"Obelisx of Vengeance","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"abilities":[{"trigger":"onLaneCreatureDestroyed","effects":[{"type":"damage","target":"enemyHero","amount":4}]}],"text":"Deal 4 Damage to the opposing Hero when your creature in this lane is destroyed.","flavorText":"","artKey":"obelisx_of_vengeance","image":"cards/obelisx_of_vengeance.webp"},{"id":"puffy_castle","name":"Puffy Castle","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"abilities":[{"trigger":"onLaneCreatureDestroyed","effects":[{"type":"heal","target":"ownHero","amount":5}]}],"text":"Heal 5 damage from your hero when a creature in this lane is destroyed.","flavorText":"","artKey":"puffy_castle","image":"cards/puffy_castle.webp"},{"id":"pyramidia","name":"Pyramidia","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"uncommon","stars":2,"statics":[{"kind":"stat","scope":"lane","atk":0,"def":{"of":"handSize","mul":2}}],"text":"Creatures in this lane get +2 defense for each card in your hand.","flavorText":"","artKey":"pyramidia","image":"cards/pyramidia.webp"},{"id":"sand_castle","name":"Sand Castle","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"statics":[{"kind":"stat","scope":"lane","atk":4,"def":4}],"text":"Creature in this lane gets +4 Attack and +4 Defense","flavorText":"","artKey":"sand_castle","image":"cards/sand_castle.webp"},{"id":"sand_sphinx","name":"Sand Sphinx","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"epic","stars":4,"statics":[{"kind":"armor","scope":"lane","amount":5}],"text":"Creatures in this lane takes 5 less Damage when attacked.","flavorText":"","artKey":"sand_sphinx","image":"cards/sand_sphinx.webp"},{"id":"school_house","name":"School House","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"abilities":[{"trigger":"onAllyFloop","effects":[{"type":"buff","target":"laneCreature","atk":0,"def":5}]}],"text":"Your creature in this lane gains 5 Defense when a Floop ability is used.","flavorText":"","artKey":"school_house","image":"cards/school_house.webp"},{"id":"shadow_pyramid","name":"Shadow Pyramid","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"statics":[{"kind":"laneRarityCap","maxStars":3}],"text":"Enemy may only play creatures of 3 Rarity or lower on this lane.","flavorText":"","artKey":"shadow_pyramid","image":"cards/shadow_pyramid.webp"},{"id":"silo_of_truth","name":"Silo of Truth","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"rare","stars":3,"statics":[{"kind":"stat","scope":"lane","atk":{"of":"enemyHandSize","mul":2},"def":0}],"text":"Creature in this lane gets +2 Attack for each card in your opponent's hand.","flavorText":"","artKey":"silo_of_truth","image":"cards/silo_of_truth.webp"},{"id":"spirit_tower","name":"Spirit Tower","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"abilities":[{"trigger":"onLaneCreaturePlayed","effects":[{"type":"damage","target":"enemyHero","amount":5}]}],"text":"Deal 5 Damage to the opposing hero when a new creature is placed on this lane.","flavorText":"","artKey":"spirit_tower","image":"cards/spirit_tower.webp"},{"id":"stonehenge","name":"Stonehenge","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"statics":[{"kind":"floopCost","scope":"lane","amount":-1}],"text":"Floop ability costs 1 less Magic Point for creatures in this lane.","flavorText":"","artKey":"stonehenge","image":"cards/stonehenge.webp"},{"id":"sun_pyramid","name":"Sun Pyramid","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"abilities":[{"trigger":"onFloop","effects":[{"type":"buff","target":"laneCreature","atk":4,"def":0}]}],"text":"Creature in this lane get 4 Attack every time it uses a Floop ability.","flavorText":"","artKey":"sun_pyramid","image":"cards/sun_pyramid.webp"},{"id":"the_big_hen_house","name":"The Big Hen House","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"rare","stars":3,"statics":[{"kind":"stat","scope":"lane","atk":4,"def":4}],"text":"Creature in this lane gets +4 Attack and +4 Defense.","flavorText":"","artKey":"the_big_hen_house","image":"cards/the_big_hen_house.webp"},{"id":"woad_mobile_home","name":"Woad Mobile Home","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"uncommon","stars":2,"statics":[{"kind":"stat","scope":"lane","atk":0,"def":{"of":"ownCreatures","mul":3}}],"text":"Creature in this lane gets +3 Defense for each of your creatures on the field.","flavorText":"","artKey":"woad_mobile_home","image":"cards/woad_mobile_home.webp"},{"id":"corn_castle","name":"Corn Castle","type":"building","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"statics":[{"kind":"stat","scope":"lane","atk":{"of":"ownCreatures","mul":2},"def":0}],"text":"Creature in this lane gets +2 Attack for each of your creatures on the field.","flavorText":"","artKey":"corn_castle","image":"cards/corn_castle.webp"},{"id":"palace_of_bone","name":"Palace of Bone","type":"building","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"abilities":[{"trigger":"onLaneCreaturePlayed","effects":[{"type":"damage","target":"opposingCreature","amount":5}]}],"text":"Deal 5 Damage to the opposing creature when a new creature is placed on this lane.","flavorText":"","artKey":"palace_of_bone","image":"cards/palace_of_bone.webp"}]`);
const heroData = /* @__PURE__ */ JSON.parse(`[{"id":"ash","name":"Ash","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_ash","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(4 Turns) Return any card from the Discard Pile back to your hand.","cooldown":4,"effects":[{"type":"recover","pick":"best"}]},"image":"cards/ash.webp"},{"id":"bmo","name":"BMO","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_bmo","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Gain 2 extra Magic Points for 1 turn.","cooldown":3,"effects":[{"type":"gainMp","amount":2}]},"image":"cards/bmo.webp"},{"id":"banana_guard","name":"Banana Guard","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_banana_guard","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All your creatures gain +3 Defense.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":3}]},"image":"cards/banana_guard.webp"},{"id":"berrybones","name":"BerryBones","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_berrybones","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(4 Turns) Return any card from the Discard Pile to your hand.","cooldown":4,"effects":[{"type":"recover","pick":"best"}]},"image":"cards/berrybones.webp"},{"id":"blumps","name":"Blumps","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_blumps","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All of your creatures gain +3 Attack.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":3,"def":0}]},"image":"cards/blumps.webp"},{"id":"bonechill","name":"BoneChill","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_bonechill","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Gain 3 extra Magic Points for 1 turn.","cooldown":3,"effects":[{"type":"gainMp","amount":3}]},"image":"cards/bonechill.webp"},{"id":"cake","name":"Cake","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_cake","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Gain 3 extra Magic Points for 1 turn.","cooldown":3,"effects":[{"type":"gainMp","amount":3}]},"image":"cards/cake.webp"},{"id":"cinnamon_bun","name":"Cinnamon Bun","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_cinnamon_bun","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All your Nicelands creatures gain +3 Attack.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":3,"def":0,"filter":{"landscape":"candy"}}]},"image":"cards/cinnamon_bun.webp"},{"id":"date_night_ice_king","name":"Date-Night Ice King","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_date_night_ice_king","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) +1 Attack & +2 Def to all Nice Land Cards.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":1,"def":2,"filter":{"landscape":"candy"}}]},"image":"cards/date_night_ice_king.webp"},{"id":"doctor_finn","name":"Doctor Finn","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_doctor_finn","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All Spells cast this turn cost 1 less Magic Point.","cooldown":3,"effects":[{"type":"costMod","who":"self","kind":"spell","amount":-1}]},"image":"cards/doctor_finn.webp"},{"id":"donut_goon","name":"Donut Goon","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_donut_goon","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All of your creatures gain +5 Attack.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":5,"def":0}]},"image":"cards/donut_goon.webp"},{"id":"dr_donut","name":"Dr. Donut","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_dr_donut","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(5 Turns) Return any Creature from the Discard Pile back to your hand.","cooldown":5,"effects":[{"type":"recover","cardType":"creature","pick":"best"}]},"image":"cards/dr_donut.webp"},{"id":"earl_of_lemongrab","name":"Earl of Lemongrab","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_earl_of_lemongrab","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All creatures summoned this turn cost 1 less Magic Point.","cooldown":3,"effects":[{"type":"costMod","who":"self","kind":"creature","amount":-1}]},"image":"cards/earl_of_lemongrab.webp"},{"id":"el_fisto","name":"El Fisto","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_el_fisto","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Draw 2 Cards.","cooldown":3,"effects":[{"type":"draw","amount":2}]},"image":"cards/el_fisto.webp"},{"id":"finn","name":"Finn","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_finn","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(5 Turns) Gain 2 extra Magic Points for 1 turn.","cooldown":5,"effects":[{"type":"gainMp","amount":2}]},"image":"cards/finn.webp"},{"id":"fionna","name":"Fionna","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_fionna","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All creatures summoned this turn cost 1 less Magic Point.","cooldown":3,"effects":[{"type":"costMod","who":"self","kind":"creature","amount":-1}]},"image":"cards/fionna.webp"},{"id":"flame_princess","name":"Flame Princess","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_flame_princess","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(4 Turns) Draw 2 cards.","cooldown":4,"effects":[{"type":"draw","amount":2}]},"image":"cards/flame_princess.webp"},{"id":"ghost_jake","name":"Ghost Jake","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_ghost_jake","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All your Plains creatures gain +5 Attack.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":5,"def":0,"filter":{"landscape":"azure"}}]},"image":"cards/ghost_jake.webp"},{"id":"gunter","name":"Gunter","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_gunter","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 turns) Return any Spell card from the Discard Pile to your hand.","cooldown":3,"effects":[{"type":"recover","cardType":"spell","pick":"best"}]},"image":"cards/gunter.webp"},{"id":"holiday_bmo","name":"Holiday BMO","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_holiday_bmo","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(5 Turns) Draw 3 cards.","cooldown":5,"effects":[{"type":"draw","amount":3}]},"image":"cards/holiday_bmo.webp"},{"id":"holiday_finn","name":"Holiday Finn","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_holiday_finn","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(5 Turns) All your Universal creatures gain +5 Attack.","cooldown":5,"effects":[{"type":"buff","target":"allAllyCreatures","atk":5,"def":0,"filter":{"landscape":"neutral"}}]},"image":"cards/holiday_finn.webp"},{"id":"holiday_ice_king","name":"Holiday Ice King","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_holiday_ice_king","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Fully heal all of your Swamp creatures","cooldown":3,"effects":[{"type":"heal","target":"allAllyCreatures","amount":{"of":"targetDamage"},"filter":{"landscape":"murk"}}]},"image":"cards/holiday_ice_king.webp"},{"id":"holiday_jake","name":"Holiday Jake","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_holiday_jake","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(4 Turns) All Spells cast this turn cost 2 less Magic Point.","cooldown":4,"effects":[{"type":"costMod","who":"self","kind":"spell","amount":-2}]},"image":"cards/holiday_jake.webp"},{"id":"holiday_lumpy_space_princess","name":"Holiday Lumpy Space Princess","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_holiday_lumpy_space_princess","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(5 Turns) Gain 3 extra Magic Points for 1 turn.","cooldown":5,"effects":[{"type":"gainMp","amount":3}]},"image":"cards/holiday_lumpy_space_princess.webp"},{"id":"holiday_princess_bubblegum","name":"Holiday Princess Bubblegum","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_holiday_princess_bubblegum","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(5 Turns) All of your creatures gain +4 Attack.","cooldown":5,"effects":[{"type":"buff","target":"allAllyCreatures","atk":4,"def":0}]},"image":"cards/holiday_princess_bubblegum.webp"},{"id":"hunson_abadeer","name":"Hunson Abadeer","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_hunson_abadeer","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(4 Turns) All cards cast this turn cost 1 less magic point.","cooldown":4,"effects":[{"type":"costMod","who":"self","kind":"card","amount":-1}]},"image":"cards/hunson_abadeer.webp"},{"id":"ice_king","name":"Ice King","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_ice_king","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(4 Turns) Send all of your opponent's Buildings back to their hand.","cooldown":4,"effects":[{"type":"returnBuilding","target":"allEnemyBuildings"}]},"image":"cards/ice_king.webp"},{"id":"ice_queen","name":"Ice Queen","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_ice_queen","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All your creatures gain +4 Defense.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":4}]},"image":"cards/ice_queen.webp"},{"id":"jake","name":"Jake","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_jake","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All your Corn creatures gain +3 Attack.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":3,"def":0,"filter":{"landscape":"golden"}}]},"image":"cards/jake.webp"},{"id":"lady_rainicorn","name":"Lady Rainicorn","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_lady_rainicorn","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Choose a creature and fully heal it.","cooldown":3,"effects":[{"type":"heal","target":"chosenCreature","amount":{"of":"targetDamage"}}]},"image":"cards/lady_rainicorn.webp"},{"id":"lord_monochromicorn","name":"Lord Monochromicorn","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_lord_monochromicorn","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Opponent cannot use Spells next round and all Buildings on the board are discarded.","cooldown":3,"effects":[{"type":"block","what":"spell"},{"type":"destroyBuilding","target":"allBuildings"}]},"image":"cards/lord_monochromicorn.webp"},{"id":"lumpy_mimic","name":"Lumpy Mimic","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_lumpy_mimic","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Gain 2 extra Magic Points for 1 turn.","cooldown":3,"effects":[{"type":"gainMp","amount":2}]},"image":"cards/lumpy_mimic.webp"},{"id":"lumpy_space_prince","name":"Lumpy Space Prince","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_lumpy_space_prince","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All Spells cast this turn cost 2 less Magic Points.","cooldown":3,"effects":[{"type":"costMod","who":"self","kind":"spell","amount":-2}]},"image":"cards/lumpy_space_prince.webp"},{"id":"lumpy_space_princess","name":"Lumpy Space Princess","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_lumpy_space_princess","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Fully heal all of your Plains creatures.","cooldown":3,"effects":[{"type":"heal","target":"allAllyCreatures","amount":{"of":"targetDamage"},"filter":{"landscape":"azure"}}]},"image":"cards/lumpy_space_princess.webp"},{"id":"magic_man","name":"Magic Man","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_magic_man","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) Gain 1 extra Magic Point this turn.","cooldown":2,"effects":[{"type":"gainMp","amount":1}]},"image":"cards/magic_man.webp"},{"id":"marceline","name":"Marceline","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_marceline","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All of your creatures gain +2 Attack.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":2,"def":0}]},"image":"cards/marceline.webp"},{"id":"marshall_lee","name":"Marshall Lee","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_marshall_lee","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All of your creatures gain +3 Attack.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":3,"def":0}]},"image":"cards/marshall_lee.webp"},{"id":"pajama_finn","name":"Pajama Finn","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_pajama_finn","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All your Universal creatures gain +4 Defense.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":4,"filter":{"landscape":"neutral"}}]},"image":"cards/pajama_finn.webp"},{"id":"peppermint_butler","name":"Peppermint Butler","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_peppermint_butler","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) Return any Building card from the Discard Pile to your hand.","cooldown":2,"effects":[{"type":"recover","cardType":"building","pick":"best"}]},"image":"cards/peppermint_butler.webp"},{"id":"prince_gumball","name":"Prince Gumball","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_prince_gumball","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Nice Lands Creatures deploy cost cut by 2, every other land cut by 1.","cooldown":3,"effects":[{"type":"costMod","who":"self","kind":"creature","amount":-1},{"type":"costMod","who":"self","kind":"creature","amount":-1,"landscape":"candy"}]},"image":"cards/prince_gumball.webp"},{"id":"princess_bubblegum","name":"Princess Bubblegum","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_princess_bubblegum","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(4 Turns) Fully heal all of your creatures.","cooldown":4,"effects":[{"type":"heal","target":"allAllyCreatures","amount":{"of":"targetDamage"}}]},"image":"cards/princess_bubblegum.webp"},{"id":"princess_cookie","name":"Princess Cookie","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_princess_cookie","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All your Swamp creatures gain +4 Attack.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":4,"def":0,"filter":{"landscape":"murk"}}]},"image":"cards/princess_cookie.webp"},{"id":"ricardio_heart_guy","name":"Ricardio Heart Guy","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_ricardio_heart_guy","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Draw 1 card.","cooldown":3,"effects":[{"type":"draw","amount":1}]},"image":"cards/ricardio_heart_guy.webp"},{"id":"slumpy","name":"Slumpy","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_slumpy","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All creatures summoned this turn cost 1 less Magic Point.","cooldown":3,"effects":[{"type":"costMod","who":"self","kind":"creature","amount":-1}]},"image":"cards/slumpy.webp"},{"id":"snowfist","name":"SnowFist","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_snowfist","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All Spells cast this turn cost less 2 Magic Points.","cooldown":3,"effects":[{"type":"costMod","who":"self","kind":"spell","amount":-2}]},"image":"cards/snowfist.webp"},{"id":"snownut","name":"SnowNut","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_snownut","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All your creatures gain +3 Defense.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":3}]},"image":"cards/snownut.webp"},{"id":"snowberry","name":"Snowberry","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_snowberry","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Fully heal all of your creatures.","cooldown":3,"effects":[{"type":"heal","target":"allAllyCreatures","amount":{"of":"targetDamage"}}]},"image":"cards/snowberry.webp"},{"id":"sprinkles","name":"Sprinkles","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_sprinkles","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(5 Turns) Gain 2 extra Magic Points for 1 turn.","cooldown":5,"effects":[{"type":"gainMp","amount":2}]},"image":"cards/sprinkles.webp"},{"id":"super_ash","name":"Super Ash","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_ash","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) Gain +3 extra Magic Points for 1 turn.","cooldown":2,"effects":[{"type":"gainMp","amount":3}]},"image":"cards/super_ash.webp"},{"id":"super_bmo","name":"Super BMO","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_bmo","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) Gain 3 extra Magic Points for 1 turn.","cooldown":2,"effects":[{"type":"gainMp","amount":3}]},"image":"cards/super_bmo.webp"},{"id":"super_banana_guard","name":"Super Banana Guard","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_banana_guard","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) All your creatures gain +3 Defense.","cooldown":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":3}]},"image":"cards/super_banana_guard.webp"},{"id":"super_cinnamon_bun","name":"Super Cinnamon Bun","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_cinnamon_bun","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) All of your creatures gain +4 Attack.","cooldown":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":4,"def":0}]},"image":"cards/super_cinnamon_bun.webp"},{"id":"super_doctor_finn","name":"Super Doctor Finn","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_doctor_finn","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) Return any Spell card from the Discard Pile to your hand.","cooldown":2,"effects":[{"type":"recover","cardType":"spell","pick":"best"}]},"image":"cards/super_doctor_finn.webp"},{"id":"super_dr_donut","name":"Super Dr. Donut","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_dr_donut","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(1 Turn) Return any Creature from the Discard Pile back to your hand.","cooldown":1,"effects":[{"type":"recover","cardType":"creature","pick":"best"}]},"image":"cards/super_dr_donut.webp"},{"id":"super_earl_of_lemongrab","name":"Super Earl Of Lemongrab","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_earl_of_lemongrab","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(1 Turn) All creatures summoned this turn cost 1 less Magic Point.","cooldown":1,"effects":[{"type":"costMod","who":"self","kind":"creature","amount":-1}]},"image":"cards/super_earl_of_lemongrab.webp"},{"id":"super_flame_princess","name":"Super Flame Princess","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_flame_princess","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) All your Sand creatures gain +5 Attack.","cooldown":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":5,"def":0,"filter":{"landscape":"dune"}}]},"image":"cards/super_flame_princess.webp"},{"id":"super_gunter","name":"Super Gunter","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_gunter","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(1 Turn) All your creatures gain +2 Defense. Get everything if you play despacito","cooldown":1,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":2}]},"image":"cards/super_gunter.webp"},{"id":"super_hunson_abadeer","name":"Super Hunson Abadeer","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_hunson_abadeer","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"All plain creatures on your side +8 attack","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":8,"def":0,"filter":{"landscape":"azure"}}]},"image":"cards/super_hunson_abadeer.webp"},{"id":"super_ice_king","name":"Super Ice King","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_ice_king","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(1 Turn) All of your creatures gain +2 Attack.","cooldown":1,"effects":[{"type":"buff","target":"allAllyCreatures","atk":2,"def":0}]},"image":"cards/super_ice_king.webp"},{"id":"super_jake","name":"Super Jake","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_jake","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) All your Corn creatures gain +5 Attack.","cooldown":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":5,"def":0,"filter":{"landscape":"golden"}}]},"image":"cards/super_jake.webp"},{"id":"super_lady_rainicorn","name":"Super Lady Rainicorn","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_lady_rainicorn","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Fully heal all of your creatures.","cooldown":3,"effects":[{"type":"heal","target":"allAllyCreatures","amount":{"of":"targetDamage"}}]},"image":"cards/super_lady_rainicorn.webp"},{"id":"super_lumpy_space_princess","name":"Super Lumpy Space Princess","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_lumpy_space_princess","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) Fully heal all of your Plains creatures.","cooldown":2,"effects":[{"type":"heal","target":"allAllyCreatures","amount":{"of":"targetDamage"},"filter":{"landscape":"azure"}}]},"image":"cards/super_lumpy_space_princess.webp"},{"id":"super_magic_man","name":"Super Magic Man","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_magic_man","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(1 Turn) Send all of your opponent's Buildings back to their hand.","cooldown":1,"effects":[{"type":"returnBuilding","target":"allEnemyBuildings"}]},"image":"cards/super_magic_man.webp"},{"id":"super_marceline","name":"Super Marceline","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_marceline","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) All of your creatures gain +2 Attack.","cooldown":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":2,"def":0}]},"image":"cards/super_marceline.webp"},{"id":"super_pajama_finn","name":"Super Pajama Finn","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_pajama_finn","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) All of your Rainbow creatures gain +6 Defense.","cooldown":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":6,"filter":{"landscape":"neutral"}}]},"image":"cards/super_pajama_finn.webp"},{"id":"super_peppermint_butler","name":"Super Peppermint Butler","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_peppermint_butler","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) All of your Universal creatures gain +5 Attack.","cooldown":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":5,"def":0,"filter":{"landscape":"neutral"}}]},"image":"cards/super_peppermint_butler.webp"},{"id":"super_princess_bubblegum","name":"Super Princess Bubblegum","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_princess_bubblegum","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) Fully heal all of your creatures.","cooldown":2,"effects":[{"type":"heal","target":"allAllyCreatures","amount":{"of":"targetDamage"}}]},"image":"cards/super_princess_bubblegum.webp"},{"id":"super_princess_cookie","name":"Super Princess Cookie","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_princess_cookie","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All of your Swamp creatures gain +8 Attack.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":8,"def":0,"filter":{"landscape":"murk"}}]},"image":"cards/super_princess_cookie.webp"},{"id":"treasure_cat","name":"Treasure Cat","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_treasure_cat","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All cards cast this turn cost 1 less magic point.","cooldown":3,"effects":[{"type":"costMod","who":"self","kind":"card","amount":-1}]},"image":"cards/treasure_cat.webp"}]`);
const starterDeckData = [
  {
    id: "starter_corn_fields",
    name: "Corn Fields",
    description: "Pump up your creatures and trample the lanes.",
    heroId: "jake",
    landscapes: [
      "golden",
      "golden",
      "golden",
      "golden"
    ],
    cards: {
      log_knight: 1,
      yellow_gnome: 1,
      cornball: 1,
      ethan_allfire: 1,
      husker_knight: 1,
      husker_worm: 3,
      travelin_farmer: 3,
      archer_dan: 3,
      chad_bear: 2,
      corn_dog: 1,
      rural_earl: 3,
      white_ninja: 1,
      corn_ronin: 1,
      earl: 1,
      huskerbat: 1,
      patchy_the_pumpkin: 3,
      the_sludger: 3,
      brief_power: 1,
      corn_scepter: 2,
      cerebral_bloodstorm: 2,
      strawberry_butt: 2,
      corn_dome: 2,
      corn_castle: 1
    }
  },
  {
    id: "starter_blue_plains",
    name: "Blue Plains",
    description: "Tricks, bounces and card draw from the Woadic tribes.",
    heroId: "ghost_jake",
    landscapes: [
      "azure",
      "azure",
      "azure",
      "azure"
    ],
    cards: {
      infinite_figure: 1,
      timmy_magic_eyes: 1,
      cool_dog: 3,
      grape_slimey: 1,
      heavenly_gazer: 1,
      the_poultrygeist: 1,
      woadic_time_walker: 3,
      ancient_scholar: 1,
      axey: 3,
      chad_bear: 2,
      dragon_claw: 1,
      spectre_hector: 3,
      earl: 1,
      heifergeist: 3,
      psionic_architect: 3,
      punk_cat: 1,
      temporal_wisp: 1,
      falling_star: 2,
      cerebral_bloodstorm: 2,
      strawberry_butt: 2,
      ultimate_magic_hands: 1,
      astral_fortress: 2,
      stonehenge: 1
    }
  },
  {
    id: "starter_useless_swamp",
    name: "Useless Swamp",
    description: "Floop for damage and burn the enemy down.",
    heroId: "princess_cookie",
    landscapes: [
      "murk",
      "murk",
      "murk",
      "murk"
    ],
    cards: {
      gray_eyebat: 3,
      mace_stump: 1,
      orange_slimey: 1,
      teeth_leaf: 3,
      wandering_bald_man: 1,
      bog_bum: 1,
      chad_bear: 2,
      green_merman: 1,
      herculeye: 3,
      hot_eyebat: 1,
      pete_bog: 3,
      snappy_dresser: 1,
      white_ninja: 1,
      earl: 1,
      green_mermaid: 3,
      record_thug: 1,
      red_eyeling: 1,
      weak_baldferatu: 3,
      bone_wand: 2,
      blood_transfusion: 1,
      cerebral_bloodstorm: 2,
      strawberry_butt: 2,
      corn_dome: 1,
      spirit_tower: 1
    }
  },
  {
    id: "starter_sandy_lands",
    name: "Sandy Lands",
    description: "Walls of sand that outlast everything.",
    heroId: "banana_guard",
    landscapes: [
      "dune",
      "dune",
      "dune",
      "dune"
    ],
    cards: {
      green_party_ogre: 1,
      sandasaurus_rex: 1,
      burning_hand: 1,
      green_cactaball: 3,
      sand_angel: 1,
      sand_eyebat: 3,
      beach_mum: 2,
      chad_bear: 3,
      lime_slimey: 1,
      mayonaise_angel: 1,
      sandbacho: 3,
      sandsnake: 1,
      mud_angel: 3,
      prickle: 1,
      sand_jackal: 3,
      sandfoot: 1,
      wall_of_sand: 1,
      tome_of_ankhs: 2,
      cerebral_bloodstorm: 2,
      strawberry_butt: 2,
      woad_blood: 1,
      astral_fortress: 1,
      sand_castle: 2
    }
  },
  {
    id: "starter_nice_lands",
    name: "Nice Lands",
    description: "Heal, heal and heal again.",
    heroId: "cinnamon_bun",
    landscapes: [
      "candy",
      "candy",
      "candy",
      "candy"
    ],
    cards: {
      nicelands_cutie: 1,
      angel_heart: 1,
      blueberry_djini: 3,
      fluffapillar: 3,
      chad_bear: 3,
      dr_phillip_flufferson: 3,
      music_mallard: 1,
      nicelands_eye_bat: 1,
      snake_mint: 2,
      snuggle_tree: 1,
      bad_rose: 3,
      detective_bobby: 1,
      dog_boy: 3,
      earl: 1,
      furious_hen: 1,
      the_cow: 1,
      weak_candyr: 1,
      well_dressed_wolf: 1,
      cerebral_bloodstorm: 2,
      strawberry_butt: 2,
      woad_blood: 2,
      pentaid: 1,
      comfy_cave: 1,
      nicelands_tower: 1
    }
  },
  {
    id: "starter_corn_swamp",
    name: "Corn & Swamp",
    description: "Big attackers backed by swamp floops.",
    heroId: "finn",
    landscapes: [
      "golden",
      "golden",
      "murk",
      "murk"
    ],
    cards: {
      bald_mans_throne: 1,
      teeth_leaf: 3,
      travelin_farmer: 3,
      archer_dan: 1,
      bog_bum: 1,
      chad_bear: 1,
      corn_dog: 1,
      herculeye: 2,
      pete_bog: 3,
      rural_earl: 3,
      corn_ronin: 1,
      green_mermaid: 1,
      huskerbat: 1,
      patchy_the_pumpkin: 1,
      record_thug: 1,
      red_eyeling: 1,
      the_sludger: 3,
      weak_baldferatu: 3,
      witch_way: 1,
      blood_transfusion: 1,
      cerebral_bloodstorm: 2,
      strawberry_butt: 2,
      corn_dome: 2,
      obelisx_of_vengeance: 1
    }
  },
  {
    id: "starter_plains_sand",
    name: "Plains & Sand",
    description: "Sturdy walls and clever floops.",
    heroId: "bmo",
    landscapes: [
      "azure",
      "azure",
      "dune",
      "dune"
    ],
    cards: {
      cool_dog: 3,
      green_cactaball: 3,
      axey: 3,
      beach_mum: 1,
      chad_bear: 1,
      dragon_claw: 1,
      sandbacho: 2,
      sandsnake: 1,
      spectre_hector: 3,
      heifergeist: 3,
      mud_angel: 3,
      prickle: 1,
      psionic_architect: 1,
      punk_cat: 1,
      sand_jackal: 1,
      sandfoot: 1,
      temporal_wisp: 1,
      wall_of_sand: 1,
      falling_star: 1,
      cerebral_bloodstorm: 2,
      strawberry_butt: 2,
      woad_blood: 1,
      astral_fortress: 1,
      sand_castle: 2
    }
  },
  {
    id: "starter_nice_sand",
    name: "Nice & Sand",
    description: "Nothing gets through, nothing stays hurt.",
    heroId: "princess_bubblegum",
    landscapes: [
      "candy",
      "candy",
      "dune",
      "dune"
    ],
    cards: {
      blueberry_djini: 3,
      green_cactaball: 3,
      beach_mum: 1,
      chad_bear: 2,
      dr_phillip_flufferson: 3,
      sandbacho: 3,
      sandsnake: 1,
      snake_mint: 1,
      bad_rose: 3,
      detective_bobby: 1,
      dog_boy: 3,
      furious_hen: 1,
      mud_angel: 1,
      prickle: 1,
      sand_jackal: 1,
      sandfoot: 1,
      the_cow: 1,
      well_dressed_wolf: 1,
      tome_of_ankhs: 1,
      cerebral_bloodstorm: 2,
      strawberry_butt: 2,
      pentaid: 1,
      nicelands_tower: 1,
      sand_castle: 2
    }
  },
  {
    id: "starter_corn_plains",
    name: "Corn & Plains",
    description: "Hit hard, then pull the rug.",
    heroId: "marceline",
    landscapes: [
      "golden",
      "golden",
      "azure",
      "azure"
    ],
    cards: {
      timmy_magic_eyes: 1,
      cool_dog: 3,
      travelin_farmer: 3,
      archer_dan: 1,
      axey: 2,
      chad_bear: 1,
      corn_dog: 1,
      dragon_claw: 1,
      rural_earl: 3,
      spectre_hector: 3,
      corn_ronin: 1,
      heifergeist: 1,
      huskerbat: 1,
      patchy_the_pumpkin: 3,
      psionic_architect: 1,
      punk_cat: 1,
      temporal_wisp: 1,
      the_sludger: 3,
      brief_power: 1,
      corn_scepter: 1,
      cerebral_bloodstorm: 2,
      strawberry_butt: 2,
      corn_dome: 1,
      the_big_hen_house: 2
    }
  },
  {
    id: "starter_rainbow_road",
    name: "Rainbow Road",
    description: "A bit of every land.",
    heroId: "pajama_finn",
    landscapes: [
      "golden",
      "azure",
      "murk",
      "candy"
    ],
    cards: {
      cool_dog: 3,
      travelin_farmer: 3,
      dr_phillip_flufferson: 1,
      herculeye: 2,
      pete_bog: 3,
      rural_earl: 3,
      spectre_hector: 1,
      bad_rose: 3,
      corn_ronin: 1,
      dog_boy: 1,
      furious_hen: 1,
      green_mermaid: 1,
      heifergeist: 1,
      patchy_the_pumpkin: 1,
      psionic_architect: 1,
      record_thug: 1,
      the_sludger: 1,
      weak_baldferatu: 3,
      well_dressed_wolf: 1,
      witch_way: 1,
      zazos_magic_seeds: 1,
      cerebral_bloodstorm: 2,
      strawberry_butt: 2,
      cave_of_solitude: 1,
      corn_parthenon: 1
    }
  }
];
function countLandscapesIn(list2, type) {
  return list2.filter((l) => l === type).length;
}
function buildContent(rawCards, rawHeroes, rawDecks) {
  const keywordErrors = validateKeywordData();
  if (keywordErrors.length > 0) throw new Error(`Invalid keyword data:
- ${keywordErrors.join("\n- ")}`);
  const cards = createCardDb(rawCards);
  const heroes = createHeroDb(rawHeroes, cards);
  const ctx = { cards, heroes, balance: BALANCE.match };
  if (!Array.isArray(rawDecks)) throw new Error("Starter deck data must be an array");
  const errors2 = [];
  const ids = /* @__PURE__ */ new Set();
  const starterDecks = rawDecks.map((raw2) => {
    const deck = {
      id: raw2.id,
      name: raw2.name,
      description: raw2.description,
      heroId: raw2.heroId,
      landscapes: raw2.landscapes,
      cards: expandCounts(raw2.cards ?? {})
    };
    if (ids.has(deck.id)) errors2.push(`${deck.id}: duplicate starter deck id`);
    ids.add(deck.id);
    for (const e of validateDeck(deck, ctx)) errors2.push(`${deck.id}: ${e}`);
    for (const id of new Set(deck.cards)) {
      const card = cards.byId.get(id);
      if (!card) continue;
      for (const r of card.requirements) {
        if (countLandscapesIn(deck.landscapes, r.landscape) < r.count) {
          errors2.push(
            `${deck.id}: ${card.name} needs ${r.count} ${r.landscape}, but the deck cannot provide it`
          );
        }
      }
    }
    return deck;
  });
  if (errors2.length > 0) throw new Error(`Invalid starter decks:
- ${errors2.join("\n- ")}`);
  return { ctx, starterDecks };
}
let cached = null;
function getContent() {
  cached ??= buildContent(cardData, heroData, starterDeckData);
  return cached;
}
const ms = (iso2) => iso2 ? Date.parse(iso2) : 0;
const iso = (t) => t === null ? null : new Date(t).toISOString();
function fromRow(r) {
  return {
    id: r.id,
    mode: r.mode,
    status: r.status,
    roomCode: r.room_code,
    players: [r.player0, r.player1],
    names: r.names,
    decks: r.decks,
    state: r.state,
    seq: r.seq,
    deadline: r.deadline ? ms(r.deadline) : null,
    lastSeen: r.last_seen,
    winner: r.winner === null ? null : r.winner === "draw" ? "draw" : Number(r.winner),
    seasonId: r.season_id,
    result: r.result,
    createdAt: ms(r.created_at),
    updatedAt: ms(r.updated_at)
  };
}
function toRow(m) {
  return {
    id: m.id,
    mode: m.mode,
    status: m.status,
    room_code: m.roomCode,
    player0: m.players[0],
    player1: m.players[1],
    names: m.names,
    decks: m.decks,
    state: m.state,
    seq: m.seq,
    deadline: iso(m.deadline),
    last_seen: m.lastSeen,
    winner: m.winner === null ? null : String(m.winner),
    season_id: m.seasonId,
    result: m.result,
    created_at: new Date(m.createdAt).toISOString(),
    updated_at: new Date(m.updatedAt).toISOString()
  };
}
function check(res) {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
function list(res) {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}
class SupabaseStore {
  constructor(db) {
    this.db = db;
  }
  async getSave(userId) {
    const row = check(
      await this.db.from("saves").select("data, version, synced_at").eq("user_id", userId).maybeSingle()
    );
    return row ? { data: row.data, version: row.version, syncedAt: ms(row.synced_at) } : null;
  }
  async putSave(userId, save, expectedVersion) {
    const row = { user_id: userId, data: save.data, version: save.version, synced_at: iso(save.syncedAt) };
    if (expectedVersion === null) {
      const res = await this.db.from("saves").insert(row);
      if (res.error) return false;
    } else {
      const res = await this.db.from("saves").update(row).eq("user_id", userId).eq("version", expectedVersion).select("version");
      if (list(res).length !== 1) return false;
    }
    await this.mirrorCollectionAndDecks(userId, save);
    return true;
  }
  /** Keeps `collections` and `decks` in step with the save (owner-readable, used for reporting). */
  async mirrorCollectionAndDecks(userId, save) {
    const cards = Object.entries(save.data.collection).map(([card_id, c]) => ({
      user_id: userId,
      card_id,
      count: c.count,
      level: c.level
    }));
    check(await this.db.from("collections").delete().eq("user_id", userId));
    if (cards.length > 0) check(await this.db.from("collections").insert(cards));
    const decks = save.data.decks.flatMap(
      (d, slot) => d ? [
        {
          user_id: userId,
          slot,
          name: d.name,
          hero_id: d.heroId,
          landscapes: d.landscapes,
          cards: d.cards
        }
      ] : []
    );
    check(await this.db.from("decks").delete().eq("user_id", userId));
    if (decks.length > 0) check(await this.db.from("decks").insert(decks));
  }
  async setProfile(userId, p) {
    check(
      await this.db.from("profiles").upsert({
        id: userId,
        name: p.name,
        avatar: p.avatar,
        card_back: p.cardBack,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      })
    );
  }
  async getProfileName(userId) {
    const row = check(await this.db.from("profiles").select("name").eq("id", userId).maybeSingle());
    return row?.name ?? "Player";
  }
  async activeSeason() {
    const r = check(await this.db.from("seasons").select("*").eq("active", true).single());
    if (!r) throw new Error("No active season");
    return { id: r.id, name: r.name, startsAt: ms(r.starts_at), endsAt: ms(r.ends_at), active: true };
  }
  async startSeason(s) {
    check(await this.db.from("seasons").update({ active: false }).eq("active", true));
    check(
      await this.db.from("seasons").insert({ id: s.id, name: s.name, starts_at: iso(s.startsAt), ends_at: iso(s.endsAt), active: true })
    );
  }
  async getRating(userId, seasonId) {
    const r = check(
      await this.db.from("ratings").select("*").eq("user_id", userId).eq("season_id", seasonId).maybeSingle()
    );
    return r ? { userId, seasonId, rating: r.rating, games: r.games, wins: r.wins, losses: r.losses, peak: r.peak } : null;
  }
  async putRating(r) {
    check(
      await this.db.from("ratings").upsert({
        user_id: r.userId,
        season_id: r.seasonId,
        rating: r.rating,
        games: r.games,
        wins: r.wins,
        losses: r.losses,
        peak: r.peak
      })
    );
  }
  async ratingsOf(seasonId) {
    const rows = list(await this.db.from("ratings").select("*").eq("season_id", seasonId));
    return rows.map((r) => ({
      userId: String(r.user_id),
      seasonId,
      rating: Number(r.rating),
      games: Number(r.games),
      wins: Number(r.wins),
      losses: Number(r.losses),
      peak: Number(r.peak)
    }));
  }
  async queue() {
    const rows = list(await this.db.from("matchmaking_queue").select("*").order("queued_at").limit(200));
    return rows.map(
      (r) => ({
        userId: r.user_id,
        name: r.name,
        rating: r.rating,
        deck: r.deck,
        queuedAt: ms(r.queued_at)
      })
    );
  }
  async putQueue(e) {
    check(
      await this.db.from("matchmaking_queue").upsert({
        user_id: e.userId,
        name: e.name,
        rating: e.rating,
        deck: e.deck,
        queued_at: iso(e.queuedAt)
      })
    );
  }
  async takeQueue(userId) {
    const rows = list(
      await this.db.from("matchmaking_queue").delete().eq("user_id", userId).select("user_id")
    );
    return rows.length === 1;
  }
  async getMatch(id) {
    const r = check(await this.db.from("matches").select("*").eq("id", id).maybeSingle());
    return r ? fromRow(r) : null;
  }
  async putMatch(m, expectedSeq) {
    const row = toRow(m);
    if (expectedSeq === null) return !(await this.db.from("matches").insert(row)).error;
    const rows = list(
      await this.db.from("matches").update(row).eq("id", m.id).eq("seq", expectedSeq).select("id")
    );
    return rows.length === 1;
  }
  async waitingRoom(code) {
    const r = check(
      await this.db.from("matches").select("*").eq("status", "waiting").eq("room_code", code).maybeSingle()
    );
    return r ? fromRow(r) : null;
  }
  async activeMatchOf(userId) {
    const rows = list(
      await this.db.from("matches").select("*").eq("status", "active").or(`player0.eq.${userId},player1.eq.${userId}`).order("created_at", { ascending: false }).limit(1)
    );
    return rows[0] ? fromRow(rows[0]) : null;
  }
  async logAction(matchId, seq, player, action) {
    await this.db.from("match_actions").insert({ match_id: matchId, seq, player, action });
  }
  async publishView(matchId, userId, view) {
    check(
      await this.db.from("match_views").upsert({
        match_id: matchId,
        user_id: userId,
        seq: view.seq,
        view,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      })
    );
  }
}
function createSupabaseDeps(url, serviceRoleKey) {
  const db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const service = new GameService({
    store: new SupabaseStore(db),
    content: getContent(),
    now: () => Date.now(),
    random: () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
    newId: () => crypto.randomUUID()
  });
  return {
    service,
    auth: async (req) => {
      const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      if (!token) return null;
      const { data, error } = await db.auth.getUser(token);
      return error || !data.user ? null : { userId: data.user.id };
    },
    isAdmin: (req) => req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") === serviceRoleKey
  };
}
class MemoryStore {
  saves = /* @__PURE__ */ new Map();
  profiles = /* @__PURE__ */ new Map();
  seasons = [];
  ratings = /* @__PURE__ */ new Map();
  entries = /* @__PURE__ */ new Map();
  matches = /* @__PURE__ */ new Map();
  actions = [];
  views = /* @__PURE__ */ new Map();
  constructor(now) {
    this.seasons.push({
      id: 1,
      name: "Season 1",
      startsAt: now,
      endsAt: now + 42 * 864e5,
      active: true
    });
  }
  copy(v) {
    return structuredClone(v);
  }
  async getSave(userId) {
    const s = this.saves.get(userId);
    return s ? this.copy(s) : null;
  }
  async putSave(userId, save, expectedVersion) {
    const cur = this.saves.get(userId);
    if (expectedVersion === null ? cur !== void 0 : cur?.version !== expectedVersion) return false;
    this.saves.set(userId, this.copy(save));
    return true;
  }
  async setProfile(userId, profile) {
    this.profiles.set(userId, { ...profile });
  }
  async getProfileName(userId) {
    return this.profiles.get(userId)?.name ?? "Player";
  }
  async activeSeason() {
    return this.copy(this.seasons.find((s) => s.active));
  }
  async startSeason(season) {
    for (const s of this.seasons) s.active = false;
    this.seasons.push({ ...season, active: true });
  }
  async getRating(userId, seasonId) {
    const r = this.ratings.get(`${userId}:${seasonId}`);
    return r ? this.copy(r) : null;
  }
  async putRating(row) {
    this.ratings.set(`${row.userId}:${row.seasonId}`, this.copy(row));
  }
  async ratingsOf(seasonId) {
    return [...this.ratings.values()].filter((r) => r.seasonId === seasonId).map((r) => this.copy(r));
  }
  async queue() {
    return [...this.entries.values()].map((e) => this.copy(e));
  }
  async putQueue(entry) {
    this.entries.set(entry.userId, this.copy(entry));
  }
  async takeQueue(userId) {
    return this.entries.delete(userId);
  }
  async getMatch(id) {
    const m = this.matches.get(id);
    return m ? this.copy(m) : null;
  }
  async putMatch(match2, expectedSeq) {
    const cur = this.matches.get(match2.id);
    if (expectedSeq === null ? cur !== void 0 : cur?.seq !== expectedSeq) return false;
    this.matches.set(match2.id, this.copy(match2));
    return true;
  }
  async waitingRoom(code) {
    const m = [...this.matches.values()].find((x) => x.status === "waiting" && x.roomCode === code);
    return m ? this.copy(m) : null;
  }
  async activeMatchOf(userId) {
    const m = [...this.matches.values()].find((x) => x.status === "active" && x.players.includes(userId));
    return m ? this.copy(m) : null;
  }
  async logAction(matchId, seq, player, action) {
    this.actions.push({ matchId, seq, player, action: this.copy(action) });
  }
  async publishView(matchId, userId, view) {
    this.views.set(`${matchId}:${userId}`, this.copy(view));
  }
}
export {
  CORS_HEADERS,
  GameService,
  MemoryStore,
  ServiceError,
  SupabaseStore,
  createSupabaseDeps,
  handle
};
