import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  adaptUserListResponse,
  adminAuthApi,
  adminDashboardApi,
  adminUsersApi,
  ApiError,
  authApi,
  getUserRecordId,
  isSensitiveField,
  setAdminApiAccessTokenProvider,
  setApiAccessTokenProvider,
  usersApi,
} from './api.js';

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
  setAdminApiAccessTokenProvider(null);
  setApiAccessTokenProvider(null);
});

function mockFetch(response = new Response(null, { status: 204 })) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return response;
  };
  return calls;
}

test('sign-up and sign-in use POST and pass request payloads unchanged', async () => {
  const calls = mockFetch();
  const signUpPayload = { suppliedBy: 'caller' };
  const signInPayload = { suppliedBy: 'caller' };

  await authApi.signUp(signUpPayload);
  await authApi.signIn(signInPayload);

  assert.deepEqual(calls.map(({ url, options }) => [url, options.method, options.body]), [
    ['http://localhost:5173/api/auth/sign-up', 'POST', JSON.stringify(signUpPayload)],
    ['http://localhost:5173/api/auth/sign-in', 'POST', JSON.stringify(signInPayload)],
  ]);
});

test('profile updates use POST and uploads preserve FormData boundaries', async () => {
  const calls = mockFetch();
  const profilePayload = { suppliedBy: 'caller' };
  const formData = new FormData();
  formData.append('providedFieldName', new Blob(['image']), 'profile.png');

  await usersApi.updateMyProfile(profilePayload);
  await usersApi.updateMyProfileImage(formData);

  assert.equal(calls[0].url, 'http://localhost:5173/api/users/me/profile');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.body, JSON.stringify(profilePayload));
  assert.equal(calls[0].options.headers.get('content-type'), 'application/json');
  assert.equal(calls[1].url, 'http://localhost:5173/api/users/me/profile-image');
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(calls[1].options.body, formData);
  assert.equal(calls[1].options.headers.has('content-type'), false);
  assert.equal(calls[1].options.credentials, 'same-origin');
});

test('admin list uses the specified pagination defaults and filters', async () => {
  const calls = mockFetch();

  await adminUsersApi.list();
  await adminUsersApi.list({ page: 3, limit: 10, accountType: 'provided-filter' });

  assert.equal(
    calls[0].url,
    'http://localhost:5173/api/admin/users?page=1&limit=20&accountType=all',
  );
  assert.equal(
    calls[1].url,
    'http://localhost:5173/api/admin/users?page=3&limit=10&accountType=provided-filter',
  );
  assert.equal(calls[0].options.method, 'GET');
  assert.throws(() => adminUsersApi.list({ page: 0 }), RangeError);
});

test('admin details, status, and deletion use the specified methods and encoded IDs', async () => {
  const calls = mockFetch();
  const statusPayload = { suppliedBy: 'caller' };

  await adminUsersApi.get('user/id');
  await adminUsersApi.updateStatus('user/id', statusPayload);
  await adminUsersApi.delete('user/id');

  assert.deepEqual(calls.map(({ url, options }) => [url, options.method]), [
    ['http://localhost:5173/api/admin/users/user%2Fid', 'GET'],
    ['http://localhost:5173/api/admin/users/user%2Fid/status', 'POST'],
    ['http://localhost:5173/api/admin/users/user%2Fid', 'DELETE'],
  ]);
  assert.equal(calls[1].options.body, JSON.stringify(statusPayload));
  assert.equal(calls.every(({ options }) => options.credentials === 'same-origin'), true);
  assert.throws(() => adminUsersApi.get(''), TypeError);
});

test('API errors preserve backend messages and HTTP status codes', async () => {
  mockFetch(new Response(JSON.stringify({ message: 'Permission denied', code: 'FORBIDDEN' }), {
    status: 403,
    headers: { 'content-type': 'application/json' },
  }));

  await assert.rejects(adminUsersApi.list(), (error) => (
    error instanceof ApiError
    && error.status === 403
    && error.code === 'FORBIDDEN'
    && error.message === 'Permission denied'
  ));
});

test('API error messages redact bearer tokens and credential-like values', async () => {
  mockFetch(new Response(JSON.stringify({
    message: 'Bearer eyJhbGci.test.signature password=hunter2',
  }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  }));

  await assert.rejects(adminUsersApi.list(), (error) => (
    error instanceof ApiError
    && !error.message.includes('eyJhbGci')
    && !error.message.includes('hunter2')
    && error.message.includes('[redacted')
  ));
});

test('successful API responses reject unexpected non-JSON bodies', async () => {
  mockFetch(new Response('<html>proxy warning</html>', {
    status: 200,
    headers: { 'content-type': 'text/html' },
  }));

  await assert.rejects(adminUsersApi.list(), (error) => (
    error instanceof ApiError
    && error.status === 200
    && error.message === 'The API returned a non-JSON response.'
  ));
});

test('protected requests resolve their bearer token from the configured provider', async () => {
  const calls = mockFetch();
  setAdminApiAccessTokenProvider(async () => 'session-access-token');

  await adminUsersApi.list();

  assert.equal(calls[0].options.headers.get('authorization')?.startsWith('Bearer '), true);
});

test('super admin bootstrap and login use protected auth routes without sending existing tokens', async () => {
  const calls = mockFetch();
  setApiAccessTokenProvider(async () => 'regular-session-token');
  setAdminApiAccessTokenProvider(async () => 'admin-session-token');

  await adminAuthApi.bootstrap(
    { name: 'Owner', email: 'owner@example.test', password: 'valid-password' },
    'one-time-setup-key',
  );
  await adminAuthApi.login({ email: 'owner@example.test', password: 'valid-password' });

  assert.deepEqual(calls.map(({ url, options }) => [url, options.method, options.body]), [
    [
      'http://localhost:5173/api/admin/auth/bootstrap',
      'POST',
      JSON.stringify({ name: 'Owner', email: 'owner@example.test', password: 'valid-password' }),
    ],
    [
      'http://localhost:5173/api/admin/auth/login',
      'POST',
      JSON.stringify({ email: 'owner@example.test', password: 'valid-password' }),
    ],
  ]);
  assert.equal(calls[0].options.headers.get('x-setup-key'), 'one-time-setup-key');
  assert.equal(calls.every(({ options }) => !options.headers.has('authorization')), true);
});

test('admin API requests use the super admin token and support user creation and dashboard stats', async () => {
  const calls = mockFetch();
  setApiAccessTokenProvider(async () => 'regular-session-token');
  setAdminApiAccessTokenProvider(async () => 'super-admin-token');
  const newUser = { name: 'Admin', email: 'admin@example.test', password: 'valid-password', role: 'admin' };

  await adminUsersApi.create(newUser);
  await adminDashboardApi.stats();

  assert.deepEqual(calls.map(({ url, options }) => [url, options.method]), [
    ['http://localhost:5173/api/admin/users', 'POST'],
    ['http://localhost:5173/api/admin/dashboard/stats', 'GET'],
  ]);
  assert.equal(calls[0].options.body, JSON.stringify(newUser));
  assert.equal(calls.every(({ options }) => (
    options.headers.has('authorization')
  )), true);
});

test('admin 401 responses dispatch only the admin session-expired event', async () => {
  const events = [];
  globalThis.window = {
    location: { origin: 'http://localhost:5173' },
    dispatchEvent: (event) => events.push(event.type),
  };
  mockFetch(new Response(JSON.stringify({ message: 'Session expired' }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  }));
  setAdminApiAccessTokenProvider(async () => 'admin-token');

  await assert.rejects(adminDashboardApi.stats(), ApiError);

  assert.deepEqual(events, ['guestpass:admin-unauthorized']);
});

test('user response adaptation supports the isolated assumed list envelopes', () => {
  const topLevel = [{ id: '1' }];
  const wrapped = { data: { users: [{ userId: '2' }], pagination: { total: 1 } } };

  assert.deepEqual(adaptUserListResponse(topLevel), {
    users: topLevel,
    metadata: null,
    responseKeys: [],
  });
  assert.deepEqual(adaptUserListResponse(wrapped), {
    users: wrapped.data.users,
    metadata: wrapped.data.pagination,
    responseKeys: ['data'],
  });
  assert.equal(adaptUserListResponse({ unexpected: true }).users, null);
});

test('user identifiers are optional and sensitive fields can be excluded from display', () => {
  assert.equal(getUserRecordId({ id: 17 }), '17');
  assert.equal(getUserRecordId({ userId: 'abc' }), 'abc');
  assert.equal(getUserRecordId({ email: 'person@example.test' }), null);
  assert.equal(isSensitiveField('accessToken'), true);
  assert.equal(isSensitiveField('email'), false);
});
