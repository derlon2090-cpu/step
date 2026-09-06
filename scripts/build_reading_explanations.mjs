import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildReadingExplanation, isGenericReadingExplanation } from '../src/data/readingExplanations.js';

const modelsDirectory = fileURLToPath(new URL('../src/data/reading/models/', import.meta.url));
const files = (await readdir(modelsDirectory)).filter((file) => /^model-\d+\.json$/.test(file)).sort();
let updated = 0;

for (const file of files) {
  const filePath = path.join(modelsDirectory, file);
  const model = JSON.parse(await readFile(filePath, 'utf8'));
  let changed = false;
  for (const piece of model.pieces ?? []) {
    for (const question of piece.questions ?? []) {
      if (!isGenericReadingExplanation(question.sourceNote)) continue;
      question.sourceNote = buildReadingExplanation(question);
      updated += 1;
      changed = true;
    }
  }
  if (changed) await writeFile(filePath, `${JSON.stringify(model, null, 2)}\n`, 'utf8');
}

console.log(`Updated ${updated} reading explanations across ${files.length} model files.`);
