import { EARLY_BONUS, ENEMIES, TOWERS, WAVES, theoreticalIncome, totalSpawns, towerLevel } from '../src/game/balance.ts';
import { PATH, PLOTS } from '../src/game/map.ts';
import { callWave, newGame, step, tryPlace, tryUpgrade } from '../src/game/sim.ts';
import type { Match, TowerKind } from '../src/game/types.ts';

type Policy = (m: Match) => void;

function emptyPlots(m: Match, worst = false) {
  const used = new Set(m.towers.map((t) => t.plotId));
  const plots = PLOTS.filter((p) => !used.has(p.id));
  plots.sort((a, b) => (worst ? a.score - b.score : b.score - a.score));
  return plots;
}

function countKind(m: Match, kind: TowerKind): number {
  return m.towers.filter((t) => t.kind === kind).length;
}

function ensure(m: Match, kind: TowerKind, n: number, worst = false): void {
  while (countKind(m, kind) < n) {
    const plot = emptyPlots(m, worst)[0];
    if (!plot || !tryPlace(m, plot.id, kind)) return;
  }
}

function placeSeal(m: Match): void {
  if (countKind(m, 'seal') >= 1) return;
  const plots = emptyPlots(m);
  const range = towerLevel('seal', 1).range;
  let best = plots[0];
  let bestScore = -1;
  for (const plot of plots) {
    const covered = m.towers.filter((t) => Math.hypot(t.x - plot.x, t.y - plot.y) <= range).length;
    const score = covered * 1000 + plot.score;
    if (score > bestScore) {
      bestScore = score;
      best = plot;
    }
  }
  if (best) tryPlace(m, best.id, 'seal');
}

function upgradeTo(m: Match, kind: TowerKind, level: number): void {
  for (const tower of m.towers) {
    if (tower.kind !== kind) continue;
    while (tower.level < level) {
      if (!tryUpgrade(m, tower.id)) return;
    }
  }
}

const reader: Policy = (m) => {
  const w = m.waveIndex + 1;
  ensure(m, 'lantern', 2);
  if (w >= 2) ensure(m, 'bamboo', 1);
  if (w >= 2) upgradeTo(m, 'lantern', 2);
  if (w >= 3) ensure(m, 'lantern', 3);
  if (w >= 4) ensure(m, 'frost', 1);
  if (w >= 4) upgradeTo(m, 'lantern', 2);
  if (w >= 5) upgradeTo(m, 'frost', 2);
  if (w >= 5) upgradeTo(m, 'lantern', 3);
  if (w >= 6) ensure(m, 'pond', 1);
  if (w >= 7) placeSeal(m);
  if (w >= 7) upgradeTo(m, 'bamboo', 2);
  if (w >= 8) upgradeTo(m, 'pond', 2);
  if (w >= 8) upgradeTo(m, 'frost', 3);
  if (w >= 9) upgradeTo(m, 'pond', 3);
  if (w >= 9) upgradeTo(m, 'seal', 2);
  if (w >= 10) upgradeTo(m, 'seal', 3);
  if (w >= 10) upgradeTo(m, 'bamboo', 3);
  if (w >= 10) ensure(m, 'lantern', 4);
  if (w >= 12) ensure(m, 'lantern', 5);
  if (w >= 13) ensure(m, 'bamboo', 2);
  if (w >= 14) upgradeTo(m, 'bamboo', 3);
  if (w >= 16) ensure(m, 'lantern', 6);
  if (w >= 18) ensure(m, 'pond', 2);
  if (w >= 18) upgradeTo(m, 'pond', 3);
};

const careless: Policy = (m) => {
  ensure(m, 'lantern', 6, true);
  upgradeTo(m, 'lantern', 2);
};

const afk: Policy = () => {};

function play(name: string, policy: Policy, early: boolean) {
  const m = newGame();
  let guard = 0;
  let nextDecision = 0;
  let sentWave = -1;
  const notes: string[] = [];
  while (m.phase !== 'victory' && m.phase !== 'defeat' && guard < 500000) {
    if ((m.phase === 'prepare' || m.phase === 'combat') && m.time >= nextDecision) {
      policy(m);
      nextDecision = m.time + 0.45;
    }
    if (early && m.phase === 'prepare' && m.waveIndex !== sentWave) {
      callWave(m);
      sentWave = m.waveIndex;
    }
    const before = m.waveIndex;
    const phase = m.phase;
    step(m, 1 / 20);
    if (phase === 'combat' && m.phase === 'prepare' && m.waveIndex !== before) {
      notes.push(`  波 ${before + 1} 后  月华 ${m.lives}  铜钱 ${m.gold}  庭器 ${summarize(m)}`);
    }
    guard += 1;
    if (m.time > 60 * 45) break;
  }
  const result = {
    name,
    phase: m.phase,
    lives: m.lives,
    gold: m.gold,
    wave: m.stats.bestWave,
    kills: m.stats.kills,
    leaks: m.stats.leaks,
    built: m.stats.built,
    upgrades: m.stats.upgrades,
    time: m.time,
    towers: summarize(m),
    notes,
    stuck: m.phase !== 'victory' && m.phase !== 'defeat',
  };
  return result;
}

function summarize(m: Match): string {
  return m.towers
    .map((t) => `${TOWERS[t.kind].name}${t.level}`)
    .sort()
    .join(' ');
}

const results = [play('attentive', reader, true), play('careless', careless, false), play('afk', afk, false)];

console.log(`石径长度 ${PATH.length.toFixed(0)}  石台 ${PLOTS.length}`);
console.log(
  '石台分数',
  PLOTS.map((p) => `${p.id}:${Math.round(p.score)}@(${Math.round(p.x)},${Math.round(p.y)})`).join('  '),
);
const spawned = totalSpawns();
console.log(`波次数 ${WAVES.length}  敌人总数 ${spawned}`);
console.log(`满额铜钱（每波都提前）${theoreticalIncome(WAVES.length)}  提前每波 +${EARLY_BONUS}`);
console.log(
  '敌人',
  (Object.keys(ENEMIES) as (keyof typeof ENEMIES)[]).map((k) => `${ENEMIES[k].name}${ENEMIES[k].hp}`).join(' '),
);
console.log('波次', WAVES.map((w) => w.name).join(' '));
console.log('');

let failed = false;
for (const r of results) {
  console.log(
    `${r.name}: ${r.phase}  月至 ${r.wave}  月华 ${r.lives}  金 ${r.gold}  击退 ${r.kills}  漏 ${r.leaks}  建 ${r.built}  升 ${r.upgrades}  时 ${r.time.toFixed(0)}s`,
  );
  console.log(`  ${r.towers || '（无庭器）'}`);
  for (const note of r.notes) console.log(note);
  if (r.stuck) {
    console.log('  卡住了');
    failed = true;
  }
}

const attentive = results[0];
const carelessResult = results[1];
const afkResult = results[2];
if (!attentive || attentive.phase !== 'victory' || attentive.lives < 3) {
  console.log('FAIL attentive should win with at least 3 lives');
  failed = true;
}
if (!carelessResult || carelessResult.phase !== 'defeat') {
  console.log('FAIL careless should lose');
  failed = true;
}
if (!afkResult || afkResult.phase !== 'defeat' || afkResult.wave > 4) {
  console.log('FAIL afk should die early');
  failed = true;
}
if (WAVES.length < 20 || WAVES.length > 24) {
  console.log('FAIL wave count should be 20–24');
  failed = true;
}
if (spawned < 400 || spawned > 700) {
  console.log('FAIL spawn count should be 400–700');
  failed = true;
}
if (failed) process.exit(1);
console.log('\nbalance ok');
