// ============ NO MAN'S SKY — Réplica · main orchestrator ============
import * as THREE from 'three';
import { GAME, BIOMES, RESOURCES, RECIPES, BUILDABLES, CREATURES } from './config.js';
import { makeRng } from './rng.js';
import { generateSystem, createWorld, genPlanetName, planetCenter } from './planet.js';
import { PlanetSky } from './sky.js';
import { Terrain } from './terrain.js';
import { Player } from './player.js';
import { Fauna } from './creatures.js';
import { Builder } from './build.js';
import { Inventory } from './inventory.js';
import { SpaceMode } from './space.js';
import { AudioSys } from './audio.js';
import { Particles } from './particles.js';
import { buildShipModel } from './ship.js';
import * as saveMod from './save.js';
import ui from './ui.js';

// ---------------- renderer ----------------
let renderer;
const canvas = document.getElementById('game');
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (e) {
  ui.fatal('Tu navegador no soporta WebGL, necesario para el juego.');
  throw e;
}
renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 140000);
const scenePlanet = new THREE.Scene();
const sceneSpace = new THREE.Scene();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------- global state ----------------
const audio = new AudioSys();
const G = {
  mode: 'title',           // title | space | planet | transition
  trans: null,
  systemSeed: null,
  system: null,
  warpCount: 0,
  planet: null,
  world: null,
  terrain: null,
  player: null,
  fauna: null,
  builder: null,
  particles: null,
  sky: null,
  space: null,
  inv: new Inventory(),
  battery: 100,
  maxBattery: 100,
  o2: 100,
  dayTime: GAME.START_TIME,
  spaceTime: 0,
  structuresSaved: {},
  menuOpen: null,
  autosaveT: 0,
  mineT: 0,
  target: null,
  targetShort: '',
  scanCardT: 0,
  stepT: 0,
  stepAlt: false,
  quickbarDirty: true,
  shipNear: false,
  hudT: 0,
};

const input = {
  keys: new Set(),
  mouse: { dx: 0, dy: 0, ldown: false, rdown: false },
  jumpQueued: false,
  locked: false,
  dragLook: false,
  dragging: false,
};

const raycaster = new THREE.Raycaster();
const parkedShip = buildShipModel();
parkedShip.visible = false;
scenePlanet.add(parkedShip);

// planet-scene singletons
G.sky = new PlanetSky(scenePlanet);
G.player = new Player(scenePlanet, null);
G.particles = new Particles(scenePlanet);
G.builder = new Builder(scenePlanet, null);
G.fauna = new Fauna(scenePlanet, null, 'x');
G.space = new SpaceMode(sceneSpace, camera);

// title backdrop
G.systemSeed = 'title:' + Math.random().toString(36).slice(2);
G.system = generateSystem(G.systemSeed);
G.space.loadSystem(G.system);
G.mode = 'title';

const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _v = new THREE.Vector3();

// ---------------- world / planet enter ----------------
function enterPlanet(planet, spawnPos) {
  G.planet = planet;
  G.world = createWorld(planet);
  if (G.terrain) G.terrain.dispose();
  G.terrain = new Terrain(scenePlanet, G.world);

  G.fauna.world = G.world;
  G.fauna.seed = planet.seed;
  G.fauna.spawnIdx = Math.floor(Math.random() * 10000);
  G.fauna.clear();

  G.builder.world = G.world;
  G.builder.clear();
  if (G.structuresSaved[planet.seed]) G.builder.load(G.structuresSaved[planet.seed]);

  G.sky.setAtmosphere(BIOMES[planet.biome], planet.toxic);

  const spawn = spawnPos || G.world.findSpawn();
  G.player.world = G.world;
  G.player.spawn(spawn.x, spawn.y, spawn.z);
  G.player.yaw = 0;
  G.player.pitch = 0.4;

  // park the ship nearby
  parkShip(spawn);
  G.o2 = 100;
  G.battery = Math.min(G.battery, G.maxBattery);
  G.mineT = 0;
  G.target = null;
  audio.setAmbient('planet');
  audio.setMusic('planet');
  ui.hudPlanet(planet.name.toUpperCase(),
    `${BIOMES[planet.biome].label}${planet.toxic ? ' · ATMÓSFERA TÓXICA' : ' · ATMÓSFERA RESPIRABLE'}`);
  ui.setTool('MULTIHERRAMIENTA');
  ui.setBuildMode(false);
  G.quickbarDirty = true;
}

function parkShip(spawn) {
  const w = G.world;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const x = spawn.x + Math.cos(a) * 14;
    const z = spawn.z + Math.sin(a) * 14;
    const h = w.height(x, z);
    if (Math.abs(h - spawn.y) < 2.5 && h > 1.5 && w.slopeAt(x, z) < 0.5) {
      parkedShip.position.set(x, h, z);
      parkedShip.rotation.set(0, a + Math.PI / 2, 0);
      parkedShip.visible = true;
      return;
    }
  }
  parkedShip.position.set(spawn.x + 14, spawn.y, spawn.z);
  parkedShip.visible = true;
}

function saveStructures() {
  if (G.planet) G.structuresSaved[G.planet.seed] = G.builder.save();
}

// ---------------- save / load ----------------
function collectSave() {
  const s = {
    v: 1,
    systemSeed: G.systemSeed,
    warpCount: G.warpCount,
    mode: G.mode === 'space' ? 'space' : 'planet',
    inv: G.inv.toJSON(),
    battery: G.battery,
    o2: G.o2,
    dayTime: G.dayTime,
    spaceTime: G.spaceTime,
    structures: G.structuresSaved,
  };
  if (G.mode === 'space') s.ship = G.space.shipState();
  if (G.mode === 'planet' && G.planet) {
    s.planetSeed = G.planet.seed;
    s.playerPos = { x: G.player.pos.x, y: G.player.pos.y, z: G.player.pos.z, yaw: G.player.yaw };
  }
  return s;
}

function doSave(silent) {
  if (G.mode !== 'space' && G.mode !== 'planet') return;
  if (saveMod.writeSave(collectSave())) {
    if (!silent) ui.toast('JUEGO GUARDADO');
    if (!silent) audio.click();
  }
}

// ---------------- mode transitions ----------------
function newGame() {
  audio.init();
  audio.resume();
  G.systemSeed = 'sys:' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  G.warpCount = 0;
  G.system = generateSystem(G.systemSeed);
  G.inv = new Inventory();
  G.battery = 100;
  G.maxBattery = 100;
  G.o2 = 100;
  G.dayTime = GAME.START_TIME;
  G.structuresSaved = {};
  G.space.loadSystem(G.system, null);
  ui.hideTitle();
  ui.showLoading('GENERANDO GALAXIA', 'SISTEMA ' + G.system.name.toUpperCase());
  ui.setLoadProgress(0);
  G.mode = 'transition';
  G.trans = { type: 'start', t: 0 };
}

function continueGame() {
  audio.init();
  audio.resume();
  const d = saveMod.loadSave();
  if (!d) { newGame(); return; }
  G.systemSeed = d.systemSeed;
  G.warpCount = d.warpCount || 0;
  G.system = generateSystem(d.systemSeed);
  G.inv.fromJSON(d.inv);
  G.battery = d.battery ?? 100;
  G.o2 = d.o2 ?? 100;
  G.dayTime = d.dayTime ?? GAME.START_TIME;
  G.spaceTime = d.spaceTime || 0;
  G.structuresSaved = d.structures || {};
  if (G.inv.suit2) { G.player.setSuit(0x5a7ac8); G.player.speedMult = 1.1; }
  ui.hideTitle();
  if (d.mode === 'space' && d.ship) {
    ui.showLoading('RESTAURANDO NAVE', 'SISTEMA ' + G.system.name.toUpperCase());
    G.space.loadSystem(G.system, d.ship);
    G.mode = 'transition';
    G.trans = { type: 'start', t: 0.8, ship: d.ship };
  } else if (d.planetSeed) {
    const planet = G.system.planets.find(p => p.seed === d.planetSeed);
    if (planet) {
      ui.showLoading('ATERRIZANDO EN', planet.name.toUpperCase());
      ui.setLoadProgress(0);
      enterPlanet(planet, d.playerPos ? { x: d.playerPos.x, y: d.playerPos.y, z: d.playerPos.z } : null);
      G.player.yaw = d.playerPos?.yaw || 0;
      G.mode = 'transition';
      G.trans = { type: 'land', t: 0.8 };
    } else newGame();
  } else newGame();
}

function beginLandingTransition(planet) {
  audio.land();
  ui.showLoading('ATERRIZANDO EN', planet.name.toUpperCase());
  ui.setLoadProgress(0);
  enterPlanet(planet, null);
  G.mode = 'transition';
  G.trans = { type: 'land', t: 0 };
}

function beginTakeoff() {
  const planet = G.planet;
  saveStructures();
  audio.takeoff();
  ui.warpFlash();
  G.mode = 'transition';
  G.trans = { type: 'takeoff', t: 0 };
  // prepare ship state at the planet's current orbital position
  const c = planetCenter(planet, G.spaceTime);
  G.trans.ship = {
    x: c.x, y: planet.radius + 700, z: c.z,
    qx: 0, qy: 0, qz: 0, qw: 1,
    time: G.spaceTime,
  };
}

function finishTakeoff() {
  const planet = G.planet;
  // face toward system center
  _v.set(-G.trans.ship.x, 0, -G.trans.ship.z).normalize();
  _q.setFromUnitVectors(new THREE.Vector3(0, 0, -1), _v);
  G.trans.ship.qx = _q.x; G.trans.ship.qy = _q.y; G.trans.ship.qz = _q.z; G.trans.ship.qw = _q.w;
  G.space.loadSystem(G.system, G.trans.ship);
  G.mode = 'space';
  ui.showHUD();
  ui.setTool('NAVE EXPLORADORA');
  ui.hudPlanet('SISTEMA ' + G.system.name.toUpperCase(), 'NAVEGACIÓN ESTELAR');
  audio.setAmbient('space');
  audio.setMusic('space');
}

function beginWarp() {
  if (!G.space.beginWarp()) return;
  audio.warp();
  ui.warpFlash();
}

function finishWarp() {
  G.warpCount++;
  G.systemSeed = G.systemSeed + '#' + G.warpCount;
  G.system = generateSystem(G.systemSeed);
  G.space.loadSystem(G.system, null);
  ui.toast('SISTEMA ' + G.system.name.toUpperCase());
  ui.hudPlanet('SISTEMA ' + G.system.name.toUpperCase(), 'NAVEGACIÓN ESTELAR');
  audio.setMusic('space');
}

// ---------------- targeting / mining / scanning ----------------
function resolveTarget(hit) {
  const ch = G.terrain ? G.terrain.resMeshChunk.get(hit.object) : null;
  if (ch) {
    const data = ch.resData[hit.instanceId];
    if (data && data.amount > 0) return { kind: 'resource', ch, i: hit.instanceId, data, point: hit.point };
  }
  let o = hit.object;
  while (o) {
    if (o.userData && o.userData.creature) return { kind: 'creature', c: o.userData.creature, point: hit.point };
    o = o.parent;
  }
  if (hit.object === parkedShip || (parkedShip.children.includes(hit.object))) return { kind: 'ship', point: hit.point };
  return null;
}

function passiveTarget() {
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  raycaster.far = 28;
  const objs = [];
  if (G.terrain) {
    for (const ch of G.terrain.chunks.values()) if (ch.resMesh) objs.push(ch.resMesh);
  }
  if (G.fauna) objs.push(...G.fauna.groups());
  if (parkedShip.visible) objs.push(parkedShip);
  const hits = raycaster.intersectObjects(objs, true);
  if (!hits.length) return null;
  return resolveTarget(hits[0]);
}

function doScan() {
  // full scan (includes flora/rocks): one-shot, a bit heavier
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  raycaster.far = 30;
  const objs = [];
  if (G.terrain) {
    for (const ch of G.terrain.chunks.values()) {
      if (ch.resMesh) objs.push(ch.resMesh);
      if (ch.group) ch.group.children.forEach(c => objs.push(c));
    }
  }
  if (G.fauna) objs.push(...G.fauna.groups());
  if (parkedShip.visible) objs.push(parkedShip);
  const hits = raycaster.intersectObjects(objs, true);
  if (!hits.length) {
    audio.error();
    ui.toast('SIN SEÑAL');
    return;
  }
  if (G.battery < 1) { audio.error(); ui.toast('BATERÍA AGOTADA'); return; }
  G.battery -= 1;
  audio.scan();
  const hit = hits[0];
  const t = resolveTarget(hit);
  let title = '', body = '', action = '';
  if (t && t.kind === 'resource') {
    const r = RESOURCES[t.data.type];
    title = 'NODO DE ' + r.name;
    body = `Abundancia: <b>${t.data.amount} u.</b><br>Bioma: ${BIOMES[G.planet.biome].label}`;
    action = 'MANTÉN [CLIC DER] PARA MINAR';
  } else if (t && t.kind === 'creature') {
    title = t.c.info.name.toUpperCase() + ' · ' + CREATURES[t.c.species].name;
    body = `Nombre: ${t.c.info.name}<br>Especie: ${CREATURES[t.c.species].name}<br>Comportamiento: ${t.c.info.behav}<br>Estado: ${t.c.fleeT > 0 ? 'Huyendo' : 'Tranquilo'}`;
    action = 'ESPECIMEN REGISTRADO';
  } else if (t && t.kind === 'ship') {
    title = 'TU NAVE';
    body = 'Explorador personal · Sistemas operativos';
    action = '[R] DESPEGAR';
  } else {
    const name = genPlanetName(makeRng('flora:' + Math.floor(hit.point.x) + ':' + Math.floor(hit.point.z)));
    title = 'ESPECIMEN: ' + name.toUpperCase();
    body = 'Flora / formación natural<br>Bioma: ' + BIOMES[G.planet.biome].label;
    action = 'REGISTRO COMPLETADO';
  }
  ui.scanCard(title, body, action);
  G.scanCardT = 3.5;
}

function updateResNode(ch, i) {
  const r = ch.resData[i];
  const f = Math.max(0.001, r.amount / r.init) * r.s;
  _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r.rot);
  _p.set(r.x, r.h - 0.1, r.z);
  _s.setScalar(f);
  _m4.compose(_p, _q, _s);
  ch.resMesh.setMatrixAt(i, _m4);
  // halo: larger, slightly above
  _p.y = r.h + 0.5;
  _s.setScalar(f * 1.9);
  _m4.compose(_p, _q, _s);
  ch.resHalo.setMatrixAt(i, _m4);
  ch.resMesh.instanceMatrix.needsUpdate = true;
  ch.resHalo.instanceMatrix.needsUpdate = true;
}

// ---------------- input ----------------
function handleKey(code) {
  if (G.mode === 'title') {
    if (code === 'Enter' || code === 'Space') {
      if (saveMod.hasSave()) continueGame(); else newGame();
    }
    return;
  }
  if (G.mode === 'transition') return;

  if (G.menuOpen) {
    if (code === 'Escape' || code === 'Tab' || code === 'KeyB' || code === 'KeyM' || code === 'KeyC') {
      closeMenu();
    }
    return;
  }

  if (G.mode === 'planet') {
    switch (code) {
      case 'Tab': case 'KeyC':
        ui.renderCraft(G.inv);
        openMenu('menu-craft');
        break;
      case 'KeyB':
        if (G.builder.active) {
          G.builder.deactivate();
          ui.setTool('MULTIHERRAMIENTA');
          ui.setBuildMode(false);
        } else {
          ui.renderBuild(G.inv);
          openMenu('menu-build');
        }
        break;
      case 'KeyM':
        ui.renderMap(G.system, null, G.planet?.seed);
        openMenu('menu-map');
        break;
      case 'KeyE':
        doScan();
        break;
      case 'KeyR':
        if (G.shipNear) beginTakeoff();
        break;
      case 'Escape':
        openMenu('menu-pause');
        break;
    }
  } else if (G.mode === 'space') {
    switch (code) {
      case 'KeyE':
        if (G.space.canLand && G.space.nearPlanet && G.space.substate === 'fly') {
          beginLandingTransition2();
        }
        break;
      case 'KeyJ':
        beginWarp();
        break;
      case 'KeyM':
        ui.renderMap(G.system, G.space.shipPos, null);
        openMenu('menu-map');
        break;
      case 'Escape':
        openMenu('menu-pause');
        break;
    }
  }
}

function beginLandingTransition2() {
  const planet = G.space.nearPlanet;
  G.space.beginLanding(planet);
}

function openMenu(id) {
  G.menuOpen = id;
  ui.openMenu(id);
  if (document.pointerLockElement) document.exitPointerLock();
  ui.closeAllMenus();
  ui.openMenu(id);
  audio.click();
}

function closeMenu() {
  G.menuOpen = null;
  ui.closeAllMenus();
  if (G.mode === 'planet' || G.mode === 'space') {
    requestLock();
  }
}

function requestLock() {
  try {
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => { /* retry on next canvas click */ });
  } catch {
    /* handled by pointerlockerror */
  }
}

let lockErrorShown = false;

window.addEventListener('keydown', e => {
  if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
  if (e.repeat) return;
  input.keys.add(e.code);
  if (e.code === 'Space' && G.mode === 'planet') input.jumpQueued = true;
  handleKey(e.code);
});
window.addEventListener('keyup', e => input.keys.delete(e.code));
window.addEventListener('blur', () => { input.keys.clear(); input.mouse.rdown = false; input.mouse.ldown = false; });

document.addEventListener('pointerlockchange', () => {
  input.locked = document.pointerLockElement === canvas;
  if (!input.locked && (G.mode === 'planet' || G.mode === 'space') && !G.menuOpen && G.mode !== 'transition') {
    openMenu('menu-pause');
  }
});
document.addEventListener('pointerlockerror', () => {
  input.dragLook = true;
  if (!lockErrorShown) {
    lockErrorShown = true;
    ui.toast('MODO RATÓN: arrastra para mirar');
  }
});

window.addEventListener('mousemove', e => {
  if (input.locked) {
    input.mouse.dx += e.movementX;
    input.mouse.dy += e.movementY;
  } else if (input.dragging) {
    input.mouse.dx += e.movementX;
    input.mouse.dy += e.movementY;
  }
});

canvas.addEventListener('mousedown', e => {
  if (G.mode === 'title' || G.mode === 'transition') return;
  if (G.menuOpen) return;
  if (!input.locked) {
    if (input.dragLook) {
      if (e.button === 0) input.dragging = true;
      else if (e.button === 2 && G.mode === 'planet' && !G.builder.active) input.mouse.rdown = true;
    } else {
      requestLock();
    }
    return;
  }
  if (G.mode === 'planet') {
    if (e.button === 0) {
      if (G.builder.active) {
        if (G.builder.place(G.inv)) {
          audio.click();
          ui.toast('MÓDULO INSTALADO');
          saveStructures();
          G.quickbarDirty = true;
        } else audio.error();
      }
    } else if (e.button === 2) {
      if (G.builder.active) {
        const gp = G.builder.groundPoint(camera);
        if (gp && G.builder.removeAt(gp, G.inv)) {
          audio.click();
          ui.toast('MÓDULO DESMONTADO · REEMBOLSO 50%');
          saveStructures();
          G.quickbarDirty = true;
        } else audio.error();
      } else {
        input.mouse.rdown = true;
      }
    }
  }
});
window.addEventListener('mouseup', e => {
  if (e.button === 2) { input.mouse.rdown = false; G.mineT = 0; ui.mineProgress(null); }
  if (e.button === 0) { input.mouse.ldown = false; input.dragging = false; }
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

// audio unlock on first gesture
const onFirstGesture = () => {
  audio.init();
  audio.resume();
  window.removeEventListener('pointerdown', onFirstGesture);
  window.removeEventListener('keydown', onFirstGesture);
};
window.addEventListener('pointerdown', onFirstGesture);
window.addEventListener('keydown', onFirstGesture);

// ---------------- UI callbacks ----------------
ui.initUI({
  click: () => audio.click(),
  newGame: () => newGame(),
  continueGame: () => continueGame(),
  resume: () => closeMenu(),
  saveNow: () => doSave(false),
  mute: () => {
    audio.init();
    audio.resume();
    const m = audio.toggleMute();
    ui.setMuteLabel(m);
  },
  quitToTitle: () => {
    doSave(true);
    closeAllForTitle();
  },
  closeMenu: () => closeMenu(),
  onCraft: (r) => {
    if (!G.inv.payCost(r.cost)) { audio.error(); return; }
    G.inv.items[r.id] = (G.inv.items[r.id] || 0) + 1;
    audio.craft();
    ui.toast('FABRICADO: ' + r.name);
    if (r.id === 'battery') {
      G.inv.batteryLevels = Math.min(3, G.inv.batteryLevels + 1);
      G.maxBattery = 100 * Math.pow(1.5, G.inv.batteryLevels);
      ui.toast('BATERÍA MÁXIMA: ' + G.maxBattery + ' u.');
    }
    if (r.id === 'suit2' && !G.inv.suit2) {
      G.inv.suit2 = true;
      G.player.setSuit(0x5a7ac8);
      G.player.speedMult = 1.1;
      ui.toast('TRAJE MK-II EQUIPADO · +10% VELOCIDAD');
    }
    ui.renderCraft(G.inv);
    G.quickbarDirty = true;
  },
  onBuildPick: (type) => {
    closeMenu();
    if (G.builder.select(type, G.inv)) {
      ui.setTool('CONSTRUYENDO: ' + BUILDABLES[type].name);
      ui.setBuildMode(true);
      audio.click();
    } else audio.error();
  },
  onMapGo: (planet) => {
    closeMenu();
    if (G.mode === 'space') {
      G.space.travelTo(planet);
      ui.toast('VIAYANDO A ÓRBITA DE ' + planet.name.toUpperCase());
    }
  },
});

function closeAllForTitle() {
  ui.closeAllMenus();
  G.menuOpen = null;
  G.mode = 'title';
  G.builder.deactivate();
  G.terrain?.dispose();
  G.terrain = null;
  G.fauna?.clear();
  parkedShip.visible = false;
  if (document.pointerLockElement) document.exitPointerLock();
  // fresh backdrop
  G.systemSeed = 'title:' + Math.random().toString(36).slice(2);
  G.system = generateSystem(G.systemSeed);
  G.space.loadSystem(G.system);
  ui.hideHUD();
  ui.showTitle(saveMod.hasSave());
}

// ---------------- per-frame updates ----------------
function updateTitle(dt) {
  const t = performance.now() / 1000;
  camera.position.set(Math.cos(t * 0.02) * 9000, 2600, Math.sin(t * 0.02) * 9000);
  camera.lookAt(0, 0, 0);
  G.space.time += dt;
  for (const p of G.system.planets) {
    p.mesh.rotation.y += p.spin * dt;
  }
}

function updateSpace(dt) {
  G.spaceTime += dt;
  G.space.update(dt, input);
  G.spaceTime = G.space.time;

  if (G.space.landingDone()) {
    beginLandingTransition(G.space.landPlanet);
    return;
  }
  if (G.space.warpDone()) {
    finishWarp();
    return;
  }

  // HUD
  G.hudT += dt;
  if (G.hudT > 0.15) {
    G.hudT = 0;
    ui.setBattery(G.battery / G.maxBattery);
    let prompt = null;
    if (G.space.substate === 'fly') {
      if (G.space.nearPlanet) {
        const p = G.space.nearPlanet;
        prompt = G.space.canLand
          ? `[E] ATERRRIZAR EN ${p.name.toUpperCase()}`
          : `REDUCE LA VELOCIDAD · ${p.name.toUpperCase()}`;
      } else {
        prompt = '[J] SALTAR A OTRA GALAXIA · [M] MAPA';
      }
    }
    ui.prompt(prompt);
  }
  ui.compass(90); // stable in space
}

function updatePlanet(dt) {
  G.dayTime += dt / GAME.DAY_SECONDS;
  const pl = G.player;
  const pos = pl.pos;

  // mouse look (pointer lock or drag fallback)
  if (input.mouse.dx !== 0 || input.mouse.dy !== 0) {
    pl.yaw -= input.mouse.dx * 0.0022;
    pl.pitch = Math.min(1.25, Math.max(0.04, pl.pitch + input.mouse.dy * 0.0022));
  }

  G.sky.update(G.dayTime, dt, pos);
  G.terrain.setCenter(pos.x, pos.z);
  G.terrain.update(9);
  G.terrain.updateWater(performance.now() / 1000, pos.x, pos.z);
  pl.update(dt, input, camera);
  G.fauna.update(dt, pos);
  if (G.builder.active) G.builder.update(camera, pos);
  G.particles.update(dt);

  // footsteps
  if (pl.onGround && pl.moving) {
    G.stepT += dt * pl.currentSpeed * 1.15;
    if (G.stepT > 1) {
      G.stepT = 0;
      G.stepAlt = !G.stepAlt;
      audio.footstep(G.stepAlt);
    }
  } else G.stepT = 0;

  // ship proximity
  if (parkedShip.visible) {
    const dx = pos.x - parkedShip.position.x;
    const dz = pos.z - parkedShip.position.z;
    G.shipNear = dx * dx + dz * dz < 14 * 14;
  } else G.shipNear = false;

  // target
  G.target = passiveTarget();

  // mining
  if (input.mouse.rdown && !G.builder.active && G.target && G.target.kind === 'resource') {
    if (G.battery <= 0) {
      G.mineT = 0;
    } else {
      G.battery = Math.max(0, G.battery - 3 * dt);
      G.mineT += dt;
      ui.mineProgress(G.mineT / 0.55);
      if (G.mineT >= 0.55) {
        G.mineT = 0;
        const t = G.target;
        const amt = Math.min(2 + Math.floor(Math.random() * 3), t.data.amount);
        t.data.amount -= amt;
        G.inv.addRes(t.data.type, amt);
        audio.mineHit();
        audio.pickup(amt);
        ui.toast(`+${amt} ${RESOURCES[t.data.type].name}`);
        G.particles.burst(t.point, RESOURCES[t.data.type].color, 16, 3.5);
        updateResNode(t.ch, t.i);
        G.quickbarDirty = true;
      }
      if (Math.random() < dt * 6) audio.mineTick();
    }
  } else {
    G.mineT = 0;
    ui.mineProgress(null);
  }

  // battery & oxygen
  const solars = G.builder.solarsNear(pos);
  G.battery = Math.min(G.maxBattery, G.battery + (0.4 + solars * 12) * dt);
  if (G.planet.toxic) {
    G.o2 -= dt * (100 / 150);
    if (G.o2 <= 0) {
      if ((G.inv.items.o2tank || 0) > 0) {
        G.inv.items.o2tank--;
        G.o2 = 100;
        ui.toast('TANQUE DE OXÍGENO CONSUMIDO');
        audio.pickup(1);
      } else {
        G.o2 = 100;
        ui.toast('O2 AGOTADO · TELETRANSPORTADO A TU NAVE');
        pl.spawn(parkedShip.position.x, G.world.height(parkedShip.position.x, parkedShip.position.z), parkedShip.position.z);
        audio.error();
      }
    }
  }

  // scan card timer
  if (G.scanCardT > 0) {
    G.scanCardT -= dt;
    if (G.scanCardT <= 0) ui.scanCard(null);
  }

  // HUD
  G.hudT += dt;
  if (G.hudT > 0.15) {
    G.hudT = 0;
    ui.setBattery(G.battery / G.maxBattery);
    if (G.planet.toxic) ui.setO2(true, G.o2 / 100);
    else ui.setO2(false, 1);
    const mins = Math.floor((G.dayTime % 1) * 1440);
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    ui.setTime(hh + ':' + mm);
    const fwdX = -Math.sin(pl.yaw), fwdZ = -Math.cos(pl.yaw);
    ui.compass(Math.atan2(fwdX, -fwdZ) * 180 / Math.PI);

    let prompt = null;
    if (G.builder.active) prompt = '[CLIC IZQ] COLOCAR · [CLIC DER] DESMONTAR · [B] SALIR';
    else if (G.shipNear) prompt = '[R] DESPEGAR';
    else if (G.target && G.target.kind === 'resource') prompt = `[E] ESCANEAR · NODO DE ${RESOURCES[G.target.data.type].name}`;
    else if (G.target && G.target.kind === 'ship') prompt = '[R] DESPEGAR';
    else if (G.target && G.target.kind === 'creature') prompt = `[E] ESCANEAR · ${G.target.c.info.name.toUpperCase()}`;
    ui.prompt(prompt);

    if (G.quickbarDirty) {
      G.quickbarDirty = false;
      ui.quickbar(G.inv.quickbar.map(id => ({ id, count: G.inv.res[id] || 0 })));
    }
  }

  // autosave
  G.autosaveT += dt;
  if (G.autosaveT > 25) {
    G.autosaveT = 0;
    doSave(true);
  }
}

function updateTransition(dt) {
  const tr = G.trans;
  tr.t += dt;
  if (tr.type === 'start') {
    G.space.update(dt, input);
    G.spaceTime = G.space.time;
    ui.setLoadProgress(Math.min(1, tr.t / 1.2));
    if (tr.t > 1.2) {
      G.mode = 'space';
      ui.hideLoading();
      ui.showHUD();
      ui.setTool('NAVE EXPLORADORA');
      ui.hudPlanet('SISTEMA ' + G.system.name.toUpperCase(), 'NAVEGACIÓN ESTELAR');
      ui.toast('BIENVENIDO AL SISTEMA ' + G.system.name.toUpperCase());
      audio.setAmbient('space');
      audio.setMusic('space');
      requestLock();
    }
  } else if (tr.type === 'land') {
    // generate terrain while the loading screen is up
    G.terrain.setCenter(G.player.pos.x, G.player.pos.z);
    G.terrain.update(14);
    ui.setLoadProgress(Math.min(0.98, tr.t / 0.6 + (1 - G.terrain.pending.length / 81) * 0.4));
    if (tr.t > 0.7 && G.terrain.pending.length < 12) {
      G.mode = 'planet';
      ui.hideLoading();
      ui.showHUD();
      ui.warpFlash();
      requestLock();
    }
  } else if (tr.type === 'takeoff') {
    if (tr.t > 0.85) {
      finishTakeoff();
      requestLock();
    }
  }
}

// ---------------- main loop ----------------
let lastT = performance.now();
renderer.setAnimationLoop((t) => {
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;

  if (G.menuOpen) {
    // paused behind a menu — keep rendering the current scene
    if (G.mode === 'planet') renderer.render(scenePlanet, camera);
    else if (G.mode === 'space') renderer.render(sceneSpace, camera);
    input.mouse.dx = 0;
    input.mouse.dy = 0;
    return;
  }

  if (G.mode === 'title') {
    updateTitle(dt);
    renderer.render(sceneSpace, camera);
  } else if (G.mode === 'space') {
    updateSpace(dt);
    renderer.render(sceneSpace, camera);
  } else if (G.mode === 'planet') {
    updatePlanet(dt);
    renderer.render(scenePlanet, camera);
  } else if (G.mode === 'transition') {
    updateTransition(dt);
    if (G.trans.type === 'takeoff') renderer.render(scenePlanet, camera);
    else renderer.render(sceneSpace, camera);
  }

  input.mouse.dx = 0;
  input.mouse.dy = 0;
});

window.addEventListener('error', (e) => {
  ui.fatal(e.message || 'Error desconocido');
});

ui.showTitle(saveMod.hasSave());
ui.setMuteLabel(audio.muted);
