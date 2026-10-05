/** Machine-readable reasons an action was rejected, plus a human message. */
export type ActionErrorCode =
  | 'GAME_OVER'
  | 'WRONG_PHASE'
  | 'NOT_YOUR_TURN'
  | 'INVALID_PLAYER'
  | 'ALREADY_DONE'
  | 'INVALID_ARRANGEMENT'
  | 'INVALID_MULLIGAN'
  | 'CARD_NOT_IN_HAND'
  | 'UNKNOWN_CARD'
  | 'NOT_ENOUGH_MP'
  | 'REQUIREMENT_NOT_MET'
  | 'INVALID_LANE'
  | 'LANE_FLIPPED'
  | 'LANE_OCCUPIED'
  | 'LANE_NOT_ALLOWED'
  | 'NO_CREATURE'
  | 'NO_FLOOP'
  | 'EXHAUSTED'
  | 'TARGET_REQUIRED'
  | 'TARGET_NOT_ALLOWED'
  | 'INVALID_TARGET'
  | 'NO_VALID_TARGET'
  | 'MOVE_LIMIT'
  | 'DRAW_LIMIT'
  | 'DECK_EMPTY'
  | 'ULTIMATE_NOT_READY'
  | 'FROZEN'
  | 'CONDITION_NOT_MET'
  | 'INVALID_DISCARD'
  | 'BLOCKED'
  | 'LANE_SEALED'
  | 'RARITY_CAP'
  | 'FLOOP_LOCKED'
  | 'UNKNOWN_ACTION';

export interface ActionError {
  code: ActionErrorCode;
  message: string;
}

export function actionError(code: ActionErrorCode, message: string): ActionError {
  return { code, message };
}
