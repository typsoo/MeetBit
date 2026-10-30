import { describe, expect, it } from 'vitest';

import { createContext } from './context';
import { protectedProcedure, router } from './trpc';

const testRouter = router({
  me: protectedProcedure.query(({ ctx }) => ctx.session.user.id),
});

describe('protectedProcedure', () => {
  it('rejects a request without a session', async () => {
    const caller = testRouter.createCaller(createContext({ db: null }));

    await expect(caller.me()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
