import {
  EARLY_BONUS,
  ENEMIES,
  PREPARE_FIRST,
  PREPARE_NEXT,
  SELL_REFUND,
  SLOW_CAP,
  START_GOLD,
  START_LIVES,
  WAVES,
  buyCost,
  towerLevel,
  upgradeCost,
} from './balance.ts';
import { PATH, plotById, pointAt } from './map.ts';
import type {
  Enemy,
  EnemyKind,
  FloatText,
  LinkFx,
  Match,
  Phase,
  SfxName,
  Shot,
  Spark,
  SparkKind,
  Tower,
  TowerKind,
} from './types.ts';
import { dist } from './util.ts';

function blankStats(): Match['stats'] {
  return { kills: 0, leaks: 0, goldEarned: 0, built: 0, upgrades: 0, bestWave: 0 };
}

export function createMatch(phase: Phase = 'title'): Match {
  return {
    phase,
    pausedFrom: null,
    time: 0,
    gold: phase === 'title' ? 0 : START_GOLD,
    lives: START_LIVES,
    waveIndex: 0,
    prepareLeft: PREPARE_FIRST,
    spawnElapsed: 0,
    queue: [],
    towers: [],
    enemies: [],
    shots: [],
    sparks: [],
    floats: [],
    links: [],
    sfx: [],
    seq: 1,
    banner: '',
    bannerKicker: '',
    bannerT: 0,
    hurt: 0,
    shake: 0,
    stats: blankStats(),
  };
}

export function newGame(): Match {
  const m = createMatch('prepare');
  m.gold = START_GOLD;
  m.lives = START_LIVES;
  m.prepareLeft = PREPARE_FIRST;
  return m;
}

function sfx(m: Match, name: SfxName): void {
  m.sfx.push(name);
  if (m.sfx.length > 24) m.sfx.splice(0, m.sfx.length - 24);
}

function float(m: Match, x: number, y: number, text: string, color: string): void {
  const life = 1.15;
  const item: FloatText = { x, y, text, life, max: life, color };
  m.floats.push(item);
  if (m.floats.length > 36) m.floats.splice(0, m.floats.length - 36);
}

function burst(
  m: Match,
  x: number,
  y: number,
  color: string,
  n: number,
  speed: number,
  kind: SparkKind,
  life = 0.55,
): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.75);
    const span = life * (0.65 + Math.random() * 0.5);
    const spark: Spark = {
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: span,
      max: span,
      size: kind === 'ink' ? 2.2 + Math.random() * 2.4 : 1.4 + Math.random() * 1.8,
      color,
      kind,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 5,
      g: kind === 'ink' ? 28 : kind === 'petal' ? 10 : 0,
      w: 6,
    };
    m.sparks.push(spark);
  }
  if (m.sparks.length > 420) m.sparks.splice(0, m.sparks.length - 420);
}

function ring(m: Match, x: number, y: number, radius: number, color: string, life = 0.42): void {
  m.sparks.push({
    x,
    y,
    vx: 0,
    vy: 0,
    life,
    max: life,
    size: radius,
    color,
    kind: 'ring',
    rot: 0,
    vr: 0,
    g: 0,
    w: 4,
  });
}

function link(m: Match, x1: number, y1: number, x2: number, y2: number, color: string): void {
  const item: LinkFx = { x1, y1, x2, y2, life: 0.22, max: 0.22, color };
  m.links.push(item);
}

function fighting(m: Match): boolean {
  return m.phase === 'combat';
}

function living(m: Match): Enemy[] {
  return m.enemies.filter((e) => e.alive && !e.leaked);
}

function expectedHit(raw: number, enemy: Enemy): number {
  const vuln = enemy.frost?.vuln ?? 0;
  return Math.max(1, raw * (1 + vuln) - enemy.armor);
}

function hurt(enemy: Enemy, raw: number): number {
  if (!enemy.alive || enemy.leaked || enemy.hp <= 0) return 0;
  const vuln = enemy.frost?.vuln ?? 0;
  const amount = Math.max(1, raw * (1 + vuln) - enemy.armor);
  enemy.hp -= amount;
  enemy.hitFlash = 0.12;
  if (enemy.hp <= 0) enemy.alive = false;
  return amount;
}

function applyFrost(enemy: Enemy, slow: number, vuln: number, dur: number): void {
  if (!enemy.frost || vuln >= enemy.frost.vuln) {
    enemy.frost = { slow, vuln, t: dur };
  } else {
    enemy.frost.t = Math.max(enemy.frost.t, dur);
    enemy.frost.slow = Math.max(enemy.frost.slow, slow);
  }
}

function applyBurn(enemy: Enemy, dps: number, time: number): void {
  if (!enemy.burn || dps >= enemy.burn.dps) enemy.burn = { dps, t: time };
  else enemy.burn.t = Math.max(enemy.burn.t, time);
}

function recomputeAuras(m: Match): void {
  for (const enemy of m.enemies) enemy.bambooSlow = 0;
  for (const tower of m.towers) tower.buff = 0;

  for (const tower of m.towers) {
    const spec = towerLevel(tower.kind, tower.level);
    if (tower.kind === 'bamboo') {
      for (const enemy of living(m)) {
        if (dist(tower.x, tower.y, enemy.x, enemy.y) <= spec.range + enemy.radius * 0.25) {
          enemy.bambooSlow = Math.max(enemy.bambooSlow, spec.slow);
        }
      }
    } else if (tower.kind === 'seal' && spec.buff > 0) {
      for (const other of m.towers) {
        if (other.id === tower.id) continue;
        if (dist(tower.x, tower.y, other.x, other.y) <= spec.range) {
          other.buff = Math.max(other.buff, spec.buff);
        }
      }
    }
  }
}

function speedMul(enemy: Enemy): number {
  const frostSlow = enemy.frost && enemy.frost.t > 0 ? enemy.frost.slow : 0;
  const splashSlow = enemy.splashT > 0 ? enemy.splashSlow : 0;
  const remain = (1 - enemy.bambooSlow) * (1 - frostSlow) * (1 - splashSlow);
  const slow = Math.min(SLOW_CAP, 1 - remain);
  return 1 - slow * (1 - enemy.slowResist);
}

function placeEnemy(m: Match, kind: EnemyKind): void {
  const def = ENEMIES[kind];
  const pose = pointAt(0);
  const enemy: Enemy = {
    id: ++m.seq,
    kind,
    x: pose.x,
    y: pose.y,
    angle: pose.angle,
    dist: 0,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    armor: def.armor,
    slowResist: def.slowResist,
    gold: def.gold,
    leak: def.leak,
    radius: def.radius,
    alive: true,
    leaked: false,
    phase: (m.seq % 11) * 0.57,
    wobble: def.wobble,
    incoming: 0,
    hitFlash: 0,
    bambooSlow: 0,
    frost: null,
    burn: null,
    splashSlow: 0,
    splashT: 0,
    regen: def.regen,
    trail: [],
  };
  m.enemies.push(enemy);
  if (kind === 'boss') {
    sfx(m, 'boss');
    m.shake = Math.max(m.shake, 7);
    m.banner = '月噬';
    m.bannerKicker = '有物回头';
    m.bannerT = Math.max(m.bannerT, 2.2);
  }
}

function buildQueue(waveIndex: number): { kind: EnemyKind; t: number }[] {
  const wave = WAVES[waveIndex];
  if (!wave) return [];
  const queue: { kind: EnemyKind; t: number }[] = [];
  let t = 0.65;
  for (const group of wave.groups) {
    for (let i = 0; i < group.count; i++) {
      queue.push({ kind: group.kind, t });
      t += group.interval;
    }
    t += 0.95;
  }
  return queue;
}

function showWaveBanner(m: Match, text: string, kicker: string, time = 2.3): void {
  m.banner = text;
  m.bannerKicker = kicker;
  m.bannerT = time;
}

export function callWave(m: Match): void {
  if (m.phase !== 'prepare') return;
  const wave = WAVES[m.waveIndex];
  if (!wave) return;
  if (m.prepareLeft > 0.45) {
    m.gold += EARLY_BONUS;
    m.stats.goldEarned += EARLY_BONUS;
    float(m, 640, 118, `+${EARLY_BONUS}`, '#e0b06a');
    sfx(m, 'early');
  }
  m.phase = 'combat';
  m.queue = buildQueue(m.waveIndex);
  m.spawnElapsed = 0;
  m.stats.bestWave = Math.max(m.stats.bestWave, m.waveIndex + 1);
  showWaveBanner(m, wave.name, `第 ${m.waveIndex + 1} 波`);
  sfx(m, 'wave');
}

function lose(m: Match): void {
  if (m.phase === 'defeat' || m.phase === 'victory') return;
  m.phase = 'defeat';
  m.lives = Math.max(0, m.lives);
  m.shake = Math.max(m.shake, 8);
  sfx(m, 'defeat');
}

function win(m: Match): void {
  if (m.phase === 'defeat' || m.phase === 'victory') return;
  m.phase = 'victory';
  sfx(m, 'victory');
  showWaveBanner(m, '月在', '长夜已尽', 2.8);
}

function onWaveCleared(m: Match): void {
  const wave = WAVES[m.waveIndex];
  if (!wave) return;
  m.gold += wave.bonus;
  m.stats.goldEarned += wave.bonus;
  float(m, 640, 150, `波酬 +${wave.bonus}`, '#f3ead7');
  if (m.waveIndex >= WAVES.length - 1) {
    win(m);
    return;
  }
  m.waveIndex += 1;
  m.phase = 'prepare';
  m.prepareLeft = PREPARE_NEXT;
  const next = WAVES[m.waveIndex];
  showWaveBanner(m, '此波已静', next ? `下一波 · ${next.name}` : '', 1.5);
}

function inRange(tower: Tower, enemy: Enemy, range: number): boolean {
  return dist(tower.x, tower.y, enemy.x, enemy.y) <= range + enemy.radius * 0.2;
}

function pickTarget(
  m: Match,
  tower: Tower,
  range: number,
  mode: 'front' | 'strong' | 'splash',
  splash = 0,
): Enemy | null {
  const pool = living(m).filter((enemy) => inRange(tower, enemy, range));
  if (pool.length === 0) return null;

  if (mode === 'strong') {
    let best = pool[0];
    for (const enemy of pool) {
      const unfrosted = enemy.frost ? 0 : 1;
      const bestUnfrosted = best.frost ? 0 : 1;
      if (unfrosted !== bestUnfrosted) {
        if (unfrosted > bestUnfrosted) best = enemy;
        continue;
      }
      if (enemy.hp > best.hp) best = enemy;
    }
    return best;
  }

  if (mode === 'splash') {
    let best = pool[0];
    let bestScore = -1;
    for (const enemy of pool) {
      let score = 0;
      for (const other of living(m)) {
        if (dist(other.x, other.y, enemy.x, enemy.y) <= splash + other.radius * 0.35) score += other.hp;
      }
      score += enemy.dist * 0.01;
      if (score > bestScore) {
        bestScore = score;
        best = enemy;
      }
    }
    return best;
  }

  let best: Enemy | null = null;
  let fallback: Enemy | null = null;
  for (const enemy of pool) {
    if (!fallback || enemy.dist > fallback.dist) fallback = enemy;
    if (enemy.hp <= enemy.incoming) continue;
    if (!best || enemy.dist > best.dist) best = enemy;
  }
  return best ?? fallback;
}

function killDead(m: Match): void {
  const keep: Enemy[] = [];
  for (const enemy of m.enemies) {
    if (enemy.leaked) continue;
    if (enemy.hp <= 0 || !enemy.alive) {
      enemy.alive = false;
      m.gold += enemy.gold;
      m.stats.kills += 1;
      m.stats.goldEarned += enemy.gold;
      float(m, enemy.x, enemy.y - 16, `+${enemy.gold}`, '#e0b06a');
      burst(m, enemy.x, enemy.y, '#14181f', enemy.kind === 'boss' ? 22 : 10, 70, 'ink', 0.7);
      if (enemy.kind === 'moth' || enemy.kind === 'swift') {
        burst(m, enemy.x, enemy.y, '#d7dde6', 5, 36, 'petal', 0.8);
      }
      sfx(m, 'kill');
      continue;
    }
    keep.push(enemy);
  }
  m.enemies = keep;
}

function moveEnemies(m: Match, dt: number): void {
  for (const enemy of m.enemies) {
    if (!enemy.alive || enemy.leaked) continue;
    const mul = speedMul(enemy);
    enemy.dist += enemy.speed * mul * dt;
    if (enemy.dist >= PATH.length) {
      enemy.alive = false;
      enemy.leaked = true;
      m.lives -= enemy.leak;
      m.stats.leaks += enemy.leak;
      m.hurt = Math.min(1, m.hurt + 0.45 + enemy.leak * 0.04);
      m.shake = Math.max(m.shake, enemy.kind === 'boss' ? 9 : 3.5);
      sfx(m, 'leak');
      burst(m, GATES_X, enemy.y, '#8d342c', 8, 40, 'ink', 0.45);
      if (m.lives <= 0) {
        m.lives = 0;
        lose(m);
      }
      continue;
    }
    const pose = pointAt(enemy.dist);
    const wobble = Math.sin(m.time * (enemy.kind === 'swift' ? 7 : 4) + enemy.phase) * enemy.wobble;
    enemy.x = pose.x + pose.nx * wobble;
    enemy.y = pose.y + pose.ny * wobble;
    enemy.angle = pose.angle;
    if (enemy.kind === 'boss' || enemy.kind === 'wyrm' || enemy.kind === 'beast' || enemy.kind === 'armor') {
      enemy.trail.push({ x: enemy.x, y: enemy.y });
      const cap = enemy.kind === 'boss' ? 26 : enemy.kind === 'wyrm' ? 14 : 7;
      if (enemy.trail.length > cap) enemy.trail.splice(0, enemy.trail.length - cap);
    }
  }
}

const GATES_X = 1248;

function statuses(m: Match, dt: number): void {
  for (const enemy of living(m)) {
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    if (enemy.splashT > 0) enemy.splashT -= dt;
    if (enemy.frost) {
      enemy.frost.t -= dt;
      if (enemy.frost.t <= 0) enemy.frost = null;
    }
    const burning = Boolean(enemy.burn && enemy.burn.t > 0);
    if (enemy.burn && enemy.alive) {
      enemy.burn.t -= dt;
      const vuln = enemy.frost?.vuln ?? 0;
      enemy.hp -= enemy.burn.dps * dt * (1 + vuln);
      if (enemy.hp <= 0) enemy.alive = false;
      if (Math.random() < dt * 6) {
        burst(m, enemy.x, enemy.y - 6, '#e0b06a', 1, 16, 'dot', 0.35);
      }
      if (enemy.burn.t <= 0) enemy.burn = null;
    } else if (enemy.regen > 0 && enemy.hp > 0 && enemy.hp < enemy.maxHp && !burning) {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.regen * dt);
    }
  }
}

function impactFrost(m: Match, enemy: Enemy, shot: Shot, scale: number): void {
  hurt(enemy, shot.dmg * scale);
  if (shot.vuln > 0 || shot.slow > 0) applyFrost(enemy, shot.slow, shot.vuln, shot.dur);
  if (shot.burn > 0) applyBurn(enemy, shot.burn, shot.burnTime);
  burst(m, enemy.x, enemy.y, shot.kind === 'frost' ? '#d5e6f4' : '#f0d59a', 4, 40, 'dot', 0.28);
}

function resolveShot(m: Match, shot: Shot): void {
  shot.alive = false;
  const target = m.enemies.find((e) => e.id === shot.targetId);
  if (target) target.incoming = Math.max(0, target.incoming - shot.reserve);

  if (shot.splash > 0) {
    const px = shot.tx;
    const py = shot.ty;
    ring(m, px, py, shot.splash, '#9fd0d4', 0.48);
    for (const enemy of living(m)) {
      const d = dist(enemy.x, enemy.y, px, py);
      const reach = shot.splash + enemy.radius * 0.35;
      if (d > reach) continue;
      const falloff = 1 - (d / reach) * 0.32;
      hurt(enemy, shot.dmg * Math.max(0.68, falloff));
      if (shot.slow > 0) {
        enemy.splashSlow = Math.max(enemy.splashSlow, shot.slow);
        enemy.splashT = Math.max(enemy.splashT, shot.dur);
      }
    }
    return;
  }

  const victim =
    target && target.alive && !target.leaked
      ? target
      : living(m).find((e) => dist(e.x, e.y, shot.tx, shot.ty) < 18);
  if (!victim) {
    burst(m, shot.tx, shot.ty, '#d7deea', 3, 20, 'dot', 0.25);
    return;
  }
  impactFrost(m, victim, shot, 1);
  if (shot.chain > 0) {
    let extra: Enemy | null = null;
    let best = 86;
    for (const enemy of living(m)) {
      if (enemy.id === victim.id) continue;
      const d = dist(enemy.x, enemy.y, victim.x, victim.y);
      if (d < best) {
        best = d;
        extra = enemy;
      }
    }
    if (extra) {
      impactFrost(m, extra, shot, 0.72);
      link(m, victim.x, victim.y, extra.x, extra.y, '#d5e6f4');
    }
  }
}

function moveShots(m: Match, dt: number): void {
  for (const shot of m.shots) {
    if (!shot.alive) continue;
    const target = m.enemies.find((e) => e.id === shot.targetId && e.alive && !e.leaked);
    if (target) {
      shot.tx = target.x;
      shot.ty = target.y;
    }
    const dx = shot.tx - shot.x;
    const dy = shot.ty - shot.y;
    const d = Math.hypot(dx, dy);
    const step = shot.speed * dt;
    if (d <= Math.max(8, step)) {
      shot.x = shot.tx;
      shot.y = shot.ty;
      resolveShot(m, shot);
    } else {
      shot.x += (dx / d) * step;
      shot.y += (dy / d) * step;
    }
  }
  m.shots = m.shots.filter((s) => s.alive);
}

function towersAct(m: Match, dt: number): void {
  for (const tower of m.towers) {
    const spec = towerLevel(tower.kind, tower.level);
    if (tower.kind === 'bamboo') {
      if (spec.tick <= 0) continue;
      tower.acc += dt;
      if (tower.acc < spec.tickEvery) continue;
      tower.acc = 0;
      const raw = spec.tick * (1 + tower.buff);
      for (const enemy of living(m)) {
        if (dist(tower.x, tower.y, enemy.x, enemy.y) <= spec.range) hurt(enemy, raw);
      }
      continue;
    }
    if (tower.kind === 'seal') {
      if (spec.burst <= 0 || spec.burstEvery <= 0) continue;
      tower.cd -= dt;
      if (tower.cd > 0) continue;
      tower.cd = spec.burstEvery;
      let hit = false;
      for (const enemy of living(m)) {
        if (dist(tower.x, tower.y, enemy.x, enemy.y) <= spec.range + enemy.radius * 0.2) {
          hurt(enemy, spec.burst);
          hit = true;
        }
      }
      ring(m, tower.x, tower.y, spec.range * 0.45, '#c04b3e', 0.4);
      if (hit) sfx(m, 'burst');
      continue;
    }

    tower.cd -= dt;
    if (tower.cd > 0) continue;
    const mode = tower.kind === 'frost' ? 'strong' : tower.kind === 'pond' ? 'splash' : 'front';
    const target = pickTarget(m, tower, spec.range, mode, spec.splash);
    if (!target) continue;
    tower.cd = spec.interval;
    const raw = spec.dmg * (1 + tower.buff);

    if (tower.kind === 'pond') {
      ring(m, target.x, target.y, spec.splash, '#b7dfe2', 0.5);
      sfx(m, 'pond');
      for (const enemy of living(m)) {
        const d = dist(enemy.x, enemy.y, target.x, target.y);
        const reach = spec.splash + enemy.radius * 0.35;
        if (d > reach) continue;
        const falloff = 1 - (d / reach) * 0.32;
        hurt(enemy, raw * Math.max(0.68, falloff));
        if (spec.splashSlow > 0) {
          enemy.splashSlow = Math.max(enemy.splashSlow, spec.splashSlow);
          enemy.splashT = Math.max(enemy.splashT, spec.splashDur);
        }
      }
      continue;
    }

    const reserve = expectedHit(raw, target);
    target.incoming += reserve;
    const shot: Shot = {
      id: ++m.seq,
      kind: tower.kind,
      x: tower.x,
      y: tower.y - (tower.kind === 'lantern' ? 28 : 20),
      tx: target.x,
      ty: target.y,
      targetId: target.id,
      speed: tower.kind === 'frost' ? 430 : 520,
      dmg: raw,
      reserve,
      splash: 0,
      slow: spec.slow,
      vuln: spec.vuln,
      dur: spec.dur,
      burn: spec.burn,
      burnTime: spec.burnTime,
      chain: spec.chains,
      alive: true,
    };
    m.shots.push(shot);
    if (tower.kind === 'frost') sfx(m, 'frost');
  }
}

function updateFx(m: Match, dt: number): void {
  for (const spark of m.sparks) {
    spark.life -= dt;
    spark.vy += spark.g * dt;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vx *= 1 - Math.min(0.5, dt * 1.4);
    spark.rot += spark.vr * dt;
    if (spark.kind === 'ring') spark.w += dt * 46;
  }
  m.sparks = m.sparks.filter((s) => s.life > 0);
  for (const text of m.floats) {
    text.life -= dt;
    text.y -= 18 * dt;
  }
  m.floats = m.floats.filter((t) => t.life > 0);
  for (const item of m.links) item.life -= dt;
  m.links = m.links.filter((item) => item.life > 0);
  m.shake = Math.max(0, m.shake - dt * 10);
  m.hurt = Math.max(0, m.hurt - dt * 0.7);
  m.bannerT = Math.max(0, m.bannerT - dt);
}

export function step(m: Match, dt: number): void {
  if (m.phase === 'title' || m.phase === 'paused' || m.phase === 'victory' || m.phase === 'defeat') {
    return;
  }
  const frame = Math.min(0.05, Math.max(0, dt));
  m.time += frame;

  if (m.phase === 'prepare') {
    m.prepareLeft -= frame;
    updateFx(m, frame);
    if (m.prepareLeft <= 0) callWave(m);
    return;
  }

  m.spawnElapsed += frame;
  while (m.queue.length > 0 && (m.queue[0]?.t ?? Infinity) <= m.spawnElapsed) {
    const next = m.queue.shift();
    if (next) placeEnemy(m, next.kind);
  }

  recomputeAuras(m);
  statuses(m, frame);
  moveEnemies(m, frame);
  if (fighting(m)) {
    towersAct(m, frame);
    moveShots(m, frame);
  }
  killDead(m);
  updateFx(m, frame);

  if (fighting(m) && m.queue.length === 0 && living(m).length === 0) {
    onWaveCleared(m);
  }
}

export function tryPlace(m: Match, plotId: number, kind: TowerKind): boolean {
  if (m.phase !== 'prepare' && m.phase !== 'combat') return false;
  const plot = plotById(plotId);
  if (!plot) return false;
  if (m.towers.some((tower) => tower.plotId === plotId)) return false;
  const cost = buyCost(kind);
  if (m.gold < cost) {
    sfx(m, 'gold');
    return false;
  }
  m.gold -= cost;
  const tower: Tower = {
    id: ++m.seq,
    kind,
    plotId,
    level: 1,
    x: plot.x,
    y: plot.y,
    cd: 0.25,
    acc: 0,
    buff: 0,
    invested: cost,
  };
  m.towers.push(tower);
  m.stats.built += 1;
  sfx(m, 'place');
  ring(m, plot.x, plot.y, 26, '#e3c17a', 0.45);
  burst(m, plot.x, plot.y, '#f3ead7', 8, 48, 'dot', 0.4);
  return true;
}

export function tryUpgrade(m: Match, towerId: number): boolean {
  if (m.phase !== 'prepare' && m.phase !== 'combat') return false;
  const tower = m.towers.find((item) => item.id === towerId);
  if (!tower) return false;
  const cost = upgradeCost(tower.kind, tower.level);
  if (cost === null) return false;
  if (m.gold < cost) {
    sfx(m, 'gold');
    return false;
  }
  m.gold -= cost;
  tower.level += 1;
  tower.invested += cost;
  m.stats.upgrades += 1;
  sfx(m, 'upgrade');
  ring(m, tower.x, tower.y, 34, '#f0d59a', 0.5);
  burst(m, tower.x, tower.y - 16, '#f3ead7', 10, 36, 'petal', 0.7);
  return true;
}

export function trySell(m: Match, towerId: number): boolean {
  if (m.phase !== 'prepare' && m.phase !== 'combat') return false;
  const index = m.towers.findIndex((item) => item.id === towerId);
  if (index < 0) return false;
  const tower = m.towers[index];
  if (!tower) return false;
  const refund = Math.floor(tower.invested * SELL_REFUND);
  m.gold += refund;
  m.towers.splice(index, 1);
  sfx(m, 'sell');
  float(m, tower.x, tower.y - 20, `+${refund}`, '#d7c4a2');
  burst(m, tower.x, tower.y, '#2a3038', 8, 40, 'ink', 0.4);
  return true;
}

export function pauseMatch(m: Match): void {
  if (m.phase === 'prepare' || m.phase === 'combat') {
    m.pausedFrom = m.phase;
    m.phase = 'paused';
  }
}

export function resumeMatch(m: Match): void {
  if (m.phase === 'paused' && m.pausedFrom) {
    m.phase = m.pausedFrom;
    m.pausedFrom = null;
  }
}

export function togglePause(m: Match): void {
  if (m.phase === 'paused') resumeMatch(m);
  else pauseMatch(m);
}
