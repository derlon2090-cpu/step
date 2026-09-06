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
    assert.match(link.memory, /←/, question.id);
    assert.ok(link.reason.length >= 12, question.id);
  }
});

test('answer-link control is prominently placed above word translation', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(source, /data-toggle-answer-link/);
  assert.ok(source.indexOf('class="answer-link-feature"') < source.indexOf('class="question-tools"'));
  assert.doesNotMatch(source, /if \(!selected\) return;/);
  assert.match(source, /رابط سريع للحفظ/);
  assert.match(source, /احفظها هكذا/);
  assert.match(source, /المنطق/);
});
