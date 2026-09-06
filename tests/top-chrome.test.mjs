import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/raseen.css', import.meta.url), 'utf8');

test('mobile safe area uses the exact authenticated header color', () => {
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /name="theme-color" content="#071F51"/);
  assert.match(html, /apple-mobile-web-app-status-bar-style" content="black-translucent"/);
  assert.match(css, /height:env\(safe-area-inset-top,0px\);background:#071F51/);
  assert.match(css, /\.dashboard-header,\.session-loading-header\{background:#071F51\}/);
});
