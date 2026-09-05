import { pgTable, text, integer, boolean, real, timestamp, uuid, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

// Better Auth owns the auth tables (user/session/account/verification). These
// definitions mirror the generated PostgreSQL adapter schema. The auth
// package remains the writer; exporting the tables here keeps migrations,
// diagnostics, and application queries aligned with the same Neon schema.
export const authUsers = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const authSessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
}, (t) => [index('session_userId_idx').on(t.userId)]);

export const authAccounts = pgTable('account', {
  id: text('id').primaryKey(),
  // Better Auth's createLocalAccountIssuer('credential') is `local:credential`.
  // Keep this default aligned with the adapter so direct schema-created rows
  // cannot look valid while being invisible to sign-in.
  issuer: text('issuer').notNull().default('local:credential'),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [index('account_userId_idx').on(t.userId), uniqueIndex('account_issuer_accountId_uq').on(t.issuer, t.accountId)]);

export const authVerifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [index('verification_identifier_idx').on(t.identifier)]);
export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('profiles_role_idx').on(t.role)]);

export const learningModels = pgTable('learning_models', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: text('source_id').notNull().unique(),
  modelNumber: integer('model_number').notNull(),
  titleAr: text('title_ar'),
  titleEn: text('title_en'),
  skill: text('skill').notNull().default('reading'),
  status: text('status').notNull().default('published'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const learningPieces = pgTable('learning_pieces', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: text('source_id').notNull().unique(),
  modelId: uuid('model_id').notNull().references(() => learningModels.id, { onDelete: 'restrict' }),
  pieceOrder: integer('piece_order').notNull(),
  titleAr: text('title_ar'),
  titleEn: text('title_en'),
  passageSource: text('passage_source'),
  passageDisplay: text('passage_display'),
  sourceNote: text('source_note'),
  audioUrl: text('audio_url'),
  audioDuration: integer('audio_duration'),
  status: text('status').notNull().default('published'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('learning_pieces_model_idx').on(t.modelId)]);

export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: text('source_id').notNull().unique(),
  pieceId: uuid('piece_id').references(() => learningPieces.id, { onDelete: 'restrict' }),
  modelId: uuid('model_id').references(() => learningModels.id, { onDelete: 'restrict' }),
  skill: text('skill').notNull().default('reading'),
  questionOrder: integer('question_order').notNull(),
  questionSource: text('question_source').notNull(),
  questionDisplay: text('question_display'),
  correctAnswer: text('correct_answer'),
  answerStatus: text('answer_status').notNull().default('missing'),
  excludeFromScoring: boolean('exclude_from_scoring').notNull().default(true),
  sourceNote: text('source_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('questions_piece_idx').on(t.pieceId), index('questions_model_idx').on(t.modelId), index('questions_answer_status_idx').on(t.answerStatus)]);

export const questionOptions = pgTable('question_options', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  optionOrder: integer('option_order').notNull(),
  value: text('value').notNull(),
  isCorrect: boolean('is_correct'), // null is intentional when the source is unknown
}, (t) => [uniqueIndex('question_options_question_order_uq').on(t.questionId, t.optionOrder), index('question_options_question_idx').on(t.questionId)]);

export const questionReviews = pgTable('question_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'restrict' }),
  reviewerUserId: text('reviewer_user_id').notNull(),
  proposedAnswer: text('proposed_answer'),
  adminNote: text('admin_note'),
  hadOptionsInSource: boolean('had_options_in_source'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
}, (t) => [index('question_reviews_status_idx').on(t.status), index('question_reviews_question_idx').on(t.questionId)]);

export const userProgress = pgTable('user_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  skill: text('skill').notNull(),
  modelId: uuid('model_id').references(() => learningModels.id, { onDelete: 'restrict' }),
  pieceId: uuid('piece_id').references(() => learningPieces.id, { onDelete: 'restrict' }),
  status: text('status').notNull().default('not_started'),
  progressPercent: real('progress_percent').notNull().default(0),
  lastQuestionId: uuid('last_question_id').references(() => questions.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (t) => [uniqueIndex('user_progress_scope_uq').on(t.userId, t.skill, t.modelId, t.pieceId), index('user_progress_user_activity_idx').on(t.userId, t.lastActivityAt)]);

export const attempts = pgTable('attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  skill: text('skill').notNull(),
  modelId: uuid('model_id').references(() => learningModels.id, { onDelete: 'restrict' }),
  pieceId: uuid('piece_id').references(() => learningPieces.id, { onDelete: 'restrict' }),
  mode: text('mode').notNull(),
  status: text('status').notNull().default('in_progress'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).defaultNow().notNull(),
  totalQuestions: integer('total_questions').notNull().default(0),
  scoredQuestions: integer('scored_questions').notNull().default(0),
  correctCount: integer('correct_count').notNull().default(0),
  wrongCount: integer('wrong_count').notNull().default(0),
  scorePercent: real('score_percent'),
  durationSeconds: integer('duration_seconds'),
}, (t) => [index('attempts_user_idx').on(t.userId), index('attempts_user_status_idx').on(t.userId, t.status), index('attempts_activity_idx').on(t.lastActivityAt)]);

export const attemptAnswers = pgTable('attempt_answers', {
  id: uuid('id').defaultRandom().primaryKey(),
  attemptId: uuid('attempt_id').notNull().references(() => attempts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'restrict' }),
  selectedAnswer: text('selected_answer'),
  isCorrect: boolean('is_correct'),
  answeredAt: timestamp('answered_at', { withTimezone: true }).defaultNow().notNull(),
  responseTimeMs: integer('response_time_ms'),
  clientMutationId: uuid('client_mutation_id'),
}, (t) => [uniqueIndex('attempt_answers_attempt_question_uq').on(t.attemptId, t.questionId), uniqueIndex('attempt_answers_user_mutation_uq').on(t.userId, t.clientMutationId), index('attempt_answers_user_idx').on(t.userId), index('attempt_answers_question_idx').on(t.questionId)]);

export const userMistakes = pgTable('user_mistakes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'restrict' }),
  firstAttemptId: uuid('first_attempt_id').references(() => attempts.id, { onDelete: 'set null' }),
  lastAttemptId: uuid('last_attempt_id').references(() => attempts.id, { onDelete: 'set null' }),
  mistakeCount: integer('mistake_count').notNull().default(1),
  reviewCount: integer('review_count').notNull().default(0),
  status: text('status').notNull().default('unreviewed'),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  masteredAt: timestamp('mastered_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex('user_mistakes_user_question_uq').on(t.userId, t.questionId), index('user_mistakes_user_status_idx').on(t.userId, t.status)]);

export const dailyActivity = pgTable('daily_activity', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  activityDate: text('activity_date').notNull(),
  answeredCount: integer('answered_count').notNull().default(0),
  correctCount: integer('correct_count').notNull().default(0),
  wrongCount: integer('wrong_count').notNull().default(0),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex('daily_activity_user_date_uq').on(t.userId, t.activityDate), index('daily_activity_user_idx').on(t.userId)]);

export const localProgressImports = pgTable('local_progress_imports', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  importKey: text('import_key').notNull().default('step-reading-progress-v2'),
  answerCount: integer('answer_count').notNull().default(0),
  importedAt: timestamp('imported_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex('local_progress_imports_user_key_uq').on(t.userId, t.importKey)]);

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorUserId: text('actor_user_id').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('audit_logs_entity_idx').on(t.entityType, t.entityId), index('audit_logs_actor_idx').on(t.actorUserId)]);
