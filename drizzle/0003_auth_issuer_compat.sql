-- Better Auth 1.7 uses createLocalAccountIssuer('credential'), whose value is
-- `local:credential`. Upgrade only unambiguous legacy rows; do not delete or
-- overwrite a row if a correctly-issued account already exists.
UPDATE "account" AS legacy
SET issuer = 'local:credential'
WHERE legacy.issuer = 'credential'
  AND NOT EXISTS (
    SELECT 1
    FROM "account" AS current
    WHERE current.issuer = 'local:credential'
      AND current.account_id = legacy.account_id
  );
