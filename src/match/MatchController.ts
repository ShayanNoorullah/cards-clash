/**
 * Owns one match: the authoritative GameState, the action pipeline and the
 * battle log. No Phaser: scenes call it, tests drive it headless, and M5 plugs
 * AI players into the `seats`.
 */
import type { Action } from '../engine/actions';
import { applyAction } from '../engine/apply';
import type { ActionError } from '../engine/errors';
import type { GameEvent } from '../engine/events';
import { getLegalActions, playersToAct } from '../engine/legal';
import { createGame, type CreateGameOptions } from '../engine/state';
import type { DeckList, GameState, LandscapeType, PlayerId, RulesContext } from '../engine/types';
import type { BossHooks, Difficulty } from '../ai/profiles';
import { accumulateMatchStats, emptyMatchStats, type MatchStats } from '../progression/matchRewards';
import { describeEvent } from './battleLog';

export interface Seat {
  name: string;
  /** Human seats get UI prompts; non-human seats are driven by an AI (M5). */
  human: boolean;
  deck: DeckList;
  /** Set for AI seats. */
  ai?: { difficulty: Difficulty; hooks?: BossHooks };
  /** A human playing on another device (online); their actions arrive from the server. */
  remote?: boolean;
}

/** Result of submitting an action (local engine or game server). */
export type DriverResult =
  { ok: true; events: GameEvent[] } | { ok: false; error: { code: string; message: string } };

/**
 * What the match screen needs from whatever runs the match: the local
 * MatchController (AI and hot-seat), or OnlineMatch (server-authoritative).
 */
export interface MatchDriver {
  readonly ctx: RulesContext;
  readonly seats: [Seat, Seat];
  readonly seed: number | string;
  readonly state: GameState;
  readonly log: readonly string[];
  readonly isOver: boolean;
  readonly hotSeat: boolean;
  readonly openingEvents: GameEvent[];
  readonly matchStats: [MatchStats, MatchStats];
  decisionPlayer(): PlayerId | null;
  legalActions(player: PlayerId): Action[];
  submit(action: Action): DriverResult | Promise<DriverResult>;
  replaceState(next: GameState): void;
}

/** Extra game-creation options (campaign rules, scripted tutorial boards). */
export type MatchSetup = Pick<
  CreateGameOptions,
  'rules' | 'stackedDecks' | 'firstPlayer' | 'skipDeckValidation' | 'startingHp'
> & {
  /** Arranges both players' landscapes in this order and keeps both opening hands. */
  autoSetup?: [LandscapeType[], LandscapeType[]];
};

export interface MatchOptions {
  seed: number | string;
  seats: [Seat, Seat];
  ctx: RulesContext;
  setup?: MatchSetup;
}

export type SubmitResult = { ok: true; events: GameEvent[] } | { ok: false; error: ActionError };

const MAX_LOG = 300;

export class MatchController implements MatchDriver {
  readonly ctx: RulesContext;
  readonly seats: [Seat, Seat];
  readonly seed: number | string;
  readonly setup: MatchSetup;
  private current: GameState;
  private readonly logLines: string[] = [];
  /** Events produced by game creation, for the first animation pass. */
  readonly openingEvents: GameEvent[];
  readonly history: Action[] = [];
  /** Per-player counters for quests and achievements. */
  readonly matchStats: [MatchStats, MatchStats] = [emptyMatchStats(), emptyMatchStats()];

  constructor(options: MatchOptions) {
    this.ctx = options.ctx;
    this.seats = options.seats;
    this.seed = options.seed;
    this.setup = options.setup ?? {};
    const { autoSetup, ...createOptions } = this.setup;
    const created = createGame(
      { ...createOptions, seed: options.seed, decks: [options.seats[0].deck, options.seats[1].deck] },
      options.ctx,
    );
    this.current = created.state;
    const opening = [...created.events];
    this.appendLog(created.events);
    this.track(created.events);
    if (autoSetup) {
      for (const player of [0, 1] as const) {
        const r = this.submit({ type: 'arrangeLandscapes', player, order: autoSetup[player] });
        if (!r.ok) throw new Error(`autoSetup arrange failed: ${r.error.message}`);
        opening.push(...r.events);
      }
      for (const player of [0, 1] as const) {
        const r = this.submit({ type: 'mulligan', player, iids: [] });
        if (!r.ok) throw new Error(`autoSetup mulligan failed: ${r.error.message}`);
        opening.push(...r.events);
      }
    }
    this.openingEvents = opening;
  }

  get state(): GameState {
    return this.current;
  }

  get log(): readonly string[] {
    return this.logLines;
  }

  get isOver(): boolean {
    return this.current.phase === 'ended';
  }

  /** The player whose decision the match is waiting for (null when over). */
  decisionPlayer(): PlayerId | null {
    return playersToAct(this.current)[0] ?? null;
  }

  /** True when both seats are human, so the device is passed between players. */
  get hotSeat(): boolean {
    return this.seats[0].human && this.seats[1].human && !this.seats[0].remote && !this.seats[1].remote;
  }

  legalActions(player: PlayerId): Action[] {
    return getLegalActions(this.current, player, this.ctx);
  }

  submit(action: Action): SubmitResult {
    const result = applyAction(this.current, action, this.ctx);
    if (!result.ok) return result;
    this.current = result.state;
    this.history.push(action);
    this.appendLog(result.events);
    this.track(result.events);
    return { ok: true, events: result.events };
  }

  /**
   * Sandbox only: swaps in an edited state (see src/modes/sandbox.ts). Normal
   * matches only change state through `submit`.
   */
  replaceState(next: GameState): void {
    this.current = next;
    this.logLines.push('Sandbox: the board was edited.');
  }

  /** A fresh controller with the same seats and a new seed. */
  rematch(): MatchController {
    return new MatchController({
      seed: `${String(this.seed)}:rematch`,
      seats: this.seats,
      ctx: this.ctx,
      setup: this.setup,
    });
  }

  private track(events: readonly GameEvent[]): void {
    accumulateMatchStats(this.matchStats[0], events, 0, this.ctx);
    accumulateMatchStats(this.matchStats[1], events, 1, this.ctx);
  }

  private appendLog(events: readonly GameEvent[]): void {
    const names = { players: [this.seats[0].name, this.seats[1].name] as [string, string] };
    for (const e of events) {
      const line = describeEvent(e, this.current, this.ctx, names);
      if (line) this.logLines.push(line);
    }
    if (this.logLines.length > MAX_LOG) this.logLines.splice(0, this.logLines.length - MAX_LOG);
  }
}
