export function evaluateAnswer(question, selectedAnswer) {
  if (!question || question.excludeFromScoring || question.correctAnswer == null || selectedAnswer == null) return null;
  return selectedAnswer === question.correctAnswer;
}

export function summarizeAttempt(questions, answers) {
  let scoredQuestions = 0, correctCount = 0, wrongCount = 0;
  for (const question of questions) {
    const result = evaluateAnswer(question, answers.get(question.id) ?? null);
    if (result === null) continue;
    scoredQuestions++;
    if (result) correctCount++; else wrongCount++;
  }
  return { scoredQuestions, correctCount, wrongCount, unscored: questions.length - scoredQuestions, scorePercent: scoredQuestions ? Math.round(correctCount / scoredQuestions * 10000) / 100 : null };
}

export function publicExamQuestion(question, options = []) {
  return { id: question.id, question: question.questionDisplay ?? question.questionSource, options: options.map(({ id, optionOrder, value }) => ({ id, optionOrder, value })) };
}

