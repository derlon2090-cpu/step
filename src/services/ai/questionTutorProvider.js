/**
 * @typedef {Object} QuestionTutorInput
 * @property {string} questionId
 * @property {string} sessionId
 * @property {string} message
 * @property {string} action
 * @property {string|null} selectedOptionId
 * @property {{role: 'user'|'assistant', content: string}[]} history
 */

export class QuestionTutorProvider {
  /** @param {QuestionTutorInput} _input */
  async chat(_input) {
    throw new Error('QuestionTutorProvider.chat must be implemented');
  }
}

const apiBaseUrl = String(import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');
if (import.meta.env.PROD && !apiBaseUrl) throw new Error('VITE_API_URL_MISSING');
const questionTutorEndpoint = apiBaseUrl ? `${apiBaseUrl}/api/question-tutor` : '/api/question-tutor';
if (import.meta.env.DEV) console.info('[NABAHAH_TUTOR_ENDPOINT]', questionTutorEndpoint);

export class ApiQuestionTutorProvider extends QuestionTutorProvider {
  constructor(endpoint = questionTutorEndpoint) {
    super();
    this.endpoint = endpoint;
  }

  /** @param {QuestionTutorInput} input */
  async chat(input, _options = {}) {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify(input),
        // Temporary diagnostic window: keep this above the Render -> DeepSeek
        // timeout so the backend stage can be measured without masking it.
        signal: AbortSignal.timeout(50_000),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const error = new Error(payload.error || 'تعذر الوصول إلى مساعد نباهة');
        error.code = payload.code || payload.error;
        error.status = response.status;
        throw error;
      }
      const reader = response.body?.getReader();
      if (!reader) throw Object.assign(new Error('AI_EMPTY_RESPONSE'), { code: 'AI_EMPTY_RESPONSE' });
      const onChunk = _options.onChunk;
      const decoder = new TextDecoder();
      let buffer = '';
      let content = '';
      let result = {};
      const consume = async (event) => {
        const data = event.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
        if (!data || data === '[DONE]') return;
        const payload = JSON.parse(data);
        if (payload.type === 'error') {
          const error = new Error(payload.error || 'تعذر الوصول إلى مساعد نباهة');
          error.code = payload.code || 'AI_REQUEST_FAILED';
          throw error;
        }
        if (payload.type === 'delta') {
          const delta = String(payload.content ?? '');
          content += delta;
          await onChunk?.(delta);
        }
        if (payload.type === 'done') result = payload;
      };
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? '';
        for (const event of events) await consume(event);
        if (done) break;
      }
      if (buffer.trim()) await consume(buffer);
      if (result.provider !== 'deepseek') throw Object.assign(new Error('AI_PROVIDER_UNAVAILABLE'), { code: 'AI_PROVIDER_UNAVAILABLE' });
      if (!content.trim()) throw Object.assign(new Error('AI_EMPTY_RESPONSE'), { code: 'AI_EMPTY_RESPONSE' });
      return { content: content.trim(), provider: result.provider, model: result.model, source: result.source === 'human-note' ? 'human-note' : 'tutor' };
    } catch (error) {
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        const timeoutError = new Error('AI_TIMEOUT');
        timeoutError.code = 'AI_TIMEOUT';
        timeoutError.status = 504;
        throw timeoutError;
      }
      throw error;
    }
  }
}

export const questionTutorProvider = new ApiQuestionTutorProvider();
