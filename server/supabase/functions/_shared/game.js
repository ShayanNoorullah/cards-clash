import { createClient as qa } from "@supabase/supabase-js";
const Ka = [{ id: "rush", name: "Rush", valued: !1, icon: "rush", description: "Can attack the turn it is played." }, { id: "guard", name: "Guard", valued: !1, icon: "guard", description: "When an enemy attacks an empty lane next to this creature, this creature blocks instead of your Hero." }, { id: "ranged", name: "Ranged", valued: !1, icon: "ranged", description: "Ignores Guard, and takes no damage from Thorns or Counter." }, { id: "lifesteal", name: "Lifesteal", valued: !1, icon: "lifesteal", description: "Combat damage this creature deals also heals your Hero." }, { id: "thorns", name: "Thorns", valued: !0, icon: "thorns", description: "When attacked, deals X damage to the attacker, even if this creature is destroyed." }, { id: "counter", name: "Counter", valued: !1, icon: "counter", description: "When attacked and it survives, strikes back with its full ATK." }, { id: "shield", name: "Shield", valued: !1, icon: "shield", description: "Blocks the next damage completely, then breaks." }, { id: "poison", name: "Poison", valued: !0, icon: "poison", description: "Creatures damaged by this one are poisoned for X. A poisoned creature takes that much damage at the start of its owner's turn, then the poison drops by 1." }, { id: "regenerate", name: "Regenerate", valued: !0, icon: "regenerate", description: "Heals X damage at the start of your turn." }, { id: "swift", name: "Swift", valued: !1, icon: "swift", description: "Moving this creature costs no MP." }, { id: "stealth", name: "Stealth", valued: !1, icon: "stealth", description: "Your opponent cannot target it with spells or abilities until it attacks." }, { id: "feast", name: "Feast", valued: !0, icon: "lifesteal", description: "Heals X damage whenever it destroys a creature in combat." }], Fa = {
  keywords: Ka
}, B = ["azure", "golden", "murk", "dune", "candy", "ember"], ge = ["common", "uncommon", "rare", "epic", "legendary"], Te = ["creature", "spell", "building"], $t = [
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
], Qe = ["thorns", "poison", "regenerate", "feast"], ft = [
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
], Sa = ["ownHero", "enemyHero", "bothHeroes"], Ea = [
  "thisBuilding",
  "opposingBuilding",
  "chosenEnemyBuilding",
  "chosenAllyBuilding",
  "allEnemyBuildings",
  "allAllyBuildings",
  "allBuildings"
], Ha = [
  "thisLandscape",
  "opposingLandscape",
  "chosenEnemyLandscape",
  "chosenAllyLandscape",
  "randomEnemyLandscape",
  "allAllyLandscapes",
  "allEnemyLandscapes"
], Je = [
  "chosenCreature",
  "chosenEnemyCreature",
  "chosenAllyCreature",
  "chosenEnemyLandscape",
  "chosenAllyLandscape",
  "chosenEnemyBuilding",
  "chosenAllyBuilding"
], Ia = [
  "self",
  "opposingCreature",
  "laneCreature",
  "adjacentAllies",
  "adjacentEnemies",
  "thisLandscape",
  "opposingLandscape",
  "thisBuilding",
  "opposingBuilding"
], La = [
  "randomEnemyCreature",
  "randomAllyCreature",
  "randomCreature",
  "randomEnemyLandscape"
], mt = [
  "sourceLane",
  "adjacentEmptyLanes",
  "randomEmptyLane",
  "allEmptyLanes"
], yt = [
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
], gt = [
  "selfAtk",
  "selfDef",
  "selfDamage",
  "opposingAtk",
  "targetAtk",
  "targetDef",
  "targetMaxDef",
  "targetDamage",
  "timesFlooped"
], ht = [
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
], _t = ["self", "lane", "adjacent", "otherAllies", "allAllies", "allEnemies"];
function I(e) {
  return e === 0 ? 1 : 0;
}
const kt = Fa.keywords;
function Gt(e) {
  return $t.includes(e);
}
function He(e) {
  const [t, a] = e.split(":");
  if (!t || !Gt(t)) return null;
  const r = Qe.includes(t);
  if (a === void 0) return r ? null : [t, 1];
  if (!r) return null;
  const n = Number(a);
  return !Number.isInteger(n) || n < 1 ? null : [t, n];
}
function We(e, t) {
  for (const a of t) {
    const r = He(a);
    if (!r) continue;
    const [n, o] = r;
    e[n] = Qe.includes(n) ? (e[n] ?? 0) + o : 1;
  }
  return e;
}
function ja() {
  const e = kt.map((a) => a.id), t = [];
  for (const a of $t) e.includes(a) || t.push(`keywords.json is missing "${a}"`);
  for (const a of e) Gt(a) || t.push(`keywords.json has unknown keyword "${a}"`);
  for (const a of kt)
    a.valued !== Qe.includes(a.id) && t.push(`keywords.json: "${a.id}" valued flag is wrong`);
  return t;
}
function j(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
function ee(e) {
  return typeof e == "number" && Number.isInteger(e) && e >= 0;
}
function K(e) {
  return ee(e) && e > 0;
}
function Bt(e) {
  return typeof e == "number" && Number.isInteger(e);
}
function v(e, t) {
  return typeof t == "string" && e.includes(t);
}
const $a = [
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
], Ga = ["flip", "convert", "restore", "seal", "wipeLane"], Ba = ["destroyBuilding", "returnBuilding", "moveBuilding"], za = [
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
], bt = ["card", "creature", "spell", "building", "floop"], wt = ["creature", "spell", "building"], vt = ["permanent", "turn", "round"];
function X(e, t, a, r = !0) {
  if (typeof e == "number") {
    Number.isInteger(e) || a.push(`${t} must be an integer`);
    return;
  }
  if (!j(e) || !v(yt, e.of)) {
    a.push(`${t} must be a number or { of: quantity, ... }`);
    return;
  }
  !r && (gt.includes(e.of) || gt.includes(e.sub)) && a.push(`${t}: "${e.of}" cannot be used here`), e.mul !== void 0 && typeof e.mul != "number" && a.push(`${t}.mul must be a number`), e.add !== void 0 && typeof e.add != "number" && a.push(`${t}.add must be a number`), e.div !== void 0 && !K(e.div) && a.push(`${t}.div must be a positive integer`), e.sub !== void 0 && !v(yt, e.sub) && a.push(`${t}.sub must be a quantity`), e.of === "ownLandscapesOf" && !v(B, e.landscape) && a.push(`${t}.landscape is required for ownLandscapesOf`);
}
function Ge(e) {
  return typeof e == "number" ? K(e) : j(e);
}
function Ra(e, t, a) {
  if (!j(e)) {
    a.push(`${t} must be an object`);
    return;
  }
  e.landscape !== void 0 && e.landscape !== "neutral" && !v(B, e.landscape) && a.push(`${t}.landscape is invalid`);
  for (const r of ["maxStars", "minStars"])
    e[r] !== void 0 && !K(e[r]) && a.push(`${t}.${r} must be a positive integer`);
  e.damaged !== void 0 && typeof e.damaged != "boolean" && a.push(`${t}.damaged must be boolean`);
}
function Xe(e, t, a) {
  if (!j(e)) {
    a.push(`${t} must be an object`);
    return;
  }
  switch (e.type) {
    case "landscapeCount":
      (!v(B, e.landscape) || !K(e.atLeast)) && a.push(`${t} needs landscape and atLeast >= 1`);
      break;
    case "opposingLaneEmpty":
    case "opposingLaneOccupied":
      break;
    case "heroHpAtMost":
    case "creatureCountAtLeast":
      (e.who !== "self" && e.who !== "enemy" || !ee(e.value)) && a.push(`${t} needs who (self|enemy) and a non-negative value`);
      break;
    case "handSizeAtMost":
    case "handSizeAtLeast":
      ee(e.value) || a.push(`${t} needs a non-negative value`);
      break;
    case "creatureCountAtMost":
      (e.who !== "self" && e.who !== "enemy" || !ee(e.value)) && a.push(`${t} needs who (self|enemy) and a non-negative value`);
      break;
    default:
      a.push(`${t}.type "${String(e.type)}" is not a known condition`);
  }
}
function Oa(e, t, a, r) {
  const n = e.target, o = String(e.type);
  let s;
  if (Ga.includes(o) ? s = v(Ha, n) : Ba.includes(o) ? s = v(Ea, n) : $a.includes(o) ? s = v(ft, n) : s = v(ft, n) || v(Sa, n), !s)
    return r.push(`${t}.target "${String(n)}" is not valid for a ${o} effect`), null;
  const i = n;
  return i === "self" && a.source !== "creature" ? r.push(`${t}.target "self" is only for creatures`) : i === "thisBuilding" && a.source !== "building" ? r.push(`${t}.target "thisBuilding" is only for buildings`) : Ia.includes(i) && a.source !== "creature" && a.source !== "building" && r.push(`${t}.target "${i}" needs a card in a lane and is not allowed on a ${a.source}`), Je.includes(i) && !a.allowChosen && r.push(`${t}.target "${i}" needs a player choice, which is not possible here`), e.count !== void 0 && (La.includes(i) ? K(e.count) || r.push(`${t}.count must be a positive integer`) : r.push(`${t}.count is only allowed with random selectors`)), i;
}
function Ae(e, t, a, r) {
  if (!Array.isArray(e) || e.length === 0) {
    r.push(`${t} must be a non-empty array`);
    return;
  }
  const n = /* @__PURE__ */ new Set();
  e.forEach((o, s) => {
    const i = `${t}[${s}]`;
    if (!j(o)) {
      r.push(`${i} must be an object`);
      return;
    }
    if (!za.includes(String(o.type))) {
      const d = Oa(o, i, a, r);
      d && Je.includes(d) && n.add(d);
    }
    switch (o.when !== void 0 && Xe(o.when, `${i}.when`, r), o.filter !== void 0 && Ra(o.filter, `${i}.filter`, r), o.splash !== void 0 && typeof o.splash != "boolean" && r.push(`${i}.splash must be boolean`), o.type) {
      case "damage":
      case "heal":
        Ge(o.amount) ? X(o.amount, `${i}.amount`, r) : r.push(`${i}.amount must be a positive integer or an amount`), o.type === "damage" && o.stealOnKill !== void 0 && typeof o.stealOnKill != "boolean" && r.push(`${i}.stealOnKill must be boolean`);
        break;
      case "poison":
        K(o.amount) || r.push(`${i}.amount must be a positive integer`);
        break;
      case "buff":
        X(o.atk, `${i}.atk`, r), X(o.def, `${i}.def`, r), o.atk === 0 && o.def === 0 && r.push(`${i} must change atk or def`), o.temporary !== void 0 && typeof o.temporary != "boolean" && r.push(`${i}.temporary must be boolean`), o.duration !== void 0 && !vt.includes(String(o.duration)) && r.push(`${i}.duration must be one of ${vt.join(", ")}`);
        break;
      case "draw":
        Ge(o.amount) ? X(o.amount, `${i}.amount`, r) : r.push(`${i}.amount must be a positive integer or an amount`), o.who !== void 0 && o.who !== "self" && o.who !== "enemy" && r.push(`${i}.who must be self or enemy`);
        break;
      case "discard":
        K(o.amount) || r.push(`${i}.amount must be a positive integer`), o.who !== void 0 && o.who !== "self" && o.who !== "enemy" && r.push(`${i}.who must be self or enemy`);
        break;
      case "gainMp":
        Ge(o.amount) ? X(o.amount, `${i}.amount`, r) : r.push(`${i}.amount must be a positive integer or an amount`), o.nextTurn !== void 0 && typeof o.nextTurn != "boolean" && r.push(`${i}.nextTurn must be boolean`);
        break;
      case "loseMp":
      case "chargeUltimate":
        K(o.amount) || r.push(`${i}.amount must be a positive integer`);
        break;
      case "costMod":
        o.who !== "self" && o.who !== "enemy" && r.push(`${i}.who must be self or enemy`), bt.includes(String(o.kind)) || r.push(`${i}.kind must be one of ${bt.join(", ")}`), (!Bt(o.amount) || o.amount === 0) && r.push(`${i}.amount must be a non-zero integer`), o.landscape !== void 0 && o.landscape !== "neutral" && !v(B, o.landscape) && r.push(`${i}.landscape is invalid`);
        break;
      case "block":
        wt.includes(String(o.what)) || r.push(`${i}.what must be one of ${wt.join(", ")}`);
        break;
      case "recover":
        o.pick !== "best" && o.pick !== "random" && r.push(`${i}.pick must be best or random`), o.cardType !== void 0 && !v(Te, o.cardType) && r.push(`${i}.cardType is invalid`), o.count !== void 0 && !K(o.count) && r.push(`${i}.count must be a positive integer`);
        break;
      case "tutor":
        o.cardType !== void 0 && !v(Te, o.cardType) && r.push(`${i}.cardType is invalid`);
        break;
      case "cycleHand":
        K(o.draw) || r.push(`${i}.draw must be a positive integer`);
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
        typeof o.cardId != "string" && r.push(`${i}.cardId is required`), v(mt, o.where) ? (o.where === "sourceLane" || o.where === "adjacentEmptyLanes") && a.source !== "creature" && a.source !== "building" && r.push(`${i}.where "${o.where}" needs a card in a lane`) : r.push(`${i}.where must be one of ${mt.join(", ")}`), o.count !== void 0 && !K(o.count) && r.push(`${i}.count must be a positive integer`);
        break;
      case "grantKeyword":
        (typeof o.keyword != "string" || !He(o.keyword)) && r.push(`${i}.keyword "${String(o.keyword)}" is invalid`);
        break;
      case "convert":
        v(B, o.to) || r.push(`${i}.to must be a landscape type`);
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
        r.push(`${i}.type "${String(o.type)}" is not a known effect type`);
    }
  }), n.size > 1 && r.push(`${t} may use only one kind of chosen target (found ${[...n].join(", ")})`);
}
function zt(e, t, a, r) {
  if (e !== void 0) {
    if (!Array.isArray(e)) {
      r.push(`${t} must be an array`);
      return;
    }
    e.forEach((n, o) => {
      const s = `${t}[${o}]`;
      if (!j(n)) {
        r.push(`${s} must be an object`);
        return;
      }
      if (!v(ht, n.trigger)) {
        r.push(`${s}.trigger must be one of ${ht.join(", ")}`);
        return;
      }
      a === "spell" && r.push(`${s}: spells cannot have triggered abilities`), a === "hero" && (n.trigger === "onPlay" || n.trigger === "onDestroy" || n.trigger === "onAttack" || n.trigger === "onDamaged") && r.push(`${s}: heroes cannot use trigger ${n.trigger}`), a === "building" && (n.trigger === "onDestroy" || n.trigger === "onAttack" || n.trigger === "onDamaged") && r.push(`${s}: buildings cannot use trigger ${n.trigger}`), (n.trigger === "onLaneCreatureDestroyed" || n.trigger === "onLaneCreaturePlayed") && a !== "building" && r.push(`${s}: only buildings can use trigger ${n.trigger}`), n.trigger === "onFloop" && a !== "building" && a !== "creature" && r.push(`${s}: trigger onFloop needs a card in a lane`), n.condition !== void 0 && Xe(n.condition, `${s}.condition`, r), Ae(n.effects, `${s}.effects`, { source: a, allowChosen: n.trigger === "onPlay" }, r);
    });
  }
}
function Rt(e, t, a, r) {
  if (e !== void 0) {
    if (!Array.isArray(e)) {
      r.push(`${t} must be an array`);
      return;
    }
    e.forEach((n, o) => {
      const s = `${t}[${o}]`;
      if (!j(n)) {
        r.push(`${s} must be an object`);
        return;
      }
      if (n.kind === "spellPower") {
        K(n.amount) || r.push(`${s}.amount must be a positive integer`);
        return;
      }
      if (n.kind === "laneRarityCap") {
        a !== "building" && r.push(`${s}: laneRarityCap is only for buildings`), K(n.maxStars) || r.push(`${s}.maxStars must be a positive integer`);
        return;
      }
      const i = ["stat", "keyword", "swapStats", "armor", "floopCost"];
      if (!i.includes(String(n.kind))) {
        r.push(`${s}.kind must be one of ${[...i, "spellPower", "laneRarityCap"].join(", ")}`);
        return;
      }
      if ((n.kind === "armor" || n.kind === "floopCost") && (!Bt(n.amount) || n.amount === 0) && r.push(`${s}.amount must be a non-zero integer`), v(_t, n.scope) ? (n.scope === "self" && a !== "creature" && r.push(`${s}.scope "self" is only for creatures`), (n.scope === "lane" || n.scope === "adjacent") && a !== "creature" && a !== "building" && r.push(`${s}.scope "${n.scope}" needs a card in a lane`), n.scope === "lane" && a === "creature" && r.push(`${s}.scope "lane" on a creature: use "self"`)) : r.push(`${s}.scope must be one of ${_t.join(", ")}`), n.onLandscape !== void 0 && !v(B, n.onLandscape) && r.push(`${s}.onLandscape must be a landscape type`), n.kind === "stat")
        X(n.atk, `${s}.atk`, r, !1), X(n.def, `${s}.def`, r, !1), n.atk === 0 && n.def === 0 && r.push(`${s} needs non-zero atk/def`);
      else if (n.kind === "keyword") {
        const l = typeof n.keyword == "string" ? He(n.keyword) : null;
        l ? (l[0] === "shield" || l[0] === "stealth") && r.push(`${s}: "${l[0]}" cannot be granted continuously (it is a one-time status)`) : r.push(`${s}.keyword "${String(n.keyword)}" is invalid`);
      }
    });
  }
}
function Na(e, t = 0) {
  const a = [];
  if (!j(e)) return [`cards[${t}] must be an object`];
  const r = typeof e.id == "string" && e.id.length > 0 ? e.id : `cards[${t}]`, n = (l) => a.push(`${r}: ${l}`), o = [];
  if ((typeof e.id != "string" || !/^[a-z0-9_]+$/.test(e.id)) && n("id must match /^[a-z0-9_]+$/"), (typeof e.name != "string" || e.name.trim() === "") && n("name is required"), v(Te, e.type) || n(`type must be one of ${Te.join(", ")}`), e.landscape !== "neutral" && !v(B, e.landscape) && n('landscape must be a landscape type or "neutral"'), v(ge, e.rarity) || n(`rarity must be one of ${ge.join(", ")}`), ee(e.cost) || n("cost must be a non-negative integer"), typeof e.text != "string" && n("text must be a string"), typeof e.flavorText != "string" && n("flavorText must be a string"), (typeof e.artKey != "string" || e.artKey === "") && n("artKey is required"), e.token !== void 0 && typeof e.token != "boolean" && n("token must be a boolean"), e.token === !0 && e.type !== "creature" && n("only creatures can be tokens"), e.stars !== void 0 && !K(e.stars) && n("stars must be a positive integer"), e.variant !== void 0 && typeof e.variant != "string" && n("variant must be a string"), e.image !== void 0 && (typeof e.image != "string" || e.image === "") && n("image must be a path"), !Array.isArray(e.requirements))
    n("requirements must be an array");
  else {
    const l = /* @__PURE__ */ new Set();
    let d = 0;
    e.requirements.forEach((c, u) => {
      if (!j(c) || !v(B, c.landscape) || !K(c.count)) {
        n(`requirements[${u}] must be { landscape, count >= 1 }`);
        return;
      }
      l.has(c.landscape) && n(`requirements lists ${c.landscape} twice`), l.add(c.landscape), d += c.count;
    }), d > 4 && n("requirements need more than 4 landscapes and can never be met");
  }
  const s = e.type === "creature" ? "creature" : e.type === "building" ? "building" : "spell";
  if (zt(e.abilities, `${r}: abilities`, s, o), Rt(e.statics, `${r}: statics`, s, o), (Array.isArray(e.abilities) && e.abilities.length > 0 || Array.isArray(e.statics) && e.statics.length > 0 || e.floop !== void 0 || e.type !== "creature") && (typeof e.text != "string" || e.text.trim() === "") && n("text must describe the abilities"), e.type === "creature") {
    if (ee(e.atk) || n("atk must be a non-negative integer"), K(e.def) || n("def must be a positive integer"), !Array.isArray(e.keywords)) n("keywords must be an array");
    else
      for (const l of e.keywords)
        (typeof l != "string" || !He(l)) && n(`keyword "${String(l)}" is invalid`);
    e.floop !== void 0 && (j(e.floop) ? (ee(e.floop.cost) || n("floop.cost must be a non-negative integer"), e.floop.condition !== void 0 && Xe(e.floop.condition, `${r}: floop.condition`, o), Ae(
      e.floop.effects,
      `${r}: floop.effects`,
      { source: "creature", allowChosen: !0 },
      o
    )) : n("floop must be an object"));
  } else e.type === "spell" ? Ae(e.effects, `${r}: effects`, { source: "spell", allowChosen: !0 }, o) : e.type === "building" && (Array.isArray(e.abilities) && e.abilities.length > 0 || Array.isArray(e.statics) && e.statics.length > 0 || n("buildings need at least one ability or static"));
  return [...a, ...o];
}
function Ot(e) {
  return (e ?? []).filter((t) => t.type === "summon").map((t) => t.cardId);
}
function Ua(e) {
  const t = [];
  e.type === "spell" && t.push(e.effects), e.type === "creature" && e.floop && t.push(e.floop.effects);
  for (const a of e.abilities ?? []) t.push(a.effects);
  return t;
}
function Wa(e) {
  if (!Array.isArray(e)) throw new Error("Card data must be an array of cards");
  const t = e.flatMap((r, n) => Na(r, n)), a = /* @__PURE__ */ new Map();
  for (const r of e)
    a.has(r.id) && t.push(`${r.id}: duplicate card id`), a.set(r.id, r);
  if (t.length === 0)
    for (const r of a.values())
      for (const n of Ua(r))
        for (const o of Ot(n)) {
          const s = a.get(o);
          (!s || s.type !== "creature" || !s.token) && t.push(`${r.id}: summons "${o}", which is not a token creature`);
        }
  if (t.length > 0) throw new Error(`Invalid card data:
- ${t.join(`
- `)}`);
  return { byId: a, all: [...a.values()] };
}
function Ya(e, t = 0) {
  if (!j(e)) return [`heroes[${t}] must be an object`];
  const a = typeof e.id == "string" ? e.id : `heroes[${t}]`, r = [], n = (o) => r.push(`${a}: ${o}`);
  (typeof e.id != "string" || !/^[a-z0-9_]+$/.test(e.id)) && n("id must match /^[a-z0-9_]+$/");
  for (const o of ["name", "title", "artKey"])
    (typeof e[o] != "string" || e[o] === "") && n(`${o} is required`);
  return typeof e.flavorText != "string" && n("flavorText must be a string"), e.landscape !== "neutral" && !v(B, e.landscape) && n("landscape is invalid"), e.boss !== void 0 && typeof e.boss != "boolean" && n("boss must be true or false"), !j(e.passive) || typeof e.passive.name != "string" || typeof e.passive.text != "string" ? n("passive needs name and text") : (zt(e.passive.abilities, `${a}: passive.abilities`, "hero", r), Rt(e.passive.statics, `${a}: passive.statics`, "hero", r)), !j(e.ultimate) || typeof e.ultimate.name != "string" || typeof e.ultimate.text != "string" ? n("ultimate needs name and text") : (Ae(
    e.ultimate.effects,
    `${a}: ultimate.effects`,
    { source: "hero", allowChosen: !0 },
    r
  ), e.ultimate.cooldown !== void 0 && !K(e.ultimate.cooldown) && n("ultimate.cooldown must be a positive integer")), e.image !== void 0 && (typeof e.image != "string" || e.image === "") && n("image must be a path"), r;
}
function Va(e, t) {
  if (!Array.isArray(e)) throw new Error("Hero data must be an array");
  const a = e.flatMap((n, o) => Ya(n, o)), r = /* @__PURE__ */ new Map();
  for (const n of e)
    r.has(n.id) && a.push(`${n.id}: duplicate hero id`), r.set(n.id, n);
  if (t && a.length === 0)
    for (const n of r.values()) {
      const o = [n.ultimate.effects, ...(n.passive.abilities ?? []).map((s) => s.effects)];
      for (const s of o)
        for (const i of Ot(s)) {
          const l = t.byId.get(i);
          (!l || l.type !== "creature" || !l.token) && a.push(`${n.id}: summons "${i}", which is not a token`);
        }
    }
  if (a.length > 0) throw new Error(`Invalid hero data:
- ${a.join(`
- `)}`);
  return { byId: r, all: [...r.values()] };
}
function S(e, t) {
  const a = e.byId.get(t);
  if (!a) throw new Error(`Unknown card id: ${t}`);
  return a;
}
function ke(e, t) {
  const a = e.byId.get(t);
  if (!a) throw new Error(`Unknown hero id: ${t}`);
  return a;
}
const xt = /* @__PURE__ */ new WeakMap();
function Qa(e) {
  let t = xt.get(e);
  return t || (t = We({}, e.keywords), xt.set(e, t)), t;
}
function Ja(e) {
  return (e.abilities ?? []).filter((t) => t.trigger === "onPlay");
}
function Xa(e) {
  return e.type === "spell" ? e.effects : Ja(e).flatMap((t) => t.effects);
}
function Za(e) {
  return Ze(e)?.target ?? null;
}
function Ze(e) {
  for (const t of e)
    if ("target" in t && Je.includes(t.target)) return t;
  return null;
}
let Nt = null;
function er(e) {
  Nt = e;
}
function Tt(e, t) {
  return e.players[t].lanes.filter((a) => a.creature).length;
}
function tr(e, t) {
  if (t.lane === null || t.iid === null) return null;
  const a = e.players[t.owner].lanes[t.lane]?.creature;
  return a && a.iid === t.iid ? a : null;
}
function At(e, t, a, r, n) {
  const o = e.players[r.owner], s = e.players[I(r.owner)], i = Nt, l = () => tr(e, r), d = () => {
    const c = r.target;
    if (!c) return null;
    const u = e.players[c.player].lanes[c.lane]?.creature;
    return u ? { c: u, lane: c.lane } : null;
  };
  switch (a) {
    case "handSize":
      return o.hand.length;
    case "enemyHandSize":
      return s.hand.length;
    case "ownCreatures":
      return Tt(e, r.owner);
    case "enemyCreatures":
      return Tt(e, I(r.owner));
    case "ownBuildings":
      return o.lanes.filter((c) => c.building).length;
    case "enemyBuildings":
      return s.lanes.filter((c) => c.building).length;
    case "ownLandscapeTypes":
      return new Set(o.lanes.filter((c) => c.landscape && !c.flipped).map((c) => c.landscape)).size;
    case "fieldLandscapeTypes":
      return new Set(
        [...o.lanes, ...s.lanes].filter((c) => c.landscape && !c.flipped).map((c) => c.landscape)
      ).size;
    case "ownLandscapesOf":
      return o.lanes.filter((c) => !c.flipped && c.landscape === n).length;
    case "ownEmptyLanes":
      return o.lanes.filter((c) => !c.creature).length;
    case "adjacentEmptyLanes":
      return r.lane === null ? 0 : [r.lane - 1, r.lane + 1].filter((c) => o.lanes[c] && !o.lanes[c].creature).length;
    case "floopsThisTurn":
      return o.floopsThisTurn ?? 0;
    case "timesFlooped":
      return l()?.floopCount ?? 0;
    case "ownDiscard":
      return o.discard.length;
    case "enemyDiscardCreatures":
      return s.discard.filter((c) => t.cards.byId.get(c.cardId)?.type === "creature").length;
    case "selfAtk": {
      const c = l();
      return c ? i.atk(e, t, c, r.lane) : 0;
    }
    case "selfDef": {
      const c = l();
      return c ? Math.max(0, i.def(e, t, c, r.lane)) : 0;
    }
    case "selfDamage":
      return l()?.damage ?? 0;
    case "opposingAtk": {
      if (r.lane === null) return 0;
      const c = s.lanes[r.lane]?.creature;
      return c ? i.atk(e, t, c, r.lane) : 0;
    }
    case "targetAtk": {
      const c = d();
      return c ? i.atk(e, t, c.c, c.lane) : 0;
    }
    case "targetDef": {
      const c = d();
      return c ? Math.max(0, i.def(e, t, c.c, c.lane)) : 0;
    }
    case "targetMaxDef": {
      const c = d();
      return c ? i.maxDef(e, t, c.c, c.lane) : 0;
    }
    case "targetDamage":
      return d()?.c.damage ?? 0;
  }
}
function Ce(e, t, a, r) {
  if (typeof a == "number") return a;
  const n = At(e, t, a.of, r, a.landscape), o = a.div ? Math.floor(n / a.div) : n;
  let s = (a.mul ?? 1) * o + (a.add ?? 0);
  return a.sub && (s -= At(e, t, a.sub, r)), Math.trunc(s);
}
function et(e) {
  return e.stars ?? ge.indexOf(e.rarity) + 1;
}
function Ut(e, t, a) {
  if (!a) return !0;
  const r = S(e.cards, t.cardId);
  if (a.landscape !== void 0 && r.landscape !== a.landscape) return !1;
  const n = et(r);
  return !(a.maxStars !== void 0 && n > a.maxStars || a.minStars !== void 0 && n < a.minStars || a.damaged && t.damage <= 0);
}
function ie(e, t) {
  return e.activePlayer === t ? e.turn + 2 : e.turn + 1;
}
const ar = 1, rr = { heroMaxHp: 100, laneCount: 4, deckSize: 40, maxCopiesCommon: 3, maxCopiesUncommon: 3, maxCopiesRare: 3, maxCopiesEpic: 1, maxCopiesLegendary: 1, firstPlayerHandSize: 5, secondPlayerHandSize: 6, firstPlayerSkipsFirstDraw: !0, mulligansAllowed: 1, startingMp: 2, mpPerTurn: 1, maxMp: 8, extraDrawCost: 1, extraDrawsPerTurn: 1, moveCost: 1, maxMovesPerCreaturePerTurn: 1, fatigueDamage: 5, maxHandSize: 8, ultimateChargePerDamage: 10, ultimateChargeMax: 100, maxEffectResolutionsPerAction: 200, maxTurns: 60 }, nr = { turnTimerSeconds: 60, reconnectGraceSeconds: 60, rankedCardLevel: 3 }, or = [{ level: 1, atk: 0, def: 0, ability: 0 }, { level: 2, atk: 0, def: 2, ability: 0 }, { level: 3, atk: 2, def: 3, ability: 1 }, { level: 4, atk: 3, def: 5, ability: 2 }, { level: 5, atk: 5, def: 7, ability: 3 }], Ct = {
  version: ar,
  match: rr,
  online: nr,
  cardLevels: or
}, sr = [
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
], ir = [
  "turnTimerSeconds",
  "reconnectGraceSeconds",
  "rankedCardLevel"
];
function ve(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
function Be(e, t, a, r) {
  if (!ve(e)) {
    r.push(`${a} must be an object`);
    return;
  }
  for (const n of t) {
    const o = e[n];
    (typeof o != "number" || !Number.isInteger(o) || o < 0) && r.push(`${a}.${n} must be a non-negative integer (got ${JSON.stringify(o)})`);
  }
}
function lr(e) {
  if (!ve(e)) return ["balance must be an object"];
  const t = [];
  if (Be(e.match, sr, "match", t), ve(e.match) && typeof e.match.firstPlayerSkipsFirstDraw != "boolean" && t.push("match.firstPlayerSkipsFirstDraw must be a boolean"), Be(e.online, ir, "online", t), !Array.isArray(e.cardLevels) || e.cardLevels.length === 0 ? t.push("cardLevels must be a non-empty array") : e.cardLevels.forEach((r, n) => {
    Be(r, ["level", "atk", "def", "ability"], `cardLevels[${n}]`, t), ve(r) && r.level !== n + 1 && t.push(`cardLevels[${n}].level must be ${n + 1}`);
  }), t.length > 0) return t;
  const a = e.match;
  return a.heroMaxHp < 1 && t.push("match.heroMaxHp must be >= 1"), a.laneCount < 1 && t.push("match.laneCount must be >= 1"), a.deckSize < 1 && t.push("match.deckSize must be >= 1"), a.startingMp > a.maxMp && t.push("match.startingMp must be <= match.maxMp"), (a.firstPlayerHandSize > a.maxHandSize || a.secondPlayerHandSize > a.maxHandSize) && t.push("starting hand sizes must be <= match.maxHandSize"), a.ultimateChargeMax < 1 && t.push("match.ultimateChargeMax must be >= 1"), a.maxEffectResolutionsPerAction < 1 && t.push("match.maxEffectResolutionsPerAction must be >= 1"), t;
}
function cr() {
  const e = lr(Ct);
  if (e.length > 0) throw new Error(`Invalid balance.json:
- ${e.join(`
- `)}`);
  const t = Ct;
  return Object.freeze({
    ...t,
    match: Object.freeze({ ...t.match }),
    online: Object.freeze({ ...t.online }),
    cardLevels: Object.freeze(t.cardLevels.map((a) => Object.freeze({ ...a })))
  });
}
function Wt(e) {
  const t = le.cardLevels;
  return t[Math.max(1, Math.min(t.length, Math.floor(e))) - 1];
}
const le = cr();
function Yt(e, t) {
  switch (e) {
    case "common":
      return t.maxCopiesCommon;
    case "uncommon":
      return t.maxCopiesUncommon;
    case "rare":
      return t.maxCopiesRare;
    case "epic":
      return t.maxCopiesEpic;
    case "legendary":
      return t.maxCopiesLegendary;
  }
}
function tt(e, t) {
  const { cards: a, heroes: r, balance: n } = t, o = [];
  if (typeof e.heroId != "string" || e.heroId === "" ? o.push("Deck needs a hero.") : r.byId.has(e.heroId) || o.push(`Unknown hero "${e.heroId}".`), !Array.isArray(e.landscapes) || e.landscapes.length !== n.laneCount)
    o.push(`Deck needs exactly ${n.laneCount} landscapes.`);
  else
    for (const i of e.landscapes)
      B.includes(i) || o.push(`Unknown landscape "${i}".`);
  if (!Array.isArray(e.cards)) return [...o, "Deck cards must be a list."];
  e.cards.length !== n.deckSize && o.push(`Deck has ${e.cards.length} cards; it needs exactly ${n.deckSize}.`);
  const s = /* @__PURE__ */ new Map();
  for (const i of e.cards) s.set(i, (s.get(i) ?? 0) + 1);
  for (const [i, l] of s) {
    const d = a.byId.get(i);
    if (!d) {
      o.push(`Unknown card "${i}".`);
      continue;
    }
    if (d.token) {
      o.push(`${d.name} is a token and cannot be put in a deck.`);
      continue;
    }
    const c = Yt(d.rarity, n);
    l > c && o.push(`${d.name}: ${l} copies, max ${c} for ${d.rarity} cards.`);
  }
  return o;
}
function dr(e) {
  return Object.entries(e).flatMap(([t, a]) => Array.from({ length: a }, () => t));
}
function ur(e) {
  const t = e + 1831565813 >>> 0;
  let a = t;
  return a = Math.imul(a ^ a >>> 15, a | 1), a ^= a + Math.imul(a ^ a >>> 7, a | 61), [((a ^ a >>> 14) >>> 0) / 4294967296, t];
}
function Vt(e) {
  let t = 3735928559, a = 1103547991;
  for (let r = 0; r < e.length; r++) {
    const n = e.charCodeAt(r);
    t = Math.imul(t ^ n, 2654435761), a = Math.imul(a ^ n, 1597334677);
  }
  return t = Math.imul(t ^ t >>> 16, 2246822507) ^ Math.imul(a ^ a >>> 13, 3266489909), a = Math.imul(a ^ a >>> 16, 2246822507) ^ Math.imul(t ^ t >>> 13, 3266489909), (t ^ a) >>> 0;
}
function Qt(e) {
  if (typeof e == "string") return Vt(e);
  if (!Number.isFinite(e)) throw new Error(`Invalid RNG seed: ${e}`);
  return Math.floor(e) >>> 0;
}
class he {
  s;
  constructor(t) {
    this.s = Qt(t);
  }
  /** Restores a generator from a previously saved state (no re-hashing). */
  static fromState(t) {
    const a = new he(0);
    return a.s = t >>> 0, a;
  }
  get state() {
    return this.s;
  }
  /** Float in [0, 1). */
  next() {
    const [t, a] = ur(this.s);
    return this.s = a, t;
  }
  /** Integer in [min, max] inclusive. */
  int(t, a) {
    if (!Number.isInteger(t) || !Number.isInteger(a)) throw new Error("Rng.int bounds must be integers");
    if (a < t) throw new Error(`Rng.int: max (${a}) < min (${t})`);
    return t + Math.floor(this.next() * (a - t + 1));
  }
  /** True with the given probability (0..1). */
  chance(t) {
    return this.next() < t;
  }
  /** Uniformly picks one element. Throws on an empty array. */
  pick(t) {
    if (t.length === 0) throw new Error("Rng.pick: empty array");
    return t[this.int(0, t.length - 1)];
  }
  /** Picks one element using non-negative weights. */
  weighted(t, a) {
    if (t.length === 0 || t.length !== a.length)
      throw new Error("Rng.weighted: items and weights must be non-empty and equal length");
    let r = 0;
    for (const o of a) {
      if (o < 0 || !Number.isFinite(o)) throw new Error("Rng.weighted: invalid weight");
      r += o;
    }
    if (r <= 0) throw new Error("Rng.weighted: total weight must be > 0");
    let n = this.next() * r;
    for (let o = 0; o < t.length; o++)
      if (n -= a[o], n < 0) return t[o];
    return t[t.length - 1];
  }
  /** Returns a new shuffled array (Fisher-Yates). The input is not modified. */
  shuffle(t) {
    const a = t.slice();
    for (let r = a.length - 1; r > 0; r--) {
      const n = this.int(0, r), o = a[r];
      a[r] = a[n], a[n] = o;
    }
    return a;
  }
  /** Picks `count` distinct elements (or all of them, if fewer exist). */
  sample(t, a) {
    return this.shuffle(t).slice(0, Math.max(0, a));
  }
  /** Derives an independent child generator, e.g. one per AI simulation. */
  fork(t) {
    return new he((Vt(t) ^ this.int(0, 4294967295)) >>> 0);
  }
}
function pr(e, t) {
  const a = t.balance;
  e.decks.forEach((f, T) => {
    if (e.skipDeckValidation) {
      ke(t.heroes, f.heroId);
      for (const m of f.cards) S(t.cards, m);
    } else {
      const m = tt(f, t);
      if (m.length > 0) throw new Error(`Deck ${T + 1} is illegal:
- ${m.join(`
- `)}`);
    }
  });
  const r = Qt(e.seed), n = he.fromState(r);
  let o = 1;
  const s = le.cardLevels.length, i = (f) => {
    const T = {};
    for (const m of new Set(f.cards)) {
      const D = e.fixedCardLevel ?? f.levels?.[m] ?? 1, A = Math.max(1, Math.min(s, Math.floor(D)));
      A > 1 && (T[m] = A);
    }
    return T;
  }, l = (f, T) => {
    const m = T.cards.map((H) => ({
      iid: `c${o++}`,
      cardId: H,
      owner: f
    })), D = Array.from({ length: a.laneCount }, () => ({
      landscape: null,
      flipped: !1,
      flipTimer: null,
      creature: null,
      building: null
    })), A = e.rules?.[f] ?? [], $ = (H) => A.reduce((ne, C) => ne + (H(C) ?? 0), 0), W = Math.max(1, a.heroMaxHp + $((H) => H.heroHpDelta)), J = e.startingHp?.[f] ?? W;
    return {
      id: f,
      heroId: T.heroId,
      hp: Math.max(1, Math.min(W, J)),
      maxHp: W,
      mp: 0,
      mpPenalty: 0,
      turnsTaken: 0,
      extraDrawsThisTurn: 0,
      ultimateCharge: Math.max(
        0,
        Math.min(
          a.ultimateChargeMax,
          $((H) => H.startingCharge)
        )
      ),
      ultimatesUsed: 0,
      landscapePool: [...T.landscapes],
      cardLevels: i(T),
      rules: A,
      arranged: !1,
      mulligansUsed: 0,
      mulliganDone: !1,
      deck: e.stackedDecks ? m : n.shuffle(m),
      hand: [],
      discard: [],
      lanes: D
    };
  }, d = [
    l(0, e.decks[0]),
    l(1, e.decks[1])
  ], c = n.next() < 0.5 ? 0 : 1, u = e.firstPlayer ?? c, w = [{ type: "gameCreated", firstPlayer: u }];
  for (const f of d) {
    const T = f.rules.reduce((D, A) => D + (A.extraCards ?? 0), 0), m = Math.max(
      0,
      (f.id === u ? a.firstPlayerHandSize : a.secondPlayerHandSize) + T
    );
    f.hand = f.deck.splice(0, m);
  }
  return { state: {
    version: 2,
    seed: r,
    rng: n.state,
    phase: "arrange",
    turn: 0,
    firstPlayer: u,
    activePlayer: u,
    players: d,
    nextInstanceId: o,
    winner: null,
    endReason: null
  }, events: w };
}
function Me(e, t) {
  return typeof t == "number" && Number.isInteger(t) && t >= 0 && t < e.players[0].lanes.length;
}
function Jt(e, t) {
  return e.lanes.filter((a) => !a.flipped && a.landscape === t).length;
}
function fr(e, t) {
  return t.filter((a) => Jt(e, a.landscape) < a.count);
}
function mr(e, t) {
  const a = t.balance;
  return Math.min(a.maxMp, a.startingMp + Math.max(0, e - 1) * a.mpPerTurn);
}
function Xt(e, t, a) {
  return a ? e.players[t].cardLevels[a] ?? 1 : 1;
}
const xe = (e) => ({ iid: e.iid, cardId: e.cardId, owner: e.owner });
function yr(e) {
  return {
    landscape: e.landscape,
    flipped: e.flipped,
    flipTimer: e.flipTimer,
    creature: e.creature ? { ...e.creature, grantedKeywords: [...e.creature.grantedKeywords] } : null,
    building: e.building ? xe(e.building) : null,
    ...e.sealedUntil !== void 0 ? { sealedUntil: e.sealedUntil } : {}
  };
}
function Mt(e) {
  return {
    ...e,
    landscapePool: [...e.landscapePool],
    cardLevels: { ...e.cardLevels },
    deck: e.deck.map(xe),
    hand: e.hand.map(xe),
    discard: e.discard.map(xe),
    lanes: e.lanes.map(yr),
    ...e.costMods ? { costMods: e.costMods.map((t) => ({ ...t })) } : {},
    ...e.blocks ? { blocks: e.blocks.map((t) => ({ ...t })) } : {}
  };
}
function Zt(e) {
  return {
    ...e,
    players: [Mt(e.players[0]), Mt(e.players[1])]
  };
}
function Ie(e, t) {
  const a = [];
  for (const r of e.players) {
    const n = t.heroes.byId.get(r.heroId);
    for (const o of n?.passive.statics ?? [])
      a.push({ owner: r.id, lane: null, iid: null, ability: o });
    for (const o of r.rules)
      for (const s of o.statics ?? []) a.push({ owner: r.id, lane: null, iid: null, ability: s });
    r.lanes.forEach((o, s) => {
      for (const i of [o.creature, o.building])
        if (i)
          for (const l of S(t.cards, i.cardId).statics ?? [])
            a.push({ owner: r.id, lane: s, iid: i.iid, ability: l });
    });
  }
  return a;
}
function De(e, t, a, r) {
  const n = t.ability;
  if (n.kind === "spellPower" || n.kind === "laneRarityCap") return !1;
  if (n.onLandscape) {
    const s = e.players[a.owner].lanes[r];
    if (!s || s.flipped || s.landscape !== n.onLandscape) return !1;
  }
  const o = t.owner === a.owner;
  switch (n.scope) {
    case "self":
      return t.iid === a.iid;
    case "lane":
      return o && t.lane === r && t.iid !== a.iid;
    case "adjacent":
      return o && t.lane !== null && Math.abs(t.lane - r) === 1;
    case "otherAllies":
      return o && t.iid !== a.iid;
    case "allAllies":
      return o;
    case "allEnemies":
      return !o;
  }
}
function gr(e, t, a, r) {
  let n = 0, o = 0, s = !1;
  for (const i of Ie(e, t))
    if (i.ability.kind === "swapStats" && De(e, i, a, r) && (s = !0), i.ability.kind === "stat" && De(e, i, a, r)) {
      const l = { owner: i.owner, lane: i.lane, iid: i.iid };
      n += Ce(e, t, i.ability.atk, l), o += Ce(e, t, i.ability.def, l);
    }
  return { atk: n, def: o, swap: s };
}
function hr(e, t, a, r) {
  const n = S(t.cards, a.cardId), o = n.type === "creature" ? { ...Qa(n) } : {};
  We(o, a.grantedKeywords);
  for (const s of Ie(e, t))
    s.ability.kind === "keyword" && De(e, s, a, r) && We(o, [s.ability.keyword]);
  return o;
}
function R(e, t, a, r, n) {
  return hr(e, t, a, r)[n] ?? 0;
}
function _r(e, t, a) {
  let r = 0;
  for (const n of Ie(e, t))
    n.owner === a && n.ability.kind === "spellPower" && (r += n.ability.amount);
  return r;
}
function ea(e, t, a, r, n) {
  let o = 0;
  for (const s of Ie(e, t))
    s.ability.kind === n && De(e, s, a, r) && (o += s.ability.amount);
  return o;
}
function kr(e, t, a, r) {
  return Math.max(0, ea(e, t, a, r, "armor"));
}
function br(e, t, a, r) {
  return ea(e, t, a, r, "floopCost");
}
function ta(e, t, a, r) {
  const n = S(t.cards, a.cardId);
  if (n.type !== "creature") throw new Error(`${a.cardId} is not a creature`);
  const o = a.token ? { atk: 0, def: 0 } : Wt(Xt(e, a.owner, a.cardId)), s = gr(e, t, a, r), i = Math.max(0, n.atk + o.atk + a.atkMod + a.tempAtk + (a.roundAtk ?? 0) + s.atk), l = Math.max(0, n.def + o.def + a.defMod + a.tempDef + (a.roundDef ?? 0) + s.def);
  return s.swap ? { atk: l, def: i } : { atk: i, def: l };
}
function Q(e, t, a, r) {
  return ta(e, t, a, r).atk;
}
function at(e, t, a, r) {
  return ta(e, t, a, r).def;
}
function Dt(e, t, a, r) {
  const o = e.players[a === 0 ? 1 : 0].lanes[r]?.building;
  let s = 1 / 0;
  if (!o) return s;
  for (const i of S(t.cards, o.cardId).statics ?? [])
    i.kind === "laneRarityCap" && (s = Math.min(s, i.maxStars));
  return s;
}
function ce(e, t, a, r) {
  return at(e, t, a, r) - a.damage;
}
er({ atk: Q, def: ce, maxDef: at });
function aa(e, t, a, r) {
  let n = 0;
  for (const o of e.players[t].costMods ?? [])
    o.turn !== e.turn || !a.includes(o.kind) || o.landscape !== void 0 && o.landscape !== r || (n += o.amount);
  return n;
}
function ra(e, t, a) {
  return Math.max(0, a.cost + aa(e, t, ["card", a.type], a.landscape));
}
function na(e, t, a, r) {
  const n = e.players[a].lanes[r]?.creature;
  if (!n) return null;
  const o = t.cards.byId.get(n.cardId);
  if (!o || o.type !== "creature" || !o.floop) return null;
  const s = aa(e, a, ["floop"], o.landscape) + br(e, t, n, r);
  return Math.max(0, o.floop.cost + s);
}
function oa(e, t) {
  return {
    s: e,
    ctx: t,
    events: [],
    rng: he.fromState(e.rng),
    queue: [],
    resolutions: 0,
    limitHit: !1
  };
}
function x(e) {
  return e.s.phase === "ended";
}
function E(e) {
  return e.limitHit ? !1 : (e.resolutions++, e.resolutions > e.ctx.balance.maxEffectResolutionsPerAction ? (e.limitHit = !0, e.queue.length = 0, e.events.push({ type: "effectLimitReached", limit: e.ctx.balance.maxEffectResolutionsPerAction }), !1) : !0);
}
function b(e, t, a) {
  return e.s.players[t].lanes[a]?.creature ?? null;
}
function wr(e, t, a) {
  const r = e.s.players[t].lanes.findIndex((n) => n.creature?.iid === a || n.building?.iid === a);
  return r < 0 ? null : r;
}
function Le(e, t) {
  if (t.iid !== null) {
    const a = wr(e, t.player, t.iid);
    if (a !== null) return a;
  }
  return t.lane;
}
function _e(e, t, a, r) {
  const n = e.s.players[t].lanes[a][r];
  return { player: t, kind: r, iid: n.iid, cardId: n.cardId, lane: a };
}
function U(e, t, a, r, n) {
  if (!t.cardId) return;
  const o = S(e.ctx.cards, t.cardId);
  for (const s of o.abilities ?? []) {
    if (s.trigger !== a) continue;
    const i = { source: t, trigger: a, effects: s.effects };
    s.condition && (i.condition = s.condition), r && (i.chosen = r), n && (i.subject = n), e.queue.push(i);
  }
}
function rt(e, t, a, r, n) {
  e.s.players[t].lanes[a]?.building && U(e, _e(e, t, a, "building"), r, void 0, n);
}
function ae(e, t, a, r) {
  const n = e.s.players[t], s = [...ke(e.ctx.heroes, n.heroId).passive.abilities ?? [], ...n.rules.flatMap((i) => i.abilities ?? [])];
  for (const i of s) {
    if (i.trigger !== a) continue;
    const l = {
      source: { player: t, kind: "hero", iid: null, cardId: null, lane: null },
      trigger: a,
      effects: i.effects
    };
    i.condition && (l.condition = i.condition), e.queue.push(l);
  }
  n.lanes.forEach((i, l) => {
    i.creature && i.creature.iid !== r && U(e, _e(e, t, l, "creature"), a), i.building && i.building.iid !== r && U(e, _e(e, t, l, "building"), a);
  });
}
function me(e, t, a) {
  x(e) || (e.s.phase = "ended", e.s.winner = t, e.s.endReason = a, e.queue.length = 0, e.events.push({ type: "gameEnded", winner: t, reason: a }));
}
function vr(e) {
  if (x(e)) return;
  const t = e.s.players[0].hp <= 0, a = e.s.players[1].hp <= 0;
  t && a ? me(e, "draw", "heroDefeated") : t ? me(e, 1, "heroDefeated") : a && me(e, 0, "heroDefeated");
}
function nt(e, t, a) {
  if (a <= 0) return;
  const r = e.s.players[t], n = Math.min(e.ctx.balance.ultimateChargeMax, r.ultimateCharge + a);
  n !== r.ultimateCharge && (r.ultimateCharge = n, e.events.push({ type: "ultimateCharge", player: t, charge: n }));
}
function Pe(e, t, a) {
  ke(e.ctx.heroes, e.s.players[t].heroId).ultimate.cooldown || nt(e, t, a * e.ctx.balance.ultimateChargePerDamage);
}
const sa = 20;
function re(e, t, a, r = e.ctx.balance.maxMp) {
  const n = e.s.players[t], o = Math.max(0, a < 0 ? n.mp + a : Math.max(n.mp, Math.min(r, n.mp + a)));
  if (o === n.mp) return;
  const s = o - n.mp;
  n.mp = o, e.events.push({ type: "mpChanged", player: t, mp: o, delta: s });
}
function ot(e, t, a, r) {
  if (a <= 0 || x(e)) return 0;
  const n = e.s.players[t];
  return n.hp = Math.max(0, n.hp - a), e.events.push({
    type: "damage",
    target: { kind: "hero", player: t },
    amount: a,
    sourcePlayer: r.player
  }), Pe(e, t, a), r.player !== t && Pe(e, r.player, a), vr(e), a;
}
function qe(e, t, a, r, n) {
  if (r <= 0 || x(e)) return 0;
  const o = b(e, t, a);
  return o ? (o.redirectUntil ?? 0) >= e.s.turn ? ot(e, t, r, n) : o.shield ? (o.shield = !1, e.events.push({ type: "shieldBroken", player: t, lane: a, iid: o.iid }), 0) : (o.damage += r, e.events.push({
    type: "damage",
    target: { kind: "creature", player: t, lane: a },
    amount: r,
    sourcePlayer: n.player
  }), Pe(e, t, r), n.player !== t && Pe(e, n.player, r), ce(e.s, e.ctx, o, a) <= 0 ? Ke(e, t, a, n.stealer) : U(e, _e(e, t, a, "creature"), "onDamaged"), M(e), r) : 0;
}
function ia(e, t, a, r) {
  return t.kind === "hero" ? ot(e, t.player, a, r) : t.kind === "creature" ? qe(e, t.player, t.lane, a, r) : 0;
}
function je(e, t, a) {
  if (a <= 0 || x(e)) return;
  if (t.kind === "hero") {
    const o = e.s.players[t.player], s = Math.min(a, o.maxHp - o.hp);
    if (s <= 0) return;
    o.hp += s, e.events.push({ type: "heal", target: t, amount: s });
    return;
  }
  if (t.kind !== "creature") return;
  const r = b(e, t.player, t.lane);
  if (!r) return;
  const n = Math.min(a, r.damage);
  n <= 0 || (r.damage -= n, e.events.push({ type: "heal", target: t, amount: n }));
}
function st(e, t, a, r) {
  const n = S(e.ctx.cards, r.cardId);
  n.type === "creature" && e.events.push({
    type: "statsChanged",
    player: t,
    lane: a,
    iid: r.iid,
    atk: Math.max(0, n.atk + r.atkMod + r.tempAtk),
    def: at(e.s, e.ctx, r, a)
  });
}
function xr(e, t, a, r, n, o) {
  if (x(e) || r === 0 && n === 0) return;
  const s = b(e, t, a);
  s && (o === !0 || o === "turn" ? (s.tempAtk += r, s.tempDef += n) : o === "round" ? (s.roundAtk = (s.roundAtk ?? 0) + r, s.roundDef = (s.roundDef ?? 0) + n) : (s.atkMod += r, s.defMod += n), st(e, t, a, s), M(e));
}
function M(e) {
  for (const t of e.s.players)
    for (let a = 0; a < t.lanes.length; a++) {
      const r = t.lanes[a].creature;
      r && ce(e.s, e.ctx, r, a) <= 0 && Ke(e, t.id, a);
    }
}
function it(e, t, a) {
  const r = e.s.players[t].lanes[a], n = r?.creature ?? null;
  return r && (r.creature = null), n;
}
function lt(e) {
  return { iid: e.iid, cardId: e.cardId, owner: e.owner };
}
function Ke(e, t, a, r) {
  const n = it(e, t, a);
  if (!n) return;
  e.events.push({ type: "creatureDestroyed", player: t, iid: n.iid, cardId: n.cardId, lane: a }), n.token || (r !== void 0 && r !== t ? (e.s.players[r].hand.push({ iid: n.iid, cardId: n.cardId, owner: r }), e.events.push({
    type: "cardRecovered",
    player: r,
    iid: n.iid,
    cardId: n.cardId,
    from: "discard",
    stolen: !0
  })) : e.s.players[t].discard.push(lt(n)));
  const o = { player: t, kind: "creature", iid: n.iid, cardId: n.cardId, lane: a };
  U(e, o, "onDestroy"), rt(e, t, a, "onLaneCreatureDestroyed", {
    player: t,
    iid: n.iid,
    cardId: n.cardId
  }), ae(e, t, "onAllyCreatureDestroyed", n.iid), ae(e, I(t), "onEnemyCreatureDestroyed"), M(e);
}
function Tr(e, t, a) {
  const r = it(e, t, a);
  r && (r.token || e.s.players[t].discard.push(lt(r)), e.events.push({ type: "cardReplaced", player: t, iid: r.iid, cardId: r.cardId, lane: a }), M(e));
}
function Ar(e, t, a) {
  const r = it(e, t, a);
  r && (r.token ? e.events.push({ type: "tokenVanished", player: t, iid: r.iid, lane: a }) : (e.s.players[t].hand.push(lt(r)), e.events.push({ type: "returnedToHand", player: t, iid: r.iid, cardId: r.cardId, lane: a })), M(e));
}
function la(e, t, a) {
  const r = S(e.ctx.cards, t.cardId), n = r.type === "creature" ? r.keywords : [];
  return {
    iid: t.iid,
    cardId: t.cardId,
    owner: t.owner,
    damage: 0,
    atkMod: 0,
    defMod: 0,
    tempAtk: 0,
    tempDef: 0,
    exhausted: !1,
    summoningSick: !0,
    movesThisTurn: 0,
    shield: n.includes("shield"),
    frozen: !1,
    poison: 0,
    stealth: n.includes("stealth"),
    grantedKeywords: [],
    token: a
  };
}
function Cr(e, t, a, r) {
  const n = e.s.players[t].lanes[a];
  if (!n || n.creature || n.flipped || n.landscape === null) return;
  const o = `c${e.s.nextInstanceId++}`;
  n.creature = la(e, { iid: o, cardId: r, owner: t }, !0), e.events.push({ type: "creatureSummoned", player: t, iid: o, cardId: r, lane: a, token: !0 }), M(e);
}
function Mr(e, t, a) {
  const r = e.s.players[t], n = r.lanes[a]?.creature;
  if (!n) return;
  const o = r.lanes.map((i, l) => ({ l: i, i: l })).filter(({ l: i, i: l }) => l !== a && !i.creature && !i.flipped && i.landscape !== null).map(({ i }) => i);
  if (o.length === 0) return;
  const s = e.rng.pick(o);
  r.lanes[a].creature = null, r.lanes[s].creature = n, e.events.push({ type: "creatureMoved", player: t, iid: n.iid, from: a, to: s, cost: 0 }), M(e);
}
function ca(e, t, a) {
  const r = e.s.players[t].lanes[a], n = r?.building ?? null;
  return r && (r.building = null), n;
}
function Pt(e, t, a) {
  const r = ca(e, t, a);
  r && (e.s.players[t].discard.push(r), e.events.push({ type: "buildingDestroyed", player: t, iid: r.iid, cardId: r.cardId, lane: a }), M(e));
}
function Dr(e, t, a) {
  const r = ca(e, t, a);
  r && (e.s.players[t].hand.push(r), e.events.push({ type: "buildingReturned", player: t, iid: r.iid, cardId: r.cardId, lane: a }), M(e));
}
function Pr(e, t, a) {
  const r = e.s.players[t], n = r.lanes[a]?.building;
  if (!n) return;
  const o = r.lanes.map((i, l) => ({ l: i, i: l })).filter(({ l: i, i: l }) => l !== a && !i.building && i.landscape !== null).map(({ i }) => i);
  if (o.length === 0) return;
  const s = e.rng.pick(o);
  r.lanes[a].building = null, r.lanes[s].building = n, e.events.push({ type: "buildingMoved", player: t, iid: n.iid, from: a, to: s }), M(e);
}
function qr(e, t, a) {
  const r = b(e, t, a);
  r && (r.damage = 0, r.atkMod = 0, r.defMod = 0, r.tempAtk = 0, r.tempDef = 0, r.roundAtk = 0, r.roundDef = 0, e.events.push({ type: "status", player: t, lane: a, iid: r.iid, status: "reset" }), st(e, t, a, r), M(e));
}
function Kr(e, t, a, r, n) {
  const o = b(e, t, a);
  if (!o) return;
  const s = n + o.damage;
  o.damage = 0, o.atkMod += n - r, o.defMod += r - s, e.events.push({ type: "status", player: t, lane: a, iid: o.iid, status: "swapped" }), st(e, t, a, o), M(e);
}
function ze(e, t, a, r, n) {
  const o = b(e, t, a);
  o && (r === "floopLocked" ? o.floopLock = Math.max(o.floopLock ?? 0, n) : r === "attackLocked" ? o.attackLock = Math.max(o.attackLock ?? 0, n) : o.redirectUntil = Math.max(o.redirectUntil ?? 0, n), e.events.push({ type: "status", player: t, lane: a, iid: o.iid, status: r }));
}
function Fr(e, t, a) {
  const r = b(e, t, a);
  !r || r.frozen || (r.frozen = !0, e.events.push({ type: "frozen", player: t, lane: a, iid: r.iid }));
}
function da(e, t, a, r) {
  const n = b(e, t, a);
  !n || r <= 0 || (n.poison += r, e.events.push({ type: "poisoned", player: t, lane: a, iid: n.iid, poison: n.poison }));
}
function ua(e, t, a) {
  const r = b(e, t, a);
  !r || r.shield || (r.shield = !0, e.events.push({ type: "shieldGained", player: t, lane: a, iid: r.iid }));
}
function Sr(e, t, a, r) {
  const n = b(e, t, a);
  if (n) {
    if (r === "shield") return ua(e, t, a);
    r === "stealth" ? n.stealth = !0 : n.grantedKeywords.push(r), e.events.push({ type: "keywordGranted", player: t, lane: a, iid: n.iid, keyword: r });
  }
}
function qt(e, t, a, r, n) {
  if (n <= 0 || x(e)) return;
  const o = b(e, t, a);
  if (!o) return;
  R(e.s, e.ctx, o, a, "lifesteal") > 0 && je(e, { kind: "hero", player: t }, n);
  const s = R(e.s, e.ctx, o, a, "poison");
  s > 0 && r.kind === "creature" && da(e, r.player, r.lane, s);
}
function Er(e, t, a) {
  const r = e.s.players[t].lanes[a];
  !r || r.landscape === null || (r.flipped = !0, r.flipTimer = 1, e.events.push({ type: "landscapeFlipped", player: t, lane: a }), M(e));
}
function pa(e, t, a) {
  const r = e.s.players[t].lanes[a];
  !r || !r.flipped || (r.flipped = !1, r.flipTimer = null, e.events.push({ type: "landscapeRestored", player: t, lane: a }), M(e));
}
function Hr(e, t, a, r) {
  const n = e.s.players[t].lanes[a];
  if (!n || n.landscape === null || n.landscape === r) return;
  const o = n.landscape;
  n.landscape = r, e.events.push({ type: "landscapeConverted", player: t, lane: a, from: o, to: r }), M(e);
}
function be(e, t, a) {
  const r = e.s.players[t];
  for (let n = 0; n < a && !x(e); n++) {
    const o = r.deck.shift();
    if (!o) {
      const s = e.ctx.balance.fatigueDamage;
      e.events.push({ type: "fatigue", player: t, damage: s }), ot(e, t, s, { player: t });
      continue;
    }
    r.hand.push(o), e.events.push({ type: "cardDrawn", player: t, iid: o.iid, cardId: o.cardId });
  }
}
function Fe(e, t, a) {
  const r = e.s.players[t], n = r.hand.findIndex((s) => s.iid === a);
  if (n < 0) return;
  const [o] = r.hand.splice(n, 1);
  r.discard.push(o), e.events.push({ type: "cardDiscarded", player: t, iid: o.iid, cardId: o.cardId, from: "hand" });
}
function Kt(e, t, a) {
  const r = e.s.players[t];
  for (const n of a) {
    const o = r.discard.findIndex((i) => i.iid === n);
    if (o < 0) continue;
    const [s] = r.discard.splice(o, 1);
    r.hand.push(s), e.events.push({ type: "cardRecovered", player: t, iid: s.iid, cardId: s.cardId, from: "discard" });
  }
}
function Ir(e, t, a) {
  const r = e.s.players[t], n = r.deck.findIndex((s) => s.iid === a);
  if (n < 0) return;
  const [o] = r.deck.splice(n, 1);
  r.hand.push(o), e.events.push({ type: "cardRecovered", player: t, iid: o.iid, cardId: o.cardId, from: "deck" });
}
function Lr(e, t, a) {
  const r = e.s.players[t], n = r.hand.length;
  r.deck = e.rng.shuffle([...r.deck, ...r.hand]), r.hand = [], e.events.push({ type: "handCycled", player: t, count: n }), be(e, t, a);
}
function jr(e, t) {
  for (const a of [...e.s.players[t].hand]) Fe(e, t, a.iid);
}
function $r(e, t, a) {
  const r = e.s.players[t];
  for (let n = 0; n < a && r.hand.length > 0; n++)
    Fe(e, t, e.rng.pick(r.hand).iid);
}
function Gr(e, t, a) {
  return t.exhausted || t.frozen || (t.attackLock ?? 0) >= e.s.turn || t.summoningSick && R(e.s, e.ctx, t, a, "rush") === 0 ? !1 : Q(e.s, e.ctx, t, a) > 0;
}
function fa(e, t) {
  if (x(e)) return;
  const a = e.s;
  if (a.turn++, a.turn > e.ctx.balance.maxTurns) {
    me(e, "draw", "turnLimit");
    return;
  }
  a.activePlayer = t;
  const r = a.players[t];
  r.turnsTaken++, e.events.push({ type: "phase", player: t, phase: "start" });
  const n = Math.max(0, mr(r.turnsTaken, e.ctx) - r.mpPenalty);
  r.mpPenalty = 0, re(e, t, n - r.mp, sa), r.extraDrawsThisTurn = 0, r.floopsThisTurn = 0, r.costMods?.length && (r.costMods = r.costMods.filter((i) => i.turn >= a.turn)), r.blocks?.length && (r.blocks = r.blocks.filter((i) => i.turn >= a.turn));
  for (const i of r.lanes) {
    if (!i.creature) continue;
    const l = i.creature;
    l.exhausted = !1, l.summoningSick = !1, l.movesThisTurn = 0, (l.roundAtk || l.roundDef) && (l.roundAtk = 0, l.roundDef = 0);
  }
  e.events.push({ type: "turnStarted", player: t, turn: a.turn, mp: r.mp }), M(e);
  const o = ke(e.ctx.heroes, r.heroId).ultimate.cooldown;
  o && nt(e, t, Math.ceil(e.ctx.balance.ultimateChargeMax / o));
  for (let i = 0; i < r.lanes.length && !x(e); i++) {
    const l = b(e, t, i);
    if (!l) continue;
    if (l.poison > 0) {
      const c = l.poison;
      qe(e, t, i, c, { player: I(t) });
      const u = b(e, t, i);
      u && u.iid === l.iid && (u.poison = Math.max(0, u.poison - 1));
    }
    const d = b(e, t, i);
    if (d && d.iid === l.iid) {
      const c = R(e.s, e.ctx, d, i, "regenerate");
      c > 0 && je(e, { kind: "creature", player: t, lane: i }, c);
    }
  }
  G(e), ae(e, t, "startOfTurn"), G(e), !(x(e) || (e.events.push({ type: "phase", player: t, phase: "draw" }), e.ctx.balance.firstPlayerSkipsFirstDraw && t === a.firstPlayer && r.turnsTaken === 1 || be(e, t, 1), x(e))) && e.events.push({ type: "phase", player: t, phase: "main" });
}
function Br(e, t, a, r) {
  const n = I(t);
  if (b(e, n, a)) return { kind: "creature", player: n, lane: a };
  if (!r)
    for (const o of [a - 1, a + 1]) {
      const s = b(e, n, o);
      if (s && R(e.s, e.ctx, s, o, "guard") > 0)
        return { kind: "creature", player: n, lane: o };
    }
  return { kind: "hero", player: n };
}
function ma(e, t, a, r = !1, n = "hit") {
  const o = (m) => r ? Q(e.s, e.ctx, m, a) > 0 : Gr(e, m, a), s = b(e, t, a);
  if (!s || !o(s)) return;
  const i = s.iid;
  s.stealth = !1, U(e, _e(e, t, a, "creature"), "onAttack"), G(e);
  const l = b(e, t, a);
  if (x(e) || !l || l.iid !== i || !o(l)) return;
  const d = R(e.s, e.ctx, l, a, "ranged") > 0, c = Br(e, t, a, d);
  if (e.events.push(
    n === "hit" ? { type: "attack", player: t, lane: a, iid: i, target: c } : { type: "attack", player: t, lane: a, iid: i, target: c, roll: n }
  ), n === "miss") {
    G(e);
    return;
  }
  let u = 0, w = !1, g = null;
  if (c.kind === "creature") {
    const m = b(e, c.player, c.lane);
    g = m.iid, u = R(e.s, e.ctx, m, c.lane, "thorns"), w = R(e.s, e.ctx, m, c.lane, "counter") > 0;
  }
  let f = Q(e.s, e.ctx, l, a) * (n === "perfect" ? 2 : 1);
  if (c.kind === "creature") {
    const m = b(e, c.player, c.lane);
    f = Math.max(0, f - kr(e.s, e.ctx, m, c.lane));
  }
  const T = ia(e, c, f, {
    player: t
  });
  if (qt(e, t, a, c, T), c.kind === "creature" && g && b(e, c.player, c.lane)?.iid !== g) {
    const m = b(e, t, a), D = m && m.iid === i ? R(e.s, e.ctx, m, a, "feast") : 0;
    D > 0 && ce(e.s, e.ctx, m, a) > 0 && je(e, { kind: "creature", player: t, lane: a }, D);
  }
  if (c.kind === "creature" && !d && !x(e)) {
    const m = c.player;
    u > 0 && b(e, t, a)?.iid === i && qe(e, t, a, u, { player: m });
    const D = b(e, m, c.lane);
    if (w && D && D.iid === g && b(e, t, a)?.iid === i) {
      const A = Q(e.s, e.ctx, D, c.lane), $ = qe(e, t, a, A, {
        player: m,
        attacker: { iid: D.iid }
      });
      qt(e, m, c.lane, { kind: "creature", player: t, lane: a }, $);
    }
  }
  G(e);
}
function zr(e, t, a = []) {
  e.events.push({ type: "phase", player: t, phase: "combat" });
  const r = e.s.players[t].lanes.length;
  for (let n = 0; n < r && !x(e); n++)
    ma(e, t, n, !1, a[n] ?? "hit");
}
function Rr(e, t, a = []) {
  if (e.events.push({ type: "phase", player: t, phase: "end" }), ae(e, t, "endOfTurn"), G(e), x(e)) return;
  const r = e.s.players[t];
  r.lanes.forEach((o, s) => {
    o.creature?.frozen && (o.creature.frozen = !1, e.events.push({ type: "thawed", player: t, lane: s, iid: o.creature.iid })), o.flipped && o.flipTimer !== null && (o.flipTimer--, o.flipTimer <= 0 && pa(e, t, s));
  });
  for (const o of e.s.players)
    for (const s of o.lanes)
      s.creature && (s.creature.tempAtk = 0, s.creature.tempDef = 0);
  if (M(e), G(e), x(e)) return;
  const n = e.ctx.balance.maxHandSize;
  for (const o of a) {
    if (r.hand.length <= n) break;
    Fe(e, t, o);
  }
  for (; r.hand.length > n; ) Fe(e, t, r.hand[r.hand.length - 1].iid);
  re(e, t, -r.mp);
}
function Or(e, t, a, r) {
  zr(e, t, r), !x(e) && (Rr(e, t, a), !x(e) && (e.events.push({ type: "turnEnded", player: t }), fa(e, I(t))));
}
function ya(e, t, a, r, n, o) {
  if (r.player !== 0 && r.player !== 1 || r.kind === "hero") return !1;
  const s = e.players[r.player].lanes[r.lane], i = r.player !== a;
  switch (t) {
    case "chosenCreature":
    case "chosenEnemyCreature":
    case "chosenAllyCreature":
      return r.kind !== "creature" || !s?.creature || i && s.creature.stealth || o && n && !Ut(n, s.creature, o) ? !1 : t === "chosenEnemyCreature" ? i : t === "chosenAllyCreature" ? !i : !0;
    case "chosenEnemyLandscape":
    case "chosenAllyLandscape":
      return r.kind !== "landscape" || !s || s.landscape === null ? !1 : t === "chosenEnemyLandscape" ? i : !i;
    case "chosenEnemyBuilding":
    case "chosenAllyBuilding":
      return r.kind !== "building" || !s?.building ? !1 : t === "chosenEnemyBuilding" ? i : !i;
    default:
      return !1;
  }
}
function Nr(e) {
  return e.endsWith("Landscape") ? "landscape" : e.endsWith("Building") ? "building" : "creature";
}
function Ur(e, t, a, r, n) {
  const o = [], s = Nr(t);
  for (const i of e.players)
    for (let l = 0; l < i.lanes.length; l++) {
      const d = { kind: s, player: i.id, lane: l };
      ya(e, t, a, d, r, n) && o.push(d);
    }
  return o;
}
function ga(e, t, a, r) {
  const n = Ze(a);
  return !n || !("target" in n) ? [] : Ur(e, n.target, r, t, n.filter);
}
function Wr(e, t, a, r, n) {
  const o = Ze(a);
  return !o || !("target" in o) ? !1 : ya(e, o.target, r, n, t, o.filter);
}
function ct(e, t, a) {
  const r = e.s.players[a.player], n = e.s.players[I(a.player)], o = (s) => s === "self" ? r : n;
  switch (t.type) {
    case "landscapeCount":
      return Jt(r, t.landscape) >= t.atLeast;
    case "opposingLaneEmpty":
    case "opposingLaneOccupied": {
      const s = Le(e, a);
      if (s === null) return !1;
      const i = !!n.lanes[s]?.creature;
      return t.type === "opposingLaneOccupied" ? i : !i;
    }
    case "heroHpAtMost":
      return o(t.who).hp <= t.value;
    case "creatureCountAtLeast":
      return o(t.who).lanes.filter((s) => s.creature).length >= t.value;
    case "creatureCountAtMost":
      return o(t.who).lanes.filter((s) => s.creature).length <= t.value;
    case "handSizeAtMost":
      return r.hand.length <= t.value;
    case "handSizeAtLeast":
      return r.hand.length >= t.value;
  }
}
function z(e, t, a) {
  const r = [];
  return e.players[t].lanes.forEach((n, o) => {
    n.creature && n.creature.iid !== a && r.push({ kind: "creature", player: t, lane: o });
  }), r;
}
function we(e, t) {
  const a = [];
  return e.players[t].lanes.forEach((r, n) => {
    r.building && a.push({ kind: "building", player: t, lane: n });
  }), a;
}
function Re(e, t, a) {
  const r = [];
  return e.players[t].lanes.forEach((n, o) => {
    n.landscape !== null && a(n.flipped) && r.push({ kind: "landscape", player: t, lane: o });
  }), r;
}
function N(e, t, a) {
  return a === null || !e.players[t].lanes[a]?.creature ? [] : [{ kind: "creature", player: t, lane: a }];
}
function Ft(e, t, a) {
  return a === null || !e.players[t].lanes[a]?.building ? [] : [{ kind: "building", player: t, lane: a }];
}
function Yr(e, t) {
  let a = null, r = 1 / 0;
  for (const n of z(e.s, t)) {
    if (n.kind !== "creature") continue;
    const o = e.s.players[t].lanes[n.lane].creature, i = S(e.ctx.cards, o.cardId).cost * 1e3 + Q(e.s, e.ctx, o, n.lane) + Math.max(0, ce(e.s, e.ctx, o, n.lane));
    i < r && (r = i, a = n);
  }
  return a ? [a] : [];
}
function Vr(e, t, a, r, n = 1) {
  const o = e.s, s = a.player, i = I(s), l = Le(e, a);
  switch (t) {
    case "self":
      return l === null || a.iid === null ? [] : o.players[s].lanes[l]?.creature?.iid === a.iid ? [{ kind: "creature", player: s, lane: l }] : [];
    case "opposingCreature":
      return N(o, i, l);
    case "laneCreature":
      return N(o, s, l);
    case "adjacentAllies":
      return l === null ? [] : [...N(o, s, l - 1), ...N(o, s, l + 1)];
    case "adjacentEnemies":
      return l === null ? [] : [...N(o, i, l - 1), ...N(o, i, l + 1)];
    case "allAllyCreatures":
      return z(o, s);
    case "otherAllyCreatures":
      return z(o, s, a.iid);
    case "allEnemyCreatures":
      return z(o, i);
    case "allCreatures":
      return [...z(o, s), ...z(o, i)];
    case "randomEnemyCreature":
      return e.rng.sample(z(o, i), n);
    case "randomAllyCreature":
      return e.rng.sample(z(o, s), n);
    case "randomCreature":
      return e.rng.sample([...z(o, s), ...z(o, i)], n);
    case "weakestAllyCreature":
      return Yr(e, s);
    case "chosenCreature":
    case "chosenEnemyCreature":
    case "chosenAllyCreature":
    case "chosenEnemyLandscape":
    case "chosenAllyLandscape":
    case "chosenEnemyBuilding":
    case "chosenAllyBuilding":
      return !r || r.kind === "hero" ? [] : r.kind === "creature" ? N(o, r.player, r.lane) : r.kind === "building" ? Ft(o, r.player, r.lane) : o.players[r.player].lanes[r.lane]?.landscape != null ? [r] : [];
    case "ownHero":
      return [{ kind: "hero", player: s }];
    case "enemyHero":
      return [{ kind: "hero", player: i }];
    case "bothHeroes":
      return [
        { kind: "hero", player: s },
        { kind: "hero", player: i }
      ];
    case "thisLandscape":
      return l === null ? [] : [{ kind: "landscape", player: s, lane: l }];
    case "opposingLandscape":
      return l === null ? [] : [{ kind: "landscape", player: i, lane: l }];
    case "randomEnemyLandscape":
      return e.rng.sample(
        Re(o, i, (d) => !d),
        n
      );
    case "allAllyLandscapes":
      return Re(o, s, () => !0);
    case "allEnemyLandscapes":
      return Re(o, i, () => !0);
    case "thisBuilding":
      return l === null || a.iid === null ? [] : o.players[s].lanes[l]?.building?.iid === a.iid ? [{ kind: "building", player: s, lane: l }] : [];
    case "opposingBuilding":
      return Ft(o, i, l);
    case "allEnemyBuildings":
      return we(o, i);
    case "allAllyBuildings":
      return we(o, s);
    case "allBuildings":
      return [...we(o, s), ...we(o, i)];
  }
}
function Qr(e, t, a, r) {
  if (!("target" in t)) return [];
  const n = "count" in t ? t.count ?? 1 : 1;
  let o = Vr(e, t.target, a, r, n);
  if (t.filter && (o = o.filter((s) => {
    if (s.kind !== "creature") return !0;
    const i = e.s.players[s.player].lanes[s.lane]?.creature;
    return !!i && Ut(e.ctx, i, t.filter);
  })), t.splash) {
    const s = [], i = /* @__PURE__ */ new Set(), l = (d) => {
      const c = `${d.kind}:${d.player}:${"lane" in d ? d.lane : -1}`;
      i.has(c) || (i.add(c), s.push(d));
    };
    for (const d of o) {
      if (l(d), d.kind === "creature") for (const c of N(e.s, d.player, d.lane - 1)) l(c);
      if (d.kind === "creature") for (const c of N(e.s, d.player, d.lane + 1)) l(c);
    }
    o = s;
  }
  return o;
}
function Jr(e, t, a, r) {
  const n = e.s.players[t.player], o = (l) => {
    const d = n.lanes[l];
    return !!d && !d.creature && !d.flipped && d.landscape !== null;
  }, s = Le(e, t), i = n.lanes.map((l, d) => d).filter(o);
  switch (a) {
    case "sourceLane":
      return s !== null && o(s) ? [s] : [];
    case "adjacentEmptyLanes":
      return s === null ? [] : [s - 1, s + 1].filter(o);
    case "randomEmptyLane":
      return e.rng.sample(i, r);
    case "allEmptyLanes":
      return i;
    default:
      return [];
  }
}
function Oe(e, t) {
  return t.kind === "hero" || !t.cardId ? 0 : Wt(Xt(e.s, t.player, t.cardId)).ability;
}
function ha(e, t, a) {
  return {
    owner: t.player,
    lane: Le(e, t),
    iid: t.iid,
    target: a && a.kind === "creature" ? { player: a.player, lane: a.lane } : null
  };
}
function Xr(e, t, a) {
  const r = ga(e.s, e.ctx, t, a);
  if (r.length === 0) return;
  const n = (o) => {
    if (o.kind !== "creature") return o.player === a ? 0 : 1;
    const s = e.s.players[o.player].lanes[o.lane].creature;
    return o.player === a ? s.damage : 1e3 + Q(e.s, e.ctx, s, o.lane);
  };
  return [...r].sort((o, s) => n(s) - n(o))[0];
}
function Zr(e, t, a, r) {
  const n = a.kind === "hero" ? -1 : a.lane, o = (s) => Ce(e.s, e.ctx, s, ha(e, r, a));
  switch (t.type) {
    case "damage": {
      const s = (r.kind === "spell" ? _r(e.s, e.ctx, r.player) : 0) + Oe(e, r), i = o(t.amount);
      if (i <= 0) break;
      ia(e, a, i + s, {
        player: r.player,
        ...t.stealOnKill ? { stealer: r.player } : {}
      });
      break;
    }
    case "heal": {
      const s = o(t.amount);
      s > 0 && je(e, a, s + Oe(e, r));
      break;
    }
    case "buff": {
      const s = t.duration ?? (t.temporary ? "turn" : "permanent");
      xr(e, a.player, n, o(t.atk), o(t.def), s);
      break;
    }
    case "destroy":
      a.kind === "creature" && Ke(e, a.player, n);
      break;
    case "returnToHand":
      Ar(e, a.player, n);
      break;
    case "move":
      Mr(e, a.player, n);
      break;
    case "freeze":
      Fr(e, a.player, n);
      break;
    case "poison":
      da(e, a.player, n, t.amount + Oe(e, r));
      break;
    case "shield":
      ua(e, a.player, n);
      break;
    case "grantKeyword":
      Sr(e, a.player, n, t.keyword);
      break;
    case "flip":
      Er(e, a.player, n);
      break;
    case "convert":
      Hr(e, a.player, n, t.to);
      break;
    case "restore":
      pa(e, a.player, n);
      break;
    case "reset":
      qr(e, a.player, n);
      break;
    case "swapStats": {
      const s = e.s.players[a.player].lanes[n]?.creature;
      if (s) {
        const i = Math.max(0, ce(e.s, e.ctx, s, n));
        Kr(e, a.player, n, Q(e.s, e.ctx, s, n), i);
      }
      break;
    }
    case "lockFloop":
      ze(e, a.player, n, "floopLocked", ie(e.s, a.player));
      break;
    case "lockAttack":
      ze(e, a.player, n, "attackLocked", ie(e.s, a.player));
      break;
    case "redirect":
      ze(e, a.player, n, "redirect", ie(e.s, r.player));
      break;
    case "forceAttack":
      ma(e, a.player, n, !0);
      break;
    case "activateFloop": {
      const s = e.s.players[a.player].lanes[n]?.creature;
      if (!s) break;
      const i = S(e.ctx.cards, s.cardId);
      if (i.type !== "creature" || !i.floop || i.floop.effects.some((d) => d.type === "activateFloop")) break;
      const l = Xr(e, i.floop.effects, a.player);
      e.queue.push({
        source: { player: a.player, kind: "creature", iid: s.iid, cardId: s.cardId, lane: n },
        trigger: "floop",
        effects: i.floop.effects,
        ...l ? { chosen: l } : {}
      });
      break;
    }
    case "seal": {
      const s = e.s.players[a.player].lanes[n];
      if (!s) break;
      s.sealedUntil = Math.max(s.sealedUntil ?? 0, ie(e.s, a.player)), e.events.push({ type: "laneSealed", player: a.player, lane: n });
      break;
    }
    case "wipeLane":
      for (const s of [0, 1])
        e.s.players[s].lanes[n]?.creature && Ke(e, s, n), e.s.players[s].lanes[n]?.building && Pt(e, s, n);
      break;
    case "destroyBuilding":
      Pt(e, a.player, n);
      break;
    case "returnBuilding":
      Dr(e, a.player, n);
      break;
    case "moveBuilding":
      Pr(e, a.player, n);
      break;
  }
}
function en(e, t) {
  const a = (r) => {
    const n = S(e.ctx.cards, r.cardId);
    return n.cost * 10 + et(n);
  };
  return [...t].sort((r, n) => a(n) - a(r));
}
function tn(e, t, a) {
  const r = a.source, n = r.player;
  if (t.when && !ct(e, t.when, r)) return;
  const o = (s) => Ce(e.s, e.ctx, s, ha(e, r));
  switch (t.type) {
    case "draw": {
      if (!E(e)) return;
      const s = o(t.amount);
      s > 0 && be(e, t.who === "enemy" ? I(n) : n, s);
      return;
    }
    case "discard":
      if (!E(e)) return;
      $r(e, t.who === "self" ? n : I(n), t.amount);
      return;
    case "gainMp": {
      if (!E(e)) return;
      const s = o(t.amount);
      if (s <= 0) return;
      if (t.nextTurn) {
        const i = e.s.players[n];
        i.mpPenalty -= s, e.events.push({ type: "mpPenalty", player: n, amount: i.mpPenalty });
      } else re(e, n, s, sa);
      return;
    }
    case "loseMp": {
      if (!E(e)) return;
      const s = I(n);
      e.s.players[s].mpPenalty += t.amount, e.events.push({ type: "mpPenalty", player: s, amount: e.s.players[s].mpPenalty });
      return;
    }
    case "chargeUltimate":
      if (!E(e)) return;
      nt(e, n, t.amount);
      return;
    case "summon":
      for (const s of Jr(e, r, t.where, t.count ?? 1)) {
        if (x(e) || !E(e)) return;
        Cr(e, n, s, t.cardId);
      }
      return;
    case "costMod": {
      if (!E(e)) return;
      const s = t.who === "self" ? n : I(n), i = t.who === "self" ? e.s.turn : ie(e.s, s), l = e.s.players[s];
      l.costMods = [
        ...(l.costMods ?? []).filter((d) => d.turn >= e.s.turn),
        {
          kind: t.kind,
          amount: t.amount,
          turn: i,
          ...t.landscape !== void 0 ? { landscape: t.landscape } : {}
        }
      ], e.events.push({ type: "costChanged", player: s, kind: t.kind, amount: t.amount });
      return;
    }
    case "block": {
      if (!E(e)) return;
      const s = I(n), i = e.s.players[s];
      i.blocks = [
        ...(i.blocks ?? []).filter((l) => l.turn >= e.s.turn),
        { what: t.what, turn: ie(e.s, s) }
      ], e.events.push({ type: "playBlocked", player: s, what: t.what });
      return;
    }
    case "recover": {
      if (!E(e)) return;
      const s = e.s.players[n].discard.filter(
        (l) => !t.cardType || S(e.ctx.cards, l.cardId).type === t.cardType
      ), i = t.pick === "random" ? e.rng.sample(s, t.count ?? 1) : en(e, s).slice(0, t.count ?? 1);
      Kt(
        e,
        n,
        i.map((l) => l.iid)
      );
      return;
    }
    case "recoverDestroyed": {
      if (!E(e) || !a.subject) return;
      Kt(e, a.subject.player, [a.subject.iid]);
      return;
    }
    case "tutor": {
      if (!E(e)) return;
      const s = e.s.players[n].deck.filter(
        (i) => !t.cardType || S(e.ctx.cards, i.cardId).type === t.cardType
      );
      s.length > 0 && Ir(e, n, e.rng.pick(s).iid);
      return;
    }
    case "cycleHand":
      if (!E(e)) return;
      Lr(e, n, t.draw);
      return;
    case "discardHand":
      if (!E(e)) return;
      jr(e, n);
      return;
    default:
      for (const s of Qr(e, t, r, a.chosen)) {
        if (x(e) || !E(e)) return;
        s.kind === "creature" && !e.s.players[s.player].lanes[s.lane]?.creature || s.kind === "building" && !e.s.players[s.player].lanes[s.lane]?.building || Zr(e, t, s, r);
      }
  }
}
function an(e, t) {
  if (!(t.condition && !ct(e, t.condition, t.source))) {
    t.trigger !== "spell" && t.trigger !== "floop" && t.trigger !== "ultimate" && e.events.push({
      type: "triggered",
      player: t.source.player,
      trigger: t.trigger,
      cardId: t.source.cardId,
      iid: t.source.iid
    });
    for (const a of t.effects) {
      if (x(e) || e.limitHit) return;
      tn(e, a, t);
    }
  }
}
function G(e) {
  for (; e.queue.length > 0 && !x(e); ) {
    if (!E(e)) return;
    an(e, e.queue.shift());
  }
  e.queue.length = 0;
}
const rn = ["miss", "hit", "perfect"];
function p(e, t) {
  return { code: e, message: t };
}
function _a(e) {
  return e === 0 || e === 1;
}
function nn(e) {
  if (typeof e != "object" || e === null) return !1;
  const t = e;
  return _a(t.player) ? t.kind === "hero" ? !0 : (t.kind === "creature" || t.kind === "landscape" || t.kind === "building") && typeof t.lane == "number" && Number.isInteger(t.lane) : !1;
}
function Se(e, t, a, r, n, o) {
  return Za(a) ? n === void 0 ? ga(e, t, a, r).length > 0 ? p("TARGET_REQUIRED", "Choose a target.") : o ? p("NO_VALID_TARGET", "There is no valid target.") : null : !nn(n) || !Wr(e, t, a, r, n) ? p("INVALID_TARGET", "That is not a valid target.") : null : n === void 0 ? null : p("TARGET_NOT_ALLOWED", "This does not take a target.");
}
function on(e, t, a) {
  if (e.phase !== "arrange")
    return p("WRONG_PHASE", "Landscapes can only be arranged before the match.");
  const r = e.players[t.player];
  if (r.arranged) return p("ALREADY_DONE", "Landscapes are already arranged.");
  if (!Array.isArray(t.order) || t.order.length !== a.balance.laneCount)
    return p("INVALID_ARRANGEMENT", `Place exactly ${a.balance.laneCount} landscapes.`);
  const n = [...r.landscapePool].sort(), o = [...t.order].sort();
  return n.some((s, i) => s !== o[i]) ? p(
    "INVALID_ARRANGEMENT",
    "The arrangement must use exactly the landscapes in your deck."
  ) : null;
}
function sn(e, t, a) {
  if (e.phase !== "mulligan")
    return p("WRONG_PHASE", "Mulligans happen before the first turn.");
  const r = e.players[t.player];
  return r.mulliganDone ? p("ALREADY_DONE", "You already kept or mulliganed your hand.") : Array.isArray(t.iids) ? t.iids.length > 0 && r.mulligansUsed >= a.balance.mulligansAllowed ? p("INVALID_MULLIGAN", "No mulligans left.") : new Set(t.iids).size !== t.iids.length ? p("INVALID_MULLIGAN", "A card is listed twice.") : t.iids.every((n) => r.hand.some((o) => o.iid === n)) ? null : p("CARD_NOT_IN_HAND", "You can only mulligan cards in your hand.") : p("INVALID_MULLIGAN", "Mulligan must list cards.");
}
function ln(e, t, a) {
  const r = e.players[t.player], n = r.hand.find((d) => d.iid === t.iid);
  if (!n) return p("CARD_NOT_IN_HAND", "That card is not in your hand.");
  const o = a.cards.byId.get(n.cardId);
  if (!o) return p("UNKNOWN_CARD", `Unknown card ${n.cardId}.`);
  const s = fr(r, o.requirements);
  if (s.length > 0) {
    const d = s[0];
    return p("REQUIREMENT_NOT_MET", `${o.name} needs ${d.count} ${d.landscape} landscape(s).`);
  }
  const i = ra(e, t.player, o);
  if (i > r.mp) return p("NOT_ENOUGH_MP", `${o.name} costs ${i} MP; you have ${r.mp}.`);
  if ((r.blocks ?? []).some((d) => d.what === o.type && d.turn === e.turn))
    return p("BLOCKED", `You cannot play ${o.type}s this turn.`);
  if (o.type === "spell")
    return t.lane !== void 0 ? p("LANE_NOT_ALLOWED", "Spells are not played into a lane.") : Se(e, a, o.effects, t.player, t.target, !0);
  if (t.lane === void 0) return p("INVALID_LANE", `Choose a lane for ${o.name}.`);
  if (!Me(e, t.lane)) return p("INVALID_LANE", "That lane does not exist.");
  const l = r.lanes[t.lane];
  if (l.landscape === null) return p("INVALID_LANE", "That lane has no landscape.");
  if (l.flipped) return p("LANE_FLIPPED", "You cannot play cards onto a flipped landscape.");
  if ((l.sealedUntil ?? 0) >= e.turn)
    return p("LANE_SEALED", "Nothing can be played there this turn.");
  if (o.type === "creature" && et(o) > Dt(e, a, t.player, t.lane)) {
    const d = Dt(e, a, t.player, t.lane);
    return p(
      "RARITY_CAP",
      `Only creatures of ${d} star${d === 1 ? "" : "s"} or less can go there.`
    );
  }
  return Se(e, a, Xa(o), t.player, t.target, !1);
}
function cn(e, t, a) {
  if (!Me(e, t.lane)) return p("INVALID_LANE", "That lane does not exist.");
  const r = e.players[t.player], n = r.lanes[t.lane].creature;
  if (!n) return p("NO_CREATURE", "There is no creature in that lane.");
  const o = a.cards.byId.get(n.cardId);
  if (!o || o.type !== "creature" || !o.floop)
    return p("NO_FLOOP", "That creature has no floop ability.");
  if (n.exhausted) return p("EXHAUSTED", "That creature is already exhausted.");
  if (n.frozen) return p("FROZEN", "Frozen creatures cannot floop.");
  if ((n.floopLock ?? 0) >= e.turn)
    return p("FLOOP_LOCKED", "That creature cannot floop this turn.");
  const s = na(e, a, t.player, t.lane);
  if (s > r.mp)
    return p("NOT_ENOUGH_MP", `Flooping costs ${s} MP; you have ${r.mp}.`);
  if (o.floop.condition) {
    const i = oa(e, a), l = { player: t.player, iid: n.iid, cardId: n.cardId, lane: t.lane };
    if (!ct(i, o.floop.condition, l))
      return p("CONDITION_NOT_MET", "This floop's condition is not met.");
  }
  return Se(e, a, o.floop.effects, t.player, t.target, !0);
}
function ka(e, t, a) {
  const r = e.players[t.player].lanes[t.from]?.creature;
  return r && R(e, a, r, t.from, "swift") > 0 ? 0 : a.balance.moveCost;
}
function dn(e, t, a) {
  if (!Me(e, t.from) || !Me(e, t.to))
    return p("INVALID_LANE", "That lane does not exist.");
  if (t.from === t.to) return p("INVALID_LANE", "Choose a different lane.");
  const r = e.players[t.player], n = r.lanes[t.from].creature;
  if (!n) return p("NO_CREATURE", "There is no creature in that lane.");
  const o = r.lanes[t.to];
  if (o.creature) return p("LANE_OCCUPIED", "Creatures can only move to an empty lane.");
  if (o.landscape === null || o.flipped)
    return p("LANE_FLIPPED", "Creatures cannot move onto a flipped landscape.");
  if (n.movesThisTurn >= a.balance.maxMovesPerCreaturePerTurn)
    return p("MOVE_LIMIT", "That creature already moved this turn.");
  const s = ka(e, t, a);
  return s > r.mp ? p("NOT_ENOUGH_MP", `Moving costs ${s} MP; you have ${r.mp}.`) : null;
}
function un(e, t, a) {
  const r = e.players[t];
  return r.extraDrawsThisTurn >= a.balance.extraDrawsPerTurn ? p("DRAW_LIMIT", "You already bought a draw this turn.") : r.deck.length === 0 ? p("DECK_EMPTY", "Your deck is empty.") : a.balance.extraDrawCost > r.mp ? p("NOT_ENOUGH_MP", `Drawing costs ${a.balance.extraDrawCost} MP; you have ${r.mp}.`) : null;
}
function pn(e, t, a) {
  const r = e.players[t.player];
  if (r.ultimateCharge < a.balance.ultimateChargeMax)
    return p("ULTIMATE_NOT_READY", `Ultimate is ${r.ultimateCharge}% charged.`);
  const n = a.heroes.byId.get(r.heroId);
  return n ? Se(e, a, n.ultimate.effects, t.player, t.target, !0) : p("UNKNOWN_CARD", `Unknown hero ${r.heroId}.`);
}
function fn(e, t) {
  if (t.strikes !== void 0) {
    const r = e.players[t.player].lanes.length;
    if (!Array.isArray(t.strikes) || t.strikes.length > r || !t.strikes.every((n) => n === null || rn.includes(n)))
      return p("INVALID_STRIKES", "Attack timing results are invalid.");
  }
  if (t.discard === void 0) return null;
  const a = e.players[t.player];
  return !Array.isArray(t.discard) || new Set(t.discard).size !== t.discard.length ? p("INVALID_DISCARD", "Discard list is invalid.") : t.discard.every((r) => a.hand.some((n) => n.iid === r)) ? null : p("CARD_NOT_IN_HAND", "You can only discard cards in your hand.");
}
function mn(e, t, a) {
  if (typeof t != "object" || t === null)
    return p("UNKNOWN_ACTION", "Malformed action.");
  if (e.phase === "ended") return p("GAME_OVER", "The game is over.");
  if (!_a(t.player)) return p("INVALID_PLAYER", "Unknown player.");
  switch (t.type) {
    case "surrender":
      return null;
    case "arrangeLandscapes":
      return on(e, t, a);
    case "mulligan":
      return sn(e, t, a);
    case "playCard":
    case "floop":
    case "moveCreature":
    case "buyDraw":
    case "useUltimate":
    case "endTurn": {
      if (e.phase !== "main") return p("WRONG_PHASE", "The match has not started yet.");
      if (t.player !== e.activePlayer) return p("NOT_YOUR_TURN", "It is not your turn.");
      switch (t.type) {
        case "playCard":
          return ln(e, t, a);
        case "floop":
          return cn(e, t, a);
        case "moveCreature":
          return dn(e, t, a);
        case "buyDraw":
          return un(e, t.player, a);
        case "useUltimate":
          return pn(e, t, a);
        case "endTurn":
          return fn(e, t);
      }
      break;
    }
  }
  return p(
    "UNKNOWN_ACTION",
    `Unknown action type "${String(t.type)}".`
  );
}
function yn(e, t) {
  const a = e.s.players[t.player];
  if (t.order.forEach((r, n) => {
    a.lanes[n].landscape = r;
  }), a.arranged = !0, e.events.push({ type: "landscapesArranged", player: t.player, order: [...t.order] }), e.s.players.every((r) => r.arranged) && (e.s.phase = "mulligan", e.ctx.balance.mulligansAllowed === 0)) {
    for (const r of e.s.players) r.mulliganDone = !0;
    ba(e);
  }
}
function gn(e, t) {
  const a = e.s.players[t.player];
  if (t.iids.length > 0) {
    const r = a.hand.filter((n) => t.iids.includes(n.iid));
    a.hand = a.hand.filter((n) => !t.iids.includes(n.iid)), a.deck = e.rng.shuffle([...a.deck, ...r]), a.mulligansUsed++, e.events.push({ type: "mulligan", player: t.player, returned: r.length }), be(e, t.player, r.length);
  } else
    e.events.push({ type: "mulligan", player: t.player, returned: 0 });
  a.mulliganDone = !0, e.s.players.every((r) => r.mulliganDone) && ba(e);
}
function ba(e) {
  e.s.phase = "main", fa(e, e.s.firstPlayer);
}
function hn(e, t) {
  const a = e.s.players[t.player], r = a.hand.findIndex((n) => n.iid === t.iid);
  return a.hand.splice(r, 1)[0];
}
function _n(e, t) {
  const a = e.s.players[t.player], r = S(e.ctx.cards, a.hand.find((l) => l.iid === t.iid).cardId), n = ra(e.s, t.player, r), o = hn(e, t);
  if (re(e, t.player, -n), e.events.push({
    type: "cardPlayed",
    player: t.player,
    iid: o.iid,
    cardId: o.cardId,
    lane: t.lane ?? null,
    target: t.target ?? null
  }), r.type === "spell") {
    a.discard.push(o);
    const l = {
      source: { player: t.player, kind: "spell", iid: o.iid, cardId: o.cardId, lane: null },
      trigger: "spell",
      effects: r.effects,
      ...t.target ? { chosen: t.target } : {}
    };
    e.queue.push(l), ae(e, t.player, "onSpellCast"), G(e);
    return;
  }
  const s = t.lane, i = a.lanes[s];
  if (r.type === "creature") {
    i.creature && Tr(e, t.player, s), i.creature = la(e, o, !1), e.events.push({
      type: "creatureSummoned",
      player: t.player,
      iid: o.iid,
      cardId: o.cardId,
      lane: s,
      token: !1
    }), M(e);
    const l = {
      player: t.player,
      kind: "creature",
      iid: o.iid,
      cardId: o.cardId,
      lane: s
    };
    U(e, l, "onPlay", t.target), ae(e, t.player, "onAllyCreaturePlayed", o.iid), rt(e, t.player, s, "onLaneCreaturePlayed");
  } else {
    if (i.building) {
      const d = i.building;
      i.building = null, a.discard.push(d), e.events.push({
        type: "cardReplaced",
        player: t.player,
        iid: d.iid,
        cardId: d.cardId,
        lane: s
      });
    }
    i.building = o, e.events.push({
      type: "buildingPlaced",
      player: t.player,
      iid: o.iid,
      cardId: o.cardId,
      lane: s
    }), M(e);
    const l = {
      player: t.player,
      kind: "building",
      iid: o.iid,
      cardId: o.cardId,
      lane: s
    };
    U(e, l, "onPlay", t.target);
  }
  G(e);
}
function kn(e, t) {
  const a = e.s.players[t.player], r = a.lanes[t.lane].creature, n = S(e.ctx.cards, r.cardId);
  if (n.type !== "creature" || !n.floop) return;
  re(e, t.player, -na(e.s, e.ctx, t.player, t.lane)), r.exhausted = !0, r.floopCount = (r.floopCount ?? 0) + 1, a.floopsThisTurn = (a.floopsThisTurn ?? 0) + 1, e.events.push({ type: "floop", player: t.player, iid: r.iid, lane: t.lane });
  const o = { player: t.player, kind: "creature", iid: r.iid, cardId: r.cardId, lane: t.lane };
  e.queue.push({
    source: o,
    trigger: "floop",
    effects: n.floop.effects,
    ...t.target ? { chosen: t.target } : {}
  }), U(e, o, "onFloop"), rt(e, t.player, t.lane, "onFloop"), ae(e, t.player, "onAllyFloop"), G(e);
}
function bn(e, t) {
  const a = e.s.players[t.player], r = ke(e.ctx.heroes, a.heroId);
  a.ultimateCharge = 0, a.ultimatesUsed++, e.events.push({ type: "ultimateUsed", player: t.player, heroId: r.id }), e.events.push({ type: "ultimateCharge", player: t.player, charge: 0 }), e.queue.push({
    source: { player: t.player, kind: "hero", iid: null, cardId: null, lane: null },
    trigger: "ultimate",
    effects: r.ultimate.effects,
    ...t.target ? { chosen: t.target } : {}
  }), G(e);
}
function wn(e, t, a) {
  const r = e.s.players[t.player], n = r.lanes[t.from].creature;
  re(e, t.player, -a), r.lanes[t.from].creature = null, r.lanes[t.to].creature = n, n.movesThisTurn++, e.events.push({ type: "creatureMoved", player: t.player, iid: n.iid, from: t.from, to: t.to, cost: a }), M(e), G(e);
}
function vn(e, t, a) {
  const r = mn(e, t, a);
  if (r) return { ok: !1, error: r };
  const n = t.type === "moveCreature" ? ka(e, t, a) : 0, o = oa(Zt(e), a);
  switch (t.type) {
    case "arrangeLandscapes":
      yn(o, t);
      break;
    case "mulligan":
      gn(o, t);
      break;
    case "playCard":
      _n(o, t);
      break;
    case "floop":
      kn(o, t);
      break;
    case "moveCreature":
      wn(o, t, n);
      break;
    case "buyDraw": {
      const s = o.s.players[t.player];
      re(o, t.player, -a.balance.extraDrawCost), s.extraDrawsThisTurn++, be(o, t.player, 1);
      break;
    }
    case "useUltimate":
      bn(o, t);
      break;
    case "endTurn":
      Or(o, t.player, t.discard, t.strikes);
      break;
    case "surrender":
      me(o, I(t.player), "surrender");
      break;
  }
  return o.s.rng = o.rng.state, { ok: !0, state: o.s, events: o.events };
}
function xn(e) {
  switch (e.phase) {
    case "arrange":
      return e.players.filter((t) => !t.arranged).map((t) => t.id);
    case "mulligan":
      return e.players.filter((t) => !t.mulliganDone).map((t) => t.id);
    case "main":
      return [e.activePlayer];
    case "ended":
      return [];
  }
}
const Tn = { start: 1e3, kNew: 40, k: 24, newPlayerGames: 20, softResetFactor: 0.5, seasonDays: 42, tiers: [{ name: "Bronze", min: 0 }, { name: "Silver", min: 1100 }, { name: "Gold", min: 1300 }, { name: "Platinum", min: 1500 }, { name: "Diamond", min: 1700 }, { name: "Legend", min: 1900 }] }, An = { baseWindow: 100, windowPerSecond: 5, maxWindow: 500, queueTimeoutSeconds: 300 }, Cn = { rankedWin: { coins: 60, xp: 60 }, rankedLoss: { coins: 20, xp: 25 }, seasonEnd: { Bronze: { coins: 150 }, Silver: { coins: 300 }, Gold: { coins: 400, gems: 20 }, Platinum: { coins: 500, gems: 40 }, Diamond: { coins: 600, gems: 80 }, Legend: { coins: 800, gems: 150 } } }, Mn = { coinsPerHour: 2500, gemsPerHour: 150, dustPerHour: 1e3, xpPerHour: 2500, cardsPerHour: 60, minHours: 1, maxHours: 72 }, Dn = {
  rating: Tn,
  matchmaking: An,
  rewards: Cn,
  saveCaps: Mn
}, q = Dn;
function Ne(e) {
  let t = q.rating.tiers[0].name;
  for (const a of q.rating.tiers) e >= a.min && (t = a.name);
  return t;
}
function Pn(e, t) {
  return 1 / (1 + Math.pow(10, (t - e) / 400));
}
function qn(e, t, a, r) {
  const n = r < q.rating.newPlayerGames ? q.rating.kNew : q.rating.k;
  return Math.max(0, Math.round(e + n * (a - Pn(e, t))));
}
function Kn(e) {
  const t = q.rating.start;
  return Math.round(t + (e - t) * q.rating.softResetFactor);
}
function Fn(e) {
  const t = q.matchmaking;
  return Math.min(t.maxWindow, t.baseWindow + t.windowPerSecond * Math.max(0, e));
}
const wa = "__hidden", St = (e, t, a) => ({
  iid: `${a}${t}`,
  cardId: wa,
  owner: e.owner
});
function Sn(e, t) {
  const a = Zt(e);
  a.seed = 0, a.rng = 0;
  for (const r of a.players)
    r.deck = r.deck.map((n, o) => St(n, o, `deck${r.id}-`)), r.id !== t && (r.hand = r.hand.map((n, o) => St(n, o, `hand${r.id}-`)));
  return a;
}
function En(e, t) {
  return e.map((a) => a.type === "cardDrawn" && a.player !== t ? { ...a, cardId: wa, iid: `drawn-${a.iid}` } : a);
}
const Hn = { match: { win: 60, loss: 25, draw: 30 }, levelThresholds: [0, 100, 250, 450, 700, 1e3, 1350, 1750, 2200, 2700, 3250, 3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10450], levelUpReward: { coins: 100, gemsEvery5Levels: 20 } }, In = { slots: 4, freeChest: { type: "wooden", intervalHours: 4 }, minutesPerGem: 10, victoryDrop: { wooden: 0.6, silver: 0.3, golden: 0.08, magic: 0.02 }, types: { wooden: { name: "Wooden Chest", unlockMinutes: 60, coins: [20, 40], cards: 3, dust: [0, 10], gemsChance: 0, gems: [0, 0], odds: { common: 0.75, uncommon: 0.2, rare: 0.05, epic: 0, legendary: 0 } }, silver: { name: "Silver Chest", unlockMinutes: 180, coins: [50, 90], cards: 5, dust: [10, 30], gemsChance: 0.1, gems: [2, 5], odds: { common: 0.62, uncommon: 0.28, rare: 0.09, epic: 0.01, legendary: 0 } }, golden: { name: "Golden Chest", unlockMinutes: 480, coins: [120, 200], cards: 8, dust: [30, 60], gemsChance: 0.3, gems: [5, 10], odds: { common: 0.5, uncommon: 0.32, rare: 0.14, epic: 0.035, legendary: 5e-3 } }, magic: { name: "Magic Chest", unlockMinutes: 720, coins: [200, 320], cards: 10, dust: [50, 100], gemsChance: 0.6, gems: [10, 20], odds: { common: 0.35, uncommon: 0.35, rare: 0.2, epic: 0.08, legendary: 0.02 } } } }, Ln = [{ id: "basic", name: "Basic Pack", description: "5 cards, at least one Uncommon or better.", cost: { coins: 300 }, cards: 5, guaranteed: "uncommon", odds: { common: 0.7, uncommon: 0.22, rare: 0.07, epic: 9e-3, legendary: 1e-3 } }, { id: "premium", name: "Premium Pack", description: "5 cards, at least one Rare or better.", cost: { gems: 60 }, cards: 5, guaranteed: "rare", odds: { common: 0.45, uncommon: 0.33, rare: 0.16, epic: 0.05, legendary: 0.01 } }, { id: "landscape", name: "Landscape Pack", description: "5 cards from the landscape you choose.", cost: { coins: 400 }, cards: 5, guaranteed: "uncommon", landscapeChoice: !0, odds: { common: 0.7, uncommon: 0.22, rare: 0.07, epic: 9e-3, legendary: 1e-3 } }], jn = [{ coins: 100 }, { coins: 150 }, { dust: 50 }, { coins: 200 }, { gems: 10 }, { chest: "silver" }, { gems: 25, chest: "golden" }], $n = { perDay: 3, pool: [{ id: "win_2", text: "Win 2 matches", stat: "wins", target: 2, reward: { coins: 80, xp: 40 } }, { id: "play_3", text: "Play 3 matches", stat: "matches", target: 3, reward: { coins: 60, xp: 30 } }, { id: "creatures_15", text: "Play 15 creatures", stat: "creaturesPlayed", target: 15, reward: { coins: 70, xp: 35 } }, { id: "spells_8", text: "Cast 8 spells", stat: "spellsCast", target: 8, reward: { coins: 70, xp: 35 } }, { id: "damage_40", text: "Deal 40 damage to enemy Heroes", stat: "heroDamage", target: 40, reward: { coins: 80, xp: 40 } }, { id: "destroy_10", text: "Destroy 10 enemy creatures", stat: "creaturesDestroyed", target: 10, reward: { coins: 70, xp: 35 } }, { id: "ultimate_2", text: "Use your Ultimate 2 times", stat: "ultimatesUsed", target: 2, reward: { coins: 60, xp: 30 } }, { id: "floop_5", text: "Floop 5 times", stat: "floops", target: 5, reward: { coins: 60, xp: 30 } }] }, Gn = [{ id: "first_win", name: "First Victory", text: "Win a match", stat: "wins", target: 1, reward: { gems: 10 } }, { id: "wins_10", name: "Seasoned", text: "Win 10 matches", stat: "wins", target: 10, reward: { gems: 20 } }, { id: "wins_50", name: "Champion", text: "Win 50 matches", stat: "wins", target: 50, reward: { gems: 50 } }, { id: "creatures_100", name: "Summoner", text: "Play 100 creatures", stat: "creaturesPlayed", target: 100, reward: { coins: 300 } }, { id: "spells_100", name: "Spellslinger", text: "Cast 100 spells", stat: "spellsCast", target: 100, reward: { coins: 300 } }, { id: "damage_1000", name: "Hero Hunter", text: "Deal 1000 damage to enemy Heroes", stat: "heroDamage", target: 1e3, reward: { gems: 30 } }, { id: "ultimate_25", name: "Unleashed", text: "Use your Ultimate 25 times", stat: "ultimatesUsed", target: 25, reward: { coins: 500 } }, { id: "chests_10", name: "Treasure Hunter", text: "Open 10 chests", stat: "chestsOpened", target: 10, reward: { gems: 20 } }, { id: "collector", name: "Collector", text: "Own every card", stat: "uniqueCards", target: 130, reward: { gems: 100 } }, { id: "master_card", name: "Master", text: "Level a card to 5", stat: "maxCardLevel", target: 5, reward: { gems: 30 } }, { id: "player_10", name: "Veteran", text: "Reach player level 10", stat: "playerLevel", target: 10, reward: { gems: 50 } }], Bn = { firstClearCoins: [40, 50, 60, 70, 80, 90, 100, 120], firstClearXp: [30, 35, 40, 45, 50, 55, 60, 70], gemsPerNewStar: 2, bossFirstClear: [{ gems: 10, chest: "silver" }, { gems: 10, chest: "silver" }, { gems: 15, chest: "golden" }, { gems: 15, chest: "golden" }, { gems: 20, chest: "golden" }, { gems: 20, chest: "magic" }, { gems: 25, chest: "magic" }, { gems: 50, chest: "magic" }] }, zn = { daily: { reward: { coins: 150, gems: 10, chest: "golden" }, ai: "hard", cardLevel: 3, decks: ["starter_corn_fields", "starter_blue_plains", "starter_useless_swamp", "starter_sandy_lands", "starter_nice_lands", "starter_corn_swamp", "starter_corn_plains", "starter_plains_sand", "starter_nice_sand", "starter_rainbow_road", "boss_deck_haybale", "boss_deck_glacia", "boss_deck_mire", "boss_deck_scorch", "boss_deck_bonbon", "boss_deck_vex"], enemyModifiers: ["fortified", "thick_hide", "sharp_claws", "thorny", "tailwind", "spell_echo", "healing_springs", "reinforcements", "war_drums", "toxic_fog", "ember_rain", "scholar", "head_start"], playerModifiers: ["charged", "head_start", "weary", "healing_springs", "spell_echo"] }, gauntlet: { battles: 5, healBetween: 4, ai: ["easy", "normal", "normal", "hard", "hard"], cardLevels: [1, 2, 2, 3, 4], rewards: [{ coins: 40 }, { coins: 100 }, { coins: 160, dust: 20 }, { coins: 220, gems: 5, dust: 40 }, { coins: 300, gems: 10, chest: "silver" }, { coins: 400, gems: 20, chest: "golden" }] }, draft: { entry: { coins: 200 }, picks: 30, maxWins: 7, maxLosses: 3, odds: { common: 0.6, uncommon: 0.25, rare: 0.11, epic: 0.03, legendary: 0.01 }, basicsPerLandscape: 5, ai: ["normal", "normal", "normal", "hard", "hard", "hard", "hard", "nightmare", "nightmare"], cardLevel: 2, rewards: [{ coins: 60, dust: 20 }, { coins: 120, dust: 30 }, { coins: 180, dust: 40 }, { coins: 240, gems: 5, dust: 50 }, { coins: 300, gems: 10, chest: "silver" }, { coins: 360, gems: 15, chest: "silver" }, { coins: 420, gems: 25, chest: "golden" }, { coins: 500, gems: 40, chest: "magic" }] }, sandbox: { dummyHp: 100 } }, Rn = {
  xp: Hn,
  chests: In,
  packs: Ln,
  login: jn,
  quests: $n,
  achievements: Gn,
  campaign: Bn,
  modes: zn
}, On = { heroHp: 1.2, enemyLowHpBonus: 0.35, creatureAtk: 1.1, creatureDef: 0.7, keyword: 0.6, pressure: 0.9, lethalThreat: 14, card: 0.9, deckOut: 0.8, charge: 0.03, building: 1.6, flippedEnemyLandscape: 0.8, frozenPenalty: 0.5, poisonPenalty: 0.8 }, Nn = { easy: { name: "Easy", depth: 1, beam: 1, temperature: 6, topK: 5, mistakeRate: 0.45, maxEvaluations: 150, timeBudgetMs: 150, lookaheadOpponentCombat: !1, weightScale: { pressure: 0.3, lethalThreat: 0.2 } }, normal: { name: "Normal", depth: 2, beam: 3, temperature: 0.8, topK: 3, mistakeRate: 0.1, maxEvaluations: 800, timeBudgetMs: 400, lookaheadOpponentCombat: !0 }, hard: { name: "Hard", depth: 2, beam: 5, temperature: 0.15, topK: 2, mistakeRate: 0.02, maxEvaluations: 2e3, timeBudgetMs: 800, lookaheadOpponentCombat: !0, weightScale: { pressure: 1.5 } }, nightmare: { name: "Nightmare", depth: 3, beam: 6, temperature: 0, topK: 1, mistakeRate: 0, maxEvaluations: 5e3, timeBudgetMs: 1e3, lookaheadOpponentCombat: !0 } }, Et = {
  weights: On,
  profiles: Nn
}, va = ["easy", "normal", "hard", "nightmare"];
function Un() {
  const e = [];
  for (const t of va) {
    const a = Et.profiles[t];
    if (!a) {
      e.push(`missing profile "${t}"`);
      continue;
    }
    for (const r of ["depth", "beam", "topK", "maxEvaluations", "timeBudgetMs"]) {
      const n = a[r];
      (typeof n != "number" || !Number.isInteger(n) || n < 1) && e.push(`${t}.${r} must be a positive integer`);
    }
    for (const r of ["temperature", "mistakeRate"]) {
      const n = a[r];
      (typeof n != "number" || n < 0) && e.push(`${t}.${r} must be >= 0`);
    }
    typeof a.mistakeRate == "number" && a.mistakeRate > 1 && e.push(`${t}.mistakeRate must be <= 1`);
  }
  for (const [t, a] of Object.entries(Et.weights))
    (typeof a != "number" || !Number.isFinite(a)) && e.push(`weights.${t} must be a number`);
  return e;
}
const Ht = Un();
if (Ht.length > 0) throw new Error(`Invalid ai-profiles.json:
- ${Ht.join(`
- `)}`);
const Wn = 10, Yn = { coins: 500, gems: 20, dust: 150 }, Vn = 5, te = {
  deckSlots: Wn,
  startingCurrencies: Yn,
  maxLevel: Vn
}, ye = 6, Qn = ["classic", "starry", "checker"], dt = [
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
function ut() {
  return Object.fromEntries(dt.map((e) => [e, 0]));
}
const Ye = ["wooden", "silver", "golden", "magic"];
function Ee() {
  return { daily: { day: null, won: !1, attempts: 0 }, gauntlet: null, draft: null };
}
function xa(e) {
  const t = {};
  for (const a of e.starterDecks) {
    const r = /* @__PURE__ */ new Map();
    for (const n of a.cards) r.set(n, (r.get(n) ?? 0) + 1);
    for (const [n, o] of r) t[n] = { count: Math.max(t[n]?.count ?? 0, o), level: 1 };
  }
  return t;
}
function Ta(e, t, a, r, n, o) {
  const s = {};
  for (const i of n) s[i] = (s[i] ?? 0) + 1;
  return { id: e, name: t, heroId: a, landscapes: [...r], cards: s, updatedAt: o };
}
function Aa(e, t) {
  const a = Array.from({ length: te.deckSlots }, () => null);
  return e.starterDecks.slice(0, 3).forEach((r, n) => {
    a[n] = Ta(`deck-${n + 1}`, r.name, r.heroId, r.landscapes, r.cards, t);
  }), {
    version: ye,
    createdAt: t,
    updatedAt: t,
    profile: { name: "Player", avatar: "finn", cardBack: "classic" },
    currencies: { ...te.startingCurrencies },
    collection: xa(e),
    decks: a,
    selectedDeck: 0,
    progression: { xp: 0, level: 1 },
    chests: { slots: [null, null, null, null], freeReadyAt: 0 },
    login: { lastClaimDay: null, streakIndex: 0 },
    quests: { day: null, active: [] },
    achievements: { claimed: [] },
    lifetime: ut(),
    campaign: { stars: {}, storySeen: [] },
    tutorial: { done: [], offered: !1 },
    modes: Ee()
  };
}
const Jn = {
  /**
   * v0 → v1: the pre-release prototype stored `cards: { id: count }` and a
   * single `deck` array. Kept as the reference example for future migrations.
   */
  0: (e) => {
    const t = e.cards ?? {}, a = {};
    for (const [o, s] of Object.entries(t)) a[o] = { count: s, level: 1 };
    const r = Array.from({ length: te.deckSlots }, () => null), n = e.deck;
    return n?.cards && (r[0] = Ta(
      "deck-1",
      "My Deck",
      n.heroId ?? "finn",
      n.landscapes ?? ["golden", "golden", "golden", "golden"],
      n.cards,
      0
    )), {
      version: 1,
      createdAt: 0,
      updatedAt: 0,
      profile: { name: typeof e.name == "string" ? e.name : "Player" },
      currencies: { coins: Number(e.coins ?? 0), gems: 0, dust: 0 },
      collection: a,
      decks: r,
      selectedDeck: 0,
      stats: { matchesPlayed: 0, wins: 0, losses: 0 }
    };
  },
  /** v1 → v2: progression, chests, login, quests, achievements; stats become lifetime counters. */
  1: (e) => {
    const t = e.stats ?? {}, { stats: a, ...r } = e;
    return {
      ...r,
      version: 2,
      progression: { xp: 0, level: 1 },
      chests: { slots: [null, null, null, null], freeReadyAt: 0 },
      login: { lastClaimDay: null, streakIndex: 0 },
      quests: { day: null, active: [] },
      achievements: { claimed: [] },
      lifetime: {
        ...ut(),
        matches: t.matchesPlayed ?? 0,
        wins: t.wins ?? 0,
        losses: t.losses ?? 0
      }
    };
  },
  /** v2 → v3: campaign stars and tutorial progress. Existing players are not prompted for the tutorial. */
  2: (e) => ({
    ...e,
    version: 3,
    campaign: { stars: {}, storySeen: [] },
    tutorial: { done: [], offered: !0 }
  }),
  /** v3 → v4: daily dungeon, gauntlet and draft runs. */
  3: (e) => ({ ...e, version: 4, modes: Ee() }),
  /** v4 → v5: profile avatar and card back. */
  4: (e) => ({
    ...e,
    version: 5,
    profile: { ...e.profile ?? {}, avatar: "finn", cardBack: "classic" }
  }),
  /**
   * v5 → v6: the card pool was replaced. Old cards become Dust (per copy, by
   * level), decks are cleared (repair puts the new starter decks in), and the
   * avatar resets because the old heroes are gone.
   */
  5: (e) => {
    let t = 0;
    for (const r of Object.values(e.collection ?? {}))
      t += _(r?.count) * Math.max(1, _(r?.level, 1));
    const a = e.currencies ?? {};
    return {
      ...e,
      version: 6,
      collection: {},
      decks: [],
      selectedDeck: 0,
      currencies: { ...a, dust: _(a.dust) + Math.min(2e4, t * Xn) },
      profile: { ...e.profile ?? {}, avatar: "finn" },
      modes: Ee()
    };
  }
}, Xn = 10;
function Zn(e) {
  if (typeof e != "object" || e === null) throw new Error("Save is not an object");
  let t = e, a = typeof t.version == "number" ? t.version : 0;
  if (a > ye)
    throw new Error(`Save version ${a} is newer than this game (${ye})`);
  for (; a < ye; ) {
    const r = Jn[a];
    if (!r) throw new Error(`No migration from save version ${a}`);
    t = r(t), a = t.version;
  }
  return t;
}
function _(e, t = 0) {
  return typeof e == "number" && Number.isFinite(e) && e >= 0 ? Math.floor(e) : t;
}
function eo(e, t, a) {
  const r = Aa(t, a), n = [], o = t.ctx.cards, s = {};
  for (const [y, k] of Object.entries(e.collection ?? {})) {
    const h = o.byId.get(y);
    if (!h || h.token) {
      n.push(`removed unknown card "${y}"`);
      continue;
    }
    const Y = k ?? {}, V = _(Y.count), oe = Math.min(te.maxLevel, Math.max(1, _(Y.level, 1)));
    V > 0 && (s[y] = { count: V, level: oe });
  }
  for (const [y, k] of Object.entries(xa(t))) {
    const h = s[y];
    (!h || h.count < k.count) && (h && n.push(`topped up starter card "${y}"`), s[y] = { count: k.count, level: h?.level ?? 1 });
  }
  const i = Array.isArray(e.decks) && e.decks.some(Boolean) ? e.decks : r.decks, l = Array.from({ length: te.deckSlots }, (y, k) => {
    const h = i[k];
    if (!h) return null;
    const Y = typeof h.heroId == "string" && t.ctx.heroes.byId.has(h.heroId) && !t.ctx.heroes.byId.get(h.heroId)?.boss, V = Array.isArray(h.landscapes) ? h.landscapes.filter((de) => B.includes(de)) : [];
    for (; V.length < 4; ) V.push("golden");
    const oe = {};
    for (const [de, Pa] of Object.entries(h.cards ?? {})) {
      const $e = o.byId.get(de);
      if (!$e || $e.token) {
        n.push(`deck ${k + 1}: removed unknown card "${de}"`);
        continue;
      }
      const pt = Math.min(Yt($e.rarity, t.ctx.balance), _(Pa));
      pt > 0 && (oe[de] = pt);
    }
    return Y || n.push(`deck ${k + 1}: unknown hero, reset`), {
      id: typeof h.id == "string" && h.id ? h.id : `deck-${k + 1}`,
      name: typeof h.name == "string" && h.name.trim() ? h.name.slice(0, 24) : `Deck ${k + 1}`,
      heroId: Y ? h.heroId : t.ctx.heroes.all[0].id,
      landscapes: V.slice(0, 4),
      cards: oe,
      updatedAt: _(h.updatedAt, a)
    };
  }), d = e.currencies ?? {}, c = e.lifetime ?? {}, u = ut();
  for (const y of dt) u[y] = _(c[y]);
  const w = e.progression ?? {}, g = e.chests ?? {}, f = Array.from({ length: 4 }, (y, k) => {
    const h = g.slots?.[k];
    return !h || !Ye.includes(h.type) ? null : {
      type: h.type,
      unlockStartedAt: typeof h.unlockStartedAt == "number" ? h.unlockStartedAt : null
    };
  }), T = e.login ?? {}, m = e.quests ?? {}, D = e.achievements ?? {}, A = e.profile ?? {}, $ = e.campaign ?? {}, W = {};
  if (typeof $.stars == "object" && $.stars !== null)
    for (const [y, k] of Object.entries($.stars)) {
      const h = Math.min(3, _(k));
      h > 0 && (W[y] = h);
    }
  const J = (y) => Array.isArray(y) ? [...new Set(y.filter((k) => typeof k == "string"))] : [], H = e.tutorial ?? {}, ne = _(e.selectedDeck);
  return { save: {
    version: ye,
    createdAt: _(e.createdAt, a),
    updatedAt: _(e.updatedAt, a),
    profile: {
      name: typeof A.name == "string" && A.name.trim() ? A.name.slice(0, 20) : r.profile.name,
      avatar: typeof A.avatar == "string" && t.ctx.heroes.byId.has(A.avatar) ? A.avatar : r.profile.avatar,
      cardBack: Qn.includes(A.cardBack) ? A.cardBack : r.profile.cardBack
    },
    currencies: { coins: _(d.coins), gems: _(d.gems), dust: _(d.dust) },
    collection: s,
    decks: l,
    selectedDeck: ne < te.deckSlots ? ne : 0,
    progression: { xp: _(w.xp), level: Math.max(1, _(w.level, 1)) },
    chests: { slots: f, freeReadyAt: _(g.freeReadyAt) },
    login: {
      lastClaimDay: typeof T.lastClaimDay == "string" ? T.lastClaimDay : null,
      streakIndex: _(T.streakIndex) % 7
    },
    quests: {
      day: typeof m.day == "string" ? m.day : null,
      active: (m.active ?? []).filter(
        (y) => typeof y == "object" && y !== null && typeof y.id == "string"
      ).map((y) => ({ id: y.id, progress: _(y.progress), claimed: y.claimed === !0 }))
    },
    achievements: { claimed: (D.claimed ?? []).filter((y) => typeof y == "string") },
    lifetime: u,
    campaign: { stars: W, storySeen: J($.storySeen) },
    tutorial: { done: J(H.done), offered: H.offered === !0 },
    modes: ao(e.modes, t)
  }, fixes: n };
}
function Ve(e) {
  return B.includes(e);
}
function to(e, t) {
  const a = e;
  if (!a || typeof a != "object" || typeof a.heroId != "string" || !t.ctx.heroes.byId.has(a.heroId) || !Array.isArray(a.landscapes) || a.landscapes.length !== 4 || !a.landscapes.every(Ve) || !Array.isArray(a.cards) || !a.cards.every((n) => typeof n == "string" && t.ctx.cards.byId.has(n)))
    return null;
  const r = {
    name: typeof a.name == "string" ? a.name.slice(0, 24) : "Run deck",
    heroId: a.heroId,
    landscapes: [...a.landscapes],
    cards: [...a.cards]
  };
  if (a.levels && typeof a.levels == "object") {
    r.levels = {};
    for (const [n, o] of Object.entries(a.levels)) {
      const s = _(o, 1);
      s >= 1 && s <= te.maxLevel && (r.levels[n] = s);
    }
  }
  return r;
}
function ao(e, t) {
  const a = e ?? {}, r = Ee(), n = a.daily ?? {};
  r.daily = {
    day: typeof n.day == "string" ? n.day : null,
    won: n.won === !0,
    attempts: _(n.attempts)
  };
  const o = a.gauntlet, s = o ? to(o.deck, t) : null;
  o && s && typeof o.seed == "string" && (r.gauntlet = {
    seed: o.seed,
    deck: s,
    hp: Math.max(1, _(o.hp, 1)),
    wins: _(o.wins),
    over: o.over === !0
  });
  const i = a.draft, l = ["hero", "landscape", "cards", "battles"], d = (c) => Array.isArray(c) && c.every((u) => typeof u == "string");
  return i && typeof i.seed == "string" && l.includes(i.stage) && d(i.heroOffer) && (i.heroId === null || typeof i.heroId == "string" && t.ctx.heroes.byId.has(i.heroId)) && Array.isArray(i.landscapeOffer) && i.landscapeOffer.every(Ve) && Array.isArray(i.landscapes) && i.landscapes.every(Ve) && d(i.offer) && d(i.picks) && [...i.offer ?? [], ...i.picks ?? []].every((c) => t.ctx.cards.byId.has(c)) && (r.draft = {
    seed: i.seed,
    stage: i.stage,
    heroOffer: [...i.heroOffer],
    heroId: i.heroId ?? null,
    landscapeOffer: [...i.landscapeOffer],
    landscapes: [...i.landscapes],
    offer: [...i.offer],
    picks: [...i.picks],
    wins: _(i.wins),
    losses: _(i.losses)
  }), r;
}
const ro = ["uniqueCards", "maxCardLevel", "playerLevel"];
function no(e) {
  const t = [], a = (c, u) => {
    for (const g of ge)
      (typeof c[g] != "number" || c[g] < 0) && t.push(`${u}: odds.${g} must be >= 0`);
    const w = ge.reduce((g, f) => g + (c[f] ?? 0), 0);
    Math.abs(w - 1) > 1e-6 && t.push(`${u}: odds must sum to 1 (got ${w})`);
  }, r = e.xp.levelThresholds;
  (r[0] !== 0 || r.some((c, u) => u > 0 && c <= r[u - 1])) && t.push("xp.levelThresholds must start at 0 and increase");
  for (const c of Ye) {
    const u = e.chests.types[c];
    u ? a(u.odds, `chest ${c}`) : t.push(`chests.types.${c} is missing`);
  }
  const n = Ye.reduce((c, u) => c + (e.chests.victoryDrop[u] ?? 0), 0);
  Math.abs(n - 1) > 1e-6 && t.push("chests.victoryDrop must sum to 1");
  for (const c of e.packs) a(c.odds, `pack ${c.id}`);
  e.login.length !== 7 && t.push("login must have 7 days");
  const o = (c) => dt.includes(c) || ro.includes(c);
  for (const c of e.quests.pool) o(c.stat) || t.push(`quest ${c.id}: unknown stat ${c.stat}`);
  for (const c of e.achievements)
    o(c.stat) || t.push(`achievement ${c.id}: unknown stat ${c.stat}`);
  e.quests.pool.length < e.quests.perDay && t.push("quest pool smaller than quests per day");
  const s = [...e.quests.pool.map((c) => c.id), ...e.achievements.map((c) => c.id)];
  new Set(s).size !== s.length && t.push("quest/achievement ids must be unique");
  const i = e.campaign;
  for (const c of ["firstClearCoins", "firstClearXp", "bossFirstClear"])
    (!Array.isArray(i[c]) || i[c].length !== 8) && t.push(`campaign.${c} needs 8 entries`);
  const l = e.modes;
  return [l.daily.ai, ...l.gauntlet.ai, ...l.draft.ai].some((c) => !va.includes(c)) && t.push("modes: unknown AI difficulty"), (l.gauntlet.ai.length !== l.gauntlet.battles || l.gauntlet.cardLevels.length !== l.gauntlet.battles) && t.push("modes.gauntlet: ai and cardLevels need one entry per battle"), l.gauntlet.rewards.length !== l.gauntlet.battles + 1 && t.push("modes.gauntlet.rewards needs battles + 1 entries"), l.draft.rewards.length !== l.draft.maxWins + 1 && t.push("modes.draft.rewards needs maxWins + 1 entries"), l.draft.ai.length < l.draft.maxWins + l.draft.maxLosses - 1 && t.push("modes.draft.ai needs an entry for every possible battle"), a(l.draft.odds, "draft"), t;
}
const Ca = Rn, It = no(Ca);
if (It.length > 0) throw new Error(`Invalid progression.json:
- ${It.join(`
- `)}`);
const ue = Ca.xp.levelThresholds, oo = 1100;
function so(e) {
  return e <= 1 ? 0 : e <= ue.length ? ue[e - 1] : ue[ue.length - 1] + (e - ue.length) * oo;
}
function Ma(e) {
  let t = 1;
  for (; so(t + 1) <= e; ) t++;
  return t;
}
const io = ["coins", "gems", "dust"];
function pe(e) {
  const t = {};
  for (const [a, r] of Object.entries(e.collection)) r.count > 0 && (t[a] = r.count);
  return { ...e.currencies, xp: e.progression.xp, cards: t };
}
function lo(e, t) {
  const a = q.saveCaps, r = Math.max(0, t - e) / 36e5;
  return Math.min(a.maxHours, Math.max(a.minHours, r));
}
function co(e, t, a, r) {
  const n = q.saveCaps, o = [], s = eo(Zn(t.save ?? {}), r, a).save, i = Aa(r, a), l = e?.data ?? i, d = e ? e.syncedAt : Math.min(a, s.createdAt || a), c = lo(d, a), u = e ? t.base ?? pe(l) : pe(i), w = s.updatedAt >= l.updatedAt ? s : l, g = structuredClone(w), f = pe(s), T = pe(l), m = { coins: n.coinsPerHour, gems: n.gemsPerHour, dust: n.dustPerHour };
  for (const C of io) {
    const y = f[C] - u[C], k = m[C] * c;
    y > k && o.push(`${C}: +${y} refused above +${Math.floor(k)}`), g.currencies[C] = Math.max(0, T[C] + Math.min(y, Math.floor(k)));
  }
  const D = f.xp - u.xp, A = Math.floor(n.xpPerHour * c);
  D > A && o.push(`xp: +${D} refused above +${A}`), g.progression.xp = Math.max(0, T.xp + Math.max(0, Math.min(D, A))), g.progression.level = Ma(g.progression.xp);
  let $ = Math.floor(n.cardsPerHour * c);
  const W = [
    .../* @__PURE__ */ new Set([
      ...Object.keys(f.cards),
      ...Object.keys(T.cards),
      ...Object.keys(u.cards)
    ])
  ].sort(), J = {};
  let H = 0;
  for (const C of W) {
    const y = (f.cards[C] ?? 0) - (u.cards[C] ?? 0);
    let k = y;
    y > 0 && (k = Math.min(y, $), $ -= k, H += y - k);
    const h = Math.max(0, (T.cards[C] ?? 0) + k);
    if (h <= 0) continue;
    const Y = l.collection[C]?.level ?? 1, V = s.collection[C]?.level ?? 1, oe = Math.min(V, Y + Math.ceil(c) * 2);
    J[C] = { count: h, level: Math.max(Y, oe) };
  }
  H > 0 && o.push(`cards: ${H} new copies refused`), g.collection = J;
  for (const C of Object.keys(g.lifetime))
    g.lifetime[C] = Math.max(l.lifetime[C] ?? 0, s.lifetime[C] ?? 0);
  g.updatedAt = Math.max(s.updatedAt, l.updatedAt);
  const ne = (e?.version ?? 0) + 1;
  return { save: g, version: ne, base: pe(g), flags: o };
}
function uo(e, t) {
  const a = structuredClone(e);
  return a.currencies.coins += t.coins ?? 0, a.currencies.gems += t.gems ?? 0, a.currencies.dust += t.dust ?? 0, a.progression.xp += t.xp ?? 0, a.progression.level = Ma(a.progression.xp), a;
}
class P extends Error {
  constructor(t, a, r = {}) {
    super(a), this.code = t, this.extra = r;
  }
}
const Lt = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", po = 10 * 6e4, fo = 1500;
class mo {
  constructor(t) {
    this.d = t;
  }
  get ctx() {
    return this.d.content.ctx;
  }
  turnMs() {
    return le.online.turnTimerSeconds * 1e3;
  }
  // -------------------------------------------------------------------------
  // Cloud save
  // -------------------------------------------------------------------------
  async sync(t, a) {
    for (let r = 0; r < 3; r++) {
      const n = await this.d.store.getSave(t);
      let o;
      try {
        o = co(n, a, this.d.now(), this.d.content);
      } catch (l) {
        throw new P("BAD_REQUEST", `Save rejected: ${l.message}`);
      }
      if (!await this.d.store.putSave(
        t,
        { data: o.save, version: o.version, syncedAt: this.d.now() },
        n?.version ?? null
      )) continue;
      const i = o.save.profile;
      return await this.d.store.setProfile(t, { name: i.name, avatar: i.avatar, cardBack: i.cardBack }), { save: o.save, version: o.version, base: o.base, flags: o.flags };
    }
    throw new P("BUSY", "Your save is being updated on another device. Try again.");
  }
  /** Applies a server-side reward to the stored save (ranked wins, season rewards). */
  async grant(t, a) {
    for (let r = 0; r < 3; r++) {
      const n = await this.d.store.getSave(t);
      if (!n || await this.d.store.putSave(
        t,
        { data: uo(n.data, a), version: n.version + 1, syncedAt: n.syncedAt },
        n.version
      )) return;
    }
  }
  // -------------------------------------------------------------------------
  // Profile & ratings
  // -------------------------------------------------------------------------
  async ratingRow(t, a) {
    return await this.d.store.getRating(t, a) ?? {
      userId: t,
      seasonId: a,
      rating: q.rating.start,
      games: 0,
      wins: 0,
      losses: 0,
      peak: q.rating.start
    };
  }
  async profile(t) {
    const a = await this.d.store.activeSeason(), r = await this.ratingRow(t, a.id);
    return {
      name: await this.d.store.getProfileName(t),
      season: { id: a.id, name: a.name, endsAt: a.endsAt },
      rating: r.rating,
      tier: Ne(r.rating),
      games: r.games,
      wins: r.wins,
      losses: r.losses
    };
  }
  // -------------------------------------------------------------------------
  // Decks
  // -------------------------------------------------------------------------
  async checkDeck(t, a, r) {
    if (!a || typeof a != "object" || !Array.isArray(a.cards) || !Array.isArray(a.landscapes))
      throw new P("DECK_INVALID", "That deck is not valid.");
    const n = {
      heroId: String(a.heroId),
      landscapes: [...a.landscapes],
      cards: a.cards.map(String)
    }, o = this.ctx.heroes.byId.get(n.heroId), s = tt(n, this.ctx);
    if (!o || o.boss || s.length > 0)
      throw new P("DECK_INVALID", s[0] ?? "That hero cannot be used online.");
    if (r) {
      const i = await this.d.store.getSave(t);
      if (!i) throw new P("NOT_OWNED", "Sync your save to the cloud before playing Ranked.");
      const l = /* @__PURE__ */ new Map();
      for (const d of n.cards) l.set(d, (l.get(d) ?? 0) + 1);
      for (const [d, c] of l)
        if ((i.data.collection[d]?.count ?? 0) < c) {
          const u = this.ctx.cards.byId.get(d)?.name ?? d;
          throw new P("NOT_OWNED", `You don't own ${c} × ${u}.`);
        }
    }
    return n;
  }
  // -------------------------------------------------------------------------
  // Matchmaking
  // -------------------------------------------------------------------------
  async queue(t, a) {
    const r = await this.d.store.activeMatchOf(t);
    if (r) return { status: "matched", matchId: r.id };
    const n = await this.checkDeck(t, a, !0), o = await this.d.store.activeSeason(), s = (await this.ratingRow(t, o.id)).rating, i = {
      userId: t,
      name: await this.d.store.getProfileName(t),
      rating: s,
      deck: n,
      queuedAt: this.d.now()
    };
    return await this.d.store.putQueue(i), this.tryPair(i);
  }
  async queueStatus(t) {
    const a = await this.d.store.activeMatchOf(t);
    if (a) return { status: "matched", matchId: a.id };
    const r = (await this.d.store.queue()).find((n) => n.userId === t);
    return r ? this.d.now() - r.queuedAt > q.matchmaking.queueTimeoutSeconds * 1e3 ? (await this.d.store.takeQueue(t), { status: "idle" }) : this.tryPair(r) : { status: "idle" };
  }
  async cancelQueue(t) {
    return await this.d.store.takeQueue(t), { status: "idle" };
  }
  async tryPair(t) {
    const a = this.d.now(), r = (await this.d.store.queue()).filter((s) => s.userId !== t.userId), n = (s) => (a - s.queuedAt) / 1e3, o = r.filter((s) => Math.abs(s.rating - t.rating) <= Fn(Math.max(n(s), n(t)))).sort(
      (s, i) => Math.abs(s.rating - t.rating) - Math.abs(i.rating - t.rating) || s.queuedAt - i.queuedAt
    );
    for (const s of o) {
      if (!await this.d.store.takeQueue(s.userId)) continue;
      if (!await this.d.store.takeQueue(t.userId)) {
        await this.d.store.putQueue(s);
        const w = await this.d.store.activeMatchOf(t.userId);
        return w ? { status: "matched", matchId: w.id } : { status: "idle" };
      }
      const i = this.d.random() < 0.5, [l, d] = i ? [s, t] : [t, s], c = await this.d.store.activeSeason();
      return { status: "matched", matchId: (await this.startMatch(
        "ranked",
        [l.userId, d.userId],
        [l.name, d.name],
        [l.deck, d.deck],
        c.id,
        null
      )).id };
    }
    return { status: "queued", since: t.queuedAt };
  }
  // -------------------------------------------------------------------------
  // Friendly rooms
  // -------------------------------------------------------------------------
  async createRoom(t, a) {
    const r = await this.checkDeck(t, a, !1);
    for (let n = 0; n < 5; n++) {
      const o = Array.from(
        { length: 6 },
        () => Lt[Math.floor(this.d.random() * Lt.length)]
      ).join("");
      if (await this.d.store.waitingRoom(o)) continue;
      const s = this.d.now(), i = {
        id: this.d.newId(),
        mode: "friendly",
        status: "waiting",
        roomCode: o,
        players: [t, null],
        names: [await this.d.store.getProfileName(t), ""],
        decks: [r, null],
        state: null,
        seq: 0,
        deadline: null,
        lastSeen: [s, s],
        winner: null,
        seasonId: null,
        result: null,
        createdAt: s,
        updatedAt: s
      };
      if (await this.d.store.putMatch(i, null))
        return await this.publish(i, []), { matchId: i.id, code: o };
    }
    throw new P("BUSY", "Could not create a room. Try again.");
  }
  async joinRoom(t, a, r) {
    const n = String(a ?? "").toUpperCase().replace(/[^A-Z0-9]/g, ""), o = await this.d.store.waitingRoom(n);
    if (!o || this.d.now() - o.createdAt > po)
      throw new P("NOT_FOUND", "No open room with that code.");
    if (o.players[0] === t)
      throw new P("BAD_REQUEST", "That is your own room. Share the code with a friend.");
    const s = await this.checkDeck(t, r, !1), i = this.newGame([o.decks[0], s]), l = this.d.now(), d = {
      ...o,
      status: "active",
      players: [o.players[0], t],
      names: [o.names[0], await this.d.store.getProfileName(t)],
      decks: [o.decks[0], s],
      state: i.state,
      seq: o.seq + 1,
      deadline: l + this.turnMs(),
      lastSeen: [l, l],
      updatedAt: l
    };
    if (!await this.d.store.putMatch(d, o.seq))
      throw new P("BUSY", "Someone else joined that room first.");
    return await this.publish(d, i.events), { matchId: d.id };
  }
  // -------------------------------------------------------------------------
  // Matches
  // -------------------------------------------------------------------------
  newGame(t) {
    const a = Math.floor(this.d.random() * 4294967295);
    return pr({ seed: a, decks: t, fixedCardLevel: le.online.rankedCardLevel }, this.ctx);
  }
  async startMatch(t, a, r, n, o, s) {
    const i = this.d.now(), l = this.newGame(n), d = {
      id: this.d.newId(),
      mode: t,
      status: "active",
      roomCode: s,
      players: a,
      names: r,
      decks: n,
      state: l.state,
      seq: 1,
      deadline: i + this.turnMs(),
      lastSeen: [i, i],
      winner: null,
      seasonId: o,
      result: null,
      createdAt: i,
      updatedAt: i
    };
    return await this.d.store.putMatch(d, null), await this.publish(d, l.events), d;
  }
  async load(t, a) {
    const r = await this.d.store.getMatch(String(a));
    if (!r) throw new P("NOT_FOUND", "Match not found.");
    const n = r.players.indexOf(t);
    if (n < 0) throw new P("NOT_PARTICIPANT", "You are not in this match.");
    return { m: r, me: n };
  }
  /** Applies one player action after full validation. */
  async act(t, a, r, n) {
    const { m: o, me: s } = await this.load(t, a);
    if (o.status !== "active" || !o.state)
      throw new P("NOT_ACTIVE", "This match is not in progress.");
    if (r !== o.seq)
      throw new P("STALE", "Your game is out of date.", { view: this.viewFor(o, s, []) });
    if (!n || typeof n != "object" || n.player !== s)
      throw new P("WRONG_PLAYER", "You can only act for yourself.");
    if (n.type === "endTurn" && n.strikes !== void 0) {
      const { strikes: d, ...c } = n;
      n = c;
    }
    const i = this.d.now();
    o.lastSeen = [...o.lastSeen], o.lastSeen[s] = i;
    const l = this.apply(o, n, i);
    if (!l.ok) throw new P("ILLEGAL", l.error);
    if (!await this.d.store.putMatch(l.match, o.seq))
      throw new P("STALE", "Your game is out of date.", { view: this.viewFor(o, s, []) });
    return await this.d.store.logAction(o.id, l.match.seq, s, n), await this.afterChange(l.match, l.events), this.viewFor(l.match, s, l.events);
  }
  apply(t, a, r) {
    const n = vn(t.state, a, this.ctx);
    if (!n.ok) return { ok: !1, error: n.error.message };
    const o = { ...t, state: n.state, seq: t.seq + 1, updatedAt: r };
    return (n.events.some((i) => i.type === "turnStarted") || n.state.phase !== t.state.phase) && (o.deadline = r + this.turnMs()), n.state.phase === "ended" && (o.status = "ended", o.winner = n.state.winner, o.deadline = null), { ok: !0, match: o, events: n.events };
  }
  /**
   * Called by clients every few seconds while a match is open: records that
   * they're still connected, ends a turn that ran out of time, and forfeits a
   * player who has been gone longer than the reconnect window.
   */
  async tick(t, a) {
    const r = await this.load(t, a), n = r.me;
    let o = r.m;
    const s = o.seq, i = this.d.now();
    o.lastSeen = [...o.lastSeen], o.lastSeen[n] = i;
    let l = [];
    const d = [];
    if (o.status === "active" && o.state) {
      const c = le.online.reconnectGraceSeconds * 1e3, u = [0, 1].find((g) => g !== n && i - o.lastSeen[g] > c), w = [];
      u !== void 0 ? w.push({ type: "surrender", player: u }) : o.deadline !== null && i > o.deadline + fo && w.push(...this.timeoutActions(o.state));
      for (const g of w) {
        const f = this.apply(o, g, i);
        if (!f.ok) break;
        o = f.match, l = [...l, ...f.events], d.push({ seq: o.seq, action: g });
      }
    }
    if (!await this.d.store.putMatch(o, s)) return this.view(t, a);
    if (d.length > 0) {
      for (const c of d) await this.d.store.logAction(o.id, c.seq, c.action.player, c.action);
      await this.afterChange(o, l);
    }
    return this.viewFor(o, n, l);
  }
  /** What the server does for a player whose time ran out. */
  timeoutActions(t) {
    return xn(t).map((a) => {
      const r = t.players[a];
      if (t.phase === "arrange")
        return { type: "arrangeLandscapes", player: a, order: [...r.landscapePool] };
      if (t.phase === "mulligan") return { type: "mulligan", player: a, iids: [] };
      const n = r.hand.length - this.ctx.balance.maxHandSize;
      return n > 0 ? { type: "endTurn", player: a, discard: r.hand.slice(-n).map((o) => o.iid) } : { type: "endTurn", player: a };
    });
  }
  async view(t, a) {
    const { m: r, me: n } = await this.load(t, a);
    return this.viewFor(r, n, []);
  }
  async current(t) {
    const a = await this.d.store.activeMatchOf(t);
    return a ? this.viewFor(a, a.players.indexOf(t), []) : null;
  }
  async afterChange(t, a) {
    t.status === "ended" && t.mode === "ranked" && !t.result && await this.finishRanked(t), await this.publish(t, a);
  }
  async finishRanked(t) {
    const a = t.seasonId ?? (await this.d.store.activeSeason()).id, r = t.players, n = await Promise.all(r.map((i) => this.ratingRow(i, a))), o = (i) => t.winner === "draw" ? 0.5 : t.winner === i ? 1 : 0, s = [0, 1].map((i) => {
      const l = n[i], d = qn(l.rating, n[i === 0 ? 1 : 0].rating, o(i), l.games);
      return { before: l.rating, after: d, row: l };
    });
    for (const i of [0, 1]) {
      const { after: l, row: d } = s[i];
      await this.d.store.putRating({
        ...d,
        rating: l,
        games: d.games + 1,
        wins: d.wins + (o(i) === 1 ? 1 : 0),
        losses: d.losses + (o(i) === 0 ? 1 : 0),
        peak: Math.max(d.peak, l)
      }), await this.grant(r[i], o(i) === 1 ? q.rewards.rankedWin : q.rewards.rankedLoss);
    }
    t.result = {
      ratings: [
        { before: s[0].before, after: s[0].after },
        { before: s[1].before, after: s[1].after }
      ]
    }, await this.d.store.putMatch(t, t.seq);
  }
  viewFor(t, a, r) {
    const n = {
      matchId: t.id,
      mode: t.mode,
      status: t.status,
      seq: t.seq,
      you: a,
      names: t.names,
      state: t.state ? Sn(t.state, a) : null,
      events: En(r, a),
      deadline: t.deadline,
      serverNow: this.d.now(),
      winner: t.winner,
      roomCode: t.roomCode
    }, o = t.result?.ratings?.[a];
    return o && (n.rating = { before: o.before, after: o.after, tier: Ne(o.after) }), n;
  }
  async publish(t, a) {
    for (const r of [0, 1]) {
      const n = t.players[r];
      n && await this.d.store.publishView(t.id, n, this.viewFor(t, r, a));
    }
  }
  // -------------------------------------------------------------------------
  // Seasons
  // -------------------------------------------------------------------------
  /** Ends the active season (if it's over): season rewards by tier, then a soft reset. */
  async seasonRollover(t = !1) {
    const a = await this.d.store.activeSeason(), r = this.d.now();
    if (!t && r < a.endsAt) return { rolled: !1, seasonId: a.id };
    const n = {
      id: a.id + 1,
      name: `Season ${a.id + 1}`,
      startsAt: r,
      endsAt: r + q.rating.seasonDays * 864e5,
      active: !0
    }, o = await this.d.store.ratingsOf(a.id);
    for (const s of o) {
      if (s.games === 0) continue;
      const i = q.rewards.seasonEnd[Ne(s.rating)];
      i && await this.grant(s.userId, i);
    }
    await this.d.store.startSeason(n);
    for (const s of o) {
      if (s.games === 0) continue;
      const i = Kn(s.rating);
      await this.d.store.putRating({
        userId: s.userId,
        seasonId: n.id,
        rating: i,
        games: 0,
        wins: 0,
        losses: 0,
        peak: i
      });
    }
    return { rolled: !0, seasonId: n.id };
  }
}
const Da = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
}, yo = 256 * 1024;
function L(e, t = 200) {
  return new Response(JSON.stringify(e), {
    status: t,
    headers: { ...Da, "Content-Type": "application/json" }
  });
}
const O = (e, t, a, r = {}) => L({ ok: !1, code: e, error: t, ...r }, a), go = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  NOT_PARTICIPANT: 403,
  STALE: 409,
  BUSY: 409
};
async function Co(e, t) {
  if (e.method === "OPTIONS") return new Response(null, { status: 204, headers: Da });
  if (e.method !== "POST") return O("BAD_REQUEST", "Use POST.", 405);
  const a = await e.text();
  if (a.length > yo) return O("BAD_REQUEST", "Request too large.", 413);
  let r;
  try {
    r = JSON.parse(a);
  } catch {
    return O("BAD_REQUEST", "Invalid JSON.", 400);
  }
  if (!r || typeof r != "object" || typeof r.op != "string")
    return O("BAD_REQUEST", "Missing op.", 400);
  const n = t.service;
  try {
    if (r.op === "seasonRollover")
      return t.isAdmin(e) ? L({ ok: !0, ...await n.seasonRollover() }) : O("FORBIDDEN", "Admin only.", 403);
    const o = await t.auth(e);
    if (!o) return O("UNAUTHORIZED", "Sign in first.", 401);
    const s = o.userId;
    switch (r.op) {
      case "sync":
        return L({ ok: !0, ...await n.sync(s, r) });
      case "profile":
        return L({ ok: !0, ...await n.profile(s) });
      case "queue":
        return L({ ok: !0, ...await n.queue(s, r.deck) });
      case "queueStatus":
        return L({ ok: !0, ...await n.queueStatus(s) });
      case "cancelQueue":
        return L({ ok: !0, ...await n.cancelQueue(s) });
      case "createRoom":
        return L({ ok: !0, ...await n.createRoom(s, r.deck) });
      case "joinRoom":
        return L({ ok: !0, ...await n.joinRoom(s, r.code, r.deck) });
      case "act":
        return L({
          ok: !0,
          view: await n.act(s, r.matchId, Number(r.seq), r.action)
        });
      case "tick":
        return L({ ok: !0, view: await n.tick(s, r.matchId) });
      case "view":
        return L({ ok: !0, view: await n.view(s, r.matchId) });
      case "current":
        return L({ ok: !0, view: await n.current(s) });
      default:
        return O("BAD_REQUEST", "Unknown op.", 400);
    }
  } catch (o) {
    return o instanceof P ? O(o.code, o.message, go[o.code] ?? 400, o.extra) : (console.error(o), O("BAD_REQUEST", "Server error.", 500));
  }
}
const ho = /* @__PURE__ */ JSON.parse(`[{"id":"infinite_figure","name":"Infinite Figure","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":8,"def":22,"keywords":[],"floop":{"cost":1,"effects":[{"type":"costMod","who":"enemy","kind":"floop","amount":1}]},"text":"Floop (1 MP): Increase enemy's Flooping cost by 1 next turn.","flavorText":"","artKey":"infinite_figure","image":"cards/infinite_figure.webp"},{"id":"timmy_magic_eyes","name":"Timmy Magic Eyes","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":15,"def":15,"keywords":[],"floop":{"cost":1,"effects":[{"type":"costMod","who":"self","kind":"floop","amount":-1}]},"text":"Floop (1 MP): Lower the cost of Flooping creatures by 1 this turn.","flavorText":"","artKey":"timmy_magic_eyes","image":"cards/timmy_magic_eyes.webp"},{"id":"cool_dog","name":"Cool Dog","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"atk":3,"def":7,"keywords":[],"floop":{"cost":1,"effects":[{"type":"lockFloop","target":"opposingCreature"}]},"text":"Floop (1 MP): Creature in the opposing lane cannot use its Floop ability next turn.","flavorText":"","artKey":"cool_dog","image":"cards/cool_dog.webp"},{"id":"cool_dog_gold","name":"Cool Dog","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":4,"def":11,"keywords":[],"floop":{"cost":1,"effects":[{"type":"lockFloop","target":"opposingCreature"}]},"text":"Floop (1 MP): Creature in the opposing lane cannot use its Floop ability next turn.","flavorText":"","artKey":"cool_dog_gold","image":"cards/cool_dog_gold.webp"},{"id":"grape_slimey","name":"Grape Slimey","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"atk":2,"def":5,"keywords":[],"floop":{"cost":1,"effects":[{"type":"draw","amount":1},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Draw one card and send this creature to the Discard Pile.","flavorText":"","artKey":"grape_slimey","image":"cards/grape_slimey.webp"},{"id":"grape_slimey_gold","name":"Grape Slimey","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":8,"keywords":[],"floop":{"cost":1,"effects":[{"type":"draw","amount":1},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Draw one card and send this creature to the Discard Pile.","flavorText":"","artKey":"grape_slimey_gold","image":"cards/grape_slimey_gold.webp"},{"id":"heavenly_gazer","name":"Heavenly Gazer","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"atk":1,"def":6,"keywords":[],"floop":{"cost":2,"effects":[{"type":"draw","amount":1}]},"text":"Floop (2 MP): Draw 1 Card.","flavorText":"","artKey":"heavenly_gazer","image":"cards/heavenly_gazer.webp"},{"id":"heavenly_gazer_gold","name":"Heavenly Gazer","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":1,"def":9,"keywords":[],"floop":{"cost":2,"effects":[{"type":"draw","amount":1}]},"text":"Floop (2 MP): Draw 1 Card.","flavorText":"","artKey":"heavenly_gazer_gold","image":"cards/heavenly_gazer_gold.webp"},{"id":"the_poultrygeist","name":"The Poultrygeist","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"atk":2,"def":6,"keywords":[],"floop":{"cost":1,"effects":[{"type":"gainMp","amount":2,"nextTurn":true}]},"text":"Floop (1 MP): Gain +2 Magic Points next turn.","flavorText":"","artKey":"the_poultrygeist","image":"cards/the_poultrygeist.webp"},{"id":"the_poultrygeist_gold","name":"The Poultrygeist","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":9,"keywords":[],"floop":{"cost":1,"effects":[{"type":"gainMp","amount":2,"nextTurn":true}]},"text":"Floop (1 MP): Gain +2 Magic Points next turn.","flavorText":"","artKey":"the_poultrygeist_gold","image":"cards/the_poultrygeist_gold.webp"},{"id":"woadic_time_walker","name":"Woadic Time Walker","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"atk":5,"def":5,"keywords":[],"floop":{"cost":3,"effects":[{"type":"redirect","target":"opposingCreature"}]},"text":"Floop (3 MP): Damage done to opposing creature next Battle Phase is transferred to Hero.","flavorText":"","artKey":"woadic_time_walker","image":"cards/woadic_time_walker.webp"},{"id":"woadic_time_walker_gold","name":"Woadic Time Walker","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":7,"def":8,"keywords":[],"floop":{"cost":3,"effects":[{"type":"redirect","target":"opposingCreature"}]},"text":"Floop (3 MP): Damage done to opposing creature next Battle Phase is transferred to Hero.","flavorText":"","artKey":"woadic_time_walker_gold","image":"cards/woadic_time_walker_gold.webp"},{"id":"ancient_scholar","name":"Ancient Scholar","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":3,"def":13,"keywords":[],"floop":{"cost":3,"effects":[{"type":"recover","cardType":"creature","pick":"best"}]},"text":"Floop (3 MP): Return a creature the from Discard Pile to your hand.","flavorText":"","artKey":"ancient_scholar","image":"cards/ancient_scholar.webp"},{"id":"ancient_scholar_gold","name":"Ancient Scholar","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":4,"def":20,"keywords":[],"floop":{"cost":3,"effects":[{"type":"recover","cardType":"creature","pick":"best"}]},"text":"Floop (3 MP): Return a creature the from Discard Pile to your hand.","flavorText":"","artKey":"ancient_scholar_gold","image":"cards/ancient_scholar_gold.webp"},{"id":"axey","name":"Axey","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":13,"def":5,"keywords":[],"floop":{"cost":1,"effects":[{"type":"returnBuilding","target":"opposingBuilding"}]},"text":"Floop (1 MP): Send Building in opposing lane back to opponent's hand.","flavorText":"","artKey":"axey","image":"cards/axey.webp"},{"id":"axey_gold","name":"Axey","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":19,"def":8,"keywords":[],"floop":{"cost":1,"effects":[{"type":"returnBuilding","target":"opposingBuilding"}]},"text":"Floop (1 MP): Send Building in opposing lane back to opponent's hand.","flavorText":"","artKey":"axey_gold","image":"cards/axey_gold.webp"},{"id":"blue_slimey","name":"Blue Slimey","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":2,"rarity":"legendary","stars":5,"atk":7,"def":14,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"adjacentAllies","amount":{"of":"selfDef"}},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Heal adjacent creatures by this creature's current DEF and discard.","flavorText":"","artKey":"blue_slimey","image":"cards/blue_slimey.webp"},{"id":"dragon_claw","name":"Dragon Claw","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":5,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"recover","cardType":"building","pick":"best"}]},"text":"Floop (2 MP): Return a Building from the Discard Pile to your hand.","flavorText":"","artKey":"dragon_claw","image":"cards/dragon_claw.webp"},{"id":"dragon_claw_gold","name":"Dragon Claw","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":7,"def":23,"keywords":[],"floop":{"cost":2,"effects":[{"type":"recover","cardType":"building","pick":"best"}]},"text":"Floop (2 MP): Return a Building from the Discard Pile to your hand.","flavorText":"","artKey":"dragon_claw_gold","image":"cards/dragon_claw_gold.webp"},{"id":"spectre_hector","name":"Spectre Hector","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":2,"rarity":"common","stars":1,"atk":7,"def":14,"keywords":[],"floop":{"cost":2,"effects":[{"type":"returnToHand","target":"opposingCreature"}]},"text":"Floop (2 MP): Send Creature in opposing lane back to the opponent's hand.","flavorText":"","artKey":"spectre_hector","image":"cards/spectre_hector.webp"},{"id":"heifergeist","name":"Heifergeist","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":13,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"reset","target":"self"}]},"text":"Floop (2 MP): Negate all Damage, Defense, and Attack modifiers on this creature.","flavorText":"","artKey":"heifergeist","image":"cards/heifergeist.webp"},{"id":"heifergeist_gold","name":"Heifergeist","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":19,"def":23,"keywords":[],"floop":{"cost":2,"effects":[{"type":"reset","target":"self"}]},"text":"Floop (2 MP): Negate all Damage, Defense, and Attack modifiers on this creature.","flavorText":"","artKey":"heifergeist_gold","image":"cards/heifergeist_gold.webp"},{"id":"psionic_architect","name":"Psionic Architect","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":17,"def":8,"keywords":[],"floop":{"cost":2,"effects":[{"type":"recover","cardType":"spell","pick":"best"}]},"text":"Floop (2 MP): Return a Spell from the Discard Pile to your hand.","flavorText":"","artKey":"psionic_architect","image":"cards/psionic_architect.webp"},{"id":"psionic_architect_gold","name":"Psionic Architect","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":25,"def":12,"keywords":[],"floop":{"cost":2,"effects":[{"type":"recover","cardType":"spell","pick":"best"}]},"text":"Floop (2 MP): Return a Spell from the Discard Pile to your hand.","flavorText":"","artKey":"psionic_architect_gold","image":"cards/psionic_architect_gold.webp"},{"id":"punk_cat","name":"Punk Cat","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":8,"def":22,"keywords":[],"floop":{"cost":3,"effects":[{"type":"activateFloop","target":"adjacentAllies"}]},"text":"Floop (3 MP): Activate an adjacent creature's Floop Ability if applicable.","flavorText":"","artKey":"punk_cat","image":"cards/punk_cat.webp"},{"id":"punk_cat_gold","name":"Punk Cat","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":12,"def":33,"keywords":[],"floop":{"cost":3,"effects":[{"type":"activateFloop","target":"adjacentAllies"}]},"text":"Floop (3 MP): Activate an adjacent creature's Floop Ability if applicable.","flavorText":"","artKey":"punk_cat_gold","image":"cards/punk_cat_gold.webp"},{"id":"temporal_wisp","name":"Temporal Wisp","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":9,"def":17,"keywords":[],"floop":{"cost":2,"effects":[{"type":"lockAttack","target":"opposingCreature"}]},"text":"Floop (2 MP): Opposing creature cannot attack on opponent's next Battle Phase.","flavorText":"","artKey":"temporal_wisp","image":"cards/temporal_wisp.webp"},{"id":"temporal_wisp_gold","name":"Temporal Wisp","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":13,"def":26,"keywords":[],"floop":{"cost":2,"effects":[{"type":"lockAttack","target":"opposingCreature"}]},"text":"Floop (2 MP): Opposing creature cannot attack on opponent's next Battle Phase","flavorText":"","artKey":"temporal_wisp_gold","image":"cards/temporal_wisp_gold.webp"},{"id":"dragon_foot","name":"Dragon Foot","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":5,"def":32,"keywords":[],"floop":{"cost":3,"effects":[{"type":"destroyBuilding","target":"opposingBuilding"}]},"text":"Floop (3 MP): Destroy Building in the opposing lane.","flavorText":"","artKey":"dragon_foot","image":"cards/dragon_foot.webp"},{"id":"dragon_foot_gold","name":"Dragon Foot","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":7,"def":48,"keywords":[],"floop":{"cost":3,"effects":[{"type":"destroyBuilding","target":"opposingBuilding"}]},"text":"Floop (3 MP): Destroy a Building in the opposing lane.","flavorText":"","artKey":"dragon_foot_gold","image":"cards/dragon_foot_gold.webp"},{"id":"ghost_djini","name":"Ghost Djini","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":10,"def":28,"keywords":[],"floop":{"cost":6,"effects":[{"type":"cycleHand","draw":5}]},"text":"Floop (6 MP): Shuffle your hand back into your Deck and draw 5 cards.","flavorText":"","artKey":"ghost_djini","image":"cards/ghost_djini.webp"},{"id":"ghost_djini_gold","name":"Ghost Djini","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":15,"def":42,"keywords":[],"floop":{"cost":6,"effects":[{"type":"cycleHand","draw":5}]},"text":"Floop (6 MP): Shuffle your hand back into your Deck and draw 5 cards.","flavorText":"","artKey":"ghost_djini_gold","image":"cards/ghost_djini_gold.webp"},{"id":"ghost_hag","name":"Ghost Hag","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":10,"def":28,"keywords":[],"floop":{"cost":3,"effects":[{"type":"reset","target":"chosenAllyCreature"}]},"text":"Floop (3 MP): Choose a friendly creature and negate all Damage, Defense, and Attack modifiers on it.","flavorText":"","artKey":"ghost_hag","image":"cards/ghost_hag.webp"},{"id":"ghost_hag_gold","name":"Ghost Hag","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":15,"def":42,"keywords":[],"floop":{"cost":3,"effects":[{"type":"reset","target":"chosenAllyCreature"}]},"text":"Floop (3 MP): Choose a friendly creature and negate all Damage, Defense, and Attack modifiers on it.","flavorText":"","artKey":"ghost_hag_gold","image":"cards/ghost_hag_gold.webp"},{"id":"struzann_jinn","name":"Struzann Jinn","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":15,"def":25,"keywords":[],"floop":{"cost":3,"effects":[{"type":"returnToHand","target":"opposingCreature"}]},"text":"Floop (3 MP): Send Creature in opposing lane back to opponent's hand.","flavorText":"","artKey":"struzann_jinn","image":"cards/struzann_jinn.webp"},{"id":"struzann_jinn_gold","name":"Struzann Jinn","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":22,"def":38,"keywords":[],"floop":{"cost":3,"effects":[{"type":"returnToHand","target":"opposingCreature"}]},"text":"Floop (3 MP): Send Creature in opposing lane back to opponent's hand.","flavorText":"","artKey":"struzann_jinn_gold","image":"cards/struzann_jinn_gold.webp"},{"id":"woadic_marauder","name":"Woadic Marauder","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":22,"def":12,"keywords":[],"floop":{"cost":1,"effects":[{"type":"returnBuilding","target":"chosenEnemyBuilding"}]},"text":"Floop (1 MP): Choose an opposing Building and send it back to your opponent's hand.","flavorText":"","artKey":"woadic_marauder","image":"cards/woadic_marauder.webp"},{"id":"woadic_marauder_gold","name":"Woadic Marauder","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":33,"def":18,"keywords":[],"floop":{"cost":1,"effects":[{"type":"returnBuilding","target":"chosenEnemyBuilding"}]},"text":"Floop (1 MP): Choose an opposing Building and send it back to your opponent's hand.","flavorText":"","artKey":"woadic_marauder_gold","image":"cards/woadic_marauder_gold.webp"},{"id":"diamond_dan","name":"Diamond Dan","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":1,"def":47,"keywords":[],"floop":{"cost":1,"effects":[{"type":"gainMp","amount":6},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Destroy this creature and gain 6 Magic Points this turn.","flavorText":"","artKey":"diamond_dan","image":"cards/diamond_dan.webp"},{"id":"diamond_dan_gold","name":"Diamond Dan","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":1,"def":71,"keywords":[],"floop":{"cost":1,"effects":[{"type":"gainMp","amount":6},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Destroy this creature and gain 6 Magic Points this turn.","flavorText":"","artKey":"diamond_dan_gold","image":"cards/diamond_dan_gold.webp"},{"id":"embarrassing_bard","name":"Embarrassing Bard","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":10,"def":34,"keywords":[],"floop":{"cost":2,"effects":[{"type":"lockFloop","target":"chosenEnemyCreature"}]},"text":"Floop (2 MP): Choose an opposing creature. It cannot use its Floop ability next turn.","flavorText":"","artKey":"embarrassing_bard","image":"cards/embarrassing_bard.webp"},{"id":"embarrassing_bard_gold","name":"Embarrassing Bard","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":15,"def":51,"keywords":[],"floop":{"cost":2,"effects":[{"type":"lockFloop","target":"chosenEnemyCreature"}]},"text":"Floop (2 MP): Choose an opposing creature. It cannot use its Floop ability next turn.","flavorText":"","artKey":"embarrassing_bard_gold","image":"cards/embarrassing_bard_gold.webp"},{"id":"fantasmo","name":"Fantasmo","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":15,"def":38,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":4,"stealOnKill":true}]},"text":"Floop (3 MP): Does 4 damage. If the defending creature card dies, the card is added into the attacker's hand instead of going into the defender's discard pile.","flavorText":"","artKey":"fantasmo","image":"cards/fantasmo.webp"},{"id":"madame_seota","name":"Madame Seota","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":29,"def":19,"keywords":[],"floop":{"cost":6,"effects":[{"type":"draw","amount":3}]},"text":"Floop (6 MP): Draw 3 card.","flavorText":"","artKey":"madame_seota","image":"cards/madame_seota.webp"},{"id":"woadic_chief","name":"Woadic Chief","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":18,"def":30,"keywords":[],"floop":{"cost":3,"effects":[{"type":"seal","target":"opposingLandscape"}]},"text":"Floop (3 MP): No Creature or Building may be summoned on the opposing lane next turn.","flavorText":"","artKey":"woadic_chief","image":"cards/woadic_chief.webp"},{"id":"woadic_chief_gold","name":"Woadic Chief","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":27,"def":45,"keywords":[],"floop":{"cost":3,"effects":[{"type":"seal","target":"opposingLandscape"}]},"text":"Floop (3 MP): No Creature or Building may be summoned on the opposing lane next turn.","flavorText":"","artKey":"woadic_chief_gold","image":"cards/woadic_chief_gold.webp"},{"id":"x_large_spirit_soldier","name":"X-Large Spirit Soldier","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":5,"def":40,"keywords":[],"floop":{"cost":1,"effects":[{"type":"draw","amount":1},{"type":"returnToHand","target":"self"}]},"text":"Floop (1 MP): Return this creature to your hand and draw 1 card.","flavorText":"","artKey":"x_large_spirit_soldier","image":"cards/x_large_spirit_soldier.webp"},{"id":"x_large_spirit_soldier_gold","name":"X-Large Spirit Soldier","type":"creature","landscape":"azure","requirements":[{"landscape":"azure","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":7,"def":60,"keywords":[],"floop":{"cost":1,"effects":[{"type":"draw","amount":1},{"type":"returnToHand","target":"self"}]},"text":"Floop (1 MP): Return this creature to your hand and draw 1 card.","flavorText":"","artKey":"x_large_spirit_soldier_gold","image":"cards/x_large_spirit_soldier_gold.webp"},{"id":"apple_tree","name":"Apple Tree","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":9,"def":21,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"allAllyCreatures","amount":{"of":"targetDamage"}},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Fully heal all your creatures and destroy this creature.","flavorText":"","artKey":"apple_tree","image":"cards/apple_tree.webp"},{"id":"fatapillar","name":"Fatapillar","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":3,"def":27,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"chosenCreature","amount":{"of":"floopsThisTurn","mul":5}}]},"text":"Floop (1 MP): Choose a creature and heal it 5 points for every creature you Flooped this turn.","flavorText":"","artKey":"fatapillar","image":"cards/fatapillar.webp"},{"id":"nicelands_cutie","name":"Nicelands Cutie","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":20,"def":10,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"ownHero","amount":{"of":"floopsThisTurn","mul":3}}]},"text":"Floop (2 MP): Heal your Hero 3 points for every creature you Flooped this turn.","flavorText":"","artKey":"nicelands_cutie","image":"cards/nicelands_cutie.webp"},{"id":"angel_heart","name":"Angel Heart","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"atk":1,"def":6,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":3}]},"text":"Floop (1 MP): Choose one of your creature and heal it 3 points.","flavorText":"","artKey":"angel_heart","image":"cards/angel_heart.webp"},{"id":"angel_heart_gold","name":"Angel Heart","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":1,"def":9,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":3}]},"text":"Floop (1 MP): Choose one of your creature and heal it 3 points.","flavorText":"","artKey":"angel_heart_gold","image":"cards/angel_heart_gold.webp"},{"id":"blueberry_djini","name":"Blueberry Djini","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"atk":2,"def":7,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"ownHero","amount":2}]},"text":"Floop (2 MP): Heal your Hero 2 points.","flavorText":"","artKey":"blueberry_djini","image":"cards/blueberry_djini.webp"},{"id":"blueberry_djini_gold","name":"Blueberry Djini","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":11,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"ownHero","amount":2}]},"text":"Floop (2 MP): Heal your Hero 2 points.","flavorText":"","artKey":"blueberry_djini_gold","image":"cards/blueberry_djini_gold.webp"},{"id":"fairy_shepard","name":"Fairy Shepard","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"atk":2,"def":7,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":3,"splash":true}]},"text":"Floop (3 MP): Choose one of your creatures. Heal it and its adjacent creatures 3 points.","flavorText":"","artKey":"fairy_shepard","image":"cards/fairy_shepard.webp"},{"id":"fairy_shepard_gold","name":"Fairy Shepard","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":11,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":3,"splash":true}]},"text":"Floop (3 MP): Choose one of your creatures. Heal it and its adjacent creatures 3 points.","flavorText":"","artKey":"fairy_shepard_gold","image":"cards/fairy_shepard_gold.webp"},{"id":"fluffapillar","name":"Fluffapillar","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"atk":2,"def":5,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"adjacentAllies","amount":3}]},"text":"Floop (2 MP): Heal adjacent creatures 3 points.","flavorText":"","artKey":"fluffapillar","image":"cards/fluffapillar.webp"},{"id":"fluffapillar_gold","name":"Fluffapillar","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":8,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"adjacentAllies","amount":3}]},"text":"Floop (2 MP): Heal adjacent creatures 3 points.","flavorText":"","artKey":"fluffapillar_gold","image":"cards/fluffapillar_gold.webp"},{"id":"soft_eyeling","name":"Soft Eyeling","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"atk":2,"def":6,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"chosenCreature","amount":{"of":"ownLandscapeTypes","mul":3}}]},"text":"Floop (3 MP): Choose a creature and heal 3 points for each of your different landscapes.","flavorText":"","artKey":"soft_eyeling","image":"cards/soft_eyeling.webp"},{"id":"soft_eyeling_gold","name":"Soft Eyeling","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":9,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"chosenCreature","amount":{"of":"ownLandscapeTypes","mul":3}}]},"text":"Floop (3 MP): Choose a creature and heal 3 points for each of your different landscapes.","flavorText":"","artKey":"soft_eyeling_gold","image":"cards/soft_eyeling_gold.webp"},{"id":"dr_phillip_flufferson","name":"Dr Phillip Flufferson","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"common","stars":1,"atk":5,"def":16,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"adjacentAllies","amount":5}]},"text":"Floop (2 MP): Heal adjacent creatures 5 points.","flavorText":"","artKey":"dr_phillip_flufferson","image":"cards/dr_phillip_flufferson.webp"},{"id":"music_mallard","name":"Music Mallard","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":4,"def":12,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"self","amount":5},{"type":"heal","target":"adjacentAllies","amount":5}]},"text":"Floop (3 MP): Heal this creature and adjacent creatures 5 points.","flavorText":"","artKey":"music_mallard","image":"cards/music_mallard.webp"},{"id":"music_mallard_gold","name":"Music Mallard","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":6,"def":18,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"self","amount":5},{"type":"heal","target":"adjacentAllies","amount":5}]},"text":"Floop (3 MP): Heal this creature and adjacent creatures 5 points.","flavorText":"","artKey":"music_mallard_gold","image":"cards/music_mallard_gold.webp"},{"id":"nicelands_eye_bat","name":"Nicelands Eye Bat","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":7,"def":10,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"handSize","mul":4}}]},"text":"Floop (3 MP): Choose one of your creatures and heal it 4 points for each card in your hand.","flavorText":"","artKey":"nicelands_eye_bat","image":"cards/nicelands_eye_bat.webp"},{"id":"nicelands_eye_bat_gold","name":"Nicelands Eye Bat","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":10,"def":15,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"handSize","mul":4}}]},"text":"Floop (3 MP): Choose one of your creatures and heal it 4 points for each card in your hand.","flavorText":"","artKey":"nicelands_eye_bat_gold","image":"cards/nicelands_eye_bat_gold.webp"},{"id":"snake_mint","name":"Snake Mint","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":9,"def":9,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":2},{"type":"heal","target":"self","amount":4}]},"text":"Floop (2 MP): Deal 2 Damage to creature in opposing lane and heal this creature 4 points.","flavorText":"","artKey":"snake_mint","image":"cards/snake_mint.webp"},{"id":"snake_mint_gold","name":"Snake Mint","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":13,"def":14,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":2},{"type":"heal","target":"self","amount":4}]},"text":"Floop (2 MP): Deal 2 Damage to creature in opposing lane and heal this creature 4 points.","flavorText":"","artKey":"snake_mint_gold","image":"cards/snake_mint_gold.webp"},{"id":"snowball","name":"Snowball","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"legendary","stars":5,"atk":5,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":{"of":"timesFlooped"},"def":0}]},"text":"Floop (2 MP): Raise Attack by the number of times you have flooped this creature.","flavorText":"","artKey":"snowball","image":"cards/snowball.webp"},{"id":"snuggle_tree","name":"Snuggle Tree","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":3,"def":15,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"self","amount":4},{"type":"heal","target":"adjacentAllies","amount":4}]},"text":"Floop (3 MP): Heal this creature and adjacent creatures 4 points.","flavorText":"","artKey":"snuggle_tree","image":"cards/snuggle_tree.webp"},{"id":"snuggle_tree_gold","name":"Snuggle Tree","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":4,"def":23,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"self","amount":4},{"type":"heal","target":"adjacentAllies","amount":4}]},"text":"Floop (3 MP): Heal this creature and adjacent creatures 4 points.","flavorText":"","artKey":"snuggle_tree_gold","image":"cards/snuggle_tree_gold.webp"},{"id":"bad_rose","name":"Bad Rose","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":19,"def":21,"keywords":[],"floop":{"cost":6,"effects":[{"type":"cycleHand","draw":5},{"type":"gainMp","amount":2,"nextTurn":true}]},"text":"Floop (6 MP): Return all cards, draw 5 cards, and gain 2 Magic points next turn.","flavorText":"","artKey":"bad_rose","image":"cards/bad_rose.webp"},{"id":"candyr_gold","name":"Candyr","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":10,"def":25,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":{"of":"targetMaxDef"},"duration":"round"}]},"text":"Floop (3 MP): Increased the defence critical area by 200% for all your creatures for the next time you defend.","flavorText":"","artKey":"candyr_gold","image":"cards/candyr_gold.webp"},{"id":"detective_bobby","name":"Detective Bobby","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":5,"def":21,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"adjacentAllies","amount":6}]},"text":"Floop (2 MP): Adjacent creatures heal 6 points.","flavorText":"","artKey":"detective_bobby","image":"cards/detective_bobby.webp"},{"id":"detective_bobby_gold","name":"Detective Bobby","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":7,"def":32,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"adjacentAllies","amount":6}]},"text":"Floop (2 MP): Adjacent creatures heal 6 points.","flavorText":"","artKey":"detective_bobby_gold","image":"cards/detective_bobby_gold.webp"},{"id":"dog_boy","name":"Dog Boy","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":13,"def":17,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":5},{"type":"heal","target":"self","amount":5}]},"text":"Floop (1 MP): Deal 5 Damage to creature in opposing lane and heal this creature 5 points.","flavorText":"","artKey":"dog_boy","image":"cards/dog_boy.webp"},{"id":"dog_boy_gold","name":"Dog Boy","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":19,"def":26,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":5},{"type":"heal","target":"self","amount":5}]},"text":"Floop (1 MP): Deal 5 Damage to creature in opposing lane and heal this creature 5 points.","flavorText":"","artKey":"dog_boy_gold","image":"cards/dog_boy_gold.webp"},{"id":"furious_hen","name":"Furious Hen","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":6,"def":24,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":3},{"type":"heal","target":"self","amount":4}]},"text":"Floop (2 MP): Deal 3 damage to creature in opposing lane and heal this creature 4 points.","flavorText":"","artKey":"furious_hen","image":"cards/furious_hen.webp"},{"id":"furious_hen_gold","name":"Furious Hen","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":9,"def":36,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":3},{"type":"heal","target":"self","amount":4}]},"text":"Floop (2 MP): Deal 3 damage to creature in opposing lane and heal this creature 4 points.","flavorText":"","artKey":"furious_hen_gold","image":"cards/furious_hen_gold.webp"},{"id":"the_cow","name":"The Cow","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":4,"def":26,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"allAllyCreatures","amount":5}]},"text":"Floop (3 MP): Heal all of your creatures 5 points.","flavorText":"","artKey":"the_cow","image":"cards/the_cow.webp"},{"id":"the_cow_gold","name":"The Cow","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":6,"def":39,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"allAllyCreatures","amount":5}]},"text":"Floop (3 MP): Heal all of your creatures 5 points.","flavorText":"","artKey":"the_cow_gold","image":"cards/the_cow_gold.webp"},{"id":"weak_candyr","name":"Weak Candyr","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":1,"atk":2,"def":20,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":3},{"type":"destroy","target":"self"}]},"text":"Floop (2 MP): Deal 3 damage to creature in the opposing lane and Discard this creature.","flavorText":"","artKey":"weak_candyr","image":"cards/weak_candyr.webp"},{"id":"well_dressed_wolf","name":"Well Dressed Wolf","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":10,"def":18,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"self","amount":{"of":"targetDamage"}}]},"text":"Floop (2 MP): Heal all Damage from this creature.","flavorText":"","artKey":"well_dressed_wolf","image":"cards/well_dressed_wolf.webp"},{"id":"well_dressed_wolf_gold","name":"Well Dressed Wolf","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":15,"def":27,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"self","amount":{"of":"targetDamage"}}]},"text":"Floop (2 MP): Heal all Damage from this creature.","flavorText":"","artKey":"well_dressed_wolf_gold","image":"cards/well_dressed_wolf_gold.webp"},{"id":"dr_stuffenstein_real","name":"Dr. Stuffenstein","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Real","atk":15,"def":22,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"ownBuildings","mul":4}}]},"text":"Floop (2 MP): Choose one of your creatures and heal it 4 points for each of your buildings.","flavorText":"","artKey":"dr_stuffenstein_real","image":"cards/dr_stuffenstein_real.webp"},{"id":"farmer_tom","name":"Farmer Tom","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":12,"def":21,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"ownBuildings","mul":6}}]},"text":"Floop (2 MP): Choose one of your creatures and heal it 6 points for each of your buildings.","flavorText":"","artKey":"farmer_tom","image":"cards/farmer_tom.webp"},{"id":"farmer_tom_gold","name":"Farmer Tom","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":18,"def":32,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"ownBuildings","mul":6}}]},"text":"Floop (2 MP): Choose one of your creatures and heal it 6 points for each of your buildings.","flavorText":"","artKey":"farmer_tom_gold","image":"cards/farmer_tom_gold.webp"},{"id":"intern_stuffenstein","name":"Intern Stuffenstein","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":0,"def":1,"keywords":[],"floop":{"cost":2,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"ownBuildings","mul":4}}]},"text":"Floop (2 MP): Choose one of your creatures and heal it 4 points for each of your buildings.","flavorText":"","artKey":"intern_stuffenstein","image":"cards/intern_stuffenstein.webp"},{"id":"lt_mushroom","name":"Lt. Mushroom","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":14,"def":25,"keywords":[],"floop":{"cost":6,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":14},{"type":"heal","target":"self","amount":25}]},"text":"Floop (6 MP): Choose an opposing creature. Deal 14 Damage to it and heal this creature 25 points.","flavorText":"","artKey":"lt_mushroom","image":"cards/lt_mushroom.webp"},{"id":"lt_mushroom_gold","name":"Lt. Mushroom","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":21,"def":37,"keywords":[],"floop":{"cost":6,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":14},{"type":"heal","target":"self","amount":25}]},"text":"Floop (6 MP): Choose an opposing creature. Deal 14 Damage to it and heal this creature 25 points.","flavorText":"","artKey":"lt_mushroom_gold","image":"cards/lt_mushroom_gold.webp"},{"id":"sack_o_pain","name":"Sack O' Pain","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":3,"def":33,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"adjacentAllies","amount":{"of":"selfDamage"}}]},"text":"Floop (3 MP): Heal adjacent creatures equal to the Damage on this creature.","flavorText":"","artKey":"sack_o_pain","image":"cards/sack_o_pain.webp"},{"id":"sack_o_pain_gold","name":"Sack O' Pain","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":4,"def":50,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"adjacentAllies","amount":{"of":"selfDamage"}}]},"text":"Floop (3 MP): Heal adjacent creatures equal to the Damage on this creature.","flavorText":"","artKey":"sack_o_pain_gold","image":"cards/sack_o_pain_gold.webp"},{"id":"sgt_mushroom","name":"Sgt. Mushroom","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":26,"def":14,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":4},{"type":"heal","target":"self","amount":6}]},"text":"Floop (1 MP): Choose an opposing creature. Deal 4 Damage to it and heal this creature 6 points.","flavorText":"","artKey":"sgt_mushroom","image":"cards/sgt_mushroom.webp"},{"id":"sgt_mushroom_gold","name":"Sgt. Mushroom","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":39,"def":21,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":4},{"type":"heal","target":"self","amount":6}]},"text":"Floop (1 MP): Choose an opposing creature. Deal 4 Damage to it and heal this creature 6 points.","flavorText":"","artKey":"sgt_mushroom_gold","image":"cards/sgt_mushroom_gold.webp"},{"id":"cottonpult","name":"Cottonpult","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":25,"def":20,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":7},{"type":"heal","target":"self","amount":7}]},"text":"Floop (3 MP): Deal 7 damage to creature in opposing lane and heal this creature 7 points.","flavorText":"","artKey":"cottonpult","image":"cards/cottonpult.webp"},{"id":"cottonpult_gold","name":"Cottonpult","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":37,"def":30,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":7},{"type":"heal","target":"self","amount":7}]},"text":"Floop (3 MP): Deal 7 damage to creature in opposing lane and heal this creature 7 points.","flavorText":"","artKey":"cottonpult_gold","image":"cards/cottonpult_gold.webp"},{"id":"cottonsaurus_rex","name":"Cottonsaurus Rex","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":7,"def":40,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"ownHero","amount":{"of":"selfAtk"}}]},"text":"Floop (3 MP): Heal your Hero equal to this creature's Attack.","flavorText":"","artKey":"cottonsaurus_rex","image":"cards/cottonsaurus_rex.webp"},{"id":"cottonsaurus_rex_gold","name":"Cottonsaurus Rex","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":10,"def":60,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"ownHero","amount":{"of":"selfAtk"}}]},"text":"Floop (3 MP): Heal your Hero equal to this creature's Attack.","flavorText":"","artKey":"cottonsaurus_rex_gold","image":"cards/cottonsaurus_rex_gold.webp"},{"id":"furious_rooster","name":"Furious Rooster","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":15,"def":28,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":10},{"type":"heal","target":"self","amount":6}]},"text":"Floop (2 MP): Deal 10 damage to creature in opposing lane and heal this creature 6 points.","flavorText":"","artKey":"furious_rooster","image":"cards/furious_rooster.webp"},{"id":"ghost_bull","name":"Ghost Bull","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":20,"def":28,"keywords":[],"floop":{"cost":6,"effects":[{"type":"damage","target":"opposingCreature","amount":20},{"type":"heal","target":"self","amount":28}]},"text":"Floop (6 MP): Deal 20 Damage to creature in opposing lane and heal this creature 28 points.","flavorText":"","artKey":"ghost_bull","image":"cards/ghost_bull.webp"},{"id":"good_king_wonderful","name":"Good King Wonderful","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":5,"def":40,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"targetDamage"}}]},"text":"Floop (3 MP): Choose one of your creatures and heal all Damage from it.","flavorText":"","artKey":"good_king_wonderful","image":"cards/good_king_wonderful.webp"},{"id":"good_king_wonderful_gold","name":"Good King Wonderful","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":7,"def":60,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"targetDamage"}}]},"text":"Floop (3 MP): Choose one of your creatures and heal all Damage from it.","flavorText":"","artKey":"good_king_wonderful_gold","image":"cards/good_king_wonderful_gold.webp"},{"id":"hate_bird","name":"Hate Bird","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":5,"def":40,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"self","amount":{"of":"opposingAtk"}}]},"text":"Floop (3 MP): Heals this creature with the amount of the opposing creature's attack.","flavorText":"","artKey":"hate_bird","image":"cards/hate_bird.webp"},{"id":"mother_fluff_bucket","name":"Mother Fluff Bucket","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":13,"def":30,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"ownHero","amount":5}]},"text":"Floop (3 MP): Heal your Hero 5 points","flavorText":"","artKey":"mother_fluff_bucket","image":"cards/mother_fluff_bucket.webp"},{"id":"mother_fluff_bucket_gold","name":"Mother Fluff Bucket","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":19,"def":45,"keywords":[],"floop":{"cost":3,"effects":[{"type":"heal","target":"ownHero","amount":5}]},"text":"Floop (3 MP): Heal your Hero 5 points.","flavorText":"","artKey":"mother_fluff_bucket_gold","image":"cards/mother_fluff_bucket_gold.webp"},{"id":"nice_bird","name":"Nice Bird","type":"creature","landscape":"candy","requirements":[{"landscape":"candy","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":5,"def":35,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"adjacentAllies","amount":20},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Sacrifice this card and heal adjacent cards for 20 HP each.","flavorText":"","artKey":"nice_bird","image":"cards/nice_bird.webp"},{"id":"green_party_ogre","name":"Green Party Ogre","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":11,"def":19,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"chosenAllyCreature","atk":0,"def":{"of":"floopsThisTurn","mul":4}}]},"text":"Floop (2 MP): Choose a friendly creature and raise its Defense by 4 for every creature you Flooped this turn.","flavorText":"","artKey":"green_party_ogre","image":"cards/green_party_ogre.webp"},{"id":"sandasaurus_rex","name":"Sandasaurus Rex","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":14,"def":16,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"chosenEnemyCreature","atk":0,"def":{"of":"floopsThisTurn","mul":-5}}]},"text":"Floop (3 MP): Choose an enemy creature and lower its Defense by 5 for every creature you Flooped this turn.","flavorText":"","artKey":"sandasaurus_rex","image":"cards/sandasaurus_rex.webp"},{"id":"burning_hand","name":"Burning Hand","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"atk":5,"def":2,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"opposingCreature","atk":0,"def":-2}]},"text":"Floop (1 MP): Lower the Defense of creature in the opposite lane by 2.","flavorText":"","artKey":"burning_hand","image":"cards/burning_hand.webp"},{"id":"burning_hand_gold","name":"Burning Hand","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":7,"def":3,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"opposingCreature","atk":0,"def":-2}]},"text":"Floop (1 MP): Lower the Defense of creature in the opposite lane by 2.","flavorText":"","artKey":"burning_hand_gold","image":"cards/burning_hand_gold.webp"},{"id":"green_cactaball","name":"Green Cactaball","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"atk":4,"def":5,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":0,"def":2}]},"text":"Floop (1 MP): Gain +2 Defense.","flavorText":"","artKey":"green_cactaball","image":"cards/green_cactaball.webp"},{"id":"green_cactaball_gold","name":"Green Cactaball","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":6,"def":5,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":0,"def":2}]},"text":"Floop (1 MP): Gain +2 Defense.","flavorText":"","artKey":"green_cactaball_gold","image":"cards/green_cactaball_gold.webp"},{"id":"ms_mummy","name":"Ms.Mummy","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"atk":3,"def":6,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"adjacentAllies","atk":0,"def":3}]},"text":"Floop (3 MP): Adjacent creatures gain +3 Defense.","flavorText":"","artKey":"ms_mummy","image":"cards/ms_mummy.webp"},{"id":"ms_mummy_gold","name":"Ms.Mummy","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":4,"def":9,"keywords":[],"floop":{"cost":3,"effects":[{"type":"gainMp","amount":2,"nextTurn":true}]},"text":"Floop (3 MP): Gain +2 Magic Points next turn.","flavorText":"","artKey":"ms_mummy_gold","image":"cards/ms_mummy_gold.webp"},{"id":"mud_angel_gold","name":"Mud Angel","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"rare","stars":3,"variant":"Gold","atk":13,"def":32,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"chosenEnemyCreature","atk":0,"def":-6}]},"text":"Floop (1 MP): Choose an opposing creature and lower its Defense by 6.","flavorText":"","artKey":"mud_angel_gold","image":"cards/mud_angel_gold.webp"},{"id":"sand_angel","name":"Sand Angel","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"atk":2,"def":6,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"chosenAllyCreature","atk":0,"def":2}]},"text":"Floop (1 MP): Choose one of your creatures and give it +2 Defense.","flavorText":"","artKey":"sand_angel","image":"cards/sand_angel.webp"},{"id":"sand_angel_gold","name":"Sand Angel","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":9,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"chosenAllyCreature","atk":0,"def":2}]},"text":"Floop (1 MP): Choose one of your creatures and give it +2 Defense.","flavorText":"","artKey":"sand_angel_gold","image":"cards/sand_angel_gold.webp"},{"id":"sand_eyebat","name":"Sand Eyebat","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"atk":4,"def":4,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"chosenEnemyCreature","atk":0,"def":-2}]},"text":"Floop (1 MP): Choose an opposing creature and lower its Defense by 2","flavorText":"","artKey":"sand_eyebat","image":"cards/sand_eyebat.webp"},{"id":"sand_eyebat_gold","name":"Sand Eyebat","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":6,"def":6,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"chosenEnemyCreature","atk":0,"def":-2}]},"text":"Floop (1 MP): Choose and opposing creature and lower its Defense by 2","flavorText":"","artKey":"sand_eyebat_gold","image":"cards/sand_eyebat_gold.webp"},{"id":"beach_mum","name":"Beach Mum","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":9,"def":11,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":2,"def":3}]},"text":"Floop (3 MP): Gain +2 Attack and +3 Defense.","flavorText":"","artKey":"beach_mum","image":"cards/beach_mum.webp"},{"id":"beach_mum_gold","name":"Beach Mum","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":13,"def":17,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":2,"def":3}]},"text":"Floop (3 MP): Gain +2 Attack and +3 Defense.","flavorText":"","artKey":"beach_mum_gold","image":"cards/beach_mum_gold.webp"},{"id":"lime_slimey","name":"Lime Slimey","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":8,"def":8,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":0,"def":3},{"type":"buff","target":"adjacentAllies","atk":0,"def":3}]},"text":"Floop (3 MP): This creature and adjacent creatures gain +3 Defense.","flavorText":"","artKey":"lime_slimey","image":"cards/lime_slimey.webp"},{"id":"lime_slimey_gold","name":"Lime Slimey","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":12,"def":12,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":0,"def":3},{"type":"buff","target":"adjacentAllies","atk":0,"def":3}]},"text":"Floop (3 MP): This creature and adjacent creatures gain +3 Defense.","flavorText":"","artKey":"lime_slimey_gold","image":"cards/lime_slimey_gold.webp"},{"id":"mayonaise_angel","name":"Mayonaise Angel","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":4,"def":12,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"chosenAllyCreature","atk":0,"def":4}]},"text":"Floop (2 MP): Choose one of your creatures and give it +4 Defense each.","flavorText":"","artKey":"mayonaise_angel","image":"cards/mayonaise_angel.webp"},{"id":"mayonaise_angel_gold","name":"Mayonaise Angel","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":6,"def":18,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"chosenAllyCreature","atk":0,"def":4}]},"text":"Floop (2 MP): Choose one of your creatures and give it +4 Defense.","flavorText":"","artKey":"mayonaise_angel_gold","image":"cards/mayonaise_angel_gold.webp"},{"id":"sandbacho","name":"Sandbacho","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":2,"rarity":"common","stars":1,"atk":11,"def":10,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":0,"def":4},{"type":"buff","target":"adjacentAllies","atk":0,"def":4}]},"text":"Floop (3 MP): This creature and adjacent creatures gain +4 Defense.","flavorText":"","artKey":"sandbacho","image":"cards/sandbacho.webp"},{"id":"sandsnake","name":"Sandsnake","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":12,"def":7,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"opposingCreature","atk":0,"def":-5}]},"text":"Floop (3 MP): Lower the Defense of the creature in the opposite lane by 5.","flavorText":"","artKey":"sandsnake","image":"cards/sandsnake.webp"},{"id":"sandsnake_gold","name":"Sandsnake","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":18,"def":11,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"opposingCreature","atk":0,"def":-5}]},"text":"Floop (3 MP): Lower the Defense of the creature in the opposite lane by 5.","flavorText":"","artKey":"sandsnake_gold","image":"cards/sandsnake_gold.webp"},{"id":"mud_angel","name":"Mud Angel","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":9,"def":21,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"chosenEnemyCreature","atk":0,"def":-6}]},"text":"Floop (1 MP): Choose an opposing creature and lower its Defense by 6.","flavorText":"","artKey":"mud_angel","image":"cards/mud_angel.webp"},{"id":"prickle","name":"Prickle","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":9,"def":18,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":5},{"type":"damage","target":"enemyHero","amount":5}]},"text":"Floop (3 MP): Deal 5 Damage to the opposing creature and Hero.","flavorText":"","artKey":"prickle","image":"cards/prickle.webp"},{"id":"sand_jackal","name":"Sand Jackal","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":6,"def":21,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":0,"def":{"of":"selfAtk","mul":-1}}]},"text":"Floop (2 MP): Lower the Defense of the opposing creature equal to this creature's Attack.","flavorText":"","artKey":"sand_jackal","image":"cards/sand_jackal.webp"},{"id":"sand_jackal_gold","name":"Sand Jackal","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":9,"def":32,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":0,"def":{"of":"selfAtk","mul":-1}}]},"text":"Floop (2 MP): Lower the Defense of the opposing creature equal to this creature's Attack.","flavorText":"","artKey":"sand_jackal_gold","image":"cards/sand_jackal_gold.webp"},{"id":"sandfoot","name":"Sandfoot","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":10,"def":17,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":0,"def":{"of":"ownCreatures","mul":4}}]},"text":"Floop (3 MP): Gain +4 Defense for each of your creatures.","flavorText":"","artKey":"sandfoot","image":"cards/sandfoot.webp"},{"id":"sandfoot_gold","name":"Sandfoot","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":15,"def":26,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":0,"def":{"of":"ownCreatures","mul":4}}]},"text":"Floop (3 MP): Gain +4 Defense for each of your creatures.","flavorText":"","artKey":"sandfoot_gold","image":"cards/sandfoot_gold.webp"},{"id":"wall_of_sand","name":"Wall Of Sand","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":0,"def":26,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"adjacentAllies","atk":0,"def":4}]},"text":"Floop (2 MP): Adjacent creatures gain +4 Defense.","flavorText":"","artKey":"wall_of_sand","image":"cards/wall_of_sand.webp"},{"id":"wall_of_sand_gold","name":"Wall Of Sand","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":0,"def":39,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"adjacentAllies","atk":0,"def":4}]},"text":"Floop (2 MP): Adjacent creatures gain +4 Defense.","flavorText":"","artKey":"wall_of_sand_gold","image":"cards/wall_of_sand_gold.webp"},{"id":"wall_of_chocolate","name":"Wall of Chocolate","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":3,"rarity":"legendary","stars":5,"atk":5,"def":22,"keywords":[],"floop":{"cost":0,"effects":[{"type":"heal","target":"allCreatures","amount":5},{"type":"damage","target":"self","amount":2}]},"text":"Floop (0 MP): Heal all creatures for 5 and take 2 damage in return.","flavorText":"","artKey":"wall_of_chocolate","image":"cards/wall_of_chocolate.webp"},{"id":"fummy","name":"Fummy","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":10,"def":24,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":0,"def":6},{"type":"buff","target":"adjacentAllies","atk":0,"def":6}]},"text":"Floop (2 MP): This creature and adjacent creatures gain +6 Defense.","flavorText":"","artKey":"fummy","image":"cards/fummy.webp"},{"id":"fummy_gold","name":"Fummy","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":15,"def":36,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":0,"def":6},{"type":"buff","target":"adjacentAllies","atk":0,"def":6}]},"text":"Floop (2 MP): This creature and adjacent creatures gain +6 Defense.","flavorText":"","artKey":"fummy_gold","image":"cards/fummy_gold.webp"},{"id":"giant_mummy_hand","name":"Giant Mummy Hand","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":9,"def":29,"keywords":[],"floop":{"cost":6,"effects":[{"type":"buff","target":"self","atk":0,"def":10},{"type":"buff","target":"adjacentAllies","atk":0,"def":10}]},"text":"Floop (6 MP): This creature and adjacent creatures gain +10 Defense.","flavorText":"","artKey":"giant_mummy_hand","image":"cards/giant_mummy_hand.webp"},{"id":"giant_mummy_hand_gold","name":"Giant Mummy Hand","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":13,"def":43,"keywords":[],"floop":{"cost":6,"effects":[{"type":"buff","target":"self","atk":0,"def":10},{"type":"buff","target":"adjacentAllies","atk":0,"def":10}]},"text":"Floop (6 MP): This creature and adjacent creatures gain +10 Defense.","flavorText":"","artKey":"giant_mummy_hand_gold","image":"cards/giant_mummy_hand_gold.webp"},{"id":"lady_mary","name":"Lady Mary","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":18,"def":20,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":{"of":"ownBuildings","mul":2}}]},"text":"Floop (3 MP): Increase the Defense of all of your creatures by 2 for each building you control.","flavorText":"","artKey":"lady_mary","image":"cards/lady_mary.webp"},{"id":"lady_mary_gold","name":"Lady Mary","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":27,"def":30,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":{"of":"ownBuildings","mul":2}}]},"text":"Floop (3 MP): Increase the Defense of all of your creatures by 2 for each building you control.","flavorText":"","artKey":"lady_mary_gold","image":"cards/lady_mary_gold.webp"},{"id":"sand_knight","name":"Sand Knight","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":20,"def":20,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":5}]},"text":"Floop (2 MP): All of your creatures gain +5 Defense","flavorText":"","artKey":"sand_knight","image":"cards/sand_knight.webp"},{"id":"sand_knight_gold","name":"Sand Knight","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":30,"def":30,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":5}]},"text":"Floop (2 MP): All of your creatures gain +5 Defense","flavorText":"","artKey":"sand_knight_gold","image":"cards/sand_knight_gold.webp"},{"id":"sandwitch","name":"Sandwitch","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":25,"def":10,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"randomCreature","atk":0,"def":9}]},"text":"Floop (1 MP): +9 Defense to a random creature on the field, including your opponents..","flavorText":"","artKey":"sandwitch","image":"cards/sandwitch.webp"},{"id":"sandwitch_gold","name":"Sandwitch","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":37,"def":15,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"randomCreature","atk":0,"def":9}]},"text":"Floop (1 MP): +9 Defense to a random creature on the field, including your opponents..","flavorText":"","artKey":"sandwitch_gold","image":"cards/sandwitch_gold.webp"},{"id":"black_cat","name":"Black Cat","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":15,"def":35,"keywords":[],"floop":{"cost":6,"effects":[{"type":"buff","target":"chosenEnemyCreature","atk":0,"def":-30}]},"text":"Floop (6 MP): Choose an opposing creature and lower its Defense by 30.","flavorText":"","artKey":"black_cat","image":"cards/black_cat.webp"},{"id":"cactus_thug","name":"Cactus Thug","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":25,"def":12,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"selfDef"}}]},"text":"Floop (2 MP): Deal Damage to creature in opposing equal to this creature's Defense.","flavorText":"","artKey":"cactus_thug","image":"cards/cactus_thug.webp"},{"id":"cactus_thug_gold","name":"Cactus Thug","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":37,"def":18,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"selfDef"}}]},"text":"Floop (2 MP): Deal Damage to creature in opposing equal to this creature's Defense.","flavorText":"","artKey":"cactus_thug_gold","image":"cards/cactus_thug_gold.webp"},{"id":"count_cactus","name":"Count Cactus","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":5,"def":48,"keywords":[],"floop":{"cost":5,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":{"of":"targetMaxDef","mul":0.5},"duration":"round"}]},"text":"Floop (5 MP): Increase the defence area for all creatures next turn by 150%.","flavorText":"","artKey":"count_cactus","image":"cards/count_cactus.webp"},{"id":"lost_golem","name":"Lost Golem","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":10,"def":36,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":0,"def":8}]},"text":"Floop (1 MP): Gain +8 Defense.","flavorText":"","artKey":"lost_golem","image":"cards/lost_golem.webp"},{"id":"lost_golem_gold","name":"Lost Golem","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":15,"def":54,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":0,"def":8}]},"text":"Floop (1 MP): Gain +8 Defense.","flavorText":"","artKey":"lost_golem_gold","image":"cards/lost_golem_gold.webp"},{"id":"pieclops","name":"Pieclops","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":20,"def":25,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"allEnemyCreatures","atk":0,"def":-5}]},"text":"Floop (2 MP): Lower the Defense of all opposing creatures by 5.","flavorText":"","artKey":"pieclops","image":"cards/pieclops.webp"},{"id":"pieclops_gold","name":"Pieclops","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":30,"def":38,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"allEnemyCreatures","atk":0,"def":-5}]},"text":"Floop (2 MP): Lower the Defense of all opposing creatures by 5.","flavorText":"","artKey":"pieclops_gold","image":"cards/pieclops_gold.webp"},{"id":"sandy","name":"Sandy","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":28,"def":18,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":3,"def":7}]},"text":"Floop (2 MP): Gain +3 Attack and +7 Defense.","flavorText":"","artKey":"sandy","image":"cards/sandy.webp"},{"id":"sandy_gold","name":"Sandy","type":"creature","landscape":"dune","requirements":[{"landscape":"dune","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":42,"def":27,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":3,"def":7}]},"text":"Floop (2 MP): Gain +3 Attack and +7 Defense.","flavorText":"","artKey":"sandy_gold","image":"cards/sandy_gold.webp"},{"id":"log_knight","name":"Log Knight","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":10,"def":20,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":{"of":"floopsThisTurn","mul":4},"def":0}]},"text":"Floop (2 MP): Raise this creature's Attack by 4 for each creature you Flooped this turn.","flavorText":"","artKey":"log_knight","image":"cards/log_knight.webp"},{"id":"sun_king","name":"Sun King","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":5,"def":25,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"chosenCreature","atk":{"of":"ownBuildings","mul":4},"def":0}]},"text":"Floop (3 MP): Choose a creature and raise its Attack 4 points for each building you control.","flavorText":"","artKey":"sun_king","image":"cards/sun_king.webp"},{"id":"yellow_gnome","name":"Yellow Gnome","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":0,"def":30,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"opposingCreature","atk":-4,"def":0},{"type":"buff","target":"self","atk":4,"def":0}]},"text":"Floop (1 MP): Lower opposing creature's Attack by 4 and raise this creature's Attack by 4.","flavorText":"","artKey":"yellow_gnome","image":"cards/yellow_gnome.webp"},{"id":"cornball","name":"Cornball","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"atk":2,"def":5,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":1,"def":0}]},"text":"Floop (2 MP): +1 Attack.","flavorText":"","artKey":"cornball","image":"cards/cornball.webp"},{"id":"cornball_gold","name":"Cornball","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":8,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":1,"def":0}]},"text":"Floop (2 MP): +1 Attack.","flavorText":"","artKey":"cornball_gold","image":"cards/cornball_gold.webp"},{"id":"ethan_allfire","name":"Ethan Allfire","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"atk":5,"def":1,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"opposingCreature","atk":-3,"def":0},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Lower the Attack of the opposing creature by 3 and destroy this creature.","flavorText":"","artKey":"ethan_allfire","image":"cards/ethan_allfire.webp"},{"id":"ethan_allfire_gold","name":"Ethan Allfire","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":7,"def":2,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"opposingCreature","atk":-3,"def":0},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Lower the Attack of the opposing creature by 3 and destroy this creature.","flavorText":"","artKey":"ethan_allfire_gold","image":"cards/ethan_allfire_gold.webp"},{"id":"husker_knight","name":"Husker Knight","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"atk":6,"def":3,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"adjacentAllies","atk":2,"def":0}]},"text":"Floop (3 MP): Adjacent creatures gain +2 Attack.","flavorText":"","artKey":"husker_knight","image":"cards/husker_knight.webp"},{"id":"husker_knight_gold","name":"Husker Knight","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":9,"def":5,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"adjacentAllies","atk":2,"def":0}]},"text":"Floop (3 MP): Adjacent creatures gain +2 Attack.","flavorText":"","artKey":"husker_knight_gold","image":"cards/husker_knight_gold.webp"},{"id":"husker_worm","name":"Husker Worm","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"atk":3,"def":5,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":-2,"def":0}]},"text":"Floop (2 MP): Lower the Attack of the creature in the opposing lane by 2.","flavorText":"","artKey":"husker_worm","image":"cards/husker_worm.webp"},{"id":"husker_worm_gold","name":"Husker Worm","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":4,"def":8,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":-2,"def":0}]},"text":"Floop (2 MP): Lower the Attack of the creature in the opposing lane by 2.","flavorText":"","artKey":"husker_worm_gold","image":"cards/husker_worm_gold.webp"},{"id":"travelin_farmer","name":"Travelin' Farmer","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"atk":5,"def":5,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":{"of":"adjacentEmptyLanes"},"def":0}]},"text":"Floop (1 MP): Gain +1 Attack for each adjacent empty lane.","flavorText":"","artKey":"travelin_farmer","image":"cards/travelin_farmer.webp"},{"id":"travelin_farmer_gold","name":"Travelin' Farmer","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":7,"def":8,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":{"of":"adjacentEmptyLanes"},"def":0}]},"text":"Floop (1 MP): Gain +1 Attack for each adjacent empty lane.","flavorText":"","artKey":"travelin_farmer_gold","image":"cards/travelin_farmer_gold.webp"},{"id":"archer_dan","name":"Archer Dan","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":12,"def":6,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"chosenEnemyCreature","atk":-4,"def":0}]},"text":"Floop (2 MP): Choose an opposing creature and lower its Attack by 4.","flavorText":"","artKey":"archer_dan","image":"cards/archer_dan.webp"},{"id":"archer_dan_gold","name":"Archer Dan","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":18,"def":9,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"chosenEnemyCreature","atk":-4,"def":0}]},"text":"Floop (2 MP): Choose an opposing creature and lower its Attack by 4.","flavorText":"","artKey":"archer_dan_gold","image":"cards/archer_dan_gold.webp"},{"id":"corn_dog","name":"Corn Dog","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":9,"def":11,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"adjacentAllies","atk":4,"def":0}]},"text":"Floop (3 MP): Adjacent creatures gain +4 Attack.","flavorText":"","artKey":"corn_dog","image":"cards/corn_dog.webp"},{"id":"corn_dog_gold","name":"Corn Dog","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":13,"def":17,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"adjacentAllies","atk":4,"def":0}]},"text":"Floop (3 MP): Adjacent creatures gain +4 Attack.","flavorText":"","artKey":"corn_dog_gold","image":"cards/corn_dog_gold.webp"},{"id":"rural_earl","name":"Rural Earl","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":2,"rarity":"common","stars":1,"atk":13,"def":8,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":{"of":"adjacentEmptyLanes","mul":2},"def":0}]},"text":"Floop (2 MP): Gain +2 Attack for each adjacent empty lane.","flavorText":"","artKey":"rural_earl","image":"cards/rural_earl.webp"},{"id":"wall_of_ears","name":"Wall of Ears","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":0,"def":18,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"self","amount":2},{"type":"buff","target":"self","atk":2,"def":0}]},"text":"Floop (1 MP): Inflict 2 Damage to this creature and gain +2 attack.","flavorText":"","artKey":"wall_of_ears","image":"cards/wall_of_ears.webp"},{"id":"wall_of_ears_gold","name":"Wall of Ears","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":0,"def":27,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"self","amount":2},{"type":"buff","target":"self","atk":2,"def":0}]},"text":"Floop (1 MP): Inflict 2 Damage to this creature and gain +2 attack.","flavorText":"","artKey":"wall_of_ears_gold","image":"cards/wall_of_ears_gold.webp"},{"id":"chupamaiz_gold","name":"ChupaMaiz","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":13,"def":13,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":{"of":"targetAtk"},"def":0,"duration":"turn"}]},"text":"Floop (3 MP): Increase the critical area for all your creatures on your next attack by 200%.","flavorText":"","artKey":"chupamaiz_gold","image":"cards/chupamaiz_gold.webp"},{"id":"corn_ronin","name":"Corn Ronin","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":18,"def":10,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":{"of":"handSize","mul":3},"def":0}]},"text":"Floop (2 MP): +3 Attack for every card in your hand.","flavorText":"","artKey":"corn_ronin","image":"cards/corn_ronin.webp"},{"id":"corn_ronin_gold","name":"Corn Ronin","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":27,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":{"of":"handSize","mul":3},"def":0}]},"text":"Floop (2 MP): +3 Attack for every card in your hand.","flavorText":"","artKey":"corn_ronin_gold","image":"cards/corn_ronin_gold.webp"},{"id":"huskerbat","name":"Huskerbat","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":4,"def":22,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":{"of":"selfAtk","mul":-1},"def":0}]},"text":"Floop (2 MP): Lower the Attack of the opposing creature equal to this creature's Attack.","flavorText":"","artKey":"huskerbat","image":"cards/huskerbat.webp"},{"id":"huskerbat_gold","name":"Huskerbat","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":6,"def":33,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":{"of":"selfAtk","mul":-1},"def":0}]},"text":"Floop (2 MP): Lower the Attack of the opposing creature equal to this creature's Attack.","flavorText":"","artKey":"huskerbat_gold","image":"cards/huskerbat_gold.webp"},{"id":"patchy_the_pumpkin","name":"Patchy the Pumpkin","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":22,"def":5,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":-5,"def":0}]},"text":"Floop (2 MP): Lower the Attack of the opposing creature by 5.","flavorText":"","artKey":"patchy_the_pumpkin","image":"cards/patchy_the_pumpkin.webp"},{"id":"purple_cow","name":"Purple Cow","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"legendary","stars":5,"atk":5,"def":20,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":5},{"type":"damage","target":"self","amount":5}]},"text":"Floop (2 MP): Damage all enemy creatures for 5 and take 5 damage in return.","flavorText":"","artKey":"purple_cow","image":"cards/purple_cow.webp"},{"id":"the_sludger","name":"The Sludger","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":15,"def":15,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"adjacentAllies","atk":4,"def":-2}]},"text":"Floop (1 MP): Lower the Defense of adjacent creatures by 2 and increase their Attack by 4.","flavorText":"","artKey":"the_sludger","image":"cards/the_sludger.webp"},{"id":"the_sludger_gold","name":"The Sludger","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":22,"def":23,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"adjacentAllies","atk":4,"def":-2}]},"text":"Floop (1 MP): Lower the Defense of adjacent creatures by 2 and increase their Attack by 4.","flavorText":"","artKey":"the_sludger_gold","image":"cards/the_sludger_gold.webp"},{"id":"weak_chupamaiz","name":"Weak ChupaMaiz","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":3,"rarity":"rare","stars":1,"atk":4,"def":10,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":3},{"type":"destroy","target":"self"}]},"text":"Floop (2 MP): Deal 3 damage to creature in the opposing lane and Discard this creature.","flavorText":"","artKey":"weak_chupamaiz","image":"cards/weak_chupamaiz.webp"},{"id":"cornataur","name":"Cornataur","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":17,"def":19,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":5,"def":0},{"type":"buff","target":"adjacentAllies","atk":5,"def":0}]},"text":"Floop (3 MP): This creature and adjacent creatures gain +5 Attack.","flavorText":"","artKey":"cornataur","image":"cards/cornataur.webp"},{"id":"cornataur_gold","name":"Cornataur","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":25,"def":29,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":5,"def":0},{"type":"buff","target":"adjacentAllies","atk":5,"def":0}]},"text":"Floop (3 MP): This creature and adjacent creatures gain +5 Attack.","flavorText":"","artKey":"cornataur_gold","image":"cards/cornataur_gold.webp"},{"id":"field_reaper","name":"Field Reaper","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":25,"def":13,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allEnemyCreatures","atk":-4,"def":0}]},"text":"Floop (3 MP): Lower the Attack of All opposing creatures by 4.","flavorText":"","artKey":"field_reaper","image":"cards/field_reaper.webp"},{"id":"field_reaper_gold","name":"Field Reaper","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":37,"def":20,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allEnemyCreatures","atk":-4,"def":0}]},"text":"Floop (3 MP): Lower the Attack of All opposing creatures by 4.","flavorText":"","artKey":"field_reaper_gold","image":"cards/field_reaper_gold.webp"},{"id":"field_stalker","name":"Field Stalker","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":5,"def":34,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":{"of":"selfAtk","sub":"targetAtk"},"def":0}]},"text":"Floop (2 MP): Make the Attack of the opposing creature equal to this creature's Attack.","flavorText":"","artKey":"field_stalker","image":"cards/field_stalker.webp"},{"id":"field_stalker_gold","name":"Field Stalker","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":7,"def":51,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":{"of":"selfAtk","sub":"targetAtk"},"def":0}]},"text":"Floop (2 MP): Make the Attack of the opposing creature equal to this creature's Attack.","flavorText":"","artKey":"field_stalker_gold","image":"cards/field_stalker_gold.webp"},{"id":"ghost_sludger","name":"Ghost Sludger","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":1,"def":37,"keywords":[],"floop":{"cost":6,"effects":[{"type":"buff","target":"self","atk":13,"def":0}]},"text":"Floop (6 MP): +13 Attack.","flavorText":"","artKey":"ghost_sludger","image":"cards/ghost_sludger.webp"},{"id":"ghost_sludger_gold","name":"Ghost Sludger","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":2,"def":55,"keywords":[],"floop":{"cost":6,"effects":[{"type":"buff","target":"self","atk":13,"def":0}]},"text":"Floop (6 MP): +13 Attack.","flavorText":"","artKey":"ghost_sludger_gold","image":"cards/ghost_sludger_gold.webp"},{"id":"mary_ann","name":"Mary-Ann","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":10,"def":27,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":5},{"type":"buff","target":"opposingCreature","atk":-5,"def":0}]},"text":"Floop (2 MP): Deal 5 Damage to the opposing creature and lower its Attack by 5.","flavorText":"","artKey":"mary_ann","image":"cards/mary_ann.webp"},{"id":"mary_ann_gold","name":"Mary-Ann","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":15,"def":41,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":5},{"type":"buff","target":"opposingCreature","atk":-5,"def":0}]},"text":"Floop (2 MP): Deal 5 Damage to the opposing creature and lower its Attack by 5.","flavorText":"","artKey":"mary_ann_gold","image":"cards/mary_ann_gold.webp"},{"id":"captain_taco","name":"Captain Taco","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":15,"def":30,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"opposingCreature","atk":{"of":"enemyHandSize","mul":-1},"def":0}]},"text":"Floop (1 MP): Lower the opposing creature's Attack by 1 for every card in your opponent's hand.","flavorText":"","artKey":"captain_taco","image":"cards/captain_taco.webp"},{"id":"captain_taco_gold","name":"Captain Taco","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":22,"def":45,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"opposingCreature","atk":{"of":"enemyHandSize","mul":-1},"def":0}]},"text":"Floop (1 MP): Lower the opposing creature's Attack by 1 for every card in your opponent's hand.","flavorText":"","artKey":"captain_taco_gold","image":"cards/captain_taco_gold.webp"},{"id":"corn_lord","name":"Corn Lord","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":10,"def":38,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"chosenCreature","atk":6,"def":0}]},"text":"Floop (2 MP): Choose a creature and give it +6 Attack.","flavorText":"","artKey":"corn_lord","image":"cards/corn_lord.webp"},{"id":"corn_lord_gold","name":"Corn Lord","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":15,"def":57,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"chosenCreature","atk":6,"def":0}]},"text":"Floop (2 MP): Choose a creature and give it +6 Attack.","flavorText":"","artKey":"corn_lord_gold","image":"cards/corn_lord_gold.webp"},{"id":"husker_giant","name":"Husker Giant","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":15,"def":30,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":{"of":"ownLandscapesOf","mul":2,"landscape":"golden"},"def":0}]},"text":"Floop (1 MP): +2 Attack for each of your Corn landscapes.","flavorText":"","artKey":"husker_giant","image":"cards/husker_giant.webp"},{"id":"husker_giant_gold","name":"Husker Giant","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":22,"def":45,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":{"of":"ownLandscapesOf","mul":2,"landscape":"golden"},"def":0}]},"text":"Floop (1 MP): +2 Attack for each of your Corn landscapes.","flavorText":"","artKey":"husker_giant_gold","image":"cards/husker_giant_gold.webp"},{"id":"legion_of_earlings","name":"Legion of Earlings","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":23,"def":23,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":5,"def":0}]},"text":"Floop (3 MP): All your creatures gain +5 Attack.","flavorText":"","artKey":"legion_of_earlings","image":"cards/legion_of_earlings.webp"},{"id":"ugly_tree","name":"Ugly Tree","type":"creature","landscape":"golden","requirements":[{"landscape":"golden","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":15,"def":33,"keywords":[],"floop":{"cost":6,"effects":[{"type":"buff","target":"adjacentAllies","atk":9,"def":0}]},"text":"Floop (6 MP): Adjacent creatures gain +9 Attack.","flavorText":"","artKey":"ugly_tree","image":"cards/ugly_tree.webp"},{"id":"bald_mans_throne","name":"Bald Man's Throne","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":15,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"floopsThisTurn","mul":5}}]},"text":"Floop (2 MP): Deal 5 Damage to opposing creature for every creature you Flooped this turn.","flavorText":"","artKey":"bald_mans_throne","image":"cards/bald_mans_throne.webp"},{"id":"eye_guy","name":"Eye Guy","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":0,"rarity":"legendary","stars":5,"atk":12,"def":18,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"enemyHero","amount":{"of":"floopsThisTurn","mul":3}}]},"text":"Floop (3 MP): Deal 3 Damage to opposing Hero for every creature you Flooped this turn.","flavorText":"","artKey":"eye_guy","image":"cards/eye_guy.webp"},{"id":"banshe_princess","name":"Banshe Princess","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"legendary","stars":1,"atk":7,"def":2,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":4}]},"text":"Floop (3 MP): Deal 4 damage to creature in the opposing lane.","flavorText":"","artKey":"banshe_princess","image":"cards/banshe_princess.webp"},{"id":"banshe_princess_gold","name":"Banshe Princess","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"legendary","stars":5,"variant":"Gold","atk":10,"def":3,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":4}]},"text":"Floop (3 MP): Deal 4 damage to creature in the opposing lane.","flavorText":"","artKey":"banshe_princess_gold","image":"cards/banshe_princess_gold.webp"},{"id":"gray_eyebat","name":"Gray Eyebat","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"atk":3,"def":5,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":2}]},"text":"Floop (2 MP): Deal 2 Damage to any opposing creature.","flavorText":"","artKey":"gray_eyebat","image":"cards/gray_eyebat.webp"},{"id":"gray_eyebat_gold","name":"Gray Eyebat","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":4,"def":8,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":2}]},"text":"Floop (2 MP): Deal 2 Damage to any opposing creature.","flavorText":"","artKey":"gray_eyebat_gold","image":"cards/gray_eyebat_gold.webp"},{"id":"mace_stump","name":"Mace Stump","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"atk":6,"def":3,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":3}]},"text":"Floop (3 MP): Deal 3 Damage to creature in the opposing lane.","flavorText":"","artKey":"mace_stump","image":"cards/mace_stump.webp"},{"id":"mace_stump_gold","name":"Mace Stump","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":9,"def":5,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":3}]},"text":"Floop (3 MP): Deal 3 Damage to creature in the opposing lane.","flavorText":"","artKey":"mace_stump_gold","image":"cards/mace_stump_gold.webp"},{"id":"orange_slimey","name":"Orange Slimey","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"atk":3,"def":4,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":4},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Deal 4 Damage to creature in the opposing lane and Discard this creature.","flavorText":"","artKey":"orange_slimey","image":"cards/orange_slimey.webp"},{"id":"orange_slimey_gold","name":"Orange Slimey","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":4,"def":6,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":4},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Deal 4 Damage to creature in the opposing lane and Discard this creature.","flavorText":"","artKey":"orange_slimey_gold","image":"cards/orange_slimey_gold.webp"},{"id":"teeth_leaf","name":"Teeth Leaf","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"atk":5,"def":3,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"enemyHero","amount":2}]},"text":"Floop (2 MP): Deal 2 Damage to the Opposing Hero.","flavorText":"","artKey":"teeth_leaf","image":"cards/teeth_leaf.webp"},{"id":"teeth_leaf_gold","name":"Teeth Leaf","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":7,"def":5,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"enemyHero","amount":2}]},"text":"Floop (2 MP): Deal 2 Damage to the Opposing Hero.","flavorText":"","artKey":"teeth_leaf_gold","image":"cards/teeth_leaf_gold.webp"},{"id":"wandering_bald_man","name":"Wandering Bald Man","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"atk":2,"def":5,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":2}]},"text":"Floop (2 MP): Deal 2 damage to creature in the opposing lane.","flavorText":"","artKey":"wandering_bald_man","image":"cards/wandering_bald_man.webp"},{"id":"wandering_bald_man_gold","name":"Wandering Bald Man","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":8,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":2}]},"text":"Floop (2 MP): Deal 2 damage to creature in the opposing lane.","flavorText":"","artKey":"wandering_bald_man_gold","image":"cards/wandering_bald_man_gold.webp"},{"id":"bog_bum","name":"Bog Bum","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":8,"def":10,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":5}]},"text":"Floop (2 MP): Deal 5 damage to creature in the opposing lane.","flavorText":"","artKey":"bog_bum","image":"cards/bog_bum.webp"},{"id":"bog_bum_gold","name":"Bog Bum","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":12,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":5}]},"text":"Floop (2 MP): Deal 5 damage to creature in the opposing lane.","flavorText":"","artKey":"bog_bum_gold","image":"cards/bog_bum_gold.webp"},{"id":"green_merman","name":"Green Merman","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":6,"def":12,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"enemyBuildings","mul":3}}]},"text":"Floop (2 MP): Deal 3 Damage for each enemy building to the creature in the opposing lane.","flavorText":"","artKey":"green_merman","image":"cards/green_merman.webp"},{"id":"green_merman_gold","name":"Green Merman","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":9,"def":18,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"enemyBuildings","mul":3}}]},"text":"Floop (2 MP): Deal 3 Damage for each enemy building to the creature in the opposing lane.","flavorText":"","artKey":"green_merman_gold","image":"cards/green_merman_gold.webp"},{"id":"herculeye","name":"Herculeye","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":11,"def":9,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"handSize","mul":2}}]},"text":"Floop (1 MP): Deal 2 Damage for each card in your hand to the creature in the opposing lane.","flavorText":"","artKey":"herculeye","image":"cards/herculeye.webp"},{"id":"herculeye_gold","name":"Herculeye","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":16,"def":14,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"handSize","mul":2}}]},"text":"Floop (1 MP): Deal 2 Damage for each card in your hand to the creature in the opposing lane.","flavorText":"","artKey":"herculeye_gold","image":"cards/herculeye_gold.webp"},{"id":"hot_eyebat","name":"Hot Eyebat","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":8,"def":9,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":4}]},"text":"Floop (2 MP): Deal 4 Damage to any opposing creature.","flavorText":"","artKey":"hot_eyebat","image":"cards/hot_eyebat.webp"},{"id":"hot_eyebat_gold","name":"Hot Eyebat","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":12,"def":14,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":4}]},"text":"Floop (2 MP): Deal 4 Damage to any opposing creature.","flavorText":"","artKey":"hot_eyebat_gold","image":"cards/hot_eyebat_gold.webp"},{"id":"pete_bog","name":"Pete Bog","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"common","stars":1,"atk":9,"def":12,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"handSize","mul":3}}]},"text":"Floop (2 MP): Deal 3 Damage for each card in your hand to the creature in the opposing lane.","flavorText":"","artKey":"pete_bog","image":"cards/pete_bog.webp"},{"id":"snappy_dresser","name":"Snappy Dresser","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"atk":4,"def":14,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownLandscapeTypes","mul":2}}]},"text":"Floop (1 MP): Deal 2 Damage to creature in opposing lane for each of your different landscapes.","flavorText":"","artKey":"snappy_dresser","image":"cards/snappy_dresser.webp"},{"id":"snappy_dresser_gold","name":"Snappy Dresser","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":6,"def":21,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownLandscapeTypes","mul":2}}]},"text":"Floop (1 MP): Deal 2 Damage to creature in opposing lane for each of your different landscapes.","flavorText":"","artKey":"snappy_dresser_gold","image":"cards/snappy_dresser_gold.webp"},{"id":"baldferatu_gold","name":"Baldferatu","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":18,"def":17,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"selfDamage","mul":2}}]},"text":"Floop (2 MP): Deals 200% of the damage that it received last turn to the opposing creature.","flavorText":"","artKey":"baldferatu_gold","image":"cards/baldferatu_gold.webp"},{"id":"banshe_queen","name":"Banshe Queen","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"legendary","stars":3,"atk":10,"def":19,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":4}]},"text":"Floop (3 MP): Deal 4 damage to all opposing creatures.","flavorText":"","artKey":"banshe_queen","image":"cards/banshe_queen.webp"},{"id":"banshe_queen_gold","name":"Banshe Queen","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"legendary","stars":5,"variant":"Gold","atk":15,"def":28,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":4}]},"text":"Floop (3 MP): Deal 4 damage to all opposing creatures.","flavorText":"","artKey":"banshe_queen_gold","image":"cards/banshe_queen_gold.webp"},{"id":"green_mermaid","name":"Green Mermaid","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":11,"def":17,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownBuildings","mul":3}}]},"text":"Floop (1 MP): Deal 3 Damage for each of your buildings to the creature in the opposing lane.","flavorText":"","artKey":"green_mermaid","image":"cards/green_mermaid.webp"},{"id":"green_mermaid_gold","name":"Green Mermaid","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":16,"def":26,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownBuildings","mul":3}}]},"text":"Floop (1 MP): Deal 3 Damage for each of your buildings to the creature in the opposing lane.","flavorText":"","artKey":"green_mermaid_gold","image":"cards/green_mermaid_gold.webp"},{"id":"pea_soup_barfer","name":"Pea Soup Barfer","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"legendary","stars":5,"atk":10,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"adjacentAllies","atk":0,"def":-2},{"type":"buff","target":"self","atk":5,"def":0}]},"text":"Floop (2 MP): Lower the Defense of adjacent creatures by 2 and increase the Attack of this creature by 5.","flavorText":"","artKey":"pea_soup_barfer","image":"cards/pea_soup_barfer.webp"},{"id":"record_thug","name":"Record Thug","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":8,"def":20,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"selfDamage"}}]},"text":"Floop (2 MP): Deal Damage to the opposing creature equal to the Damage on this creature.","flavorText":"","artKey":"record_thug","image":"cards/record_thug.webp"},{"id":"record_thug_gold","name":"Record Thug","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":12,"def":30,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"selfDamage"}}]},"text":"Floop (2 MP): Deal Damage to the opposing creature equal to the Damage on this creature.","flavorText":"","artKey":"record_thug_gold","image":"cards/record_thug_gold.webp"},{"id":"red_eyeling","name":"Red Eyeling","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"rare","stars":3,"atk":7,"def":21,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":4,"splash":true}]},"text":"Floop (3 MP): Deal 4 Damage to creature in opposing lane and its adjacent creatures.","flavorText":"","artKey":"red_eyeling","image":"cards/red_eyeling.webp"},{"id":"red_eyeling_gold","name":"Red Eyeling","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":10,"def":32,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":4,"splash":true}]},"text":"Floop (3 MP): Deal 4 Damage to creature in opposing lane and its adjacent creatures.","flavorText":"","artKey":"red_eyeling_gold","image":"cards/red_eyeling_gold.webp"},{"id":"tree_of_underneath_gold","name":"Tree of Underneath","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":97,"def":78,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":2},{"type":"heal","target":"allAllyCreatures","amount":4}]},"text":"Floop (3 MP): Deal 2 Damage to all opposing creatures and heal all of your creatures 4 points.","flavorText":"","artKey":"tree_of_underneath_gold","image":"cards/tree_of_underneath_gold.webp"},{"id":"weak_baldferatu","name":"Weak Baldferatu","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":3,"rarity":"rare","stars":1,"atk":15,"def":18,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":3},{"type":"destroy","target":"self"}]},"text":"Floop (2 MP): Deal 3 damage to creature in the opposing lane and Discard this creature.","flavorText":"","artKey":"weak_baldferatu","image":"cards/weak_baldferatu.webp"},{"id":"bog_banshe_angel","name":"Bog BanShe Angel","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":24,"def":15,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"handSize","mul":4}}]},"text":"Floop (3 MP): Deal 4 Damage for each card in your hand to the creature in the opposing lane.","flavorText":"","artKey":"bog_banshe_angel","image":"cards/bog_banshe_angel.webp"},{"id":"bog_banshe_angel_gold","name":"Bog BanShe Angel","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":36,"def":22,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"handSize","mul":4}}]},"text":"Floop (3 MP): Deal 4 Damage for each card in your hand to the creature in the opposing lane.","flavorText":"","artKey":"bog_banshe_angel_gold","image":"cards/bog_banshe_angel_gold.webp"},{"id":"bog_frog_bomb","name":"Bog Frog Bomb","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":16,"def":18,"keywords":[],"floop":{"cost":4,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":7}]},"text":"Floop (4 MP): Deal 7 damage to all opposing creatures.","flavorText":"","artKey":"bog_frog_bomb","image":"cards/bog_frog_bomb.webp"},{"id":"chest_burster","name":"Chest Burster","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":12,"def":28,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"enemyHero","amount":{"of":"handSize","mul":2}}]},"text":"Floop (3 MP): Deal 2 Damage to opposing Hero for every card in your hand.","flavorText":"","artKey":"chest_burster","image":"cards/chest_burster.webp"},{"id":"chest_burster_gold","name":"Chest Burster","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":18,"def":42,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"enemyHero","amount":{"of":"handSize","mul":2}}]},"text":"Floop (3 MP): Deal 2 Damage to opposing Hero for every card in your hand.","flavorText":"","artKey":"chest_burster_gold","image":"cards/chest_burster_gold.webp"},{"id":"dark_angel","name":"Dark Angel","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":20,"def":15,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":5}]},"text":"Floop (3 MP): Deal 5 Damage to all opposing creatures.","flavorText":"","artKey":"dark_angel","image":"cards/dark_angel.webp"},{"id":"dark_angel_gold","name":"Dark Angel","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":30,"def":23,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":5}]},"text":"Floop (3 MP): Deal 5 Damage to all opposing creatures.","flavorText":"","artKey":"dark_angel_gold","image":"cards/dark_angel_gold.webp"},{"id":"ghost_tree","name":"Ghost Tree","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":19,"def":19,"keywords":[],"floop":{"cost":6,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownDiscard","mul":3}}]},"text":"Floop (6 MP): For every card in your Discard Pile, deal 3 Damage to creature in opposing lane.","flavorText":"","artKey":"ghost_tree","image":"cards/ghost_tree.webp"},{"id":"ghost_tree_gold","name":"Ghost Tree","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":28,"def":28,"keywords":[],"floop":{"cost":6,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownDiscard","mul":3}}]},"text":"Floop (6 MP): For every card in your Discard Pile, deal 3 Damage to creature in opposing lane.","flavorText":"","artKey":"ghost_tree_gold","image":"cards/ghost_tree_gold.webp"},{"id":"mama_spider","name":"Mama Spider","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":19,"def":19,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownDiscard","mul":4,"div":2}}]},"text":"Floop (3 MP): For every 2 cards in your Discard Pile, deal 4 damage to creature in opposing lane.","flavorText":"","artKey":"mama_spider","image":"cards/mama_spider.webp"},{"id":"mama_spider_gold","name":"Mama Spider","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":28,"def":29,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownDiscard","mul":4,"div":2}}]},"text":"Floop (3 MP): For every 2 cards in your Discard Pile, deal 4 damage to creature in opposing lane.","flavorText":"","artKey":"mama_spider_gold","image":"cards/mama_spider_gold.webp"},{"id":"steak_chop","name":"Steak Chop","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"atk":20,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"enemyDiscardCreatures","mul":2}}]},"text":"Floop (2 MP): Deal 2 Damage to the opposing creature for each of your opponent's Discarded creatures.","flavorText":"","artKey":"steak_chop","image":"cards/steak_chop.webp"},{"id":"steak_chop_gold","name":"Steak Chop","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":30,"def":23,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"enemyDiscardCreatures","mul":2}}]},"text":"Floop (2 MP): Deal 2 Damage to the opposing creature for each of your opponent's Discarded creatures.","flavorText":"","artKey":"steak_chop_gold","image":"cards/steak_chop_gold.webp"},{"id":"davey_bear","name":"Davey Bear","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":17,"def":28,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":5},{"type":"damage","target":"enemyHero","amount":5}]},"text":"Floop (3 MP): Deal 5 Damage to the opposing creature and Hero","flavorText":"","artKey":"davey_bear","image":"cards/davey_bear.webp"},{"id":"davey_bear_gold","name":"Davey Bear","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":25,"def":42,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"opposingCreature","amount":5},{"type":"damage","target":"enemyHero","amount":5}]},"text":"Floop (3 MP): Deal 5 Damage to the opposing creature and Hero","flavorText":"","artKey":"davey_bear_gold","image":"cards/davey_bear_gold.webp"},{"id":"dr_death","name":"Dr. Death","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":35,"def":10,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":7},{"type":"heal","target":"self","amount":7}]},"text":"Floop (1 MP): Deal 7 damage to creature in opposing lane and heal this creature 7 points","flavorText":"","artKey":"dr_death","image":"cards/dr_death.webp"},{"id":"dr_death_gold","name":"Dr. Death","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":52,"def":15,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":7},{"type":"heal","target":"self","amount":7}]},"text":"Floop (1 MP): Deal 7 damage to creature in opposing lane and heal this creature 7 points","flavorText":"","artKey":"dr_death_gold","image":"cards/dr_death_gold.webp"},{"id":"immortal_maize_walker","name":"Immortal Maize Walker","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":11,"def":36,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":33,"filter":{"landscape":"golden"}}]},"text":"Floop (3 MP): Deal 33 Damage to any opposing Corn creature.","flavorText":"","artKey":"immortal_maize_walker","image":"cards/immortal_maize_walker.webp"},{"id":"immortal_maize_walker_gold","name":"Immortal Maize Walker","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":16,"def":54,"keywords":[],"floop":{"cost":3,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":33,"filter":{"landscape":"golden"}}]},"text":"Floop (3 MP): Deal 33 Damage to any opposing Corn creature.","flavorText":"","artKey":"immortal_maize_walker_gold","image":"cards/immortal_maize_walker_gold.webp"},{"id":"po_the_wizard","name":"Po the Wizard","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":7,"def":40,"keywords":[],"floop":{"cost":6,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":15}]},"text":"Floop (6 MP): Deal 15 Damage to all opposing creatures.","flavorText":"","artKey":"po_the_wizard","image":"cards/po_the_wizard.webp"},{"id":"rainbow_barfer","name":"Rainbow Barfer","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":16,"def":34,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownLandscapeTypes","mul":5}}]},"text":"Floop (1 MP): Deal 5 Damage to creature in opposing lane for each of your different landscapes.","flavorText":"","artKey":"rainbow_barfer","image":"cards/rainbow_barfer.webp"},{"id":"rainbow_barfer_gold","name":"Rainbow Barfer","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":24,"def":51,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":{"of":"ownLandscapeTypes","mul":5}}]},"text":"Floop (1 MP): Deal 5 Damage to creature in opposing lane for each of your different landscapes.","flavorText":"","artKey":"rainbow_barfer_gold","image":"cards/rainbow_barfer_gold.webp"},{"id":"tree_of_underneath","name":"Tree of Underneath","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"rare","stars":5,"atk":97,"def":84,"keywords":[],"floop":{"cost":5,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":2},{"type":"heal","target":"allAllyCreatures","amount":4}]},"text":"Floop (5 MP): Deal 2 Damage to all opposing creatures and heal all of your creatures 4 points.","flavorText":"","artKey":"tree_of_underneath","image":"cards/tree_of_underneath.webp"},{"id":"unicylops","name":"Unicylops","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"atk":20,"def":28,"keywords":[],"floop":{"cost":5,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":10}]},"text":"Floop (5 MP): Deal 10 damage to all opposing creatures.","flavorText":"","artKey":"unicylops","image":"cards/unicylops.webp"},{"id":"unicylops_gold","name":"Unicylops","type":"creature","landscape":"murk","requirements":[{"landscape":"murk","count":1}],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":30,"def":42,"keywords":[],"floop":{"cost":5,"effects":[{"type":"damage","target":"allEnemyCreatures","amount":20}]},"text":"Floop (5 MP): Deal 20 damage to all opposing creatures.","flavorText":"","artKey":"unicylops_gold","image":"cards/unicylops_gold.webp"},{"id":"improved_sugar_imp","name":"Improved Sugar Imp","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"atk":1,"def":4,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"adjacentAllies","amount":2}]},"text":"Floop (1 MP): Heal adjacent creatures 2 points.","flavorText":"","artKey":"improved_sugar_imp","image":"cards/improved_sugar_imp.webp"},{"id":"improved_sugar_imp_gold","name":"Improved Sugar Imp","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":1,"def":6,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"adjacentAllies","amount":2}]},"text":"Floop (1 MP): Heal adjacent creatures 2 points.","flavorText":"","artKey":"improved_sugar_imp_gold","image":"cards/improved_sugar_imp_gold.webp"},{"id":"mouthball","name":"Mouthball","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"atk":3,"def":2,"keywords":[],"floop":{"cost":2,"effects":[{"type":"lockFloop","target":"opposingCreature"}]},"text":"Floop (2 MP): Creature in opposing lane cannot use Floop ability next turn.","flavorText":"","artKey":"mouthball","image":"cards/mouthball.webp"},{"id":"mouthball_gold","name":"Mouthball","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":4,"def":3,"keywords":[],"floop":{"cost":2,"effects":[{"type":"lockFloop","target":"opposingCreature"}]},"text":"Floop (2 MP): Creature in opposing lane cannot use Floop ability next turn.","flavorText":"","artKey":"mouthball_gold","image":"cards/mouthball_gold.webp"},{"id":"nice_ice_baby","name":"Nice Ice Baby","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"atk":2,"def":3,"keywords":[],"floop":{"cost":2,"effects":[{"type":"lockAttack","target":"opposingCreature"}]},"text":"Floop (2 MP): Creature in opposing lane cannot Attack next Battle Phase.","flavorText":"","artKey":"nice_ice_baby","image":"cards/nice_ice_baby.webp"},{"id":"nice_ice_baby_gold","name":"Nice Ice Baby","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":5,"keywords":[],"floop":{"cost":2,"effects":[{"type":"lockAttack","target":"opposingCreature"}]},"text":"Floop (2 MP): Creature in opposing lane cannot Attack next Battle Phase.","flavorText":"","artKey":"nice_ice_baby_gold","image":"cards/nice_ice_baby_gold.webp"},{"id":"ordinary_ninja","name":"Ordinary Ninja","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"atk":4,"def":1,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":3}]},"text":"Floop (2 MP): Deal 3 Damage to the creature in opposing lane.","flavorText":"","artKey":"ordinary_ninja","image":"cards/ordinary_ninja.webp"},{"id":"ordinary_ninja_gold","name":"Ordinary Ninja","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":6,"def":2,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":3}]},"text":"Floop (2 MP): Deal 3 Damage to the creature in opposing lane.","flavorText":"","artKey":"ordinary_ninja_gold","image":"cards/ordinary_ninja_gold.webp"},{"id":"snowy_mcsnow","name":"Snowy McSnow","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"atk":3,"def":10,"keywords":[],"floop":{"cost":10,"effects":[{"type":"buff","target":"self","atk":1,"def":0}]},"text":"Floop (10 MP): +1 Attack.","flavorText":"","artKey":"snowy_mcsnow","image":"cards/snowy_mcsnow.webp"},{"id":"the_pig","name":"The Pig","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"atk":1,"def":4,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allCreatures","atk":-1,"def":0,"filter":{"landscape":"golden"}}]},"text":"Floop (3 MP): Decrease the Attack of all Corn creatures by 1.","flavorText":"","artKey":"the_pig","image":"cards/the_pig.webp"},{"id":"the_pig_gold","name":"The Pig","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":1,"def":6,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allCreatures","atk":-1,"def":0,"filter":{"landscape":"golden"}}]},"text":"Floop (3 MP): Decrease the Attack of all Corn creatures by 1.","flavorText":"","artKey":"the_pig_gold","image":"cards/the_pig_gold.webp"},{"id":"travelin_skeleton","name":"Travelin' Skeleton","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"atk":2,"def":3,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"randomCreature","amount":4}]},"text":"Floop (1 MP): Deal 4 damage to a random creature, including your own.","flavorText":"","artKey":"travelin_skeleton","image":"cards/travelin_skeleton.webp"},{"id":"travelin_skeleton_gold","name":"Travelin' Skeleton","type":"creature","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"variant":"Gold","atk":3,"def":5,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"randomCreature","amount":4}]},"text":"Floop (1 MP): Deal 4 damage to a random creature, including your own.","flavorText":"","artKey":"travelin_skeleton_gold","image":"cards/travelin_skeleton_gold.webp"},{"id":"chad_bear","name":"Chad Bear","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"atk":5,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":2,"def":0}]},"text":"Floop (2 MP): +2 Attack.","flavorText":"","artKey":"chad_bear","image":"cards/chad_bear.webp"},{"id":"evil_eye","name":"Evil Eye","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"atk":5,"def":5,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"opposingCreature","atk":-4,"def":0}]},"text":"Floop (1 MP): Lower the Attack of the creature in the opposing lane by 4.","flavorText":"","artKey":"evil_eye","image":"cards/evil_eye.webp"},{"id":"evil_eye_gold","name":"Evil Eye","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":7,"def":8,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"opposingCreature","atk":-4,"def":0}]},"text":"Floop (1 MP): Lower the Attack of the creature in the opposing lane by 4.","flavorText":"","artKey":"evil_eye_gold","image":"cards/evil_eye_gold.webp"},{"id":"freezy_j","name":"Freezy J","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"atk":4,"def":6,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":0,"def":4}]},"text":"Floop (1 MP): Gain +4 Defense.","flavorText":"","artKey":"freezy_j","image":"cards/freezy_j.webp"},{"id":"freezy_j_gold","name":"Freezy J","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":6,"def":9,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"self","atk":0,"def":4}]},"text":"Floop (1 MP): Gain +4 Defense.","flavorText":"","artKey":"freezy_j_gold","image":"cards/freezy_j_gold.webp"},{"id":"green_snakey","name":"Green Snakey","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"atk":6,"def":4,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":{"of":"enemyCreatures","mul":-2},"def":0}]},"text":"Floop (2 MP): Lower the Attack of the creature in opposing lane by 2 for each of your opponent's creatures.","flavorText":"","artKey":"green_snakey","image":"cards/green_snakey.webp"},{"id":"green_snakey_gold","name":"Green Snakey","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":9,"def":6,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"opposingCreature","atk":{"of":"enemyCreatures","mul":-2},"def":0}]},"text":"Floop (2 MP): Lower the Attack of the creature in opposing lane by 2 for each of your opponent's creatures.","flavorText":"","artKey":"green_snakey_gold","image":"cards/green_snakey_gold.webp"},{"id":"peach_djini","name":"Peach Djini","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"atk":2,"def":8,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":4}]},"text":"Floop (1 MP): Choose one of your creatures and heal it 4 points.","flavorText":"","artKey":"peach_djini","image":"cards/peach_djini.webp"},{"id":"peach_djini_gold","name":"Peach Djini","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":3,"def":12,"keywords":[],"floop":{"cost":1,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":4}]},"text":"Floop (1 MP): Choose one of your creatures and heal it 4 points.","flavorText":"","artKey":"peach_djini_gold","image":"cards/peach_djini_gold.webp"},{"id":"white_ninja","name":"White Ninja","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"atk":7,"def":3,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":3},{"type":"heal","target":"self","amount":3}]},"text":"Floop (2 MP): Deal 3 Damage to the opposing creature and heal 3 points to this creature.","flavorText":"","artKey":"white_ninja","image":"cards/white_ninja.webp"},{"id":"white_ninja_gold","name":"White Ninja","type":"creature","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"variant":"Gold","atk":10,"def":5,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":3},{"type":"heal","target":"self","amount":3}]},"text":"Floop (2 MP): Deal 3 Damage to the opposing creature and heal 3 points to this creature.","flavorText":"","artKey":"white_ninja_gold","image":"cards/white_ninja_gold.webp"},{"id":"big_foot","name":"Big Foot","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"atk":7,"def":8,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":4,"splash":true}]},"text":"Floop (2 MP): Deal 4 Damage to opposing creature and its adjacent creatures.","flavorText":"","artKey":"big_foot","image":"cards/big_foot.webp"},{"id":"big_foot_gold","name":"Big Foot","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":10,"def":12,"keywords":[],"floop":{"cost":2,"effects":[{"type":"damage","target":"opposingCreature","amount":4,"splash":true}]},"text":"Floop (2 MP): Deal 4 Damage to opposing creature and its adjacent creatures.","flavorText":"","artKey":"big_foot_gold","image":"cards/big_foot_gold.webp"},{"id":"earl","name":"Earl","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"atk":10,"def":5,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"adjacentAllies","atk":3,"def":0}]},"text":"Floop (1 MP): Adjacent creatures gain +3 attack.","flavorText":"","artKey":"earl","image":"cards/earl.webp"},{"id":"earl_gold","name":"Earl","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":15,"def":8,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"adjacentAllies","atk":3,"def":0}]},"text":"Floop (1 MP): Adjacent creatures gain +3 attack.","flavorText":"","artKey":"earl_gold","image":"cards/earl_gold.webp"},{"id":"furious_chick","name":"Furious Chick","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"atk":7,"def":8,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"adjacentAllies","atk":3,"def":0}]},"text":"Floop (2 MP): Adjacent creatures gain +3 Attack.","flavorText":"","artKey":"furious_chick","image":"cards/furious_chick.webp"},{"id":"furious_chick_gold","name":"Furious Chick","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":10,"def":12,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"adjacentAllies","atk":3,"def":0}]},"text":"Floop (2 MP): Adjacent creatures gain +3 Attack.","flavorText":"","artKey":"furious_chick_gold","image":"cards/furious_chick_gold.webp"},{"id":"future_scholar","name":"Future Scholar","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"atk":2,"def":13,"keywords":[],"floop":{"cost":1,"effects":[{"type":"gainMp","amount":3,"nextTurn":true}]},"text":"Floop (1 MP): Gain 3 Magic Points next turn.","flavorText":"","artKey":"future_scholar","image":"cards/future_scholar.webp"},{"id":"future_scholar_gold","name":"Future Scholar","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":3,"def":20,"keywords":[],"floop":{"cost":1,"effects":[{"type":"gainMp","amount":3,"nextTurn":true}]},"text":"Floop (1 MP): Gain 3 Magic Points next turn.","flavorText":"","artKey":"future_scholar_gold","image":"cards/future_scholar_gold.webp"},{"id":"ghost_ninja","name":"Ghost Ninja","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"atk":5,"def":10,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":4},{"type":"heal","target":"self","amount":5}]},"text":"Floop (1 MP): Deal 4 Damage to creature in opposing lane and heal this creature 5 points.","flavorText":"","artKey":"ghost_ninja","image":"cards/ghost_ninja.webp"},{"id":"ghost_ninja_gold","name":"Ghost Ninja","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":7,"def":15,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":4},{"type":"heal","target":"self","amount":5}]},"text":"Floop (1 MP): Deal 4 Damage to creature in opposing lane and heal this creature 5 points.","flavorText":"","artKey":"ghost_ninja_gold","image":"cards/ghost_ninja_gold.webp"},{"id":"ice_paladin","name":"Ice Paladin","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"atk":3,"def":12,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"adjacentAllies","atk":0,"def":5}]},"text":"Floop (2 MP): Adjacent creatures gain +5 Defense.","flavorText":"","artKey":"ice_paladin","image":"cards/ice_paladin.webp"},{"id":"ice_paladin_gold","name":"Ice Paladin","type":"creature","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"variant":"Gold","atk":4,"def":18,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"adjacentAllies","atk":0,"def":5}]},"text":"Floop (2 MP): Adjacent creatures gain +5 Defense.","flavorText":"","artKey":"ice_paladin_gold","image":"cards/ice_paladin_gold.webp"},{"id":"detective_sally","name":"Detective Sally","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":4,"atk":5,"def":15,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":0,"def":6},{"type":"buff","target":"adjacentAllies","atk":0,"def":6}]},"text":"Floop (3 MP): This creature and adjacent creature's gain +6 Defense.","flavorText":"","artKey":"detective_sally","image":"cards/detective_sally.webp"},{"id":"detective_sally_gold","name":"Detective Sally","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":7,"def":23,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":0,"def":6},{"type":"buff","target":"adjacentAllies","atk":0,"def":6}]},"text":"Floop (3 MP): This creature and adjacent creature's gain +6 Defense.","flavorText":"","artKey":"detective_sally_gold","image":"cards/detective_sally_gold.webp"},{"id":"phyllis","name":"Phyllis","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":4,"atk":5,"def":15,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":4,"def":0},{"type":"buff","target":"adjacentAllies","atk":4,"def":0}]},"text":"Floop (2 MP): This creature and adjacent creatures gain +4 Attack.","flavorText":"","artKey":"phyllis","image":"cards/phyllis.webp"},{"id":"phyllis_gold","name":"Phyllis","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":7,"def":23,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":4,"def":0},{"type":"buff","target":"adjacentAllies","atk":4,"def":0}]},"text":"Floop (2 MP): This creature and adjacent creatures gain +4 Attack.","flavorText":"","artKey":"phyllis_gold","image":"cards/phyllis_gold.webp"},{"id":"polterclops","name":"Polterclops","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":4,"atk":2,"def":30,"keywords":[],"floop":{"cost":7,"effects":[{"type":"draw","amount":4},{"type":"returnToHand","target":"self"}]},"text":"Floop (7 MP): Return this creature to your hand and draw 4 card.","flavorText":"","artKey":"polterclops","image":"cards/polterclops.webp"},{"id":"quadurai","name":"Quadurai","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":4,"atk":15,"def":5,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":8}]},"text":"Floop (1 MP): Deal 8 Damage to creature in opposing lane.","flavorText":"","artKey":"quadurai","image":"cards/quadurai.webp"},{"id":"quadurai_gold","name":"Quadurai","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":22,"def":8,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":8}]},"text":"Floop (1 MP): Deal 8 Damage to creature in opposing lane.","flavorText":"","artKey":"quadurai_gold","image":"cards/quadurai_gold.webp"},{"id":"rainbow_gnome","name":"Rainbow Gnome","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"legendary","stars":4,"atk":7,"def":14,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"self","atk":{"of":"opposingAtk","mul":0.5},"def":{"of":"opposingAtk","mul":-0.5}},{"type":"buff","target":"opposingCreature","atk":{"of":"targetAtk","mul":-0.5},"def":0}]},"text":"Floop (3 MP): Lower the Attack of opposing creature by half and raise this creature's Attack, and also reduce it's Defense, by that amount.","flavorText":"","artKey":"rainbow_gnome","image":"cards/rainbow_gnome.webp"},{"id":"the_pickler","name":"The Pickler","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":4,"atk":12,"def":8,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allEnemyCreatures","atk":0,"def":-5}]},"text":"Floop (3 MP): Lower the Defense of all opposing creatures by 5.","flavorText":"","artKey":"the_pickler","image":"cards/the_pickler.webp"},{"id":"the_pickler_gold","name":"The Pickler","type":"creature","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":4,"variant":"Gold","atk":18,"def":12,"keywords":[],"floop":{"cost":3,"effects":[{"type":"buff","target":"allEnemyCreatures","atk":0,"def":-5}]},"text":"Floop (3 MP): Lower the Defense of all opposing creatures by 5.","flavorText":"","artKey":"the_pickler_gold","image":"cards/the_pickler_gold.webp"},{"id":"brian_gooey","name":"Brian Gooey","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"atk":5,"def":20,"keywords":[],"floop":{"cost":1,"effects":[{"type":"buff","target":"allEnemyCreatures","atk":-12,"def":0},{"type":"destroy","target":"self"}]},"text":"Floop (1 MP): Lower Attack of all enemy creatures by 12 and destroy this creature.","flavorText":"","artKey":"brian_gooey","image":"cards/brian_gooey.webp"},{"id":"drooling_dude","name":"Drooling Dude","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"atk":14,"def":11,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":7,"def":3}]},"text":"Floop (2 MP): Gain +7 Attack and +3 Defense.","flavorText":"","artKey":"drooling_dude","image":"cards/drooling_dude.webp"},{"id":"drooling_dude_gold","name":"Drooling Dude","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":21,"def":17,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"self","atk":7,"def":3}]},"text":"Floop (2 MP): Gain +7 Attack and +3 Defense.","flavorText":"","artKey":"drooling_dude_gold","image":"cards/drooling_dude_gold.webp"},{"id":"fisher_fish","name":"Fisher Fish","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"atk":0,"def":25,"keywords":[],"floop":{"cost":2,"effects":[{"type":"recover","pick":"random"}]},"text":"Floop (2 MP): Select a Random card from the Discard Pile and put it in your hand.","flavorText":"","artKey":"fisher_fish","image":"cards/fisher_fish.webp"},{"id":"paladim","name":"Paladim","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"atk":5,"def":20,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"opposingCreature","amount":5},{"type":"damage","target":"self","amount":2}]},"text":"Floop (1 MP): Deal 5 Damage to creature in opposing lane and damage this creature for 2 Damage.","flavorText":"","artKey":"paladim","image":"cards/paladim.webp"},{"id":"porcelain_guardian","name":"Porcelain Guardian","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"atk":10,"def":15,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"self","amount":2},{"type":"buff","target":"opposingCreature","atk":0,"def":-10}]},"text":"Floop (1 MP): Inflict 2 Damage on this creature and lower the Defense of the opposing creature by 10","flavorText":"","artKey":"porcelain_guardian","image":"cards/porcelain_guardian.webp"},{"id":"porcelain_guardian_gold","name":"Porcelain Guardian","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":15,"def":23,"keywords":[],"floop":{"cost":1,"effects":[{"type":"damage","target":"self","amount":2},{"type":"buff","target":"opposingCreature","atk":0,"def":-10}]},"text":"Floop (1 MP): Inflict 2 Damage on this creature and lower the Defense of the opposing creature by 10","flavorText":"","artKey":"porcelain_guardian_gold","image":"cards/porcelain_guardian_gold.webp"},{"id":"the_mariachi","name":"The Mariachi","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"atk":5,"def":20,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":4,"def":0}]},"text":"Floop (2 MP): All your creatures gain +4 Attack.","flavorText":"","artKey":"the_mariachi","image":"cards/the_mariachi.webp"},{"id":"the_mariachi_gold","name":"The Mariachi","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"variant":"Gold","atk":7,"def":30,"keywords":[],"floop":{"cost":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":4,"def":0}]},"text":"Floop (2 MP): All your creatures gain +4 Attack.","flavorText":"","artKey":"the_mariachi_gold","image":"cards/the_mariachi_gold.webp"},{"id":"unicycle_knight","name":"Unicycle Knight","type":"creature","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"atk":12,"def":13,"keywords":[],"floop":{"cost":6,"effects":[{"type":"buff","target":"adjacentAllies","atk":0,"def":13}]},"text":"Floop (6 MP): Adjacent creatures gain +13 Defense.","flavorText":"","artKey":"unicycle_knight","image":"cards/unicycle_knight.webp"},{"id":"banana_butt","name":"Banana Butt","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"epic","stars":4,"effects":[{"type":"destroy","target":"chosenAllyCreature"},{"type":"draw","amount":1}],"text":"Destroy one of your Creatures and draw 1 card.","flavorText":"","artKey":"banana_butt","image":"cards/banana_butt.webp"},{"id":"brief_power","name":"Brief Power","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"effects":[{"type":"costMod","who":"self","kind":"card","amount":-1}],"text":"Every card cast this turn costs 1 less Magic Point.","flavorText":"","artKey":"brief_power","image":"cards/brief_power.webp"},{"id":"falling_star","name":"Falling Star","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"rare","stars":3,"effects":[{"type":"loseMp","amount":2}],"text":"Opponent gets 2 less Magic Point next turn.","flavorText":"","artKey":"falling_star","image":"cards/falling_star.webp"},{"id":"field_of_nightmares","name":"Field of Nightmares","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"rare","stars":3,"effects":[{"type":"lockFloop","target":"chosenEnemyCreature"}],"text":"Choose an opposing creature. It cannot use its Floop ability next turn.","flavorText":"","artKey":"field_of_nightmares","image":"cards/field_of_nightmares.webp"},{"id":"grape_butt","name":"Grape Butt","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"uncommon","stars":2,"effects":[{"type":"destroyBuilding","target":"chosenAllyBuilding"},{"type":"draw","amount":1}],"text":"Destroy one of your Buildings and draw 1 card.","flavorText":"","artKey":"grape_butt","image":"cards/grape_butt.webp"},{"id":"hot_dog_rain","name":"Hot Dog Rain","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"rare","stars":3,"effects":[{"type":"block","what":"building"}],"text":"Opponent cannot summon Buildings next turn.","flavorText":"","artKey":"hot_dog_rain","image":"cards/hot_dog_rain.webp"},{"id":"lonely_hearts","name":"Lonely Hearts","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"effects":[{"type":"destroy","target":"allEnemyCreatures","when":{"type":"creatureCountAtMost","who":"enemy","value":1}}],"text":"Instantly kills the lone creature on the opponent's side","flavorText":"","artKey":"lonely_hearts","image":"cards/lonely_hearts.webp"},{"id":"portal_to_nowhere","name":"Portal to Nowhere","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"epic","stars":4,"effects":[{"type":"returnToHand","target":"allAllyCreatures"}],"text":"Return all of your creatures on the field to your hand).","flavorText":"","artKey":"portal_to_nowhere","image":"cards/portal_to_nowhere.webp"},{"id":"psychic_tempest","name":"Psychic Tempest","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"uncommon","stars":2,"effects":[{"type":"block","what":"spell"}],"text":"Opponent cannot cast spells next turn.","flavorText":"","artKey":"psychic_tempest","image":"cards/psychic_tempest.webp"},{"id":"sand_pyramid","name":"Sand Pyramid","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"rare","stars":3,"effects":[{"type":"grantKeyword","target":"chosenAllyCreature","keyword":"feast:5"}],"text":"Creature in this lane heals 5 Damage when it destroys a creature.","flavorText":"","artKey":"sand_pyramid","image":"cards/sand_pyramid.webp"},{"id":"scroll_of_bad_breath","name":"Scroll of Bad Breath","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"effects":[{"type":"recover","cardType":"spell","pick":"best"}],"text":"Return a spell card from your Discard pile to your hand.","flavorText":"","artKey":"scroll_of_bad_breath","image":"cards/scroll_of_bad_breath.webp"},{"id":"scroll_of_fresh_breath","name":"Scroll of Fresh Breath","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"uncommon","stars":2,"effects":[{"type":"recover","cardType":"building","pick":"best"}],"text":"Return a Building card from the Discard Pile to your hand.","flavorText":"","artKey":"scroll_of_fresh_breath","image":"cards/scroll_of_fresh_breath.webp"},{"id":"tax_reduction","name":"Tax Reduction","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"effects":[{"type":"costMod","who":"self","kind":"floop","amount":-99}],"text":"All your creatures' FLOOP abilities cost 0 Magic Points this turn.","flavorText":"","artKey":"tax_reduction","image":"cards/tax_reduction.webp"},{"id":"teleport","name":"Teleport","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"effects":[{"type":"returnToHand","target":"chosenAllyCreature"}],"text":"Choose one of your creatures and return it to your hand.","flavorText":"","artKey":"teleport","image":"cards/teleport.webp"},{"id":"throne_of_doom","name":"Throne of Doom","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"epic","stars":4,"effects":[{"type":"destroy","target":"chosenAllyCreature"},{"type":"gainMp","amount":4}],"text":"Destroy any of your creatures and gain 4 Magic Points.","flavorText":"","artKey":"throne_of_doom","image":"cards/throne_of_doom.webp"},{"id":"throne_of_gloom","name":"Throne of Gloom","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"epic","stars":4,"effects":[{"type":"destroyBuilding","target":"chosenAllyBuilding"},{"type":"gainMp","amount":4}],"text":"Destroy any of your Buildings and gain 4 Magic Points.","flavorText":"","artKey":"throne_of_gloom","image":"cards/throne_of_gloom.webp"},{"id":"ufo_abduction","name":"UFO Abduction","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"effects":[{"type":"moveBuilding","target":"chosenAllyBuilding"}],"text":"Choose one of your Buildings and move it to one of your empty lanes.","flavorText":"","artKey":"ufo_abduction","image":"cards/ufo_abduction.webp"},{"id":"witch_way","name":"Witch Way","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"rare","stars":3,"effects":[{"type":"gainMp","amount":{"of":"fieldLandscapeTypes"}}],"text":"Gain 1 Magic Point for every different landscape on the field.","flavorText":"","artKey":"witch_way","image":"cards/witch_way.webp"},{"id":"wizard_migraine","name":"Wizard Migraine","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"effects":[{"type":"discardHand"},{"type":"gainMp","amount":4}],"text":"Discard your hand and gain 4 Magic Points","flavorText":"","artKey":"wizard_migraine","image":"cards/wizard_migraine.webp"},{"id":"zazos_magic_seeds","name":"ZaZo's Magic Seeds","type":"spell","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"effects":[{"type":"gainMp","amount":{"of":"ownCreatures"}}],"text":"Gain 1 Magic Point for each of your creatures on the field.","flavorText":"","artKey":"zazos_magic_seeds","image":"cards/zazos_magic_seeds.webp"},{"id":"bone_wand","name":"Bone Wand","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"effects":[{"type":"forceAttack","target":"chosenAllyCreature","filter":{"landscape":"murk"}}],"text":"Choose a Useless Swamp creature and attack the opposing creature in its lane.","flavorText":"","artKey":"bone_wand","image":"cards/bone_wand.webp"},{"id":"corn_scepter","name":"Corn Scepter","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"effects":[{"type":"forceAttack","target":"chosenAllyCreature","filter":{"landscape":"golden"}}],"text":"Choose a Corn creature and attack the opposing creature in its lane","flavorText":"","artKey":"corn_scepter","image":"cards/corn_scepter.webp"},{"id":"cough_syrup","name":"Cough Syrup","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"rare","stars":3,"effects":[{"type":"swapStats","target":"chosenAllyCreature"}],"text":"Choose one of your creatures and switch its Attack and Defense values.","flavorText":"","artKey":"cough_syrup","image":"cards/cough_syrup.webp"},{"id":"crystal_ball","name":"Crystal Ball","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"common","stars":1,"effects":[{"type":"cycleHand","draw":5}],"text":"Shuffle your hand back into your Deck and draw 5 new cards.","flavorText":"","artKey":"crystal_ball","image":"cards/crystal_ball.webp"},{"id":"dark_portal","name":"Dark Portal","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"rare","stars":3,"effects":[{"type":"moveBuilding","target":"chosenEnemyBuilding"}],"text":"Choose an opposing Building and move it to an empty lane.","flavorText":"","artKey":"dark_portal","image":"cards/dark_portal.webp"},{"id":"fountain_of_forgiveness","name":"Fountain of Forgiveness","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"targetAtk"},"filter":{"damaged":true}}],"text":"Choose one of your damaged creatures and heal it equal to its own Attack.","flavorText":"","artKey":"fountain_of_forgiveness","image":"cards/fountain_of_forgiveness.webp"},{"id":"incredible_egg","name":"Incredible Egg","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"legendary","stars":5,"effects":[{"type":"tutor","cardType":"creature"}],"text":"Put a random creature from your deck into your hand.","flavorText":"","artKey":"incredible_egg","image":"cards/incredible_egg.webp"},{"id":"puma_claw","name":"Puma Claw","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"effects":[{"type":"forceAttack","target":"chosenAllyCreature","filter":{"landscape":"azure"}}],"text":"Choose a Blue Plains creature and attack the opposing creature in its lane.","flavorText":"","artKey":"puma_claw","image":"cards/puma_claw.webp"},{"id":"super_hug","name":"Super Hug","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"effects":[{"type":"forceAttack","target":"chosenAllyCreature","filter":{"landscape":"candy"}}],"text":"Choose a Nice Lands creature and attack the creature in the opposing lane.","flavorText":"","artKey":"super_hug","image":"cards/super_hug.webp"},{"id":"tome_of_ankhs","name":"Tome of Ankhs","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"effects":[{"type":"forceAttack","target":"chosenAllyCreature","filter":{"landscape":"dune"}}],"text":"Choose a Sandy Lands creature and attack the opposing creature in its lane.","flavorText":"","artKey":"tome_of_ankhs","image":"cards/tome_of_ankhs.webp"},{"id":"unempty_coffin","name":"Unempty Coffin","type":"spell","landscape":"neutral","requirements":[],"cost":2,"rarity":"epic","stars":4,"effects":[{"type":"recover","cardType":"creature","pick":"best"}],"text":"Return any creature from your Discard Pile to your hand.","flavorText":"","artKey":"unempty_coffin","image":"cards/unempty_coffin.webp"},{"id":"ancient_psychic_tandem_blast","name":"Ancient Psychic Tandem Blast","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"epic","stars":4,"effects":[{"type":"destroy","target":"chosenEnemyCreature"},{"type":"destroy","target":"weakestAllyCreature"},{"type":"draw","amount":1}],"text":"Destroy one of your creatures and an opposing creature. Also draw 1 card.","flavorText":"","artKey":"ancient_psychic_tandem_blast","image":"cards/ancient_psychic_tandem_blast.webp"},{"id":"blood_transfusion","name":"Blood Transfusion","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"effects":[{"type":"damage","target":"enemyHero","amount":5},{"type":"heal","target":"ownHero","amount":5}],"text":"Deal 5 damage to the opposing Leader and heal your Leader 5 points.","flavorText":"","artKey":"blood_transfusion","image":"cards/blood_transfusion.webp"},{"id":"cerebral_bloodstorm","name":"Cerebral Bloodstorm","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"common","stars":1,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":{"of":"targetAtk"}}],"text":"Choose an opposing creature and deal Damage equal to its own Attack.","flavorText":"","artKey":"cerebral_bloodstorm","image":"cards/cerebral_bloodstorm.webp"},{"id":"clairvoyant_daggerstorm","name":"Clairvoyant Daggerstorm","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"effects":[{"type":"damage","target":"chosenEnemyCreature","amount":{"of":"targetDamage"}}],"text":"Choose an opposing creature and double the amount of Damage on it.","flavorText":"","artKey":"clairvoyant_daggerstorm","image":"cards/clairvoyant_daggerstorm.webp"},{"id":"door_of_strength","name":"Door of Strength","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"legendary","stars":5,"effects":[{"type":"block","what":"creature"}],"text":"Opponent cannot summon creatures next turn.","flavorText":"","artKey":"door_of_strength","image":"cards/door_of_strength.webp"},{"id":"pie_storm","name":"Pie Storm","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"epic","stars":4,"effects":[{"type":"heal","target":"allCreatures","amount":{"of":"targetDamage"}}],"text":"Heal all creatures on the field (including your opponent's).","flavorText":"","artKey":"pie_storm","image":"cards/pie_storm.webp"},{"id":"skull_juice","name":"Skull Juice","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"legendary","stars":5,"effects":[{"type":"swapStats","target":"chosenEnemyCreature"}],"text":"Choose one of your opponent's creatures and switch its Attack and Defense values.","flavorText":"","artKey":"skull_juice","image":"cards/skull_juice.webp"},{"id":"snake_eye_ring","name":"Snake Eye Ring","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"epic","stars":4,"effects":[{"type":"draw","amount":{"of":"ownEmptyLanes"}}],"text":"Draw 1 card for each of your empty lanes.","flavorText":"","artKey":"snake_eye_ring","image":"cards/snake_eye_ring.webp"},{"id":"spirit_torch","name":"Spirit Torch","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"epic","stars":4,"effects":[{"type":"seal","target":"chosenEnemyLandscape"}],"text":"Choose an opposing lane. No building or creature may be summoned on this lane next turn.","flavorText":"","artKey":"spirit_torch","image":"cards/spirit_torch.webp"},{"id":"strawberry_butt","name":"Strawberry Butt","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"common","stars":1,"effects":[{"type":"draw","amount":2}],"text":"Draw 2 cards.","flavorText":"","artKey":"strawberry_butt","image":"cards/strawberry_butt.webp"},{"id":"ultimate_magic_hands","name":"Ultimate Magic Hands","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"legendary","stars":5,"effects":[{"type":"returnToHand","target":"chosenEnemyCreature"}],"text":"Choose an opposing creature and send it back to your opponent's hand.","flavorText":"","artKey":"ultimate_magic_hands","image":"cards/ultimate_magic_hands.webp"},{"id":"wizard_rawk","name":"Wizard Rawk","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"epic","stars":4,"effects":[{"type":"buff","target":"chosenAllyCreature","atk":{"of":"targetDamage"},"def":0}],"text":"Choose one of your creatures and give it Attack equal to how much Damage it has taken.","flavorText":"","artKey":"wizard_rawk","image":"cards/wizard_rawk.webp"},{"id":"woad_blood","name":"Woad Blood","type":"spell","landscape":"neutral","requirements":[],"cost":3,"rarity":"common","stars":1,"effects":[{"type":"heal","target":"chosenAllyCreature","amount":{"of":"targetDamage"}}],"text":"Choose one of your creatures and heal all damage.","flavorText":"","artKey":"woad_blood","image":"cards/woad_blood.webp"},{"id":"blackhole_pendant","name":"BlackHole Pendant","type":"spell","landscape":"neutral","requirements":[],"cost":4,"rarity":"epic","stars":5,"effects":[{"type":"buff","target":"allCreatures","atk":0,"def":{"of":"targetDef","mul":-0.5}}],"text":"Reduce the defence of ALL creatures by 50%.","flavorText":"","artKey":"blackhole_pendant","image":"cards/blackhole_pendant.webp"},{"id":"volcano","name":"Volcano","type":"spell","landscape":"neutral","requirements":[],"cost":4,"rarity":"common","stars":1,"effects":[{"type":"wipeLane","target":"chosenEnemyLandscape"}],"text":"Choose a lane and destroy all buildings and creatures on it (player and opponent)","flavorText":"","artKey":"volcano","image":"cards/volcano.webp"},{"id":"bubblegum_butt","name":"Bubblegum Butt","type":"spell","landscape":"neutral","requirements":[],"cost":5,"rarity":"rare","stars":3,"effects":[{"type":"draw","amount":3}],"text":"Draw 3 Cards.","flavorText":"","artKey":"bubblegum_butt","image":"cards/bubblegum_butt.webp"},{"id":"kung_fu_power","name":"Kung Fu Power","type":"spell","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"effects":[{"type":"destroy","target":"allEnemyCreatures","filter":{"minStars":4}}],"text":"Destroy all enemy creatures of rarity 4 or higher.","flavorText":"","artKey":"kung_fu_power","image":"cards/kung_fu_power.webp"},{"id":"magic_hot_dog_pie","name":"Magic Hot Dog Pie","type":"spell","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"effects":[{"type":"damage","target":"enemyHero","amount":10},{"type":"heal","target":"ownHero","amount":10}],"text":"Deal 10 damage to the opposing Leader and heal your Leader by 10 points.","flavorText":"","artKey":"magic_hot_dog_pie","image":"cards/magic_hot_dog_pie.webp"},{"id":"pentaid","name":"Pentaid","type":"spell","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"effects":[{"type":"heal","target":"allAllyCreatures","amount":5},{"type":"heal","target":"ownHero","amount":5}],"text":"Heal 5 to all your creatures and Hero.","flavorText":"","artKey":"pentaid","image":"cards/pentaid.webp"},{"id":"subliminal_strength","name":"Subliminal Strength","type":"spell","landscape":"neutral","requirements":[],"cost":5,"rarity":"legendary","stars":5,"effects":[{"type":"destroy","target":"allEnemyCreatures","filter":{"maxStars":3}}],"text":"Destroy all enemy creatures of rarity 3 or lower.","flavorText":"","artKey":"subliminal_strength","image":"cards/subliminal_strength.webp"},{"id":"astral_fortress","name":"Astral Fortress","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"statics":[{"kind":"stat","scope":"lane","atk":0,"def":4}],"text":"Creature in this lane gets +4 Defense","flavorText":"","artKey":"astral_fortress","image":"cards/astral_fortress.webp"},{"id":"autoplucker","name":"Autoplucker","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"abilities":[{"trigger":"onLaneCreatureDestroyed","effects":[{"type":"damage","target":"enemyHero","amount":5}]}],"text":"Deals 5 Damage to the opposing Hero when your creayure in this lane is destroyed.","flavorText":"","artKey":"autoplucker","image":"cards/autoplucker.webp"},{"id":"candy_igloo","name":"Candy Igloo","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"statics":[{"kind":"swapStats","scope":"lane"}],"text":"Creature in this lane swap Attack and Defense.","flavorText":"","artKey":"candy_igloo","image":"cards/candy_igloo.webp"},{"id":"cardboard_mansion","name":"Cardboard Mansion","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"uncommon","stars":2,"statics":[{"kind":"stat","scope":"lane","atk":0,"def":{"of":"ownCreatures","mul":2}}],"text":"Creature in this lane gets +2 Defense for each of your creatures on the field.","flavorText":"","artKey":"cardboard_mansion","image":"cards/cardboard_mansion.webp"},{"id":"cave_of_solitude","name":"Cave of Solitude","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"epic","stars":4,"statics":[{"kind":"stat","scope":"lane","atk":{"of":"ownEmptyLanes","mul":5},"def":{"of":"ownEmptyLanes","mul":5}}],"text":"Creatures in this lane get +5 Attack and +5 Defense for each of your empty lands.","flavorText":"","artKey":"cave_of_solitude","image":"cards/cave_of_solitude.webp"},{"id":"comfy_cave","name":"Comfy Cave","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"rare","stars":3,"abilities":[{"trigger":"startOfTurn","effects":[{"type":"heal","target":"laneCreature","amount":{"of":"ownCreatures","mul":2}}]}],"text":"Creature in this lane heals 2 Damage for each creature you control at start of turn.","flavorText":"","artKey":"comfy_cave","image":"cards/comfy_cave.webp"},{"id":"corn_dome","name":"Corn Dome","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"statics":[{"kind":"stat","scope":"lane","atk":3,"def":0}],"text":"Creature in this lane gets +3 Attack.","flavorText":"","artKey":"corn_dome","image":"cards/corn_dome.webp"},{"id":"corn_parthenon","name":"Corn Parthenon","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"epic","stars":4,"statics":[{"kind":"stat","scope":"lane","atk":{"of":"fieldLandscapeTypes","mul":2},"def":0}],"text":"Creatures in this lane get +2 Attack for each different landscape on the field.","flavorText":"","artKey":"corn_parthenon","image":"cards/corn_parthenon.webp"},{"id":"dark_pyramid","name":"Dark Pyramid","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":7,"statics":[{"kind":"laneRarityCap","maxStars":1}],"text":"Enemy can only summon creatures with rarity of 1 where hero places this building in a lane.","flavorText":"","artKey":"dark_pyramid","image":"cards/dark_pyramid.webp"},{"id":"funeral_home","name":"Funeral Home","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"uncommon","stars":2,"abilities":[{"trigger":"onLaneCreatureDestroyed","effects":[{"type":"recoverDestroyed"},{"type":"destroyBuilding","target":"thisBuilding"}]}],"text":"When creature in this lane is destroyed, return it to your hand and send this Building to the Discard Pile.","flavorText":"","artKey":"funeral_home","image":"cards/funeral_home.webp"},{"id":"ghost_castle","name":"Ghost Castle","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"statics":[{"kind":"stat","scope":"lane","atk":8,"def":8}],"text":"Creature in this lane gets +8 Attack and +8 Defense.","flavorText":"","artKey":"ghost_castle","image":"cards/ghost_castle.webp"},{"id":"haunted_windmill","name":"Haunted Windmill","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"epic","stars":4,"abilities":[{"trigger":"onFloop","effects":[{"type":"gainMp","amount":1}]}],"text":"Gain 1 Magic Point when a creature in this lane uses a Floop ability.","flavorText":"","artKey":"haunted_windmill","image":"cards/haunted_windmill.webp"},{"id":"mausoleum","name":"Mausoleum","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"abilities":[{"trigger":"onLaneCreatureDestroyed","effects":[{"type":"recoverDestroyed"},{"type":"destroyBuilding","target":"thisBuilding"}]}],"text":"When creature in this lane is destroyed return it to your hand send this building to the Discard Pile.","flavorText":"","artKey":"mausoleum","image":"cards/mausoleum.webp"},{"id":"nicelands_tower","name":"Nicelands Tower","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"epic","stars":4,"abilities":[{"trigger":"startOfTurn","effects":[{"type":"heal","target":"laneCreature","amount":5}]}],"text":"Creature in this lane heals 5 Damage at the start of your turn.","flavorText":"","artKey":"nicelands_tower","image":"cards/nicelands_tower.webp"},{"id":"obelisx_of_vengeance","name":"Obelisx of Vengeance","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"abilities":[{"trigger":"onLaneCreatureDestroyed","effects":[{"type":"damage","target":"enemyHero","amount":4}]}],"text":"Deal 4 Damage to the opposing Hero when your creature in this lane is destroyed.","flavorText":"","artKey":"obelisx_of_vengeance","image":"cards/obelisx_of_vengeance.webp"},{"id":"puffy_castle","name":"Puffy Castle","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"abilities":[{"trigger":"onLaneCreatureDestroyed","effects":[{"type":"heal","target":"ownHero","amount":5}]}],"text":"Heal 5 damage from your hero when a creature in this lane is destroyed.","flavorText":"","artKey":"puffy_castle","image":"cards/puffy_castle.webp"},{"id":"pyramidia","name":"Pyramidia","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"uncommon","stars":2,"statics":[{"kind":"stat","scope":"lane","atk":0,"def":{"of":"handSize","mul":2}}],"text":"Creatures in this lane get +2 defense for each card in your hand.","flavorText":"","artKey":"pyramidia","image":"cards/pyramidia.webp"},{"id":"sand_castle","name":"Sand Castle","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"common","stars":1,"statics":[{"kind":"stat","scope":"lane","atk":4,"def":4}],"text":"Creature in this lane gets +4 Attack and +4 Defense","flavorText":"","artKey":"sand_castle","image":"cards/sand_castle.webp"},{"id":"sand_sphinx","name":"Sand Sphinx","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"epic","stars":4,"statics":[{"kind":"armor","scope":"lane","amount":5}],"text":"Creatures in this lane takes 5 less Damage when attacked.","flavorText":"","artKey":"sand_sphinx","image":"cards/sand_sphinx.webp"},{"id":"school_house","name":"School House","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"abilities":[{"trigger":"onAllyFloop","effects":[{"type":"buff","target":"laneCreature","atk":0,"def":5}]}],"text":"Your creature in this lane gains 5 Defense when a Floop ability is used.","flavorText":"","artKey":"school_house","image":"cards/school_house.webp"},{"id":"shadow_pyramid","name":"Shadow Pyramid","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"statics":[{"kind":"laneRarityCap","maxStars":3}],"text":"Enemy may only play creatures of 3 Rarity or lower on this lane.","flavorText":"","artKey":"shadow_pyramid","image":"cards/shadow_pyramid.webp"},{"id":"silo_of_truth","name":"Silo of Truth","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"rare","stars":3,"statics":[{"kind":"stat","scope":"lane","atk":{"of":"enemyHandSize","mul":2},"def":0}],"text":"Creature in this lane gets +2 Attack for each card in your opponent's hand.","flavorText":"","artKey":"silo_of_truth","image":"cards/silo_of_truth.webp"},{"id":"spirit_tower","name":"Spirit Tower","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"abilities":[{"trigger":"onLaneCreaturePlayed","effects":[{"type":"damage","target":"enemyHero","amount":5}]}],"text":"Deal 5 Damage to the opposing hero when a new creature is placed on this lane.","flavorText":"","artKey":"spirit_tower","image":"cards/spirit_tower.webp"},{"id":"stonehenge","name":"Stonehenge","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"statics":[{"kind":"floopCost","scope":"lane","amount":-1}],"text":"Floop ability costs 1 less Magic Point for creatures in this lane.","flavorText":"","artKey":"stonehenge","image":"cards/stonehenge.webp"},{"id":"sun_pyramid","name":"Sun Pyramid","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"legendary","stars":5,"abilities":[{"trigger":"onFloop","effects":[{"type":"buff","target":"laneCreature","atk":4,"def":0}]}],"text":"Creature in this lane get 4 Attack every time it uses a Floop ability.","flavorText":"","artKey":"sun_pyramid","image":"cards/sun_pyramid.webp"},{"id":"the_big_hen_house","name":"The Big Hen House","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"rare","stars":3,"statics":[{"kind":"stat","scope":"lane","atk":4,"def":4}],"text":"Creature in this lane gets +4 Attack and +4 Defense.","flavorText":"","artKey":"the_big_hen_house","image":"cards/the_big_hen_house.webp"},{"id":"woad_mobile_home","name":"Woad Mobile Home","type":"building","landscape":"neutral","requirements":[],"cost":1,"rarity":"uncommon","stars":2,"statics":[{"kind":"stat","scope":"lane","atk":0,"def":{"of":"ownCreatures","mul":3}}],"text":"Creature in this lane gets +3 Defense for each of your creatures on the field.","flavorText":"","artKey":"woad_mobile_home","image":"cards/woad_mobile_home.webp"},{"id":"corn_castle","name":"Corn Castle","type":"building","landscape":"neutral","requirements":[],"cost":2,"rarity":"uncommon","stars":2,"statics":[{"kind":"stat","scope":"lane","atk":{"of":"ownCreatures","mul":2},"def":0}],"text":"Creature in this lane gets +2 Attack for each of your creatures on the field.","flavorText":"","artKey":"corn_castle","image":"cards/corn_castle.webp"},{"id":"palace_of_bone","name":"Palace of Bone","type":"building","landscape":"neutral","requirements":[],"cost":3,"rarity":"rare","stars":3,"abilities":[{"trigger":"onLaneCreaturePlayed","effects":[{"type":"damage","target":"opposingCreature","amount":5}]}],"text":"Deal 5 Damage to the opposing creature when a new creature is placed on this lane.","flavorText":"","artKey":"palace_of_bone","image":"cards/palace_of_bone.webp"}]`), _o = /* @__PURE__ */ JSON.parse(`[{"id":"ash","name":"Ash","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_ash","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(4 Turns) Return any card from the Discard Pile back to your hand.","cooldown":4,"effects":[{"type":"recover","pick":"best"}]},"image":"cards/ash.webp"},{"id":"bmo","name":"BMO","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_bmo","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Gain 2 extra Magic Points for 1 turn.","cooldown":3,"effects":[{"type":"gainMp","amount":2}]},"image":"cards/bmo.webp"},{"id":"banana_guard","name":"Banana Guard","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_banana_guard","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All your creatures gain +3 Defense.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":3}]},"image":"cards/banana_guard.webp"},{"id":"berrybones","name":"BerryBones","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_berrybones","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(4 Turns) Return any card from the Discard Pile to your hand.","cooldown":4,"effects":[{"type":"recover","pick":"best"}]},"image":"cards/berrybones.webp"},{"id":"blumps","name":"Blumps","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_blumps","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All of your creatures gain +3 Attack.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":3,"def":0}]},"image":"cards/blumps.webp"},{"id":"bonechill","name":"BoneChill","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_bonechill","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Gain 3 extra Magic Points for 1 turn.","cooldown":3,"effects":[{"type":"gainMp","amount":3}]},"image":"cards/bonechill.webp"},{"id":"cake","name":"Cake","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_cake","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Gain 3 extra Magic Points for 1 turn.","cooldown":3,"effects":[{"type":"gainMp","amount":3}]},"image":"cards/cake.webp"},{"id":"cinnamon_bun","name":"Cinnamon Bun","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_cinnamon_bun","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All your Nicelands creatures gain +3 Attack.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":3,"def":0,"filter":{"landscape":"candy"}}]},"image":"cards/cinnamon_bun.webp"},{"id":"date_night_ice_king","name":"Date-Night Ice King","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_date_night_ice_king","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) +1 Attack & +2 Def to all Nice Land Cards.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":1,"def":2,"filter":{"landscape":"candy"}}]},"image":"cards/date_night_ice_king.webp"},{"id":"doctor_finn","name":"Doctor Finn","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_doctor_finn","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All Spells cast this turn cost 1 less Magic Point.","cooldown":3,"effects":[{"type":"costMod","who":"self","kind":"spell","amount":-1}]},"image":"cards/doctor_finn.webp"},{"id":"donut_goon","name":"Donut Goon","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_donut_goon","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All of your creatures gain +5 Attack.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":5,"def":0}]},"image":"cards/donut_goon.webp"},{"id":"dr_donut","name":"Dr. Donut","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_dr_donut","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(5 Turns) Return any Creature from the Discard Pile back to your hand.","cooldown":5,"effects":[{"type":"recover","cardType":"creature","pick":"best"}]},"image":"cards/dr_donut.webp"},{"id":"earl_of_lemongrab","name":"Earl of Lemongrab","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_earl_of_lemongrab","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All creatures summoned this turn cost 1 less Magic Point.","cooldown":3,"effects":[{"type":"costMod","who":"self","kind":"creature","amount":-1}]},"image":"cards/earl_of_lemongrab.webp"},{"id":"el_fisto","name":"El Fisto","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_el_fisto","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Draw 2 Cards.","cooldown":3,"effects":[{"type":"draw","amount":2}]},"image":"cards/el_fisto.webp"},{"id":"finn","name":"Finn","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_finn","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(5 Turns) Gain 2 extra Magic Points for 1 turn.","cooldown":5,"effects":[{"type":"gainMp","amount":2}]},"image":"cards/finn.webp"},{"id":"fionna","name":"Fionna","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_fionna","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All creatures summoned this turn cost 1 less Magic Point.","cooldown":3,"effects":[{"type":"costMod","who":"self","kind":"creature","amount":-1}]},"image":"cards/fionna.webp"},{"id":"flame_princess","name":"Flame Princess","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_flame_princess","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(4 Turns) Draw 2 cards.","cooldown":4,"effects":[{"type":"draw","amount":2}]},"image":"cards/flame_princess.webp"},{"id":"ghost_jake","name":"Ghost Jake","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_ghost_jake","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All your Plains creatures gain +5 Attack.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":5,"def":0,"filter":{"landscape":"azure"}}]},"image":"cards/ghost_jake.webp"},{"id":"gunter","name":"Gunter","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_gunter","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 turns) Return any Spell card from the Discard Pile to your hand.","cooldown":3,"effects":[{"type":"recover","cardType":"spell","pick":"best"}]},"image":"cards/gunter.webp"},{"id":"holiday_bmo","name":"Holiday BMO","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_holiday_bmo","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(5 Turns) Draw 3 cards.","cooldown":5,"effects":[{"type":"draw","amount":3}]},"image":"cards/holiday_bmo.webp"},{"id":"holiday_finn","name":"Holiday Finn","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_holiday_finn","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(5 Turns) All your Universal creatures gain +5 Attack.","cooldown":5,"effects":[{"type":"buff","target":"allAllyCreatures","atk":5,"def":0,"filter":{"landscape":"neutral"}}]},"image":"cards/holiday_finn.webp"},{"id":"holiday_ice_king","name":"Holiday Ice King","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_holiday_ice_king","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Fully heal all of your Swamp creatures","cooldown":3,"effects":[{"type":"heal","target":"allAllyCreatures","amount":{"of":"targetDamage"},"filter":{"landscape":"murk"}}]},"image":"cards/holiday_ice_king.webp"},{"id":"holiday_jake","name":"Holiday Jake","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_holiday_jake","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(4 Turns) All Spells cast this turn cost 2 less Magic Point.","cooldown":4,"effects":[{"type":"costMod","who":"self","kind":"spell","amount":-2}]},"image":"cards/holiday_jake.webp"},{"id":"holiday_lumpy_space_princess","name":"Holiday Lumpy Space Princess","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_holiday_lumpy_space_princess","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(5 Turns) Gain 3 extra Magic Points for 1 turn.","cooldown":5,"effects":[{"type":"gainMp","amount":3}]},"image":"cards/holiday_lumpy_space_princess.webp"},{"id":"holiday_princess_bubblegum","name":"Holiday Princess Bubblegum","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_holiday_princess_bubblegum","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(5 Turns) All of your creatures gain +4 Attack.","cooldown":5,"effects":[{"type":"buff","target":"allAllyCreatures","atk":4,"def":0}]},"image":"cards/holiday_princess_bubblegum.webp"},{"id":"hunson_abadeer","name":"Hunson Abadeer","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_hunson_abadeer","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(4 Turns) All cards cast this turn cost 1 less magic point.","cooldown":4,"effects":[{"type":"costMod","who":"self","kind":"card","amount":-1}]},"image":"cards/hunson_abadeer.webp"},{"id":"ice_king","name":"Ice King","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_ice_king","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(4 Turns) Send all of your opponent's Buildings back to their hand.","cooldown":4,"effects":[{"type":"returnBuilding","target":"allEnemyBuildings"}]},"image":"cards/ice_king.webp"},{"id":"ice_queen","name":"Ice Queen","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_ice_queen","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All your creatures gain +4 Defense.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":4}]},"image":"cards/ice_queen.webp"},{"id":"jake","name":"Jake","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_jake","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All your Corn creatures gain +3 Attack.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":3,"def":0,"filter":{"landscape":"golden"}}]},"image":"cards/jake.webp"},{"id":"lady_rainicorn","name":"Lady Rainicorn","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_lady_rainicorn","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Choose a creature and fully heal it.","cooldown":3,"effects":[{"type":"heal","target":"chosenCreature","amount":{"of":"targetDamage"}}]},"image":"cards/lady_rainicorn.webp"},{"id":"lord_monochromicorn","name":"Lord Monochromicorn","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_lord_monochromicorn","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Opponent cannot use Spells next round and all Buildings on the board are discarded.","cooldown":3,"effects":[{"type":"block","what":"spell"},{"type":"destroyBuilding","target":"allBuildings"}]},"image":"cards/lord_monochromicorn.webp"},{"id":"lumpy_mimic","name":"Lumpy Mimic","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_lumpy_mimic","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Gain 2 extra Magic Points for 1 turn.","cooldown":3,"effects":[{"type":"gainMp","amount":2}]},"image":"cards/lumpy_mimic.webp"},{"id":"lumpy_space_prince","name":"Lumpy Space Prince","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_lumpy_space_prince","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All Spells cast this turn cost 2 less Magic Points.","cooldown":3,"effects":[{"type":"costMod","who":"self","kind":"spell","amount":-2}]},"image":"cards/lumpy_space_prince.webp"},{"id":"lumpy_space_princess","name":"Lumpy Space Princess","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_lumpy_space_princess","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Fully heal all of your Plains creatures.","cooldown":3,"effects":[{"type":"heal","target":"allAllyCreatures","amount":{"of":"targetDamage"},"filter":{"landscape":"azure"}}]},"image":"cards/lumpy_space_princess.webp"},{"id":"magic_man","name":"Magic Man","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_magic_man","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) Gain 1 extra Magic Point this turn.","cooldown":2,"effects":[{"type":"gainMp","amount":1}]},"image":"cards/magic_man.webp"},{"id":"marceline","name":"Marceline","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_marceline","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All of your creatures gain +2 Attack.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":2,"def":0}]},"image":"cards/marceline.webp"},{"id":"marshall_lee","name":"Marshall Lee","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_marshall_lee","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All of your creatures gain +3 Attack.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":3,"def":0}]},"image":"cards/marshall_lee.webp"},{"id":"pajama_finn","name":"Pajama Finn","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_pajama_finn","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All your Universal creatures gain +4 Defense.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":4,"filter":{"landscape":"neutral"}}]},"image":"cards/pajama_finn.webp"},{"id":"peppermint_butler","name":"Peppermint Butler","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_peppermint_butler","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) Return any Building card from the Discard Pile to your hand.","cooldown":2,"effects":[{"type":"recover","cardType":"building","pick":"best"}]},"image":"cards/peppermint_butler.webp"},{"id":"prince_gumball","name":"Prince Gumball","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_prince_gumball","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Nice Lands Creatures deploy cost cut by 2, every other land cut by 1.","cooldown":3,"effects":[{"type":"costMod","who":"self","kind":"creature","amount":-1},{"type":"costMod","who":"self","kind":"creature","amount":-1,"landscape":"candy"}]},"image":"cards/prince_gumball.webp"},{"id":"princess_bubblegum","name":"Princess Bubblegum","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_princess_bubblegum","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(4 Turns) Fully heal all of your creatures.","cooldown":4,"effects":[{"type":"heal","target":"allAllyCreatures","amount":{"of":"targetDamage"}}]},"image":"cards/princess_bubblegum.webp"},{"id":"princess_cookie","name":"Princess Cookie","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_princess_cookie","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All your Swamp creatures gain +4 Attack.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":4,"def":0,"filter":{"landscape":"murk"}}]},"image":"cards/princess_cookie.webp"},{"id":"ricardio_heart_guy","name":"Ricardio Heart Guy","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_ricardio_heart_guy","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Draw 1 card.","cooldown":3,"effects":[{"type":"draw","amount":1}]},"image":"cards/ricardio_heart_guy.webp"},{"id":"slumpy","name":"Slumpy","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_slumpy","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All creatures summoned this turn cost 1 less Magic Point.","cooldown":3,"effects":[{"type":"costMod","who":"self","kind":"creature","amount":-1}]},"image":"cards/slumpy.webp"},{"id":"snowfist","name":"SnowFist","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_snowfist","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All Spells cast this turn cost less 2 Magic Points.","cooldown":3,"effects":[{"type":"costMod","who":"self","kind":"spell","amount":-2}]},"image":"cards/snowfist.webp"},{"id":"snownut","name":"SnowNut","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_snownut","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All your creatures gain +3 Defense.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":3}]},"image":"cards/snownut.webp"},{"id":"snowberry","name":"Snowberry","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_snowberry","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Fully heal all of your creatures.","cooldown":3,"effects":[{"type":"heal","target":"allAllyCreatures","amount":{"of":"targetDamage"}}]},"image":"cards/snowberry.webp"},{"id":"sprinkles","name":"Sprinkles","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_sprinkles","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(5 Turns) Gain 2 extra Magic Points for 1 turn.","cooldown":5,"effects":[{"type":"gainMp","amount":2}]},"image":"cards/sprinkles.webp"},{"id":"super_ash","name":"Super Ash","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_ash","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) Gain +3 extra Magic Points for 1 turn.","cooldown":2,"effects":[{"type":"gainMp","amount":3}]},"image":"cards/super_ash.webp"},{"id":"super_bmo","name":"Super BMO","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_bmo","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) Gain 3 extra Magic Points for 1 turn.","cooldown":2,"effects":[{"type":"gainMp","amount":3}]},"image":"cards/super_bmo.webp"},{"id":"super_banana_guard","name":"Super Banana Guard","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_banana_guard","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) All your creatures gain +3 Defense.","cooldown":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":3}]},"image":"cards/super_banana_guard.webp"},{"id":"super_cinnamon_bun","name":"Super Cinnamon Bun","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_cinnamon_bun","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) All of your creatures gain +4 Attack.","cooldown":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":4,"def":0}]},"image":"cards/super_cinnamon_bun.webp"},{"id":"super_doctor_finn","name":"Super Doctor Finn","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_doctor_finn","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) Return any Spell card from the Discard Pile to your hand.","cooldown":2,"effects":[{"type":"recover","cardType":"spell","pick":"best"}]},"image":"cards/super_doctor_finn.webp"},{"id":"super_dr_donut","name":"Super Dr. Donut","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_dr_donut","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(1 Turn) Return any Creature from the Discard Pile back to your hand.","cooldown":1,"effects":[{"type":"recover","cardType":"creature","pick":"best"}]},"image":"cards/super_dr_donut.webp"},{"id":"super_earl_of_lemongrab","name":"Super Earl Of Lemongrab","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_earl_of_lemongrab","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(1 Turn) All creatures summoned this turn cost 1 less Magic Point.","cooldown":1,"effects":[{"type":"costMod","who":"self","kind":"creature","amount":-1}]},"image":"cards/super_earl_of_lemongrab.webp"},{"id":"super_flame_princess","name":"Super Flame Princess","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_flame_princess","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) All your Sand creatures gain +5 Attack.","cooldown":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":5,"def":0,"filter":{"landscape":"dune"}}]},"image":"cards/super_flame_princess.webp"},{"id":"super_gunter","name":"Super Gunter","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_gunter","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(1 Turn) All your creatures gain +2 Defense. Get everything if you play despacito","cooldown":1,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":2}]},"image":"cards/super_gunter.webp"},{"id":"super_hunson_abadeer","name":"Super Hunson Abadeer","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_hunson_abadeer","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"All plain creatures on your side +8 attack","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":8,"def":0,"filter":{"landscape":"azure"}}]},"image":"cards/super_hunson_abadeer.webp"},{"id":"super_ice_king","name":"Super Ice King","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_ice_king","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(1 Turn) All of your creatures gain +2 Attack.","cooldown":1,"effects":[{"type":"buff","target":"allAllyCreatures","atk":2,"def":0}]},"image":"cards/super_ice_king.webp"},{"id":"super_jake","name":"Super Jake","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_jake","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) All your Corn creatures gain +5 Attack.","cooldown":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":5,"def":0,"filter":{"landscape":"golden"}}]},"image":"cards/super_jake.webp"},{"id":"super_lady_rainicorn","name":"Super Lady Rainicorn","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_lady_rainicorn","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) Fully heal all of your creatures.","cooldown":3,"effects":[{"type":"heal","target":"allAllyCreatures","amount":{"of":"targetDamage"}}]},"image":"cards/super_lady_rainicorn.webp"},{"id":"super_lumpy_space_princess","name":"Super Lumpy Space Princess","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_lumpy_space_princess","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) Fully heal all of your Plains creatures.","cooldown":2,"effects":[{"type":"heal","target":"allAllyCreatures","amount":{"of":"targetDamage"},"filter":{"landscape":"azure"}}]},"image":"cards/super_lumpy_space_princess.webp"},{"id":"super_magic_man","name":"Super Magic Man","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_magic_man","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(1 Turn) Send all of your opponent's Buildings back to their hand.","cooldown":1,"effects":[{"type":"returnBuilding","target":"allEnemyBuildings"}]},"image":"cards/super_magic_man.webp"},{"id":"super_marceline","name":"Super Marceline","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_marceline","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) All of your creatures gain +2 Attack.","cooldown":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":2,"def":0}]},"image":"cards/super_marceline.webp"},{"id":"super_pajama_finn","name":"Super Pajama Finn","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_pajama_finn","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) All of your Rainbow creatures gain +6 Defense.","cooldown":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":0,"def":6,"filter":{"landscape":"neutral"}}]},"image":"cards/super_pajama_finn.webp"},{"id":"super_peppermint_butler","name":"Super Peppermint Butler","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_peppermint_butler","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) All of your Universal creatures gain +5 Attack.","cooldown":2,"effects":[{"type":"buff","target":"allAllyCreatures","atk":5,"def":0,"filter":{"landscape":"neutral"}}]},"image":"cards/super_peppermint_butler.webp"},{"id":"super_princess_bubblegum","name":"Super Princess Bubblegum","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_princess_bubblegum","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(2 Turns) Fully heal all of your creatures.","cooldown":2,"effects":[{"type":"heal","target":"allAllyCreatures","amount":{"of":"targetDamage"}}]},"image":"cards/super_princess_bubblegum.webp"},{"id":"super_princess_cookie","name":"Super Princess Cookie","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_super_princess_cookie","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All of your Swamp creatures gain +8 Attack.","cooldown":3,"effects":[{"type":"buff","target":"allAllyCreatures","atk":8,"def":0,"filter":{"landscape":"murk"}}]},"image":"cards/super_princess_cookie.webp"},{"id":"treasure_cat","name":"Treasure Cat","title":"Hero","landscape":"neutral","flavorText":"","artKey":"hero_treasure_cat","passive":{"name":"","text":""},"ultimate":{"name":"Hero Ability","text":"(3 Turns) All cards cast this turn cost 1 less magic point.","cooldown":3,"effects":[{"type":"costMod","who":"self","kind":"card","amount":-1}]},"image":"cards/treasure_cat.webp"}]`), ko = [
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
function bo(e, t) {
  return e.filter((a) => a === t).length;
}
function wo(e, t, a) {
  const r = ja();
  if (r.length > 0) throw new Error(`Invalid keyword data:
- ${r.join(`
- `)}`);
  const n = Wa(e), o = Va(t, n), s = { cards: n, heroes: o, balance: le.match };
  if (!Array.isArray(a)) throw new Error("Starter deck data must be an array");
  const i = [], l = /* @__PURE__ */ new Set(), d = a.map((c) => {
    const u = {
      id: c.id,
      name: c.name,
      description: c.description,
      heroId: c.heroId,
      landscapes: c.landscapes,
      cards: dr(c.cards ?? {})
    };
    l.has(u.id) && i.push(`${u.id}: duplicate starter deck id`), l.add(u.id);
    for (const w of tt(u, s)) i.push(`${u.id}: ${w}`);
    for (const w of new Set(u.cards)) {
      const g = n.byId.get(w);
      if (g)
        for (const f of g.requirements)
          bo(u.landscapes, f.landscape) < f.count && i.push(
            `${u.id}: ${g.name} needs ${f.count} ${f.landscape}, but the deck cannot provide it`
          );
    }
    return u;
  });
  if (i.length > 0) throw new Error(`Invalid starter decks:
- ${i.join(`
- `)}`);
  return { ctx: s, starterDecks: d };
}
let jt = null;
function vo() {
  return jt ??= wo(ho, _o, ko), jt;
}
const Z = (e) => e ? Date.parse(e) : 0, fe = (e) => e === null ? null : new Date(e).toISOString();
function Ue(e) {
  return {
    id: e.id,
    mode: e.mode,
    status: e.status,
    roomCode: e.room_code,
    players: [e.player0, e.player1],
    names: e.names,
    decks: e.decks,
    state: e.state,
    seq: e.seq,
    deadline: e.deadline ? Z(e.deadline) : null,
    lastSeen: e.last_seen,
    winner: e.winner === null ? null : e.winner === "draw" ? "draw" : Number(e.winner),
    seasonId: e.season_id,
    result: e.result,
    createdAt: Z(e.created_at),
    updatedAt: Z(e.updated_at)
  };
}
function xo(e) {
  return {
    id: e.id,
    mode: e.mode,
    status: e.status,
    room_code: e.roomCode,
    player0: e.players[0],
    player1: e.players[1],
    names: e.names,
    decks: e.decks,
    state: e.state,
    seq: e.seq,
    deadline: fe(e.deadline),
    last_seen: e.lastSeen,
    winner: e.winner === null ? null : String(e.winner),
    season_id: e.seasonId,
    result: e.result,
    created_at: new Date(e.createdAt).toISOString(),
    updated_at: new Date(e.updatedAt).toISOString()
  };
}
function F(e) {
  if (e.error) throw new Error(e.error.message);
  return e.data;
}
function se(e) {
  if (e.error) throw new Error(e.error.message);
  return e.data ?? [];
}
class To {
  constructor(t) {
    this.db = t;
  }
  async getSave(t) {
    const a = F(
      await this.db.from("saves").select("data, version, synced_at").eq("user_id", t).maybeSingle()
    );
    return a ? { data: a.data, version: a.version, syncedAt: Z(a.synced_at) } : null;
  }
  async putSave(t, a, r) {
    const n = { user_id: t, data: a.data, version: a.version, synced_at: fe(a.syncedAt) };
    if (r === null) {
      if ((await this.db.from("saves").insert(n)).error) return !1;
    } else {
      const o = await this.db.from("saves").update(n).eq("user_id", t).eq("version", r).select("version");
      if (se(o).length !== 1) return !1;
    }
    return await this.mirrorCollectionAndDecks(t, a), !0;
  }
  /** Keeps `collections` and `decks` in step with the save (owner-readable, used for reporting). */
  async mirrorCollectionAndDecks(t, a) {
    const r = Object.entries(a.data.collection).map(([o, s]) => ({
      user_id: t,
      card_id: o,
      count: s.count,
      level: s.level
    }));
    F(await this.db.from("collections").delete().eq("user_id", t)), r.length > 0 && F(await this.db.from("collections").insert(r));
    const n = a.data.decks.flatMap(
      (o, s) => o ? [
        {
          user_id: t,
          slot: s,
          name: o.name,
          hero_id: o.heroId,
          landscapes: o.landscapes,
          cards: o.cards
        }
      ] : []
    );
    F(await this.db.from("decks").delete().eq("user_id", t)), n.length > 0 && F(await this.db.from("decks").insert(n));
  }
  async setProfile(t, a) {
    F(
      await this.db.from("profiles").upsert({
        id: t,
        name: a.name,
        avatar: a.avatar,
        card_back: a.cardBack,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      })
    );
  }
  async getProfileName(t) {
    return F(await this.db.from("profiles").select("name").eq("id", t).maybeSingle())?.name ?? "Player";
  }
  async activeSeason() {
    const t = F(await this.db.from("seasons").select("*").eq("active", !0).single());
    if (!t) throw new Error("No active season");
    return { id: t.id, name: t.name, startsAt: Z(t.starts_at), endsAt: Z(t.ends_at), active: !0 };
  }
  async startSeason(t) {
    F(await this.db.from("seasons").update({ active: !1 }).eq("active", !0)), F(
      await this.db.from("seasons").insert({ id: t.id, name: t.name, starts_at: fe(t.startsAt), ends_at: fe(t.endsAt), active: !0 })
    );
  }
  async getRating(t, a) {
    const r = F(
      await this.db.from("ratings").select("*").eq("user_id", t).eq("season_id", a).maybeSingle()
    );
    return r ? { userId: t, seasonId: a, rating: r.rating, games: r.games, wins: r.wins, losses: r.losses, peak: r.peak } : null;
  }
  async putRating(t) {
    F(
      await this.db.from("ratings").upsert({
        user_id: t.userId,
        season_id: t.seasonId,
        rating: t.rating,
        games: t.games,
        wins: t.wins,
        losses: t.losses,
        peak: t.peak
      })
    );
  }
  async ratingsOf(t) {
    return se(await this.db.from("ratings").select("*").eq("season_id", t)).map((r) => ({
      userId: String(r.user_id),
      seasonId: t,
      rating: Number(r.rating),
      games: Number(r.games),
      wins: Number(r.wins),
      losses: Number(r.losses),
      peak: Number(r.peak)
    }));
  }
  async queue() {
    return se(await this.db.from("matchmaking_queue").select("*").order("queued_at").limit(200)).map(
      (a) => ({
        userId: a.user_id,
        name: a.name,
        rating: a.rating,
        deck: a.deck,
        queuedAt: Z(a.queued_at)
      })
    );
  }
  async putQueue(t) {
    F(
      await this.db.from("matchmaking_queue").upsert({
        user_id: t.userId,
        name: t.name,
        rating: t.rating,
        deck: t.deck,
        queued_at: fe(t.queuedAt)
      })
    );
  }
  async takeQueue(t) {
    return se(
      await this.db.from("matchmaking_queue").delete().eq("user_id", t).select("user_id")
    ).length === 1;
  }
  async getMatch(t) {
    const a = F(await this.db.from("matches").select("*").eq("id", t).maybeSingle());
    return a ? Ue(a) : null;
  }
  async putMatch(t, a) {
    const r = xo(t);
    return a === null ? !(await this.db.from("matches").insert(r)).error : se(
      await this.db.from("matches").update(r).eq("id", t.id).eq("seq", a).select("id")
    ).length === 1;
  }
  async waitingRoom(t) {
    const a = F(
      await this.db.from("matches").select("*").eq("status", "waiting").eq("room_code", t).maybeSingle()
    );
    return a ? Ue(a) : null;
  }
  async activeMatchOf(t) {
    const a = se(
      await this.db.from("matches").select("*").eq("status", "active").or(`player0.eq.${t},player1.eq.${t}`).order("created_at", { ascending: !1 }).limit(1)
    );
    return a[0] ? Ue(a[0]) : null;
  }
  async logAction(t, a, r, n) {
    await this.db.from("match_actions").insert({ match_id: t, seq: a, player: r, action: n });
  }
  async publishView(t, a, r) {
    F(
      await this.db.from("match_views").upsert({
        match_id: t,
        user_id: a,
        seq: r.seq,
        view: r,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      })
    );
  }
}
function Mo(e, t) {
  const a = qa(e, t, { auth: { persistSession: !1, autoRefreshToken: !1 } });
  return {
    service: new mo({
      store: new To(a),
      content: vo(),
      now: () => Date.now(),
      random: () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
      newId: () => crypto.randomUUID()
    }),
    auth: async (n) => {
      const o = n.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      if (!o) return null;
      const { data: s, error: i } = await a.auth.getUser(o);
      return i || !s.user ? null : { userId: s.user.id };
    },
    isAdmin: (n) => n.headers.get("authorization")?.replace(/^Bearer\s+/i, "") === t
  };
}
class Do {
  saves = /* @__PURE__ */ new Map();
  profiles = /* @__PURE__ */ new Map();
  seasons = [];
  ratings = /* @__PURE__ */ new Map();
  entries = /* @__PURE__ */ new Map();
  matches = /* @__PURE__ */ new Map();
  actions = [];
  views = /* @__PURE__ */ new Map();
  constructor(t) {
    this.seasons.push({
      id: 1,
      name: "Season 1",
      startsAt: t,
      endsAt: t + 42 * 864e5,
      active: !0
    });
  }
  copy(t) {
    return structuredClone(t);
  }
  async getSave(t) {
    const a = this.saves.get(t);
    return a ? this.copy(a) : null;
  }
  async putSave(t, a, r) {
    const n = this.saves.get(t);
    return (r === null ? n !== void 0 : n?.version !== r) ? !1 : (this.saves.set(t, this.copy(a)), !0);
  }
  async setProfile(t, a) {
    this.profiles.set(t, { ...a });
  }
  async getProfileName(t) {
    return this.profiles.get(t)?.name ?? "Player";
  }
  async activeSeason() {
    return this.copy(this.seasons.find((t) => t.active));
  }
  async startSeason(t) {
    for (const a of this.seasons) a.active = !1;
    this.seasons.push({ ...t, active: !0 });
  }
  async getRating(t, a) {
    const r = this.ratings.get(`${t}:${a}`);
    return r ? this.copy(r) : null;
  }
  async putRating(t) {
    this.ratings.set(`${t.userId}:${t.seasonId}`, this.copy(t));
  }
  async ratingsOf(t) {
    return [...this.ratings.values()].filter((a) => a.seasonId === t).map((a) => this.copy(a));
  }
  async queue() {
    return [...this.entries.values()].map((t) => this.copy(t));
  }
  async putQueue(t) {
    this.entries.set(t.userId, this.copy(t));
  }
  async takeQueue(t) {
    return this.entries.delete(t);
  }
  async getMatch(t) {
    const a = this.matches.get(t);
    return a ? this.copy(a) : null;
  }
  async putMatch(t, a) {
    const r = this.matches.get(t.id);
    return (a === null ? r !== void 0 : r?.seq !== a) ? !1 : (this.matches.set(t.id, this.copy(t)), !0);
  }
  async waitingRoom(t) {
    const a = [...this.matches.values()].find((r) => r.status === "waiting" && r.roomCode === t);
    return a ? this.copy(a) : null;
  }
  async activeMatchOf(t) {
    const a = [...this.matches.values()].find((r) => r.status === "active" && r.players.includes(t));
    return a ? this.copy(a) : null;
  }
  async logAction(t, a, r, n) {
    this.actions.push({ matchId: t, seq: a, player: r, action: this.copy(n) });
  }
  async publishView(t, a, r) {
    this.views.set(`${t}:${a}`, this.copy(r));
  }
}
export {
  Da as CORS_HEADERS,
  mo as GameService,
  Do as MemoryStore,
  P as ServiceError,
  To as SupabaseStore,
  Mo as createSupabaseDeps,
  Co as handle
};
