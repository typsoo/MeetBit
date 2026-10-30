import { getDatabase, type Database } from "./db";

export type Context = {
  db: Database | null;
  headers: Headers;
};

export function createContext(overrides: Partial<Context> = {}): Context {
  const db = "db" in overrides ? (overrides.db ?? null) : getDatabase();

  return {
    db,
    headers: overrides.headers ?? new Headers(),
  };
}
