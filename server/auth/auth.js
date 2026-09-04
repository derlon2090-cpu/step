import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { dash } from '@better-auth/infra';
import { getDb } from '../db/index.js';

export function createAuth() {
  const baseURL = process.env.BETTER_AUTH_URL?.replace(/\/+$/, '');

  return betterAuth({
    database: drizzleAdapter(getDb(), { provider: 'pg' }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL,
    emailAndPassword: { enabled: true, autoSignIn: true },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    advanced: { useSecureCookies: process.env.NODE_ENV === 'production' },
    plugins: [
      dash(),
    ],
  });
}

let authInstance;
export function getAuth() { return authInstance ??= createAuth(); }
export const auth = new Proxy({}, { get: (_target, property) => getAuth()[property] });
