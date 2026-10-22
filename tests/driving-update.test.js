import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {VEHICLES,stepDrive,vehicleWaterAllowed} from '../src/vehicles.js';
import {createSkidMarks} from '../src/skid-marks.js';
import {createVillages} from '../src/villages.js';
import {createGateway} from '../src/gateway.js';
import {ROADS,VILLAGE_SITES,SHOP_SITES,BRIDGE,circleOverlaps,terrainHeight,isWater,shoreCrossings} from '../src/terrain.js';
import {PARKING} from '../src/journey.js';

test('settlements and shops leave main carriageways clear and connect through narrow, unobstructed dirt lanes',()=>{
 const original=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
 try{
  const villages=createVillages(new THREE.Scene()),main=ROADS.filter(r=>r.kind!=='village'),lanes=ROADS.filter(r=>r.kind==='village');assert.equal(lanes.length,3);
  for(const v of VILLAGE_SITES){
   const nearest=Math.min(...main.flatMap(r=>r.track.map(p=>Math.hypot(v.x-p.x,v.z-p.z)-r.width/2)));assert.ok(nearest>v.radius+40,v.name);
   const lane=lanes.find(r=>Math.hypot(r.track.at(-1).x-v.x,r.track.at(-1).z-v.z)<22);
   assert.equal(lane.width,8);assert.ok(lane.length>100&&lane.length<250);assert.ok(lane.track.every(p=>!p.tunnel));
   const start=lane.track[0];assert.ok(main.some(r=>r.track.some(p=>Math.hypot(p.x-start.x,p.z-start.z)<2)));
  }
  const shops=SHOP_SITES.filter(s=>s.id.endsWith('-shop')).map(s=>({kind:'box',minX:s.x-17,maxX:s.x+17,minZ:s.z-17,maxZ:s.z+17}));
  for(const road of ROADS)for(const p of road.track)assert.ok(![...villages.colliders,...shops].some(c=>circleOverlaps(p.x,p.z,road.width/2+1,c)),road.id+' overlaps a village structure');
  for(const lane of lanes)for(const p of lane.track)assert.ok(Math.abs(terrainHeight(p.x,p.z)-p.y)<.02);
 }finally{globalThis.document=original;}
});

test('bridge concrete is separated below the road across its entire 500 metre span',()=>{
 const gateway=createGateway(new THREE.Scene()),deck=gateway.group.getObjectByName('bridge deck');deck.geometry.computeBoundingBox();
 const top=deck.position.y+deck.geometry.boundingBox.max.y,road=ROADS.find(r=>r.id==='gateway');
 for(const p of road.track.filter(p=>p.x>BRIDGE.startX&&p.x<BRIDGE.endX&&Math.abs(p.z-BRIDGE.z)<BRIDGE.width/2)){
  assert.ok(p.y-top>.07);assert.ok(Math.abs(p.z-BRIDGE.z)<.001);assert.equal(terrainHeight(p.x,p.z),BRIDGE.height);
 }gateway.dispose();
});

test('vehicles reach shallow water at full speed, stop before unsafe depth and reverse back out',()=>{
 for(const kind of Object.keys(VEHICLES)){
  const config=VEHICLES[kind],shore=shoreCrossings(0).at(-1);let state={kind,x:shore-14,z:0,heading:Math.PI/2,speed:config.maxSpeed};
  for(let i=0;i<360;i++)state=stepDrive(state,{forward:true},1/60);
  assert.ok(isWater(state.x,state.z),kind);assert.ok(vehicleWaterAllowed(state,config));assert.ok(state.speed<.1);
  const before=state.x;for(let i=0;i<240;i++)state=stepDrive(state,{backward:true},1/60);assert.ok(state.x<before-8);assert.ok(!isWater(state.x,state.z));
  const heightAt=x=>2-Math.max(0,x-PARKING.x)*.1,surfaceAt=()=>0;state={kind,...PARKING,heading:Math.PI/2,speed:config.maxSpeed};
  for(let i=0;i<240;i++)state=stepDrive(state,{forward:true},1/60,[],{heightAt,waterSurfaceAt:surfaceAt});
  assert.ok(vehicleWaterAllowed(state,config,heightAt,surfaceAt));assert.ok(state.x>PARKING.x+15);
 }assert.ok(VEHICLES.scooter.maxWadeDepth<VEHICLES.sedan.maxWadeDepth);
});

test('braking and drift emit bounded tyre ribbons; rolling, airborne wheels and teleports do not',()=>{
 const scene=new THREE.Scene(),config=VEHICLES.sedan,marks=createSkidMarks(scene,{capacity:48,heightAt:()=>2.5,surfaceAt:()=>null});
 let state={kind:'sedan',...PARKING,heading:Math.PI/2,speed:25};
 const tick=input=>{state=stepDrive(state,input,1/60,[],{heightAt:()=>2.5});marks.update(state,config,1/60);};
 for(let i=0;i<20;i++)tick({forward:true});assert.equal(marks.getState().emitted,0);
 for(let i=0;i<30;i++)tick({forward:true,left:true});assert.equal(marks.getState().emitted,0,'ordinary cornering keeps tyre grip');
 for(let i=0;i<60;i++)tick({handbrake:true,left:true});assert.ok(marks.getState().emitted>48);assert.equal(marks.getState().segments,48);
 const count=marks.getState().emitted;marks.update({...state,x:state.x+1,airborne:true,skidIntensity:1},config,1/60);assert.equal(marks.getState().emitted,count);
 marks.update({...state,x:state.x+400,skidIntensity:1},config,1/60);assert.equal(marks.getState().emitted,count);
 assert.ok([...marks.mesh.geometry.attributes.position.array].every(Number.isFinite));assert.equal(marks.mesh.geometry.drawRange.count,48*6);
 state={kind:'sedan',...PARKING,heading:Math.PI/2,speed:25};tick({backward:true});assert.ok(state.skidIntensity>.5);
 state={...state,speed:1,vx:1,vz:0,yawRate:0};tick({handbrake:true});assert.equal(state.skidIntensity,0);
 marks.update(state,config,80);assert.ok(marks.getState().time>marks.getState().lifetime);marks.dispose();assert.equal(scene.children.length,0);
});
