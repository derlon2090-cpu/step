import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { manualQuizModels } from '../src/data/manualQuizzes.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/data/reading');
const modelsDir = path.join(root, 'models');
const reviewsDir = path.join(root, 'reviews');
fs.mkdirSync(modelsDir, { recursive: true });
fs.mkdirSync(reviewsDir, { recursive: true });

const toPiece = (passage, modelId) => ({
  pieceId: `${modelId}-piece-${String(passage.order).padStart(2, '0')}`,
  order: passage.order,
  titleAr: passage.title,
  titleEn: passage.englishTitle,
  externalTitle: passage.externalTitle,
  passage: passage.passageText ?? null,
  sourceNotes: [],
  questions: passage.questions.map((question, index) => ({
    id: question.id,
    sourceQuestionNumber: question.number,
    displayOrder: index + 1,
    questionSource: question.question,
    questionDisplay: question.question,
    options: question.options.map((option) => option.text),
    correctAnswer: question.correctAnswer,
    answerStatus: question.correctAnswer === null ? 'missing' : 'verified',
    sourceNote: question.explanation ?? '',
    excludeFromScoring: question.correctAnswer === null,
  })),
});

const index = [];
for (const model of manualQuizModels) {
  const output = {
    modelId: `model-${String(model.order).padStart(2, '0')}`,
    modelNumber: model.order,
    title: model.title,
    subtitle: model.subtitle,
    pieces: model.passages.map((passage) => toPiece(passage, model.id)),
  };
  const filename = `model-${String(model.order).padStart(2, '0')}.json`;
  fs.writeFileSync(path.join(modelsDir, filename), `${JSON.stringify(output, null, 2)}\n`);
  index.push({ modelId: output.modelId, modelNumber: output.modelNumber, title: output.title, pieceCount: output.pieces.length, questionCount: output.pieces.reduce((sum, piece) => sum + piece.questions.length, 0) });
}

fs.writeFileSync(path.join(root, 'reading-index.json'), `${JSON.stringify(index, null, 2)}\n`);
fs.writeFileSync(path.join(reviewsDir, 'pending-answers.json'), `${JSON.stringify({ version: 1, reviews: [] }, null, 2)}\n`);
console.log(`Exported ${index.length} models to data/reading/models and created reading-index.json.`);
