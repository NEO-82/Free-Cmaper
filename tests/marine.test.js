import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMarine, SEAFOOD } from '../src/marine.js';
import { terrainHeight } from '../src/terrain.js';

test('crabs, conches and lobsters can be collected once and stay hidden after world updates',()=>{
  const marine=createMarine(new THREE.Scene()),total=marine.getState().available;
  assert.equal(total,50);
  for(const kind of ['crab','conch','lobster']){
    assert.equal(SEAFOOD[kind].category,'ingredient');assert.equal(SEAFOOD[kind].edibleWhenPrepared,true);
    const item=marine.harvestables.find(g=>g.userData.kind===kind),near=item.position.clone();
    assert.equal(marine.collect(item,near.clone().add(new THREE.Vector3(20,0,0))),null);
    assert.equal(marine.collect(item,near.clone().add(new THREE.Vector3(0,10,0))),null);
    assert.deepEqual(marine.collect(item,near),{id:kind,count:1,category:'ingredient'});
    assert.equal(marine.collect(item,near),null);marine.update(1,100,near);assert.equal(item.visible,false);
  }
  assert.equal(marine.getState().available,total-3);
  assert.equal(marine.collect(marine.creatures.find(g=>g.userData.kind==='turtle'),new THREE.Vector3()),null);
  for(const item of marine.harvestables){assert.ok(item.position.y>=terrainHeight(item.position.x,item.position.z)-.2);}
});
test('collection rejects unknown objects and invalid positions without mutating available resources',()=>{
 const marine=createMarine(new THREE.Scene()),item=marine.harvestables[0];
 assert.equal(marine.collect({},new THREE.Vector3()),null);
 assert.equal(marine.collect(item,{x:NaN,y:0,z:0}),null);assert.equal(marine.collect(item,null),null);
 assert.equal(marine.getState().available,50);
});
