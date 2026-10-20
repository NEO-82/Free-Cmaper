import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { circleOverlaps } from './terrain.js';

export const HOME_GEAR = Object.freeze(['tent', 'bedding', 'clothing', 'cookware', 'food', 'survival']);
export const HOME_START = Object.freeze({ x: 0, z: 4.5 });
export const HOME_DOOR = Object.freeze({ x: 6.8, z: 4.6 });
export function moveAtHome(position, delta, colliders, radius = .55) {
  let { x, z } = position;
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / .25));
  const clear = (nx, nz) => Math.abs(nx) <= 7.5 - radius && Math.abs(nz) <= 6.5 - radius && !colliders.some(c => circleOverlaps(nx, nz, radius, c));
  for (let i = 0; i < steps; i++) {
    const dx = delta.x / steps, dz = delta.z / steps;
    if (clear(x + dx, z + dz)) { x += dx; z += dz; }
    else { if (clear(x + dx, z)) x += dx; if (clear(x, z + dz)) z += dz; }
  }
  return { x, z };
}
export function createHome(scene) {
  const group = new THREE.Group(); scene.add(group);
  const materials = new Map(), geometries = new Set(), colliders = [];
  function mesh(geo, color, x, y, z) {
    geometries.add(geo);
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .85 }));
    const m = new THREE.Mesh(geo, materials.get(color)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; group.add(m); return m;
  }
  const box = (c, x, y, z, w, h, d) => mesh(new RoundedBoxGeometry(w, h, d, 2, .06), c, x, y, z);
  const orb = (c, x, y, z, a, b, d) => { const m = mesh(new THREE.SphereGeometry(1, 20, 14), c, x, y, z); m.scale.set(a, b, d); return m; };
  box('#e6bf8b', 0, -.15, 0, 16, .3, 14);
  for (let i = -7; i <= 7; i++) box(i % 2 ? '#dab081' : '#edc99a', i, .008, 0, .96, .025, 13);
  box('#f4e8d1', 0, 3.4, -6.75, 16, 6.8, .35);
  box('#e8dac0', -7.75, 3.4, 0, .35, 6.8, 14);
  box('#f4e8d1', 7.75, 3.4, 0, .35, 6.8, 14);
  box('#e8dac0', 0, 3.4, 6.75, 16, 6.8, .35);
  box('#fff1d5', 0, 6.85, 0, 16, .2, 14);
  box('#99744e', 7.52, 1.8, HOME_DOOR.z, .10, 3.6, 1.8);
  orb('#e5c05d', 7.4, 1.65, HOME_DOOR.z - .55, .10, .10, .10);
  // Sunrise windows, a reading nook and a kitchen make this a real enclosed room.
  for (const x of [-3.4, 3.4]) {
    box('#b2976d', x, 3.6, -6.49, 3.4, 2.7, .16);
    box('#add4cb', x, 3.6, -6.37, 3.12, 2.42, .10);
    box('#fff3d5', x, 3.6, -6.26, .10, 2.5, .08);
    box('#fff3d5', x, 3.6, -6.26, 3.2, .10, .08);
    box('#d2a57c', x - 1.8, 3.7, -6.2, .35, 3.1, .27);
    box('#d2a57c', x + 1.8, 3.7, -6.2, .35, 3.1, .27);
  }
  box('#9b704b', -6.9, .9, 3.4, 1.0, 1.8, 3.8);
  box('#eee4cc', -6.8, 1.85, 3.4, 1.1, .12, 4);
  colliders.push({ kind: 'box', minY:0,maxY:1.95, minX: -7.5, maxX: -6.2, minZ: 1.4, maxZ: 5.5 });
  box('#c4d3b1', 0, .03, 3.9, 4.6, .05, 2.5);
  const gear = HOME_GEAR.map((id, i) => {
    const x = [-5, 0, 5][i % 3], z = i < 3 ? -4 : .1;
    box('#b38a5b', x, .65, z, 2.1, 1.3, 1.25);
    box('#e2c18f', x, 1.34, z, 2.2, .13, 1.35);
    colliders.push({ kind: 'box', minY:0,maxY:1.41, minX: x - 1.1, maxX: x + 1.1, minZ: z - .68, maxZ: z + .68 });
    const object = new THREE.Group(); group.add(object);
    const before = group.children.length;
    if (id === 'tent') {
      const bag = box('#d2ab6b', x, 1.65, z, 1.3, .5, .75); bag.rotation.z = .05;
      for (const s of [-1, 1]) box('#5e8268', x + s * .37, 1.65, z + .39, .08, .48, .04);
    } else if (id === 'bedding') {
      const roll = mesh(new THREE.CylinderGeometry(.34, .34, 1.35, 24), '#8cafa2', x, 1.75, z); roll.rotation.z = Math.PI / 2;
      box('#e7d6ad', x, 1.78, z + .35, .1, .55, .03);
    } else if (id === 'clothing') {
      box('#dea66b', x, 1.52, z, 1.1, .22, .8); box('#8ba99c', x - .05, 1.73, z, 1, .2, .78);
    } else if (id === 'cookware') {
      mesh(new THREE.CylinderGeometry(.42, .34, .4, 24), '#98aaa2', x, 1.61, z);
      orb('#b8c5bc', x, 1.83, z, .45, .06, .45); orb('#5b6c61', x, 1.91, z, .09, .07, .09);
    } else if (id === 'food') {
      box('#cba06b', x, 1.65, z, 1.2, .5, .8);
      for (let a = -1; a <= 1; a++) orb(a ? '#e49a69' : '#a8bc64', x + a * .31, 1.96, z, .2, .22, .2);
    } else {
      box('#b4c39b', x, 1.68, z, 1.05, .55, .72);
      box('#fff2d6', x, 1.68, z + .38, .12, .30, .025); box('#fff2d6', x, 1.68, z + .38, .32, .10, .025);
    }
    for (const child of group.children.slice(before)) object.attach(child);
    return { id, position: new THREE.Vector3(x, 0, z), object, packed: false };
  });
  const lamp = new THREE.PointLight('#ffe0a9', 65, 24, 1.1); lamp.position.set(0, 5.5, 0); group.add(lamp);
  orb('#ffedbd', 0, 5.7, 0, .55, .18, .55);
  return { group, gear, colliders, pack(id) { const item = gear.find(i => i.id === id); if (!item || item.packed) return false; item.packed = true; item.object.visible = false; return true; }, dispose() { group.removeFromParent(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); } };
}
