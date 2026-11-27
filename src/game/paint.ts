import { drawEnemy, drawShot, drawTower, type ActorPose } from './actors.ts';
import { START_LIVES, towerLevel } from './balance.ts';
import { DECOR, GATES, MOON, PATH, PLOTS, POND, VIEW_H, VIEW_W, plotById, pointAt } from './map.ts';
import { PAL } from './palette.ts';
import type { Enemy, Match, TowerKind } from './types.ts';
import { mulberry32 } from './util.ts';

type Ctx = CanvasRenderingContext2D;

export const DPR = 2;

export type RenderView = {
  hoverPlot: number | null;
  selectedPlot: number | null;
  armed: TowerKind | null;
  selectedTowerId: number | null;
  coarse: boolean;
};

type Petal = {
  x: number;
  y: number;
  speed: number;
  rot: number;
  vr: number;
  drift: number;
  plum: boolean;
  size: number;
};

type Spirit = { dist: number; speed: number; phase: number; swift: boolean };

let staticLayer: HTMLCanvasElement | null = null;
let petals: Petal[] | null = null;
let spirits: Spirit[] | null = null;

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function blossom(ctx: Ctx, x: number, y: number, r: number, color: string, rot: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.ellipse(r * 0.55, 0, r * 0.46, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = PAL.gold;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(0.8, r * 0.16), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function prepareCanvas(canvas: HTMLCanvasElement): Ctx {
  canvas.width = VIEW_W * DPR;
  canvas.height = VIEW_H * DPR;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建画布');
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  return ctx;
}

function ensureAmbience(): void {
  if (petals && spirits) return;
  const rng = mulberry32(11);
  petals = Array.from({ length: 28 }, () => ({
    x: rng() * VIEW_W,
    y: rng() * VIEW_H,
    speed: 12 + rng() * 16,
    rot: rng() * 6,
    vr: (rng() - 0.5) * 1.4,
    drift: rng() * 8,
    plum: rng() > 0.72,
    size: 2.2 + rng() * 2.2,
  }));
  spirits = [
    { dist: 200, speed: 48, phase: 0.2, swift: false },
    { dist: 900, speed: 70, phase: 1.4, swift: true },
    { dist: 1500, speed: 42, phase: 2.2, swift: false },
  ];
}

export function updateAmbience(dt: number): void {
  ensureAmbience();
  if (!petals || !spirits) return;
  for (const petal of petals) {
    petal.y += petal.speed * dt;
    petal.x += Math.sin(petal.y * 0.02 + petal.drift) * 18 * dt;
    petal.rot += petal.vr * dt;
    if (petal.y > VIEW_H + 12) {
      petal.y = -12;
      petal.x = (petal.x + 180) % VIEW_W;
    }
  }
  for (const spirit of spirits) {
    spirit.dist += spirit.speed * dt;
    if (spirit.dist > PATH.length) spirit.dist = 40;
  }
}

function drawGround(ctx: Ctx): void {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, '#1a2740');
  sky.addColorStop(0.22, '#152033');
  sky.addColorStop(0.55, '#14201c');
  sky.addColorStop(1, '#101612');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const moon = ctx.createRadialGradient(MOON.x, MOON.y, 10, MOON.x, MOON.y, 460);
  moon.addColorStop(0, 'rgba(232,238,248,0.28)');
  moon.addColorStop(0.35, 'rgba(180,198,214,0.08)');
  moon.addColorStop(1, 'rgba(180,198,214,0)');
  ctx.fillStyle = moon;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const rng = mulberry32(4);
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = `rgba(232,238,248,${0.25 + rng() * 0.55})`;
    ctx.beginPath();
    ctx.arc(40 + rng() * 520, 18 + rng() * 70, rng() * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 36; i++) {
    ctx.fillStyle = `rgba(46,78,58,${0.05 + rng() * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(rng() * VIEW_W, 80 + rng() * 620, 30 + rng() * 120, 18 + rng() * 50, rng() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const gravel = mulberry32(19);
  for (let i = 0; i < 420; i++) {
    const x = DECOR.gravel.x + (gravel() - 0.5) * 180;
    const y = DECOR.gravel.y + (gravel() - 0.5) * 90;
    ctx.fillStyle = `rgba(186,190,196,${0.15 + gravel() * 0.25})`;
    ctx.fillRect(x, y, 1.2, 1.2);
  }
}

function drawMoonDisc(ctx: Ctx): void {
  const g = ctx.createRadialGradient(MOON.x - 10, MOON.y - 12, 8, MOON.x, MOON.y, MOON.r);
  g.addColorStop(0, '#fbfcff');
  g.addColorStop(0.7, '#e4edf6');
  g.addColorStop(1, '#c5d2e2');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(MOON.x, MOON.y, MOON.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(150,168,186,0.28)';
  ctx.beginPath();
  ctx.ellipse(MOON.x - 8, MOON.y - 6, 10, 8, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(MOON.x + 12, MOON.y + 8, 7, 5, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawPond(ctx: Ctx): void {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(POND.x, POND.y, POND.rx, POND.ry, -0.08, 0, Math.PI * 2);
  const water = ctx.createRadialGradient(POND.x - 30, POND.y - 20, 10, POND.x, POND.y, POND.rx);
  water.addColorStop(0, '#1d6270');
  water.addColorStop(0.55, '#143e4a');
  water.addColorStop(1, '#0e2c34');
  ctx.fillStyle = water;
  ctx.fill();
  ctx.strokeStyle = 'rgba(170,198,196,0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.save();
  ctx.clip();
  const gleam = ctx.createLinearGradient(POND.x - 20, POND.y - POND.ry, POND.x + 10, POND.y + POND.ry);
  gleam.addColorStop(0, 'rgba(232,238,248,0)');
  gleam.addColorStop(0.45, 'rgba(232,238,248,0.28)');
  gleam.addColorStop(0.55, 'rgba(232,238,248,0.05)');
  gleam.addColorStop(1, 'rgba(232,238,248,0)');
  ctx.fillStyle = gleam;
  ctx.fillRect(POND.x - 40, POND.y - POND.ry, 70, POND.ry * 2);
  ctx.restore();

  const pads: [number, number, number][] = [
    [POND.x - 40, POND.y + 10, 16],
    [POND.x + 36, POND.y - 8, 13],
    [POND.x + 8, POND.y + 28, 11],
  ];
  for (const [x, y, r] of pads) {
    ctx.fillStyle = '#1e4a3c';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.72, 0.4, 0.3, Math.PI * 1.85);
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,220,190,0.25)';
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = '#1c3a32';
  ctx.lineWidth = 1.4;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const x = POND.x + side * (70 + i * 14);
      const y = POND.y - 50 + (i % 2) * 8;
      ctx.beginPath();
      ctx.moveTo(x, y + 16);
      ctx.quadraticCurveTo(x + side * 4, y, x + side * 2, y - 18);
      ctx.stroke();
    }
  }
}

function drawPath(ctx: Ctx): void {
  const pts = PATH.points;
  ctx.beginPath();
  const first = pts[0];
  if (!first) return;
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    if (p) ctx.lineTo(p.x, p.y);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#141a16';
  ctx.lineWidth = 40;
  ctx.stroke();
  ctx.strokeStyle = '#2a3138';
  ctx.lineWidth = 30;
  ctx.stroke();

  const rng = mulberry32(8);
  for (let i = 0; i < PATH.samples.length; i += 2) {
    const s = PATH.samples[i];
    if (!s) continue;
    ctx.save();
    ctx.translate(s.x + (rng() - 0.5) * 3, s.y + (rng() - 0.5) * 3);
    ctx.rotate(s.angle + (rng() - 0.5) * 0.12);
    const w = 15 + rng() * 8;
    const h = 11 + rng() * 5;
    roundRect(ctx, -w / 2, -h / 2, w, h, 2);
    const shade = 96 + Math.floor(rng() * 42);
    ctx.fillStyle = `rgb(${shade},${shade + 3},${shade + 10})`;
    ctx.fill();
    ctx.restore();
    if (rng() > 0.55) {
      ctx.fillStyle = 'rgba(70,110,78,0.45)';
      ctx.beginPath();
      ctx.ellipse(s.x + s.nx * 16, s.y + s.ny * 16, 2.2, 1.2, s.angle, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawWalls(ctx: Ctx): void {
  const paint = (x: number, y: number, w: number, h: number, vertical: boolean) => {
    ctx.fillStyle = '#171d2a';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(196,208,220,0.18)';
    if (vertical) ctx.fillRect(x + w - 2, y, 2, h);
    else ctx.fillRect(x, y, w, 2);
  };
  paint(16, 16, VIEW_W - 32, 24, false);
  paint(16, VIEW_H - 40, VIEW_W - 32, 24, false);
  const entryGap = GATES.entry.y;
  const exitGap = GATES.exit.y;
  paint(16, 16, 24, entryGap - 52, true);
  paint(16, entryGap + 36, 24, VIEW_H - (entryGap + 36) - 16, true);
  paint(VIEW_W - 40, 16, 24, exitGap - 52, true);
  paint(VIEW_W - 40, exitGap + 36, 24, VIEW_H - (exitGap + 36) - 16, true);

  for (const gate of [GATES.entry, GATES.exit]) {
    ctx.beginPath();
    ctx.arc(gate.x, gate.y, 30, 0, Math.PI * 2);
    ctx.strokeStyle = '#242b3a';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(214,222,232,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawPine(ctx: Ctx): void {
  const { x, y } = DECOR.pine;
  ctx.fillStyle = '#1a1612';
  ctx.fillRect(x - 2, y - 10, 4, 46);
  const layers = [
    { dy: -52, r: 28 },
    { dy: -34, r: 36 },
    { dy: -16, r: 30 },
  ];
  for (const layer of layers) {
    ctx.beginPath();
    ctx.moveTo(x, y + layer.dy - layer.r * 0.2);
    ctx.lineTo(x + layer.r, y + layer.dy + 16);
    ctx.lineTo(x - layer.r * 0.85, y + layer.dy + 14);
    ctx.closePath();
    ctx.fillStyle = '#15261e';
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,210,200,0.18)';
    ctx.stroke();
  }
}

function drawPlum(ctx: Ctx): void {
  const { x, y } = DECOR.plum;
  ctx.strokeStyle = '#241c18';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + 20);
  ctx.quadraticCurveTo(x - 10, y - 10, x - 36, y - 30);
  ctx.moveTo(x, y + 16);
  ctx.quadraticCurveTo(x + 16, y - 20, x + 40, y - 18);
  ctx.moveTo(x + 2, y + 10);
  ctx.quadraticCurveTo(x + 4, y - 30, x - 6, y - 58);
  ctx.stroke();
  const spots: [number, number][] = [
    [x - 34, y - 30],
    [x - 22, y - 16],
    [x + 36, y - 16],
    [x + 22, y - 6],
    [x - 4, y - 54],
    [x + 8, y - 40],
    [x - 14, y - 36],
    [x + 14, y - 28],
  ];
  spots.forEach(([px, py], i) => blossom(ctx, px, py, 5.5, i % 3 === 0 ? '#f7f1f0' : PAL.plum, i));
}

function drawBambooClump(ctx: Ctx): void {
  const { x, y } = DECOR.bamboo;
  for (let i = 0; i < 8; i++) {
    const sx = x + (i - 3.5) * 6;
    const h = 48 + (i % 3) * 16;
    ctx.strokeStyle = i % 2 ? '#356348' : '#1e3c2e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sx, y + 10);
    ctx.quadraticCurveTo(sx + 4, y - h * 0.4, sx - 2, y - h);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220,230,214,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - 2, y - h * 0.45);
    ctx.lineTo(sx + 3, y - h * 0.45);
    ctx.stroke();
  }
}

function drawRock(ctx: Ctx): void {
  const { x, y } = DECOR.rock;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-8, 16);
  ctx.lineTo(16, 10);
  ctx.lineTo(22, -8);
  ctx.lineTo(6, -22);
  ctx.lineTo(-14, -16);
  ctx.lineTo(-20, 2);
  ctx.closePath();
  ctx.moveTo(-2, -4);
  ctx.arc(-2, -4, 5, 0, Math.PI * 2, true);
  ctx.fillStyle = '#2a313c';
  ctx.fill('evenodd');
  ctx.strokeStyle = 'rgba(220,228,236,0.2)';
  ctx.stroke();
  ctx.restore();
}

function drawFlowers(ctx: Ctx): void {
  const rng = mulberry32(21);
  for (let i = 0; i < 14; i++) {
    const x = DECOR.flowers.x + (rng() - 0.5) * 90;
    const y = DECOR.flowers.y + (rng() - 0.5) * 36;
    blossom(ctx, x, y, 3.4 + rng() * 1.6, rng() > 0.5 ? '#f4f0ea' : PAL.plum, rng() * 6);
  }
}

function drawPlots(ctx: Ctx): void {
  for (const plot of PLOTS) {
    ctx.save();
    ctx.translate(plot.x, plot.y);
    ctx.fillStyle = 'rgba(8,10,8,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fillStyle = '#5e675f';
    ctx.fill();
    ctx.strokeStyle = 'rgba(227,193,122,0.45)';
    ctx.lineWidth = 1.25;
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(3, 3);
      ctx.arc(0, 0, 13, 0.28, Math.PI / 2 - 0.28);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? '#8d968c' : '#7b857c';
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(86,122,90,0.7)';
    ctx.beginPath();
    ctx.ellipse(8, 7, 3.2, 1.6, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawInscriptions(ctx: Ctx): void {
  ctx.fillStyle = 'rgba(220,214,196,0.55)';
  ctx.font = '600 14px "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.fillText('来处', GATES.entry.x + 46, GATES.entry.y - 46);
  ctx.fillText('去处', GATES.exit.x - 48, GATES.exit.y - 46);
  ctx.font = '400 18px "Ma Shan Zheng", cursive';
  ctx.fillStyle = 'rgba(227,214,186,0.42)';
  ctx.fillText('月下庭园', POND.x, POND.y - POND.ry - 16);
}

function drawStatic(ctx: Ctx): void {
  drawGround(ctx);
  drawMoonDisc(ctx);
  drawPond(ctx);
  drawPath(ctx);
  drawWalls(ctx);
  drawPine(ctx);
  drawPlum(ctx);
  drawBambooClump(ctx);
  drawRock(ctx);
  drawFlowers(ctx);
  drawPlots(ctx);
  drawInscriptions(ctx);
  const rng = mulberry32(33);
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let i = 0; i < 1600; i++) {
    ctx.fillRect(rng() * VIEW_W, rng() * VIEW_H, 1, 1);
  }
}

function ensureStatic(): HTMLCanvasElement {
  if (staticLayer) return staticLayer;
  const canvas = document.createElement('canvas');
  const ctx = prepareCanvas(canvas);
  drawStatic(ctx);
  staticLayer = canvas;
  return canvas;
}

function drawRange(ctx: Ctx, x: number, y: number, range: number, strong: boolean): void {
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  ctx.fillStyle = strong ? 'rgba(227,193,122,0.06)' : 'rgba(210,220,230,0.03)';
  ctx.fill();
  ctx.strokeStyle = strong ? 'rgba(227,193,122,0.8)' : 'rgba(210,220,230,0.2)';
  ctx.lineWidth = strong ? 1.5 : 1;
  ctx.stroke();
}

function occupied(match: Match, plotId: number): boolean {
  return match.towers.some((tower) => tower.plotId === plotId);
}

function drawRanges(ctx: Ctx, match: Match, view: RenderView): void {
  const selected = match.towers.find((tower) => tower.id === view.selectedTowerId);
  if (selected) {
    drawRange(ctx, selected.x, selected.y, towerLevel(selected.kind, selected.level).range, true);
    return;
  }
  if (!view.armed) return;
  const range = towerLevel(view.armed, 1).range;
  const focus = view.hoverPlot ?? view.selectedPlot;
  if (focus !== null && !occupied(match, focus)) {
    const plot = plotById(focus);
    if (plot) drawRange(ctx, plot.x, plot.y, range, true);
  }
  if (!view.coarse) return;
  for (const plot of PLOTS) {
    if (plot.id === focus || occupied(match, plot.id)) continue;
    drawRange(ctx, plot.x, plot.y, range, false);
  }
}

function poseOf(enemy: Enemy): ActorPose {
  return {
    kind: enemy.kind,
    x: enemy.x,
    y: enemy.y,
    angle: enemy.angle,
    phase: enemy.phase,
    hitFlash: enemy.hitFlash,
    radius: enemy.radius,
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    trail: enemy.trail,
    frosted: (enemy.frost?.t ?? 0) > 0,
    burning: (enemy.burn?.t ?? 0) > 0,
  };
}

export function render(ctx: Ctx, match: Match, view: RenderView, time: number): void {
  ensureAmbience();
  const base = ensureStatic();
  ctx.save();
  if (match.shake > 0.15) {
    ctx.translate(Math.sin(time * 42) * match.shake, Math.cos(time * 35) * match.shake * 0.6);
  }
  ctx.drawImage(base, 0, 0, VIEW_W, VIEW_H);

  const breath = 0.16 + Math.sin(time * 0.45) * 0.04;
  const halo = ctx.createRadialGradient(MOON.x, MOON.y, MOON.r * 0.4, MOON.x, MOON.y, 180);
  halo.addColorStop(0, `rgba(232,238,248,${breath})`);
  halo.addColorStop(1, 'rgba(232,238,248,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(MOON.x, MOON.y, 180, 0, Math.PI * 2);
  ctx.fill();

  if (match.phase !== 'title') {
    const lost = 1 - match.lives / START_LIVES;
    if (lost > 0.08) {
      ctx.strokeStyle = `rgba(20,16,18,${0.25 + lost * 0.55})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(MOON.x - 6, MOON.y - 10);
      ctx.lineTo(MOON.x + 4, MOON.y + 2);
      ctx.lineTo(MOON.x - 2, MOON.y + 16);
      if (lost > 0.4) {
        ctx.moveTo(MOON.x + 8, MOON.y - 14);
        ctx.lineTo(MOON.x + 16, MOON.y + 6);
      }
      ctx.stroke();
    }
  }

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(POND.x, POND.y, POND.rx - 4, POND.ry - 4, -0.08, 0, Math.PI * 2);
  ctx.clip();
  const band = (time * 18) % (POND.ry * 2);
  const shimmer = ctx.createLinearGradient(0, POND.y - POND.ry + band, 0, POND.y - POND.ry + band + 24);
  shimmer.addColorStop(0, 'rgba(255,255,255,0)');
  shimmer.addColorStop(0.5, 'rgba(220,236,240,0.18)');
  shimmer.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shimmer;
  ctx.fillRect(POND.x - POND.rx, POND.y - POND.ry, POND.rx * 2, POND.ry * 2);
  for (let i = 0; i < 2; i++) {
    const a = time * (0.35 + i * 0.12) + i;
    const x = POND.x + Math.cos(a) * (POND.rx * 0.45);
    const y = POND.y + Math.sin(a) * (POND.ry * 0.38);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = i === 0 ? '#c45548' : '#e6d2a8';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-11, -2);
    ctx.lineTo(-11, 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  ctx.save();
  for (let i = 0; i < 4; i++) {
    const y = 120 + i * 140;
    const x = ((time * (8 + i * 3) + i * 200) % (VIEW_W + 240)) - 120;
    const mist = ctx.createLinearGradient(x, y, x + 280, y);
    mist.addColorStop(0, 'rgba(206,214,220,0)');
    mist.addColorStop(0.5, `rgba(214,222,226,${0.035 + i * 0.008})`);
    mist.addColorStop(1, 'rgba(206,214,220,0)');
    ctx.fillStyle = mist;
    ctx.fillRect(x, y, 280, 36);
  }
  ctx.restore();

  for (let i = 0; i < 16; i++) {
    const d = (time * 42 + (i * PATH.length) / 16) % PATH.length;
    const p = pointAt(d);
    ctx.fillStyle = 'rgba(231,238,248,0.75)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const plot of PLOTS) {
    const hot = plot.id === view.hoverPlot || plot.id === view.selectedPlot;
    if (!hot) continue;
    ctx.beginPath();
    ctx.arc(plot.x, plot.y, 22, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(243,234,215,0.9)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  drawRanges(ctx, match, view);

  if (view.armed && view.hoverPlot !== null && !occupied(match, view.hoverPlot)) {
    const plot = plotById(view.hoverPlot);
    if (plot) {
      drawTower(
        ctx,
        {
          id: -1,
          kind: view.armed,
          plotId: plot.id,
          level: 1,
          x: plot.x,
          y: plot.y,
          cd: 0,
          acc: 0,
          buff: 0,
          invested: 0,
        },
        time,
        0.45,
      );
    }
  }

  for (const seal of match.towers) {
    if (seal.kind !== 'seal') continue;
    const range = towerLevel('seal', seal.level).range;
    ctx.strokeStyle = 'rgba(192,75,62,0.22)';
    ctx.lineWidth = 1;
    for (const other of match.towers) {
      if (other.id === seal.id) continue;
      const dx = other.x - seal.x;
      const dy = other.y - seal.y;
      if (dx * dx + dy * dy > range * range) continue;
      ctx.beginPath();
      ctx.moveTo(seal.x, seal.y);
      ctx.lineTo(other.x, other.y - 10);
      ctx.stroke();
    }
  }

  const towers = [...match.towers].sort((a, b) => a.y - b.y);
  for (const tower of towers) drawTower(ctx, tower, time, 1);

  if (match.phase === 'title' && spirits) {
    for (const spirit of spirits) {
      const p = pointAt(spirit.dist);
      const pose: ActorPose = {
        kind: spirit.swift ? 'swift' : 'moth',
        x: p.x,
        y: p.y,
        angle: p.angle,
        phase: spirit.phase,
        hitFlash: 0,
        radius: 10,
        hp: 1,
        maxHp: 1,
        trail: [],
        frosted: false,
        burning: false,
      };
      drawEnemy(ctx, pose, time);
    }
  }

  const enemies = [...match.enemies].sort((a, b) => a.y - b.y);
  for (const enemy of enemies) drawEnemy(ctx, poseOf(enemy), time);
  for (const shot of match.shots) drawShot(ctx, shot);

  for (const link of match.links) {
    ctx.strokeStyle = `rgba(213,230,244,${link.life / link.max})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(link.x1, link.y1);
    ctx.lineTo(link.x2, link.y2);
    ctx.stroke();
  }

  for (const spark of match.sparks) {
    const alpha = Math.max(0, spark.life / spark.max);
    ctx.globalAlpha = alpha;
    if (spark.kind === 'ring') {
      ctx.strokeStyle = spark.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.w + (1 - alpha) * spark.size * 0.15, 0, Math.PI * 2);
      ctx.stroke();
    } else if (spark.kind === 'petal') {
      ctx.save();
      ctx.translate(spark.x, spark.y);
      ctx.rotate(spark.rot);
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, spark.size * 1.6, spark.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.font = '600 13px "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  for (const text of match.floats) {
    ctx.globalAlpha = Math.max(0, text.life / text.max);
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, text.x, text.y);
  }
  ctx.globalAlpha = 1;

  if (petals) {
    for (const petal of petals) {
      ctx.save();
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.rot);
      ctx.fillStyle = petal.plum ? 'rgba(231,201,198,0.75)' : 'rgba(244,240,234,0.7)';
      ctx.beginPath();
      ctx.ellipse(0, 0, petal.size, petal.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  const flies = mulberry32(5);
  for (let i = 0; i < 14; i++) {
    const homeX = 80 + flies() * 1120;
    const homeY = 90 + flies() * 540;
    const speed = 0.6 + flies();
    const x = homeX + Math.sin(time * speed + i) * 16;
    const y = homeY + Math.cos(time * speed * 0.8 + i) * 10;
    const a = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(time * 3 + i));
    ctx.fillStyle = `rgba(214,196,120,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  const vignette = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 260, VIEW_W / 2, VIEW_H / 2, 760);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(4,6,10,0.45)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (match.hurt > 0) {
    ctx.fillStyle = `rgba(140,36,28,${match.hurt * 0.22})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  if (match.phase === 'defeat') {
    ctx.fillStyle = 'rgba(6,8,12,0.42)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  } else if (match.phase === 'victory') {
    ctx.fillStyle = 'rgba(232,238,248,0.08)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  ctx.restore();
}
