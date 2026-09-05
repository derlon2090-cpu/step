/**
 * Central UI audio for Nabahah. Listening audio deliberately lives outside
 * this manager so a learner can raise listening volume without making UI
 * feedback louder at the same time.
 * @typedef {'option-select'|'question-next'|'answer-correct'|'answer-wrong'|'exercise-complete'|'achievement'} NabahahSound
 */

const SETTINGS_KEY = 'nabahah-sound-settings-v1';
const defaultSettings = { enabled: true, volume: 0.50, listeningVolume: 0.50 };
export const SOUND_LEVELS = Object.freeze({
  'option-select': 0.30,
  'question-next': 0.35,
  'answer-correct': 0.75,
  'answer-wrong': 0.65,
  'exercise-complete': 0.80,
  achievement: 0.85,
});
const soundDurations = {
  'option-select': 0.07,
  'question-next': 0.12,
  'answer-correct': 0.34,
  'answer-wrong': 0.22,
  'exercise-complete': 0.75,
  achievement: 1.0,
};

function readSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return normalizeSettings(saved && typeof saved === 'object' ? { ...defaultSettings, ...saved } : defaultSettings);
  } catch { return { ...defaultSettings }; }
}

const clamp = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
};
const normalizeSettings = (settings) => ({
  enabled: settings.enabled !== false,
  volume: clamp(settings.volume, defaultSettings.volume),
  listeningVolume: clamp(settings.listeningVolume, defaultSettings.listeningVolume),
});

class SoundManager {
  constructor() {
    this.settings = readSettings();
    this.context = null;
    this.activeNodes = [];
    this.preloaded = false;
    this.audioFiles = new Map();
    this.listeningAudios = new Set();
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  getSettings() { return { ...this.settings }; }

  updateSettings(update) {
    this.settings = normalizeSettings({ ...this.settings, ...update });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    if (!this.settings.enabled) this.stop();
    else this.audioFiles.forEach((audio, type) => { audio.volume = this.fileVolume(type); });
    this.listeningAudios.forEach((audio) => { audio.volume = this.settings.listeningVolume; });
    this.activeNodes.forEach(({ gain, type }) => {
      const now = this.context?.currentTime ?? 0;
      const level = this.gainLevel(type);
      try { gain.gain.setTargetAtTime(Math.max(0.0001, level), now, 0.01); } catch { /* already stopped */ }
    });
    return this.getSettings();
  }

  fileVolume(type) { return Math.min(1, this.settings.volume * (SOUND_LEVELS[type] ?? SOUND_LEVELS['option-select'])); }
  gainLevel(type) { return this.settings.volume * (SOUND_LEVELS[type] ?? SOUND_LEVELS['option-select']) * 0.30; }

  /** Apply the independent Listening level to an HTMLAudioElement. */
  applyListeningVolume(audio) {
    if (audio) {
      audio.volume = this.settings.listeningVolume;
      this.listeningAudios.add(audio);
      audio.addEventListener?.('ended', () => this.listeningAudios.delete(audio), { once: true });
    }
    return audio;
  }

  /** Create a listening audio element without coupling it to UI feedback volume. */
  createListeningAudio(src) {
    const audio = new Audio(src);
    audio.preload = 'metadata';
    return this.applyListeningVolume(audio);
  }

  async preload() {
    if (this.preloaded || !this.settings.enabled) return;
    this.preloaded = true;
    // Small UI files can be dropped in /public/audio/ui later. Missing files
    // intentionally fall back to the warm Web Audio tones below.
    const names = ['option-select', 'question-next', 'answer-correct', 'answer-wrong', 'exercise-complete', 'achievement'];
    await Promise.all(names.map((name) => new Promise((resolve) => {
      const audio = new Audio(`/audio/ui/${name}.mp3`);
      audio.preload = 'auto';
      audio.addEventListener('canplaythrough', () => { this.audioFiles.set(name, audio); resolve(); }, { once: true });
      audio.addEventListener('error', resolve, { once: true });
      audio.load();
    })));
  }

  async activate() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
    }
    if (this.context.state === 'suspended') await this.context.resume();
    this.preload();
  }

  stop() {
    this.activeNodes.forEach(({ oscillator, gain }) => {
      try { gain.gain.cancelScheduledValues(this.context?.currentTime ?? 0); gain.gain.setTargetAtTime(0.0001, this.context?.currentTime ?? 0, 0.015); oscillator.stop((this.context?.currentTime ?? 0) + 0.03); } catch { /* already stopped */ }
    });
    this.activeNodes = [];
    this.audioFiles.forEach((audio) => { audio.pause(); audio.currentTime = 0; });
  }

  async play(type) {
    if (!this.settings.enabled || (this.reducedMotion && type === 'question-next')) return;
    await this.activate();
    if (!this.context) return;
    this.stop();
    const file = this.audioFiles.get(type);
    if (file) {
      file.volume = this.fileVolume(type);
      file.currentTime = 0;
      file.play().catch(() => {});
      return;
    }
    const recipes = {
      'option-select': [[520, 0.055, 'sine']],
      'question-next': [[620, 0.11, 'sine']],
      'answer-correct': [[520, 0.13, 'sine'], [700, 0.17, 'sine']],
      'answer-wrong': [[270, 0.2, 'sine']],
      'exercise-complete': [[440, 0.16, 'sine'], [560, 0.18, 'sine'], [720, 0.28, 'sine']],
      achievement: [[430, 0.16, 'sine'], [560, 0.18, 'sine'], [700, 0.2, 'sine'], [860, 0.34, 'sine']],
    };
    const now = this.context.currentTime;
    const nodes = [];
    (recipes[type] ?? recipes['option-select']).forEach(([frequency, length, wave], index) => {
      const start = now + index * 0.085;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, this.gainLevel(type)), start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(start);
      oscillator.stop(start + length + 0.03);
      nodes.push({ oscillator, gain, type });
    });
    this.activeNodes = nodes;
    window.setTimeout(() => { this.activeNodes = this.activeNodes.filter((node) => nodes.includes(node) === false); }, soundDurations[type] * 1000 + 100);
  }
}

export const soundManager = new SoundManager();
