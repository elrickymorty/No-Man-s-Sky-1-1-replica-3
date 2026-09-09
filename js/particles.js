// ============ Simple pooled particle system (Points) ============
import * as THREE from 'three';

export class Particles {
  constructor(scene, n = 200) {
    this.scene = scene;
    this.n = n;
    this.pos = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) this.pos[i * 3 + 1] = -9999;
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.mat = new THREE.PointsMaterial({
      size: 0.34, vertexColors: true, transparent: true,
      opacity: 0.95, depthWrite: false,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.cursor = 0;
    this._c = new THREE.Color();
  }

  burst(p, color, n = 14, speed = 4, up = 2.4) {
    this._c.set(color);
    for (let i = 0; i < n; i++) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % this.n;
      this.pos[idx * 3] = p.x + (Math.random() - 0.5) * 0.4;
      this.pos[idx * 3 + 1] = p.y + (Math.random() - 0.5) * 0.4;
      this.pos[idx * 3 + 2] = p.z + (Math.random() - 0.5) * 0.4;
      const a = Math.random() * Math.PI * 2;
      const e = Math.random() * Math.PI - Math.PI / 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.vel[idx * 3] = Math.cos(a) * Math.cos(e) * s;
      this.vel[idx * 3 + 1] = Math.sin(e) * s + up;
      this.vel[idx * 3 + 2] = Math.sin(a) * Math.cos(e) * s;
      this.life[idx] = 0.45 + Math.random() * 0.4;
      const v = 0.75 + Math.random() * 0.25;
      this.col[idx * 3] = this._c.r * v;
      this.col[idx * 3 + 1] = this._c.g * v;
      this.col[idx * 3 + 2] = this._c.b * v;
    }
  }

  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      this.vel[i * 3 + 1] -= 9.5 * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.life[i] <= 0) this.pos[i * 3 + 1] = -9999;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}
