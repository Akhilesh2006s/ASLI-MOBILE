import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../services/api/api';

/** Re-export so `import { API_BASE_URL } from '.../api-config'` resolves (not only default export). */
export { API_BASE_URL };

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  // Get token from secure store
  const token = await SecureStore.getItemAsync('authToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(options.headers || {}),
  };
  
  return fetch(url, {
    ...options,
    headers,
  });
};

export default API_BASE_URL;

