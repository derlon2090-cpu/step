import test from 'node:test';
import assert from 'node:assert/strict';
import { grammarModels } from '../src/data/grammarModels.js';

test('grammar catalogue contains 44 numbered models with first five ready', () => {
  assert.equal(grammarModels.length, 44);
  assert.deepEqual(grammarModels.slice(0, 5).map((model) => model.questions.length), [25, 40, 40, 37, 40]);
  assert.deepEqual(grammarModels.slice(0, 5).map((model) => model.order), [1, 2, 3, 4, 5]);
  assert.ok(grammarModels.slice(5).every((model) => model.status === 'coming-soon'));
});

test('visible grammar questions are renumbered sequentially from one', () => {
  grammarModels.slice(0, 5).forEach((model) => {
    assert.deepEqual(model.questions.map((question) => question.displayOrder), Array.from({ length: model.questions.length }, (_, index) => index + 1));
  });
});

test('models four and five preserve source numbering and valid answers', () => {
  assert.deepEqual(grammarModels[3].questions.map((question) => question.sourceNumber).sort((a, b) => a - b), [
    ...Array.from({ length: 20 }, (_, index) => index + 61),
    ...Array.from({ length: 16 }, (_, index) => index + 82),
    100
  ]);
  grammarModels.slice(3, 5).flatMap((model) => model.questions).forEach((question) => {
    assert.ok(question.correctIndex >= 0 && question.correctIndex < question.options.length);
    assert.ok(question.sourceNote);
  });
});

test('source uncertainty is preserved for model three question 100', () => {
  const question = grammarModels[2].questions.find((candidate) => candidate.sourceNumber === 100);
  assert.equal(question.correctIndex, null);
});
