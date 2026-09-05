#!/usr/bin/env node
/** Validate 100% translation coverage for published Reading question text. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { questionGlossary } from '../src/data/reading/questionGlossary.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelsDir = path.join(root, 'src', 'data', 'reading', 'models');
const normalizeWord = (word) => String(word).toLowerCase().replace(/[’']/g, "'").replace(/'s$/i, '').replace(/[^a-z]/g, '');
const extractWords = (text) => (String(text ?? '').match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) ?? []).map(normalizeWord).filter(Boolean);
const occurrences = new Map();
const files = (await fs.readdir(modelsDir)).filter((name) => /^model-\d+\.json$/.test(name)).sort();
for (const file of files) {
  const model = JSON.parse(await fs.readFile(path.join(modelsDir, file), 'utf8'));
  for (const piece of model.pieces ?? []) for (const question of piece.questions ?? []) {
    for (const word of extractWords(question.questionDisplay ?? question.questionSource ?? '')) {
      if (!occurrences.has(word)) occurrences.set(word, []);
      occurrences.get(word).push(`${file}/${piece.pieceId}/${question.id}`);
    }
  }
}
const missing = [...occurrences.keys()].filter((word) => !String(questionGlossary[word] ?? '').trim());
const total = occurrences.size;
console.log(`Unique words in questions: ${total}`);
console.log(`Translated: ${total - missing.length}`);
console.log(`Missing: ${missing.length}`);
console.log(`Coverage: ${total ? ((total - missing.length) / total * 100).toFixed(2) : '100.00'}%`);
if (missing.length) {
  console.error(`Missing words: ${missing.join(', ')}`);
  for (const word of missing) console.error(`  ${word}: ${occurrences.get(word).slice(0, 3).join(', ')}`);
  process.exitCode = 1;
}
