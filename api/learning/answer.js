import { z } from 'zod';
import { requireUser } from '../../server/auth/guards.js';
import { saveSourceAnswer } from '../../server/services/learning.js';

const schema = z.object({ skill: z.enum(['reading', 'grammar', 'listening', 'writing']), questionSourceId: z.string().min(1).max(200), selectedIndex: z.number().int().min(0).max(20).nullable().optional(), selectedAnswer: z.string().max(2000).nullable().optional(), modelSourceId: z.string().max(200).nullable().optional(), pieceSourceId: z.string().max(200).nullable().optional(), totalQuestions: z.number().int().min(0).max(500).default(0), responseTimeMs: z.number().int().min(0).max(86_400_000).nullable().optional(), clientMutationId: z.string().uuid().nullable().optional() });
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try { return res.status(200).json(await saveSourceAnswer((await requireUser(req)).user, schema.parse(typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}))); }
  catch (error) { return res.status(error?.name === 'ZodError' ? 422 : error?.status || 500).json({ error: error?.message || 'Unable to save answer', code: error?.code }); }
}
