// ============ UI: HUD, menus, toasts, compass ============
import { RESOURCES, RECIPES, BUILDABLES, BIOMES } from './config.js';

const $ = id => document.getElementById(id);

const ui = {
  cb: {},

  initUI(cb) {
    this.cb = cb;

    // title
    $('btn-continue').addEventListener('click', () => cb.continueGame());
    $('btn-new').addEventListener('click', () => cb.newGame());
    $('btn-help').addEventListener('click', () => {
      $('title-help').classList.toggle('hidden');
      cb.click();
    });

    // pause
    $('btn-resume').addEventListener('click', () => cb.resume());
    $('btn-save').addEventListener('click', () => cb.saveNow());
    $('btn-mute').addEventListener('click', () => cb.mute());
    $('btn-quit').addEventListener('click', () => cb.quitToTitle());

    // tabs in craft panel
    document.querySelectorAll('#menu-craft .tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#menu-craft .tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $('tab-craft').classList.toggle('hidden', btn.dataset.tab !== 'craft');
        $('tab-inv').classList.toggle('hidden', btn.dataset.tab !== 'inv');
        cb.click();
      });
    });

    // close menus on their close buttons
    document.querySelectorAll('.menu-close').forEach(btn => {
      btn.addEventListener('click', () => cb.closeMenu());
    });
  },

  // ---------------- loading ----------------
  showLoading(title, sub) {
    const l = $('loading');
    l.classList.remove('hidden', 'fade');
    $('load-title').textContent = title;
    $('load-sub').textContent = sub || '…';
    $('load-bar').style.width = '0%';
  },
  setLoadProgress(f) {
    $('load-bar').style.width = (Math.min(1, f) * 100).toFixed(1) + '%';
  },
  hideLoading() {
    const l = $('loading');
    l.classList.add('fade');
    setTimeout(() => l.classList.add('hidden'), 550);
  },

  // ---------------- title ----------------
  showTitle(hasSave) {
    $('title').classList.remove('hidden');
    $('btn-continue').classList.toggle('hidden', !hasSave);
    $('title-help').classList.add('hidden');
  },
  hideTitle() { $('title').classList.add('hidden'); },

  // ---------------- HUD ----------------
  showHUD() { $('hud').classList.remove('hidden'); },
  hideHUD() { $('hud').classList.add('hidden'); },

  hudPlanet(name, sub) {
    $('hud-planet-name').textContent = name;
    $('hud-planet-sub').textContent = sub;
  },

  setBattery(frac) {
    $('meter-battery').style.width = (Math.max(0, Math.min(1, frac)) * 100).toFixed(0) + '%';
    $('val-battery').textContent = (Math.max(0, Math.min(1, frac)) * 100).toFixed(0) + '%';
  },

  setO2(visible, frac) {
    $('chip-o2').classList.toggle('hidden', !visible);
    if (visible) {
      $('meter-o2').style.width = (Math.max(0, Math.min(1, frac)) * 100).toFixed(0) + '%';
      $('val-o2').textContent = (Math.max(0, Math.min(1, frac)) * 100).toFixed(0) + '%';
      $('meter-o2').classList.toggle('low', frac < 0.4);
    }
  },

  setTime(hhmm) { $('val-time').textContent = hhmm; },

  setTool(text) { $('hud-tool').textContent = text; },
  setBuildMode(on) { $('hud-mode').classList.toggle('hidden', !on); },

  quickbar(items) {
    const qb = $('quickbar');
    qb.innerHTML = '';
    for (const it of items) {
      const r = RESOURCES[it.id];
      const slot = document.createElement('div');
      slot.className = 'qb-slot';
      slot.innerHTML =
        `<div class="qb-gem" style="background:${hex(r.color)};color:${hex(r.color)}"></div>` +
        `<div class="qb-name">${r.code}</div>` +
        `<div class="qb-count">${it.count}</div>`;
      qb.appendChild(slot);
    }
  },

  prompt(text) {
    const p = $('hud-prompt');
    if (text) { p.textContent = text; p.classList.remove('hidden'); }
    else p.classList.add('hidden');
  },

  mineProgress(f) {
    const ring = $('mine-ring');
    if (f == null) { ring.classList.add('hidden'); return; }
    ring.classList.remove('hidden');
    const C = 106.8;
    ring.setAttribute('stroke-dashoffset', (C * (1 - Math.min(1, f))).toFixed(1));
  },

  toast(text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    $('toasts').appendChild(t);
    setTimeout(() => t.remove(), 2900);
  },

  scanCard(title, body, action) {
    const c = $('scan-card');
    if (!title) { c.classList.add('hidden'); return; }
    c.classList.remove('hidden');
    $('scan-title').textContent = title;
    $('scan-body').innerHTML = body;
    $('scan-action').textContent = action || '';
  },

  compass(deg) {
    const strip = $('compass-strip');
    if (!strip.children.length) {
      const labels = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
      for (let i = 0; i < 16; i++) {
        const sp = document.createElement('span');
        sp.style.width = '72px';
        sp.style.textAlign = 'center';
        sp.style.flex = 'none';
        sp.innerHTML = `<b>${labels[i % 8]}</b>`;
        strip.appendChild(sp);
      }
    }
    const idxF = (((deg % 360) + 360) % 360) / 45;
    const x = 140 - idxF * 72 - 36;
    strip.style.transform = `translateX(${x.toFixed(1)}px)`;
  },

  warpFlash() {
    const f = $('warp-flash');
    f.classList.remove('hidden');
    f.style.transition = 'opacity .28s';
    f.style.opacity = '1';
    setTimeout(() => {
      f.style.opacity = '0';
      setTimeout(() => f.classList.add('hidden'), 400);
    }, 420);
  },

  // ---------------- menus ----------------
  openMenu(id) {
    $('menu-craft').classList.add('hidden');
    $('menu-build').classList.add('hidden');
    $('menu-map').classList.add('hidden');
    $('menu-pause').classList.add('hidden');
    $(id).classList.remove('hidden');
  },
  closeAllMenus() {
    $('menu-craft').classList.add('hidden');
    $('menu-build').classList.add('hidden');
    $('menu-map').classList.add('hidden');
    $('menu-pause').classList.add('hidden');
  },

  renderCraft(inv) {
    const list = $('craft-list');
    list.innerHTML = '';
    for (const r of RECIPES) {
      const ok = inv.hasCost(r.cost);
      const el = document.createElement('div');
      el.className = 'craft-item' + (ok ? '' : ' locked');
      const owned = inv.items[r.id] ? `<span style="color:var(--cyan)"> · ×${inv.items[r.id]}</span>` : '';
      const costHtml = Object.entries(r.cost)
        .map(([id, n]) => {
          const have = inv.res[id] || 0;
          return `<span class="${have >= n ? 'ok' : 'no'}">${RESOURCES[id].name} ${Math.min(have, n)}/${n}</span>`;
        }).join('');
      el.innerHTML =
        `<div class="craft-name">${r.name}${owned}</div>` +
        `<div class="craft-cost">${costHtml}</div>` +
        `<div class="craft-desc">${r.desc}</div>`;
      if (ok) el.addEventListener('click', () => this.cb.onCraft(r));
      list.appendChild(el);
    }
  },

  renderInv(inv) {
    const res = $('inv-res');
    const items = $('inv-items');
    res.innerHTML = '';
    items.innerHTML = '';
    let any = false;
    for (const [id, n] of Object.entries(inv.res)) {
      if (!n) continue;
      any = true;
      const r = RESOURCES[id];
      const el = document.createElement('div');
      el.className = 'inv-item';
      el.innerHTML = `<div class="inv-gem" style="background:${hex(r.color)};color:${hex(r.color)}"></div>` +
        `<div class="inv-name">${r.name}</div><div class="inv-count">${n}</div>`;
      res.appendChild(el);
    }
    if (!any) res.innerHTML = '<div class="craft-desc">Aún no has recolectado recursos. Busca nodos brillantes y minar con el clic derecho.</div>';
    for (const [id, n] of Object.entries(inv.items)) {
      if (!n) continue;
      const r = RECIPES.find(x => x.id === id);
      const el = document.createElement('div');
      el.className = 'inv-item';
      el.innerHTML = `<div class="inv-gem" style="background:#7de8ff;color:#7de8ff"></div>` +
        `<div class="inv-name">${r ? r.name : id}</div><div class="inv-count">${n}</div>`;
      items.appendChild(el);
    }
    if (!Object.values(inv.items).some(v => v)) {
      items.innerHTML = '<div class="craft-desc">Fabrica equipos y módulos en la pestaña FABRICAR.</div>';
    }
  },

  renderBuild(inv) {
    const list = $('build-list');
    list.innerHTML = '';
    for (const [id, b] of Object.entries(BUILDABLES)) {
      const r = RECIPES.find(x => x.id === id);
      if (!r) continue;
      const ok = inv.hasCost(r.cost);
      const el = document.createElement('div');
      el.className = 'build-item';
      const costHtml = Object.entries(r.cost)
        .map(([rid, n]) => {
          const have = inv.res[rid] || 0;
          return `<span class="${have >= n ? 'ok' : 'no'}">${RESOURCES[rid].code} ${n}</span>`;
        }).join('');
      el.innerHTML =
        `<div class="build-name">${b.name}</div>` +
        `<div class="build-cost">${costHtml}</div>` +
        `<div class="build-desc">${r.desc}</div>`;
      if (ok) el.addEventListener('click', () => this.cb.onBuildPick(id));
      list.appendChild(el);
    }
  },

  renderMap(system, shipPos, currentPlanetSeed) {
    $('map-system-name').textContent = 'SISTEMA ' + system.name.toUpperCase();
    const list = $('map-list');
    list.innerHTML = '';
    for (const p of system.planets) {
      const c = shipPos && p.mesh ? p.mesh.position : null;
      const d = c ? Math.round(shipPos.distanceTo(c) / 10) / 10 : 0;
      const el = document.createElement('div');
      el.className = 'map-item' + (p.seed === currentPlanetSeed ? ' current' : '');
      const c0 = hex(p.spaceColors[0]);
      const c2 = hex(p.spaceColors[2] ?? p.spaceColors[0]);
      const toxic = p.toxic ? ' · <span style="color:#8aff9a">ATM. TÓXICA</span>' : '';
      el.innerHTML =
        `<div class="map-planet-dot" style="background:radial-gradient(circle at 32% 30%, ${c2}, ${c0} 60%, #0a1420)"></div>` +
        `<div><div class="map-name">${p.name.toUpperCase()}</div>` +
        `<div class="map-sub">${BIOMES[p.biome].label}${toxic}</div></div>` +
        `<div class="map-dist">${c ? d.toFixed(1) + ' Gm' : '—'}</div>`;
      el.addEventListener('click', () => this.cb.onMapGo(p));
      list.appendChild(el);
    }
  },

  setMuteLabel(muted) {
    $('btn-mute').textContent = muted ? 'SONIDO: NO' : 'SONIDO: SÍ';
  },

  fatal(msg) {
    $('fatal-msg').textContent = msg;
    $('fatal').classList.remove('hidden');
  },
};

function hex(c) {
  return '#' + c.toString(16).padStart(6, '0');
}

export default ui;
