import { requireUser } from '../server/auth/guards.js';
import { getDashboard } from '../server/services/learning.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    return res.status(200).json(await getDashboard((await requireUser(req)).user));
  } catch (error) {
    return res.status(error?.status || 500).json({ error: error?.message || 'Unable to load dashboard', code: error?.code });
  }
}
