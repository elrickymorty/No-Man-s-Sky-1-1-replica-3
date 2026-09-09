// ============ Alien fauna: procedural models + simple AI ============
import * as THREE from 'three';
import { makeRng, pick } from './rng.js';
import { CREATURES, CREATURE_KEYS, CREATURE_INDIV, CREATURE_BEHAV } from './config.js';

function limb(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function buildMollusc(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mat);
  body.scale.set(1.5, 0.8, 1.1);
  body.position.y = 0.7;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), mat);
  head.position.set(0, 0.85, 1.1);
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), eyeMat);
  e1.position.set(0.28, 1.05, 1.45);
  const e2 = e1.clone(); e2.position.x = -0.28;
  g.add(body, head, e1, e2);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function buildRunner(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 1.9), mat);
  body.position.y = 1.1;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.7), mat);
  head.position.set(0, 1.45, 1.15);
  const earGeo = new THREE.ConeGeometry(0.12, 0.5, 4);
  const e1 = limb(earGeo, mat, 0.2, 1.9, 1.05);
  const e2 = limb(earGeo, mat, -0.2, 1.9, 1.05);
  const tail = limb(new THREE.CylinderGeometry(0.08, 0.04, 0.9, 5), mat, 0, 1.25, -1.3);
  tail.rotation.x = 2.4;
  const legs = [];
  const legGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.95, 5);
  legGeo.translate(0, -0.42, 0);
  for (const [x, z] of [[0.3, 0.7], [-0.3, 0.7], [0.3, -0.7], [-0.3, -0.7]]) {
    const L = limb(legGeo, mat, x, 1.05, z);
    legs.push(L);
    g.add(L);
  }
  g.add(body, head, e1, e2, tail);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.legs = legs;
  return g;
}

function buildTerrorbird(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.75, 9, 7), mat);
  body.scale.set(0.85, 0.8, 1.15);
  body.position.y = 1.1;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), mat);
  head.position.set(0, 1.5, 0.75);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 5), new THREE.MeshLambertMaterial({ color: 0xd8a04a }));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 1.42, 1.15);
  const wingGeo = new THREE.ConeGeometry(0.9, 2.2, 3, 1, true);
  const wl = new THREE.Mesh(wingGeo, mat);
  wl.position.set(0.55, 1.25, -0.1);
  wl.rotation.z = 0.5;
  wl.rotation.x = 0.15;
  const wr = new THREE.Mesh(wingGeo.clone(), mat);
  wr.position.set(-0.55, 1.25, -0.1);
  wr.rotation.z = -0.5;
  wr.rotation.x = 0.15;
  g.add(body, head, beak, wl, wr);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.wings = [wl, wr];
  return g;
}

function buildShrieker(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), mat);
  body.scale.set(1, 0.85, 1.3);
  body.position.y = 0.55;
  const legs = [];
  const legGeo = new THREE.CylinderGeometry(0.03, 0.045, 0.85, 4);
  legGeo.translate(0, -0.35, 0);
  for (let i = 0; i < 8; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const row = Math.floor(i / 2);
    const L = limb(legGeo, mat, side * 0.45, 0.55, -0.75 + row * 0.5);
    L.rotation.z = side * 0.5;
    legs.push(L);
    g.add(L);
  }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), new THREE.MeshLambertMaterial({ color: 0xff4a4a, emissive: 0x801010, emissiveIntensity: 0.8 }));
  eye.position.set(0, 0.65, 0.7);
  g.add(body, eye);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.legs = legs;
  return g;
}

const BUILDERS = { mollusc: buildMollusc, runner: buildRunner, terrorbird: buildTerrorbird, shrieker: buildShrieker };

export class Fauna {
  constructor(scene, world, planetSeed) {
    this.scene = scene;
    this.world = world;
    this.seed = planetSeed;
    this.list = [];
    this.spawnAcc = 0;
    this.spawnIdx = 0;
    this._away = new THREE.Vector3();
    this._dir = new THREE.Vector3();
  }

  clear() {
    for (const c of this.list) this.scene.remove(c.group);
    this.list = [];
  }

  groups() {
    return this.list.map(c => c.group);
  }

  trySpawn(x, y, z) {
    const species = pick(makeRng(this.seed + ':sp' + this.spawnIdx), CREATURE_KEYS);
    const rng = makeRng(this.seed + ':ind' + this.spawnIdx);
    this.spawnIdx++;
    const group = BUILDERS[species](new THREE.Color(pick(rng, this.world.B.faunaPalette)));
    group.position.set(x, y, z);
    const info = {
      species,
      name: pick(rng, CREATURE_INDIV),
      behav: pick(rng, CREATURE_BEHAV),
    };
    const c = {
      group, species,
      dir: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
      waitT: Math.random() * 3,
      fleeT: 0,
      moveAmt: 0,
      t: Math.random() * 10,
      info,
    };
    group.userData.creature = c;
    this.scene.add(group);
    this.list.push(c);
    return c;
  }

  update(dt, playerPos) {
    this.spawnAcc += dt;
    if (this.list.length < 12 && this.spawnAcc > 0.6) {
      this.spawnAcc = 0;
      const a = Math.random() * Math.PI * 2;
      const d = 70 + Math.random() * 90;
      const x = playerPos.x + Math.cos(a) * d;
      const z = playerPos.z + Math.sin(a) * d;
      const h = this.world.height(x, z);
      if (h > 1.2 && this.world.slopeAt(x, z) < 0.9) this.trySpawn(x, h, z);
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i];
      const g = c.group;
      const d = g.position.distanceTo(playerPos);
      if (d > 320) {
        this.scene.remove(g);
        this.list.splice(i, 1);
        continue;
      }
      this.updateCreature(c, dt, playerPos);
    }
  }

  updateCreature(c, dt, playerPos) {
    const g = c.group;
    const sp = CREATURES[c.species];
    c.t += dt;
    const d = g.position.distanceTo(playerPos);
    if (sp.flee > 0 && d < sp.flee) c.fleeT = 3.5;

    let speed = 0;
    if (c.fleeT > 0) {
      c.fleeT -= dt;
      this._away.copy(g.position).sub(playerPos).setY(0).normalize();
      this.move(c, this._away, sp.speed * 1.8, dt);
      speed = sp.speed * 1.8;
    } else if (c.waitT > 0) {
      c.waitT -= dt;
    } else if (d > 14) {
      if (Math.random() < dt * 0.12) {
        c.dir.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
      }
      this.move(c, c.dir, sp.speed * 0.45, dt);
      speed = sp.speed * 0.45;
    }

    // ground snap
    const gh = this.world.height(g.position.x, g.position.z);
    g.position.y = Math.max(g.position.y, gh);
    if (g.position.y > gh + 0.3) g.position.y -= dt * 3;

    // animation
    const u = g.userData;
    if (c.species === 'mollusc') {
      g.scale.y = 1 + Math.sin(c.t * 3) * 0.07;
    } else if (c.species === 'runner') {
      const ph = c.t * (6 + speed);
      u.legs.forEach((L, i) => { L.rotation.x = Math.sin(ph + (i % 2) * Math.PI + (i > 1 ? Math.PI : 0)) * 0.5 * Math.min(1, speed); });
      g.position.y = gh + Math.abs(Math.sin(ph)) * 0.08 * Math.min(1, speed);
    } else if (c.species === 'terrorbird') {
      const flap = Math.sin(c.t * 9) * 0.55;
      u.wings[0].rotation.z = 0.5 + flap;
      u.wings[1].rotation.z = -0.5 - flap;
      g.position.y = gh + 0.15 + Math.sin(c.t * 2.2) * 0.2;
    } else if (c.species === 'shrieker') {
      const ph = c.t * (10 + speed * 2);
      u.legs.forEach((L, i) => { L.rotation.x = Math.sin(ph + i * 0.9) * 0.4 * Math.min(1.4, speed + 0.3); });
    }
    if (speed > 0.05) g.rotation.y = Math.atan2(c.moveX, c.moveZ);
  }

  move(c, dir, speed, dt) {
    c.moveX = dir.x;
    c.moveZ = dir.z;
    c.group.position.x += dir.x * speed * dt;
    c.group.position.z += dir.z * speed * dt;
    c.dir.lerp(dir, 0.08).normalize();
  }
}
