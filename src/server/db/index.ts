import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';

export type Database = NeonHttpDatabase;

export function createDatabase(connectionString: string): Database {
  return drizzle(neon(connectionString));
}

let database: Database | undefined;

export function getDatabase(): Database | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  database ??= createDatabase(connectionString);
  return database;
}

export async function pingDatabase(database: Database): Promise<void> {
  await database.execute(sql`select 1`);
}
