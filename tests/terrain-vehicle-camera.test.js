import test from 'node:test';import assert from 'node:assert/strict';
import {terrainCameraTarget,recenterVehicleCamera,groundCameraDirection} from '../src/terrain-vehicle-camera.js';
test('camera follows road grade and direction independently of chassis pitch and roll',()=>{
 const roadAt=(x,z)=>({road:{width:22},distance:0,height:z*.3,heading:.1}),s={x:0,z:0,heading:0,bodyY:2.5,pitch:.7,roll:.6},options={roadAt,heightAt:()=>999};
 const a=terrainCameraTarget(s,options),b=terrainCameraTarget({...s,pitch:-.8,roll:-.5},options);assert.deepEqual(a,b);assert.ok(Math.abs(a.yaw-.1)<1e-9);assert.ok(a.pitch<.05);
 const view=groundCameraDirection(s,a);assert.ok(view.y>0,'uphill view points up the road');assert.ok(Math.abs(Math.hypot(view.x,view.y,view.z)-1)<1e-9);
 const reverse=terrainCameraTarget({...s,heading:Math.PI},options);assert.ok(Math.abs(reverse.yaw-.1)<1e-9);assert.ok(reverse.pitch>.5,'reverse direction looks downhill');
});
test('offroad hill and crest targets use ground samples, while stop and delay preserve manual orbit',()=>{
 const s={x:0,z:0,heading:0},hill=terrainCameraTarget(s,{heightAt:(x,z)=>z*.25}),crest=terrainCameraTarget(s,{heightAt:(x,z)=>100-z*z*.05});assert.ok(hill.pitch<.1);assert.equal(crest.pitch,.32);
 const cam={yaw:1,pitch:-.3};assert.strictEqual(recenterVehicleCamera(cam,.1,.99,15),cam);assert.strictEqual(recenterVehicleCamera(cam,.1,10,0),cam);
 const returned=recenterVehicleCamera(cam,1,2,15,{target:hill});assert.ok(Math.abs(returned.pitch-hill.pitch)<.001);assert.ok(Math.abs(returned.yaw)<.001);
 assert.strictEqual(recenterVehicleCamera(cam,.1,6.99,15,{delay:7}),cam);
});
