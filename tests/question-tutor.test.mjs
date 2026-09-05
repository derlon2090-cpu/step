import test from 'node:test';
import assert from 'node:assert/strict';
import { chatWithQuestionTutor, deepseekCheck } from '../server/services/ai/questionTutor.js';

const input = (overrides = {}) => ({
  questionId: 'grammar-01-q02',
  sessionId: 'grammar-01:grammar:grammar-01-q02',
  message: 'أعطني تلميحًا',
  action: 'hint',
  selectedOptionId: null,
  history: [],
  ...overrides,
});

const originalFetch = globalThis.fetch;
const originalKey = process.env.DEEPSEEK_API_KEY;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.DEEPSEEK_API_KEY;
  else process.env.DEEPSEEK_API_KEY = originalKey;
});

test('question tutor fails clearly when DeepSeek is not configured', async () => {
  delete process.env.DEEPSEEK_API_KEY;
  await assert.rejects(() => chatWithQuestionTutor(input()), (error) => error.code === 'AI_NOT_CONFIGURED' && error.status === 503);
});

test('question tutor sends the current question context to DeepSeek without exposing the answer before submission', async () => {
  process.env.DEEPSEEK_API_KEY = 'test-key';
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: 'ركّز على صيغة المقارنة في الجملة.' } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const response = await chatWithQuestionTutor(input({ history: [{ role: 'user', content: 'ما القاعدة؟' }] }));
  const prompt = JSON.parse(requestBody.messages.at(-1).content);
  assert.equal(response.provider, 'deepseek');
  assert.equal(response.model, 'deepseek-v4-flash');
  assert.deepEqual(requestBody.thinking, { type: 'disabled' });
  assert.equal(requestBody.max_tokens, 300);
  assert.equal('temperature' in requestBody, false);
  assert.equal(prompt.question, 'Russia is ...... than Canada.');
  assert.equal(prompt.correctAnswer, null);
  assert.equal(prompt.selectedOption, null);
  assert.equal(requestBody.messages.at(-2).content, 'ما القاعدة؟');
});

test('question tutor receives the answer key only after a valid option is selected', async () => {
  process.env.DEEPSEEK_API_KEY = 'test-key';
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: 'اختيارك صحيح لأن صيغة المقارنة هنا هي المطلوبة.' } }] }), { status: 200 });
  };
  await chatWithQuestionTutor(input({ action: 'why_correct', message: 'لماذا هذه الإجابة صحيحة؟', selectedOptionId: 'grammar-01-q02-o0' }));
  const prompt = JSON.parse(requestBody.messages.at(-1).content);
  assert.equal(prompt.selectedOption, 'bigger');
  assert.equal(prompt.correctAnswer, 'bigger');
});

test('a new question cannot reuse another question session', async () => {
  process.env.DEEPSEEK_API_KEY = 'test-key';
  await assert.rejects(() => chatWithQuestionTutor(input({ questionId: 'grammar-01-q03', sessionId: 'grammar-01:grammar:grammar-01-q02' })), (error) => error.code === 'TUTOR_SESSION_MISMATCH');
});

test('deepseek check sends a minimal non-thinking request and reports success safely', async () => {
  process.env.DEEPSEEK_API_KEY = 'test-key';
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 });
  };
  const result = await deepseekCheck({ requestId: 'check-success' });
  assert.equal(result.ok, true);
  assert.equal(result.provider, 'deepseek');
  assert.equal(result.status, 200);
  assert.equal(result.receivedContent, true);
  assert.deepEqual(requestBody.thinking, { type: 'disabled' });
  assert.equal(requestBody.max_tokens, 30);
  assert.deepEqual(requestBody.messages, [{ role: 'user', content: 'Reply with only: OK' }]);
  assert.equal(JSON.stringify(result).includes('test-key'), false);
});

test('deepseek check preserves provider HTTP errors without exposing secrets', async () => {
  process.env.DEEPSEEK_API_KEY = 'test-key';
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'invalid_api_key', message: 'Invalid key' } }), { status: 401 });
  const result = await deepseekCheck({ requestId: 'check-failure' });
  assert.equal(result.ok, false);
  assert.equal(result.stage, 'deepseek');
  assert.equal(result.status, 401);
  assert.equal(result.code, 'invalid_api_key');
  assert.equal(JSON.stringify(result).includes('test-key'), false);
});
