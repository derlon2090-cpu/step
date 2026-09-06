import test from 'node:test';
import assert from 'node:assert/strict';
import { listeningModels } from '../src/data/listeningModels.js';

test('listening catalogue contains four models, 34 recordings, and 80 question slots', () => {
  const recordings = listeningModels.flatMap((model) => model.recordings);
  const questions = recordings.flatMap((item) => item.questions);
  assert.equal(listeningModels.length, 4);
  assert.equal(recordings.length, 34);
  assert.equal(questions.length, 80);
  assert.equal(new Set(questions.map((question) => question.id)).size, 80);
});

test('uncertain listening answers and the missing source question remain explicit', () => {
  const questions = listeningModels.flatMap((model) => model.recordings.flatMap((item) => item.questions));
  assert.equal(questions.filter((question) => question.correctIndex === null).length, 10);
  const missing = questions.find((question) => question.options.length === 0);
  assert.equal(missing?.number, 6);
  assert.match(missing?.note ?? '', /يحتاج.*مراجعة/);
});
