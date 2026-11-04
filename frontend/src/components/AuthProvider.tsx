import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext } from '../context/AuthContext';
import { api, getAuthToken, setAuthToken } from '../services/api';
import type { AuthUser, LoginResponse } from '../types/auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      if (!getAuthToken()) {
        setReady(true);
        return;
      }

      try {
        const { data } = await api.get<AuthUser>('/auth/me');
        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) setAuthToken(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void restore();

    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);

    return () => {
      cancelled = true;
      window.removeEventListener('auth:logout', onLogout);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    setAuthToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // The local session is cleared even if the token was already invalid.
    } finally {
      setAuthToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
