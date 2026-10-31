import { Platform } from 'react-native';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';

import type { AppRouter } from '@/server/routers/_app';
import { authClient } from './auth-client';
import { getBaseURL } from './base-url';

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

// On web the relative URL keeps every request same-origin, so the browser
// attaches the session cookie itself. On a phone there is no origin: the URL
// must be absolute, and the cookie has to be read from SecureStore and sent
// by hand, exactly like the better-auth Expo plugin does for its own calls.
const baseURL = getBaseURL();

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    // Batches several procedure calls into one HTTP request per animation
    // frame; the server adapter splits them back into individual calls.
    httpBatchLink({
      url: baseURL ? `${baseURL}/api/trpc` : '/api/trpc',
      headers: async () => {
        if (Platform.OS === 'web') {
          return {};
        }

        const cookie = await authClient.getCookie();
        return cookie ? { cookie } : {};
      },
    }),
  ],
});
