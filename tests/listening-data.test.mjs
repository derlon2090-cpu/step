import test from 'node:test';
import assert from 'node:assert/strict';
import { listeningModels } from '../src/data/listeningModels.js';

test('listening catalogue contains 24 available models, 258 recordings, and 517 source questions', () => {
  const recordings = listeningModels.flatMap((model) => model.recordings);
  const questions = recordings.flatMap((item) => item.questions);
  assert.equal(listeningModels.length, 24);
  assert.equal(recordings.length, 258);
  assert.equal(questions.length, 517);
  assert.equal(new Set(questions.map((question) => question.id)).size, 517);
});

test('uncertain listening answers and the missing source question remain explicit', () => {
  const questions = listeningModels.flatMap((model) => model.recordings.flatMap((item) => item.questions));
  assert.equal(questions.filter((question) => question.correctIndex === null).length, 247);
  assert.equal(questions.filter((question) => question.options.length === 0).length, 37);
  questions.filter((question) => question.correctIndex === null).forEach((question) => assert.ok(question.note));
});

test('listening models preserve the exact available question ranges without invented slots', () => {
  const expectedQuestionCounts = new Map([
    ['listening-12', 18],
    ['listening-14', 17],
    ['listening-15', 26],
  ]);
  listeningModels.filter((model) => model.order <= 15).forEach((model) => {
    const questions = model.recordings.flatMap((item) => item.questions);
    const expectedCount = expectedQuestionCounts.get(model.id) ?? 20;
    assert.deepEqual(questions.map((question) => question.number), Array.from({ length: expectedCount }, (_, index) => index + 1));
    questions.filter((question) => question.correctIndex !== null).forEach((question) => {
      assert.ok(question.correctIndex >= 0 && question.correctIndex < question.options.length);
      assert.equal(question.answerStatus, 'verified');
    });
  });
});

test('source-only answers are references rather than invented multiple-choice questions', () => {
  const sourceReferences = listeningModels.flatMap((model) => model.recordings.flatMap((item) => item.questions)).filter((question) => question.answerOnly);
  assert.equal(sourceReferences.length, 166);
  sourceReferences.forEach((question) => {
    assert.equal(question.options.length, 1);
    assert.equal(question.correctIndex, null);
    assert.ok(['source_reference', 'needs_review', 'expected'].includes(question.answerStatus));
    assert.ok(question.note);
  });
});

test('later descriptive models preserve source numbering and never create empty recordings', () => {
  const laterModels = listeningModels.filter((model) => model.order >= 16);
  laterModels.forEach((model) => model.recordings.forEach((item) => {
    assert.ok(item.title);
    assert.ok(item.questions.length > 0);
  }));
  const modelSixteen = laterModels.find((model) => model.order === 16);
  assert.deepEqual(modelSixteen.recordings[0].questions.map((question) => question.number), [19, 20]);
});

test('missing models and source questions stay absent while their original numbering is preserved', () => {
  assert.equal(listeningModels.some((model) => model.order === 21 || model.order === 22), false);
  const modelTwentyThree = listeningModels.find((model) => model.order === 23);
  assert.deepEqual(modelTwentyThree.recordings[0].questions.map((question) => question.number), [2, 3]);
});

test('new source-confidence statuses remain distinct and unscored', () => {
  const questions = listeningModels.flatMap((model) => model.recordings.flatMap((item) => item.questions));
  const expectedCounts = { needs_audio_review: 2, expected: 5, incomplete_source: 1 };
  Object.entries(expectedCounts).forEach(([status, count]) => {
    const matching = questions.filter((question) => question.answerStatus === status);
    assert.equal(matching.length, count);
    matching.forEach((question) => assert.equal(question.correctIndex, null));
  });
});

test('answers marked as audio-dependent remain in needs-review status', () => {
  const needsReview = listeningModels.flatMap((model) => model.recordings.flatMap((item) => item.questions)).filter((question) => question.answerStatus === 'needs_review');
  assert.ok(needsReview.length > 0);
  needsReview.forEach((question) => {
    assert.equal(question.correctIndex, null);
    assert.ok(question.note);
  });
});
