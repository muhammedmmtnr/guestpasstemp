import { createContext, useCallback, useContext, useMemo } from 'react'
import { useAuth } from '../auth/AuthContext'

const AdminAuthContext = createContext(null)
const ADMIN_ROLES = ['admin', 'super_admin', 'administrator']

export function AdminAuthProvider({ children }) {
  const auth = useAuth()

  const signIn = useCallback((email, password) => (
    auth.login(email, password, { allowedRoles: ADMIN_ROLES })
  ), [auth.login])

  const signOut = useCallback(() => {
    auth.logout()
  }, [auth.logout])

  const value = useMemo(() => ({
    session: auth.session,
    user: auth.user,
    isLoading: auth.isLoading,
    signIn,
    signOut,
  }), [auth.session, auth.user, auth.isLoading, signIn, signOut])

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider.')
  return context
}
