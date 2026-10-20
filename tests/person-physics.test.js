import test from 'node:test';
import assert from 'node:assert/strict';
import {createPerson,jumpPerson,stepPerson,PERSON}from '../src/person-physics.js';
import {trailPoint,terrainHeight,terrainSlope,TRAIL_SAMPLES,SUMMIT,riverX}from '../src/terrain.js';
const flat={heightAt:()=>0,slopeAt:()=>0,waterAt:()=>false};
function simulate(state,input,seconds,env=flat){for(let i=0;i<seconds*120;i++)state=stepPerson(state,input,1/120,env);return state;}

test('jump has world-space momentum and gravity, lands without sinking, and cannot jump again in midair',()=>{
  let p=createPerson({x:0,y:0,z:0});assert.equal(jumpPerson(p),true);assert.equal(jumpPerson(p),false);
  let peak=0;for(let i=0;i<180;i++){p=stepPerson(p,{x:1,z:0,speed:8},1/120,flat);peak=Math.max(peak,p.y);}
  assert.ok(peak>2&&peak<2.2);assert.ok(p.x>7);assert.equal(p.y,0);assert.equal(p.grounded,true);
  const held=stepPerson(p,{},0,flat);assert.deepEqual(held,p);
});
test('jump clears a low obstacle while tall walls still block a sprint-sized movement',()=>{
  const low={kind:'box',id:'low-rock',minX:0,maxX:1,minZ:-2,maxZ:2,minY:0,maxY:.9};
  let p=createPerson({x:-3,y:0,z:0});p.vx=8;jumpPerson(p);p=simulate(p,{x:1,z:0,speed:8},1.3,{...flat,colliders:[low]});assert.ok(p.x>2);assert.equal(p.grounded,true);
  const tall={...low,maxY:8};p=createPerson({x:-3,y:0,z:0});p.vx=24;jumpPerson(p);p=simulate(p,{x:1,z:0,speed:24},1.5,{...flat,colliders:[tall]});assert.ok(p.x<=-PERSON.radius+.01);
});
test('feet land on a platform and fall continuously after walking off it; ceilings stop upward motion',()=>{
  const platform={kind:'box',id:'platform',minX:-2,maxX:2,minZ:-2,maxZ:2,minY:0,maxY:1.2};
  let p={...createPerson({x:0,y:3,z:0}),grounded:false};p=simulate(p,{speed:0},1,{...flat,colliders:[platform]});assert.equal(p.y,1.2);assert.equal(p.supportId,'platform');
  p=simulate(p,{x:1,speed:8},.5,{...flat,colliders:[platform]});assert.ok(p.x>2);assert.ok(p.y>=0&&p.y<1.2);
  p=createPerson({x:0,y:0,z:0});jumpPerson(p);let max=0;for(let i=0;i<120;i++){p=stepPerson(p,{},1/120,{...flat,ceilingAt:()=>3.5});max=Math.max(max,p.y);}assert.ok(max<=.7+.001);
});
test('a running jump crosses the actual river without switching to swimming in midair',()=>{
  const z=400,x=riverX(z);let p=createPerson({x:x-9,y:terrainHeight(x-9,z),z});p.vx=24;jumpPerson(p);let swam=false;
  for(let i=0;i<170;i++){p=stepPerson(p,{x:1,z:0,speed:24},1/120);swam||=p.swimming;}
  assert.equal(swam,false);assert.ok(p.x>x+12);assert.equal(p.grounded,true);
});
test('falling into deep water activates buoyancy, dive/rise, and an actual shallow bank can be walked out',()=>{
  const z=400,x=riverX(z);let p=createPerson({x,y:3,z});p.grounded=false;p=simulate(p,{speed:0},4,{});
  assert.equal(p.swimming,true);assert.ok(p.y<-.5&&p.y>-2);
  const surface=p.y;p=simulate(p,{speed:0,dive:true},.15,{});assert.ok(p.diveDepth>0);p=simulate(p,{speed:0,rise:true},2,{});assert.equal(p.diveDepth,0);
  p=simulate(p,{x:1,speed:3.4},6,{});assert.ok(p.x>x+7);assert.equal(p.swimming,false);assert.equal(p.grounded,true);
});
test('the entire new curling trail has a gentle grade across its usable width and is physically walkable',()=>{
  let previous=trailPoint(0),length=0,maxGrade=0;let p=createPerson({...previous,y:terrainHeight(previous.x,previous.z)});
  for(let i=1;i<=TRAIL_SAMPLES;i++){
    const next=trailPoint(i/TRAIL_SAMPLES),dx=next.x-previous.x,dz=next.z-previous.z,d=Math.hypot(dx,dz);length+=d;
    maxGrade=Math.max(maxGrade,Math.abs(terrainHeight(next.x,next.z)-terrainHeight(previous.x,previous.z))/d);
    for(const side of [-3,0,3])assert.ok(terrainSlope(next.x-dz/d*side,next.z+dx/d*side)<.34,`lane too steep at ${i}/${side}`);
    // Follow the same input/controller path as the browser, including acceleration and corners.
    for(let n=0;n<80&&Math.hypot(p.x-next.x,p.z-next.z)>.20;n++){
      const dd=Math.hypot(p.x-next.x,p.z-next.z);p=stepPerson(p,{x:(next.x-p.x)/dd,z:(next.z-p.z)/dd,speed:8},1/120);
    }
    assert.ok(Math.hypot(p.x-next.x,p.z-next.z)<.25,`blocked at trail segment ${i}`);previous=next;
  }
  assert.ok(length>1000);assert.ok(maxGrade<.3);assert.ok(Math.hypot(p.x-SUMMIT.x,p.z-SUMMIT.z)<.25);assert.equal(p.y,SUMMIT.height);
});
