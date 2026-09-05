import { z } from 'zod';
import { requireUser } from '../server/auth/guards.js';
import {
  dismissMistake,
  getDashboard,
  getLearningState,
  getMistake,
  importLocalLearningState,
  listMistakes,
  saveSourceAnswer,
  submitAttempt,
} from '../server/services/learning.js';

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
});
const grammarSchema = z.object({ modelId: z.string().regex(/^grammar-\d{2}$/), questionId: z.string().regex(/^grammar-\d{2}-q\d{2}$/), selectedIndex: z.number().int().min(0).max(3), clientMutationId: z.string().uuid().nullable().optional() });
const submitSchema = z.object({ attemptId: z.string().uuid(), durationSeconds: z.number().int().min(0).max(86_400).nullable().optional() });
const importSchema = z.object({ importKey: z.literal('step-reading-progress-v2').default('step-reading-progress-v2'), records: z.array(answerSchema.extend({ completed: z.boolean().default(false) })).max(5000) });

const requestBody = (req) => typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
const routePath = (req) => `/${(Array.isArray(req.query?.route) ? req.query.route : [req.query?.route]).filter(Boolean).join('/')}`;

export default async function handler(req, res) {
  try {
    const path = routePath(req);
    const user = (await requireUser(req)).user;
    if (req.method === 'GET' && path === '/dashboard') return res.status(200).json(await getDashboard(user));
    if (path === '/me/learning-state') {
      if (req.method === 'GET') {
        const state = await getLearningState(user);
        const sinceValue = Array.isArray(req.query?.since) ? req.query.since[0] : req.query?.since;
        return res.status(200).json(sinceValue && Date.parse(sinceValue) >= Date.parse(state.updatedAt) ? { unchanged: true, updatedAt: state.updatedAt } : state);
      }
      if (req.method === 'POST') {
        const payload = importSchema.parse(requestBody(req));
        return res.status(200).json(await importLocalLearningState(user, payload.records, payload.importKey));
      }
    }
    if (req.method === 'GET' && path === '/me/mistakes') {
      const skill = Array.isArray(req.query?.skill) ? req.query.skill[0] : req.query?.skill;
      if (skill && !['reading', 'grammar', 'listening', 'writing'].includes(skill)) return res.status(422).json({ error: 'Invalid skill' });
      return res.status(200).json({ mistakes: await listMistakes(user, { skill: skill || null }) });
    }
    const mistakeMatch = path.match(/^\/me\/mistakes\/([^/]+)$/);
    if (req.method === 'GET' && mistakeMatch) return res.status(200).json(await getMistake(user, mistakeMatch[1]));
    if (req.method === 'DELETE' && mistakeMatch) return res.status(200).json(await dismissMistake(user, mistakeMatch[1]));
    if (req.method === 'POST' && path === '/learning/answer') return res.status(200).json(await saveSourceAnswer(user, answerSchema.parse(requestBody(req))));
    if (req.method === 'POST' && path === '/learning/submit') {
      const payload = submitSchema.parse(requestBody(req));
      return res.status(200).json(await submitAttempt(user, payload.attemptId, { durationSeconds: payload.durationSeconds }));
    }
    if (req.method === 'POST' && path === '/grammar/answer') {
      const payload = grammarSchema.parse(requestBody(req));
      const result = await saveSourceAnswer(user, { skill: 'grammar', questionSourceId: payload.questionId, selectedIndex: payload.selectedIndex, modelSourceId: payload.modelId, clientMutationId: payload.clientMutationId });
      return res.status(200).json({ isCorrect: result.isCorrect, mistakeId: result.isCorrect === false ? result.questionId : null, attemptId: result.attemptId });
    }
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    return res.status(error?.name === 'ZodError' ? 422 : error?.status || 500).json({ error: error?.message || 'Unable to process request', code: error?.code });
  }
}
