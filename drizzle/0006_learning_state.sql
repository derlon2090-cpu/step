-- Track the one-time migration of legacy device-local progress into the account.
CREATE TABLE IF NOT EXISTS local_progress_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  import_key text NOT NULL DEFAULT 'step-reading-progress-v2',
  answer_count integer NOT NULL DEFAULT 0,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, import_key)
);

ALTER TABLE user_mistakes ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
