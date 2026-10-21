import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WORLD,DESERT,VILLAGE_SITES,isDesert,desertAmount,dunesHeight,grassPatch,coastDistance,islandDistance,ISLAND_OUTLINE,MOUNTAIN_PEAKS,ROADS,TUNNELS,SHOP_SITES,roadSurfaceAt,travelHeight,landscapeHeight,tunnelAt,tunnelCeilingAt,terrainHeight} from '../src/terrain.js';
import {tunnelWallColliders,constrainTunnelCamera} from '../src/road-view.js';
import {VEHICLES,stepDrive,createVehicle} from '../src/vehicles.js';
import {picnicNotes} from '../src/picnic-score.js';
import {PARKING} from '../src/journey.js';

test('reference island has bays, a closed coastal loop, interconnected roads and secondary mountain peaks',()=>{
 assert.ok(ISLAND_OUTLINE.length>400);assert.ok(MOUNTAIN_PEAKS.length>=15);
 const coast=ROADS.find(r=>r.closed);assert.ok(coast.length>8000);assert.ok(Math.hypot(coast.track[0].x-coast.track.at(-1).x,coast.track[0].z-coast.track.at(-1).z)<.01);
 for(const p of coast.track)assert.ok(islandDistance(p.x,p.z)>-10,`coast road leaves land at ${p.x},${p.z}`);
 assert.ok(ROADS.length>=12);assert.equal(coast.pavementWidth,18);assert.equal(coast.width,22);
});
test('one stable coastal desert covers about fifteen percent of the world, with varied dune relief and patchy meadows elsewhere',()=>{
 let desert=0,total=0,patches=0,bare=0,min=Infinity,max=-Infinity;
 for(let x=WORLD.minX+20;x<WORLD.maxX;x+=40)for(let z=WORLD.minZ+20;z<WORLD.maxZ;z+=40){total++;if(isDesert(x,z)){desert++;min=Math.min(min,dunesHeight(x,z));max=Math.max(max,dunesHeight(x,z));}else if(coastDistance(x,z)>80){if(grassPatch(x,z))patches++;else bare++;}}
 assert.ok(Math.abs(desert/total-.15)<.008);assert.ok(max-min>20);assert.ok(patches>500&&bare>500);assert.equal(DESERT.seed,82021);
});
test('three villages have dedicated shops and access roads on dry flat sites',()=>{
 assert.equal(VILLAGE_SITES.length,3);assert.equal(SHOP_SITES.length,7);
 for(const v of VILLAGE_SITES){assert.equal(terrainHeight(v.x,v.z),2.5);assert.ok(islandDistance(v.x,v.z)>80);assert.ok(SHOP_SITES.some(s=>s.id===v.id+'-shop'));assert.ok(ROADS.some(r=>Math.hypot(r.track.at(-1).x-v.x,r.track.at(-1).z-v.z)<1));}
});
test('tunnels have real walls, ample vehicle clearance, roofs and distinct travel layers',()=>{
 assert.ok(TUNNELS.length>=2);const walls=tunnelWallColliders();assert.ok(walls.length>100);
 for(const t of TUNNELS){const p=t.track[Math.floor(t.track.length/2)],inside=tunnelAt(p.x,p.z,p.y);assert.ok(inside);assert.ok(tunnelCeilingAt(p.x,p.z,p.y)-p.y>10);assert.ok(landscapeHeight(p.x,p.z)>p.y+11);assert.ok(Math.abs(travelHeight(p.x,p.z,p.y)-p.y)<.05);assert.ok(walls.some(w=>w.id===t.id+'-wall'));}
});
const flat={heightAt:()=>2.5};
function drive(initial,input,seconds,rate=120,env=flat){let state=initial;for(let i=0;i<seconds*rate;i++)state=stepDrive(state,input,1/rate,[],env);return state;}
test('handbrake at speed produces lateral momentum, releasing it restores grip, and low-speed application stops',()=>{
 for(const kind of Object.keys(VEHICLES)){
  const start={kind,...PARKING,heading:Math.PI/2,speed:25};
  const normal=drive(start,{left:true,forward:true},.7),slide=drive(start,{left:true,handbrake:true},.7);
  assert.ok(slide.drifting,kind);assert.ok(Math.abs(slide.slipAngle)>Math.abs(normal.slipAngle)*2);assert.ok(slide.x>start.x+10,'momentum continues rather than spinning in place');
  const recover=drive(slide,{forward:true},1.8);assert.ok(Math.abs(recover.slipAngle)<.03);assert.equal(recover.traction,1);
  const stopped=drive({...start,speed:3},{handbrake:true},1);assert.equal(stopped.speed,0);
  const at60=drive(start,{left:true,handbrake:true},.7,60);assert.ok(Math.hypot(at60.x-slide.x,at60.z-slide.z)<.001);
 }
});
test('vehicles leave elevated road edges, fall under gravity with momentum and settle on lower ground',()=>{
 for(const kind of Object.keys(VEHICLES)){
  const origin={kind,...PARKING,heading:Math.PI/2,speed:12,bodyY:12};const heightAt=(x)=>x<origin.x+3?12:2.5;
  let state=drive(origin,{forward:true},.65,120,{heightAt});assert.ok(state.x>origin.x+4);assert.ok(state.airborne,kind);assert.ok(state.bodyY<12&&state.bodyY>3);
  state=drive(state,{brake:true},3,120,{heightAt});assert.equal(state.airborne,false);assert.ok(Math.abs(state.bodyY-2.5)<.02);assert.ok(Number.isFinite(state.roll));
 }
});
test('all four vehicles have actual front spotlights, brake lamps and reversing lamps with automatic dark-mode switching',()=>{
 for(const kind of Object.keys(VEHICLES)){
  const model=createVehicle(new THREE.Scene(),kind,PARKING);assert.ok(model.headlight.isSpotLight);model.setLights({dark:true});assert.ok(model.headlight.intensity>0);assert.equal(model.lights.auto,true);
  model.update({...model.state,braking:true});model.setLights({dark:false});assert.equal(model.lights.brake,true);assert.equal(model.headlight.intensity,0);assert.ok(model.lamps.find(m=>m.name==='brake light').material.emissiveIntensity>3);
  model.update({...model.state,braking:false,reversing:true});model.setLights();assert.equal(model.lights.reverse,true);assert.ok(model.lamps.find(m=>m.name==='reverse light').material.emissiveIntensity>2);model.dispose();
 }
});
test('picnic score varies over sixteen bars with bass, chord strums, melody and light percussion',()=>{
 const bars=Array.from({length:128},(_,i)=>picnicNotes(i));assert.deepEqual(picnicNotes(0),picnicNotes(128));const melody=bars.flat().filter(n=>n.voice==='flute');assert.ok(new Set(melody.map(n=>n.note)).size>10);assert.ok(new Set(bars.flat().map(n=>n.voice)).size>=5);assert.ok(bars.some(b=>!b.some(n=>n.voice==='flute')));assert.ok(bars.flat().every(n=>n.note>=40&&n.note<=100&&n.duration>0));
});

test('a third-person camera outside a curved tunnel is brought inside without changing first-person look',()=>{
 const t=TUNNELS[0],p=t.track[Math.floor(t.track.length/2)],r=roadSurfaceAt(p.x,p.z,{altitude:p.y});
 const focus=new THREE.Vector3(p.x,p.y+.7,p.z),camera=new THREE.PerspectiveCamera();camera.position.set(p.x+Math.cos(r.heading)*16,p.y+15,p.z-Math.sin(r.heading)*16);constrainTunnelCamera(camera,focus);
 assert.ok(roadSurfaceAt(camera.position.x,camera.position.z,{altitude:p.y}).distance<9);assert.ok(camera.position.y<=p.y+5.5);
 camera.position.copy(focus).add(new THREE.Vector3(0,2,0));camera.rotation.set(.2,1.7,0);const before=camera.quaternion.clone();constrainTunnelCamera(camera,focus);assert.ok(camera.quaternion.equals(before));
});
