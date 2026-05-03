import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
console.log('[API] Using API_URL:', API_URL);

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10s max — prevents indefinite loading on slow networks
  headers: {
    'Content-Type': 'application/json',
  },
});

let currentToken: string | null = null;

// Keep token in sync without calling getSession() on every request
supabase.auth.onAuthStateChange((_event, session) => {
  currentToken = session?.access_token || null;
});

// Attach the token to every request
apiClient.interceptors.request.use((config) => {
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  return config;
});

// On 401, sign out and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
