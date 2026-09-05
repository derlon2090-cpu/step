import 'dotenv/config';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
try {
  const tableRows = await sql.unsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('user', 'session', 'account', 'verification')
  `);
  const tables = new Set(tableRows.map((row) => row.table_name));
  const missingTables = ['user', 'session', 'account', 'verification'].filter((table) => !tables.has(table));
  if (missingTables.length) throw new Error(`Missing Better Auth tables: ${missingTables.join(', ')}`);

  const accountRows = await sql.unsafe(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'account'
  `);
  const accountColumns = new Set(accountRows.map((row) => row.column_name));
  const missingColumns = ['issuer', 'account_id', 'provider_id', 'user_id', 'password'].filter((column) => !accountColumns.has(column));
  if (missingColumns.length) throw new Error(`Missing Better Auth account columns: ${missingColumns.join(', ')}`);

  const indexRows = await sql.unsafe(`
    SELECT tablename, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename IN ('user', 'session', 'account')
  `);
  const indexText = indexRows.map((row) => `${row.tablename}:${row.indexdef}`).join('\n').toLowerCase();
  if (!indexText.includes('unique') || !indexText.includes('(email)')) throw new Error('The user email unique index is missing');
  if (!indexText.includes('(issuer, account_id)')) throw new Error('The account issuer/account unique index is missing');

  const [counts] = await sql.unsafe(`
    SELECT
      (SELECT count(*)::int FROM "user") AS users,
      (SELECT count(*)::int FROM "account") AS accounts,
      (SELECT count(*)::int FROM "session") AS sessions
  `);
  const [legacyIssuers] = await sql.unsafe(`
    SELECT count(*)::int AS count
    FROM "account"
    WHERE issuer = 'credential'
  `);
  console.log('Better Auth database schema verified.');
  console.log(`users=${counts.users} accounts=${counts.accounts} sessions=${counts.sessions}`);
  if (legacyIssuers.count) console.warn(`warning: ${legacyIssuers.count} account row(s) use legacy issuer=credential; run npm run db:migrate to apply the compatibility migration and review the report.`);
} finally {
  await sql.end();
}
