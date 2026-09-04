import { toNodeHandler } from 'better-auth/node';
import { getAuth } from '../../server/auth/auth.js';
import { validateEnv } from '../../server/config/env.js';

validateEnv();
const authHandler = toNodeHandler(getAuth());

export default function handler(req, res) {
  return authHandler(req, res);
}
