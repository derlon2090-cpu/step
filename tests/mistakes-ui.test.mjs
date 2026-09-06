import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const quizSource = mainSource.slice(mainSource.indexOf('function quizView('), mainSource.indexOf('function resultView('));

test('reading quiz renders its question prompt once', () => {
  assert.equal(quizSource.match(/renderQuestionText\(question\)/g)?.length, 1);
});

test('result and quiz surfaces expose section-specific mistake review', () => {
  assert.match(mainSource, /data-open-mistakes="reading"/);
  assert.match(mainSource, /data-open-mistakes="grammar"/);
  assert.match(mainSource, /view: 'mistake-question'/);
});

test('correct answers do not automatically remove saved mistakes', () => {
  assert.doesNotMatch(mainSource, /correctReviews\s*=\s*Number\(previous\.correctReviews/);
  assert.match(mainSource, /removeLocalMistake\(mistake\)/);
});
