export const ADMIN_SESSION_STORAGE_KEY = 'guestpass.admin.v1';
export const ADMIN_ACCOUNT_TYPE_CONTRACT = null;

export function pickAccessToken(payload) {
  const pending = [payload];
  const visited = new Set();

  while (pending.length > 0) {
    const current = pending.shift();
    if (!current || typeof current !== 'object' || visited.has(current)) continue;
    visited.add(current);

    for (const key of ['accessToken', 'access_token', 'token']) {
      const value = current[key];
      if (typeof value === 'string' && value.trim() !== '') return value;
    }

    for (const key of ['data', 'session', 'auth', 'result']) {
      if (current[key] && typeof current[key] === 'object') pending.push(current[key]);
    }
  }

  return null;
}

export function getAuthUser(payload) {
  const pending = [payload];
  const visited = new Set();

  while (pending.length > 0) {
    const current = pending.shift();
    if (!current || typeof current !== 'object' || visited.has(current)) continue;
    visited.add(current);

    for (const key of ['user', 'admin']) {
      if (current[key] && typeof current[key] === 'object' && !Array.isArray(current[key])) {
        return current[key];
      }
    }

    if (['role', 'accountType', 'account_type'].some((key) => typeof current[key] === 'string')) {
      return current;
    }

    for (const key of ['data', 'session', 'auth', 'result']) {
      if (current[key] && typeof current[key] === 'object') pending.push(current[key]);
    }
  }

  return null;
}

export function getAdminRole(user) {
  const value = user?.role ?? user?.accountType ?? user?.account_type;
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isAdminAccount(user) {
  return ['admin', 'super_admin', 'administrator'].includes(getAdminRole(user));
}

export function buildAdminSignUpPayload({ name, email, password }, accountTypeContract) {
  if (
    !accountTypeContract
    || typeof accountTypeContract.field !== 'string'
    || !/^[A-Za-z][A-Za-z0-9_]*$/.test(accountTypeContract.field)
    || typeof accountTypeContract.value !== 'string'
    || accountTypeContract.value.trim() === ''
  ) {
    throw new Error('Admin sign-up requires the backend-confirmed account type field and value.');
  }

  return {
    name: name.trim(),
    email: email.trim(),
    password,
    [accountTypeContract.field]: accountTypeContract.value,
  };
}

export function buildAdminProfilePayload(form, original = {}) {
  const fields = {
    fullName: form.fullName.trim(),
    phone: form.phone.trim(),
    receiveWhatsAppUpdates: Boolean(form.receiveWhatsAppUpdates),
  };
  const originalFields = {
    fullName: original.fullName ?? original.full_name ?? '',
    phone: original.phone ?? '',
    receiveWhatsAppUpdates: Boolean(original.receiveWhatsAppUpdates ?? original.receive_whatsapp_updates),
  };

  return Object.fromEntries(
    Object.entries(fields).filter(([key, value]) => value !== originalFields[key]),
  );
}

export function adaptProfileResponse(payload) {
  const data = payload?.data ?? payload;
  const user = data?.user ?? data?.profile ?? data;
  return user && typeof user === 'object' && !Array.isArray(user) ? user : null;
}

export function validateProfileImage(file) {
  if (!file || typeof file !== 'object') {
    return { valid: false, error: 'Choose a JPEG, PNG, or WebP image.' };
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { valid: false, error: 'Choose a JPEG, PNG, or WebP image.' };
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'Choose an image smaller than or equal to 5 MB.' };
  }
  return { valid: true, error: '' };
}

export function getStoredAdminAccessToken() {
  if (typeof window === 'undefined') return null;

  try {
    const serialized = window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (!serialized) return null;
    const session = JSON.parse(serialized);
    return isAdminAccount(session?.user) ? pickAccessToken(session) : null;
  } catch {
    try {
      window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    } catch {
      return null;
    }
    return null;
  }
}
