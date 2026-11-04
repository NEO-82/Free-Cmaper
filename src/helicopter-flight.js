// Flight and landing use the same height sampler as visible terrain/roads.
export const HELICOPTER_CONFIG=Object.freeze({maxSpeed:84*1.4,climbSpeed:12,ceiling:1400,radius:4.5,length:8.8,height:4,rotorSpan:8.4,shutdownDelay:5,cameraReturnDelay:7});
const approach=(value,target,amount)=>value<target?Math.min(target,value+amount):Math.max(target,value-amount);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function helicopterGroundPose(x,z,heading,heightAt,altitude=Infinity){
 const cs=Math.cos(heading),sn=Math.sin(heading),samples=[];
 for(const sx of [-1.55,1.55])for(const sz of [-2.45,3.15]){
  const px=x+cs*sx+sn*sz,pz=z-sn*sx+cs*sz;
  samples.push({sx,sz,height:heightAt(px,pz,altitude)});
 }
 const avg=filter=>samples.filter(filter).reduce((sum,p)=>sum+p.height,0)/2;
 const pitch=clamp(Math.atan2(avg(p=>p.sz<0)-avg(p=>p.sz>0),5.6),-.55,.55);
 const roll=clamp(Math.atan2(avg(p=>p.sx>0)-avg(p=>p.sx<0),3.1),-.55,.55);
 const bodyY=Math.max(...samples.map(p=>p.height+.04-Math.cos(pitch)*Math.sin(roll)*p.sx+Math.sin(pitch)*p.sz));
 return {bodyY,pitch,roll,samples};
}
export function stepHelicopter(state,input,dt,colliders=[],options={}){
 if(!Number.isFinite(dt)||dt<=0)return {...state};
 let r={vx:0,vz:0,vy:0,bodyY:0,heading:0,rotorSpeed:0,engineOn:false,landedFor:0,...state};
 const config=HELICOPTER_CONFIG,height=options.heightAt??(()=>0),bounds=options.bounds??{minX:-Infinity,maxX:Infinity,minZ:-Infinity,maxZ:Infinity};
 const elapsed=Math.min(dt,.1),steps=Math.ceil(elapsed*120);
 for(let j=0;j<steps;j++){
  const h=elapsed/steps,rise=!!input.rise&&!input.park,descend=!!input.descend&&!rise;
  const initialGround=helicopterGroundPose(r.x,r.z,r.heading,height,r.bodyY),clearance=r.bodyY-initialGround.bodyY;
  const landing=descend&&clearance<4;
  let engineOn=rise?true:r.engineOn;
  const lift=rise?1:descend?-1:0,forward=+!!input.forward-+!!input.backward,side=+!!input.left-+!!input.right;
  const heading=r.heading+(r.grounded&&!rise?0:(+!!input.yawLeft-+!!input.yawRight)*1.15*h);
  const norm=Math.max(1,Math.hypot(forward,side)),park=!!input.park||landing||(r.grounded&&!rise);
  let vx=approach(r.vx,park?0:(Math.sin(heading)*forward+Math.cos(heading)*side)/norm*config.maxSpeed,h*(landing?45:18));
  let vz=approach(r.vz,park?0:(Math.cos(heading)*forward-Math.sin(heading)*side)/norm*config.maxSpeed,h*(landing?45:18));
  const vy=approach(r.vy,input.park?0:lift*(landing?2:config.climbSpeed),h*(landing?28:16));
  let x=clamp(r.x+vx*h,bounds.minX+5,bounds.maxX-5),z=clamp(r.z+vz*h,bounds.minZ+5,bounds.maxZ-5);
  const ceiling=options.ceilingAt?.(r.x,r.z,r.bodyY)??Infinity;
  let nextY=Math.min(r.bodyY+vy*h,ceiling-config.height-.1);
  const nextCeiling=options.ceilingAt?.(x,z,r.bodyY)??Infinity;
  const collision=colliders.some(c=>c.id!=='player-vehicle'&&nextY+config.height>(c.minY??-Infinity)&&nextY<(c.maxY??Infinity)&&options.blocksMovement?.(r,{x,z},config.radius,c));
  if(collision||height(x,z,r.bodyY)>r.bodyY+.5||nextCeiling<nextY+config.height){x=r.x;z=r.z;vx=vz=0;}
  const ground=helicopterGroundPose(x,z,heading,height,r.bodyY),water=options.waterSurfaceAt?.(x,z)??-Infinity;
  const floor=Math.max(ground.bodyY,water+.04),bodyY=Math.max(floor,Math.min(config.ceiling,nextY)),grounded=bodyY<=floor+.015;
  // Touchdown locks the skids and cancels descent, even while the button remains held.
  const landedFor=grounded&&!rise?(r.grounded?r.landedFor:0)+h:0;
  if(grounded&&!rise&&landedFor>=config.shutdownDelay)engineOn=false;
  const rotorSpeed=approach(r.rotorSpeed,engineOn?1:0,h*(engineOn?1.8:.65));
  const tiltBlend=grounded?1:landing?clamp(1-(bodyY-floor)/4,0,1):0;
  const airPitch=forward*Math.min(.14,Math.hypot(vx,vz)/500),airRoll=-side*.1;
  r={...r,x,z,heading,vx:grounded&&!rise?0:vx,vz:grounded&&!rise?0:vz,vy:grounded&&vy<0||bodyY>=config.ceiling||vy>0&&bodyY>=ceiling-config.height-.1?0:vy,bodyY,speed:grounded&&!rise?0:Math.hypot(vx,vz),grounded,airborne:!grounded,engineOn,landedFor,rotorSpeed,pitch:airPitch*(1-tiltBlend)+ground.pitch*tiltBlend,roll:airRoll*(1-tiltBlend)+ground.roll*tiltBlend,skidIntensity:0,impactSpeed:collision?Math.hypot(r.vx,r.vz):0};
 }
 return r;
}
