import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';

import type { AppRouter } from '@/server/routers/_app';

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    // Batches several procedure calls into one HTTP request per animation
    // frame; the server adapter splits them back into individual calls.
    httpBatchLink({
      url: '/api/trpc',
    }),
  ],
});
