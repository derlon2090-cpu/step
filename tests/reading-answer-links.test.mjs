import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { buildReadingAnswerLink } from '../src/data/readingAnswerLinks.js';

async function readingQuestions() {
  const directory = new URL('../src/data/reading/models/', import.meta.url);
  const files = (await readdir(directory)).filter((file) => file.endsWith('.json'));
  const models = await Promise.all(files.map(async (file) => JSON.parse(await readFile(new URL(file, directory), 'utf8'))));
  return models.flatMap((model) => model.pieces.flatMap((piece) => piece.questions));
}

test('every scored reading question has a memorable answer link', async () => {
  const questions = (await readingQuestions()).filter((question) => question.correctAnswer);
  assert.equal(questions.length, 580);
  for (const question of questions) {
    const link = buildReadingAnswerLink(question);
    const prompt = question.questionDisplay ?? question.questionSource;
    assert.ok(link, question.id);
    assert.equal(link.answer, question.correctAnswer, question.id);
    assert.ok(prompt.toLocaleLowerCase('en').includes(link.keyword.toLocaleLowerCase('en')), `${question.id}: ${link.keyword}`);
    assert.ok(link.memory.includes(link.keyword), `${question.id}: memory misses keyword`);
    assert.match(link.memory, /لأن/u, `${question.id}: memory needs a logical cause`);
    assert.doesNotMatch(link.memory, /زوج|احفظهما|الأولى مفتاح السؤال|ثبّت في ذهنك/u, `${question.id}: generic memory phrase`);
    assert.ok(link.reason.length >= 12, question.id);
  }
});

test('answer linking is removed from the question surface and offered through Nibras', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const quizSource = source.slice(source.indexOf('function quizView('), source.indexOf('function resultView('));
  assert.doesNotMatch(quizSource, /data-toggle-answer-link|answer-link-feature|answer-link-card/);
  assert.match(source, /answer_link: 'ربط الإجابة'/);
  assert.match(source, /\['hint', 'simplify', 'rule', 'answer_link', 'explain'\]/);
  assert.match(source, /passage\?\.id === 'grammar' \? 'grammar' : 'reading'/);
});
