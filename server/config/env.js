import 'dotenv/config';

const required = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_API_KEY', 'BETTER_AUTH_URL'];
export function validateEnv({ strict = process.env.NODE_ENV === 'production' } = {}) {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length && strict) throw new Error(`Missing required server environment variables: ${missing.join(', ')}`);
  return { missing };
}
