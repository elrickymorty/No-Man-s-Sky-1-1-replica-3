// ============ Chunked streaming terrain + decorations + water ============
import * as THREE from 'three';
import { GAME, RESOURCES } from './config.js';
import { chunkDecor } from './planet.js';
import { getDecorGeo, getTrunkGeo } from './decor.js';

const SEG = GAME.CHUNK_SEG;
const N = SEG + 1;
const QUAD = GAME.CHUNK / SEG;
const SLOPE_GRID = 12;

function buildIndices() {
  const idx = new Uint32Array(SEG * SEG * 6);
  let o = 0;
  for (let iz = 0; iz < SEG; iz++) {
    for (let ix = 0; ix < SEG; ix++) {
      const a = iz * N + ix;
      const b = a + 1;
      const c = a + N;
      const d = c + 1;
      idx[o++] = a; idx[o++] = c; idx[o++] = b;
      idx[o++] = b; idx[o++] = c; idx[o++] = d;
    }
  }
  return idx;
}

function newChunk(cx, cz) {
  return {
    cx, cz,
    state: 'gen',
    row: 0,
    heights: new Float32Array(N * N),
    mesh: null,
    group: null,
    resMesh: null,
    resHalo: null,
    resData: [],
    decData: null,
  };
}

export class Terrain {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.chunks = new Map();
    this.pending = [];
    this.center = { cx: 1e9, cz: 1e9 };
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.indexArr = buildIndices();

    this.foliageMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a4128 });
    this.rockMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.crystalMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x5a2a9a, emissiveIntensity: 0.4 });
    this.resMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.haloMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.22,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });

    // water
    const size = 2400;
    const wg = new THREE.PlaneGeometry(size, size, 56, 56);
    wg.rotateX(-Math.PI / 2);
    this.waterMat = new THREE.MeshPhongMaterial({
      color: world.B.waterTint, transparent: true, opacity: 0.78,
      shininess: 120, specular: 0x99bbcc,
    });
    this.waterMesh = new THREE.Mesh(wg, this.waterMat);
    this.waterMesh.receiveShadow = true;
    this.waterBase = wg.attributes.position.array.slice();
    scene.add(this.waterMesh);
    this.resMeshChunk = new Map();

    this._m4 = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._s = new THREE.Vector3();
    this._p = new THREE.Vector3();
    this._c = new THREE.Color();
  }

  setCenter(px, pz) {
    const cx = Math.floor(px / GAME.CHUNK), cz = Math.floor(pz / GAME.CHUNK);
    if (cx === this.center.cx && cz === this.center.cz) return;
    this.center = { cx, cz };
    const R = GAME.RADIUS;
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        const key = (cx + dx) + ',' + (cz + dz);
        if (!this.chunks.has(key)) {
          const ch = newChunk(cx + dx, cz + dz);
          this.chunks.set(key, ch);
          this.pending.push(key);
        }
      }
    }
    for (const [key, ch] of this.chunks) {
      const parts = key.split(',');
      const d = Math.max(Math.abs(ch.cx - cx), Math.abs(ch.cz - cz));
      if (d > R + 1) {
        this.disposeChunk(ch);
        this.chunks.delete(key);
        const pi = this.pending.indexOf(key);
        if (pi >= 0) this.pending.splice(pi, 1);
      }
    }
    this.pending.sort((a, b) => {
      const ca = this.chunks.get(a), cb = this.chunks.get(b);
      const da = Math.max(Math.abs(ca.cx - cx), Math.abs(ca.cz - cz));
      const db = Math.max(Math.abs(cb.cx - cx), Math.abs(cb.cz - cz));
      return da - db;
    });
  }

  pendingCount() {
    return this.pending.length;
  }

  update(budgetMs = 9) {
    const t0 = performance.now();
    while (this.pending.length) {
      if (performance.now() - t0 > budgetMs) break;
      const ch = this.chunks.get(this.pending[0]);
      if (!ch) { this.pending.shift(); continue; }
      if (!this.stepChunk(ch)) continue; // not done yet
      this.pending.shift();
    }
  }

  // advance one row of heights; returns true when the chunk is complete
  stepChunk(ch) {
    if (ch.state === 'ready') return true;
    const i = ch.row;
    const z0 = ch.cz * GAME.CHUNK, x0 = ch.cx * GAME.CHUNK;
    const w = this.world;
    const h = ch.heights;
    for (let j = 0; j < N; j++) {
      h[i * N + j] = w.height(x0 + j * QUAD, z0 + i * QUAD);
    }
    ch.row++;
    if (ch.row < N) return false;
    this.finishChunk(ch);
    return true;
  }

  finishChunk(ch) {
    const w = this.world;
    const x0 = ch.cx * GAME.CHUNK, z0 = ch.cz * GAME.CHUNK;
    const pos = new Float32Array(N * N * 3);
    const col = new Float32Array(N * N * 3);
    const hs = ch.heights;

    // slope grid from height grid
    const SG = SLOPE_GRID;
    const slope = new Float32Array((SG + 1) * (SG + 1));
    for (let iz = 0; iz <= SG; iz++) {
      for (let ix = 0; ix <= SG; ix++) {
        const im = Math.max(0, ix - 1), ip = Math.min(N - 1, ix + 1);
        const jm = Math.max(0, iz - 1), jp = Math.min(N - 1, iz + 1);
        const dx = (hs[iz * N + ip] - hs[iz * N + im]) / ((ip - im) * QUAD);
        const dz = (hs[jp * N + ix] - hs[jm * N + ix]) / ((jp - jm) * QUAD);
        slope[iz * (SG + 1) + ix] = Math.hypot(dx, dz);
      }
    }

    const cTmp = this._c;
    for (let iz = 0; iz < N; iz++) {
      for (let ix = 0; ix < N; ix++) {
        const idx = iz * N + ix;
        const x = x0 + ix * QUAD, z = z0 + iz * QUAD;
        const h = hs[idx];
        pos[idx * 3] = x;
        pos[idx * 3 + 1] = h;
        pos[idx * 3 + 2] = z;
        const fx = (ix / SEG) * SG, fz = (iz / SEG) * SG;
        const ix0 = Math.min(SG - 1, fx | 0), iz0 = Math.min(SG - 1, fz | 0);
        const tx = fx - ix0, tz = fz - iz0;
        const s00 = slope[iz0 * (SG + 1) + ix0];
        const s10 = slope[iz0 * (SG + 1) + ix0 + 1];
        const s01 = slope[(iz0 + 1) * (SG + 1) + ix0];
        const s11 = slope[(iz0 + 1) * (SG + 1) + ix0 + 1];
        const sl = (s00 * (1 - tx) + s10 * tx) * (1 - tz) + (s01 * (1 - tx) + s11 * tx) * tz;
        w.colorAt(x, z, h, sl, cTmp);
        col[idx * 3] = cTmp.r;
        col[idx * 3 + 1] = cTmp.g;
        col[idx * 3 + 2] = cTmp.b;
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(this.indexArr.slice(), 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, this.mat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.scene.add(mesh);
    ch.mesh = mesh;

    ch.decData = chunkDecor(w, ch.cx, ch.cz);
    ch.group = this.buildDecor(ch);
    this.buildResNodes(ch);
    ch.state = 'ready';
  }

  buildDecor(ch) {
    const dec = ch.decData;
    const group = new THREE.Group();
    const B = this.world.B;
    const { _m4: m4, _q: q, _e: e, _s: s, _p: p, _c: c } = this;

    const fill = (arr, kind, mat, colorFn, halo = false) => {
      if (!arr.length) return;
      const geo = getDecorGeo(kind);
      const im = new THREE.InstancedMesh(geo, mat, arr.length);
      arr.forEach((t, i) => {
        e.set(0, t.rot || 0, 0);
        q.setFromEuler(e);
        p.set(t.x, t.h - 0.15, t.z);
        s.set(t.s ?? 1, (t.s ?? 1) * (t.sq ?? 1), t.s ?? 1);
        m4.compose(p, q, s);
        im.setMatrixAt(i, m4);
        if (colorFn) {
          colorFn(c, t);
          im.setColorAt(i, c);
        }
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = true;
      im.frustumCulled = false;
      group.add(im);
      if (halo) {
        const h2 = new THREE.InstancedMesh(geo, this.haloMat, arr.length);
        arr.forEach((t, i) => {
          e.set(0, t.rot || 0, 0);
          q.setFromEuler(e);
          p.set(t.x, t.h + 0.5, t.z);
          s.setScalar((t.s ?? 1) * 1.9);
          m4.compose(p, q, s);
          h2.setMatrixAt(i, m4);
          if (colorFn) { colorFn(c, t); h2.setColorAt(i, c); }
        });
        h2.instanceMatrix.needsUpdate = true;
        if (h2.instanceColor) h2.instanceColor.needsUpdate = true;
        h2.frustumCulled = false;
        group.add(h2);
      }
    };

    // trees grouped by type
    const byType = {};
    for (const t of dec.trees) (byType[t.type] ||= []).push(t);
    for (const type of Object.keys(byType)) {
      const arr = byType[type];
      fill(arr, type, this.foliageMat, (c, t) => {
        if (type === 'tree_dead') c.set(0x4a3a30);
        else c.set(B.foliage).multiplyScalar(t.tint);
        if (type === 'cactus') c.set(0x4a7a4a).multiplyScalar(t.tint);
      });
      // separate brown trunk where available
      const trunkGeo = getTrunkGeo(type);
      if (trunkGeo) {
        const im = new THREE.InstancedMesh(trunkGeo, this.trunkMat, arr.length);
        arr.forEach((t, i) => {
          e.set(0, t.rot || 0, 0);
          q.setFromEuler(e);
          p.set(t.x, t.h - 0.15, t.z);
          s.set(t.s ?? 1, (t.s ?? 1) * (t.sq ?? 1), t.s ?? 1);
          m4.compose(p, q, s);
          im.setMatrixAt(i, m4);
        });
        im.instanceMatrix.needsUpdate = true;
        im.castShadow = true;
        im.frustumCulled = false;
        group.add(im);
      }
    }
    // bushes
    fill(dec.bushes, 'bush', this.foliageMat, (c, t) => c.set(B.foliage).multiplyScalar(0.8 * t.tint));
    // rocks
    fill(dec.rocks, 'rock', this.rockMat, (c, t) => c.set(B.rock).multiplyScalar(0.75 + (t.sq - 0.55)), false);
    // biome crystals
    const crystalColor = B.crystalDensity >= 0.02 ? 0xe07aff : (B.biomeCryst || 0x8a5ae0);
    fill(dec.crystals, 'crystal', this.crystalMat, () => c.set(crystalColor), true);

    this.scene.add(group);
    return group;
  }

  buildResNodes(ch) {
    const rs = ch.decData.resources;
    ch.resData = rs;
    for (const r of rs) r.init = r.amount;
    if (!rs.length) return;
    const geo = getDecorGeo('res_node');
    const im = new THREE.InstancedMesh(geo, this.resMat, rs.length);
    const halo = new THREE.InstancedMesh(geo, this.haloMat, rs.length);
    const { _m4: m4, _q: q, _e: e, _s: s, _p: p, _c: c } = this;
    rs.forEach((r, i) => {
      e.set(0, r.rot, 0);
      q.setFromEuler(e);
      p.set(r.x, r.h - 0.1, r.z);
      s.setScalar(r.s);
      m4.compose(p, q, s);
      im.setMatrixAt(i, m4);
      p.y = r.h + 0.6;
      s.setScalar(r.s * 1.9);
      m4.compose(p, q, s);
      halo.setMatrixAt(i, m4);
      c.set(RESOURCES[r.type].color);
      im.setColorAt(i, c);
      halo.setColorAt(i, c);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    halo.instanceMatrix.needsUpdate = true;
    if (halo.instanceColor) halo.instanceColor.needsUpdate = true;
    im.castShadow = true;
    im.frustumCulled = false;
    halo.frustumCulled = false;
    this.scene.add(im, halo);
    ch.resMesh = im;
    ch.resHalo = halo;
    this.resMeshChunk.set(im, ch);
  }

  resourceMeshes() {
    const out = [];
    for (const ch of this.chunks.values()) if (ch.resMesh) out.push(ch.resMesh);
    return out;
  }

  updateWater(t, px, pz) {
    const m = this.waterMesh;
    m.position.x = Math.round(px / 8) * 8;
    m.position.z = Math.round(pz / 8) * 8;
    const pos = m.geometry.attributes.position;
    const base = this.waterBase;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      pos.setY(i,
        0.16 * Math.sin(x * 0.045 + t * 0.9) +
        0.16 * Math.cos(z * 0.05 + t * 0.62) +
        0.06 * Math.sin((x + z) * 0.11 + t * 1.7));
    }
    pos.needsUpdate = true;
    m.geometry.computeVertexNormals();
  }

  disposeChunk(ch) {
    if (ch.mesh) {
      this.scene.remove(ch.mesh);
      ch.mesh.geometry.dispose();
    }
    if (ch.group) {
      ch.group.traverse(o => {
        if (o.isInstancedMesh) o.dispose();
      });
      this.scene.remove(ch.group);
    }
    if (ch.resMesh) {
      ch.resMesh.dispose();
      ch.resHalo.dispose();
      this.scene.remove(ch.resMesh, ch.resHalo);
      this.resMeshChunk.delete(ch.resMesh);
    }
  }

  dispose() {
    for (const ch of this.chunks.values()) this.disposeChunk(ch);
    this.chunks.clear();
    this.pending = [];
    this.scene.remove(this.waterMesh);
    this.waterMesh.geometry.dispose();
  }
}
