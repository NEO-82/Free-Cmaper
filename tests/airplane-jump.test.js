import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {stepVehicleJump} from '../src/vehicle-jump.js';
import {AIRPLANE_CONFIG,stepAirplane,planeSpawn,createAirplane} from '../src/light-airplane.js';
import {ejectFromAirplane,stepParachute,createParachute} from '../src/parachute.js';
import {makeRiderMount,updateMountedRider,visibleRiderBounds,restoreRider} from '../src/rider-mount.js';
const config={travel:.4},ground={height:0,wheels:[{},{},{},{}]};
test('all ground vehicles jump on an edge, follow a gravity arc, land, and cannot jump twice while held',()=>{
 for(const kind of ['sedan','suv','motorhome','scooter']){let s={kind,bodyY:0,heaveVelocity:0,airborne:false},peak=0,landings=0;for(let i=0;i<480;i++){s=stepVehicleJump(s,{bodyY:0,heaveVelocity:0,pitch:0,roll:0},ground,1/120,config,{jump:true});peak=Math.max(peak,s.bodyY);if(s.landed)landings++;}assert.ok(peak>1.7&&peak<3.1);assert.equal(landings,1);assert.equal(s.airborne,false);assert.equal(s.bodyY,0);}
});
test('vehicle momentum carries it over a crest, gravity follows a drop, and a ceiling stops ascent',()=>{
 const s={kind:'sedan',bodyY:1,groundHeight:1,groundVerticalSpeed:4,heaveVelocity:4};const crest=stepVehicleJump(s,{bodyY:1,heaveVelocity:0},{...ground,height:.7},1/120,config);assert.ok(crest.airborne&&crest.bodyY>1);
 const hit=stepVehicleJump({...s,airborne:true,bodyY:2,heaveVelocity:7},{},ground,.1,config,{ceiling:5.4});assert.ok(hit.bodyY<=1.90001&&hit.heaveVelocity<=0);
});
test('light airplane takes off within the 500m bridge and responds to pitch and WASD bank',()=>{
 const bridge={startX:0,endX:500,z:0},spawn=planeSpawn(bridge);let s={kind:'airplane',...spawn,bodyY:4.52,grounded:true,engineOn:true,speed:0},liftAt=null;
 for(let i=0;i<1200;i++){s=stepAirplane(s,{forward:true,pitchCommand:.22},1/120,[],{heightAt:()=>4.5});if(!s.grounded&&liftAt===null)liftAt=s.x;}
 assert.ok(liftAt>35&&liftAt<450,liftAt);assert.ok(s.bodyY>20);assert.ok(s.speed>AIRPLANE_CONFIG.takeoffSpeed);
 const left=stepAirplane(s,{left:true,pitchCommand:0},.1,[],{heightAt:()=>4.5});assert.ok(left.heading>s.heading&&left.roll<0);
 const right=stepAirplane(s,{right:true,pitchCommand:-.3},.1,[],{heightAt:()=>4.5});assert.ok(right.heading<s.heading&&right.roll>0&&right.pitch<s.pitch);
 const scene=new THREE.Scene(),plane=createAirplane(scene,THREE,spawn,spawn.heading,{heightAt:()=>4.5});assert.ok(plane.config.wingSpan<22);assert.ok(scene.getObjectByName('Camping light airplane'));plane.dispose();
});
test('ejection retains velocity; parachute inflation slows the fall, steers and lands without ground penetration',()=>{
 let s=ejectFromAirplane({x:0,z:0,bodyY:300,heading:0,vx:0,vz:60,vy:0});for(let i=0;i<360;i++)s=stepParachute(s,{},1/120);assert.ok(s.vy<-20);const fallen=s.vy;s.open=true;
 for(let i=0;i<240;i++)s=stepParachute(s,{x:1,z:0},1/120);assert.ok(s.vy>-6&&s.vy>fallen);assert.ok(s.x>5&&s.inflation===1);
 for(let i=0;i<12000&&!s.landed;i++)s=stepParachute(s,{},1/120,{heightAt:()=>5});assert.equal(s.landed,true);assert.equal(s.y,5);assert.equal(s.vy,0);
 const view=createParachute(new THREE.Scene(),THREE);view.update(s);assert.equal(view.root.visible,true);view.update(null);assert.equal(view.root.visible,false);view.dispose();
});
test('rider fitting contains visible hats/limbs in every cabin and follows the whole vehicle transform',()=>{
 for(const kind of ['sedan','suv','motorhome','helicopter','airplane']){const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);const body=new THREE.Mesh(new THREE.BoxGeometry(1.8,3.2,1.7),new THREE.MeshBasicMaterial());body.position.y=1.6;root.add(body);const invisible=new THREE.Mesh(new THREE.BoxGeometry(99,99,99),new THREE.MeshBasicMaterial());invisible.visible=false;root.add(invisible);const model={root,backpack:new THREE.Group()};const mount=makeRiderMount(model,kind,THREE,()=>{}),vehicle={root:new THREE.Group()};scene.add(vehicle.root);vehicle.root.position.set(50,20,-10);vehicle.root.rotation.set(.3,.8,-.2);vehicle.root.updateMatrixWorld(true);updateMountedRider(model,vehicle,mount,THREE);const local=visibleRiderBounds(root,THREE),e=mount.envelope;assert.ok(local.max.y*mount.scale+mount.offset.y<=e.roof+.001);assert.ok(local.min.x*mount.scale+mount.offset.x>=e.minX-.001);assert.ok(root.quaternion.angleTo(vehicle.root.quaternion)<1e-6);restoreRider(model);assert.equal(root.scale.x,1);}
});
