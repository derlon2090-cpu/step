import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const cssSource = await readFile(new URL('../src/raseen.css', import.meta.url), 'utf8');
const readingStateSource = mainSource.slice(mainSource.indexOf('function readingModelState('), mainSource.indexOf('function displayedOptions('));
const grammarLibrarySource = mainSource.slice(mainSource.indexOf('function grammarLibraryView('), mainSource.indexOf('function grammarQuestionView('));

test('reading model is complete only when every passage is complete', () => {
  assert.match(readingStateSource, /model\.passages\.every/);
  assert.match(readingStateSource, /quizProgress\(model\.id, passage\.id\)\.status === 'completed'/);
  assert.match(readingStateSource, /label: 'تم الحل بالكامل'/);
  assert.match(readingStateSource, /label: 'لم يتم الحل'/);
  assert.match(readingStateSource, /label: 'غير متاح'/);
});

test('grammar catalogue distinguishes solved, unsolved, and unavailable models', () => {
  assert.match(grammarLibrarySource, /done \? 'تم الحل' : 'لم يتم الحل'/);
  assert.match(grammarLibrarySource, /model\.status !== 'available' \? 'غير متاح'/);
  assert.match(cssSource, /\.grammar-model-status\.status-completed/);
  assert.match(cssSource, /\.grammar-model-status\.status-incomplete/);
  assert.match(cssSource, /\.grammar-model-status\.status-unavailable/);
});

test('model status colors use green, red, and neutral palettes', () => {
  assert.match(cssSource, /status-completed\{border:1px solid #ABEFC6;background:#ECFDF3;color:#067647/);
  assert.match(cssSource, /status-incomplete\{border:1px solid #FECDCA;background:#FEF3F2;color:#B42318/);
  assert.match(cssSource, /status-unavailable\{border:1px solid #EAECF0;background:#F2F4F7;color:#667085/);
});
