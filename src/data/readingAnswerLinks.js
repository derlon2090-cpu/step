import { buildReadingExplanation } from './readingExplanations.js';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'about', 'according', 'author', 'best', 'does', 'did', 'do', 'following', 'from', 'idea', 'information',
  'is', 'are', 'was', 'were', 'main', 'mentioned', 'most', 'of', 'passage', 'paragraph', 'point', 'question', 'sentence',
  'that', 'this', 'to', 'what', 'when', 'where', 'which', 'who', 'why', 'how', 'can', 'could', 'would', 'should', 'likely',
  'and', 'as', 'at', 'be', 'by', 'for', 'in', 'on', 'or', 'than', 'then', 'there', 'with', 'will',
]);

const clean = (value = '') => String(value).replace(/\s+/g, ' ').trim();
const shorten = (value, max = 92) => {
  const text = clean(value).replace(/[.،؛:!?]+$/u, '');
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
};

function keywordFromQuestion(prompt) {
  const quoted = prompt.match(/[“"']([^”"']{1,55})[”"']/u)?.[1]?.trim();
  if (quoted) return quoted;

  const pronoun = prompt.match(/\bpronoun\s+(it|they|them|this|these|he|she|its|their)\b/i)?.[1];
  if (pronoun) return pronoun;

  const tokens = [...prompt.matchAll(/[\p{L}\p{N}]+/gu)]
    .map((match) => ({ value: match[0], normalized: match[0].toLowerCase() }))
    .filter((token) => token.value.length > 1 && !STOP_WORDS.has(token.normalized));
  if (!tokens.length) return prompt.split(/\s+/).filter(Boolean).at(-1)?.replace(/[^\p{L}\p{N}]/gu, '') || 'السؤال';
  return tokens
    .map((token, index) => ({ ...token, index }))
    .sort((left, right) => right.value.length - left.value.length || right.index - left.index)[0].value;
}

function memoryLine(keyword, answer, reason) {
  const logic = shorten(
    clean(reason)
      .replace(/^لأن\s+/u, '')
      .replace(/[.،؛:!?]+$/u, ''),
    170,
  );
  return `اربط «${keyword}» بـ «${shorten(answer)}»؛ لأن ${logic}.`;
}

export function buildReadingAnswerLink(question = {}) {
  const prompt = clean(question.questionDisplay ?? question.questionSource ?? question.question);
  const answer = clean(question.correctAnswer);
  if (!prompt || !answer) return null;
  const keyword = keywordFromQuestion(prompt);
  const reason = buildReadingExplanation(question);
  return {
    keyword,
    answer,
    memory: memoryLine(keyword, answer, reason),
    reason,
  };
}
