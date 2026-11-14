import test from 'node:test';
import assert from 'node:assert/strict';
import {roundedDunes,alpineRelief,alpineHeight,alpineSnow,createAlpineWaters} from '../src/alpine-waters.js';

test('dunes remain low and have continuous gentle rounded slopes',()=>{
 let min=Infinity,max=-Infinity,slope=0;
 for(let x=-2000;x<2000;x+=13)for(let z=-2000;z<2000;z+=17){
  const h=roundedDunes(x,z);min=Math.min(min,h);max=Math.max(max,h);
  slope=Math.max(slope,Math.hypot(roundedDunes(x+.5,z)-roundedDunes(x-.5,z),roundedDunes(x,z+.5)-roundedDunes(x,z-.5)));
 }
 assert.ok(min>=2&&max<=15);assert.ok(max-min>10);assert.ok(slope<.35);
});
test('alpine ridge and permanent snow are confined to one mountain',()=>{
 const m={x:0,z:0,rx:500,rz:500,height:700};
 assert.ok(alpineRelief(0,0,m)>70);
 assert.equal(alpineRelief(1000,0,m),0);
 assert.equal(alpineSnow(0,0,200,m),0);
 assert.equal(alpineSnow(0,0,700,m),1);
 assert.equal(alpineSnow(1000,0,700,m),0);
 assert.equal(alpineHeight(1000,0,m,20),20);
 assert.equal(alpineHeight(20,0,m,700),alpineHeight(20,0,m,600)); // ignore the old narrow summit plateau
});
test('seeded tributaries descend, avoid obstacles, and carve below their water',()=>{
 const options={mountains:[{id:'test',x:0,z:0,rx:500,rz:500,drivable:false}],heightAt:(x,z)=>500-Math.hypot(x,z)*.3,blocked:(x,z)=>x>300,gridStep:10};
 const a=createAlpineWaters(options),b=createAlpineWaters(options);
 assert.deepEqual(a.waters,b.waters);assert.equal(a.waters.length,1);
 const w=a.waters[0];assert.ok(w.points[0].y-w.points.at(-1).y>45);
 for(let i=1;i<w.points.length;i++)assert.ok(w.points[i].y<w.points[i-1].y);
 for(const p of w.points){assert.ok(p.x<=300);assert.ok(a.waterAt(p.x,p.z)!==null);assert.ok(a.terrain(p.x,p.z,options.heightAt(p.x,p.z))<p.y-1);}
 assert.equal(a.waterAt(10000,10000),null);
 assert.equal(a.terrain(10000,10000,250),250); // preserve road grading outside channels
 for(const p of w.points){const h=a.terrain(p.x,p.z,500);assert.equal(a.terrain(p.x,p.z,h),h);}
});
