import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

let client;
let database;
export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required on the server');
  if (!database) {
    client = postgres(process.env.DATABASE_URL, { prepare: false, max: Number(process.env.DB_POOL_MAX ?? 10), idle_timeout: 20 });
    database = drizzle(client, { schema });
  }
  return database;
}
export async function closeDb() { if (client) await client.end({ timeout: 5 }); client = undefined; database = undefined; }

