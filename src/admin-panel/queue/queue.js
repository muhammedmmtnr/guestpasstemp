import { callQueueRpc, firstRow, requireSupabase } from './errors';

export async function joinQueue({ slug, name, partySize, phone, guestToken, tableLabel }) {
  return firstRow(await callQueueRpc('join_queue', {
    p_restaurant_slug: slug,
    p_guest_name: name,
    p_party_size: partySize,
    p_phone: phone,
    p_guest_token: guestToken,
    p_table_label: tableLabel ?? null,
  }));
}

export async function getGuestQueueEntry(guestToken) {
  return firstRow(await callQueueRpc('get_guest_queue_entry', { p_guest_token: guestToken }));
}

export async function cancelGuestQueueEntry(guestToken) {
  return callQueueRpc('cancel_guest_queue_entry', { p_guest_token: guestToken });
}

export async function listQueueEntries(restaurantId) {
  const client = requireSupabase();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data, error } = await client
    .from('queue_entries')
    .select('id, restaurant_id, guest_name, party_size, phone, table_label, status, position, created_at, updated_at, ready_at, seated_at, cancelled_at, no_show_at')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', start.toISOString())
    .order('position', { ascending: true });

  if (error) {
    throw new Error('Could not load the live queue. Check your access and retry.');
  }

  return data ?? [];
}

export async function addWalkIn({ restaurantId, name, partySize, phone, tableLabel }) {
  return firstRow(await callQueueRpc('add_walk_in', {
    p_restaurant_id: restaurantId,
    p_guest_name: name,
    p_party_size: partySize,
    p_phone: phone,
    p_table_label: tableLabel,
  }));
}

export async function transitionQueueEntry(entryId, status) {
  return firstRow(await callQueueRpc('transition_queue_entry', {
    p_entry_id: entryId,
    p_next_status: status,
  }));
}

export function notifyGuest() {
  throw new Error('Guest notifications are not configured. Use the live status page until a notification provider is added.');
}

export async function getTodayQueueEntries(restaurantId) {
  const client = requireSupabase();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data, error } = await client
    .from('queue_entries')
    .select('id, status, party_size, created_at, ready_at, seated_at, no_show_at')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', start.toISOString());

  if (error) {
    throw new Error('Could not load today’s queue analytics. Please retry.');
  }

  return data ?? [];
}

export function subscribeToRestaurantQueue(restaurantId, onChange, onError) {
  const client = requireSupabase();
  const channel = client
    .channel(`restaurant-queue:${restaurantId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'queue_entries',
      filter: `restaurant_id=eq.${restaurantId}`,
    }, onChange)
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError?.(new Error('Live updates are temporarily unavailable. The queue will still refresh manually.'));
      }
    });

  return () => {
    client.removeChannel(channel);
  };
}

export function subscribeToGuestEntry(entryId, onChange, onError) {
  const client = requireSupabase();
  const channel = client
    .channel(`entry:${entryId}`, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'guest_status_changed' }, (message) => {
      if (message?.payload?.entry_id === entryId) {
        onChange?.();
      }
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError?.(new Error('Live updates are temporarily unavailable. Status will refresh automatically.'));
      }
    });

  return () => {
    client.removeChannel(channel);
  };
}
