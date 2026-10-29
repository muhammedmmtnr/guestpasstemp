import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { setApiAccessTokenProvider } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = useAuth();

  useEffect(() => {
    function handleUnauthorized() {
      window.location.replace('/login?reason=expired&from=%2Fstaff');
    }

    window.addEventListener('guestpass:unauthorized', handleUnauthorized);
    setApiAccessTokenProvider(() => auth.token, 'staff');
    return () => {
      window.removeEventListener('guestpass:unauthorized', handleUnauthorized);
      setApiAccessTokenProvider(null, 'staff');
    };
  }, [auth.token]);

  const signIn = useCallback(async (email, password) => {
    return auth.login(email, password, { allowedRoles: ['staff', 'host', 'restaurant'] });
  }, [auth]);

  const signOut = useCallback(async () => {
    auth.logout();
  }, [auth]);

  const value = useMemo(() => ({
    isConfigured: true,
    configurationError: '',
    isLoading: auth.isLoading,
    session: auth.session,
    signIn,
    signOut,
  }), [auth.isLoading, auth.session, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
