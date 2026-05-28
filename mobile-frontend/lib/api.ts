import axios from 'axios';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const getApiUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // Android emulator can't reach host's localhost — use 10.0.2.2
      return 'http://10.0.2.2:3001/api';
    }
    // iOS simulator and web share the host's network namespace
    return 'http://localhost:3001/api';
  }
  return 'https://your-production-url.com/api';
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    'Accept': 'application/json',
  },
});

let cachedToken: string | null = null;

(async () => {
  const { data } = await supabase.auth.getSession();
  cachedToken = data?.session?.access_token || null;
})();

supabase.auth.onAuthStateChange((_event, session) => {
  cachedToken = session?.access_token || null;
});

api.interceptors.request.use(
  async (config) => {
    if (cachedToken) {
      config.headers.Authorization = `Bearer ${cachedToken}`;
    } else {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        cachedToken = token;
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
