import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { dash } from '@better-auth/infra';
import { getDb } from '../db/index.js';
import * as dbSchema from '../db/schema.js';
import { normalizeEmail } from '../../lib/email.js';
import { logAuthError } from './error-classification.js';

export function createAuth() {
  const baseURL = process.env.BETTER_AUTH_URL?.replace(/\/+$/, '');

  return betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      // Sign-up creates user, account, and (when enabled) session. Keep all
      // of those writes atomic so a failed account insert cannot leave an
      // unusable user row behind.
      transaction: true,
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
    trustedOrigins: [
      baseURL,
      ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean),
    ].filter(Boolean),
    emailAndPassword: { enabled: true, autoSignIn: true },
    // Sessions are intentionally finite: after ten hours the user must
    // authenticate again. Better Auth persists this expiry in Neon.
    session: { expiresIn: 60 * 60 * 10, updateAge: 60 * 60 * 10 },
    advanced: { useSecureCookies: process.env.NODE_ENV === 'production' },
    hooks: {
      // Better Auth lower-cases internally; trimming here also makes direct
      // API calls behave exactly like the browser client.
      before: async (ctx) => {
        if ((ctx.path?.endsWith('/sign-up/email') || ctx.path?.endsWith('/sign-in/email')) && ctx.body?.email) {
          return { context: { body: { ...ctx.body, email: normalizeEmail(ctx.body.email) } } };
        }
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({ data: { ...user, email: normalizeEmail(user.email) } }),
        },
      },
    },
    onAPIError: { onError: logAuthError },
    plugins: [
      dash(),
    ],
  });
}

let authInstance;
export function getAuth() { return authInstance ??= createAuth(); }
export const auth = new Proxy({}, { get: (_target, property) => getAuth()[property] });
