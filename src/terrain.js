import { campGroundHeight } from './camp-ground.js';
const MAP_SCALE=Math.sqrt(6);
export const WORLD=Object.freeze({minX:-870*MAP_SCALE,maxX:870*MAP_SCALE,minZ:-690*MAP_SCALE,maxZ:690*MAP_SCALE,landMaxX:1670});
// Keep the previous distant scenery bounds and panorama, independently of playable area.
export const SCENERY=Object.freeze({minX:-2610,maxX:2610,minZ:-2070,maxZ:2070});
export const ISLAND=Object.freeze({x:220,z:-50,rx:1450,rz:1470});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function shoreRadius(a){return 1+.014*Math.sin(a*5)+.009*Math.sin(a*9+.5);}
export function islandDistance(x,z){const dx=(x-ISLAND.x)/ISLAND.rx,dz=(z-ISLAND.z)/ISLAND.rz,a=Math.atan2(dz,dx);return (shoreRadius(a)-Math.hypot(dx,dz))*Math.min(ISLAND.rx,ISLAND.rz);}
export function islandCoastPoint(a){const r=shoreRadius(a);return {x:ISLAND.x+Math.cos(a)*ISLAND.rx*r,z:ISLAND.z+Math.sin(a)*ISLAND.rz*r};}
const bridgeZ=1120;
let westLo=WORLD.minX,westHi=ISLAND.x;
for(let i=0;i<50;i++){const mid=(westLo+westHi)/2;if(islandDistance(mid,bridgeZ)>0)westHi=mid;else westLo=mid;}
const bridgeEnd=(westLo+westHi)/2;
export const BRIDGE=Object.freeze({startX:bridgeEnd-500,endX:bridgeEnd,z:bridgeZ,length:500,width:18,height:4.5});
const mainlandWidth=BRIDGE.startX-WORLD.minX,worldArea=(WORLD.maxX-WORLD.minX)*(WORLD.maxZ-WORLD.minZ);
export const MAINLAND=Object.freeze({minX:WORLD.minX,maxX:BRIDGE.startX,minZ:WORLD.maxZ-worldArea*.05/mainlandWidth,maxZ:WORLD.maxZ});
export const ARRIVAL=Object.freeze({x:BRIDGE.startX-140,z:bridgeZ});
export const MOUNTAINS=Object.freeze([
 {id:'cedar',x:-320,z:-200,height:310,radius:32,rx:285,rz:290,drivable:true},
 {id:'sunrise',x:650,z:150,height:245,radius:30,rx:255,rz:260,drivable:true},
 {id:'cloud',x:280,z:-860,height:410,radius:18,rx:310,rz:290,drivable:false},
 {id:'fern',x:-420,z:500,height:205,radius:18,rx:245,rz:230,drivable:false},
 {id:'stone',x:1030,z:-520,height:350,radius:18,rx:265,rz:280,drivable:false},
].map(Object.freeze));
export const SUMMITS=Object.freeze(MOUNTAINS.filter(m=>m.drivable));
export const SUMMIT=SUMMITS[0];
export const MOUNTAIN_RIDGES=MOUNTAINS,ROCK_SHELVES=Object.freeze([]);
export const TRAIL_WIDTH=6,TRAIL_SAMPLES=1200;
export function trailPoint(t,index=0){
 const m=SUMMITS[index]??SUMMIT; t=clamp(t,0,1);const u=Math.min(1,t/.97),a=.70+Math.PI*5*u;
 const r=t<=.97?m.rx*1.18+(24-m.rx*1.18)*u:24*(1-(t-.97)/.03);
 return {x:m.x+Math.sin(a)*r,z:m.z+Math.cos(a)*r};
}
const buckets=new Map();
export const TRAILS=Object.freeze(SUMMITS.map((mountain,index)=>{
 const track=Array.from({length:TRAIL_SAMPLES+1},(_,i)=>trailPoint(i/TRAIL_SAMPLES,index));let length=0;
 track.forEach((p,i)=>{if(i)length+=Math.hypot(p.x-track[i-1].x,p.z-track[i-1].z);p.distance=length;});
 for(let i=1;i<track.length;i++){const a=track[i-1],b=track[i],segment={a,b,mountain};
  for(let gx=Math.floor((Math.min(a.x,b.x)-14)/16);gx<=Math.floor((Math.max(a.x,b.x)+14)/16);gx++)for(let gz=Math.floor((Math.min(a.z,b.z)-14)/16);gz<=Math.floor((Math.max(a.z,b.z)+14)/16);gz++){
   const key=`${gx}:${gz}`;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(segment);
  }
 }
 return {mountain,index,track,length};
}));
export function trailSurfaceAt(x,z){
 let nearest=Infinity,distance=0,mountain=SUMMIT;
 for(const {a,b,mountain:m} of buckets.get(`${Math.floor(x/16)}:${Math.floor(z/16)}`)??[]){const dx=b.x-a.x,dz=b.z-a.z,f=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1),d=(x-a.x-f*dx)**2+(z-a.z-f*dz)**2;
  if(d<nearest){nearest=d;distance=a.distance+(b.distance-a.distance)*f;mountain=m;}
 }
 const length=TRAILS.find(t=>t.mountain===mountain).length;
 return {distance:Math.sqrt(nearest),height:2.5+(mountain.height-2.5)*smooth(0,1,distance/(length-32)),mountain};
}
const starts=SUMMITS.map((m,i)=>trailPoint(0,i));
export const SHOP_SITES=Object.freeze([
 {id:'parking',x:ARRIVAL.x-15,z:ARRIVAL.z-45},
 {id:'island-entry',x:BRIDGE.endX+100,z:BRIDGE.z-36},
 ...starts.map((p,i)=>({id:SUMMITS[i].id+'-gate',x:p.x-55,z:p.z+45})),
].map(Object.freeze));
export const SHOP=SHOP_SITES[0];
export const ROAD_NETWORK=Object.freeze([
 [ARRIVAL,{x:BRIDGE.startX,z:BRIDGE.z},{x:BRIDGE.endX,z:BRIDGE.z},{x:BRIDGE.endX+160,z:BRIDGE.z},{x:40,z:800},starts[0]],
 [{x:40,z:800},{x:1080,z:670},starts[1]],
 ...starts.map((p,i)=>[p,{x:SHOP_SITES[i+2].x,z:SHOP_SITES[i+2].z+14}]),
]);
export function roadPoint(t,branch=0){const points=ROAD_NETWORK[branch],lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.z-points[i].z)),length=lengths.reduce((a,b)=>a+b,0);let d=clamp(t,0,1)*length;
 for(let i=0;i<lengths.length;i++){if(d<=lengths[i]||i===lengths.length-1){const f=d/lengths[i],a=points[i],b=points[i+1];return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f};}d-=lengths[i];}
}
export function roadDistance(x,z){let nearest=Infinity;for(const points of ROAD_NETWORK)for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,f=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);nearest=Math.min(nearest,Math.hypot(x-a.x-f*dx,z-a.z-f*dz));}return nearest;}
export const LAKE=Object.freeze({x:-800,z:250,radiusX:55,radiusZ:42});
export const RIVER_START=280,COAST_START=WORLD.landMaxX-35;
export function riverX(z){return LAKE.x+Math.sin((z-RIVER_START)*.03)*19;}
export function mainlandDistance(x,z){return Math.min(x-MAINLAND.minX,MAINLAND.maxX-x,z-MAINLAND.minZ,MAINLAND.maxZ-z);}
export function coastDistance(x,z){return Math.max(islandDistance(x,z),mainlandDistance(x,z));}
export function bridgeSurfaceAt(x,z){if(Math.abs(z-BRIDGE.z)>BRIDGE.width/2||x<BRIDGE.startX-60||x>BRIDGE.endX+60)return null;const ramp=Math.min(smooth(BRIDGE.startX-60,BRIDGE.startX,x),1-smooth(BRIDGE.endX,BRIDGE.endX+60,x));return 2.5+2*ramp;}
export function isWater(x,z){
 if(bridgeSurfaceAt(x,z)!==null)return false;
 if(coastDistance(x,z)<=0)return true;
 const lake=((x-LAKE.x)/LAKE.radiusX)**2+((z-LAKE.z)/LAKE.radiusZ)**2;
 return lake<1||(z>=RIVER_START&&Math.abs(x-riverX(z))<5.5);
}
export function baseTerrainHeight(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z))return 0;
 const bridge=bridgeSurfaceAt(x,z);if(bridge!==null)return bridge;
 const coast=coastDistance(x,z);
 if(coast<=0)return -.15-Math.min(8,-coast*.06);
 let h=Math.max(.65,2.5+Math.sin(x*.026)*Math.cos(z*.021)*2.2+Math.sin(x*.012+z*.041)*1.15);
 if(islandDistance(x,z)>0){
  for(const m of MOUNTAINS){const d=Math.hypot((x-m.x)/m.rx,(z-m.z)/m.rz),top=m.radius/Math.min(m.rx,m.rz);h=Math.max(h,2.5+(m.height-2.5)*(1-smooth(top,1.15,d)));}
  const path=trailSurfaceAt(x,z);if(path.distance<14){const blend=1-smooth(5,14,path.distance);h=h*(1-blend)+path.height*blend;}
  for(const m of MOUNTAINS){const d=Math.hypot(x-m.x,z-m.z),blend=1-smooth(m.radius,m.radius+8,d);h=h*(1-blend)+m.height*blend;}
 }
 const road=1-smooth(7,15,roadDistance(x,z));h=h*(1-road)+2.5*road;
 if(Math.abs(x-ARRIVAL.x)<85&&Math.abs(z-ARRIVAL.z)<90)h=2.5;
 for(const shop of SHOP_SITES){const outside=Math.hypot(Math.max(Math.abs(x-shop.x)-17,0),Math.max(Math.abs(z-shop.z)-17,0)),blend=1-smooth(0,10,outside);h=h*(1-blend)+2.5*blend;}
 h=h*smooth(0,35,coast)-.15*(1-smooth(0,35,coast));
 const lake=Math.hypot((x-LAKE.x)/LAKE.radiusX,(z-LAKE.z)/LAKE.radiusZ);
 if(lake<1)h=-3+2.9*smooth(.89,1,lake);else if(lake<1.08)h=-.1+(h+.1)*smooth(1,1.08,lake);
 if(z>=RIVER_START&&islandDistance(x,z)>0){const bank=Math.abs(x-riverX(z));if(bank<5.5)h=-2.4+2.3*smooth(3.5,5.5,bank);else if(bank<14)h=-.1+(h+.1)*smooth(5.5,14,bank);}
 return h;
}
export function terrainHeight(x,z){return campGroundHeight(x,z,baseTerrainHeight(x,z));}
export function terrainSlope(x,z) {
  const dx=(terrainHeight(x+.5,z)-terrainHeight(x-.5,z)), dz=(terrainHeight(x,z+.5)-terrainHeight(x,z-.5));
  return Math.hypot(dx,dz);
}
export function terrainWalkable(x,z) {
  return isWater(x,z) || coastDistance(x,z)<35 || [[1.2,0],[-1.2,0],[0,1.2],[0,-1.2]].some(([dx,dz])=>isWater(x+dx,z+dz)) || terrainSlope(x,z)<=1.25;
}

export function circleOverlaps(x, z, radius, collider) {
  if (collider.active === false) return false;
  if (collider.kind === 'circle') return Math.hypot(x - collider.x, z - collider.z) < radius + collider.radius;
  if (collider.kind === 'box') {
    const nearX = clamp(x, collider.minX, collider.maxX), nearZ = clamp(z, collider.minZ, collider.maxZ);
    return Math.hypot(x - nearX, z - nearZ) < radius;
  }
  return false;
}
export function canOccupy(x, z, colliders = [], radius = 0.55, { allowWater = false, ignoreSlope = false } = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (x < WORLD.minX + radius || x > WORLD.maxX - radius || z < WORLD.minZ + radius || z > WORLD.maxZ - radius) return false;
  if (!ignoreSlope && !terrainWalkable(x,z)) return false;
  if (!allowWater) {
    if (isWater(x, z) || (coastDistance(x,z)<35 && terrainHeight(x,z)<.15)) return false;
    for (let i = 0; i < 8; i++) if (isWater(x + Math.cos(i * Math.PI / 4) * radius, z + Math.sin(i * Math.PI / 4) * radius)) return false;
  }
  return !colliders.some(c => circleOverlaps(x, z, radius, c));
}
export function resolveMovement(position, delta, colliders = [], radius = 0.55, options = {}) {
  if (![position.x, position.z, delta.x, delta.z].every(Number.isFinite)) return { x: position.x, z: position.z };
  let x = position.x, z = position.z;
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / Math.max(0.15, radius * 0.65)));
  const dx = delta.x / steps, dz = delta.z / steps;
  const allowed = (nx,nz) => canOccupy(nx,nz,colliders,radius,options) &&
    (options.ignoreSlope || (options.allowWater && (isWater(nx,nz)||isWater(x,z)||coastDistance(nx,nz)<35||coastDistance(x,z)<35)) || Math.abs(terrainHeight(nx,nz)-terrainHeight(x,z)) <= Math.hypot(nx-x,nz-z)*1.35+.035);
  for (let i = 0; i < steps; i++) {
    if (allowed(x + dx, z + dz)) { x += dx; z += dz; }
    else {
      if (allowed(x + dx, z)) x += dx;
      if (allowed(x, z + dz)) z += dz;
    }
  }
  return { x, z };
}
