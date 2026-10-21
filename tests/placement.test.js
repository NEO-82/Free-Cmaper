import test from 'node:test';
import assert from 'node:assert/strict';
import { footprintClear, findCampLocation } from '../src/placement.js';
import { WORLD, LAKE, SUMMIT, terrainHeight, isWater } from '../src/terrain.js';

const footprint = { x: 0, z: 0, width: 18, depth: 16 };

test('whole footprint rejects a tiny trunk between the old 5x5 sample points', () => {
  const tinyTrunk = { kind: 'circle', x: 2.25, z: 2, radius: .2, active: true };
  assert.equal(footprintClear(footprint, [tinyTrunk]), false);
  assert.equal(footprintClear(footprint, [{ ...tinyTrunk, active: false }]), true);
  assert.equal(footprintClear(footprint, [{ ...tinyTrunk, x: 12, z: 0 }]), true);
  assert.equal(footprintClear(footprint, [{ ...tinyTrunk, x: 9.7, z: 0 }]), false);
});

test('full rectangle detects a wall cutting across its centre and respects clearance', () => {
  assert.equal(footprintClear(footprint, [{ kind: 'box', minX: -20, maxX: 20, minZ: -.1, maxZ: .1 }]), false);
  assert.equal(footprintClear(footprint, [{ kind: 'box', minX: 9.3, maxX: 10, minZ: -1, maxZ: 1 }]), false);
  assert.equal(footprintClear(footprint, [{ kind: 'box', minX: 9.3, maxX: 10, minZ: -1, maxZ: 1 }], 0), true);
  assert.equal(footprintClear(footprint, [{ kind: 'box', minX: 9.3, maxX: 10, minZ: -1, maxZ: 1, active: false }]), true);
});

test('reproduced tree-1 position cannot be covered by a new campsite', () => {
  const player = { x: 12.521620592355362, z: -152.85900416770858 };
  const trunk = { kind: 'circle', x: player.x + 11.75, z: player.z - 2, radius: .8, active: true };
  const oldCandidate = { x: player.x + 14, z: player.z, width: 18, depth: 16 };
  assert.equal(footprintClear(oldCandidate, [trunk]), false);
  const result = findCampLocation(player, { size: 'standard' }, [trunk]);
  if (result) assert.equal(footprintClear({ ...result, width: 9, depth: 8 }, [trunk]), true);
});

test('summit supports standard and family tents while the sign remains solid', () => {
  const sign = { kind: 'circle', x: SUMMIT.x - 13, z: SUMMIT.z + 13, radius: .18, active: true };
  for (const [size, scale] of [['standard', 1], ['family', 1.5]]) {
    const result = findCampLocation(SUMMIT, { size }, [sign]);
    assert.ok(result, size);
    assert.ok(result.y >= SUMMIT.height);
    assert.equal(footprintClear({ ...result, width: 9 * scale, depth: 8 * scale }, [sign]), true);
    assert.ok(Math.abs(result.y - terrainHeight(result.x, result.z)) < 1.6);
  }
});

test('camps cannot be placed in the sea, lake, outside the map or wholly blocked sites', () => {
  assert.equal(findCampLocation({ x: WORLD.landMaxX + 50, z: 0 }), null);
  assert.equal(findCampLocation({ x: LAKE.x, z: LAKE.z }), null);
  assert.equal(findCampLocation({ x: WORLD.minX - 50, z: 0 }), null);
  assert.equal(findCampLocation(SUMMIT, {}, [{ kind: 'box', minX:SUMMIT.x-100,maxX:SUMMIT.x+100,minZ:SUMMIT.z-100,maxZ:SUMMIT.z+100 }]), null);
  assert.equal(findCampLocation({ x: NaN, z: 0 }), null);
  assert.equal(footprintClear({ ...footprint, width: -1 }), false);
  const result = findCampLocation(SUMMIT);
  assert.ok(result && !isWater(result.x, result.z));
});
