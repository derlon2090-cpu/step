// Source of truth: confirmed, numbered passage records only.
// The supplied files are flattened question compilations without a reliable
// 01–49 mapping or the original passage text, translation, and answer key.
// They are intentionally not converted into learning data.
export const readingPassages = [];

export const suppliedSourceInventory = [
  { source: 'ff94cd25-e051-4882-a1f4-fcdc93219b05', type: 'flattened question compilation', usableAsPassageRecord: false },
  { source: '93fa0534-d2bb-4fda-b37c-506e50665a94', type: 'flattened question compilation', usableAsPassageRecord: false },
  { source: '68ea436f-15f2-4914-9ec8-e9d15a601b66', type: 'flattened question compilation', usableAsPassageRecord: false },
  { source: '94f7d121-538a-4da3-b163-512ad038a850', type: 'flattened question compilation', usableAsPassageRecord: false },
  { source: '5e33df4d-fd2a-4a9e-b962-c9d8a84d8afc', type: 'flattened question compilation', usableAsPassageRecord: false },
  { source: '4d73d865-b755-4088-88d1-35ab1c43f1d0', type: 'flattened question compilation', usableAsPassageRecord: false }
];

export function validateReadingPassages(passages) {
  const numbers = passages.map(({ order }) => order);
  const issues = [];
  if (passages.length !== 49) issues.push(`عدد القطع المؤكدة ${passages.length} من 49`);
  if (numbers[0] !== 1) issues.push('القطعة الأولى غير متاحة');
  if (numbers.at(-1) !== 49) issues.push('القطعة الأخيرة غير متاحة');
  if (new Set(numbers).size !== numbers.length) issues.push('يوجد رقم قطعة مكرر');
  if (numbers.some((number, index) => number !== index + 1)) issues.push('يوجد رقم قطعة مفقود أو غير مرتب');
  if (passages.some(({ passage, questions }) => !passage || !Array.isArray(questions) || !questions.length)) issues.push('توجد قطعة بلا نص أو أسئلة مؤكدة');
  return { valid: issues.length === 0, issues };
}

export const readingDataValidation = validateReadingPassages(readingPassages);
