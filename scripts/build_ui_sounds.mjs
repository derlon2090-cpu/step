import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const sampleRate = 44100;
const outputDir = path.resolve('public/audio/ui');
const ffmpegCandidates = [
  process.env.FFMPEG_PATH,
  'ffmpeg',
  'C:/Program Files/CamStudio 2.7/ffmpeg.exe',
].filter(Boolean);

function seededNoise(seed = 17) {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return (value / 0xffffffff) * 2 - 1;
  };
}

function render(duration, layers) {
  const length = Math.ceil(duration * sampleRate);
  const samples = new Float32Array(length);
  layers.forEach((layer) => layer(samples));
  let peak = 0;
  samples.forEach((sample) => { peak = Math.max(peak, Math.abs(sample)); });
  const scale = peak > 0 ? Math.min(1, 0.82 / peak) : 1;
  for (let index = 0; index < length; index += 1) samples[index] *= scale;
  return samples;
}

function tone({ start = 0, duration, frequency, endFrequency = frequency, gain = 0.3, attack = 0.006, decay = 4.5, partials = [1, 0.23, 0.08] }) {
  return (samples) => {
    const first = Math.floor(start * sampleRate);
    const count = Math.min(samples.length - first, Math.floor(duration * sampleRate));
    let phase = 0;
    for (let index = 0; index < count; index += 1) {
      const time = index / sampleRate;
      const progress = time / duration;
      const hz = frequency * Math.pow(endFrequency / frequency, progress);
      phase += (Math.PI * 2 * hz) / sampleRate;
      const envelope = Math.min(1, time / attack) * Math.exp(-decay * progress);
      const sample = partials.reduce((sum, amplitude, partial) => sum + Math.sin(phase * (partial + 1)) * amplitude, 0);
      samples[first + index] += sample * gain * envelope;
    }
  };
}

function click({ start = 0, duration = 0.055, gain = 0.35, body = 720, seed = 17 }) {
  return (samples) => {
    const random = seededNoise(seed);
    const first = Math.floor(start * sampleRate);
    const count = Math.min(samples.length - first, Math.floor(duration * sampleRate));
    let smoothed = 0;
    for (let index = 0; index < count; index += 1) {
      const time = index / sampleRate;
      const envelope = Math.exp(-65 * time);
      smoothed = smoothed * 0.58 + random() * 0.42;
      const wood = Math.sin(Math.PI * 2 * body * time) * Math.exp(-42 * time);
      samples[first + index] += (smoothed * 0.52 + wood * 0.48) * envelope * gain;
    }
  };
}

function whoosh({ duration = 0.13, gain = 0.22, seed = 31 }) {
  return (samples) => {
    const random = seededNoise(seed);
    let slow = 0;
    let fast = 0;
    const count = Math.min(samples.length, Math.floor(duration * sampleRate));
    for (let index = 0; index < count; index += 1) {
      const progress = index / count;
      slow = slow * 0.94 + random() * 0.06;
      fast = fast * 0.58 + random() * 0.42;
      const band = fast - slow;
      const envelope = Math.pow(Math.sin(Math.PI * progress), 1.6) * (0.55 + progress * 0.45);
      samples[index] += band * envelope * gain;
    }
  };
}

const sounds = {
  'option-select': render(0.075, [click({ duration: 0.065, gain: 0.5, body: 820 })]),
  'question-next': render(0.13, [whoosh({}), click({ start: 0.064, duration: 0.045, gain: 0.12, body: 1050, seed: 43 })]),
  'answer-correct': render(0.36, [
    click({ duration: 0.065, gain: 0.34, body: 650, seed: 59 }),
    tone({ start: 0.025, duration: 0.24, frequency: 523.25, gain: 0.34, decay: 4.1 }),
    tone({ start: 0.105, duration: 0.25, frequency: 659.25, gain: 0.42, decay: 3.7 }),
  ]),
  'answer-wrong': render(0.25, [
    click({ duration: 0.08, gain: 0.32, body: 235, seed: 71 }),
    tone({ start: 0.018, duration: 0.225, frequency: 285, endFrequency: 218, gain: 0.45, decay: 4.1, partials: [1, 0.18, 0.04] }),
  ]),
  'exercise-complete': render(0.72, [
    click({ duration: 0.06, gain: 0.25, body: 610, seed: 83 }),
    tone({ start: 0.015, duration: 0.34, frequency: 440, gain: 0.31, decay: 4 }),
    tone({ start: 0.16, duration: 0.38, frequency: 554.37, gain: 0.34, decay: 3.7 }),
    tone({ start: 0.33, duration: 0.38, frequency: 659.25, gain: 0.4, decay: 3.2 }),
  ]),
  achievement: render(1.05, [
    click({ duration: 0.07, gain: 0.23, body: 600, seed: 97 }),
    whoosh({ duration: 0.22, gain: 0.08, seed: 101 }),
    tone({ start: 0.02, duration: 0.43, frequency: 440, gain: 0.28, decay: 3.9 }),
    tone({ start: 0.17, duration: 0.45, frequency: 554.37, gain: 0.3, decay: 3.7 }),
    tone({ start: 0.34, duration: 0.48, frequency: 659.25, gain: 0.34, decay: 3.4 }),
    tone({ start: 0.55, duration: 0.49, frequency: 880, gain: 0.38, decay: 3.1 }),
  ]),
};

function wavBuffer(samples) {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + dataBytes, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(dataBytes, 40);
  samples.forEach((sample, index) => buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2));
  return buffer;
}

fs.mkdirSync(outputDir, { recursive: true });
const ffmpeg = ffmpegCandidates.find((candidate) => {
  const result = spawnSync(candidate, ['-version'], { stdio: 'ignore' });
  return result.status === 0;
});
if (!ffmpeg) throw new Error('ffmpeg is required to encode the UI sound assets. Set FFMPEG_PATH.');

for (const [name, samples] of Object.entries(sounds)) {
  const wavPath = path.join(outputDir, `${name}.wav`);
  const mp3Path = path.join(outputDir, `${name}.mp3`);
  fs.writeFileSync(wavPath, wavBuffer(samples));
  const encoded = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', wavPath, '-codec:a', 'libmp3lame', '-q:a', '3', mp3Path]);
  fs.rmSync(wavPath);
  if (encoded.status !== 0) throw new Error(`Failed to encode ${name}: ${encoded.stderr?.toString() ?? ''}`);
}

console.log(`Built ${Object.keys(sounds).length} premium UI sounds in ${outputDir}`);
