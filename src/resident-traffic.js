import {residentSeatPose} from './resident-appearance.js';
import {createResidentRoadGraph,drivingPath,sampleDrivingPath} from './resident-roads.js';
const approach=(x,target,amount)=>x<target?Math.min(target,x+amount):Math.max(target,x-amount);
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function createResidentTraffic({scene,villages,data,createVehicle,world,random=Math.random}){
 const graph=createResidentRoadGraph(data.ROADS),agents=[],kinds=['sedan','suv','motorhome','scooter'],roles=['shop_commuter','neighborhood_loop','island_tour'],coast=graph.byRoad.get('coastal-loop')??graph.nodes;
 let simulationTime=0,routeFailures=0;
 function goalFor(agent){
  if(agent.role==='shop_commuter'){if(agent.trip%2)return {kind:'home',...agent.home};const shops=data.SHOP_SITES.slice().sort((a,b)=>Math.hypot(a.x-agent.home.x,a.z-agent.home.z)-Math.hypot(b.x-agent.home.x,b.z-agent.home.z));return {kind:'shop',...(shops[agent.trip===0?0:(agent.shopIndex+Math.floor(agent.trip/2))%Math.min(3,shops.length)]??data.SHOP_SITES[0])};}
  if(agent.role==='neighborhood_loop'){if(agent.trip%3===2)return {kind:'home',...agent.home};const local=graph.nodes.filter(n=>{const d=Math.hypot(n.x-agent.home.x,n.z-agent.home.z);return d>350&&d<900&&n.y<30;});return {kind:'neighborhood',...(local[Math.floor(random()*local.length)]??agent.home)};}
  const p=coast[Math.floor(((agent.trip+agent.tourOffset)%4)/4*(coast.length-1))];return {kind:'island',...p};
 }
 function begin(agent){const goal=goalFor(agent);let nodes=graph.route(agent.anchor,goal);if(nodes.length<2){const list=graph.byRoad.get(agent.anchor.road),index=list.findIndex(n=>n.id===agent.anchor.id),detour=list[Math.max(0,Math.min(list.length-1,index+(index<list.length/2?1:-1)*5))];nodes=[...graph.route(agent.anchor,detour),...graph.route(detour,goal).slice(1)];}if(nodes.length<2){agent.trip++;routeFailures++;agent.wait=2;return false;}agent.path=drivingPath(nodes);agent.progress=0;agent.goal=goal;agent.destination=nodes.at(-1);agent.phase='driving';agent.start={x:agent.vehicle.state.x,z:agent.vehicle.state.z,heading:agent.vehicle.state.heading};return true;}
 for(const village of data.VILLAGE_SITES){const residents=villages.residents.filter(r=>r.village===village.id);for(let i=0;i<Math.min(3,residents.length);i++){
  const resident=residents[i],home={...resident.home},nearest=graph.nearest(home),roadNodes=graph.byRoad.get(nearest.road),index=roadNodes.findIndex(n=>n.id===nearest.id),anchor=roadNodes[Math.max(0,Math.min(roadNodes.length-1,index+(index<roadNodes.length/2?1:-1)*i*3))],next=graph.nodes[anchor.edges[0]?.to]??anchor,dx=next.x-anchor.x,dz=next.z-anchor.z,len=Math.hypot(dx,dz)||1,heading=Math.atan2(dx,dz),origin={x:anchor.x-dz/len*((anchor.roadWidth<12?10.5:13)+i*.25),z:anchor.z+dx/len*((anchor.roadWidth<12?10.5:13)+i*.25)},kind=kinds[(agents.length+Math.floor(random()*4))%4];
  const vehicle=createVehicle(scene,kind,origin,heading,{heightAt:(x,z,altitude)=>{const p=data.roadSurfaceAt(x,z,{altitude:altitude??anchor.y});return p.distance<12?p.height:world.renderedTerrainHeight(x,z);}});
  vehicle.root.name='Resident '+resident.id+' '+kind;vehicle.root.userData.residentVehicle=true;resident.trafficDriver=true;if(kind==='scooter')resident.model.root.scale.setScalar(1.08+random()*.08);else resident.model.root.scale.multiplyScalar(.82);
  const agent={id:resident.id,role:roles[i],resident,vehicle,home,anchor,path:null,progress:0,speed:0,trip:0,shopIndex:Math.floor(random()*3),tourOffset:agents.length%4,phase:'driving',wait:0,visits:0,travelled:0,lastSteer:0};agents.push(agent);begin(agent);
 }}
 function update(dt,{player=null,parkedVehicle=null,observer=player,hour=12}={}){
  if(!Number.isFinite(dt)||dt<=0)return;const steps=Math.max(1,Math.ceil(Math.min(dt,.25)/.05)),h=Math.min(dt,.25)/steps;
  for(let step=0;step<steps;step++){simulationTime+=h;
   for(const a of agents){
    if(a.phase==='visiting'){a.wait-=h;a.resident.model.root.visible=false;if(a.wait<=0){a.trip++;a.anchor=a.destination;a.speed=0;begin(a);}continue;}
    if(!a.path){a.wait-=h;if(a.wait<=0)begin(a);continue;}
    const p=sampleDrivingPath(a.path,a.progress);if(!p)continue;const look=sampleDrivingPath(a.path,Math.min(a.path.length,a.progress+18)),curve=Math.abs(Math.atan2(Math.sin(look.heading-p.heading),Math.cos(look.heading-p.heading)));
    let target=(a.role==='island_tour'?14:a.role==='neighborhood_loop'?9:11)/(1+curve*2.5);target=Math.min(target,Math.sqrt(Math.max(0,(a.path.length-a.progress)*2.5)));
    let maxAdvance=Infinity;
    const obstacles=agents.filter(other=>other!==a).map(other=>({...other.vehicle.state,id:other.id,length:other.vehicle.config.length}));if(player)obstacles.push({...player,length:player.length??7});if(parkedVehicle)obstacles.push({...parkedVehicle,length:parkedVehicle.length??9});
    for(const o of obstacles){if(Math.abs((o.bodyY??p.y)-p.y)>5)continue;const dx=o.x-a.vehicle.state.x,dz=o.z-a.vehicle.state.z,forward=dx*p.dx+dz*p.dz,lateral=Math.abs(dx*p.dz-dz*p.dx);if((p.roadWidth??22)<12&&Math.cos((o.heading??0)-p.heading)<-.4&&forward> -12&&forward<45&&lateral<10){if(!o.id||a.id>o.id){a.yieldUntil=simulationTime+2;target=0;}else continue;}if(forward>0&&lateral<(o.kind==='helicopter'?6.3:o.kind==='motorhome'||a.vehicle.state.kind==='motorhome'?4.2:3.4)&&forward<12+a.speed*2){const gap=Math.max(0,forward-Math.max(9,(a.vehicle.config.length+(o.length??7))/2+1));target=Math.min(target,gap/2);maxAdvance=Math.min(maxAdvance,gap);}}
    a.speed=approach(a.speed,target,h*(target<a.speed?5:2));const delta=Math.min(a.speed*h,a.path.length-a.progress,maxAdvance);if(delta<a.speed*h-.0001)a.speed=delta/h;a.progress+=delta;a.travelled+=delta;const pose=sampleDrivingPath(a.path,a.progress),remaining=a.path.length-a.progress,lane=Math.min(4.1,(pose.roadWidth??22)/4),desired=(a.yieldUntil??0)>simulationTime?5.5:lane+((pose.roadWidth<12?10.5:14)-lane)*(1-ease(remaining/25)),offset=a.laneOffset=approach(a.laneOffset??lane,desired,h*3);
    let x=pose.x-pose.dz*offset,z=pose.z+pose.dx*offset;const startBlend=ease(a.progress/20);if(startBlend<1){x=a.start.x+(x-a.start.x)*startBlend;z=a.start.z+(z-a.start.z)*startBlend;}
    const ground=a.progress<20||remaining<25?world.renderedTerrainHeight(x,z):pose.y;
    const heading=pose.heading,state={...a.vehicle.state,x,z,heading,bodyY:ground,speed:a.speed,vx:Math.sin(heading)*a.speed,vz:Math.cos(heading)*a.speed,pitch:pose.pitch,roll:0,grounded:true,airborne:false,braking:target<a.speed-.1,reversing:false,skidIntensity:0};
    a.vehicle.update(state,h,Math.max(-1,Math.min(1,(look.heading-heading)*2)));const near=!observer||Math.hypot(x-observer.x,z-observer.z)<1500;a.vehicle.root.visible=near;a.vehicle.setLights({dark:hour<6||hour>=18||!!data.tunnelAt(x,z,ground)});if(a.vehicle.headlight)a.vehicle.headlight.visible=near&&(!observer||Math.hypot(x-observer.x,z-observer.z)<180);
    const avatar=a.resident.model,seat=residentSeatPose(state.kind,state,avatar.root.scale.y);avatar.root.position.set(seat.x,seat.y,seat.z);avatar.root.rotation.set(seat.pitch,seat.heading,0,'YXZ');avatar.root.visible=near;avatar.pose(seat.posture,false,simulationTime*1000);
    if(remaining<.15&&a.speed<.8){a.phase='visiting';a.wait=8+random()*12;a.visits++;a.vehicle.update({...state,speed:0,braking:true},0);avatar.root.visible=false;}
   }
  }
 }
 function colliders(){return agents.map(a=>{const s=a.vehicle.state,width=s.kind==='motorhome'?4.2:s.kind==='scooter'?1.2:3.3,depth=a.vehicle.config.length,c=Math.cos(s.heading),sn=Math.sin(s.heading),ex=Math.abs(c)*width/2+Math.abs(sn)*depth/2,ez=Math.abs(sn)*width/2+Math.abs(c)*depth/2;return {kind:'obb',id:'resident-vehicle-'+a.id,x:s.x,z:s.z,width,depth,heading:s.heading,minX:s.x-ex,maxX:s.x+ex,minZ:s.z-ez,maxZ:s.z+ez,minY:s.bodyY??0,maxY:(s.bodyY??0)+(s.kind==='motorhome'?4.6:3.5)};});}
 return {agents,graph,update,colliders,getState:()=>({simulationTime,routeFailures,graphNodes:graph.nodes.length,components:graph.components,agents:agents.map(a=>({id:a.id,role:a.role,kind:a.vehicle.state.kind,color:a.vehicle.root.userData.paintColor,phase:a.phase,goal:a.goal?.kind,visits:a.visits,travelled:a.travelled,x:a.vehicle.state.x,z:a.vehicle.state.z,y:a.vehicle.state.bodyY,speed:a.speed}))})};
}
