import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { defaultSettings, SOUND_LEVELS, soundManager } from '../src/soundManager.js';

const names = ['option-select', 'question-next', 'answer-correct', 'answer-wrong', 'exercise-complete', 'achievement'];

test('sound defaults and per-event levels match the approved mix', () => {
  assert.deepEqual(defaultSettings, { enabled: true, volume: 0.5, listeningVolume: 0.5 });
  assert.deepEqual(SOUND_LEVELS, {
    'option-select': 0.42,
    'question-next': 0.38,
    'answer-correct': 0.92,
    'answer-wrong': 0.82,
    'exercise-complete': 0.90,
    achievement: 0.95,
  });
  assert.equal(soundManager.gainLevel('answer-correct'), 0.92 * 0.70);
});

test('all six real UI sound assets are present and encoded as MP3', () => {
  names.forEach((name) => {
    const file = path.resolve('public/audio/ui', `${name}.mp3`);
    const bytes = fs.readFileSync(file);
    assert.ok(bytes.length > 1500, `${name} must contain a real non-empty asset`);
    assert.equal(bytes.subarray(0, 3).toString('ascii'), 'ID3', `${name} must be an MP3`);
  });
});

test('listening volume remains independent from UI volume', () => {
  const original = soundManager.getSettings();
  const audio = { volume: 0, addEventListener() {} };
  soundManager.updateSettings({ volume: 0.25, listeningVolume: 0.75 });
  soundManager.applyListeningVolume(audio);
  assert.equal(audio.volume, 0.75);
  assert.equal(soundManager.getSettings().volume, 0.25);
  soundManager.updateSettings(original);
});
