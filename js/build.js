// ============ Base building: ghost preview, grid placement, structures ============
import * as THREE from 'three';
import { BUILDABLES, RECIPES } from './config.js';

export function buildStructureModel(type) {
  const g = new THREE.Group();
  const panel = new THREE.MeshLambertMaterial({ color: 0xc8ccd2 });
  const frame = new THREE.MeshLambertMaterial({ color: 0x5a646e });
  const accent = new THREE.MeshLambertMaterial({ color: 0x7de8ff, emissive: 0x2a6a80, emissiveIntensity: 0.9 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x8a9098 });

  switch (type) {
    case 'floor': {
      const m = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 4), panel);
      m.position.y = 0.25;
      const edge = new THREE.Mesh(new THREE.BoxGeometry(4.15, 0.12, 4.15), frame);
      edge.position.y = 0.06;
      g.add(m, edge);
      break;
    }
    case 'wall': {
      const m = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 0.5), panel);
      m.position.y = 2;
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(4.15, 0.3, 0.62), frame);
      p1.position.y = 3.85;
      const p2 = p1.clone();
      p2.position.y = 0.15;
      g.add(m, p1, p2);
      break;
    }
    case 'roof': {
      const m = new THREE.Mesh(new THREE.BoxGeometry(4, 0.45, 4), dark);
      m.position.y = 0.22;
      const edge = new THREE.Mesh(new THREE.BoxGeometry(4.15, 0.14, 4.15), frame);
      edge.position.y = 0.48;
      g.add(m, edge);
      break;
    }
    case 'door': {
      const m = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.5), panel);
      m.position.y = 2;
      const d = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.4, 0.14), dark);
      d.position.set(0, 1.9, 0.22);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.4, 0.06), accent);
      strip.position.set(0.9, 1.9, 0.3);
      g.add(m, d, strip);
      break;
    }
    case 'bunker': {
      const m = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 4), panel);
      m.position.y = 2.5;
      const d = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.3), dark);
      d.position.set(0, 1.9, 1.98);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 0.1), accent);
      strip.position.set(0.95, 1.9, 2.08);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.4, 4.3), frame);
      cap.position.y = 5.15;
      g.add(m, d, strip, cap);
      break;
    }
    case 'beacon': {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 6, 8), frame);
      pole.position.y = 3;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.1, 8, 20), accent);
      ring.position.y = 5.6;
      ring.rotation.x = Math.PI / 2;
      const light = new THREE.PointLight(0x7de8ff, 2.5, 26, 0);
      light.position.y = 5.6;
      g.add(pole, ring, light);
      break;
    }
    case 'solar': {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.26, 1.2, 8), frame);
      base.position.y = 0.6;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), frame);
      arm.position.y = 1.4;
      const pMat = new THREE.MeshLambertMaterial({ color: 0x1a3a6a, emissive: 0x0a1e3a, emissiveIntensity: 0.6 });
      const p = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 2.2), pMat);
      p.position.y = 1.95;
      p.rotation.x = -0.5;
      const edge = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.06, 2.35), frame);
      edge.position.set(0, 1.95, 0);
      edge.rotation.x = -0.5;
      g.add(base, arm, p, edge);
      break;
    }
    case 'table': {
      const top = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 1.2), dark);
      top.position.y = 1.1;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 1.1, 8), frame);
      leg.position.y = 0.55;
      g.add(top, leg);
      break;
    }
    case 'chair': {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.9), dark);
      seat.position.y = 0.7;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.1), dark);
      back.position.set(0, 1.2, 0.4);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.7, 8), frame);
      leg.position.y = 0.35;
      g.add(seat, back, leg);
      break;
    }
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.type = type;
  return g;
}

export class Builder {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.active = false;
    this.type = 'floor';
    this.ghost = null;
    this.ghostValid = false;
    this.ghostPos = new THREE.Vector3();
    this.structures = []; // {type, x, y, z, group}
    this._ray = new THREE.Vector3();
    this._m4 = new THREE.Matrix4();
  }

  recipeFor(type) {
    return RECIPES.find(r => r.id === type);
  }

  select(type, inv) {
    const r = this.recipeFor(type);
    if (!r || !inv.hasCost(r.cost)) return false;
    this.type = type;
    this.active = true;
    this.buildGhost();
    return true;
  }

  buildGhost() {
    this.clearGhost();
    this.ghost = buildStructureModel(this.type);
    this.ghost.traverse(o => {
      if (o.isMesh) {
        o.material = new THREE.MeshLambertMaterial({
          color: 0x4aff9a, transparent: true, opacity: 0.45,
          emissive: 0x1a6a3a, emissiveIntensity: 0.6, depthWrite: false,
        });
      }
    });
    this.scene.add(this.ghost);
  }

  clearGhost() {
    if (this.ghost) {
      this.scene.remove(this.ghost);
      this.ghost.traverse(o => { if (o.isMesh && o.material.dispose) o.material.dispose(); });
      this.ghost = null;
    }
  }

  deactivate() {
    this.active = false;
    this.clearGhost();
  }

  // raycast from camera to terrain (analytic heightfield march)
  groundPoint(camera, maxDist = 90) {
    const o = camera.position;
    camera.getWorldDirection(this._ray);
    let a = 0.5, b = maxDist;
    const at = (t) => ({ x: o.x + this._ray.x * t, y: o.y + this._ray.y * t, z: o.z + this._ray.z * t });
    if (at(maxDist).y > this.world.height(at(maxDist).x, at(maxDist).z)) return null;
    for (let i = 0; i < 40; i++) {
      const m = (a + b) / 2;
      const p = at(m);
      if (p.y <= this.world.height(p.x, p.z)) b = m;
      else a = m;
    }
    const p = at(b);
    return new THREE.Vector3(p.x, this.world.height(p.x, p.z), p.z);
  }

  canPlaceAt(x, z, y) {
    const size = BUILDABLES[this.type].size;
    for (const s of this.structures) {
      const ss = BUILDABLES[s.type].size;
      if (Math.abs(s.x - x) < (ss[0] + size[0]) / 2 - 0.15 &&
          Math.abs(s.z - z) < (ss[2] + size[2]) / 2 - 0.15 &&
          y < s.y + ss[1] + 0.3 && s.y < y + size[1] + 0.3) {
        return false;
      }
    }
    return true;
  }

  update(camera, playerPos) {
    if (!this.active || !this.ghost) return;
    const gp = this.groundPoint(camera);
    if (!gp || gp.distanceTo(playerPos) > 80) {
      this.ghost.visible = false;
      this.ghostValid = false;
      return;
    }
    this.ghost.visible = true;
    const sx = Math.round(gp.x / 2) * 2;
    const sz = Math.round(gp.z / 2) * 2;
    const sy = this.world.height(sx, sz);
    this.ghostPos.set(sx, sy, sz);
    this.ghost.position.set(sx, sy, sz);
    const valid = this.canPlaceAt(sx, sz, sy);
    this.ghostValid = valid;
    this.ghost.traverse(o => {
      if (o.isMesh) o.material.color.setHex(valid ? 0x4aff9a : 0xff5a5a);
    });
  }

  place(inv) {
    if (!this.ghostValid) return false;
    const r = this.recipeFor(this.type);
    if (!inv.payCost(r.cost)) return false;
    const { x, y, z } = this.ghostPos;
    const group = buildStructureModel(this.type);
    group.position.set(x, y, z);
    this.scene.add(group);
    this.structures.push({ type: this.type, x, y, z, group });
    return true;
  }

  removeAt(point, inv) {
    for (let i = this.structures.length - 1; i >= 0; i--) {
      const s = this.structures[i];
      const dx = point.x - s.x, dz = point.z - s.z;
      const dy = point.y - s.y;
      const size = BUILDABLES[s.type].size;
      if (Math.abs(dx) < size[0] / 2 + 1 && Math.abs(dz) < size[2] / 2 + 1 && dy > -0.5 && dy < size[1] + 1) {
        this.scene.remove(s.group);
        this.structures.splice(i, 1);
        const r = this.recipeFor(s.type);
        // 50% refund
        for (const [res, amt] of Object.entries(r.cost)) inv.addRes(res, Math.floor(amt / 2));
        return true;
      }
    }
    return false;
  }

  solarsNear(pos, r = 45) {
    let n = 0;
    for (const s of this.structures) {
      if (s.type !== 'solar') continue;
      const dx = s.x - pos.x, dz = s.z - pos.z;
      if (dx * dx + dz * dz < r * r) n++;
    }
    return n;
  }

  load(list) {
    for (const [type, x, y, z] of list) {
      const group = buildStructureModel(type);
      group.position.set(x, y, z);
      this.scene.add(group);
      this.structures.push({ type, x, y, z, group });
    }
  }

  save() {
    return this.structures.map(s => [s.type, s.x, s.y, s.z]);
  }

  clear() {
    for (const s of this.structures) this.scene.remove(s.group);
    this.structures = [];
    this.deactivate();
  }
}
