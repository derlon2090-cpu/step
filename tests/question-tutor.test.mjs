import test from 'node:test';
import assert from 'node:assert/strict';
import { chatWithQuestionTutor } from '../server/services/ai/questionTutor.js';

const input = (overrides = {}) => ({
  questionId: 'q-1',
  question: 'If I ___ you, I would study.',
  options: [{ id: 'a', text: 'am' }, { id: 'b', text: 'were' }],
  message: 'أعطني تلميحًا',
  action: 'hint',
  isAnswered: false,
  selectedOptionId: null,
  selectedOptionText: null,
  correctAnswer: null,
  humanNote: null,
  history: [],
  ...overrides,
});

test('question tutor does not reveal the answer before an answer is submitted', async () => {
  const response = await chatWithQuestionTutor(input({ correctAnswer: 'were' }));
  assert.match(response.content, /لن أكشف|استبعد|الكلمة المفتاحية|الدليل/);
  assert.doesNotMatch(response.content, /were/);
});

test('question tutor can explain a verified wrong answer after submission', async () => {
  const response = await chatWithQuestionTutor(input({ action: 'why_wrong', message: 'لماذا إجابتي خطأ؟', isAnswered: true, selectedOptionId: 'a', selectedOptionText: 'am', correctAnswer: 'were', humanNote: 'شرط غير حقيقي' }));
  assert.match(response.content, /am/);
  assert.match(response.content, /were/);
});
