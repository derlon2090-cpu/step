import test from 'node:test';
import assert from 'node:assert/strict';
import { grammarModels } from '../src/data/grammarModels.js';

test('grammar catalogue contains 44 numbered models with first three ready', () => {
  assert.equal(grammarModels.length, 44);
  assert.deepEqual(grammarModels.slice(0, 3).map((model) => model.questions.length), [25, 40, 40]);
  assert.deepEqual(grammarModels.slice(0, 3).map((model) => model.order), [1, 2, 3]);
  assert.ok(grammarModels.slice(3).every((model) => model.status === 'coming-soon'));
});

test('visible grammar questions are renumbered sequentially from one', () => {
  grammarModels.slice(0, 3).forEach((model) => {
    assert.deepEqual(model.questions.map((question) => question.displayOrder), Array.from({ length: model.questions.length }, (_, index) => index + 1));
  });
});

test('source uncertainty is preserved for model three question 100', () => {
  const question = grammarModels[2].questions.find((candidate) => candidate.sourceNumber === 100);
  assert.equal(question.correctIndex, null);
});
