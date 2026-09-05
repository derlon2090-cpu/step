import { z } from 'zod';
import { requireUser } from '../../server/auth/guards.js';
import { saveSourceAnswer } from '../../server/services/learning.js';

const schema = z.object({ modelId: z.string().regex(/^grammar-\d{2}$/), questionId: z.string().regex(/^grammar-\d{2}-q\d{2}$/), selectedIndex: z.number().int().min(0).max(3) });
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const payload = schema.parse(typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {});
    const result = await saveSourceAnswer((await requireUser(req)).user, { skill: 'grammar', questionSourceId: payload.questionId, selectedIndex: payload.selectedIndex, modelSourceId: payload.modelId });
    return res.status(200).json({ isCorrect: result.isCorrect, mistakeId: result.isCorrect === false ? result.questionId : null, attemptId: result.attemptId });
  } catch (error) { return res.status(error?.name === 'ZodError' ? 422 : error?.status || 500).json({ error: error?.message || 'Unable to save answer', code: error?.code }); }
}
