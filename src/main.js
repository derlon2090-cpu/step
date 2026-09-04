import './style.css';
import './raseen.css';
import { readings } from './data/readings.js';
import { wordGlossary } from './data/manualQuizzes.js';

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
const accountKey = 'raseen-local-account-v1';
const sessionAccountKey = 'raseen-session-account-v1';
const readStored = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const readSessionStored = (key, fallback) => {
  try {
    return JSON.parse(sessionStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

const storedAccount = readStored(accountKey, null) ?? readSessionStored(sessionAccountKey, null);
let account = storedAccount?.email && storedAccount?.passwordHash ? storedAccount : null;
const progressKey = () => account?.email ? `${storageKey}:${account.email}` : storageKey;
let progress = readStored(progressKey(), {});
const requestedView = new URLSearchParams(window.location.search).get('view');
const initialView = requestedView === 'dashboard' && !account ? 'login' : requestedView;
let state = { view: ['login', 'register', 'dashboard'].includes(initialView) ? initialView : 'library', authError: '', selectedModelId: null, selectedPassageId: null, query: '', questionIndex: 0, translationQuestionId: null, translatedWords: {}, activeAnswers: {}, restoredProgress: false };
const app = document.querySelector('#app');

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const normalizeArabic = (value = '') => String(value).toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ً-ْ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const modelNumber = (model) => String(model.order).padStart(2, '0');
const saveProgress = () => localStorage.setItem(progressKey(), JSON.stringify(progress));
const hashPassword = async (password) => {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};
const saveAccount = (value, remember = true) => {
  localStorage.removeItem(accountKey);
  sessionStorage.removeItem(sessionAccountKey);
  (remember ? localStorage : sessionStorage).setItem(remember ? accountKey : sessionAccountKey, JSON.stringify(value));
};
const quizKey = (modelId, passageId) => `${modelId}:${passageId}`;
const quizProgress = (modelId, passageId) => progress[quizKey(modelId, passageId)] ?? { answers: {}, status: 'not-started' };
let audioContext;

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
  progress[key] = { ...quizProgress(modelId, passageId), ...update };
  saveProgress();
}

async function playTone(type) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audioContext ??= new AudioContext();
  if (audioContext.state === 'suspended') await audioContext.resume();
  const sound = {
    correct: { frequencies: [660, 880], wave: 'sine', volume: 0.08, step: 0.08, length: 0.13 },
    wrong: { frequencies: [360, 220], wave: 'square', volume: 0.12, step: 0.12, length: 0.2 },
    next: { frequencies: [520], wave: 'sine', volume: 0.045, step: 0.08, length: 0.1 },
  }[type] ?? { frequencies: [440], wave: 'sine', volume: 0.06, step: 0.08, length: 0.12 };
  sound.frequencies.forEach((frequency, index) => {
    const start = audioContext.currentTime + index * sound.step;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = sound.wave;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(sound.volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + sound.length);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + sound.length + 0.02);
  });
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
  const nav = ['الرئيسية', 'أقسام STEP', 'النماذج', 'المدونة', 'من نحن', 'تواصل معنا'];
  return `<header class="raseen-header"><button class="brand-mark brand-button" data-library aria-label="العودة للرئيسية"><span>رصين</span><i aria-hidden="true">⌁</i></button><nav>${nav.map((item) => `<button class="${item === active ? 'active' : ''}" ${item === 'الرئيسية' ? 'data-library' : item === 'النماذج' || item === 'أقسام STEP' ? 'data-models-scroll' : 'data-dashboard'}>${item}</button>`).join('')}</nav><div class="header-actions"><button class="outline-action" ${account ? 'data-dashboard' : 'data-login'}>${account ? 'حسابي' : 'تسجيل الدخول'}</button><button class="orange-action" data-dashboard>ابدأ الآن</button></div></header>`;
}

function dashboardHeader() {
  const name = account?.name ? escapeHtml(account.name) : 'حسابي';
  return `<header class="dashboard-header"><button class="dashboard-brand" data-dashboard aria-label="لوحة المستخدم"><span>رصين</span><i aria-hidden="true">⌁</i></button><nav aria-label="تنقل لوحة المستخدم"><button class="active" data-dashboard>لوحة التحكم</button><button data-dashboard>الأخطاء</button><button data-models-scroll>القراءة</button><button data-dashboard>القواعد</button><button data-dashboard>الاستماع</button><button data-dashboard>الملف الشخصي</button></nav><div class="dashboard-account"><span class="dashboard-avatar" aria-hidden="true">${name.charAt(0)}</span><span>${name}</span><button class="dashboard-logout" data-logout>تسجيل الخروج</button></div></header>`;
}

function loginView() {
  return `<main class="auth-shell"><div class="auth-panel"><button class="brand-mark brand-button" data-library><span>رصين</span><i aria-hidden="true">⌁</i></button><span class="auth-kicker">منصة متخصصة في STEP فقط</span><h1>سجّل دخولك وابدأ رحلتك</h1><p>احفظ تقدمك، راجع أخطاءك، وواصل التدريب من آخر سؤال وصلت إليه.</p>${state.authError ? `<div class="auth-error" role="alert">${escapeHtml(state.authError)}</div>` : ''}<form class="auth-form login-form"><label>البريد الإلكتروني<input name="email" type="email" placeholder="أدخل بريدك الإلكتروني" autocomplete="email" required></label><label>كلمة المرور<input name="password" type="password" placeholder="أدخل كلمة المرور" autocomplete="current-password" required></label><label class="remember-row"><input name="remember" type="checkbox" checked> تذكّرني على هذا الجهاز</label><button class="orange-action" type="submit">تسجيل الدخول</button></form><button class="auth-secondary" data-register>إنشاء حساب جديد</button><button class="auth-link" data-library>العودة للرئيسية</button></div><div class="auth-art"><img src="/assets/raseen-student-hero.png" alt="طالب يستعد لاختبار STEP"><div><strong>تعلّم بثقة</strong><span>خطة واضحة وتقدم محفوظ</span></div></div></main>`;
}

function registerView() {
  return `<main class="auth-shell"><div class="auth-panel"><button class="brand-mark brand-button" data-library><span>رصين</span><i aria-hidden="true">⌁</i></button><span class="auth-kicker">ابدأ خطتك التعليمية</span><h1>أنشئ حسابك في رصين</h1><p>حسابك يحفظ تقدمك وأخطاءك لتعود إلى التدريب في أي وقت.</p>${state.authError ? `<div class="auth-error" role="alert">${escapeHtml(state.authError)}</div>` : ''}<form class="auth-form register-form"><label>الاسم الكامل<input name="name" type="text" placeholder="اكتب اسمك" autocomplete="name" minlength="2" required></label><label>البريد الإلكتروني<input name="email" type="email" placeholder="أدخل بريدك الإلكتروني" autocomplete="email" required></label><label>كلمة المرور<input name="password" type="password" placeholder="8 أحرف على الأقل" autocomplete="new-password" minlength="8" required></label><label>تأكيد كلمة المرور<input name="confirmPassword" type="password" placeholder="أعد كتابة كلمة المرور" autocomplete="new-password" minlength="8" required></label><label class="remember-row"><input name="terms" type="checkbox" required> أوافق على حفظ بيانات الحساب محليًا</label><button class="orange-action" type="submit">إنشاء الحساب والدخول</button></form><button class="auth-secondary" data-login>لدي حساب بالفعل</button><button class="auth-link" data-library>العودة للرئيسية</button></div><div class="auth-art"><img src="/assets/raseen-student-hero.png" alt="طالب يستعد لاختبار STEP"><div><strong>خطتك تبدأ هنا</strong><span>تقدم محفوظ وتجربة منظمة</span></div></div></main>`;
}

function dashboardView() {
  const completed = Object.values(progress).filter((item) => item.status === 'completed').length;
  const answered = Object.values(progress).reduce((sum, item) => sum + Object.keys(item.answers ?? {}).length, 0);
  const mistakes = Object.values(progress).flatMap((item) => item.mistakes ?? []);
  const firstModel = models.find((model) => model.passages.length);
  return `<main class="dashboard-shell">${dashboardHeader()}<section class="dashboard-welcome"><div><span>لوحة المستخدم</span><h1>مرحبًا${account?.name ? `، ${escapeHtml(account.name)}` : ''} 👋</h1><p>استمر بخطوة ثابتة، وكل جلسة تقرّبك من هدفك في اختبار STEP.</p><button class="orange-action" data-open-model="${firstModel?.id ?? 'reading-01'}">تابع التدريب ←</button></div><div class="dashboard-progress"><strong>${Math.min(100, Math.round((completed / Math.max(1, models.length)) * 100))}%</strong><span>نسبة الإنجاز</span><div><i style="width:${Math.min(100, Math.round((completed / Math.max(1, models.length)) * 100))}%"></i></div></div></section><section class="dashboard-stats"><article><strong>${completed}</strong><span>اختبارات مكتملة</span></article><article><strong>${answered}</strong><span>إجابة محفوظة</span></article><article><strong>${mistakes.length}</strong><span>أخطاء محفوظة</span></article><article><strong>${models.length}</strong><span>نموذج متاح</span></article></section><section class="dashboard-sections"><article><b>◫</b><h3>القراءة</h3><p>${models.reduce((sum, model) => sum + model.passages.length, 0)} قطعة تدريبية متاحة</p><button data-models-scroll>فتح النماذج ←</button></article><article><b>⌘</b><h3>القواعد</h3><p>مسارات القواعد ستضاف تدريجيًا إلى خطتك.</p><button data-dashboard>استعرض القسم</button></article><article><b>◉</b><h3>الاستماع</h3><p>تدريبات الاستماع قيد التجهيز.</p><button data-dashboard>استعرض القسم</button></article><article><b>✎</b><h3>الكتابة</h3><p>تدريبات الكتابة قيد التجهيز.</p><button data-dashboard>استعرض القسم</button></article></section><section class="dashboard-grid"><article><div class="section-heading"><div><span>خطتك الحالية</span><h2>واصل من حيث توقفت</h2></div></div><p>اختر نموذجًا للوصول إلى القطع والاختبارات الخاصة به.</p><button class="outline-action" data-models-scroll>عرض النماذج</button></article><article><div class="section-heading"><div><span>الأخطاء المسجلة</span><h2>${mistakes.length ? `${mistakes.length} تحتاج مراجعة` : 'لا توجد أخطاء بعد'}</h2></div></div><p>${mistakes.length ? 'راجع الأسئلة التي أخطأت فيها قبل إعادة المحاولة.' : 'أجب عن الأسئلة وستظهر الأخطاء هنا للمراجعة.'}</p><button class="outline-action" data-models-scroll>ابدأ المراجعة</button></article><article><div class="section-heading"><div><span>اختصارات سريعة</span><h2>ابدأ الآن</h2></div></div><div class="quick-actions"><button data-open-model="reading-01">النموذج الأول</button><button data-library>كل النماذج</button><button data-logout>تسجيل الخروج</button></div></article></section></main>`;
}

function libraryView() {
  const filtered = visibleModels();
  const completed = Object.values(progress).filter((item) => item.status === 'completed').length;
  const totalPassages = models.reduce((sum, model) => sum + model.passages.length, 0);
  const totalQuestions = models.reduce((sum, model) => sum + model.passages.reduce((pieceSum, passage) => pieceSum + passage.questions.length, 0), 0);
  return `<main class="app-shell">
    ${raseenHeader('الرئيسية')}
    <section class="raseen-hero"><div class="hero-copy"><span class="hero-kicker">منصة متخصصة في STEP فقط</span><h1>خطتك الأذكى لاجتياز <em>STEP</em></h1><p>تدرّب على القراءة من مكان واحد، وتابع تقدمك وأخطاءك حتى تصل إلى هدفك بثقة واحترافية.</p><ul class="hero-features"><li>نماذج مرتبة وواضحة</li><li>تصحيح فوري مع تفسير</li><li>متابعة وحفظ للتقدم</li><li>تجربة مناسبة لكل الأجهزة</li></ul><div class="hero-actions"><button class="orange-action" data-open-model="reading-01">ابدأ رحلتك مع رصين ←</button><button class="outline-action" data-models-scroll>استكشف النماذج</button></div></div><div class="hero-art"><img src="/assets/raseen-student-hero.png" alt="طالب يستعد لاختبار STEP باستخدام منصة رصين"><span class="hero-photo-badge">منصة متخصصة في<br><strong>STEP فقط</strong></span></div></section>
    <section class="hero-stats"><div><strong>${models.filter((model) => model.passages.length).length}</strong><span>نماذج متاحة</span></div><div><strong>${totalPassages}</strong><span>قطعة تدريبية</span></div><div><strong>${totalQuestions}</strong><span>سؤالًا منظمًا</span></div><div><strong>${completed}</strong><span>اختبارات مكتملة</span></div></section>
    <section class="benefits-strip"><span>نماذج STEP منظمة</span><span>متابعة الأخطاء</span><span>حفظ التقدم</span><span>تدريب واختبار</span></section>
    <section class="skills-section"><div class="section-heading"><div><span>ابدأ من مهارتك</span><h2>طوّر مستواك في كل قسم</h2></div></div><div class="skills-grid"><article><b>◫</b><h3>القراءة</h3><p>افهم القطع وأجب بدقة وسرعة.</p><button data-open-model="reading-01">ابدأ الآن ←</button></article><article><b>⌘</b><h3>القواعد</h3><p>راجع القواعد الأساسية لاختبار STEP.</p><button>قريبًا</button></article><article><b>◉</b><h3>الاستماع</h3><p>درّب أذنك على التفاصيل والفكرة العامة.</p><button>قريبًا</button></article><article><b>✎</b><h3>الكتابة</h3><p>طوّر بناء الجملة والاختيار الصحيح.</p><button>قريبًا</button></article></div></section>
    <section class="models-section"><div class="section-heading"><div><span>النماذج والاختبارات</span><h2>نماذج STEP المتاحة</h2></div><span class="completion">${completed} مكتملة</span></div>
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
    <footer class="raseen-footer"><strong>رصين</strong><span>منصة تعليمية متخصصة لاجتياز اختبار STEP</span></footer>
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

function render() {
  const model = currentModel();
  const passage = currentPassage(model);
  if (state.view === 'login') app.innerHTML = loginView();
  else if (state.view === 'register') app.innerHTML = registerView();
  else if (state.view === 'dashboard') app.innerHTML = dashboardView();
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
  const data = new FormData(form);
  const email = String(data.get('email') ?? '').trim().toLowerCase();
  const password = String(data.get('password') ?? '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    state.authError = 'أدخل بريدًا إلكترونيًا صحيحًا.';
    render();
    return;
  }
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
    const passwordHash = await hashPassword(password);
    account = { email, name, passwordHash };
    progress = {};
    saveProgress();
    saveAccount(account, true);
  } else {
    if (!account?.email || !account?.passwordHash) {
      state.authError = 'لا يوجد حساب محفوظ. أنشئ حسابًا جديدًا أولًا.';
      render();
      return;
    }
    const passwordHash = await hashPassword(password);
    if (account.email !== email || account.passwordHash !== passwordHash) {
      state.authError = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      render();
      return;
    }
    progress = readStored(progressKey(), {});
  }
  const remember = form.classList.contains('login-form') ? Boolean(data.get('remember')) : true;
  saveAccount(account, remember);
  state = { ...state, view: 'dashboard', authError: '' };
  render();
});

app.addEventListener('click', (event) => {
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

  if (event.target.closest('[data-dashboard]')) {
    state = { ...state, view: account ? 'dashboard' : 'login', authError: account ? '' : 'سجّل الدخول أو أنشئ حسابًا للوصول إلى لوحة المستخدم.' };
    render();
    return;
  }

  if (event.target.closest('[data-logout]')) {
    account = null;
    progress = {};
    localStorage.removeItem(accountKey);
    sessionStorage.removeItem(sessionAccountKey);
    state = { ...state, view: 'library' };
    render();
    return;
  }

  if (event.target.closest('[data-models-scroll]')) {
    const modelsSection = document.querySelector('.models-section');
    if (modelsSection) modelsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else {
      state = { ...state, view: 'library', selectedModelId: null, selectedPassageId: null };
      render();
    }
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
    playTone(option?.isCorrect ? 'correct' : 'wrong');
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
      playTone('next');
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
    state = { ...state, view: 'library', selectedModelId: null, selectedPassageId: null, activeAnswers: {}, restoredProgress: false };
    render();
  }
});

render();
