-- Unify mistake lifecycle and provide one daily activity ledger for every skill.
DO $$
BEGIN
  ALTER TABLE user_mistakes DROP CONSTRAINT IF EXISTS user_mistakes_status_check;
  ALTER TABLE user_mistakes ADD CONSTRAINT user_mistakes_status_check CHECK (status IN ('unreviewed','reviewing','mastered','dismissed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS daily_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  activity_date text NOT NULL,
  answered_count integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  wrong_count integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity_date)
);
CREATE INDEX IF NOT EXISTS daily_activity_user_idx ON daily_activity(user_id);
