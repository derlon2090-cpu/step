import { z } from 'zod';

export const questionTutorSchema = z.object({
  questionId: z.string().min(1).max(200),
  question: z.string().min(1).max(4000),
  options: z.array(z.object({ id: z.string().max(200), text: z.string().max(2000) })).max(10),
  message: z.string().min(1).max(1000),
  action: z.enum(['explain', 'simplify', 'rule', 'hint', 'options', 'why_wrong', 'why_correct', 'similar', 'custom']),
  isAnswered: z.boolean(),
  selectedOptionId: z.string().max(200).nullable(),
  selectedOptionText: z.string().max(2000).nullable(),
  correctAnswer: z.string().max(2000).nullable(),
  humanNote: z.string().max(4000).nullable(),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) })).max(12),
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

function safeQuestionContext(input) {
  // A verified answer is the only point at which the model may receive the
  // answer key. Selecting an option on an unresolved source stays protected.
  const answered = input.isAnswered === true && Boolean(input.correctAnswer);
  return {
    questionId: input.questionId,
    question: input.question,
    options: input.options,
    selectedOptionId: answered ? input.selectedOptionId : null,
    selectedOptionText: answered ? input.selectedOptionText : null,
    correctAnswer: answered ? input.correctAnswer : null,
    humanNote: answered ? input.humanNote : null,
    isAnswered: answered,
  };
}

function systemPrompt(context) {
  const phaseRule = context.isAnswered
    ? 'أجاب الطالب بالفعل. يمكنك شرح الإجابة الصحيحة وسبب صحة أو خطأ اختياره والقاعدة ومثال مشابه.'
    : 'لم يجب الطالب بعد. ممنوع منعًا باتًا ذكر الإجابة الصحيحة أو تعيين خيار بعينه أو صياغة تلميح يكشفه مباشرة. ساعده بخطوة تفكير قصيرة فقط.';
  return [
    'أنت «مساعد نباهة»، مدرس STEP عربي موجز وودود.',
    phaseRule,
    'أجب بالعربية الواضحة، ويمكنك إبقاء الكلمات الإنجليزية اللازمة كما هي.',
    'لا تذكر اسم مزود النموذج أو أي تفاصيل تقنية.',
    'اجعل الرد بين 2 و5 جمل، وركّز على السؤال الحالي وحده.',
  ].join('\n');
}

function userPrompt(input, context) {
  const payload = {
    request: ACTION_LABELS[input.action] ?? input.message,
    studentMessage: input.message,
    question: context.question,
    options: context.options.map((option) => ({ id: option.id, text: option.text })),
    selectedOption: context.selectedOptionText,
    correctAnswer: context.correctAnswer,
    noteFromNabahah: context.humanNote,
  };
  return JSON.stringify(payload, null, 2);
}

function localSafeResponse(input, context) {
  if (!context.isAnswered) {
    if (input.action === 'rule') return 'حدّد أولًا نوع السؤال والكلمة المفتاحية فيه، ثم استبعد الخيارات التي لا تنسجم نحويًا أو معنويًا مع الجملة. لا أريد أن أكشف الحل قبل محاولتك؛ جرّب تضييق الخيارات إلى اثنين.';
    if (input.action === 'options') return 'قارن كل خيار بما يسبق الفراغ وما يليه، ثم استبعد أي خيار يغيّر زمن الجملة أو معناها. أبقِ الخيارين الأكثر اتساقًا، وبعدها ارجع إلى الدليل في النص.';
    if (input.action === 'simplify') return `بصياغة أبسط: المطلوب أن تحدد ما الذي يسأل عنه السؤال «${context.question}». ركّز على الفعل أو كلمة السؤال، ثم ابحث عن دليل مطابق دون اختيار الإجابة مباشرة.`;
    return 'ابدأ بتحديد الكلمة المفتاحية في السؤال، ثم ابحث عن الجملة الأقرب لها في القطعة أو القاعدة. استبعد خيارًا واحدًا يبدو بعيدًا، وبعدها قارن الباقي بالدليل.';
  }
  const note = context.humanNote ? ` ملاحظة نباهة: ${context.humanNote}` : '';
  if (input.action === 'why_wrong') return `اختيارك «${context.selectedOptionText ?? 'الخيار المحدد'}» لا يطابق الدليل المطلوب في السؤال. الإجابة الصحيحة هي «${context.correctAnswer ?? 'الخيار المعتمد'}».${note}`;
  if (input.action === 'why_correct') return `اختيارك «${context.selectedOptionText ?? context.correctAnswer}» صحيح لأنه يطابق المطلوب في السؤال والدليل المرتبط به.${note}`;
  if (input.action === 'similar') return 'جرّب تطبيق الفكرة نفسها على سؤال جديد: حدّد كلمة السؤال، استخرج الدليل، ثم اكتب سبب استبعاد كل خيار غير مناسب قبل أن تختار.';
  return `${note || `الإجابة الصحيحة هي «${context.correctAnswer ?? 'الخيار المعتمد'}».`} اربط صياغة السؤال بالدليل المباشر، ثم راقب لماذا لا تؤدي الخيارات الأخرى المعنى نفسه.`;
}

export async function chatWithQuestionTutor(input) {
  const context = safeQuestionContext(input);
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return { content: localSafeResponse(input, context), source: context.humanNote ? 'human-note' : 'tutor' };

  const baseURL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      temperature: 0.35,
      max_tokens: 420,
      messages: [
        { role: 'system', content: systemPrompt(context) },
        ...(input.history ?? []).slice(-6).map((message) => ({ role: message.role, content: message.content })),
        { role: 'user', content: userPrompt(input, context) },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || 'تعذر تجهيز الشرح الآن');
  const content = String(payload?.choices?.[0]?.message?.content ?? '').trim();
  if (!content) throw new Error('وصل رد فارغ من خدمة الشرح');
  return { content, source: context.humanNote ? 'human-note' : 'tutor' };
}
