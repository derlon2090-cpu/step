import test from 'node:test';
import assert from 'node:assert/strict';
import { listeningModels } from '../src/data/listeningModels.js';

test('listening catalogue contains ten models, 99 recordings, and 200 question slots', () => {
  const recordings = listeningModels.flatMap((model) => model.recordings);
  const questions = recordings.flatMap((item) => item.questions);
  assert.equal(listeningModels.length, 10);
  assert.equal(recordings.length, 99);
  assert.equal(questions.length, 200);
  assert.equal(new Set(questions.map((question) => question.id)).size, 200);
});

test('uncertain listening answers and the missing source question remain explicit', () => {
  const questions = listeningModels.flatMap((model) => model.recordings.flatMap((item) => item.questions));
  assert.equal(questions.filter((question) => question.correctIndex === null).length, 25);
  assert.equal(questions.filter((question) => question.options.length === 0).length, 6);
  questions.filter((question) => question.correctIndex === null).forEach((question) => assert.ok(question.note));
});

test('every listening model keeps a complete ordered 1–20 question sequence', () => {
  listeningModels.forEach((model) => {
    const questions = model.recordings.flatMap((item) => item.questions);
    assert.deepEqual(questions.map((question) => question.number), Array.from({ length: 20 }, (_, index) => index + 1));
    questions.filter((question) => question.correctIndex !== null).forEach((question) => {
      assert.ok(question.correctIndex >= 0 && question.correctIndex < question.options.length);
    });
  });
});
