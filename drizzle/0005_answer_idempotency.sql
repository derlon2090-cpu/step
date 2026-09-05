ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS client_mutation_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS attempt_answers_user_mutation_uq
  ON attempt_answers(user_id, client_mutation_id)
  WHERE client_mutation_id IS NOT NULL;
