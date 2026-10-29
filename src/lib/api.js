import axios from 'axios'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/+$/, '')
const SESSION_KEYS = {
  user: 'guestpass.auth.v1',
  admin: 'guestpass.auth.v1',
  staff: 'guestpass.staff.v1',
}
const tokenProviders = new Map()

export class ApiError extends Error {
  constructor(message, { status = null, code = 'API_ERROR', details = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function getStoredToken(authMode) {
  if (typeof window === 'undefined' || authMode === 'none') return null

  const keys = authMode === 'admin'
    ? [SESSION_KEYS.admin, 'guestpass.admin.v1']
    : authMode === 'staff'
      ? [SESSION_KEYS.staff]
      : [SESSION_KEYS.user]

  for (const key of keys) {
    try {
      const session = JSON.parse(window.sessionStorage.getItem(key) || 'null')
      const token = session?.access_token ?? session?.accessToken ?? session?.token
      if (typeof token === 'string' && token.trim()) return token
    } catch {
      window.sessionStorage.removeItem(key)
    }
  }

  return null
}

function clearStoredSession(authMode) {
  if (typeof window === 'undefined') return
  const keys = authMode === 'admin'
    ? [SESSION_KEYS.admin, 'guestpass.admin.v1']
    : authMode === 'staff'
      ? [SESSION_KEYS.staff]
      : [SESSION_KEYS.user]
  for (const key of keys) window.sessionStorage.removeItem(key)
}

function safeMessage(message) {
  return String(message || 'The request could not be completed.')
    .replace(/\bBearer\s+[^\s"'`,;]+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+\b/g, '[redacted token]')
    .replace(/\b(password|access[_ -]?token|refresh[_ -]?token|api[_ -]?key)\s*[:=]\s*[^,\s;]+/gi, '$1=[redacted]')
}

function responseErrorMessage(payload) {
  if (typeof payload === 'string') return payload
  return payload?.message
    || (typeof payload?.error === 'string' ? payload.error : payload?.error?.message)
    || payload?.detail
    || 'The request could not be completed.'
}

export function setApiAccessTokenProvider(provider, authMode = 'user') {
  if (provider !== null && typeof provider !== 'function') {
    throw new TypeError('The access token provider must be a function or null.')
  }
  if (provider) tokenProviders.set(authMode, provider)
  else tokenProviders.delete(authMode)
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  adapter: 'fetch',
  headers: {
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
})

apiClient.interceptors.request.use(async (config) => {
  if (!config.baseURL && !API_BASE_URL && typeof window !== 'undefined') {
    throw new ApiError('NEXT_PUBLIC_API_URL is not configured for this environment.', {
      code: 'API_NOT_CONFIGURED',
    })
  }

  const authMode = config.authMode || 'user'
  config.authMode = authMode
  const tokenProvider = tokenProviders.get(authMode)
  const token = tokenProvider ? await tokenProvider() : getStoredToken(authMode)
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  config.headers.set('ngrok-skip-browser-warning', 'true')
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    const contentType = response.headers?.get?.('content-type')
      ?? response.headers?.['content-type']
      ?? ''
    if (
      response.data !== null
      && response.data !== undefined
      && response.data !== ''
      && !contentType.includes('json')
    ) {
      throw new ApiError('The API returned a non-JSON response.', {
        status: response.status,
        code: 'INVALID_RESPONSE',
      })
    }
    if (response.data?.success === false) {
      throw new ApiError(safeMessage(responseErrorMessage(response.data)), {
        status: response.status,
        code: response.data?.code || 'API_ERROR',
        details: response.data,
      })
    }
    return response
  },
  (error) => {
    if (axios.isCancel(error)) {
      error.name = 'AbortError'
      return Promise.reject(error)
    }

    const response = error.response
    if (!response) {
      if (error instanceof ApiError) return Promise.reject(error)
      return Promise.reject(new ApiError(
        error.code === 'ECONNABORTED'
          ? 'The backend request timed out. Please try again.'
          : 'Could not connect to the GuestPass backend. Check your connection and try again.',
        { code: error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK_ERROR' },
      ))
    }

    const authMode = error.config?.authMode || 'user'
    const status = Number(response.data?.statusCode) || response.status
    if (status === 401 && authMode !== 'none') {
      clearStoredSession(authMode)
      if (typeof window !== 'undefined') {
        const from = `${window.location.pathname}${window.location.search}`
        const query = new URLSearchParams({ reason: 'expired', from })
        window.dispatchEvent(new CustomEvent(
          authMode === 'admin' ? 'guestpass:admin-unauthorized' : 'guestpass:unauthorized',
        ))
        if (typeof window.location.replace === 'function') {
          window.location.replace(`/login?${query}`)
        }
      }
    }

    return Promise.reject(new ApiError(safeMessage(responseErrorMessage(response.data)), {
      status,
      code: response.data?.code || 'HTTP_ERROR',
      details: response.data,
    }))
  },
)
