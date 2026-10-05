import type { StrikeRoll } from './actions';
import type { EndReason, LandscapeType, PlayerId, TargetRef, TriggerType, Winner } from './types';

/**
 * Everything that happened while resolving an action, in order. The UI only
 * animates these; it never changes game state itself. Events carry enough data
 * to animate without looking at the state.
 */
export type GameEvent =
  | { type: 'gameCreated'; firstPlayer: PlayerId }
  | { type: 'landscapesArranged'; player: PlayerId; order: LandscapeType[] }
  | { type: 'mulligan'; player: PlayerId; returned: number }
  | { type: 'turnStarted'; player: PlayerId; turn: number; mp: number }
  | { type: 'phase'; player: PlayerId; phase: 'start' | 'draw' | 'main' | 'combat' | 'end' }
  | { type: 'cardDrawn'; player: PlayerId; iid: string; cardId: string }
  | { type: 'fatigue'; player: PlayerId; damage: number }
  | { type: 'mpChanged'; player: PlayerId; mp: number; delta: number }
  | { type: 'mpPenalty'; player: PlayerId; amount: number }
  | {
      type: 'cardPlayed';
      player: PlayerId;
      iid: string;
      cardId: string;
      lane: number | null;
      target: TargetRef | null;
    }
  | { type: 'creatureSummoned'; player: PlayerId; iid: string; cardId: string; lane: number; token: boolean }
  | { type: 'buildingPlaced'; player: PlayerId; iid: string; cardId: string; lane: number }
  | { type: 'cardReplaced'; player: PlayerId; iid: string; cardId: string; lane: number }
  | { type: 'creatureMoved'; player: PlayerId; iid: string; from: number; to: number; cost: number }
  | { type: 'floop'; player: PlayerId; iid: string; lane: number }
  | { type: 'ultimateUsed'; player: PlayerId; heroId: string }
  | { type: 'triggered'; player: PlayerId; trigger: TriggerType; cardId: string | null; iid: string | null }
  | { type: 'attack'; player: PlayerId; lane: number; iid: string; target: TargetRef; roll?: StrikeRoll }
  | { type: 'damage'; target: TargetRef; amount: number; sourcePlayer: PlayerId }
  | { type: 'heal'; target: TargetRef; amount: number }
  | { type: 'statsChanged'; player: PlayerId; lane: number; iid: string; atk: number; def: number }
  | { type: 'shieldBroken'; player: PlayerId; lane: number; iid: string }
  | { type: 'shieldGained'; player: PlayerId; lane: number; iid: string }
  | { type: 'frozen'; player: PlayerId; lane: number; iid: string }
  | { type: 'thawed'; player: PlayerId; lane: number; iid: string }
  | { type: 'poisoned'; player: PlayerId; lane: number; iid: string; poison: number }
  | { type: 'keywordGranted'; player: PlayerId; lane: number; iid: string; keyword: string }
  | { type: 'creatureDestroyed'; player: PlayerId; iid: string; cardId: string; lane: number }
  | { type: 'returnedToHand'; player: PlayerId; iid: string; cardId: string; lane: number }
  | { type: 'tokenVanished'; player: PlayerId; iid: string; lane: number }
  | { type: 'cardDiscarded'; player: PlayerId; iid: string; cardId: string; from: 'hand' | 'board' }
  | { type: 'landscapeFlipped'; player: PlayerId; lane: number }
  | { type: 'landscapeRestored'; player: PlayerId; lane: number }
  | { type: 'landscapeConverted'; player: PlayerId; lane: number; from: LandscapeType; to: LandscapeType }
  | { type: 'ultimateCharge'; player: PlayerId; charge: number }
  | { type: 'buildingDestroyed'; player: PlayerId; iid: string; cardId: string; lane: number }
  | { type: 'buildingReturned'; player: PlayerId; iid: string; cardId: string; lane: number }
  | { type: 'buildingMoved'; player: PlayerId; iid: string; from: number; to: number }
  /** A card went from a discard pile or deck into a hand (`stolen`: from the other player). */
  | {
      type: 'cardRecovered';
      player: PlayerId;
      iid: string;
      cardId: string;
      from: 'discard' | 'deck';
      stolen?: boolean;
    }
  | { type: 'handCycled'; player: PlayerId; count: number }
  | {
      type: 'status';
      player: PlayerId;
      lane: number;
      iid: string;
      status: 'floopLocked' | 'attackLocked' | 'redirect' | 'reset' | 'swapped';
    }
  | { type: 'laneSealed'; player: PlayerId; lane: number }
  | { type: 'playBlocked'; player: PlayerId; what: 'creature' | 'spell' | 'building' }
  | { type: 'costChanged'; player: PlayerId; kind: string; amount: number }
  | { type: 'effectLimitReached'; limit: number }
  | { type: 'turnEnded'; player: PlayerId }
  | { type: 'gameEnded'; winner: Winner; reason: EndReason };

export type GameEventType = GameEvent['type'];
