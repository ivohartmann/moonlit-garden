import './fonts.css';
import './style.css';
import { TOWER_ORDER, buyCost } from './game/balance.ts';
import { VIEW_H, VIEW_W, plotAt } from './game/map.ts';
import { render, prepareCanvas, updateAmbience, type RenderView } from './game/paint.ts';
import {
  callWave,
  createMatch,
  newGame,
  pauseMatch,
  resumeMatch,
  step,
  togglePause,
  tryPlace,
  trySell,
  tryUpgrade,
} from './game/sim.ts';
import type { Match, TowerKind } from './game/types.ts';
import { createMixer } from './game/audio.ts';
import { mountUi, type HudState } from './game/ui.ts';

const MUTE_KEY = 'moonlit-garden-mute';
const stageNode = document.getElementById('stage');
const canvasNode = document.getElementById('game');
if (!(stageNode instanceof HTMLElement) || !(canvasNode instanceof HTMLCanvasElement)) {
  throw new Error('庭园画布没有准备好');
}
const stage: HTMLElement = stageNode;
const canvas: HTMLCanvasElement = canvasNode;

const ctx = prepareCanvas(canvas);
const coarse = window.matchMedia('(pointer: coarse)').matches;
let match: Match = createMatch('title');
let armed: TowerKind | null = null;
let hoverPlot: number | null = null;
let selectedPlot: number | null = null;
let selectedId: number | null = null;
let fast = false;
let guide = false;
let hint = true;
let toast = '';
let toastUntil = 0;
let pausedForGuide = false;
let last = performance.now();

const mixer = createMixer(localStorage.getItem(MUTE_KEY) === '1');

function hud(): HudState {
  return {
    armed,
    selectedId,
    muted: mixer.muted(),
    fast,
    guide,
    hint,
    toast: performance.now() < toastUntil ? toast : '',
  };
}

function notify(text: string): void {
  toast = text;
  toastUntil = performance.now() + 1300;
}

function view(): RenderView {
  return { hoverPlot, selectedPlot, armed, selectedTowerId: selectedId, coarse };
}

function clearSelection(): void {
  selectedPlot = null;
  selectedId = null;
}

function toggleMute(): void {
  const next = !mixer.muted();
  mixer.setMuted(next);
  localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  if (!next) mixer.unlock();
}

function openGuide(open: boolean): void {
  if (open) {
    if (match.phase === 'prepare' || match.phase === 'combat') {
      pauseMatch(match);
      pausedForGuide = true;
    }
    guide = true;
    return;
  }
  guide = false;
  if (pausedForGuide) {
    resumeMatch(match);
    pausedForGuide = false;
  }
}

function startRun(): void {
  mixer.unlock();
  match = newGame();
  armed = null;
  clearSelection();
  hint = true;
  fast = false;
  guide = false;
  pausedForGuide = false;
}

const sync = mountUi({
  arm: (kind) => armKind(kind),
  upgrade: () => {
    if (selectedId === null) return;
    if (!tryUpgrade(match, selectedId)) notify('铜钱不足');
  },
  sell: () => {
    if (selectedId === null) return;
    trySell(match, selectedId);
    clearSelection();
  },
  call: () => callWave(match),
  pause: () => pauseMatch(match),
  resume: () => resumeMatch(match),
  restart: () => startRun(),
  title: () => {
    match = createMatch('title');
    armed = null;
    clearSelection();
    guide = false;
    pausedForGuide = false;
  },
  speed: () => {
    fast = !fast;
  },
  mute: () => toggleMute(),
  start: () => startRun(),
  guide: (open) => openGuide(open),
  dismissHint: () => {
    hint = false;
  },
});

function armKind(kind: TowerKind): void {
  if (match.phase !== 'prepare' && match.phase !== 'combat') return;
  mixer.play('click');
  armed = armed === kind ? null : kind;
  if (armed) selectedId = null;
}

function localPoint(event: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
    y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
  };
}

function playing(): boolean {
  return match.phase === 'prepare' || match.phase === 'combat';
}

canvas.addEventListener('pointermove', (event) => {
  const point = localPoint(event);
  hoverPlot = plotAt(point.x, point.y, coarse ? 42 : 36);
  canvas.style.cursor = hoverPlot !== null ? 'pointer' : 'default';
});

canvas.addEventListener('pointerdown', (event) => {
  if (!playing()) return;
  const point = localPoint(event);
  const id = plotAt(point.x, point.y, coarse ? 42 : 36);
  if (event.button === 2) {
    event.preventDefault();
    if (id === null) return;
    const tower = match.towers.find((item) => item.plotId === id);
    if (!tower) return;
    trySell(match, tower.id);
    if (selectedId === tower.id) clearSelection();
    return;
  }
  if (id === null) {
    clearSelection();
    return;
  }
  const tower = match.towers.find((item) => item.plotId === id) ?? null;
  if (tower) {
    selectedPlot = id;
    selectedId = tower.id;
    armed = null;
    return;
  }
  if (armed) {
    const kind = armed;
    if (match.gold < buyCost(kind)) {
      notify('铜钱不足');
      selectedPlot = id;
      return;
    }
    if (tryPlace(match, id, kind)) {
      hint = false;
      selectedPlot = id;
    }
    return;
  }
  selectedPlot = id;
  selectedId = null;
});

canvas.addEventListener('contextmenu', (event) => event.preventDefault());

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  const key = event.key.toLowerCase();
  if (event.key === ' ' || event.key === 'Escape') event.preventDefault();

  if (key === 'm') {
    toggleMute();
    return;
  }
  if (guide && event.key === 'Escape') {
    openGuide(false);
    return;
  }
  if (match.phase === 'title') {
    if (event.key === ' ' || event.key === 'Enter') startRun();
    return;
  }
  if (match.phase === 'victory' || match.phase === 'defeat') {
    if (event.key === ' ' || event.key === 'Enter') startRun();
    if (event.key === 'Escape') {
      match = createMatch('title');
      clearSelection();
    }
    return;
  }
  if (event.key === 'Escape') {
    togglePause(match);
    return;
  }
  if (match.phase === 'paused') {
    if (event.key === ' ') resumeMatch(match);
    return;
  }
  if (event.key === ' ') callWave(match);
  if (key === 'f') fast = !fast;
  if (key === 'u' && selectedId !== null && !tryUpgrade(match, selectedId)) notify('铜钱不足');
  if ((key === 'x' || event.key === 'Backspace') && selectedId !== null) {
    trySell(match, selectedId);
    clearSelection();
  }
  const index = Number(event.key) - 1;
  const kind = TOWER_ORDER[index];
  if (kind && playing()) armKind(kind);
});

function fit(): void {
  const scale = Math.min(1.35, (window.innerWidth - 16) / VIEW_W, (window.innerHeight - 16) / VIEW_H);
  stage.style.transform = `scale(${Math.max(0.2, scale)})`;
}

window.addEventListener('resize', fit);
fit();

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (match.phase === 'title' || match.phase === 'prepare' || match.phase === 'combat') {
    updateAmbience(dt);
  }
  if (match.phase === 'prepare' || match.phase === 'combat') {
    const before = match.sfx.length;
    step(match, dt * (fast ? 2 : 1));
    for (let i = before; i < match.sfx.length; i++) {
      const name = match.sfx[i];
      if (name) mixer.play(name);
    }
    match.sfx.length = 0;
  }
  render(ctx, match, view(), match.phase === 'paused' ? match.time : performance.now() / 1000);
  sync(match, hud());
  requestAnimationFrame(frame);
}

async function boot(): Promise<void> {
  await Promise.race([
    Promise.all([
      document.fonts.load('16px "Noto Serif SC"', '月下庭园石灯'),
      document.fonts.load('24px "Ma Shan Zheng"', '月下庭园'),
    ]),
    new Promise((resolve) => window.setTimeout(resolve, 1800)),
  ]);
  requestAnimationFrame(frame);
}

void boot();
