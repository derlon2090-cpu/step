/**
 * Low-latency UI audio for Nabahah. Listening audio deliberately stays on a
 * separate volume path so raising a lesson never makes UI feedback startling.
 * @typedef {'option-select'|'question-next'|'answer-correct'|'answer-wrong'|'exercise-complete'|'achievement'} NabahahSound
 */

const SETTINGS_KEY = 'nabahah-sound-settings-v1';
export const defaultSettings = Object.freeze({ enabled: true, volume: 0.50, listeningVolume: 0.50 });
export const SOUND_LEVELS = Object.freeze({
  'option-select': 0.42,
  'question-next': 0.38,
  'answer-correct': 0.92,
  'answer-wrong': 0.82,
  'exercise-complete': 0.90,
  achievement: 0.95,
});

const SOUND_META = Object.freeze({
  'option-select': { priority: 1, duration: 0.075 },
  'question-next': { priority: 0, duration: 0.13 },
  'answer-correct': { priority: 3, duration: 0.36 },
  'answer-wrong': { priority: 3, duration: 0.25 },
  'exercise-complete': { priority: 4, duration: 0.72 },
  achievement: { priority: 5, duration: 1.05 },
});
const SOUND_NAMES = Object.freeze(Object.keys(SOUND_META));

const clamp = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
};
const normalizeSettings = (settings = {}) => ({
  enabled: settings.enabled !== false,
  volume: clamp(settings.volume, defaultSettings.volume),
  listeningVolume: clamp(settings.listeningVolume, defaultSettings.listeningVolume),
});
function readSettings() {
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(SETTINGS_KEY));
    return normalizeSettings(saved && typeof saved === 'object' ? { ...defaultSettings, ...saved } : defaultSettings);
  } catch { return { ...defaultSettings }; }
}

class SoundManager {
  constructor() {
    this.settings = readSettings();
    this.context = null;
    this.masterGain = null;
    this.compressor = null;
    this.buffers = new Map();
    this.failedAssets = new Set();
    this.preloadPromise = null;
    this.active = new Set();
    this.activePriority = -1;
    this.activeUntil = 0;
    this.deferredTransition = null;
    this.previewTimer = null;
    this.listeningAudios = new Set();
    this.reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  getSettings() { return { ...this.settings }; }

  getDiagnostics() {
    return {
      loadedAssets: SOUND_NAMES.filter((name) => this.buffers.has(name)),
      failedAssets: [...this.failedAssets],
      masterBusReady: Boolean(this.masterGain && this.compressor),
    };
  }

  updateSettings(update) {
    this.settings = normalizeSettings({ ...this.settings, ...update });
    try { globalThis.localStorage?.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch { /* storage unavailable */ }
    if (this.masterGain && this.context) {
      this.masterGain.gain.cancelScheduledValues(this.context.currentTime);
      this.masterGain.gain.setTargetAtTime(this.settings.enabled ? this.settings.volume : 0, this.context.currentTime, 0.012);
    }
    if (!this.settings.enabled) this.stopAll();
    this.listeningAudios.forEach((audio) => { audio.volume = this.settings.listeningVolume; });
    if (Object.prototype.hasOwnProperty.call(update, 'volume') && this.settings.enabled && this.settings.volume > 0) {
      clearTimeout(this.previewTimer);
      this.previewTimer = globalThis.setTimeout?.(() => this.play('answer-correct'), 90);
    }
    return this.getSettings();
  }

  /** Per-sound headroom; the master applies UI volume directly with no 0.30 attenuation. */
  gainLevel(type) { return (SOUND_LEVELS[type] ?? SOUND_LEVELS['option-select']) * 0.70; }

  applyListeningVolume(audio) {
    if (audio) {
      audio.volume = this.settings.listeningVolume;
      this.listeningAudios.add(audio);
      audio.addEventListener?.('ended', () => this.listeningAudios.delete(audio), { once: true });
    }
    return audio;
  }

  createListeningAudio(src) {
    const audio = new Audio(src);
    audio.preload = 'metadata';
    return this.applyListeningVolume(audio);
  }

  ensureBus() {
    if (this.context) return true;
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) return false;
    this.context = new AudioContext({ latencyHint: 'interactive' });
    this.masterGain = this.context.createGain();
    this.compressor = this.context.createDynamicsCompressor();
    this.masterGain.gain.value = this.settings.enabled ? this.settings.volume : 0;
    this.compressor.threshold.value = -10;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.12;
    this.masterGain.connect(this.compressor).connect(this.context.destination);
    return true;
  }

  async preload() {
    if (!this.ensureBus()) return;
    if (this.preloadPromise) return this.preloadPromise;
    this.preloadPromise = Promise.all(SOUND_NAMES.map(async (name) => {
      try {
        const response = await fetch(`/audio/ui/${name}.mp3`, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.buffers.set(name, await this.context.decodeAudioData(await response.arrayBuffer()));
      } catch {
        this.failedAssets.add(name);
      }
    }));
    return this.preloadPromise;
  }

  async activate() {
    if (!this.ensureBus()) return false;
    if (this.context.state === 'suspended') await this.context.resume();
    await this.preload();
    return true;
  }

  releaseEntry(entry) {
    this.active.delete(entry);
    if (!this.active.size) {
      this.activePriority = -1;
      this.activeUntil = 0;
    } else {
      this.activePriority = Math.max(...[...this.active].map((item) => item.priority));
      this.activeUntil = Math.max(...[...this.active].map((item) => item.until));
    }
  }

  stopEntry(entry, fade = 0.018) {
    if (!this.context || !this.active.has(entry)) return;
    const now = this.context.currentTime;
    try {
      entry.gain.gain.cancelScheduledValues(now);
      entry.gain.gain.setTargetAtTime(0.0001, now, fade / 3);
      entry.source.stop(now + fade);
    } catch { /* source already ended */ }
    this.releaseEntry(entry);
  }

  stopAll(maxPriority = Infinity) {
    clearTimeout(this.deferredTransition);
    this.deferredTransition = null;
    [...this.active].filter((entry) => entry.priority <= maxPriority).forEach((entry) => this.stopEntry(entry));
  }

  scheduleTransition() {
    clearTimeout(this.deferredTransition);
    const remaining = Math.max(0, this.activeUntil - (this.context?.currentTime ?? 0));
    this.deferredTransition = globalThis.setTimeout?.(() => {
      this.deferredTransition = null;
      this.play('question-next');
    }, Math.min(420, Math.ceil(remaining * 1000) + 24));
  }

  playBuffer(type, buffer) {
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    const meta = SOUND_META[type];
    source.buffer = buffer;
    gain.gain.setValueAtTime(Math.max(0.0001, this.gainLevel(type)), now);
    source.connect(gain).connect(this.masterGain);
    const entry = { source, gain, priority: meta.priority, until: now + buffer.duration, type };
    source.onended = () => this.releaseEntry(entry);
    this.active.add(entry);
    this.activePriority = Math.max(this.activePriority, meta.priority);
    this.activeUntil = Math.max(this.activeUntil, entry.until);
    source.start(now);
  }

  playFallback(type) {
    const meta = SOUND_META[type];
    const now = this.context.currentTime;
    const recipes = {
      'option-select': [[760, 0.055, 'triangle', 0]],
      'question-next': [[610, 0.10, 'triangle', 0]],
      'answer-correct': [[510, 0.15, 'triangle', 0], [680, 0.19, 'sine', 0.075]],
      'answer-wrong': [[265, 0.20, 'triangle', 0]],
      'exercise-complete': [[440, 0.16, 'triangle', 0], [555, 0.19, 'sine', 0.12], [700, 0.28, 'sine', 0.25]],
      achievement: [[430, 0.17, 'triangle', 0], [560, 0.20, 'sine', 0.13], [700, 0.23, 'sine', 0.29], [850, 0.38, 'sine', 0.47]],
    };
    (recipes[type] ?? recipes['option-select']).forEach(([frequency, length, wave, delay]) => {
      const source = this.context.createOscillator();
      const gain = this.context.createGain();
      const start = now + delay;
      source.type = wave;
      source.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, this.gainLevel(type) * 0.72), start + 0.009);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
      source.connect(gain).connect(this.masterGain);
      const entry = { source, gain, priority: meta.priority, until: start + length, type };
      source.onended = () => this.releaseEntry(entry);
      this.active.add(entry);
      source.start(start);
      source.stop(start + length + 0.02);
    });
    this.activePriority = Math.max(this.activePriority, meta.priority);
    this.activeUntil = Math.max(this.activeUntil, now + meta.duration);
  }

  async play(type) {
    const meta = SOUND_META[type];
    if (!meta || !this.settings.enabled || (this.reducedMotion && type === 'question-next')) return false;
    if (!await this.activate()) return false;

    if (type === 'question-next' && this.activePriority >= 3) {
      this.scheduleTransition();
      return true;
    }
    if (meta.priority < this.activePriority) return false;
    this.stopAll(meta.priority);
    const buffer = this.buffers.get(type);
    if (buffer) this.playBuffer(type, buffer);
    else this.playFallback(type);
    return true;
  }
}

export const soundManager = new SoundManager();
