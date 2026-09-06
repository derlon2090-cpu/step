import assert from 'node:assert/strict';
import test from 'node:test';
import { manualQuizModels } from '../src/data/manualQuizzes.js';

const forbidden = new Set(['Not mentioned in the passage.', 'Another possibility.', 'None of these.']);
const questions = manualQuizModels.flatMap((model) => model.passages.flatMap((passage) => passage.questions.map((question) => ({ model, passage, question }))));

test('every scored reading question has four unique contextual options and one correct answer', () => {
  for (const { model, passage, question } of questions.filter((item) => item.question.correctAnswer !== null)) {
    const label = `${model.id}/${passage.id}/${question.id}`;
    assert.equal(question.options.length, 4, `${label} must have four options`);
    assert.equal(new Set(question.options.map((option) => option.text.trim().toLowerCase().replace(/[.!?]+$/g, ''))).size, 4, `${label} options must be unique`);
    assert.equal(question.options.filter((option) => option.isCorrect).length, 1, `${label} must have exactly one correct option`);
    assert.equal(question.options.find((option) => option.isCorrect)?.text, question.correctAnswer, `${label} correct option must match the answer key`);
    assert.equal(question.options.some((option) => forbidden.has(option.text)), false, `${label} must not use repeated placeholder choices`);
  }
});
