import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2] ?? 'C:/Users/waehs/.codex/attachments/8d10f224-5dc0-45e9-b927-04be2c78d515/pasted-text.txt';
const output = process.argv[3] ?? 'src/data/grammarModels.js';
const text = fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, '');
const lines = text.split(/\r?\n/).map((line) => line.trim());

const categoryMap = [
  ['القواعد العامة', 'general'],
  ['INCORRECT', 'incorrect'],
  ['الجملة الصحيحة', 'correct-sentence'],
  ['CORRECT WORD ORDER', 'word-order'],
  ['CAPITALIZATION', 'capitalization'],
  ['PUNCTUATION', 'punctuation'],
  ['الأسئلة الخاصة', 'special'],
];
const categoryLabels = {
  general: 'القواعد العامة',
  incorrect: 'اكتشاف الخطأ',
  'correct-sentence': 'الجملة الصحيحة',
  'word-order': 'ترتيب الكلمات',
  capitalization: 'Capitalization',
  punctuation: 'Punctuation',
  special: 'أسئلة خاصة',
};

const modelStarts = lines.map((line, index) => (/^النموذج (الأول|الثاني|الثالث)$/.test(line) ? index : -1)).filter((index) => index >= 0);
const modelNames = ['الأول', 'الثاني', 'الثالث'];
const marker = (line, modelNumber) => modelNumber === 1 ? /^م1-\d+$/.test(line) : /^\d{2,3}$/.test(line);
const markerValue = (line, modelNumber) => modelNumber === 1 ? Number(line.match(/-(\d+)$/)[1]) : Number(line);

function detectCategory(line, current) {
  if (!/^(?:أولًا|ثانيًا|ثالثًا|رابعًا|خامسًا|سادسًا):/.test(line)) return null;
  if (/Clause|إضافة/i.test(line)) return 'special';
  const found = categoryMap.find(([needle]) => line.includes(needle));
  return found?.[1] ?? current;
}

function parseQuestion(block, modelNumber, sourceNumber, category) {
  const optionStart = block.findIndex((line) => /^[A-D]\)\s*/.test(line));
  if (optionStart < 0) return null;
  const promptLines = block.slice(0, optionStart).filter(Boolean);
  const options = [];
  let answerLetter = null;
  let note = '';
  for (let index = optionStart; index < block.length; index += 1) {
    const line = block[index];
    const option = line.match(/^([A-D])\)\s*(.*)$/);
    if (option) {
      options[option[1].charCodeAt(0) - 65] = option[2].trim();
      continue;
    }
    const answer = line.match(/الإجابة المحددة(?: في المصدر)?\s*:\s*([A-D])/i);
    const bracketAnswer = line.match(/الإجابة المحددة(?: في المصدر)?\s*:\s*\[([1-4])\]/i);
    if (answer) answerLetter = answer[1].toUpperCase();
    else if (bracketAnswer) answerLetter = String.fromCharCode(64 + Number(bracketAnswer[1]));
    if (line.startsWith('ملاحظة')) note = note ? `${note} ${line}` : line;
  }
  if (!options.length) return null;
  while (options.length < 4) options.push('');
  const answerIndex = answerLetter ? answerLetter.charCodeAt(0) - 65 : null;
  return {
    id: `grammar-${String(modelNumber).padStart(2, '0')}-q${String(sourceNumber).padStart(2, '0')}`,
    sourceNumber,
    category,
    categoryLabel: categoryLabels[category] ?? categoryLabels.general,
    prompt: promptLines.join('\n'),
    options,
    correctIndex: Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < options.length ? answerIndex : null,
    sourceNote: note,
  };
}

const parsedModels = modelStarts.map((start, modelIndex) => {
  const modelNumber = modelIndex + 1;
  const end = modelStarts[modelIndex + 1] ?? lines.length;
  const modelLines = lines.slice(start + 1, end);
  let category = 'general';
  const questions = [];
  let currentMarker = null;
  let currentBlock = [];
  const flush = () => {
    if (currentMarker === null) return;
    const question = parseQuestion(currentBlock, modelNumber, currentMarker, category);
    if (question) questions.push(question);
    currentMarker = null;
    currentBlock = [];
  };
  for (const line of modelLines) {
    const nextCategory = detectCategory(line, null);
    if (nextCategory) {
      flush();
      category = nextCategory;
      continue;
    }
    if (marker(line, modelNumber)) {
      flush();
      currentMarker = markerValue(line, modelNumber);
      continue;
    }
    if (currentMarker !== null) currentBlock.push(line);
  }
  flush();
  return {
    id: `grammar-${String(modelNumber).padStart(2, '0')}`,
    order: modelNumber,
    title: `النموذج ${modelNames[modelIndex]}`,
    subtitle: modelNumber <= 3 ? `${questions.length} سؤالًا معتمدًا · ترتيب ومراجعة حسب نوع السؤال` : 'سيُضاف المحتوى المعتمد قريبًا',
    status: modelNumber <= 3 ? 'available' : 'coming-soon',
    questions: questions.map((question, index) => ({ ...question, displayOrder: index + 1 })),
  };
});

for (let order = parsedModels.length + 1; order <= 44; order += 1) {
  parsedModels.push({
    id: `grammar-${String(order).padStart(2, '0')}`,
    order,
    title: `النموذج ${order}`,
    subtitle: 'سيُضاف المحتوى المعتمد قريبًا',
    status: 'coming-soon',
    questions: [],
  });
}

const source = `// Generated from the source transcript. Keep source answers unchanged.\nexport const grammarModels = ${JSON.stringify(parsedModels, null, 2)};\n`;
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, source);
console.log(`Generated ${output}:`, parsedModels.slice(0, 3).map((model) => `${model.id}=${model.questions.length}`).join(', '));
