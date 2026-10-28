import { createTRPCClient, httpLink } from '@trpc/client';

import type { AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: '/api/trpc',
    }),
  ],
});
