import { pathSurfaceHeight } from './paths.js';
import { WORLD, terrainHeight, terrainSlope, isWater, COAST_START, circleOverlaps } from './terrain.js';

export const PERSON = Object.freeze({ radius:.5, height:2.8, step:.34, gravity:18, jumpSpeed:8.8*Math.SQRT2, acceleration:55, airControl:12 });
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const approach=(v,target,step)=>v<target?Math.min(target,v+step):Math.max(target,v-step);
export function createPerson(position){return {x:position.x,y:position.y??terrainHeight(position.x,position.z),z:position.z,vx:0,vy:0,vz:0,grounded:true,swimming:false,diveDepth:0,supportId:null,landed:false,swimBlend:0,airSpeedScale:1};}
export function jumpPerson(state,{sprint=false}={}){
  if(!state.grounded||state.swimming)return false;
  // Height is proportional to take-off velocity squared. Boost horizontal velocity
  // by the same square root so height and total range both grow by 20 percent.
  const scale=sprint&&Math.hypot(state.vx,state.vz)>.5?Math.sqrt(1.2):1;
  state.vy=PERSON.jumpSpeed*scale;state.vx*=scale;state.vz*=scale;state.airSpeedScale=scale;
  state.grounded=false;state.landed=false;state.supportId=null;return true;
}
export function worldWaterAt(x,z){return isWater(x,z)&&terrainHeight(x,z)<-.25;}
/** Fixed-substep capsule controller: world-space gravity, height-aware contacts and buoyancy. */
export function stepPerson(previous,input,dt,environment={}){
  if(!Number.isFinite(dt)||dt<=0)return {...previous};
  const state={...previous,landed:false};
  const heightAt=environment.heightAt??pathSurfaceHeight,slopeAt=environment.slopeAt??((x,z)=>terrainSlope(x,z));
  const waterAt=environment.waterAt??worldWaterAt,bounds=environment.bounds??WORLD;
  const height=input.posture==='prone'?.85:input.posture==='crouch'?1.8:PERSON.height;
  const radius=PERSON.radius,steps=Math.max(1,Math.ceil(Math.min(dt,.25)*120)),h=Math.min(dt,.25)/steps;
  const reach=Math.max(Math.abs(state.vx),Math.abs(state.vz),input.speed??0)*Math.min(dt,.25)+radius+1;
  const colliders=(environment.colliders??[]).filter(c=>c.active!==false&&(c.kind==='circle'?Math.hypot(c.x-state.x,c.z-state.z)<c.radius+reach:c.maxX>state.x-reach&&c.minX<state.x+reach&&c.maxZ>state.z-reach&&c.minZ<state.z+reach));
  function support(x,z,y){
    let floor=heightAt(x,z),id=null;
    for(const c of colliders){
      if(!circleOverlaps(x,z,radius*.85,c))continue;
      const top=c.surfaceAt?c.surfaceAt(x,z):c.maxY;
      if(Number.isFinite(top)&&top<=y+PERSON.step+.015&&top>floor){floor=top;id=c.id;}
    }
    return {floor,id};
  }
  for(let i=0;i<steps;i++){
    const wet=waterAt(state.x,state.z),floor=heightAt(state.x,state.z);
    state.swimming=wet&&floor<-.55&&state.y<-.48;
    if(state.swimming){
      state.grounded=false;state.supportId=null;
      state.diveDepth=clamp(state.diveDepth+((input.dive?1:0)-(input.rise?1:0))*h*4,0,Math.max(0,-floor-1.3));
      state.swimBlend=approach(state.swimBlend??0,(input.x||input.z||state.diveDepth>.4)?1:0,h*2.8);
      const target=Math.max(floor+.1,-1.55+.8*state.swimBlend-state.diveDepth);
      state.vy+=((target-state.y)*30-state.vy*9)*h;
    }else{state.diveDepth=0;if(!state.grounded)state.vy-=PERSON.gravity*h;else state.vy=0;}
    if(state.swimming||state.grounded)state.airSpeedScale=1;
    const acceleration=state.swimming?14:state.grounded?PERSON.acceleration:PERSON.airControl;
    // Airborne motion retains take-off momentum; steering remains possible without teleporting.
    const move=!!(input.x||input.z),airborne=!state.grounded&&!state.swimming;
    if(move||!airborne){state.vx=approach(state.vx,(input.x??0)*(input.speed??0)*(airborne?(state.airSpeedScale??1):1),acceleration*h);state.vz=approach(state.vz,(input.z??0)*(input.speed??0)*(airborne?(state.airSpeedScale??1):1),acceleration*h);}
    let ny=state.y+state.vy*h;
    const ceiling=environment.ceilingAt?.(state.x,state.z)??Infinity;
    if(ny+height>ceiling&&state.vy>0){ny=ceiling-height;state.vy=0;}
    function allowed(x,z){
      if(x<bounds.minX+radius||x>bounds.maxX-radius||z<bounds.minZ+radius||z>bounds.maxZ-radius)return false;
      const ground=heightAt(x,z),allowStep=state.swimming?.9:PERSON.step;
      if(ground>ny+allowStep)return false;
      if(state.grounded&&!state.supportId&&!waterAt(x,z)&&slopeAt(x,z)>1.25)return false;
      for(const c of colliders){
        if(c.oneWay||!circleOverlaps(x,z,radius,c))continue;
        const top=(c.surfaceAt?c.surfaceAt(x,z):c.maxY)??c.maxY??Infinity,bottom=c.minY??-Infinity;
        if(ny>=top-.015||ny+height<=bottom+.01)continue;
        if(state.grounded&&Number.isFinite(top)&&top-state.y<=PERSON.step&&top>=state.y-.05)continue;
        return false;
      }
      return true;
    }
    const dx=state.vx*h,dz=state.vz*h;
    if(allowed(state.x+dx,state.z+dz)){state.x+=dx;state.z+=dz;}
    else{if(allowed(state.x+dx,state.z))state.x+=dx;else state.vx=0;if(allowed(state.x,state.z+dz))state.z+=dz;else state.vz=0;}
    const contact=support(state.x,state.z,Math.max(state.y,ny)),ground=contact.floor;
    const swimHere=waterAt(state.x,state.z)&&heightAt(state.x,state.z)<-.55;
    if(state.grounded&&ground>=state.y-PERSON.step&&ground<=state.y+PERSON.step+.02){ny=ground;state.vy=0;state.supportId=contact.id;}
    else if(state.vy<=0&&ny<=ground+.015){state.landed=!state.grounded;ny=ground;state.vy=0;state.grounded=true;state.supportId=contact.id;state.swimming=false;}
    else{state.grounded=false;state.supportId=null;}
    // Shallow banks let a swimmer stand up naturally rather than sticking to a vertical water edge.
    if(state.swimming&&!swimHere&&ground<=state.y+.9){ny=Math.max(ny,ground);state.vy=0;state.grounded=true;state.swimming=false;state.diveDepth=0;}
    if(state.grounded||state.swimming)state.airSpeedScale=1;
    state.y=ny;
  }
  return state;
}
