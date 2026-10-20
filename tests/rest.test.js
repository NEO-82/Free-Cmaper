import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCamper} from '../src/characters.js';
import {restStep,poseBedRest} from '../src/rest.js';

test('lying down bends into a seated pose before reclining face-up and putting the pack aside',()=>{
  const model=createCamper(new THREE.Scene());
  poseBedRest(model,0);assert.ok(Math.abs(model.body.rotation.x)<1e-8);assert.equal(model.backpack.visible,true);
  poseBedRest(model,.35);assert.ok(model.knees[0].rotation.x>1);assert.ok(model.body.rotation.x>-.2);
  poseBedRest(model,1);model.root.updateMatrixWorld(true);
  const direction=new THREE.Vector3(0,0,1).applyQuaternion(model.body.quaternion);
  assert.ok(direction.y>.99,'face points to the sky');assert.ok(model.knees[0].rotation.x<.1);assert.equal(model.backpack.visible,false);
  for(const p of [0,.25,.5,.75,1,.5,0]){poseBedRest(model,p);model.root.traverse(o=>assert.ok([...o.position,...o.quaternion].every(Number.isFinite)));}
  assert.ok(Math.abs(model.body.rotation.x)<1e-8);assert.equal(model.backpack.visible,true);model.dispose();
});

test('rest animation progresses continuously, reverses to get up, and freezes when paused',()=>{
  let progress=0;const values=[];
  for(let i=0;i<60;i++){progress=restStep(progress,1,1/30);values.push(progress);}
  assert.equal(progress,1);assert.ok(values.every((v,i)=>!i||v>=values[i-1]));assert.ok(values[20]>.2&&values[20]<1);
  assert.equal(restStep(.4,1,0),.4);
  for(let i=0;i<60;i++)progress=restStep(progress,0,1/30);
  assert.equal(progress,0);
});
