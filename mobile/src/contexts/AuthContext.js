import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken } from '../lib/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/token', { email, password });
    await setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    await api.post('/auth/register', { name, email, password });
    // register does not return a token body — exchange for one
    return await login(email, password);
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    await setToken(null);
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
