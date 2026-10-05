import type { LandscapeType, PlayerId, TargetRef } from './types';

/**
 * Every player decision is one of these serializable objects. The engine
 * validates it, then produces a new GameState plus GameEvents.
 */
export type Action =
  | ArrangeLandscapesAction
  | MulliganAction
  | PlayCardAction
  | FloopAction
  | MoveCreatureAction
  | BuyDrawAction
  | UseUltimateAction
  | EndTurnAction
  | SurrenderAction;

/** Setup: place the four landscapes from the deck list into lanes 0..3. */
export interface ArrangeLandscapesAction {
  type: 'arrangeLandscapes';
  player: PlayerId;
  order: LandscapeType[];
}

/** Setup: shuffle the listed hand cards back and redraw that many. Empty = keep. */
export interface MulliganAction {
  type: 'mulligan';
  player: PlayerId;
  iids: string[];
}

/**
 * Play a card from hand. Creatures and buildings need `lane` (an occupied lane
 * is replaced; the old card is discarded). Cards with a "chosen" effect need `target`.
 */
export interface PlayCardAction {
  type: 'playCard';
  player: PlayerId;
  iid: string;
  lane?: number;
  target?: TargetRef;
}

/** Pay the floop cost and exhaust the creature in `lane` to use its ability. */
export interface FloopAction {
  type: 'floop';
  player: PlayerId;
  lane: number;
  target?: TargetRef;
}

/** Move a creature to an empty allied lane (1 MP, free with Swift). */
export interface MoveCreatureAction {
  type: 'moveCreature';
  player: PlayerId;
  from: number;
  to: number;
}

/** Pay MP to draw one extra card (limited per turn). */
export interface BuyDrawAction {
  type: 'buyDraw';
  player: PlayerId;
}

/**
 * Ends the main phase: combat, end phase, then the opponent's turn starts.
 * `discard` optionally chooses which cards to drop when above the hand limit.
 */
export interface EndTurnAction {
  type: 'endTurn';
  player: PlayerId;
  discard?: string[];
}

/** Spend a full Ultimate charge to use the Hero's Ultimate (no MP cost). */
export interface UseUltimateAction {
  type: 'useUltimate';
  player: PlayerId;
  target?: TargetRef;
}

export interface SurrenderAction {
  type: 'surrender';
  player: PlayerId;
}

export type ActionType = Action['type'];
