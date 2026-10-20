import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD, SHOP, SUMMIT, LAKE, terrainHeight, isWater, trailPoint, resolveMovement } from '../src/terrain.js';

const close = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be close to ${expected}`);

test('expanded map has twice the previous area and keeps the eastern sea', () => {
  const area = (WORLD.maxX - WORLD.minX) * (WORLD.maxZ - WORLD.minZ);
  assert.ok(area / (700 * 570) >= 1.99 && area / (700 * 570) <= 2.02);
  assert.ok((WORLD.maxX - WORLD.landMaxX) / (WORLD.maxX - WORLD.minX) > 0.3);
  assert.equal(isWater(WORLD.landMaxX + 15, 0), true);
  assert.equal(isWater(SHOP.x, SHOP.z), false);
});

test('mountain summit provides a genuinely flat campsite and shop grounds are level', () => {
  const height = terrainHeight(SUMMIT.x, SUMMIT.z);
  assert.ok(height >= 80 && height <= 95);
  for (const [dx, dz] of [[0, 0], [12, 0], [-12, 0], [0, 12], [0, -12], [8, 8]]) {
    close(terrainHeight(SUMMIT.x + dx, SUMMIT.z + dz), height);
    assert.equal(isWater(SUMMIT.x + dx, SUMMIT.z + dz), false);
  }
  for (const [x, z] of [[-45, -49], [-15, -49], [-45, -19], [-15, -19], [SHOP.x, SHOP.z]]) close(terrainHeight(x, z), 2.5);
});

test('terrain stays finite and has no discontinuous height jumps across nearby land samples', () => {
  for (let x = WORLD.minX + 20; x < WORLD.landMaxX - 10; x += 27) {
    for (let z = WORLD.minZ + 20; z < WORLD.maxZ - 20; z += 31) {
      if (isWater(x, z) || isWater(x + 0.01, z) || isWater(x, z + 0.01)) continue;
      const h = terrainHeight(x, z);
      assert.ok(Number.isFinite(h), `finite terrain at ${x},${z}`);
      assert.ok(Math.abs(h - terrainHeight(x + 0.01, z)) < 0.5, `continuous X at ${x},${z}`);
      assert.ok(Math.abs(h - terrainHeight(x, z + 0.01)) < 0.5, `continuous Z at ${x},${z}`);
    }
  }
});

test('hiking trail reaches the summit with intermediate points on traversable ground', () => {
  const start = trailPoint(0), end = trailPoint(1);
  close(start.x, -40); close(start.z, -56);
  close(end.x, SUMMIT.x); close(end.z, SUMMIT.z);
  for (let i = 0; i <= 40; i++) {
    const point = trailPoint(i / 40);
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.z));
    assert.equal(isWater(point.x, point.z), false);
  }
});

test('free mountain movement does not force hikers onto the marked trail', () => {
  const start = { x: -220, z: -100 };
  const next = resolveMovement(start, { x: 6, z: -6 });
  close(next.x, -214); close(next.z, -106);
  assert.ok(terrainHeight(next.x, next.z) > terrainHeight(SHOP.x, SHOP.z));
});

test('solid tree trunks stop head-on movement even for a large step', () => {
  const trunk = { kind: 'circle', x: 0, z: 0, radius: 1, active: true };
  const end = resolveMovement({ x: -8, z: 0 }, { x: 20, z: 0 }, [trunk], 0.55);
  assert.ok(end.x <= -1.55 + 1e-5, `tree cannot be crossed: ${end.x}`);
  assert.ok(Math.hypot(end.x, end.z) >= 1.55 - 1e-5);
});

test('tree collision permits sliding and felling makes its collider passable', () => {
  const trunk = { kind: 'circle', x: 0, z: 0, radius: 1, active: true };
  const slide = resolveMovement({ x: -2, z: 0 }, { x: 2, z: 1 }, [trunk], 0.55);
  assert.ok(slide.z > 0, 'tangential movement should continue');
  assert.ok(Math.hypot(slide.x, slide.z) >= 1.55 - 1e-5);
  trunk.active = false;
  const pass = resolveMovement({ x: -3, z: 0 }, { x: 6, z: 0 }, [trunk], 0.55);
  close(pass.x, 3); close(pass.z, 0);
});

test('building boxes block passage but allow movement along the wall', () => {
  const wall = { kind: 'box', minX: 0, maxX: 2, minZ: -2, maxZ: 2, active: true };
  const stopped = resolveMovement({ x: -3, z: 0 }, { x: 20, z: 0 }, [wall], 0.55);
  assert.ok(stopped.x <= -0.55 + 1e-5, `wall cannot be crossed: ${stopped.x}`);
  const slide = resolveMovement({ x: -1.5, z: 0 }, { x: 2, z: 1 }, [wall], 0.55);
  assert.ok(slide.x <= -0.55 + 1e-5);
  assert.ok(slide.z > 0);
});

test('world borders and water cannot be crossed by very large movement steps', () => {
  const edge = resolveMovement({ x: -340, z: -100 }, { x: -1000, z: 0 }, [], 0.55);
  assert.ok(edge.x >= WORLD.minX + 0.55 - 1e-5);
  const ocean = resolveMovement({ x: 90, z: 0 }, { x: 500, z: 0 }, [], 0.55);
  assert.equal(isWater(ocean.x, ocean.z), false);
  assert.ok(ocean.x < WORLD.landMaxX);
  const lake = resolveMovement({ x: LAKE.x, z: LAKE.z - LAKE.radiusZ - 12 }, { x: 0, z: 100 }, [], 0.55);
  assert.equal(isWater(lake.x, lake.z), false);
  assert.ok(lake.z < LAKE.z - LAKE.radiusZ, 'cannot tunnel through the southern lake');
});
