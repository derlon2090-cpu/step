import { z } from 'zod';
import { requireUser } from '../../server/auth/guards.js';
import { dismissMistake, getLearningState, getMistake, importLocalLearningState, listMistakes } from '../../server/services/learning.js';

const answerSchema = z.object({ skill: z.enum(['reading', 'grammar', 'listening', 'writing']), questionSourceId: z.string().min(1).max(200), selectedIndex: z.number().int().min(0).max(20).nullable().optional(), selectedAnswer: z.string().max(2000).nullable().optional(), modelSourceId: z.string().max(200).nullable().optional(), pieceSourceId: z.string().max(200).nullable().optional(), totalQuestions: z.number().int().min(0).max(500).default(0), responseTimeMs: z.number().int().min(0).max(86_400_000).nullable().optional(), clientMutationId: z.string().uuid().nullable().optional(), completed: z.boolean().default(false) });
const importSchema = z.object({ importKey: z.literal('step-reading-progress-v2').default('step-reading-progress-v2'), records: z.array(answerSchema).max(5000) });
const routeName = (req) => (Array.isArray(req.query?.route) ? req.query.route : [req.query?.route]).filter(Boolean).join('/');

export default async function handler(req, res) {
  try {
    const user = (await requireUser(req)).user;
    const route = routeName(req);
    if (route === 'learning-state' && req.method === 'GET') {
      const state = await getLearningState(user);
      const sinceValue = Array.isArray(req.query?.since) ? req.query.since[0] : req.query?.since;
      return res.status(200).json(sinceValue && Date.parse(sinceValue) >= Date.parse(state.updatedAt) ? { unchanged: true, updatedAt: state.updatedAt } : state);
    }
    if (route === 'learning-state' && req.method === 'POST') {
      const payload = importSchema.parse(typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {});
      return res.status(200).json(await importLocalLearningState(user, payload.records, payload.importKey));
    }
    if (route === 'mistakes' && req.method === 'GET') {
      const skill = Array.isArray(req.query?.skill) ? req.query.skill[0] : req.query?.skill;
      if (skill && !['reading', 'grammar', 'listening', 'writing'].includes(skill)) return res.status(422).json({ error: 'Invalid skill' });
      return res.status(200).json({ mistakes: await listMistakes(user, { skill: skill || null }) });
    }
    const mistakeMatch = route.match(/^mistakes\/([^/]+)$/);
    if (mistakeMatch && req.method === 'GET') return res.status(200).json(await getMistake(user, mistakeMatch[1]));
    if (mistakeMatch && req.method === 'DELETE') return res.status(200).json(await dismissMistake(user, mistakeMatch[1]));
    return res.status(404).json({ error: 'Not Found' });
  } catch (error) { return res.status(error?.name === 'ZodError' ? 422 : error?.status || 500).json({ error: error?.message || 'Unable to process account request', code: error?.code }); }
}
