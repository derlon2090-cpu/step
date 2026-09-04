import './style.css';
import './raseen.css';
import { readings } from './data/readings.js';
import { wordGlossary } from './data/manualQuizzes.js';
import { grammarModels } from './data/grammarModels.js';
import { soundManager } from './soundManager.js';
import { authClient } from '../lib/auth-client.ts';

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
        explanation: question.sourceNote,
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
const progressKey = () => account?.email ? `${storageKey}:${account.email}` : storageKey;
let progress = readStored(progressKey(), {});
const requestedView = new URLSearchParams(window.location.search).get('view');
const initialView = requestedView === 'dashboard' ? 'login' : requestedView;
let state = { view: ['login', 'register', 'dashboard'].includes(initialView) ? initialView : 'library', dashboardSection: 'dashboard', dashboardMenuOpen: false, authError: '', authLoading: true, selectedModelId: null, selectedPassageId: null, selectedGrammarModelId: null, grammarQuestionIndex: 0, grammarAnswers: {}, grammarConfirmed: {}, query: '', questionIndex: 0, translationQuestionId: null, translatedWords: {}, activeAnswers: {}, restoredProgress: false };
const app = document.querySelector('#app');

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const brandLogo = (variant = 'default') => `<img class="brand-image ${variant === 'light' ? 'brand-image-light' : ''}" src="/assets/nabahah-logo.png" alt="نباهة" />`;
const normalizeArabic = (value = '') => String(value).toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ً-ْ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const modelNumber = (model) => String(model.order).padStart(2, '0');
const saveProgress = () => localStorage.setItem(progressKey(), JSON.stringify(progress));
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

function displayedOptions(question) {
  if (!question.options.length) return [];
  const offset = question.number % question.options.length;
  return [...question.options.slice(offset), ...question.options.slice(0, offset)];
}

function normalizeWord(word) {
  return word.toLowerCase().replace(/[“”"'?.!,;:()]/g, '').replace(/’s$/, '').replace(/[^a-z]/g, '');
}

function wordMeaning(word) {
  return wordGlossary[normalizeWord(word)] ?? 'المعنى غير مضاف بعد';
}

function renderQuestionText(question) {
  if (state.translationQuestionId !== question.id) return escapeHtml(question.question);
  return question.question.split(/(\s+)/).map((token) => {
    if (!/[A-Za-z]/.test(token)) return escapeHtml(token);
    const clean = normalizeWord(token);
    return `<button class="word-chip" data-word="${escapeHtml(clean)}" data-question-word="${question.id}">${escapeHtml(token)}</button>`;
  }).join('');
}

function raseenHeader(active = 'النماذج') {
  if (account) return dashboardHeader(['model', 'quiz', 'solutions', 'result'].includes(state.view) ? 'reading' : 'dashboard');
  const nav = ['الرئيسية', 'أقسام STEP', 'النماذج', 'المدونة', 'من نحن', 'تواصل معنا'];
  return `<header class="raseen-header"><button class="brand-mark brand-button" data-library aria-label="العودة للرئيسية">${brandLogo()}</button><nav>${nav.map((item) => `<button class="${item === active ? 'active' : ''}" ${item === 'الرئيسية' ? 'data-library' : item === 'النماذج' || item === 'أقسام STEP' ? 'data-models-scroll' : 'data-dashboard'}>${item}</button>`).join('')}</nav><div class="header-actions"><button class="outline-action" data-login>تسجيل الدخول</button><button class="orange-action" data-dashboard>ابدأ الآن</button></div></header>`;
}

function dashboardHeader(active = 'dashboard') {
  const name = account?.name ? escapeHtml(account.name) : 'حسابي';
  const mistakesCount = Object.values(progress).flatMap((item) => item.mistakes ?? []).length;
  return `<header class="dashboard-header ${state.dashboardMenuOpen ? 'menu-open' : ''}"><button class="dashboard-menu-toggle" data-toggle-dashboard-menu aria-expanded="${state.dashboardMenuOpen}" aria-label="فتح قائمة لوحة المستخدم">☰</button><button class="dashboard-brand" data-dashboard-section="dashboard" aria-label="لوحة المستخدم">${brandLogo('light')}</button><nav aria-label="تنقل لوحة المستخدم"><button class="${active === 'dashboard' ? 'active' : ''}" data-dashboard-section="dashboard">لوحتي</button><button class="${active === 'reading' ? 'active' : ''}" data-models-scroll>القراءة</button><button class="${active === 'grammar' ? 'active' : ''}" data-dashboard-section="grammar">القواعد</button><button class="${active === 'listening' ? 'active' : ''}" data-dashboard-section="listening">الاستماع</button><button class="${active === 'exams' ? 'active' : ''}" data-dashboard-section="exams">الاختبارات</button><button class="${active === 'mistakes' ? 'active' : ''}" data-dashboard-section="mistakes">أخطائي${mistakesCount ? `<b class="nav-badge">${mistakesCount}</b>` : ''}</button><button class="${active === 'progress' ? 'active' : ''}" data-dashboard-section="progress">تقدمي</button><details class="dashboard-step-menu"><summary class="${active === 'step-sections' ? 'active' : ''}">أقسام STEP <span aria-hidden="true">⌄</span></summary><div><button data-dashboard-section="reading">فهم المقروء</button><button data-dashboard-section="grammar">التراكيب النحوية</button><button data-dashboard-section="listening">فهم المسموع</button><button data-dashboard-section="writing">التحليل الكتابي</button></div></details></nav><details class="dashboard-profile-menu"><summary><span class="dashboard-avatar" aria-hidden="true">${name.charAt(0)}</span><span>${name}</span><span class="profile-caret" aria-hidden="true">⌄</span></summary><div><button data-dashboard-section="profile">ملفي الشخصي</button><button data-dashboard-section="settings">إعدادات الحساب</button><button data-dashboard-section="subscription">الاشتراك</button><button data-dashboard-section="help">المساعدة</button><button class="dashboard-logout" data-logout>تسجيل الخروج</button></div></details></header>`;
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
  const mistakes = entries.flatMap(([, item]) => item.mistakes ?? []);
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
  const completedPieces = completedEntries.length;
  const progressPercent = passageCount ? Math.round((completedPieces / passageCount) * 100) : 0;
  const hasLocalActivity = entries.length > 0;
  const remoteOverall = serverDashboard?.overall;
  const remoteAnswered = Number(remoteOverall?.correctAnswers ?? 0) + Number(remoteOverall?.wrongAnswers ?? 0);
  const accuracy = hasLocalActivity ? (scoredAnswers ? Math.round((correctAnswers / scoredAnswers) * 100) : 0) : (remoteAnswered ? Math.round((Number(remoteOverall.correctAnswers) / remoteAnswered) * 100) : 0);
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
  const improvement = uniqueMistakes.map((mistake) => questionMap.get(mistake.questionId)).filter(Boolean)[0] ?? null;
  const dashboardAnswered = hasLocalActivity ? answered : remoteAnswered;
  const dashboardMistakeCount = hasLocalActivity ? uniqueMistakes.length : Number(serverDashboard?.unreviewedMistakes ?? 0);
  return { passageCount, questionCount, completedPieces, completedEntries, answered: dashboardAnswered, mistakes, uniqueMistakes, resultRows, progressPercent, accuracy, latestContext, firstModel, firstPassage, weeklyCompleted, improvement, dashboardMistakeCount };
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
  const mistakeBreakdown = data.dashboardMistakeCount ? `<div class="mistake-breakdown"><span>Reading <b>${data.dashboardMistakeCount}</b></span><span>Grammar <b>0</b></span><span>Listening <b>0</b></span></div>` : '<p class="muted-copy">لا توجد أخطاء محفوظة بعد. ستظهر هنا فور إجابتك عن الأسئلة.</p>';
  return `<main class="dashboard-shell">${dashboardHeader('dashboard')}<section class="dashboard-intro"><span class="eyebrow">مساحة تعلمك الشخصية</span><h1>مرحبًا${account?.name ? `، ${escapeHtml(account.name)}` : ''} 👋</h1><p>واصل تقدمك نحو إتقان STEP بخطوات واضحة وهادئة.</p></section><section class="dashboard-focus-grid"><article class="continue-card"><div class="continue-card-copy"><span class="eyebrow">تابع من حيث توقفت</span><h2>${resume ? `${escapeHtml(resume.model.title)} — ${escapeHtml(resume.passage.title)}` : 'ابدأ رحلتك الأولى'}</h2><p>${data.latestContext ? `آخر نشاط ${resume.item.updatedAt ? new Date(resume.item.updatedAt).toLocaleString('ar-SA') : 'محفوظ'}` : 'اختر قطعة وابدأ أول جلسة تدريب.'}</p><div class="continue-progress"><div><i style="width:${resumePercent}%"></i></div><strong>${resumePercent}%</strong></div>${resumeButton}</div><div class="continue-meta"><strong>${Object.keys(resume?.item?.answers ?? {}).length} من ${resume?.passage?.questions.length ?? 0}</strong><span>أسئلة مجابة</span></div></article><aside class="weekly-goal"><span class="eyebrow">هدف هذا الأسبوع</span><strong>${Math.min(6, data.weeklyCompleted)} / 6</strong><p>تدريبات مكتملة</p><div class="goal-track"><i style="width:${Math.min(100, (data.weeklyCompleted / 6) * 100)}%"></i></div><small>خطوة صغيرة كل يوم تصنع فرقًا.</small></aside></section><section class="dashboard-stats dashboard-stats-four"><article><strong>${data.progressPercent}%</strong><span>التقدم العام</span></article><article><strong>${data.accuracy}%</strong><span>دقة الإجابات</span></article><article><strong>${data.answered}</strong><span>الأسئلة المجابة</span></article><article><strong>${data.dashboardMistakeCount}</strong><span>أخطاء تحتاج مراجعة</span></article></section><section class="dashboard-main-grid"><article class="dashboard-panel skills-panel"><header class="panel-heading"><div><span class="eyebrow">تقدمك حسب المهارة</span><h2>المهارات</h2></div></header><div class="skill-row"><div><strong>Reading</strong><span>${data.completedPieces} من ${data.passageCount} قطعة مكتملة</span></div><b>${data.progressPercent}%</b><div class="skill-track"><i style="width:${data.progressPercent}%"></i></div></div><div class="skill-row"><div><strong>Grammar</strong><span>0 من 0 درس مكتمل</span></div><b>0%</b><div class="skill-track"><i style="width:0%"></i></div></div><div class="skill-row"><div><strong>Listening</strong><span>0 من 0 مقطع مكتمل</span></div><b>0%</b><div class="skill-track"><i style="width:0%"></i></div></div></article>${improvement}</section><section class="dashboard-main-grid lower-grid"><article class="dashboard-panel mistakes-panel"><header class="panel-heading"><div><span class="eyebrow">مراجعة أخطائي</span><h2>${data.dashboardMistakeCount} سؤالًا يحتاج المراجعة</h2></div><button class="text-action" data-dashboard-section="mistakes">عرض الكل</button></header>${mistakeBreakdown}<button class="navy-action" data-dashboard-section="mistakes">ابدأ المراجعة <span>←</span></button></article><article class="dashboard-panel suggestion-panel"><span class="eyebrow">اقتراح نباهة لك</span><h2>${data.dashboardMistakeCount ? 'راجع أخطاءك قبل بدء قطعة جديدة' : 'ابدأ بأول قطعة اليوم'}</h2><p>${data.dashboardMistakeCount ? 'ركّز على الأسئلة التي أخطأت فيها؛ ستبني منها جلسة مراجعة قصيرة ومفيدة.' : 'اقرأ القطعة بهدوء ثم أجب عن أسئلتها خطوة بخطوة.'}</p><button class="mint-action" data-open-model="${data.firstModel?.id ?? 'reading-01'}">ابدأ تدريبًا لمدة 5 دقائق</button></article></section><section class="dashboard-main-grid lower-grid"><article class="dashboard-panel results-panel"><header class="panel-heading"><div><span class="eyebrow">آخر النتائج</span><h2>محاولاتك الأخيرة</h2></div><button class="text-action" data-dashboard-section="progress">عرض جميع النتائج</button></header><table><thead><tr><th>التدريب</th><th>النتيجة</th><th>التاريخ</th></tr></thead><tbody>${recentResults || '<tr><td colspan="3" class="table-empty">لا توجد نتائج مكتملة بعد.</td></tr>'}</tbody></table></article><article class="dashboard-panel chart-panel"><header class="panel-heading"><div><span class="eyebrow">تحسن الطالب</span><h2>تطور دقتك</h2></div><span class="chart-range">آخر 30 يومًا</span></header><div class="dashboard-chart" aria-label="تطور دقة الإجابات">${trendMarkup}</div></article></section></main>`;
}

function dashboardModelsView() {
  const filtered = visibleModels();
  return `<main class="dashboard-shell dashboard-models-shell">${dashboardHeader('reading')}<header class="dashboard-page-heading"><div><span>مكتبة التدريب</span><h1>نماذج القراءة</h1><p>اختر النموذج للوصول إلى قطعه واختباراته.</p></div><button class="outline-action" data-dashboard>لوحة التحكم</button></header><section class="models-section dashboard-models-section"><section class="toolbar" aria-label="أدوات النماذج"><label class="search"><span>⌕</span><input id="search" value="${escapeHtml(state.query)}" placeholder="ابحث برقم النموذج أو اسم القطعة" /></label></section><section class="reading-grid">${filtered.map((model) => `<button class="reading-card ${model.passages.length ? '' : 'locked'}" data-open-model="${model.id}"><span class="reading-number">${modelNumber(model)}</span><span class="reading-title">${escapeHtml(model.title)}</span><span class="reading-meta">${model.passages.length ? `${model.passages.length} قطع داخلية` : 'بانتظار الإضافة'}</span><span class="reading-status ${model.passages.length ? 'in-progress' : 'not-started'}">${model.passages.length ? 'جاهز للاختبار' : 'غير مضاف'}</span></button>`).join('')}</section></section></main>`;
}

function dashboardSectionView(section) {
  const labels = { mistakes: ['أخطائي', 'راجع الإجابات التي تحتاج إلى تحسين وحوّلها إلى تقدم.'], grammar: ['القواعد', 'مسارات القواعد ستضاف تدريجيًا إلى خطتك.'], listening: ['الاستماع', 'تدريبات الاستماع ستضاف تدريجيًا إلى خطتك.'], writing: ['الكتابة', 'تدريبات الكتابة ستضاف تدريجيًا إلى خطتك.'], exams: ['الاختبارات', 'ابدأ اختبارًا تدريبيًا وتابع نتائج محاولاتك.'], progress: ['تقدمي', 'راجع نتائجك وتطور دقتك عبر الوقت.'], profile: ['الملف الشخصي', 'بيانات حسابك وإعدادات الوصول.'], settings: ['إعدادات الحساب', 'تحكم في تفضيلات حسابك وبيانات جلستك.'], subscription: ['الاشتراك', 'تفاصيل الوصول إلى مزايا نباهة.'], help: ['المساعدة', 'إجابات سريعة وإرشادات استخدام المنصة.'], reading: ['فهم المقروء', 'تدرب على فهم القطع وربط الفكرة بالتفاصيل.'] };
  const [title, subtitle] = labels[section] ?? labels.mistakes;
  const mistakes = Object.values(progress).flatMap((item) => item.mistakes ?? []);
  const questionMap = new Map(models.flatMap((model) => model.passages.flatMap((passage) => passage.questions.map((question) => [question.id, { model, passage, question }]))));
  let content = '';
  if (section === 'mistakes') {
    content = mistakes.length ? `<div class="dashboard-mistakes-list">${mistakes.map((mistake) => { const match = questionMap.get(mistake.questionId); return `<article class="dashboard-mistake-card"><span>سؤال ${match?.question.number ?? '—'}</span><h3>${escapeHtml(match?.question.question ?? 'سؤال غير متاح')}</h3><p>${escapeHtml(match ? `${match.passage.title} · النموذج ${modelNumber(match.model)}` : 'بيانات السؤال محفوظة للمراجعة')}</p><button data-open-model="${match?.model.id ?? 'reading-01'}">أعد التدريب</button></article>`; }).join('')}</div>` : '<div class="dashboard-empty"><strong>لا توجد أخطاء حتى الآن</strong><p>أكمل بعض التدريبات وستظهر هنا الأسئلة التي تحتاج مراجعتها.</p><button class="orange-action" data-models-scroll>ابدأ التدريب</button></div>';
  } else if (section === 'profile') {
    content = `<div class="dashboard-profile-card"><span class="dashboard-avatar large">${escapeHtml((account?.name ?? 'ح').charAt(0))}</span><h2>${escapeHtml(account?.name ?? 'المستخدم')}</h2><p>${escapeHtml(account?.email ?? '')}</p><button class="dashboard-logout" data-logout>تسجيل الخروج</button></div>`;
  } else if (section === 'progress') {
    const data = dashboardData();
    content = `<section class="dashboard-panel progress-detail-panel"><header class="panel-heading"><div><span class="eyebrow">ملخص تقدمك</span><h2>${data.progressPercent}% تقدم عام</h2></div></header><div class="progress-detail-grid"><div><strong>${data.completedPieces}</strong><span>قطع مكتملة</span></div><div><strong>${data.accuracy}%</strong><span>دقة الإجابات</span></div><div><strong>${data.answered}</strong><span>أسئلة مجابة</span></div></div><div class="skill-row"><div><strong>Reading</strong><span>${data.completedPieces} من ${data.passageCount} قطعة مكتملة</span></div><b>${data.progressPercent}%</b><div class="skill-track"><i style="width:${data.progressPercent}%"></i></div></div></section>`;
  } else if (section === 'exams') {
    content = `<section class="dashboard-panel exams-panel"><header class="panel-heading"><div><span class="eyebrow">اختبارات STEP</span><h2>ابدأ اختبارًا جديدًا</h2></div></header><p class="muted-copy">اختر أي نموذج قراءة متاح وابدأ بمحاولة منظمة. تحفظ نباهة إجاباتك لتعود إليها لاحقًا.</p><button class="navy-action" data-models-scroll>استعرض النماذج <span>←</span></button></section>`;
  } else if (section === 'settings') {
    const soundSettings = soundManager.getSettings();
    content = `<section class="dashboard-panel settings-panel"><header class="panel-heading"><div><span class="eyebrow">تجربة هادئة</span><h2>أصوات التفاعل</h2></div><span class="settings-state ${soundSettings.enabled ? 'on' : 'off'}">${soundSettings.enabled ? 'مفعّلة' : 'متوقفة'}</span></header><p class="muted-copy">نغمات قصيرة وناعمة أثناء التدريب فقط. صوت Listening مستقل تمامًا عن أصوات الواجهة.</p><div class="sound-setting-row"><div><strong>أصوات التفاعل</strong><span>اختيار، إجابة صحيحة أو خاطئة، والانتقال بين الأسئلة</span></div><button class="sound-toggle ${soundSettings.enabled ? 'is-on' : ''}" data-toggle-sounds aria-pressed="${soundSettings.enabled}">${soundSettings.enabled ? 'تشغيل' : 'إيقاف'}</button></div><div class="sound-volume-note"><span>المستوى الافتراضي</span><strong>${Math.round(soundSettings.volume * 100)}%</strong><small>أخفض بوضوح من مستوى Listening</small></div></section>`;
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
  return `<main class="dashboard-shell grammar-shell">${dashboardHeader('grammar')}<header class="dashboard-page-heading"><div><span>مسار STEP · التراكيب النحوية</span><h1>نماذج القواعد</h1><p>44 نموذجًا مرتبة بعناية؛ أول ثلاثة نماذج جاهزة للتدريب بالمحتوى المعتمد.</p></div><button class="outline-action" data-dashboard-section="dashboard">لوحة التحكم</button></header><section class="grammar-intro-card"><div><span class="eyebrow">منهج نباهة</span><h2>تدرّب على القاعدة، ثم افهم سبب الإجابة</h2><p>رتّبنا كل نموذج من القواعد العامة إلى الأسئلة الخاصة، مع الحفاظ على الإجابات كما ظهرت في المصدر.</p></div><div class="grammar-category-sequence">${grammarCategoryOrder.map((category, index) => `<span><b>${index + 1}</b>${grammarCategoryNames[category]}</span>`).join('')}</div></section><section class="grammar-model-grid" aria-label="نماذج القواعد">${grammarModels.map((model) => { const saved = grammarProgress(model.id); const done = saved.status === 'completed'; return `<article class="grammar-model-card ${model.status === 'available' ? 'is-available' : 'is-locked'}"><div class="grammar-model-number">${String(model.order).padStart(2, '0')}</div><div class="grammar-model-copy"><span class="eyebrow">نموذج ${model.order}</span><h2>${escapeHtml(model.title)}</h2><p>${escapeHtml(model.subtitle)}</p></div><span class="grammar-model-status">${model.status === 'available' ? (done ? 'مكتمل' : 'متاح الآن') : 'قريبًا'}</span>${model.status === 'available' ? `<button class="mint-action" data-open-grammar-model="${model.id}">${done ? 'مراجعة النموذج' : 'ابدأ التدريب'} <span>←</span></button>` : '<span class="grammar-lock" aria-label="محتوى قادم">🔒</span>'}</article>`; }).join('')}</section><section class="grammar-source-note"><strong>أمانة المصدر</strong><span>الإجابة المعتمدة هي الإجابة المحددة في المصدر. السؤال 100 في النموذج الثالث محفوظ بلا إجابة لأن التسطير غير واضح في الصورة.</span></section></main>`;
}

function grammarQuestionView(model) {
  const questions = model.questions;
  const index = Math.min(state.grammarQuestionIndex, Math.max(0, questions.length - 1));
  const question = questions[index];
  const selected = state.grammarAnswers?.[question.id];
  const confirmed = state.grammarConfirmed?.[question.id];
  const progressPercent = Math.round(((index + (selected !== undefined ? 1 : 0)) / questions.length) * 100);
  return `<main class="dashboard-shell grammar-quiz-shell">${dashboardHeader('grammar')}<header class="grammar-quiz-top"><button class="back-button" data-grammar-library>← نماذج القواعد</button><div><span class="eyebrow">${escapeHtml(model.title)}</span><h1>السؤال ${question.displayOrder} من ${questions.length}</h1></div><div class="grammar-quiz-progress"><span>${progressPercent}%</span><div><i style="width:${progressPercent}%"></i></div></div></header><section class="grammar-question-card"><div class="grammar-question-meta"><span class="grammar-category-pill">${escapeHtml(question.categoryLabel)}</span><span>رقم المصدر: ${question.sourceNumber}</span></div><h2>${escapeHtml(question.prompt)}</h2><div class="grammar-options" role="list">${question.options.map((option, optionIndex) => { const isSelected = selected === optionIndex; const isRight = confirmed !== undefined && optionIndex === question.correctIndex; const isWrong = confirmed !== undefined && isSelected && question.correctIndex !== null && optionIndex !== question.correctIndex; return `<button class="grammar-option ${isSelected ? 'is-selected' : ''} ${isRight ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}" data-grammar-option="${optionIndex}" ${selected !== undefined || state.grammarPendingQuestionId === question.id ? 'disabled' : ''}><span>${String.fromCharCode(65 + optionIndex)}</span><strong>${escapeHtml(option)}</strong></button>`; }).join('')}</div>${state.grammarPendingQuestionId === question.id ? '<p class="grammar-confirming">جارٍ تأكيد الإجابة…</p>' : ''}${confirmed !== undefined ? `<div class="grammar-feedback ${confirmed ? 'is-correct' : 'is-wrong'}"><strong>${confirmed ? 'أحسنت، إجابة صحيحة.' : question.correctIndex === null ? 'تم حفظ إجابتك، لكن الإجابة المعتمدة غير محددة في المصدر.' : 'ليست الإجابة الصحيحة.'}</strong>${!confirmed && question.correctIndex !== null ? `<span>الحل الصحيح: ${String.fromCharCode(65 + question.correctIndex)}) ${escapeHtml(question.options[question.correctIndex])}</span>` : ''}${question.sourceNote ? `<small>${escapeHtml(question.sourceNote)}</small>` : ''}</div>` : ''}</section><footer class="grammar-quiz-actions"><button class="outline-action" data-grammar-previous ${index === 0 ? 'disabled' : ''}>السابق</button><button class="mint-action" data-grammar-next ${selected === undefined || state.grammarPendingQuestionId ? 'disabled' : ''}>${index === questions.length - 1 ? 'إنهاء التدريب' : 'السؤال التالي'} <span>←</span></button></footer></main>`;
}

function grammarResultView(model) {
  const saved = grammarProgress(model.id);
  const scored = model.questions.filter((question) => question.correctIndex !== null);
  const correct = scored.filter((question) => saved.results?.[question.id] === true).length;
  const score = scored.length ? Math.round((correct / scored.length) * 100) : 0;
  return `<main class="dashboard-shell grammar-result-shell">${dashboardHeader('grammar')}<section class="grammar-result-card"><span class="eyebrow">نتيجة التدريب</span><h1>${escapeHtml(model.title)} مكتمل</h1><div class="grammar-score"><strong>${score}%</strong><span>${correct} من ${scored.length} إجابة صحيحة</span></div><p>حافظنا على ترتيبك وإجابات المصدر لتتمكن من مراجعة كل سؤال بهدوء.</p><div class="grammar-result-actions"><button class="mint-action" data-grammar-retry>إعادة التدريب</button><button class="outline-action" data-grammar-library>العودة للنماذج</button></div></section></main>`;
}

async function confirmGrammarAnswer(model, question, optionIndex) {
  state.grammarPendingQuestionId = question.id;
  state.grammarAnswers = { ...(state.grammarAnswers ?? {}), [question.id]: optionIndex };
  render();
  let isCorrect;
  try {
    const response = await fetch('/api/grammar/answer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ modelId: model.id, questionId: question.id, selectedIndex: optionIndex }) });
    if (!response.ok) throw new Error('grammar answer endpoint unavailable');
    const payload = await response.json();
    isCorrect = payload.isCorrect;
  } catch {
    // Local catalogue fallback keeps offline practice usable; production API
    // responses still take precedence when the server is available.
    isCorrect = question.correctIndex === null ? null : optionIndex === question.correctIndex;
  }
  const saved = grammarProgress(model.id);
  setGrammarProgress(model.id, { answers: { ...(saved.answers ?? {}), [question.id]: optionIndex }, results: { ...(saved.results ?? {}), [question.id]: isCorrect }, status: 'in-progress', currentQuestionIndex: state.grammarQuestionIndex });
  state.grammarConfirmed = { ...(state.grammarConfirmed ?? {}), [question.id]: isCorrect === true };
  state.grammarPendingQuestionId = null;
  render();
  if (isCorrect === true) soundManager.play('answer-correct');
  else if (isCorrect === false && question.correctIndex !== null) soundManager.play('answer-wrong');
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
    <section class="goals-section" aria-labelledby="goals-title"><header class="landing-section-heading"><span>اختر مسارك وابدأ المسار المناسب لك</span><h2 id="goals-title">ماذا تريد أن تحقق؟</h2><p>خطوات صغيرة اليوم تصنع فرقًا كبيرًا في نتيجتك.</p></header><div class="goals-grid"><article class="goal-card goal-reading"><b aria-hidden="true">◫</b><h3>أهم 11 مقطع</h3><p>مقاطع الاستماع الأكثر تكرارًا في STEP</p><button data-open-model="reading-01">ابدأ الآن <span>←</span></button></article><article class="goal-card goal-pieces"><b aria-hidden="true">▤</b><h3>أهم 22 قطعة</h3><p>قطع القراءة الأكثر احتمالًا في الاختبار</p><button data-models-scroll>ابدأ الآن <span>←</span></button></article><article class="goal-card goal-questions"><b aria-hidden="true">☆</b><h3>أهم 150 سؤال</h3><p>أسئلة مركزة على المفاهيم الأساسية</p><button data-models-scroll>ابدأ الآن <span>←</span></button></article><article class="goal-card goal-rules"><b aria-hidden="true">⬡</b><h3>القواعد</h3><p>تقوية الأساس اللغوي خطوة بخطوة</p><button data-dashboard>ابدأ الآن <span>←</span></button></article><article class="goal-card goal-reading-main"><b aria-hidden="true">▣</b><h3>القراءة</h3><p>افهم القطع وأجب بدقة وسرعة</p><button data-open-model="reading-01">ابدأ الآن <span>←</span></button></article><article class="goal-card goal-writing"><b aria-hidden="true">✎</b><h3>الكتابة</h3><p>تعلم الكتابة الصحيحة وبناء الجملة</p><button data-dashboard>ابدأ الآن <span>←</span></button></article><article class="goal-card goal-listening"><b aria-hidden="true">◉</b><h3>الاستماع</h3><p>درّب أذنك على الفكرة والتفاصيل</p><button data-dashboard>ابدأ الآن <span>←</span></button></article></div></section>
    <section class="models-section" aria-labelledby="models-title"><div class="landing-section-heading models-heading"><span>نماذج واختبارات منظمة</span><h2 id="models-title">نماذج STEP المتاحة</h2><p>اختر النموذج وابدأ التدريب من القطعة المناسبة لك.</p><span class="completion">${completed} مكتملة</span></div>
    <section class="toolbar" aria-label="أدوات القراءة">
      <label class="search"><span>⌕</span><input id="search" value="${escapeHtml(state.query)}" placeholder="ابحث برقم النموذج أو اسم القطعة" /></label>
    </section>
    <section class="reading-grid">
      ${filtered.map((model) => `<button class="reading-card ${model.passages.length ? '' : 'locked'}" data-open-model="${model.id}">
        <span class="reading-number">${modelNumber(model)}</span>
        <span class="reading-title">${escapeHtml(model.title)}</span>
        <span class="reading-meta">${model.passages.length ? `${model.passages.length} قطع داخلية` : 'بانتظار الإضافة'}</span>
        <span class="reading-status ${model.passages.length ? 'in-progress' : 'not-started'}">${model.passages.length ? 'جاهز للاختبار' : 'غير مضاف'}</span>
      </button>`).join('')}
    </section></section>
    <section class="testimonials-section" aria-labelledby="testimonials-title"><header class="landing-section-heading"><span>تجارب طلابنا</span><h2 id="testimonials-title">نتائج وآراء طلابنا</h2><p>تجربة منظمة تساعدك على المذاكرة بثقة والاستمرار حتى هدفك.</p></header><div class="testimonials-grid"><article class="testimonial-card"><span class="quote-mark">“</span><p>المنصة مرتبة وواضحة، عرفت من أين أبدأ وكيف أتابع تقدمي في كل جلسة.</p><footer><span class="testimonial-avatar">س</span><div><strong>سعود الشهراني</strong><small>الدمام</small></div><b aria-label="5 من 5">★★★★★</b></footer></article><article class="testimonial-card"><span class="quote-mark">“</span><p>أحببت طريقة عرض القطع والأسئلة؛ أصبحت المراجعة اليومية أسهل وأكثر تركيزًا.</p><footer><span class="testimonial-avatar purple">م</span><div><strong>مريم العتيبي</strong><small>جدة</small></div><b aria-label="5 من 5">★★★★★</b></footer></article><article class="testimonial-card"><span class="quote-mark">“</span><p>شرح بسيط ومركز، والنماذج تساعدني على معرفة نقاط القوة والأخطاء بسرعة.</p><footer><span class="testimonial-avatar green">ت</span><div><strong>تركي الحربي</strong><small>الرياض</small></div><b aria-label="5 من 5">★★★★★</b></footer></article></div></section>
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
    <section class="solutions-list">${passage.questions.map((question) => `<article class="solution-card"><div class="solution-number">${question.number}</div><div class="solution-content"><h2>${escapeHtml(question.question)}</h2><div class="solution-answer"><span>الإجابة الصحيحة</span><strong>${question.correctAnswer ? escapeHtml(question.correctAnswer) : 'غير محددة في المصدر'}</strong></div><p class="solution-why"><b>لماذا؟</b> ${escapeHtml(question.explanation)}</p></div></article>`).join('')}</section>
  </main>`;
}

function quizView(model, passage) {
  const item = quizProgress(model.id, passage.id);
  const activeAnswers = state.activeAnswers ?? {};
  const answered = Object.keys(activeAnswers).length;
  const savedCount = Object.keys(item.answers ?? {}).length;
  const index = Math.min(state.questionIndex, passage.questions.length - 1);
  const question = passage.questions[index];
  const selectedId = activeAnswers[question.id];
  const answerPending = question.correctAnswer === null;
  const selectedOption = question.options.find((option) => option.id === selectedId);
  const answeredCorrectly = selectedOption?.isCorrect;
  const isLastQuestion = index === passage.questions.length - 1;
  return `<main class="quiz-shell">
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
        <div class="question-heading"><span>السؤال ${index + 1}</span><small>من ${passage.questions.length}</small></div>
        <div class="question-tools">
          <button data-toggle-translation="${question.id}">${state.translationQuestionId === question.id ? 'إخفاء ترجمة الكلمات' : 'ترجمة الكلمات'}</button>
          ${state.translationQuestionId === question.id && state.translatedWords[question.id] ? `<strong>${escapeHtml(state.translatedWords[question.id])}: ${escapeHtml(wordMeaning(state.translatedWords[question.id]))}</strong>` : '<small>اضغط على أي كلمة إنجليزية في السؤال لمعرفة معناها.</small>'}
        </div>
        <h2><span>${question.number}</span><b>${renderQuestionText(question)}</b></h2>
        <div class="quiz-options">
          ${displayedOptions(question).map((option, optionIndex) => `<button class="quiz-option ${selectedId === option.id ? 'selected' : ''} ${selectedId && option.isCorrect ? 'correct' : ''} ${selectedId === option.id && !option.isCorrect ? 'wrong' : ''}" data-question="${question.id}" data-option="${option.id}" ${selectedId ? 'disabled' : ''}>
            <span class="option-marker" aria-hidden="true">${String.fromCharCode(65 + optionIndex)}</span><span>${escapeHtml(option.text)}</span>
          </button>`).join('')}
          ${answerPending && !question.options.length ? '<div class="pending-answer">مفتاح الإجابة والخيارات قيد المراجعة. يمكنك الانتقال للسؤال التالي.</div>' : ''}
        </div>
        ${selectedId ? answeredCorrectly ? '<p class="answer-note correct-note">صحيح، إجابتك ممتازة.</p>' : `<div class="answer-note wrong-note"><strong>${question.correctAnswer ? `غير صحيح. الحل الصحيح: ${escapeHtml(question.correctAnswer)}` : 'لم تُحدَّد الإجابة الصحيحة في المصدر.'}</strong><p>${escapeHtml(question.explanation)}</p></div>` : ''}
      </article>
    </section>
    <footer class="quiz-actions">
      <button data-reset-quiz>إعادة الاختبار</button>
      ${!state.restoredProgress && item.status === 'in-progress' && savedCount ? `<button data-restore-progress>استعادة التقدم (${savedCount})</button>` : ''}
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
          <h2><span>${question.number}</span>${escapeHtml(question.question)}</h2>
          <div class="quiz-options">
            ${displayedOptions(question).map((option, optionIndex) => `<div class="quiz-option ${option.isCorrect ? 'correct' : ''} ${selectedId === option.id && !option.isCorrect ? 'wrong' : ''}">
              <span class="option-marker" aria-hidden="true">${String.fromCharCode(65 + optionIndex)}</span><span>${escapeHtml(option.text)}</span>
            </div>`).join('')}
          </div>
          ${wasCorrect ? '<p class="answer-note correct-note">إجابتك صحيحة.</p>' : `<div class="answer-note wrong-note"><strong>${question.correctAnswer ? `الحل الصحيح: ${escapeHtml(question.correctAnswer)}` : 'لم تُحدَّد الإجابة الصحيحة في المصدر.'}</strong><p>${escapeHtml(question.explanation)}</p></div>`}
        </article>`;
      }).join('')}
    </section>
    <footer class="quiz-actions">
      <button class="primary-action" data-reset-quiz>معاودة الاختبار</button>
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

function render() {
  if (state.authLoading) {
    app.innerHTML = '<main class="auth-shell"><div class="auth-panel"><span class="auth-kicker">نباهة</span><h1>جارٍ التحقق من الجلسة…</h1><p>لحظات ونفتح لك المساحة المناسبة.</p></div></main>';
    return;
  }
  const model = currentModel();
  const passage = currentPassage(model);
  if (state.view === 'login') app.innerHTML = loginView();
  else if (state.view === 'register') app.innerHTML = registerView();
  else if (state.view === 'dashboard') app.innerHTML = account ? dashboardView() : loginView();
  else if (state.view === 'dashboard-models') app.innerHTML = account ? dashboardModelsView() : loginView();
  else if (state.view === 'dashboard-section') app.innerHTML = account ? (state.dashboardSection === 'grammar' ? grammarLibraryView() : dashboardSectionView(state.dashboardSection)) : loginView();
  else if (state.view === 'grammar-quiz' && currentGrammarModel()) app.innerHTML = account ? grammarQuestionView(currentGrammarModel()) : loginView();
  else if (state.view === 'grammar-result' && currentGrammarModel()) app.innerHTML = account ? grammarResultView(currentGrammarModel()) : loginView();
  else if (state.view === 'model' && model) app.innerHTML = modelView(model);
  else if (state.view === 'quiz' && model && passage) app.innerHTML = quizView(model, passage);
  else if (state.view === 'solutions' && model && passage) app.innerHTML = solutionsView(model, passage);
  else if (state.view === 'result' && model && passage) app.innerHTML = resultView(model, passage);
  else app.innerHTML = libraryView();
}

let debounce;
app.addEventListener('input', (event) => {
  if (event.target.id !== 'search') return;
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    state.query = event.target.value;
    render();
  }, 200);
});

app.addEventListener('submit', async (event) => {
  const form = event.target.closest('.auth-form');
  if (!form) return;
  event.preventDefault();
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  const data = new FormData(form);
  const email = String(data.get('email') ?? '').trim().toLowerCase();
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
    progress = form.classList.contains('register-form') ? {} : readStored(progressKey(), {});
    if (form.classList.contains('register-form')) saveProgress();
    await refreshServerDashboard();
    state = { ...state, view: 'dashboard', authError: '', authLoading: false };
    render();
  } catch (error) {
    state.authError = authErrorMessage(error, 'تعذر الاتصال بخدمة الحساب. حاول مرة أخرى.');
    render();
  }
});

app.addEventListener('click', (event) => {
  soundManager.activate();
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

  const dashboardSectionButton = event.target.closest('[data-dashboard-section]');
  if (dashboardSectionButton) {
    const section = dashboardSectionButton.dataset.dashboardSection;
    state = { ...state, view: section === 'dashboard' ? 'dashboard' : section === 'reading' ? 'dashboard-models' : 'dashboard-section', dashboardSection: section, dashboardMenuOpen: false };
    render();
    return;
  }

  if (event.target.closest('[data-toggle-sounds]')) {
    soundManager.updateSettings({ enabled: !soundManager.getSettings().enabled });
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
      soundManager.play('exercise-complete');
    } else {
      state.grammarQuestionIndex += 1;
      setGrammarProgress(model.id, { currentQuestionIndex: state.grammarQuestionIndex });
      soundManager.play('question-next');
    }
    render();
    return;
  }

  if (event.target.closest('[data-grammar-previous]')) {
    if (state.grammarQuestionIndex <= 0) return;
    state.grammarQuestionIndex -= 1;
    render();
    return;
  }

  if (event.target.closest('[data-grammar-retry]')) {
    const model = currentGrammarModel();
    if (!model) return;
    setGrammarProgress(model.id, { answers: {}, results: {}, status: 'in-progress', currentQuestionIndex: 0 });
    state = { ...state, view: 'grammar-quiz', grammarQuestionIndex: 0, grammarAnswers: {}, grammarConfirmed: {}, grammarPendingQuestionId: null };
    render();
    return;
  }

  if (event.target.closest('[data-dashboard]')) {
    state = { ...state, view: account ? 'dashboard' : 'login', authError: account ? '' : 'سجّل الدخول أو أنشئ حسابًا للوصول إلى لوحة المستخدم.' };
    render();
    return;
  }

  if (event.target.closest('[data-logout]')) {
    const logoutButton = event.target.closest('[data-logout]');
    if (logoutButton) logoutButton.disabled = true;
    authClient.signOut()
      .then(() => {
        account = null;
        serverDashboard = null;
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
    state = { ...state, view: 'quiz', selectedModelId: modelId, selectedPassageId: passageId, questionIndex: Math.min(saved.currentQuestionIndex ?? 0, Math.max(0, passage.questions.length - 1)), translationQuestionId: null, activeAnswers: { ...(saved.answers ?? {}) }, restoredProgress: true };
    render();
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
    state = { ...state, view: 'quiz', selectedPassageId: passageButton.dataset.openPassage, questionIndex: 0, translationQuestionId: null, activeAnswers: {}, restoredProgress: false };
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

  const wordButton = event.target.closest('[data-word]');
  if (wordButton) {
    state.translatedWords = { ...state.translatedWords, [wordButton.dataset.questionWord]: wordButton.dataset.word };
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
    const mistakes = [...(item.mistakes ?? [])];
    if (question?.correctAnswer !== null && option && !option.isCorrect && !mistakes.some((mistake) => mistake.questionId === question.id && mistake.attempt === state.questionIndex)) {
      mistakes.push({ questionId: question.id, optionId: option.id, attempt: state.questionIndex, createdAt: new Date().toISOString() });
    }
    setQuizProgress(state.selectedModelId, state.selectedPassageId, { ...item, answers, mistakes, status: 'in-progress', currentQuestionIndex: state.questionIndex });
    soundManager.play(option?.isCorrect ? 'answer-correct' : 'answer-wrong');
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
    } else {
      soundManager.play('question-next');
      const nextIndex = state.questionIndex + 1;
      setQuizProgress(state.selectedModelId, state.selectedPassageId, { ...item, status: 'in-progress', currentQuestionIndex: nextIndex });
      state.questionIndex = nextIndex;
      state.translationQuestionId = null;
    }
    render();
    return;
  }

  if (event.target.closest('[data-previous-question]')) {
    if (state.questionIndex <= 0) return;
    state.questionIndex -= 1;
    state.translationQuestionId = null;
    render();
    return;
  }

  if (event.target.closest('[data-reset-quiz]')) {
    setQuizProgress(state.selectedModelId, state.selectedPassageId, { answers: {}, status: 'not-started', currentQuestionIndex: 0 });
    state.view = 'quiz';
    state.questionIndex = 0;
    state.translationQuestionId = null;
    state.activeAnswers = {};
    state.restoredProgress = false;
    render();
    return;
  }

  if (event.target.closest('[data-restore-progress]')) {
    const item = quizProgress(state.selectedModelId, state.selectedPassageId);
    const passage = currentPassage();
    state.activeAnswers = { ...(item.answers ?? {}) };
    state.questionIndex = Math.min(item.currentQuestionIndex ?? 0, passage.questions.length - 1);
    state.translationQuestionId = null;
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
authClient.getSession()
  .then(async (response) => {
    account = response?.data?.user ?? null;
    if (account) {
      progress = readStored(progressKey(), {});
      await refreshServerDashboard();
      state.view = 'dashboard';
    } else if (state.view === 'dashboard') {
      state.view = 'login';
    }
  })
  .catch(() => {
    account = null;
    if (state.view === 'dashboard') state.view = 'login';
  })
  .finally(() => {
    state.authLoading = false;
    render();
  });
