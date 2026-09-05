import { sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { normalizeEmail } from '../../lib/email.js';

const asCode = (error) => String(error?.code ?? error?.status ?? '').toUpperCase();

export function classifyAuthError(error) {
  const code = asCode(error);
  const message = String(error?.message ?? '').toLowerCase();
  if (code.includes('USER_ALREADY_EXISTS') || code.includes('EMAIL_ALREADY_EXISTS') || code === 'CONFLICT' || error?.cause?.code === '23505') return 'USER_ALREADY_EXISTS';
  if (code.includes('INVALID_PASSWORD') || code.includes('INVALID_EMAIL_OR_PASSWORD') || code === 'UNAUTHORIZED') return 'INVALID_PASSWORD';
  if (code.includes('FAILED_TO_CREATE') || code === 'INTERNAL_SERVER_ERROR') return 'DATABASE_ERROR';
  if (code.includes('CONFIG') || message.includes('secret') || message.includes('origin') || message.includes('base url')) return 'AUTH_CONFIGURATION_ERROR';
  if (error?.cause?.code?.startsWith?.('23') || message.includes('database') || message.includes('relation') || message.includes('column')) return 'DATABASE_ERROR';
  return 'AUTH_ERROR';
}

function requestEmail(ctx) {
  return normalizeEmail(ctx?.body?.email);
}

/**
 * Emit a useful server-side diagnosis without logging passwords or raw
 * request bodies. For invalid sign-ins, distinguish a bad password from the
 * partial-user state that Better Auth otherwise reports identically.
 */
export async function logAuthError(error, ctx) {
  let errorCode = classifyAuthError(error);
  const path = String(ctx?.path ?? '');
  const email = requestEmail(ctx);
  let userId;

  if (path.endsWith('/sign-in/email') && email) {
    try {
      const rows = await getDb().execute(sql`
        SELECT u.id,
               EXISTS (
                 SELECT 1 FROM "account" a
                 WHERE a.user_id = u.id
                   AND a.provider_id = 'credential'
                   AND a.issuer = 'local:credential'
                   AND a.account_id = u.id
               ) AS has_credential,
               EXISTS (
                 SELECT 1 FROM "account" a
                 WHERE a.user_id = u.id
                   AND a.provider_id = 'credential'
                   AND a.issuer = 'local:credential'
                   AND a.account_id = u.id
                   AND a.password IS NOT NULL
               ) AS has_password
        FROM "user" u
        WHERE lower(trim(u.email)) = ${email}
        LIMIT 1
      `);
      const row = rows[0];
      userId = row?.id;
      if (row && !row.has_credential) errorCode = 'CREDENTIAL_ACCOUNT_MISSING';
      else if (row && !row.has_password) errorCode = 'CREDENTIAL_PASSWORD_MISSING';
    } catch (diagnosticError) {
      console.error('[AUTH_DIAGNOSTIC_FAILED]', diagnosticError);
    }
  }

  const payload = {
    code: errorCode,
    path,
    method: ctx?.request?.method,
    userId,
    requestId: ctx?.request?.headers?.get?.('x-request-id') ?? undefined,
    causeCode: error?.cause?.code,
    message: error?.message,
  };
  console.error('[AUTH_ERROR]', JSON.stringify(payload));
}
