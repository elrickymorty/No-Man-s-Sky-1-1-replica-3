// ============ Deep space: star systems, flight, landing, warp ============
import * as THREE from 'three';
import { planetCenter, makePlanetTexture } from './planet.js';
import { buildShipModel } from './ship.js';
import { makeRng } from './rng.js';
import { BIOMES } from './config.js';

function makeGlowTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,250,235,1)');
  g.addColorStop(0.2, 'rgba(255,235,200,0.55)');
  g.addColorStop(0.5, 'rgba(255,210,160,0.15)');
  g.addColorStop(1, 'rgba(255,180,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeMilkyTex() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 256;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(512, 256);
  const d = img.data;
  let seed = 987654321;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 512; x++) {
      const u = x / 512;
      const center = 0.5 + Math.sin(u * 12.6 + Math.sin(u * 25) * 1.6) * 0.085;
      const dy = y / 256 - center;
      const w = 0.15;
      let i = Math.exp(-(dy * dy) / (2 * w * w));
      i *= 0.2 + 0.8 * rnd();
      const i2 = 0.5 + 0.5 * Math.sin(x * 0.045 + y * 0.13);
      i *= 0.55 + 0.45 * i2;
      const o = (y * 512 + x) * 4;
      d[o] = 190 * i; d[o + 1] = 200 * i; d[o + 2] = 255 * i; d[o + 3] = Math.min(255, i * 300);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class SpaceMode {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    scene.fog = null;

    this.ship = buildShipModel();
    scene.add(this.ship);
    this.shipPos = new THREE.Vector3(0, 0, 4600);
    this.shipQuat = new THREE.Quaternion();
    this.shipVel = new THREE.Vector3();
    this.throttle = 0;
    this.time = 0;
    this.system = null;
    this.substate = 'fly';
    this.landT = 0;
    this.landPlanet = null;
    this.landFrom = new THREE.Vector3();
    this.landTo = new THREE.Vector3();
    this.nearPlanet = null;
    this.canLand = false;
    this.texQueue = [];

    this._e = new THREE.Euler();
    this._q = new THREE.Quaternion();
    this._q2 = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();

    scene.add(this.makeStars());
    scene.add(this.makeMilkyWay());
    const amb = new THREE.AmbientLight(0x8899bb, 0.35);
    scene.add(amb);
  }

  makeStars() {
    const rng = makeRng('space-stars');
    const N = 9000;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const u = rng() * 2 - 1, a = rng() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      const R = 32000 + rng() * 26000;
      pos[i * 3] = r * Math.cos(a) * R;
      pos[i * 3 + 1] = u * R;
      pos[i * 3 + 2] = r * Math.sin(a) * R;
      c.setHSL(0.55 + rng() * 0.15, rng() * 0.4, 0.65 + rng() * 0.35);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({
      size: 2.4, sizeAttenuation: false, vertexColors: true,
      transparent: true, opacity: 0.95, depthWrite: false,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    return pts;
  }

  makeMilkyWay() {
    const g = new THREE.SphereGeometry(60000, 32, 20);
    const m = new THREE.MeshBasicMaterial({
      map: makeMilkyTex(), side: THREE.BackSide, transparent: true,
      opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    });
    const s = new THREE.Mesh(g, m);
    s.frustumCulled = false;
    return s;
  }

  loadSystem(system, shipState) {
    if (this.planetsGroup) {
      this.scene.remove(this.planetsGroup);
      this.planetsGroup.traverse(o => {
        if (o.isSprite) {
          // sprite geometry is shared by three — only dispose material + map
          if (o.material.map) o.material.map.dispose();
          o.material.dispose();
        } else if (o.isMesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
        }
      });
    }
    this.system = system;
    this.planetsGroup = new THREE.Group();
    const sys = system;

    // star
    const star = new THREE.Mesh(
      new THREE.SphereGeometry(sys.star.radius, 32, 20),
      new THREE.MeshBasicMaterial({ color: sys.star.color })
    );
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(), transparent: true, opacity: 0.55,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }));
    glow.scale.setScalar(sys.star.radius * 11);
    const light = new THREE.PointLight(sys.star.color, 3, 0, 0);
    this.planetsGroup.add(star, glow, light);
    this.starLight = light;

    // planets
    this.texQueue = [];
    for (const p of sys.planets) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(p.radius, 40, 28),
        new THREE.MeshLambertMaterial({ color: 0x7a8899 })
      );
      const atmoMat = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(BIOMES[p.biome].sky.mid) } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `
          varying vec3 vN; varying vec3 vW;
          void main(){
            vN = normalize(mat3(modelMatrix) * normal);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vW = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }`,
        fragmentShader: `
          uniform vec3 uColor;
          varying vec3 vN; varying vec3 vW;
          void main(){
            vec3 V = normalize(cameraPosition - vW);
            float f = pow(1.0 - max(dot(vN, V), 0.0), 2.6);
            gl_FragColor = vec4(uColor * (f * 1.7), f);
          }`,
      });
      const atmo = new THREE.Mesh(new THREE.SphereGeometry(p.radius * 1.07, 40, 28), atmoMat);
      const c = planetCenter(p, this.time);
      mesh.position.set(c.x, c.y, c.z);
      atmo.position.copy(mesh.position);
      p.mesh = mesh;
      p.atmo = atmo;
      if (p.hasMoon) {
        p.moonMesh = new THREE.Mesh(
          new THREE.SphereGeometry(p.moon.radius, 20, 14),
          new THREE.MeshLambertMaterial({ color: 0x9aa2ac })
        );
        this.planetsGroup.add(p.moonMesh);
      }
      this.planetsGroup.add(mesh, atmo);
      this.texQueue.push(p);
    }
    this.scene.add(this.planetsGroup);

    if (shipState) {
      this.shipPos.set(shipState.x, shipState.y, shipState.z);
      this.shipQuat.set(shipState.qx, shipState.qy, shipState.qz, shipState.qw).normalize();
      this.time = shipState.time || 0;
      this.throttle = 0;
    } else {
      this.shipPos.set(0, 0, 4600);
      this.shipQuat.identity();
      this.time = 0;
      this.throttle = 0;
    }
    this.shipVel.set(0, 0, 0);
    this.substate = 'fly';
    this.nearPlanet = null;
  }

  // lazy planet textures (one per frame)
  updateTex() {
    if (!this.texQueue.length) return;
    const p = this.texQueue.shift();
    if (p.textured) return;
    p.textured = true;
    p.mesh.material.map = makePlanetTexture(p);
    p.mesh.material.needsUpdate = true;
  }

  beginLanding(planet) {
    this.substate = 'landing';
    this.landT = 0;
    this.landPlanet = planet;
    this.landFrom.copy(this.shipPos);
    const c = planet.mesh.position;
    this._v2.copy(this.shipPos).sub(c).normalize();
    this.landTo.copy(c).addScaledVector(this._v2, planet.radius + 8);
    this.canLand = false;
  }

  landingDone() {
    return this.substate === 'landing' && this.landT >= 1;
  }

  beginWarp() {
    if (this.substate !== 'fly') return false;
    this.substate = 'warping';
    this.landT = 0;
    return true;
  }

  warpDone() {
    return this.substate === 'warping' && this.landT >= 1;
  }

  travelTo(planet) {
    // instant jump to planet orbit (system map)
    const c = planet.mesh.position;
    const toCenter = this._v2.copy(c).normalize();
    this.shipPos.copy(c).addScaledVector(toCenter, -(planet.radius + 900));
    // face the planet
    this._v.copy(c).sub(this.shipPos).normalize();
    this._q2.setFromUnitVectors(new THREE.Vector3(0, 0, -1), this._v);
    this.shipQuat.copy(this._q2);
    this.shipVel.set(0, 0, 0);
    this.throttle = 0;
  }

  shipState() {
    return {
      x: this.shipPos.x, y: this.shipPos.y, z: this.shipPos.z,
      qx: this.shipQuat.x, qy: this.shipQuat.y, qz: this.shipQuat.z, qw: this.shipQuat.w,
      time: this.time,
    };
  }

  update(dt, input) {
    if (!this.system) return;
    this.time += dt;
    this.updateTex();
    const sys = this.system;

    for (const p of sys.planets) {
      const c = planetCenter(p, this.time);
      p.mesh.position.set(c.x, c.y, c.z);
      p.atmo.position.copy(p.mesh.position);
      p.mesh.rotation.y += p.spin * dt;
      if (p.hasMoon && p.moonMesh) {
        const ma = p.moon.angle + this.time * p.moon.speed;
        p.moonMesh.position.set(
          p.mesh.position.x + Math.cos(ma) * p.moon.dist,
          p.mesh.position.y + Math.sin(ma * 0.7) * p.moon.dist * 0.2,
          p.mesh.position.z + Math.sin(ma) * p.moon.dist
        );
      }
    }

    if (this.substate === 'fly') {
      const yawIn = -input.mouse.dx * 0.0011;
      const pitchIn = -input.mouse.dy * 0.0011;
      const rollIn = ((input.keys.has('KeyA') ? 1 : 0) - (input.keys.has('KeyD') ? 1 : 0)) * dt * 2.0;
      this._e.set(pitchIn, yawIn, rollIn, 'YXZ');
      this._q.setFromEuler(this._e);
      this.shipQuat.premultiply(this._q).normalize();

      if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) this.throttle = Math.min(1, this.throttle + dt * 0.5);
      if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) this.throttle = Math.max(0, this.throttle - dt * 0.6);
      const boost = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
      const maxV = (boost ? 950 : 300) * (0.15 + 0.85 * this.throttle);
      this._v.set(0, 0, -1).applyQuaternion(this.shipQuat).multiplyScalar(maxV);
      this.shipVel.lerp(this._v, 1 - Math.pow(0.05, dt));
      this.shipPos.addScaledVector(this.shipVel, dt);

      // collisions with planets & star
      for (const p of sys.planets) {
        const c = p.mesh.position;
        const d = this.shipPos.distanceTo(c);
        const minD = p.radius + 45;
        if (d < minD) {
          this._v2.copy(this.shipPos).sub(c).normalize();
          this.shipPos.copy(c).addScaledVector(this._v2, minD);
        }
      }
      const sd = this.shipPos.length();
      const smin = sys.star.radius + 90;
      if (sd < smin) this.shipPos.setLength(smin);

      this.nearPlanet = null;
      this.canLand = false;
      let best = Infinity;
      for (const p of sys.planets) {
        const d = this.shipPos.distanceTo(p.mesh.position);
        if (d < p.radius * 2.4 && d < best) {
          best = d;
          this.nearPlanet = p;
          this.canLand = this.shipVel.length() < Math.max(160, p.radius * 0.6);
        }
      }
    } else if (this.substate === 'landing') {
      this.landT += dt / 1.7;
      const t = Math.min(1, this.landT);
      const e = t * t * (3 - 2 * t);
      this.shipPos.lerpVectors(this.landFrom, this.landTo, e);
      this._v2.copy(this.landTo).sub(this.shipPos).normalize();
      this._q2.setFromUnitVectors(new THREE.Vector3(0, 0, -1), this._v2);
      this.shipQuat.slerp(this._q2, Math.min(1, dt * 4));
      this.shipVel.set(0, 0, 0);
    } else if (this.substate === 'warping') {
      this.landT += dt / 1.8;
    }

    this.ship.position.copy(this.shipPos);
    this.ship.quaternion.copy(this.shipQuat);

    const boost = this.substate === 'fly' && (input.keys.has('ShiftLeft') || input.keys.has('ShiftRight'));
    const glowI = 0.25 + this.throttle * 0.75 + (boost ? 0.7 : 0);
    for (const l of this.ship.userData.engineLights) l.intensity = glowI * 2.4;

    // chase camera
    this._v.set(0, 2.6, 11).applyQuaternion(this.shipQuat);
    this.camera.position.copy(this.shipPos).add(this._v);
    this._v.set(0, 0.6, -70).applyQuaternion(this.shipQuat).add(this.shipPos);
    this.camera.lookAt(this._v);
  }
}
