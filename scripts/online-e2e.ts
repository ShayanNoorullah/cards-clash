/**
 * End-to-end test of the online backend against a running Supabase stack
 * (local `npm run server:start` + `supabase functions serve game`, or a real project).
 *
 *   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx vite-node scripts/online-e2e.ts
 *
 * Two anonymous players sync saves, queue for Ranked, play a full match through
 * the `game` function (each side decides with the AI), and the script checks
 * Row Level Security, Realtime pushes, rating/reward updates and that cheating
 * attempts are refused. The service-role key is used ONLY by this test to read
 * the true match state for the AI and to verify server-side results.
 */
import { createClient, FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';
import { decide } from '../src/ai/AiPlayer';
import { getProfile } from '../src/ai/profiles';
import { getContent, playersToAct, type Action, type GameState, type PlayerId } from '../src/engine';
import type { MatchView } from '../src/online/protocol';
import { createNewSave } from '../src/save/saveData';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON = process.env.SUPABASE_ANON_KEY ?? '';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!ANON || !SERVICE) throw new Error('Set SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY');

const content = getContent();
const { ctx, starterDecks } = content;
// Node < 22 has no built-in WebSocket for Realtime.
const opts = {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws as unknown as typeof WebSocket },
};
const admin = createClient(URL, SERVICE, opts);

let failures = 0;
function check(ok: boolean, what: string, detail?: unknown): void {
  if (ok) console.log(`  ok   ${what}`);
  else {
    failures++;
    console.log(`  FAIL ${what}`, detail ?? '');
  }
}

interface Player {
  name: string;
  db: SupabaseClient;
  id: string;
}

async function newPlayer(name: string): Promise<Player> {
  const db = createClient(URL, ANON, opts);
  const { data, error } = await db.auth.signInAnonymously();
  if (error || !data.user) throw new Error(`anonymous sign-in failed: ${error?.message}`);
  return { name, db, id: data.user.id };
}

type Reply = { ok: true; data: Record<string, unknown> } | { ok: false; status: number; code: string };

async function call(p: Player | null, body: Record<string, unknown>): Promise<Reply> {
  if (!p) {
    const res = await fetch(`${URL}/functions/v1/game`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: ANON },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { code?: string };
    return res.ok ? { ok: true, data: json } : { ok: false, status: res.status, code: json.code ?? '' };
  }
  const { data, error } = await p.db.functions.invoke('game', { body });
  if (!error) return { ok: true, data: data as Record<string, unknown> };
  if (error instanceof FunctionsHttpError) {
    const json = (await error.context.json().catch(() => ({}))) as { code?: string };
    return { ok: false, status: error.context.status, code: json.code ?? '' };
  }
  return { ok: false, status: 0, code: error.message };
}

async function trueState(matchId: string): Promise<{ state: GameState; status: string; seq: number }> {
  const { data, error } = await admin.from('matches').select('state, status, seq').eq('id', matchId).single();
  if (error) throw new Error(error.message);
  return data as { state: GameState; status: string; seq: number };
}

async function main(): Promise<void> {
  console.log(`Supabase: ${URL}`);
  const ann = await newPlayer('ann');
  const bob = await newPlayer('bob');
  console.log('\nAccounts & saves');
  check(ann.id !== bob.id, 'two anonymous accounts');
  for (const p of [ann, bob]) {
    const save = createNewSave(content, Date.now() - 2 * 3_600_000);
    save.profile.name = p.name === 'ann' ? 'Ann E2E' : 'Bob E2E';
    const r = await call(p, { op: 'sync', save, baseVersion: null, base: null });
    check(r.ok, `${p.name}: cloud save sync`, r);
  }

  console.log('\nRow Level Security');
  const ownSave = await ann.db.from('saves').select('user_id');
  check(ownSave.data?.length === 1 && ownSave.data[0]!.user_id === ann.id, 'reads only own save');
  const forged = await ann.db.from('saves').insert({ user_id: ann.id, data: {}, version: 99 });
  check(!!forged.error, 'cannot insert saves directly');
  const edited = await ann.db.from('saves').update({ version: 999 }).eq('user_id', ann.id).select('version');
  check(!!edited.error || (edited.data ?? []).length === 0, 'cannot update own save directly');
  const coins = await ann.db.from('collections').select('card_id').limit(1);
  check(!coins.error && (coins.data ?? []).length === 1, 'reads own collection mirror');
  const rating = await ann.db.from('ratings').insert({ user_id: ann.id, season_id: 1, rating: 3000 });
  check(!!rating.error, 'cannot write ratings');

  console.log('\nRealtime');
  const pushes: MatchView[] = [];
  const channel = ann.db
    .channel(`views-${ann.id}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'match_views', filter: `user_id=eq.${ann.id}` },
      (payload) => {
        const row = payload.new as { view?: MatchView };
        if (row.view) pushes.push(row.view);
      },
    );
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('realtime subscribe timed out')), 15000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(t);
        resolve();
      }
    });
  });
  check(true, 'subscribed to own match views');

  console.log('\nAnti-cheat');
  check((await call(null, { op: 'profile' })).ok === false, 'no account → refused');
  const roll = await call(ann, { op: 'seasonRollover' });
  check(!roll.ok && roll.status === 403, 'players cannot roll the season', roll);
  const bad = { ...starterDecks[0]!, cards: Array(40).fill(starterDecks[0]!.cards[0]) };
  const badDeck = await call(ann, { op: 'queue', deck: bad });
  check(!badDeck.ok && badDeck.code === 'DECK_INVALID', 'illegal deck refused', badDeck);
  const owned = createNewSave(content, 0).collection;
  const missing = ctx.cards.all.find((c) => !c.token && !owned[c.id] && c.rarity === 'common')!.id;
  const unowned = { ...starterDecks[0]!, cards: [...starterDecks[0]!.cards.slice(0, 39), missing] };
  const notOwned = await call(ann, { op: 'queue', deck: unowned });
  check(!notOwned.ok && notOwned.code === 'NOT_OWNED', 'unowned cards refused in Ranked', notOwned);

  console.log('\nRanked match');
  const qa = await call(ann, { op: 'queue', deck: starterDecks[0]! });
  check(qa.ok && qa.data.status === 'queued', 'ann queued', qa);
  const qb = await call(bob, { op: 'queue', deck: starterDecks[1]! });
  check(qb.ok && qb.data.status === 'matched', 'bob matched with ann', qb);
  const matchId = (qb.ok ? qb.data.matchId : '') as string;
  const qs = await call(ann, { op: 'queueStatus' });
  check(qs.ok && qs.data.matchId === matchId, 'ann sees the match');

  const directMatch = await ann.db.from('matches').select('id').eq('id', matchId);
  check((directMatch.data ?? []).length === 0, 'full match state is not readable by players');
  const views = await ann.db.from('match_views').select('user_id');
  check(
    (views.data ?? []).every((v) => v.user_id === ann.id),
    'reads only own match views',
  );

  const byId = { [ann.id]: ann, [bob.id]: bob };
  const seats = (await admin.from('matches').select('player0, player1').eq('id', matchId).single()).data!;
  const seatOf: [Player, Player] = [byId[seats.player0]!, byId[seats.player1]!];

  // Cheats in a live match.
  let t = await trueState(matchId);
  const actor = playersToAct(t.state)[0]!;
  const other = (1 - actor) as PlayerId;
  const forOther = await call(seatOf[other], {
    op: 'act',
    matchId,
    seq: t.seq,
    action: { type: 'surrender', player: actor },
  });
  check(!forOther.ok && forOther.code === 'WRONG_PLAYER', 'cannot act for the opponent', forOther);
  const stale = await call(seatOf[actor], {
    op: 'act',
    matchId,
    seq: t.seq + 5,
    action: decide(t.state, actor, ctx, getProfile('easy')).action,
  });
  check(!stale.ok && stale.code === 'STALE', 'stale/replayed action refused', stale);
  const illegal = await call(seatOf[actor], {
    op: 'act',
    matchId,
    seq: t.seq,
    action: { type: 'arrangeLandscapes', player: actor, order: ['ember', 'ember', 'ember', 'ember'] },
  });
  check(!illegal.ok && illegal.code === 'ILLEGAL', 'illegal move refused', illegal);
  const spy = await call(seatOf[other], { op: 'view', matchId });
  const spyState = spy.ok ? (spy.data.view as MatchView).state : null;
  check(
    !!spyState && spyState.players[actor].hand.every((c) => c.cardId === '__hidden'),
    "opponent's hand is hidden in views",
  );

  const started = Date.now();
  let actions = 0;
  for (; actions < 1500; actions++) {
    t = await trueState(matchId);
    if (t.status !== 'active') break;
    const p = playersToAct(t.state)[0]!;
    const action: Action = decide(t.state, p, ctx, getProfile('easy')).action;
    const r = await call(seatOf[p], { op: 'act', matchId, seq: t.seq, action });
    if (!r.ok) {
      check(false, `action ${actions} accepted`, r);
      break;
    }
  }
  t = await trueState(matchId);
  check(
    t.status === 'ended',
    `match finished after ${actions} actions (${Math.round((Date.now() - started) / 1000)} s)`,
  );
  const winner = t.state.winner;
  console.log(
    `  winner: ${winner === 'draw' ? 'draw' : seatOf[winner as PlayerId].name} (${t.state.endReason})`,
  );

  const logged = await admin
    .from('match_actions')
    .select('seq', { count: 'exact', head: true })
    .eq('match_id', matchId);
  check((logged.count ?? 0) >= actions, `every action logged (${logged.count})`);
  const season = (await admin.from('seasons').select('id').eq('active', true).single()).data!;
  const ratings = await ann.db.from('ratings').select('user_id, rating, games').eq('season_id', season.id);
  const rows = ratings.data ?? [];
  check(rows.length >= 2 && rows.every((r) => r.games >= 1), 'ratings updated (public read)', rows);
  if (winner !== 'draw') {
    const w = rows.find((r) => r.user_id === seatOf[winner as PlayerId].id);
    check(!!w && w.rating > 1000, `winner rating ${w?.rating}`);
  }
  const prof = await call(ann, { op: 'profile' });
  check(prof.ok && prof.data.games === 1, 'profile shows the game', prof);
  const finalView = await call(ann, { op: 'view', matchId });
  check(finalView.ok && (finalView.data.view as MatchView).status === 'ended', 'final view ended');

  await new Promise((r) => setTimeout(r, 1500));
  check(pushes.length > 0, `realtime pushed ${pushes.length} view updates to ann`);
  check(
    pushes.every(
      (v) => v.state === null || v.state.players[1 - v.you]!.hand.every((c) => c.cardId === '__hidden'),
    ),
    'realtime views are redacted',
  );
  await ann.db.removeChannel(channel);

  console.log('\nFriendly room');
  const room = await call(ann, { op: 'createRoom', deck: starterDecks[2]! });
  check(room.ok && typeof room.data.code === 'string', `room created (${room.ok ? room.data.code : ''})`);
  const join = await call(bob, {
    op: 'joinRoom',
    code: room.ok ? room.data.code : '',
    deck: starterDecks[3]!,
  });
  check(join.ok && join.data.matchId === (room.ok ? room.data.matchId : ''), 'friend joined by code', join);
  const friendly = join.ok ? (join.data.matchId as string) : '';
  const ft = await trueState(friendly);
  const fs = await admin.from('matches').select('player0, player1').eq('id', friendly).single();
  const seat = fs.data!.player0 === ann.id ? 0 : 1;
  const sur = await call(ann, {
    op: 'act',
    matchId: friendly,
    seq: ft.seq,
    action: { type: 'surrender', player: seat },
  });
  check(sur.ok && (sur.data.view as MatchView).status === 'ended', 'surrender ends the friendly match');

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
