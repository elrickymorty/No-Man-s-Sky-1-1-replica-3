// ============ Procedural decoration geometries (cached, shared) ============
import * as THREE from 'three';

export function mergeGeos(list) {
  let total = 0;
  const geos = list.map(g => {
    const ng = g.index ? g.toNonIndexed() : g;
    total += ng.attributes.position.count;
    return ng;
  });
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o);
    nor.set(g.attributes.normal.array, o);
    o += g.attributes.position.count * 3;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

const cache = {};
const trunkCache = {};

// trunk-only geometries (two-tone trees: brown trunk + tinted canopy)
export function getTrunkGeo(kind) {
  if (kind in trunkCache) return trunkCache[kind];
  let g = null;
  switch (kind) {
    case 'tree_round':
      g = new THREE.CylinderGeometry(0.14, 0.22, 2.4, 6);
      g.translate(0, 1.2, 0);
      break;
    case 'tree_cone':
      g = new THREE.CylinderGeometry(0.13, 0.2, 1.6, 6);
      g.translate(0, 0.8, 0);
      break;
  }
  trunkCache[kind] = g;
  return g;
}

export function getDecorGeo(kind) {
  if (cache[kind]) return cache[kind];
  let g;
  switch (kind) {
    case 'tree_round': {
      // canopy only — trunk is a separate instanced mesh
      const c1 = new THREE.IcosahedronGeometry(1.35, 1); c1.translate(0, 3.1, 0);
      const c2 = new THREE.IcosahedronGeometry(0.95, 1); c2.translate(0.7, 3.9, 0.2);
      const c3 = new THREE.IcosahedronGeometry(0.8, 1); c3.translate(-0.6, 3.7, -0.3);
      g = mergeGeos([c1, c2, c3]);
      break;
    }
    case 'tree_cone': {
      const c1 = new THREE.ConeGeometry(1.5, 2.8, 7); c1.translate(0, 2.6, 0);
      const c2 = new THREE.ConeGeometry(1.1, 2.3, 7); c2.translate(0, 4.0, 0);
      g = mergeGeos([c1, c2]);
      break;
    }
    case 'tree_dead': {
      const trunk = new THREE.CylinderGeometry(0.1, 0.18, 2.8, 5); trunk.translate(0, 1.4, 0);
      const b1 = new THREE.CylinderGeometry(0.04, 0.08, 1.2, 4); b1.translate(0.45, 2.6, 0); b1.rotateZ(-0.7);
      const b2 = new THREE.CylinderGeometry(0.04, 0.08, 1.0, 4); b2.translate(-0.4, 2.3, 0.1); b2.rotateZ(0.8);
      g = mergeGeos([trunk, b1, b2]);
      break;
    }
    case 'cactus': {
      const body = new THREE.CylinderGeometry(0.34, 0.4, 2.8, 7); body.translate(0, 1.4, 0);
      const top = new THREE.SphereGeometry(0.34, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2); top.translate(0, 2.8, 0);
      const a1 = new THREE.CylinderGeometry(0.16, 0.2, 1.0, 6); a1.translate(0.5, 1.9, 0); a1.rotateZ(-1.1);
      const a2 = new THREE.CylinderGeometry(0.16, 0.2, 0.8, 6); a2.translate(-0.45, 1.5, 0.1); a2.rotateZ(1.2);
      g = mergeGeos([body, top, a1, a2]);
      break;
    }
    case 'bush': {
      const c1 = new THREE.IcosahedronGeometry(0.75, 1); c1.scale(1, 0.75, 1); c1.translate(0, 0.5, 0);
      const c2 = new THREE.IcosahedronGeometry(0.5, 1); c2.scale(1, 0.8, 1); c2.translate(0.55, 0.35, 0.2);
      g = mergeGeos([c1, c2]);
      break;
    }
    case 'rock': {
      const c = new THREE.DodecahedronGeometry(1, 0);
      const pa = c.attributes.position;
      for (let i = 0; i < pa.count; i++) {
        const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
        const j = 1 + 0.28 * Math.sin(x * 12.9898 + y * 78.233 + z * 37.719);
        pa.setXYZ(i, x * j, y * j * 0.82, z * j);
      }
      c.computeVertexNormals();
      g = c;
      break;
    }
    case 'crystal': {
      const c1 = new THREE.OctahedronGeometry(0.7, 0); c1.scale(1, 2.6, 1); c1.translate(0, 1.3, 0);
      const c2 = new THREE.OctahedronGeometry(0.45, 0); c2.scale(1, 2.2, 1); c2.rotateZ(0.5); c2.rotateY(0.8); c2.translate(0.7, 0.9, 0.2);
      const c3 = new THREE.OctahedronGeometry(0.35, 0); c3.scale(1, 2.0, 1); c3.rotateZ(-0.4); c3.translate(-0.55, 0.7, -0.2);
      g = mergeGeos([c1, c2, c3]);
      break;
    }
    case 'mega_crystal': {
      const c1 = new THREE.OctahedronGeometry(1.4, 0); c1.scale(1, 3.4, 1); c1.translate(0, 1.7, 0);
      const c2 = new THREE.OctahedronGeometry(0.9, 0); c2.scale(1, 2.8, 1); c2.rotateZ(0.55); c2.rotateY(1.0); c2.translate(1.4, 1.2, 0.4);
      const c3 = new THREE.OctahedronGeometry(0.7, 0); c3.scale(1, 2.4, 1); c3.rotateZ(-0.5); c3.rotateY(2.2); c3.translate(-1.2, 0.9, -0.5);
      const c4 = new THREE.OctahedronGeometry(0.55, 0); c4.scale(1, 2.0, 1); c4.rotateZ(0.3); c4.rotateY(3.6); c4.translate(0.4, 0.8, -1.3);
      g = mergeGeos([c1, c2, c3, c4]);
      break;
    }
    case 'res_node': {
      const b = new THREE.CylinderGeometry(0.55, 0.72, 0.35, 6); b.translate(0, 0.17, 0);
      const c1 = new THREE.OctahedronGeometry(0.5, 0); c1.scale(1, 2.0, 1); c1.translate(0, 0.85, 0);
      const c2 = new THREE.OctahedronGeometry(0.34, 0); c2.scale(1, 1.7, 1); c2.rotateZ(0.5); c2.rotateY(0.9); c2.translate(0.45, 0.55, 0.15);
      const c3 = new THREE.OctahedronGeometry(0.28, 0); c3.scale(1, 1.6, 1); c3.rotateZ(-0.45); c3.rotateY(2.4); c3.translate(-0.4, 0.45, -0.1);
      g = mergeGeos([b, c1, c2, c3]);
      break;
    }
  }
  cache[kind] = g;
  return g;
}
