import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { TRPCProvider, trpcClient } from '@/lib/trpc';

export default function RootLayout() {
  // Factory form: a fresh QueryClient per mount, so fast refresh and tests
  // never share one cache instance by accident.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // A 4xx is an answer, not a network hiccup: retrying only delays
            // the error UI. Only server and transport failures are worth a retry.
            retry: (failureCount, error) => {
              const status =
                error instanceof TRPCClientError
                  ? error.data?.httpStatus
                  : undefined;
              if (status && status < 500) {
                return false;
              }
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </TRPCProvider>
    </QueryClientProvider>
  );
}
