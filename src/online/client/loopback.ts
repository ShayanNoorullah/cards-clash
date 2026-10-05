/**
 * DEV ONLY (`?loopback` in the URL): runs the real game server in the browser
 * on an in-memory store, so the whole online flow (lobby, matchmaking, rooms,
 * authoritative matches, timers, end screen) can be tried without Supabase.
 * A bot account queues for Ranked / joins rooms and plays with the AI, using
 * the same API as a real player. Never included in production builds.
 */
import { decide } from '../../ai/AiPlayer';
import { getProfile } from '../../ai/profiles';
import { getContent } from '../../engine/content';
import { playersToAct } from '../../engine/legal';
import { Rng } from '../../engine/rng';
import { createNewSave } from '../../save/saveData';
import type { MatchView, Request as GameRequest } from '../protocol';
import { handle } from '../server/http';
import { GameService } from '../server/service';
import { MemoryStore } from '../server/store';

export const LOOPBACK_USER = 'you';
const BOT = 'bot';

type ViewListener = (view: MatchView) => void;

export class Loopback {
  private readonly store: MemoryStore;
  private readonly service: GameService;
  private readonly listeners = new Set<ViewListener>();
  private signedIn = false;

  constructor() {
    const now = Date.now();
    this.store = new MemoryStore(now);
    const rng = new Rng(now);
    let ids = 0;
    this.service = new GameService({
      store: this.store,
      content: getContent(),
      now: () => Date.now(),
      random: () => rng.next(),
      newId: () => `loop-${++ids}`,
    });
    // Push views to the client like Realtime does.
    const publish = this.store.publishView.bind(this.store);
    this.store.publishView = async (matchId, userId, view) => {
      await publish(matchId, userId, view);
      if (userId === LOOPBACK_USER) setTimeout(() => this.listeners.forEach((l) => l(view)), 50);
      if (userId === BOT) this.botThink(matchId);
    };
    // The bot owns every card and has a cloud save, so it can play Ranked.
    const botSave = createNewSave(getContent(), now);
    for (const c of getContent().ctx.cards.all)
      if (!c.token) botSave.collection[c.id] = { count: 3, level: 1 };
    void this.store.putSave(BOT, { data: botSave, version: 1, syncedAt: now }, null);
    void this.store.setProfile(BOT, {
      name: 'Loopback Bot',
      avatar: 'lord_monochromicorn',
      cardBack: 'classic',
    });
    // The bot's heartbeat, so it isn't forfeited while you think.
    setInterval(() => {
      void this.store.activeMatchOf(BOT).then((m) => {
        if (m) void this.raw(BOT, { op: 'tick', matchId: m.id });
      });
    }, 15_000);
  }

  account(): { kind: 'guest'; userId: string } | { kind: 'signedOut' } {
    return this.signedIn ? { kind: 'guest', userId: LOOPBACK_USER } : { kind: 'signedOut' };
  }

  signIn(): void {
    this.signedIn = true;
  }

  signOut(): void {
    this.signedIn = false;
  }

  async call<T>(
    req: GameRequest,
  ): Promise<{ ok: true; data: T } | { ok: false; body: Record<string, unknown> }> {
    const user = req.op === 'seasonRollover' ? 'admin' : LOOPBACK_USER;
    const res = await this.raw(user, req);
    const body = (await res.json()) as Record<string, unknown>;
    if (req.op === 'queue' && body.status === 'queued') this.botQueue();
    if (req.op === 'createRoom' && typeof body.code === 'string') this.botJoin(body.code);
    return res.ok ? { ok: true, data: body as T } : { ok: false, body };
  }

  private raw(user: string, req: GameRequest): Promise<Response> {
    return handle(new Request('http://loopback/game', { method: 'POST', body: JSON.stringify(req) }), {
      service: this.service,
      auth: async () => ({ userId: user }),
      isAdmin: () => user === 'admin',
    });
  }

  onViews(cb: ViewListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private botDeck() {
    const decks = getContent().starterDecks;
    return decks[Math.floor(Math.random() * decks.length)]!;
  }

  private botQueue(): void {
    setTimeout(() => void this.raw(BOT, { op: 'queue', deck: this.botDeck() }), 2500);
  }

  private botJoin(code: string): void {
    setTimeout(() => void this.raw(BOT, { op: 'joinRoom', code, deck: this.botDeck() }), 3000);
  }

  private thinking = new Set<string>();

  /** The bot plays its turns with the Easy AI on the real (server-side) state, then acts through the API. */
  private botThink(matchId: string): void {
    if (this.thinking.has(matchId)) return;
    this.thinking.add(matchId);
    setTimeout(() => {
      void (async () => {
        try {
          const m = await this.store.getMatch(matchId);
          if (!m || m.status !== 'active' || !m.state) return;
          const seat = m.players.indexOf(BOT);
          if (seat < 0 || !playersToAct(m.state).includes(seat as 0 | 1)) return;
          const action = decide(m.state, seat as 0 | 1, getContent().ctx, getProfile('easy')).action;
          await this.raw(BOT, { op: 'act', matchId, seq: m.seq, action });
        } finally {
          this.thinking.delete(matchId);
        }
        this.botThink(matchId);
      })();
    }, 900);
  }
}
