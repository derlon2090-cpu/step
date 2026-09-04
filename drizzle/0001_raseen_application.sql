-- Additive application migration. Better Auth's user/session/account/
-- verification tables are created by the dedicated 0002 migration so the
-- application and auth adapter share one explicit Neon schema.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL UNIQUE,
  display_name text, avatar_url text, role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

CREATE TABLE IF NOT EXISTS learning_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_id text NOT NULL UNIQUE, model_number integer NOT NULL,
  title_ar text, title_en text, skill text NOT NULL DEFAULT 'reading', status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS learning_pieces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_id text NOT NULL UNIQUE,
  model_id uuid NOT NULL REFERENCES learning_models(id) ON DELETE RESTRICT, piece_order integer NOT NULL,
  title_ar text, title_en text, passage_source text, passage_display text, source_note text,
  audio_url text, audio_duration integer, status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS learning_pieces_model_idx ON learning_pieces(model_id);

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_id text NOT NULL UNIQUE,
  piece_id uuid REFERENCES learning_pieces(id) ON DELETE RESTRICT, model_id uuid REFERENCES learning_models(id) ON DELETE RESTRICT,
  skill text NOT NULL DEFAULT 'reading', question_order integer NOT NULL, question_source text NOT NULL,
  question_display text, correct_answer text, answer_status text NOT NULL DEFAULT 'missing' CHECK (answer_status IN ('verified','missing','needs_review')),
  exclude_from_scoring boolean NOT NULL DEFAULT true, source_note text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS questions_piece_idx ON questions(piece_id);
CREATE INDEX IF NOT EXISTS questions_model_idx ON questions(model_id);
CREATE INDEX IF NOT EXISTS questions_answer_status_idx ON questions(answer_status);
CREATE TABLE IF NOT EXISTS question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_order integer NOT NULL, value text NOT NULL, is_correct boolean,
  UNIQUE(question_id, option_order)
);
CREATE INDEX IF NOT EXISTS question_options_question_idx ON question_options(question_id);

CREATE TABLE IF NOT EXISTS question_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question_id uuid NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  reviewer_user_id text NOT NULL, proposed_answer text, admin_note text, had_options_in_source boolean,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','skipped')),
  created_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz
);
CREATE INDEX IF NOT EXISTS question_reviews_status_idx ON question_reviews(status);

CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, skill text NOT NULL,
  model_id uuid REFERENCES learning_models(id) ON DELETE RESTRICT, piece_id uuid REFERENCES learning_pieces(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  progress_percent real NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  last_question_id uuid REFERENCES questions(id) ON DELETE SET NULL, started_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  UNIQUE(user_id, skill, model_id, piece_id)
);
CREATE INDEX IF NOT EXISTS user_progress_user_activity_idx ON user_progress(user_id, last_activity_at);

CREATE TABLE IF NOT EXISTS attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, skill text NOT NULL,
  model_id uuid REFERENCES learning_models(id) ON DELETE RESTRICT, piece_id uuid REFERENCES learning_pieces(id) ON DELETE RESTRICT,
  mode text NOT NULL CHECK (mode IN ('practice','exam')), status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','abandoned')),
  started_at timestamptz NOT NULL DEFAULT now(), submitted_at timestamptz, last_activity_at timestamptz NOT NULL DEFAULT now(),
  total_questions integer NOT NULL DEFAULT 0, scored_questions integer NOT NULL DEFAULT 0, correct_count integer NOT NULL DEFAULT 0,
  wrong_count integer NOT NULL DEFAULT 0, score_percent real, duration_seconds integer
);
CREATE INDEX IF NOT EXISTS attempts_user_status_idx ON attempts(user_id, status);
CREATE INDEX IF NOT EXISTS attempts_activity_idx ON attempts(last_activity_at);

CREATE TABLE IF NOT EXISTS attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), attempt_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  user_id text NOT NULL, question_id uuid NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  selected_answer text, is_correct boolean, answered_at timestamptz NOT NULL DEFAULT now(), response_time_ms integer,
  UNIQUE(attempt_id, question_id)
);
CREATE INDEX IF NOT EXISTS attempt_answers_user_idx ON attempt_answers(user_id);
CREATE INDEX IF NOT EXISTS attempt_answers_question_idx ON attempt_answers(question_id);

CREATE TABLE IF NOT EXISTS user_mistakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, question_id uuid NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  first_attempt_id uuid REFERENCES attempts(id) ON DELETE SET NULL, last_attempt_id uuid REFERENCES attempts(id) ON DELETE SET NULL,
  mistake_count integer NOT NULL DEFAULT 1, review_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unreviewed' CHECK (status IN ('unreviewed','reviewing','mastered')),
  first_seen_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(), mastered_at timestamptz,
  UNIQUE(user_id, question_id)
);
CREATE INDEX IF NOT EXISTS user_mistakes_user_status_idx ON user_mistakes(user_id, status);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id text NOT NULL, action text NOT NULL,
  entity_type text NOT NULL, entity_id text NOT NULL, metadata jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
