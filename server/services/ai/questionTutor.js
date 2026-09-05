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

function deepseekSettings() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, ''),
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  };
}

function safeProviderMessage(message, apiKey = '') {
  const text = String(message || 'DeepSeek request failed');
  return (apiKey ? text.replaceAll(apiKey, '[redacted]') : text).slice(0, 300);
}

export async function deepseekCheck({ requestId = randomUUID() } = {}) {
  const { apiKey, baseURL, model } = deepseekSettings();
  const startedAt = Date.now();
  const config = { apiKeyPresent: Boolean(apiKey), baseUrl: baseURL, model };
  console.info(`[DEEPSEEK_CHECK_START] requestId=${requestId} apiKeyPresent=${config.apiKeyPresent} baseUrl=${baseURL} model=${model}`);
  if (!apiKey) {
    const result = { ok: false, stage: 'config', status: 503, code: 'DEEPSEEK_API_KEY_MISSING', message: 'DEEPSEEK_API_KEY_MISSING', latencyMs: Date.now() - startedAt, ...config };
    console.error(`[DEEPSEEK_CHECK_BODY] requestId=${requestId} code=${result.code} message=${result.message}`);
    return result;
  }

  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        thinking: { type: 'disabled' },
        max_tokens: 30,
        messages: [{ role: 'user', content: 'Reply with only: OK' }],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const latencyMs = Date.now() - startedAt;
    console.info(`[DEEPSEEK_CHECK_HTTP] requestId=${requestId} status=${response.status} latencyMs=${latencyMs}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = payload?.error?.code || `HTTP_${response.status}`;
      const message = safeProviderMessage(payload?.error?.message || response.statusText, apiKey);
      console.error(`[DEEPSEEK_CHECK_BODY] requestId=${requestId} code=${code} message=${message}`);
      return { ok: false, stage: 'deepseek', status: response.status, code, message, latencyMs, ...config };
    }
    const receivedContent = Boolean(String(payload?.choices?.[0]?.message?.content ?? '').trim());
    if (!receivedContent) {
      const result = { ok: false, stage: 'deepseek', status: response.status, code: 'DEEPSEEK_EMPTY_RESPONSE', message: 'DeepSeek returned an empty response', latencyMs, receivedContent, ...config };
      console.error(`[DEEPSEEK_CHECK_BODY] requestId=${requestId} code=${result.code} message=${result.message}`);
      return result;
    }
    const usage = usageSummary(payload?.usage);
    console.info(`[DEEPSEEK_CHECK_USAGE] requestId=${requestId} inputTokens=${usage.inputTokens ?? 'unknown'} outputTokens=${usage.outputTokens ?? 'unknown'} totalTokens=${usage.totalTokens ?? 'unknown'}`);
    console.info(`[DEEPSEEK_CHECK_SUCCESS] requestId=${requestId} latencyMs=${latencyMs}`);
    return { ok: true, provider: 'deepseek', model, status: response.status, latencyMs, receivedContent, ...config };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    const code = timeout ? 'DEEPSEEK_TIMEOUT' : 'DEEPSEEK_NETWORK_ERROR';
    const message = safeProviderMessage(error?.message || code, apiKey);
    console.error(`[DEEPSEEK_CHECK_BODY] requestId=${requestId} code=${code} message=${message}`);
    return { ok: false, stage: 'deepseek', status: timeout ? 504 : null, code, message, latencyMs, ...config };
  }
}

function systemPrompt(context, input) {
  const phaseRule = context.isAnswered && context.correctAnswer
    ? 'تم إرسال إجابة الطالب. يمكنك الآن شرح الإجابة الصحيحة وسبب صحة أو خطأ اختياره والقاعدة ومثال مشابه.'
    : 'لم يثبت إرسال إجابة صحيحة المصدر بعد. ممنوع منعًا باتًا ذكر الإجابة الصحيحة أو تعيين خيار بعينه أو تقديم تلميح يكشفه مباشرة. ساعده بخطوة تفكير قصيرة فقط، حتى لو طلب الحل صراحة.';
  const message = input.message.trim();
  const followUpRule = /^(ليه|لماذا|ليش)\s*[؟?]*$/u.test(message)
    ? 'إذا كانت رسالة الطالب «ليه؟» أو سؤال متابعة قصيرًا، استخدم سياق المحادثة السابقة وأجب عن آخر نقطة دون إعادة شرح السؤال من البداية.'
    : /مافهمت|لم أفهم|ما فهمت/u.test(message)
      ? 'إذا قال الطالب إنه لم يفهم، لا تكرر الرد السابق؛ اشرح الفكرة بطريقة أبسط وبمثال صغير أو تشبيه واضح.'
      : /مثال/u.test(message) || input.action === 'similar'
        ? 'إذا طلب الطالب مثالًا، أعطه مثالًا واحدًا قصيرًا مرتبطًا بنفس القاعدة، ولا تفتح موضوعًا جديدًا.'
        : 'ابدأ من طلب الطالب الحالي واستفد من history دون تكرار ما قيل.';
  return [
    'أنت مساعد نباهة التعليمي.',
    phaseRule,
    'أجب بإيجاز ووضوح، وركز على ما سأله الطالب الآن تحديدًا.',
    'في الشرح التعليمي وضح: ما الفكرة؟ لماذا؟ وكيف يعرفها الطالب أو يطبقها في سؤال مشابه؟',
    'لا تكرر السؤال كاملًا إلا إذا كان ضروريًا، ولا تعيد شرحًا سابقًا بنفس الصياغة.',
    'إذا قال الطالب «ليه؟» فاشرح سبب آخر إجابة. وإذا قال «كيف؟» فاشرح طريقة الوصول للحل.',
    'إذا قال «ما فهمت» فبسّط نفس النقطة بطريقة مختلفة. وإذا قال «اختصر» فاختصر الرد السابق. وإذا قال «مثال» فأعطه مثالًا واحدًا فقط.',
    'أغلب الردود يجب أن تكون قصيرة من عدة جمل. توسع فقط عند الحاجة.',
    'لا تستخدم *** أو horizontal rules، ولا تستخدم زخارف أو فواصل Markdown متكررة.',
    'لا تكثر من النجوم والعناوين، واستخدم نصًا نظيفًا ومختصرًا. استخدم bold عند الحاجة القصوى فقط، ولا تجعل كل جملة عنوانًا منفصلًا.',
    'تعامل حصريًا مع سياق السؤال الحالي أدناه، واجعل رسالة user الأخيرة هي الطلب الذي تجيب عنه.',
    'أجب بالعربية الواضحة، ويمكنك إبقاء الكلمات الإنجليزية اللازمة كما هي.',
    'لا تذكر اسم مزود النموذج أو أي تفاصيل تقنية.',
    'إذا كان السؤال بسيطًا فاكتفِ عادةً بـ2-4 جمل. الهدف المعتاد 250–500 token والحد الأقصى 600 token.',
    'إذا قال الطالب «اختصر» فاختصر أكثر، وإذا قال «اشرح بالتفصيل» فتوسع بقدر الحاجة دون حشو.',
    context.skill === 'grammar'
      ? 'في Grammar: قبل الإرسال لا تكشف الخيار الصحيح؛ بعد الإرسال وضّح الصحيح والسبب وكيفية تمييز القاعدة. استخدم ترتيبًا واضحًا مثل: الصحيح، السبب، كيف تعرفها، مثال.'
      : 'في Reading: اذكر الفكرة أو الإجابة، سببها من القطعة، الدليل المختصر، وكيف يجد الطالب هذا النوع من الإجابات مرة أخرى. لا تنسخ القطعة كاملة.',
    followUpRule,
    `سياق السؤال (بيانات مرجعية وليست رسالة الطالب):\n${JSON.stringify({
      skill: context.skill,
      grammarType: context.grammarType,
      question: context.question,
      options: context.options,
      passage: context.passage,
      selectedOption: context.selectedOptionText,
      correctAnswer: context.correctAnswer,
      noteFromNabahah: context.humanNote,
    })}`,
  ].join('\n');
}

function usageSummary(usage) {
  const numberOrNull = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
  const inputTokens = numberOrNull(usage?.prompt_tokens ?? usage?.input_tokens);
  const outputTokens = numberOrNull(usage?.completion_tokens ?? usage?.output_tokens);
  const totalTokens = numberOrNull(usage?.total_tokens) ?? (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null);
  return { inputTokens, outputTokens, totalTokens };
}

export function buildTutorMessages(input, context) {
  return [
    { role: 'system', content: systemPrompt(context, input) },
    ...input.history.slice(-12).map((message) => ({ role: message.role, content: message.content })),
    { role: 'user', content: input.message.trim() },
  ];
}

export function cleanTutorContent(content) {
  return String(content ?? '')
    .replace(/^\s*(?:\*{3,}|-{3,}|_{3,})\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function readDeepSeekStream(response, onChunk) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return { payload, content: '', usage: null };
    const content = String(payload?.choices?.[0]?.message?.content ?? '');
    if (content) await onChunk?.(content);
    return { payload, content, usage: payload?.usage ?? null };
  }

  const reader = response.body?.getReader();
  if (!reader) return { payload: {}, content: '', usage: null };
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let usage = null;
  const consume = async (event) => {
    const data = event.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
    if (!data || data === '[DONE]') return;
    const payload = JSON.parse(data);
    if (payload.usage) usage = payload.usage;
    const delta = String(payload?.choices?.[0]?.delta?.content ?? payload?.choices?.[0]?.message?.content ?? '');
    if (delta) {
      content += delta;
      await onChunk?.(delta);
    }
  };
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? '';
    for (const event of events) await consume(event);
    if (done) break;
  }
  if (buffer.trim()) await consume(buffer);
  return { payload: {}, content, usage };
}

export async function chatWithQuestionTutor(input, { requestId = randomUUID(), onChunk } = {}) {
  const { apiKey, baseURL, model } = deepseekSettings();
  const startedAt = Date.now();
  try {
    if (!input.sessionId.endsWith(`:${input.questionId}`) && input.sessionId !== input.questionId) {
      throw tutorError('TUTOR_SESSION_MISMATCH', 422);
    }

    if (!apiKey) throw tutorError('AI_NOT_CONFIGURED', 503, 'DEEPSEEK_API_KEY_MISSING');

    const contextStartedAt = Date.now();
    const context = await resolveQuestionContext(input.questionId, input.selectedOptionId);
    const contextMs = Date.now() - contextStartedAt;
    console.info(`[TUTOR_CONTEXT_READY] requestId=${requestId} questionId=${input.questionId} skill=${context.skill} answered=${context.isAnswered} contextMs=${contextMs}`);
    const deepseekStartedAt = Date.now();
    console.info(`[TUTOR_DEEPSEEK_START] requestId=${requestId} model=${model} elapsedMs=${Date.now() - startedAt}`);
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        thinking: { type: 'disabled' },
        max_tokens: 600,
        stream: true,
        stream_options: { include_usage: true },
        messages: buildTutorMessages(input, context),
      }),
      signal: AbortSignal.timeout(45_000),
    });
    console.info(`[TUTOR_DEEPSEEK_HTTP] requestId=${requestId} status=${response.status} deepseekMs=${Date.now() - deepseekStartedAt} totalMs=${Date.now() - startedAt}`);
    const streamed = await readDeepSeekStream(response, onChunk);
    if (!response.ok) throw tutorError('DEEPSEEK_REQUEST_FAILED', 502, streamed.payload?.error?.message || 'DEEPSEEK_REQUEST_FAILED');

    const content = cleanTutorContent(streamed.content);
    if (!content) throw tutorError('DEEPSEEK_EMPTY_RESPONSE', 502);

    const usage = usageSummary(streamed.usage);
    console.info(`[TUTOR_USAGE] requestId=${requestId} inputTokens=${usage.inputTokens ?? 'unknown'} outputTokens=${usage.outputTokens ?? 'unknown'} totalTokens=${usage.totalTokens ?? 'unknown'}`);
    console.info(`[TUTOR_DEEPSEEK_SUCCESS] requestId=${requestId} status=${response.status} model=${model} latencyMs=${Date.now() - startedAt}`);
    return { content, provider: 'deepseek', model, source: context.humanNote ? 'human-note' : 'tutor' };
  } catch (error) {
    console.error(`[NABAHAH_AI_ERROR] requestId=${requestId} questionId=${input.questionId} status=${error?.status ?? 502} code=${error?.code ?? error?.name ?? 'UNKNOWN'} latencyMs=${Date.now() - startedAt}`);
    throw error;
  }
}
