import 'dotenv/config';

const required = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_API_KEY', 'BETTER_AUTH_URL'];
export function validateEnv({ strict = process.env.NODE_ENV === 'production' } = {}) {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length && strict) throw new Error(`Missing required server environment variables: ${missing.join(', ')}`);
  if (strict && process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must be at least 32 characters in production');
  }
  if (strict && process.env.BETTER_AUTH_URL) {
    const authURL = new URL(process.env.BETTER_AUTH_URL);
    if (authURL.protocol !== 'https:') throw new Error('BETTER_AUTH_URL must use https:// in production');
    if (authURL.pathname !== '/' || authURL.search || authURL.hash) throw new Error('BETTER_AUTH_URL must be an origin without a path, query, or hash');
  }
  return { missing };
}
