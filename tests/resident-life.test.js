import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createResidentModel,randomizeVehiclePaint,VEHICLE_PALETTE,residentSeatPose} from '../src/resident-appearance.js';
import {createResidentRoadGraph,drivingPath,sampleDrivingPath} from '../src/resident-roads.js';
import {createResidentTraffic} from '../src/resident-traffic.js';
import {tunnelArchCeiling,tunnelPortalCut,sealSections,addTunnelMountainSeals,createTunnelPortalPlanes,canCarveTunnelSegment} from '../src/tunnel-mountain-seal.js';
import {buildPortalFoundation,isWithinTunnelCut} from '../src/tunnel-portal-ground.js';
let seed=8247;const random=()=>{seed=seed*16807%2147483647;return (seed-1)/2147483646;};
test('independent resident models have varied faces, clothing and accessories and support seated driving',()=>{
 const scene=new THREE.Scene(),models=Array.from({length:20},()=>createResidentModel(scene,THREE,{random}));
 assert.equal(new Set(models.map(m=>m.appearance.fingerprint)).size,20);assert.ok(models.every(m=>m.settings.species==='resident'));
 assert.ok(models.some(m=>m.appearance.hat)&&models.some(m=>m.appearance.glasses));
 for(const m of models){m.pose('sit');m.pose('stand',true,1000);m.root.traverse(o=>assert.ok(o.position.toArray().every(Number.isFinite)));m.dispose();}assert.equal(scene.children.length,0);
});
test('paint changes all vehicle kinds while preserving windows, tyres and lamps and can be reassigned',()=>{
 const bases={sedan:'#e6bd73',suv:'#8eaf99',scooter:'#d9907f',motorhome:'#eee7d5',helicopter:'#f4bc57'};
 for(const [kind,base] of Object.entries(bases)){const root=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:base})),glass=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'#bdd9cf',transparent:true}));root.add(body,glass);const vehicle={root,state:{kind}};randomizeVehiclePaint(vehicle,kind,()=>.3);assert.equal(body.material.color.getHexString(),VEHICLE_PALETTE[3].slice(1));assert.equal(glass.material.color.getHexString(),'bdd9cf');randomizeVehiclePaint(vehicle,kind,()=>.8);assert.equal(body.material.color.getHexString(),VEHICLE_PALETTE[9].slice(1));}
});
test('resident roads connect junctions and loops but never join an overhead road to the road below',()=>{
 const line=(id,x0,z0,x1,z1,y=2.5)=>({id,track:Array.from({length:61},(_,i)=>({x:x0+(x1-x0)*i/60,z:z0+(z1-z0)*i/60,y}))});
 const graph=createResidentRoadGraph([line('east',-60,0,60,0),line('north',0,-60,0,60),line('overpass',-60,0,60,0,50)]);
 assert.equal(graph.components.length,2);const path=graph.route({x:-60,z:0},{x:0,z:60});assert.ok(path.length>2);assert.ok(path.every(n=>n.y===2.5));const smoothed=drivingPath(path);assert.ok(smoothed.length>70);for(let d=0;d<smoothed.length;d+=2){const p=sampleDrivingPath(smoothed,d);assert.ok([p.x,p.y,p.z,p.heading].every(Number.isFinite));}
});
test('three village driving roles travel, stop for visits and continue on the same vehicle models',()=>{
 const track=[];for(const [a,b] of [[[0,0],[1000,0]],[[1000,0],[1000,1000]],[[1000,1000],[0,1000]],[[0,1000],[0,0]]])for(let i=0;i<100;i++)track.push({x:a[0]+(b[0]-a[0])*i/100,z:a[1]+(b[1]-a[1])*i/100,y:2.5});track.push({...track[0]});
 const data={ROADS:[{id:'coastal-loop',width:8,closed:true,track}],VILLAGE_SITES:[{id:'a'},{id:'b'},{id:'c'}],SHOP_SITES:[{x:200,z:25},{x:975,z:450},{x:500,z:975}],roadSurfaceAt:()=>({distance:0,height:2.5}),tunnelAt:()=>null};
 const villages={residents:data.VILLAGE_SITES.flatMap((v,i)=>Array.from({length:4},(_,n)=>({id:v.id+n,village:v.id,home:{x:i===1?1000:i===2?500:0,z:i===1?350:i===2?1000:0},model:{root:new THREE.Group(),pose(){}}})))};
 const createVehicle=(scene,kind,p,heading)=>{let state={kind,...p,heading,bodyY:2.5,speed:0};const root=new THREE.Group();root.userData.paintColor='#79acd0';scene.add(root);return {root,config:{length:kind==='motorhome'?8.8:6},get state(){return state;},update(s){state={...s};root.position.set(s.x,s.bodyY,s.z);},setLights(){}};};
 const traffic=createResidentTraffic({scene:new THREE.Scene(),villages,data,createVehicle,world:{renderedTerrainHeight:()=>2.5},random});
 assert.ok(traffic.agents.every(a=>Math.hypot(a.start.x-a.anchor.x,a.start.z-a.anchor.z)<11.1),'parking stays clear of the village shop walls');
 for(let i=0;i<5000;i++)traffic.update(.1);const state=traffic.getState();assert.equal(state.routeFailures,0);assert.equal(state.agents.length,9);assert.equal(new Set(state.agents.map(a=>a.role)).size,3);assert.ok(state.agents.every(a=>a.travelled>100));assert.ok(state.agents.some(a=>a.role==='shop_commuter'&&a.visits>0));assert.equal(traffic.colliders().length,9);const a=traffic.agents.find(a=>a.phase==='driving'&&a.speed>3);const before={...a.vehicle.state},obstacle={x:before.x+Math.sin(before.heading)*10,z:before.z+Math.cos(before.heading)*10,bodyY:before.bodyY,heading:before.heading};for(let i=0;i<30;i++)traffic.update(.1,{player:obstacle});assert.ok(a.speed<.1,'a suddenly close obstacle still cannot be driven through');
});
test('arched excavation stays inside the lining and solid mountain collars leave the driving envelope open',()=>{
 const p={x:0,z:0,y:2.5,heading:0};assert.equal(tunnelArchCeiling(2.5,17),-Infinity);assert.ok(tunnelArchCeiling(2.5,0)>13&&tunnelArchCeiling(2.5,0)<13.3);assert.equal(tunnelPortalCut(p,0,-4),-Infinity);assert.equal(tunnelPortalCut(p,0,8),-Infinity);assert.ok(!isWithinTunnelCut(2.42,tunnelArchCeiling(2.5,16),2.5));
 const {inner,outer}=sealSections();assert.equal(inner.length,outer.length);assert.ok(outer[9][1]>inner[9][1]+1.5);
 const root=new THREE.Group(),track=[{x:0,z:0,y:2.5,nx:1,nz:0},{x:0,z:50,y:2.5,nx:1,nz:0},{x:0,z:100,y:2.5,nx:1,nz:0}];addTunnelMountainSeals({root,tunnels:[{id:'test'}],liningTrack:()=>track,constructors:THREE});root.updateMatrixWorld(true);
 for(const x of [-7,0,7]){const ray=new THREE.Raycaster(new THREE.Vector3(x,5,-10),new THREE.Vector3(0,0,1),0,130);assert.equal(ray.intersectObject(root,true).length,0,'collars must not block the road');}
 const data=new Uint8Array(4*4*4);for(let k=0;k<data.length;k+=4){const n=Math.round(9.1/512*65535);data[k]=n>>8;data[k+1]=n&255;data[k+2]=255;}const floor=buildPortalFoundation({data,size:4,bounds:{minX:0,maxX:10,minZ:0,maxZ:10},roadFloor:2.5});assert.ok(floor.spans.every(s=>Math.abs(s.floor-2.38)<1e-8));
});

test('segment end caps cannot excavate the mountain outside the short supported portal throat',()=>{
 const track=[{x:0,z:0,y:2.5,distance:0,tunnel:true},{x:0,z:2,y:2.5,distance:2,tunnel:true},{x:0,z:98,y:2.5,distance:98,tunnel:true},{x:0,z:100,y:2.5,distance:100,tunnel:true}],planes=createTunnelPortalPlanes([{id:'t',track}]).get('t');
 assert.equal(canCarveTunnelSegment({a:track[0],b:track[1]},planes,0,-10),false);
 assert.equal(canCarveTunnelSegment({a:track[2],b:track[3]},planes,0,110),false);
 assert.equal(canCarveTunnelSegment({a:track[0],b:track[1]},planes,5,1),true);
 assert.equal(canCarveTunnelSegment({a:{...track[0],tunnel:false},b:track[1]},planes,0,0),false);
});

test('every driver stays centered on the real seat on slopes, including the scooter',()=>{
 for(const kind of ['sedan','suv','motorhome','scooter'])for(const heading of [0,.7,2.4])for(const pitch of [-.12,0,.15]){
  const state={x:20,z:-30,bodyY:2.5,heading,pitch},scale=kind==='scooter'?1.12:.8,p=residentSeatPose(kind,state,scale),rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(p.pitch,heading,0,'YXZ')),hip=new THREE.Vector3(0,.84*scale,0).applyQuaternion(rotation).add(new THREE.Vector3(p.x,p.y,p.z));
  const expected=new THREE.Vector3(kind==='scooter'?0:kind==='motorhome'?-.605:-.55,kind==='scooter'?1.21:kind==='motorhome'?2.05:1.875,kind==='scooter'?.05:kind==='motorhome'?2.75:0).applyEuler(new THREE.Euler(pitch,heading,0,'YXZ')).add(new THREE.Vector3(20,2.5,-30));
  assert.ok(hip.distanceTo(expected)<1e-8,kind+' driver not on seat');
 }
});
