import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Since you are testing on a physical iPhone using Expo Go, 
// 127.0.0.1 refers to the iPhone itself, not your Windows PC!
// We must use your PC's local IP address (192.168.0.69) to connect to Laravel over Wi-Fi.
const getApiUrl = () => {
  if (__DEV__) {
    // If you are using Android Emulator on the PC, 10.0.2.2 works.
    // If you are using a physical device on the same Wi-Fi, use your PC's IPv4 address.
    return Platform.OS === 'android' ? 'http://10.0.2.2:8000/mobile-api' : 'http://192.168.0.69:8000/mobile-api';
  }
  return 'https://your-production-url.com/mobile-api'; // Replace when deploying
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
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
