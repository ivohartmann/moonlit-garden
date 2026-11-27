import { PAL } from './palette.ts';
import type { EnemyKind, Shot, Tower, TowerKind } from './types.ts';

type Ctx = CanvasRenderingContext2D;

export type ActorPose = {
  kind: EnemyKind;
  x: number;
  y: number;
  angle: number;
  phase: number;
  hitFlash: number;
  radius: number;
  hp: number;
  maxHp: number;
  trail: { x: number; y: number }[];
  frosted: boolean;
  burning: boolean;
};

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
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
    ctx.ellipse(r * 0.55, 0, r * 0.48, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = PAL.gold;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLantern(ctx: Ctx, level: number, time: number): void {
  const height = level === 3 ? 64 : level === 2 ? 56 : 48;
  const glow = 0.75 + Math.sin(time * 5.5) * 0.12;
  const flame = level === 3 ? '#f7fbff' : '#f3d7a2';
  const pool = ctx.createRadialGradient(0, -height * 0.45, 4, 0, -height * 0.35, 36 + level * 10);
  pool.addColorStop(0, level === 3 ? `rgba(232,238,248,${0.34 * glow})` : `rgba(243,215,162,${0.38 * glow})`);
  pool.addColorStop(1, 'rgba(243,215,162,0)');
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.arc(0, -height * 0.4, 42 + level * 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(5,7,10,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 16, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5d6572';
  roundRect(ctx, -12, -8, 24, 11, 2);
  ctx.fill();
  ctx.fillStyle = '#9aa3af';
  roundRect(ctx, -9, -7, 18, 3, 1);
  ctx.fill();

  ctx.fillStyle = '#3e4654';
  ctx.fillRect(-2.4, -height + 24, 4.8, height - 30);

  const chamber = ctx.createLinearGradient(-9, 0, 9, 0);
  chamber.addColorStop(0, '#8a6230');
  chamber.addColorStop(0.5, flame);
  chamber.addColorStop(1, '#8a6230');
  ctx.fillStyle = chamber;
  roundRect(ctx, -8, -height + 8, 16, 18, 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,42,16,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const x of [-4, 0, 4]) {
    ctx.moveTo(x, -height + 12);
    ctx.lineTo(x, -height + 22);
  }
  ctx.stroke();

  ctx.fillStyle = '#232a38';
  ctx.beginPath();
  ctx.moveTo(-15, -height + 10);
  ctx.lineTo(0, -height - 4);
  ctx.lineTo(15, -height + 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(210,220,232,0.35)';
  ctx.stroke();
  ctx.fillStyle = PAL.stoneLite;
  ctx.fillRect(-1.2, -height - 8, 2.4, 6);
}

function drawBamboo(ctx: Ctx, level: number, time: number): void {
  const count = level === 1 ? 5 : level === 2 ? 7 : 9;
  ctx.fillStyle = 'rgba(5,7,10,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * 4.4;
    const height = 34 + (i % 4) * 9 + level * 5;
    const sway = Math.sin(time * 1.3 + i * 0.7) * (3 + level);
    ctx.strokeStyle = i % 2 === 0 ? '#3e6b4c' : '#244233';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, 2);
    ctx.quadraticCurveTo(x + sway * 0.35, -height * 0.55, x + sway, -height);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(214,226,206,0.75)';
    ctx.lineWidth = 1;
    for (let k = 1; k <= 3; k++) {
      const t = k / 4;
      const y = -height * t;
      const sx = x + sway * t;
      ctx.beginPath();
      ctx.moveTo(sx - 2.2, y);
      ctx.lineTo(sx + 2.2, y);
      ctx.stroke();
    }
    ctx.fillStyle = i % 2 === 0 ? '#8eae86' : '#6d9470';
    ctx.beginPath();
    ctx.ellipse(x + sway + 7, -height + 6, 8, 2.1, -0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + sway - 6, -height + 12, 7, 1.8, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  if (level === 3) {
    ctx.strokeStyle = 'rgba(190,214,196,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -16, 20 + Math.sin(time * 2) * 2, time, time + Math.PI * 1.4);
    ctx.stroke();
  }
}

function drawFrostTree(ctx: Ctx, level: number, time: number): void {
  ctx.fillStyle = 'rgba(5,7,10,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a211c';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-2, 4);
  ctx.quadraticCurveTo(-6, -16, -16, -28);
  ctx.moveTo(0, 2);
  ctx.quadraticCurveTo(8, -20, 18, -34);
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(2, -24, -2, -42 - level * 3);
  ctx.stroke();
  const blooms: [number, number, number][] = [
    [-16, -28, 0.2],
    [-10, -20, 1],
    [16, -32, 0.4],
    [10, -22, 1.4],
    [0, -40, 0.8],
    [4, -30, 2],
  ];
  if (level > 1) blooms.push([-4, -48, 0.5], [12, -40, 1.2]);
  if (level > 2) blooms.push([0, -54, 0.1], [-18, -36, 2.2]);
  for (const [x, y, rot] of blooms) {
    blossom(ctx, x, y, level === 3 ? 5.2 : 4.4, level === 3 ? '#f4fbff' : PAL.plum, rot);
  }
  ctx.fillStyle = 'rgba(213,230,244,0.85)';
  const motes = 4 + level * 2;
  for (let i = 0; i < motes; i++) {
    const a = time * 0.8 + i;
    const r = 10 + (i % 5) * 4;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, -24 + Math.sin(a * 1.3) * 10, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSpring(ctx: Ctx, level: number, time: number): void {
  const radius = 16 + level * 3.2;
  ctx.fillStyle = 'rgba(5,7,10,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 6, radius + 4, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#66717c';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, radius - 3.2, 0, Math.PI * 2);
  const water = ctx.createRadialGradient(-4, -5, 2, 0, 0, radius);
  water.addColorStop(0, '#d5eef0');
  water.addColorStop(0.35, '#3e8b90');
  water.addColorStop(1, '#143e48');
  ctx.fillStyle = water;
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,244,244,0.55)';
  ctx.lineWidth = 1;
  const phase = (time * 0.7) % 1;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(2, (radius - 7) * phase), 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(230,244,244,0.28)';
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(2, (radius - 7) * ((phase + 0.45) % 1)), 0, Math.PI * 2);
  ctx.stroke();
  if (level === 3) {
    ctx.strokeStyle = 'rgba(244,251,255,0.8)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.quadraticCurveTo(3, -6, 0, -radius + 5);
    ctx.stroke();
  }
}

function drawSeal(ctx: Ctx, level: number, time: number): void {
  ctx.fillStyle = 'rgba(5,7,10,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a322c';
  roundRect(ctx, -15, -10, 30, 22, 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(227,193,122,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  const pulse = 0.82 + Math.sin(time * 2.2) * 0.18;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = level === 3 ? '#d45548' : '#9d342c';
  ctx.beginPath();
  ctx.arc(0, -1, 8.5 + level * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = PAL.paper;
  ctx.font = '600 12px "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('印', 0, -0.5);
  if (level >= 2) {
    ctx.strokeStyle = 'rgba(192,75,62,0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -1, 13 + level, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (level === 3) {
    ctx.save();
    ctx.rotate(time * 0.35);
    ctx.setLineDash([2.5, 4]);
    ctx.strokeStyle = 'rgba(224,120,96,0.9)';
    ctx.beginPath();
    ctx.arc(0, -1, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash([]);
  }
}

export function drawTower(ctx: Ctx, tower: Tower, time: number, alpha = 1): void {
  ctx.save();
  ctx.translate(tower.x, tower.y);
  ctx.globalAlpha = alpha;
  if (tower.kind === 'lantern') drawLantern(ctx, tower.level, time);
  else if (tower.kind === 'bamboo') drawBamboo(ctx, tower.level, time);
  else if (tower.kind === 'frost') drawFrostTree(ctx, tower.level, time);
  else if (tower.kind === 'pond') drawSpring(ctx, tower.level, time);
  else drawSeal(ctx, tower.level, time);
  ctx.restore();
}

export function drawTowerIcon(ctx: Ctx, kind: TowerKind): void {
  const fake: Tower = {
    id: 0,
    kind,
    plotId: 0,
    level: kind === 'seal' || kind === 'pond' ? 2 : 1,
    x: 0,
    y: 0,
    cd: 0,
    acc: 0,
    buff: 0,
    invested: 0,
  };
  ctx.save();
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.translate(ctx.canvas.width / 2, ctx.canvas.height * 0.72);
  ctx.scale(0.62, 0.62);
  drawTower(ctx, fake, 1.2, 1);
  ctx.restore();
}

function wing(ctx: Ctx, side: number, flap: number, fill: string, edge: string): void {
  ctx.save();
  ctx.scale(side, flap);
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.quadraticCurveTo(18, -8, 26, -2);
  ctx.quadraticCurveTo(22, 8, 10, 10);
  ctx.quadraticCurveTo(4, 6, 2, 0);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(6, 1);
  ctx.quadraticCurveTo(14, 0, 22, -1);
  ctx.strokeStyle = 'rgba(232,238,248,0.35)';
  ctx.stroke();
  ctx.restore();
}

function drawMoth(ctx: Ctx, pose: ActorPose, time: number, swift: boolean): void {
  const flap = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * (swift ? 16 : 9) + pose.phase));
  ctx.rotate(pose.angle + Math.sin(time * 2 + pose.phase) * 0.15);
  const fill = swift ? 'rgba(214,224,234,0.38)' : 'rgba(18,20,28,0.82)';
  const edge = swift ? 'rgba(244,248,252,0.9)' : 'rgba(210,220,232,0.55)';
  wing(ctx, -1, flap, fill, edge);
  wing(ctx, 1, flap, fill, edge);
  ctx.fillStyle = swift ? '#d5dee8' : '#10141c';
  ctx.beginPath();
  ctx.ellipse(0, 0, swift ? 3 : 3.4, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.quadraticCurveTo(-7, -16, -5, -20);
  ctx.moveTo(0, -8);
  ctx.quadraticCurveTo(7, -16, 5, -20);
  ctx.stroke();
  ctx.fillStyle = swift ? PAL.moon : PAL.gold;
  ctx.beginPath();
  ctx.arc(-10, -2, 1.3, 0, Math.PI * 2);
  ctx.arc(10, -2, 1.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawBeast(ctx: Ctx, pose: ActorPose, time: number): void {
  ctx.rotate(pose.angle);
  const stride = Math.sin(time * 7 + pose.phase);
  ctx.fillStyle = 'rgba(12,14,20,0.92)';
  ctx.beginPath();
  ctx.ellipse(-2, 0, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(10, -1, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(12, -5);
  ctx.lineTo(16, -11);
  ctx.lineTo(14, -4);
  ctx.moveTo(8, -5);
  ctx.lineTo(6, -11);
  ctx.lineTo(11, -4);
  ctx.fill();
  ctx.strokeStyle = '#1a1e28';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-12, 2);
  ctx.quadraticCurveTo(-20, 6 + stride * 3, -24, 1);
  ctx.stroke();
  for (const [x, phase] of [
    [6, 0],
    [2, Math.PI],
    [-6, 1],
    [-10, 2],
  ] as const) {
    const step = Math.sin(time * 8 + pose.phase + phase) * 3;
    ctx.beginPath();
    ctx.moveTo(x, 4);
    ctx.lineTo(x + step, 9);
    ctx.stroke();
  }
  ctx.fillStyle = PAL.cinnabar;
  ctx.beginPath();
  ctx.arc(13, -2, 1.2, 0, Math.PI * 2);
  ctx.arc(10, -2, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,228,238,0.35)';
  ctx.stroke();
}

function drawCrane(ctx: Ctx, pose: ActorPose, time: number): void {
  ctx.rotate(pose.angle);
  const flap = Math.sin(time * 5 + pose.phase) > 0 ? 1 : 0.35;
  ctx.fillStyle = '#efe4d2';
  ctx.strokeStyle = '#2a241c';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(2, -4);
  ctx.lineTo(-8, 0);
  ctx.lineTo(2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#d9cbb4';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-16, -16 * flap);
  ctx.lineTo(-4, -2);
  ctx.closePath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-16, 16 * flap);
  ctx.lineTo(-4, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40,32,24,0.45)';
  ctx.beginPath();
  ctx.moveTo(2, -3);
  ctx.lineTo(-6, -10 * flap);
  ctx.moveTo(2, 3);
  ctx.lineTo(-6, 10 * flap);
  ctx.stroke();
  ctx.strokeStyle = '#2a241c';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(18, -2);
  ctx.lineTo(22, 0);
  ctx.stroke();
  ctx.fillStyle = PAL.cinnabar;
  ctx.beginPath();
  ctx.arc(8, -1.5, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawWisp(ctx: Ctx, pose: ActorPose, time: number): void {
  const bob = Math.sin(time * 3 + pose.phase) * 2;
  ctx.translate(0, bob);
  const glow = ctx.createRadialGradient(0, -2, 2, 0, -2, 18);
  glow.addColorStop(0, pose.burning ? 'rgba(224,176,106,0.2)' : 'rgba(240,210,150,0.55)');
  glow.addColorStop(1, 'rgba(224,176,106,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -2, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6a4328';
  roundRect(ctx, -8, -14, 16, 18, 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(240,210,160,0.7)';
  ctx.lineWidth = 1;
  ctx.stroke();
  const flame = ctx.createRadialGradient(0, -6, 1, 0, -4, 7);
  flame.addColorStop(0, '#fff4dd');
  flame.addColorStop(0.5, pose.burning ? '#c04b3e' : '#e7b15a');
  flame.addColorStop(1, 'rgba(180,80,40,0.2)');
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.ellipse(0, -5, 4.5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a2418';
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(0, 12);
  ctx.moveTo(-3, 12);
  ctx.lineTo(3, 12);
  ctx.stroke();
  if (!pose.burning && pose.hp < pose.maxHp) {
    ctx.strokeStyle = 'rgba(140,190,160,0.8)';
    ctx.beginPath();
    ctx.arc(0, -5, 9 + Math.sin(time * 4) * 1.2, 0.2, Math.PI * 1.2);
    ctx.stroke();
  }
}

function drawWyrm(ctx: Ctx, pose: ActorPose, time: number): void {
  const trail = pose.trail.length > 1 ? pose.trail : [{ x: pose.x - 16, y: pose.y }, { x: pose.x, y: pose.y }];
  for (let i = 0; i < trail.length; i++) {
    const p = trail[i];
    if (!p) continue;
    const t = i / trail.length;
    ctx.beginPath();
    ctx.fillStyle = `rgba(16,22,28,${0.4 + t * 0.55})`;
    ctx.arc(p.x, p.y, 5 + t * 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.angle);
  ctx.fillStyle = '#121820';
  ctx.beginPath();
  ctx.ellipse(4, 0, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180,210,200,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2, -6);
  ctx.lineTo(8, -12);
  ctx.lineTo(10, -4);
  ctx.moveTo(2, 6);
  ctx.lineTo(8, 12);
  ctx.lineTo(10, 4);
  ctx.fillStyle = '#1c2830';
  ctx.fill();
  ctx.fillStyle = '#d5e6e2';
  ctx.beginPath();
  ctx.ellipse(10, -1.5, 2.2, 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#101418';
  ctx.beginPath();
  ctx.arc(10.6, -1.5, 0.7, 0, Math.PI * 2);
  ctx.fill();
  const flick = Math.sin(time * 6 + pose.phase) * 2;
  ctx.strokeStyle = 'rgba(210,220,230,0.55)';
  ctx.beginPath();
  ctx.moveTo(12, 1);
  ctx.quadraticCurveTo(20, 4 + flick, 24, 1);
  ctx.stroke();
  ctx.restore();
}

function drawArmor(ctx: Ctx, pose: ActorPose, time: number): void {
  ctx.rotate(pose.angle);
  const stride = Math.sin(time * 4 + pose.phase) * 2;
  ctx.fillStyle = '#161a22';
  ctx.beginPath();
  ctx.ellipse(0, 1, 16, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#242a36';
  ctx.beginPath();
  ctx.ellipse(-1, -2, 11, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(227,193,122,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(-1, -2, 11, 7, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#10141c';
  ctx.beginPath();
  ctx.arc(12, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(210,220,230,0.4)';
  ctx.stroke();
  ctx.fillStyle = PAL.cinnabar;
  ctx.beginPath();
  ctx.arc(14, -1, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#12161e';
  ctx.lineWidth = 2;
  for (const x of [6, -2, -8]) {
    ctx.beginPath();
    ctx.moveTo(x, 6);
    ctx.lineTo(x + stride, 11);
    ctx.stroke();
  }
}

function drawBoss(ctx: Ctx, pose: ActorPose, time: number): void {
  const trail = pose.trail.length > 1 ? pose.trail : [{ x: pose.x - 20, y: pose.y }, { x: pose.x, y: pose.y }];
  for (let i = 0; i < trail.length; i++) {
    const p = trail[i];
    if (!p) continue;
    const t = i / trail.length;
    ctx.beginPath();
    ctx.fillStyle = `rgba(10,12,18,${0.35 + t * 0.6})`;
    ctx.arc(p.x, p.y, 8 + t * 12, 0, Math.PI * 2);
    ctx.fill();
    if (i % 3 === 0) {
      ctx.strokeStyle = 'rgba(192,75,62,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.angle);
  ctx.fillStyle = '#10141c';
  ctx.beginPath();
  ctx.ellipse(6, 0, 16, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(231,238,248,0.45)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = PAL.moon;
  ctx.beginPath();
  ctx.arc(12, -2, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a2030';
  ctx.beginPath();
  ctx.arc(13.1, -2, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PAL.cinnabar;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(4, 0, 7, Math.PI * 0.15, Math.PI * 0.9);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(231,238,248,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(8, -8);
  ctx.quadraticCurveTo(2, -18, 10, -22);
  ctx.moveTo(14, -8);
  ctx.quadraticCurveTo(22, -16, 16, -24);
  ctx.stroke();
  const whisk = Math.sin(time * 3 + pose.phase) * 2;
  ctx.beginPath();
  ctx.moveTo(16, 1);
  ctx.quadraticCurveTo(28, 6 + whisk, 34, 2);
  ctx.moveTo(16, 3);
  ctx.quadraticCurveTo(26, -4 - whisk, 32, -2);
  ctx.stroke();
  ctx.restore();
}

export function drawEnemy(ctx: Ctx, pose: ActorPose, time: number): void {
  if (pose.kind === 'boss' || pose.kind === 'wyrm') {
    if (pose.kind === 'boss') drawBoss(ctx, pose, time);
    else drawWyrm(ctx, pose, time);
    drawHealth(ctx, pose);
    return;
  }
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, pose.radius * 0.45, pose.radius * 0.9, pose.radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  if (pose.frosted) {
    ctx.strokeStyle = 'rgba(213,230,244,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, pose.radius + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (pose.kind === 'moth') drawMoth(ctx, pose, time, false);
  else if (pose.kind === 'swift') drawMoth(ctx, pose, time, true);
  else if (pose.kind === 'beast') drawBeast(ctx, pose, time);
  else if (pose.kind === 'crane') drawCrane(ctx, pose, time);
  else if (pose.kind === 'wisp') drawWisp(ctx, pose, time);
  else drawArmor(ctx, pose, time);
  if (pose.hitFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${pose.hitFlash * 3})`;
    ctx.beginPath();
    ctx.arc(0, 0, pose.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  drawHealth(ctx, pose);
  if (pose.burning) {
    ctx.fillStyle = 'rgba(227,193,122,0.8)';
    ctx.beginPath();
    ctx.arc(pose.x + Math.sin(time * 12) * 3, pose.y - pose.radius, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHealth(ctx: Ctx, pose: ActorPose): void {
  if (pose.hp >= pose.maxHp && pose.kind !== 'boss') return;
  const width = pose.kind === 'boss' ? 36 : pose.kind === 'wyrm' ? 26 : 18;
  const y = pose.y - pose.radius - (pose.kind === 'boss' ? 18 : 12);
  const ratio = Math.max(0, pose.hp / pose.maxHp);
  ctx.fillStyle = 'rgba(8,8,10,0.65)';
  ctx.fillRect(pose.x - width / 2, y, width, 2.4);
  ctx.fillStyle = ratio > 0.4 ? PAL.moon : PAL.cinnabar;
  ctx.fillRect(pose.x - width / 2, y, width * ratio, 2.4);
}

export function drawShot(ctx: Ctx, shot: Shot): void {
  ctx.save();
  if (shot.kind === 'frost') {
    ctx.translate(shot.x, shot.y);
    ctx.rotate(Math.atan2(shot.ty - shot.y, shot.tx - shot.x));
    ctx.fillStyle = PAL.frost;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const glow = ctx.createRadialGradient(shot.x, shot.y, 0, shot.x, shot.y, 16);
    glow.addColorStop(0, '#fff8ea');
    glow.addColorStop(0.35, PAL.gold);
    glow.addColorStop(1, 'rgba(227,193,122,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6e4';
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawEnemyIcon(ctx: Ctx, kind: EnemyKind): void {
  const pose: ActorPose = {
    kind,
    x: ctx.canvas.width / 2,
    y: ctx.canvas.height / 2 + 2,
    angle: -0.4,
    phase: 0.6,
    hitFlash: 0,
    radius: kind === 'boss' ? 10 : 8,
    hp: 1,
    maxHp: 1,
    trail: [
      { x: ctx.canvas.width / 2 - 14, y: ctx.canvas.height / 2 + 6 },
      { x: ctx.canvas.width / 2 - 6, y: ctx.canvas.height / 2 + 3 },
      { x: ctx.canvas.width / 2, y: ctx.canvas.height / 2 + 2 },
    ],
    frosted: false,
    burning: false,
  };
  ctx.save();
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.translate(4, 2);
  ctx.scale(0.85, 0.85);
  drawEnemy(ctx, pose, 0.4);
  ctx.restore();
}
