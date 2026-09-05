/*
 * Opt-in integration check. Run only against a disposable database:
 *   $env:AUTH_TEST_DATABASE_URL = 'postgres://...'; npm run test:auth
 * The guard intentionally refuses DATABASE_URL so a Production database
 * cannot be mutated by accident.
 */
import assert from 'node:assert/strict';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';

const databaseURL = process.env.AUTH_TEST_DATABASE_URL;
if (!databaseURL) {
  console.log('Auth integration skipped: set AUTH_TEST_DATABASE_URL to a disposable test database.');
  process.exit(0);
}
process.env.DATABASE_URL = databaseURL;
process.env.BETTER_AUTH_SECRET ??= 'auth-integration-test-secret-auth-integration-test';
process.env.BETTER_AUTH_API_KEY ??= 'auth-integration-test';
process.env.BETTER_AUTH_URL ??= 'http://localhost:0';
process.env.NODE_ENV = 'test';

const { server } = await import('../server/index.js');
const sql = postgres(databaseURL, { prepare: false, max: 1 });
const email = `auth-${randomUUID()}@example.test`;
const password = 'correct horse battery staple';
let cookie = '';

async function request(path, body) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';', 1)[0];
  return { response, body: await response.json() };
}

await new Promise((resolve) => server.listen(0, resolve));
try {
  const signup = await request('/api/auth/sign-up/email', { name: 'Integration User', email: email.toUpperCase(), password });
  assert.equal(signup.response.status, 200);
  assert.equal(signup.body.user.email, email);

  const signout = await request('/api/auth/sign-out', {});
  assert.equal(signout.response.status, 200);
  cookie = '';

  const signin = await request('/api/auth/sign-in/email', { email: `  ${email.toUpperCase()}  `, password });
  assert.equal(signin.response.status, 200);
  assert.equal(signin.body.user.email, email);

  const signoutAgain = await request('/api/auth/sign-out', {});
  assert.equal(signoutAgain.response.status, 200);
  cookie = '';

  const signinAgain = await request('/api/auth/sign-in/email', { email, password });
  assert.equal(signinAgain.response.status, 200);

  const duplicate = await request('/api/auth/sign-up/email', { name: 'Duplicate', email, password });
  assert.notEqual(duplicate.response.status, 200);
} finally {
  await sql.unsafe('DELETE FROM "user" WHERE email = $1', [email]);
  await sql.end();
  await new Promise((resolve) => server.close(resolve));
}
