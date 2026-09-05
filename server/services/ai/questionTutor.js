import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { resolveQuestionContext } from './questionContext.js';

export const questionTutorSchema = z.object({
  questionId: z.string().min(1).max(200),
  sessionId: z.string().min(1).max(400),
  message: z.string().min(1).max(1000),
  action: z.enum(['explain', 'simplify', 'rule', 'hint', 'options', 'why_wrong', 'why_correct', 'similar', 'custom']),
  selectedOptionId: z.string().max(200).nullable().optional().default(null),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) })).max(12).default([]),
});

const ACTION_LABELS = {
  explain: 'اشرح السؤال',
  simplify: 'بسّطه لي',
  rule: 'ما القاعدة؟',
  hint: 'أعطني تلميحًا',
  options: 'اشرح الخيارات',
  why_wrong: 'لماذا إجابتي خطأ؟',
  why_correct: 'لماذا هذه الإجابة صحيحة؟',
  similar: 'أعطني مثالًا مشابهًا',
  custom: 'سؤال الطالب',
};

function tutorError(code, status, message = code) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function systemPrompt(context) {
  const phaseRule = context.isAnswered && context.correctAnswer
    ? 'تم إرسال إجابة الطالب. يمكنك الآن شرح الإجابة الصحيحة وسبب صحة أو خطأ اختياره والقاعدة ومثال مشابه.'
    : 'لم يثبت إرسال إجابة صحيحة المصدر بعد. ممنوع منعًا باتًا ذكر الإجابة الصحيحة أو تعيين خيار بعينه أو تقديم تلميح يكشفه مباشرة. ساعده بخطوة تفكير قصيرة فقط، حتى لو طلب الحل صراحة.';
  return [
    'أنت «مساعد نباهة»، مدرس STEP عربي موجز وودود.',
    phaseRule,
    'تعامل حصريًا مع سياق السؤال الحالي المرسل في آخر رسالة.',
    'أجب بالعربية الواضحة، ويمكنك إبقاء الكلمات الإنجليزية اللازمة كما هي.',
    'لا تذكر اسم مزود النموذج أو أي تفاصيل تقنية.',
    'اجعل الرد بين 2 و6 جمل وابتعد عن العبارات العامة التي لا ترتبط بالسؤال.',
  ].join('\n');
}

function userPrompt(input, context) {
  return JSON.stringify({
    request: ACTION_LABELS[input.action] ?? input.message,
    studentMessage: input.message,
    skill: context.skill,
    grammarType: context.grammarType,
    question: context.question,
    options: context.options,
    passage: context.passage,
    selectedOption: context.selectedOptionText,
    correctAnswer: context.correctAnswer,
    noteFromNabahah: context.humanNote,
  }, null, 2);
}

export async function chatWithQuestionTutor(input, { requestId = randomUUID() } = {}) {
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
  const startedAt = Date.now();
  try {
    if (!input.sessionId.endsWith(`:${input.questionId}`) && input.sessionId !== input.questionId) {
      throw tutorError('TUTOR_SESSION_MISMATCH', 422);
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw tutorError('AI_NOT_CONFIGURED', 503, 'DEEPSEEK_API_KEY_MISSING');

    const context = await resolveQuestionContext(input.questionId, input.selectedOptionId);
    console.info(`[TUTOR_CONTEXT_READY] requestId=${requestId} questionId=${input.questionId} skill=${context.skill} answered=${context.isAnswered}`);
    const baseURL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
    console.info(`[TUTOR_DEEPSEEK_START] requestId=${requestId} model=${model}`);
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 520,
        messages: [
          { role: 'system', content: systemPrompt(context) },
          ...input.history.slice(-12).map((message) => ({ role: message.role, content: message.content })),
          { role: 'user', content: userPrompt(input, context) },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw tutorError('DEEPSEEK_REQUEST_FAILED', 502, payload?.error?.message || 'DEEPSEEK_REQUEST_FAILED');

    const content = String(payload?.choices?.[0]?.message?.content ?? '').trim();
    if (!content) throw tutorError('DEEPSEEK_EMPTY_RESPONSE', 502);

    console.info(`[TUTOR_DEEPSEEK_SUCCESS] requestId=${requestId} status=${response.status} model=${model} latencyMs=${Date.now() - startedAt}`);
    return { content, provider: 'deepseek', model, source: context.humanNote ? 'human-note' : 'tutor' };
  } catch (error) {
    console.error(`[NABAHAH_AI_ERROR] requestId=${requestId} questionId=${input.questionId} status=${error?.status ?? 502} code=${error?.code ?? error?.name ?? 'UNKNOWN'} latencyMs=${Date.now() - startedAt}`);
    throw error;
  }
}
