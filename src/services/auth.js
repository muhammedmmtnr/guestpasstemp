import { apiClient } from '../lib/api.js'

export function pickAccessToken(payload) {
  const pending = [payload]
  const visited = new Set()
  while (pending.length) {
    const current = pending.shift()
    if (!current || typeof current !== 'object' || visited.has(current)) continue
    visited.add(current)
    for (const key of ['accessToken', 'access_token', 'token']) {
      if (typeof current[key] === 'string' && current[key].trim()) return current[key]
    }
    for (const key of ['data', 'session', 'auth', 'result']) {
      if (current[key] && typeof current[key] === 'object') pending.push(current[key])
    }
  }
  return null
}

export function getAuthUser(payload) {
  const pending = [payload]
  const visited = new Set()
  while (pending.length) {
    const current = pending.shift()
    if (!current || typeof current !== 'object' || visited.has(current)) continue
    visited.add(current)
    for (const key of ['user', 'admin']) {
      if (current[key] && typeof current[key] === 'object' && !Array.isArray(current[key])) {
        return current[key]
      }
    }
    if (['role', 'accountType', 'account_type'].some((key) => typeof current[key] === 'string')) {
      return current
    }
    for (const key of ['data', 'session', 'auth', 'result']) {
      if (current[key] && typeof current[key] === 'object') pending.push(current[key])
    }
  }
  return null
}

export function getUserRole(user) {
  const role = user?.role ?? user?.accountType ?? user?.account_type
  return typeof role === 'string' ? role.trim().toLowerCase().replace(/[\s-]+/g, '_') : ''
}

export const authService = {
  signUp(payload, config = {}) {
    return apiClient.post('auth/sign-up', payload, { ...config, authMode: config.authMode || 'none' })
      .then(({ data }) => data)
  },
  signIn(payload, config = {}) {
    return apiClient.post('auth/sign-in', payload, { ...config, authMode: config.authMode || 'none' })
      .then(({ data }) => data)
  },
}
