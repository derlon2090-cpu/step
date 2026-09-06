import './style.css';
import './raseen.css';
import './listening.css';
import { readings } from './data/readings.js';
import { questionGlossary } from './data/reading/questionGlossary.js';
import { buildReadingExplanation } from './data/readingExplanations.js';
import { buildReadingAnswerLink } from './data/readingAnswerLinks.js';
import { grammarModels } from './data/grammarModels.js';
import { listeningModels } from './data/listeningModels.js';
import { soundManager } from './soundManager.js';
import { authClient } from '../lib/auth-client.ts';
import { normalizeEmail } from '../lib/email.js';
import { questionTutorProvider } from './services/ai/questionTutorProvider.js';
import { formatTutorContent } from './utils/tutorFormatting.js';

const jsonModelFiles = import.meta.glob('./data/reading/models/model-*.json', { eager: true, import: 'default' });
const jsonModelsById = new Map(Object.values(jsonModelFiles).map((model) => [
  `reading-${String(model.modelNumber).padStart(2, '0')}`,
  {
    id: `reading-${String(model.modelNumber).padStart(2, '0')}`,
    order: model.modelNumber,
    title: model.title,
    subtitle: model.subtitle,
    passages: model.pieces.map((piece) => ({
      id: piece.pieceId.replace(/^model-\d+-piece-/, '').toLowerCase(),
      order: piece.order,
      title: piece.titleAr,
      englishTitle: piece.titleEn,
      externalTitle: piece.externalTitle,
      passageText: piece.passage,
      questions: piece.questions.map((question) => ({
        id: question.id,
        number: question.displayOrder,
        question: question.questionDisplay ?? question.questionSource,
        correctAnswer: question.correctAnswer,
        explanation: buildReadingExplanation(question),
        options: question.options.map((text, index) => ({ id: `${question.id}-o${index + 1}`, text, isCorrect: text === question.correctAnswer })),
      })),
    })),
  },
]));

const storageKey = 'step-reading-progress-v2';
const readStored = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
// Authentication identity always comes from Better Auth's server session.
// Local storage is used only for the learner's progress cache.
let account = null;
let serverDashboard = null;
let serverLearningState = null;
let serverLearningStateLoaded = false;
let serverMistakes = [];
let serverMistakesLoaded = false;
let grammarAnswerQueue = Promise.resolve();
const progressKey = () => account?.email ? `${storageKey}:${account.email}` : storageKey;
const migrationMarkerKey = () => `nabahah-learning-migrated-v1:${account?.id ?? 'anonymous'}`;
const pendingAnswersKey = () => `nabahah-pending-answers-v1:${account?.id ?? 'anonymous'}`;
let progress = readStored(progressKey(), {});
const authHintKey = 'step-reading-auth-hint';
const workspaceViewKey = 'nabahah-workspace-view-v1';
const readSessionStored = (key, fallback) => {
  try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const requestedView = new URLSearchParams(window.location.search).get('view');
const hasAuthHint = localStorage.getItem(authHintKey) === '1';
const restorableViews = new Set(['dashboard', 'dashboard-models', 'dashboard-section', 'grammar-quiz', 'grammar-result', 'listening-model', 'listening-quiz', 'listening-result', 'mistake-question', 'mistake-solve', 'model', 'quiz', 'solutions', 'result']);
const savedWorkspace = hasAuthHint ? readSessionStored(workspaceViewKey, {}) : {};
const savedView = restorableViews.has(savedWorkspace.view) ? savedWorkspace.view : null;
const initialView = requestedView === 'dashboard' ? (hasAuthHint ? 'dashboard' : 'login') : (!requestedView ? savedView ?? (hasAuthHint ? 'dashboard' : null) : requestedView);
const initialViews = new Set(['login', 'register', ...restorableViews]);
let state = { view: initialViews.has(initialView) ? initialView : 'library', dashboardSection: typeof savedWorkspace.dashboardSection === 'string' ? savedWorkspace.dashboardSection : 'dashboard', dashboardMenuOpen: false, authError: '', authLoading: true, selectedModelId: typeof savedWorkspace.selectedModelId === 'string' ? savedWorkspace.selectedModelId : null, selectedPassageId: typeof savedWorkspace.selectedPassageId === 'string' ? savedWorkspace.selectedPassageId : null, selectedGrammarModelId: typeof savedWorkspace.selectedGrammarModelId === 'string' ? savedWorkspace.selectedGrammarModelId : null, grammarQuestionIndex: Math.max(0, Number(savedWorkspace.grammarQuestionIndex) || 0), grammarAnswers: {}, grammarConfirmed: {}, selectedListeningModelId: typeof savedWorkspace.selectedListeningModelId === 'string' ? savedWorkspace.selectedListeningModelId : null, selectedRecordingId: typeof savedWorkspace.selectedRecordingId === 'string' ? savedWorkspace.selectedRecordingId : null, listeningQuestionIndex: Math.max(0, Number(savedWorkspace.listeningQuestionIndex) || 0), listeningAnswers: {}, query: '', questionIndex: Math.max(0, Number(savedWorkspace.questionIndex) || 0), questionStartedAt: Date.now(), translationQuestionId: null, answerLinkQuestionId: null, translatedWords: {}, activeAnswers: {}, restoredProgress: false, mistakeReviewId: typeof savedWorkspace.mistakeReviewId === 'string' ? savedWorkspace.mistakeReviewId : null, mistakeSolveId: typeof savedWorkspace.mistakeSolveId === 'string' ? savedWorkspace.mistakeSolveId : null, mistakeSolveAnswer: null, tutorOpen: false, tutorQuestionKey: null, tutorSessions: {}, tutorScrollToEnd: false };
const app = document.querySelector('#app');

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const brandLogo = (variant = 'default') => `<img class="brand-image ${variant === 'light' ? 'brand-image-light' : ''}" src="/assets/nabahah-logo.png" alt="نباهة" />`;
const NIBRAS_BRAND = { name: 'نِبراس', slug: 'nibras', subtitle: 'يساعدك في هذا السؤال فقط', tooltip: 'اسأل نِبراس', logo: '/assets/nibras-mark.png' };
const nibrasLogo = (className = 'nibras-logo') => `<img class="${className}" src="${NIBRAS_BRAND.logo}" alt="" aria-hidden="true" />`;
const nibrasizeTutorMarkup = (markup) => markup.replaceAll('اسأل نباهة', 'اسأل نِبراس').replaceAll('مساعد نباهة', NIBRAS_BRAND.name);
const dashboardBrandLogo = () => `<span class="brand-symbol" aria-hidden="true"><svg viewBox="0 0 44 38" focusable="false"><path d="M22 35C19 27 11 22 3 21v13h19Zm0 0c3-8 11-13 19-14v13H22ZM22 35V14c0-7 5-11 12-13v14c0 6-5 10-12 20ZM22 14C18 7 13 3 6 1v14c0 6 5 10 16 20Z"/></svg></span><span class="brand-word">نباهة</span>`;
const normalizeArabic = (value = '') => String(value).toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ً-ْ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const modelNumber = (model) => String(model.order).padStart(2, '0');
const saveProgress = () => localStorage.setItem(progressKey(), JSON.stringify(progress));
const readingSkillLabels = ['الفكرة الرئيسة', 'الاستنتاج', 'الضمائر', 'المفردات', 'إعادة الصياغة', 'التفاصيل'];
const mistakeReasonLabels = ['قاعدة غير مفهومة', 'استعجال', 'مفردات', 'استنتاج', 'ضمير', 'إعادة صياغة'];
const addDays = (date, days) => new Date(new Date(date).getTime() + days * 86400000).toISOString();
const dateKey = (value = new Date()) => new Date(value).toISOString().slice(0, 10);
const inferReadingSkill = (question = {}) => {
  const text = normalizeArabic(`${question.question ?? ''} ${question.explanation ?? ''}`);
  if (/\b(meaning|means|word|vocabulary|synonym|refer to)\b/.test(text)) return 'المفردات';
  if (/\b(pronoun|it|they|them|this|these|refer)\b/.test(text)) return 'الضمائر';
  if (/\b(infer|imply|suggest|conclude|can be concluded|likely)\b/.test(text)) return 'الاستنتاج';
  if (/\b(paraphrase|restat|closest|best express|rewrite)\b/.test(text)) return 'إعادة الصياغة';
  if (/\b(main idea|purpose|best title|author.{0,12}(opinion|point)|primarily)\b/.test(text)) return 'الفكرة الرئيسة';
  return 'التفاصيل';
};
const inferMistakeReason = (question = {}, seconds = 0) => {
  const skill = inferReadingSkill(question);
  if (seconds > 75) return 'استعجال';
  if (skill === 'المفردات') return 'مفردات';
  if (skill === 'الاستنتاج') return 'استنتاج';
  if (skill === 'الضمائر') return 'ضمير';
  if (skill === 'إعادة الصياغة') return 'إعادة صياغة';
  return 'قاعدة غير مفهومة';
};
async function refreshServerDashboard() {
  if (!account) {
    serverDashboard = null;
    return;
  }
  try {
    const response = await fetch('/api/dashboard', { credentials: 'include', headers: { accept: 'application/json' } });
    if (response.ok) serverDashboard = await response.json();
  } catch {
    // The local progress cache remains available when the API is offline.
  }
}
async function refreshServerMistakes({ renderAfter = true } = {}) {
  if (!account) { serverMistakes = []; serverMistakesLoaded = false; return; }
  try {
    const response = await fetch('/api/me/mistakes', { credentials: 'include', headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error('mistakes unavailable');
    const payload = await response.json();
    serverMistakes = Array.isArray(payload.mistakes) ? payload.mistakes : [];
    serverMistakesLoaded = true;
    if (renderAfter) render();
  } catch {
    serverMistakesLoaded = false;
  }
}

function localMistakeRecords() {
  const readingQuestionContexts = new Map(models.flatMap((model) => model.passages.flatMap((passage) => passage.questions.map((question) => [question.id, { question, modelOrder: model.order, pieceOrder: passage.order }]))));
  const readingMistakes = Object.values(progress).flatMap((item) => item?.mistakes ?? []).map((mistake, index) => {
    const context = readingQuestionContexts.get(mistake.questionId);
    const question = context?.question;
    return { id: `local-reading-${mistake.questionId ?? index}`, skill: 'reading', questionId: mistake.questionId, questionSourceId: mistake.questionId, modelOrder: context?.modelOrder, pieceOrder: context?.pieceOrder, questionOrder: question?.number ?? index + 1, questionText: question?.question ?? 'سؤال محفوظ محليًا', options: question?.options?.map((option, optionIndex) => ({ id: option.id, value: option.text, optionOrder: optionIndex + 1 })) ?? [], selectedAnswer: question?.options?.find((option) => option.id === mistake.optionId)?.text ?? null, correctAnswer: question?.correctAnswer ?? null, explanation: question?.explanation ?? null, mistakeCount: mistake.mistakeCount ?? 1, lastSeenAt: mistake.createdAt, status: 'unreviewed' };
  });
  const grammarMistakes = Object.entries(progress.grammar ?? {}).flatMap(([modelId, item]) => {
    const model = grammarModels.find((candidate) => candidate.id === modelId);
    if (!model) return [];
    const questionIds = [...new Set([...Object.entries(item?.results ?? {}).filter(([, result]) => result === false).map(([questionId]) => questionId), ...Object.keys(item?.mistakes ?? {})])];
    return questionIds.map((questionId) => {
      const question = model.questions.find((candidate) => candidate.id === questionId);
      if (!question) return null;
      const selectedIndex = item.answers?.[questionId];
      const savedMistake = item.mistakes?.[questionId];
      return { id: `local-grammar-${questionId}`, skill: 'grammar', questionId, questionSourceId: questionId, modelOrder: model.order, pieceOrder: null, questionOrder: question.displayOrder, questionText: question.prompt, options: question.options.map((value, optionIndex) => ({ id: `${questionId}-${optionIndex}`, value, optionOrder: optionIndex + 1 })), selectedAnswer: Number.isInteger(selectedIndex) ? question.options[selectedIndex] : savedMistake?.selectedAnswer ?? null, correctAnswer: Number.isInteger(question.correctIndex) ? question.options[question.correctIndex] : null, explanation: question.sourceNote ?? null, mistakeCount: savedMistake?.mistakeCount ?? 1, lastSeenAt: savedMistake?.lastSeenAt ?? item.updatedAt, status: 'unreviewed' };
    }).filter(Boolean);
  });
  return [...readingMistakes, ...grammarMistakes];
}

function visibleMistakes() {
  const skillOrder = { reading: 1, grammar: 2, listening: 3 };
  const byLearningOrder = (a, b) => (skillOrder[a.skill] ?? 4) - (skillOrder[b.skill] ?? 4) || (Number(a.modelOrder) || Number.MAX_SAFE_INTEGER) - (Number(b.modelOrder) || Number.MAX_SAFE_INTEGER) || (Number(a.pieceOrder) || Number.MAX_SAFE_INTEGER) - (Number(b.pieceOrder) || Number.MAX_SAFE_INTEGER) || (Number(a.questionOrder) || Number.MAX_SAFE_INTEGER) - (Number(b.questionOrder) || Number.MAX_SAFE_INTEGER) || String(a.questionSourceId ?? a.questionId).localeCompare(String(b.questionSourceId ?? b.questionId));
  if (!serverMistakesLoaded) return localMistakeRecords().sort(byLearningOrder);
  const pendingKeys = new Set(readStored(pendingAnswersKey(), []).map((answer) => `${answer.skill}:${answer.questionSourceId}`));
  if (!pendingKeys.size) return [...serverMistakes].sort(byLearningOrder);
  const local = localMistakeRecords();
  const serverKeys = new Set(serverMistakes.map((mistake) => `${mistake.skill}:${mistake.questionSourceId ?? mistake.questionId}`));
  const combined = [...serverMistakes, ...local.filter((mistake) => pendingKeys.has(`${mistake.skill}:${mistake.questionSourceId}`) && !serverKeys.has(`${mistake.skill}:${mistake.questionSourceId}`))];
  return combined.sort(byLearningOrder);
}

const mistakeOccurrenceCount = (items) => items.reduce((total, mistake) => total + Math.max(1, Number(mistake.mistakeCount) || 1), 0);

function grammarMistakeReason(mistake) {
  const questionId = mistake.questionSourceId ?? mistake.questionId;
  const question = grammarModels.flatMap((model) => model.questions).find((candidate) => candidate.id === questionId);
  const reasons = {
    general: 'الخيار الصحيح هو الذي يُكمل تركيب الجملة وفق القاعدة والسياق معًا.',
    incorrect: 'هذا هو موضع الخطأ النحوي المطلوب اكتشافه في الجملة.',
    'correct-sentence': 'هذه الصياغة تحافظ على تركيب الجملة الصحيح واتساق عناصرها.',
    'word-order': 'هذا الترتيب يضع عناصر الجملة في مواقعها النحوية الصحيحة.',
    capitalization: 'هذه الصياغة تطبّق قاعدة الأحرف الكبيرة في موضعها الصحيح.',
    punctuation: 'هذه العلامة تناسب بناء الجملة والمعنى المقصود.',
    special: 'هذا الخيار يطابق المطلوب في السؤال والصياغة المعتمدة في المصدر.',
  };
  return reasons[question?.category] ?? 'الإجابة الصحيحة هي التي تطابق القاعدة المطلوبة وسياق الجملة.';
}

function mistakeChoiceReason(mistake) {
  if (!mistake.selectedAnswer) return 'لم تُحفظ إجابتك السابقة؛ راجع المطلوب ثم قارن الخيارات بالإجابة الصحيحة.';
  if (mistake.skill === 'grammar') return `اخترت «${mistake.selectedAnswer}»، لكنه لا يطابق القاعدة المطلوبة في هذا التركيب.`;
  if (mistake.skill === 'listening') return `اخترت «${mistake.selectedAnswer}»، لكنه لا يطابق المعنى أو التفصيل المسموع في المقطع.`;
  return `اخترت «${mistake.selectedAnswer}»، لكنه لا يجيب بدقة عن المطلوب أو لا يطابق المعلومة في القطعة.`;
}

function removeLocalMistake(mistake) {
  if (!mistake) return;
  if (mistake.skill === 'grammar') {
    const model = grammarModels.find((candidate) => candidate.questions.some((question) => question.id === mistake.questionSourceId));
    if (!model) return;
    const item = grammarProgress(model.id);
    const mistakes = { ...(item.mistakes ?? {}) };
    delete mistakes[mistake.questionSourceId];
    const results = { ...(item.results ?? {}) };
    delete results[mistake.questionSourceId];
    setGrammarProgress(model.id, { mistakes, results });
    return;
  }
  Object.entries(progress).filter(([key, item]) => key.includes(':') && item?.mistakes).forEach(([key, item]) => {
    const mistakes = item.mistakes.filter((candidate) => candidate.questionId !== mistake.questionSourceId);
    if (mistakes.length !== item.mistakes.length) progress[key] = { ...item, mistakes };
  });
  saveProgress();
}

const authErrorMessage = (error, fallback = 'تعذر تنفيذ الطلب. حاول مرة أخرى.') => {
  const code = String(error?.code ?? error?.status ?? '').toUpperCase();
  if (code.includes('USER_ALREADY_EXISTS') || code.includes('EMAIL_ALREADY_EXISTS') || code.includes('CONFLICT')) return 'هذا البريد الإلكتروني مسجل مسبقًا. سجّل الدخول بدلًا من إنشاء حساب جديد.';
  if (code.includes('INVALID_EMAIL') || code.includes('INVALID_PASSWORD') || code.includes('USER_NOT_FOUND') || code.includes('UNAUTHORIZED')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  if (code.includes('TOO_MANY')) return 'محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.';
  return error?.message || fallback;
};
const quizKey = (modelId, passageId) => `${modelId}:${passageId}`;
const quizProgress = (modelId, passageId) => progress[quizKey(modelId, passageId)] ?? { answers: {}, status: 'not-started' };
const arabicModelNames = [
  'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
  'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر',
  'الثامن عشر', 'التاسع عشر', 'العشرون',
];

const models = readings.map((reading) => {
  const manual = jsonModelsById.get(reading.id);
  return {
    id: reading.id,
    order: reading.order,
    title: manual?.title ?? `النموذج ${arabicModelNames[reading.order - 1] ?? modelNumber(reading)}`,
    subtitle: manual?.subtitle ?? 'سيتم إضافة القطع الداخلية بعد إرسالها',
    passages: manual?.passages ?? [],
  };
});

function collectLegacyAnswers(snapshot) {
  const records = [];
  Object.entries(snapshot ?? {}).forEach(([key, item]) => {
    if (key === 'grammar' || !key.includes(':') || !item?.answers) return;
    const [modelId, passageId] = key.split(':');
    const model = models.find((candidate) => candidate.id === modelId);
    const passage = model?.passages.find((candidate) => candidate.id === passageId);
    if (!model || !passage) return;
    Object.entries(item.answers).forEach(([questionId, optionId]) => {
      const question = passage.questions.find((candidate) => candidate.id === questionId);
      const selectedIndex = question?.options.findIndex((option) => option.id === optionId) ?? -1;
      if (!question || selectedIndex < 0) return;
      records.push({ skill: 'reading', questionSourceId: question.id, selectedIndex, modelSourceId: `model-${String(model.order).padStart(2, '0')}`, pieceSourceId: passage.id, totalQuestions: passage.questions.length, completed: item.status === 'completed', clientMutationId: crypto.randomUUID() });
    });
  });
  Object.entries(snapshot?.grammar ?? {}).forEach(([modelId, item]) => {
    const model = grammarModels.find((candidate) => candidate.id === modelId);
    if (!model || !item?.answers) return;
    Object.entries(item.answers).forEach(([questionId, selectedIndex]) => {
      if (!model.questions.some((question) => question.id === questionId) || !Number.isInteger(Number(selectedIndex))) return;
      records.push({ skill: 'grammar', questionSourceId: questionId, selectedIndex: Number(selectedIndex), modelSourceId: model.id, totalQuestions: model.questions.length, completed: item.status === 'completed', clientMutationId: crypto.randomUUID() });
    });
  });
  return records;
}

function hydrateProgressFromServer(payload) {
  const next = {};
  const ensureReading = (modelSourceId, pieceSourceId) => {
    if (!modelSourceId || !pieceSourceId) return null;
    const modelId = String(modelSourceId).replace(/^model-/, 'reading-');
    const key = quizKey(modelId, pieceSourceId);
    next[key] ??= { answers: {}, answerMeta: {}, status: 'not-started', currentQuestionIndex: 0 };
    return { key, item: next[key], model: models.find((candidate) => candidate.id === modelId), passageId: pieceSourceId };
  };
  (payload.progress ?? []).forEach((remote) => {
    const status = remote.status === 'completed' ? 'completed' : remote.status === 'in_progress' ? 'in-progress' : 'not-started';
    if (remote.skill === 'grammar' && remote.modelSourceId) {
      next.grammar ??= {};
      next.grammar[remote.modelSourceId] = { ...(next.grammar[remote.modelSourceId] ?? {}), answers: {}, results: {}, status, currentQuestionIndex: 0, updatedAt: remote.lastActivityAt };
      return;
    }
    const reading = ensureReading(remote.modelSourceId, remote.pieceSourceId);
    if (reading) Object.assign(reading.item, { status, updatedAt: remote.lastActivityAt });
  });
  const attempts = [...(payload.recentAttempts ?? [])].reverse().concat([...(payload.activeAttempts ?? [])].reverse());
  attempts.forEach((attempt) => {
    if (attempt.skill === 'grammar' && attempt.modelSourceId) {
      const model = grammarModels.find((candidate) => candidate.id === attempt.modelSourceId);
      if (!model) return;
      next.grammar ??= {};
      const item = next.grammar[model.id] ?? { answers: {}, results: {}, status: 'not-started', currentQuestionIndex: 0 };
      (attempt.answers ?? []).forEach((answer) => {
        const question = model.questions.find((candidate) => candidate.id === answer.questionId);
        const selectedIndex = question?.options.findIndex((option) => option === answer.selectedAnswer) ?? -1;
        if (!question || selectedIndex < 0) return;
        item.answers[question.id] = selectedIndex;
        item.results[question.id] = answer.isCorrect;
        item.currentQuestionIndex = Math.max(item.currentQuestionIndex, model.questions.indexOf(question));
      });
      Object.assign(item, { attemptId: attempt.id, status: attempt.status === 'submitted' ? 'completed' : 'in-progress', updatedAt: attempt.lastActivityAt });
      next.grammar[model.id] = item;
      return;
    }
    if (attempt.skill !== 'reading') return;
    const reading = ensureReading(attempt.modelSourceId, attempt.pieceSourceId);
    const passage = reading?.model?.passages.find((candidate) => candidate.id === reading.passageId);
    if (!reading || !passage) return;
    (attempt.answers ?? []).forEach((answer) => {
      const question = passage.questions.find((candidate) => candidate.id === answer.questionId);
      const option = question?.options.find((candidate) => candidate.text === answer.selectedAnswer);
      if (!question || !option) return;
      reading.item.answers[question.id] = option.id;
      reading.item.answerMeta[question.id] = { answeredAt: answer.answeredAt, seconds: Math.round(Number(answer.responseTimeMs ?? 0) / 1000), isCorrect: answer.isCorrect };
      reading.item.currentQuestionIndex = Math.max(reading.item.currentQuestionIndex, passage.questions.indexOf(question));
    });
    Object.assign(reading.item, { attemptId: attempt.id, status: attempt.status === 'submitted' ? 'completed' : 'in-progress', updatedAt: attempt.lastActivityAt });
  });
  progress = next;
  saveProgress();
}

function queuePendingAnswer(payload) {
  const queued = readStored(pendingAnswersKey(), []);
  if (!queued.some((item) => item.clientMutationId === payload.clientMutationId)) queued.push(payload);
  localStorage.setItem(pendingAnswersKey(), JSON.stringify(queued.slice(-500)));
}

async function sendLearningAnswer(payload, { queueOnFailure = true } = {}) {
  try {
    const response = await fetch('/api/learning/answer', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) {
      if (response.status >= 500 && queueOnFailure) queuePendingAnswer(payload);
      throw new Error(`learning answer failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (queueOnFailure && !String(error?.message).startsWith('learning answer failed:')) queuePendingAnswer(payload);
    throw error;
  }
}

async function flushPendingAnswers() {
  const queued = readStored(pendingAnswersKey(), []);
  if (!account || !queued.length) return;
  const remaining = [];
  for (const payload of queued) {
    try { await sendLearningAnswer(payload, { queueOnFailure: false }); } catch { remaining.push(payload); }
  }
  if (remaining.length) localStorage.setItem(pendingAnswersKey(), JSON.stringify(remaining));
  else localStorage.removeItem(pendingAnswersKey());
}

async function submitLearningAttempt(attemptId) {
  if (!attemptId) return;
  try {
    const response = await fetch('/api/learning/submit', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ attemptId }) });
    if (!response.ok && response.status !== 409) throw new Error('attempt submit failed');
    await Promise.all([refreshServerDashboard(), refreshLearningState({ renderAfter: false, hydrate: false, flushPending: false })]);
  } catch {
    // The saved answers remain resumable and a later state refresh can retry.
  }
}

async function migrateLegacyProgress(snapshot) {
  if (!account || localStorage.getItem(migrationMarkerKey()) === '1') return;
  const records = collectLegacyAnswers(snapshot);
  if (!records.length) {
    localStorage.setItem(migrationMarkerKey(), '1');
    return;
  }
  try {
    const response = await fetch('/api/me/learning-state', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ importKey: storageKey, records }) });
    if (!response.ok) return;
    const result = await response.json();
    localStorage.setItem(migrationMarkerKey(), '1');
    if (result.state) {
      serverLearningState = result.state;
      serverLearningStateLoaded = true;
      serverMistakes = result.state.mistakes ?? [];
      serverMistakesLoaded = true;
      hydrateProgressFromServer(result.state);
    }
  } catch {
    // Retry on a later authenticated load; the local cache remains intact.
  }
}

async function refreshLearningState({ renderAfter = true, hydrate = true, flushPending = true } = {}) {
  if (!account) { serverLearningState = null; serverLearningStateLoaded = false; return; }
  try {
    if (flushPending) await flushPendingAnswers();
    const since = serverLearningState?.updatedAt ? `?since=${encodeURIComponent(serverLearningState.updatedAt)}` : '';
    const response = await fetch(`/api/me/learning-state${since}`, { credentials: 'include', headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error('learning state unavailable');
    const payload = await response.json();
    serverLearningStateLoaded = true;
    if (!payload.unchanged) {
      serverLearningState = payload;
      serverMistakes = Array.isArray(payload.mistakes) ? payload.mistakes : [];
      serverMistakesLoaded = true;
      if (hydrate) hydrateProgressFromServer(payload);
    }
    if (renderAfter) render();
  } catch {
    serverLearningStateLoaded = false;
  }
}

function setQuizProgress(modelId, passageId, update) {
  const key = quizKey(modelId, passageId);
  progress[key] = { ...quizProgress(modelId, passageId), ...update, updatedAt: new Date().toISOString() };
  saveProgress();
}

function visibleModels() {
  if (!state.query) return models;
  const query = normalizeArabic(state.query);
  return models.filter((model) => normalizeArabic(`${modelNumber(model)} ${model.title} ${model.subtitle} ${model.passages.map((passage) => `${passage.title} ${passage.englishTitle}`).join(' ')}`).includes(query));
}

function readingModelState(model) {
  if (!model.passages.length) return { className: 'status-unavailable', label: 'غير متاح', completed: false };
  const completed = model.passages.every((passage) => quizProgress(model.id, passage.id).status === 'completed');
  return completed
    ? { className: 'status-completed', label: 'تم الحل بالكامل', completed: true }
    : { className: 'status-incomplete', label: 'لم يتم الحل', completed: false };
}

function displayedOptions(question) {
  if (!question.options.length) return [];
  const offset = question.number % question.options.length;
  return [...question.options.slice(offset), ...question.options.slice(0, offset)];
}

function normalizeWord(word) {
  return String(word).toLowerCase().replace(/[’']/g, "'").replace(/'s$/i, '').replace(/[^a-z]/g, '');
}

function wordMeaning(word) {
  // The generated glossary is validated against every published question at
  // build time, so a missing entry is a developer error rather than learner UI.
  return questionGlossary[normalizeWord(word)] ?? 'ترجمة غير متاحة حاليًا';
}

function renderQuestionText(question) {
  if (state.translationQuestionId !== question.id) return escapeHtml(question.question);
  const selection = state.translatedWords[question.id];
  const selectedWord = normalizeWord(typeof selection === 'object' ? selection.word : selection ?? '');
  const selectedIndex = typeof selection === 'object' ? Number(selection.index) : null;
  const parts = [];
  let cursor = 0;
  let wordIndex = 0;
  const pattern = /[A-Za-z]+(?:['’][A-Za-z]+)?/g;
  for (const match of question.question.matchAll(pattern)) {
    if (match.index > cursor) parts.push(escapeHtml(question.question.slice(cursor, match.index)));
    const token = match[0];
    const clean = normalizeWord(token);
    const isTranslated = selectedIndex === null ? clean === selectedWord : wordIndex === selectedIndex;
    const meaningId = `word-meaning-${question.id}-${wordIndex}`;
    const popover = isTranslated ? `<span class="word-meaning-popover" id="${meaningId}" role="status">${escapeHtml(wordMeaning(clean))}</span>` : '';
    parts.push(`<span class="word-chip-wrap ${isTranslated ? 'is-translated' : ''}"><button class="word-chip" data-word="${escapeHtml(clean)}" data-word-index="${wordIndex}" data-question-word="${question.id}" aria-expanded="${isTranslated}" ${isTranslated ? `aria-describedby="${meaningId}"` : ''}>${escapeHtml(token)}</button>${popover}</span>`);
    cursor = match.index + token.length;
    wordIndex += 1;
  }
  if (cursor < question.question.length) parts.push(escapeHtml(question.question.slice(cursor)));
  return parts.join('');
}

function raseenHeader(active = 'النماذج') {
  const pendingAuthenticatedWorkspace = state.authLoading && hasAuthHint && restorableViews.has(state.view);
  if (account || pendingAuthenticatedWorkspace) return dashboardHeader(['model', 'quiz', 'solutions', 'result'].includes(state.view) ? 'reading' : 'dashboard');
  const nav = ['الرئيسية', 'أقسام STEP', 'النماذج', 'المدونة', 'من نحن', 'تواصل معنا'];
  return `<header class="raseen-header"><button class="brand-mark brand-button" data-library aria-label="العودة للرئيسية">${brandLogo()}</button><nav>${nav.map((item) => `<button class="${item === active ? 'active' : ''}" ${item === 'الرئيسية' ? 'data-library' : item === 'النماذج' || item === 'أقسام STEP' ? 'data-models-scroll' : 'data-dashboard'}>${item}</button>`).join('')}</nav><div class="header-actions"><button class="outline-action" data-login>تسجيل الدخول</button><button class="orange-action" data-dashboard>ابدأ الآن</button></div></header>`;
}

function dashboardHeader(active = 'dashboard') {
  const name = account?.name ? escapeHtml(account.name) : 'حسابي';
  const mistakesCount = mistakeOccurrenceCount(visibleMistakes().filter((mistake) => ['reading', 'grammar', 'listening'].includes(mistake.skill)));
  return `<header class="dashboard-header ${state.dashboardMenuOpen ? 'menu-open' : ''}"><button class="dashboard-menu-toggle" data-toggle-dashboard-menu aria-expanded="${state.dashboardMenuOpen}" aria-label="فتح قائمة لوحة المستخدم">☰</button><button class="dashboard-brand" data-dashboard-section="dashboard" aria-label="لوحة المستخدم">${dashboardBrandLogo()}</button><nav aria-label="تنقل لوحة المستخدم"><button class="${active === 'dashboard' ? 'active' : ''}" data-dashboard-section="dashboard">لوحتي</button><button class="${active === 'reading' ? 'active' : ''}" data-models-scroll>القراءة</button><button class="${active === 'grammar' ? 'active' : ''}" data-dashboard-section="grammar">القواعد</button><button class="${active === 'listening' ? 'active' : ''}" data-dashboard-section="listening">الاستماع</button><button class="${active === 'exams' ? 'active' : ''}" data-dashboard-section="exams">الاختبارات</button><button class="${active === 'mistakes' ? 'active' : ''}" data-dashboard-section="mistakes">أخطائي${mistakesCount ? `<b class="nav-badge">${mistakesCount}</b>` : ''}</button><button class="${active === 'progress' ? 'active' : ''}" data-dashboard-section="progress">تقدمي</button><button class="${active === 'frequent' ? 'active' : ''}" data-dashboard-section="frequent">الأكثر تكرارًا</button></nav><details class="dashboard-profile-menu"><summary><span class="dashboard-avatar" aria-hidden="true">${name.charAt(0)}</span><span>${name}</span><span class="profile-caret" aria-hidden="true">⌄</span></summary><div><button data-dashboard-section="profile">ملفي الشخصي</button><button data-dashboard-section="settings">إعدادات الحساب</button><button data-dashboard-section="subscription">الاشتراك</button><button data-dashboard-section="help">المساعدة</button><button class="dashboard-logout" data-logout>تسجيل الخروج</button></div></details></header>`;
}

function sessionLoadingView() {
  return `<main class="session-loading-shell" aria-live="polite" aria-busy="true"><header class="session-loading-header">${dashboardBrandLogo()}</header><section><span aria-hidden="true"></span><p>جارٍ استعادة جلستك…</p></section></main>`;
}

function loginView() {
  return `<main class="auth-shell"><div class="auth-panel"><button class="brand-mark brand-button" data-library>${brandLogo()}</button><span class="auth-kicker">منصة متخصصة في STEP فقط</span><h1>سجّل دخولك إلى نباهة</h1><p>احفظ تقدمك، راجع أخطاءك، وواصل التدريب من آخر سؤال وصلت إليه.</p>${state.authError ? `<div class="auth-error" role="alert">${escapeHtml(state.authError)}</div>` : ''}<form class="auth-form login-form"><label>البريد الإلكتروني<input name="email" type="email" placeholder="أدخل بريدك الإلكتروني" autocomplete="email" required></label><label>كلمة المرور<input name="password" type="password" placeholder="أدخل كلمة المرور" autocomplete="current-password" required></label><label class="remember-row"><input name="remember" type="checkbox" checked> تذكّرني على هذا الجهاز</label><button class="orange-action" type="submit">تسجيل الدخول</button></form><button class="auth-secondary" data-register>إنشاء حساب جديد</button><button class="auth-link" data-library>العودة للرئيسية</button></div><div class="auth-art"><img src="/assets/raseen-student-hero.png" alt="طالب يستعد لاختبار STEP"><div><strong>تعلّم بثقة</strong><span>خطة واضحة وتقدم محفوظ</span></div></div></main>`;
}

function registerView() {
  return `<main class="auth-shell"><div class="auth-panel"><button class="brand-mark brand-button" data-library>${brandLogo()}</button><span class="auth-kicker">ابدأ خطتك التعليمية</span><h1>أنشئ حسابك في نباهة</h1><p>حسابك يحفظ تقدمك وأخطاءك لتعود إلى التدريب في أي وقت.</p>${state.authError ? `<div class="auth-error" role="alert">${escapeHtml(state.authError)}</div>` : ''}<form class="auth-form register-form"><label>الاسم الكامل<input name="name" type="text" placeholder="اكتب اسمك" autocomplete="name" minlength="2" required></label><label>البريد الإلكتروني<input name="email" type="email" placeholder="أدخل بريدك الإلكتروني" autocomplete="email" required></label><label>كلمة المرور<input name="password" type="password" placeholder="8 أحرف على الأقل" autocomplete="new-password" minlength="8" required></label><label>تأكيد كلمة المرور<input name="confirmPassword" type="password" placeholder="أعد كتابة كلمة المرور" autocomplete="new-password" minlength="8" required></label><label class="remember-row"><input name="terms" type="checkbox" required> أوافق على حفظ بيانات الحساب بأمان</label><button class="orange-action" type="submit">إنشاء الحساب والدخول</button></form><button class="auth-secondary" data-login>لدي حساب بالفعل</button><button class="auth-link" data-library>العودة للرئيسية</button></div><div class="auth-art"><img src="/assets/raseen-student-hero.png" alt="طالب يستعد لاختبار STEP"><div><strong>خطتك تبدأ هنا</strong><span>تقدم محفوظ وتجربة منظمة</span></div></div></main>`;
}

function dashboardData() {
  const passageCount = models.reduce((sum, model) => sum + model.passages.length, 0);
  const questionCount = models.reduce((sum, model) => sum + model.passages.reduce((pieceSum, passage) => pieceSum + passage.questions.length, 0), 0);
  const entries = Object.entries(progress).filter(([key, item]) => key.includes(':') && item && typeof item === 'object');
  const completedEntries = entries.filter(([, item]) => item.status === 'completed');
  const answered = entries.reduce((sum, [, item]) => sum + Object.keys(item.answers ?? {}).length, 0);
  const mistakes = visibleMistakes().map((mistake) => ({ ...mistake, questionId: mistake.questionSourceId ?? mistake.questionId, createdAt: mistake.lastSeenAt }));
  const uniqueMistakes = [...new Map(mistakes.map((mistake) => [mistake.questionId, mistake])).values()];
  const questionMap = new Map(models.flatMap((model) => model.passages.flatMap((passage) => passage.questions.map((question) => [question.id, { model, passage, question }]))));
  const resultRows = completedEntries.map(([key, item]) => {
    const [modelId, passageId] = key.split(':');
    const model = models.find((candidate) => candidate.id === modelId);
    const passage = model?.passages.find((candidate) => candidate.id === passageId);
    if (!model || !passage) return null;
    const scoredQuestions = passage.questions.filter((question) => question.correctAnswer !== null);
    const correct = scoredQuestions.reduce((sum, question) => {
      const selected = item.answers?.[question.id];
      return sum + (selected && question.options.find((option) => option.id === selected)?.isCorrect ? 1 : 0);
    }, 0);
    const answeredScored = scoredQuestions.filter((question) => item.answers?.[question.id]).length;
    return { key, item, model, passage, correct, answeredScored, score: answeredScored ? Math.round((correct / answeredScored) * 100) : 0 };
  }).filter(Boolean).sort((a, b) => String(b.item.updatedAt ?? '').localeCompare(String(a.item.updatedAt ?? '')));
  const answerStats = entries.reduce((stats, [key, item]) => {
    const [modelId, passageId] = key.split(':');
    const passage = models.find((candidate) => candidate.id === modelId)?.passages.find((candidate) => candidate.id === passageId);
    if (!passage) return stats;
    passage.questions.forEach((question) => {
      if (question.correctAnswer === null || !item.answers?.[question.id]) return;
      stats.answered += 1;
      if (question.options.find((option) => option.id === item.answers[question.id])?.isCorrect) stats.correct += 1;
    });
    return stats;
  }, { answered: 0, correct: 0 });
  const scoredAnswers = answerStats.answered;
  const correctAnswers = answerStats.correct;
  const serverReadingProgress = serverLearningStateLoaded ? (serverLearningState?.progress ?? []).filter((item) => item.skill === 'reading' && item.pieceSourceId) : null;
  const completedPieces = serverReadingProgress ? serverReadingProgress.filter((item) => item.status === 'completed').length : completedEntries.length;
  const progressPercent = passageCount ? (serverReadingProgress ? Math.round(serverReadingProgress.reduce((sum, item) => sum + Number(item.progressPercent ?? 0), 0) / passageCount) : Math.round((completedPieces / passageCount) * 100)) : 0;
  const hasLocalActivity = entries.length > 0;
  const remoteOverall = serverDashboard?.overall;
  const remoteAnswered = Number(remoteOverall?.correctAnswers ?? 0) + Number(remoteOverall?.wrongAnswers ?? 0);
  const accuracy = serverLearningStateLoaded ? (remoteAnswered ? Math.round((Number(remoteOverall?.correctAnswers ?? 0) / remoteAnswered) * 100) : 0) : hasLocalActivity ? (scoredAnswers ? Math.round((correctAnswers / scoredAnswers) * 100) : 0) : (remoteAnswered ? Math.round((Number(remoteOverall.correctAnswers) / remoteAnswered) * 100) : 0);
  const latest = entries.slice().sort((a, b) => String(b[1].updatedAt ?? '').localeCompare(String(a[1].updatedAt ?? '')))[0];
  let latestContext = null;
  if (latest) {
    const [modelId, passageId] = latest[0].split(':');
    const model = models.find((candidate) => candidate.id === modelId);
    const passage = model?.passages.find((candidate) => candidate.id === passageId);
    if (model && passage) latestContext = { model, passage, item: latest[1] };
  }
  const firstModel = models.find((model) => model.passages.length);
  const firstPassage = firstModel?.passages[0];
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weeklyCompleted = completedEntries.filter(([, item]) => item.updatedAt && new Date(item.updatedAt) >= weekStart).length;
  const activityDates = [...new Set(entries.flatMap(([, item]) => [
    ...(item.activityDates ?? []),
    ...(Object.values(item.answerMeta ?? {}).map((meta) => meta?.answeredAt).filter(Boolean)),
    item.updatedAt,
  ].filter(Boolean).map(dateKey)))].sort().reverse();
  let streak = 0;
  const today = new Date();
  for (let offset = 0; offset < activityDates.length + 1; offset += 1) {
    const expected = dateKey(new Date(today.getTime() - offset * 86400000));
    if (!activityDates.includes(expected)) break;
    streak += 1;
  }
  const activeDaysThisWeek = activityDates.filter((value) => new Date(value) >= weekStart).length;
  const avgSeconds = (() => {
    const values = entries.flatMap(([, item]) => Object.values(item.answerMeta ?? {}).map((meta) => Number(meta?.seconds)).filter((value) => Number.isFinite(value) && value > 0));
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  })();
  const skillStats = readingSkillLabels.map((label) => {
    let answeredCount = 0; let correctCount = 0;
    entries.forEach(([key, item]) => {
      const [modelId, passageId] = key.split(':');
      const passage = models.find((candidate) => candidate.id === modelId)?.passages.find((candidate) => candidate.id === passageId);
      passage?.questions.forEach((question) => {
        if (inferReadingSkill(question) !== label || question.correctAnswer === null || !item.answers?.[question.id]) return;
        answeredCount += 1;
        if (question.options.find((option) => option.id === item.answers[question.id])?.isCorrect) correctCount += 1;
      });
    });
    return { label, answered: answeredCount, accuracy: answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0 };
  });
  const reasonBreakdown = mistakeReasonLabels.map((label) => ({ label, count: uniqueMistakes.filter((mistake) => (mistake.reason ?? inferMistakeReason(questionMap.get(mistake.questionId)?.question)) === label).length })).filter((item) => item.count > 0).sort((a, b) => b.count - a.count);
  const focusSkill = skillStats.filter((item) => item.answered > 0).sort((a, b) => a.accuracy - b.accuracy)[0] ?? { label: 'الاستنتاج', accuracy: 54, answered: 0 };
  const dueMistakes = uniqueMistakes.filter((mistake) => !mistake.mastered && (!mistake.reviewAt || new Date(mistake.reviewAt) <= new Date()));
  const improvement = uniqueMistakes.map((mistake) => questionMap.get(mistake.questionId)).filter(Boolean)[0] ?? null;
  const weeklyAnswered = entries.reduce((sum, [, item]) => sum + Object.values(item.answerMeta ?? {}).filter((meta) => meta?.answeredAt && new Date(meta.answeredAt) >= weekStart).length, 0);
  const previousWeekStart = new Date(weekStart); previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const previousWeekAnswered = entries.reduce((sum, [, item]) => sum + Object.values(item.answerMeta ?? {}).filter((meta) => meta?.answeredAt && new Date(meta.answeredAt) >= previousWeekStart && new Date(meta.answeredAt) < weekStart).length, 0);
  const dashboardAnswered = serverLearningStateLoaded ? remoteAnswered : hasLocalActivity ? answered : remoteAnswered;
  const dashboardMistakeCount = serverMistakesLoaded || hasLocalActivity ? mistakeOccurrenceCount(mistakes.filter((mistake) => ['reading', 'grammar', 'listening'].includes(mistake.skill))) : Number(serverDashboard?.unreviewedMistakes ?? 0);
  return { passageCount, questionCount, completedPieces, completedEntries, answered: dashboardAnswered, mistakes, uniqueMistakes, dueMistakes, resultRows, progressPercent, accuracy, latestContext, firstModel, firstPassage, weeklyCompleted, improvement, dashboardMistakeCount, streak, activeDaysThisWeek, avgSeconds, skillStats, reasonBreakdown, focusSkill, weeklyAnswered, previousWeekAnswered };
}

function dashboardView() {
  const data = dashboardData();
  const resume = data.latestContext ?? (data.firstModel && data.firstPassage ? { model: data.firstModel, passage: data.firstPassage, item: { answers: {}, currentQuestionIndex: 0 } } : null);
  const resumePercent = resume?.item?.status === 'completed' ? 100 : resume?.passage?.questions.length ? Math.round((Object.keys(resume.item?.answers ?? {}).length / resume.passage.questions.length) * 100) : 0;
  const resumeButton = resume ? (data.latestContext ? `<button class="mint-action" data-resume-passage="${resume.model.id}|${resume.passage.id}">متابعة التدريب</button>` : `<button class="mint-action" data-open-model="${resume.model.id}">ابدأ التدريب</button>`) : '';
  const improvement = data.improvement ? `<article class="improvement-card"><span class="eyebrow">نقطة تحتاج تحسين</span><h3>${escapeHtml(data.improvement.passage.title)}</h3><p>راجع السؤال ${data.improvement.question.number} ضمن هذه القطعة وجرّب الإجابة مرة أخرى.</p><button data-open-model="${data.improvement.model.id}">تدرّب الآن <span>←</span></button></article>` : `<article class="improvement-card empty"><span class="eyebrow">نقطة تحتاج تحسين</span><h3>ستظهر هنا توصياتك</h3><p>ابدأ أول تدريب لتتعرف نباهة على المهارات التي تحتاج إلى تركيز.</p><button data-open-model="${data.firstModel?.id ?? 'reading-01'}">ابدأ التدريب <span>←</span></button></article>`;
  const recentResults = data.resultRows.slice(0, 3).map((row) => `<tr><td>${escapeHtml(row.passage.title)}</td><td>${row.score}%</td><td>${row.item.updatedAt ? new Date(row.item.updatedAt).toLocaleDateString('ar-SA') : '—'}</td></tr>`).join('');
  const trend = data.resultRows.slice(0, 4).reverse();
  const trendMarkup = trend.length ? trend.map((row) => `<span style="height:${Math.max(12, row.score)}%" title="${row.score}%"><b>${row.score}%</b></span>`).join('') : '<div class="dashboard-chart-empty">أكمل تدريبًا واحدًا ليظهر تطور دقتك هنا.</div>';
  const mistakeBreakdown = data.reasonBreakdown.length ? `<div class="mistake-reasons">${data.reasonBreakdown.slice(0, 3).map((item) => `<span><i>${item.count}</i>${escapeHtml(item.label)}</span>`).join('')}</div>` : '<p class="muted-copy">لا توجد أخطاء محفوظة بعد. ستظهر هنا فور إجابتك عن الأسئلة.</p>';
  const skillCards = data.skillStats.map((skill) => `<div class="mastery-item"><div><strong>${escapeHtml(skill.label)}</strong><span>${skill.answered ? `${skill.answered} سؤالًا محلولًا` : 'لم تُقَس بعد'}</span></div><b>${skill.accuracy}%</b><div class="skill-track"><i style="width:${skill.accuracy}%"></i></div></div>`).join('');
  const speedLabel = data.avgSeconds ? `${data.avgSeconds}ث` : '—';
  const speedHint = data.avgSeconds > 60 && data.accuracy >= 80 ? 'دقة ممتازة — تحتاج تحسين السرعة' : data.avgSeconds > 60 ? 'سرعتك أبطأ من هدفك — راجع بهدوء' : data.accuracy >= 80 && data.avgSeconds ? 'سرعتك متوازنة مع دقتك' : 'سنقيس سرعتك مع أول تدريب';
  return `<main class="dashboard-shell">${dashboardHeader('dashboard')}<section class="dashboard-intro"><span class="eyebrow">مساحة تعلمك الشخصية</span><h1>مرحبًا${account?.name ? `، ${escapeHtml(account.name)}` : ''} 👋</h1><p>لوحة هادئة تعرف مستواك وتقرر معك الخطوة التالية.</p></section><section class="dashboard-focus-grid"><article class="continue-card"><div class="continue-card-copy"><span class="eyebrow">تابع من حيث توقفت</span><h2>${resume ? `${escapeHtml(resume.model.title)} — ${escapeHtml(resume.passage.title)}` : 'ابدأ رحلتك الأولى'}</h2><p>${data.latestContext ? `آخر نشاط ${resume.item.updatedAt ? new Date(resume.item.updatedAt).toLocaleString('ar-SA') : 'محفوظ'}` : 'اختر قطعة وابدأ أول جلسة تدريب.'}</p><div class="continue-progress"><div><i style="width:${resumePercent}%"></i></div><strong>${resumePercent}%</strong></div>${resumeButton}</div><div class="continue-meta"><strong>${Object.keys(resume?.item?.answers ?? {}).length} من ${resume?.passage?.questions.length ?? 0}</strong><span>أسئلة مجابة</span></div></article><aside class="recommendation-card"><span class="eyebrow">ماذا أدرس الآن؟</span><h2>ننصحك اليوم بمراجعة <em>${escapeHtml(data.focusSkill.label)}</em></h2><p>دقتك فيه ${data.focusSkill.accuracy}%${data.focusSkill.answered ? ` بعد ${data.focusSkill.answered} سؤالًا` : ''}.</p><button class="mint-action" data-open-model="${data.firstModel?.id ?? 'reading-01'}">ابدأ تدريبًا مخصصًا <span>←</span></button></aside></section><section class="dashboard-stats dashboard-stats-four metric-strip"><article><strong>${data.progressPercent}%</strong><span>إنجاز المحتوى</span><small>${data.completedPieces} من ${data.passageCount} قطعة</small></article><article><strong>${data.accuracy}%</strong><span>دقة الإجابات</span><small>من ${data.answered} سؤالًا</small></article><article><strong>${data.streak} أيام</strong><span>أيام الانتظام</span><small>${data.activeDaysThisWeek}/7 أيام نشطة هذا الأسبوع</small></article><article><strong>${speedLabel}</strong><span>متوسط السؤال</span><small>${speedHint}</small></article></section><section class="dashboard-main-grid insight-grid"><article class="dashboard-panel mastery-panel"><header class="panel-heading"><div><span class="eyebrow">درجة إتقان لكل مهارة</span><h2>ملف المهارات</h2></div><span class="panel-note">Reading</span></header><div class="mastery-grid">${skillCards}</div></article><article class="dashboard-panel weekly-summary"><header class="panel-heading"><div><span class="eyebrow">ملخصك الأسبوعي</span><h2>هذا الأسبوع</h2></div></header><div class="weekly-summary-number"><strong>${data.weeklyAnswered}</strong><span>سؤالًا حللت</span></div><p>${data.previousWeekAnswered ? `مقابل ${data.previousWeekAnswered} الأسبوع الماضي` : 'أكمل تدريبًا اليوم ليبدأ ملخصك.'}</p><div class="weekly-quality"><span>أقوى مهارة <b>${escapeHtml(data.skillStats.slice().sort((a, b) => b.accuracy - a.accuracy)[0]?.label ?? '—')}</b></span><span>تحتاج تحسين <b>${escapeHtml(data.focusSkill.label)}</b></span></div></article></section><section class="dashboard-main-grid"><article class="dashboard-panel skills-panel"><header class="panel-heading"><div><span class="eyebrow">تقدمك حسب القسم</span><h2>المسارات</h2></div></header><div class="skill-row"><div><strong>Reading</strong><span>${data.completedPieces} من ${data.passageCount} قطعة مكتملة</span></div><b>${data.progressPercent}%</b><div class="skill-track"><i style="width:${data.progressPercent}%"></i></div></div><div class="skill-row"><div><strong>Grammar</strong><span>تدريبات القواعد قيد الإضافة</span></div><b>0%</b><div class="skill-track"><i style="width:0%"></i></div></div><div class="skill-row"><div><strong>Listening</strong><span>4 نماذج · 34 مقطعًا جاهزًا للأسئلة</span></div><b>متاح</b><div class="skill-track"><i style="width:100%"></i></div></div></article>${improvement}</section><section class="dashboard-main-grid lower-grid"><article class="dashboard-panel mistakes-panel"><header class="panel-heading"><div><span class="eyebrow">مراجعة أخطائي</span><h2>${data.dashboardMistakeCount} خطأ جاهزًا للمراجعة</h2></div><button class="text-action" data-dashboard-section="mistakes">عرض الكل</button></header>${mistakeBreakdown}<button class="navy-action" data-dashboard-section="mistakes">ابدأ المراجعة <span>←</span></button></article><article class="dashboard-panel suggestion-panel"><span class="eyebrow">تدريب اليوم</span><h2>${data.dashboardMistakeCount ? 'جلسة من أخطائك ونقاط ضعفك' : 'جلسة تأسيسية قصيرة'}</h2><p>جلسة قصيرة من الأخطاء والمهارات التي تحتاج تركيزك، ثم نعيد جدولة ما يحتاج مراجعة.</p><button class="mint-action" data-open-model="${data.firstModel?.id ?? 'reading-01'}">ابدأ تدريب اليوم</button></article></section><section class="dashboard-main-grid lower-grid"><article class="dashboard-panel results-panel"><header class="panel-heading"><div><span class="eyebrow">آخر النتائج</span><h2>محاولاتك الأخيرة</h2></div><button class="text-action" data-dashboard-section="progress">عرض جميع النتائج</button></header><table><thead><tr><th>التدريب</th><th>النتيجة</th><th>التاريخ</th></tr></thead><tbody>${recentResults || '<tr><td colspan="3" class="table-empty">لا توجد نتائج مكتملة بعد.</td></tr>'}</tbody></table></article><article class="dashboard-panel chart-panel"><header class="panel-heading"><div><span class="eyebrow">تحسن الطالب</span><h2>تطور دقتك</h2></div><span class="chart-range">آخر 30 يومًا</span></header><div class="dashboard-chart" aria-label="تطور دقة الإجابات">${trendMarkup}</div></article></section></main>`;
}

function dashboardModelsView() {
  const filtered = visibleModels();
  return `<main class="dashboard-shell dashboard-models-shell">${dashboardHeader('reading')}<header class="dashboard-page-heading"><div><span>مكتبة التدريب</span><h1>نماذج القراءة</h1><p>اختر النموذج للوصول إلى قطعه واختباراته.</p></div><button class="outline-action" data-dashboard>لوحة التحكم</button></header><section class="models-section dashboard-models-section"><section class="toolbar" aria-label="أدوات النماذج"><label class="search"><span>⌕</span><input id="search" value="${escapeHtml(state.query)}" placeholder="ابحث برقم النموذج أو اسم القطعة" /></label></section><section class="reading-grid">${filtered.map((model) => { const modelState = readingModelState(model); return `<button class="reading-card ${model.passages.length ? '' : 'locked'} ${modelState.className}" ${model.passages.length ? `data-open-model="${model.id}"` : 'disabled'}><span class="reading-number">${modelNumber(model)}</span><span class="reading-title">${escapeHtml(model.title)}</span><span class="reading-meta">${model.passages.length ? `${model.passages.length} قطع داخلية` : 'بانتظار الإضافة'}</span><span class="reading-status ${modelState.className}">${modelState.label}</span></button>`; }).join('')}</section></section></main>`;
}

function renderMistakeSurface() {
  const source = visibleMistakes();
  const labels = { reading: 'القراءة', grammar: 'القواعد', listening: 'الاستماع' };
  const skills = Object.keys(labels);
  const activeSkill = state.mistakeSkill && labels[state.mistakeSkill] ? state.mistakeSkill : null;
  const dismissing = state.dismissMistakeId ? source.find((mistake) => mistake.id === state.dismissMistakeId) : null;
  const confirmDialog = dismissing ? `<div class="mistake-confirm-backdrop" role="presentation"><section class="mistake-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="dismiss-mistake-title"><h2 id="dismiss-mistake-title">إزالة من أخطائي</h2><p>هل تريد إزالة هذا السؤال من قائمة أخطائك؟</p><div><button class="outline-action" data-cancel-dismiss-mistake>إلغاء</button><button class="navy-action" data-confirm-dismiss-mistake="${dismissing.id}">إزالة</button></div></section></div>` : '';
  if (!activeSkill) return `<section class="mistake-category-grid">${skills.map((skill) => `<button class="mistake-category-card" data-mistake-skill="${skill}"><span>${labels[skill]}</span><strong>${mistakeOccurrenceCount(source.filter((mistake) => mistake.skill === skill))}</strong><small>خطأ · راجع أخطاءك ←</small></button>`).join('')}</section><p class="mistakes-total">الإجمالي <strong>${mistakeOccurrenceCount(source)}</strong> خطأ</p>${confirmDialog}`;
  const items = source.filter((mistake) => mistake.skill === activeSkill);
  const list = items.length ? `<div class="dashboard-mistakes-list">${items.map((mistake) => `<article class="dashboard-mistake-card"><span class="mistake-meta">سؤال · ${mistake.mistakeCount} ${mistake.mistakeCount === 1 ? 'مرة' : 'مرات'}</span><h3 dir="ltr">${escapeHtml(mistake.questionText)}</h3><p>آخر خطأ: ${mistake.lastSeenAt ? new Date(mistake.lastSeenAt).toLocaleDateString('ar-SA') : '—'}</p>${mistake.skill === 'grammar' ? `<div class="mistake-card-rule"><span>الإجابة الصحيحة</span><strong dir="ltr">${escapeHtml(mistake.correctAnswer ?? 'غير محددة')}</strong><small>${escapeHtml(grammarMistakeReason(mistake))}</small></div>` : ''}<div class="mistake-card-actions"><button class="mistake-solve-action" data-solve-mistake="${mistake.id}">حل السؤال</button><button data-review-mistake="${mistake.id}">مراجعة السؤال</button><button class="mistake-dismiss-action" data-dismiss-mistake="${mistake.id}">إزالة من أخطائي</button></div></article>`).join('')}</div>` : '<div class="dashboard-empty"><strong>لا توجد أخطاء في هذا القسم</strong><p>ستظهر هنا الإجابات الخاطئة المحفوظة في حسابك.</p></div>';
  return `<button class="back-button mistake-back" data-clear-mistake-skill>← كل الأقسام</button>${list}${confirmDialog}`;
}

function mistakeQuestionView(mistake) {
  const labels = { reading: 'القراءة', grammar: 'القواعد', listening: 'الاستماع' };
  const explanationLabel = mistake.skill === 'reading' ? 'لماذا هذه الإجابة؟' : mistake.skill === 'grammar' ? 'القاعدة والتفسير' : 'تفسير الإجابة';
  const options = mistake.options ?? [];
  const correctReason = mistake.skill === 'grammar' ? grammarMistakeReason(mistake) : mistake.explanation ?? 'الإجابة الصحيحة هي الأقرب إلى النص والمطلوب في السؤال.';
  return `<main class="dashboard-shell mistake-question-shell">${dashboardHeader('mistakes')}<header class="dashboard-page-heading mistake-question-top"><div><span>مراجعة أخطائي · ${labels[mistake.skill] ?? 'التدريب'}</span><h1>مراجعة السؤال ${mistake.questionOrder ?? ''}</h1><p>يبقى هذا الخطأ محفوظًا حتى تزيله بنفسك من قسم أخطائي.</p></div><button class="outline-action" data-back-to-mistakes>العودة لأخطاء ${labels[mistake.skill] ?? 'القسم'}</button></header><article class="mistake-question-card">${mistake.skill === 'listening' && mistake.audioUrl ? `<audio controls preload="metadata" src="${escapeHtml(mistake.audioUrl)}" data-listening-review></audio>` : ''}<div class="question-heading mistake-question-heading" dir="ltr"><span class="question-number">${String(mistake.questionOrder ?? '').padStart(2, '0')}</span><div class="question-text">${escapeHtml(mistake.questionText)}</div></div><div class="mistake-question-options" role="list">${options.map((option, index) => { const isCorrect = option.value === mistake.correctAnswer; const isSelected = option.value === mistake.selectedAnswer; return `<div class="mistake-question-option ${isCorrect ? 'is-correct' : ''} ${isSelected && !isCorrect ? 'is-wrong' : ''}" role="listitem"><span>${String.fromCharCode(65 + index)}</span><strong>${escapeHtml(option.value)}</strong>${isCorrect ? '<small>الإجابة الصحيحة</small>' : isSelected ? '<small>إجابتك</small>' : ''}</div>`; }).join('')}</div><section class="mistake-answer-summary"><p><span>إجابتك الأخيرة</span><strong>${escapeHtml(mistake.selectedAnswer ?? '—')}</strong></p><p><span>الإجابة الصحيحة</span><strong>${escapeHtml(mistake.correctAnswer ?? 'غير محددة')}</strong></p></section><div class="mistake-explanation mistake-choice-explanation"><strong>سبب اختيارك السابق</strong><p>${escapeHtml(mistakeChoiceReason(mistake))}</p></div><div class="mistake-explanation"><strong>${explanationLabel}</strong><p>${escapeHtml(correctReason)}</p></div></article></main>`;
}

function mistakeSolveView(mistake) {
  const labels = { reading: 'القراءة', grammar: 'القواعد', listening: 'الاستماع' };
  const options = mistake.options ?? [];
  const selected = state.mistakeSolveAnswer;
  const answered = selected !== null && selected !== undefined;
  const isCorrect = answered && selected === mistake.correctAnswer;
  const explanation = mistake.skill === 'grammar' ? grammarMistakeReason(mistake) : mistake.explanation ?? 'قارن الإجابة بالمعلومة المباشرة المطلوبة في السؤال.';
  return `<main class="dashboard-shell mistake-question-shell mistake-solve-shell">${dashboardHeader('mistakes')}<header class="dashboard-page-heading mistake-question-top"><div><span>حل من أخطائي · ${labels[mistake.skill] ?? 'التدريب'}</span><h1>حل السؤال ${mistake.questionOrder ?? ''}</h1><p>اختر إجابتك من جديد. لن يظهر الحل قبل إجابتك، ولن يُحذف الخطأ تلقائيًا.</p></div><button class="outline-action" data-back-to-mistakes>العودة لأخطاء ${labels[mistake.skill] ?? 'القسم'}</button></header><article class="mistake-question-card">${mistake.skill === 'listening' && mistake.audioUrl ? `<audio controls preload="metadata" src="${escapeHtml(mistake.audioUrl)}" data-listening-review></audio>` : ''}<div class="question-heading mistake-question-heading" dir="ltr"><span class="question-number">${String(mistake.questionOrder ?? '').padStart(2, '0')}</span><div class="question-text">${escapeHtml(mistake.questionText)}</div></div><div class="mistake-question-options mistake-solve-options" role="list">${options.map((option, index) => { const optionSelected = selected === option.value; const showCorrect = answered && option.value === mistake.correctAnswer; return `<button class="mistake-question-option ${showCorrect ? 'is-correct' : ''} ${optionSelected && !showCorrect ? 'is-wrong' : ''}" data-mistake-solve-option="${index}" ${answered ? 'disabled' : ''}><span>${String.fromCharCode(65 + index)}</span><strong>${escapeHtml(option.value)}</strong>${showCorrect ? '<small>الإجابة الصحيحة</small>' : optionSelected ? '<small>اختيارك</small>' : ''}</button>`; }).join('')}</div>${answered ? `<div class="mistake-solve-feedback ${isCorrect ? 'is-correct' : 'is-wrong'}"><strong>${isCorrect ? 'أحسنت، إجابتك صحيحة.' : `ليست الإجابة الصحيحة. الحل: ${escapeHtml(mistake.correctAnswer ?? 'غير محدد')}`}</strong><p>${escapeHtml(explanation)}</p>${!isCorrect ? '<button data-retry-mistake-solve>حاول مرة أخرى</button>' : ''}</div>` : ''}</article></main>`;
}

function dashboardSectionView(section) {
  const labels = { mistakes: ['أخطائي', 'راجع الإجابات التي تحتاج إلى تحسين وحوّلها إلى تقدم.'], grammar: ['القواعد', 'مسارات القواعد ستضاف تدريجيًا إلى خطتك.'], listening: ['الاستماع', 'نماذج استماع منظمة إلى مقاطع وأسئلة قصيرة.'], writing: ['الكتابة', 'تدريبات الكتابة ستضاف تدريجيًا إلى خطتك.'], exams: ['الاختبارات', 'ابدأ اختبارًا تدريبيًا وتابع نتائج محاولاتك.'], progress: ['تقدمي', 'راجع نتائجك وتطور دقتك عبر الوقت.'], frequent: ['الأكثر تكرارًا', 'وصول مباشر إلى تدريبات STEP الأعلى تكرارًا.'], profile: ['الملف الشخصي', 'بيانات حسابك وإعدادات الوصول.'], settings: ['إعدادات الحساب', 'تحكم في تفضيلات حسابك وبيانات جلستك.'], subscription: ['الاشتراك', 'تفاصيل الوصول إلى مزايا نباهة.'], help: ['المساعدة', 'إجابات سريعة وإرشادات استخدام المنصة.'], reading: ['فهم المقروء', 'تدرب على فهم القطع وربط الفكرة بالتفاصيل.'] };
  const [title, subtitle] = labels[section] ?? labels.mistakes;
  const mistakes = Object.values(progress).flatMap((item) => item.mistakes ?? []);
  const questionMap = new Map(models.flatMap((model) => model.passages.flatMap((passage) => passage.questions.map((question) => [question.id, { model, passage, question }]))));
  let content = '';
  if (section === 'mistakes') {
    const data = dashboardData();
    const reasonSummary = data.reasonBreakdown.length ? `<section class="mistakes-summary"><span class="eyebrow">تحليل سبب الخطأ</span><h2>أكثر سبب تخسر فيه درجاتك: <em>${escapeHtml(data.reasonBreakdown[0].label)}</em></h2><div>${data.reasonBreakdown.map((item) => `<span><b>${item.count}</b>${escapeHtml(item.label)}</span>`).join('')}</div></section>` : '';
    content = `${reasonSummary}${mistakes.length ? `<div class="dashboard-mistakes-list">${mistakes.map((mistake) => { const match = questionMap.get(mistake.questionId); const reason = mistake.reason ?? inferMistakeReason(match?.question); const reviewText = mistake.mastered ? 'تم الإتقان' : mistake.reviewAt && new Date(mistake.reviewAt) > new Date() ? `المراجعة ${new Date(mistake.reviewAt).toLocaleDateString('ar-SA')}` : 'جاهز للمراجعة'; return `<article class="dashboard-mistake-card"><span class="mistake-meta">سؤال ${match?.question.number ?? '—'} · ${escapeHtml(reason)}</span><div class="question-heading dashboard-question-heading" dir="ltr"><span class="question-number">${String(match?.question.number ?? '').padStart(2, '0')}</span><div class="question-text">${escapeHtml(match?.question.question ?? 'سؤال غير متاح')}</div></div><p>${escapeHtml(match ? `${match.passage.title} · النموذج ${modelNumber(match.model)}` : 'بيانات السؤال محفوظة للمراجعة')}</p><div class="mistake-review-status ${mistake.mastered ? 'mastered' : ''}">${reviewText}</div><button data-open-model="${match?.model.id ?? 'reading-01'}">أعد التدريب</button></article>`; }).join('')}</div>` : '<div class="dashboard-empty"><strong>لا توجد أخطاء حتى الآن</strong><p>أكمل بعض التدريبات وستظهر هنا الأسئلة التي تحتاج مراجعتها.</p><button class="orange-action" data-models-scroll>ابدأ التدريب</button></div>'}`;
    content = renderMistakeSurface();
  } else if (section === 'frequent') {
    content = `<section class="dashboard-panel frequent-section"><header class="panel-heading"><div><span class="eyebrow">اختيارات مركزة</span><h2>تدريبات الأكثر تكرارًا</h2></div></header><p class="muted-copy">اختر المسار الذي تريد التدرب عليه. هذه صفحة مستقلة، ويمكنك الرجوع إليها مباشرة من الشريط العلوي.</p><div class="frequent-section-grid"><button data-dashboard-section="reading"><strong>القراءة</strong><span>القطع والأسئلة الأكثر تكرارًا</span></button><button data-dashboard-section="grammar"><strong>القواعد</strong><span>قواعد STEP الأكثر تكرارًا</span></button><button data-dashboard-section="listening"><strong>الاستماع</strong><span>المقاطع الأعلى تكرارًا</span></button></div></section>`;
  } else if (section === 'profile') {
    content = `<div class="dashboard-profile-card"><span class="dashboard-avatar large">${escapeHtml((account?.name ?? 'ح').charAt(0))}</span><h2>${escapeHtml(account?.name ?? 'المستخدم')}</h2><p>${escapeHtml(account?.email ?? '')}</p><button class="dashboard-logout" data-logout>تسجيل الخروج</button></div>`;
  } else if (section === 'progress') {
    const data = dashboardData();
    content = `<section class="dashboard-panel progress-detail-panel"><header class="panel-heading"><div><span class="eyebrow">ملخص تقدمك</span><h2>${data.progressPercent}% تقدم عام</h2></div></header><div class="progress-detail-grid"><div><strong>${data.progressPercent}%</strong><span>إنجاز المحتوى</span></div><div><strong>${data.accuracy}%</strong><span>دقة الإجابات</span></div><div><strong>${data.streak}</strong><span>أيام الانتظام</span></div><div><strong>${data.avgSeconds || '—'}${data.avgSeconds ? 'ث' : ''}</strong><span>متوسط السؤال</span></div></div><div class="mastery-grid progress-mastery-grid">${data.skillStats.map((skill) => `<div class="mastery-item"><div><strong>${escapeHtml(skill.label)}</strong><span>${skill.answered} سؤالًا</span></div><b>${skill.accuracy}%</b><div class="skill-track"><i style="width:${skill.accuracy}%"></i></div></div>`).join('')}</div></section>`;
  } else if (section === 'exams') {
    content = `<section class="dashboard-panel exams-panel"><header class="panel-heading"><div><span class="eyebrow">اختبارات STEP</span><h2>ابدأ اختبارًا جديدًا</h2></div></header><p class="muted-copy">اختر أي نموذج قراءة متاح وابدأ بمحاولة منظمة. تحفظ نباهة إجاباتك لتعود إليها لاحقًا.</p><button class="navy-action" data-models-scroll>استعرض النماذج <span>←</span></button></section>`;
  } else if (section === 'settings') {
    const soundSettings = soundManager.getSettings();
    const soundPercent = (value) => Math.round(value * 100);
    content = `<section class="dashboard-panel settings-panel"><header class="panel-heading"><div><span class="eyebrow">تجربة هادئة</span><h2>الصوت</h2></div><span class="settings-state ${soundSettings.enabled ? 'on' : 'off'}">${soundSettings.enabled ? 'مفعّلة' : 'متوقفة'}</span></header><p class="muted-copy">تحكم في كل مستوى بشكل مستقل. التغيير يُحفظ على هذا الجهاز ويُطبّق فورًا.</p><div class="sound-setting-row"><div><strong>🔊 أصوات التفاعل</strong><span>اختيار الإجابة، الصحيح والخطأ، والإنجاز</span></div><button class="sound-toggle ${soundSettings.enabled ? 'is-on' : ''}" data-toggle-sounds aria-pressed="${soundSettings.enabled}">${soundSettings.enabled ? 'تشغيل' : 'إيقاف'}</button></div><div class="sound-controls"><label class="sound-control"><span><strong>أصوات التفاعل</strong><output data-sound-value="volume">${soundPercent(soundSettings.volume)}%</output></span><input type="range" min="0" max="100" step="5" value="${soundPercent(soundSettings.volume)}" data-sound-slider="volume" aria-label="مستوى أصوات التفاعل"></label><label class="sound-control"><span><strong>صوت الاستماع</strong><output data-sound-value="listeningVolume">${soundPercent(soundSettings.listeningVolume)}%</output></span><input type="range" min="0" max="100" step="5" value="${soundPercent(soundSettings.listeningVolume)}" data-sound-slider="listeningVolume" aria-label="مستوى صوت الاستماع"></label></div><button class="outline-action sound-test-button" data-sound-test ${soundSettings.enabled ? '' : 'disabled'}>تشغيل صوت تجريبي</button><small class="sound-settings-hint">تبقى أصوات الإجابات والإنجاز مفعّلة، بينما الانتقال بين الأسئلة صامت.</small></section>`;
  } else {
    content = `<div class="dashboard-empty"><strong>هذا القسم قيد التجهيز</strong><p>ستتم إضافة المحتوى المعتمد إلى هذا القسم قريبًا. يمكنك متابعة نماذج القراءة المتاحة الآن.</p><button class="orange-action" data-models-scroll>استكشف القراءة</button></div>`;
  }
  return `<main class="dashboard-shell dashboard-section-shell">${dashboardHeader(section)}<header class="dashboard-page-heading"><div><span>مساحة التعلم</span><h1>${title}</h1><p>${subtitle}</p></div><button class="outline-action" data-dashboard-section="dashboard">لوحة التحكم</button></header>${content}</main>`;
}

function grammarProgress(modelId) {
  return progress.grammar?.[modelId] ?? { answers: {}, results: {}, status: 'not-started', currentQuestionIndex: 0 };
}

function setGrammarProgress(modelId, update) {
  progress.grammar = { ...(progress.grammar ?? {}), [modelId]: { ...grammarProgress(modelId), ...update, updatedAt: new Date().toISOString() } };
  saveProgress();
}

const grammarCategoryOrder = ['general', 'incorrect', 'correct-sentence', 'word-order', 'capitalization', 'punctuation', 'special'];
const grammarCategoryNames = { general: 'القواعد العامة', incorrect: 'اكتشاف الخطأ', 'correct-sentence': 'الجملة الصحيحة', 'word-order': 'ترتيب الكلمات', capitalization: 'Capitalization', punctuation: 'Punctuation', special: 'أسئلة خاصة' };

function grammarLibraryView() {
  const available = grammarModels.filter((model) => model.status === 'available');
  return `<main class="dashboard-shell grammar-shell">${dashboardHeader('grammar')}<header class="dashboard-page-heading"><div><span>مسار STEP · التراكيب النحوية</span><h1>نماذج القواعد</h1><p>44 نموذجًا مرتبة بعناية؛ أول ثلاثة نماذج جاهزة للتدريب بالمحتوى المعتمد.</p></div><button class="outline-action" data-dashboard-section="dashboard">لوحة التحكم</button></header><section class="grammar-intro-card"><div><span class="eyebrow">منهج نباهة</span><h2>تدرّب على القاعدة، ثم افهم سبب الإجابة</h2><p>رتّبنا كل نموذج من القواعد العامة إلى الأسئلة الخاصة، مع الحفاظ على الإجابات كما ظهرت في المصدر.</p></div><div class="grammar-category-sequence">${grammarCategoryOrder.map((category, index) => `<span><b>${index + 1}</b>${grammarCategoryNames[category]}</span>`).join('')}</div></section><section class="grammar-model-grid" aria-label="نماذج القواعد">${grammarModels.map((model) => { const saved = grammarProgress(model.id); const done = saved.status === 'completed'; const statusClass = model.status !== 'available' ? 'status-unavailable' : done ? 'status-completed' : 'status-incomplete'; const statusLabel = model.status !== 'available' ? 'غير متاح' : done ? 'تم الحل' : 'لم يتم الحل'; return `<article class="grammar-model-card ${model.status === 'available' ? 'is-available' : 'is-locked'} ${statusClass}"><div class="grammar-model-number">${String(model.order).padStart(2, '0')}</div><div class="grammar-model-copy"><span class="eyebrow">نموذج ${model.order}</span><h2>${escapeHtml(model.title)}</h2><p>${escapeHtml(model.subtitle)}</p></div><span class="grammar-model-status ${statusClass}">${statusLabel}</span>${model.status === 'available' ? `<button class="mint-action" data-open-grammar-model="${model.id}">${done ? 'مراجعة النموذج' : 'ابدأ التدريب'} <span>←</span></button>` : '<span class="grammar-lock" aria-label="نموذج غير متاح">🔒</span>'}</article>`; }).join('')}</section><section class="grammar-source-note"><strong>أمانة المصدر</strong><span>الإجابة المعتمدة هي الإجابة المحددة في المصدر. السؤال 100 في النموذج الثالث محفوظ بلا إجابة لأن التسطير غير واضح في الصورة.</span></section></main>`;
}

function grammarQuestionView(model) {
  const questions = model.questions;
  const index = Math.min(state.grammarQuestionIndex, Math.max(0, questions.length - 1));
  const question = questions[index];
  const selected = state.grammarAnswers?.[question.id];
  const confirmed = state.grammarConfirmed?.[question.id];
  const selectedTutorOption = selected === undefined ? null : { id: `${question.id}-o${selected}`, text: question.options[selected], isCorrect: question.correctIndex === selected };
  const grammarTutorKey = tutorSessionKey(model, { id: 'grammar' }, question);
  const progressPercent = Math.round(((index + (selected !== undefined ? 1 : 0)) / questions.length) * 100);
  return `<main class="dashboard-shell grammar-quiz-shell">${dashboardHeader('grammar')}<header class="grammar-quiz-top"><button class="back-button" data-grammar-library>← نماذج القواعد</button><div><span class="eyebrow">${escapeHtml(model.title)}</span><h1>السؤال ${question.displayOrder} من ${questions.length}</h1></div><div class="grammar-quiz-progress"><span>${progressPercent}%</span><div><i style="width:${progressPercent}%"></i></div></div></header><section class="grammar-question-card"><div class="grammar-question-meta"><span class="grammar-category-pill">${escapeHtml(question.categoryLabel)}</span><span>رقم المصدر: ${question.sourceNumber}</span></div><div class="grammar-tutor-anchor" data-tutor-scope="grammar"><button class="question-tutor-trigger" data-tutor-scope="grammar" data-tutor-toggle="${question.id}" aria-label="اسأل نباهة" title="اسأل نباهة" aria-haspopup="dialog" aria-expanded="${state.tutorOpen && state.tutorQuestionKey === grammarTutorKey}" aria-controls="question-tutor">${tutorSparkleIcon()}</button>${tutorPopover(model, { id: 'grammar' }, question, selectedTutorOption)}</div><div class="question-heading grammar-question-heading" dir="ltr"><span class="question-number">${String(question.displayOrder).padStart(2, '0')}</span><div class="question-text">${escapeHtml(question.prompt)}</div></div><div class="grammar-options" role="list">${question.options.map((option, optionIndex) => { const isSelected = selected === optionIndex; const isRight = confirmed !== undefined && question.correctIndex !== null && optionIndex === question.correctIndex; const isWrong = confirmed !== undefined && question.correctIndex !== null && optionIndex !== question.correctIndex; return `<button class="grammar-option ${isSelected ? 'is-selected' : ''} ${isRight ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}" data-grammar-option="${optionIndex}" ${selected !== undefined || state.grammarPendingQuestionId === question.id ? 'disabled' : ''}><span>${String.fromCharCode(65 + optionIndex)}</span><strong>${escapeHtml(option)}</strong></button>`; }).join('')}</div>${state.grammarPendingQuestionId === question.id ? '<p class="grammar-confirming">جارٍ تأكيد الإجابة…</p>' : ''}${confirmed !== undefined ? `<div class="grammar-feedback ${confirmed ? 'is-correct' : 'is-wrong'}"><strong>${confirmed ? 'أحسنت، إجابة صحيحة.' : question.correctIndex === null ? 'تم حفظ إجابتك، لكن الإجابة المعتمدة غير محددة في المصدر.' : 'ليست الإجابة الصحيحة.'}</strong>${!confirmed && question.correctIndex !== null ? `<span>الحل الصحيح: ${String.fromCharCode(65 + question.correctIndex)}) ${escapeHtml(question.options[question.correctIndex])}</span>` : ''}${question.sourceNote ? `<small>${escapeHtml(question.sourceNote)}</small>` : ''}</div>` : ''}</section><footer class="grammar-quiz-actions"><button class="outline-action" data-grammar-previous ${index === 0 ? 'disabled' : ''}>السابق</button><button class="mint-action" data-grammar-next ${selected === undefined || state.grammarPendingQuestionId ? 'disabled' : ''}>${index === questions.length - 1 ? 'إنهاء التدريب' : 'السؤال التالي'} <span>←</span></button></footer></main>`;
}

function grammarResultView(model) {
  const saved = grammarProgress(model.id);
  const scored = model.questions.filter((question) => question.correctIndex !== null);
  const correct = scored.filter((question) => saved.results?.[question.id] === true).length;
  const score = scored.length ? Math.round((correct / scored.length) * 100) : 0;
  return `<main class="dashboard-shell grammar-result-shell">${dashboardHeader('grammar')}<section class="grammar-result-card"><span class="eyebrow">نتيجة التدريب</span><h1>${escapeHtml(model.title)} مكتمل</h1><div class="grammar-score"><strong>${score}%</strong><span>${correct} من ${scored.length} إجابة صحيحة</span></div><p>حافظنا على ترتيبك وإجابات المصدر لتتمكن من مراجعة كل سؤال بهدوء.</p><div class="grammar-result-actions"><div class="result-retry-stack"><button class="mint-action" data-grammar-retry>إعادة التدريب</button><button class="outline-action result-mistakes-action" data-open-mistakes="grammar">مراجعة أخطاء القواعد</button></div><button class="outline-action" data-grammar-library>العودة للنماذج</button></div></section></main>`;
}

function listeningProgress(modelId, recordingId) {
  return progress.listening?.[modelId]?.[recordingId] ?? { answers: {}, results: {}, status: 'not-started', currentQuestionIndex: 0 };
}

function setListeningProgress(modelId, recordingId, update) {
  progress.listening = {
    ...(progress.listening ?? {}),
    [modelId]: {
      ...(progress.listening?.[modelId] ?? {}),
      [recordingId]: { ...listeningProgress(modelId, recordingId), ...update, updatedAt: new Date().toISOString() },
    },
  };
  saveProgress();
}

function listeningLibraryView() {
  const totalRecordings = listeningModels.reduce((sum, model) => sum + model.recordings.length, 0);
  const totalQuestions = listeningModels.reduce((sum, model) => sum + model.recordings.reduce((count, item) => count + item.questions.length, 0), 0);
  return `<main class="dashboard-shell listening-shell">${dashboardHeader('listening')}
    <header class="dashboard-page-heading listening-page-heading"><div><span>مسار STEP · الاستماع</span><h1>نماذج الاستماع</h1><p>اختر نموذجًا، استمع إلى كل مقطع، ثم أجب عن أسئلته بالترتيب.</p></div><button class="outline-action" data-dashboard-section="dashboard">لوحة التحكم</button></header>
    <section class="listening-overview" aria-label="ملخص محتوى الاستماع"><div><strong>${listeningModels.length}</strong><span>نماذج</span></div><div><strong>${totalRecordings}</strong><span>مقطعًا صوتيًا</span></div><div><strong>${totalQuestions}</strong><span>سؤالًا</span></div><p><b>ملاحظة المصدر</b><span>الأسئلة غير المحسومة محفوظة بلا إجابة معتمدة حتى تتم مراجعتها.</span></p></section>
    <section class="listening-model-grid" aria-label="نماذج الاستماع">${listeningModels.map((model) => {
      const completed = model.recordings.filter((item) => listeningProgress(model.id, item.id).status === 'completed').length;
      const percent = Math.round((completed / model.recordings.length) * 100);
      return `<article class="listening-model-card"><header><span class="listening-model-index">${String(model.order).padStart(2, '0')}</span><span class="listening-model-state ${percent === 100 ? 'is-complete' : ''}">${percent === 100 ? 'مكتمل' : percent ? 'قيد التدريب' : 'جديد'}</span></header><div><span class="eyebrow">نموذج ${model.order}</span><h2>${escapeHtml(model.title)}</h2><p>${escapeHtml(model.subtitle)}</p></div><div class="listening-model-facts"><span><b>${model.recordings.length}</b> مقاطع</span><span><b>${model.recordings.reduce((count, item) => count + item.questions.length, 0)}</b> سؤالًا</span></div><div class="listening-card-progress"><div><i style="width:${percent}%"></i></div><span>${completed}/${model.recordings.length}</span></div><button class="navy-action" data-open-listening-model="${model.id}">${percent ? 'متابعة النموذج' : 'عرض المقاطع'} <span>←</span></button></article>`;
    }).join('')}</section>
  </main>`;
}

function listeningModelView(model) {
  const completed = model.recordings.filter((item) => listeningProgress(model.id, item.id).status === 'completed').length;
  return `<main class="dashboard-shell listening-shell">${dashboardHeader('listening')}
    <header class="listening-model-hero"><button class="back-button" data-listening-library>← نماذج الاستماع</button><div><span class="eyebrow">النموذج ${model.order}</span><h1>${escapeHtml(model.title)}</h1><p>${completed} من ${model.recordings.length} مقاطع مكتملة</p></div><div class="listening-wave" aria-hidden="true">${[32,54,76,42,88,62,36,70,48,82,56,28].map((height) => `<i style="height:${height}%"></i>`).join('')}</div></header>
    <section class="recording-grid" aria-label="مقاطع ${escapeHtml(model.title)}">${model.recordings.map((item) => {
      const saved = listeningProgress(model.id, item.id);
      const answered = Object.keys(saved.answers ?? {}).length;
      const done = saved.status === 'completed';
      const questionRange = item.questions.length === 1 ? `السؤال ${item.questions[0].number}` : `الأسئلة ${item.questions[0].number}–${item.questions.at(-1).number}`;
      return `<article class="recording-card ${done ? 'is-complete' : ''}"><div class="recording-icon" aria-hidden="true"><span>▶</span></div><div class="recording-copy"><span>${questionRange}</span><h2>المقطع ${item.order}</h2><p>${item.questions.length} ${item.questions.length === 1 ? 'سؤال' : 'أسئلة'} · ${done ? 'مكتمل' : answered ? `${answered} مجابة` : 'لم يبدأ'}</p></div><span class="recording-status">${done ? '✓' : String(item.order).padStart(2, '0')}</span><button data-open-recording="${item.id}">${done ? 'مراجعة المقطع' : answered ? 'متابعة التدريب' : 'ابدأ الاستماع'} <span>←</span></button></article>`;
    }).join('')}</section>
  </main>`;
}

function listeningQuizView(model, recordingItem) {
  const questions = recordingItem.questions;
  const index = Math.min(state.listeningQuestionIndex, Math.max(0, questions.length - 1));
  const question = questions[index];
  const saved = listeningProgress(model.id, recordingItem.id);
  const selected = state.listeningAnswers?.[question.id];
  const answered = selected !== undefined;
  const hasSourceAnswer = Number.isInteger(question.correctIndex);
  const progressPercent = Math.round(((index + (answered || !question.options.length ? 1 : 0)) / questions.length) * 100);
  const options = question.options.map((option, optionIndex) => {
    const isSelected = selected === optionIndex;
    const isCorrect = answered && hasSourceAnswer && optionIndex === question.correctIndex;
    const isWrong = answered && hasSourceAnswer && isSelected && !isCorrect;
    return `<button class="listening-option ${isSelected ? 'is-selected' : ''} ${isCorrect ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}" data-listening-option="${optionIndex}" ${answered ? 'disabled' : ''}><span>${String.fromCharCode(65 + optionIndex)}</span><strong>${escapeHtml(option)}</strong>${isCorrect ? '<small>الإجابة الصحيحة</small>' : isWrong ? '<small>اختيارك</small>' : ''}</button>`;
  }).join('');
  const feedback = answered ? `<div class="listening-feedback ${!hasSourceAnswer ? 'is-neutral' : selected === question.correctIndex ? 'is-correct' : 'is-wrong'}"><strong>${!hasSourceAnswer ? 'تم حفظ اختيارك' : selected === question.correctIndex ? 'إجابة صحيحة، أحسنت.' : 'راجع التفصيل المسموع مرة أخرى.'}</strong><span>${!hasSourceAnswer ? escapeHtml(question.note || 'لا توجد إجابة معتمدة في المصدر.') : selected === question.correctIndex ? 'يمكنك الانتقال إلى السؤال التالي.' : `الإجابة الصحيحة: ${String.fromCharCode(65 + question.correctIndex)}) ${escapeHtml(question.options[question.correctIndex])}`}</span></div>` : '';
  return `<main class="dashboard-shell listening-quiz-shell">${dashboardHeader('listening')}
    <header class="listening-quiz-top"><button class="back-button" data-listening-model>← مقاطع النموذج</button><div><span>${escapeHtml(model.title)} · المقطع ${recordingItem.order}</span><h1>السؤال ${index + 1} من ${questions.length}</h1></div><div class="grammar-quiz-progress"><span>${progressPercent}%</span><div><i style="width:${progressPercent}%"></i></div></div></header>
    <section class="listening-player-card"><div class="player-orbit" aria-hidden="true"><span>♪</span></div><div class="player-copy"><span>المقطع الصوتي ${recordingItem.order}</span><strong>${recordingItem.audioUrl ? 'استمع جيدًا قبل الإجابة' : 'الصوت بانتظار الإرفاق'}</strong><small>${recordingItem.audioUrl ? 'يمكنك إعادة التشغيل أثناء حل أسئلة المقطع.' : 'الأسئلة جاهزة، وسيظهر ملف الصوت هنا فور إضافته.'}</small></div>${recordingItem.audioUrl ? `<audio controls preload="metadata" src="${escapeHtml(recordingItem.audioUrl)}" data-listening-review></audio>` : '<span class="audio-pending-badge">ملف الصوت غير مرفق</span>'}</section>
    <section class="listening-question-card"><div class="listening-question-meta"><span>Question ${question.number}</span><span>${hasSourceAnswer ? 'إجابة معتمدة' : 'يحتاج مراجعة'}</span></div><div class="question-heading grammar-question-heading" dir="ltr"><span class="question-number">${String(question.number).padStart(2, '0')}</span><div class="question-text">${escapeHtml(question.prompt)}</div></div>${question.options.length ? `<div class="listening-options" role="list">${options}</div>` : `<div class="listening-missing-source"><strong>هذا السؤال غير متوفر في المصدر</strong><p>${escapeHtml(question.note)}</p></div>`}${feedback}</section>
    <footer class="listening-quiz-actions"><button class="outline-action" data-listening-previous ${index === 0 ? 'disabled' : ''}>السابق</button><button class="mint-action" data-listening-next ${question.options.length && !answered ? 'disabled' : ''}>${index === questions.length - 1 ? 'إنهاء المقطع' : 'السؤال التالي'} <span>←</span></button></footer>
  </main>`;
}

function listeningResultView(model, recordingItem) {
  const saved = listeningProgress(model.id, recordingItem.id);
  const scored = recordingItem.questions.filter((question) => Number.isInteger(question.correctIndex));
  const correct = scored.filter((question) => saved.results?.[question.id] === true).length;
  const score = scored.length ? Math.round((correct / scored.length) * 100) : 0;
  const nextRecording = model.recordings[recordingItem.order] ?? null;
  return `<main class="dashboard-shell listening-result-shell">${dashboardHeader('listening')}<section class="listening-result-card"><span class="result-headphones" aria-hidden="true">♫</span><span class="eyebrow">اكتمل المقطع ${recordingItem.order}</span><h1>أحسنت، أنهيت هذا المقطع</h1><div class="listening-result-score"><strong>${score}%</strong><span>${correct} من ${scored.length} إجابات معتمدة صحيحة</span></div><p>${recordingItem.questions.length - scored.length ? `${recordingItem.questions.length - scored.length} من الأسئلة لا تحمل إجابة معتمدة، لذلك لم تدخل في النتيجة.` : 'استمر على هذا الإيقاع وأكمل بقية مقاطع النموذج.'}</p><div><button class="outline-action" data-listening-retry>إعادة المقطع</button>${nextRecording ? `<button class="mint-action" data-open-recording="${nextRecording.id}">المقطع التالي <span>←</span></button>` : '<button class="mint-action" data-listening-library>العودة للنماذج</button>'}</div></section></main>`;
}

function confirmGrammarAnswer(model, question, optionIndex) {
  const isCorrect = question.correctIndex === null ? null : optionIndex === question.correctIndex;
  state.grammarAnswers = { ...(state.grammarAnswers ?? {}), [question.id]: optionIndex };
  const saved = grammarProgress(model.id);
  const savedMistakes = { ...(saved.mistakes ?? {}) };
  if (isCorrect === false) savedMistakes[question.id] = { mistakeCount: Number(savedMistakes[question.id]?.mistakeCount ?? 0) + 1, selectedAnswer: question.options[optionIndex], lastSeenAt: new Date().toISOString() };
  setGrammarProgress(model.id, { answers: { ...(saved.answers ?? {}), [question.id]: optionIndex }, results: { ...(saved.results ?? {}), [question.id]: isCorrect }, mistakes: savedMistakes, status: 'in-progress', currentQuestionIndex: state.grammarQuestionIndex });
  state.grammarConfirmed = { ...(state.grammarConfirmed ?? {}), [question.id]: isCorrect === true };
  state.grammarPendingQuestionId = null;
  render();
  if (isCorrect === true) soundManager.play('answer-correct');
  else if (isCorrect === false && question.correctIndex !== null) soundManager.play('answer-wrong');
  const answerPayload = { skill: 'grammar', modelSourceId: model.id, questionSourceId: question.id, selectedIndex: optionIndex, totalQuestions: model.questions.length, clientMutationId: crypto.randomUUID() };
  grammarAnswerQueue = grammarAnswerQueue.then(async () => {
    try {
      const payload = await sendLearningAnswer(answerPayload);
      const latest = grammarProgress(model.id);
      setGrammarProgress(model.id, { attemptId: payload.attemptId ?? latest.attemptId });
      await Promise.all([refreshServerDashboard(), refreshLearningState({ renderAfter: false, hydrate: false, flushPending: false })]);
    } catch {
      // The answer is already queued locally by sendLearningAnswer when the
      // connection is unavailable; feedback never waits for synchronization.
    }
  });
}

function libraryView() {
  const filtered = visibleModels();
  const completed = Object.values(progress).filter((item) => item.status === 'completed').length;
  const totalPassages = models.reduce((sum, model) => sum + model.passages.length, 0);
  const totalQuestions = models.reduce((sum, model) => sum + model.passages.reduce((pieceSum, passage) => pieceSum + passage.questions.length, 0), 0);
  return `<main class="app-shell">
    ${raseenHeader('الرئيسية')}
    <section class="raseen-hero"><div class="hero-copy"><span class="hero-kicker">منصة متخصصة في STEP فقط</span><h1>خطتك الأذكى لاجتياز <em>STEP</em></h1><p>تدرّب على القراءة من مكان واحد، وتابع تقدمك وأخطاءك حتى تصل إلى هدفك بثقة واحترافية.</p><ul class="hero-features"><li>نماذج مرتبة وواضحة</li><li>تصحيح فوري مع تفسير</li><li>متابعة وحفظ للتقدم</li><li>تجربة مناسبة لكل الأجهزة</li></ul><div class="hero-actions"><button class="orange-action" data-open-model="reading-01">ابدأ رحلتك مع نباهة ←</button><button class="outline-action" data-models-scroll>استكشف النماذج</button></div></div><div class="hero-art"><img src="/assets/raseen-student-hero.png" alt="طالب يستعد لاختبار STEP باستخدام منصة نباهة"><span class="hero-photo-badge">منصة متخصصة في<br><strong>STEP فقط</strong></span></div></section>
    <section class="hero-stats"><div><strong>${models.filter((model) => model.passages.length).length}</strong><span>نماذج متاحة</span></div><div><strong>${totalPassages}</strong><span>قطعة تدريبية</span></div><div><strong>${totalQuestions}</strong><span>سؤالًا منظمًا</span></div><div><strong>${completed}</strong><span>اختبارات مكتملة</span></div></section>
    <section class="goals-section" aria-labelledby="goals-title"><header class="landing-section-heading"><span>اختر مسارك وابدأ المسار المناسب لك</span><h2 id="goals-title">ماذا تريد أن تحقق؟</h2><p>خطوات صغيرة اليوم تصنع فرقًا كبيرًا في نتيجتك.</p></header><div class="goals-grid"><article class="goal-card goal-reading"><b aria-hidden="true">◫</b><h3>34 مقطعًا</h3><p>مقاطع الاستماع المنظمة في 4 نماذج</p><button data-dashboard-section="listening">ابدأ الآن <span>←</span></button></article><article class="goal-card goal-pieces"><b aria-hidden="true">▤</b><h3>أهم 22 قطعة</h3><p>قطع القراءة الأكثر احتمالًا في الاختبار</p><button data-models-scroll>ابدأ الآن <span>←</span></button></article><article class="goal-card goal-questions"><b aria-hidden="true">☆</b><h3>أهم 150 سؤال</h3><p>أسئلة مركزة على المفاهيم الأساسية</p><button data-models-scroll>ابدأ الآن <span>←</span></button></article><article class="goal-card goal-rules"><b aria-hidden="true">⬡</b><h3>القواعد</h3><p>تقوية الأساس اللغوي خطوة بخطوة</p><button data-dashboard-section="grammar">ابدأ الآن <span>←</span></button></article><article class="goal-card goal-reading-main"><b aria-hidden="true">▣</b><h3>القراءة</h3><p>افهم القطع وأجب بدقة وسرعة</p><button data-open-model="reading-01">ابدأ الآن <span>←</span></button></article><article class="goal-card goal-writing"><b aria-hidden="true">✎</b><h3>الكتابة</h3><p>تعلم الكتابة الصحيحة وبناء الجملة</p><button data-dashboard>ابدأ الآن <span>←</span></button></article><article class="goal-card goal-listening"><b aria-hidden="true">◉</b><h3>الاستماع</h3><p>درّب أذنك على الفكرة والتفاصيل</p><button data-dashboard-section="listening">ابدأ الآن <span>←</span></button></article></div></section>
    <section class="models-section" aria-labelledby="models-title"><div class="landing-section-heading models-heading"><span>نماذج واختبارات منظمة</span><h2 id="models-title">نماذج STEP المتاحة</h2><p>اختر النموذج وابدأ التدريب من القطعة المناسبة لك.</p><span class="completion">${completed} مكتملة</span></div>
    <section class="toolbar" aria-label="أدوات القراءة">
      <label class="search"><span>⌕</span><input id="search" value="${escapeHtml(state.query)}" placeholder="ابحث برقم النموذج أو اسم القطعة" /></label>
    </section>
    <section class="reading-grid">
      ${filtered.map((model) => { const modelState = readingModelState(model); return `<button class="reading-card ${model.passages.length ? '' : 'locked'} ${modelState.className}" ${model.passages.length ? `data-open-model="${model.id}"` : 'disabled'}>
        <span class="reading-number">${modelNumber(model)}</span>
        <span class="reading-title">${escapeHtml(model.title)}</span>
        <span class="reading-meta">${model.passages.length ? `${model.passages.length} قطع داخلية` : 'بانتظار الإضافة'}</span>
        <span class="reading-status ${modelState.className}">${modelState.label}</span>
      </button>`; }).join('')}
    </section></section>
    <section class="testimonials-section" aria-labelledby="testimonials-title"><header class="landing-section-heading"><span>تجارب طلابنا</span><h2 id="testimonials-title">نتائج وآراء طلابنا</h2><p>تجربة منظمة تساعدك على المذاكرة بثقة والاستمرار حتى هدفك.</p></header><div class="testimonials-grid"><article class="testimonial-card"><span class="quote-mark">“</span><p>المنصة مرتبة وواضحة، عرفت من أين أبدأ وكيف أتابع تقدمي في كل جلسة.</p><footer><span class="testimonial-avatar">س</span><div><strong>سعود الشهراني</strong><small>الدمام</small></div><b aria-label="5 من 5">★★★★★</b></footer></article><article class="testimonial-card"><span class="quote-mark">“</span><p>أحببت طريقة عرض القطع والأسئلة؛ أصبحت المراجعة اليومية أسهل وأكثر تركيزًا.</p><footer><span class="testimonial-avatar shade-two">م</span><div><strong>مريم العتيبي</strong><small>جدة</small></div><b aria-label="5 من 5">★★★★★</b></footer></article><article class="testimonial-card"><span class="quote-mark">“</span><p>شرح بسيط ومركز، والنماذج تساعدني على معرفة نقاط القوة والأخطاء بسرعة.</p><footer><span class="testimonial-avatar shade-three">ت</span><div><strong>تركي الحربي</strong><small>الرياض</small></div><b aria-label="5 من 5">★★★★★</b></footer></article></div></section>
    <footer class="raseen-footer"><div class="footer-brand"><strong>نباهة</strong><span>منصة تعليمية متخصصة لاجتياز اختبار STEP</span></div><div class="footer-links"><a href="#goals-title">الأقسام</a><a href="#models-title">النماذج</a><a href="#testimonials-title">آراء الطلاب</a></div><div class="footer-help"><strong>ابدأ رحلتك الآن</strong><span>تعلّم بوضوح، وتقدم بثقة.</span></div></footer>
  </main>`;
}

function modelView(model) {
  return `<main class="reader-shell">
    ${raseenHeader('النماذج')}
    <header class="reader-top">
      <button class="back-button" data-library>← النماذج</button>
      <div><p>النموذج ${modelNumber(model)}</p><h1>${escapeHtml(model.title)}</h1><small>${escapeHtml(model.subtitle)}</small></div>
    </header>
    <section class="passage-grid">
      ${model.passages.length ? model.passages.map((passage) => {
        const item = quizProgress(model.id, passage.id);
        return `<article class="passage-card">
          <span>${String(passage.order).padStart(2, '0')}</span>
          <strong>${escapeHtml(passage.title)} — ${escapeHtml(passage.englishTitle)}</strong>
          <em>${escapeHtml(passage.externalTitle)}</em>
          <small>${passage.questions.length} أسئلة · ${item.status === 'completed' ? 'مكتملة' : item.status === 'in-progress' ? 'قيد الحل' : 'لم تبدأ'}</small>
          <div class="passage-actions"><button data-open-passage="${passage.id}">ابدأ الاختبار</button><button data-open-solutions="${passage.id}">عرض الحلول</button></div>
        </article>`;
      }).join('') : '<div class="empty-state"><h2>لا توجد قطع داخل هذا النموذج بعد</h2><p>أرسل القطعة التالية بنفس التنسيق وسأضيفها كاختبار مستقل.</p></div>'}
    </section>
  </main>`;
}

function solutionsView(model, passage) {
  return `<main class="solutions-shell">
    ${raseenHeader('النماذج')}
    <header class="solutions-top"><button class="back-button" data-model>← قطع النموذج</button><div><p>${escapeHtml(model.title)}</p><h1>حلول ${escapeHtml(passage.title)} — ${escapeHtml(passage.englishTitle)}</h1><small>${escapeHtml(passage.externalTitle)}</small></div><strong>${passage.questions.length} سؤالًا محلولًا</strong></header>
    <section class="solutions-list">${passage.questions.map((question) => `<article class="solution-card"><div class="solution-content"><div class="question-heading solution-question-heading" dir="ltr"><span class="question-number">${String(question.number).padStart(2, '0')}</span><div class="question-text">${escapeHtml(question.question)}</div></div><div class="solution-answer"><span>الإجابة الصحيحة</span><strong>${question.correctAnswer ? escapeHtml(question.correctAnswer) : 'غير محددة في المصدر'}</strong></div><p class="solution-why"><b>لماذا؟</b> ${escapeHtml(question.explanation)}</p></div></article>`).join('')}</section>
  </main>`;
}

const tutorActionLabels = {
  explain: 'اشرح السؤال',
  simplify: 'بسّطه لي',
  rule: 'ما القاعدة؟',
  hint: 'أعطني تلميحًا',
  options: 'اشرح الخيارات',
  why_wrong: 'لماذا إجابتي خطأ؟',
  why_correct: 'لماذا هذه الإجابة صحيحة؟',
  similar: 'أعطني مثالًا مشابهًا',
};

const tutorSparkleIcon = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c.55 4.4 2.1 5.95 6.5 6.5-4.4.55-5.95 2.1-6.5 6.5-.55-4.4-2.1-5.95-6.5-6.5 4.4-.55 5.95-2.1 6.5-6.5Z"/><path d="M18.5 15.5c.22 1.78.85 2.41 2.63 2.63-1.78.22-2.41.85-2.63 2.63-.22-1.78-.85-2.41-2.63-2.63 1.78-.22 2.41-.85 2.63-2.63Z"/></svg>`;

function tutorSessionKey(model, passage, question) {
  return `${model.id}:${passage?.id ?? 'grammar'}:${question.id}`;
}

function tutorActions(selectedOption) {
  if (!selectedOption) return ['hint', 'simplify', 'rule', 'options', 'explain'];
  return [selectedOption.isCorrect ? 'why_correct' : 'why_wrong', 'rule', 'explain', 'similar'];
}

function tutorPopover(model, passage, question, selectedOption) {
  const key = tutorSessionKey(model, passage, question);
  if (!state.tutorOpen || state.tutorQuestionKey !== key) return '';
  const session = state.tutorSessions[key] ?? { messages: [], loading: false, expanded: false };
  const hasConversation = session.messages.length > 0 || session.loading;
  const actions = tutorActions(selectedOption);
  const messages = session.messages.map((message) => `<div class="tutor-message ${message.role === 'user' ? 'is-user' : 'is-assistant'} ${message.streaming ? 'is-streaming' : ''}">
    ${message.role === 'assistant' && message.source === 'human-note' ? `<span class="tutor-source-badge">شرح ${NIBRAS_BRAND.name}</span>` : ''}
    <p><span class="tutor-message-content">${formatTutorContent(message.content)}</span>${message.streaming ? '<span class="tutor-cursor" aria-hidden="true">▋</span>' : ''}</p>
  </div>`).join('');
  return nibrasizeTutorMarkup(`<section class="question-tutor-popover ${hasConversation ? 'has-conversation' : ''} ${session.expanded ? 'is-expanded' : ''}" id="question-tutor" role="dialog" aria-label="مساعد نباهة">
    <header class="tutor-header">
      <span class="tutor-brand-icon">${nibrasLogo()}</span>
      <div><strong>${NIBRAS_BRAND.name}</strong><small>${hasConversation ? NIBRAS_BRAND.subtitle : 'كيف أساعدك في هذا السؤال؟'}</small></div>
      ${hasConversation ? `<button class="tutor-expand" data-tutor-expand aria-label="${session.expanded ? 'تصغير النافذة' : 'توسيع النافذة'}" title="${session.expanded ? 'تصغير' : 'توسيع'}">${session.expanded ? '↙' : '↗'}</button>` : ''}
      <button class="tutor-close" data-tutor-close aria-label="إغلاق مساعد نباهة">×</button>
    </header>
    ${hasConversation ? `<div class="tutor-conversation" aria-live="polite">${messages}</div>` : `<div class="tutor-quick-actions">${actions.map((action) => `<button data-tutor-action="${action}"><span>${escapeHtml(tutorActionLabels[action])}</span><b aria-hidden="true">←</b></button>`).join('')}</div>`}
    ${hasConversation && session.loading && session.autoScroll === false ? '<button class="tutor-latest" data-tutor-latest>↓ أحدث رسالة</button>' : ''}
    ${hasConversation && !session.loading ? `<div class="tutor-followups"><button data-tutor-action="simplify">أبسط أكثر</button><button data-tutor-action="similar">مثال آخر</button><button data-tutor-understood>فهمت ✓</button></div>` : ''}
    <form class="tutor-composer" data-tutor-form>
      <textarea name="message" rows="1" maxlength="1000" autocomplete="off" placeholder="اسأل نِبراس عن هذا السؤال..." aria-label="اكتب سؤالك عن السؤال الحالي" ${session.loading ? 'disabled' : ''}></textarea>
      <button type="submit" aria-label="إرسال السؤال" ${session.loading ? 'disabled' : ''}>↑</button>
    </form>
    ${session.error ? `<div class="tutor-error" role="alert"><p>${session.errorCode === 'AI_TIMEOUT' ? 'استغرق مساعد نباهة وقتًا أطول من المتوقع.' : 'تعذر الحصول على الرد الآن.'}</p><button type="button" data-tutor-retry>إعادة المحاولة</button></div>` : ''}
  </section>`);
}

function paintTutorStream(key, content) {
  if (!state.tutorOpen || state.tutorQuestionKey !== key) return;
  const streamText = document.querySelector('.tutor-message.is-streaming .tutor-message-content');
  if (streamText) streamText.innerHTML = formatTutorContent(content);
  const conversation = streamText?.closest('.tutor-conversation');
  const session = state.tutorSessions[key];
  if (conversation && session?.autoScroll !== false) {
    requestAnimationFrame(() => { conversation.scrollTop = conversation.scrollHeight; });
  }
}

async function requestTutor({ key, question, selectedOption, action, message }) {
  const session = state.tutorSessions[key] ?? { messages: [], loading: false, expanded: false, autoScroll: true, lastRequest: null };
  if (session.loading) return;
  const prompt = String(message || tutorActionLabels[action] || '').trim();
  if (!prompt) return;
  const history = session.messages.map(({ role, content }) => ({ role, content }));
  state.tutorOpen = true;
  state.tutorQuestionKey = key;
  state.tutorSessions = {
    ...state.tutorSessions,
    [key]: {
      ...session,
      expanded: session.expanded || history.length >= 2,
      error: '',
      errorCode: '',
      loading: true,
      lastRequest: { action, message: prompt },
      autoScroll: true,
      messages: [...session.messages, { role: 'user', content: prompt }, { role: 'assistant', content: '', streaming: true }],
    },
  };
  state.tutorScrollToEnd = true;
  render();
  let pending = '';
  let streamTimer = null;
  let drainWaiters = [];
  const resolveDrainWaiters = () => {
    const waiters = drainWaiters;
    drainWaiters = [];
    waiters.forEach((resolve) => resolve());
  };
  const animateStream = () => {
    streamTimer = null;
    if (!pending) return;
    const characterCount = Math.min(7, Math.max(2, Math.ceil(pending.length / 28)));
    const delta = pending.slice(0, characterCount);
    pending = pending.slice(characterCount);
    const latest = state.tutorSessions[key];
    if (!latest) return;
    const messages = latest.messages.slice();
    const index = messages.length - 1;
    messages[index] = { ...messages[index], content: `${messages[index].content ?? ''}${delta}` };
    state.tutorSessions = { ...state.tutorSessions, [key]: { ...latest, messages } };
    paintTutorStream(key, messages[index].content);
    if (pending) streamTimer = window.setTimeout(animateStream, 36);
    else resolveDrainWaiters();
  };
  const scheduleStream = () => {
    if (!streamTimer) streamTimer = window.setTimeout(animateStream, 36);
  };
  const waitForStream = () => pending || streamTimer
    ? new Promise((resolve) => drainWaiters.push(resolve))
    : Promise.resolve();
  try {
    const response = await questionTutorProvider.chat({
      questionId: question.id,
      sessionId: key,
      message: prompt,
      action,
      selectedOptionId: selectedOption?.id ?? null,
      history: history.slice(-12),
    }, { onChunk: (delta) => {
      pending += delta;
      scheduleStream();
    } });
    await waitForStream();
    const latest = state.tutorSessions[key];
    const messages = latest.messages.slice();
    messages[messages.length - 1] = { ...messages[messages.length - 1], content: response.content, streaming: false, source: response.source, provider: response.provider, model: response.model };
    state.tutorSessions = { ...state.tutorSessions, [key]: { ...latest, messages } };
  } catch (error) {
    await waitForStream();
    const latest = state.tutorSessions[key];
    const messages = latest.messages.filter((item, index) => !(index === latest.messages.length - 1 && item.role === 'assistant' && !item.content));
    if (messages.at(-1)?.role === 'assistant') messages[messages.length - 1] = { ...messages.at(-1), streaming: false };
    state.tutorSessions = { ...state.tutorSessions, [key]: { ...latest, messages, error: true, errorCode: error?.code || 'AI_REQUEST_FAILED' } };
  } finally {
    const latest = state.tutorSessions[key];
    state.tutorSessions = { ...state.tutorSessions, [key]: { ...latest, loading: false } };
    state.tutorScrollToEnd = latest.autoScroll !== false;
    render();
  }
}

async function askQuestionTutor(action, message) {
  const model = currentModel();
  const passage = currentPassage(model);
  const question = passage?.questions[state.questionIndex];
  if (!model || !passage || !question) return;
  const selectedId = state.activeAnswers?.[question.id] ?? null;
  const selectedOption = question.options.find((option) => option.id === selectedId) ?? null;
  return requestTutor({ key: tutorSessionKey(model, passage, question), question, selectedOption, action, message });
}

async function askGrammarTutor(action, message) {
  const model = currentGrammarModel();
  const question = model?.questions[state.grammarQuestionIndex];
  if (!model || !question) return;
  const selectedIndex = state.grammarAnswers?.[question.id];
  const selectedOption = selectedIndex === undefined ? null : { id: `${question.id}-o${selectedIndex}`, text: question.options[selectedIndex], isCorrect: question.correctIndex === selectedIndex };
  const options = question.options.map((text, index) => ({ id: `${question.id}-o${index}`, text }));
  return requestTutor({ key: tutorSessionKey(model, { id: 'grammar' }, question), question: { ...question, options }, selectedOption, action, message });
}

function quizView(model, passage) {
  const item = quizProgress(model.id, passage.id);
  const activeAnswers = state.activeAnswers ?? {};
  const answered = Object.keys(activeAnswers).length;
  const savedCount = Object.keys(item.answers ?? {}).length;
  const canRestoreProgress = !state.restoredProgress && item.status === 'in-progress' && savedCount > 0;
  const index = Math.min(state.questionIndex, passage.questions.length - 1);
  const question = passage.questions[index];
  const selectedId = activeAnswers[question.id];
  const answerPending = question.correctAnswer === null;
  const selectedOption = question.options.find((option) => option.id === selectedId);
  const answeredCorrectly = selectedOption?.isCorrect;
  const hasKnownAnswer = question.correctAnswer !== null;
  const confidence = item.answerMeta?.[question.id]?.confidence;
  const isLastQuestion = index === passage.questions.length - 1;
  const answerLink = buildReadingAnswerLink(question);
  const answerLinkOpen = state.answerLinkQuestionId === question.id && answerLink;
  return `<main class="quiz-shell quiz-active-shell">
    ${raseenHeader('النماذج')}
    <header class="quiz-top">
      <button class="back-button" data-model>← قطع النموذج</button>
      <div><p>${escapeHtml(model.title)}</p><h1>${escapeHtml(passage.title)} — ${escapeHtml(passage.englishTitle)}</h1><small>${escapeHtml(passage.externalTitle)}</small></div>
      <strong>${index + 1} / ${passage.questions.length}</strong>
    </header>
    <section class="question-progress" aria-label="تقدم الاختبار">
      <span style="width:${((index + 1) / passage.questions.length) * 100}%"></span>
    </section>
    ${passage.passageText ? `<section class="passage-reading" lang="en" dir="ltr"><header><span>Passage</span><small>Read the passage, then answer the question</small></header><div>${escapeHtml(passage.passageText).split('\n\n').map((paragraph) => `<p>${paragraph}</p>`).join('')}</div></section>` : ''}
    <section class="quiz-list">
      <article class="quiz-question active-question ${selectedId ? answeredCorrectly ? 'answered-correct' : 'answered-wrong' : ''}">
        <div class="question-heading reading-question-heading" dir="ltr"><span class="question-number">${String(question.number).padStart(2, '0')}</span><div class="question-text">${renderQuestionText(question)}</div><div class="question-tutor-anchor"><button class="question-tutor-trigger" data-tutor-toggle="${question.id}" aria-label="اسأل نباهة" title="اسأل نباهة" aria-haspopup="dialog" aria-expanded="${state.tutorOpen && state.tutorQuestionKey === tutorSessionKey(model, passage, question)}" aria-controls="question-tutor">${tutorSparkleIcon()}</button>${tutorPopover(model, passage, question, selectedOption)}</div></div>
        <div class="answer-link-feature"><button class="${answerLinkOpen ? 'is-open' : ''}" data-toggle-answer-link="${question.id}" aria-expanded="${Boolean(answerLinkOpen)}" aria-controls="answer-link-${question.id}" ${!answerLink ? 'disabled' : ''}><span class="answer-link-feature-icon" aria-hidden="true">↔</span><span><strong>ربط الإجابة</strong><small>${answerLink ? 'اربط كلمة من السؤال بالإجابة واحفظها بمنطق بسيط' : 'لا توجد إجابة معتمدة لربطها في هذا السؤال'}</small></span><b>${answerLinkOpen ? 'إغلاق' : answerLink ? 'فتح الربط' : 'غير متاح'}</b></button></div>
        ${answerLinkOpen ? `<aside class="answer-link-card" id="answer-link-${question.id}" aria-label="ربط الإجابة"><header><span>ربط منطقي سهل للحفظ</span><button data-toggle-answer-link="${question.id}" aria-label="إغلاق ربط الإجابة">×</button></header><div class="answer-link-bridge" dir="ltr"><span>${escapeHtml(answerLink.keyword)}</span><i aria-hidden="true">→</i><strong>${escapeHtml(answerLink.answer)}</strong></div><p class="answer-link-memory"><b>سبب الربط:</b> ${escapeHtml(answerLink.memory)}</p><p class="answer-link-reason"><b>لماذا الإجابة صحيحة؟</b> ${escapeHtml(answerLink.reason)}</p></aside>` : ''}
        <div class="question-tools">
          <button data-toggle-translation="${question.id}">${state.translationQuestionId === question.id ? 'إخفاء ترجمة الكلمات' : 'ترجمة الكلمات'}</button>
          <small>${state.translationQuestionId === question.id ? 'اضغط على الكلمة لعرض ترجمتها.' : 'فعّل الترجمة لتصبح كل كلمة في السؤال قابلة للضغط.'}</small>
        </div>
        <div class="quiz-options">
          ${displayedOptions(question).map((option, optionIndex) => `<button class="quiz-option ${selectedId === option.id ? 'selected' : ''} ${selectedId && hasKnownAnswer && option.isCorrect ? 'correct' : ''} ${selectedId && hasKnownAnswer && !option.isCorrect ? 'wrong' : ''}" data-question="${question.id}" data-option="${option.id}" ${selectedId ? 'disabled' : ''}>
            <span class="option-marker" aria-hidden="true">${String.fromCharCode(65 + optionIndex)}</span><span>${escapeHtml(option.text)}</span>
          </button>`).join('')}
          ${answerPending && !question.options.length ? '<div class="pending-answer">مفتاح الإجابة والخيارات قيد المراجعة. يمكنك الانتقال للسؤال التالي.</div>' : ''}
        </div>
        ${selectedId ? answeredCorrectly ? '<p class="answer-note correct-note">صحيح، إجابتك ممتازة.</p>' : `<div class="answer-note wrong-note"><strong>${question.correctAnswer ? `غير صحيح. الحل الصحيح: ${escapeHtml(question.correctAnswer)}` : 'لم تُحدَّد الإجابة الصحيحة في المصدر.'}</strong><p>${escapeHtml(question.explanation)}</p></div>` : ''}
        ${selectedId && hasKnownAnswer ? `<div class="confidence-check"><span>كيف كانت ثقتك قبل التأكيد؟</span><button data-confidence="certain" class="${confidence === 'certain' ? 'selected' : ''}">متأكد</button><button data-confidence="uncertain" class="${confidence === 'uncertain' ? 'selected' : ''}">غير متأكد</button></div>` : ''}
      </article>
    </section>
    <footer class="quiz-actions">
      <div class="quiz-session-actions" aria-label="إجراءات الاختبار">
        <button class="quiz-session-reset" data-reset-quiz>إعادة الاختبار</button>
        <button class="quiz-session-restore" data-restore-progress ${canRestoreProgress ? '' : 'disabled'}>استعادة التقدم${canRestoreProgress ? ` (${savedCount})` : ''}</button>
      </div>
      <span>${answered} إجابة محفوظة</span>
      <div class="quiz-navigation">
        <button class="primary-action next-action" data-next-question ${selectedId || answerPending ? '' : 'disabled'}>${isLastQuestion ? 'عرض النتيجة' : 'التالي'} <span aria-hidden="true">←</span></button>
        <button class="secondary-action previous-action" data-previous-question ${index === 0 ? 'disabled' : ''}><span aria-hidden="true">→</span> السابق</button>
      </div>
    </footer>
  </main>`;
}

function resultView(model, passage) {
  const item = quizProgress(model.id, passage.id);
  const scoredQuestions = passage.questions.filter((question) => question.correctAnswer !== null);
  const pendingCount = passage.questions.length - scoredQuestions.length;
  const correct = scoredQuestions.filter((question) => question.options.find((option) => option.id === item.answers?.[question.id])?.isCorrect).length;
  const unanswered = scoredQuestions.filter((question) => !item.answers?.[question.id]).length;
  const wrong = scoredQuestions.length - correct - unanswered;
  const percentage = scoredQuestions.length ? Math.round((correct / scoredQuestions.length) * 100) : 0;
  return `<main class="quiz-shell">
    ${raseenHeader('النماذج')}
    <header class="quiz-top">
      <button class="back-button" data-model>← قطع النموذج</button>
      <div><p>نتيجة الاختبار</p><h1>${escapeHtml(passage.title)} — ${escapeHtml(passage.englishTitle)}</h1><small>${escapeHtml(model.title)}</small></div>
      <strong>${correct} / ${scoredQuestions.length}</strong>
    </header>
    <section class="result-summary">
      <div><strong>${percentage}%</strong><span>النسبة</span></div>
      <div><strong>${correct}</strong><span>صحيح</span></div>
      <div><strong>${wrong}</strong><span>خطأ</span></div>
      <div><strong>${unanswered}</strong><span>غير مجاب</span></div>
      ${pendingCount ? `<div><strong>${pendingCount}</strong><span>مفتاح معلّق</span></div>` : ''}
    </section>
    <section class="quiz-list review-mode">
      ${passage.questions.map((question) => {
        const selectedId = item.answers?.[question.id];
        const selected = question.options.find((option) => option.id === selectedId);
        const wasCorrect = selected?.isCorrect;
        return `<article class="quiz-question">
          <div class="question-heading result-question-heading" dir="ltr"><span class="question-number">${String(question.number).padStart(2, '0')}</span><div class="question-text">${escapeHtml(question.question)}</div></div>
          <div class="quiz-options">
            ${displayedOptions(question).map((option, optionIndex) => `<div class="quiz-option ${question.correctAnswer !== null && option.isCorrect ? 'correct' : ''} ${question.correctAnswer !== null && !option.isCorrect ? 'wrong' : ''}">
              <span class="option-marker" aria-hidden="true">${String.fromCharCode(65 + optionIndex)}</span><span>${escapeHtml(option.text)}</span>
            </div>`).join('')}
          </div>
          ${wasCorrect ? '<p class="answer-note correct-note">إجابتك صحيحة.</p>' : `<div class="answer-note wrong-note"><strong>${question.correctAnswer ? `الحل الصحيح: ${escapeHtml(question.correctAnswer)}` : 'لم تُحدَّد الإجابة الصحيحة في المصدر.'}</strong><p>${escapeHtml(question.explanation)}</p></div>`}
        </article>`;
      }).join('')}
    </section>
    <footer class="quiz-actions">
      <button class="primary-action" data-reset-quiz>إعادة الاختبار</button>
      <button class="primary-action" data-model>العودة للقطع</button>
    </footer>
  </main>`;
}

function currentModel() {
  return models.find((model) => model.id === state.selectedModelId);
}

function currentPassage(model = currentModel()) {
  return model?.passages.find((passage) => passage.id === state.selectedPassageId);
}

function currentGrammarModel() {
  return grammarModels.find((model) => model.id === state.selectedGrammarModelId);
}

function currentListeningModel() {
  return listeningModels.find((model) => model.id === state.selectedListeningModelId);
}

function currentRecording(model = currentListeningModel()) {
  return model?.recordings.find((item) => item.id === state.selectedRecordingId);
}

function restoreTutorViewport(viewport, scrollTutor, tutorViewport) {
  requestAnimationFrame(() => {
    if (viewport) window.scrollTo(viewport.x, viewport.y);
    const conversation = document.querySelector('.tutor-conversation');
    if (!conversation) return;
    const session = state.tutorSessions[state.tutorQuestionKey];
    if (scrollTutor || session?.autoScroll !== false) conversation.scrollTop = conversation.scrollHeight;
    else if (tutorViewport) conversation.scrollTop = Math.min(tutorViewport.scrollTop, conversation.scrollHeight);
  });
}

function keepQuestionInPlace() {
  requestAnimationFrame(() => {
    const question = document.querySelector('.active-question, .grammar-question-card');
    if (question) question.scrollIntoView({ block: 'start', behavior: 'auto' });
  });
}

function applyNibrasAccessibility() {
  document.querySelectorAll('[data-tutor-toggle]').forEach((button) => {
    button.setAttribute('aria-label', `${NIBRAS_BRAND.tooltip} عن هذا السؤال`);
    button.removeAttribute('title');
  });
}

function persistWorkspaceView() {
  if (!account || !restorableViews.has(state.view)) return;
  try {
    sessionStorage.setItem(workspaceViewKey, JSON.stringify({
      view: state.view,
      dashboardSection: state.dashboardSection,
      selectedModelId: state.selectedModelId,
      selectedPassageId: state.selectedPassageId,
      selectedGrammarModelId: state.selectedGrammarModelId,
      grammarQuestionIndex: state.grammarQuestionIndex,
      selectedListeningModelId: state.selectedListeningModelId,
      selectedRecordingId: state.selectedRecordingId,
      listeningQuestionIndex: state.listeningQuestionIndex,
      questionIndex: state.questionIndex,
      mistakeReviewId: state.mistakeReviewId,
      mistakeSolveId: state.mistakeSolveId,
    }));
  } catch {
    // Navigation still works when session storage is unavailable.
  }
}

function restoreActiveWorkspaceProgress() {
  if (state.view === 'quiz') {
    const model = currentModel();
    const passage = currentPassage(model);
    if (!model || !passage) { state.view = 'dashboard-models'; return; }
    const saved = quizProgress(model.id, passage.id);
    state.questionIndex = Math.min(state.questionIndex, Math.max(0, passage.questions.length - 1));
    state.activeAnswers = { ...(saved.answers ?? {}) };
    state.restoredProgress = Object.keys(saved.answers ?? {}).length > 0;
  }
  if (state.view === 'grammar-quiz' || state.view === 'grammar-result') {
    const model = currentGrammarModel();
    if (!model || model.status !== 'available') { state.view = 'dashboard-section'; state.dashboardSection = 'grammar'; return; }
    const saved = grammarProgress(model.id);
    state.grammarQuestionIndex = Math.min(state.grammarQuestionIndex, Math.max(0, model.questions.length - 1));
    state.grammarAnswers = { ...(saved.answers ?? {}) };
    state.grammarConfirmed = Object.fromEntries(Object.entries(saved.results ?? {}).filter(([, value]) => value !== null));
  }
  if (['listening-model', 'listening-quiz', 'listening-result'].includes(state.view)) {
    const model = currentListeningModel();
    const recordingItem = currentRecording(model);
    if (!model) { state.view = 'dashboard-section'; state.dashboardSection = 'listening'; return; }
    if (state.view !== 'listening-model' && !recordingItem) { state.view = 'listening-model'; return; }
    if (state.view === 'listening-quiz') {
      const saved = listeningProgress(model.id, recordingItem.id);
      state.listeningQuestionIndex = Math.min(state.listeningQuestionIndex, Math.max(0, recordingItem.questions.length - 1));
      state.listeningAnswers = { ...(saved.answers ?? {}) };
    }
  }
  if (['model', 'solutions', 'result'].includes(state.view)) {
    const model = currentModel();
    const passage = currentPassage(model);
    if (!model) state.view = 'dashboard-models';
    else if (state.view !== 'model' && !passage) state.view = 'model';
  }
}

function render() {
  const conversation = document.querySelector('.tutor-conversation');
  const tutorViewport = conversation ? { scrollTop: conversation.scrollTop } : null;
  const viewport = ['quiz', 'grammar-quiz', 'listening-quiz'].includes(state.view) ? { x: window.scrollX, y: window.scrollY } : null;
  const scrollTutor = state.tutorScrollToEnd;
  state.tutorScrollToEnd = false;
  if (state.authLoading) {
    // Keep the restored surface in place while Better Auth verifies the
    // session. Never flash the dashboard or public library over another view.
    const pendingModel = currentModel();
    const pendingPassage = currentPassage(pendingModel);
    if (hasAuthHint && state.view === 'dashboard') app.innerHTML = dashboardView();
    else if (hasAuthHint && state.view === 'dashboard-models') app.innerHTML = dashboardModelsView();
    else if (hasAuthHint && state.view === 'dashboard-section') app.innerHTML = state.dashboardSection === 'grammar' ? grammarLibraryView() : state.dashboardSection === 'listening' ? listeningLibraryView() : dashboardSectionView(state.dashboardSection);
    else if (hasAuthHint && state.view === 'grammar-quiz' && currentGrammarModel()) app.innerHTML = grammarQuestionView(currentGrammarModel());
    else if (hasAuthHint && state.view === 'grammar-result' && currentGrammarModel()) app.innerHTML = grammarResultView(currentGrammarModel());
    else if (hasAuthHint && state.view === 'listening-model' && currentListeningModel()) app.innerHTML = listeningModelView(currentListeningModel());
    else if (hasAuthHint && state.view === 'listening-quiz' && currentListeningModel() && currentRecording()) app.innerHTML = listeningQuizView(currentListeningModel(), currentRecording());
    else if (hasAuthHint && state.view === 'listening-result' && currentListeningModel() && currentRecording()) app.innerHTML = listeningResultView(currentListeningModel(), currentRecording());
    else if (hasAuthHint && state.view === 'model' && pendingModel) app.innerHTML = modelView(pendingModel);
    else if (hasAuthHint && state.view === 'quiz' && pendingModel && pendingPassage) app.innerHTML = quizView(pendingModel, pendingPassage);
    else if (hasAuthHint && state.view === 'solutions' && pendingModel && pendingPassage) app.innerHTML = solutionsView(pendingModel, pendingPassage);
    else if (hasAuthHint && state.view === 'result' && pendingModel && pendingPassage) app.innerHTML = resultView(pendingModel, pendingPassage);
    else if (state.view === 'login') app.innerHTML = loginView();
    else if (state.view === 'register') app.innerHTML = registerView();
    else app.innerHTML = hasAuthHint ? dashboardView() : sessionLoadingView();
    applyNibrasAccessibility();
    restoreTutorViewport(viewport, scrollTutor, tutorViewport);
    return;
  }
  const model = currentModel();
  const passage = currentPassage(model);
  const reviewedMistake = state.mistakeReviewId ? visibleMistakes().find((mistake) => mistake.id === state.mistakeReviewId) : null;
  const solvedMistake = state.mistakeSolveId ? visibleMistakes().find((mistake) => mistake.id === state.mistakeSolveId) : null;
  if (state.view === 'login') app.innerHTML = loginView();
  else if (state.view === 'register') app.innerHTML = registerView();
  else if (state.view === 'dashboard') app.innerHTML = account ? dashboardView() : loginView();
  else if (state.view === 'dashboard-models') app.innerHTML = account ? dashboardModelsView() : loginView();
  else if (state.view === 'dashboard-section') app.innerHTML = account ? (state.dashboardSection === 'grammar' ? grammarLibraryView() : state.dashboardSection === 'listening' ? listeningLibraryView() : dashboardSectionView(state.dashboardSection)) : loginView();
  else if (state.view === 'grammar-quiz' && currentGrammarModel()) app.innerHTML = account ? grammarQuestionView(currentGrammarModel()) : loginView();
  else if (state.view === 'grammar-result' && currentGrammarModel()) app.innerHTML = account ? grammarResultView(currentGrammarModel()) : loginView();
  else if (state.view === 'listening-model' && currentListeningModel()) app.innerHTML = account ? listeningModelView(currentListeningModel()) : loginView();
  else if (state.view === 'listening-quiz' && currentListeningModel() && currentRecording()) app.innerHTML = account ? listeningQuizView(currentListeningModel(), currentRecording()) : loginView();
  else if (state.view === 'listening-result' && currentListeningModel() && currentRecording()) app.innerHTML = account ? listeningResultView(currentListeningModel(), currentRecording()) : loginView();
  else if (state.view === 'mistake-question' && reviewedMistake) app.innerHTML = account ? mistakeQuestionView(reviewedMistake) : loginView();
  else if (state.view === 'mistake-solve' && solvedMistake) app.innerHTML = account ? mistakeSolveView(solvedMistake) : loginView();
  else if (state.view === 'model' && model) app.innerHTML = modelView(model);
  else if (state.view === 'quiz' && model && passage) app.innerHTML = quizView(model, passage);
  else if (state.view === 'solutions' && model && passage) app.innerHTML = solutionsView(model, passage);
  else if (state.view === 'result' && model && passage) app.innerHTML = resultView(model, passage);
  else app.innerHTML = libraryView();
  applyNibrasAccessibility();
  document.querySelectorAll('[data-listening-review]').forEach((audio) => soundManager.applyListeningVolume(audio));
  persistWorkspaceView();
  restoreTutorViewport(viewport, scrollTutor, tutorViewport);
}

let debounce;
app.addEventListener('input', (event) => {
  const soundSlider = event.target.closest('[data-sound-slider]');
  if (soundSlider) {
    const setting = soundSlider.dataset.soundSlider;
    const value = Math.max(0, Math.min(100, Number(soundSlider.value))) / 100;
    soundManager.updateSettings({ [setting]: value });
    const output = soundSlider.closest('.sound-control')?.querySelector('[data-sound-value]');
    if (output) output.textContent = `${Math.round(value * 100)}%`;
    return;
  }
  if (event.target.id !== 'search') return;
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    state.query = event.target.value;
    render();
  }, 200);
});

app.addEventListener('scroll', (event) => {
  const conversation = event.target.closest?.('.tutor-conversation');
  if (!conversation || state.tutorQuestionKey === null) return;
  const session = state.tutorSessions[state.tutorQuestionKey];
  if (!session?.loading) return;
  const nearBottom = conversation.scrollHeight - conversation.scrollTop - conversation.clientHeight < 120;
  if (session.autoScroll === nearBottom) return;
  state.tutorSessions = { ...state.tutorSessions, [state.tutorQuestionKey]: { ...session, autoScroll: nearBottom } };
  const latestButton = conversation.parentElement?.querySelector('[data-tutor-latest]');
  if (latestButton) latestButton.hidden = nearBottom;
}, true);

app.addEventListener('keydown', (event) => {
  const textarea = event.target.closest?.('.tutor-composer textarea[name="message"]');
  if (!textarea || event.key !== 'Enter' || event.shiftKey) return;
  event.preventDefault();
  textarea.form?.requestSubmit();
});

app.addEventListener('submit', async (event) => {
  const tutorForm = event.target.closest('[data-tutor-form]');
  if (tutorForm) {
    event.preventDefault();
    const input = tutorForm.querySelector('textarea[name="message"]');
    const message = String(input?.value ?? '').trim();
    if (!message) return;
    if (input) input.value = '';
    if (tutorForm.closest('[data-tutor-scope="grammar"]')) await askGrammarTutor('custom', message);
    else await askQuestionTutor('custom', message);
    return;
  }
  const form = event.target.closest('.auth-form');
  if (!form) return;
  event.preventDefault();
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  const data = new FormData(form);
  const email = normalizeEmail(data.get('email'));
  const password = String(data.get('password') ?? '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    state.authError = 'أدخل بريدًا إلكترونيًا صحيحًا.';
    render();
    return;
  }
  try {
    let response;
    if (form.classList.contains('register-form')) {
      const name = String(data.get('name') ?? '').trim();
      const confirmPassword = String(data.get('confirmPassword') ?? '');
      if (name.length < 2) {
        state.authError = 'اكتب اسمًا صحيحًا من حرفين على الأقل.';
        render();
        return;
      }
      if (password.length < 8) {
        state.authError = 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل.';
        render();
        return;
      }
      if (password !== confirmPassword) {
        state.authError = 'تأكيد كلمة المرور غير مطابق.';
        render();
        return;
      }
      response = await authClient.signUp.email({ email, name, password, callbackURL: window.location.origin });
    } else {
      response = await authClient.signIn.email({ email, password, rememberMe: Boolean(data.get('remember')) });
    }
    if (response?.error) {
      state.authError = authErrorMessage(response.error, form.classList.contains('register-form') ? 'تعذر إنشاء الحساب. حاول مرة أخرى.' : 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      render();
      return;
    }
    account = response?.data?.user ?? null;
    if (!account) {
      const session = await authClient.getSession();
      account = session?.data?.user ?? null;
    }
    if (!account) {
      state.authError = 'تعذر إنشاء جلسة آمنة. تحقق من إعدادات الخادم ثم حاول مرة أخرى.';
      render();
      return;
    }
    const localSnapshot = form.classList.contains('register-form') ? {} : readStored(progressKey(), {});
    progress = localSnapshot;
    if (form.classList.contains('register-form')) saveProgress();
    await migrateLegacyProgress(localSnapshot);
    await Promise.all([refreshServerDashboard(), refreshLearningState({ renderAfter: false })]);
    if (!serverMistakesLoaded) await refreshServerMistakes({ renderAfter: false });
    localStorage.setItem(authHintKey, '1');
    state = { ...state, view: 'dashboard', authError: '', authLoading: false };
    render();
  } catch (error) {
    state.authError = authErrorMessage(error, 'تعذر الاتصال بخدمة الحساب. حاول مرة أخرى.');
    render();
  }
});

app.addEventListener('click', (event) => {
  soundManager.activate();
  const tutorToggle = event.target.closest('[data-tutor-toggle]');
  if (tutorToggle) {
    if (tutorToggle.dataset.tutorScope === 'grammar') {
      const model = currentGrammarModel();
      const question = model?.questions[state.grammarQuestionIndex];
      if (!model || !question) return;
      const key = tutorSessionKey(model, { id: 'grammar' }, question);
      state.tutorOpen = !(state.tutorOpen && state.tutorQuestionKey === key);
      state.tutorQuestionKey = key;
      render();
      return;
    }
    const model = currentModel();
    const passage = currentPassage(model);
    const question = passage?.questions[state.questionIndex];
    if (!model || !passage || !question) return;
    const key = tutorSessionKey(model, passage, question);
    state.tutorOpen = !(state.tutorOpen && state.tutorQuestionKey === key);
    state.tutorQuestionKey = key;
    render();
    return;
  }

  if (event.target.closest('[data-tutor-close]')) {
    state.tutorOpen = false;
    render();
    return;
  }

  if (event.target.closest('[data-tutor-latest]')) {
    const key = state.tutorQuestionKey;
    const session = state.tutorSessions[key];
    if (session) state.tutorSessions = { ...state.tutorSessions, [key]: { ...session, autoScroll: true } };
    const conversation = document.querySelector('.tutor-conversation');
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
    render();
    return;
  }

  if (event.target.closest('[data-tutor-expand]')) {
    const session = state.tutorSessions[state.tutorQuestionKey];
    if (session) state.tutorSessions = { ...state.tutorSessions, [state.tutorQuestionKey]: { ...session, expanded: !session.expanded } };
    render();
    return;
  }

  if (event.target.closest('[data-tutor-retry]')) {
    const key = state.tutorQuestionKey;
    const retry = state.tutorSessions[key]?.lastRequest;
    if (retry) {
      if (key.split(':')[1] === 'grammar') void askGrammarTutor(retry.action, retry.message);
      else void askQuestionTutor(retry.action, retry.message);
    }
    return;
  }

  const tutorAction = event.target.closest('[data-tutor-action]');
  if (tutorAction) {
    if (tutorAction.closest('[data-tutor-scope="grammar"]')) askGrammarTutor(tutorAction.dataset.tutorAction);
    else askQuestionTutor(tutorAction.dataset.tutorAction);
    return;
  }

  if (event.target.closest('[data-tutor-understood]')) {
    state.tutorOpen = false;
    render();
    return;
  }

  if (event.target.closest('[data-login]')) {
    state = { ...state, view: 'login', authError: '' };
    render();
    return;
  }

  if (event.target.closest('[data-register]')) {
    state = { ...state, view: 'register', authError: '' };
    render();
    return;
  }

  if (event.target.closest('[data-toggle-dashboard-menu]')) {
    state = { ...state, dashboardMenuOpen: !state.dashboardMenuOpen };
    render();
    return;
  }

  const mistakeSkillButton = event.target.closest('[data-mistake-skill]');
  if (mistakeSkillButton) {
    state = { ...state, mistakeSkill: mistakeSkillButton.dataset.mistakeSkill, mistakeReviewId: null };
    render();
    return;
  }
  if (event.target.closest('[data-clear-mistake-skill]')) {
    state = { ...state, mistakeSkill: null, mistakeReviewId: null };
    render();
    return;
  }
  const reviewMistakeButton = event.target.closest('[data-review-mistake]');
  if (reviewMistakeButton) {
    state = { ...state, view: 'mistake-question', mistakeReviewId: reviewMistakeButton.dataset.reviewMistake, mistakeSolveId: null, mistakeSolveAnswer: null };
    render();
    return;
  }
  const solveMistakeButton = event.target.closest('[data-solve-mistake]');
  if (solveMistakeButton) {
    state = { ...state, view: 'mistake-solve', mistakeSolveId: solveMistakeButton.dataset.solveMistake, mistakeSolveAnswer: null, mistakeReviewId: null };
    render();
    return;
  }
  const mistakeSolveOption = event.target.closest('[data-mistake-solve-option]');
  if (mistakeSolveOption && state.mistakeSolveAnswer === null) {
    const mistake = visibleMistakes().find((candidate) => candidate.id === state.mistakeSolveId);
    const selectedOption = mistake?.options?.[Number(mistakeSolveOption.dataset.mistakeSolveOption)];
    if (!selectedOption) return;
    state = { ...state, mistakeSolveAnswer: selectedOption.value };
    soundManager.play(selectedOption.value === mistake.correctAnswer ? 'answer-correct' : 'answer-wrong');
    render();
    return;
  }
  if (event.target.closest('[data-retry-mistake-solve]')) {
    state = { ...state, mistakeSolveAnswer: null };
    render();
    return;
  }
  if (event.target.closest('[data-back-to-mistakes]')) {
    state = { ...state, view: 'dashboard-section', dashboardSection: 'mistakes', mistakeReviewId: null, mistakeSolveId: null, mistakeSolveAnswer: null };
    render();
    return;
  }
  if (event.target.closest('[data-close-mistake-review]')) {
    state = { ...state, mistakeReviewId: null };
    render();
    return;
  }
  const dismissMistakeButton = event.target.closest('[data-dismiss-mistake]');
  if (dismissMistakeButton) {
    state = { ...state, dismissMistakeId: dismissMistakeButton.dataset.dismissMistake };
    render();
    return;
  }
  if (event.target.closest('[data-cancel-dismiss-mistake]')) {
    state = { ...state, dismissMistakeId: null };
    render();
    return;
  }
  const confirmDismissButton = event.target.closest('[data-confirm-dismiss-mistake]');
  if (confirmDismissButton) {
    const mistakeId = confirmDismissButton.dataset.confirmDismissMistake;
    const mistake = visibleMistakes().find((candidate) => candidate.id === mistakeId);
    confirmDismissButton.disabled = true;
    void fetch(`/api/me/mistakes/${encodeURIComponent(mistakeId)}`, { method: 'DELETE', credentials: 'include', headers: { accept: 'application/json' } }).then(async (response) => {
      if (!response.ok) throw new Error('dismiss failed');
      removeLocalMistake(mistake);
      state = { ...state, dismissMistakeId: null, mistakeReviewId: state.mistakeReviewId === mistakeId ? null : state.mistakeReviewId };
      await refreshLearningState();
    }).catch(() => { state = { ...state, dismissMistakeId: null }; render(); });
    return;
  }

  const openMistakesButton = event.target.closest('[data-open-mistakes]');
  if (openMistakesButton) {
    const skill = openMistakesButton.dataset.openMistakes;
    state = { ...state, view: 'dashboard-section', dashboardSection: 'mistakes', mistakeSkill: skill, mistakeReviewId: null, dismissMistakeId: null, dashboardMenuOpen: false };
    render();
    void refreshLearningState();
    return;
  }

  const dashboardSectionButton = event.target.closest('[data-dashboard-section]');
  if (dashboardSectionButton) {
    const section = dashboardSectionButton.dataset.dashboardSection;
    state = { ...state, view: section === 'dashboard' ? 'dashboard' : section === 'reading' ? 'dashboard-models' : 'dashboard-section', dashboardSection: section, dashboardMenuOpen: false };
    render();
    void Promise.all([refreshServerDashboard(), refreshLearningState()]);
    return;
  }

  if (event.target.closest('[data-toggle-sounds]')) {
    soundManager.updateSettings({ enabled: !soundManager.getSettings().enabled });
    render();
    return;
  }

  if (event.target.closest('[data-sound-test]')) {
    soundManager.play('answer-correct');
    return;
  }

  if (event.target.closest('[data-listening-library]')) {
    state = { ...state, view: 'dashboard-section', dashboardSection: 'listening', selectedListeningModelId: null, selectedRecordingId: null, listeningQuestionIndex: 0, listeningAnswers: {} };
    render();
    return;
  }

  if (event.target.closest('[data-listening-model]')) {
    state = { ...state, view: 'listening-model', selectedRecordingId: null, listeningQuestionIndex: 0, listeningAnswers: {} };
    render();
    return;
  }

  const listeningModelButton = event.target.closest('[data-open-listening-model]');
  if (listeningModelButton) {
    const model = listeningModels.find((candidate) => candidate.id === listeningModelButton.dataset.openListeningModel);
    if (!model) return;
    state = { ...state, view: 'listening-model', dashboardSection: 'listening', selectedListeningModelId: model.id, selectedRecordingId: null, listeningQuestionIndex: 0, listeningAnswers: {} };
    render();
    return;
  }

  const recordingButton = event.target.closest('[data-open-recording]');
  if (recordingButton) {
    const model = currentListeningModel();
    const recordingItem = model?.recordings.find((item) => item.id === recordingButton.dataset.openRecording);
    if (!model || !recordingItem) return;
    const saved = listeningProgress(model.id, recordingItem.id);
    state = { ...state, view: 'listening-quiz', dashboardSection: 'listening', selectedRecordingId: recordingItem.id, listeningQuestionIndex: Math.min(saved.currentQuestionIndex ?? 0, recordingItem.questions.length - 1), listeningAnswers: { ...(saved.answers ?? {}) } };
    setListeningProgress(model.id, recordingItem.id, { status: saved.status === 'completed' ? 'completed' : 'in-progress' });
    render();
    return;
  }

  const listeningOption = event.target.closest('[data-listening-option]');
  if (listeningOption) {
    const model = currentListeningModel();
    const recordingItem = currentRecording(model);
    const question = recordingItem?.questions[state.listeningQuestionIndex];
    if (!model || !recordingItem || !question || state.listeningAnswers?.[question.id] !== undefined) return;
    const selectedIndex = Number(listeningOption.dataset.listeningOption);
    const hasSourceAnswer = Number.isInteger(question.correctIndex);
    const result = hasSourceAnswer ? selectedIndex === question.correctIndex : null;
    const saved = listeningProgress(model.id, recordingItem.id);
    const answers = { ...(saved.answers ?? {}), [question.id]: selectedIndex };
    const results = { ...(saved.results ?? {}), [question.id]: result };
    state.listeningAnswers = answers;
    setListeningProgress(model.id, recordingItem.id, { answers, results, status: 'in-progress', currentQuestionIndex: state.listeningQuestionIndex });
    soundManager.play(result === true ? 'answer-correct' : result === false ? 'answer-wrong' : 'option-select');
    const answerPayload = { skill: 'listening', questionSourceId: question.id, selectedIndex, modelSourceId: model.id, pieceSourceId: recordingItem.id, totalQuestions: recordingItem.questions.length, clientMutationId: crypto.randomUUID() };
    void sendLearningAnswer(answerPayload).catch(() => null);
    render();
    return;
  }

  if (event.target.closest('[data-listening-next]')) {
    const model = currentListeningModel();
    const recordingItem = currentRecording(model);
    const question = recordingItem?.questions[state.listeningQuestionIndex];
    if (!model || !recordingItem || !question || (question.options.length && state.listeningAnswers?.[question.id] === undefined)) return;
    const saved = listeningProgress(model.id, recordingItem.id);
    if (state.listeningQuestionIndex >= recordingItem.questions.length - 1) {
      setListeningProgress(model.id, recordingItem.id, { status: 'completed', currentQuestionIndex: 0 });
      state.view = 'listening-result';
      soundManager.play('exercise-complete');
    } else {
      state.listeningQuestionIndex += 1;
      setListeningProgress(model.id, recordingItem.id, { status: 'in-progress', currentQuestionIndex: state.listeningQuestionIndex });
    }
    render();
    keepQuestionInPlace();
    return;
  }

  if (event.target.closest('[data-listening-previous]')) {
    if (state.listeningQuestionIndex <= 0) return;
    state.listeningQuestionIndex -= 1;
    render();
    keepQuestionInPlace();
    return;
  }

  if (event.target.closest('[data-listening-retry]')) {
    const model = currentListeningModel();
    const recordingItem = currentRecording(model);
    if (!model || !recordingItem) return;
    setListeningProgress(model.id, recordingItem.id, { answers: {}, results: {}, status: 'in-progress', currentQuestionIndex: 0 });
    state = { ...state, view: 'listening-quiz', listeningQuestionIndex: 0, listeningAnswers: {} };
    render();
    return;
  }

  if (event.target.closest('[data-grammar-library]')) {
    state = { ...state, view: 'dashboard-section', dashboardSection: 'grammar', selectedGrammarModelId: null, grammarPendingQuestionId: null };
    render();
    return;
  }

  const grammarModelButton = event.target.closest('[data-open-grammar-model]');
  if (grammarModelButton) {
    const model = grammarModels.find((candidate) => candidate.id === grammarModelButton.dataset.openGrammarModel);
    if (!model || model.status !== 'available') return;
    const saved = grammarProgress(model.id);
    state = { ...state, view: 'grammar-quiz', dashboardSection: 'grammar', selectedGrammarModelId: model.id, grammarQuestionIndex: Math.min(saved.currentQuestionIndex ?? 0, model.questions.length - 1), grammarAnswers: { ...(saved.answers ?? {}) }, grammarConfirmed: Object.fromEntries(Object.entries(saved.results ?? {}).filter(([, value]) => value !== null)), grammarPendingQuestionId: null };
    render();
    return;
  }

  const grammarOption = event.target.closest('[data-grammar-option]');
  if (grammarOption) {
    const model = currentGrammarModel();
    const question = model?.questions[state.grammarQuestionIndex];
    if (!model || !question || state.grammarAnswers?.[question.id] !== undefined || state.grammarPendingQuestionId) return;
    soundManager.play('option-select');
    confirmGrammarAnswer(model, question, Number(grammarOption.dataset.grammarOption));
    return;
  }

  if (event.target.closest('[data-grammar-next]')) {
    const model = currentGrammarModel();
    if (!model) return;
    const question = model.questions[state.grammarQuestionIndex];
    if (state.grammarAnswers?.[question.id] === undefined || state.grammarPendingQuestionId) return;
    if (state.grammarQuestionIndex >= model.questions.length - 1) {
      setGrammarProgress(model.id, { status: 'completed', currentQuestionIndex: 0 });
      state.view = 'grammar-result';
      const savedResults = grammarProgress(model.id).results ?? {};
      void grammarAnswerQueue.then(() => submitLearningAttempt(grammarProgress(model.id).attemptId));
      const scored = model.questions.filter((candidate) => candidate.correctIndex !== null);
      const correct = scored.filter((candidate) => savedResults[candidate.id] === true).length;
      soundManager.play(scored.length && correct / scored.length >= 0.9 ? 'achievement' : 'exercise-complete');
    } else {
      state.grammarQuestionIndex += 1;
      setGrammarProgress(model.id, { currentQuestionIndex: state.grammarQuestionIndex });
    }
    state.tutorOpen = false;
    state.tutorQuestionKey = null;
    render();
    return;
  }

  if (event.target.closest('[data-grammar-previous]')) {
    if (state.grammarQuestionIndex <= 0) return;
    state.grammarQuestionIndex -= 1;
    state.tutorOpen = false;
    state.tutorQuestionKey = null;
    render();
    return;
  }

  if (event.target.closest('[data-grammar-retry]')) {
    const model = currentGrammarModel();
    if (!model) return;
    const saved = grammarProgress(model.id);
    setGrammarProgress(model.id, { answers: {}, results: {}, mistakes: { ...(saved.mistakes ?? {}) }, attemptId: null, status: 'in-progress', currentQuestionIndex: 0 });
    state = { ...state, view: 'grammar-quiz', grammarQuestionIndex: 0, grammarAnswers: {}, grammarConfirmed: {}, grammarPendingQuestionId: null, tutorOpen: false, tutorQuestionKey: null };
    render();
    keepQuestionInPlace();
    return;
  }

  if (event.target.closest('[data-dashboard]')) {
    state = { ...state, view: account ? 'dashboard' : 'login', authError: account ? '' : 'سجّل الدخول أو أنشئ حسابًا للوصول إلى لوحة المستخدم.' };
    render();
    if (account) void Promise.all([refreshServerDashboard(), refreshLearningState()]);
    return;
  }

  if (event.target.closest('[data-logout]')) {
    const logoutButton = event.target.closest('[data-logout]');
    if (logoutButton) logoutButton.disabled = true;
    authClient.signOut()
      .then(() => {
        account = null;
        serverDashboard = null;
        serverLearningState = null;
        serverLearningStateLoaded = false;
        serverMistakes = [];
        serverMistakesLoaded = false;
        localStorage.removeItem(authHintKey);
        sessionStorage.removeItem(workspaceViewKey);
        progress = {};
        state = { ...state, view: 'library', dashboardSection: 'dashboard', authError: '' };
      })
      .catch(() => {
        state.authError = 'تعذر تسجيل الخروج الآن. حاول مرة أخرى.';
      })
      .finally(render);
    return;
  }

  if (event.target.closest('[data-models-scroll]')) {
    const modelsSection = document.querySelector('.models-section');
    if (modelsSection) modelsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else {
      state = { ...state, view: account ? 'dashboard-models' : 'library', selectedModelId: null, selectedPassageId: null };
      render();
    }
    return;
  }

  const resumeButton = event.target.closest('[data-resume-passage]');
  if (resumeButton) {
    const [modelId, passageId] = resumeButton.dataset.resumePassage.split('|');
    const model = models.find((candidate) => candidate.id === modelId);
    const passage = model?.passages.find((candidate) => candidate.id === passageId);
    if (!model || !passage) return;
    const saved = quizProgress(modelId, passageId);
    state = { ...state, view: 'quiz', selectedModelId: modelId, selectedPassageId: passageId, questionIndex: Math.min(saved.currentQuestionIndex ?? 0, Math.max(0, passage.questions.length - 1)), questionStartedAt: Date.now(), translationQuestionId: null, activeAnswers: { ...(saved.answers ?? {}) }, restoredProgress: true, tutorOpen: false, tutorQuestionKey: null };
    render();
    keepQuestionInPlace();
    return;
  }

  const modelButton = event.target.closest('[data-open-model]');
  if (modelButton) {
    state = { ...state, view: 'model', selectedModelId: modelButton.dataset.openModel, selectedPassageId: null };
    render();
    return;
  }

  const passageButton = event.target.closest('[data-open-passage]');
  if (passageButton) {
    state = { ...state, view: 'quiz', selectedPassageId: passageButton.dataset.openPassage, questionIndex: 0, questionStartedAt: Date.now(), translationQuestionId: null, activeAnswers: {}, restoredProgress: false, tutorOpen: false, tutorQuestionKey: null };
    const passage = currentPassage();
    const saved = quizProgress(state.selectedModelId, passage.id);
    setQuizProgress(state.selectedModelId, passage.id, { ...saved, status: saved.status === 'completed' ? 'completed' : 'in-progress' });
    render();
    return;
  }

  const solutionsButton = event.target.closest('[data-open-solutions]');
  if (solutionsButton) {
    state = { ...state, view: 'solutions', selectedPassageId: solutionsButton.dataset.openSolutions };
    render();
    return;
  }

  const translationButton = event.target.closest('[data-toggle-translation]');
  if (translationButton) {
    const questionId = translationButton.dataset.toggleTranslation;
    state.translationQuestionId = state.translationQuestionId === questionId ? null : questionId;
    render();
    return;
  }

  const answerLinkButton = event.target.closest('[data-toggle-answer-link]');
  if (answerLinkButton) {
    const questionId = answerLinkButton.dataset.toggleAnswerLink;
    state.answerLinkQuestionId = state.answerLinkQuestionId === questionId ? null : questionId;
    render();
    return;
  }

  const wordButton = event.target.closest('[data-word]');
  if (wordButton) {
    state.translatedWords = { ...state.translatedWords, [wordButton.dataset.questionWord]: { word: wordButton.dataset.word, index: Number(wordButton.dataset.wordIndex) } };
    render();
    return;
  }

  const optionButton = event.target.closest('[data-option]');
  if (optionButton) {
    const item = quizProgress(state.selectedModelId, state.selectedPassageId);
    const passage = currentPassage();
    if (state.activeAnswers?.[optionButton.dataset.question]) return;
    const question = passage.questions.find((candidate) => candidate.id === optionButton.dataset.question);
    const option = question?.options.find((candidate) => candidate.id === optionButton.dataset.option);
    const answers = { ...(state.activeAnswers ?? {}), [optionButton.dataset.question]: optionButton.dataset.option };
    state.activeAnswers = answers;
    const now = new Date().toISOString();
    const seconds = Math.max(1, Math.round((Date.now() - (state.questionStartedAt || Date.now())) / 1000));
    const answerMeta = { ...(item.answerMeta ?? {}), [question.id]: { ...(item.answerMeta?.[question.id] ?? {}), answeredAt: now, seconds, skill: inferReadingSkill(question) } };
    const mistakes = [...(item.mistakes ?? [])];
    const mistakeIndex = mistakes.findIndex((mistake) => mistake.questionId === question.id);
    if (question?.correctAnswer !== null && option && !option.isCorrect && mistakeIndex === -1) {
      mistakes.push({ questionId: question.id, optionId: option.id, attempt: state.questionIndex, createdAt: now, reason: inferMistakeReason(question, seconds), reviewAt: addDays(now, 2), reviewStage: 1, correctReviews: 0, mastered: false });
    }
    const activityDates = [...new Set([...(item.activityDates ?? []), dateKey(now)])];
    setQuizProgress(state.selectedModelId, state.selectedPassageId, { ...item, answers, answerMeta, activityDates, mistakes, status: 'in-progress', currentQuestionIndex: state.questionIndex });
    const answerPayload = { skill: 'reading', questionSourceId: question.id, selectedIndex: question.options.findIndex((candidate) => candidate.id === option?.id), modelSourceId: `model-${String(currentModel()?.order ?? '').padStart(2, '0')}`, pieceSourceId: passage.id, totalQuestions: passage.questions.length, responseTimeMs: seconds * 1000, clientMutationId: crypto.randomUUID() };
    void sendLearningAnswer(answerPayload).then(async (savedAnswer) => {
      const latest = quizProgress(state.selectedModelId, state.selectedPassageId);
      setQuizProgress(state.selectedModelId, state.selectedPassageId, { ...latest, attemptId: savedAnswer.attemptId });
      if (latest.status === 'completed') await submitLearningAttempt(savedAnswer.attemptId);
      await Promise.all([refreshServerDashboard(), refreshLearningState({ renderAfter: state.dashboardSection === 'mistakes', hydrate: false, flushPending: false })]);
    }).catch(() => null);
    soundManager.play(option?.isCorrect ? 'answer-correct' : 'answer-wrong');
    render();
    return;
  }

  const confidenceButton = event.target.closest('[data-confidence]');
  if (confidenceButton) {
    const item = quizProgress(state.selectedModelId, state.selectedPassageId);
    const passage = currentPassage();
    const question = passage?.questions[state.questionIndex];
    if (!question || !item.answerMeta?.[question.id]) return;
    const answerMeta = { ...(item.answerMeta ?? {}), [question.id]: { ...item.answerMeta[question.id], confidence: confidenceButton.dataset.confidence } };
    setQuizProgress(state.selectedModelId, state.selectedPassageId, { ...item, answerMeta });
    render();
    return;
  }

  if (event.target.closest('[data-next-question]')) {
    const item = quizProgress(state.selectedModelId, state.selectedPassageId);
    const passage = currentPassage();
    const question = passage.questions[state.questionIndex];
    if (!state.activeAnswers?.[question.id] && question.correctAnswer !== null) return;
    if (state.questionIndex >= passage.questions.length - 1) {
      setQuizProgress(state.selectedModelId, state.selectedPassageId, { ...item, status: 'completed', currentQuestionIndex: 0 });
      state.view = 'result';
      void submitLearningAttempt(item.attemptId);
    } else {
      const nextIndex = state.questionIndex + 1;
      setQuizProgress(state.selectedModelId, state.selectedPassageId, { ...item, status: 'in-progress', currentQuestionIndex: nextIndex });
      state.questionIndex = nextIndex;
      state.questionStartedAt = Date.now();
      state.translationQuestionId = null;
      state.answerLinkQuestionId = null;
      state.tutorOpen = false;
      state.tutorQuestionKey = null;
    }
    render();
    return;
  }

  if (event.target.closest('[data-previous-question]')) {
    if (state.questionIndex <= 0) return;
    state.questionIndex -= 1;
    state.questionStartedAt = Date.now();
    state.translationQuestionId = null;
    state.answerLinkQuestionId = null;
    state.tutorOpen = false;
    state.tutorQuestionKey = null;
    render();
    return;
  }

  if (event.target.closest('[data-reset-quiz]')) {
    const saved = quizProgress(state.selectedModelId, state.selectedPassageId);
    setQuizProgress(state.selectedModelId, state.selectedPassageId, { answers: {}, answerMeta: {}, mistakes: [...(saved.mistakes ?? [])], attemptId: null, status: 'not-started', currentQuestionIndex: 0 });
    state.view = 'quiz';
    state.questionIndex = 0;
    state.questionStartedAt = Date.now();
    state.translationQuestionId = null;
    state.answerLinkQuestionId = null;
    state.activeAnswers = {};
    state.restoredProgress = false;
    state.tutorOpen = false;
    state.tutorQuestionKey = null;
    render();
    return;
  }

  if (event.target.closest('[data-restore-progress]')) {
    const item = quizProgress(state.selectedModelId, state.selectedPassageId);
    const passage = currentPassage();
    state.activeAnswers = { ...(item.answers ?? {}) };
    state.questionIndex = Math.min(item.currentQuestionIndex ?? 0, passage.questions.length - 1);
    state.questionStartedAt = Date.now();
    state.translationQuestionId = null;
    state.answerLinkQuestionId = null;
    state.restoredProgress = true;
    render();
    return;
  }

  if (event.target.closest('[data-model]')) {
    state.view = 'model';
    render();
    return;
  }

  if (event.target.closest('[data-library]')) {
    state = { ...state, view: account ? 'dashboard' : 'library', selectedModelId: null, selectedPassageId: null, activeAnswers: {}, restoredProgress: false };
    render();
  }
});

render();

// Hydrate the UI from the server session on every page load. No account
// credentials or authentication identity are read from localStorage.
async function getSessionWithRetry() {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await authClient.getSession();
      if (response?.error) throw response.error;
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function bootstrapSession() {
  try {
    const response = await getSessionWithRetry();
    account = response?.data?.user ?? null;
    if (!account) {
      localStorage.removeItem(authHintKey);
      sessionStorage.removeItem(workspaceViewKey);
      if (restorableViews.has(state.view)) state.view = requestedView === 'dashboard' ? 'login' : 'library';
      return;
    }
    if (['login', 'register', 'library'].includes(state.view)) state.view = savedView ?? 'dashboard';
    const localSnapshot = readStored(progressKey(), {});
    progress = localSnapshot;
    restoreActiveWorkspaceProgress();
    localStorage.setItem(authHintKey, '1');
    state.authLoading = false;
    render();
    await migrateLegacyProgress(localSnapshot);
    await Promise.all([refreshServerDashboard(), refreshLearningState({ renderAfter: false })]);
    if (!serverMistakesLoaded) await refreshServerMistakes({ renderAfter: false });
    restoreActiveWorkspaceProgress();
  } catch (error) {
    account = null;
    if (!hasAuthHint) state.view = requestedView === 'dashboard' ? 'login' : 'library';
    else {
      state.view = 'login';
      state.authError = 'تعذر التحقق من الجلسة مؤقتًا. حاول تحديث الصفحة.';
    }
  } finally {
    state.authLoading = false;
    render();
  }
}

void bootstrapSession();

window.addEventListener('focus', () => { if (account) void Promise.all([refreshServerDashboard(), refreshLearningState()]); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && account) void Promise.all([refreshServerDashboard(), refreshLearningState()]); });
window.setInterval(() => { if (account && document.visibilityState === 'visible') void refreshLearningState({ renderAfter: false }); }, 25_000);
