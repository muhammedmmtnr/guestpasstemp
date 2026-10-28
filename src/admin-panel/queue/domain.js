export const QUEUE_STATUSES = Object.freeze([
  'WAITING',
  'READY',
  'SEATED',
  'CANCELLED',
  'NO_SHOW',
]);

const ALLOWED_TRANSITIONS = Object.freeze({
  WAITING: ['READY', 'CANCELLED', 'NO_SHOW'],
  READY: ['SEATED', 'CANCELLED', 'NO_SHOW'],
  SEATED: [],
  CANCELLED: ['WAITING'],
  NO_SHOW: ['WAITING'],
});

export function canTransitionQueueStatus(currentStatus, nextStatus) {
  return ALLOWED_TRANSITIONS[currentStatus]?.includes(nextStatus) ?? false;
}

export function validateGuestInput({ name, partySize, phone }, maxPartySize) {
  const errors = {};
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';

  if (!normalizedName || normalizedName.length > 120) {
    errors.name = 'Enter a name between 1 and 120 characters.';
  }

  const numericPartySize = Number(partySize);
  if (!Number.isInteger(numericPartySize) || numericPartySize < 1 || numericPartySize > maxPartySize) {
    errors.partySize = `Choose a party size from 1 to ${maxPartySize}.`;
  }

  if (normalizedPhone.length > 40) {
    errors.phone = 'Phone number must be 40 characters or fewer.';
  }

  return {
    errors,
    value: {
      name: normalizedName,
      partySize: numericPartySize,
      phone: normalizedPhone || null,
    },
  };
}

export function createGuestCapabilityToken() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure browser randomness is required to join the queue.');
  }

  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function estimateWaitMinutes(waitingAhead, averageWaitMinutes) {
  const count = Number(waitingAhead);
  const interval = Number(averageWaitMinutes);
  if (!Number.isFinite(count) || count < 0 || !Number.isFinite(interval) || interval < 0) {
    return null;
  }

  return Math.round(count * interval);
}
