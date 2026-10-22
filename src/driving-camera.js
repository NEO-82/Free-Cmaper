import {roadSurfaceAt} from './road-network.js';
export const DRIVE_LOOK_DELAY=.5;
const angleDelta=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
/** Follow the road in the direction of travel; off-road, look along the vehicle. */
export function drivingLookTarget(vehicle,surfaceAt=roadSurfaceAt){
 const direction=Math.hypot(vehicle.vx??0,vehicle.vz??0)>2?Math.atan2(vehicle.vx,vehicle.vz):vehicle.heading;
 const road=surfaceAt(vehicle.x,vehicle.z,{altitude:vehicle.bodyY});
 let heading=vehicle.heading;
 if(road.road&&road.distance<road.road.width/2+8&&Math.abs((vehicle.bodyY??road.height)-road.height)<8){
  heading=road.heading;
  if(Math.cos(heading-direction)<0)heading+=Math.PI;
 }
 return {yaw:heading-Math.PI,pitch:.32};
}
/** The half-second grace period is measured from boarding or the latest mouse look.
 * Exponential easing and the shortest angular arc avoid frame-rate dependence and spins. */
export function followDrivingCamera(view,target,dt){
 const elapsed=Math.max(0,dt),idle=view.idle+elapsed;
 const active=Math.max(0,idle-DRIVE_LOOK_DELAY)-Math.max(0,view.idle-DRIVE_LOOK_DELAY);
 const blend=1-Math.exp(-6*active);
 return {idle:Math.min(idle,10),yaw:view.yaw+angleDelta(view.yaw,target.yaw)*blend,pitch:view.pitch+(target.pitch-view.pitch)*blend};
}
