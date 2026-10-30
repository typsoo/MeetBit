import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * On web the app talks to the same origin.
 *
 * On a phone there is no `window.location`, so the base URL must point to the
 * machine running Expo. In development Expo exposes its tunnel or LAN host in
 * `hostUri`; production builds can set EXPO_PUBLIC_APP_URL.
 */
function getBaseURL(): string | undefined {
  if (Platform.OS === 'web') {
    return undefined;
  }

  const configured = process.env.EXPO_PUBLIC_APP_URL;
  if (configured) {
    return configured;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) {
    return undefined;
  }

  const isTunnel = /\.(expo\.app|exp\.direct)(:\d+)?$/.test(hostUri);
  return `${isTunnel ? 'https' : 'http'}://${hostUri}`;
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [
    ...(Platform.OS === 'web'
      ? []
      : [
          expoClient({
            scheme: 'meetbit',
            storage: SecureStore,
            storagePrefix: 'meetbit',
          }),
        ]),
  ],
});
