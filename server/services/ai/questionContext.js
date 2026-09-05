import { readdir, readFile } from 'node:fs/promises';
import { grammarModels } from '../../../src/data/grammarModels.js';

const readingModelsDirectory = new URL('../../../src/data/reading/models/', import.meta.url);
let readingQuestionIndexPromise;

function optionId(questionId, index, skill) {
  return `${questionId}-o${skill === 'grammar' ? index : index + 1}`;
}

async function readingQuestionIndex() {
  if (!readingQuestionIndexPromise) {
    readingQuestionIndexPromise = (async () => {
      const files = (await readdir(readingModelsDirectory)).filter((name) => /^model-\d+\.json$/.test(name));
      const index = new Map();
      for (const file of files) {
        const model = JSON.parse(await readFile(new URL(file, readingModelsDirectory), 'utf8'));
        for (const piece of model.pieces ?? []) {
          for (const question of piece.questions ?? []) index.set(question.id, { model, piece, question });
        }
      }
      return index;
    })();
  }
  return readingQuestionIndexPromise;
}

function publicOptions(questionId, options, skill) {
  return (options ?? []).map((text, index) => ({ id: optionId(questionId, index, skill), text }));
}

function withAnswerState(base, selectedOptionId, correctAnswer, humanNote) {
  const selectedOption = base.options.find((option) => option.id === selectedOptionId) ?? null;
  const answered = Boolean(selectedOption);
  const canRevealAnswer = answered && Boolean(correctAnswer);
  return {
    ...base,
    isAnswered: answered,
    selectedOptionId: answered ? selectedOption.id : null,
    selectedOptionText: answered ? selectedOption.text : null,
    correctAnswer: canRevealAnswer ? correctAnswer : null,
    humanNote: canRevealAnswer ? humanNote || null : null,
  };
}

export async function resolveQuestionContext(questionId, selectedOptionId = null) {
  for (const model of grammarModels) {
    const question = model.questions.find((candidate) => candidate.id === questionId);
    if (!question) continue;
    const options = publicOptions(question.id, question.options, 'grammar');
    const correctAnswer = Number.isInteger(question.correctIndex) ? options[question.correctIndex]?.text ?? null : null;
    return withAnswerState({
      questionId,
      skill: 'grammar',
      modelId: model.id,
      question: question.prompt,
      options,
      grammarType: question.categoryLabel || question.category || null,
      passage: null,
    }, selectedOptionId, correctAnswer, question.sourceNote);
  }

  const match = (await readingQuestionIndex()).get(questionId);
  if (match) {
    const { model, piece, question } = match;
    const verifiedAnswer = question.answerStatus === 'verified' ? question.correctAnswer : null;
    return withAnswerState({
      questionId,
      skill: 'reading',
      modelId: `reading-${String(model.modelNumber).padStart(2, '0')}`,
      question: question.questionDisplay ?? question.questionSource,
      options: publicOptions(question.id, question.options, 'reading'),
      grammarType: null,
      passage: piece.passage ? String(piece.passage).slice(0, 12_000) : null,
    }, selectedOptionId, verifiedAnswer, question.sourceNote);
  }

  const error = new Error('QUESTION_NOT_FOUND');
  error.code = 'QUESTION_NOT_FOUND';
  error.status = 404;
  throw error;
}
