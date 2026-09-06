import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const cssSource = await readFile(new URL('../src/raseen.css', import.meta.url), 'utf8');
const popoverSource = mainSource.slice(mainSource.indexOf('function tutorPopover('), mainSource.indexOf('function paintTutorStream('));
const requestSource = mainSource.slice(mainSource.indexOf('async function requestTutor('), mainSource.indexOf('async function askQuestionTutor('));
const animatorSource = requestSource.slice(requestSource.indexOf('const animateStream ='), requestSource.indexOf('const scheduleStream ='));

test('tutor uses one quiet streaming response without a separate connection card', () => {
  assert.doesNotMatch(popoverSource, /is-loading|جاري الاتصال|يجهز الشرح/);
  assert.doesNotMatch(popoverSource, /tutor-privacy/);
  assert.match(cssSource, /is-streaming:has\(\.tutor-message-content:empty\)\{min-height:0;padding:0;border:0;background:transparent\}/);
});

test('tutor stream updates only its text at a paced rate instead of rebuilding the page', () => {
  assert.match(animatorSource, /paintTutorStream\(key, messages\[index\]\.content\)/);
  assert.match(animatorSource, /setTimeout\(animateStream, 36\)/);
  assert.doesNotMatch(animatorSource, /render\(\)/);
});

test('tutor follows the streamed response and stays above fixed question controls', () => {
  assert.match(mainSource, /conversation\.scrollTop = conversation\.scrollHeight/);
  assert.match(cssSource, /\.question-tutor-popover\{[^}]*z-index:120/);
  assert.match(cssSource, /\.question-tutor-popover\.has-conversation,\.question-tutor-popover\.has-conversation\.is-expanded\{right:18px;left:auto;bottom:18px;width:min\(336px/);
});

test('tutor opens inward in reading and grammar and shows the Nibras name once', () => {
  assert.match(cssSource, /\.reading-question-heading \.question-tutor-anchor\{right:auto;left:0\}/);
  assert.match(cssSource, /\.grammar-tutor-anchor \.question-tutor-popover:not\(\.has-conversation\)\{right:auto;left:0;width:284px\}/);
  assert.match(cssSource, /\.tutor-header strong\{font-size:13px\}\.tutor-header strong::after\{content:none\}/);
});
