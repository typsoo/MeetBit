import { getDatabase, type Database } from './db';

export type Context = {
  db: Database | null;
};

export function createContext(overrides: Partial<Context> = {}): Context {
  return {
    db: getDatabase(),
    ...overrides,
  };
}
