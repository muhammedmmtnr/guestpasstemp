import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ApiError, setApiAccessTokenProvider } from '../lib/api'
import { authService, getAuthUser, getUserRole, pickAccessToken } from '../services/auth'

export const AUTH_SESSION_STORAGE_KEY = 'guestpass.auth.v1'
const AuthContext = createContext(null)

function readSession() {
  try {
    const isAdminPath = window.location.pathname.startsWith('/admin')
      || (
        window.location.pathname === '/login'
        && new URLSearchParams(window.location.search).get('from')?.startsWith('/admin')
      )
    const legacyKey = isAdminPath ? 'guestpass.admin.v1' : null
    const stored = JSON.parse(
      window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)
      || (legacyKey ? window.sessionStorage.getItem(legacyKey) : null)
      || 'null',
    )
    if (typeof stored?.token !== 'string' || !stored.user || typeof stored.user !== 'object') return null
    const session = { ...stored, role: stored.role || getUserRole(stored.user) }
    if (legacyKey) {
      persistSession(session)
      window.sessionStorage.removeItem(legacyKey)
    }
    return session
  } catch {
    window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
    return null
  }
}

function persistSession(session) {
  if (!session) {
    window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
    return
  }
  window.sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({
    ...session,
    access_token: session.token,
  }))
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setApiAccessTokenProvider(() => readSession()?.token || null, 'user')
    setIsLoading(false)

    function handleUnauthorized() {
      persistSession(null)
      setSession(null)
    }
    window.addEventListener('guestpass:unauthorized', handleUnauthorized)
    window.addEventListener('guestpass:admin-unauthorized', handleUnauthorized)
    return () => {
      setApiAccessTokenProvider(null, 'user')
      window.removeEventListener('guestpass:unauthorized', handleUnauthorized)
      window.removeEventListener('guestpass:admin-unauthorized', handleUnauthorized)
    }
  }, [])

  const saveAuthResponse = useCallback((payload, allowedRoles) => {
    const token = pickAccessToken(payload)
    const user = getAuthUser(payload)
    if (!token || !user) {
      throw new ApiError('The API response did not include an authenticated session.', {
        code: 'INVALID_AUTH_RESPONSE',
      })
    }
    const role = getUserRole(user)
    if (allowedRoles?.length && !allowedRoles.includes(role)) {
      throw new ApiError('This account does not have permission to access this area.', {
        code: 'FORBIDDEN_ROLE',
      })
    }
    const nextSession = { token, user, role }
    persistSession(nextSession)
    setSession(nextSession)
    return nextSession
  }, [])

  const login = useCallback(async (email, password, { allowedRoles } = {}) => {
    const payload = await authService.signIn({ email: email.trim(), password })
    return saveAuthResponse(payload, allowedRoles)
  }, [saveAuthResponse])

  const signUp = useCallback(async (payload) => {
    const response = await authService.signUp(payload)
    const token = pickAccessToken(response)
    const user = getAuthUser(response)
    const authenticated = token && user
      ? saveAuthResponse(response)
      : null
    return { user, session: authenticated }
  }, [saveAuthResponse])

  const logout = useCallback(() => {
    persistSession(null)
    setSession(null)
  }, [])

  const value = useMemo(() => ({
    token: session?.token ?? null,
    user: session?.user ?? null,
    role: session?.role ?? '',
    session,
    isLoading,
    login,
    signUp,
    logout,
  }), [session, isLoading, login, signUp, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider.')
  return context
}
