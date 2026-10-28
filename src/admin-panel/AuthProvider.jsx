import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { setApiAccessTokenProvider } from './api';
import { supabase, supabaseConfigurationError } from './supabase';

const AuthContext = createContext(null);

function getSignInError(error) {
  if (error?.name === 'AuthRetryableFetchError' || error instanceof TypeError) {
    return 'Could not reach Supabase Auth. Check your connection and project configuration.';
  }

  return 'Sign-in failed. Check your email and password, then try again.';
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const unauthorizedHandled = useRef(false);

  useEffect(() => {
    if (!supabase) {
      setApiAccessTokenProvider(null);
      setIsLoading(false);
      return undefined;
    }

    setApiAccessTokenProvider(async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw new Error('Unable to read the current Supabase session. Please sign in again.');
      }

      return data.session?.access_token ?? null;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
      if (nextSession) {
        unauthorizedHandled.current = false;
      }
    });

    async function handleUnauthorized() {
      if (unauthorizedHandled.current) {
        return;
      }

      unauthorizedHandled.current = true;
      const from = `${window.location.pathname}${window.location.search}`;

      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        window.sessionStorage.removeItem('guestpass-supabase-session');
      } finally {
        const query = new URLSearchParams({ reason: 'expired', from });
        window.location.replace(`/sign-in?${query}`);
      }
    }

    window.addEventListener('guestpass:unauthorized', handleUnauthorized);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('guestpass:unauthorized', handleUnauthorized);
      setApiAccessTokenProvider(null);
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) {
      throw new Error(supabaseConfigurationError);
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      throw new Error(getSignInError(error));
    }

    setSession(data.session);
    return data.session;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      throw new Error('Could not clear the local session. Please try again.');
    }
    setSession(null);
  }, []);

  const value = useMemo(() => ({
    isConfigured: Boolean(supabase),
    configurationError: supabaseConfigurationError,
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
