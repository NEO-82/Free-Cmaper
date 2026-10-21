import {campGroundHeight} from './camp-ground.js';
import {WORLD,BRIDGE,ARRIVAL,SUMMITS,VILLAGE_SITES,LAKE,RIVER_START,riverX,coastDistance,bridgeSurfaceAt,naturalLandscapeHeight,clamp,smooth} from './landscape-layout.js';
import {SHOP_SITES,roadSurfaceAt,tunnelAt} from './road-network.js';
export * from './landscape-layout.js';
export * from './road-network.js';
export function isWater(x,z){
 const road=roadSurfaceAt(x,z);if(road.distance<11||bridgeSurfaceAt(x,z)!==null)return false;
 if(coastDistance(x,z)<=0)return true;
 return ((x-LAKE.x)/LAKE.radiusX)**2+((z-LAKE.z)/LAKE.radiusZ)**2<1||(z>=RIVER_START&&Math.abs(x-riverX(z))<5.5);
}
function editedHeight(x,z,rendered){
 if(!Number.isFinite(x)||!Number.isFinite(z))return 0;
 let h=naturalLandscapeHeight(x,z),road=roadSurfaceAt(x,z);
 if(road.distance<36&&(!rendered||!road.tunnel)){const blend=1-smooth(12,36,road.distance);h=h*(1-blend)+road.height*blend;}
 if(Math.abs(x-ARRIVAL.x)<85&&Math.abs(z-ARRIVAL.z)<90)h=2.5;
 for(const v of VILLAGE_SITES){const blend=1-smooth(v.radius,v.radius+18,Math.hypot(x-v.x,z-v.z));h=h*(1-blend)+2.5*blend;}
 for(const shop of SHOP_SITES){const d=Math.hypot(Math.max(Math.abs(x-shop.x)-17,0),Math.max(Math.abs(z-shop.z)-17,0)),blend=1-smooth(0,10,d);h=h*(1-blend)+2.5*blend;}
 for(const m of SUMMITS){const blend=1-smooth(m.radius,m.radius+8,Math.hypot(x-m.x,z-m.z));h=h*(1-blend)+m.height*blend;}
 return h;
}
export function baseTerrainHeight(x,z){return editedHeight(x,z,false);}
export function terrainHeight(x,z){return campGroundHeight(x,z,baseTerrainHeight(x,z));}
export function landscapeHeight(x,z){return campGroundHeight(x,z,editedHeight(x,z,true));}
export function landscapeSlope(x,z){return Math.hypot(landscapeHeight(x+.5,z)-landscapeHeight(x-.5,z),landscapeHeight(x,z+.5)-landscapeHeight(x,z-.5));}
export function travelHeight(x,z,altitude=-Infinity){
 const p=roadSurfaceAt(x,z,{altitude});
 if(p.distance<12&&Number.isFinite(altitude)&&Math.abs(altitude-p.height)<11)return campGroundHeight(x,z,p.height);
 return p.tunnel?landscapeHeight(x,z):terrainHeight(x,z);
}
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
  if(collider.kind==='obb'){const dx=x-collider.x,dz=z-collider.z,c=Math.cos(collider.heading),s=Math.sin(collider.heading),lx=c*dx-s*dz,lz=s*dx+c*dz;return Math.hypot(Math.max(Math.abs(lx)-collider.width/2,0),Math.max(Math.abs(lz)-collider.depth/2,0))<radius;}
  if (collider.kind === 'box') {
    const nearX = clamp(x, collider.minX, collider.maxX), nearZ = clamp(z, collider.minZ, collider.maxZ);
    return Math.hypot(x - nearX, z - nearZ) < radius;
  }
  return false;
}
export function canOccupy(x, z, colliders = [], radius = 0.55, { allowWater = false, ignoreSlope = false, footY=terrainHeight(x,z),bodyHeight=4.8 } = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (x < WORLD.minX + radius || x > WORLD.maxX - radius || z < WORLD.minZ + radius || z > WORLD.maxZ - radius) return false;
  if (!ignoreSlope && !terrainWalkable(x,z)) return false;
  if (!allowWater) {
    if (isWater(x, z) || (coastDistance(x,z)<35 && terrainHeight(x,z)<.15)) return false;
    for (let i = 0; i < 8; i++) if (isWater(x + Math.cos(i * Math.PI / 4) * radius, z + Math.sin(i * Math.PI / 4) * radius)) return false;
  }
  return !colliders.some(c => (c.minY??-Infinity)<footY+bodyHeight&&(c.maxY??Infinity)>footY+.05&&circleOverlaps(x,z,radius,c));
}
export function resolveMovement(position, delta, colliders = [], radius = 0.55, options = {}) {
  if (![position.x, position.z, delta.x, delta.z].every(Number.isFinite)) return { x: position.x, z: position.z };
  let x = position.x, z = position.z;
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / Math.max(0.15, radius * 0.65)));
  const dx = delta.x / steps, dz = delta.z / steps;
  const heightAt=options.heightAt??terrainHeight;
  const allowed = (nx,nz) => canOccupy(nx,nz,colliders,radius,options.vehicle?{...options,ignoreSlope:true,footY:position.bodyY??heightAt(nx,nz)}:options) &&
    (options.vehicle ? heightAt(nx,nz)<=Math.max(heightAt(x,z),position.bodyY??-Infinity)+Math.hypot(nx-x,nz-z)*1.35+.15 : options.ignoreSlope || (options.allowWater && (isWater(nx,nz)||isWater(x,z)||coastDistance(nx,nz)<35||coastDistance(x,z)<35)) || Math.abs(heightAt(nx,nz)-heightAt(x,z)) <= Math.hypot(nx-x,nz-z)*1.35+.035);
  for (let i = 0; i < steps; i++) {
    if (allowed(x + dx, z + dz)) { x += dx; z += dz; }
    else {
      if (allowed(x + dx, z)) x += dx;
      if (allowed(x, z + dz)) z += dz;
    }
  }
  return { x, z };
}
