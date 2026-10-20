import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWildlife, animateWildlife } from '../src/wildlife.js';
import { WORLD, SHOP, SUMMIT, terrainHeight, isWater } from '../src/terrain.js';

test('day and night wildlife have distinct detailed grounded models on usable land', () => {
  const animals = createWildlife(new THREE.Scene());
  assert.equal(animals.length, 12);
  assert.equal(animals.filter(a => a.userData.nocturnal).length, 6);
  assert.deepEqual(new Set(animals.slice(0, 6).map(a => a.userData.species)), new Set(['deer', 'rabbit']));
  assert.deepEqual(new Set(animals.slice(6).map(a => a.userData.species)), new Set(['fox', 'owl']));
  for (const a of animals) {
    assert.equal(isWater(a.position.x, a.position.z), false);
    assert.ok(a.position.x > WORLD.minX && a.position.x < WORLD.landMaxX);
    assert.ok(a.position.z > WORLD.minZ && a.position.z < WORLD.maxZ);
    assert.ok(Math.hypot(a.position.x - SHOP.x, a.position.z - SHOP.z) > 26);
    assert.ok(Math.hypot(a.position.x - SUMMIT.x, a.position.z - SUMMIT.z) > SUMMIT.radius);
    assert.equal(a.userData.groundOffset, 0);
    a.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(a);
    assert.ok(Math.abs(bounds.min.y - terrainHeight(a.position.x, a.position.z)) < .04, `${a.userData.species} feet should touch terrain`);
    let meshes = 0; a.traverse(o => { if (o.isMesh) meshes++; });
    assert.ok(meshes >= 15 && meshes <= 34, `${a.userData.species} has intentional detail with bounded draw calls: ${meshes}`);
  }
});

test('wildlife idle animation is deterministic, finite, and leaves root locations unchanged', () => {
  const animals = createWildlife(new THREE.Scene()), before = animals.map(a => a.position.clone());
  animateWildlife(animals, 72, 1 / 60);
  const rotations = animals.map(a => a.userData.rig.head.rotation.toArray());
  animateWildlife(animals, 72, 1 / 60);
  assert.deepEqual(animals.map(a => a.userData.rig.head.rotation.toArray()), rotations);
  animals.forEach((a, i) => {
    assert.deepEqual(a.position.toArray(), before[i].toArray());
    a.traverse(o => { assert.ok([...o.position.toArray(), ...o.rotation.toArray().slice(0, 3), ...o.scale.toArray()].every(Number.isFinite)); });
  });
});
