const DEFAULT_API_BASE_URL = '/api';
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
let accessTokenProvider = null;
const DEFAULT_ORIGIN = 'http://localhost:5173';

const ERROR_MESSAGES = {
  400: 'The request was invalid.',
  401: 'Your session is missing or has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'The request conflicts with the current resource state.',
  422: 'Some submitted information could not be accepted.',
  500: 'The server encountered an error. Please try again later.',
};

export class ApiError extends Error {
  constructor(message, { status = 0, code } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function setApiAccessTokenProvider(provider) {
  if (provider !== null && typeof provider !== 'function') {
    throw new TypeError('The access token provider must be a function or null.');
  }

  accessTokenProvider = provider;
}

function getApiUrl(path, query) {
  const origin = typeof window === 'undefined' ? DEFAULT_ORIGIN : window.location.origin;
  const baseUrl = new URL(`${API_BASE_URL}/`, origin);
  const url = new URL(path.replace(/^\/+/, ''), baseUrl);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url;
}

function sanitizeErrorMessage(message) {
  return message
    .replace(/\bBearer\s+[^\s"'`,;]+/gi, 'Bearer [redacted]')
    .replace(/\b(?:eyJ[A-Za-z0-9_-]+\.)[A-Za-z0-9_.-]+/g, '[redacted token]')
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+/gi, '[redacted key]')
    .replace(/\b(password|access[_ -]?token|refresh[_ -]?token|api[_ -]?key)\s*[:=]\s*[^,\s;]+/gi, '$1=[redacted]');
}

async function request(path, { method = 'GET', body, query, signal, credentials = 'same-origin' } = {}) {
  const headers = new Headers();
  let requestBody;

  const token = accessTokenProvider ? await accessTokenProvider() : null;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (body instanceof FormData) {
    requestBody = body;
  } else if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    requestBody = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(getApiUrl(path, query), {
      method,
      headers,
      body: requestBody,
      credentials,
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }

    throw new ApiError('Unable to reach the API. Check your connection and API URL.');
  }

  const contentType = response.headers.get('content-type') || '';
  let responseBody;

  if (response.status !== 204) {
    if (contentType.includes('json')) {
      try {
        responseBody = await response.json();
      } catch {
        if (response.ok) {
          throw new ApiError('The API returned an invalid JSON response.', { status: response.status });
        }
      }
    } else {
      responseBody = await response.text();
      if (response.ok && responseBody) {
        throw new ApiError('The API returned a non-JSON response.', { status: response.status });
      }
    }
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('guestpass:unauthorized'));
    }

    const apiMessage = responseBody && typeof responseBody === 'object'
      ? [responseBody.message, responseBody.error].find((value) => typeof value === 'string')
      : undefined;
    const safeApiMessage = apiMessage ? sanitizeErrorMessage(apiMessage) : undefined;

    throw new ApiError(
      safeApiMessage || ERROR_MESSAGES[response.status] || `The API request failed (HTTP ${response.status}).`,
      { status: response.status, code: responseBody?.code },
    );
  }

  return responseBody;
}

function requireUserId(userId) {
  if (typeof userId !== 'string' || userId.trim() === '') {
    throw new TypeError('A user ID is required.');
  }

  return encodeURIComponent(userId);
}

function validateListOptions({ page, limit, accountType }) {
  if (!Number.isInteger(page) || page < 1) {
    throw new RangeError('page must be a positive integer.');
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('limit must be a positive integer.');
  }
  if (typeof accountType !== 'string' || accountType.trim() === '') {
    throw new TypeError('accountType must be a non-empty string.');
  }
}

export const authApi = {
  signUp: (payload, options) => request('auth/sign-up', {
    ...options,
    method: 'POST',
    body: payload,
  }),
  signIn: (payload, options) => request('auth/sign-in', {
    ...options,
    method: 'POST',
    body: payload,
  }),
};

export const usersApi = {
  updateMyProfile: (payload, options) => request('users/me/profile', {
    ...options,
    method: 'POST',
    body: payload,
  }),
  updateMyProfileImage: (formData, options) => {
    if (!(formData instanceof FormData)) {
      throw new TypeError('Profile image uploads require a FormData body.');
    }

    return request('users/me/profile-image', {
      ...options,
      method: 'POST',
      body: formData,
    });
  },
};

export const adminUsersApi = {
  list: ({ page = 1, limit = 20, accountType = 'all' } = {}, options) => {
    validateListOptions({ page, limit, accountType });
    return request('admin/users', {
      ...options,
      query: { page, limit, accountType },
    });
  },
  get: (userId, options) => request(`admin/users/${requireUserId(userId)}`, options),
  updateStatus: (userId, payload, options) => request(
    `admin/users/${requireUserId(userId)}/status`,
    {
      ...options,
      method: 'POST',
      body: payload,
    },
  ),
  delete: (userId, options) => request(`admin/users/${requireUserId(userId)}`, {
    ...options,
    method: 'DELETE',
  }),
};

export function adaptUserListResponse(payload) {
  const containers = [
    payload,
    payload && typeof payload === 'object' ? payload.data : null,
    payload && typeof payload === 'object' ? payload.result : null,
  ];
  const arrayKeys = ['users', 'items', 'results'];
  let users = null;
  let metadata = null;

  for (const container of containers) {
    if (Array.isArray(container)) {
      users = container;
      metadata = payload?.pagination || payload?.meta || null;
      break;
    }

    if (!container || typeof container !== 'object') {
      continue;
    }

    const key = arrayKeys.find((candidate) => Array.isArray(container[candidate]));
    if (key) {
      users = container[key];
      metadata = container.pagination || container.meta || payload?.pagination || payload?.meta || null;
      break;
    }
  }

  return {
    users,
    metadata: metadata && typeof metadata === 'object' ? metadata : null,
    responseKeys: payload && typeof payload === 'object' && !Array.isArray(payload)
      ? Object.keys(payload)
      : [],
  };
}

export function getUserRecordId(user) {
  if (!user || typeof user !== 'object' || Array.isArray(user)) {
    return null;
  }

  for (const key of ['id', 'userId', '_id']) {
    const value = user[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

export function isSensitiveField(key) {
  return /password|token|secret|credential|private.?key|reset.?code|otp|authorization|session/i.test(key);
}
