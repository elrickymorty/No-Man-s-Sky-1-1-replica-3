// ============ Planet sky: dome shader, sun, stars, clouds, lights ============
import * as THREE from 'three';
import { makeRng } from './rng.js';
import { smoothstep } from './noise.js';
import { GAME } from './config.js';

export class PlanetSky {
  constructor(scene) {
    this.scene = scene;
    scene.background = new THREE.Color(0x05070d);
    scene.fog = new THREE.FogExp2(0xcfe6f2, GAME.FOG_DENSITY);

    const geo = new THREE.SphereGeometry(2900, 32, 20);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        uTop: { value: new THREE.Color(0x28569b) },
        uMid: { value: new THREE.Color(0x79b7e6) },
        uBot: { value: new THREE.Color(0xd2e9f7) },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunCol: { value: new THREE.Color(0xfff2d0) },
      },
      vertexShader: `
        varying vec3 vDir;
        void main(){
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uTop, uMid, uBot, uSunCol, uSunDir;
        varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float y = d.y;
          vec3 col = mix(uBot, uMid, smoothstep(0.0, 0.22, y));
          col = mix(col, uTop, smoothstep(0.22, 0.62, y));
          float sd = max(dot(d, normalize(uSunDir)), 0.0);
          col += uSunCol * (pow(sd, 900.0) * 1.6 + pow(sd, 60.0) * 0.3 + pow(sd, 6.0) * 0.13);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(geo, this.skyMat);
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    // sun glow sprite
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(), transparent: true, opacity: 0.5,
      depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    }));
    this.glow.scale.set(1100, 1100, 1);
    scene.add(this.glow);

    // stars
    const rng = makeRng('stars');
    const N = 2600;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const u = rng() * 2 - 1, a = rng() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      pos[i * 3] = r * Math.cos(a) * 2850;
      pos[i * 3 + 1] = Math.abs(u) * 2850 * (rng() < 0.85 ? 1 : -0.6);
      pos[i * 3 + 2] = r * Math.sin(a) * 2850;
      c.setHSL(0.5 + rng() * 0.18, rng() * 0.35, 0.7 + rng() * 0.3);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.starsMat = new THREE.PointsMaterial({
      size: 2.2, sizeAttenuation: false, vertexColors: true,
      transparent: true, opacity: 0, depthWrite: false, fog: false,
    });
    this.stars = new THREE.Points(sg, this.starsMat);
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    // clouds
    this.clouds = new THREE.Group();
    for (let i = 0; i < 22; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeCloudTexture(), transparent: true, opacity: 0.14 + rng() * 0.2,
        depthWrite: false, fog: false,
      }));
      const a = rng() * Math.PI * 2, d = 160 + rng() * 880;
      s.position.set(Math.cos(a) * d, 250 + rng() * 260, Math.sin(a) * d);
      const sc = 170 + rng() * 380;
      s.scale.set(sc, sc * (0.32 + rng() * 0.24), 1);
      s.userData.drift = 1.2 + rng() * 2.2;
      this.clouds.add(s);
    }
    scene.add(this.clouds);

    // lights
    this.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x5a6a52, 0.75);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2d8, 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -170; sc.right = 170; sc.top = 170; sc.bottom = -170; sc.near = 5; sc.far = 900;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun, this.sun.target);

    this.playerPos = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._c1 = new THREE.Color(); this._c2 = new THREE.Color();
    this.atmo = null;
  }

  setAtmosphere(B, toxic) {
    this.dayTop = new THREE.Color(B.sky.top);
    this.dayMid = new THREE.Color(B.sky.mid);
    this.dayBot = new THREE.Color(B.sky.bot);
    this.dayFog = new THREE.Color(B.fog);
    if (toxic) {
      const t = new THREE.Color(0x6aff8a);
      this.dayFog.lerp(t, 0.2);
      this.dayBot.lerp(t, 0.12);
    }
    this.nightTop = new THREE.Color(0x04070f);
    this.nightMid = new THREE.Color(0x0a1424);
    this.nightBot = new THREE.Color(0x131f38);
    this.nightFog = new THREE.Color(0x0a101c);
    if (toxic) this.nightFog.lerp(new THREE.Color(0x12301c), 0.35);
  }

  update(t, dt, playerPos) {
    const t01 = ((t % 1) + 1) % 1;
    const sunAngle = (t01 - 0.25) * Math.PI * 2;
    const dir = this._dir.set(Math.cos(sunAngle), Math.sin(sunAngle), 0.28).normalize();
    const day = smoothstep(-0.14, 0.2, dir.y);
    const dusk = Math.exp(-Math.pow((dir.y + 0.04) / 0.16, 2));

    this.playerPos.copy(playerPos);
    this.sky.position.set(playerPos.x, 0, playerPos.z);
    this.stars.position.copy(this.sky.position);
    this.clouds.position.set(playerPos.x, 0, playerPos.z);
    this.glow.position.set(
      playerPos.x + dir.x * 2600,
      Math.max(dir.y * 2600, -300),
      playerPos.z + dir.z * 2600
    );

    const u = this.skyMat.uniforms;
    u.uSunDir.value.copy(dir);
    u.uTop.value.copy(this._c1.copy(this.nightTop).lerp(this.dayTop, day));
    u.uMid.value.copy(this._c2.copy(this.nightMid).lerp(this.dayMid, day).lerp(new THREE.Color(0xff8a4a), dusk * 0.3));
    u.uBot.value.copy(this._c2.copy(this.nightBot).lerp(this.dayBot, day).lerp(new THREE.Color(0xff8a4a), dusk * 0.38));
    u.uSunCol.value.set(0xfff2d0).lerp(new THREE.Color(0xff7a3a), dusk * 0.7);
    this.glow.material.opacity = dir.y > -0.22 ? 0.22 + dusk * 0.5 : 0;

    this.starsMat.opacity = (1 - day) * 0.85;

    this.sun.intensity = 0.12 + day * 2.4;
    this.sun.color.set(0xfff2d8).lerp(new THREE.Color(0xff9a5a), dusk * 0.55);
    this.sun.position.set(playerPos.x + dir.x * 320, 280, playerPos.z + dir.z * 320);
    this.sun.target.position.copy(playerPos);
    this.hemi.intensity = 0.14 + day * 0.62;

    const fogC = this.scene.fog.color;
    fogC.copy(this.nightFog).lerp(this.dayFog, day);
    fogC.lerp(new THREE.Color(0xff8a5a), dusk * 0.1);

    for (const cld of this.clouds.children) {
      cld.position.x += dt * cld.userData.drift;
      if (cld.position.x > 1150) cld.position.x = -1150;
    }
  }
}

function makeGlowTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,252,240,1)');
  g.addColorStop(0.22, 'rgba(255,240,200,0.6)');
  g.addColorStop(0.55, 'rgba(255,210,150,0.18)');
  g.addColorStop(1, 'rgba(255,180,100,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeCloudTexture() {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 64;
  const ctx = cv.getContext('2d');
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 16; i++) {
    const x = 18 + rnd() * 92, y = 12 + rnd() * 40, r = 7 + rnd() * 17;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
