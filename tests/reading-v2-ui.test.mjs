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
  assert.match(mainSource, /data-toggle-answer-link=/);
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
