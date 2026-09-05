import { z } from 'zod';
import { requireUser } from '../../../server/auth/guards.js';
import { listMistakes } from '../../../server/services/learning.js';

const skills = new Set(['reading', 'grammar', 'listening', 'writing']);
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const skill = req.query?.skill || null;
    if (skill && !skills.has(skill)) return res.status(422).json({ error: 'Invalid skill' });
    return res.status(200).json({ mistakes: await listMistakes((await requireUser(req)).user, { skill }) });
  } catch (error) {
    return res.status(error?.status || 500).json({ error: error?.message || 'Unable to load mistakes', code: error?.code });
  }
}
