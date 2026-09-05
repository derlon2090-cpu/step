/*
 * Opt-in end-to-end acceptance test. Run only against a disposable database:
 *   $env:LEARNING_TEST_DATABASE_URL = 'postgres://...'; node tests/cross-device-learning.integration.mjs
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

const databaseURL = process.env.LEARNING_TEST_DATABASE_URL;
if (!databaseURL) {
  console.log('Learning integration skipped: set LEARNING_TEST_DATABASE_URL to a disposable test database.');
  process.exit(0);
}
process.env.DATABASE_URL = databaseURL;
process.env.BETTER_AUTH_SECRET ??= 'learning-integration-test-secret-learning-integration';
process.env.BETTER_AUTH_API_KEY ??= 'learning-integration-test';
process.env.BETTER_AUTH_URL ??= 'http://localhost:0';
process.env.NODE_ENV = 'test';

const { server } = await import('../server/index.js');
const { closeDb } = await import('../server/db/index.js');
const sql = postgres(databaseURL, { prepare: false, max: 1 });
const suffix = randomUUID().slice(0, 8);
const email = `learning-${suffix}@example.test`;
const migrationEmail = `learning-migration-${suffix}@example.test`;
const password = 'correct horse battery staple';

function client() {
  let cookie = '';
  return async (path, { method = 'GET', body } = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers: { accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';', 1)[0];
    return { response, body: await response.json() };
  };
}

const deviceA = client();
const deviceB = client();
const migrationDevice = client();
const seeded = [];

async function seedQuestion(skill, number) {
  const modelSource = `test-${skill}-model-${suffix}-${number}`;
  const pieceSource = `test-${skill}-piece-${suffix}-${number}`;
  const questionSource = `test-${skill}-question-${suffix}-${number}`;
  const [model] = await sql`INSERT INTO learning_models (source_id, model_number, title_ar, skill) VALUES (${modelSource}, ${number}, ${skill}, ${skill}) RETURNING id`;
  const [piece] = await sql`INSERT INTO learning_pieces (source_id, model_id, piece_order, title_ar) VALUES (${pieceSource}, ${model.id}, 1, ${skill}) RETURNING id`;
  const [question] = await sql`INSERT INTO questions (source_id, piece_id, model_id, skill, question_order, question_source, question_display, correct_answer, answer_status, exclude_from_scoring) VALUES (${questionSource}, ${piece.id}, ${model.id}, ${skill}, 1, ${`${skill} acceptance question ${number}`}, ${`${skill} acceptance question ${number}`}, 'correct', 'verified', false) RETURNING id`;
  await sql`INSERT INTO question_options (question_id, option_order, value, is_correct) VALUES (${question.id}, 1, 'wrong', false), (${question.id}, 2, 'correct', true)`;
  seeded.push({ modelId: model.id, pieceId: piece.id, questionId: question.id });
  return { skill, questionSource, modelSource };
}

await new Promise((resolve) => server.listen(0, resolve));
try {
  const reading = await seedQuestion('reading', 1);
  const grammarOne = await seedQuestion('grammar', 2);
  const grammarTwo = await seedQuestion('grammar', 3);
  const listening = await seedQuestion('listening', 4);

  const signup = await deviceA('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Learning Test', email, password } });
  assert.equal(signup.response.status, 200);
  const signinB = await deviceB('/api/auth/sign-in/email', { method: 'POST', body: { email, password } });
  assert.equal(signinB.response.status, 200);

  const mutationIds = new Map();
  for (const item of [reading, grammarOne, grammarTwo, listening]) {
    const clientMutationId = randomUUID();
    mutationIds.set(item.questionSource, clientMutationId);
    const answer = await deviceA('/api/learning/answer', { method: 'POST', body: { skill: item.skill, questionSourceId: item.questionSource, modelSourceId: item.modelSource, selectedIndex: 0, totalQuestions: 1, clientMutationId } });
    assert.equal(answer.response.status, 200);
    assert.equal(answer.body.isCorrect, false);
  }

  const duplicate = await deviceA('/api/learning/answer', { method: 'POST', body: { skill: reading.skill, questionSourceId: reading.questionSource, modelSourceId: reading.modelSource, selectedIndex: 0, totalQuestions: 1, clientMutationId: mutationIds.get(reading.questionSource) } });
  assert.equal(duplicate.response.status, 200);
  assert.equal(duplicate.body.duplicate, true);

  const learningStateB = await deviceB('/api/me/learning-state');
  assert.equal(learningStateB.response.status, 200);
  assert.equal(learningStateB.body.activeAttempts.length, 4);
  assert.equal(learningStateB.body.progress.length, 4);
  assert.equal(learningStateB.body.activeAttempts.flatMap((attempt) => attempt.answers).length, 4);
  assert.equal(learningStateB.body.resume.answers.length, 1);

  const onDeviceB = await deviceB('/api/me/mistakes');
  assert.equal(onDeviceB.response.status, 200);
  const counts = onDeviceB.body.mistakes.reduce((groups, mistake) => {
    (groups[mistake.skill] ??= []).push(mistake);
    return groups;
  }, {});
  assert.equal(counts.reading.length, 1);
  assert.equal(counts.grammar.length, 2);
  assert.equal(counts.listening.length, 1);
  assert.equal(onDeviceB.body.mistakes.length, 4);

  const dismissed = counts.grammar[0];
  const removal = await deviceB(`/api/me/mistakes/${dismissed.id}`, { method: 'DELETE' });
  assert.equal(removal.body.status, 'dismissed');
  const afterRemoval = await deviceA('/api/me/mistakes');
  assert.equal(afterRemoval.body.mistakes.length, 3);
  assert.equal(afterRemoval.body.mistakes.filter((mistake) => mistake.skill === 'grammar').length, 1);
  const changedAfterRemoval = await deviceA(`/api/me/learning-state?since=${encodeURIComponent(learningStateB.body.updatedAt)}`);
  assert.notEqual(changedAfterRemoval.body.unchanged, true);
  assert.equal(changedAfterRemoval.body.unreviewedMistakes, 3);

  const reopened = await deviceA('/api/learning/answer', { method: 'POST', body: { skill: 'grammar', questionSourceId: counts.grammar[0].questionId === seeded[1].questionId ? grammarOne.questionSource : grammarTwo.questionSource, selectedIndex: 0, totalQuestions: 1, clientMutationId: randomUUID() } });
  assert.equal(reopened.body.isCorrect, false);
  const finalState = await deviceB('/api/me/mistakes');
  assert.equal(finalState.body.mistakes.length, 4);
  assert.equal(finalState.body.mistakes.filter((mistake) => mistake.skill === 'grammar').length, 2);
  const changedAfterReopen = await deviceB(`/api/me/learning-state?since=${encodeURIComponent(changedAfterRemoval.body.updatedAt)}`);
  assert.notEqual(changedAfterReopen.body.unchanged, true);
  assert.equal(changedAfterReopen.body.unreviewedMistakes, 4);

  const [activity] = await sql`SELECT answered_count, wrong_count FROM daily_activity WHERE user_id=${signup.body.user.id}`;
  assert.equal(activity.answered_count, 5);
  assert.equal(activity.wrong_count, 5);
  const progress = await sql`SELECT skill, progress_percent, last_question_id FROM user_progress WHERE user_id=${signup.body.user.id}`;
  assert.equal(progress.length, 4);
  assert.equal(progress.every((row) => row.progress_percent === 99 && row.last_question_id), true);

  const migrationSignup = await migrationDevice('/api/auth/sign-up/email', { method: 'POST', body: { name: 'Migration Test', email: migrationEmail, password } });
  assert.equal(migrationSignup.response.status, 200);
  const imported = await migrationDevice('/api/me/learning-state', { method: 'POST', body: { importKey: 'step-reading-progress-v2', records: [{ ...reading, questionSourceId: reading.questionSource, modelSourceId: reading.modelSource, selectedIndex: 1, totalQuestions: 1, completed: true, clientMutationId: randomUUID() }] } });
  assert.equal(imported.response.status, 200);
  assert.equal(imported.body.imported, 1);
  assert.equal(imported.body.state.recentAttempts.length, 1);
  assert.equal(imported.body.state.progress[0].progressPercent, 100);
  const importedAgain = await migrationDevice('/api/me/learning-state', { method: 'POST', body: { importKey: 'step-reading-progress-v2', records: [] } });
  assert.equal(importedAgain.body.alreadyImported, true);
  console.log('Cross-device learning acceptance: PASS');
} finally {
  for (const userEmail of [email, migrationEmail]) {
    const [user] = await sql`SELECT id FROM "user" WHERE email=${userEmail}`;
    if (!user) continue;
    await sql`DELETE FROM user_mistakes WHERE user_id=${user.id}`;
    await sql`DELETE FROM daily_activity WHERE user_id=${user.id}`;
    await sql`DELETE FROM local_progress_imports WHERE user_id=${user.id}`;
    await sql`DELETE FROM attempt_answers WHERE user_id=${user.id}`;
    await sql`DELETE FROM attempts WHERE user_id=${user.id}`;
    await sql`DELETE FROM user_progress WHERE user_id=${user.id}`;
    await sql`DELETE FROM profiles WHERE user_id=${user.id}`;
    await sql`DELETE FROM "user" WHERE id=${user.id}`;
  }
  for (const row of seeded.reverse()) {
    await sql`DELETE FROM question_options WHERE question_id=${row.questionId}`;
    await sql`DELETE FROM questions WHERE id=${row.questionId}`;
    await sql`DELETE FROM learning_pieces WHERE id=${row.pieceId}`;
    await sql`DELETE FROM learning_models WHERE id=${row.modelId}`;
  }
  await sql.end();
  await closeDb();
  await new Promise((resolve) => server.close(resolve));
}
