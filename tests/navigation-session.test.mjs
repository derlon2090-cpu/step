import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const bootstrap = source.slice(source.indexOf('async function bootstrapSession()'), source.indexOf('void bootstrapSession();'));
const bootstrapCatch = bootstrap.slice(bootstrap.indexOf('} catch (error) {'), bootstrap.indexOf('} finally {'));
const loadingRenderStart = source.indexOf('if (state.authLoading) {');
const loadingRender = source.slice(loadingRenderStart, source.indexOf("const model = currentModel();", loadingRenderStart));
const snapshotSync = source.slice(source.indexOf('async function syncAccountSnapshot('), source.indexOf('function setQuizProgress('));

test('session hydration preserves the current workspace instead of forcing dashboard', () => {
  assert.doesNotMatch(bootstrap, /state\.view\s*=\s*'dashboard';/);
  assert.match(bootstrap, /if \(\['login', 'register', 'library'\]\.includes\(state\.view\)\) state\.view = savedView \?\? 'dashboard'/);
  assert.match(source, /sessionStorage\.setItem\(workspaceViewKey/);
  assert.match(bootstrap, /restoreActiveWorkspaceProgress\(\)/);
  assert.match(loadingRender, /app\.innerHTML = sessionLoadingView\(\)/);
});

test('transient session errors are retried before changing the visible page', () => {
  assert.match(source, /for \(let attempt = 0; attempt < 3; attempt \+= 1\)/);
  assert.match(source, /250 \* \(attempt \+ 1\)/);
  assert.doesNotMatch(bootstrapCatch, /localStorage\.removeItem\(authHintKey\)/);
});

test('authenticated chrome never flashes the public navigation during session hydration', () => {
  const header = source.slice(source.indexOf("function raseenHeader("), source.indexOf("function dashboardHeader("));
  assert.match(header, /state\.authLoading && hasAuthHint && restorableViews\.has\(state\.view\)/);
  assert.match(header, /account \|\| pendingAuthenticatedWorkspace/);
  assert.match(loadingRender, /sessionLoadingView\(\)/);
  assert.doesNotMatch(loadingRender, /dashboardView\(\)|dashboardSectionView\(\)|libraryView\(\)|quizView\(/);
});

test('dashboard data is revealed only after progress and mistakes finish syncing', () => {
  const initialSync = bootstrap.indexOf('await syncAccountSnapshot({ renderAfter: false })');
  const loadingFinished = bootstrap.indexOf('state.authLoading = false');
  assert.ok(initialSync > -1, 'initial account synchronization is missing');
  assert.ok(loadingFinished > initialSync, 'loading ended before the account snapshot was synchronized');
  assert.match(source.slice(source.indexOf('async function bootstrapSession()'), source.indexOf('void bootstrapSession();') + 1), /finally \{\s*state\.authLoading = false;\s*render\(\)/);
  assert.match(source, /جارٍ مزامنة تقدمك وبياناتك/);
});

test('account refresh flushes pending answers and renders one complete snapshot', () => {
  const pendingFlush = snapshotSync.indexOf('await flushPendingAnswers()');
  const parallelFetch = snapshotSync.indexOf('await Promise.all([');
  const finalRender = snapshotSync.indexOf('if (renderAfter) render()');
  assert.ok(pendingFlush > -1 && pendingFlush < parallelFetch);
  assert.ok(parallelFetch < finalRender);
  assert.match(snapshotSync, /refreshLearningState\(\{ renderAfter: false, hydrate, flushPending: false \}\)/);
});

test('dashboard falls back to hydrated progress when its summary endpoint is unavailable', () => {
  const dashboardData = source.slice(source.indexOf('function dashboardData()'), source.indexOf('function dashboardView()'));
  assert.match(dashboardData, /const hasRemoteOverall = Boolean\(remoteOverall\)/);
  assert.match(dashboardData, /hasRemoteOverall \? remoteAnswered : answered/);
  assert.doesNotMatch(dashboardData, /serverLearningStateLoaded \? remoteAnswered/);
});
