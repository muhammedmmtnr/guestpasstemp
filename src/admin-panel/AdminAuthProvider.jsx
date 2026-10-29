import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from './api';
import {
  ADMIN_SESSION_STORAGE_KEY,
  getAuthUser,
  isAdminAccount,
  pickAccessToken,
} from './adminAuth';

const LEGACY_SESSION_STORAGE_KEY = 'guestpass.super-admin.v1';
const AdminAuthContext = createContext(null);

function isExpired(token) {
  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return false;
    const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

function readStoredSession() {
  if (typeof window === 'undefined') return null;
  window.sessionStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
  const serialized = window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
  if (!serialized) return null;

  try {
    const session = JSON.parse(serialized);
    if (
      typeof session?.token === 'string'
      && session.user
      && typeof session.user === 'object'
      && !isExpired(session.token)
    ) {
      return session;
    }
  } catch {
    window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    return null;
  }

  window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  return null;
}

function getErrorMessage(error) {
  if (error?.status === 403) {
    return error.message || 'You do not have permission to perform this action.';
  }
  return error?.message || 'The request could not be completed. Please try again.';
}

function withErrorDetails(error) {
  const wrapped = new Error(getErrorMessage(error), { cause: error });
  wrapped.status = error?.status;
  wrapped.code = error?.code;
  return wrapped;
}

export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    setSession(null);
  }, []);

  const signIn = useCallback(async (email, password) => {
    clearSession();
    try {
      const payload = await authApi.signIn(
        { email: email.trim(), password },
        { authMode: 'none' },
      );
      const user = getAuthUser(payload);
      if (!isAdminAccount(user)) {
        clearSession();
        throw new Error('This account does not have admin access.');
      }

      const token = pickAccessToken(payload);
      if (!token) {
        clearSession();
        throw new Error('The API response did not include an access token.');
      }

      const nextSession = { user, token };
      window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
    } catch (error) {
      clearSession();
      throw withErrorDetails(error);
    }
  }, [clearSession]);

  const signOut = useCallback(() => {
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    setIsLoading(false);

    function handleUnauthorized() {
      clearSession();
      const from = `${window.location.pathname}${window.location.search}`;
      const query = new URLSearchParams({ reason: 'expired', from });
      window.location.replace(`/admin/login?${query}`);
    }

    window.addEventListener('guestpass:admin-unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('guestpass:admin-unauthorized', handleUnauthorized);
    };
  }, [clearSession]);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    isLoading,
    signIn,
    signOut,
  }), [session, isLoading, signIn, signOut]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider.');
  }

  return context;
}
