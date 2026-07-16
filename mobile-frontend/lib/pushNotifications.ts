import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from './api';

// Set how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // shouldShowAlert is deprecated in SDK 54; shouldShowBanner/shouldShowList replace it.
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  // Expo Go (SDK 53+) dropped remote push support. Skip registration there to
  // avoid the noisy runtime error; push works in a development/production build.
  if (Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient') {
    console.log('Push notifications are not supported in Expo Go — skipping registration.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    try {
        // Native FCM registration token (Android) / APNs token (iOS). The backend
        // delivers directly through Firebase Admin, so we use the device token
        // rather than an Expo push token (no Expo push service / account needed).
        const tokenResponse = await Notifications.getDevicePushTokenAsync();
        token = tokenResponse.data as string;
    } catch (e) {
        console.log('Error getting device push token:', e);
        return null;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function sendPushTokenToBackend(token: string) {
  try {
    await api.post('/auth/push-token', {
      token,
      platform: Platform.OS
    });
    console.log('Push token successfully registered with backend');
  } catch (error) {
    console.log('Failed to send push token to backend:', error);
  }
}
