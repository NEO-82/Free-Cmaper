import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {shorelineX,shoreWaveHeight,foamFront,createShoreWaves}from '../src/shore-waves.js';
import {WORLD,terrainHeight}from '../src/terrain.js';

test('small shore waves follow the actual coastline and stay below sixteen centimetres',()=>{
 for(const z of [-1000,-600,0,450,1000]){
  const x=shorelineX(z);assert.ok(Math.abs(terrainHeight(x,z))<.001);
  for(let t=0;t<20;t+=.5)for(const d of [0,2,10,35,70]){const y=shoreWaveHeight(d,z,t);assert.ok(y>=.02&&y<=.16);}
  assert.equal(shoreWaveHeight(70,z,0),shoreWaveHeight(70,z,5));
  assert.ok(foamFront(z,1)>=.8&&foamFront(z,1)<=3.2);
 }
 assert.notEqual(shoreWaveHeight(2,0,0),shoreWaveHeight(2,0,1));
});
test('wave animation uses game time, remains frozen at the same time, and allocates no new geometry',()=>{
 const scene=new THREE.Scene(),waves=createShoreWaves(scene),geometry=waves.surface.geometry;
 waves.update(1);assert.equal(waves.getState().time,1);waves.update(1);assert.equal(waves.getState().time,1);
 waves.update(3);assert.equal(waves.getState().time,3);assert.equal(waves.surface.geometry,geometry);
 assert.ok(waves.getState().vertices<22000);waves.dispose();assert.equal(scene.children.length,0);
});
