import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { adminAuthApi, setAdminApiAccessTokenProvider } from './api';

const STORAGE_KEY = 'guestpass.super-admin.v1';
const AdminAuthContext = createContext(null);

function getRole(user) {
  return user?.role ?? user?.accountType ?? user?.account_type ?? '';
}

export function isSuperAdmin(user) {
  return typeof getRole(user) === 'string' && getRole(user).toLowerCase() === 'super_admin';
}

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
  const serialized = sessionStorage.getItem(STORAGE_KEY);
  if (!serialized) return null;

  try {
    const session = JSON.parse(serialized);
    if (typeof session?.token === 'string' && isSuperAdmin(session.user) && !isExpired(session.token)) {
      return session;
    }
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }

  sessionStorage.removeItem(STORAGE_KEY);
  return null;
}

function normalizeAuthResponse(payload) {
  const data = payload?.data ?? payload;
  const session = data?.session ?? data;
  const user = data?.user ?? data?.admin ?? session?.user ?? null;
  const token = session?.accessToken
    ?? session?.access_token
    ?? session?.token
    ?? data?.accessToken
    ?? data?.access_token
    ?? data?.token
    ?? null;

  return { user, token };
}

function getErrorMessage(error) {
  if (error?.status === 403 && error?.code === 'SUPER_ADMIN_EXISTS') {
    return 'A super admin account already exists. Sign in instead.';
  }
  return error?.message || 'The request could not be completed. Please try again.';
}

function withErrorDetails(error) {
  const wrapped = new Error(getErrorMessage(error), { cause: error });
  wrapped.status = error?.status;
  wrapped.code = error?.code;
  return wrapped;
}

export function isSuperAdminExistsError(error) {
  return error?.status === 403 && (
    error?.code === 'SUPER_ADMIN_EXISTS'
    || /super admin.{0,30}already exists|already exists.{0,30}super admin/i.test(error?.message || '')
  );
}

export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);
  const [isLoading, setIsLoading] = useState(true);
  const tokenRef = useRef(session?.token ?? null);
  tokenRef.current = session?.token ?? null;

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    tokenRef.current = null;
    setSession(null);
  }, []);

  const acceptAuthResponse = useCallback((payload) => {
    const { user, token } = normalizeAuthResponse(payload);
    if (!isSuperAdmin(user)) {
      throw new Error('Not authorized');
    }
    if (typeof token !== 'string' || token.trim() === '') {
      throw new Error('The API response did not include an access token.');
    }

    const nextSession = { user, token };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    tokenRef.current = token;
    setSession(nextSession);
  }, []);

  const bootstrap = useCallback(async (name, email, password, setupKey) => {
    try {
      const payload = await adminAuthApi.bootstrap({ name, email, password }, setupKey);
      acceptAuthResponse(payload);
    } catch (error) {
      throw withErrorDetails(error);
    }
  }, [acceptAuthResponse]);

  const signIn = useCallback(async (email, password) => {
    try {
      const payload = await adminAuthApi.login({ email, password });
      acceptAuthResponse(payload);
    } catch (error) {
      throw withErrorDetails(error);
    }
  }, [acceptAuthResponse]);

  const signOut = useCallback(() => {
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    setAdminApiAccessTokenProvider(() => tokenRef.current);
    setIsLoading(false);
    function handleUnauthorized() {
      clearSession();
      window.location.replace('/admin/login?reason=expired');
    }

    window.addEventListener('guestpass:admin-unauthorized', handleUnauthorized);
    return () => {
      setAdminApiAccessTokenProvider(null);
      window.removeEventListener('guestpass:admin-unauthorized', handleUnauthorized);
    };
  }, [clearSession]);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    isLoading,
    bootstrap,
    signIn,
    signOut,
  }), [session, isLoading, bootstrap, signIn, signOut]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider.');
  }
  return context;
}
