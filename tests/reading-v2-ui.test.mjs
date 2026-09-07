import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../src/raseen.css', import.meta.url), 'utf8');
const reviewCssSource = readFileSync(new URL('../src/reading-v2-review.css', import.meta.url), 'utf8');

test('reading dashboard uses the redesigned library, passage, and split-question surfaces', () => {
  assert.match(mainSource, /class="reading-v2-hero"/);
  assert.match(mainSource, /class="reading-v2-model-summary"/);
  assert.match(mainSource, /class="reading-v2-passage-grid"/);
  assert.match(mainSource, /class="reading-v2-quiz-layout"/);
  assert.match(mainSource, /class="passage-reading reading-v2-passage-panel"/);
  assert.match(mainSource, /class="solutions-shell reading-v2-shell reading-v2-solutions-shell"/);
  assert.match(mainSource, /class="quiz-shell reading-v2-shell reading-v2-result-shell"/);
  assert.match(cssSource, /\.reading-v2-quiz-layout\{display:grid;grid-template-columns:/);
  assert.match(reviewCssSource, /\.reading-v2-solutions-list\{display:grid;grid-template-columns:/);
  assert.match(reviewCssSource, /\.reading-v2-shell>\.dashboard-header\{margin-inline:calc\(50% - 50vw\)\}/);
  assert.match(reviewCssSource, /html,body\{overflow-x:clip\}/);
});

test('reading visuals are project assets and all existing question tools remain available', () => {
  assert.equal(existsSync(new URL('../public/assets/reading-library-books.jpg', import.meta.url)), true);
  assert.equal(existsSync(new URL('../public/assets/reading-passage-landscape.jpg', import.meta.url)), true);
  assert.match(mainSource, /answer_link: 'ربط الإجابة'/);
  assert.match(mainSource, /data-toggle-translation=/);
  assert.match(mainSource, /data-tutor-toggle=/);
  assert.match(mainSource, /data-reset-quiz/);
  assert.match(mainSource, /data-restore-progress/);
});

test('reading redesign includes responsive desktop, tablet, and phone layouts', () => {
  assert.match(cssSource, /@media\(max-width:1180px\)/);
  assert.match(cssSource, /@media\(max-width:900px\)/);
  assert.match(cssSource, /@media\(max-width:600px\)/);
});

test('desktop reading session keeps the page chrome and question actions inside the viewport', () => {
  const quizStart = mainSource.indexOf('function quizView');
  const quizEnd = mainSource.indexOf('function resultView');
  const quizSource = mainSource.slice(quizStart, quizEnd);

  assert.match(quizSource, /class="reading-v2-question-scroll"/);
  assert.match(
    quizSource,
    /class="reading-v2-question-scroll"[\s\S]*class="quiz-actions reading-v2-quiz-actions"[\s\S]*<\/footer>\s*<\/article>/,
  );
  assert.match(reviewCssSource, /html:has\(\.reading-v2-quiz-shell\),body:has\(\.reading-v2-quiz-shell\)\{height:100%;overflow:hidden\}/);
  assert.match(reviewCssSource, /\.reading-v2-quiz-shell\{[^}]*height:100dvh;[^}]*grid-template-rows:[^}]*minmax\(0,1fr\)/);
  assert.match(reviewCssSource, /grid-template-areas:"question passage"/);
  assert.match(reviewCssSource, /\.reading-v2-question-scroll\{[^}]*overflow-y:auto/);
  assert.match(reviewCssSource, /\.reading-v2-passage-panel>div\{[^}]*overflow-y:auto/);
  assert.match(reviewCssSource, /\.reading-v2-question-panel\{border:0!important;background:transparent!important;box-shadow:none!important\}/);
});

test('short desktop viewports compact the session while smaller screens retain natural page scrolling', () => {
  assert.match(reviewCssSource, /@media\(min-width:1100px\) and \(max-height:800px\)/);
  assert.match(reviewCssSource, /@media\(max-width:1099px\)\{[\s\S]*\.reading-v2-question-scroll\{overflow:visible\}/);
  assert.match(reviewCssSource, /@media\(max-width:1099px\)\{[\s\S]*\.reading-v2-question-panel>\.reading-v2-quiz-actions\{position:static;height:auto/);
});

test('reading always opens at the top with normal mode and offers a timed exam mode', () => {
  assert.match(mainSource, /readingMode: 'normal'/);
  assert.match(mainSource, /data-reading-mode="normal"/);
  assert.match(mainSource, /data-reading-mode="exam"/);
  assert.match(mainSource, /const READING_QUESTION_TIME_SECONDS = 60/);
  assert.match(mainSource, /window\.scrollTo\(0, 0\)/);
  assert.match(mainSource, /if \(seconds === 0\) \{[\s\S]*handleReadingTimeExpired\(question\.id\)/);
  assert.match(mainSource, /state\.questionIndex = nextIndex;[\s\S]*resetReadingQuestionClock\(\)/);
  assert.match(reviewCssSource, /\.reading-v2-timer\.is-urgent/);
});
