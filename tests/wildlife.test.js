import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWildlife, animateWildlife, dangerHours, dangerEncounter, wildlifePosition, DANGEROUS_SPECIES } from '../src/wildlife.js';
import { WORLD, SHOP, SUMMIT, terrainHeight, isWater } from '../src/terrain.js';

test('day and night wildlife have distinct detailed grounded models on usable land', () => {
  const animals = createWildlife(new THREE.Scene()).filter(a=>!a.userData.dangerous);
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


test('ordinary wildlife positions change between sessions and accept a seeded random source',()=>{
  const random=seed=>()=>((seed=seed*16807%2147483647)-1)/2147483646;
  const a=createWildlife(new THREE.Scene(),{random:random(17)}),b=createWildlife(new THREE.Scene(),{random:random(31)}),same=createWildlife(new THREE.Scene(),{random:random(17)});
  assert.notDeepEqual(a.slice(0,12).map(g=>g.position.toArray()),b.slice(0,12).map(g=>g.position.toArray()));
  assert.deepEqual(a.slice(0,12).map(g=>g.position.toArray()),same.slice(0,12).map(g=>g.position.toArray()));
  assert.equal(a.filter(g=>g.userData.dangerous).length,3);
  assert.deepEqual(new Set(a.filter(g=>g.userData.dangerous).map(g=>g.userData.species)),new Set(DANGEROUS_SPECIES));
  for(const animal of a.filter(g=>g.userData.dangerous)){
    assert.equal(animal.visible,false);let meshes=0;animal.traverse(o=>{if(o.isMesh)meshes++;});assert.ok(meshes>=6);
    animal.updateMatrixWorld(true);assert.ok(Math.abs(new THREE.Box3().setFromObject(animal).min.y)<.04);
  }
});
test('danger appears only from 23:00 to 06:00 with a five percent hourly probability',()=>{
  for(const hour of [23,23.99,0,1,5,5.999]){assert.ok(dangerHours(hour));assert.ok(dangerEncounter({hour,random:()=>.04999}));assert.equal(dangerEncounter({hour,random:()=>.05}),false);}
  for(const hour of [6,12,20,22.999]){assert.equal(dangerHours(hour),false);assert.equal(dangerEncounter({hour,random:()=>0}),false);}
  assert.equal(dangerEncounter({hour:0,safe:true,random:()=>0}),false);assert.equal(dangerEncounter({hour:0,active:true,random:()=>0}),false);
  let spawned=0;for(let i=0;i<10000;i++)spawned+=Number(dangerEncounter({hour:23,random:()=>i/10000}));assert.equal(spawned,500);
  assert.equal(dangerEncounter({hour:23,clean:true,protectedCamp:true,random:()=>.005}),false);
  assert.ok(dangerEncounter({hour:23,clean:true,protectedCamp:true,random:()=>.00499}));
  assert.equal(wildlifePosition(()=>.5,{around:{x:0,y:0,z:0},colliders:[{kind:'box',minX:-50,maxX:50,minZ:-50,maxZ:50}]}),null);
});
