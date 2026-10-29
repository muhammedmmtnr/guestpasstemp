import { apiClient } from '../lib/api.js'

function requireUserId(userId) {
  if ((typeof userId !== 'string' && typeof userId !== 'number') || String(userId).trim() === '') {
    throw new TypeError('A user ID is required.')
  }
  return encodeURIComponent(String(userId))
}

export function validateListOptions({ page, limit, accountType }) {
  if (!Number.isInteger(page) || page < 1) throw new RangeError('page must be a positive integer.')
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('limit must be a positive integer.')
  if (typeof accountType !== 'string' || accountType.trim() === '') {
    throw new TypeError('accountType must be a non-empty string.')
  }
}

export const adminUsersService = {
  list({ page = 1, limit = 20, accountType = 'all' } = {}, config = {}) {
    validateListOptions({ page, limit, accountType })
    return apiClient.get('admin/users', {
      ...config,
      authMode: 'admin',
      params: { page, limit, accountType },
    }).then(({ data }) => data)
  },
  get(userId, config = {}) {
    return apiClient.get(`admin/users/${requireUserId(userId)}`, {
      ...config,
      authMode: 'admin',
    }).then(({ data }) => data)
  },
  updateStatus(userId, payload, config = {}) {
    return apiClient.post(`admin/users/${requireUserId(userId)}/status`, payload, {
      ...config,
      authMode: 'admin',
    }).then(({ data }) => data)
  },
  delete(userId, config = {}) {
    return apiClient.delete(`admin/users/${requireUserId(userId)}`, {
      ...config,
      authMode: 'admin',
    }).then(({ data }) => data)
  },
}

export function adaptUserListResponse(payload) {
  const containers = [
    payload,
    payload && typeof payload === 'object' ? payload.data : null,
    payload && typeof payload === 'object' ? payload.result : null,
  ]
  let users = null
  let metadata = null

  for (const container of containers) {
    if (Array.isArray(container)) {
      users = container
      metadata = payload?.pagination || payload?.meta || null
      break
    }
    if (!container || typeof container !== 'object') continue
    const key = ['users', 'items', 'results'].find((candidate) => Array.isArray(container[candidate]))
    if (key) {
      users = container[key]
      metadata = container.pagination || container.meta || payload?.pagination || payload?.meta || null
      break
    }
  }
  return {
    users,
    metadata: metadata && typeof metadata === 'object' ? metadata : null,
    responseKeys: payload && typeof payload === 'object' && !Array.isArray(payload)
      ? Object.keys(payload)
      : [],
  }
}

export function getUserRecordId(user) {
  if (!user || typeof user !== 'object' || Array.isArray(user)) return null
  for (const key of ['id', 'userId', '_id']) {
    const value = user[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

export function isSensitiveField(key) {
  return /password|token|secret|credential|private.?key|reset.?code|otp|authorization|session/i.test(key)
}

export const adminDashboardService = {
  stats(config = {}) {
    return apiClient.get('admin/dashboard/stats', {
      ...config,
      authMode: 'admin',
    }).then(({ data }) => data)
  },
}
