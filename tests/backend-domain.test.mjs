import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAnswer, summarizeAttempt, publicExamQuestion } from '../server/domain/scoring.js';

const known = { id: 'q1', correctAnswer: 'A', excludeFromScoring: false };
const unknown = { id: 'q2', correctAnswer: null, excludeFromScoring: true };

test('unknown question is never scored', () => assert.equal(evaluateAnswer(unknown, 'A'), null));
test('wrong answer is false and correct answer is true', () => { assert.equal(evaluateAnswer(known, 'B'), false); assert.equal(evaluateAnswer(known, 'A'), true); });
test('attempt summary excludes unknown questions', () => {
  const result = summarizeAttempt([known, unknown], new Map([['q1', 'B'], ['q2', 'A']]));
  assert.deepEqual(result, { scoredQuestions: 1, correctCount: 0, wrongCount: 1, unscored: 1, scorePercent: 0 });
});
test('exam DTO never leaks correctAnswer', () => {
  const dto = publicExamQuestion({ id: 'q1', questionDisplay: 'Question', correctAnswer: 'A' }, [{ id: 'o1', optionOrder: 1, value: 'A' }]);
  assert.equal('correctAnswer' in dto, false); assert.equal(JSON.stringify(dto).includes('"A"'), true);
});

