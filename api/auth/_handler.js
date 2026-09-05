// Files beginning with `_` are helper modules, not standalone Vercel
// Functions. Keeping the handler here lets us expose explicit auth routes for
// deployments where nested catch-all functions are not discovered correctly.
import { toNodeHandler } from 'better-auth/node';
import { getAuth } from '../../server/auth/auth.js';
import { validateEnv } from '../../server/config/env.js';

validateEnv();
export const authHandler = toNodeHandler(getAuth());

export function handler(req, res) {
  return authHandler(req, res);
}
