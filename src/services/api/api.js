import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const DEV_URL = 'https://api.aslilearn.ai';
const PROD_URL = 'https://api.aslilearn.ai';

const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/\/+$/, '');
};

const getBaseUrl = () => {
  const envBase = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);
  if (envBase) return envBase;
  return __DEV__ ? DEV_URL : PROD_URL;
};

export const API_BASE_URL = getBaseUrl();
export const AUTH_TOKEN_KEY = 'authToken';
const TOKEN_KEYS = [AUTH_TOKEN_KEY, 'token', 'accessToken', 'jwtToken'];
let inMemoryAuthToken = null;

export const setInMemoryAuthToken = (token) => {
  inMemoryAuthToken = token || null;
};

const readTokenFromStorage = async () => {
  for (const key of TOKEN_KEYS) {
    const value = await SecureStore.getItemAsync(key);
    if (value) {
      // Normalize legacy keys to primary key.
      if (key !== AUTH_TOKEN_KEY) {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, value);
      }
      return value;
    }
  }
  return null;
};

if (__DEV__) {
  // Keep API target visibility in development only.
  // eslint-disable-next-line no-console
  console.log(`[API] baseURL: ${API_BASE_URL}`);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = inMemoryAuthToken || (await readTokenFromStorage());
    if (token) {
      inMemoryAuthToken = token;
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      const serverMessage = String(
        error?.response?.data?.message || error?.response?.data?.error || ''
      ).toLowerCase();
      const shouldClearAuth =
        serverMessage.includes('token expired') ||
        serverMessage.includes('invalid token') ||
        serverMessage.includes('jwt') ||
        serverMessage.includes('unauthorized');

      // Do not clear token for every 401, because permission/route issues can also return 401.
      if (shouldClearAuth) {
        inMemoryAuthToken = null;
        for (const key of TOKEN_KEYS) {
          await SecureStore.deleteItemAsync(key);
        }
        await SecureStore.deleteItemAsync('userRole');
        await SecureStore.deleteItemAsync('userEmail');
      }
    }

    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      (error?.code === 'ECONNABORTED' ? 'Request timeout. Please try again.' : null) ||
      (error?.message?.includes('Network Error') ? `Unable to connect to server (${API_BASE_URL}).` : null) ||
      'Something went wrong. Please try again.';

    return Promise.reject({
      ...error,
      friendlyMessage: message,
    });
  }
);

export default api;
