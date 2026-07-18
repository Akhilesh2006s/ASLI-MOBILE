import * as SecureStore from 'expo-secure-store';
import api, { AUTH_TOKEN_KEY, setInMemoryAuthToken } from './api';

const USER_ROLE_KEY = 'userRole';
const USER_EMAIL_KEY = 'userEmail';

const persistAuth = async (token, user) => {
  const role = user?.role || 'student';
  const email = user?.email || '';
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  // Keep interceptor auth in sync immediately after login.
  setInMemoryAuthToken(token);
  await SecureStore.setItemAsync(USER_ROLE_KEY, role);
  await SecureStore.setItemAsync(USER_EMAIL_KEY, email);
};

const clearAuth = async () => {
  setInMemoryAuthToken(null);
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_ROLE_KEY);
  await SecureStore.deleteItemAsync(USER_EMAIL_KEY);
};

const login = async ({ email, password }) => {
  const response = await api.post('/api/auth/login', { email, password });
  const data = response?.data || {};

  if (!data?.token || !data?.user) {
    throw new Error('Invalid login response from server.');
  }

  await persistAuth(data.token, data.user);
  return data;
};

const me = async () => {
  const response = await api.get('/api/auth/me');
  return response?.data;
};

const logout = async () => {
  try {
    await api.post('/api/auth/logout');
  } catch (_) {
    // Local logout should still complete even if server call fails.
  } finally {
    await clearAuth();
  }
};

const register = async (payload) => {
  const response = await api.post('/api/auth/register', payload);
  return response?.data;
};

const getStoredAuth = async () => {
  const token = (await SecureStore.getItemAsync(AUTH_TOKEN_KEY)) || null;
  if (token) {
    setInMemoryAuthToken(token);
  }
  return {
    token,
    role: (await SecureStore.getItemAsync(USER_ROLE_KEY)) || null,
    email: (await SecureStore.getItemAsync(USER_EMAIL_KEY)) || null,
  };
};

export default {
  login,
  me,
  logout,
  register,
  getStoredAuth,
  clearAuth,
};
