import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getApiUrl = () => {
  const TUNNEL_URL = 'https://shaggy-views-count.loca.lt'; 
  
  if (TUNNEL_URL) {
    return `${TUNNEL_URL}/mobile-api`;
  }
  
  if (__DEV__) {
    // Dynamically get the IP address of your PC using Expo Constants
    const hostUri = Constants.expoConfig?.hostUri;
    const ip = hostUri ? hostUri.split(':')[0] : '192.168.100.17';
    
    return `http://${ip}:8000/mobile-api`;
  }
  return 'https://your-production-url.com/mobile-api';
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    'Accept': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
});

// Intercept requests to automatically add the Sanctum token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
