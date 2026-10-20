import test from 'node:test';
import assert from 'node:assert/strict';
import { outdoorCameraPosition } from '../src/camera.js';
const focus = { x: 0, y: 2, z: 0 }, desired = { x: 0, y: 7, z: 10 };
test('outdoor camera keeps its desired framing when there are no obstructions', () => {
  assert.deepEqual(outdoorCameraPosition(focus, desired), desired);
});
test('nearby canopy and trunk shorten the orbit instead of filling the screen', () => {
  const tree = { x: 0, y: 0, z: 8, h: 10, radius: .7, felled: false };
  const clipped = outdoorCameraPosition(focus, desired, { trees: [tree] });
  assert.ok(clipped.z < 8 && clipped.z > 0);
  assert.deepEqual(outdoorCameraPosition(focus, desired, { trees: [{ ...tree, felled: true }] }), desired);
});
test('mined rocks stop blocking the orbit camera and distant ones do not affect it', () => {
  const rock = { x: 0, y: 0, z: 7, radius: 5 };
  assert.ok(outdoorCameraPosition(focus, desired, { rocks: [rock] }).z < desired.z);
  assert.deepEqual(outdoorCameraPosition(focus, desired, { rocks: [{ ...rock, collider: { active: false } }] }), desired);
  assert.deepEqual(outdoorCameraPosition(focus, desired, { rocks: [{ ...rock, x: 100 }] }), desired);
});
test('orbit camera stays above climbing terrain with finite positions', () => {
  const result = outdoorCameraPosition(focus, desired, { groundHeight: () => 9 });
  assert.ok(result.y >= 9.65);
  assert.ok(Object.values(result).every(Number.isFinite));
});
