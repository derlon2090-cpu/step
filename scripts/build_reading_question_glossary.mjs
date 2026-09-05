#!/usr/bin/env node
/**
 * Build the Reading question glossary from the published question payloads.
 *
 * Scope is intentionally limited to question.question (questionDisplay/source)
 * and never includes passage text, titles, or answer options.
 * Run with --online once when new questions are published to ask MyMemory for
 * translations, then commit the generated module:
 *   node scripts/build_reading_question_glossary.mjs --online
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wordGlossary as curatedGlossary } from '../src/data/manualQuizzes.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelsDir = path.join(root, 'src', 'data', 'reading', 'models');
const outputFile = path.join(root, 'src', 'data', 'reading', 'questionGlossary.js');
const online = process.argv.includes('--online');

const normalizeWord = (word) => String(word).toLowerCase().replace(/[’']/g, "'").replace(/'s$/i, '').replace(/[^a-z]/g, '');
const extractWords = (text) => (String(text ?? '').match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) ?? []).map(normalizeWord).filter(Boolean);

const questionWords = new Set();
const files = (await fs.readdir(modelsDir)).filter((name) => /^model-\d+\.json$/.test(name)).sort();
for (const file of files) {
  const model = JSON.parse(await fs.readFile(path.join(modelsDir, file), 'utf8'));
  for (const piece of model.pieces ?? []) {
    for (const question of piece.questions ?? []) {
      for (const word of extractWords(question.questionDisplay ?? question.questionSource ?? '')) questionWords.add(word);
    }
  }
}

const decodeHtml = (value) => String(value).replace(/&#39;|&#x27;/gi, "'").replace(/&quot;/gi, '"').replace(/&amp;/gi, '&').replace(/&#160;/gi, ' ').trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function onlineTranslation(word) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|ar`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`translation request failed (${response.status})`);
  const payload = await response.json();
  const translated = decodeHtml(payload?.responseData?.translatedText ?? '');
  return translated && !/^MYMEMORY WARNING/i.test(translated) ? translated : null;
}

const translations = { ...curatedGlossary };
// Keep reviewed/generated entries when rebuilding, and handle proper names or
// short function words that free machine-translation services often omit.
try {
  const previous = await import('../src/data/reading/questionGlossary.js');
  Object.assign(translations, previous.questionGlossary ?? {});
} catch { /* first build */ }
Object.assign(translations, {
  his: 'ـه / خاصته',
  urdu: 'الأردية',
  // Context-safe corrections for short words/proper names where the public
  // machine-translation endpoint can return the source token or punctuation.
  ab: 'اختصار/رمز', al: 'الـ', an: 'أداة نكرة', and: 'و', angry: 'غاضب',
  another: 'آخر / أخرى', appropriate: 'مناسب', better: 'أفضل', but: 'لكن',
  capital: 'عاصمة / كبير', clues: 'أدلة', company: 'شركة', delay: 'تأخير',
  difference: 'فرق', difficult: 'صعب', discover: 'يكتشف', drink: 'يشرب / مشروب',
  english: 'الإنجليزية', find: 'يجد', form: 'شكل', got: 'حصل على', hand: 'يد',
  happy: 'سعيد', he: 'هو', her: 'لها / ـها', him: 'له / ـه', important: 'مهم',
  it: 'هو / هي / ذلك', king: 'ملك', longer: 'أطول', miners: 'عمّال المناجم',
  nd: 'والثاني', new: 'جديد', o: 'حرف O', orange: 'برتقالي', pepper: 'فلفل', phrase: 'عبارة',
  process: 'عملية', products: 'منتجات', put: 'يضع', queen: 'ملكة', ran: 'ركض / أدار',
  real: 'حقيقي', remember: 'يتذكر', scientists: 'علماء', small: 'صغير',
  someone: 'شخص ما', tall: 'طويل', test: 'اختبار', their: 'لهم / ـهم',
  treats: 'يعالج / مكافآت', two: 'اثنان', visited: 'زار', were: 'كانوا / كنّ',
  work: 'عمل / يعمل', working: 'يعمل', your: 'ـك / خاصتك',
});
const missing = [...questionWords].filter((word) => !translations[word]);
if (online) {
  let completed = 0;
  for (let index = 0; index < missing.length; index += 6) {
    const batch = missing.slice(index, index + 6);
    const results = await Promise.all(batch.map(async (word) => {
      try { return [word, await onlineTranslation(word)]; } catch { return [word, null]; }
    }));
    for (const [word, translation] of results) if (translation) translations[word] = translation;
    completed += batch.length;
    if (completed < missing.length) await sleep(250);
    process.stdout.write(`\rTranslated ${completed}/${missing.length}`);
  }
  process.stdout.write('\n');
}

const unresolved = [...questionWords].filter((word) => !translations[word]);
if (unresolved.length) {
  console.error(`Missing translations (${unresolved.length}): ${unresolved.join(', ')}`);
  process.exitCode = 1;
}

// Emit only words that occur in question.question; curated entries outside that
// scope are useful as seeds but must not turn this into a passage/platform dictionary.
const sorted = Object.fromEntries([...questionWords].sort((a, b) => a.localeCompare(b)).map((word) => [word, translations[word]]));
const source = `// Generated by scripts/build_reading_question_glossary.mjs\n// Scope: unique English words in published Reading question.question only.\nexport const questionGlossary = ${JSON.stringify(sorted, null, 2)};\n\nexport const questionGlossaryStats = ${JSON.stringify({ uniqueWords: questionWords.size, translatedWords: questionWords.size - unresolved.length, missingWords: unresolved.length, coverage: questionWords.size ? (questionWords.size - unresolved.length) / questionWords.size : 1 }, null, 2)};\n`;
await fs.writeFile(outputFile, source, 'utf8');
console.log(`Wrote ${outputFile}: ${questionWords.size} unique question words, ${questionWords.size - unresolved.length} translated, ${unresolved.length} missing.`);
