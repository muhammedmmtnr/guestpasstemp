const API_BASE_URL = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')
const AUTH_STORAGE_KEY = 'guestpass.auth.v1'
const NGROK_WARNING_HEADER = 'ngrok-skip-browser-warning'
const REQUEST_TIMEOUT_MS = 15000

export class ApiError extends Error {
  constructor(message, { status = null, code = 'API_ERROR', details = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function getAccessToken() {
  const sessionValue = sessionStorage.getItem(AUTH_STORAGE_KEY)
  if (!sessionValue) return null

  const session = JSON.parse(sessionValue)
  return session?.access_token || session?.accessToken || session?.token || null
}

function getErrorMessage(payload) {
  if (typeof payload === 'string' && payload.trim()) return payload
  if (!payload || typeof payload !== 'object') return 'The request could not be completed.'

  if (typeof payload.message === 'string') return payload.message
  if (typeof payload.error === 'string') return payload.error
  if (payload.error && typeof payload.error.message === 'string') return payload.error.message
  if (typeof payload.detail === 'string') return payload.detail

  const errors = Array.isArray(payload.errors) ? payload.errors : [payload.errors]
  const firstError = errors.find(Boolean)
  if (typeof firstError === 'string') return firstError
  if (firstError && typeof firstError.message === 'string') return firstError.message
  if (firstError && typeof firstError.error === 'string') return firstError.error

  return 'The request could not be completed.'
}

function clearSessionAndRedirect() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(AUTH_STORAGE_KEY)
  window.dispatchEvent(new Event('guestpass:unauthorized'))
}

async function parseResponse(response) {
  if (response.status === 204) return null

  const text = await response.text()
  if (!text) return null

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json') && !contentType.includes('+json')) return text

  try {
    return JSON.parse(text)
  } catch {
    throw new ApiError('The backend returned an invalid JSON response.', {
      status: response.status,
      code: 'INVALID_RESPONSE',
    })
  }
}

export async function apiRequest(path, { timeoutMs = REQUEST_TIMEOUT_MS, ...options } = {}) {
  if (!API_BASE_URL) {
    throw new ApiError('VITE_API_URL is not configured. Add it to .env and restart the app.', {
      code: 'API_NOT_CONFIGURED',
    })
  }

  const requestUrl = import.meta.env.DEV
    ? path
    : new URL(path, `${API_BASE_URL}/`).toString()
  const headers = new Headers(options.headers || {})
  headers.set(NGROK_WARNING_HEADER, 'true')
  headers.set('Accept', 'application/json')

  const isFormData = options.body instanceof FormData
  if (options.body !== undefined && options.body !== null && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getAccessToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(requestUrl, {
      ...options,
      headers,
      signal: controller.signal,
    })
    const payload = await parseResponse(response)

    if (!response.ok || payload?.success === false) {
      if (response.status === 401 || response.status === 403) clearSessionAndRedirect()
      throw new ApiError(getErrorMessage(payload), {
        status: response.status,
        code: payload?.code || 'HTTP_ERROR',
        details: payload,
      })
    }

    return payload
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error.name === 'AbortError') {
      throw new ApiError('The backend request timed out. Please try again.', { code: 'TIMEOUT' })
    }
    throw new ApiError('Could not connect to the GuestPass backend. Check your connection and try again.', {
      code: 'NETWORK_ERROR',
    })
  } finally {
    window.clearTimeout(timeout)
  }
}
