create table if not exists public.guest_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guest_reviews_restaurant_created_idx
  on public.guest_reviews (restaurant_id, created_at desc);

alter table public.guest_reviews enable row level security;

drop policy if exists "Owners can read restaurant guest reviews" on public.guest_reviews;
create policy "Owners can read restaurant guest reviews" on public.guest_reviews
for select to authenticated using (
  exists (
    select 1 from public.restaurants r
    where r.id = guest_reviews.restaurant_id
      and r.owner_id = (select auth.uid())
  )
);

revoke all on public.guest_reviews from public, anon;
grant select on public.guest_reviews to authenticated;

create or replace function public.get_public_review(p_access_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review public.guest_reviews%rowtype;
begin
  select review.* into v_review
  from public.guest_reviews review
  join public.bookings booking on booking.id = review.booking_id
  where booking.guest_access_token = p_access_token;

  if not found then return null; end if;
  return jsonb_build_object(
    'rating', v_review.rating,
    'updated_at', v_review.updated_at
  );
end;
$$;

create or replace function public.submit_public_review(
  p_access_token uuid,
  p_rating integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_review public.guest_reviews%rowtype;
begin
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Choose a rating from 1 to 5 stars.';
  end if;

  select * into v_booking
  from public.bookings
  where guest_access_token = p_access_token
    and status in ('seated', 'completed');

  if not found then
    raise exception 'A rating is available after the restaurant seats you.';
  end if;

  insert into public.guest_reviews (booking_id, restaurant_id, rating)
  values (v_booking.id, v_booking.restaurant_id, p_rating)
  on conflict (booking_id) do update
    set rating = excluded.rating, updated_at = now()
  returning * into v_review;

  return jsonb_build_object(
    'rating', v_review.rating,
    'updated_at', v_review.updated_at
  );
end;
$$;

revoke all on function public.get_public_review(uuid) from public;
grant execute on function public.get_public_review(uuid) to anon, authenticated;

revoke all on function public.submit_public_review(uuid, integer) from public;
grant execute on function public.submit_public_review(uuid, integer) to anon, authenticated;
