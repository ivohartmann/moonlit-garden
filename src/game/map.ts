import type { Plot } from './types.ts';
import { dist } from './util.ts';

export const VIEW_W = 1280;
export const VIEW_H = 720;

export type Point = { x: number; y: number };

export type Sample = {
  x: number;
  y: number;
  angle: number;
  nx: number;
  ny: number;
};

export type PathData = {
  points: Point[];
  cum: number[];
  length: number;
  samples: Sample[];
};

/** A courtyard stroll: enter the west moon gate, fold around the pond, leave east. */
const RAW: Point[] = [
  { x: -36, y: 468 },
  { x: 196, y: 468 },
  { x: 196, y: 168 },
  { x: 508, y: 168 },
  { x: 508, y: 548 },
  { x: 848, y: 548 },
  { x: 848, y: 196 },
  { x: 1116, y: 196 },
  { x: 1116, y: 430 },
  { x: 1320, y: 430 },
];

export const POND = { x: 678, y: 392, rx: 118, ry: 74 };
export const MOON = { x: 128, y: 92, r: 50 };
export const GATES = {
  entry: { x: 30, y: 468 },
  exit: { x: 1250, y: 430 },
};

export const DECOR = {
  pine: { x: 118, y: 168 },
  plum: { x: 348, y: 332 },
  bamboo: { x: 992, y: 348 },
  rock: { x: 760, y: 292 },
  flowers: { x: 372, y: 575 },
  gravel: { x: 360, y: 250 },
};

const BLOCKERS: { x: number; y: number; rx: number; ry: number }[] = [
  { x: POND.x, y: POND.y, rx: 142, ry: 96 },
  { x: DECOR.plum.x, y: DECOR.plum.y, rx: 74, ry: 68 },
  { x: DECOR.pine.x, y: DECOR.pine.y, rx: 46, ry: 58 },
  { x: DECOR.bamboo.x, y: DECOR.bamboo.y, rx: 52, ry: 64 },
  { x: DECOR.rock.x, y: DECOR.rock.y, rx: 36, ry: 30 },
];

function roundPolyline(points: Point[], radius: number): Point[] {
  if (points.length < 2) return points.map((p) => ({ ...p }));
  const out: Point[] = [{ ...points[0] }];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const inLen = Math.hypot(cur.x - prev.x, cur.y - prev.y) || 1;
    const outLen = Math.hypot(next.x - cur.x, next.y - cur.y) || 1;
    const r = Math.min(radius, inLen * 0.45, outLen * 0.45);
    const inX = (prev.x - cur.x) / inLen;
    const inY = (prev.y - cur.y) / inLen;
    const outX = (next.x - cur.x) / outLen;
    const outY = (next.y - cur.y) / outLen;
    const p1 = { x: cur.x + inX * r, y: cur.y + inY * r };
    const p2 = { x: cur.x + outX * r, y: cur.y + outY * r };
    out.push(p1);
    const steps = 6;
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const u = 1 - t;
      out.push({
        x: u * u * p1.x + 2 * u * t * cur.x + t * t * p2.x,
        y: u * u * p1.y + 2 * u * t * cur.y + t * t * p2.y,
      });
    }
    out.push(p2);
  }
  const last = points[points.length - 1];
  out.push({ ...last });
  return out;
}

function sampleAt(points: Point[], cum: number[], d: number): Sample {
  const distAlong = Math.max(0, Math.min(cum[cum.length - 1] ?? 0, d));
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((cum[mid] ?? 0) < distAlong) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const prev = points[i - 1] ?? points[0];
  const next = points[i] ?? prev;
  const seg = (cum[i] ?? 0) - (cum[i - 1] ?? 0) || 1;
  const t = (distAlong - (cum[i - 1] ?? 0)) / seg;
  const x = prev.x + (next.x - prev.x) * t;
  const y = prev.y + (next.y - prev.y) * t;
  const angle = Math.atan2(next.y - prev.y, next.x - prev.x);
  return { x, y, angle, nx: -Math.sin(angle), ny: Math.cos(angle) };
}

function buildPath(raw: Point[]): PathData {
  const points = roundPolyline(raw, 48);
  const cum: number[] = [0];
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const next = points[i];
    length += Math.hypot(next.x - prev.x, next.y - prev.y);
    cum.push(length);
  }
  const samples: Sample[] = [];
  for (let d = 0; d <= length; d += 8) {
    samples.push(sampleAt(points, cum, d));
  }
  return { points, cum, length, samples };
}

export const PATH: PathData = buildPath(RAW);

export function pointAt(distance: number): Sample {
  return sampleAt(PATH.points, PATH.cum, distance);
}

export function distToPath(x: number, y: number): number {
  let best = Infinity;
  for (const s of PATH.samples) {
    const d = dist(x, y, s.x, s.y);
    if (d < best) best = d;
  }
  return best;
}

export function coverage(x: number, y: number, range: number): number {
  const r2 = range * range;
  let n = 0;
  for (const s of PATH.samples) {
    const dx = s.x - x;
    const dy = s.y - y;
    if (dx * dx + dy * dy <= r2) n += 1;
  }
  return n * 8;
}

function blocked(x: number, y: number): boolean {
  for (const b of BLOCKERS) {
    const dx = (x - b.x) / b.rx;
    const dy = (y - b.y) / b.ry;
    if (dx * dx + dy * dy < 1) return true;
  }
  return false;
}

function inside(x: number, y: number): boolean {
  return x >= 78 && x <= 1196 && y >= 108 && y <= 586;
}

function layoutPlots(): Plot[] {
  const candidates: { x: number; y: number; score: number }[] = [];
  for (let i = 0; i < PATH.samples.length; i += 3) {
    const s = PATH.samples[i];
    for (const offset of [66, 90]) {
      for (const sign of [-1, 1]) {
        const x = s.x + s.nx * offset * sign;
        const y = s.y + s.ny * offset * sign;
        if (!inside(x, y) || blocked(x, y)) continue;
        if (distToPath(x, y) < 54) continue;
        const score = coverage(x, y, 130);
        if (score < 48) continue;
        candidates.push({ x, y, score });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const pick = (minDist: number, minScore: number, limit: number): Plot[] => {
    const chosen: Plot[] = [];
    for (const c of candidates) {
      if (chosen.length >= limit) break;
      if (c.score < minScore) continue;
      if (chosen.some((p) => dist(p.x, p.y, c.x, c.y) < minDist)) continue;
      chosen.push({ id: chosen.length, x: c.x, y: c.y, score: c.score });
    }
    return chosen;
  };

  let plots = pick(102, 90, 12);
  if (plots.length < 12) plots = pick(88, 60, 12);
  if (plots.length < 12) plots = pick(76, 40, 12);
  if (plots.length < 12) {
    throw new Error(`只生成了 ${plots.length} 座石台，庭园布点不足。`);
  }
  for (const p of plots) {
    const d = distToPath(p.x, p.y);
    if (d < 52) throw new Error(`石台 ${p.id} 压到石径（${d.toFixed(1)}）。`);
  }
  return plots;
}

export const PLOTS: Plot[] = layoutPlots();

export function plotById(id: number): Plot | undefined {
  return PLOTS.find((p) => p.id === id);
}

export function plotAt(x: number, y: number, radius = 30): number | null {
  let best: number | null = null;
  let bestD = radius;
  for (const p of PLOTS) {
    const d = dist(x, y, p.x, p.y);
    if (d <= bestD) {
      bestD = d;
      best = p.id;
    }
  }
  return best;
}
