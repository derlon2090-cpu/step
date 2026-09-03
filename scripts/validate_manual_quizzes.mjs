import { manualQuizModels } from '../src/data/manualQuizzes.js';

const issues = [];

for (const model of manualQuizModels) {
  if (!model.id || !model.title) issues.push(`Model is missing id/title: ${JSON.stringify(model)}`);
  if (!Array.isArray(model.passages) || !model.passages.length) issues.push(`${model.id} has no internal passages`);

  for (const passage of model.passages ?? []) {
    if (!passage.id || !passage.title || !passage.englishTitle) issues.push(`${model.id}/${passage.id} is missing passage labels`);
    if (!Array.isArray(passage.questions) || !passage.questions.length) issues.push(`${model.id}/${passage.id} has no questions`);

    for (const [index, question] of (passage.questions ?? []).entries()) {
      if (question.number !== index + 1) issues.push(`${model.id}/${passage.id} question numbering must start at 1 and stay sequential; expected ${index + 1}, found ${question.number}`);
      if (!question.id || !question.question || !question.correctAnswer) issues.push(`${question.id} is missing question text or answer`);
      if (!question.explanation) issues.push(`${question.id} is missing a simple explanation`);
      if (!Array.isArray(question.options) || question.options.length < 4) issues.push(`${question.id} has fewer than 4 quiz options`);
      const correctOptions = question.options.filter((option) => option.isCorrect);
      if (correctOptions.length !== 1) issues.push(`${question.id} must have exactly one correct option`);
      if (correctOptions[0]?.text !== question.correctAnswer) issues.push(`${question.id} correct option does not match correctAnswer`);
      if (new Set(question.options.map((option) => option.text)).size !== question.options.length) issues.push(`${question.id} has duplicate option text`);
    }
  }
}

const reading01 = manualQuizModels.find((model) => model.id === 'reading-01');
const reading01QuestionCount = reading01?.passages.flatMap((passage) => passage.questions).length ?? 0;

if (reading01?.passages.length !== 2) issues.push('reading-01 must currently expose exactly 2 internal passages');
if (reading01QuestionCount !== 15) issues.push(`reading-01 must currently expose 15 quiz questions, found ${reading01QuestionCount}`);

if (issues.length) {
  console.error(issues.join('\n'));
  process.exit(1);
}

console.log('Manual quiz validation passed: reading-01 has 2 internal passages and 15 scored questions.');
