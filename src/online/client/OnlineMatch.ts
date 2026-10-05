/**
 * An online match as seen by one player. The state is the redacted view from
 * the server; actions go to the server, which validates them with the real
 * engine and pushes the result to both players (Realtime). A heartbeat keeps
 * the connection alive and lets the server enforce turn timers and forfeits.
 */
import type { Action } from '../../engine/actions';
import { getContent } from '../../engine/content';
import type { GameEvent } from '../../engine/events';
import { getLegalActions, playersToAct } from '../../engine/legal';
import type { GameState, PlayerId, RulesContext } from '../../engine/types';
import { describeEvent } from '../../match/battleLog';
import type { DriverResult, MatchDriver, Seat } from '../../match/MatchController';
import { accumulateMatchStats, emptyMatchStats, type MatchStats } from '../../progression/matchRewards';
import onlineConfig from '../../data/online.json';
import type { MatchView } from '../protocol';
import { account, call, onMatchViews, OnlineError } from './net';

export class OnlineMatch implements MatchDriver {
  readonly ctx: RulesContext = getContent().ctx;
  readonly seats: [Seat, Seat];
  readonly openingEvents: GameEvent[];
  readonly matchStats: [MatchStats, MatchStats] = [emptyMatchStats(), emptyMatchStats()];
  readonly hotSeat = false;
  private view: MatchView;
  private readonly lines: string[] = [];
  private clockOffset = 0;
  private stop: (() => void)[] = [];
  /** Called with the events of every update that came from the server (opponent moves, timeouts). */
  onRemote: ((events: GameEvent[]) => void) | null = null;

  private constructor(view: MatchView) {
    this.view = view;
    this.clockOffset = view.serverNow - Date.now();
    const you = view.you;
    const deckOf = (p: PlayerId) => {
      const ps = view.state!.players[p];
      return { heroId: ps.heroId, landscapes: [...ps.landscapePool], cards: [] };
    };
    const seat = (p: PlayerId): Seat => ({
      name: view.names[p],
      human: true,
      remote: p !== you,
      deck: deckOf(p),
    });
    this.seats = [seat(0), seat(1)];
    this.openingEvents = view.events;
    this.track(view.events);
  }

  /** Loads the current view of a match and starts listening for updates. */
  static async open(matchId: string): Promise<OnlineMatch> {
    const { view } = await call<{ view: MatchView }>({ op: 'view', matchId });
    if (!view.state) throw new OnlineError('NOT_ACTIVE', 'This match has not started yet.');
    const m = new OnlineMatch(view);
    await m.connect();
    return m;
  }

  private async connect(): Promise<void> {
    const a = await account();
    if (a.kind === 'guest' || a.kind === 'email')
      this.stop.push(
        onMatchViews(a.userId, (v) => {
          if (v.matchId === this.view.matchId) this.accept(v, true);
        }),
      );
    const beat = setInterval(() => void this.heartbeat(), onlineConfig.client.heartbeatSeconds * 1000);
    this.stop.push(() => clearInterval(beat));
  }

  private async heartbeat(): Promise<void> {
    if (this.isOver) return;
    try {
      const { view } = await call<{ view: MatchView }>({ op: 'tick', matchId: this.view.matchId });
      this.accept(view, true);
    } catch {
      // offline for a moment: the next beat retries (the server allows 60 s)
    }
  }

  /** Takes a newer view; remote ones are announced so the scene can animate them. */
  private accept(v: MatchView, remote: boolean): boolean {
    if (v.seq < this.view.seq || (v.seq === this.view.seq && v.status === this.view.status)) return false;
    const events = v.seq > this.view.seq ? v.events : [];
    this.view = v;
    this.clockOffset = v.serverNow - Date.now();
    this.track(events);
    if (remote) this.onRemote?.(events);
    return true;
  }

  private track(events: GameEvent[]): void {
    accumulateMatchStats(this.matchStats[0], events, 0, this.ctx);
    accumulateMatchStats(this.matchStats[1], events, 1, this.ctx);
    const names = { players: this.view.names };
    for (const e of events) {
      const line = describeEvent(e, this.view.state!, this.ctx, names);
      if (line) this.lines.push(line);
    }
    if (this.lines.length > 300) this.lines.splice(0, this.lines.length - 300);
  }

  get matchId(): string {
    return this.view.matchId;
  }
  get you(): PlayerId {
    return this.view.you;
  }
  get mode(): MatchView['mode'] {
    return this.view.mode;
  }
  get rating(): MatchView['rating'] {
    return this.view.rating;
  }
  get seed(): string {
    return this.view.matchId;
  }
  get state(): GameState {
    return this.view.state!;
  }
  get log(): readonly string[] {
    return this.lines;
  }
  get isOver(): boolean {
    return this.view.status === 'ended' || this.view.state?.phase === 'ended';
  }
  /** Seconds left on the current turn/setup timer (server clock). */
  secondsLeft(): number | null {
    if (this.view.deadline === null || this.isOver) return null;
    return Math.max(0, Math.ceil((this.view.deadline - (Date.now() + this.clockOffset)) / 1000));
  }

  decisionPlayer(): PlayerId | null {
    return playersToAct(this.view.state!)[0] ?? null;
  }

  legalActions(player: PlayerId): Action[] {
    return player === this.view.you ? getLegalActions(this.view.state!, player, this.ctx) : [];
  }

  async submit(action: Action): Promise<DriverResult> {
    try {
      const { view } = await call<{ view: MatchView }>({
        op: 'act',
        matchId: this.view.matchId,
        seq: this.view.seq,
        action,
      });
      const before = this.view.seq;
      this.accept(view, false);
      return { ok: true, events: view.seq > before ? view.events : [] };
    } catch (err) {
      const e = err instanceof OnlineError ? err : new OnlineError('NETWORK', 'Connection problem.');
      // Out of date: adopt the server's view and let the scene redraw.
      const fresh = e.extra.view as MatchView | undefined;
      if (fresh) this.accept(fresh, true);
      return { ok: false, error: { code: e.code, message: e.message } };
    }
  }

  replaceState(): void {
    // Online states only ever come from the server.
  }

  dispose(): void {
    for (const s of this.stop) s();
    this.stop = [];
    this.onRemote = null;
  }
}
