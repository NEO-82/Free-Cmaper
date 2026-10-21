import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGroundCover} from '../src/groundcover.js';

test('half-density grass is visible further away and covers new areas while keeping a bounded reusable tile pool',()=>{
  const scene=new THREE.Scene(),geometry=new THREE.PlaneGeometry(.1,.4),material=new THREE.MeshBasicMaterial();
  const cover=createGroundCover(scene,{geometry,material,heightAt:()=>2,allowed:()=>true});
  cover.update({x:0,z:0});assert.equal(cover.getState().density,.75);assert.ok(cover.getState().viewDistance>120);assert.ok(cover.getState().tufts>10000);const allocated=cover.root.children.length;
  for(let i=1;i<20;i++)cover.update({x:i*100,z:-i*70});
  assert.equal(cover.root.children.length,allocated);assert.equal(cover.getState().tiles,allocated);
  cover.update({x:0,z:0},{minX:-200,maxX:200,minZ:-200,maxZ:200});assert.equal(cover.getState().tufts,0,'grass is cleared under a tent footprint');
  cover.update({x:0,z:0});assert.ok(cover.getState().tufts>10000);
  cover.dispose();geometry.dispose();material.dispose();assert.equal(scene.children.length,0);
});
