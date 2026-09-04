import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { dash } from '@better-auth/infra';
import { getDb } from '../db/index.js';
import * as dbSchema from '../db/schema.js';

export function createAuth() {
  const baseURL = process.env.BETTER_AUTH_URL?.replace(/\/+$/, '');

  return betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      // Better Auth's Drizzle adapter needs the four canonical model names.
      // Keep them mapped to the shared schema so signup/signin cannot fall
      // back to an in-memory or implicit database model.
      schema: {
        user: dbSchema.authUsers,
        session: dbSchema.authSessions,
        account: dbSchema.authAccounts,
        verification: dbSchema.authVerifications,
      },
    }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL,
    emailAndPassword: { enabled: true, autoSignIn: true },
    // Sessions are intentionally finite: after ten hours the user must
    // authenticate again. Better Auth persists this expiry in Neon.
    session: { expiresIn: 60 * 60 * 10, updateAge: 60 * 60 * 10 },
    advanced: { useSecureCookies: process.env.NODE_ENV === 'production' },
    plugins: [
      dash(),
    ],
  });
}

let authInstance;
export function getAuth() { return authInstance ??= createAuth(); }
export const auth = new Proxy({}, { get: (_target, property) => getAuth()[property] });
