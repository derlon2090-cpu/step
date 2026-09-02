const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);

export function calculateResult({ passage, answers, elapsedSeconds }) {
  if (!passage || !Array.isArray(passage.questions) || !passage.questions.length) throw new Error('لا يمكن حساب نتيجة بدون أسئلة القطعة الأصلية.');

  const questions = passage.questions;
  const normalizedAnswers = answers ?? {};
  const correct = questions.filter((question) => normalizedAnswers[question.id] === question.correctAnswer).length;
  const unanswered = questions.filter((question) => normalizedAnswers[question.id] === undefined || normalizedAnswers[question.id] === null).length;
  const incorrect = questions.length - correct - unanswered;
  const percentage = Math.round((correct / questions.length) * 100);

  const performance = percentage >= 90
    ? { label: 'ممتاز', tone: 'success', suggestion: 'أداء ممتاز. انتقل إلى القطعة التالية وحافظ على نفس الأسلوب.' }
    : percentage >= 75
      ? { label: 'جيد جدًا', tone: 'success', suggestion: 'راجع الإجابات غير الصحيحة سريعًا ثم انتقل إلى القطعة التالية.' }
      : percentage >= 50
        ? { label: 'جيد', tone: 'warning', suggestion: 'راجع الأخطاء ومفردات القطعة ثم أعد المحاولة.' }
        : { label: 'يحتاج تحسين', tone: 'danger', suggestion: 'اقرأ النص والترجمة والمفردات أولًا، ثم أعد المحاولة.' };

  return { passage, total: questions.length, correct, incorrect, unanswered, percentage, elapsedSeconds, performance };
}

const formatTime = (seconds = 0) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export function renderResult(result) {
  const title = result.passage.arabicTitle ?? `القطعة ${String(result.passage.order).padStart(2, '0')}`;
  return `<section class="result-screen" aria-label="نتيجة القطعة">
    <header><p>نتيجة القطعة ${String(result.passage.order).padStart(2, '0')}</p><h2>${escapeHtml(title)}</h2></header>
    <div class="score-card ${result.performance.tone}"><strong>${result.correct} / ${result.total}</strong><span>${result.percentage}%</span><em>${result.performance.label}</em></div>
    <div class="result-metrics"><div><strong>${result.correct}</strong><span>إجابات صحيحة</span></div><div><strong>${result.incorrect}</strong><span>إجابات خاطئة</span></div><div><strong>${result.unanswered}</strong><span>غير مجابة</span></div><div><strong>${formatTime(result.elapsedSeconds)}</strong><span>الوقت المستغرق</span></div></div>
    <section class="improvement"><h3>اقتراحات للتحسين</h3><p>${result.performance.suggestion}</p></section>
    <footer><button data-result-action="retry" class="primary">معاودة الاختبار</button><button data-result-action="review">مراجعة الإجابات</button><button data-result-action="next">القطعة التالية</button><button data-result-action="list">قائمة القطع</button></footer>
  </section>`;
}

export function resetAttempt() {
  return { answers: {}, elapsedSeconds: 0, currentQuestionIndex: 0 };
}
