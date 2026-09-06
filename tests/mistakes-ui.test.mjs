import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const cssSource = await readFile(new URL('../src/raseen.css', import.meta.url), 'utf8');
const quizSource = mainSource.slice(mainSource.indexOf('function quizView('), mainSource.indexOf('function resultView('));
const readingResultSource = mainSource.slice(mainSource.indexOf('function resultView('), mainSource.indexOf('function currentModel('));
const grammarConfirmationSource = mainSource.slice(mainSource.indexOf('function confirmGrammarAnswer('), mainSource.indexOf('function libraryView('));
const grammarRetrySource = mainSource.slice(mainSource.indexOf("if (event.target.closest('[data-grammar-retry]'))"), mainSource.indexOf("if (event.target.closest('[data-dashboard]'))"));
const readingRetrySource = mainSource.slice(mainSource.indexOf("if (event.target.closest('[data-reset-quiz]'))"), mainSource.indexOf("if (event.target.closest('[data-restore-progress]'))"));

test('reading quiz renders its question prompt once', () => {
  assert.equal(quizSource.match(/renderQuestionText\(question\)/g)?.length, 1);
});

test('reading question and result surfaces do not expose mistake review actions', () => {
  assert.doesNotMatch(quizSource, /data-open-mistakes="reading"|مراجعة أخطاء القراءة/);
  assert.doesNotMatch(readingResultSource, /data-open-mistakes="reading"|مراجعة أخطاء القراءة/);
  assert.match(mainSource, /data-open-mistakes="grammar"/);
  assert.match(mainSource, /view: 'mistake-question'/);
});

test('reading questions expose only the professional retry and restore session actions', () => {
  assert.match(quizSource, /class="quiz-session-actions"/);
  assert.match(quizSource, /data-reset-quiz>إعادة الاختبار/);
  assert.match(quizSource, /data-restore-progress/);
  assert.match(cssSource, /\.quiz-session-actions\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test('correct answers do not automatically remove saved mistakes', () => {
  assert.doesNotMatch(mainSource, /correctReviews\s*=\s*Number\(previous\.correctReviews/);
  assert.match(mainSource, /removeLocalMistake\(mistake\)/);
});

test('retry clears attempt answers but explicitly preserves saved mistakes', () => {
  assert.match(grammarRetrySource, /mistakes: \{ \.\.\.\(saved\.mistakes \?\? \{\}\) \}/);
  assert.match(readingRetrySource, /mistakes: \[\.\.\.\(saved\.mistakes \?\? \[\]\)\]/);
  assert.match(grammarRetrySource, /attemptId: null/);
  assert.match(readingRetrySource, /attemptId: null/);
});

test('grammar feedback is immediate while persistence runs in the background', () => {
  assert.match(grammarConfirmationSource, /^function confirmGrammarAnswer/);
  assert.ok(
    grammarConfirmationSource.indexOf('render();') <
      grammarConfirmationSource.indexOf('grammarAnswerQueue = grammarAnswerQueue.then'),
    'the confirmed state must render before the background persistence queue starts'
  );
});

test('word translation targets the exact clicked occurrence', () => {
  assert.match(mainSource, /data-word-index=/);
  assert.match(mainSource, /index: Number\(wordButton\.dataset\.wordIndex\)/);
});

test('question actions stay anchored below the question instead of following viewport scroll', () => {
  assert.match(quizSource, /<main class="quiz-shell quiz-active-shell">/);
  assert.match(cssSource, /\.quiz-active-shell>\.quiz-actions,\.grammar-quiz-actions\{position:static;right:auto;bottom:auto;left:auto;width:100%;margin-top:12px/);
  assert.match(cssSource, /padding:8px 0 10px;transform:none;border:0;border-radius:0;background:transparent;box-shadow:none;backdrop-filter:none/);
  assert.match(cssSource, /@media\(min-width:701px\) and \(max-width:1024px\)/);
  assert.match(cssSource, /@media\(max-width:700px\)/);
});
