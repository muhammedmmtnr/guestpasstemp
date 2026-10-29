import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  adaptProfileResponse,
  buildAdminProfilePayload,
  buildAdminSignUpPayload,
  getAdminRole,
  getAuthUser,
  isAdminAccount,
  pickAccessToken,
  validateProfileImage,
} from './adminAuth.js';

test('access token picker supports supported keys and nested data', () => {
  for (const key of ['accessToken', 'access_token', 'token']) {
    assert.equal(pickAccessToken({ data: { session: { [key]: 'safe-token' } } }), 'safe-token');
  }
  assert.equal(pickAccessToken({ data: { user: { id: '1' } } }), null);
});

test('admin role check only accepts recognized admin account roles', () => {
  assert.equal(isAdminAccount({ role: 'admin' }), true);
  assert.equal(isAdminAccount({ accountType: 'SUPER_ADMIN' }), true);
  assert.equal(isAdminAccount({ account_type: 'administrator' }), true);
  assert.equal(isAdminAccount({ role: 'restaurant' }), false);
  assert.equal(isAdminAccount({ email: 'admin@example.test' }), false);
  assert.equal(getAdminRole({ account_type: ' Admin ' }), 'admin');
  assert.equal(getAuthUser({ data: { user: { role: 'admin' } } }).role, 'admin');
  assert.equal(getAuthUser({ data: { accountType: 'admin' } }).accountType, 'admin');
});

test('admin signup payload requires a backend-confirmed account type field and value', () => {
  assert.deepEqual(buildAdminSignUpPayload({
    name: '  Admin Name ',
    email: ' admin@example.test ',
    password: 'passphrase',
  }, { field: 'accountType', value: 'admin' }), {
    name: 'Admin Name',
    email: 'admin@example.test',
    password: 'passphrase',
    accountType: 'admin',
  });
  assert.throws(() => buildAdminSignUpPayload({
    name: 'Admin Name',
    email: 'admin@example.test',
    password: 'passphrase',
  }), /backend-confirmed account type/);
});

test('admin profile payload contains only fields changed from the loaded profile', () => {
  assert.deepEqual(buildAdminProfilePayload({
    fullName: '  Admin Name ',
    phone: ' 123 ',
    receiveWhatsAppUpdates: 1,
  }, {
    fullName: 'Existing Name',
    phone: '123',
    receiveWhatsAppUpdates: false,
  }), {
    fullName: 'Admin Name',
    receiveWhatsAppUpdates: true,
  });
  assert.deepEqual(adaptProfileResponse({
    success: true,
    data: { user: { fullName: 'Admin Name' } },
  }), { fullName: 'Admin Name' });
});

test('profile image validation accepts only JPEG, PNG, and WebP up to 5 MB', () => {
  assert.equal(validateProfileImage({ type: 'image/jpeg', size: 5 * 1024 * 1024 }).valid, true);
  assert.equal(validateProfileImage({ type: 'image/png', size: 100 }).valid, true);
  assert.equal(validateProfileImage({ type: 'image/webp', size: 100 }).valid, true);
  assert.equal(validateProfileImage({ type: 'image/gif', size: 100 }).valid, false);
  assert.equal(validateProfileImage({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 }).valid, false);
  assert.equal(validateProfileImage(null).valid, false);
});
