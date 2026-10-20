import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHome, HOME_GEAR, HOME_START, HOME_DOOR, moveAtHome } from '../src/home.js';
import { ARRIVAL, PARKING, TRAVEL_CHOICES, arrivalFor, isPrivateVehicle, journeyHours, arrivalRoadPoint } from '../src/journey.js';
import { WORLD, canOccupy, circleOverlaps, terrainHeight } from '../src/terrain.js';
import { createTransit } from '../src/transit.js';
import { mapPoint } from '../src/worldmap.js';

test('all six supplies and the front door are reachable inside the real home without crossing furniture',()=>{
  const scene=new THREE.Scene(),home=createHome(scene),queue=[HOME_START],seen=new Set(),reachable=[];
  while(queue.length){const p=queue.shift(),key=`${p.x.toFixed(1)}:${p.z.toFixed(1)}`;if(seen.has(key))continue;seen.add(key);reachable.push(p);
    for(const [dx,dz]of[[.5,0],[-.5,0],[0,.5],[0,-.5]]){const q=moveAtHome(p,{x:dx,z:dz},home.colliders);if(Math.hypot(q.x-p.x,q.z-p.z)>.49)queue.push(q);}
  }
  assert.equal(home.gear.length,6);
  for(const target of [...home.gear.map(g=>g.position),HOME_DOOR])assert.ok(reachable.some(p=>Math.hypot(p.x-target.x,p.z-target.z)<2.5));
  const out=moveAtHome(HOME_START,{x:100,z:100},home.colliders);assert.ok(out.x<7.5&&out.z<6.5);
  for(const id of HOME_GEAR){assert.equal(home.pack(id),true);assert.equal(home.pack(id),false);assert.equal(home.gear.find(g=>g.id===id).object.visible,false);}
  home.dispose();assert.equal(scene.children.length,0);
});

test('all five transport modes arrive on safe ground at the western edge beside their transport',()=>{
  const transit=createTransit(new THREE.Scene());
  assert.equal(TRAVEL_CHOICES.length,5);
  for(const kind of TRAVEL_CHOICES){const p=arrivalFor(kind);assert.ok(p.x>WORLD.minX&&p.x<WORLD.minX+120);assert.ok(canOccupy(p.x,p.z,transit.colliders,.55));assert.equal(terrainHeight(p.x,p.z),2.5);assert.ok(journeyHours(kind)>=1);}
  assert.equal(isPrivateVehicle('bus'),false);assert.equal(isPrivateVehicle('train'),false);assert.equal(isPrivateVehicle('suv'),true);
  assert.ok(canOccupy(PARKING.x,PARKING.z,transit.colliders,3));
  const road=arrivalRoadPoint(0);assert.deepEqual(road,ARRIVAL);transit.dispose();
});

test('world map projects all four boundaries and the current position into the complete map',()=>{
  assert.deepEqual(mapPoint(WORLD.minX,WORLD.minZ,1000,800),{x:0,y:0});
  assert.deepEqual(mapPoint(WORLD.maxX,WORLD.maxZ,1000,800),{x:1000,y:800});
  assert.deepEqual(mapPoint(0,0,1000,800),{x:500,y:400});
});
