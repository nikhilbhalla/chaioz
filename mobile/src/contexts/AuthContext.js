import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { api, setToken } from '../lib/api';
import { unregisterPushToken } from '../lib/notifications';

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
    // Re-attach the device's existing push token to this newly-logged-in user.
    try {
      const t = await Notifications.getExpoPushTokenAsync();
      if (t?.data) await api.post('/devices/register', { token: t.data });
    } catch {}
    return data.user;
  };

  const register = async (name, email, password, phone) => {
    const payload = { name, email, password };
    if (phone) payload.phone = phone;
    await api.post('/auth/register', payload);
    // register does not return a token body — exchange for one
    return await login(email, password);
  };

  const logout = async () => {
    // Detach this device from receiving more pushes for the previous user.
    try {
      const t = await Notifications.getExpoPushTokenAsync();
      if (t?.data) await unregisterPushToken(t.data);
    } catch {}
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
