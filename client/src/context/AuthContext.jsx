import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, institution: null, loading: true });

  const apply = (session) => setState({ user: session?.user ?? null, institution: session?.institution ?? null, loading: false });

  // Restore the session from the httpOnly cookie on page load.
  useEffect(() => {
    authApi.me().then(apply).catch(() => apply(null));
  }, []);

  // A data call got 401 (session expired): drop to the login screen.
  useEffect(() => {
    const onExpired = () => apply(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(async (email, password) => { const s = await authApi.login(email, password); apply(s); return s; }, []);
  const register = useCallback(async (data) => { const s = await authApi.registerInstitution(data); apply(s); return s; }, []);
  const logout = useCallback(async () => { try { await authApi.logout(); } finally { apply(null); } }, []);
  const changePassword = useCallback(async (current, next) => { const s = await authApi.changePassword(current, next); apply(s); return s; }, []);
  const setInstitution = useCallback((institution) => setState((s) => ({ ...s, institution })), []);

  const value = useMemo(() => ({
    ...state, isAdmin: state.user?.role === 'admin', login, register, logout, changePassword, setInstitution,
  }), [state, login, register, logout, changePassword, setInstitution]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
