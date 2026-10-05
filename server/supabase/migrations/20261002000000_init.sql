-- Cards Clash online backend (Supabase free tier).
--
-- Security model: clients (anon / authenticated roles) can only READ their own
-- rows (plus public profiles, ratings and seasons). Every write goes through
-- the `game` Edge Function, which uses the service role and runs the shared
-- rules engine. Full match states (with hidden cards) are never readable by
-- clients; each player gets a redacted copy in `match_views`.

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Player' check (char_length(name) between 2 and 16),
  avatar text not null default 'sola',
  card_back text not null default 'classic',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every new user (guest or email) gets a profile row.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Cloud saves, plus denormalised collection and decks (read by the server for
-- Ranked ownership checks; readable by their owner).
-- ---------------------------------------------------------------------------
create table public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  version integer not null default 1,
  synced_at timestamptz not null default now(),
  -- Times a sync tried to add more than the server allowed (edited clients).
  flags integer not null default 0
);

create table public.collections (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id text not null,
  count integer not null check (count >= 0),
  level integer not null default 1 check (level between 1 and 5),
  primary key (user_id, card_id)
);

create table public.decks (
  user_id uuid not null references auth.users (id) on delete cascade,
  slot integer not null check (slot between 0 and 9),
  name text not null,
  hero_id text not null,
  landscapes text[] not null,
  cards jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

-- ---------------------------------------------------------------------------
-- Seasons and ratings
-- ---------------------------------------------------------------------------
create table public.seasons (
  id integer primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default false
);
create unique index seasons_one_active on public.seasons (active) where active;

create table public.ratings (
  user_id uuid not null references auth.users (id) on delete cascade,
  season_id integer not null references public.seasons (id),
  rating integer not null default 1000,
  games integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  peak integer not null default 1000,
  primary key (user_id, season_id)
);
create index ratings_leaderboard on public.ratings (season_id, rating desc);

-- ---------------------------------------------------------------------------
-- Matches
-- ---------------------------------------------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('ranked', 'friendly')),
  status text not null check (status in ('waiting', 'active', 'ended')),
  room_code text,
  player0 uuid not null references auth.users (id) on delete cascade,
  player1 uuid references auth.users (id) on delete cascade,
  names jsonb not null,
  decks jsonb not null,
  -- Full engine state including hidden cards: service role only.
  state jsonb,
  seq integer not null default 0,
  deadline timestamptz,
  last_seen jsonb not null,
  winner text,
  season_id integer references public.seasons (id),
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index matches_open_room on public.matches (room_code) where status = 'waiting';
create index matches_active_p0 on public.matches (player0) where status = 'active';
create index matches_active_p1 on public.matches (player1) where status = 'active';

-- Audit log of every accepted action.
create table public.match_actions (
  match_id uuid not null references public.matches (id) on delete cascade,
  seq integer not null,
  player smallint not null,
  action jsonb not null,
  created_at timestamptz not null default now(),
  primary key (match_id, seq, player)
);

-- One redacted view per player; Realtime pushes changes to its owner.
create table public.match_views (
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  seq integer not null,
  view jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create table public.matchmaking_queue (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  rating integer not null,
  deck jsonb not null,
  queued_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: on for every table. No insert/update/delete policies at
-- all for clients; the Edge Function's service role bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.saves enable row level security;
alter table public.collections enable row level security;
alter table public.decks enable row level security;
alter table public.seasons enable row level security;
alter table public.ratings enable row level security;
alter table public.matches enable row level security;
alter table public.match_actions enable row level security;
alter table public.match_views enable row level security;
alter table public.matchmaking_queue enable row level security;

create policy "profiles are public" on public.profiles for select to authenticated using (true);
create policy "own save" on public.saves for select to authenticated using (user_id = (select auth.uid()));
create policy "own collection" on public.collections for select to authenticated using (user_id = (select auth.uid()));
create policy "own decks" on public.decks for select to authenticated using (user_id = (select auth.uid()));
create policy "seasons are public" on public.seasons for select to anon, authenticated using (true);
create policy "ratings are public" on public.ratings for select to authenticated using (true);
create policy "own match views" on public.match_views for select to authenticated using (user_id = (select auth.uid()));
-- matches, match_actions, matchmaking_queue: no client access at all.

-- Realtime: players get their redacted view row pushed (RLS still applies).
alter publication supabase_realtime add table public.match_views;

-- ---------------------------------------------------------------------------
-- First season
-- ---------------------------------------------------------------------------
insert into public.seasons (id, name, starts_at, ends_at, active)
values (1, 'Season 1', now(), now() + interval '42 days', true);
