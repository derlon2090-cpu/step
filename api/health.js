import { validateEnv } from '../server/config/env.js';

export default function handler(_req, res) {
  try {
    const { missing } = validateEnv({ strict: false });
    res.statusCode = missing.length ? 503 : 200;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      ok: missing.length === 0,
      authConfigured: missing.length === 0,
      missing,
    }));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'AUTH_CONFIGURATION_ERROR' }));
  }
}
