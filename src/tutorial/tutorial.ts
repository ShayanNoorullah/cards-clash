/**
 * Scripted tutorial lessons (src/data/tutorial.json) and the runner that
 * drives them. Pure: no Phaser. The match scene asks the runner which actions
 * are allowed (forced moves), what to highlight, and what the scripted enemy
 * does; a headless test plays every lesson end to end.
 */
import raw from '../data/tutorial.json';
import type { Action } from '../engine/actions';
import { rulesById, type Campaign } from '../campaign/config';
import type { Reward } from '../progression/config';
import {
  other,
  type DeckList,
  type GameState,
  type LandscapeType,
  type MatchRule,
  type PlayerId,
  type TargetRef,
} from '../engine/types';

export type Side = 'me' | 'enemy';

export type Highlight =
  | { kind: 'hand'; card: string }
  | { kind: 'lane'; side: Side; lane: number }
  | { kind: 'creature'; side: Side; lane: number }
  | { kind: 'hero'; side: Side }
  | { kind: 'deck' }
  | { kind: 'endTurn' };

export type Expect =
  | { type: 'playCard'; card: string; lane?: number; target?: { kind: 'creature'; side: Side; lane: number } }
  | { type: 'floop'; lane: number }
  | { type: 'moveCreature'; from: number; to: number }
  | { type: 'buyDraw' }
  | { type: 'useUltimate' }
  | { type: 'endTurn' };

export interface TutorialStep {
  text: string;
  highlight?: Highlight[];
  /** The only action allowed during this step. Steps without one wait for "Next". */
  expect?: Expect;
}

export interface ScriptedPlay {
  type: 'playCard';
  card: string;
  lane?: number;
  target?: { kind: 'creature'; side: Side; lane: number };
}

export interface LessonSide {
  name: string;
  heroId: string;
  landscapes: LandscapeType[];
  /** Deck in draw order: the first cards form the opening hand. */
  cards: string[];
}

export interface Lesson {
  id: string;
  name: string;
  summary: string;
  reward: Reward;
  player: LessonSide;
  enemy: LessonSide;
  enemyRules: string[];
  playerRules: string[];
  /** Enemy plays per enemy turn (the enemy ends its turn after them). Later turns use the Easy AI. */
  enemyScript: ScriptedPlay[][];
  steps: TutorialStep[];
}

export const LESSONS: readonly Lesson[] = (raw as unknown as { lessons: Lesson[] }).lessons;

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

/** Seats: the player is always seat 0 and goes first. */
export const TUTORIAL_PLAYER: PlayerId = 0;
export const TUTORIAL_ENEMY: PlayerId = 1;

export function lessonDecks(lesson: Lesson): [DeckList, DeckList] {
  const deck = (s: LessonSide): DeckList => ({
    heroId: s.heroId,
    landscapes: [...s.landscapes],
    cards: [...s.cards],
  });
  return [deck(lesson.player), deck(lesson.enemy)];
}

export function lessonRules(lesson: Lesson, campaign: Campaign): [MatchRule[], MatchRule[]] {
  return [rulesById(campaign, lesson.playerRules), rulesById(campaign, lesson.enemyRules)];
}

/** Checks lesson data against the shipped content. Returns every problem found. */
export function validateLessons(
  lessons: readonly Lesson[],
  has: { card: (id: string) => boolean; hero: (id: string) => boolean; rule: (id: string) => boolean },
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const l of lessons) {
    if (ids.has(l.id)) errors.push(`${l.id}: duplicate lesson id`);
    ids.add(l.id);
    for (const side of [l.player, l.enemy]) {
      if (!has.hero(side.heroId)) errors.push(`${l.id}: unknown hero ${side.heroId}`);
      if (side.landscapes.length !== 4) errors.push(`${l.id}: needs 4 landscapes`);
      for (const c of side.cards) if (!has.card(c)) errors.push(`${l.id}: unknown card ${c}`);
    }
    for (const r of [...l.enemyRules, ...l.playerRules])
      if (!has.rule(r)) errors.push(`${l.id}: unknown rule ${r}`);
    if (l.steps.length === 0) errors.push(`${l.id}: has no steps`);
    for (const s of l.steps) {
      if (s.expect?.type === 'playCard' && !has.card(s.expect.card))
        errors.push(`${l.id}: step expects unknown card ${s.expect.card}`);
      for (const h of s.highlight ?? [])
        if (h.kind === 'hand' && !has.card(h.card))
          errors.push(`${l.id}: highlight of unknown card ${h.card}`);
    }
  }
  return errors;
}

function sidePlayer(side: Side, me: PlayerId): PlayerId {
  return side === 'me' ? me : other(me);
}

function sameTarget(t: TargetRef | undefined, want: { side: Side; lane: number }, me: PlayerId): boolean {
  return t?.kind === 'creature' && t.player === sidePlayer(want.side, me) && t.lane === want.lane;
}

/** True when `action` (by `me`) is what the step expects. */
export function matchesExpect(state: GameState, action: Action, expect: Expect, me: PlayerId): boolean {
  if (action.type !== expect.type || action.player !== me) return false;
  switch (expect.type) {
    case 'playCard': {
      if (action.type !== 'playCard') return false;
      const inst = state.players[me].hand.find((c) => c.iid === action.iid);
      if (inst?.cardId !== expect.card) return false;
      if (expect.lane !== undefined && action.lane !== expect.lane) return false;
      if (expect.target && !sameTarget(action.target, expect.target, me)) return false;
      return true;
    }
    case 'floop':
      return action.type === 'floop' && action.lane === expect.lane;
    case 'moveCreature':
      return action.type === 'moveCreature' && action.from === expect.from && action.to === expect.to;
    default:
      return true;
  }
}

/**
 * Tracks progress through a lesson's steps. Info steps (no `expect`) block all
 * actions until `next()`; action steps allow only the expected action; after
 * the last step the match is free play.
 */
export class TutorialRunner {
  private index = 0;
  private enemyTurn = 0;
  private enemyPlays = 0;

  constructor(
    readonly lesson: Lesson,
    readonly me: PlayerId = TUTORIAL_PLAYER,
  ) {}

  get stepIndex(): number {
    return this.index;
  }

  get step(): TutorialStep | null {
    return this.lesson.steps[this.index] ?? null;
  }

  get finished(): boolean {
    return this.index >= this.lesson.steps.length;
  }

  /** Advances past an info step (the "Next" button). The last info step starts free play. */
  next(): void {
    if (this.step && !this.step.expect) this.index++;
  }

  /** Legal actions narrowed to what the current step allows. */
  filter(state: GameState, legal: readonly Action[]): Action[] {
    const step = this.step;
    if (!step) return [...legal];
    if (!step.expect) return [];
    const expect = step.expect;
    return legal.filter((a) => matchesExpect(state, a, expect, this.me));
  }

  /** Call with the state *before* the action was applied. Advances when it matches the step. */
  onAction(stateBefore: GameState, action: Action): void {
    const expect = this.step?.expect;
    if (expect && matchesExpect(stateBefore, action, expect, this.me)) this.index++;
  }

  /**
   * The scripted enemy action for the current enemy turn, or null when the
   * script has run out (the scene then asks the AI). Ends the turn after the
   * listed plays.
   */
  enemyAction(state: GameState): Action | null {
    const enemy = other(this.me);
    const turn = state.players[enemy].turnsTaken;
    const plays = this.lesson.enemyScript[turn - 1];
    if (!plays || state.phase !== 'main' || state.activePlayer !== enemy) return null;
    if (this.enemyTurn !== turn) {
      this.enemyTurn = turn;
      this.enemyPlays = 0;
    }
    const play = plays[this.enemyPlays++];
    if (!play) return { type: 'endTurn', player: enemy };
    const inst = state.players[enemy].hand.find((c) => c.cardId === play.card);
    if (!inst) return { type: 'endTurn', player: enemy };
    const action: Action = { type: 'playCard', player: enemy, iid: inst.iid };
    if (play.lane !== undefined) action.lane = play.lane;
    if (play.target)
      action.target = {
        kind: 'creature',
        player: sidePlayer(play.target.side, enemy),
        lane: play.target.lane,
      };
    return action;
  }
}
