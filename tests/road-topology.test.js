import test from 'node:test';
import assert from 'node:assert/strict';
import {findRoadJunctions} from '../src/road-topology.js';
import {ROADS,ROAD_JUNCTIONS,TUNNELS,roadSurfaceAt} from '../src/road-network.js';
const line=(id,x,z,ex,ez,{y=2.5,tunnel=false}={})=>{const length=Math.hypot(ex-x,ez-z);return {id,length,track:[{x,z,y,tunnel,distance:0},{x:ex,z:ez,y,tunnel,distance:length}]};};
test('junction detection finds geometric crossings, five-way hubs and grade separation',()=>{
 const roads=[line('ew',-100,0,100,0),line('ns',0,-100,0,100),line('branch',0,0,100,100)];
 const [hub]=findRoadJunctions(roads);assert.equal(hub.arms,5);assert.equal(hub.underground,false);
 assert.equal(findRoadJunctions([roads[0],line('tunnel',0,-100,0,100,{tunnel:true})])[0].underground,true);
 assert.equal(findRoadJunctions([roads[0],line('overpass',0,-100,0,100,{y:20})]).length,0);
});
test('bypasses have no underground junctions, at most four arms, and at least 160m between junctions',()=>{
 assert.equal(ROAD_JUNCTIONS.length,10);
 for(let i=0;i<ROAD_JUNCTIONS.length;i++){
  const j=ROAD_JUNCTIONS[i];assert.ok(j.arms>=3&&j.arms<=4);assert.equal(j.underground,false);
  for(let k=i+1;k<ROAD_JUNCTIONS.length;k++)assert.ok(Math.hypot(j.x-ROAD_JUNCTIONS[k].x,j.z-ROAD_JUNCTIONS[k].z)>160);
 }
 const reached=new Set(['gateway']);let changed=true;
 while(changed){changed=false;for(const j of ROAD_JUNCTIONS)if(j.roads.some(id=>reached.has(id)))for(const id of j.roads)if(!reached.has(id)){reached.add(id);changed=true;}}
 assert.equal(reached.size,ROADS.length,'every village, shop access and summit road remains connected');
});
test('all tunnel corridors remain clear of other roads and portals stand back from junctions',()=>{
 assert.ok(TUNNELS.length>0);
 for(const t of TUNNELS){
  for(const p of t.track){const other=roadSurfaceAt(p.x,p.z,{excludeRoad:t.road,altitude:p.y});assert.ok(other.distance>(t.road.width+(other.road?.width??22))/2+2||Math.abs(other.height-p.y)>=11,t.id+' intersects '+other.road?.id);}
  for(const p of [t.track[0],t.track.at(-1)])for(const j of ROAD_JUNCTIONS)assert.ok(Math.hypot(p.x-j.x,p.z-j.z)>80);
 }
});
