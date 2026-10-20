import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { VEHICLES, createVehicle, stepDrive, dismountPosition } from '../src/vehicles.js';
import { PARKING } from '../src/journey.js';
import { WORLD, canOccupy } from '../src/terrain.js';
const initial=kind=>({kind,...PARKING,heading:Math.PI/2,speed:0});
function advance(state,input,seconds,colliders=[]){for(let i=0;i<seconds*60;i++)state=stepDrive(state,input,1/60,colliders);return state;}

test('all four vehicles accelerate, reverse, steer and stop with the same WASD/brake inputs',()=>{
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

test('all four independently disposable models have grounded wheels and remain finite on terrain',()=>{
  const scene=new THREE.Scene();
  for(const kind of Object.keys(VEHICLES)){
    const model=createVehicle(scene,kind,PARKING);assert.equal(model.wheels.length,kind==='scooter'?2:4);
    model.update({...initial(kind),speed:5},.1,1);model.root.updateMatrixWorld(true);model.root.traverse(o=>assert.ok([...o.position,...o.quaternion].every(Number.isFinite)));
    assert.equal(model.collider().radius,VEHICLES[kind].radius);model.dispose();
  }
  assert.equal(scene.children.length,0);
});

test('four-wheel contacts tilt the whole car with both fore/aft and side-to-side slopes at every heading',async()=>{
  const {sampleWheelGround,stepChassis}=await import('../src/vehicle-physics.js');
  const plane=(x,z)=>.12*x+.18*z;
  for(const kind of ['sedan','suv','scooter'])for(const heading of [0,.7,1.5,2.4]){
    const config=VEHICLES[kind],state={kind,x:20,z:-20,heading,speed:0},ground=sampleWheelGround(state,config,plane);
    const expectedPitch=-Math.atan(.12*Math.sin(heading)+.18*Math.cos(heading));
    const expectedRoll=Math.atan(.12*Math.cos(heading)-.18*Math.sin(heading));
    assert.ok(Math.abs(ground.pitch-expectedPitch)<1e-9);assert.ok(Math.abs(ground.roll-expectedRoll)<1e-9);
    const model=createVehicle(new THREE.Scene(),kind,state,heading,{heightAt:plane});model.root.updateMatrixWorld(true);
    assert.ok(Math.abs(model.root.rotation.x-expectedPitch)<1e-9);assert.ok(Math.abs(model.root.rotation.z-expectedRoll)<1e-9);
    for(const wheel of model.wheels){const p=wheel.parent.getWorldPosition(new THREE.Vector3());assert.ok(Math.abs(p.y-config.wheelRadius-plane(p.x,p.z))<.04);}
    model.dispose();
  }
});
test('spring suspension settles after a bump and gravity makes the chassis fall over a crest',async()=>{
  const {sampleWheelGround,stepChassis}=await import('../src/vehicle-physics.js');const config=VEHICLES.suv;
  let state={speed:12,bodyY:0,pitch:0,roll:0};const bump=sampleWheelGround({x:0,z:0,heading:0},config,()=>.3);
  state=stepChassis(state,bump,1/60,config);assert.ok(state.bodyY>0&&state.bodyY<.3);
  for(let i=0;i<180;i++)state=stepChassis(state,bump,1/60,config);
  assert.ok(Math.abs(state.bodyY-.3)<.001);
  const drop=sampleWheelGround({x:0,z:0,heading:0},config,()=>-3);
  state=stepChassis(state,drop,1/60,config);assert.equal(state.airborne,true);assert.ok(state.bodyY>0&&state.heaveVelocity<0);
  for(let i=0;i<180;i++)state=stepChassis(state,drop,1/60,config);assert.equal(state.airborne,false);assert.ok(Math.abs(state.bodyY+3)<.01);
});
