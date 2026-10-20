import { WORLD } from './terrain.js';
const TAU=Math.PI*2;
/** Clip a randomly oriented straight flight through the complete playable rectangle. */
export function flightPath(angle,offset=0,altitude=1200){
  const dx=Math.sin(angle),dz=Math.cos(angle),cx=-dz*offset,cz=dx*offset;
  let near=-Infinity,far=Infinity;
  for(const [p,d,min,max]of [[cx,dx,WORLD.minX,WORLD.maxX],[cz,dz,WORLD.minZ,WORLD.maxZ]]){
    if(Math.abs(d)<1e-9)continue;
    const a=(min-p)/d,b=(max-p)/d;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
  }
  return {start:{x:cx+dx*near,y:altitude,z:cz+dz*near},end:{x:cx+dx*far,y:altitude,z:cz+dz*far},angle};
}
/** Reusable random schedule: 54–66 game minutes between flights (mean 1 hour), galaxies every 2–3 nights. */
export function createSkySchedule(random=Math.random){
  const flights=[];let time=0;
  while(time<7*24*120){
    time+=108+random()*24;
    const angle=random()*TAU,offset=(random()-.5)*Math.min(WORLD.maxX-WORLD.minX,WORLD.maxZ-WORLD.minZ)*.45;
    flights.push({at:time,duration:45+random()*15,...flightPath(angle,offset,1150+random()*220)});
  }
  const galaxyNights=[];let night=1+Math.floor(random()*3);
  while(night<=7){galaxyNights.push(night);night+=2+Math.floor(random()*2);}
  return {flights,galaxyNights};
}
export function skyEventState(schedule,elapsed,hour,season,weather,cloudCover=0){
  const night=hour<5||hour>=20,clarity=weather==='clear'?Math.max(0,1-cloudCover*1.3):0;
  // Hours after midnight still belong to the previous evening's camping night.
  const day=Math.floor((5+elapsed/120)/24),nightIndex=hour<5?day:day+1;
  const darkness=hour>=20?Math.min(1,(hour-20)/1.2):hour<5?Math.min(1,(5-hour)/1.2):0;
  const flight=schedule.flights.find(f=>elapsed>=f.at&&elapsed<f.at+f.duration+45)??null;
  return {night,nightIndex,clarity,darkness,galaxy:night&&schedule.galaxyNights.includes(nightIndex)&&clarity>0,aurora:night&&season===3&&clarity>0,flight,flightProgress:flight?Math.min(1,(elapsed-flight.at)/flight.duration):0};
}
