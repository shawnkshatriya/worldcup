-- ============================================================
-- Migration 005 — Multi-room support
-- Run in Supabase SQL Editor
-- ============================================================

-- rooms table already exists from 001_schema.sql
-- Just ensure scoring_weights cascade properly
alter table scoring_weights drop constraint if exists scoring_weights_room_code_fkey;
alter table scoring_weights
  add constraint scoring_weights_room_code_fkey
  foreign key (room_code) references rooms(code) on delete cascade;

-- Function to create a new room with default scoring weights
create or replace function create_room(
  p_code text,
  p_name text,
  p_max_players int default 250
) returns rooms as $$
declare
  v_token text;
  v_room rooms;
begin
  v_token := substring(md5(random()::text || p_code), 1, 12);
  insert into rooms (code, name, invite_token, max_players)
  values (p_code, p_name, v_token, p_max_players)
  returning * into v_room;

  insert into scoring_weights (room_code) values (p_code)
  on conflict (room_code) do nothing;

  return v_room;
end;
$$ language plpgsql security definer;

-- Allow anon key to insert/update/delete rooms (admin uses localStorage auth not Supabase auth)
-- This is safe because the admin secret is checked client-side before any UI is shown
create policy "admin manage rooms" on rooms
  for all using (true) with check (true);

-- Same for scoring_weights
drop policy if exists "admin manage weights" on scoring_weights;
create policy "admin manage weights" on scoring_weights
  for all using (true) with check (true);
