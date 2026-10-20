import test from 'node:test';
import assert from 'node:assert/strict';
import { createMotorhomeInterior, normalizeInterior, MOTORHOME_SIZE } from '../src/motorhome.js';
import { VEHICLES, stepDrive } from '../src/vehicles.js';
import { TRAVEL_CHOICES, isPrivateVehicle } from '../src/journey.js';

test('vehicles have doubled speed limits and motorhome is a compact private travel option',()=>{
  assert.deepEqual(['sedan','suv','scooter'].map(k=>VEHICLES[k].maxSpeed),[64,56,40]);
  assert.ok(TRAVEL_CHOICES.includes('motorhome'));assert.ok(isPrivateVehicle('motorhome'));
  assert.ok(MOTORHOME_SIZE.length<9&&MOTORHOME_SIZE.width<8&&MOTORHOME_SIZE.height<5);
  for(const kind of Object.keys(VEHICLES)){
    let s={kind,x:0,z:0,heading:0,speed:0};
    // Keep sampling flat, open terrain so the test measures the drivetrain.
    for(let i=0;i<600;i++)s={...stepDrive({...s,x:0,z:0},{forward:true},1/60,[],{heightAt:()=>0}),x:0,z:0};
    assert.ok(Math.abs(s.speed-VEHICLES[kind].maxSpeed)<.01);
  }
});
test('both layouts let the player reach every facility without crossing cabinets or walls',()=>{
  for(const layout of ['left','right']){
    const room=createMotorhomeInterior({layout});
    const queue=[{x:0,z:.8}],seen=new Set(),reachable=[];
    while(queue.length){
      const p=queue.shift(),key=`${p.x.toFixed(2)}:${p.z.toFixed(2)}`;if(seen.has(key))continue;seen.add(key);reachable.push(p);
      for(const [dx,dz]of[[.15,0],[-.15,0],[0,.15],[0,-.15]]){
        room.position.set(p.x,0,p.z);room.move(dx,dz);
        if(Math.hypot(room.position.x-p.x,room.position.z-p.z)>.149)queue.push({x:room.position.x,z:room.position.z});
      }
    }
    for(const target of room.targets)assert.ok(reachable.some(p=>Math.hypot(target.x-p.x,target.z-p.z)<1.15),target.id);
    room.position.set(0,0,.8);room.move(100,100);assert.ok(Math.abs(room.position.x)<=1.45&&Math.abs(room.position.z)<=2.65);
    room.position.set(0,0,.8);room.toggleRest();room.move(1,1);assert.deepEqual(room.position.toArray(),[0,0,.8]);room.toggleRest();
    room.configure({wood:'walnut',bedding:'blue',layout});assert.equal(room.settings.wood,'walnut');assert.equal(room.settings.bedding,'blue');
    assert.ok(room.scene.getObjectByName('toilet bowl'));assert.ok(room.scene.getObjectByName('sink basin'));assert.ok(room.scene.getObjectByName('mattress'));
    room.dispose();assert.equal(room.scene.children.length,0);
  }
});
test('invalid or old customization data has safe defaults',()=>{
 assert.deepEqual(normalizeInterior(null),{wood:'oak',bedding:'sage',layout:'left'});
 assert.deepEqual(normalizeInterior({wood:'bad',bedding:'blue',layout:42}),{wood:'oak',bedding:'blue',layout:'left'});
});
