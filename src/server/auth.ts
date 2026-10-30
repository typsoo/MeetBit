import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";

import type { Database } from "./db";
import { account, session, user, verification } from "./db/schema";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for authentication`);
  }
  return value;
}

/** Creates the Better Auth instance for the given database connection. */
export function createAuth(db: Database) {
  const isDevelopment = process.env.NODE_ENV !== "production";

  return betterAuth({
    // Resolve the base URL per request, so localhost and LAN addresses both
    // produce a matching OAuth callback.
    baseURL: {
      allowedHosts: [
        "localhost:*",
        "127.0.0.1:*",
        "*.exp.direct",
        "*.expo.app",
      ],
      protocol: "auto",
      fallback: process.env.BETTER_AUTH_URL,
    },
    secret: requiredEnv("BETTER_AUTH_SECRET"),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    // The Expo client sends the OAuth state back through the browser, so the
    // state must live in a cookie instead of the database.
    account: {
      storeStateStrategy: "cookie",
    },
    socialProviders: {
      google: {
        clientId: requiredEnv("GOOGLE_CLIENT_ID"),
        clientSecret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      },
    },
    trustedOrigins: [
      "meetbit://",
      ...(isDevelopment
        ? ["exp://**", "exps://**", "http://localhost:*", "http://127.0.0.1:*"]
        : []),
    ],
    plugins: [expo()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const authByDatabase = new WeakMap<Database, Auth>();

/**
 * Returns one auth instance per database connection.
 *
 * Better Auth is created on first use, not at import time, so the app can boot
 * and tests can run without database or OAuth environment variables.
 */
export function getAuth(db: Database): Auth {
  let auth = authByDatabase.get(db);
  if (!auth) {
    auth = createAuth(db);
    authByDatabase.set(db, auth);
  }
  return auth;
}
