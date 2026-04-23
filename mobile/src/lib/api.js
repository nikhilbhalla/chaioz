import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const BASE = Constants.expoConfig?.extra?.apiBaseUrl || 'https://late-night-chai-1.preview.emergentagent.com';

export const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 15000,
});

// Mobile platforms cannot use HttpOnly web cookies — swap to Bearer tokens
// persisted in SecureStore. The backend still accepts the same JWT via the
// Authorization header (falls back from the cookie reader in auth_utils).
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function setToken(token) {
  if (token) {
    await SecureStore.setItemAsync('access_token', token);
  } else {
    await SecureStore.deleteItemAsync('access_token');
  }
}

export function fmtAUD(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

export function formatApiError(err) {
  return err?.response?.data?.detail || err?.message || 'Something went wrong';
}
