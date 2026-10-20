const clamp=v=>Math.max(0,Math.min(1,v));
export const REST_DURATION=1.8;
export function restStep(progress,target,dt) {return Math.max(0,Math.min(1,progress+Math.sign(target-progress)*Math.min(Math.abs(target-progress),Math.max(0,dt)/REST_DURATION)));}
export function smoothRest(progress) {const t=clamp(progress);return t*t*(3-2*t);}
/** Sit on the mattress, recline onto the back, then gently settle. */
export function poseBedRest(model,progress,seconds=0) {
  const t=clamp(progress),sit=smoothRest(t/.35),recline=smoothRest((t-.3)/.7),mix=(a,b,f)=>a+(b-a)*f;
  const {body,upperBody,head,legs,knees,arms,elbows,ankles,backpack}=model;
  body.position.set(0,mix(-.42*sit,.72,recline),0);body.rotation.set(-Math.PI/2*recline,0,0);
  upperBody.rotation.set(mix(.08*sit,-.025+Math.sin(seconds*1.2)*.008,recline),0,0);head.rotation.set(0,0,0);
  legs.forEach((leg,i)=>{leg.rotation.set(mix(-1.3*sit,0,recline),0,0);knees[i].rotation.set(mix(1.4*sit,.055,recline),0,0);ankles[i].rotation.set(0,0,0);});
  arms.forEach((arm,i)=>{arm.rotation.set(mix(-.8*sit,-.08,recline),0,(i?-1:1)*.1);elbows[i].rotation.set(mix(-.5*sit,-.2,recline),0,0);});
  backpack.visible=t<.2;
}
