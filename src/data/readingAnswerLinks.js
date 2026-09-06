import { buildReadingExplanation } from './readingExplanations.js';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'about', 'according', 'author', 'best', 'does', 'did', 'do', 'following', 'from', 'idea', 'information',
  'is', 'are', 'was', 'were', 'main', 'mentioned', 'most', 'of', 'passage', 'paragraph', 'point', 'question', 'sentence',
  'that', 'this', 'to', 'what', 'when', 'where', 'which', 'who', 'why', 'how', 'can', 'could', 'would', 'should', 'likely',
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
  return tokens.at(-1).value;
}

function memoryLine(prompt, keyword, answer) {
  const lower = prompt.toLowerCase();
  const pair = `«${keyword}» ← «${shorten(answer)}»`;
  if (/\b(mean|meaning|closest in meaning|synonym)\b/i.test(lower)) return `${pair}: احفظهما كزوج يحمل المعنى نفسه في سياق القطعة.`;
  if (/\b(pronoun|refer to)\b/i.test(lower)) return `${pair}: عند رؤية الضمير، ارجع إلى الاسم الذي يطابقه في المعنى.`;
  if (/\b(not mentioned|except|does not|did not|false)\b/i.test(lower)) return `${pair}: كلمة NOT أو EXCEPT تنبّهك إلى أن المطلوب هو الاستثناء.`;
  if (/\b(best title|main idea|main point|summar)\b/i.test(lower)) return `${pair}: الكلمة المفتاحية تقودك إلى الفكرة التي تجمع تفاصيل القطعة.`;
  if (/\b(why|reason|cause|because)\b/i.test(lower)) return `${pair}: ثبّت في ذهنك أن الأولى تسأل عن السبب، والثانية هي سببه في القطعة.`;
  if (/\b(how many|how much|how long|percentage|what year|when)\b/i.test(lower)) return `${pair}: اربط التفصيل الزمني أو العددي بموضوع السؤال مباشرة.`;
  return `${pair}: الأولى مفتاح السؤال، والثانية هي المعلومة المطابقة لها في القطعة.`;
}

export function buildReadingAnswerLink(question = {}) {
  const prompt = clean(question.questionDisplay ?? question.questionSource ?? question.question);
  const answer = clean(question.correctAnswer);
  if (!prompt || !answer) return null;
  const keyword = keywordFromQuestion(prompt);
  return {
    keyword,
    answer,
    memory: memoryLine(prompt, keyword, answer),
    reason: buildReadingExplanation(question),
  };
}
