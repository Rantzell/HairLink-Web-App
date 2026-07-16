import 'react-native-url-polyfill/auto';
import './lib/philippineTime'; // force Asia/Manila for all date/time formatting
import { LogBox } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';

// expo-notifications logs a console.error on import in Expo Go (SDK 53+ dropped
// remote push). It's expected and handled — hide the LogBox overlay it triggers.
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'expo-notifications functionality is not fully supported in Expo Go',
]);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a web browser,
// the environment is set up appropriately
registerRootComponent(App);
