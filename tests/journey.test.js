import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ARRIVAL,PARKING,TRAVEL_CHOICES,STARTING_GEAR,arrivalFor,isPrivateVehicle,arrivalRoadPoint} from '../src/journey.js';
import {WORLD,BRIDGE,MAINLAND,SHOP_SITES,canOccupy,terrainHeight,isWater,resolveMovement} from '../src/terrain.js';
import {createGateway} from '../src/gateway.js';
import {mapPoint} from '../src/worldmap.js';
import {createPerson,stepPerson} from '../src/person-physics.js';
import {stepDrive} from '../src/vehicles.js';

test('four vehicles start on dry mainland parking with supplies already packed',()=>{
 assert.deepEqual(TRAVEL_CHOICES,['scooter','sedan','suv','motorhome']);assert.equal(STARTING_GEAR.length,6);
 const gateway=createGateway(new THREE.Scene());
 for(const kind of TRAVEL_CHOICES){const p=arrivalFor(kind);assert.ok(p.x>MAINLAND.minX&&p.x<MAINLAND.maxX);assert.ok(p.z>MAINLAND.minZ&&p.z<MAINLAND.maxZ);assert.ok(canOccupy(p.x,p.z,gateway.colliders));assert.equal(terrainHeight(p.x,p.z),2.5);assert.ok(isPrivateVehicle(kind));}
 assert.equal(isPrivateVehicle('bus'),false);assert.equal(isPrivateVehicle('train'),false);assert.ok(canOccupy(PARKING.x,PARKING.z,gateway.colliders,5));
 assert.deepEqual(arrivalRoadPoint(0),ARRIVAL);assert.equal(SHOP_SITES.length,4);assert.equal(SHOP_SITES[1].x-BRIDGE.endX,100);gateway.dispose();
});
test('every vehicle crosses the complete 500m bridge from parking and rails prevent driving into the sea',()=>{
 const gateway=createGateway(new THREE.Scene());
 for(const kind of TRAVEL_CHOICES){let state={kind,x:ARRIVAL.x,z:BRIDGE.z,heading:Math.PI/2,speed:0};
  for(let i=0;i<60*70&&state.x<BRIDGE.endX+70;i++)state=stepDrive(state,{forward:true},1/60,gateway.colliders);
  assert.ok(state.x>BRIDGE.endX+50,`${kind} blocked at ${state.x}`);assert.equal(isWater(state.x,state.z),false);
  const side=resolveMovement({x:(BRIDGE.startX+BRIDGE.endX)/2,z:BRIDGE.z},{x:0,z:100},gateway.colliders,2.8);assert.ok(side.z<BRIDGE.z+7);
 }
 gateway.dispose();
});
test('pedestrian bridge crossings keep feet on the deck and cannot tunnel through guardrails',()=>{
 const gateway=createGateway(new THREE.Scene());let p=createPerson({x:BRIDGE.startX-30,y:terrainHeight(BRIDGE.startX-30,BRIDGE.z),z:BRIDGE.z});
 for(let i=0;i<120*70;i++)p=stepPerson(p,{x:1,speed:8},1/120,{colliders:gateway.colliders});
 assert.ok(p.x>BRIDGE.endX);assert.equal(p.swimming,false);assert.equal(p.grounded,true);gateway.dispose();
});
test('world map projects all four boundaries and the current position into the complete map',()=>{
 assert.deepEqual(mapPoint(WORLD.minX,WORLD.minZ,1000,800),{x:0,y:0});assert.deepEqual(mapPoint(WORLD.maxX,WORLD.maxZ,1000,800),{x:1000,y:800});assert.deepEqual(mapPoint(0,0,1000,800),{x:500,y:400});
});
