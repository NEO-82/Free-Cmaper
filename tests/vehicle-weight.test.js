import test from 'node:test';import assert from 'node:assert/strict';
import {VEHICLE_WEIGHT,stepWeightedSuspension} from '../src/vehicle-suspension.js';
import {stepVehicleJump} from '../src/vehicle-jump.js';
const ground={height:0,pitch:0,roll:0,wheels:[{},{},{},{}]},config={travel:.4};
function simulate(kind){let state={kind,bodyY:0,heaveVelocity:0,pitch:0,roll:0},peak=0,landings=0,landedAt=-1,min=0,maxAfter=0,launches=0;for(let i=0;i<600;i++){const suspension=stepWeightedSuspension(state,ground,1/120,config);state={...state,...stepVehicleJump(state,suspension,ground,1/120,config,{jump:i<18})};peak=Math.max(peak,state.bodyY);if(state.launched)launches++;if(state.landed){landings++;landedAt=i;}if(landedAt>=0){min=Math.min(min,state.bodyY);maxAfter=Math.max(maxAfter,state.bodyY);}}return {state,peak,landings,launches,min,maxAfter};}
test('heavier vehicles have lower jump response and a single damped landing without a second launch',()=>{
 const outcomes={};for(const kind of Object.keys(VEHICLE_WEIGHT)){const r=simulate(kind);outcomes[kind]=r;assert.equal(r.landings,1);assert.equal(r.launches,1);assert.equal(r.state.airborne,false);assert.ok(r.min<-.08,'impact compresses the suspension');assert.ok(r.maxAfter<=.001,'no rebound above tyre support');assert.ok(Math.abs(r.state.bodyY)<.003,'settles back to support');}
 assert.ok(outcomes.motorhome.peak<outcomes.suv.peak&&outcomes.suv.peak<outcomes.sedan.peak);assert.ok(VEHICLE_WEIGHT.motorhome.mass>VEHICLE_WEIGHT.sedan.mass);
});
test('touchdown clears stale ramp momentum and angular kick so it cannot chain into bouncing',()=>{
 const previous={kind:'sedan',bodyY:.02,heaveVelocity:-8,airborne:true,groundVerticalSpeed:8};let s={...previous,...stepVehicleJump(previous,{pitch:0,roll:0,pitchVelocity:5,rollVelocity:-6},ground,1/120,config)};
 assert.ok(s.landed&&!s.airborne);assert.equal(s.groundVerticalSpeed,0);assert.ok(s.settleTime>0);assert.ok(Math.abs(s.pitchVelocity)<1&&Math.abs(s.rollVelocity)<1);
 for(let i=0;i<240;i++){const suspension=stepWeightedSuspension(s,ground,1/120,config);s={...s,...stepVehicleJump(s,suspension,ground,1/120,config)};assert.ok(!s.airborne&&!s.launched);}
});
test('airborne attitude preserves inertia instead of springing toward terrain below',()=>{
 const state={kind:'motorhome',airborne:true,bodyY:10,heaveVelocity:-3,pitch:.2,roll:.1,pitchVelocity:0,rollVelocity:0};const s=stepWeightedSuspension(state,{...ground,pitch:-.6,roll:-.4},.1,config);assert.equal(s.pitch,.2);assert.equal(s.roll,.1);assert.equal(s.heaveVelocity,-3,'gravity has a single owner in jump physics');
});

test('landing damping does not glue a vehicle to a real drop',()=>{
 const previous={kind:'suv',bodyY:0,heaveVelocity:0,airborne:false,groundVerticalSpeed:0,settleTime:.25};const s=stepVehicleJump(previous,{bodyY:-3,heaveVelocity:0},{...ground,height:-3},1/120,config);assert.ok(s.airborne&&s.bodyY>-.1&&s.heaveVelocity<0);
});
