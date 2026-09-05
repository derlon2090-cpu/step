import http from 'node:http';
import { validateEnv } from './config/env.js';
import { getAuth } from './auth/auth.js';
import { toNodeHandler } from 'better-auth/node';
import { requireUser, requireAdmin, HttpError } from './auth/guards.js';
import { startAttempt, saveAnswer, submitAttempt, getResumeAttempt, getDashboard, approveQuestion, listQuestionsForReview } from './services/learning.js';
import { z } from 'zod';
import { grammarModels } from '../src/data/grammarModels.js';
import { chatWithQuestionTutor, questionTutorSchema } from './services/ai/questionTutor.js';

validateEnv();
const authHandler = toNodeHandler(getAuth());
const json = (res, status, body) => { res.statusCode = status; res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(body)); };
const tutorOrigins = new Set((process.env.FRONTEND_ORIGINS ?? 'https://www.nabahah.com,https://nabahah.com').split(',').map((origin) => origin.trim()).filter(Boolean));
function applyTutorCors(req, res) {
  const origin = req.headers.origin;
  if (origin && tutorOrigins.has(origin)) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('access-control-allow-credentials', 'true');
    res.setHeader('vary', 'Origin');
  }
  res.setHeader('access-control-allow-headers', 'content-type, accept');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
}
async function body(req) {
  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 128 * 1024) throw new HttpError(413, 'Payload too large'); }
  if (!raw) return {}; try { return JSON.parse(raw); } catch { throw new HttpError(422, 'Invalid JSON'); }
}
const startSchema = z.object({ skill: z.enum(['reading', 'grammar', 'listening', 'writing']).default('reading'), modelId: z.string().uuid().nullable().optional(), pieceId: z.string().uuid().nullable().optional(), mode: z.enum(['practice', 'exam']).default('practice'), totalQuestions: z.number().int().min(0).max(500).default(0) });
const answerSchema = z.object({ questionId: z.string().uuid(), selectedAnswer: z.string().max(2000).nullable().optional(), responseTimeMs: z.number().int().min(0).max(86_400_000).nullable().optional() });
const grammarAnswerSchema = z.object({ modelId: z.string().regex(/^grammar-\d{2}$/), questionId: z.string().regex(/^grammar-\d{2}-q\d{2}$/), selectedIndex: z.number().int().min(0).max(3) });
const approveSchema = z.object({ proposedAnswer: z.string().max(2000).nullable().optional(), adminNote: z.string().max(4000).nullable().optional(), hadOptionsInSource: z.boolean().nullable().optional() });
const reviewStatus = z.enum(['needs_review', 'missing', 'verified']);

export const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/api/question-tutor') {
      applyTutorCors(req, res);
      if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
    }
    if (url.pathname === '/api/auth' || url.pathname.startsWith('/api/auth/')) return authHandler(req, res);
    if (req.method === 'GET' && url.pathname === '/api/dashboard') return json(res, 200, await getDashboard((await requireUser(req)).user));
    if (req.method === 'POST' && url.pathname === '/api/question-tutor') {
      const payload = questionTutorSchema.parse(await body(req));
      return json(res, 200, await chatWithQuestionTutor(payload));
    }
    if (req.method === 'POST' && url.pathname === '/api/grammar/answer') {
      await requireUser(req);
      const payload = grammarAnswerSchema.parse(await body(req));
      const model = grammarModels.find((candidate) => candidate.id === payload.modelId);
      const question = model?.questions.find((candidate) => candidate.id === payload.questionId);
      if (!question) return json(res, 404, { error: 'Grammar question not found' });
      return json(res, 200, { isCorrect: question.correctIndex === null ? null : question.correctIndex === payload.selectedIndex });
    }
    if (req.method === 'POST' && url.pathname === '/api/attempts') return json(res, 201, await startAttempt((await requireUser(req)).user, startSchema.parse(await body(req))));
    const answerMatch = url.pathname.match(/^\/api\/attempts\/([^/]+)\/answers$/);
    if (req.method === 'POST' && answerMatch) return json(res, 200, await saveAnswer((await requireUser(req)).user, answerMatch[1], answerSchema.parse(await body(req))));
    const submitMatch = url.pathname.match(/^\/api\/attempts\/([^/]+)\/submit$/);
    if (req.method === 'POST' && submitMatch) return json(res, 200, await submitAttempt((await requireUser(req)).user, submitMatch[1], await body(req)));
    const resumeMatch = url.pathname.match(/^\/api\/models\/([^/]+)\/resume$/);
    if (req.method === 'GET' && resumeMatch) return json(res, 200, { attempt: await getResumeAttempt((await requireUser(req)).user, resumeMatch[1]) });
    if (req.method === 'GET' && url.pathname === '/api/admin/questions') {
      const identity = await requireAdmin(req);
      return json(res, 200, { questions: await listQuestionsForReview(identity.user, { status: reviewStatus.parse(url.searchParams.get('status') ?? 'needs_review'), limit: url.searchParams.get('limit') ?? 50 }) });
    }
    const reviewMatch = url.pathname.match(/^\/api\/admin\/questions\/([^/]+)\/review$/);
    if (req.method === 'POST' && reviewMatch) return json(res, 200, await approveQuestion((await requireAdmin(req)).user, reviewMatch[1], approveSchema.parse(await body(req))));
    return json(res, 404, { error: 'Not Found' });
  } catch (error) {
    const status = error instanceof z.ZodError ? 422 : error?.status ?? 500;
    if (status >= 500) console.error(error);
    return json(res, status, { error: status >= 500 ? 'Tutor service unavailable' : error.message, code: error?.code });
  }
});

if (process.argv[1] && /server[\\/]index\.js$/.test(process.argv[1])) {
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`RASEEN API listening on http://localhost:${port}`));
}
