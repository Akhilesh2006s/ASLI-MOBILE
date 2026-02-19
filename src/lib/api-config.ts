// Centralized API URL Management for Mobile
// Production Backend - Railway deployment

// Railway production URL (matches web client)
// If you change your Railway backend URL, update this:
const PRODUCTION_URL = 'https://asli-stud-back-production-7ea4.up.railway.app';

// Local development URL
const LOCAL_URL = 'http://localhost:5000';

// Use Railway URL by default (matches web client)
// EXPO_PUBLIC_API_URL environment variable can override this
const envUrl = process.env.EXPO_PUBLIC_API_URL;
const isProduction = process.env.NODE_ENV === 'production';
const isLocalhostUrl = envUrl && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'));

let finalUrl: string;
// Always use Railway URL by default (matches web client)
// EXPO_PUBLIC_API_URL can override for local development
if (envUrl && !isLocalhostUrl) {
  finalUrl = envUrl; // Use explicit env URL if provided (non-localhost)
} else if (envUrl && isLocalhostUrl) {
  finalUrl = envUrl; // Allow localhost if explicitly set
} else {
  // Default to Railway URL (production backend)
  finalUrl = PRODUCTION_URL;
}

export const API_BASE_URL = finalUrl;

// Log current configuration
const envLabel = API_BASE_URL.includes('localhost') 
  ? 'Development' 
  : API_BASE_URL.includes('railway.app') 
    ? 'Railway Production' 
    : 'Production';
console.log(`🔌 API Base URL: ${API_BASE_URL} (${envLabel})`);

// Helper function for making API calls
import * as SecureStore from 'expo-secure-store';

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

