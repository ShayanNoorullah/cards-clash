/**
 * Maps legal engine actions onto UI gestures. Everything here is derived from
 * getLegalActions, so the UI can never offer a move the engine would reject.
 * Pure (no Phaser).
 */
import type {
  Action,
  FloopAction,
  MoveCreatureAction,
  PlayCardAction,
  UseUltimateAction,
} from '../engine/actions';
import type { PlayerId, TargetRef } from '../engine/types';

export interface HandCardOptions {
  iid: string;
  actions: PlayCardAction[];
  /** Lanes the card can be dropped on (creatures/buildings). */
  lanes: number[];
  /** Spells are dropped anywhere on the board. */
  isSpell: boolean;
  /** Distinct chosen targets across the card's actions. */
  targets: TargetRef[];
}

export function targetKey(t: TargetRef): string {
  return t.kind === 'hero' ? `hero:${t.player}` : `${t.kind}:${t.player}:${t.lane}`;
}

function uniqueTargets(actions: readonly { target?: TargetRef }[]): TargetRef[] {
  const seen = new Map<string, TargetRef>();
  for (const a of actions) if (a.target) seen.set(targetKey(a.target), a.target);
  return [...seen.values()];
}

/** Playable cards in hand and where/how each can be played. */
export function handOptions(
  legal: readonly Action[],
  isSpell: (iid: string) => boolean,
): Map<string, HandCardOptions> {
  const out = new Map<string, HandCardOptions>();
  for (const a of legal) {
    if (a.type !== 'playCard') continue;
    let o = out.get(a.iid);
    if (!o) {
      o = { iid: a.iid, actions: [], lanes: [], isSpell: isSpell(a.iid), targets: [] };
      out.set(a.iid, o);
    }
    o.actions.push(a);
    if (a.lane !== undefined && !o.lanes.includes(a.lane)) o.lanes.push(a.lane);
  }
  for (const o of out.values()) {
    o.lanes.sort((x, y) => x - y);
    o.targets = uniqueTargets(o.actions);
  }
  return out;
}

export type Drop = { kind: 'lane'; lane: number } | { kind: 'board' } | { kind: 'target'; target: TargetRef };

/**
 * Actions still possible after dropping a hand card somewhere. One result =
 * submit it; several = ask the player to pick a target; none = invalid drop.
 */
export function actionsForDrop(options: HandCardOptions, drop: Drop): PlayCardAction[] {
  switch (drop.kind) {
    case 'lane':
      return options.isSpell ? [] : options.actions.filter((a) => a.lane === drop.lane);
    case 'board':
      return options.isSpell ? options.actions : [];
    case 'target': {
      const key = targetKey(drop.target);
      return options.actions.filter((a) => a.target && targetKey(a.target) === key);
    }
  }
}

/** Narrows candidate actions to those with the picked target. */
export function pickTarget<T extends { target?: TargetRef }>(
  candidates: readonly T[],
  target: TargetRef,
): T | null {
  const key = targetKey(target);
  return candidates.find((a) => a.target && targetKey(a.target) === key) ?? null;
}

export interface CreatureOptions {
  floops: FloopAction[];
  moves: MoveCreatureAction[];
}

/** Floop and move options for the creature in `lane`. */
export function creatureOptions(legal: readonly Action[], lane: number): CreatureOptions {
  return {
    floops: legal.filter((a): a is FloopAction => a.type === 'floop' && a.lane === lane),
    moves: legal.filter((a): a is MoveCreatureAction => a.type === 'moveCreature' && a.from === lane),
  };
}

export function ultimateOptions(legal: readonly Action[]): UseUltimateAction[] {
  return legal.filter((a): a is UseUltimateAction => a.type === 'useUltimate');
}

export function canBuyDraw(legal: readonly Action[]): boolean {
  return legal.some((a) => a.type === 'buyDraw');
}

export function canEndTurn(legal: readonly Action[], player: PlayerId): boolean {
  return legal.some((a) => a.type === 'endTurn' && a.player === player);
}

/** Candidate targets for a set of actions (used for highlighting). */
export function targetsOf(actions: readonly { target?: TargetRef }[]): TargetRef[] {
  return uniqueTargets(actions);
}
