import { requireUser } from '../../../server/auth/guards.js';
import { getMistake, dismissMistake } from '../../../server/services/learning.js';

export default async function handler(req, res) {
  try {
    const user = (await requireUser(req)).user;
    const id = req.query?.id;
    if (req.method === 'GET') return res.status(200).json(await getMistake(user, id));
    if (req.method === 'DELETE') return res.status(200).json(await dismissMistake(user, id));
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    return res.status(error?.status || 500).json({ error: error?.message || 'Unable to load mistake', code: error?.code });
  }
}
