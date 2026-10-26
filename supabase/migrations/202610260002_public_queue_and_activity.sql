alter table public.bookings
  add column if not exists request_id uuid;

alter table public.restaurants
  add constraint restaurants_name_length_check
    check (char_length(trim(name)) between 1 and 120) not valid,
  add constraint restaurants_address_length_check
    check (char_length(address) between 1 and 240) not valid,
  add constraint restaurants_description_length_check
    check (char_length(description) <= 500) not valid,
  add constraint restaurants_phone_length_check
    check (char_length(phone) <= 30 and char_length(whatsapp) <= 30) not valid;

alter table public.bookings
  add constraint bookings_position_check check (position >= 1) not valid,
  add constraint bookings_estimated_wait_check check (estimated_wait_minutes >= 0) not valid,
  add constraint bookings_phone_length_check check (phone is null or char_length(phone) <= 20) not valid;

create unique index if not exists bookings_restaurant_request_id_idx
  on public.bookings (restaurant_id, request_id)
  where request_id is not null;

revoke all privileges on public.restaurants from anon, public;
grant select, insert, update, delete on public.restaurants to authenticated;

create table if not exists public.queue_activity (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  booking_id uuid not null,
  actor_id uuid references auth.users (id) on delete set null,
  event_type text not null check (event_type in ('joined', 'called', 'seated', 'completed', 'cancelled', 'removed')),
  from_status text,
  to_status text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists queue_activity_restaurant_created_idx
  on public.queue_activity (restaurant_id, created_at desc);

create table if not exists public.guest_notifications (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  notification_type text not null check (notification_type in ('called', 'seated', 'completed', 'cancelled')),
  title text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists guest_notifications_booking_created_idx
  on public.guest_notifications (booking_id, created_at desc);

alter table public.queue_activity enable row level security;
alter table public.guest_notifications enable row level security;

drop policy if exists "Owners can read restaurant queue activity" on public.queue_activity;
create policy "Owners can read restaurant queue activity" on public.queue_activity
for select to authenticated using (
  exists (select 1 from public.restaurants r
    where r.id = restaurant_id and r.owner_id = (select auth.uid()))
);

drop policy if exists "Owners can read restaurant notifications" on public.guest_notifications;
create policy "Owners can read restaurant notifications" on public.guest_notifications
for select to authenticated using (
  exists (select 1 from public.restaurants r
    where r.id = restaurant_id and r.owner_id = (select auth.uid()))
);

grant select on public.queue_activity, public.guest_notifications to authenticated;
revoke all on public.queue_activity, public.guest_notifications from anon, public;

create or replace function public.prevent_restaurant_qr_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.qr_id is distinct from old.qr_id then
    raise exception 'A restaurant QR identifier is permanent and cannot be changed.';
  end if;
  return new;
end;
$$;

drop trigger if exists restaurants_qr_id_immutable on public.restaurants;
create trigger restaurants_qr_id_immutable
before update of qr_id on public.restaurants
for each row execute function public.prevent_restaurant_qr_change();

revoke all on function public.prevent_restaurant_qr_change() from public;

create or replace function public.record_queue_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event text;
  v_message text;
begin
  if tg_op = 'INSERT' then
    insert into public.queue_activity (
      restaurant_id, booking_id, actor_id, event_type, to_status, message
    ) values (
      new.restaurant_id, new.id, auth.uid(), 'joined', new.status,
      new.guest_name || ' joined the queue'
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.queue_activity (
      restaurant_id, booking_id, actor_id, event_type, from_status, to_status, message
    ) values (
      old.restaurant_id, old.id, auth.uid(), 'removed', old.status, 'removed',
      old.guest_name || ' was removed from booking history'
    );
    return old;
  end if;

  if old.status is distinct from new.status then
    v_event := case new.status
      when 'notified' then 'called'
      when 'seated' then 'seated'
      when 'completed' then 'completed'
      when 'cancelled' then 'cancelled'
      else null
    end;

    if v_event is not null then
      v_message := case v_event
        when 'called' then new.guest_name || ' was called'
        when 'seated' then new.guest_name || ' was seated'
        when 'completed' then new.guest_name || ' completed their visit'
        else new.guest_name || ' left the queue'
      end;

      insert into public.queue_activity (
        restaurant_id, booking_id, actor_id, event_type, from_status, to_status, message
      ) values (
        new.restaurant_id, new.id, auth.uid(), v_event, old.status, new.status, v_message
      );

      if new.status in ('notified', 'seated', 'completed', 'cancelled') then
        insert into public.guest_notifications (
          restaurant_id, booking_id, notification_type, title, message
        ) values (
          new.restaurant_id,
          new.id,
          v_event,
          case new.status
            when 'notified' then 'Your table is ready'
            when 'seated' then 'You have been seated'
            when 'completed' then 'Thanks for visiting'
            else 'Queue entry cancelled'
          end,
          v_message
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_record_queue_activity on public.bookings;
create trigger bookings_record_queue_activity
after insert or update or delete on public.bookings
for each row execute function public.record_queue_activity();

revoke all on function public.record_queue_activity() from public;

create or replace function public.get_public_restaurant(p_qr_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant public.restaurants%rowtype;
begin
  select * into v_restaurant
  from public.restaurants
  where qr_id = p_qr_id;

  if not found then return null; end if;

  return jsonb_build_object(
    'id', v_restaurant.id,
    'name', v_restaurant.name,
    'slug', v_restaurant.slug,
    'qr_id', v_restaurant.qr_id,
    'description', v_restaurant.description,
    'address', v_restaurant.address,
    'phone', v_restaurant.phone,
    'whatsapp', v_restaurant.whatsapp,
    'logo_url', v_restaurant.logo_url,
    'cover_url', v_restaurant.cover_url,
    'is_open', v_restaurant.is_open,
    'queue_capacity', v_restaurant.queue_capacity,
    'avg_service_minutes', v_restaurant.avg_service_minutes,
    'opening_hours', v_restaurant.opening_hours,
    'created_at', v_restaurant.created_at,
    'updated_at', v_restaurant.updated_at
  );
end;
$$;

create or replace function public.get_public_queue_summary(p_qr_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant public.restaurants%rowtype;
  v_queue_count integer;
begin
  select * into v_restaurant
  from public.restaurants
  where qr_id = p_qr_id;

  if not found then return null; end if;

  select count(*) into v_queue_count
  from public.bookings
  where restaurant_id = v_restaurant.id
    and status in ('waiting', 'notified');

  return jsonb_build_object(
    'queue_count', v_queue_count,
    'avg_service_minutes', v_restaurant.avg_service_minutes
  );
end;
$$;

drop function if exists public.join_queue(uuid, text, text, integer, text, boolean);
create function public.join_queue(
  p_qr_id uuid,
  p_guest_name text,
  p_phone text default null,
  p_party_size integer default 1,
  p_table_preference text default 'any',
  p_whatsapp boolean default false,
  p_request_id uuid default null
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
  v_request_id uuid := coalesce(p_request_id, gen_random_uuid());
begin
  select * into v_restaurant
  from public.restaurants
  where qr_id = p_qr_id
  for update;

  if not found then raise exception 'Restaurant not found.'; end if;

  perform pg_advisory_xact_lock(hashtext(v_restaurant.id::text));

  select * into v_booking
  from public.bookings
  where restaurant_id = v_restaurant.id and request_id = v_request_id;

  if found then
    return to_jsonb(v_booking) || jsonb_build_object(
      'restaurant_name', v_restaurant.name,
      'restaurant_phone', v_restaurant.phone,
      'restaurant_address', v_restaurant.address,
      'restaurant_whatsapp', v_restaurant.whatsapp,
      'restaurant_description', v_restaurant.description,
      'restaurant_logo_url', v_restaurant.logo_url,
      'restaurant_cover_url', v_restaurant.cover_url
    );
  end if;

  if not v_restaurant.is_open then raise exception 'This restaurant has paused its waitlist.'; end if;
  if p_guest_name is null or char_length(trim(p_guest_name)) not between 1 and 100 then
    raise exception 'Enter your name to join the queue.';
  end if;
  if p_party_size is null or p_party_size not between 1 and 20 then
    raise exception 'Party size must be between 1 and 20.';
  end if;
  if p_whatsapp and nullif(trim(p_phone), '') is null then
    raise exception 'Add a WhatsApp number to receive WhatsApp updates.';
  end if;
  if p_table_preference not in ('any', 'indoor', 'outdoor', 'window') then
    raise exception 'Choose a valid table preference.';
  end if;

  select count(*) + 1 into v_position
  from public.bookings
  where restaurant_id = v_restaurant.id and status in ('waiting', 'notified');

  if v_position - 1 >= v_restaurant.queue_capacity then
    raise exception 'The waitlist is currently full.';
  end if;

  insert into public.bookings (
    restaurant_id, guest_user_id, request_id, booking_code, guest_name, phone,
    party_size, table_preference, position, estimated_wait_minutes, whatsapp_updates
  ) values (
    v_restaurant.id, auth.uid(), v_request_id,
    'GP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    trim(p_guest_name), nullif(trim(p_phone), ''), p_party_size,
    p_table_preference, v_position,
    (v_position - 1) * v_restaurant.avg_service_minutes, p_whatsapp
  ) returning * into v_booking;

  return to_jsonb(v_booking) || jsonb_build_object(
    'restaurant_name', v_restaurant.name,
    'restaurant_phone', v_restaurant.phone,
    'restaurant_address', v_restaurant.address,
    'restaurant_whatsapp', v_restaurant.whatsapp,
    'restaurant_description', v_restaurant.description,
    'restaurant_logo_url', v_restaurant.logo_url,
    'restaurant_cover_url', v_restaurant.cover_url
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
  select * into v_booking
  from public.bookings
  where guest_access_token = p_access_token;
  if not found then return null; end if;

  select * into v_restaurant
  from public.restaurants
  where id = v_booking.restaurant_id;

  select count(*) + 1 into v_position
  from public.bookings b
  where b.restaurant_id = v_booking.restaurant_id
    and b.status in ('waiting', 'notified')
    and (b.joined_at, b.id) < (v_booking.joined_at, v_booking.id);

  return to_jsonb(v_booking) || jsonb_build_object(
    'position', case when v_booking.status in ('waiting', 'notified') then v_position else 0 end,
    'estimated_wait_minutes', greatest(v_position - 1, 0) * v_restaurant.avg_service_minutes,
    'restaurant_name', v_restaurant.name,
    'restaurant_phone', v_restaurant.phone,
    'restaurant_address', v_restaurant.address,
    'restaurant_whatsapp', v_restaurant.whatsapp,
    'restaurant_description', v_restaurant.description,
    'restaurant_logo_url', v_restaurant.logo_url,
    'restaurant_cover_url', v_restaurant.cover_url
  );
end;
$$;

revoke all on function public.get_public_restaurant(uuid) from public;
grant execute on function public.get_public_restaurant(uuid) to anon, authenticated;

revoke all on function public.get_public_queue_summary(uuid) from public;
grant execute on function public.get_public_queue_summary(uuid) to anon, authenticated;

revoke all on function public.join_queue(uuid, text, text, integer, text, boolean, uuid) from public;
grant execute on function public.join_queue(uuid, text, text, integer, text, boolean, uuid) to anon, authenticated;

revoke all on function public.get_public_booking(uuid) from public;
grant execute on function public.get_public_booking(uuid) to anon, authenticated;
