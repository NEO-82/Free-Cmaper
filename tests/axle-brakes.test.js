import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {VEHICLES,TYRE_GRIP,stepDrive,createVehicle} from '../src/vehicles.js';
import {createSkidMarks} from '../src/skid-marks.js';
import {PARKING} from '../src/journey.js';
const flat={heightAt:()=>2.5,waterSurfaceAt:()=>null};
function drive(state,input,seconds){for(let i=0;i<seconds*120;i++)state=stepDrive(state,input,1/120,[],flat);return state;}

test('service braking physically uses both axles while the handbrake applies rear-only force in both travel directions',()=>{
 for(const [kind,config] of Object.entries(VEHICLES))for(const direction of [-1,1]){
  const initial={kind,...PARKING,heading:Math.PI/2,speed:direction*20};
  const service=drive(initial,{brake:true},.4),rear=drive(initial,{handbrake:true},.4);
  assert.equal(service.axleBrakes.front,config.brake*1.0625/2);assert.equal(service.axleBrakes.rear,config.brake*1.0625/2);
  assert.equal(rear.axleBrakes.front,0);assert.equal(rear.axleBrakes.rear,4.675);
  assert.ok(Math.abs(Math.abs(service.speed)-Math.max(0,20-config.brake*1.0625*.4))<.01);
  assert.ok(Math.abs(Math.abs(rear.speed)-(20-4.675*.4))<.01);
  assert.ok(Math.hypot(rear.x-initial.x,rear.z-initial.z)>Math.hypot(service.x-initial.x,service.z-initial.z));
  assert.equal(rear.skidAxles.front,0);assert.ok(rear.skidAxles.rear>.5);
  const brakingStep=stepDrive(initial,{brake:true},1/120,[],flat);assert.ok(brakingStep.skidAxles.front>.5&&brakingStep.skidAxles.rear>.5);
 }
});

test('S braking, parking and simultaneous brakes preserve four-wheel service force; rear-only braking also stops at walking speed',()=>{
 for(const [kind,config] of Object.entries(VEHICLES)){
  const initial={kind,...PARKING,heading:0,speed:20};
  for(const input of [{backward:true},{brake:true,handbrake:true},{brake:true,park:true}]){
   const state=stepDrive(initial,input,1/60,[],flat);assert.equal(state.axleBrakes.front,config.brake*1.0625/2);assert.equal(state.axleBrakes.rear,config.brake*1.0625/2);
   if(input.park){assert.equal(state.braking,false);assert.equal(state.skidIntensity,0);}
  }
  let slope={...initial,speed:3};for(let i=0;i<120;i++)slope=stepDrive(slope,{backward:true},1/120,[],{heightAt:(x,z)=>2.5-(z-PARKING.z)*.1,waterSurfaceAt:()=>null});assert.ok(slope.speed<0,'S must brake then reverse on a downhill slope');
  const slow=drive({...initial,speed:3},{handbrake:true},1);assert.equal(slow.speed,0);assert.equal(slow.axleBrakes.front,0);assert.equal(slow.axleBrakes.rear,config.brake*.425);
 }
});

test('normal lateral grip is exactly twenty percent above the previous tyre response and front grip remains on during a rear lock',()=>{
 assert.equal(TYRE_GRIP,1.2);
 const initial={kind:'sedan',...PARKING,heading:0,speed:20,vx:4,vz:20};
 const state=stepDrive(initial,{forward:true},.1,[],flat),oldDecay=.65+14;
 assert.ok(Math.abs(state.vx-4*Math.exp(-oldDecay*1.2*.1))<1e-8);
 assert.ok(state.vx<4*Math.exp(-oldDecay*.1));assert.equal(state.tyreGrip.front,1.2);assert.equal(state.tyreGrip.rear,1.2);
 const locked=drive({...initial,vx:0},{left:true,handbrake:true},.7);
 assert.equal(locked.tyreGrip.front,1.2);assert.ok(locked.tyreGrip.rear<.1);assert.ok(locked.drifting);assert.equal(locked.skidAxles.front,0);
 const released=drive(locked,{forward:true},1.8);assert.equal(released.tyreGrip.rear,1.2);assert.ok(Math.abs(released.slipAngle)<.03);
});

test('a rear lock stops rear wheel rotation and paints rear tracks while service braking rolls and slows both axles',()=>{
 for(const [kind,config] of Object.entries(VEHICLES)){
  const model=createVehicle(new THREE.Scene(),kind,PARKING,0,flat);
  const previous=model.wheels.map(w=>w.rotation.x),state=stepDrive({...model.state,speed:20},{handbrake:true},1/60,[],flat);
  model.update(state,.1);
  model.wheels.forEach((w,i)=>assert.equal(w.rotation.x===previous[i],w.parent.position.z<0));
  const locked=model.wheels.map(w=>w.rotation.x);model.update({...state,handbrake:false},.1);model.wheels.forEach((w,i)=>assert.notEqual(w.rotation.x,locked[i]));model.dispose();
  for(const [input,count] of [[{handbrake:true},config.track?2:1],[{brake:true},config.track?4:2]]){
   const marks=createSkidMarks(new THREE.Scene(),{heightAt:()=>2.5,surfaceAt:()=>null});
   const initial=stepDrive({kind,...PARKING,heading:0,speed:20},input,1/120,[],flat);marks.update(initial,config,0);marks.update({...initial,z:initial.z+.5},config,.1);
   assert.equal(marks.getState().emitted,count);marks.dispose();
  }
 }
});
