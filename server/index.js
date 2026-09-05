import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { validateEnv } from './config/env.js';
import { getAuth } from './auth/auth.js';
import { toNodeHandler } from 'better-auth/node';
import { requireUser, requireAdmin, HttpError } from './auth/guards.js';
import { startAttempt, saveAnswer, submitAttempt, getResumeAttempt, getDashboard, listMistakes, getMistake, dismissMistake, saveSourceAnswer, approveQuestion, listQuestionsForReview } from './services/learning.js';
import { z } from 'zod';
import { grammarModels } from '../src/data/grammarModels.js';
import { chatWithQuestionTutor, deepseekCheck, questionTutorSchema } from './services/ai/questionTutor.js';

console.info('[BOOT] starting Nabahah API');
console.info('[BOOT_CONFIG]', {
  nodeEnv: process.env.NODE_ENV,
  portPresent: Boolean(process.env.PORT),
  databaseUrlPresent: Boolean(process.env.DATABASE_URL),
  betterAuthSecretPresent: Boolean(process.env.BETTER_AUTH_SECRET),
  betterAuthSecretLengthOk: Boolean(process.env.BETTER_AUTH_SECRET?.length >= 32),
  betterAuthApiKeyPresent: Boolean(process.env.BETTER_AUTH_API_KEY),
  betterAuthUrlPresent: Boolean(process.env.BETTER_AUTH_URL),
  deepseekKeyPresent: Boolean(process.env.DEEPSEEK_API_KEY),
});
try {
  validateEnv();
  console.info('[BOOT] environment validation passed');
} catch (error) {
  console.error('[BOOT_ENV_ERROR]', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

// Keep the liveness endpoint independent from Better Auth/DB initialization.
// Auth is initialized only when an auth route is actually requested.
let authHandler;
const getAuthHandler = () => authHandler ??= toNodeHandler(getAuth());
const json = (res, status, body) => { res.statusCode = status; res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(body)); };
const tutorOrigins = new Set((process.env.FRONTEND_ORIGINS ?? 'https://www.nabahah.com,https://nabahah.com').split(',').map((origin) => origin.trim()).filter(Boolean));
function applyTutorCors(req, res) {
  const origin = req.headers.origin;
  if (origin && !tutorOrigins.has(origin)) {
    json(res, 403, { error: 'Tutor origin not allowed', code: 'TUTOR_CORS_ORIGIN_DENIED' });
    return false;
  }
  if (origin && tutorOrigins.has(origin)) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('access-control-allow-credentials', 'true');
    res.setHeader('vary', 'Origin');
  }
  res.setHeader('access-control-allow-headers', 'content-type, accept');
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  return true;
}
async function body(req) {
  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 128 * 1024) throw new HttpError(413, 'Payload too large'); }
  if (!raw) return {}; try { return JSON.parse(raw); } catch { throw new HttpError(422, 'Invalid JSON'); }
}
const startSchema = z.object({ skill: z.enum(['reading', 'grammar', 'listening', 'writing']).default('reading'), modelId: z.string().uuid().nullable().optional(), pieceId: z.string().uuid().nullable().optional(), mode: z.enum(['practice', 'exam']).default('practice'), totalQuestions: z.number().int().min(0).max(500).default(0) });
const answerSchema = z.object({ questionId: z.string().uuid(), selectedAnswer: z.string().max(2000).nullable().optional(), responseTimeMs: z.number().int().min(0).max(86_400_000).nullable().optional() });
const grammarAnswerSchema = z.object({ modelId: z.string().regex(/^grammar-\d{2}$/), questionId: z.string().regex(/^grammar-\d{2}-q\d{2}$/), selectedIndex: z.number().int().min(0).max(3) });
const learningAnswerSchema = z.object({ skill: z.enum(['reading', 'grammar', 'listening', 'writing']), questionSourceId: z.string().min(1).max(200), selectedIndex: z.number().int().min(0).max(20).nullable().optional(), selectedAnswer: z.string().max(2000).nullable().optional(), modelSourceId: z.string().max(200).nullable().optional(), pieceSourceId: z.string().max(200).nullable().optional(), totalQuestions: z.number().int().min(0).max(500).default(0), responseTimeMs: z.number().int().min(0).max(86_400_000).nullable().optional() });
const approveSchema = z.object({ proposedAnswer: z.string().max(2000).nullable().optional(), adminNote: z.string().max(4000).nullable().optional(), hadOptionsInSource: z.boolean().nullable().optional() });
const reviewStatus = z.enum(['needs_review', 'missing', 'verified']);

export const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true, service: 'nabahah-api' });
    }
    if (url.pathname === '/api/question-tutor' || url.pathname === '/api/question-tutor/health' || url.pathname === '/api/question-tutor/deepseek-check') {
      const requestId = randomUUID();
      if (!applyTutorCors(req, res)) return;
      console.info(`[TUTOR_CORS_OK] requestId=${requestId} origin=${req.headers.origin ?? 'same-origin'}`);
      if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
      if (url.pathname === '/api/question-tutor/health') {
        if (req.method !== 'GET') return json(res, 405, { error: 'Method Not Allowed', code: 'METHOD_NOT_ALLOWED' });
        return json(res, 200, {
          ok: true,
          service: 'nabahah-tutor',
          deepseekConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
          deepseekBaseUrl: (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, ''),
          deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
          commit: process.env.RENDER_GIT_COMMIT || process.env.RENDER_GIT_COMMIT_SHA || 'unknown',
        });
      }
      if (url.pathname === '/api/question-tutor/deepseek-check') {
        if (req.method !== 'GET') return json(res, 405, { error: 'Method Not Allowed', code: 'METHOD_NOT_ALLOWED' });
        return json(res, 200, await deepseekCheck({ requestId }));
      }
      if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed', code: 'METHOD_NOT_ALLOWED' });
      console.info(`[TUTOR_INCOMING_REQUEST] requestId=${requestId} method=POST origin=${req.headers.origin ?? 'same-origin'}`);
      const payload = questionTutorSchema.parse(await body(req));
      res.statusCode = 200;
      res.setHeader('content-type', 'text/event-stream; charset=utf-8');
      res.setHeader('cache-control', 'no-cache, no-transform');
      res.setHeader('connection', 'keep-alive');
      const write = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
      const result = await chatWithQuestionTutor(payload, { requestId, onChunk: async (content) => write({ type: 'delta', content }) });
      write({ type: 'done', ...result });
      res.end();
      console.info(`[TUTOR_RESPONSE_SENT] requestId=${requestId} status=200 streaming=true`);
      return;
    }
    if (url.pathname === '/api/auth' || url.pathname.startsWith('/api/auth/')) return getAuthHandler()(req, res);
    if (req.method === 'GET' && url.pathname === '/api/dashboard') return json(res, 200, await getDashboard((await requireUser(req)).user));
    if (req.method === 'GET' && url.pathname === '/api/me/mistakes') {
      const skill = url.searchParams.get('skill');
      if (skill && !['reading', 'grammar', 'listening', 'writing'].includes(skill)) return json(res, 422, { error: 'Invalid skill' });
      return json(res, 200, { mistakes: await listMistakes((await requireUser(req)).user, { skill }) });
    }
    const mistakeMatch = url.pathname.match(/^\/api\/me\/mistakes\/([^/]+)$/);
    if (req.method === 'GET' && mistakeMatch) return json(res, 200, await getMistake((await requireUser(req)).user, mistakeMatch[1]));
    if (req.method === 'DELETE' && mistakeMatch) return json(res, 200, await dismissMistake((await requireUser(req)).user, mistakeMatch[1]));
    if (req.method === 'POST' && url.pathname === '/api/grammar/answer') {
      const user = (await requireUser(req)).user;
      const payload = grammarAnswerSchema.parse(await body(req));
      const result = await saveSourceAnswer(user, { skill: 'grammar', questionSourceId: payload.questionId, selectedIndex: payload.selectedIndex, modelSourceId: payload.modelId, totalQuestions: 0 });
      return json(res, 200, { isCorrect: result.isCorrect, mistakeId: result.isCorrect === false ? result.questionId : null, attemptId: result.attemptId });
    }
    if (req.method === 'POST' && url.pathname === '/api/learning/answer') return json(res, 200, await saveSourceAnswer((await requireUser(req)).user, learningAnswerSchema.parse(await body(req))));
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
  const port = Number(process.env.PORT || 10000);
  const host = '0.0.0.0';
  server.listen(port, host, () => console.info(`[BOOT_READY] listening on ${host}:${port}`));
  server.on('error', (error) => {
    console.error('[BOOT_SERVER_ERROR]', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
