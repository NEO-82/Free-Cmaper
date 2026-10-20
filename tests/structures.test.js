import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createShop, createTent, DEFAULT_TENT, TENT_OPTIONS, tentDimensions, normalizeTentConfig } from '../src/structures.js';

function blocksPoint(colliders, x, z) {
  return colliders.some(c => c.active && c.kind === 'box' && x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ);
}

test('shop doorway changes solidity while walls and furniture remain solid', () => {
  const scene = new THREE.Scene(), shop = createShop(scene, { x: -30, y: 4, z: -35 });
  assert.equal(blocksPoint(shop.colliders(), -30, -26.5), true);
  assert.equal(shop.isInside(-30, -28), true);
  assert.equal(shop.isInside(-30, -24), false);
  shop.setDoor(true);
  assert.equal(shop.doorOpen, true);
  assert.equal(blocksPoint(shop.colliders(), -30, -26.5), false);
  assert.equal(blocksPoint(shop.colliders(), -40, -35), true);
  assert.equal(blocksPoint(shop.colliders(), -27, -38.8), true);
  assert.equal(blocksPoint(shop.colliders(), -39, -23.6), true);
  shop.setDoor(false);
  assert.equal(blocksPoint(shop.colliders(), -30, -26.5), true);
  assert.ok(shop.ownerPosition.z < shop.entrance.z);
  shop.dispose(); assert.equal(scene.children.length, 0);
});

test('tent standard size is three times former width and a person can walk through its opening', () => {
  const scene = new THREE.Scene(), tent = createTent(scene, DEFAULT_TENT, { x: 20, y: 10, z: 30 });
  assert.equal(tent.dimensions.width, 18);
  assert.equal(tent.dimensions.depth, 16);
  assert.equal(tent.floorY, 10.14);
  assert.equal(blocksPoint(tent.colliders(), 20, 38), true);
  tent.setDoor(true);
  assert.equal(blocksPoint(tent.colliders(), 20, 38), false);
  assert.equal(blocksPoint(tent.colliders(), 29, 30), true);
  assert.equal(blocksPoint(tent.colliders(), 20, 22), true);
  assert.equal(tent.isInside(tent.insidePosition.x, tent.insidePosition.z), true);
  assert.equal(blocksPoint(tent.colliders(), tent.insidePosition.x, tent.insidePosition.z), false);
  assert.equal(blocksPoint(tent.colliders(), 20 - 18 * .29, 30 - 16 * .12), true);
  assert.equal(tent.isInside(tent.entrance.x, tent.entrance.z), false);
  tent.setDoor(false);
  assert.equal(blocksPoint(tent.colliders(), 20, 38), true);
  tent.dispose(); assert.equal(scene.children.length, 0);
});

test('every selectable tent type, size, color and material creates a complete independent model', () => {
  const scene = new THREE.Scene();
  for (const type of TENT_OPTIONS.type) for (const size of TENT_OPTIONS.size) {
    const config = { type, size, color: 'rust', material: 'ripstop' }, tent = createTent(scene, config, { x: 0, y: 0, z: 0 });
    assert.deepEqual(tent.config, config);
    assert.ok(tent.group.children.length > 30);
    assert.ok(tent.dimensions.width >= 18);
    assert.equal(tent.interiorTargets.length, 3);
    tent.setInterior(true); assert.equal(tent.shell.visible, true);
    tent.dispose();
  }
  assert.ok(tentDimensions({ size: 'family' }).width > tentDimensions({ size: 'large' }).width);
  assert.deepEqual(normalizeTentConfig({ size: 'huge', type: 'bad', color: 'bad' }), DEFAULT_TENT);
  assert.equal(scene.children.length, 0);
});

test('rotated tent doorway and inside coordinates agree in world space', () => {
  const scene = new THREE.Scene();
  const tent = createTent(scene, DEFAULT_TENT, { x: 100, y: 0, z: 50, rotation: Math.PI / 2 });
  assert.equal(tent.isInside(tent.insidePosition.x, tent.insidePosition.z), true);
  assert.equal(blocksPoint(tent.colliders(), tent.insidePosition.x, tent.insidePosition.z), false);
  assert.equal(tent.isInside(tent.entrance.x, tent.entrance.z), false);
  assert.equal(blocksPoint(tent.colliders(), 108, 50), true);
  tent.setDoor(true);
  assert.equal(blocksPoint(tent.colliders(), 108, 50), false);
  tent.dispose();
});
