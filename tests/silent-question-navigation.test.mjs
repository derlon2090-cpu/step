import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('question navigation is silent while the other feedback sounds remain enabled', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /soundManager\.play\(['"]question-next['"]\)/);
  assert.match(source, /soundManager\.play\(['"]answer-correct['"]\)/);
  assert.match(source, /soundManager\.play\(['"]answer-wrong['"]\)/);
  assert.match(source, /soundManager\.play\(['"]exercise-complete['"]\)/);
});
