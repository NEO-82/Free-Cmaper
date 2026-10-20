import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {treePlatforms,rockSurface}from '../src/climbing.js';
import {createPerson,jumpPerson,stepPerson}from '../src/person-physics.js';
const flat={heightAt:()=>0,slopeAt:()=>0,waterAt:()=>false};
function simulate(p,seconds,colliders,input={}){for(let i=0;i<seconds*120;i++)p=stepPerson(p,input,1/120,{...flat,colliders});return p;}

test('jumping from branch to branch reaches the crown, and walking off or felling causes a fall',()=>{
 for(const h of [7.5,10.5,15.5]){
  const tree={id:'tree',x:0,y:0,z:0,radius:.7,h},platforms=treePlatforms(tree),trunk={kind:'circle',id:'tree',x:0,z:0,radius:.7,minY:0,maxY:h};
  const colliders=[trunk,...platforms];let p=createPerson({x:1.8,y:0,z:0});
  assert.equal(simulate(p,.2,colliders).y,0,'walking beneath a branch does not teleport upwards');
  for(let i=0;i<platforms.length+1;i++){
   assert.ok(jumpPerson(p));p=simulate(p,1.7,colliders);assert.ok(p.grounded);
   if(p.supportId==='tree-crown')break;
  }
  assert.equal(p.supportId,'tree-crown');assert.equal(p.y,platforms.at(-1).maxY);
  const top=p.y;p=simulate(p,.8,colliders,{x:1,speed:8});assert.ok(p.y<top);assert.ok(p.x>4);
  p={...createPerson({x:platforms[0].x,y:platforms[0].maxY,z:0}),supportId:platforms[0].id};
  colliders.forEach(c=>c.active=false);p=simulate(p,1,colliders);assert.equal(p.y,0);assert.equal(p.supportId,null);
 }
});
test('characters land on the rendered rock surface and can jump onto it without passing through its sides',()=>{
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),new THREE.MeshBasicMaterial());mesh.position.y=1;mesh.scale.set(1.5,1,1);mesh.rotation.y=.3;
 const collider={id:'rock',kind:'circle',x:0,z:0,radius:1.5,minY:0,active:true,...rockSurface(mesh)};
 let p=simulate({...createPerson({x:0,y:4,z:0}),grounded:false},1,[collider]);assert.ok(Math.abs(p.y-2)<.001);assert.equal(p.supportId,'rock');
 p=createPerson({x:-3,y:0,z:0});p.vx=5;jumpPerson(p);p=simulate(p,.65,[collider],{x:1,speed:5});p.vx=p.vz=0;p=simulate(p,1,[collider]);assert.equal(p.supportId,'rock');assert.ok(Math.abs(p.y-collider.surfaceAt(p.x,p.z))<.001);
 p=simulate(createPerson({x:-3,y:0,z:0}),.8,[collider],{x:1,speed:8});assert.ok(p.x<-1,'solid rock still blocks walking through it');
 collider.active=false;p=simulate({...createPerson({x:0,y:2,z:0}),supportId:'rock'},1,[collider]);assert.equal(p.y,0);
 mesh.geometry.dispose();mesh.material.dispose();
});
