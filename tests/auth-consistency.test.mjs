import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmail } from '../lib/email.js';
import { classifyAuthError } from '../server/auth/error-classification.js';

test('email normalization is shared by sign-up and sign-in', () => {
  assert.equal(normalizeEmail('  Student@Example.COM  '), 'student@example.com');
  assert.equal(normalizeEmail(null), '');
});

test('auth failures are mapped to operational error codes', () => {
  assert.equal(classifyAuthError({ code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' }), 'USER_ALREADY_EXISTS');
  assert.equal(classifyAuthError({ status: 'UNAUTHORIZED' }), 'INVALID_PASSWORD');
  assert.equal(classifyAuthError({ cause: { code: '23505' } }), 'USER_ALREADY_EXISTS');
  assert.equal(classifyAuthError({ message: 'relation "account" does not exist' }), 'DATABASE_ERROR');
  assert.equal(classifyAuthError({ code: 'FAILED_TO_CREATE_USER' }), 'DATABASE_ERROR');
});
