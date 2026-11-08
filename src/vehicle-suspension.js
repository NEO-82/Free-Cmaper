// Vehicle weight changes impulse and damping, not gravitational acceleration.
export const VEHICLE_WEIGHT=Object.freeze({
 sedan:Object.freeze({mass:1500,jumpSpeed:6.8,heaveFrequency:8,attitudeFrequency:8.5,damping:1.12,compression:.022,airDrag:.035}),
 suv:Object.freeze({mass:2100,jumpSpeed:6.4,heaveFrequency:7.5,attitudeFrequency:7.8,damping:1.15,compression:.025,airDrag:.03}),
 motorhome:Object.freeze({mass:3600,jumpSpeed:5.7,heaveFrequency:6.5,attitudeFrequency:6.8,damping:1.2,compression:.03,airDrag:.025}),
 scooter:Object.freeze({mass:240,jumpSpeed:6.8,heaveFrequency:10,attitudeFrequency:10,damping:1.08,compression:.016,airDrag:.06})
});
export const vehicleWeight=kind=>VEHICLE_WEIGHT[kind]??VEHICLE_WEIGHT.sedan;
export function stepWeightedSuspension(state,ground,dt,config,{pitch=ground.pitch,roll=ground.roll}={}){
 const profile=vehicleWeight(state.kind),elapsed=Math.max(0,Math.min(dt,.25)),steps=Math.max(1,Math.ceil(elapsed*120)),h=elapsed/steps;
 const s={bodyY:state.bodyY??ground.height,heaveVelocity:state.heaveVelocity??0,pitch:state.pitch??ground.pitch,roll:state.roll??ground.roll,pitchVelocity:state.pitchVelocity??0,rollVelocity:state.rollVelocity??0,landingCompression:state.landingCompression??0};
 for(let i=0;i<steps;i++){
  s.landingCompression*=Math.exp(-h*3.8);
  if(!state.airborne){
   const target=ground.height-s.landingCompression,w=profile.heaveFrequency;
   s.heaveVelocity+=((target-s.bodyY)*w*w-2*profile.damping*w*s.heaveVelocity)*h;
   s.bodyY+=s.heaveVelocity*h;s.bodyY=Math.max(ground.height-(config.travel??.4)*.7,s.bodyY);
   // Damped recovery stops at tyre support; it cannot catapult the chassis again.
   if(s.bodyY>ground.height){s.bodyY=ground.height;s.heaveVelocity=Math.min(0,s.heaveVelocity);}
  }
  for(const axis of ['pitch','roll']){
   const key=axis+'Velocity';
   if(state.airborne)s[key]*=Math.exp(-h*2.4);
   else {const w=profile.attitudeFrequency,target=axis==='pitch'?pitch:roll;s[key]+=((target-s[axis])*w*w-2*profile.damping*w*s[key])*h;}
   s[axis]+=s[key]*h;
  }
 }
 return {...s,airborne:!!state.airborne,contacts:state.airborne?0:ground.wheels.length,ground};
}
