import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import postgres from 'postgres';

const sourceDatabaseUrl = process.env.DATABASE_URL;
if (!sourceDatabaseUrl) throw new Error('DATABASE_URL is required');

const schemaName = `nabahah_learning_test_${Date.now()}_${randomUUID().slice(0, 6)}`;
if (!/^nabahah_learning_test_[a-z0-9_]+$/.test(schemaName)) throw new Error('Unsafe temporary schema name');

const testUrl = new URL(sourceDatabaseUrl);
testUrl.searchParams.set('options', `-c search_path=${schemaName}`);
const testDatabaseUrl = testUrl.toString();
const admin = postgres(sourceDatabaseUrl, { prepare: false, max: 1 });

function runNode(script, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { cwd: process.cwd(), env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${script} exited with code ${code}`)));
  });
}

try {
  await admin.unsafe(`CREATE SCHEMA "${schemaName}" AUTHORIZATION CURRENT_USER`);
  console.log(`Created isolated schema: ${schemaName}`);
  const env = { ...process.env, DATABASE_URL: testDatabaseUrl, LEARNING_TEST_DATABASE_URL: testDatabaseUrl };
  await runNode('scripts/migrate.mjs', env);
  await runNode('tests/cross-device-learning.integration.mjs', env);
} finally {
  const schemas = await admin`SELECT schema_name FROM information_schema.schemata WHERE schema_name=${schemaName}`;
  if (schemas.length) {
    await admin.unsafe(`DROP SCHEMA "${schemaName}" CASCADE`);
    console.log(`Removed isolated schema: ${schemaName}`);
  }
  await admin.end();
}
