import { callQueueRpc, firstRow, requireSupabase } from './errors';

export async function getRestaurantBySlug(slug) {
  const restaurant = firstRow(await callQueueRpc('get_restaurant_by_slug', { p_slug: slug }));
  if (!restaurant) {
    throw new Error('This restaurant could not be found. Check the QR code and try again.');
  }

  return restaurant;
}

export async function createRestaurant({ name, slug, hours }) {
  return firstRow(await callQueueRpc('create_restaurant', {
    p_name: name,
    p_slug: slug,
    p_hours: hours ?? {},
  }));
}

export async function updateRestaurantSettings(restaurantId, settings) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('restaurants')
    .update({
      name: settings.name,
      hours: settings.hours,
      is_open: settings.isOpen,
      avg_wait_minutes: settings.averageWaitMinutes,
      max_party_size: settings.maxPartySize,
      queue_limit: settings.queueLimit,
      updated_at: new Date().toISOString(),
    })
    .eq('id', restaurantId)
    .select('id, name, slug, hours, is_open, avg_wait_minutes, max_party_size, queue_limit')
    .single();

  if (error) {
    throw new Error('Could not save restaurant settings. Check your permissions and try again.');
  }

  return data;
}

export async function listMyRestaurants(userId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('staff_members')
    .select('restaurant_id, role, email, restaurants(id, name, slug, hours, is_open, avg_wait_minutes, max_party_size, queue_limit)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error('Could not load your restaurant access. Please retry.');
  }

  return data ?? [];
}

export async function listRestaurantStaff(restaurantId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('staff_members')
    .select('user_id, email, role, created_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error('Could not load restaurant staff. Please retry.');
  }

  return data ?? [];
}

export async function inviteRestaurantStaff(restaurantId, email, role) {
  return firstRow(await callQueueRpc('create_staff_invitation', {
    p_restaurant_id: restaurantId,
    p_email: email,
    p_role: role,
  }));
}

export async function listStaffInvitations(restaurantId) {
  const data = await callQueueRpc('get_staff_invitations', { p_restaurant_id: restaurantId });
  return data ?? [];
}

export async function removeRestaurantStaff(restaurantId, userId) {
  const removed = await callQueueRpc('remove_staff_member', {
    p_restaurant_id: restaurantId,
    p_user_id: userId,
  });
  return removed === true;
}
