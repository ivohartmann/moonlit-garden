export type Phase = 'title' | 'prepare' | 'combat' | 'paused' | 'victory' | 'defeat';

export type TowerKind = 'lantern' | 'bamboo' | 'frost' | 'pond' | 'seal';

export type EnemyKind = 'moth' | 'beast' | 'swift' | 'armor' | 'crane' | 'wisp' | 'wyrm' | 'boss';

export type TowerLevel = {
  dmg: number;
  range: number;
  interval: number;
  slow: number;
  vuln: number;
  dur: number;
  splash: number;
  splashSlow: number;
  splashDur: number;
  burn: number;
  burnTime: number;
  chains: number;
  tick: number;
  tickEvery: number;
  buff: number;
  burst: number;
  burstEvery: number;
};

export type TowerDef = {
  name: string;
  role: string;
  flavor: string;
  costs: [number, number, number];
  levels: [TowerLevel, TowerLevel, TowerLevel];
};

export type EnemyDef = {
  name: string;
  hp: number;
  speed: number;
  gold: number;
  leak: number;
  armor: number;
  slowResist: number;
  radius: number;
  wobble: number;
  /** Health restored per second while not burning. */
  regen: number;
};

export type WaveGroup = {
  kind: EnemyKind;
  count: number;
  interval: number;
};

export type WaveDef = {
  name: string;
  hint: string;
  bonus: number;
  groups: WaveGroup[];
};

export type Tower = {
  id: number;
  kind: TowerKind;
  plotId: number;
  level: number;
  x: number;
  y: number;
  cd: number;
  acc: number;
  buff: number;
  invested: number;
};

export type StatusFrost = { slow: number; vuln: number; t: number };
export type StatusBurn = { dps: number; t: number };

export type Enemy = {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  angle: number;
  dist: number;
  hp: number;
  maxHp: number;
  speed: number;
  armor: number;
  slowResist: number;
  gold: number;
  leak: number;
  radius: number;
  alive: boolean;
  leaked: boolean;
  phase: number;
  wobble: number;
  incoming: number;
  hitFlash: number;
  bambooSlow: number;
  frost: StatusFrost | null;
  burn: StatusBurn | null;
  splashSlow: number;
  splashT: number;
  regen: number;
  trail: { x: number; y: number }[];
};

export type Shot = {
  id: number;
  kind: TowerKind;
  x: number;
  y: number;
  tx: number;
  ty: number;
  targetId: number;
  speed: number;
  dmg: number;
  reserve: number;
  splash: number;
  slow: number;
  vuln: number;
  dur: number;
  burn: number;
  burnTime: number;
  chain: number;
  alive: boolean;
};

export type SparkKind = 'dot' | 'petal' | 'ring' | 'ink';

export type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: SparkKind;
  rot: number;
  vr: number;
  g: number;
  w: number;
};

export type FloatText = {
  x: number;
  y: number;
  text: string;
  life: number;
  max: number;
  color: string;
};

export type LinkFx = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  max: number;
  color: string;
};

export type SfxName =
  | 'place'
  | 'upgrade'
  | 'sell'
  | 'lantern'
  | 'bamboo'
  | 'pond'
  | 'frost'
  | 'burst'
  | 'hit'
  | 'kill'
  | 'leak'
  | 'wave'
  | 'victory'
  | 'defeat'
  | 'gold'
  | 'early'
  | 'boss'
  | 'click';

export type Stats = {
  kills: number;
  leaks: number;
  goldEarned: number;
  built: number;
  upgrades: number;
  bestWave: number;
};

export type Match = {
  phase: Phase;
  pausedFrom: Phase | null;
  time: number;
  gold: number;
  lives: number;
  waveIndex: number;
  prepareLeft: number;
  spawnElapsed: number;
  queue: { kind: EnemyKind; t: number }[];
  towers: Tower[];
  enemies: Enemy[];
  shots: Shot[];
  sparks: Spark[];
  floats: FloatText[];
  links: LinkFx[];
  sfx: SfxName[];
  seq: number;
  banner: string;
  bannerKicker: string;
  bannerT: number;
  hurt: number;
  shake: number;
  stats: Stats;
};

export type Plot = {
  id: number;
  x: number;
  y: number;
  score: number;
};
