// ============ Player ship (procedural Mollusk-inspired explorer) ============
import * as THREE from 'three';

export function buildShipModel() {
  const g = new THREE.Group();
  const hull = new THREE.MeshLambertMaterial({ color: 0xd8dde4 });
  const hullDark = new THREE.MeshLambertMaterial({ color: 0x8a94a0 });
  const accent = new THREE.MeshLambertMaterial({ color: 0x3a4550 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1a2a3a, emissive: 0x1a3a5a, emissiveIntensity: 0.7 });
  const glow = new THREE.MeshBasicMaterial({ color: 0x66ccff });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 2.4, 4, 12), hull);
  body.rotation.x = Math.PI / 2;
  body.scale.set(1, 0.8, 0.85);
  body.position.y = 0.75;

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), hull);
  nose.scale.set(1, 0.75, 1.6);
  nose.position.set(0, 0.7, -1.55);

  const cock = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), glass);
  cock.scale.set(1.1, 0.7, 1.4);
  cock.position.set(0, 0.98, -1.3);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 1.5), hull);
  wing.position.set(0, 0.4, 0.4);

  const wingEdge = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.1, 0.3), accent);
  wingEdge.position.set(0, 0.4, -0.35);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 1.0), hullDark);
  fin.position.set(0, 1.15, 1.1);
  const finTop = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.7), accent);
  finTop.position.set(0, 1.62, 1.15);

  const engL = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.7, 10), hullDark);
  engL.rotation.x = Math.PI / 2;
  engL.position.set(-0.8, 0.42, 1.15);
  const engR = engL.clone();
  engR.position.x = 0.8;

  const glL = new THREE.Mesh(new THREE.CircleGeometry(0.24, 10), glow);
  glL.rotation.y = Math.PI;
  glL.position.set(-0.8, 0.42, 1.53);
  const glR = glL.clone();
  glR.position.x = 0.8;

  g.add(body, nose, cock, wing, wingEdge, fin, finTop, engL, engR, glL, glR);

  const l1 = new THREE.PointLight(0x66ccff, 1.4, 16, 0);
  l1.position.set(-0.8, 0.42, 1.7);
  const l2 = l1.clone();
  l2.position.x = 0.8;
  g.add(l1, l2);

  g.userData.engineLights = [l1, l2];
  g.userData.engineGlows = [glL, glR];
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
