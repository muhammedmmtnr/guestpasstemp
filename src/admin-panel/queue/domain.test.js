import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canTransitionQueueStatus,
  estimateWaitMinutes,
  validateGuestInput,
} from './domain.js';
import { getQueueErrorMessage } from './errorMessages.js';

test('queue transitions allow the requested flow and terminal outcomes', () => {
  assert.equal(canTransitionQueueStatus('WAITING', 'READY'), true);
  assert.equal(canTransitionQueueStatus('READY', 'SEATED'), true);
  assert.equal(canTransitionQueueStatus('WAITING', 'SEATED'), false);
  assert.equal(canTransitionQueueStatus('SEATED', 'WAITING'), false);
  assert.equal(canTransitionQueueStatus('CANCELLED', 'WAITING'), true);
});

test('guest input validation normalizes supported values and rejects invalid input', () => {
  const valid = validateGuestInput({ name: '  Sam  ', partySize: '4', phone: ' ' }, 6);
  assert.deepEqual(valid, {
    errors: {},
    value: { name: 'Sam', partySize: 4, phone: null },
  });

  const invalid = validateGuestInput({ name: ' ', partySize: 7, phone: 'x'.repeat(41) }, 6);
  assert.deepEqual(Object.keys(invalid.errors).sort(), ['name', 'partySize', 'phone']);
});

test('estimated wait uses only finite, non-negative values', () => {
  assert.equal(estimateWaitMinutes(3, 8), 24);
  assert.equal(estimateWaitMinutes(-1, 8), null);
  assert.equal(estimateWaitMinutes(2, Number.NaN), null);
});

test('database permission and queue-capacity errors are presented without raw server detail', () => {
  assert.equal(getQueueErrorMessage({ code: '42501' }), 'You do not have permission to perform this action.');
  assert.equal(
    getQueueErrorMessage({ code: 'P0001', message: 'This restaurant’s queue is currently full.' }),
    'The queue is full right now. Please try again later.',
  );
  assert.equal(getQueueErrorMessage({ code: 'unexpected', message: 'private database detail' }), 'We could not complete that request. Check your connection and try again.');
});
