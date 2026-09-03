import './style.css';
import { readings } from './data/readings.js';
import { manualQuizModelsById, wordGlossary } from './data/manualQuizzes.js';

const storageKey = 'step-reading-progress-v2';
const readStored = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

let progress = readStored(storageKey, {});
let state = { view: 'library', selectedModelId: null, selectedPassageId: null, query: '', questionIndex: 0, translationQuestionId: null, translatedWords: {}, activeAnswers: {}, restoredProgress: false };
const app = document.querySelector('#app');

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const normalizeArabic = (value = '') => String(value).toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ً-ْ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const modelNumber = (model) => String(model.order).padStart(2, '0');
const saveProgress = () => localStorage.setItem(storageKey, JSON.stringify(progress));
const quizKey = (modelId, passageId) => `${modelId}:${passageId}`;
const quizProgress = (modelId, passageId) => progress[quizKey(modelId, passageId)] ?? { answers: {}, status: 'not-started' };
let audioContext;

const arabicModelNames = [
  'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
  'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر',
  'الثامن عشر', 'التاسع عشر', 'العشرون',
];

const models = readings.map((reading) => {
  const manual = manualQuizModelsById.get(reading.id);
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

function libraryView() {
  const filtered = visibleModels();
  const completed = Object.values(progress).filter((item) => item.status === 'completed').length;
  return `<main class="app-shell">
    <section class="hero">
      <p class="eyebrow">STEP</p>
      <h1>STEP Reading</h1>
      <p>اختر النموذج، ثم ادخل على القطعة الداخلية وابدأ الاختبار.</p>
    </section>
    <section class="toolbar" aria-label="أدوات القراءة">
      <label class="search"><span>⌕</span><input id="search" value="${escapeHtml(state.query)}" placeholder="ابحث برقم النموذج أو اسم القطعة" /></label>
      <span class="completion">${completed} اختبارات مكتملة</span>
    </section>
    <section class="reading-grid">
      ${filtered.map((model) => `<button class="reading-card ${model.passages.length ? '' : 'locked'}" data-open-model="${model.id}">
        <span class="reading-number">${modelNumber(model)}</span>
        <span class="reading-title">${escapeHtml(model.title)}</span>
        <span class="reading-meta">${model.passages.length ? `${model.passages.length} قطع داخلية` : 'بانتظار الإضافة'}</span>
        <span class="reading-status ${model.passages.length ? 'in-progress' : 'not-started'}">${model.passages.length ? 'جاهز للاختبار' : 'غير مضاف'}</span>
      </button>`).join('')}
    </section>
  </main>`;
}

function modelView(model) {
  return `<main class="reader-shell">
    <header class="reader-top">
      <button class="back-button" data-library>← النماذج</button>
      <div><p>النموذج ${modelNumber(model)}</p><h1>${escapeHtml(model.title)}</h1><small>${escapeHtml(model.subtitle)}</small></div>
    </header>
    <section class="passage-grid">
      ${model.passages.length ? model.passages.map((passage) => {
        const item = quizProgress(model.id, passage.id);
        return `<button class="passage-card" data-open-passage="${passage.id}">
          <span>${String(passage.order).padStart(2, '0')}</span>
          <strong>${escapeHtml(passage.title)} — ${escapeHtml(passage.englishTitle)}</strong>
          <em>${escapeHtml(passage.externalTitle)}</em>
          <small>${passage.questions.length} أسئلة · ${item.status === 'completed' ? 'مكتملة' : item.status === 'in-progress' ? 'قيد الحل' : 'لم تبدأ'}</small>
          <b>ابدأ الاختبار</b>
        </button>`;
      }).join('') : '<div class="empty-state"><h2>لا توجد قطع داخل هذا النموذج بعد</h2><p>أرسل القطعة التالية بنفس التنسيق وسأضيفها كاختبار مستقل.</p></div>'}
    </section>
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
  const selectedOption = question.options.find((option) => option.id === selectedId);
  const answeredCorrectly = selectedOption?.isCorrect;
  const isLastQuestion = index === passage.questions.length - 1;
  return `<main class="quiz-shell">
    <header class="quiz-top">
      <button class="back-button" data-model>← قطع النموذج</button>
      <div><p>${escapeHtml(model.title)}</p><h1>${escapeHtml(passage.title)} — ${escapeHtml(passage.englishTitle)}</h1><small>${escapeHtml(passage.externalTitle)}</small></div>
      <strong>${index + 1} / ${passage.questions.length}</strong>
    </header>
    <section class="question-progress" aria-label="تقدم الاختبار">
      <span style="width:${((index + 1) / passage.questions.length) * 100}%"></span>
    </section>
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
        </div>
        ${selectedId ? answeredCorrectly ? '<p class="answer-note correct-note">صحيح، إجابتك ممتازة.</p>' : `<div class="answer-note wrong-note"><strong>غير صحيح. الحل الصحيح: ${escapeHtml(question.correctAnswer)}</strong><p>${escapeHtml(question.explanation)}</p></div>` : ''}
      </article>
    </section>
    <footer class="quiz-actions">
      <button data-reset-quiz>إعادة الاختبار</button>
      ${!state.restoredProgress && item.status === 'in-progress' && savedCount ? `<button data-restore-progress>استعادة التقدم (${savedCount})</button>` : ''}
      <span>${answered} إجابة محفوظة</span>
      <div class="quiz-navigation">
        <button class="primary-action next-action" data-next-question ${selectedId ? '' : 'disabled'}>${isLastQuestion ? 'عرض النتيجة' : 'التالي'} <span aria-hidden="true">←</span></button>
        <button class="secondary-action previous-action" data-previous-question ${index === 0 ? 'disabled' : ''}><span aria-hidden="true">→</span> السابق</button>
      </div>
    </footer>
  </main>`;
}

function resultView(model, passage) {
  const item = quizProgress(model.id, passage.id);
  const correct = passage.questions.filter((question) => question.options.find((option) => option.id === item.answers?.[question.id])?.isCorrect).length;
  const unanswered = passage.questions.filter((question) => !item.answers?.[question.id]).length;
  const wrong = passage.questions.length - correct - unanswered;
  const percentage = Math.round((correct / passage.questions.length) * 100);
  return `<main class="quiz-shell">
    <header class="quiz-top">
      <button class="back-button" data-model>← قطع النموذج</button>
      <div><p>نتيجة الاختبار</p><h1>${escapeHtml(passage.title)} — ${escapeHtml(passage.englishTitle)}</h1><small>${escapeHtml(model.title)}</small></div>
      <strong>${correct} / ${passage.questions.length}</strong>
    </header>
    <section class="result-summary">
      <div><strong>${percentage}%</strong><span>النسبة</span></div>
      <div><strong>${correct}</strong><span>صحيح</span></div>
      <div><strong>${wrong}</strong><span>خطأ</span></div>
      <div><strong>${unanswered}</strong><span>غير مجاب</span></div>
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
          ${wasCorrect ? '<p class="answer-note correct-note">إجابتك صحيحة.</p>' : `<div class="answer-note wrong-note"><strong>الحل الصحيح: ${escapeHtml(question.correctAnswer)}</strong><p>${escapeHtml(question.explanation)}</p></div>`}
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
  if (state.view === 'model' && model) app.innerHTML = modelView(model);
  else if (state.view === 'quiz' && model && passage) app.innerHTML = quizView(model, passage);
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

app.addEventListener('click', (event) => {
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
    setQuizProgress(state.selectedModelId, state.selectedPassageId, { ...item, answers, status: 'in-progress', currentQuestionIndex: state.questionIndex });
    playTone(option?.isCorrect ? 'correct' : 'wrong');
    render();
    return;
  }

  if (event.target.closest('[data-next-question]')) {
    const item = quizProgress(state.selectedModelId, state.selectedPassageId);
    const passage = currentPassage();
    const question = passage.questions[state.questionIndex];
    if (!state.activeAnswers?.[question.id]) return;
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
