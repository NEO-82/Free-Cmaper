import test from 'node:test';
import assert from 'node:assert/strict';
import {VEHICLES,stepDrive} from '../src/vehicles.js';
import {PARKING} from '../src/journey.js';
const flat={heightAt:()=>2.5,waterSurfaceAt:()=>null};
function drive(state,input,seconds){for(let i=0;i<seconds*120;i++)state=stepDrive(state,input,1/120,[],flat);return state;}

test('scooter/sedan drive only the rear wheels; SUV/motorhome split acceleration equally across both axles',()=>{
 for(const [kind,config] of Object.entries(VEHICLES))for(const direction of [-1,1]){
  const state=stepDrive({kind,...PARKING,heading:0,speed:0},{forward:direction>0,backward:direction<0},1/60,[],flat),awd=kind==='suv'||kind==='motorhome';
  assert.equal(config.drivetrain,awd?'awd':'rwd');
  assert.equal(state.axleDrive.front,awd?direction*config.acceleration/2:0);
  assert.equal(state.axleDrive.rear,direction*config.acceleration*(awd?.5:1));
  assert.ok(Math.abs(state.speed-direction*config.acceleration/60)<.001);
 }
});

test('a rear lock cuts rear propulsion while an AWD front axle still pulls during a high-speed handbrake slide',()=>{
 for(const [kind,config] of Object.entries(VEHICLES)){
  const initial={kind,...PARKING,heading:0,speed:25},coast=drive(initial,{handbrake:true},.3),power=drive(initial,{handbrake:true,forward:true},.3);
  assert.equal(power.axleDrive.rear,0);assert.equal(power.axleBrakes.front,0);
  if(config.drivetrain==='awd'){assert.equal(power.axleDrive.front,config.acceleration/2);assert.ok(power.speed>coast.speed+1);}
  else{assert.equal(power.axleDrive.front,0);assert.ok(Math.abs(power.speed-coast.speed)<1e-8);}
  const held=drive({...initial,speed:0},{handbrake:true,forward:true},.5);assert.equal(held.speed,0,'rear brake still holds a stationary vehicle');
 }
});

test('lost rear grip reduces rear-wheel launch force while AWD preserves front drive; service brake overrides either drivetrain',()=>{
 for(const [kind,config] of Object.entries(VEHICLES)){
  const initial={kind,...PARKING,heading:0,speed:10,traction:.05};
  const state=stepDrive(initial,{forward:true},1/120,[],flat),rearShare=config.drivetrain==='awd'?.5:1;
  assert.ok(Math.abs(state.axleDrive.rear-config.acceleration*rearShare*state.traction)<1e-8);
  if(config.drivetrain==='awd')assert.equal(state.axleDrive.front,config.acceleration/2);else assert.equal(state.axleDrive.front,0);
  const braking=stepDrive(initial,{forward:true,brake:true,handbrake:true},1/60,[],flat);
  assert.equal(braking.axleDrive.front,0);assert.equal(braking.axleDrive.rear,0);assert.ok(braking.axleBrakes.front>0&&braking.axleBrakes.rear>0);assert.ok(braking.speed<initial.speed);
 }
});
