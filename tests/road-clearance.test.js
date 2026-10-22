import test from 'node:test';
import assert from 'node:assert/strict';
import {ROADS,WORLD,roadUnderlayLimit} from '../src/terrain.js';
import {pathUnderlayHeight} from '../src/paths.js';
import {portalCutHeight} from '../src/road-view.js';

test('rendered four-metre terrain cells stay below exposed road centres and shoulders',()=>{
 let count=0;
 for(const road of ROADS)for(let i=2;i<road.track.length-2;i+=3){
  const p=road.track[i],a=road.track[i-1],b=road.track[i+1];if(a.tunnel||p.tunnel||b.tunnel)continue;
  const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
  for(const side of [-road.width/2,0,road.width/2]){
   const x=p.x+dz/len*side,z=p.z-dx/len*side,x0=WORLD.minX+Math.floor((x-WORLD.minX)/4)*4,z0=WORLD.minZ+Math.floor((z-WORLD.minZ)/4)*4,u=(x-x0)/4,v=(z-z0)/4;
   const h00=pathUnderlayHeight(x0,z0),h10=pathUnderlayHeight(x0+4,z0),h01=pathUnderlayHeight(x0,z0+4),h11=pathUnderlayHeight(x0+4,z0+4);
   const h=u+v<=1?h00*(1-u-v)+h10*u+h01*v:h11*(u+v-1)+h10*(1-v)+h01*(1-u);
   assert.ok(h<p.y-.02,`${road.id} sample ${i}, side ${side}: terrain ${h}, road ${p.y}`);count++;
  }
 }
 assert.ok(count>1000);
});
test('portal collar clears ground behind the arch while keeping the mountain roof',()=>{
 const p={x:0,z:0,y:2.5,heading:0};
 assert.ok(portalCutHeight(p,12,0)>10&&portalCutHeight(p,12,0)<13);
 assert.ok(portalCutHeight(p,0,0)>14);
 assert.equal(portalCutHeight(p,14,0),-Infinity);
 assert.equal(portalCutHeight(p,0,20),13.2);
 assert.equal(portalCutHeight(p,12,20),-Infinity);
 assert.equal(roadUnderlayLimit(WORLD.minX,WORLD.minZ,100),100);
});
