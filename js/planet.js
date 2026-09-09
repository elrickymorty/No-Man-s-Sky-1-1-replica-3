// ============ Procedural planets & star systems ============
import * as THREE from 'three';
import { makeRng, pick, pickWeighted, hash2 } from './rng.js';
import { Simplex, smoothstep } from './noise.js';
import { BIOMES, BIOME_WEIGHTS, SYL_A, SYL_M, SYL_B, SYSTEM_NAMES, STAR_COLORS, GAME } from './config.js';

const _white = new THREE.Color(0xf0f4f8);

export function genPlanetName(rng) {
  // "Mel" + "th" + "a" + "is" → "Melthais"
  let name = pick(rng, SYL_A);
  const mids = rng() < 0.55 ? 2 : 1;
  for (let i = 0; i < mids; i++) name += pick(rng, SYL_M);
  name += pick(rng, SYL_B);
  return name;
}

// ---------------- PLANET PARAMETERS (deterministic from seed) ----------------
export function generatePlanet(seed, indexInSystem) {
  const rng = makeRng('planet:' + seed);
  const biome = pickWeighted(rng, BIOME_WEIGHTS);
  const B = BIOMES[biome];
  return {
    seed,
    index: indexInSystem,
    name: genPlanetName(rng),
    biome,
    toxic: rng() < B.toxicChance,
    // terrain shape params
    base: B.base * (0.85 + rng() * 0.4),
    mountain: B.mountain * (0.7 + rng() * 0.7),
    f1: 0.0009 + rng() * 0.0007,
    f2: 0.004 + rng() * 0.003,
    f3: 0.0018 + rng() * 0.0014,
    detailAmp: 0.25 + rng() * 0.4,
    // space appearance
    spaceColors: B.spaceColors,
    seaThresh: 0.44 + rng() * 0.1,
    iceCaps: (biome === 'frost' || biome === 'tundra' || biome === 'rocky' || (biome === 'prairie' && rng() < 0.5)),
    // filled by system generation:
    orbit: 0, angle: 0, radius: 300, spin: 0, orbSpeed: 0, incl: 0,
    hasMoon: false, moon: null,
    textured: false,
  };
}

// ---------------- WORLD (terrain heightfield + colors + decorations) ----------------
export function createWorld(p) {
  const n1 = new Simplex(p.seed + ':n1');
  const n2 = new Simplex(p.seed + ':n2');
  const n3 = new Simplex(p.seed + ':n3');
  const n4 = new Simplex(p.seed + ':n4');
  const n5 = new Simplex(p.seed + ':n5');
  const B = BIOMES[p.biome];

  function height(x, z) {
    const cont = n1.fbm3(x * p.f1, 0, z * p.f1, 3);
    const hill = n2.fbm3(x * p.f2, 0, z * p.f2, 3);
    const mask = smoothstep(0.05, 0.65, n3.fbm3(x * 0.0007, 0, z * 0.0007, 2));
    const ridge = n5.ridge3(x * p.f3, 0, z * p.f3, 3);
    let h = p.base + cont * 10 + hill * 3.2;
    h += mask * p.mountain * 32 * Math.pow(ridge, 1.6);
    h += n4.noise3(x * 0.02, 0, z * 0.02) * p.detailAmp;
    if (h < 1.2) h = 1.2 - (1.2 - h) * 0.5; // compress seabed
    return h;
  }

  const _c1 = new THREE.Color(B.ground1);
  const _c2 = new THREE.Color(B.ground2);
  const _rock = new THREE.Color(B.rock);
  const _snow = new THREE.Color(0xf0f4f8);
  const _sand = new THREE.Color(0xcbb27a);
  const _deep = new THREE.Color(0x46403a);
  const _ember = new THREE.Color(0xff5a2a);
  const out = new THREE.Color();

  function colorAt(x, z, h, slope, target) {
    const t = target || out;
    if (h < 1.6) {
      const d = Math.min(1, (1.6 - h) / 12);
      t.copy(_sand).lerp(_deep, d);
      const n = (hash2(Math.floor(x * 3), Math.floor(z * 3)) - 0.5) * 0.05;
      t.offsetHSL(0, 0, n);
      return t;
    }
    const g = smoothstep(1.6, 26, h);
    t.copy(_c1).lerp(_c2, g);
    if (slope > 0.85) t.lerp(_rock, Math.min(1, (slope - 0.85) * 2.2));
    if (B.snow && h > B.snowLine) t.lerp(_snow, smoothstep(B.snowLine, B.snowLine + 6, h));
    if (p.biome === 'volcanic' && slope < 0.7 && h < 14 && hash2(Math.floor(x), Math.floor(z)) > 0.865) {
      t.lerp(_ember, 0.8);
    }
    const dith = (hash2(Math.floor(x * 2), Math.floor(z * 2)) - 0.5) * 0.045;
    t.offsetHSL((p.biome === 'crystalline' ? (hash2(Math.floor(x / 8), Math.floor(z / 8)) - 0.5) * 0.05 : 0), dith * 0.5, dith);
    return t;
  }

  function findSpawn() {
    for (let r = 0; r < 2400; r += 16) {
      const steps = Math.max(8, Math.floor(r / 3));
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const h = height(x, z);
        if (h > 2.6 && h < 20) {
          const e = 1.5;
          const dx = height(x + e, z) - height(x - e, z);
          const dz = height(x, z + e) - height(x, z - e);
          if (Math.hypot(dx, dz) / (2 * e) < 0.4) return { x, y: h, z };
        }
      }
    }
    return { x: 0, y: height(0, 0), z: 0 };
  }

  return { p, B, height, colorAt, findSpawn, slopeAt: makeSlope() };

  function makeSlope() {
    return function (x, z) {
      const e = 1.2;
      const dx = height(x + e, z) - height(x - e, z);
      const dz = height(x, z + e) - height(x, z - e);
      return Math.hypot(dx, dz) / (2 * e);
    };
  }
}

// ---------------- CHUNK DECORATIONS (deterministic per chunk) ----------------
export function chunkDecor(world, cx, cz) {
  const p = world.p;
  const B = world.B;
  const out = { trees: [], bushes: [], rocks: [], crystals: [], resources: [] };
  const x0 = cx * GAME.CHUNK, z0 = cz * GAME.CHUNK;
  const tD = B.treeDensity, bD = B.treeDensity + B.bushDensity, rD = bD + B.rockDensity, cD = rD + B.crystalDensity;

  for (let ix = 0; ix < 16; ix++) for (let iz = 0; iz < 16; iz++) {
    const jx = hash2(cx * 16 + ix, cz * 16 + iz);
    const jz = hash2(cz * 16 + iz + 71, cx * 16 + ix + 13);
    const x = x0 + (ix + 0.15 + jx * 0.7) * 16;
    const z = z0 + (iz + 0.15 + jz * 0.7) * 16;
    const h = world.height(x, z);
    if (h < 1.9) continue;
    const r = hash2(cx * 271 + ix * 17, cz * 337 + iz * 23);
    const rng = makeRng('d:' + p.seed + ':' + cx + ':' + cz + ':' + ix + ':' + iz);

    if (r < tD) {
      const types = B.treeTypes.length ? B.treeTypes : ['tree_cone'];
      out.trees.push({ x, z, h, type: types[Math.floor(rng() * types.length)], s: 0.75 + rng() * 0.7, rot: rng() * 6.283, tint: 0.8 + rng() * 0.5 });
    } else if (r < bD) {
      out.bushes.push({ x, z, h, s: 0.5 + rng() * 0.9, rot: rng() * 6.283, tint: 0.7 + rng() * 0.6 });
    } else if (r < rD) {
      out.rocks.push({ x, z, h, s: 0.6 + rng() * 2.4, rot: rng() * 6.283, sq: 0.55 + rng() * 0.75 });
    } else if (r < cD) {
      out.crystals.push({ x, z, h, s: 0.8 + rng() * 2.4, rot: rng() * 6.283 });
    }

    // resources — independent roll, ~1 per 50 cells on average
    const rr = hash2(cx * 917 + ix * 31, cz * 613 + iz * 47);
    if (rr < 0.02) {
      let resId = pickWeighted(rng, B.resources);
      if (resId === 'water' && h > 5) resId = 'iron';
      out.resources.push({ x, z, h, type: resId, amount: 6 + Math.floor(rng() * 10), rot: rng() * 6.283, s: 0.8 + rng() * 0.6 });
    }
  }

  // guarantee at least 3 resource nodes per chunk
  if (out.resources.length < 3) {
    const rng = makeRng('resmin:' + p.seed + ':' + cx + ':' + cz);
    let guard = 0;
    while (out.resources.length < 3 && guard++ < 24) {
      const x = x0 + rng() * 256, z = z0 + rng() * 256;
      const h = world.height(x, z);
      if (h < 1.6) continue;
      out.resources.push({ x, z, h, type: pickWeighted(rng, B.resources), amount: 6 + Math.floor(rng() * 10), rot: rng() * 6.283, s: 0.8 + rng() * 0.6 });
    }
  }
  return out;
}

// ---------------- STAR SYSTEMS ----------------
export function generateSystem(seed) {
  const rng = makeRng('system:' + seed);
  const name = pick(rng, SYSTEM_NAMES);
  const star = { color: pick(rng, STAR_COLORS), radius: 260 + rng() * 240 };
  const nPlanets = 7 + Math.floor(rng() * 6);
  const planets = [];
  let orbit = 3200;
  for (let i = 0; i < nPlanets; i++) {
    orbit = Math.min(46000, orbit * (1.34 + rng() * 0.24));
    const p = generatePlanet(`${seed}::p${i}`, i);
    p.orbit = orbit;
    p.angle = rng() * Math.PI * 2;
    p.orbSpeed = 0.00012 + rng() * 0.0002;
    p.incl = (rng() - 0.5) * 0.05;
    p.radius = 220 + Math.pow(rng(), 1.5) * 720;
    p.spin = (0.5 + rng()) * 0.02 * (rng() < 0.5 ? -1 : 1);
    p.hasMoon = rng() < 0.3;
    if (p.hasMoon) {
      p.moon = { radius: 40 + rng() * 70, dist: p.radius * 3.4, angle: rng() * 6.283, speed: 0.12 + rng() * 0.2 };
    }
    planets.push(p);
  }
  return { seed, name, star, planets };
}

// Position of a planet around its star at world time t
export function planetCenter(p, t) {
  const a = p.angle + p.orbSpeed * t;
  return {
    x: Math.cos(a) * p.orbit,
    y: Math.sin(a * 0.9 + p.seed.length) * p.orbit * p.incl,
    z: Math.sin(a) * p.orbit,
  };
}

// ---------------- PLANET SURFACE TEXTURE (for space view) ----------------
const _tc = new THREE.Color(), _tw = new THREE.Color();
export function makePlanetTexture(p) {
  const rng = makeRng('tex:' + p.seed);
  const n = new Simplex(p.seed + ':tex');
  const cols = p.spaceColors.map(c => new THREE.Color(c));
  const water = new THREE.Color(BIOMES[p.biome].waterTint);
  const W = 128, H = 64;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    const lat = (y / H) * Math.PI;
    const sinL = Math.sin(lat), cosL = Math.cos(lat);
    for (let x = 0; x < W; x++) {
      const lon = (x / W) * Math.PI * 2;
      const nx = sinL * Math.cos(lon), ny = cosL, nz = sinL * Math.sin(lon);
      const v = n.fbm3(nx * 2.3 + 5.2, ny * 2.3, nz * 2.3, 4) * 0.5 + 0.5;
      const coast = n.fbm3(nx * 9 + 1.3, ny * 9, nz * 9, 2) * 0.07;
      const t = v + coast;
      if (t < p.seaThresh) {
        const dd = Math.min(1, (p.seaThresh - t) / 0.25);
        _tc.copy(water).multiplyScalar(1.15 - dd * 0.45);
      } else {
        const tt = Math.min(1, (t - p.seaThresh) / (1 - p.seaThresh));
        if (tt < 0.5) _tc.copy(cols[0]).lerp(cols[1], tt * 2);
        else _tc.copy(cols[1]).lerp(cols[2] || cols[1], (tt - 0.5) * 2);
      }
      if (p.iceCaps) {
        const cap = smoothstep(0.8, 0.93, Math.abs(ny) + n.noise3(nx * 14, ny * 14, nz * 14) * 0.08);
        if (cap > 0) _tc.lerp(_white, cap * 0.92);
      }
      const i = (y * W + x) * 4;
      d[i] = _tc.r * 255; d[i + 1] = _tc.g * 255; d[i + 2] = _tc.b * 255; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
