import test from 'node:test';import assert from 'node:assert/strict';
import {vehicleWaterSupport,vehicleWaterState,WATER_VEHICLE_SETTINGS} from '../src/vehicle-water.js';
import {stepVehicleJump} from '../src/vehicle-jump.js';
test('deep water supports each ground vehicle without changing shallow beds, dry roads or bridges',()=>{
 for(const kind of Object.keys(WATER_VEHICLE_SETTINGS)){
  const draft=WATER_VEHICLE_SETTINGS[kind].draft;assert.equal(vehicleWaterSupport(kind,0,0,()=>-8,()=>0),-draft);
  assert.equal(vehicleWaterSupport(kind,0,0,()=>-.1,()=>0),-.1);assert.equal(vehicleWaterSupport(kind,0,0,()=>4.5,()=>0),4.5);assert.equal(vehicleWaterSupport(kind,0,0,()=>-8,()=>null),-8);
  const wet=vehicleWaterState({kind,x:0,z:0,bodyY:-draft},()=>-8,()=>0);assert.equal(wet.immersion,1);assert.ok(wet.driveScale>0&&wet.maxSpeed>0&&wet.reverseSpeed>0);
 }
});
test('an airborne vehicle keeps its arc and speed over a stream instead of inheriting water drag',()=>{
 const kind='sedan',support=()=>vehicleWaterSupport(kind,0,0,()=>-4,()=>0);let s={kind,bodyY:0,airborne:false,heaveVelocity:0};
 s=stepVehicleJump(s,{bodyY:0,heaveVelocity:0},{height:0,wheels:[{},{},{},{}]},1/120,{travel:.3},{jump:true});
 for(let i=0;i<80;i++){
  const wet=vehicleWaterState({...s,x:0,z:0},()=>-4,()=>0);assert.equal(wet.drag,0);
  s=stepVehicleJump(s,{bodyY:s.bodyY,heaveVelocity:s.heaveVelocity},{height:support(),wheels:[{},{},{},{}]},1/120,{travel:.3});
 }
 assert.ok(s.airborne&&s.bodyY>2);
});
