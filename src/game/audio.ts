import type { SfxName } from './types.ts';

const RATE: Partial<Record<SfxName, number>> = {
  kill: 80,
  frost: 110,
  pond: 150,
  leak: 180,
  burst: 200,
};

export type Mixer = {
  unlock: () => void;
  setMuted: (muted: boolean) => void;
  muted: () => boolean;
  play: (name: SfxName) => void;
};

export function createMixer(initialMute: boolean): Mixer {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let muted = initialMute;
  let noise: AudioBuffer | null = null;
  const last = new Map<SfxName, number>();
  let bellAt = 0;

  function context(): AudioContext | null {
    if (muted) return null;
    if (!ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(ctx.destination);
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noise = buffer;
      drone(73.42, 0.018);
      drone(110, 0.012);
      drone(164.81, 0.008);
      bellAt = ctx.currentTime + 6;
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function drone(freq: number, gain: number): void {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    amp.gain.value = gain;
    osc.connect(amp);
    amp.connect(master);
    osc.start();
  }

  function tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0): void {
    const audio = context();
    if (!audio || !master) return;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), audio.currentTime + dur);
    amp.gain.setValueAtTime(0.0001, audio.currentTime);
    amp.gain.exponentialRampToValueAtTime(gain, audio.currentTime + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    osc.connect(amp);
    amp.connect(master);
    osc.start();
    osc.stop(audio.currentTime + dur + 0.02);
  }

  function puff(dur: number, gain: number, freq: number): void {
    const audio = context();
    if (!audio || !master || !noise) return;
    const src = audio.createBufferSource();
    src.buffer = noise;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const amp = audio.createGain();
    amp.gain.setValueAtTime(gain, audio.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(master);
    src.start();
    src.stop(audio.currentTime + dur);
  }

  function maybeBell(): void {
    if (!ctx || muted) return;
    if (ctx.currentTime < bellAt) return;
    const notes = [587.33, 659.25, 739.99, 880, 987.77];
    const freq = notes[Math.floor(Math.random() * notes.length)] ?? 880;
    tone(freq, 1.6, 'sine', 0.02);
    bellAt = ctx.currentTime + 8 + Math.random() * 8;
  }

  const play = (name: SfxName): void => {
    if (muted) return;
    const gap = RATE[name] ?? 0;
    const now = performance.now();
    if (gap && now - (last.get(name) ?? 0) < gap) return;
    last.set(name, now);
    if (name === 'place') {
      puff(0.12, 0.05, 280);
      tone(523.25, 0.18, 'triangle', 0.04);
    } else if (name === 'upgrade') {
      tone(523.25, 0.22, 'sine', 0.04);
      tone(784, 0.32, 'sine', 0.03);
    } else if (name === 'sell') {
      tone(392, 0.2, 'triangle', 0.03, -80);
    } else if (name === 'pond') {
      puff(0.18, 0.04, 700);
    } else if (name === 'frost') {
      tone(1046, 0.12, 'sine', 0.025);
    } else if (name === 'burst') {
      tone(311, 0.28, 'sine', 0.04);
      tone(466, 0.36, 'triangle', 0.02);
    } else if (name === 'kill') {
      tone(660, 0.08, 'sine', 0.02);
    } else if (name === 'leak') {
      tone(146, 0.28, 'sine', 0.05);
    } else if (name === 'wave' || name === 'early') {
      tone(523.25, 0.4, 'sine', 0.035);
    } else if (name === 'boss') {
      tone(98, 0.6, 'sine', 0.05);
      tone(146, 0.7, 'triangle', 0.03);
    } else if (name === 'victory') {
      [523, 659, 784, 1046].forEach((freq, i) => {
        window.setTimeout(() => tone(freq, 0.4, 'sine', 0.04), i * 140);
      });
    } else if (name === 'defeat') {
      tone(392, 0.4, 'sine', 0.04, -120);
      tone(196, 0.7, 'triangle', 0.03);
    } else if (name === 'gold') {
      tone(220, 0.12, 'square', 0.015);
    }
    maybeBell();
  };

  return {
    unlock: () => {
      context();
    },
    setMuted: (next) => {
      muted = next;
      if (master) master.gain.value = next ? 0 : 0.85;
      if (!next) context();
    },
    muted: () => muted,
    play,
  };
}
