import { campGroundHeight } from './camp-ground.js';
import { baseTerrainHeight,trailSurfaceAt,roadDistance,roadPoint,BRIDGE,SUMMITS,landscapeHeight,roadSurfaceAt,roadUnderlayLimit } from './terrain.js';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function shopRoadPoint(t){return roadPoint(t,1);}
export function pathDistance(x,z){const p=roadSurfaceAt(x,z);return p.distance-(p.road?.width??22)/2;}
export function naturalPathSurfaceHeight(x,z){return baseTerrainHeight(x,z);}
export function pathSurfaceHeight(x,z){return campGroundHeight(x,z,naturalPathSurfaceHeight(x,z));}
export function pathUnderlayHeight(x,z){
 if(x>=BRIDGE.startX&&x<=BRIDGE.endX&&Math.abs(z-BRIDGE.z)<=BRIDGE.width/2)return -5;
 return campGroundHeight(x,z,roadUnderlayLimit(x,z,landscapeHeight(x,z))-.16*(SUMMITS.some(m=>Math.hypot(x-m.x,z-m.z)<=m.radius)?1:1-smooth(2,18,pathDistance(x,z))));
}
