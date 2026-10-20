import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { VEHICLES, createVehicle, stepDrive, dismountPosition } from '../src/vehicles.js';
import { PARKING } from '../src/journey.js';
import { WORLD, canOccupy } from '../src/terrain.js';
const initial=kind=>({kind,...PARKING,heading:Math.PI/2,speed:0});
function advance(state,input,seconds,colliders=[]){for(let i=0;i<seconds*60;i++)state=stepDrive(state,input,1/60,colliders);return state;}

test('sedan, SUV and scooter accelerate, reverse, steer and stop with the same WASD/brake inputs',()=>{
  for(const kind of Object.keys(VEHICLES)){
    let state=advance(initial(kind),{forward:true},2);assert.ok(state.x>PARKING.x+5);assert.ok(state.speed>0);
    const heading=state.heading;state=advance(state,{forward:true,left:true},.5);assert.ok(state.heading>heading);
    state=advance(state,{brake:true},3);assert.equal(state.speed,0);
    state=advance(state,{backward:true},1);assert.ok(state.speed<0);
    state=advance(state,{},4);assert.equal(state.speed,0);
  }
});

test('high-speed cars cannot tunnel through trees/buildings, enter the sea or leave the world',()=>{
  for(const kind of Object.keys(VEHICLES)){
    const s={...initial(kind),speed:VEHICLES[kind].maxSpeed};
    const wall=[{kind:'box',minX:s.x+8,maxX:s.x+9,minZ:s.z-30,maxZ:s.z+30}];
    const hit=advance(s,{forward:true},3,wall);assert.ok(hit.x<=s.x+8-VEHICLES[kind].radius+.01);assert.ok(hit.blocked||hit.speed<1);
    const edge={...s,x:WORLD.minX+VEHICLES[kind].radius+.1,heading:-Math.PI/2};assert.ok(advance(edge,{forward:true},1).x>=WORLD.minX+VEHICLES[kind].radius);
    const sea={...s,x:WORLD.landMaxX-VEHICLES[kind].radius-10,z:0};assert.ok(advance(sea,{forward:true},2).x<WORLD.landMaxX);
  }
});

test('dismounts choose dry unobstructed ground or keep the driver inside if every exit is blocked',()=>{
  for(const kind of Object.keys(VEHICLES)){
    const state=initial(kind),exit=dismountPosition(state);assert.ok(exit);assert.ok(canOccupy(exit.x,exit.z));
    const walls=[{kind:'box',minX:state.x-20,maxX:state.x+20,minZ:state.z-20,maxZ:state.z+20}];assert.equal(dismountPosition(state,walls),null);
  }
});

test('all three independently disposable models have grounded wheels and remain finite on terrain',()=>{
  const scene=new THREE.Scene();
  for(const kind of Object.keys(VEHICLES)){
    const model=createVehicle(scene,kind,PARKING);assert.equal(model.wheels.length,kind==='scooter'?2:4);
    model.update({...initial(kind),speed:5},.1,1);model.root.updateMatrixWorld(true);model.root.traverse(o=>assert.ok([...o.position,...o.quaternion].every(Number.isFinite)));
    assert.equal(model.collider().radius,VEHICLES[kind].radius);model.dispose();
  }
  assert.equal(scene.children.length,0);
});
