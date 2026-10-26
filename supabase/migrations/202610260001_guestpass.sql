create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  phone text,
  role text not null default 'restaurant' check (role in ('restaurant', 'guest')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null,
  slug text not null unique,
  qr_id uuid not null unique default gen_random_uuid(),
  description text not null default '',
  address text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  logo_url text,
  cover_url text,
  is_open boolean not null default true,
  queue_capacity integer not null default 40 check (queue_capacity between 1 and 500),
  avg_service_minutes integer not null default 5 check (avg_service_minutes between 1 and 240),
  opening_hours jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  guest_user_id uuid references public.profiles (id) on delete set null,
  guest_access_token uuid not null unique default gen_random_uuid(),
  booking_code text not null unique,
  guest_name text not null check (char_length(guest_name) between 1 and 100),
  phone text,
  party_size integer not null check (party_size between 1 and 20),
  table_preference text not null default 'any'
    check (table_preference in ('any', 'indoor', 'outdoor', 'window')),
  status text not null default 'waiting'
    check (status in ('waiting', 'notified', 'seated', 'completed', 'cancelled')),
  position integer not null default 1,
  estimated_wait_minutes integer not null default 0,
  table_number text,
  whatsapp_updates boolean not null default false,
  joined_at timestamptz not null default now(),
  called_at timestamptz,
  seated_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists bookings_restaurant_status_joined_idx
  on public.bookings (restaurant_id, status, joined_at);
create index if not exists bookings_restaurant_joined_idx
  on public.bookings (restaurant_id, joined_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists restaurants_set_updated_at on public.restaurants;
create trigger restaurants_set_updated_at before update on public.restaurants
for each row execute function public.set_updated_at();
drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at before update on public.bookings
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile" on public.profiles
for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile" on public.profiles
for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
for update to authenticated using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Restaurants are publicly discoverable" on public.restaurants;
create policy "Restaurants are publicly discoverable" on public.restaurants
for select to anon, authenticated using (true);
drop policy if exists "Owners can insert their restaurant" on public.restaurants;
create policy "Owners can insert their restaurant" on public.restaurants
for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "Owners can update their restaurant" on public.restaurants;
create policy "Owners can update their restaurant" on public.restaurants
for update to authenticated using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);
drop policy if exists "Owners can delete their restaurant" on public.restaurants;
create policy "Owners can delete their restaurant" on public.restaurants
for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists "Owners can read restaurant bookings" on public.bookings;
create policy "Owners can read restaurant bookings" on public.bookings
for select to authenticated using (
  exists (select 1 from public.restaurants r
    where r.id = restaurant_id and r.owner_id = (select auth.uid()))
);
drop policy if exists "Guests can read their own bookings" on public.bookings;
create policy "Guests can read their own bookings" on public.bookings
for select to authenticated using (guest_user_id = (select auth.uid()));
drop policy if exists "Owners can delete restaurant bookings" on public.bookings;
create policy "Owners can delete restaurant bookings" on public.bookings
for delete to authenticated using (
  exists (select 1 from public.restaurants r
    where r.id = restaurant_id and r.owner_id = (select auth.uid()))
);

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.restaurants to authenticated;
grant select on public.restaurants to anon;
grant select, delete on public.bookings to authenticated;

create or replace function public.join_queue(
  p_qr_id uuid,
  p_guest_name text,
  p_phone text default null,
  p_party_size integer default 1,
  p_table_preference text default 'any',
  p_whatsapp boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant public.restaurants%rowtype;
  v_position integer;
  v_booking public.bookings%rowtype;
begin
  select * into v_restaurant from public.restaurants where qr_id = p_qr_id;
  if not found then raise exception 'Restaurant not found.'; end if;
  if not v_restaurant.is_open then raise exception 'This restaurant has paused its waitlist.'; end if;
  if p_guest_name is null or char_length(trim(p_guest_name)) not between 1 and 100 then
    raise exception 'Enter your name to join the queue.';
  end if;
  if p_party_size is null or p_party_size not between 1 and 20 then
    raise exception 'Party size must be between 1 and 20.';
  end if;
  if p_table_preference not in ('any', 'indoor', 'outdoor', 'window') then
    raise exception 'Choose a valid table preference.';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_restaurant.id::text));
  select count(*) + 1 into v_position from public.bookings
    where restaurant_id = v_restaurant.id and status in ('waiting', 'notified');
  if v_position - 1 >= v_restaurant.queue_capacity then
    raise exception 'The waitlist is currently full.';
  end if;

  insert into public.bookings (
    restaurant_id, guest_user_id, booking_code, guest_name, phone, party_size,
    table_preference, position, estimated_wait_minutes, whatsapp_updates
  ) values (
    v_restaurant.id, auth.uid(),
    'GP-' || upper(substr(gen_random_uuid()::text, 1, 6)),
    trim(p_guest_name), nullif(trim(p_phone), ''), p_party_size,
    p_table_preference, v_position, (v_position - 1) * v_restaurant.avg_service_minutes, p_whatsapp
  ) returning * into v_booking;

  return to_jsonb(v_booking) || jsonb_build_object(
    'restaurant_name', v_restaurant.name,
    'restaurant_phone', v_restaurant.phone,
    'restaurant_address', v_restaurant.address
  );
end;
$$;

create or replace function public.get_public_booking(p_access_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_restaurant public.restaurants%rowtype;
  v_position integer;
begin
  select * into v_booking from public.bookings where guest_access_token = p_access_token;
  if not found then return null; end if;
  select * into v_restaurant from public.restaurants where id = v_booking.restaurant_id;
  select count(*) + 1 into v_position from public.bookings b
    where b.restaurant_id = v_booking.restaurant_id
      and b.status in ('waiting', 'notified')
      and (b.joined_at, b.id) < (v_booking.joined_at, v_booking.id);
  return to_jsonb(v_booking) || jsonb_build_object(
    'position', case when v_booking.status in ('waiting', 'notified') then v_position else 0 end,
    'estimated_wait_minutes', greatest(v_position - 1, 0) * v_restaurant.avg_service_minutes,
    'restaurant_name', v_restaurant.name,
    'restaurant_phone', v_restaurant.phone,
    'restaurant_address', v_restaurant.address
  );
end;
$$;

create or replace function public.transition_booking(
  p_booking_id uuid,
  p_status text,
  p_table_number text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
begin
  if p_status not in ('waiting', 'notified', 'seated', 'completed', 'cancelled') then
    raise exception 'Invalid booking status.';
  end if;
  select b.* into v_booking
  from public.bookings b
  join public.restaurants r on r.id = b.restaurant_id
  where b.id = p_booking_id and r.owner_id = (select auth.uid())
  for update of b;
  if not found then raise exception 'Queue entry not found or access denied.'; end if;
  if not (
    (v_booking.status = 'waiting' and p_status in ('notified', 'cancelled')) or
    (v_booking.status = 'notified' and p_status in ('waiting', 'seated', 'cancelled')) or
    (v_booking.status = 'seated' and p_status = 'completed') or
    v_booking.status = p_status
  ) then raise exception 'This queue entry cannot move from % to %.', v_booking.status, p_status; end if;
  update public.bookings b
  set status = p_status,
      table_number = coalesce(nullif(trim(p_table_number), ''), b.table_number),
      called_at = case when p_status = 'notified' then now() else b.called_at end,
      seated_at = case when p_status = 'seated' then now() else b.seated_at end,
      completed_at = case when p_status = 'completed' then now() else b.completed_at end
  where b.id = p_booking_id
  returning b.* into v_booking;
  return to_jsonb(v_booking);
end;
$$;

create or replace function public.cancel_public_booking(p_access_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
begin
  update public.bookings
  set status = 'cancelled'
  where guest_access_token = p_access_token and status = 'waiting'
  returning * into v_booking;
  if not found then raise exception 'This queue entry can no longer be cancelled.'; end if;
  return to_jsonb(v_booking);
end;
$$;

revoke all on function public.join_queue(uuid, text, text, integer, text, boolean) from public;
grant execute on function public.join_queue(uuid, text, text, integer, text, boolean) to anon, authenticated;
revoke all on function public.get_public_booking(uuid) from public;
grant execute on function public.get_public_booking(uuid) to anon, authenticated;
revoke all on function public.transition_booking(uuid, text, text) from public;
grant execute on function public.transition_booking(uuid, text, text) to authenticated;
revoke all on function public.cancel_public_booking(uuid) from public;
grant execute on function public.cancel_public_booking(uuid) to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('restaurant-media', 'restaurant-media', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "Restaurant owners can upload their images" on storage.objects;
create policy "Restaurant owners can upload their images" on storage.objects
for insert to authenticated with check (
  bucket_id = 'restaurant-media' and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists "Restaurant images are public" on storage.objects;
create policy "Restaurant images are public" on storage.objects
for select to anon, authenticated using (bucket_id = 'restaurant-media');
drop policy if exists "Restaurant owners can update their images" on storage.objects;
create policy "Restaurant owners can update their images" on storage.objects
for update to authenticated using (
  bucket_id = 'restaurant-media' and (storage.foldername(name))[1] = (select auth.uid())::text
) with check (
  bucket_id = 'restaurant-media' and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists "Restaurant owners can remove their images" on storage.objects;
create policy "Restaurant owners can remove their images" on storage.objects
for delete to authenticated using (
  bucket_id = 'restaurant-media' and (storage.foldername(name))[1] = (select auth.uid())::text
);
