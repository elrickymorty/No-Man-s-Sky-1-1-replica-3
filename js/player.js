// ============ Player character: NMS-style suit + third-person controller ============
import * as THREE from 'three';
import { GAME } from './config.js';

export function buildSuitModel(accentHex = 0x8fa8a0) {
  const g = new THREE.Group();
  const suit = new THREE.MeshLambertMaterial({ color: 0xe8ecee });
  const suitDark = new THREE.MeshLambertMaterial({ color: 0xb8c0c8 });
  const accentMat = new THREE.MeshLambertMaterial({ color: accentHex });
  const visorMat = new THREE.MeshLambertMaterial({ color: 0x24384a, emissive: 0x0e2233, emissiveIntensity: 0.8 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.42, 4, 10), suit);
  torso.position.y = 1.05;
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.14), accentMat);
  chest.position.set(0, 1.18, -0.24);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.46, 0.18), suitDark);
  pack.position.set(0, 1.08, 0.26);
  const packTop = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.12), accentMat);
  packTop.position.set(0, 1.36, 0.24);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5), suitDark);
  antenna.position.set(0.14, 1.62, 0.26);

  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.185, 12, 10), suit);
  helm.position.y = 1.62;
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), visorMat);
  visor.position.set(0, 1.62, -0.045);
  visor.rotation.x = -0.28;

  const armGeo = new THREE.CapsuleGeometry(0.07, 0.5, 3, 8);
  armGeo.translate(0, -0.28, 0);
  const armL = new THREE.Mesh(armGeo, suit);
  armL.position.set(-0.36, 1.42, 0);
  const armR = new THREE.Mesh(armGeo, suit);
  armR.position.set(0.36, 1.42, 0);

  const legGeo = new THREE.CapsuleGeometry(0.095, 0.58, 3, 8);
  legGeo.translate(0, -0.35, 0);
  const legL = new THREE.Mesh(legGeo, suit);
  legL.position.set(-0.14, 0.82, 0);
  const legR = new THREE.Mesh(legGeo, suit);
  legR.position.set(0.14, 0.82, 0);

  // multitool in right hand (front = -Z)
  const tool = new THREE.Group();
  const tBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.22), accentMat);
  const tTip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 8),
    new THREE.MeshLambertMaterial({ color: 0x7de8ff, emissive: 0x2a88aa, emissiveIntensity: 1 }));
  tTip.rotation.x = -Math.PI / 2;
  tTip.position.z = -0.16;
  tool.add(tBody, tTip);
  tool.position.set(0, -0.58, -0.14);
  armR.add(tool);

  g.add(torso, chest, pack, packTop, antenna, helm, visor, armL, armR, legL, legR);
  g.userData = { armL, armR, legL, legR, accentMat, visorMat };
  return g;
}

export class Player {
  constructor(scene, world) {
    this.world = world;
    this.group = buildSuitModel();
    this.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(this.group);
    this.pos = new THREE.Vector3(0, 5, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0.4;
    this.onGround = false;
    this.inWater = false;
    this.phase = 0;
    this.speedMult = 1;
    this._target = new THREE.Vector3();
    this._dir = new THREE.Vector3();
  }

  spawn(x, y, z) {
    this.pos.set(x, y + 0.1, z);
    this.vel.set(0, 0, 0);
  }

  setSuit(accentHex) {
    this.group.userData.accentMat.color.setHex(accentHex);
  }

  update(dt, input, camera) {
    const w = this.world;
    const keys = input.keys;
    let mx = 0, mz = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) mz += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) mz -= 1;
    if (keys.has('KeyA')) mx -= 1;
    if (keys.has('KeyD')) mx += 1;
    const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const groundH = w.height(this.pos.x, this.pos.z);
    this.inWater = groundH < 0.35;
    let speed = (sprint ? GAME.SPRINT : GAME.WALK) * this.speedMult * (this.inWater ? 0.55 : 1);
    const len = Math.hypot(mx, mz);
    this.moving = len > 0 && this.onGround;
    this.currentSpeed = len > 0 ? speed : 0;
    if (len > 0) { mx /= len; mz /= len; }

    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const vx = (-sy * mz + cy * mx) * speed;
    const vz = (-cy * mz - sy * mx) * speed;
    const stepMax = 1.15;

    const nx = this.pos.x + vx * dt;
    const nh = w.height(nx, this.pos.z);
    if (!(nh - this.pos.y > stepMax) && nh > -0.5) this.pos.x = nx;
    const nz = this.pos.z + vz * dt;
    const nzH = w.height(this.pos.x, nz);
    if (!(nzH - this.pos.y > stepMax) && nzH > -0.5) this.pos.z = nz;

    if (input.jumpQueued && this.onGround) {
      this.vel.y = GAME.JUMP;
      this.onGround = false;
    }
    input.jumpQueued = false;
    this.vel.y -= GAME.GRAVITY * dt;
    this.pos.y += this.vel.y * dt;
    const gh = w.height(this.pos.x, this.pos.z);
    if (this.pos.y <= gh) {
      this.pos.y = gh;
      this.vel.y = 0;
      this.onGround = true;
    } else if (this.pos.y > gh + 0.05) {
      this.onGround = false;
    }

    // --- animate suit ---
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
    const u = this.group.userData;
    const moving = len > 0 && this.onGround;
    if (moving) this.phase += dt * speed * 1.35;
    const sw = Math.sin(this.phase) * 0.55 * (moving ? 1 : 0);
    u.legL.rotation.x = sw;
    u.legR.rotation.x = -sw;
    u.armL.rotation.x = -sw * 0.7;
    u.armR.rotation.x = sw * 0.4;
    if (!this.onGround) {
      u.legL.rotation.x = -0.4;
      u.legR.rotation.x = 0.3;
      u.armL.rotation.x = 0.5;
      u.armR.rotation.x = -0.4;
    }

    // --- chase camera (behind = +offset, over the shoulder) ---
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const dist = 4.8;
    this._target.set(this.pos.x, this.pos.y + 1.5, this.pos.z);
    camera.position.set(
      this._target.x + sy * dist * cp,
      this._target.y + dist * sp,
      this._target.z + cy * dist * cp
    );
    const camH = w.height(camera.position.x, camera.position.z) + 0.4;
    if (camera.position.y < camH) camera.position.y = camH;
    camera.lookAt(this._target);
  }
}
