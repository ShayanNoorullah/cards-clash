/**
 * Core data types of the rules engine. Everything inside GameState is plain
 * JSON-serializable data: no classes, functions, Maps or Sets.
 */
import type { MatchBalance } from './balance';
import type { RngState } from './rng';

export type PlayerId = 0 | 1;

export const LANDSCAPE_TYPES = ['azure', 'golden', 'murk', 'dune', 'candy', 'ember'] as const;
export type LandscapeType = (typeof LANDSCAPE_TYPES)[number];
export type CardLandscape = LandscapeType | 'neutral';
/**
 * Landscapes that have cards. Ember has none in the Card Wars pool (it stays a
 * valid type for old data, fixtures and the campaign map), so players are
 * never offered it.
 */
export const PLAYABLE_LANDSCAPES: readonly LandscapeType[] = ['azure', 'golden', 'murk', 'dune', 'candy'];

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];

export const CARD_TYPES = ['creature', 'spell', 'building'] as const;
export type CardType = (typeof CARD_TYPES)[number];

// ---------------------------------------------------------------------------
// Keywords
// ---------------------------------------------------------------------------

export const KEYWORDS = [
  'rush',
  'guard',
  'ranged',
  'lifesteal',
  'thorns',
  'counter',
  'shield',
  'poison',
  'regenerate',
  'swift',
  'stealth',
  'feast',
] as const;
export type Keyword = (typeof KEYWORDS)[number];

/** Keywords written with a number, e.g. "poison:2". */
export const VALUED_KEYWORDS: readonly Keyword[] = ['thorns', 'poison', 'regenerate', 'feast'];

/** Keyword map: flag keywords have value 1, valued keywords their X. */
export type KeywordValues = Partial<Record<Keyword, number>>;

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

/** Creature selectors. "adjacent" means lanes next to the source's lane. */
export const CREATURE_SELECTORS = [
  'self',
  'opposingCreature',
  'laneCreature',
  'adjacentAllies',
  'adjacentEnemies',
  'allAllyCreatures',
  'otherAllyCreatures',
  'allEnemyCreatures',
  'allCreatures',
  'randomEnemyCreature',
  'randomAllyCreature',
  'randomCreature',
  'weakestAllyCreature',
  'chosenCreature',
  'chosenEnemyCreature',
  'chosenAllyCreature',
] as const;
export const HERO_SELECTORS = ['ownHero', 'enemyHero', 'bothHeroes'] as const;
export const BUILDING_SELECTORS = [
  'thisBuilding',
  'opposingBuilding',
  'chosenEnemyBuilding',
  'chosenAllyBuilding',
  'allEnemyBuildings',
  'allAllyBuildings',
  'allBuildings',
] as const;
export const LANDSCAPE_SELECTORS = [
  'thisLandscape',
  'opposingLandscape',
  'chosenEnemyLandscape',
  'chosenAllyLandscape',
  'randomEnemyLandscape',
  'allAllyLandscapes',
  'allEnemyLandscapes',
] as const;

export type CreatureSelector = (typeof CREATURE_SELECTORS)[number];
export type HeroSelector = (typeof HERO_SELECTORS)[number];
export type LandscapeSelector = (typeof LANDSCAPE_SELECTORS)[number];
export type BuildingSelector = (typeof BUILDING_SELECTORS)[number];
export type TargetSelector = CreatureSelector | HeroSelector | LandscapeSelector | BuildingSelector;

/** Selectors that make the player pick a target when playing/flooping. */
export const CHOSEN_SELECTORS: readonly TargetSelector[] = [
  'chosenCreature',
  'chosenEnemyCreature',
  'chosenAllyCreature',
  'chosenEnemyLandscape',
  'chosenAllyLandscape',
  'chosenEnemyBuilding',
  'chosenAllyBuilding',
];

/** Selectors that need the source to occupy a lane (creatures and buildings). */
export const LANE_SOURCE_SELECTORS: readonly TargetSelector[] = [
  'self',
  'opposingCreature',
  'laneCreature',
  'adjacentAllies',
  'adjacentEnemies',
  'thisLandscape',
  'opposingLandscape',
  'thisBuilding',
  'opposingBuilding',
];

/** Selectors that pick randomly and accept a `count`. */
export const RANDOM_SELECTORS: readonly TargetSelector[] = [
  'randomEnemyCreature',
  'randomAllyCreature',
  'randomCreature',
  'randomEnemyLandscape',
];

/** Where summoned tokens appear. */
export const SUMMON_LOCATIONS = [
  'sourceLane',
  'adjacentEmptyLanes',
  'randomEmptyLane',
  'allEmptyLanes',
] as const;
export type SummonLocation = (typeof SUMMON_LOCATIONS)[number];

// ---------------------------------------------------------------------------
// Effects, conditions, triggers, statics
// ---------------------------------------------------------------------------

/**
 * Numbers that depend on the game: "2 for each card in your hand" is
 * `{ of: 'handSize', mul: 2 }`. Value = trunc(mul * floor(q / div) + add - sub).
 * `self*` read the source creature, `target*` the creature the effect is
 * applied to, `opposingAtk` the creature across from the source.
 */
export const QUANTITIES = [
  'handSize',
  'enemyHandSize',
  'ownCreatures',
  'enemyCreatures',
  'ownBuildings',
  'enemyBuildings',
  'ownLandscapeTypes',
  'fieldLandscapeTypes',
  'ownLandscapesOf',
  'ownEmptyLanes',
  'adjacentEmptyLanes',
  'floopsThisTurn',
  'timesFlooped',
  'ownDiscard',
  'enemyDiscardCreatures',
  'selfAtk',
  'selfDef',
  'selfDamage',
  'opposingAtk',
  'targetAtk',
  'targetDef',
  'targetMaxDef',
  'targetDamage',
] as const;
export type Quantity = (typeof QUANTITIES)[number];
/** Quantities that read creature stats (not allowed in static abilities, which feed stats). */
export const STAT_QUANTITIES: readonly Quantity[] = [
  'selfAtk',
  'selfDef',
  'selfDamage',
  'opposingAtk',
  'targetAtk',
  'targetDef',
  'targetMaxDef',
  'targetDamage',
  'timesFlooped',
];

export interface AmountExpr {
  of: Quantity;
  mul?: number;
  div?: number;
  add?: number;
  /** Subtracted at the end, e.g. "make its ATK equal to mine" = selfAtk - targetAtk. */
  sub?: Quantity;
  /** Landscape for `ownLandscapesOf`. */
  landscape?: LandscapeType;
}
export type Amount = number | AmountExpr;

/** Restricts which creatures an effect hits (and which can be chosen). */
export interface TargetFilter {
  /** Card landscape; "neutral" means Rainbow cards. */
  landscape?: CardLandscape;
  /** Rarity in stars. */
  maxStars?: number;
  minStars?: number;
  /** Only creatures with damage on them. */
  damaged?: boolean;
}

/** How long a stat change lasts: forever, until the end of this turn, or until its owner's next turn starts. */
export type BuffDuration = 'permanent' | 'turn' | 'round';
export type CostKind = 'card' | 'creature' | 'spell' | 'building' | 'floop';
export type PlayKind = 'creature' | 'spell' | 'building';

interface EffectCommon {
  /** The effect only happens if this holds when it resolves. */
  when?: Condition;
  /** Only creatures matching this are affected (or can be chosen). */
  filter?: TargetFilter;
  /** Also hits the creatures next to each target, on the same side. */
  splash?: boolean;
}

export type Effect = EffectCommon & EffectBody;

export type EffectBody =
  | {
      type: 'damage';
      target: CreatureSelector | HeroSelector;
      amount: Amount;
      count?: number;
      /** A creature destroyed by this goes to your hand instead of its owner's discard pile. */
      stealOnKill?: boolean;
    }
  | { type: 'heal'; target: CreatureSelector | HeroSelector; amount: Amount; count?: number }
  | {
      type: 'buff';
      target: CreatureSelector;
      atk: Amount;
      def: Amount;
      /** Legacy form of duration "turn". */
      temporary?: boolean;
      duration?: BuffDuration;
      count?: number;
    }
  | { type: 'draw'; amount: Amount; who?: 'self' | 'enemy' }
  | { type: 'discard'; amount: number; who?: 'self' | 'enemy' }
  | { type: 'gainMp'; amount: Amount; nextTurn?: boolean }
  | { type: 'loseMp'; amount: number }
  | { type: 'summon'; cardId: string; where: SummonLocation; count?: number }
  | { type: 'destroy'; target: CreatureSelector; count?: number }
  | { type: 'returnToHand'; target: CreatureSelector; count?: number }
  | { type: 'move'; target: CreatureSelector }
  | { type: 'freeze'; target: CreatureSelector; count?: number }
  | { type: 'poison'; target: CreatureSelector; amount: number; count?: number }
  | { type: 'shield'; target: CreatureSelector; count?: number }
  | { type: 'grantKeyword'; target: CreatureSelector; keyword: string; count?: number }
  | { type: 'flip'; target: LandscapeSelector; count?: number }
  | { type: 'convert'; target: LandscapeSelector; to: LandscapeType }
  | { type: 'restore'; target: LandscapeSelector }
  | { type: 'chargeUltimate'; amount: number }
  /** Removes all damage and stat modifiers. */
  | { type: 'reset'; target: CreatureSelector }
  /** Swaps current ATK and remaining DEF. */
  | { type: 'swapStats'; target: CreatureSelector }
  /** Cannot floop during its owner's next turn. */
  | { type: 'lockFloop'; target: CreatureSelector }
  /** Cannot attack during its owner's next turn. */
  | { type: 'lockAttack'; target: CreatureSelector }
  /** Until the end of your next turn, damage to it is dealt to its Hero instead. */
  | { type: 'redirect'; target: CreatureSelector }
  /** The creature attacks the opposing lane right now. */
  | { type: 'forceAttack'; target: CreatureSelector }
  /** Uses the creature's Floop ability for free (targets are picked automatically). */
  | { type: 'activateFloop'; target: CreatureSelector }
  /** Changes costs for you this turn, or for the enemy on their next turn. */
  | { type: 'costMod'; who: 'self' | 'enemy'; kind: CostKind; amount: number; landscape?: CardLandscape }
  /** The enemy cannot play this kind of card during their next turn. */
  | { type: 'block'; what: PlayKind }
  /** Nothing can be played on that lane during its owner's next turn. */
  | { type: 'seal'; target: LandscapeSelector }
  /** Destroys every creature and building on both sides of the lane. */
  | { type: 'wipeLane'; target: LandscapeSelector }
  | { type: 'destroyBuilding'; target: BuildingSelector }
  | { type: 'returnBuilding'; target: BuildingSelector }
  /** Moves the building to a random lane of its owner that has no building. */
  | { type: 'moveBuilding'; target: BuildingSelector }
  /** Puts cards from your discard pile into your hand. */
  | { type: 'recover'; cardType?: CardType; pick: 'best' | 'random'; count?: number }
  /** Returns the creature whose destruction triggered this to its owner's hand. */
  | { type: 'recoverDestroyed' }
  /** Puts a random matching card from your deck into your hand. */
  | { type: 'tutor'; cardType?: CardType }
  /** Shuffles your hand into your deck, then draws. */
  | { type: 'cycleHand'; draw: number }
  | { type: 'discardHand' };

export type EffectType = Effect['type'];

export type Condition =
  | { type: 'landscapeCount'; landscape: LandscapeType; atLeast: number }
  | { type: 'opposingLaneEmpty' }
  | { type: 'opposingLaneOccupied' }
  | { type: 'heroHpAtMost'; who: 'self' | 'enemy'; value: number }
  | { type: 'creatureCountAtLeast'; who: 'self' | 'enemy'; value: number }
  | { type: 'handSizeAtMost'; value: number }
  | { type: 'handSizeAtLeast'; value: number }
  | { type: 'creatureCountAtMost'; who: 'self' | 'enemy'; value: number };

export const TRIGGERS = [
  'onPlay',
  'onDestroy',
  'startOfTurn',
  'endOfTurn',
  'onAttack',
  'onDamaged',
  'onAllyCreaturePlayed',
  'onAllyCreatureDestroyed',
  'onEnemyCreatureDestroyed',
  'onSpellCast',
  /** Creatures: when this floops. Buildings: when the creature in their lane floops. */
  'onFloop',
  /** When any of your creatures floops. */
  'onAllyFloop',
  /** Buildings: when your creature in their lane is destroyed. */
  'onLaneCreatureDestroyed',
  /** Buildings: when you play a creature into their lane. */
  'onLaneCreaturePlayed',
] as const;
export type TriggerType = (typeof TRIGGERS)[number];

export interface TriggeredAbility {
  trigger: TriggerType;
  condition?: Condition;
  effects: Effect[];
}

export const STATIC_SCOPES = ['self', 'lane', 'adjacent', 'otherAllies', 'allAllies', 'allEnemies'] as const;
export type StaticScope = (typeof STATIC_SCOPES)[number];

/** Continuous effects ("While in Play", "Aura") recomputed whenever stats are read. */
export type StaticAbility =
  | { kind: 'stat'; scope: StaticScope; atk: Amount; def: Amount; onLandscape?: LandscapeType }
  | { kind: 'keyword'; scope: StaticScope; keyword: string; onLandscape?: LandscapeType }
  | { kind: 'spellPower'; amount: number }
  /** Affected creatures use their DEF as ATK and their ATK as DEF. */
  | { kind: 'swapStats'; scope: StaticScope; onLandscape?: LandscapeType }
  /** Affected creatures take this much less damage from attacks. */
  | { kind: 'armor'; scope: StaticScope; amount: number; onLandscape?: LandscapeType }
  /** Floop cost change for affected creatures. */
  | { kind: 'floopCost'; scope: StaticScope; amount: number; onLandscape?: LandscapeType }
  /** The enemy may only play creatures of at most this many stars into the opposing lane. */
  | { kind: 'laneRarityCap'; maxStars: number };

// ---------------------------------------------------------------------------
// Card definitions (static content, loaded from JSON)
// ---------------------------------------------------------------------------

export interface LandscapeRequirement {
  landscape: LandscapeType;
  count: number;
}

interface CardDefBase {
  id: string;
  name: string;
  type: CardType;
  landscape: CardLandscape;
  /** All requirements must be met by the owner's un-flipped landscapes. */
  requirements: LandscapeRequirement[];
  cost: number;
  rarity: Rarity;
  /** Rules text shown on the card ("" for vanilla creatures). */
  text: string;
  flavorText: string;
  artKey: string;
  /** Tokens are created by effects only: not collectible, never in decks. */
  token?: boolean;
  /** Rarity in stars (defaults to the rarity's position, 1-5). */
  stars?: number;
  /** Printed variant shown on the card, e.g. "Gold". */
  variant?: string;
  /** Illustration under public/ (procedural art is used without one). */
  image?: string;
  abilities?: TriggeredAbility[];
  statics?: StaticAbility[];
}

export interface FloopDef {
  cost: number;
  condition?: Condition;
  effects: Effect[];
}

export interface CreatureDef extends CardDefBase {
  type: 'creature';
  atk: number;
  def: number;
  /** e.g. ["rush", "poison:2"] */
  keywords: string[];
  floop?: FloopDef;
}

export interface SpellDef extends CardDefBase {
  type: 'spell';
  effects: Effect[];
}

export interface BuildingDef extends CardDefBase {
  type: 'building';
}

export type CardDef = CreatureDef | SpellDef | BuildingDef;

export interface CardDb {
  readonly byId: ReadonlyMap<string, CardDef>;
  readonly all: readonly CardDef[];
}

// ---------------------------------------------------------------------------
// Heroes
// ---------------------------------------------------------------------------

export interface HeroDef {
  id: string;
  name: string;
  title: string;
  landscape: CardLandscape;
  flavorText: string;
  artKey: string;
  passive: { name: string; text: string; abilities?: TriggeredAbility[]; statics?: StaticAbility[] };
  /**
   * The Hero Ability. With `cooldown` it charges over that many of the
   * owner's turns (ready on turn N, then every N turns) instead of from damage.
   */
  ultimate: { name: string; text: string; effects: Effect[]; cooldown?: number };
  /** Illustration under public/. */
  image?: string;
  /** Campaign bosses: playable only by the AI, never offered in the deck builder. */
  boss?: boolean;
}

export interface HeroDb {
  readonly byId: ReadonlyMap<string, HeroDef>;
  readonly all: readonly HeroDef[];
}

// ---------------------------------------------------------------------------
// Match rules (campaign modifiers, boss rules, tutorial helpers)
// ---------------------------------------------------------------------------

/**
 * A rule attached to one player for a whole match. It works like an extra hero
 * passive (its abilities trigger from the hero, its statics apply from the
 * hero) plus a few setup tweaks applied when the game is created.
 */
export interface MatchRule {
  id: string;
  name: string;
  text: string;
  abilities?: TriggeredAbility[];
  statics?: StaticAbility[];
  /** Added to the hero's max and starting HP. */
  heroHpDelta?: number;
  /** Ultimate charge (percent) at the start of the match. */
  startingCharge?: number;
  /** Extra cards in the opening hand. */
  extraCards?: number;
}

// ---------------------------------------------------------------------------
// Decks
// ---------------------------------------------------------------------------

export interface DeckList {
  id?: string;
  name?: string;
  heroId: string;
  /** The four landscapes the player brings (duplicates allowed). */
  landscapes: LandscapeType[];
  /** Card ids, exactly `deckSize` entries. */
  cards: string[];
  /** Optional card levels (cardId → 1..5); missing = level 1. */
  levels?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------

/** A physical copy of a card in a zone (deck, hand, discard). */
export interface CardInstance {
  iid: string;
  cardId: string;
  owner: PlayerId;
}

export interface CreatureInPlay extends CardInstance {
  /** Damage marked on the creature; it dies when damage >= current DEF. */
  damage: number;
  /** Permanent stat modifiers from effects. */
  atkMod: number;
  defMod: number;
  /** Modifiers that expire at the end of the current turn. */
  tempAtk: number;
  tempDef: number;
  /** Exhausted creatures (e.g. after a Floop) do not attack. */
  exhausted: boolean;
  /** Played this turn and cannot attack yet (unless Rush). */
  summoningSick: boolean;
  movesThisTurn: number;
  shield: boolean;
  frozen: boolean;
  /** Poison counter: damage taken at the start of the owner's turn. */
  poison: number;
  stealth: boolean;
  /** Keywords given permanently by effects, e.g. "rush". */
  grantedKeywords: string[];
  token: boolean;
  /** Modifiers that last until its owner's next turn starts. */
  roundAtk?: number;
  roundDef?: number;
  /** Times this creature has flooped. */
  floopCount?: number;
  /** Last turn number on which it cannot floop / attack (0 = none). */
  floopLock?: number;
  attackLock?: number;
  /** Damage to it is dealt to its Hero instead, up to and including this turn number. */
  redirectUntil?: number;
}

export type BuildingInPlay = CardInstance;

export interface Lane {
  /** null until the owner arranges landscapes. */
  landscape: LandscapeType | null;
  /** Flipped landscapes count as no type and cannot receive new cards. */
  flipped: boolean;
  /** Owner end-of-turns remaining until the flip wears off (null = not flipped). */
  flipTimer: number | null;
  creature: CreatureInPlay | null;
  building: BuildingInPlay | null;
  /** Nothing can be played here up to and including this turn number. */
  sealedUntil?: number;
}

/** A cost change that applies on one turn of a player. */
export interface CostModifier {
  kind: CostKind;
  amount: number;
  landscape?: CardLandscape;
  turn: number;
}

/** A kind of card a player cannot play on one of their turns. */
export interface PlayBlock {
  what: PlayKind;
  turn: number;
}

export interface PlayerState {
  id: PlayerId;
  heroId: string;
  hp: number;
  maxHp: number;
  mp: number;
  /** MP removed from the next refresh (enemy "lose MP" effects). */
  mpPenalty: number;
  turnsTaken: number;
  extraDrawsThisTurn: number;
  ultimateCharge: number;
  ultimatesUsed: number;
  /** The four landscapes brought in the deck list (unordered). */
  landscapePool: LandscapeType[];
  /** Card levels above 1 for this player's cards (cardId → level). */
  cardLevels: Record<string, number>;
  /** Match rules on this player (shared, never mutated). */
  rules: MatchRule[];
  arranged: boolean;
  mulligansUsed: number;
  mulliganDone: boolean;
  deck: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  lanes: Lane[];
  /** Creatures flooped this turn. */
  floopsThisTurn?: number;
  costMods?: CostModifier[];
  blocks?: PlayBlock[];
}

export type GamePhase = 'arrange' | 'mulligan' | 'main' | 'ended';
export type EndReason = 'heroDefeated' | 'surrender' | 'turnLimit';
export type Winner = PlayerId | 'draw';

export interface GameState {
  version: 2;
  seed: number;
  rng: RngState;
  phase: GamePhase;
  /** Total number of turns started (both players), 0 before the first turn. */
  turn: number;
  firstPlayer: PlayerId;
  activePlayer: PlayerId;
  players: [PlayerState, PlayerState];
  nextInstanceId: number;
  winner: Winner | null;
  endReason: EndReason | null;
}

/** Everything the engine needs besides the state itself. */
export interface RulesContext {
  cards: CardDb;
  heroes: HeroDb;
  balance: MatchBalance;
}

/** Reference to something an effect can target. */
export type TargetRef =
  | { kind: 'creature'; player: PlayerId; lane: number }
  | { kind: 'hero'; player: PlayerId }
  | { kind: 'landscape'; player: PlayerId; lane: number }
  | { kind: 'building'; player: PlayerId; lane: number };

export function other(player: PlayerId): PlayerId {
  return player === 0 ? 1 : 0;
}
