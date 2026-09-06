import assert from 'node:assert/strict';
import test from 'node:test';
import { formatTutorContent } from '../src/utils/tutorFormatting.js';

test('tutor formatting converts emphasis without leaking markdown markers', () => {
  const formatted = formatTutorContent('الإجابة الصحيحة هي: **It is mainly spoken by elders.**\n\nابحث عن **because**.');
  assert.match(formatted, /<strong>It is mainly spoken by elders\.<\/strong>/);
  assert.match(formatted, /<strong>because<\/strong>/);
  assert.doesNotMatch(formatted, /\*\*/);
  assert.match(formatted, /tutor-paragraph-gap/);
});

test('tutor formatting styles headings and safely escapes generated HTML', () => {
  const formatted = formatTutorContent('### القاعدة المهمة\n- مثال قصير\n<script>alert(1)</script>');
  assert.match(formatted, /class="tutor-content-heading">القاعدة المهمة/);
  assert.match(formatted, /class="tutor-content-line tutor-content-list">مثال قصير/);
  assert.doesNotMatch(formatted, /<script>/);
  assert.match(formatted, /&lt;script&gt;/);
});

test('tutor formatting emphasizes educational labels without bolding body copy', () => {
  const formatted = formatTutorContent('الإجابة الصحيحة: It is mainly spoken by elders.\nهذا شرح طبيعي يبقى خفيفًا.');
  assert.match(formatted, /class="tutor-inline-label">الإجابة الصحيحة:<\/strong>/);
  assert.match(formatted, /<span class="tutor-content-line">هذا شرح طبيعي يبقى خفيفًا.<\/span>/);
  assert.doesNotMatch(formatted, /<strong>هذا شرح طبيعي/);
});
