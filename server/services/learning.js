import { eq, and, desc, sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { attempts, attemptAnswers, questions, questionOptions, userMistakes, userProgress, dailyActivity, learningModels, learningPieces, profiles, questionReviews, auditLogs } from '../db/schema.js';

const now = () => new Date();
const identity = (user) => user?.id ?? (() => { throw new Error('Authenticated user is required'); })();

export async function startAttempt(user, { skill = 'reading', modelId = null, pieceId = null, mode = 'practice', totalQuestions = 0 }) {
  const db = getDb();
  const userId = identity(user);
  const [row] = await db.insert(attempts).values({ userId, skill, modelId, pieceId, mode, totalQuestions, status: 'in_progress' }).returning();
  if (pieceId) await db.insert(userProgress).values({ userId, skill, modelId, pieceId, status: 'in_progress', progressPercent: 0, startedAt: now(), lastActivityAt: now() }).onConflictDoUpdate({ target: [userProgress.userId, userProgress.skill, userProgress.modelId, userProgress.pieceId], set: { status: 'in_progress', lastActivityAt: now() } });
  return { id: row.id, status: row.status, mode: row.mode, totalQuestions: row.totalQuestions, startedAt: row.startedAt };
}

export async function saveAnswer(user, attemptId, { questionId, selectedAnswer = null, responseTimeMs = null }) {
  const db = getDb();
  const userId = identity(user);
  const [attempt] = await db.select().from(attempts).where(and(eq(attempts.id, attemptId), eq(attempts.userId, userId))).limit(1);
  if (!attempt) throw Object.assign(new Error('Attempt not found'), { status: 404 });
  if (attempt.status !== 'in_progress') throw Object.assign(new Error('Attempt is not active'), { status: 409 });
  const [question] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
  if (!question) throw Object.assign(new Error('Question not found'), { status: 404 });
  const [option] = selectedAnswer ? await db.select().from(questionOptions).where(and(eq(questionOptions.questionId, questionId), eq(questionOptions.id, selectedAnswer))).limit(1) : [];
  const selectedValue = option?.value ?? selectedAnswer;
  // Evaluation always happens on the server; unknown answers stay NULL.
  const isCorrect = question.excludeFromScoring || question.correctAnswer == null || selectedValue == null ? null : selectedValue === question.correctAnswer;
  const [answer] = await db.insert(attemptAnswers).values({ attemptId, userId, questionId, selectedAnswer: selectedValue, isCorrect, responseTimeMs }).onConflictDoUpdate({ target: [attemptAnswers.attemptId, attemptAnswers.questionId], set: { selectedAnswer: selectedValue, isCorrect, responseTimeMs, answeredAt: now() } }).returning();
  const [answerCount] = await db.execute(sql`SELECT COUNT(*)::int AS count FROM attempt_answers WHERE attempt_id=${attemptId}`);
  await db.update(attempts).set({ lastActivityAt: now() }).where(eq(attempts.id, attemptId));
  if (attempt.pieceId) await db.update(userProgress).set({ lastQuestionId: questionId, progressPercent: attempt.totalQuestions ? Math.min(99, Math.round(answerCount.count / attempt.totalQuestions * 100)) : 0, lastActivityAt: now() }).where(and(eq(userProgress.userId, userId), eq(userProgress.pieceId, attempt.pieceId)));
  const activityDate = now().toISOString().slice(0, 10);
  await db.insert(dailyActivity).values({ userId, activityDate, answeredCount: 1, correctCount: isCorrect === true ? 1 : 0, wrongCount: isCorrect === false ? 1 : 0, lastActivityAt: now() }).onConflictDoUpdate({ target: [dailyActivity.userId, dailyActivity.activityDate], set: { answeredCount: sql`${dailyActivity.answeredCount} + 1`, correctCount: sql`${dailyActivity.correctCount} + ${isCorrect === true ? 1 : 0}`, wrongCount: sql`${dailyActivity.wrongCount} + ${isCorrect === false ? 1 : 0}`, lastActivityAt: now() } });
  if (isCorrect === false) {
    await db.insert(userMistakes).values({ userId, questionId, firstAttemptId: attemptId, lastAttemptId: attemptId }).onConflictDoUpdate({ target: [userMistakes.userId, userMistakes.questionId], set: { mistakeCount: sql`${userMistakes.mistakeCount} + 1`, lastAttemptId: attemptId, lastSeenAt: now(), status: 'unreviewed', masteredAt: null } });
  }
  return { id: answer.id, questionId, selectedAnswer, isCorrect };
}

export async function submitAttempt(user, attemptId, { durationSeconds = null } = {}) {
  const db = getDb();
  const userId = identity(user);
  return db.transaction(async (tx) => {
    const [attempt] = await tx.select().from(attempts).where(and(eq(attempts.id, attemptId), eq(attempts.userId, userId))).limit(1);
    if (!attempt) throw Object.assign(new Error('Attempt not found'), { status: 404 });
    if (attempt.status !== 'in_progress') throw Object.assign(new Error('Attempt is not active'), { status: 409 });
    const rows = await tx.execute(sql`SELECT aa.question_id, aa.selected_answer, q.correct_answer, q.exclude_from_scoring
      FROM attempt_answers aa JOIN questions q ON q.id=aa.question_id WHERE aa.attempt_id=${attemptId} AND aa.user_id=${userId}`);
    let scored = 0, correct = 0;
    const mistakes = [];
    for (const row of rows) {
      const evaluable = !row.exclude_from_scoring && row.correct_answer != null;
      const isCorrect = evaluable && row.selected_answer != null ? row.selected_answer === row.correct_answer : null;
      await tx.update(attemptAnswers).set({ isCorrect }).where(and(eq(attemptAnswers.attemptId, attemptId), eq(attemptAnswers.questionId, row.question_id)));
      if (evaluable) { scored++; if (isCorrect) correct++; else if (row.selected_answer != null) mistakes.push(row.question_id); }
    }
    for (const questionId of mistakes) {
      await tx.insert(userMistakes).values({ userId, questionId, firstAttemptId: attemptId, lastAttemptId: attemptId }).onConflictDoUpdate({ target: [userMistakes.userId, userMistakes.questionId], set: { mistakeCount: sql`${userMistakes.mistakeCount} + 1`, lastAttemptId: attemptId, lastSeenAt: now(), status: 'unreviewed' } });
    }
    const wrong = scored - correct;
    const submitted = now();
    const [result] = await tx.update(attempts).set({ status: 'submitted', submittedAt: submitted, lastActivityAt: submitted, scoredQuestions: scored, correctCount: correct, wrongCount: wrong, scorePercent: scored ? Math.round(correct / scored * 10000) / 100 : null, durationSeconds }).where(eq(attempts.id, attemptId)).returning();
    if (attempt.pieceId) await tx.insert(userProgress).values({ userId, skill: attempt.skill, modelId: attempt.modelId, pieceId: attempt.pieceId, status: 'completed', progressPercent: 100, completedAt: submitted, lastActivityAt: submitted }).onConflictDoUpdate({ target: [userProgress.userId, userProgress.skill, userProgress.modelId, userProgress.pieceId], set: { status: 'completed', progressPercent: 100, completedAt: submitted, lastActivityAt: submitted } });
    return { attemptId, scorePercent: result.scorePercent, correct, wrong, scoredQuestions: scored, unscored: Math.max(0, result.totalQuestions - scored), durationSeconds, mistakes };
  });
}

export async function getResumeAttempt(user, modelId) {
  const db = getDb();
  const [row] = await db.select().from(attempts).where(and(eq(attempts.userId, identity(user)), eq(attempts.modelId, modelId), eq(attempts.status, 'in_progress'))).orderBy(desc(attempts.lastActivityAt)).limit(1);
  return row ?? null;
}

export async function getDashboard(user) {
  const db = getDb(); const userId = identity(user);
  const [summary] = await db.execute(sql`SELECT
    COUNT(*) FILTER (WHERE status='submitted')::int AS completed_attempts,
    COALESCE(SUM(correct_count),0)::int AS correct_answers,
    COALESCE(SUM(wrong_count),0)::int AS wrong_answers,
    COUNT(*) FILTER (WHERE status='in_progress')::int AS in_progress_attempts,
    MAX(last_activity_at) AS last_activity
    FROM attempts WHERE user_id=${userId}`);
  const [mistakes] = await db.execute(sql`SELECT COUNT(*)::int AS count FROM user_mistakes WHERE user_id=${userId} AND status <> 'mastered'`);
  return { overall: { completedAttempts: summary?.completed_attempts ?? 0, correctAnswers: summary?.correct_answers ?? 0, wrongAnswers: summary?.wrong_answers ?? 0, inProgressAttempts: summary?.in_progress_attempts ?? 0 }, unreviewedMistakes: mistakes?.count ?? 0, lastActivity: summary?.last_activity ?? null };
}

async function upsertGrammarQuestion(db, model, question) {
  const modelNumber = Number(String(model.id).match(/\d+/)?.[0] ?? 0);
  await db.insert(learningModels).values({ sourceId: model.id, modelNumber, titleAr: model.title, titleEn: model.title, skill: 'grammar', status: 'published' }).onConflictDoNothing({ target: learningModels.sourceId });
  const [learningModel] = await db.select().from(learningModels).where(eq(learningModels.sourceId, model.id)).limit(1);
  await db.insert(questions).values({ sourceId: question.id, modelId: learningModel.id, skill: 'grammar', questionOrder: question.displayOrder, questionSource: question.prompt, questionDisplay: question.prompt, correctAnswer: Number.isInteger(question.correctIndex) ? question.options[question.correctIndex] : null, answerStatus: Number.isInteger(question.correctIndex) ? 'verified' : 'missing', excludeFromScoring: question.correctIndex === null, sourceNote: question.sourceNote ?? null }).onConflictDoNothing({ target: questions.sourceId });
  const [row] = await db.select().from(questions).where(eq(questions.sourceId, question.id)).limit(1);
  if (row) {
    const existing = await db.select({ id: questionOptions.id }).from(questionOptions).where(eq(questionOptions.questionId, row.id));
    if (!existing.length) await db.insert(questionOptions).values(question.options.map((value, optionOrder) => ({ questionId: row.id, optionOrder, value, isCorrect: question.correctIndex === null ? null : optionOrder === question.correctIndex })));
  }
  return row;
}

export async function saveSourceAnswer(user, { skill = 'reading', questionSourceId, selectedIndex = null, selectedAnswer = null, modelSourceId = null, pieceSourceId = null, totalQuestions = 0, responseTimeMs = null }) {
  const db = getDb();
  let question = (await db.select().from(questions).where(eq(questions.sourceId, questionSourceId)).limit(1))[0];
  if (!question && skill === 'grammar') {
    const { grammarModels } = await import('../../src/data/grammarModels.js');
    const model = grammarModels.find((candidate) => candidate.id === modelSourceId) ?? grammarModels.find((candidate) => candidate.questions.some((item) => item.id === questionSourceId));
    const grammarQuestion = model?.questions.find((candidate) => candidate.id === questionSourceId);
    if (model && grammarQuestion) question = await upsertGrammarQuestion(db, model, grammarQuestion);
  }
  if (!question) throw Object.assign(new Error('Question not found'), { status: 404 });
  const selected = selectedIndex === null || selectedIndex === undefined
    ? selectedAnswer
    : (await db.select().from(questionOptions).where(and(eq(questionOptions.questionId, question.id), eq(questionOptions.optionOrder, selectedIndex))).limit(1))[0]?.value ?? null;
  let [attempt] = await db.select().from(attempts).where(and(eq(attempts.userId, identity(user)), eq(attempts.skill, skill), question.modelId ? eq(attempts.modelId, question.modelId) : sql`TRUE`, question.pieceId ? eq(attempts.pieceId, question.pieceId) : sql`TRUE`, eq(attempts.status, 'in_progress'))).orderBy(desc(attempts.lastActivityAt)).limit(1);
  if (!attempt) {
    [attempt] = await db.insert(attempts).values({ userId: identity(user), skill, modelId: question.modelId, pieceId: question.pieceId, mode: 'practice', totalQuestions: totalQuestions || 0, status: 'in_progress' }).returning();
    if (question.pieceId) await db.insert(userProgress).values({ userId: identity(user), skill, modelId: question.modelId, pieceId: question.pieceId, status: 'in_progress', progressPercent: 0, startedAt: now(), lastActivityAt: now() }).onConflictDoNothing();
  }
  const answer = await saveAnswer(user, attempt.id, { questionId: question.id, selectedAnswer: selected, responseTimeMs });
  return { ...answer, attemptId: attempt.id, sourceQuestionId: questionSourceId };
}

function mapMistake(row) {
  return { id: row.id, skill: row.skill, questionId: row.question_id, questionText: row.question_display || row.question_source, options: row.options ?? [], selectedAnswer: row.selected_answer, correctAnswer: row.correct_answer, explanation: row.source_note, audioUrl: row.audio_url, mistakeCount: row.mistake_count, lastSeenAt: row.last_seen_at, status: row.status };
}

export async function listMistakes(user, { skill = null } = {}) {
  const userId = identity(user);
  const db = getDb();
  const rows = await db.execute(sql`SELECT um.id, um.question_id, um.mistake_count, um.last_seen_at, um.status, q.skill, q.question_display, q.question_source, q.correct_answer, q.source_note, p.audio_url,
    latest.selected_answer, COALESCE((SELECT json_agg(json_build_object('id', qo.id, 'value', qo.value, 'optionOrder', qo.option_order) ORDER BY qo.option_order) FROM question_options qo WHERE qo.question_id=q.id), '[]') AS options
    FROM user_mistakes um JOIN questions q ON q.id=um.question_id LEFT JOIN learning_pieces p ON p.id=q.piece_id
    LEFT JOIN LATERAL (SELECT aa.selected_answer FROM attempt_answers aa WHERE aa.question_id=q.id AND aa.user_id=${userId} ORDER BY aa.answered_at DESC LIMIT 1) latest ON TRUE
    WHERE um.user_id=${userId} AND um.status <> 'dismissed' ${skill ? sql`AND q.skill=${skill}` : sql``}
    ORDER BY um.last_seen_at DESC`);
  return rows.map(mapMistake);
}

export async function getMistake(user, mistakeId) {
  const rows = await listMistakes(user);
  const match = rows.find((mistake) => mistake.id === mistakeId);
  if (!match) throw Object.assign(new Error('Mistake not found'), { status: 404 });
  return match;
}

export async function dismissMistake(user, mistakeId) {
  const [row] = await getDb().update(userMistakes).set({ status: 'dismissed' }).where(and(eq(userMistakes.id, mistakeId), eq(userMistakes.userId, identity(user)))).returning();
  if (!row) throw Object.assign(new Error('Mistake not found'), { status: 404 });
  return { id: row.id, status: row.status };
}

export async function approveQuestion(user, questionId, { proposedAnswer, adminNote = null, hadOptionsInSource = null }) {
  const db = getDb(); const userId = identity(user);
  return db.transaction(async (tx) => {
    const [question] = await tx.select().from(questions).where(eq(questions.id, questionId)).limit(1);
    if (!question) throw Object.assign(new Error('Question not found'), { status: 404 });
    const [updated] = await tx.update(questions).set({ correctAnswer: proposedAnswer?.trim() || null, answerStatus: proposedAnswer?.trim() ? 'verified' : 'needs_review', excludeFromScoring: !proposedAnswer?.trim(), updatedAt: now() }).where(eq(questions.id, questionId)).returning();
    await tx.insert(questionReviews).values({ questionId, reviewerUserId: userId, proposedAnswer: proposedAnswer?.trim() || null, adminNote, hadOptionsInSource, status: proposedAnswer?.trim() ? 'approved' : 'skipped', approvedAt: proposedAnswer?.trim() ? now() : null });
    await tx.insert(auditLogs).values({ actorUserId: userId, action: proposedAnswer?.trim() ? 'QUESTION_ANSWER_APPROVED' : 'QUESTION_REVIEW_SKIPPED', entityType: 'question', entityId: questionId, metadata: { hadOptionsInSource } });
    return updated;
  });
}

export async function listQuestionsForReview(user, { status = 'needs_review', limit = 50 } = {}) {
  identity(user);
  const db = getDb();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  return db.execute(sql`SELECT q.id, q.source_id, q.question_display, q.question_source, q.correct_answer,
    q.answer_status, q.exclude_from_scoring, q.source_note, p.title_en AS piece_title_en,
    COALESCE(json_agg(json_build_object('id', qo.id, 'optionOrder', qo.option_order, 'value', qo.value) ORDER BY qo.option_order) FILTER (WHERE qo.id IS NOT NULL), '[]') AS options
    FROM questions q LEFT JOIN learning_pieces p ON p.id=q.piece_id LEFT JOIN question_options qo ON qo.question_id=q.id
    WHERE q.answer_status=${status} GROUP BY q.id, p.title_en ORDER BY q.created_at ASC LIMIT ${safeLimit}`);
}
