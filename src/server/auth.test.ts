import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { createAuth } from "./auth";

type AuthOptions = {
  emailAndPassword?: { enabled?: boolean };
};

const requiredEnv = {
  BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
};

const originalNodeEnv = process.env.NODE_ENV;

/** Reads the password provider setting the auth instance was built with. */
function emailAndPasswordFor(
  nodeEnv: "development" | "production",
): AuthOptions["emailAndPassword"] {
  process.env.NODE_ENV = nodeEnv;
  const auth = createAuth({} as never);
  return (auth.options as unknown as AuthOptions).emailAndPassword;
}

describe("createAuth", () => {
  beforeAll(() => {
    Object.assign(process.env, requiredEnv);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("enables the password provider in development", () => {
    expect(emailAndPasswordFor("development")).toEqual({ enabled: true });
  });

  it("leaves the password provider out of production", () => {
    expect(emailAndPasswordFor("production")).toBeUndefined();
  });
});
