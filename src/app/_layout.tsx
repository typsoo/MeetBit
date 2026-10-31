import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { TRPCProvider, trpcClient } from '@/lib/trpc';

export default function RootLayout() {
  // Factory form: a fresh QueryClient per mount, so fast refresh and tests
  // never share one cache instance by accident.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </TRPCProvider>
    </QueryClientProvider>
  );
}
