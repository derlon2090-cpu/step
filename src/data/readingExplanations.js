const GENERIC_NOTES = new Set([
  'الإجابة موثقة ضمن بيانات القطعة.',
  'الإجابة موثقة ضمن بيانات القطعة فقط.',
]);

const clean = (value = '') => String(value).replace(/\s+/g, ' ').trim();
const withoutTrailingPunctuation = (value = '') => clean(value).replace(/[.،؛:!?]+$/u, '');
const shorten = (value, max = 145) => {
  const text = withoutTrailingPunctuation(value);
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
};

const quotedTerm = (prompt) => {
  const match = clean(prompt).match(/[“"']([^”"']{1,55})[”"']/u);
  return match?.[1]?.trim() ?? '';
};

export function buildReadingExplanation(question = {}) {
  const existing = clean(question.sourceNote ?? question.explanation);
  if (existing && !GENERIC_NOTES.has(existing)) return existing;

  const prompt = clean(question.questionDisplay ?? question.questionSource ?? question.question);
  const answer = shorten(question.correctAnswer);
  if (!answer) return 'لا توجد إجابة معتمدة في المصدر لهذا السؤال، لذلك لا يدخل في التصحيح حتى تتم مراجعته.';

  const lower = prompt.toLowerCase();
  const term = quotedTerm(prompt);
  const answerQuote = `«${answer}»`;

  if (/\b(not mentioned|except|least likely|does not|did not|isn't|aren't|false)\b/i.test(lower)) {
    return `${answerQuote} هو الاستثناء المطلوب؛ فهو لا يطابق المعلومات التي عرضتها القطعة، بخلاف بقية الخيارات.`;
  }

  if (/\b(best title|main idea|main point|primarily about|best summarizes?|purpose of (the )?passage)\b/i.test(lower)) {
    return `${answerQuote} هو الأنسب لأنه يلخص محور القطعة كاملًا، بينما تمثل الخيارات الأخرى تفاصيل جزئية أو أفكارًا جانبية.`;
  }

  if (/\b(mean|meaning|closest in meaning|synonym|refers to the word)\b/i.test(lower)) {
    return term
      ? `في سياق القطعة، كلمة «${term}» تحمل معنى ${answerQuote}؛ وهذا هو المعنى الذي يستقيم مع الجملة.`
      : `المعنى السياقي المطلوب هو ${answerQuote}؛ لأنه يحافظ على معنى الكلمة داخل الجملة.`;
  }

  if (/\b(pronoun|what does (it|they|them|this|these|he|she) refer|refer to)\b/i.test(lower)) {
    return `يعود الضمير إلى ${answerQuote} لأنه المرجع الذي يتوافق معه في المعنى والسياق داخل الجملة.`;
  }

  if (/\b(why|reason|because|cause|led to|resulted in)\b/i.test(lower)) {
    return `السبب الذي تربطه القطعة بالسؤال هو ${answerQuote}؛ لذلك يجيب هذا الخيار عن علاقة السبب والنتيجة مباشرة.`;
  }

  if (/\b(how many|how much|how long|what percentage|what year|when)\b/i.test(lower)) {
    return `القيمة أو الزمن المذكور في القطعة هو ${answerQuote}، لذا فهو يطابق التفصيل العددي المطلوب.`;
  }

  if (/\b(where|which country|which place|location)\b/i.test(lower)) {
    return `المكان المحدد في القطعة هو ${answerQuote}، وهو ما يجيب عن موضع الحدث أو المعلومة بدقة.`;
  }

  if (/\b(who|whose)\b/i.test(lower)) {
    return `الشخص أو الجهة التي تنسب إليها القطعة هذه المعلومة هي ${answerQuote}.`;
  }

  if (/\b(infer|imply|suggest|conclude|likely|probably|understand from)\b/i.test(lower)) {
    return `يمكن استنتاج ${answerQuote} من ترابط التفاصيل الواردة في القطعة، حتى لو لم تُذكر بهذه الصياغة حرفيًا.`;
  }

  if (/\b(attitude|opinion|feel|tone|view)\b/i.test(lower)) {
    return `${answerQuote} يعبّر بدقة عن موقف الكاتب أو نبرته كما تظهر من الألفاظ المستخدمة في القطعة.`;
  }

  if (/\b(difference|different|similar|compare|contrast)\b/i.test(lower)) {
    return `${answerQuote} يحدد علاقة المقارنة المطلوبة بين العناصر المذكورة في القطعة.`;
  }

  if (/\b(purpose|in order to|why does the author mention)\b/i.test(lower)) {
    return `ذُكرت المعلومة لتحقيق غرض ${answerQuote}، وهو الغرض الذي يخدم سياق الفقرة مباشرة.`;
  }

  return `تذكر القطعة أن الإجابة هي ${answerQuote}؛ وهذا الخيار يطابق المعلومة المطلوبة، بينما لا تجيب الخيارات الأخرى عنها بدقة.`;
}

export const isGenericReadingExplanation = (value) => GENERIC_NOTES.has(clean(value));
