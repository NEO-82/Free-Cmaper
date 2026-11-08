import test from 'node:test';
import assert from 'node:assert/strict';
import {createStreamClearance} from '../src/stream-clearance.js';
import {tunnelArchCeiling,tunnelExcavationCeiling} from '../src/tunnel-mountain-seal.js';

test('terrain triangles stay below a sloping stream across its full width',()=>{
 const carve=createStreamClearance([{x:0,z:0,y:80,width:32},{x:0,z:200,y:0,width:32}]);
 for(let x=-16;x<=16;x+=2)for(let z=5;z<195;z+=2){
  const gx=Math.floor(x/10)*10,gz=Math.floor(z/10)*10,tx=(x-gx)/10,tz=(z-gz)/10;
  const y=(1-tx)*(1-tz)*carve(gx,gz,300)+tx*(1-tz)*carve(gx+10,gz,300)+(1-tx)*tz*carve(gx,gz+10,300)+tx*tz*carve(gx+10,gz+10,300);
  assert.ok(y<80-z*.4-.2,`blocked at ${x},${z}`);
 }
 assert.equal(carve(100,100,300),300);
 assert.equal(carve(0,100,-20),-20,'never raise a low bed');
});
test('short waterfall cannot retain a grid ridge under the falling water',()=>{
 const carve=createStreamClearance([{x:0,z:0,y:100,width:22},{x:0,z:8,y:35,width:22}]);
 for(const x of [-10,0,10])for(const z of [-10,0,10,20])assert.ok(carve(x,z,200)<=32);
});
test('excavation padding covers mask quantization inside visible tunnel arch',()=>{
 for(let x=-16.9;x<17;x+=.1){
  const ceiling=tunnelArchCeiling(2.5,x);
  for(const error of [-2,0,2])assert.ok(tunnelExcavationCeiling(2.5,x+error)>ceiling);
 }
 assert.equal(tunnelExcavationCeiling(2.5,19),-Infinity);
 assert.ok(tunnelExcavationCeiling(2.5,0)<2.5+12.3,'rock backing covers excavation');
});
