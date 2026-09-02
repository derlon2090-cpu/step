import './style.css';
import { readings, readingsById } from './data/readings.js';

const storageKey = 'step-reading-progress-v1';
const settingKey = 'step-reading-settings-v1';
const readStored = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
let progress = readStored(storageKey, {});
let settings = { mode: 'normal', soundEnabled: true, ...readStored(settingKey, {}) };
let state = { selectedId: null, tab: 'content', query: '', filter: 'all', sourceBlock: 0 };

const saveProgress = () => localStorage.setItem(storageKey, JSON.stringify(progress));
const saveSettings = () => localStorage.setItem(settingKey, JSON.stringify(settings));
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const normalizeArabic = (value = '') => String(value).toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ً-ْ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const readingNumber = (reading) => String(reading.order).padStart(2, '0');
const progressFor = (id) => progress[id] ?? { status: 'not-started' };
const statusLabel = (status) => ({ 'not-started': 'لم تبدأ', 'in-progress': 'قيد الحل', completed: 'مكتملة' })[status] ?? 'لم تبدأ';
const app = document.querySelector('#app');

function setProgress(id, update) { progress[id] = { ...progressFor(id), ...update }; saveProgress(); }

function matches(reading) {
  if (!state.query) return true;
  const query = normalizeArabic(state.query);
  const numberMatch = query.match(/^(?:reading\s*)?0*(\d{1,2})$/);
  if (numberMatch) return reading.order === Number(numberMatch[1]);
  const compact = query.replace(/\s/g, '');
  return [reading.id, String(reading.order), readingNumber(reading), reading.arabicTitle, ...reading.internalSections, reading.content.slice(0, 18000)].some((candidate) => {
    const normalized = normalizeArabic(candidate);
    return normalized.includes(query) || normalized.replace(/\s/g, '').includes(compact);
  });
}

function card(reading) {
  const itemProgress = progressFor(reading.id);
  const meta = reading.verifiedQuestionCount ? `${reading.verifiedQuestionCount} سؤالًا متاحًا` : 'لا توجد أسئلة مؤكدة للعرض';
  return `<button class="reading-card" data-open="${reading.id}"><span class="reading-number">${readingNumber(reading)}</span><span class="reading-title">${escapeHtml(reading.arabicTitle)}</span><span class="reading-meta">${meta}</span><span class="reading-status ${itemProgress.status}">${statusLabel(itemProgress.status)}</span></button>`;
}

function libraryView() {
  const visible = readings.filter((reading) => matches(reading) && (state.filter === 'all' || progressFor(reading.id).status === state.filter));
  const completed = readings.filter((reading) => progressFor(reading.id).status === 'completed').length;
  return `<main class="app-shell"><section class="hero"><p class="eyebrow">STEP</p><h1>STEP Reading</h1><p>استعرض نماذج القراءة الأصلية بالترتيب، واحفظ تقدمك داخل كل نموذج.</p></section><section class="toolbar" aria-label="أدوات القراءة"><label class="search"><span>⌕</span><input id="search" value="${escapeHtml(state.query)}" placeholder="ابحث برقم القطعة أو اسمها" /></label><div class="mode-switch" role="group" aria-label="وضع القراءة">${['normal', 'practice', 'exam'].map((mode) => `<button class="${settings.mode === mode ? 'selected' : ''}" data-mode="${mode}">${({ normal: 'العادي', practice: 'التدريب', exam: 'الاختبار' })[mode]}</button>`).join('')}</div><select id="status-filter" aria-label="فلتر الحالة"><option value="all">كل الحالات</option><option value="not-started">لم تبدأ</option><option value="in-progress">قيد الحل</option><option value="completed">مكتملة</option></select><button class="sound-button" id="sound-toggle">${settings.soundEnabled ? '🔊 الصوت' : '🔇 مكتوم'}</button><span class="completion">${completed} / ${readings.length} مكتملة</span></section><section class="reading-grid">${visible.length ? visible.map(card).join('') : '<div class="empty-state"><h2>لم نجد قطعة مطابقة</h2><button id="clear-search">مسح البحث</button></div>'}</section></main>`;
}

function sourceBlock(block) { return `<article class="source-block"><header>صفحة المصدر ${block.page ?? block.sourcePage}</header><div dir="auto">${escapeHtml(block.text ?? block.content)}</div></article>`; }

function questionView(question, selectedAnswer) {
  const selection = selectedAnswer ? `<p class="selection-note">اختيارك محفوظ: ${escapeHtml(selectedAnswer)}</p>` : '';
  if (question.visualVerificationStatus !== 'verified') return '';
  return `<article class="question-card"><p class="question-status">لا يتوفر مفتاح إجابة موثوق حاليًا.</p><h2 dir="auto">${escapeHtml(question.questionText)}</h2>${question.options.length ? `<div class="options">${question.options.map((option) => `<button class="option ${selectedAnswer === option.selectionId ? 'selected' : ''}" data-answer="${escapeHtml(option.selectionId)}" data-question="${question.id}">${option.label ? `<b>${escapeHtml(option.label)}</b>` : ''}<span dir="auto">${escapeHtml(option.text)}</span></button>`).join('')}</div>` : ''}${selection}</article>`;
}

function readerView(reading) {
  const itemProgress = progressFor(reading.id);
  const isQuestionTab = state.tab === 'questions';
  const verifiedQuestions = reading.questions.filter((question) => question.visualVerificationStatus === 'verified');
  const entries = isQuestionTab ? verifiedQuestions : reading.contentBlocks;
  const current = entries[Math.min(state.sourceBlock, Math.max(0, entries.length - 1))];
  const modeNote = settings.mode === 'exam' ? 'لا يبدأ المؤقت إلا للأسئلة التي اكتملت مراجعة خياراتها. لا يتوفر تقييم للإجابات حاليًا.' : settings.mode === 'practice' ? 'يمكن حفظ الاختيار للأسئلة التي تم التحقق من خياراتها، من دون تصحيح أو صوت تقييم.' : 'المحتوى معروض كما حفظ من المصدر، دون إعادة صياغة أو تقييم للإجابات.';
  const questionContent = current ? questionView(current, itemProgress.answers?.[current.id]) : '<div class="empty-state"><h2>الأسئلة المؤكدة غير متوفرة لهذه القطعة حاليًا</h2><p>المحتوى الأصلي محفوظ، لكنه لا يعرض للطالب قبل اكتمال مراجعة الحدود والخيارات.</p></div>';
  return `<main class="reader-shell"><header class="reader-top"><button class="back-button" data-back>← قائمة القطع</button><div><p>القطعة ${readingNumber(reading)}</p><h1>${escapeHtml(reading.arabicTitle)}</h1><small>${reading.sourcePages.length} صفحات مصدر · ${statusLabel(itemProgress.status)}</small></div><button class="sound-button" id="sound-toggle">${settings.soundEnabled ? '🔊 الصوت' : '🔇 مكتوم'}</button></header><div class="reader-layout"><aside class="reader-navigation"><h2>الأقسام داخل النموذج</h2><ol>${reading.internalSections.map((section) => `<li>${escapeHtml(section)}</li>`).join('')}</ol><button data-next-reading>${reading.order === 49 ? 'القطعة الأولى ←' : 'القطعة التالية ←'}</button></aside><section class="reader-content"><div class="tabs"><button data-tab="content" class="${state.tab === 'content' ? 'active' : ''}">القطعة</button><button data-tab="questions" class="${isQuestionTab ? 'active' : ''}">الأسئلة${verifiedQuestions.length ? ` (${verifiedQuestions.length})` : ''}</button></div><p class="mode-note">${modeNote}</p>${isQuestionTab ? `<div class="source-intro"><strong>الأسئلة المتاحة</strong><p>يعرض الطالب فقط ${verifiedQuestions.length} سؤالًا ثبتت حدودها وخياراتها. المرشحات الأخرى محفوظة داخليًا للمراجعة ولا تظهر هنا. لا يوجد مفتاح إجابة.</p></div>${questionContent}` : (current ? sourceBlock(current) : '<div class="empty-state"><h2>لا توجد كتلة مصدر متاحة</h2></div>')}${entries.length ? `<footer class="block-navigation"><button data-block="previous" ${state.sourceBlock === 0 ? 'disabled' : ''}>السابق</button><span>${isQuestionTab ? `السؤال ${state.sourceBlock + 1} من ${entries.length}` : `${state.sourceBlock + 1} / ${entries.length}`}</span><button data-block="next" ${state.sourceBlock >= entries.length - 1 ? 'disabled' : ''}>التالي</button></footer>` : ''}</section></div></main>`;
}

function render() { app.innerHTML = state.selectedId ? readerView(readingsById.get(state.selectedId)) : libraryView(); const filter = document.querySelector('#status-filter'); if (filter) filter.value = state.filter; }
let debounce;
app.addEventListener('input', (event) => { if (event.target.id === 'search') { clearTimeout(debounce); debounce = setTimeout(() => { state.query = event.target.value; render(); }, 250); } });
app.addEventListener('change', (event) => { if (event.target.id === 'status-filter') { state.filter = event.target.value; render(); } });
app.addEventListener('click', (event) => {
  const opener = event.target.closest('[data-open]'); if (opener) { state.selectedId = opener.dataset.open; state.tab = 'content'; state.sourceBlock = 0; setProgress(state.selectedId, { status: 'in-progress', answers: progressFor(state.selectedId).answers ?? {} }); render(); return; }
  const mode = event.target.closest('[data-mode]'); if (mode) { settings.mode = mode.dataset.mode; saveSettings(); render(); return; }
  if (event.target.closest('#sound-toggle')) { settings.soundEnabled = !settings.soundEnabled; saveSettings(); render(); return; }
  if (event.target.closest('[data-back]')) { state.selectedId = null; render(); return; }
  const tab = event.target.closest('[data-tab]'); if (tab) { state.tab = tab.dataset.tab; state.sourceBlock = 0; render(); return; }
  const answer = event.target.closest('[data-answer]'); if (answer) { const current = progressFor(state.selectedId); setProgress(state.selectedId, { answers: { ...(current.answers ?? {}), [answer.dataset.question]: answer.dataset.answer } }); render(); return; }
  const block = event.target.closest('[data-block]'); if (block) { const reading = readingsById.get(state.selectedId); const max = (state.tab === 'questions' ? reading.questions.filter((question) => question.visualVerificationStatus === 'verified') : reading.contentBlocks).length - 1; state.sourceBlock = Math.max(0, Math.min(max, state.sourceBlock + (block.dataset.block === 'next' ? 1 : -1))); render(); return; }
  if (event.target.closest('[data-next-reading]')) { const reading = readingsById.get(state.selectedId); state.selectedId = readings[reading.order % readings.length].id; state.tab = 'content'; state.sourceBlock = 0; setProgress(state.selectedId, { status: 'in-progress' }); render(); return; }
  if (event.target.closest('#clear-search')) { state.query = ''; render(); }
});

render();
