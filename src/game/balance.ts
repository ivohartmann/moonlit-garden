import type { EnemyDef, EnemyKind, TowerDef, TowerKind, TowerLevel, WaveDef } from './types.ts';

/** All combat numbers live here. Tune, then run `npm run sim`. */

export const START_GOLD = 200;
export const START_LIVES = 22;
export const SELL_REFUND = 0.6;
export const EARLY_BONUS = 12;
export const PREPARE_FIRST = 26;
export const PREPARE_NEXT = 14;
export const SLOW_CAP = 0.74;

const z = (partial: Partial<TowerLevel>): TowerLevel => ({
  dmg: 0,
  range: 0,
  interval: 0,
  slow: 0,
  vuln: 0,
  dur: 0,
  splash: 0,
  splashSlow: 0,
  splashDur: 0,
  burn: 0,
  burnTime: 0,
  chains: 0,
  tick: 0,
  tickEvery: 0.5,
  buff: 0,
  burst: 0,
  burstEvery: 0,
  ...partial,
});

export const TOWERS: Record<TowerKind, TowerDef> = {
  lantern: {
    name: '石灯',
    role: '单体',
    flavor: '一点灯火，专照最前的那一只。升到第三阶时，灯芯会灼烧残墨。',
    costs: [100, 85, 140],
    levels: [
      z({ dmg: 15, range: 122, interval: 0.62 }),
      z({ dmg: 28, range: 136, interval: 0.54 }),
      z({ dmg: 46, range: 152, interval: 0.46, burn: 14, burnTime: 2.4 }),
    ],
  },
  bamboo: {
    name: '竹林',
    role: '迟滞',
    flavor: '风过竹叶，脚步便慢了。它不负责杀，它让别的庭器打得更久。',
    costs: [80, 75, 120],
    levels: [
      z({ range: 124, slow: 0.36 }),
      z({ range: 140, slow: 0.5 }),
      z({ range: 156, slow: 0.62, tick: 5, tickEvery: 0.5 }),
    ],
  },
  frost: {
    name: '梅霜',
    role: '易伤',
    flavor: '霜附在墨色上，使它更容易被照破，并再缓一缓。第三阶可及邻近的第二只。',
    costs: [120, 100, 155],
    levels: [
      z({ dmg: 9, range: 148, interval: 1.05, slow: 0.2, vuln: 0.3, dur: 3 }),
      z({ dmg: 15, range: 162, interval: 0.92, slow: 0.28, vuln: 0.42, dur: 3.3 }),
      z({ dmg: 22, range: 176, interval: 0.82, slow: 0.34, vuln: 0.55, dur: 3.6, chains: 1 }),
    ],
  },
  pond: {
    name: '泉眼',
    role: '溅射',
    flavor: '水纹荡开，伤及一片。弯道上敌人挤在一起时，它最合算。',
    costs: [160, 120, 170],
    levels: [
      z({ dmg: 30, range: 120, interval: 1.28, splash: 62 }),
      z({ dmg: 48, range: 134, interval: 1.12, splash: 76 }),
      z({ dmg: 70, range: 148, interval: 1.0, splash: 90, splashSlow: 0.34, splashDur: 1.1 }),
    ],
  },
  seal: {
    name: '朱印',
    role: '助阵',
    flavor: '印光所及，庭器更利。两枚朱印只取较强的一枚。第三阶会定时迸出朱火。',
    costs: [135, 110, 160],
    levels: [
      z({ range: 132, buff: 0.24 }),
      z({ range: 148, buff: 0.38 }),
      z({ range: 164, buff: 0.52, burst: 72, burstEvery: 3.2 }),
    ],
  },
};

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  moth: {
    name: '墨蛾',
    hp: 40,
    speed: 72,
    gold: 7,
    leak: 1,
    armor: 0,
    slowResist: 0,
    radius: 11,
    wobble: 5,
    regen: 0,
  },
  beast: {
    name: '影兽',
    hp: 128,
    speed: 48,
    gold: 13,
    leak: 1,
    armor: 1,
    slowResist: 0.1,
    radius: 13,
    wobble: 2.5,
    regen: 0,
  },
  swift: {
    name: '银翅',
    hp: 74,
    speed: 128,
    gold: 11,
    leak: 1,
    armor: 0,
    slowResist: 0.5,
    radius: 10,
    wobble: 4,
    regen: 0,
  },
  armor: {
    name: '玄甲',
    hp: 560,
    speed: 33,
    gold: 24,
    leak: 2,
    armor: 11,
    slowResist: 0.16,
    radius: 15,
    wobble: 1.4,
    regen: 0,
  },
  crane: {
    name: '纸鹤',
    hp: 210,
    speed: 104,
    gold: 15,
    leak: 1,
    armor: 0,
    slowResist: 0.68,
    radius: 12,
    wobble: 3,
    regen: 0,
  },
  wisp: {
    name: '游灯',
    hp: 320,
    speed: 42,
    gold: 16,
    leak: 1,
    armor: 0,
    slowResist: 0.12,
    radius: 13,
    wobble: 6,
    regen: 22,
  },
  wyrm: {
    name: '墨蛟',
    hp: 2400,
    speed: 34,
    gold: 46,
    leak: 3,
    armor: 8,
    slowResist: 0.22,
    radius: 16,
    wobble: 1.6,
    regen: 0,
  },
  boss: {
    name: '月噬',
    hp: 8800,
    speed: 24,
    gold: 180,
    leak: 22,
    armor: 10,
    slowResist: 0.3,
    radius: 22,
    wobble: 2,
    regen: 0,
  },
};

export const WAVES: WaveDef[] = [
  {
    name: '初萤',
    hint: '少量墨蛾。弯处的石灯，照得最久。',
    bonus: 28,
    groups: [{ kind: 'moth', count: 8, interval: 0.95 }],
  },
  {
    name: '聚影',
    hint: '影兽混入，比蛾更耐打。',
    bonus: 34,
    groups: [
      { kind: 'moth', count: 7, interval: 0.72 },
      { kind: 'beast', count: 4, interval: 1.05 },
    ],
  },
  {
    name: '急翅',
    hint: '银翅很快。竹林能把它们留在灯下。',
    bonus: 40,
    groups: [
      { kind: 'swift', count: 9, interval: 0.55 },
      { kind: 'moth', count: 4, interval: 0.65 },
    ],
  },
  {
    name: '夜巡',
    hint: '影兽成队而来。',
    bonus: 46,
    groups: [
      { kind: 'beast', count: 8, interval: 0.78 },
      { kind: 'swift', count: 6, interval: 0.46 },
    ],
  },
  {
    name: '玄甲',
    hint: '甲厚。梅霜能让后面的伤害透进去。',
    bonus: 56,
    groups: [
      { kind: 'moth', count: 6, interval: 0.55 },
      { kind: 'armor', count: 3, interval: 1.6 },
      { kind: 'beast', count: 4, interval: 0.7 },
    ],
  },
  {
    name: '乱羽',
    hint: '快慢交杂，别只守着一条直线。',
    bonus: 62,
    groups: [
      { kind: 'swift', count: 14, interval: 0.36 },
      { kind: 'beast', count: 6, interval: 0.7 },
    ],
  },
  {
    name: '重门',
    hint: '玄甲变多。该把石灯与梅霜升上去了。',
    bonus: 72,
    groups: [
      { kind: 'armor', count: 6, interval: 1.15 },
      { kind: 'beast', count: 6, interval: 0.6 },
      { kind: 'swift', count: 8, interval: 0.42 },
    ],
  },
  {
    name: '月晕',
    hint: '成群的银翅。要减速，也要一片水纹。',
    bonus: 80,
    groups: [
      { kind: 'swift', count: 18, interval: 0.3 },
      { kind: 'armor', count: 5, interval: 1.15 },
    ],
  },
  {
    name: '墨潮',
    hint: '潮水已到门前。把印光罩住你的主力。',
    bonus: 96,
    groups: [
      { kind: 'beast', count: 6, interval: 0.5 },
      { kind: 'armor', count: 8, interval: 0.9 },
      { kind: 'swift', count: 12, interval: 0.34 },
    ],
  },
  {
    name: '折纸',
    hint: '纸鹤来了。竹叶几乎留不住它们，要靠伤害本身。',
    bonus: 70,
    groups: [
      { kind: 'moth', count: 8, interval: 0.5 },
      { kind: 'crane', count: 8, interval: 0.62 },
      { kind: 'beast', count: 4, interval: 0.8 },
    ],
  },
  {
    name: '千羽',
    hint: '纸鹤与银翅交错。减速只管得住一半。',
    bonus: 76,
    groups: [
      { kind: 'swift', count: 12, interval: 0.32 },
      { kind: 'crane', count: 12, interval: 0.48 },
    ],
  },
  {
    name: '游灯',
    hint: '游灯会自己愈合。灯芯的灼烧能止住那一点火。',
    bonus: 82,
    groups: [
      { kind: 'wisp', count: 6, interval: 1.15 },
      { kind: 'beast', count: 8, interval: 0.55 },
      { kind: 'moth', count: 8, interval: 0.45 },
    ],
  },
  {
    name: '灯市',
    hint: '灯与鹤一起拥过来。先烧灯，再打断纸翼。',
    bonus: 88,
    groups: [
      { kind: 'wisp', count: 8, interval: 0.9 },
      { kind: 'crane', count: 10, interval: 0.42 },
      { kind: 'swift', count: 8, interval: 0.34 },
    ],
  },
  {
    name: '铁夜',
    hint: '玄甲押着游灯。梅霜仍然是开甲的钥匙。',
    bonus: 94,
    groups: [
      { kind: 'armor', count: 7, interval: 1.05 },
      { kind: 'wisp', count: 6, interval: 0.85 },
      { kind: 'beast', count: 8, interval: 0.5 },
    ],
  },
  {
    name: '初蛟',
    hint: '墨蛟现身。它比玄甲更长，漏过园门会重重损去月华。',
    bonus: 110,
    groups: [
      { kind: 'beast', count: 8, interval: 0.48 },
      { kind: 'wyrm', count: 2, interval: 2.2 },
      { kind: 'armor', count: 6, interval: 1.0 },
    ],
  },
  {
    name: '夜市',
    hint: '快的、滑的、会愈合的，一起挤在石径上。',
    bonus: 100,
    groups: [
      { kind: 'swift', count: 14, interval: 0.28 },
      { kind: 'crane', count: 10, interval: 0.4 },
      { kind: 'wisp', count: 6, interval: 0.8 },
    ],
  },
  {
    name: '双蛟',
    hint: '两头墨蛟前后脚。把火力聚在弯处，别让它们拉开距离。',
    bonus: 120,
    groups: [
      { kind: 'crane', count: 10, interval: 0.4 },
      { kind: 'wyrm', count: 3, interval: 1.8 },
      { kind: 'armor', count: 6, interval: 0.95 },
    ],
  },
  {
    name: '潮声',
    hint: '这一波很密。泉眼和竹林要比单盏灯更要紧。',
    bonus: 116,
    groups: [
      { kind: 'swift', count: 16, interval: 0.26 },
      { kind: 'beast', count: 8, interval: 0.45 },
      { kind: 'wisp', count: 7, interval: 0.7 },
      { kind: 'armor', count: 6, interval: 0.9 },
    ],
  },
  {
    name: '残月',
    hint: '蛟、甲、鹤一起压境。没有助威的庭器会显得不够。',
    bonus: 128,
    groups: [
      { kind: 'wyrm', count: 4, interval: 1.5 },
      { kind: 'armor', count: 8, interval: 0.8 },
      { kind: 'crane', count: 14, interval: 0.32 },
      { kind: 'swift', count: 12, interval: 0.26 },
    ],
  },
  {
    name: '守夜',
    hint: '游灯成列。灼烧要维持住，否则它们会在半路复原。',
    bonus: 124,
    groups: [
      { kind: 'wisp', count: 12, interval: 0.62 },
      { kind: 'armor', count: 7, interval: 0.9 },
      { kind: 'swift', count: 14, interval: 0.28 },
      { kind: 'beast', count: 8, interval: 0.48 },
    ],
  },
  {
    name: '墨海',
    hint: '最后的潮水。月噬还在后面。',
    bonus: 140,
    groups: [
      { kind: 'wyrm', count: 4, interval: 1.45 },
      { kind: 'armor', count: 10, interval: 0.75 },
      { kind: 'crane', count: 14, interval: 0.34 },
      { kind: 'swift', count: 12, interval: 0.26 },
    ],
  },
  {
    name: '月噬',
    hint: '月下有物回首。它若走到东侧月门，这一夜就结束了。',
    bonus: 180,
    groups: [
      { kind: 'swift', count: 8, interval: 0.32 },
      { kind: 'boss', count: 1, interval: 0.4 },
      { kind: 'wyrm', count: 2, interval: 1.5 },
      { kind: 'armor', count: 6, interval: 0.9 },
      { kind: 'crane', count: 10, interval: 0.36 },
    ],
  },
];

export function totalSpawns(): number {
  return WAVES.reduce((sum, wave) => sum + wave.groups.reduce((n, group) => n + group.count, 0), 0);
}

export const TOWER_ORDER: TowerKind[] = ['lantern', 'bamboo', 'frost', 'pond', 'seal'];

export function towerLevel(kind: TowerKind, level: number): TowerLevel {
  const idx = Math.max(0, Math.min(2, level - 1));
  return TOWERS[kind].levels[idx];
}

export function buyCost(kind: TowerKind): number {
  return TOWERS[kind].costs[0];
}

/** Cost to leave `level` for the next tier, or null at max. */
export function upgradeCost(kind: TowerKind, level: number): number | null {
  if (level >= 3) return null;
  return TOWERS[kind].costs[level];
}

export function statLine(kind: TowerKind, level: number): string {
  const s = towerLevel(kind, level);
  if (kind === 'lantern') {
    const burn = s.burn > 0 ? ` · 灼烧 ${s.burn}` : '';
    return `伤害 ${s.dmg} · 射程 ${Math.round(s.range)} · 间隔 ${s.interval.toFixed(2)} 秒${burn}`;
  }
  if (kind === 'bamboo') {
    const tick = s.tick > 0 ? ` · 叶刃 ${s.tick}` : '';
    return `迟滞 ${Math.round(s.slow * 100)}% · 射程 ${Math.round(s.range)}${tick}`;
  }
  if (kind === 'frost') {
    const chain = s.chains > 0 ? ' · 可及第二只' : '';
    return `伤害 ${s.dmg} · 易伤 ${Math.round(s.vuln * 100)}% · 缓 ${Math.round(s.slow * 100)}%${chain}`;
  }
  if (kind === 'pond') {
    const slow = s.splashSlow > 0 ? ` · 溅缓 ${Math.round(s.splashSlow * 100)}%` : '';
    return `伤害 ${s.dmg} · 水纹 ${Math.round(s.splash)} · 间隔 ${s.interval.toFixed(2)} 秒${slow}`;
  }
  const burst = s.burst > 0 ? ` · 朱火 ${s.burst}` : '';
  return `助威 +${Math.round(s.buff * 100)}% · 射程 ${Math.round(s.range)}${burst}`;
}

export function theoreticalIncome(earlyCalls: number): number {
  let gold = START_GOLD + EARLY_BONUS * earlyCalls;
  for (const wave of WAVES) {
    gold += wave.bonus;
    for (const group of wave.groups) {
      gold += group.count * ENEMIES[group.kind].gold;
    }
  }
  return gold;
}

export function enemyName(kind: EnemyKind): string {
  return ENEMIES[kind].name;
}
