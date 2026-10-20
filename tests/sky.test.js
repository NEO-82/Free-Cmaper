import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WORLD}from '../src/terrain.js';
import {flightPath,createSkySchedule,skyEventState}from '../src/sky-events.js';
import {createAtmosphere}from '../src/atmosphere.js';
import {weatherState}from '../src/weather.js';
const seeded=()=>{let seed=8202026;return()=>((seed=seed*16807%2147483647)-1)/2147483646;};

test('random flight directions cross from one world edge to another high above the mountains',()=>{
  for(let i=0;i<360;i++){
    const path=flightPath(i/360*Math.PI*2,Math.sin(i)*400,1200);
    for(const p of [path.start,path.end]){
      assert.ok(Math.abs(p.x)<=WORLD.maxX+1e-7&&Math.abs(p.z)<=WORLD.maxZ+1e-7);
      assert.ok(Math.min(Math.abs(p.x-WORLD.minX),Math.abs(p.x-WORLD.maxX),Math.abs(p.z-WORLD.minZ),Math.abs(p.z-WORLD.maxZ))<1e-6);
      assert.equal(p.y,1200);
    }
    assert.ok(Math.hypot(path.end.x-path.start.x,path.end.z-path.start.z)>2000);
  }
});
test('flight intervals vary around one game hour; galaxy nights are separated',()=>{
  const random=seeded();let total=0,count=0;
  for(let j=0;j<200;j++){
    const schedule=createSkySchedule(random);let previous=0;
    for(let i=1;i<schedule.flights.length;i++)assert.ok(schedule.flights[i-1].at+schedule.flights[i-1].duration+45<schedule.flights[i].at,'next plane starts after the previous contrail fades');
    for(const f of schedule.flights){const interval=f.at-previous;assert.ok(interval>=108&&interval<132);total+=interval;count++;previous=f.at;}
    for(let i=1;i<schedule.galaxyNights.length;i++)assert.ok(schedule.galaxyNights[i]-schedule.galaxyNights[i-1]>=2);
  }
  assert.ok(Math.abs(total/count-120)<.3);
});
test('a plane leaves a fading contrail and all sky event progress freezes at the same game time',()=>{
  const schedule=createSkySchedule(seeded()),f=schedule.flights[0];
  const state=skyEventState(schedule,f.at+f.duration/2,12,0,'clear',0);assert.ok(Math.abs(state.flightProgress-.5)<1e-12);
  assert.deepEqual(skyEventState(schedule,f.at+f.duration/2,12,0,'clear',0),state);
  assert.equal(skyEventState(schedule,f.at+f.duration+20,12,0,'clear',0).flightProgress,1);
  assert.equal(skyEventState(schedule,f.at+f.duration+46,12,0,'clear',0).flight,null);
});
test('galaxies belong to the same night across midnight and auroras require winter clear nights',()=>{
  const schedule={flights:[],galaxyNights:[1,4,7]};
  assert.equal(skyEventState(schedule,18*120,23,0,'clear').galaxy,true);
  assert.equal(skyEventState(schedule,20*120,1,0,'clear').galaxy,true);
  assert.equal(skyEventState(schedule,42*120,23,0,'clear').galaxy,false);
  assert.equal(skyEventState(schedule,18*120,23,3,'clear').aurora,true);
  for(const weather of ['rain','snow','overcast','fog']){const s=skyEventState(schedule,18*120,23,3,weather);assert.equal(s.aurora,false);assert.equal(s.galaxy,false);}
  assert.equal(skyEventState(schedule,7*120,12,3,'clear').aurora,false);
});
test('sun and moon rise on opposite sides while galaxy, aurora and aircraft actually enter the scene',()=>{
  const scene=new THREE.Scene(),a=createAtmosphere(scene),center=new THREE.Vector3(800,170,-900);
  a.update(12,'clear',0,center,weatherState('clear',0),0);
  const sun=scene.getObjectByName('sun-disc'),moon=scene.getObjectByName('moon-disc');assert.equal(sun.visible,true);assert.equal(moon.visible,false);
  const flightAt=a.getSkyState().nextFlight;
  a.update(12,'clear',flightAt+20,center,weatherState('clear',0),0);assert.equal(scene.getObjectByName('distant-airplane').visible,true);assert.ok(scene.getObjectByName('airplane-contrail').visible);
  a.update(23,'clear',2160,center,weatherState('clear',0),3);assert.equal(sun.visible,false);assert.equal(moon.visible,true);assert.equal(scene.getObjectByName('winter-aurora').visible,true);
  const galaxyNight=a.getSkyState().galaxyNights[0];a.update(23,'clear',(galaxyNight-1)*2880+2160,center,weatherState('clear',0),3);assert.equal(scene.getObjectByName('milky-way').visible,true);
  a.update(23,'snow',2160,center,weatherState('snow'),3);assert.equal(scene.getObjectByName('winter-aurora').visible,false);assert.equal(scene.getObjectByName('milky-way').visible,false);assert.equal(moon.visible,false);
});
