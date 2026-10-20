import { WORLD, SHOP, SUMMIT, TRAIL_WIDTH, terrainHeight, trailSurfaceAt } from './terrain.js';
import { ARRIVAL, arrivalRoadPoint } from './journey.js';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function shopRoadPoint(t){return {x:SHOP.x+Math.sin(t*109/24)*3,z:-12+t*(WORLD.maxZ+11)};}
export function pathDistance(x,z){
  let d=trailSurfaceAt(x,z).distance-TRAIL_WIDTH/2;
  const t=(x-ARRIVAL.x)/(SHOP.x-ARRIVAL.x);if(t>=0&&t<=1)d=Math.min(d,Math.abs(z-arrivalRoadPoint(t).z)-4.5);
  const u=(z+12)/(WORLD.maxZ+11);if(u>=0&&u<=1)d=Math.min(d,Math.abs(x-shopRoadPoint(u).x)-2.1);
  return d;
}
/** A shallow road bed. Feet, tyres and the drawn road share this exact height. */
export function pathSurfaceHeight(x,z){
  const depression=.04*(1-smooth(-.5,.7,pathDistance(x,z)))*smooth(SUMMIT.radius,SUMMIT.radius+3,Math.hypot(x-SUMMIT.x,z-SUMMIT.z));
  return terrainHeight(x,z)-depression;
}
/** Recess only the rendered underlay, so it cannot cover the road or the camper's shoes. */
export function pathUnderlayHeight(x,z){return terrainHeight(x,z)-.16*(1-smooth(0,2,pathDistance(x,z)));}
