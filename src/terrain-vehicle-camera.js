const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
export function terrainCameraTarget(state,{roadAt=()=>null,heightAt=()=>0}={}){
 let heading=state.heading,road=roadAt(state.x,state.z,{altitude:state.bodyY});
 if(road?.road&&road.distance<=(road.road.width??22)/2+3){
  let roadHeading=road.heading;if(Math.cos(roadHeading-heading)<0)roadHeading+=Math.PI;
  if(Math.abs(angle(roadHeading-heading))<Math.PI/3)heading=roadHeading;
 }
 const span=8,sn=Math.sin(heading),cs=Math.cos(heading),sample=direction=>{
  const x=state.x+sn*span*direction,z=state.z+cs*span*direction,p=roadAt(x,z,{altitude:state.bodyY});
  return p?.road&&p.distance<=(p.road.width??22)/2+1?p.height:heightAt(x,z,state.bodyY);
 },grade=Math.atan2(sample(1)-sample(-1),span*2);
 return {yaw:angle(heading-state.heading),pitch:clamp(.32-grade,-1.15,1.35),grade,heading};
}
export function recenterVehicleCamera(camera,dt,idle,speed,{delay=1,target={yaw:0,pitch:.32}}={}){
 if(Math.abs(speed)<=.1)return camera;
 const elapsed=Math.min(Math.max(0,dt),Math.max(0,idle-delay));if(!elapsed)return camera;
 const blend=1-Math.exp(-8*elapsed),yaw=camera.yaw+angle(target.yaw-camera.yaw)*blend,pitch=camera.pitch+(target.pitch-camera.pitch)*blend;
 return {...camera,yaw:Math.abs(angle(target.yaw-yaw))<1e-4?target.yaw:angle(yaw),pitch:Math.abs(target.pitch-pitch)<1e-4?target.pitch:pitch};
}
export function groundCameraDirection(state,camera){
 const yaw=state.heading+camera.yaw,pitch=camera.pitch-.32;
 return {x:Math.sin(yaw)*Math.cos(pitch),y:-Math.sin(pitch),z:Math.cos(yaw)*Math.cos(pitch)};
}
