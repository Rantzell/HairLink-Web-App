import { Linking, Platform } from 'react-native';

/**
 * Launches the native HairLink AR app (iOS Xcode / Android Studio projects)
 * via the `hairlinkar://tryon` deep link.
 *
 * If the native app isn't installed on the device, `Linking.openURL` rejects
 * — we return `false` and the caller falls back to the in-Expo camera screen
 * (which is just a face-guide overlay, not real face tracking, but at least
 * the button does *something*).
 *
 * Cross-platform: the same URL scheme works on iOS (CFBundleURLTypes) and
 * Android (intent-filter scheme="hairlinkar").
 *
 * Returns true if the native app was launched successfully.
 */
export const DEEP_LINK_URL = 'hairlinkar://tryon';

export type LaunchARParams = {
  /** "short" | "long" — chooses which GLB the native app should load */
  style?: string;
  /** "black" | "brown" | "light" — tints the wig material */
  color?: string;
};

export async function launchNativeAR(params?: LaunchARParams): Promise<boolean> {
  let url = DEEP_LINK_URL;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }

  try {
    await Linking.openURL(url);
    return true;
  } catch (err) {
    // Most common: native app not installed on this device.
    if (__DEV__) {
      console.log(
        `[AR] Native app not available (${Platform.OS}). Falling back to in-Expo screen.`,
        err,
      );
    }
    return false;
  }
}
