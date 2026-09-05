import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { attempts, attemptAnswers, questions, questionOptions, userMistakes, userProgress, dailyActivity, localProgressImports, learningModels, profiles, questionReviews, auditLogs } from '../db/schema.js';

const now = () => new Date();
const identity = (user) => user?.id ?? (() => { throw new Error('Authenticated user is required'); })();

const progressScope = (userId, skill, modelId, pieceId) => and(
  eq(userProgress.userId, userId),
  eq(userProgress.skill, skill),
  modelId ? eq(userProgress.modelId, modelId) : isNull(userProgress.modelId),
  pieceId ? eq(userProgress.pieceId, pieceId) : isNull(userProgress.pieceId),
);

async function upsertProgress(db, { userId, skill, modelId = null, pieceId = null, ...values }) {
  const [existing] = await db.select({ id: userProgress.id }).from(userProgress).where(progressScope(userId, skill, modelId, pieceId)).limit(1);
  if (existing) {
    const [updated] = await db.update(userProgress).set(values).where(eq(userProgress.id, existing.id)).returning();
    return updated;
  }
  const [created] = await db.insert(userProgress).values({ userId, skill, modelId, pieceId, ...values }).returning();
  return created;
}

export async function startAttempt(user, { skill = 'reading', modelId = null, pieceId = null, mode = 'practice', totalQuestions = 0 }) {
  const db = getDb();
  const userId = identity(user);
  const [row] = await db.insert(attempts).values({ userId, skill, modelId, pieceId, mode, totalQuestions, status: 'in_progress' }).returning();
  if (modelId || pieceId) await upsertProgress(db, { userId, skill, modelId, pieceId, status: 'in_progress', progressPercent: 0, startedAt: now(), lastActivityAt: now() });
  return { id: row.id, status: row.status, mode: row.mode, totalQuestions: row.totalQuestions, startedAt: row.startedAt };
}

export async function saveAnswer(user, attemptId, { questionId, selectedAnswer = null, responseTimeMs = null, clientMutationId = null }) {
  const db = getDb();
  const userId = identity(user);
  if (clientMutationId) {
    const [existing] = await db.select().from(attemptAnswers).where(and(eq(attemptAnswers.userId, userId), eq(attemptAnswers.clientMutationId, clientMutationId))).limit(1);
    if (existing) return { id: existing.id, questionId: existing.questionId, selectedAnswer: existing.selectedAnswer, isCorrect: existing.isCorrect, duplicate: true };
  }
  const [attempt] = await db.select().from(attempts).where(and(eq(attempts.id, attemptId), eq(attempts.userId, userId))).limit(1);
  if (!attempt) throw Object.assign(new Error('Attempt not found'), { status: 404 });
  if (attempt.status !== 'in_progress') throw Object.assign(new Error('Attempt is not active'), { status: 409 });
  const [question] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
  if (!question) throw Object.assign(new Error('Question not found'), { status: 404 });
  const selectedOptionId = typeof selectedAnswer === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selectedAnswer) ? selectedAnswer : null;
  const [option] = selectedOptionId ? await db.select().from(questionOptions).where(and(eq(questionOptions.questionId, questionId), eq(questionOptions.id, selectedOptionId))).limit(1) : [];
  const selectedValue = option?.value ?? selectedAnswer;
  // Evaluation always happens on the server; unknown answers stay NULL.
  const isCorrect = question.excludeFromScoring || question.correctAnswer == null || selectedValue == null ? null : selectedValue === question.correctAnswer;
  const [answer] = await db.insert(attemptAnswers).values({ attemptId, userId, questionId, selectedAnswer: selectedValue, isCorrect, responseTimeMs, clientMutationId }).onConflictDoUpdate({ target: [attemptAnswers.attemptId, attemptAnswers.questionId], set: { selectedAnswer: selectedValue, isCorrect, responseTimeMs, clientMutationId, answeredAt: now() } }).returning();
  const [answerCount] = await db.execute(sql`SELECT COUNT(*)::int AS count FROM attempt_answers WHERE attempt_id=${attemptId}`);
  await db.update(attempts).set({ lastActivityAt: now() }).where(eq(attempts.id, attemptId));
  if (attempt.modelId || attempt.pieceId) await upsertProgress(db, { userId, skill: attempt.skill, modelId: attempt.modelId, pieceId: attempt.pieceId, status: 'in_progress', lastQuestionId: questionId, progressPercent: attempt.totalQuestions ? Math.min(99, Math.round(answerCount.count / attempt.totalQuestions * 100)) : 0, lastActivityAt: now() });
  const activityDate = now().toISOString().slice(0, 10);
  await db.insert(dailyActivity).values({ userId, activityDate, answeredCount: 1, correctCount: isCorrect === true ? 1 : 0, wrongCount: isCorrect === false ? 1 : 0, lastActivityAt: now() }).onConflictDoUpdate({ target: [dailyActivity.userId, dailyActivity.activityDate], set: { answeredCount: sql`${dailyActivity.answeredCount} + 1`, correctCount: sql`${dailyActivity.correctCount} + ${isCorrect === true ? 1 : 0}`, wrongCount: sql`${dailyActivity.wrongCount} + ${isCorrect === false ? 1 : 0}`, lastActivityAt: now() } });
  if (isCorrect === false) {
    await db.insert(userMistakes).values({ userId, questionId, firstAttemptId: attemptId, lastAttemptId: attemptId }).onConflictDoUpdate({ target: [userMistakes.userId, userMistakes.questionId], set: { mistakeCount: sql`${userMistakes.mistakeCount} + 1`, lastAttemptId: attemptId, lastSeenAt: now(), status: 'unreviewed', masteredAt: null, updatedAt: now() } });
  }
  return { id: answer.id, questionId, selectedAnswer: selectedValue, isCorrect };
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
      await tx.insert(userMistakes).values({ userId, questionId, firstAttemptId: attemptId, lastAttemptId: attemptId }).onConflictDoNothing({ target: [userMistakes.userId, userMistakes.questionId] });
    }
    const wrong = scored - correct;
    const submitted = now();
    const [result] = await tx.update(attempts).set({ status: 'submitted', submittedAt: submitted, lastActivityAt: submitted, scoredQuestions: scored, correctCount: correct, wrongCount: wrong, scorePercent: scored ? Math.round(correct / scored * 10000) / 100 : null, durationSeconds }).where(eq(attempts.id, attemptId)).returning();
    if (attempt.modelId || attempt.pieceId) await upsertProgress(tx, { userId, skill: attempt.skill, modelId: attempt.modelId, pieceId: attempt.pieceId, status: 'completed', progressPercent: 100, completedAt: submitted, lastActivityAt: submitted });
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
    COUNT(*) FILTER (WHERE status='in_progress')::int AS in_progress_attempts,
    MAX(last_activity_at) AS last_activity
    FROM attempts WHERE user_id=${userId}`);
  const [answerSummary] = await db.execute(sql`SELECT
    COUNT(*) FILTER (WHERE is_correct=true)::int AS correct_answers,
    COUNT(*) FILTER (WHERE is_correct=false)::int AS wrong_answers
    FROM attempt_answers WHERE user_id=${userId}`);
  const [mistakes] = await db.execute(sql`SELECT COUNT(*)::int AS count FROM user_mistakes WHERE user_id=${userId} AND status NOT IN ('mastered','dismissed')`);
  return { overall: { completedAttempts: summary?.completed_attempts ?? 0, correctAnswers: answerSummary?.correct_answers ?? 0, wrongAnswers: answerSummary?.wrong_answers ?? 0, inProgressAttempts: summary?.in_progress_attempts ?? 0 }, unreviewedMistakes: mistakes?.count ?? 0, lastActivity: summary?.last_activity ?? null };
}

async function upsertGrammarQuestion(db, model, question) {
  const modelNumber = Number(String(model.id).match(/\d+/)?.[0] ?? 0);
  await db.insert(learningModels).values({ sourceId: model.id, modelNumber, titleAr: model.title, titleEn: model.title, skill: 'grammar', status: 'published' }).onConflictDoNothing({ target: learningModels.sourceId });
  const [learningModel] = await db.select().from(learningModels).where(eq(learningModels.sourceId, model.id)).limit(1);
  await db.insert(questions).values({ sourceId: question.id, modelId: learningModel.id, skill: 'grammar', questionOrder: question.displayOrder, questionSource: question.prompt, questionDisplay: question.prompt, correctAnswer: Number.isInteger(question.correctIndex) ? question.options[question.correctIndex] : null, answerStatus: Number.isInteger(question.correctIndex) ? 'verified' : 'missing', excludeFromScoring: question.correctIndex === null, sourceNote: question.sourceNote ?? null }).onConflictDoNothing({ target: questions.sourceId });
  const [row] = await db.select().from(questions).where(eq(questions.sourceId, question.id)).limit(1);
  if (row) {
    const existing = await db.select({ id: questionOptions.id }).from(questionOptions).where(eq(questionOptions.questionId, row.id));
    if (!existing.length) await db.insert(questionOptions).values(question.options.map((value, optionIndex) => ({ questionId: row.id, optionOrder: optionIndex + 1, value, isCorrect: question.correctIndex === null ? null : optionIndex === question.correctIndex })));
  }
  return row;
}

export async function saveSourceAnswer(user, { skill = 'reading', questionSourceId, selectedIndex = null, selectedAnswer = null, modelSourceId = null, pieceSourceId = null, totalQuestions = 0, responseTimeMs = null, clientMutationId = null }) {
  const db = getDb();
  let resolvedTotalQuestions = totalQuestions;
  let question = (await db.select().from(questions).where(eq(questions.sourceId, questionSourceId)).limit(1))[0];
  if (!question && skill === 'grammar') {
    const { grammarModels } = await import('../../src/data/grammarModels.js');
    const model = grammarModels.find((candidate) => candidate.id === modelSourceId) ?? grammarModels.find((candidate) => candidate.questions.some((item) => item.id === questionSourceId));
    const grammarQuestion = model?.questions.find((candidate) => candidate.id === questionSourceId);
    if (model && grammarQuestion) {
      question = await upsertGrammarQuestion(db, model, grammarQuestion);
      resolvedTotalQuestions ||= model.questions.length;
    }
  }
  if (!question) throw Object.assign(new Error('Question not found'), { status: 404 });
  const selected = selectedIndex === null || selectedIndex === undefined
    ? selectedAnswer
    : (await db.select().from(questionOptions).where(and(eq(questionOptions.questionId, question.id), eq(questionOptions.optionOrder, selectedIndex + 1))).limit(1))[0]?.value ?? null;
  let [attempt] = await db.select().from(attempts).where(and(eq(attempts.userId, identity(user)), eq(attempts.skill, skill), question.modelId ? eq(attempts.modelId, question.modelId) : sql`TRUE`, question.pieceId ? eq(attempts.pieceId, question.pieceId) : sql`TRUE`, eq(attempts.status, 'in_progress'))).orderBy(desc(attempts.lastActivityAt)).limit(1);
  if (!attempt) {
    [attempt] = await db.insert(attempts).values({ userId: identity(user), skill, modelId: question.modelId, pieceId: question.pieceId, mode: 'practice', totalQuestions: resolvedTotalQuestions || 0, status: 'in_progress' }).returning();
    if (question.modelId || question.pieceId) await upsertProgress(db, { userId: identity(user), skill, modelId: question.modelId, pieceId: question.pieceId, status: 'in_progress', progressPercent: 0, startedAt: now(), lastActivityAt: now() });
  } else if (!attempt.totalQuestions && resolvedTotalQuestions) {
    [attempt] = await db.update(attempts).set({ totalQuestions: resolvedTotalQuestions }).where(eq(attempts.id, attempt.id)).returning();
  }
  const answer = await saveAnswer(user, attempt.id, { questionId: question.id, selectedAnswer: selected, responseTimeMs, clientMutationId });
  return { ...answer, attemptId: attempt.id, sourceQuestionId: questionSourceId };
}

function mapAttempt(row) {
  return {
    id: row.id,
    skill: row.skill,
    mode: row.mode,
    status: row.status,
    modelSourceId: row.model_source_id,
    pieceSourceId: row.piece_source_id,
    totalQuestions: row.total_questions,
    scoredQuestions: row.scored_questions,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    scorePercent: row.score_percent,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    lastActivityAt: row.last_activity_at,
    answers: row.answers ?? [],
  };
}

export async function getLearningState(user) {
  const db = getDb();
  const userId = identity(user);
  const attemptRows = await db.execute(sql`SELECT a.id, a.skill, a.mode, a.status, a.total_questions, a.scored_questions,
    a.correct_count, a.wrong_count, a.score_percent, a.started_at, a.submitted_at, a.last_activity_at,
    lm.source_id AS model_source_id, lp.source_id AS piece_source_id,
    COALESCE(json_agg(json_build_object(
      'questionId', q.source_id,
      'selectedAnswer', aa.selected_answer,
      'isCorrect', aa.is_correct,
      'answeredAt', aa.answered_at,
      'responseTimeMs', aa.response_time_ms
    ) ORDER BY aa.answered_at) FILTER (WHERE aa.id IS NOT NULL), '[]') AS answers
    FROM attempts a
    LEFT JOIN learning_models lm ON lm.id=a.model_id
    LEFT JOIN learning_pieces lp ON lp.id=a.piece_id
    LEFT JOIN attempt_answers aa ON aa.attempt_id=a.id AND aa.user_id=${userId}
    LEFT JOIN questions q ON q.id=aa.question_id
    WHERE a.user_id=${userId}
    GROUP BY a.id, lm.source_id, lp.source_id
    ORDER BY a.last_activity_at DESC`);
  const progressRows = await db.execute(sql`SELECT up.id, up.skill, up.status, up.progress_percent, up.started_at,
    up.last_activity_at, up.completed_at, lm.source_id AS model_source_id, lp.source_id AS piece_source_id,
    q.source_id AS last_question_id
    FROM user_progress up
    LEFT JOIN learning_models lm ON lm.id=up.model_id
    LEFT JOIN learning_pieces lp ON lp.id=up.piece_id
    LEFT JOIN questions q ON q.id=up.last_question_id
    WHERE up.user_id=${userId}
    ORDER BY up.last_activity_at DESC`);
  const allAttempts = attemptRows.map(mapAttempt);
  const activeAttempts = allAttempts.filter((attempt) => attempt.status === 'in_progress');
  const recentAttempts = allAttempts.filter((attempt) => attempt.status === 'submitted').slice(0, 10);
  const mistakes = await listMistakes(user);
  const [mistakeVersion] = await db.execute(sql`SELECT MAX(updated_at) AS updated_at FROM user_mistakes WHERE user_id=${userId}`);
  const lastActivity = [
    ...allAttempts.map((attempt) => attempt.lastActivityAt),
    ...progressRows.map((item) => item.last_activity_at),
    ...mistakes.map((mistake) => mistake.updatedAt ?? mistake.lastSeenAt),
    mistakeVersion?.updated_at,
  ].filter(Boolean).map((value) => new Date(value)).sort((a, b) => b - a)[0] ?? null;
  return {
    progress: progressRows.map((row) => ({ id: row.id, skill: row.skill, status: row.status, progressPercent: row.progress_percent, modelSourceId: row.model_source_id, pieceSourceId: row.piece_source_id, lastQuestionId: row.last_question_id, startedAt: row.started_at, lastActivityAt: row.last_activity_at, completedAt: row.completed_at })),
    activeAttempts,
    recentAttempts,
    mistakes,
    unreviewedMistakes: mistakes.length,
    lastActivity,
    resume: activeAttempts[0] ?? null,
    updatedAt: lastActivity ? new Date(lastActivity).toISOString() : new Date(0).toISOString(),
  };
}

export async function importLocalLearningState(user, records, importKey = 'step-reading-progress-v2') {
  const db = getDb();
  const userId = identity(user);
  const [existingImport] = await db.select().from(localProgressImports).where(and(eq(localProgressImports.userId, userId), eq(localProgressImports.importKey, importKey))).limit(1);
  if (existingImport) return { imported: 0, skipped: records.length, alreadyImported: true, state: await getLearningState(user) };
  const [existingAnswers] = await db.execute(sql`SELECT COUNT(*)::int AS count FROM attempt_answers WHERE user_id=${userId}`);
  if (existingAnswers?.count) {
    await db.insert(localProgressImports).values({ userId, importKey, answerCount: 0 }).onConflictDoNothing();
    return { imported: 0, skipped: records.length, alreadyImported: false, reason: 'server-state-exists', state: await getLearningState(user) };
  }
  const [claim] = await db.insert(localProgressImports).values({ userId, importKey, answerCount: 0 }).onConflictDoNothing().returning();
  if (!claim) return { imported: 0, skipped: records.length, alreadyImported: true, state: await getLearningState(user) };
  let imported = 0;
  let skipped = 0;
  const attemptsToSubmit = new Set();
  for (const record of records) {
    try {
      const result = await saveSourceAnswer(user, record);
      imported += result.duplicate ? 0 : 1;
      if (record.completed && result.attemptId) attemptsToSubmit.add(result.attemptId);
    } catch (error) {
      if ([404, 422].includes(error?.status)) skipped += 1;
      else throw error;
    }
  }
  for (const attemptId of attemptsToSubmit) {
    try { await submitAttempt(user, attemptId, {}); } catch (error) { if (error?.status !== 409) throw error; }
  }
  await db.update(localProgressImports).set({ answerCount: imported }).where(eq(localProgressImports.id, claim.id));
  return { imported, skipped, alreadyImported: false, state: await getLearningState(user) };
}

function mapMistake(row) {
  return { id: row.id, skill: row.skill, questionId: row.question_id, questionSourceId: row.question_source_id, questionText: row.question_display || row.question_source, options: row.options ?? [], selectedAnswer: row.selected_answer, correctAnswer: row.correct_answer, explanation: row.source_note, audioUrl: row.audio_url, mistakeCount: row.mistake_count, lastSeenAt: row.last_seen_at, updatedAt: row.updated_at, status: row.status };
}

export async function listMistakes(user, { skill = null } = {}) {
  const userId = identity(user);
  const db = getDb();
  const rows = await db.execute(sql`SELECT um.id, um.question_id, q.source_id AS question_source_id, um.mistake_count, um.last_seen_at, um.updated_at, um.status, q.skill, q.question_display, q.question_source, q.correct_answer, q.source_note, p.audio_url,
    latest.selected_answer, COALESCE((SELECT json_agg(json_build_object('id', qo.id, 'value', qo.value, 'optionOrder', qo.option_order) ORDER BY qo.option_order) FROM question_options qo WHERE qo.question_id=q.id), '[]') AS options
    FROM user_mistakes um JOIN questions q ON q.id=um.question_id LEFT JOIN learning_pieces p ON p.id=q.piece_id
    LEFT JOIN LATERAL (SELECT aa.selected_answer FROM attempt_answers aa WHERE aa.question_id=q.id AND aa.user_id=${userId} ORDER BY aa.answered_at DESC LIMIT 1) latest ON TRUE
    WHERE um.user_id=${userId} AND um.status NOT IN ('mastered', 'dismissed') ${skill ? sql`AND q.skill=${skill}` : sql``}
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
  const [row] = await getDb().update(userMistakes).set({ status: 'dismissed', updatedAt: now() }).where(and(eq(userMistakes.id, mistakeId), eq(userMistakes.userId, identity(user)))).returning();
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
