import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, setApiAccessTokenProvider } from './api';
import { pickAccessToken } from './adminAuth';

const AuthContext = createContext(null);
const STORAGE_KEY = 'guestpass.staff.v1';

function readStaffSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    return typeof session?.token === 'string' ? session : null;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStaffSession);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function handleUnauthorized() {
      sessionStorage.removeItem(STORAGE_KEY);
      setSession(null);
      window.location.replace('/staff/login?reason=expired');
    }

    window.addEventListener('guestpass:unauthorized', handleUnauthorized);
    setApiAccessTokenProvider(() => readStaffSession()?.token ?? null);
    setIsLoading(false);
    return () => {
      window.removeEventListener('guestpass:unauthorized', handleUnauthorized);
      setApiAccessTokenProvider(null);
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const payload = await authApi.signIn({ email, password }, { authMode: 'none' });
    const token = pickAccessToken(payload);
    const user = payload?.data?.user ?? payload?.user ?? null;
    if (!token || !user) {
      throw new Error('The API response did not include an authenticated session.');
    }

    const nextSession = { token, user };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    return nextSession;
  }, []);

  const signOut = useCallback(async () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const value = useMemo(() => ({
    isConfigured: true,
    configurationError: '',
    isLoading,
    session,
    signIn,
    signOut,
  }), [isLoading, session, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
