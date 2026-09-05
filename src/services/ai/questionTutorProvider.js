/**
 * @typedef {Object} QuestionTutorInput
 * @property {string} questionId
 * @property {string} question
 * @property {{id: string, text: string}[]} options
 * @property {string} message
 * @property {string} action
 * @property {boolean} isAnswered
 * @property {string|null} selectedOptionId
 * @property {string|null} selectedOptionText
 * @property {string|null} correctAnswer
 * @property {string|null} humanNote
 * @property {{role: 'user'|'assistant', content: string}[]} history
 */

/**
 * Stable UI-facing contract. The question surface talks only to this provider;
 * the concrete model remains a server-side concern.
 */
export class QuestionTutorProvider {
  /** @param {QuestionTutorInput} _input */
  async chat(_input) {
    throw new Error('QuestionTutorProvider.chat must be implemented');
  }
}

export class ApiQuestionTutorProvider extends QuestionTutorProvider {
  constructor(endpoint = '/api/question-tutor') {
    super();
    this.endpoint = endpoint;
  }

  /** @param {QuestionTutorInput} input */
  async chat(input) {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(input),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'تعذر الوصول إلى مساعد نباهة');
      return { content: String(payload.content ?? '').trim(), source: payload.source === 'human-note' ? 'human-note' : 'tutor' };
    } catch {
      // The quiz remains useful when the optional API is offline (for example,
      // while running the Vite client alone). This fallback keeps the same
      // pre-answer safety rule and is replaced by the server provider when available.
      const hasVerifiedAnswer = input.isAnswered === true && Boolean(input.correctAnswer);
      if (!hasVerifiedAnswer) {
        if (input.action === 'rule') return { content: 'حدّد نوع السؤال والكلمة المفتاحية فيه، ثم استبعد الخيارات التي لا تنسجم نحويًا أو معنويًا. جرّب تضييق الخيارات إلى اثنين قبل اختيارك.', source: 'tutor' };
        if (input.action === 'simplify') return { content: `بصياغة أبسط: المطلوب أن تفهم ما الذي يسأل عنه السؤال «${input.question}»، ثم تبحث عن الدليل دون أن أقفز للحل قبلك.`, source: 'tutor' };
        return { content: 'ابدأ بتحديد الكلمة المفتاحية في السؤال، ثم ابحث عن الدليل المطابق واستبعد خيارًا واحدًا واضحًا. لن أكشف الإجابة قبل محاولتك.', source: 'tutor' };
      }
      if (input.action === 'why_wrong') return { content: `اختيارك «${input.selectedOptionText ?? 'الخيار المحدد'}» لا يطابق الدليل المطلوب. الإجابة المعتمدة هي «${input.correctAnswer}».`, source: input.humanNote ? 'human-note' : 'tutor' };
      if (input.action === 'why_correct') return { content: `اختيارك «${input.selectedOptionText ?? input.correctAnswer}» صحيح لأنه يطابق المطلوب والدليل المرتبط به.`, source: input.humanNote ? 'human-note' : 'tutor' };
      return { content: `الإجابة المعتمدة هي «${input.correctAnswer}». اربطها بالدليل المباشر، ثم راقب لماذا لا تؤدي الخيارات الأخرى المعنى نفسه.`, source: input.humanNote ? 'human-note' : 'tutor' };
    }
  }
}

export const questionTutorProvider = new ApiQuestionTutorProvider();
