import { supabase, supabaseConfigurationError } from '../supabase';
import { getQueueErrorMessage } from './errorMessages';

export { getQueueErrorMessage };

export function requireSupabase() {
  if (!supabase) {
    throw new Error(supabaseConfigurationError || 'Supabase is not configured.');
  }

  return supabase;
}

export async function callQueueRpc(name, args) {
  const client = requireSupabase();
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw new Error(getQueueErrorMessage(error));
  }

  return data;
}

export function firstRow(data) {
  return Array.isArray(data) ? data[0] ?? null : data ?? null;
}
