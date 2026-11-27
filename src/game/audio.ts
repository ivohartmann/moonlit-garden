import type { SfxName } from './types.ts';

const RATE: Partial<Record<SfxName, number>> = {
  hit: 55,
  kill: 70,
  leak: 140,
  click: 40,
};

const PHRASE: ReadonlyArray<readonly [number, number]> = [
  [0.2, 293.66],
  [2.4, 220],
  [4.6, 174.61],
  [6.7, 196],
  [8.8, 220],
  [11.2, 293.66],
  [13.3, 261.63],
  [15.4, 220],
  [17.2, 174.61],
];
const LOOP = 20;

export type Mixer = {
  unlock: () => void;
  setMuted: (muted: boolean) => void;
  muted: () => boolean;
  play: (name: SfxName) => void;
};

export function createMixer(initialMute: boolean): Mixer {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let music: GainNode | null = null;
  let sfx: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let muted = initialMute;
  let started = false;
  let cursor = 0;
  const last = new Map<SfxName, number>();

  function context(): AudioContext | null {
    if (muted) return null;
    if (!ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = 0.0001;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 12;
      comp.ratio.value = 2.4;
      comp.attack.value = 0.008;
      comp.release.value = 0.22;
      comp.connect(master);
      music = ctx.createGain();
      music.gain.value = 0.34;
      sfx = ctx.createGain();
      sfx.gain.value = 1;
      music.connect(comp);
      sfx.connect(comp);
      master.connect(ctx.destination);
      noise = brown(ctx);
      master.gain.linearRampToValueAtTime(0.72, ctx.currentTime + 0.6);
      beginMusic();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function beginMusic(): void {
    if (!ctx || !music || started) return;
    started = true;
    const bed = music;
    drone(73.42, 0.03, bed);
    drone(110, 0.016, bed);
    cursor = ctx.currentTime + 0.8;
    schedule();
  }

  function drone(freq: number, gain: number, dest: AudioNode): void {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = 280;
    filter.Q.value = 0.4;
    osc.type = 'sine';
    osc.frequency.value = freq;
    amp.gain.value = gain;
    lfo.frequency.value = 0.055;
    depth.gain.value = gain * 0.28;
    lfo.connect(depth);
    depth.connect(amp.gain);
    osc.connect(filter);
    filter.connect(amp);
    amp.connect(dest);
    osc.start();
    lfo.start();
  }

  function schedule(): void {
    if (!ctx || !music) return;
    const horizon = ctx.currentTime + 1.4;
    while (cursor < horizon) {
      for (const [offset, freq] of PHRASE) qin(music, freq, cursor + offset, 0.055, 2.1);
      bell(music, 587.33, cursor + 9.4, 0.016, 2.6);
      cursor += LOOP;
    }
    window.setTimeout(schedule, 500);
  }

  function tone(
    dest: AudioNode,
    freq: number,
    dur: number,
    gain: number,
    when: number,
    slide = 0,
    cutoff = 1600,
  ): void {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, when);
    filter.Q.value = 0.45;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, when);
    const landed = Math.max(46, slide === 0 ? freq : freq + slide);
    if (landed !== freq) osc.frequency.exponentialRampToValueAtTime(landed, when + dur);
    const attack = Math.min(0.028, Math.max(0.008, dur * 0.18));
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), when + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(dur, attack + 0.02));
    osc.connect(filter);
    filter.connect(amp);
    amp.connect(dest);
    osc.start(when);
    osc.stop(when + dur + 0.06);
  }

  function qin(dest: AudioNode, freq: number, when: number, gain: number, dur = 1.5): void {
    tone(dest, freq, dur, gain, when, 0, Math.min(1500, freq * 4.5));
    tone(dest, freq * 2, dur * 0.42, gain * 0.2, when, 0, Math.min(2100, freq * 6));
    tone(dest, freq * 3, dur * 0.16, gain * 0.05, when, 0, 2400);
  }

  function bell(dest: AudioNode, freq: number, when: number, gain: number, dur = 1.05): void {
    tone(dest, freq * 0.5, dur * 0.85, gain * 0.4, when, 0, 900);
    tone(dest, freq, dur, gain, when, 0, 1900);
    tone(dest, freq * 1.5, dur * 0.72, gain * 0.26, when, 0, 2400);
  }

  function air(freq: number, dur: number, gain: number, delay = 0): void {
    const audio = context();
    if (!audio || !sfx || !noise) return;
    const when = audio.currentTime + delay;
    const src = audio.createBufferSource();
    src.buffer = noise;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq, when);
    filter.Q.value = 0.6;
    const amp = audio.createGain();
    const attack = Math.min(0.03, dur * 0.35);
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(gain, when + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(sfx);
    src.start(when);
    src.stop(when + dur + 0.02);
  }

  function at(): number {
    return ctx?.currentTime ?? 0;
  }

  const voices: Record<SfxName, () => void> = {
    lantern: () => {
      if (!sfx) return;
      tone(sfx, 196, 0.22, 0.075, at(), 90, 700);
      air(520, 0.16, 0.03);
    },
    bamboo: () => {
      if (!sfx) return;
      tone(sfx, 349.23, 0.11, 0.05, at(), 0, 900);
      air(1400, 0.08, 0.032);
    },
    frost: () => {
      if (!sfx) return;
      bell(sfx, 784, at(), 0.05, 0.95);
    },
    pond: () => {
      if (!sfx) return;
      tone(sfx, 620, 0.26, 0.08, at(), -430, 900);
      air(480, 0.18, 0.028);
    },
    burst: () => {
      if (!sfx) return;
      const when = at();
      tone(sfx, 146, 0.24, 0.09, when, -70, 500);
      qin(sfx, 349.23, when, 0.04, 0.55);
      qin(sfx, 261.63, when + 0.04, 0.03, 0.5);
    },
    hit: () => {
      if (!sfx) return;
      tone(sfx, 587.33, 0.07, 0.026, at(), 0, 1200);
    },
    kill: () => {
      if (!sfx) return;
      const when = at();
      qin(sfx, 523.25, when, 0.04, 0.28);
      qin(sfx, 392, when + 0.06, 0.028, 0.32);
    },
    leak: () => {
      if (!sfx) return;
      tone(sfx, 164.81, 0.5, 0.07, at(), -80, 480);
    },
    place: () => {
      if (!sfx) return;
      const when = at();
      tone(sfx, 174.61, 0.16, 0.06, when, -50, 600);
      qin(sfx, 392, when, 0.035, 0.35);
    },
    upgrade: () => {
      if (!sfx) return;
      const when = at();
      qin(sfx, 293.66, when, 0.045, 0.4);
      qin(sfx, 349.23, when + 0.12, 0.04, 0.4);
      qin(sfx, 440, when + 0.24, 0.038, 0.5);
    },
    sell: () => {
      if (!sfx) return;
      const when = at();
      qin(sfx, 440, when, 0.035, 0.28);
      qin(sfx, 293.66, when + 0.12, 0.03, 0.36);
    },
    wave: () => {
      if (!sfx) return;
      const when = at();
      qin(sfx, 293.66, when, 0.05, 0.7);
      qin(sfx, 440, when + 0.18, 0.04, 0.8);
    },
    early: () => {
      if (!sfx) return;
      const when = at();
      qin(sfx, 349.23, when, 0.045, 0.45);
      qin(sfx, 523.25, when + 0.14, 0.035, 0.5);
    },
    boss: () => {
      if (!sfx) return;
      const when = at();
      tone(sfx, 82.41, 0.55, 0.08, when, -20, 320);
      qin(sfx, 110, when, 0.04, 1.1);
    },
    victory: () => {
      const bus = sfx;
      if (!bus) return;
      const when = at();
      [293.66, 349.23, 440, 587.33].forEach((freq, i) => qin(bus, freq, when + i * 0.2, 0.045, 0.7));
    },
    defeat: () => {
      const bus = sfx;
      if (!bus) return;
      const when = at();
      [440, 349.23, 293.66, 261.63].forEach((freq, i) => qin(bus, freq, when + i * 0.24, 0.04, 0.7));
    },
    gold: () => {
      if (!sfx) return;
      const when = at();
      tone(sfx, 311.13, 0.06, 0.03, when, 0, 800);
      tone(sfx, 246.94, 0.07, 0.025, when + 0.08, 0, 700);
    },
    click: () => {
      if (!sfx) return;
      qin(sfx, 784, at(), 0.022, 0.12);
    },
  };

  const play = (name: SfxName): void => {
    if (muted) return;
    const gap = RATE[name] ?? 0;
    const now = performance.now();
    if (gap && now - (last.get(name) ?? 0) < gap) return;
    last.set(name, now);
    if (!context() || !sfx) return;
    voices[name]();
  };

  return {
    unlock: () => {
      context();
    },
    setMuted: (next) => {
      muted = next;
      if (!next) context();
      if (ctx && master) {
        const value = master.gain.value;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(next ? 0 : 0.72, ctx.currentTime + 0.08);
      }
    },
    muted: () => muted,
    play,
  };
}

function brown(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastSample = 0;
  let peak = 0.0001;
  for (let i = 0; i < data.length; i++) {
    lastSample = lastSample * 0.985 + (Math.random() * 2 - 1) * 0.015;
    data[i] = lastSample;
    peak = Math.max(peak, Math.abs(lastSample));
  }
  const scale = 0.85 / peak;
  for (let i = 0; i < data.length; i++) data[i] = (data[i] ?? 0) * scale;
  return buffer;
}
