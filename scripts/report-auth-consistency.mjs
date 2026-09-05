import 'dotenv/config';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const url = new URL(process.env.DATABASE_URL);
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const print = (title, rows) => {
  console.log(`\n${title} (${rows.length})`);
  if (rows.length) console.table(rows);
};

try {
  const [summary] = await sql.unsafe(`
    SELECT
      (SELECT count(*)::int FROM "user") AS users,
      (SELECT count(*)::int FROM "account") AS accounts,
      (SELECT count(*)::int FROM "session") AS sessions,
      (SELECT count(*)::int FROM "user" u LEFT JOIN "account" a
        ON a.user_id = u.id AND a.provider_id = 'credential' AND a.issuer = 'local:credential'
        WHERE a.id IS NULL) AS users_without_credential,
      (SELECT count(*)::int FROM "account" a LEFT JOIN "user" u ON u.id = a.user_id
        WHERE u.id IS NULL) AS orphan_accounts
  `);
  console.log('Auth database fingerprint:', `${url.hostname}/${url.pathname.replace(/^\//, '')}`);
  console.log('BETTER_AUTH_URL:', process.env.BETTER_AUTH_URL ?? '(unset)');
  console.table(summary);

  print('Users missing a credential account or password', await sql.unsafe(`
    SELECT u.id, u.email,
      CASE
        WHEN a.id IS NULL THEN 'CREDENTIAL_ACCOUNT_MISSING'
        WHEN a.password IS NULL THEN 'CREDENTIAL_PASSWORD_MISSING'
      END AS diagnosis
    FROM "user" u
    LEFT JOIN "account" a
      ON a.user_id = u.id AND a.provider_id = 'credential'
      AND a.issuer = 'local:credential' AND a.account_id = u.id
    WHERE a.id IS NULL OR a.password IS NULL
    ORDER BY u.created_at
  `));
  print('Accounts without a matching user', await sql.unsafe(`
    SELECT a.id, a.user_id, a.account_id, a.provider_id, a.issuer,
      (a.password IS NOT NULL) AS has_password
    FROM "account" a LEFT JOIN "user" u ON u.id = a.user_id
    WHERE u.id IS NULL
  `));
  print('Case-insensitive duplicate user emails', await sql.unsafe(`
    SELECT lower(trim(email)) AS normalized_email, count(*)::int AS user_count,
      array_agg(id ORDER BY created_at) AS user_ids
    FROM "user"
    GROUP BY lower(trim(email))
    HAVING count(*) > 1
    ORDER BY user_count DESC
  `));
  print('Legacy account issuers requiring review', await sql.unsafe(`
    SELECT id, user_id, account_id, provider_id, issuer,
      (password IS NOT NULL) AS has_password
    FROM "account"
    WHERE issuer = 'credential'
  `));
} finally {
  await sql.end();
}
