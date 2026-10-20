// Shared world coordinates and collision math. Keep independent of Three.js so
// hiking, terrain sampling and tests all use exactly the same surface.
const MAP_SCALE = Math.sqrt(3);
export const WORLD = Object.freeze({ minX: -870 * MAP_SCALE, maxX: 870 * MAP_SCALE, minZ: -690 * MAP_SCALE, maxZ: 690 * MAP_SCALE, landMaxX: 285 * MAP_SCALE });
// The unreachable ring has twice the playable area; total scenery is 3×.
export const SCENERY = Object.freeze({ minX: WORLD.minX * Math.sqrt(3), maxX: WORLD.maxX * Math.sqrt(3), minZ: WORLD.minZ * Math.sqrt(3), maxZ: WORLD.maxZ * Math.sqrt(3) });
export const ARRIVAL = Object.freeze({ x: WORLD.minX + 62, z: 85 });
export const SHOP = Object.freeze({ x: -30, z: -35 });
export const SUMMIT = Object.freeze({ x: -145, z: -195, radius: 20, height: 176 });
export const LAKE = Object.freeze({ x: -160, z: 250, radiusX: 55, radiusZ: 42 });
export const RIVER_START = 280;
export const COAST_START = WORLD.landMaxX - 35;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Seeded once per world: irregular northern ranges and exposed, impassable rock ledges.
let mountainSeed = 8202026;
const mountainRandom = () => ((mountainSeed = mountainSeed*16807%2147483647)-1)/2147483646;
export const MOUNTAIN_RIDGES = Object.freeze(Array.from({length:14},(_,i)=>Object.freeze({
  x: WORLD.minX+100+mountainRandom()*(WORLD.landMaxX-WORLD.minX-200),
  z: WORLD.minZ+90+mountainRandom()*420,
  rx: 100+mountainRandom()*95, rz: 95+mountainRandom()*90, height: 80+mountainRandom()*80,
})));
export const ROCK_SHELVES = Object.freeze(Array.from({length:26},(_,i)=>{
  const a = i/26*Math.PI*2 + (mountainRandom()-.5)*.25, r=60+mountainRandom()*90;
  return Object.freeze({ x:SUMMIT.x+Math.cos(a)*r, z:SUMMIT.z+Math.sin(a)*r, rx:10+mountainRandom()*13, rz:8+mountainRandom()*15, height:14+mountainRandom()*23 });
}));

export function riverX(z) { return LAKE.x + Math.sin((z - RIVER_START) * 0.03) * 19; }
export function isWater(x, z) {
  if (x >= WORLD.landMaxX) return true;
  const lake = ((x - LAKE.x) / LAKE.radiusX) ** 2 + ((z - LAKE.z) / LAKE.radiusZ) ** 2;
  return lake < 1 || (z >= RIVER_START && Math.abs(x - riverX(z)) < 5.5);
}
export function terrainHeight(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return 0;
  const r = Math.hypot(x - SUMMIT.x, z - SUMMIT.z);
  if (r <= SUMMIT.radius) return SUMMIT.height;
  let h = 2.5 + Math.sin(x * 0.026) * Math.cos(z * 0.021) * 2.2 + Math.sin(x * 0.012 + z * 0.041) * 1.15;
  const mountain = 173.5 * (1 - smooth(20, 185, r));
  const westRidge = 64 * Math.exp(-(((x + 290) / 59) ** 2 + ((z + 234) / 66) ** 2));
  const northRidge = 44 * Math.exp(-(((x - 8) / 64) ** 2 + ((z + 250) / 42) ** 2));
  const roughness = Math.sin(x * 0.1 + z * 0.032) * Math.sin(z * 0.08) * 2.1 * smooth(23, 70, r);
  const frontierRidge = 86 * Math.exp(-(((x + 405) / 88) ** 2 + ((z + 140) / 130) ** 2)) + 64 * Math.exp(-(((x + 255) / 108) ** 2 + ((z + 365) / 58) ** 2));
  h += mountain + westRidge + northRidge + frontierRidge + roughness * 3 * Math.min(1, mountain / 30);
  for (const ridge of MOUNTAIN_RIDGES) {
    const d = Math.hypot((x-ridge.x)/ridge.rx, (z-ridge.z)/ridge.rz);
    if (d < 1.8) h += ridge.height * (1-smooth(.12,1.55,d)) + Math.sin(x*.06+z*.035)*6*(1-smooth(.4,1.5,d));
  }
  // Broken rocky shelves create real steep faces, with rounded, climbable approaches.
  for (const shelf of ROCK_SHELVES) {
    const d = Math.hypot((x-shelf.x)/shelf.rx, (z-shelf.z)/shelf.rz);
    if (d < 1.15) h += shelf.height * (1-smooth(.68,1.02,d));
  }
  const path = trailSurfaceAt(x,z);
  if (path.distance < 18) h = h * smooth(6.5,18,path.distance) + path.height * (1-smooth(6.5,18,path.distance));
  // Blend into an exactly level 40 m wide summit, with no ledge to climb over.
  h = SUMMIT.height * (1 - smooth(20, 29, r)) + h * smooth(20, 29, r);
  const outsideShop = Math.hypot(Math.max(-46 - x, 0, x + 14), Math.max(-50 - z, 0, z + 18));
  const shopBlend = 1 - smooth(0, 12, outsideShop);
  h = h * (1 - shopBlend) + 2.5 * shopBlend;
  const outsideArrival = Math.hypot(Math.max(Math.abs(x-ARRIVAL.x)-54,0),Math.max(Math.abs(z-ARRIVAL.z)-65,0));
  const arrivalBlend = 1-smooth(0,12,outsideArrival);
  h = h*(1-arrivalBlend)+2.5*arrivalBlend;
  const coast = smooth(COAST_START, WORLD.landMaxX + 8, x);
  h = h * (1 - coast) - coast * 2.8;
  if (x >= WORLD.landMaxX) h = -3.5 - Math.min(5, (x - WORLD.landMaxX) * 0.025);
  const lakeDistance=Math.hypot((x-LAKE.x)/LAKE.radiusX,(z-LAKE.z)/LAKE.radiusZ);
  if(lakeDistance<1)h=-3+2.9*smooth(.89,1,lakeDistance);
  else if(lakeDistance<1.08)h=-.1+(h+.1)*smooth(1,1.08,lakeDistance);
  if(z>=RIVER_START){const bank=Math.abs(x-riverX(z));if(bank<5.5)h=-2.4+2.3*smooth(3.5,5.5,bank);else if(bank<10)h=-.1+(h+.1)*smooth(5.5,10,bank);}
  return h;
}
// A long curling approach trades the old steep climb for gentle, broad switchbacks.
const trailStart={x:-40,z:-56},trailRadius=Math.hypot(trailStart.x-SUMMIT.x,trailStart.z-SUMMIT.z);
const trailAngle=Math.atan2(trailStart.x-SUMMIT.x,trailStart.z-SUMMIT.z);
export const TRAIL_WIDTH=10;
export const TRAIL_SAMPLES=840;
export function trailPoint(t) {
  t=clamp(t,0,1);
  const u=Math.min(1,t/.96),angle=trailAngle+Math.PI*3.5*u;
  const radius=t<=.96?trailRadius+(18-trailRadius)*u:18*(1-(t-.96)/.04);
  return {x:SUMMIT.x+Math.sin(angle)*radius,z:SUMMIT.z+Math.cos(angle)*radius};
}
// Index the switchback trail so height queries do not scan its entire length.
const trailBuckets = new Map(), track = Array.from({length:TRAIL_SAMPLES+1},(_,i)=>trailPoint(i/TRAIL_SAMPLES));
let trackLength=0;
for(let i=0;i<track.length;i++){ if(i)trackLength+=Math.hypot(track[i].x-track[i-1].x,track[i].z-track[i-1].z);track[i].distance=trackLength; }
for(let i=1;i<track.length;i++) {
  const a=track[i-1], b=track[i], segment={a,b};
  for(let gx=Math.floor((Math.min(a.x,b.x)-19)/16);gx<=Math.floor((Math.max(a.x,b.x)+19)/16);gx++)
    for(let gz=Math.floor((Math.min(a.z,b.z)-19)/16);gz<=Math.floor((Math.max(a.z,b.z)+19)/16);gz++){
      const key=`${gx}:${gz}`;if(!trailBuckets.has(key))trailBuckets.set(key,[]);trailBuckets.get(key).push(segment);
    }
}
export function trailSurfaceAt(x,z) {
  let nearest=Infinity, distance=0;
  const segments=trailBuckets.get(`${Math.floor(x/16)}:${Math.floor(z/16)}`)??[];
  for(const {a,b} of segments){
    const dx=b.x-a.x,dz=b.z-a.z, f=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);
    const d=(x-a.x-f*dx)**2+(z-a.z-f*dz)**2;
    if(d<nearest){nearest=d;distance=a.distance+(b.distance-a.distance)*f;}
  }
  return {distance:Math.sqrt(nearest),height:2.5+(SUMMIT.height-2.5)*smooth(0,1,distance/(trackLength-25))};
}
export function terrainSlope(x,z) {
  const dx=(terrainHeight(x+.5,z)-terrainHeight(x-.5,z)), dz=(terrainHeight(x,z+.5)-terrainHeight(x,z-.5));
  return Math.hypot(dx,dz);
}
export function terrainWalkable(x,z) {
  return isWater(x,z) || x>COAST_START || [[1.2,0],[-1.2,0],[0,1.2],[0,-1.2]].some(([dx,dz])=>isWater(x+dx,z+dz)) || terrainSlope(x,z)<=1.25;
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
export function canOccupy(x, z, colliders = [], radius = 0.55, { allowWater = false } = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (x < WORLD.minX + radius || x > WORLD.maxX - radius || z < WORLD.minZ + radius || z > WORLD.maxZ - radius) return false;
  if (!terrainWalkable(x,z)) return false;
  if (!allowWater) {
    if (isWater(x, z) || (x > COAST_START && terrainHeight(x, z) < .15)) return false;
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
    (options.ignoreSlope || (options.allowWater && (isWater(nx,nz)||isWater(x,z)||nx>COAST_START||x>COAST_START)) || Math.abs(terrainHeight(nx,nz)-terrainHeight(x,z)) <= Math.hypot(nx-x,nz-z)*1.35+.035);
  for (let i = 0; i < steps; i++) {
    if (allowed(x + dx, z + dz)) { x += dx; z += dz; }
    else {
      if (allowed(x + dx, z)) x += dx;
      if (allowed(x, z + dz)) z += dz;
    }
  }
  return { x, z };
}
