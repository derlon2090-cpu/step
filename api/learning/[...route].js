import { z } from 'zod';
import { requireUser } from '../../server/auth/guards.js';
import { saveSourceAnswer, submitAttempt } from '../../server/services/learning.js';

const answerSchema = z.object({ skill: z.enum(['reading', 'grammar', 'listening', 'writing']), questionSourceId: z.string().min(1).max(200), selectedIndex: z.number().int().min(0).max(20).nullable().optional(), selectedAnswer: z.string().max(2000).nullable().optional(), modelSourceId: z.string().max(200).nullable().optional(), pieceSourceId: z.string().max(200).nullable().optional(), totalQuestions: z.number().int().min(0).max(500).default(0), responseTimeMs: z.number().int().min(0).max(86_400_000).nullable().optional(), clientMutationId: z.string().uuid().nullable().optional() });
const submitSchema = z.object({ attemptId: z.string().uuid(), durationSeconds: z.number().int().min(0).max(86_400).nullable().optional() });
const routeName = (req) => (Array.isArray(req.query?.route) ? req.query.route : [req.query?.route]).filter(Boolean).join('/');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const user = (await requireUser(req)).user;
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
    if (routeName(req) === 'answer') return res.status(200).json(await saveSourceAnswer(user, answerSchema.parse(body)));
    if (routeName(req) === 'submit') {
      const payload = submitSchema.parse(body);
      return res.status(200).json(await submitAttempt(user, payload.attemptId, { durationSeconds: payload.durationSeconds }));
    }
    return res.status(404).json({ error: 'Not Found' });
  } catch (error) { return res.status(error?.name === 'ZodError' ? 422 : error?.status || 500).json({ error: error?.message || 'Unable to process learning request', code: error?.code }); }
}
