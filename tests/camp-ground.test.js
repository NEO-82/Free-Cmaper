import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {setCampGround,getCampGround,insideCampGround}from '../src/camp-ground.js';
import {createCampGroundView}from '../src/camp-ground-view.js';
import {baseTerrainHeight,terrainHeight}from '../src/terrain.js';
import {naturalPathSurfaceHeight,pathSurfaceHeight,pathUnderlayHeight}from '../src/paths.js';
import {findCampLocation}from '../src/placement.js';
import {sampleWheelGround}from '../src/vehicle-physics.js';
import {VEHICLES}from '../src/vehicles.js';
import {createPerson,stepPerson}from '../src/person-physics.js';
import {createTent}from '../src/structures.js';
test.afterEach(()=>setCampGround(null));

test('all tent sizes level a slope to the entrance, rather than to its highest corner',()=>{
 for(const size of ['standard','large','family']){
  const location=findCampLocation({x:-300,z:-250},{size});assert.ok(location);
  const p=location.foundation;assert.equal(location.y,naturalPathSurfaceHeight(p.anchor.x,p.anchor.z));
  const original=[];for(const x of [-p.width/2,0,p.width/2])for(const z of [-p.depth/2,0,p.depth/2])original.push(naturalPathSurfaceHeight(p.x+x,p.z+z));
  assert.ok(Math.max(...original)-Math.min(...original)>1.6);
  assert.notEqual(location.y,Math.max(...original));setCampGround(p);
  for(let x=-p.width/2;x<=p.width/2;x+=.25)for(let z=-p.depth/2;z<=p.depth/2;z+=.25){
    assert.equal(terrainHeight(p.x+x,p.z+z),location.y);assert.equal(pathSurfaceHeight(p.x+x,p.z+z),location.y);assert.equal(pathUnderlayHeight(p.x+x,p.z+z),location.y);
  }
  assert.equal(terrainHeight(p.x+p.width/2+.01,p.z),baseTerrainHeight(p.x+p.width/2+.01,p.z));
  const tent=createTent(new THREE.Scene(),{size},location);assert.equal(tent.group.position.y,p.y);assert.equal(tent.floorY,p.y+.14);tent.dispose();setCampGround(null);
 }
});
test('moving or clearing camp restores the original ground and preserves unrelated land',()=>{
 const first=findCampLocation({x:-300,z:-250}).foundation,second=findCampLocation({x:80,z:-200}).foundation;
 const old=terrainHeight(first.x,first.z),remote=terrainHeight(900,600);
 setCampGround(first);assert.equal(terrainHeight(first.x,first.z),first.y);assert.equal(terrainHeight(900,600),remote);
 setCampGround(second);assert.equal(terrainHeight(first.x,first.z),old);assert.equal(terrainHeight(second.x,second.z),second.y);
 setCampGround(null);assert.equal(terrainHeight(second.x,second.z),baseTerrainHeight(second.x,second.z));assert.equal(getCampGround(),null);
});
test('footprint respects the tent rotation and character and wheel contacts use the same plane',()=>{
 const p={x:80,z:-200,y:7,width:13.5,depth:12,rotation:.7};setCampGround(p);
 const point=(x,z)=>({x:p.x+Math.cos(p.rotation)*x+Math.sin(p.rotation)*z,z:p.z-Math.sin(p.rotation)*x+Math.cos(p.rotation)*z});
 assert.ok(insideCampGround(...Object.values(point(0,5))));assert.equal(insideCampGround(...Object.values(point(7,0))),false);
 let person={...createPerson({x:p.x,z:p.z,y:10}),grounded:false};
 for(let i=0;i<180;i++)person=stepPerson(person,{},1/120,{heightAt:pathSurfaceHeight,waterAt:()=>false,slopeAt:()=>0});
 assert.equal(person.y,p.y);assert.ok(person.grounded);
 const wheels=sampleWheelGround({x:p.x,z:p.z,heading:.7},VEHICLES.suv,pathSurfaceHeight);assert.ok(wheels.wheels.every(w=>w.height===p.y));assert.ok(Math.abs(wheels.pitch)<1e-12);assert.ok(Math.abs(wheels.roll)<1e-12);
});
test('rendered pad cuts the original mesh only inside its footprint and fills down to the existing surface',()=>{
 const parent=new THREE.Scene(),geometry=new THREE.PlaneGeometry(40,40,8,8);geometry.rotateX(-Math.PI/2);
 const vertices=geometry.attributes.position;for(let i=0;i<vertices.count;i++)vertices.setY(i,vertices.getX(i)*.4+vertices.getZ(i)*.2);geometry.computeVertexNormals();
 const original=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));parent.add(original);
 const view=createCampGroundView(parent,{baseHeightAt:(x,z)=>x*.4+z*.2});view.maskMesh(original);
 const p={x:0,z:0,y:0,width:9,depth:8,rotation:0};view.setPatch(p);parent.updateMatrixWorld(true);
 const height=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x,50,z),new THREE.Vector3(0,-1,0)).intersectObject(parent,true)[0]?.point.y;
 for(const x of [-4,0,4])for(const z of [-3,0,3])assert.ok(Math.abs(height(x,z))<1e-6);
 assert.ok(Math.abs(height(6,0)-2.4)<1e-6);
 const skirt=view.root.getObjectByName('camp-cut-and-fill').geometry.attributes.position;
 assert.ok(Array.from({length:skirt.count},(_,i)=>skirt.getY(i)).some(y=>y<0));assert.ok(Array.from({length:skirt.count},(_,i)=>skirt.getY(i)).some(y=>y>0));
 view.setPatch(null);assert.ok(Math.abs(height(4,2)-2)<1e-6);assert.equal(view.root.children.length,0);
 view.dispose();geometry.dispose();original.material.dispose();
});
