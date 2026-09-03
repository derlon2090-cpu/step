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
      if (!question.id || !question.question) issues.push(`${question.id} is missing question text`);
      if (!question.explanation) issues.push(`${question.id} is missing a simple explanation`);
      if (!Array.isArray(question.options) || (question.correctAnswer !== null && question.options.length < 4)) issues.push(`${question.id} has fewer than 4 quiz options`);
      const correctOptions = question.options.filter((option) => option.isCorrect);
      if (question.correctAnswer === null) {
        if (correctOptions.length !== 0) issues.push(`${question.id} unresolved question must not mark a correct option`);
      } else {
        if (correctOptions.length !== 1) issues.push(`${question.id} must have exactly one correct option`);
        if (correctOptions[0]?.text !== question.correctAnswer) issues.push(`${question.id} correct option does not match correctAnswer`);
      }
      if (new Set(question.options.map((option) => option.text)).size !== question.options.length) issues.push(`${question.id} has duplicate option text`);
    }
  }
}

const reading01 = manualQuizModels.find((model) => model.id === 'reading-01');
const reading01QuestionCount = reading01?.passages.flatMap((passage) => passage.questions).length ?? 0;
const reading02 = manualQuizModels.find((model) => model.id === 'reading-02');
const reading03 = manualQuizModels.find((model) => model.id === 'reading-03');
const reading04 = manualQuizModels.find((model) => model.id === 'reading-04');

if (reading01?.passages.length !== 9) issues.push('reading-01 must currently expose exactly 9 internal passages');
if (reading01QuestionCount !== 60) issues.push(`reading-01 must currently expose 60 quiz questions, found ${reading01QuestionCount}`);
if (reading02?.passages.length !== 7 || reading02.passages.flatMap((passage) => passage.questions).length !== 49) issues.push('reading-02 must expose 7 passages and 49 questions');
if (reading03?.passages.length !== 9 || reading03.passages.flatMap((passage) => passage.questions).length !== 81) issues.push('reading-03 must expose 9 passages and 81 questions');
if (reading04?.passages.length !== 11 || reading04.passages.flatMap((passage) => passage.questions).length !== 65) issues.push('reading-04 must expose 11 passages and 65 questions');

if (issues.length) {
  console.error(issues.join('\n'));
  process.exit(1);
}

console.log('Manual quiz validation passed: models 01–04 expose 36 passages and 255 questions; unresolved answers remain unscored.');
