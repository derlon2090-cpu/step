# Better Auth / Neon authentication RCA

Date: 2026-09-05

## Confirmed findings

- The Drizzle adapter was created without `transaction: true`. In Better Auth
  1.7, email sign-up writes `user`, then `account`, then `session`. Without the
  adapter transaction, an account insert failure can commit the user first and
  leave exactly the partial state reported by the UI.
- Better Auth 1.7 identifies the password account with
  `provider_id = 'credential'`, `issuer = 'local:credential'`, and
  `account_id = user.id`. The previous schema default used `issuer =
  'credential'`, which is not the value Better Auth's sign-in lookup expects.
- The currently connected database is `127.0.0.1/renvix_local`, not a verified
  Vercel Production Neon connection. It contains three users, two accounts,
  and one user without a matching credential account. No rows were changed or
  deleted during diagnosis.
- `BETTER_AUTH_URL` is not present in the current local process. Production now
  fails fast unless all required auth settings exist, the secret has at least
  32 characters, and the auth URL is an HTTPS origin.

## Implemented remediation

- Enabled transactions on the Better Auth Drizzle adapter so user/account/
  session creation is atomic.
- Normalized email with `trim().toLowerCase()` in both browser flows and in a
  Better Auth pre-request hook.
- Added exact trusted-origin configuration through
  `BETTER_AUTH_TRUSTED_ORIGINS`.
- Added server-only error classification. Invalid sign-in failures now run a
  safe lookup that logs `CREDENTIAL_ACCOUNT_MISSING` or
  `CREDENTIAL_PASSWORD_MISSING` when applicable; passwords and request bodies
  are never logged.
- Added a read-only database report and a guarded integration test that accepts
  only `AUTH_TEST_DATABASE_URL`.
- Added an additive compatibility migration for unambiguous legacy issuer
  values. It does not delete accounts, modify password hashes, or overwrite a
  correctly-issued account.

## Production verification

For each Vercel environment (Production and Preview), load that environment's
server variables and run:

```powershell
npm run db:report-auth
npm run db:verify-auth
```

The database fingerprint and `BETTER_AUTH_URL` must identify the intended
environment. Review the listed affected users before any repair. Apply the
additive migration only after reviewing its SQL; never create or replace a
password hash manually.

Run the full auth lifecycle only against a disposable database:

```powershell
$env:AUTH_TEST_DATABASE_URL = 'postgres://...test database...'
$env:DATABASE_URL = $env:AUTH_TEST_DATABASE_URL
npm run db:migrate
npm run test:auth
```
