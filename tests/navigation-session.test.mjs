import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const bootstrap = source.slice(source.indexOf('async function bootstrapSession()'), source.indexOf('void bootstrapSession();'));
const bootstrapCatch = bootstrap.slice(bootstrap.indexOf('} catch (error) {'), bootstrap.indexOf('} finally {'));
const loadingRenderStart = source.indexOf('if (state.authLoading) {');
const loadingRender = source.slice(loadingRenderStart, source.indexOf("const model = currentModel();", loadingRenderStart));

test('session hydration preserves the current workspace instead of forcing dashboard', () => {
  assert.doesNotMatch(bootstrap, /state\.view\s*=\s*'dashboard';/);
  assert.match(bootstrap, /if \(\['login', 'register', 'library'\]\.includes\(state\.view\)\) state\.view = savedView \?\? 'dashboard'/);
  assert.match(source, /sessionStorage\.setItem\(workspaceViewKey/);
  assert.match(bootstrap, /restoreActiveWorkspaceProgress\(\)/);
  assert.match(loadingRender, /state\.view === 'dashboard-section'/);
  assert.match(loadingRender, /state\.view === 'quiz'/);
});

test('transient session errors are retried before changing the visible page', () => {
  assert.match(source, /for \(let attempt = 0; attempt < 3; attempt \+= 1\)/);
  assert.match(source, /250 \* \(attempt \+ 1\)/);
  assert.doesNotMatch(bootstrapCatch, /localStorage\.removeItem\(authHintKey\)/);
});
