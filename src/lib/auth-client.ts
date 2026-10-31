import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { getBaseURL } from './base-url';

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
