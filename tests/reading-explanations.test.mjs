import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { buildReadingExplanation, isGenericReadingExplanation } from '../src/data/readingExplanations.js';

async function readingQuestions() {
  const directory = new URL('../src/data/reading/models/', import.meta.url);
  const files = (await readdir(directory)).filter((file) => file.endsWith('.json'));
  const models = await Promise.all(files.map(async (file) => JSON.parse(await readFile(new URL(file, directory), 'utf8'))));
  return models.flatMap((model) => model.pieces.flatMap((piece) => piece.questions));
}

test('every published reading question receives a concise non-generic explanation', async () => {
  const questions = await readingQuestions();
  assert.equal(questions.length, 626);
  for (const question of questions) {
    assert.equal(isGenericReadingExplanation(question.sourceNote), false, `${question.id} still has a generic source note`);
    const explanation = buildReadingExplanation(question);
    assert.ok(explanation.length >= 12, question.id);
    assert.ok(explanation.length <= 260, question.id);
    assert.equal(isGenericReadingExplanation(explanation), false, question.id);
  }
});

test('generated reasons are specific to the question type and correct answer', () => {
  const vocabulary = buildReadingExplanation({ questionDisplay: 'What does the word “sufficient” mean?', correctAnswer: 'Enough.', sourceNote: 'الإجابة موثقة ضمن بيانات القطعة.' });
  const title = buildReadingExplanation({ questionDisplay: 'What is the best title for the passage?', correctAnswer: 'Classifying Stars.', sourceNote: 'الإجابة موثقة ضمن بيانات القطعة.' });
  const exception = buildReadingExplanation({ questionDisplay: 'Which color is NOT mentioned?', correctAnswer: 'Green.', sourceNote: 'الإجابة موثقة ضمن بيانات القطعة.' });
  assert.match(vocabulary, /sufficient.*Enough/);
  assert.match(title, /Classifying Stars.*يلخص محور القطعة/);
  assert.match(exception, /Green.*الاستثناء/);
});

test('existing human-written explanations remain unchanged', () => {
  const sourceNote = 'لأن سبب التأخر المذكور هو أن اللغة يتحدث بها كبار السن غالبًا.';
  assert.equal(buildReadingExplanation({ questionDisplay: 'Why?', correctAnswer: 'Elders', sourceNote }), sourceNote);
});
