import { createClient } from '@supabase/supabase-js';

const env = import.meta.env || {};
const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
const supabasePublicKey = (
  env.VITE_SUPABASE_PUBLISHABLE_KEY
  || env.VITE_SUPABASE_ANON_KEY
)?.trim();

function isServiceRoleKey(key) {
  if (/^(sb_secret_|service_role)/i.test(key)) {
    return true;
  }

  const payload = key.split('.')[1];
  if (!payload || typeof atob !== 'function') {
    return false;
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')));
    return claims.role === 'service_role';
  } catch {
    return false;
  }
}

function isValidSupabaseUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

export const supabaseConfigError = !supabaseUrl || !supabasePublicKey
  ? 'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) in .env.local.'
  : !isValidSupabaseUrl(supabaseUrl)
    ? 'VITE_SUPABASE_URL must be an HTTPS URL (localhost is allowed for development).'
    : isServiceRoleKey(supabasePublicKey)
      ? 'A service-role key cannot be used in the frontend. Configure only a Supabase publishable/anon key.'
      : '';

let storage = null;
let storageConfigError = '';
if (!supabaseConfigError) {
  try {
    storage = window.sessionStorage;
  } catch {
    storageConfigError = 'Browser session storage is unavailable; Supabase Auth cannot persist a tab-scoped session.';
  }
}

export const supabaseConfigurationError = supabaseConfigError || storageConfigError;
export const supabase = supabaseConfigurationError
  ? null
  : createClient(supabaseUrl, supabasePublicKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storage: window.sessionStorage,
      storageKey: 'guestpass-supabase-session',
    },
  });
