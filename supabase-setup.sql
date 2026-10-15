-- Myosia Worldbuilder Supabase setup
-- Run this entire file in Supabase Dashboard > SQL Editor > New query.
create extension if not exists pgcrypto;

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique check (invite_code ~ '^[A-Z0-9]{6,12}$'),
  created_at timestamptz not null default now()
);
create table if not exists public.campaign_members (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'player' check (role in ('gm','player')),
  joined_at timestamptz not null default now(),
  primary key (campaign_id,user_id)
);
create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  storage_path text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.character_sheets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Unnamed character' check (char_length(name) between 1 and 100),
  fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaign_members_user_idx on public.campaign_members(user_id);
create index if not exists music_tracks_campaign_idx on public.music_tracks(campaign_id);
create index if not exists character_sheets_campaign_idx on public.character_sheets(campaign_id);

create or replace function public.myosia_is_member(p_campaign uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.campaign_members m where m.campaign_id=p_campaign and m.user_id=auth.uid());
$$;
create or replace function public.myosia_is_gm(p_campaign uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.campaign_members m where m.campaign_id=p_campaign and m.user_id=auth.uid() and m.role='gm');
$$;
revoke all on function public.myosia_is_member(uuid) from public;
revoke all on function public.myosia_is_gm(uuid) from public;
grant execute on function public.myosia_is_member(uuid) to authenticated;
grant execute on function public.myosia_is_gm(uuid) to authenticated;

create or replace function public.myosia_add_gm_member()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.campaign_members(campaign_id,user_id,role) values(new.id,new.owner_id,'gm') on conflict do nothing;
  return new;
end; $$;
drop trigger if exists myosia_campaign_add_gm on public.campaigns;
create trigger myosia_campaign_add_gm after insert on public.campaigns for each row execute function public.myosia_add_gm_member();

create or replace function public.join_myosia_campaign(p_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_campaign uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select id into v_campaign from public.campaigns where invite_code=upper(trim(p_code));
  if v_campaign is null then raise exception 'Campaign invite code not found'; end if;
  insert into public.campaign_members(campaign_id,user_id,role) values(v_campaign,auth.uid(),'player') on conflict(campaign_id,user_id) do nothing;
  return v_campaign;
end; $$;
revoke all on function public.join_myosia_campaign(text) from public;
grant execute on function public.join_myosia_campaign(text) to authenticated;

-- Create campaigns through a validated RPC so the app can receive the new row safely.
create or replace function public.create_myosia_campaign(p_name text, p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_campaign public.campaigns;
begin
  if v_user is null then raise exception 'Sign in first'; end if;
  if p_name is null or char_length(trim(p_name)) < 1 or char_length(trim(p_name)) > 80 then
    raise exception 'Campaign name must be between 1 and 80 characters';
  end if;
  if p_invite_code is null or p_invite_code !~ '^[A-Z0-9]{6,12}$' then
    raise exception 'Invalid invite code';
  end if;
  insert into public.campaigns(name, owner_id, invite_code)
    values(trim(p_name), v_user, p_invite_code)
    returning * into v_campaign;
  return jsonb_build_object(
    'id', v_campaign.id,
    'name', v_campaign.name,
    'invite_code', v_campaign.invite_code,
    'owner_id', v_campaign.owner_id
  );
end;
$$;
revoke all on function public.create_myosia_campaign(text, text) from public;
grant execute on function public.create_myosia_campaign(text, text) to authenticated;

create or replace function public.myosia_touch_character()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists myosia_character_updated on public.character_sheets;
create trigger myosia_character_updated before update on public.character_sheets for each row execute function public.myosia_touch_character();

alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.music_tracks enable row level security;
alter table public.character_sheets enable row level security;

drop policy if exists "campaign members can read campaign" on public.campaigns;
create policy "campaign members can read campaign" on public.campaigns for select to authenticated using (public.myosia_is_member(id));
drop policy if exists "authenticated users create own campaigns" on public.campaigns;
create policy "authenticated users create own campaigns" on public.campaigns for insert to authenticated with check (owner_id=auth.uid());
drop policy if exists "gm can update campaign" on public.campaigns;
create policy "gm can update campaign" on public.campaigns for update to authenticated using (public.myosia_is_gm(id)) with check (public.myosia_is_gm(id));
drop policy if exists "gm can delete campaign" on public.campaigns;
create policy "gm can delete campaign" on public.campaigns for delete to authenticated using (public.myosia_is_gm(id));

drop policy if exists "members can read membership" on public.campaign_members;
create policy "members can read membership" on public.campaign_members for select to authenticated using (public.myosia_is_member(campaign_id));
drop policy if exists "gm can manage membership" on public.campaign_members;
create policy "gm can manage membership" on public.campaign_members for all to authenticated using (public.myosia_is_gm(campaign_id)) with check (public.myosia_is_gm(campaign_id));

-- Only campaign members can read track metadata. Only GMs can add/change/remove tracks.
drop policy if exists "members read music tracks" on public.music_tracks;
create policy "members read music tracks" on public.music_tracks for select to authenticated using (public.myosia_is_member(campaign_id));
drop policy if exists "gm manage music tracks" on public.music_tracks;
create policy "gm manage music tracks" on public.music_tracks for all to authenticated using (public.myosia_is_gm(campaign_id)) with check (public.myosia_is_gm(campaign_id) and created_by=auth.uid());

-- Character owners and the campaign GM may read/update a sheet; only an owner may create it.
drop policy if exists "owner or gm read character sheets" on public.character_sheets;
create policy "owner or gm read character sheets" on public.character_sheets for select to authenticated using (owner_id=auth.uid() or public.myosia_is_gm(campaign_id));
drop policy if exists "member creates own character sheet" on public.character_sheets;
create policy "member creates own character sheet" on public.character_sheets for insert to authenticated with check (owner_id=auth.uid() and public.myosia_is_member(campaign_id));
drop policy if exists "owner or gm updates character sheet" on public.character_sheets;
create policy "owner or gm updates character sheet" on public.character_sheets for update to authenticated using (owner_id=auth.uid() or public.myosia_is_gm(campaign_id)) with check (owner_id=auth.uid() or public.myosia_is_gm(campaign_id));
drop policy if exists "owner or gm deletes character sheet" on public.character_sheets;
create policy "owner or gm deletes character sheet" on public.character_sheets for delete to authenticated using (owner_id=auth.uid() or public.myosia_is_gm(campaign_id));

-- Private music bucket. Storage object names begin with campaign UUID: <campaign-id>/<random-name>.mp3
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('myosia-music','myosia-music',false,52428800,array['audio/mpeg','audio/mp4','audio/ogg','audio/wav','audio/x-wav'])
on conflict(id) do update set public=false,file_size_limit=52428800,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "campaign members can stream music" on storage.objects;
create policy "campaign members can stream music" on storage.objects for select to authenticated using (bucket_id='myosia-music' and public.myosia_is_member((split_part(name,'/',1))::uuid));
drop policy if exists "gm can upload campaign music" on storage.objects;
create policy "gm can upload campaign music" on storage.objects for insert to authenticated with check (bucket_id='myosia-music' and public.myosia_is_gm((split_part(name,'/',1))::uuid));
drop policy if exists "gm can update campaign music files" on storage.objects;
create policy "gm can update campaign music files" on storage.objects for update to authenticated using (bucket_id='myosia-music' and public.myosia_is_gm((split_part(name,'/',1))::uuid)) with check (bucket_id='myosia-music' and public.myosia_is_gm((split_part(name,'/',1))::uuid));
drop policy if exists "gm can delete campaign music files" on storage.objects;
create policy "gm can delete campaign music files" on storage.objects for delete to authenticated using (bucket_id='myosia-music' and public.myosia_is_gm((split_part(name,'/',1))::uuid));

-- Private Realtime Broadcast: campaign members can listen, only the GM can broadcast playback commands.
drop policy if exists "campaign members can receive playback" on realtime.messages;
create policy "campaign members can receive playback" on realtime.messages for select to authenticated using (
  split_part(realtime.topic(),':',1)='campaign' and public.myosia_is_member((split_part(realtime.topic(),':',2))::uuid)
);
drop policy if exists "campaign GM can broadcast playback" on realtime.messages;
create policy "campaign GM can broadcast playback" on realtime.messages for insert to authenticated with check (
  split_part(realtime.topic(),':',1)='campaign' and public.myosia_is_gm((split_part(realtime.topic(),':',2))::uuid)
);
