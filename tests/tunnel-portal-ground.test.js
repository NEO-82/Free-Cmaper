import test from 'node:test';
import assert from 'node:assert/strict';
import {isWithinTunnelCut,buildPortalFoundation} from '../src/tunnel-portal-ground.js';
function mask(size,cells){const data=new Uint8Array(size*size*4);for(const [x,z,height] of cells){const k=(z*size+x)*4,n=Math.round(height/512*65535);data[k]=n>>8;data[k+1]=n&255;data[k+2]=data[k+3]=255;}return data;}
test('excavation removes mountain intrusions but preserves the low floor and terrain above the ceiling',()=>{
 for(const floor of [2.5,60,450]){
  const ceiling=floor+11.3;
  assert.equal(isWithinTunnelCut(floor-.08,ceiling),false);
  assert.equal(isWithinTunnelCut(floor,ceiling),true);
  assert.equal(isWithinTunnelCut(floor+7,ceiling),true);
  assert.equal(isWithinTunnelCut(floor+12,ceiling),false);
 }
 assert.equal(isWithinTunnelCut(0,-Infinity),false);assert.equal(isWithinTunnelCut(0,Infinity),false);
});
test('continuous support covers every excavated raster cell without extending into unmarked cells',()=>{
 const size=8,cells=[[1,1,13.8],[2,1,13.8],[3,1,13.8],[5,1,13.8],[1,2,13.8],[2,2,13.8],[3,2,13.8],[5,2,17.8]];
 const bounds={minX:-40,maxX:40,minZ:-40,maxZ:40},result=buildPortalFoundation({data:mask(size,cells),size,bounds});
 assert.equal(result.cells,cells.length);assert.equal(result.spans.length,4);
 for(let z=0;z<size;z++)for(let x=0;x<size;x++){
  const wx=-40+(x+.5)*10,wz=-40+(z+.5)*10,expected=cells.find(c=>c[0]===x&&c[1]===z),hits=result.spans.filter(s=>wx>=s.x0&&wx<s.x1&&wz>=s.z0&&wz<s.z1);
  assert.equal(hits.length,expected?1:0);
  if(expected){assert.ok(Math.abs(hits[0].floor-(expected[2]-11.42))<.005);assert.ok(isWithinTunnelCut(hits[0].floor,result.ceilingAt(wx,wz))===false);}
 }
 assert.equal(result.indices.length,result.spans.length*6);
 for(let i=0;i<result.indices.length;i+=3){const p=result.positions,a=result.indices[i]*3,b=result.indices[i+1]*3,c=result.indices[i+2]*3;const normalY=(p[b+2]-p[a+2])*(p[c]-p[a])-(p[b]-p[a])*(p[c+2]-p[a+2]);assert.ok(normalY>0,'floor faces upward');}
});
test('foundation leaves real sea outside the island open and separates floor levels',()=>{
 const size=4,data=mask(size,[[0,0,13.8],[1,0,13.8],[2,0,18.8],[3,0,18.8]]),bounds={minX:0,maxX:40,minZ:0,maxZ:40};
 const result=buildPortalFoundation({data,size,bounds,heightAt:x=>x<10?-1:2.42});assert.equal(result.cells,3);assert.equal(result.spans.length,2);assert.ok(result.spans.every(s=>s.x0>=10));
 assert.equal(result.ceilingAt(-1,5),-Infinity);assert.equal(result.ceilingAt(5,45),-Infinity);
});
