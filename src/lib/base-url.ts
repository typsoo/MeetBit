import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * On web the app talks to the same origin.
 *
 * On a phone there is no `window.location`, so the base URL must point to the
 * machine running Expo. In development Expo exposes its tunnel or LAN host in
 * `hostUri`; production builds can set EXPO_PUBLIC_APP_URL.
 */
export function getBaseURL(): string | undefined {
  if (Platform.OS === 'web') {
    return undefined;
  }

  const configured = process.env.EXPO_PUBLIC_APP_URL;
  if (configured) {
    // Callers append paths themselves; a trailing slash would double the slash.
    return configured.replace(/\/+$/, '');
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) {
    return undefined;
  }

  const isTunnel = /\.(expo\.app|exp\.direct)(:\d+)?$/.test(hostUri);
  return `${isTunnel ? 'https' : 'http'}://${hostUri}`;
}
