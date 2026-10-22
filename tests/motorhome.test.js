import test from 'node:test';
import * as THREE from 'three';
import assert from 'node:assert/strict';
import { createMotorhomeInterior, normalizeInterior, MOTORHOME_SIZE, motorhomeBoarding } from '../src/motorhome.js';
import { VEHICLES, stepDrive } from '../src/vehicles.js';
import { TRAVEL_CHOICES, isPrivateVehicle } from '../src/journey.js';

test('vehicles have fifty percent higher speed limits and motorhome is a compact private travel option',()=>{
  assert.deepEqual(['sedan','suv','scooter','motorhome'].map(k=>VEHICLES[k].maxSpeed),[96,84,60,72]);
  assert.ok(TRAVEL_CHOICES.includes('motorhome'));assert.ok(isPrivateVehicle('motorhome'));
  assert.deepEqual(MOTORHOME_SIZE,{width:4.18,length:8.8,height:4.51});
  assert.equal(VEHICLES.motorhome.wheelBase,5.61);assert.equal(VEHICLES.motorhome.track,3.41);
  for(const kind of Object.keys(VEHICLES)){
    let s={kind,x:0,z:0,heading:0,speed:0};
    // Keep sampling flat, open terrain so the test measures the drivetrain.
    for(let i=0;i<600;i++)s={...stepDrive({...s,x:0,z:0},{forward:true},1/60,[],{heightAt:()=>0}),x:0,z:0};
    assert.ok(Math.abs(s.speed-VEHICLES[kind].maxSpeed)<.01);
  }
});
test('both layouts let the player reach every facility without crossing cabinets or walls',()=>{
  for(const layout of ['left','right']){
    const room=createMotorhomeInterior({layout});
    assert.ok(room.canStand(room.position.x,room.position.z),'actual entry spawn must be collision free');
    const entry=room.position.clone();room.move(0,1.2);assert.ok(room.position.z>entry.z+1.19,'forward movement into the aisle is clear in both layouts');room.position.copy(entry);room.move(-.5,0);assert.ok(room.position.x<entry.x-.49,'can walk away from the door immediately');room.position.copy(entry);
    const queue=[{x:entry.x,z:entry.z}],seen=new Set(),reachable=[];
    while(queue.length){
      const p=queue.shift(),key=`${p.x.toFixed(2)}:${p.z.toFixed(2)}`;if(seen.has(key))continue;seen.add(key);reachable.push(p);
      for(const [dx,dz]of[[.15,0],[-.15,0],[0,.15],[0,-.15]]){
        room.position.set(p.x,0,p.z);room.move(dx,dz);
        if(Math.hypot(room.position.x-p.x,room.position.z-p.z)>.149)queue.push({x:room.position.x,z:room.position.z});
      }
    }
    for(const target of room.targets)assert.ok(reachable.some(p=>Math.hypot(target.x-p.x,target.z-p.z)<1.15),target.id);
    room.position.set(0,0,.8);room.move(100,100);assert.ok(Math.abs(room.position.x)<=1.45&&Math.abs(room.position.z)<=2.65);
    room.position.set(0,0,.8);room.toggleRest();room.move(1,1);assert.deepEqual(room.position.toArray(),[0,0,.8]);room.toggleRest();
    room.configure({wood:'walnut',bedding:'blue',layout});assert.equal(room.settings.wood,'walnut');assert.equal(room.settings.bedding,'blue');
    assert.ok(room.scene.getObjectByName('toilet bowl'));assert.ok(room.scene.getObjectByName('sink basin'));assert.ok(room.scene.getObjectByName('mattress'));
    room.position.set(.45,0,-.88);assert.equal(room.nearest().id,'rvExit','the rear exit remains selectable in both furniture layouts');
    room.dispose();assert.equal(room.scene.children.length,0);
  }
});
test('invalid or old customization data has safe defaults',()=>{
 assert.deepEqual(normalizeInterior(null),{wood:'oak',bedding:'sage',layout:'left'});
 assert.deepEqual(normalizeInterior({wood:'bad',bedding:'blue',layout:42}),{wood:'oak',bedding:'blue',layout:'left'});
});


test('front boarding drives and rear boarding enters the living area at every heading',()=>{
  for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2,.7]){
    const state={x:20,z:-15,heading};
    const point=(x,z)=>({x:state.x+Math.cos(heading)*x+Math.sin(heading)*z,z:state.z-Math.sin(heading)*x+Math.cos(heading)*z});
    assert.equal(motorhomeBoarding(state,point(0,5)),'drive');
    assert.equal(motorhomeBoarding(state,point(-4.8,2.7)),'drive');
    assert.equal(motorhomeBoarding(state,point(4.8,2.7)),'drive');
    assert.equal(motorhomeBoarding(state,point(0,-5)),'interior');
    assert.equal(motorhomeBoarding(state,point(4.8,-1.95)),'interior');
  }
});
test('transparent side and front windows have open sightlines to the parked vehicle surroundings',()=>{
  const world=new THREE.Scene(),vehicle=new THREE.Group();world.add(vehicle);
  vehicle.position.set(50,8,-30);vehicle.rotation.set(.1,1.3,-.08,'YXZ');vehicle.updateMatrixWorld(true);
  const room=createMotorhomeInterior();room.mount(world,vehicle);
  assert.equal(room.scene.parent,world);assert.equal(vehicle.visible,false);
  const localEye=new THREE.Vector3(0,1.8,.35),actual=room.toWorld(localEye);
  const expected=vehicle.localToWorld(localEye.clone().add(new THREE.Vector3(0,.9,-.9)).multiplyScalar(1.1));
  assert.ok(actual.distanceTo(expected)<1e-9);
  const windows=[];room.scene.traverse(o=>{if(o.name==='window'||o.name==='cab window')windows.push(o);});
  assert.equal(windows.length,3);
  for(const pane of windows){assert.equal(pane.material.transparent,true);assert.ok(pane.material.opacity<.2);assert.equal(pane.material.depthWrite,false);}
  for(const direction of [new THREE.Vector3(-1,0,0),new THREE.Vector3(1,0,0)]){
    const end=room.toWorld(localEye.clone().addScaledVector(direction,5));
    const ray=new THREE.Raycaster(actual,end.sub(actual).normalize(),0,5);
    const hits=ray.intersectObject(room.scene,true);
    assert.ok(hits.some(h=>h.object.name==='window'));
    assert.ok(hits.every(h=>h.object.material.transparent),'opaque wall must not cover a window');
  }
  const origin=room.toWorld(new THREE.Vector3(0,1.875,2.4)),end=room.toWorld(new THREE.Vector3(0,1.875,4));
  const frontHits=new THREE.Raycaster(origin,end.sub(origin).normalize(),0,1.6).intersectObject(room.scene,true);
  assert.ok(frontHits.some(h=>h.object.name==='cab window'));assert.ok(frontHits.every(h=>h.object.material.transparent));
  room.configure({wood:'walnut',layout:'right'});assert.equal(room.scene.parent,world);assert.equal(vehicle.visible,false);
  room.dispose();assert.equal(vehicle.visible,true);assert.equal(room.scene.parent,null);assert.ok(world.children.includes(vehicle));
});
