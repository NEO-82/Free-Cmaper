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

test('tent standard size is half the former width and a person can walk through its opening', () => {
  const scene = new THREE.Scene(), tent = createTent(scene, DEFAULT_TENT, { x: 20, y: 10, z: 30 });
  assert.equal(tent.dimensions.width, 9);
  assert.equal(tent.dimensions.depth, 8);
  assert.equal(tent.dimensions.height,5);
  assert.equal(tent.floorY, 10.14);
  assert.equal(blocksPoint(tent.colliders(), 20, 34), true);
  tent.setDoor(true);
  assert.equal(blocksPoint(tent.colliders(), 20, 34), false);
  assert.equal(blocksPoint(tent.colliders(), 24.5, 30), true);
  assert.equal(blocksPoint(tent.colliders(), 20, 26), true);
  assert.equal(tent.isInside(tent.insidePosition.x, tent.insidePosition.z), true);
  assert.equal(blocksPoint(tent.colliders(), tent.insidePosition.x, tent.insidePosition.z), false);
  assert.equal(blocksPoint(tent.colliders(), 20 - 9 * .29, 30 - 8 * .12), true);
  assert.equal(tent.isInside(tent.entrance.x, tent.entrance.z), false);
  tent.setDoor(false);
  assert.equal(blocksPoint(tent.colliders(), 20, 34), true);
  tent.dispose(); assert.equal(scene.children.length, 0);
});

test('every selectable tent type, size, color and material creates a complete independent model', () => {
  const scene = new THREE.Scene();
  for (const type of TENT_OPTIONS.type) for (const size of TENT_OPTIONS.size) {
    const config = { type, size, color: 'rust', material: 'ripstop' }, tent = createTent(scene, config, { x: 0, y: 0, z: 0 });
    assert.deepEqual(tent.config, config);
    assert.ok(tent.group.children.length > 30);
    assert.ok(tent.dimensions.width >= 9);
    assert.equal(tent.interiorTargets.length, 4);
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
  assert.equal(blocksPoint(tent.colliders(), 104, 50), true);
  tent.setDoor(true);
  assert.equal(blocksPoint(tent.colliders(), 104, 50), false);
  tent.dispose();
});


test('halved tent keeps a usable doorway for the largest camper collision capsule', async () => {
  const {resolveMovement}=await import('../src/terrain.js');
  const tent=createTent(new THREE.Scene(),DEFAULT_TENT,{x:0,y:0,z:0});
  const start={x:0,z:6},delta={x:0,z:-4};
  const closed=resolveMovement(start,delta,tent.colliders(),.55);assert.ok(closed.z>4.6);
  tent.setDoor(true);const entered=resolveMovement(start,delta,tent.colliders(),.55);assert.ok(entered.z<3);
  assert.ok(tent.dimensions.height>=3);tent.dispose();
});


test('shop keeps a solid visible ceiling and warm lamps after entering and leaving', () => {
  const shop=createShop(new THREE.Scene(),{x:0,y:0,z:0});
  for(const inside of [false,true,false,true]){shop.setInterior(inside);assert.equal(shop.roof.visible,true);assert.equal(shop.ceiling.visible,true);}
  assert.ok(shop.interiorLights.length>=2);assert.ok(shop.interiorLights.every(l=>l.intensity>0&&l.position.y>4));
  shop.group.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(0,2,0),new THREE.Vector3(0,1,0));
  assert.ok(ray.intersectObject(shop.ceiling).length>0,'looking up indoors hits a real ceiling');shop.dispose();
});

test('both beds look through actual transparent skylights for every tent shape', () => {
  for(const type of TENT_OPTIONS.type){
    const tent=createTent(new THREE.Scene(),{...DEFAULT_TENT,type},{x:20,y:10,z:30,rotation:.4});tent.group.updateMatrixWorld(true);
    for(const bed of tent.interiorTargets.filter(i=>i.id.startsWith('tent-bedding'))){
      assert.equal(tent.isInside(bed.restPosition.x,bed.restPosition.z),true);
      const ray=new THREE.Raycaster(bed.eyePosition,new THREE.Vector3(0,1,0));const hits=ray.intersectObject(tent.shell,true);
      assert.ok(hits.length>0);assert.equal(hits[0].object,tent.skylight);assert.ok(hits[0].object.material.opacity<.3);
    }tent.dispose();
  }
});
