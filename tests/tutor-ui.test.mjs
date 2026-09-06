import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const cssSource = await readFile(new URL('../src/raseen.css', import.meta.url), 'utf8');
const popoverSource = mainSource.slice(mainSource.indexOf('function tutorPopover('), mainSource.indexOf('function paintTutorStream('));
const requestSource = mainSource.slice(mainSource.indexOf('async function requestTutor('), mainSource.indexOf('async function askQuestionTutor('));
const animatorSource = requestSource.slice(requestSource.indexOf('const animateStream ='), requestSource.indexOf('const scheduleStream ='));

test('tutor immediately shows a quiet writing state that becomes the streaming response', () => {
  assert.doesNotMatch(popoverSource, /is-loading|جاري الاتصال|يجهز الشرح/);
  assert.doesNotMatch(popoverSource, /tutor-privacy/);
  assert.match(popoverSource, /tutor-writing-label/);
  assert.match(popoverSource, /يكتب/);
  assert.match(cssSource, /is-streaming:has\(\.tutor-message-content:empty\)[^{]*\{[^}]*min-width:92px[^}]*min-height:34px/);
  assert.match(cssSource, /is-streaming:has\(\.tutor-message-content:empty\) \.tutor-writing-label\{display:inline\}/);
  assert.doesNotMatch(cssSource, /is-streaming:has\(\.tutor-message-content:empty\) \.tutor-cursor\{display:none\}/);
});

test('tutor stream updates only its text at a paced rate instead of rebuilding the page', () => {
  assert.match(animatorSource, /paintTutorStream\(key, messages\[index\]\.content\)/);
  assert.match(animatorSource, /setTimeout\(animateStream, 36\)/);
  assert.doesNotMatch(animatorSource, /render\(\)/);
  assert.match(mainSource, /streamText\.innerHTML = formatTutorContent\(content\)/);
  assert.match(mainSource, /cursorLine\.append\(cursor\)/);
  assert.match(mainSource, /\.tutor-content-line, \.tutor-content-heading/);
});

test('tutor follows the streamed response and stays above fixed question controls', () => {
  assert.match(mainSource, /conversation\.scrollTop = conversation\.scrollHeight/);
  assert.match(mainSource, /state\.tutorSessions\[key\]\?\.autoScroll === false/);
  assert.match(cssSource, /\.question-tutor-popover\{[^}]*z-index:120/);
  assert.match(cssSource, /\.question-tutor-popover\.has-conversation,\.question-tutor-popover\.has-conversation\.is-expanded\{right:18px;left:auto;bottom:18px;width:min\(336px/);
});

test('user can scroll upward immediately while the tutor is streaming', () => {
  assert.match(popoverSource, /data-tutor-latest \$\{session\.autoScroll === false \? '' : 'hidden'\}/);
  assert.match(mainSource, /const movingUp = [^;]+conversation\.scrollTop < previousTop - 1/);
  assert.match(mainSource, /movingUp \? false : atBottom \? true/);
  assert.match(mainSource, /event\.deltaY < 0/);
  assert.match(mainSource, /event\.clientY > previousY \+ 2/);
  assert.match(mainSource, /<= 12/);
  assert.match(cssSource, /touch-action:pan-y/);
  assert.match(cssSource, /\.question-tutor-popover\.has-conversation[^}]*overflow:hidden/);
});

test('tutor opens inward in reading and grammar and shows the Nibras name once', () => {
  assert.match(cssSource, /\.reading-question-heading \.question-tutor-anchor\{right:auto;left:0\}/);
  assert.match(cssSource, /\.grammar-tutor-anchor \.question-tutor-popover:not\(\.has-conversation\)\{right:auto;left:0;width:284px\}/);
  assert.match(cssSource, /\.tutor-header strong\{font-size:13px\}\.tutor-header strong::after\{content:none\}/);
});

test('reading tutor conversation remains directly below its icon', () => {
  assert.match(cssSource, /\.reading-question-heading \.question-tutor-popover\.has-conversation,\.reading-question-heading \.question-tutor-popover\.has-conversation\.is-expanded\{position:absolute;right:auto;bottom:auto;left:0;top:calc\(100% \+ 10px\)/);
});
