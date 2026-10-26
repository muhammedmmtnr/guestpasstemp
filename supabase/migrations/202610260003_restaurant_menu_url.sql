alter table public.restaurants
  add column if not exists menu_url text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.restaurants'::regclass
      and conname = 'restaurants_menu_url_check'
  ) then
    alter table public.restaurants
      add constraint restaurants_menu_url_check
      check (
        menu_url is null or (
          char_length(menu_url) <= 2048
          and menu_url ~* '^https?://[^[:space:]/?#]+([/?#].*)?$'
        )
      ) not valid;
  end if;
end;
$$;

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
    'menu_url', v_restaurant.menu_url,
    'is_open', v_restaurant.is_open,
    'queue_capacity', v_restaurant.queue_capacity,
    'avg_service_minutes', v_restaurant.avg_service_minutes,
    'opening_hours', v_restaurant.opening_hours,
    'created_at', v_restaurant.created_at,
    'updated_at', v_restaurant.updated_at
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
    'restaurant_cover_url', v_restaurant.cover_url,
    'restaurant_menu_url', v_restaurant.menu_url
  );
end;
$$;

revoke all on function public.get_public_restaurant(uuid) from public;
grant execute on function public.get_public_restaurant(uuid) to anon, authenticated;

revoke all on function public.get_public_booking(uuid) from public;
grant execute on function public.get_public_booking(uuid) to anon, authenticated;
