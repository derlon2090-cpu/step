-- Better Auth core schema for the PostgreSQL/Drizzle adapter.
-- This migration is deliberately additive and idempotent so it can be run
-- safely against Neon during deploys and from the local migration script.
CREATE TABLE IF NOT EXISTS "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "session" (
  id text PRIMARY KEY,
  expires_at timestamp NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS session_userId_idx ON "session"(user_id);

CREATE TABLE IF NOT EXISTS "account" (
  id text PRIMARY KEY,
  issuer text NOT NULL DEFAULT 'local:credential',
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamp,
  refresh_token_expires_at timestamp,
  scope text,
  password text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_userId_idx ON "account"(user_id);

-- Upgrade installations created before Better Auth 1.7 introduced issuer.
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS issuer text;
UPDATE "account" SET issuer = 'local:credential' WHERE issuer IS NULL;
ALTER TABLE "account" ALTER COLUMN issuer SET DEFAULT 'local:credential';
ALTER TABLE "account" ALTER COLUMN issuer SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS account_issuer_accountId_uq ON "account"(issuer, account_id);

CREATE TABLE IF NOT EXISTS "verification" (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification"(identifier);
