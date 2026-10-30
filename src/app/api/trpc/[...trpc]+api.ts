import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createContext } from "@/server/context";
import { appRouter } from "@/server/routers/_app";

const handleRequest = (request: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: ({ req }) => createContext({ headers: req.headers }),
  });

export { handleRequest as GET, handleRequest as POST };
