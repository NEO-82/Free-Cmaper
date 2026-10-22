import test from 'node:test';
import assert from 'node:assert/strict';
import {drivingLookTarget,followDrivingCamera} from '../src/driving-camera.js';
const road=()=>({road:{width:22},distance:0,height:2.5,heading:Math.PI/2});
test('driving view uses road direction on either lane, and vehicle direction away from roads or on another elevation',()=>{
 const v={x:0,z:0,bodyY:2.5,heading:1.2};
 assert.equal(drivingLookTarget(v,road).yaw,-Math.PI/2);
 assert.equal(drivingLookTarget({...v,heading:-1.2},road).yaw,Math.PI/2);
 assert.equal(drivingLookTarget({...v,bodyY:30},road).yaw,v.heading-Math.PI);
 assert.equal(drivingLookTarget(v,()=>({...road(),distance:30})).yaw,v.heading-Math.PI);
 assert.equal(drivingLookTarget({...v,vx:10,vz:0,heading:-1.2},road).yaw,-Math.PI/2,'a drift follows the road in the actual travel direction');
});
test('mouse look remains free for half a second then smoothly restores yaw and pitch',()=>{
 const view={yaw:1,pitch:1,idle:0},target={yaw:-1,pitch:.32};
 assert.deepEqual(followDrivingCamera(view,target,.5),{...view,idle:.5});
 const recovered=followDrivingCamera(view,target,1.5);
 assert.ok(Math.abs(recovered.yaw-target.yaw)<.01);assert.ok(Math.abs(recovered.pitch-target.pitch)<.01);
 assert.deepEqual(followDrivingCamera({...recovered,idle:0},target,.4),{...recovered,idle:.4});
});
test('camera crosses the angle seam by the short arc and gives the same result at different frame rates',()=>{
 const view={yaw:Math.PI-.1,pitch:1,idle:0},target={yaw:-Math.PI+.1,pitch:.32};
 const run=hz=>{let v=view;for(let i=0;i<hz*2;i++)v=followDrivingCamera(v,target,1/hz);return v;};
 const a=run(30),b=run(120);assert.ok(Math.abs(a.yaw-b.yaw)<1e-10);assert.ok(Math.abs(a.pitch-b.pitch)<1e-10);assert.ok(a.yaw>Math.PI&&a.yaw<Math.PI+.11);
 assert.deepEqual(followDrivingCamera(view,target,0),view,'paused time must not move the view');
});
