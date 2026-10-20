import { pathSurfaceHeight } from './paths.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/** Sample all contact patches in the vehicle's own heading, including cross-slope. */
export function sampleWheelGround(state,config,heightAt=pathSurfaceHeight){
  const halfTrack=(config.track||.7)/2,halfBase=config.wheelBase/2,s=Math.sin(state.heading),c=Math.cos(state.heading);
  const wheels=[];
  for(const side of config.track?[-1,1]:[0])for(const front of [-1,1]){
    const lx=side*halfTrack,lz=front*halfBase,x=state.x+c*lx+s*lz,z=state.z-s*lx+c*lz;
    wheels.push({x,z,lx,lz,height:heightAt(x,z)});
  }
  const front=wheels.filter(w=>w.lz>0),back=wheels.filter(w=>w.lz<0),mean=a=>a.reduce((sum,w)=>sum+w.height,0)/a.length;
  const pitch=-Math.atan2(mean(front)-mean(back),config.wheelBase);
  const right=config.track?mean(wheels.filter(w=>w.lx>0)):heightAt(state.x+c*halfTrack,state.z-s*halfTrack);
  const left=config.track?mean(wheels.filter(w=>w.lx<0)):heightAt(state.x-c*halfTrack,state.z+s*halfTrack);
  const roll=Math.atan2(right-left,halfTrack*2),average=mean(wheels);
  return {wheels,pitch,roll,height:average+config.wheelRadius*(1-Math.cos(pitch)*Math.cos(roll))};
}
/** Damped chassis suspension, gravity over crests, and weight transfer under acceleration/turning. */
export function stepChassis(previous,ground,dt,config,{acceleration=0,turnRate=0}={}){
  const state={bodyY:previous.bodyY??ground.height,heaveVelocity:previous.heaveVelocity??0,pitch:previous.pitch??ground.pitch,pitchVelocity:previous.pitchVelocity??0,roll:previous.roll??ground.roll,rollVelocity:previous.rollVelocity??0,airborne:previous.airborne??false};
  const pitchTarget=clamp(ground.pitch-acceleration*.003,-.65,.65);
  const bank=(previous.speed??0)*turnRate;
  const rollTarget=clamp(ground.roll+bank*(config.track?-.0025:.013),-.6,.6);
  const steps=Math.max(1,Math.ceil(Math.max(0,Math.min(dt,.25))*120)),h=Math.max(0,Math.min(dt,.25))/steps;
  for(let i=0;i<steps;i++){
    if(state.bodyY>ground.height+config.travel+.12)state.airborne=true;
    if(state.airborne){state.heaveVelocity-=9.8*h;state.bodyY+=state.heaveVelocity*h;if(state.bodyY<=ground.height){state.bodyY=ground.height;state.heaveVelocity=Math.max(0,-state.heaveVelocity*.06);state.airborne=false;}}
    else{state.heaveVelocity+=((ground.height-state.bodyY)*110-state.heaveVelocity*17)*h;state.bodyY+=state.heaveVelocity*h;state.bodyY=Math.max(ground.height-config.travel*.35,state.bodyY);}
    state.pitchVelocity+=((pitchTarget-state.pitch)*95-state.pitchVelocity*16)*h;state.pitch+=state.pitchVelocity*h;
    state.rollVelocity+=((rollTarget-state.roll)*95-state.rollVelocity*16)*h;state.roll+=state.rollVelocity*h;
  }
  return {...state,contacts:state.airborne?0:ground.wheels.length,ground};
}
