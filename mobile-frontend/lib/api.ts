import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getApiUrl = () => {
  if (__DEV__) {
    // If testing in a Web Browser
    if (Platform.OS === 'web') {
      return 'http://localhost:8000/mobile-api';
    }
    
    // For physical mobile devices on the same Wi-Fi
    // We use the direct IP of your PC (192.168.100.17)
    return 'http://192.168.100.17:8000/mobile-api';
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
