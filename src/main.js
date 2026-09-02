import './style.css';
import { readings } from './data/readings.js';
import { manualQuizModelsById } from './data/manualQuizzes.js';

const storageKey = 'step-reading-progress-v2';
const readStored = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

let progress = readStored(storageKey, {});
let state = { view: 'library', selectedModelId: null, selectedPassageId: null, query: '' };
const app = document.querySelector('#app');

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const normalizeArabic = (value = '') => String(value).toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ً-ْ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const modelNumber = (model) => String(model.order).padStart(2, '0');
const saveProgress = () => localStorage.setItem(storageKey, JSON.stringify(progress));
const quizKey = (modelId, passageId) => `${modelId}:${passageId}`;
const quizProgress = (modelId, passageId) => progress[quizKey(modelId, passageId)] ?? { answers: {}, status: 'not-started' };

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

function visibleModels() {
  if (!state.query) return models;
  const query = normalizeArabic(state.query);
  return models.filter((model) => normalizeArabic(`${modelNumber(model)} ${model.title} ${model.subtitle} ${model.passages.map((passage) => `${passage.title} ${passage.englishTitle}`).join(' ')}`).includes(query));
}

function displayedOptions(question) {
  const offset = question.number % question.options.length;
  return [...question.options.slice(offset), ...question.options.slice(0, offset)];
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
  const answered = Object.keys(item.answers ?? {}).length;
  return `<main class="quiz-shell">
    <header class="quiz-top">
      <button class="back-button" data-model>← قطع النموذج</button>
      <div><p>${escapeHtml(model.title)}</p><h1>${escapeHtml(passage.title)} — ${escapeHtml(passage.englishTitle)}</h1><small>${escapeHtml(passage.externalTitle)}</small></div>
      <strong>${answered} / ${passage.questions.length}</strong>
    </header>
    <section class="quiz-list">
      ${passage.questions.map((question) => `<article class="quiz-question">
        <h2><span>${question.number}</span>${escapeHtml(question.question)}</h2>
        <div class="quiz-options">
          ${displayedOptions(question).map((option) => `<button class="quiz-option ${item.answers?.[question.id] === option.id ? 'selected' : ''}" data-question="${question.id}" data-option="${option.id}">
            ${escapeHtml(option.text)}
          </button>`).join('')}
        </div>
      </article>`).join('')}
    </section>
    <footer class="quiz-actions">
      <button data-reset-quiz>إعادة الاختبار</button>
      <button class="primary-action" data-submit-quiz ${answered < passage.questions.length ? 'disabled' : ''}>إنهاء الاختبار</button>
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
        return `<article class="quiz-question">
          <h2><span>${question.number}</span>${escapeHtml(question.question)}</h2>
          <div class="quiz-options">
            ${displayedOptions(question).map((option) => `<div class="quiz-option ${option.isCorrect ? 'correct' : ''} ${selectedId === option.id && !option.isCorrect ? 'wrong' : ''}">
              ${escapeHtml(option.text)}
            </div>`).join('')}
          </div>
        </article>`;
      }).join('')}
    </section>
    <footer class="quiz-actions">
      <button data-reset-quiz>إعادة الاختبار</button>
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
    state = { ...state, view: 'quiz', selectedPassageId: passageButton.dataset.openPassage };
    const passage = currentPassage();
    setQuizProgress(state.selectedModelId, passage.id, { ...quizProgress(state.selectedModelId, passage.id), status: 'in-progress' });
    render();
    return;
  }

  const optionButton = event.target.closest('[data-option]');
  if (optionButton) {
    const item = quizProgress(state.selectedModelId, state.selectedPassageId);
    setQuizProgress(state.selectedModelId, state.selectedPassageId, { ...item, answers: { ...(item.answers ?? {}), [optionButton.dataset.question]: optionButton.dataset.option }, status: 'in-progress' });
    render();
    return;
  }

  if (event.target.closest('[data-submit-quiz]')) {
    setQuizProgress(state.selectedModelId, state.selectedPassageId, { ...quizProgress(state.selectedModelId, state.selectedPassageId), status: 'completed' });
    state.view = 'result';
    render();
    return;
  }

  if (event.target.closest('[data-reset-quiz]')) {
    setQuizProgress(state.selectedModelId, state.selectedPassageId, { answers: {}, status: 'not-started' });
    state.view = 'quiz';
    render();
    return;
  }

  if (event.target.closest('[data-model]')) {
    state.view = 'model';
    render();
    return;
  }

  if (event.target.closest('[data-library]')) {
    state = { ...state, view: 'library', selectedModelId: null, selectedPassageId: null };
    render();
  }
});

render();
