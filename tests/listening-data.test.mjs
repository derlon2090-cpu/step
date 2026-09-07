import test from 'node:test';
import assert from 'node:assert/strict';
import { listeningModels } from '../src/data/listeningModels.js';

test('listening catalogue contains twenty models, 198 recordings, and 403 source questions', () => {
  const recordings = listeningModels.flatMap((model) => model.recordings);
  const questions = recordings.flatMap((item) => item.questions);
  assert.equal(listeningModels.length, 20);
  assert.equal(recordings.length, 198);
  assert.equal(questions.length, 403);
  assert.equal(new Set(questions.map((question) => question.id)).size, 403);
});

test('uncertain listening answers and the missing source question remain explicit', () => {
  const questions = listeningModels.flatMap((model) => model.recordings.flatMap((item) => item.questions));
  assert.equal(questions.filter((question) => question.correctIndex === null).length, 163);
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
  assert.equal(sourceReferences.length, 85);
  sourceReferences.forEach((question) => {
    assert.equal(question.options.length, 1);
    assert.equal(question.correctIndex, null);
    assert.equal(question.answerStatus, 'source_reference');
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

test('answers marked as audio-dependent remain in needs-review status', () => {
  const needsReview = listeningModels.flatMap((model) => model.recordings.flatMap((item) => item.questions)).filter((question) => question.answerStatus === 'needs_review');
  assert.ok(needsReview.length > 0);
  needsReview.forEach((question) => {
    assert.equal(question.correctIndex, null);
    assert.ok(question.note);
  });
});
