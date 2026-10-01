-- ====================================================================
-- RUN NAMIBIA - SUPABASE LEADERBOARD & AUTH SCHEMA
-- Paste this entire script into your Supabase project's SQL Editor and run it.
-- ====================================================================

-- 1. Create the players profile & leaderboard table
create table if not exists public.players (
  id uuid references auth.users on delete cascade primary key,
  nickname text unique not null check (char_length(nickname) >= 3 and char_length(nickname) <= 15),
  phone text,
  best_score integer default 0 not null check (best_score >= 0),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Ensure phone column exists if table was already created
alter table public.players add column if not exists phone text;

-- Index for instant high-score sorting
create index if not exists idx_players_best_score on public.players (best_score desc);
create index if not exists idx_players_nickname on public.players (nickname);

-- 2. Configure Row Level Security (RLS)
alter table public.players enable row level security;

-- Drop old policies if re-running
drop policy if exists "Anyone can read players leaderboard" on public.players;
drop policy if exists "Users cannot update players directly" on public.players;

-- Anyone can read the public leaderboard (all players' nicknames and scores)
create policy "Anyone can read players leaderboard"
  on public.players
  for select
  using (true);

-- Note: No INSERT or UPDATE policies are granted to authenticated/anon directly.
-- Inserts occur via the secure signup trigger, and score updates occur strictly via submit_score().

-- 3. Automatic player profile creation trigger on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nickname text;
  v_phone text;
begin
  -- Retrieve nickname and optional phone from user metadata passed during supabase.auth.signUp()
  v_nickname := trim(new.raw_user_meta_data->>'nickname');
  v_phone := trim(new.raw_user_meta_data->>'phone');

  -- Fallback if not specified in metadata
  if v_nickname is null or char_length(v_nickname) < 3 then
    v_nickname := 'Runner_' || substr(new.id::text, 1, 6);
  end if;

  -- Truncate to max 15 characters if needed
  if char_length(v_nickname) > 15 then
    v_nickname := substr(v_nickname, 1, 15);
  end if;

  insert into public.players (id, nickname, phone, best_score, created_at, updated_at)
  values (new.id, v_nickname, v_phone, 0, now(), now())
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Attach trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Secure Score Submission RPC
-- Rejects negative scores or suspicious scores exceeding MAX_SCORE.
-- Only updates best_score if new_score > current best_score.
-- Returns whether it's a new personal record, the player's best score, and their current rank.
create or replace function public.submit_score(new_score integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_current_best integer;
  v_new_best integer;
  v_is_new_best boolean := false;
  v_rank integer;
  -- MAX_SCORE constant: tune this threshold if you want a higher ceiling
  MAX_SCORE constant integer := 5000000;
begin
  -- Must be an authenticated session
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated. Please log in to submit scores.';
  end if;

  -- Validate score range
  if new_score is null or new_score < 0 then
    raise exception 'Score cannot be negative.';
  end if;

  if new_score > MAX_SCORE then
    raise exception 'Score exceeds maximum allowed threshold of %.', MAX_SCORE;
  end if;

  -- Fetch current best score for player
  select best_score into v_current_best
  from public.players
  where id = v_user_id;

  if not found then
    -- Auto-insert player row if not exists (e.g. created via dashboard or before trigger)
    insert into public.players (id, nickname, best_score, created_at, updated_at)
    values (
      v_user_id,
      coalesce((select raw_user_meta_data->>'nickname' from auth.users where id = v_user_id), 'Runner_' || substr(v_user_id::text, 1, 6)),
      0,
      now(),
      now()
    )
    on conflict (id) do nothing;
    v_current_best := 0;
  end if;

  -- Only update if new score is higher
  if new_score > v_current_best then
    update public.players
    set best_score = new_score,
        updated_at = now()
    where id = v_user_id;

    v_new_best := new_score;
    v_is_new_best := true;
  else
    v_new_best := v_current_best;
    v_is_new_best := false;
  end if;

  -- Calculate player rank (number of players with higher score + 1)
  select count(*) + 1 into v_rank
  from public.players
  where best_score > v_new_best;

  return json_build_object(
    'is_new_best', v_is_new_best,
    'best_score', v_new_best,
    'rank', v_rank
  );
end;
$$;

-- Grant execution permission to authenticated players
grant execute on function public.submit_score(integer) to authenticated;
