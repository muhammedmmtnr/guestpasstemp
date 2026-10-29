import { useEffect } from 'react'
import { useAuth } from './AuthContext'

export default function ProtectedRoute({ children, allowedRoles = [], redirectTo = '/login' }) {
  const { isLoading, session, role } = useAuth()
  const isAuthorized = Boolean(
    session?.token && (!allowedRoles.length || allowedRoles.includes(role)),
  )

  useEffect(() => {
    if (isLoading || isAuthorized) return
    const from = `${window.location.pathname}${window.location.search}`
    const query = new URLSearchParams({ from })
    window.location.replace(`${redirectTo}?${query}`)
  }, [isAuthorized, isLoading, redirectTo])

  if (isLoading) return <main className="app-loading" role="status">Checking your session…</main>
  if (!isAuthorized) return null
  return children
}
