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
const questionTutorEndpoint = apiBaseUrl ? `${apiBaseUrl}/api/question-tutor` : '/api/question-tutor';

export class ApiQuestionTutorProvider extends QuestionTutorProvider {
  constructor(endpoint = questionTutorEndpoint) {
    super();
    this.endpoint = endpoint;
  }

  /** @param {QuestionTutorInput} input */
  async chat(input) {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(input),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || 'تعذر الوصول إلى مساعد نباهة');
      error.code = payload.code || payload.error;
      error.status = response.status;
      throw error;
    }
    if (payload.provider !== 'deepseek') {
      const error = new Error('AI_PROVIDER_UNAVAILABLE');
      error.code = 'AI_PROVIDER_UNAVAILABLE';
      throw error;
    }
    const content = String(payload.content ?? '').trim();
    if (!content) {
      const error = new Error('AI_EMPTY_RESPONSE');
      error.code = 'AI_EMPTY_RESPONSE';
      throw error;
    }
    return {
      content,
      provider: payload.provider,
      model: payload.model,
      source: payload.source === 'human-note' ? 'human-note' : 'tutor',
    };
  }
}

export const questionTutorProvider = new ApiQuestionTutorProvider();
