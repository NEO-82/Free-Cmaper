import * as THREE from 'three';
import { WORLD, SHOP, SUMMIT, terrainHeight, isWater } from './terrain.js';

/** Locally modelled, stylized wildlife. Roots sit on the terrain, feet at y=0. */
export function createWildlife(scene) {
  const sphere = new THREE.SphereGeometry(1, 14, 10);
  const cone = new THREE.ConeGeometry(1, 1, 8);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 7);
  const palette = {};
  const mat = color => palette[color] ??= new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const piece = (parent, color, position, scale, geometry = sphere) => {
    const mesh = new THREE.Mesh(geometry, mat(color)); mesh.position.set(...position); mesh.scale.set(...scale);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const groupAt = (parent, x, y, z) => { const group = new THREE.Group(); group.position.set(x, y, z); parent.add(group); return group; };
  const eyes = (parent, x, y, z, size = 0.06) => {
    for (const side of [-1, 1]) {
      piece(parent, '#252b27', [x * side, y, z], [size, size * 1.1, size * 0.75]);
      piece(parent, '#fff8df', [x * side - size * 0.2, y + size * 0.3, z + size * 0.65], [size * 0.28, size * 0.28, size * 0.2]);
    }
  };
  function deer(root) {
    piece(root, '#b98b50', [0, 1.13, -0.18], [.46, .54, .86]);
    piece(root, '#e5cda3', [0, 1.15, .34], [.28, .38, .32]);
    for (const x of [-.27, .27]) for (const z of [-.65, .33]) {
      piece(root, '#986d40', [x, .5, z], [.1, .6, .1], cylinder);
      piece(root, '#4a4236', [x, .105, z + .025], [.12, .105, .17]);
    }
    const neck = piece(root, '#b98b50', [0, 1.58, .45], [.22, .51, .24]); neck.rotation.x = -.28;
    const head = groupAt(root, 0, 1.97, .65);
    piece(head, '#c69a61', [0, .1, .02], [.27, .35, .34]);
    piece(head, '#e5cda3', [0, -.02, .32], [.2, .17, .3]);
    piece(head, '#443c31', [0, .01, .56], [.12, .075, .075]);
    eyes(head, .18, .17, .25, .049);
    for (const side of [-1, 1]) {
      const ear = piece(head, '#b98b50', [side * .32, .35, -.05], [.13, .29, .07]); ear.rotation.z = side * -.9;
      const antler = groupAt(head, side * .16, .4, -.12);
      const stem = piece(antler, '#e4d6aa', [side * .07, .27, -.02], [.035, .55, .035], cylinder); stem.rotation.z = side * -.3;
      const tine = piece(antler, '#e4d6aa', [side * .18, .35, -.02], [.03, .27, .03], cylinder); tine.rotation.z = side * -1.1;
    }
    const tail = piece(root, '#e5cda3', [0, 1.3, -.98], [.17, .13, .28]); tail.rotation.x = .25;
    return { head, tail };
  }
  function rabbit(root) {
    piece(root, '#dbc9a8', [0, .43, -.18], [.36, .42, .49]);
    piece(root, '#f2e5cb', [0, .37, .2], [.27, .3, .27]);
    for (const x of [-.21, .21]) {
      piece(root, '#b9a888', [x, .1, .1], [.17, .1, .27]);
      piece(root, '#c8b79a', [x * 1.05, .16, -.44], [.19, .16, .24]);
    }
    const head = groupAt(root, 0, .74, .3);
    piece(head, '#e3d3b5', [0, 0, 0], [.29, .27, .29]);
    const ears = [];
    for (const side of [-1, 1]) {
      const ear = groupAt(head, side * .12, .2, -.08); ear.rotation.z = side * -.12;
      piece(ear, '#d6c3a2', [0, .32, 0], [.095, .36, .085]);
      piece(ear, '#d5a5a0', [0, .33, .062], [.054, .26, .026]); ears.push(ear);
      piece(head, '#f5ecd9', [side * .09, -.075, .24], [.1, .08, .07]);
    }
    eyes(head, .19, .06, .2, .047);
    piece(head, '#b98079', [0, -.01, .292], [.045, .035, .026]);
    piece(root, '#f5ecd9', [0, .5, -.62], [.16, .16, .16]);
    return { head, ears };
  }
  function fox(root) {
    piece(root, '#c87834', [0, .67, -.12], [.34, .35, .68]);
    piece(root, '#f1dec1', [0, .64, .36], [.24, .27, .3]);
    for (const x of [-.22, .22]) for (const z of [-.5, .34]) {
      piece(root, '#513e31', [x, .24, z], [.085, .43, .085], cylinder);
      piece(root, '#493a2e', [x, .07, z + .05], [.1, .07, .15]);
    }
    const head = groupAt(root, 0, 1.01, .56);
    piece(head, '#d38b43', [0, 0, 0], [.3, .29, .34]);
    const snout = piece(head, '#f4e6cd', [0, -.06, .29], [.19, .15, .25]);
    snout.rotation.x = .06;
    piece(head, '#342e2a', [0, -.035, .5], [.07, .05, .055]);
    for (const side of [-1, 1]) {
      const ear = piece(head, '#a55c2e', [side * .21, .29, -.08], [.15, .34, .14], cone); ear.rotation.z = side * -.24;
      const inner = piece(head, '#e5be99', [side * .21, .29, .005], [.085, .22, .06], cone); inner.rotation.z = side * -.24;
    }
    eyes(head, .19, .08, .25, .045);
    const tail = groupAt(root, 0, .74, -.62); tail.rotation.x = -.32;
    piece(tail, '#c87834', [0, -.02, -.4], [.23, .24, .54]);
    piece(tail, '#f4e6cd', [0, -.035, -.78], [.17, .18, .27]);
    return { head, tail };
  }
  function owl(root) {
    piece(root, '#867552', [0, .54, 0], [.37, .52, .3]);
    piece(root, '#d7c99c', [0, .51, .21], [.27, .37, .11]);
    for (const x of [-.13, .13]) {
      piece(root, '#c59c55', [x, .06, .12], [.13, .06, .2]);
    }
    const head = groupAt(root, 0, .96, .02);
    piece(head, '#8b7b58', [0, 0, 0], [.42, .35, .31]);
    for (const x of [-.18, .18]) {
      piece(head, '#e3d8af', [x, .015, .245], [.18, .21, .08]);
      piece(head, '#c29130', [x, .025, .314], [.095, .11, .045]);
      piece(head, '#242c28', [x, .025, .35], [.048, .078, .025]);
      piece(head, '#fffbe4', [x - .018, .055, .369], [.016, .025, .01]);
    }
    const beak = piece(head, '#d7a64f', [0, -.1, .34], [.07, .15, .1], cone); beak.rotation.x = Math.PI;
    const wings = [];
    for (const side of [-1, 1]) {
      const wing = groupAt(root, side * .3, .76, -.04); wing.rotation.z = side * .1;
      piece(wing, '#675f48', [side * .05, -.2, 0], [.14, .36, .24]); wings.push(wing);
    }
    piece(root, '#675f48', [0, .31, -.31], [.18, .1, .25]);
    return { head, wings };
  }
  let seed = 54721;
  const rand = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  const animals = [];
  for (let i = 0; i < 12; i++) {
    const root = new THREE.Group(); root.name = `wildlife-${i}`;
    const nocturnal = i >= 6, type = nocturnal ? i % 2 ? 'owl' : 'fox' : i % 2 ? 'rabbit' : 'deer';
    const rig = ({ deer, rabbit, fox, owl })[type](root);
    let x, z;
    for (let attempt = 0; attempt < 1000; attempt++) {
      x = WORLD.minX + 35 + rand() * (WORLD.landMaxX - WORLD.minX - 70);
      z = WORLD.minZ + 35 + rand() * (WORLD.maxZ - WORLD.minZ - 70);
      if (!isWater(x, z) && Math.hypot(x - SHOP.x, z - SHOP.z) > 26 && Math.hypot(x - SUMMIT.x, z - SUMMIT.z) > SUMMIT.radius + 12) break;
    }
    // A pair near the starting woodland makes the new models discoverable.
    if (i === 1) { x = -55; z = -6; }
    if (i === 6) { x = -67; z = 19; }
    root.position.set(x, terrainHeight(x, z), z); root.rotation.y = rand() * Math.PI * 2;
    root.userData = { nocturnal, species: type, groundOffset: 0, rig, phase: rand() * Math.PI * 2 };
    root.visible = !nocturnal; scene.add(root); animals.push(root);
  }
  return animals;
}

/** Subtle local animation only; caller controls time and freezes it with the world. */
export function animateWildlife(animals, time, dt = 0) {
  for (const animal of animals) {
    const { rig, phase, species } = animal.userData, t = time * 0.8 + phase;
    rig.head.rotation.y = Math.sin(t * .7) * .14;
    rig.head.rotation.x = Math.sin(t) * (species === 'owl' ? .045 : .025);
    if (rig.tail) rig.tail.rotation.z = Math.sin(t * 1.8) * .1;
    if (rig.ears) rig.ears.forEach((ear, i) => { ear.rotation.z = (i ? -1 : 1) * .12 + Math.sin(t * 2 + i) * .055; });
    if (rig.wings) rig.wings.forEach((wing, i) => { wing.rotation.z = (i ? -1 : 1) * (.1 + Math.sin(t) * .025); });
  }
}
