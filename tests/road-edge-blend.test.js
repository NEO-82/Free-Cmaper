import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRoadEdgeBlend,bridgeBedHeight} from '../src/road-edge-blend.js';

const road={width:22,track:Array.from({length:11},(_,i)=>({x:0,y:10+i*.2,z:i*2}))};
test('bridge approaches do not inherit the submerged bed through terrain interpolation',()=>{
 const b={startX:0,endX:500,z:0,width:22,height:4.5};
 for(const x of [0,5,10,490,495,500])assert.equal(bridgeBedHeight(b,x,13,10),4.5);
 assert.equal(bridgeBedHeight(b,250,0,10),-5,'span remains submerged');
 assert.equal(bridgeBedHeight(b,5,60,10),-5,'no wide sand apron');
});
test('large gaps keep continuous faces and a smooth ramp on both sides',()=>{
 for(const side of [-1,1]){
  const {positions:p,indices,columns:c}=buildRoadEdgeBlend(road,side,{heightAt:()=>7});
  assert.equal(indices.length,10*(c-1)*6);
  for(let i=0;i<11;i++){
   const first=i*c*3,last=(i*c+c-1)*3;
   assert.equal(p[first],side*10.95);
   assert.equal(p[first+1],road.track[i].y+.005);
   assert.equal(p[last+1],6.96,'outer rim overlaps terrain to hide cracks');
   for(let j=1;j<c;j++)assert.ok(p[(i*c+j)*3+1]<p[(i*c+j-1)*3+1]);
  }
 }
});
test('tunnels, bridge spans and streams do not get filled by road shoulders',()=>{
 const tunnel={...road,track:road.track.map(p=>({...p,tunnel:true}))};
 assert.equal(buildRoadEdgeBlend(tunnel,1,{heightAt:()=>0}).indices.length,0);
 const {positions:p,indices}=buildRoadEdgeBlend(road,1,{heightAt:()=>0,excludedAt:(x,z)=>z>7&&z<13});
 for(let i=0;i<indices.length;i+=3){
  const z=indices.slice(i,i+3).reduce((sum,k)=>sum+p[k*3+2],0)/3;
  assert.ok(z<=7||z>=13);
 }
});
test('village and curved mountain road seams use the road tangent and their own widths',()=>{
 for(const width of [8,22]){
  const curved={width,track:[{x:0,z:0,y:2},{x:2,z:3,y:3},{x:3,z:8,y:4}]};
  const {positions:p,columns:c}=buildRoadEdgeBlend(curved,-1,{heightAt:(x,z)=>z*.1});
  const nx=8/Math.hypot(3,8),nz=-3/Math.hypot(3,8);
  assert.ok(Math.abs(p[c*3]-(2-nx*(width/2-.05)))<1e-10);
  assert.ok(Math.abs(p[c*3+2]-(3-nz*(width/2-.05)))<1e-10);
  assert.ok(p.every(Number.isFinite));
 }
});
