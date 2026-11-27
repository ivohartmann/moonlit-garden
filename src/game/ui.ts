import { drawEnemyIcon, drawTowerIcon } from './actors.ts';
import {
  EARLY_BONUS,
  START_LIVES,
  TOWER_ORDER,
  TOWERS,
  WAVES,
  buyCost,
  enemyName,
  statLine,
  upgradeCost,
} from './balance.ts';
import type { EnemyKind, Match, TowerKind } from './types.ts';

export type HudState = {
  armed: TowerKind | null;
  selectedId: number | null;
  muted: boolean;
  fast: boolean;
  guide: boolean;
  hint: boolean;
  toast: string;
};

export type UiHooks = {
  arm: (kind: TowerKind) => void;
  upgrade: () => void;
  sell: () => void;
  call: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  title: () => void;
  speed: () => void;
  mute: () => void;
  start: () => void;
  guide: (open: boolean) => void;
  dismissHint: () => void;
};

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`缺少界面节点 ${id}`);
  return node as T;
}

function iconCanvas(kind: TowerKind | EnemyKind, enemy: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = enemy ? 44 : 86;
  canvas.height = enemy ? 34 : 58;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  if (enemy) drawEnemyIcon(ctx, kind as EnemyKind);
  else drawTowerIcon(ctx, kind as TowerKind);
  return canvas;
}

export function mountUi(hooks: UiHooks): (match: Match, hud: HudState) => void {
  const cards = byId<HTMLDivElement>('cards');
  for (const kind of TOWER_ORDER) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'card';
    button.dataset.kind = kind;
    const def = TOWERS[kind];
    button.append(iconCanvas(kind, false));
    const name = document.createElement('span');
    name.className = 'card-name';
    name.textContent = def.name;
    const role = document.createElement('span');
    role.className = 'card-role';
    role.textContent = def.role;
    const cost = document.createElement('span');
    cost.className = 'card-cost';
    cost.textContent = String(buyCost(kind));
    button.append(name, role, cost);
    button.addEventListener('click', () => hooks.arm(kind));
    cards.append(button);
  }

  byId('btn-start').addEventListener('click', hooks.start);
  byId('btn-guide').addEventListener('click', () => hooks.guide(true));
  byId('btn-guide-hud').addEventListener('click', () => hooks.guide(true));
  byId('btn-guide-pause').addEventListener('click', () => hooks.guide(true));
  byId('btn-guide-close').addEventListener('click', () => hooks.guide(false));
  byId('btn-mute-title').addEventListener('click', hooks.mute);
  byId('btn-mute').addEventListener('click', hooks.mute);
  byId('btn-mute-pause').addEventListener('click', hooks.mute);
  byId('btn-call').addEventListener('click', hooks.call);
  byId('btn-pause').addEventListener('click', hooks.pause);
  byId('btn-speed').addEventListener('click', hooks.speed);
  byId('btn-up').addEventListener('click', hooks.upgrade);
  byId('btn-sell').addEventListener('click', hooks.sell);
  byId('btn-resume').addEventListener('click', hooks.resume);
  byId('btn-restart').addEventListener('click', hooks.restart);
  byId('btn-quit').addEventListener('click', hooks.title);
  byId('btn-retry').addEventListener('click', hooks.restart);
  byId('btn-home').addEventListener('click', hooks.title);
  byId('hint-close').addEventListener('click', hooks.dismissHint);

  let previewKey = '';
  let bannerName = '';

  return (match, hud) => {
    const playing = match.phase === 'prepare' || match.phase === 'combat' || match.phase === 'paused';
    byId('title-layer').hidden = match.phase !== 'title';
    byId('hud').hidden = !playing;
    byId('pause-layer').hidden = match.phase !== 'paused' || hud.guide;
    const ended = match.phase === 'victory' || match.phase === 'defeat';
    byId('end-layer').hidden = !ended;
    byId('guide-layer').hidden = !hud.guide;
    byId('hint').hidden = !hud.hint || !playing;
    const toast = byId('toast');
    toast.hidden = !hud.toast;
    toast.textContent = hud.toast;

    byId('btn-mute').textContent = hud.muted ? '静' : '声';
    byId('btn-mute-title').textContent = hud.muted ? '声 静' : '声 开';
    byId('btn-mute-pause').textContent = hud.muted ? '打开声音' : '静音';
    byId('btn-speed').textContent = hud.fast ? '疾行' : '常速';
    byId('gold').textContent = String(match.gold);
    byId('lives').textContent = String(match.lives);
    byId('lives-chip').classList.toggle('danger', playing && match.lives <= 5);

    const wave = WAVES[match.waveIndex];
    if (wave && playing) {
      byId('wave-index').textContent =
        match.phase === 'prepare' ? `下一波 ${match.waveIndex + 1}` : `第 ${match.waveIndex + 1} 波`;
      byId('wave-name').textContent = wave.name;
      byId('wave-hint').textContent = wave.hint;
    }

    const call = byId<HTMLButtonElement>('btn-call');
    if (match.phase === 'prepare') {
      call.disabled = false;
      call.textContent = `启波 ${Math.ceil(Math.max(0, match.prepareLeft))}`;
      byId('call-note').textContent = `提前启波 +${EARLY_BONUS} 铜钱`;
    } else {
      call.disabled = true;
      call.textContent = '交锋中';
      byId('call-note').textContent = '庭中仍有墨色';
    }

    for (const button of cards.querySelectorAll<HTMLButtonElement>('.card')) {
      const kind = button.dataset.kind as TowerKind;
      button.classList.toggle('armed', hud.armed === kind);
      button.querySelector('.card-cost')?.classList.toggle('poor', match.gold < buyCost(kind));
    }

    const tower = match.towers.find((item) => item.id === hud.selectedId) ?? null;
    const detail = byId('detail');
    detail.hidden = !tower || !playing;
    if (tower) {
      const def = TOWERS[tower.kind];
      const rank = ['一', '二', '三'][tower.level - 1] ?? String(tower.level);
      byId('d-name').textContent = `${def.name} · ${rank}阶`;
      byId('d-role').textContent = def.role;
      byId('d-flavor').textContent = def.flavor;
      const next = upgradeCost(tower.kind, tower.level);
      const now = statLine(tower.kind, tower.level);
      const later = next ? statLine(tower.kind, tower.level + 1) : '';
      byId('d-stats').textContent = later ? `${now}　→　${later}` : now;
      const up = byId<HTMLButtonElement>('btn-up');
      if (next === null) {
        up.disabled = true;
        up.textContent = '已圆满';
      } else {
        up.disabled = match.gold < next;
        up.textContent = `升级 · ${next}`;
      }
      byId('btn-sell').textContent = `出售 · ${Math.floor(tower.invested * 0.6)}`;
    }

    if (playing && wave && match.phase === 'prepare') {
      const key = `p${match.waveIndex}`;
      if (key !== previewKey) {
        previewKey = key;
        const box = byId('preview');
        box.replaceChildren();
        for (const group of wave.groups) {
          const item = document.createElement('span');
          item.className = 'preview-item';
          item.append(iconCanvas(group.kind, true));
          const label = document.createElement('em');
          label.textContent = `${enemyName(group.kind)} ${group.count}`;
          item.append(label);
          box.append(item);
        }
      }
    } else if (match.phase !== 'prepare') {
      previewKey = '';
      byId('preview').replaceChildren();
    }

    const boss = match.enemies.find((enemy) => enemy.kind === 'boss' && enemy.alive && enemy.hp > 0);
    byId('boss').hidden = !boss;
    if (boss) byId('boss-fill').style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;

    const banner = byId('banner');
    if (match.bannerT > 0.05 && match.banner) {
      if (bannerName !== match.banner) {
        bannerName = match.banner;
        byId('banner-kicker').textContent = match.bannerKicker;
        byId('banner-name').textContent = match.banner;
        banner.hidden = false;
        banner.classList.remove('show');
        void banner.offsetWidth;
        banner.classList.add('show');
      }
    } else {
      banner.hidden = true;
      bannerName = '';
    }

    if (ended) {
      const win = match.phase === 'victory';
      byId('end-kicker').textContent = win ? '一夜' : '失守';
      byId('end-title').textContent = win ? '月在' : '灯残';
      byId('end-poem').textContent = win
        ? match.lives >= 12
          ? '二十二波都过去了，月色还在庭中。'
          : '月华薄了，但这长夜终究守住了。'
        : '灯熄了。墨色漫过石径。';
      const lines = [
        win ? '二十二波皆静' : `止步第 ${match.stats.bestWave || 1} 波`,
        `击退 ${match.stats.kills}`,
        `余下月华 ${match.lives} / ${START_LIVES}`,
        `庭器 ${match.stats.built}，升阶 ${match.stats.upgrades}`,
      ];
      byId('end-stats').textContent = lines.join('　');
    }
  };
}
