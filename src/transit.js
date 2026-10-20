import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ARRIVAL, BUS_STOP, TRAIN_STATION } from './journey.js';
import { terrainHeight } from './terrain.js';

export function createTransit(parent) {
  const group = new THREE.Group(); group.name = 'Little frontier arrival'; parent.add(group);
  const materials = new Map(), geometries = new Set(), textures = [], colliders = [];
  function part(geo, color, x, y, z) {
    geometries.add(geo); if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .85 }));
    const m = new THREE.Mesh(geo, materials.get(color)); m.position.set(x, terrainHeight(x, z) + y, z); m.castShadow = m.receiveShadow = true; group.add(m); return m;
  }
  const box = (c, x, y, z, w, h, d) => part(new RoundedBoxGeometry(w, h, d, 2, .08), c, x, y, z);
  const block = (id, x, z, w, d) => colliders.push({ kind: 'box', id, minY:terrainHeight(x,z),maxY:terrainHeight(x,z)+(id.includes('bench')?1.0:4.6), minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  function sign(text, x, y, z, width = 4) {
    const plane = box('#f7ecd1', x, y, z, width, 1, .12);
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
      const c = canvas.getContext('2d'); c.fillStyle = '#f7ecd1'; c.fillRect(0, 0, 512, 128); c.fillStyle = '#537766'; c.font = 'bold 42px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 256, 66);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
      const material = new THREE.MeshStandardMaterial({ map: texture, roughness: .9 }); materials.set(text, material);
      const geo = new THREE.PlaneGeometry(width - .08, .92); geometries.add(geo);
      const label = new THREE.Mesh(geo, material); label.position.copy(plane.position); label.position.z += .07; group.add(label);
    }
  }
  // The gateway stays near the western invisible boundary, with space to turn around.
  box('#d6c59f', ARRIVAL.x, -.02, ARRIVAL.z, 100, .10, 86);
  for (const dx of [-8, 0, 8]) for (const side of [-1, 1]) box('#f5e9c8', ARRIVAL.x + dx, .05, ARRIVAL.z + 20 + side * 4, .16, .03, 5);
  const b = BUS_STOP;
  for (const side of [-1, 1]) { box('#8b9c78', b.x + side * 3, 2.2, b.z, .18, 4.4, .18); block('bus-post', b.x + side * 3, b.z, .28, .28); }
  box('#9abb97', b.x, 4.35, b.z, 7.2, .28, 3.8);
  box('#c5d5ba', b.x, 2.2, b.z - 1.6, 6.4, 4.0, .15); block('bus-wall', b.x, b.z - 1.6, 6.4, .20);
  box('#bf9869', b.x, .85, b.z -.9, 4.4, .18, .8); box('#b28b61', b.x, 1.3, b.z - 1.27, 4.4, .75, .12); block('bus-bench', b.x, b.z - 1, 4.5, .8);
  sign('FOREST · BUS', b.x, 3.65, b.z + .12, 5.8);
  box('#8b9c78', b.x + 5, 2, b.z + 1, .14, 4, .14); sign('BUS', b.x + 5, 3.7, b.z + 1, 1.8);
  // Small parked bus is scenery, with a solid body like the station furniture.
  box('#dcbe75', b.x - 1, 1.45, b.z + 11, 3.6, 2.1, 8.5);
  box('#bfd8ce', b.x - 1, 2.8, b.z + 11, 3.4, 1.1, 8.1);
  box('#ede1c2', b.x - 1, 3.45, b.z + 11, 3.5, .20, 8.3);
  for (const side of [-1, 1]) for (const z of [-2.7, 2.7]) { const wheel = part(new THREE.CylinderGeometry(.6, .6, .35, 20), '#4f5a50', b.x - 1 + side * 1.75, .6, b.z + 11 + z); wheel.rotation.z = Math.PI / 2; }
  block('parked-bus', b.x - 1, b.z + 11, 3.8, 8.8);
  const s = TRAIN_STATION;
  box('#c9be9d', s.x, .15, s.z, 22, .30, 12);
  box('#efe0bc', s.x, 2.05, s.z - 3, 9, 4.1, 4); block('station-hut', s.x, s.z - 3, 9, 4);
  box('#88a99a', s.x, 4.25, s.z - 2.5, 12, .30, 7.5);
  box('#b9d9cb', s.x - 2.2, 2.1, s.z - .92, 2.8, 1.8, .1);
  box('#ac8c5e', s.x + 2, 1.5, s.z - .92, 1.5, 3, .12);
  sign('LEAF · STATION', s.x, 3.6, s.z + .1, 7.6);
  box('#ba9365', s.x - 5, .82, s.z + 2.5, 4, .18, 1); block('station-bench', s.x - 5, s.z + 2.5, 4, 1);
  for (const x of [-1, 1]) box('#7e8b82', s.x + x * 1.1, .06, s.z - 13, .12, .13, 52);
  for (let i = -12; i <= 12; i++) box('#aa916d', s.x, -.04, s.z - 13 + i * 2, 3.8, .12, .22);
  // A little railcar beyond the platform communicates the train arrival clearly.
  box('#9bb8a2', s.x, 1.8, s.z - 15, 3.5, 2.8, 10);
  box('#c9e0d4', s.x, 2.6, s.z - 15, 3.55, 1.1, 8.6); box('#eadfc5', s.x, 3.4, s.z - 15, 3.6, .2, 10.1);
  block('railcar', s.x, s.z - 15, 3.8, 10.4);
  return { group, colliders, targets: [{ id: 'bus', position: new THREE.Vector3(b.x + 4, 0, b.z + 2) }, { id: 'train', position: new THREE.Vector3(s.x - 5, 0, s.z + 5) }], dispose() { group.removeFromParent(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); } };
}
