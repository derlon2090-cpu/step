import { z } from 'zod';
import { requireUser } from '../../../server/auth/guards.js';
import { getLearningState, importLocalLearningState } from '../../../server/services/learning.js';

const answerSchema = z.object({
  skill: z.enum(['reading', 'grammar', 'listening', 'writing']),
  questionSourceId: z.string().min(1).max(200),
  selectedIndex: z.number().int().min(0).max(20).nullable().optional(),
  selectedAnswer: z.string().max(2000).nullable().optional(),
  modelSourceId: z.string().max(200).nullable().optional(),
  pieceSourceId: z.string().max(200).nullable().optional(),
  totalQuestions: z.number().int().min(0).max(500).default(0),
  responseTimeMs: z.number().int().min(0).max(86_400_000).nullable().optional(),
  clientMutationId: z.string().uuid().nullable().optional(),
  completed: z.boolean().default(false),
});
const importSchema = z.object({ importKey: z.literal('step-reading-progress-v2').default('step-reading-progress-v2'), records: z.array(answerSchema).max(5000) });

export default async function handler(req, res) {
  try {
    const user = (await requireUser(req)).user;
    if (req.method === 'GET') {
      const state = await getLearningState(user);
      const sinceValue = Array.isArray(req.query?.since) ? req.query.since[0] : req.query?.since;
      return res.status(200).json(sinceValue && Date.parse(sinceValue) >= Date.parse(state.updatedAt) ? { unchanged: true, updatedAt: state.updatedAt } : state);
    }
    if (req.method === 'POST') {
      const payload = importSchema.parse(typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {});
      return res.status(200).json(await importLocalLearningState(user, payload.records, payload.importKey));
    }
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    return res.status(error?.name === 'ZodError' ? 422 : error?.status || 500).json({ error: error?.message || 'Unable to load learning state', code: error?.code });
  }
}
