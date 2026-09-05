import { z } from 'zod';
import { requireUser } from '../../server/auth/guards.js';
import { submitAttempt } from '../../server/services/learning.js';

const schema = z.object({ attemptId: z.string().uuid(), durationSeconds: z.number().int().min(0).max(86_400).nullable().optional() });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const payload = schema.parse(typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {});
    return res.status(200).json(await submitAttempt((await requireUser(req)).user, payload.attemptId, { durationSeconds: payload.durationSeconds }));
  } catch (error) {
    return res.status(error?.name === 'ZodError' ? 422 : error?.status || 500).json({ error: error?.message || 'Unable to submit learning attempt', code: error?.code });
  }
}
