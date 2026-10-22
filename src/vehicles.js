import * as THREE from 'three';
import { pathSurfaceHeight } from './paths.js';
import { sampleWheelGround, stepChassis } from './vehicle-physics.js';
import { createSkidMarks } from './skid-marks.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { resolveMovement, travelHeight, terrainHeight, canOccupy, isWater, waterSurfaceAt } from './terrain.js';

export const VEHICLES = Object.freeze({
  motorhome: Object.freeze({ drivetrain:'awd', maxSpeed: 72, maxWadeDepth:0.65, acceleration: 12, brake: 28, turnRate: 1.05, radius: 4.62, wheelRadius: .715, length: 8.8, wheelBase: 5.61, track: 3.41, travel: .44 }),
  sedan: Object.freeze({ drivetrain:'rwd', maxSpeed: 96, maxWadeDepth:0.5, acceleration: 18, brake: 30, turnRate: 1.45, radius: 2.8, wheelRadius: .55, length: 5.8, wheelBase:3.7, track:2.56, travel:.3 }),
  suv: Object.freeze({ drivetrain:'awd', maxSpeed: 84, maxWadeDepth:0.7, acceleration: 16, brake: 30, turnRate: 1.3, radius: 3, wheelRadius: .67, length: 6.2, wheelBase:4, track:2.74, travel:.44 }),
  scooter: Object.freeze({ drivetrain:'rwd', maxSpeed: 60, maxWadeDepth:0.3, acceleration: 14, brake: 24, turnRate: 1.9, radius: 1.35, wheelRadius: .40, length: 2.8, wheelBase:1.84, track:0, travel:.20 }),
});
const approach = (v, target, step) => v < target ? Math.min(target, v + step) : Math.max(target, v - step);
export const TYRE_GRIP=1.2;
export const STEERING_RESPONSE=1.35;
/** Service braking acts on both axles; a handbrake adds no front-axle force. */
export function axleBrakeForces(config,{service=false,handbrake=false,sliding=false}={}){
 const front=service?config.brake*1.0625/2:0;
 const rear=Math.max(front,handbrake?(sliding?4.675:config.brake*.425):0);
 return {front,rear};
}
/** Equal front/rear drive in AWD, all drive at the rear in RWD; locked tyres transmit no drive. */
export function axleDriveForces(config,{throttle=0,handbrake=false,frontGrip=TYRE_GRIP,rearGrip=TYRE_GRIP}={}){
 const frontShare=config.drivetrain==='awd'?.5:0,rearShare=1-frontShare;
 return {front:frontShare?config.acceleration*throttle*frontShare*Math.min(1,Math.max(0,frontGrip/TYRE_GRIP)):0,rear:handbrake?0:config.acceleration*throttle*rearShare*Math.min(1,Math.max(0,rearGrip/TYRE_GRIP))};
}
/** Check tyres and centre, so shallow water is accessible without submerging the vehicle. */
export function vehicleWaterAllowed(state,config,heightAt=terrainHeight,surfaceAt=waterSurfaceAt){
 return [{x:state.x,z:state.z},...sampleWheelGround(state,config,heightAt).wheels].every(p=>{
  const surface=surfaceAt(p.x,p.z);return surface===null||surface-heightAt(p.x,p.z)<=config.maxWadeDepth;
 });
}
/** Rear-wheel handbrake releases lateral grip while momentum continues in world space. */
export function stepDrive(previous,input,dt,colliders=[],environment={}){
 if(!VEHICLES[previous.kind]||!Number.isFinite(dt)||dt<=0)return {...previous};
 const steps=Math.ceil(Math.min(dt,.1)*120),h=Math.min(dt,.1)/steps;let state={...previous};
 for(let i=0;i<steps;i++)state=driveStep(state,input,h,colliders,environment);
 return state;
}
function driveStep(state,input,dt,colliders,environment){
 const config=VEHICLES[state.kind],throttle=Number(!!input.forward)-Number(!!input.backward),steer=Number(!!input.left)-Number(!!input.right);
 const heightAt=environment.heightAt??((x,z)=>travelHeight(x,z,state.bodyY??terrainHeight(state.x,state.z))),ground=sampleWheelGround(state,config,heightAt);
 const f={x:Math.sin(state.heading),z:Math.cos(state.heading)},r={x:Math.cos(state.heading),z:-Math.sin(state.heading)};
 let vx=state.vx??f.x*state.speed,vz=state.vz??f.z*state.speed;
 let longitudinal=vx*f.x+vz*f.z,lateral=vx*r.x+vz*r.z;
 const uphill=Math.max(0,-Math.sin(ground.pitch)*Math.sign(throttle||longitudinal));
 const handbrake=!!input.handbrake,sliding=handbrake&&Math.hypot(vx,vz)>8&&!state.airborne;
 const service=!!input.brake||throttle*longitudinal<0;
 const traction=approach(state.traction??1,sliding?.05:1,dt*(sliding?7:1.8));
 const tyreGrip={front:TYRE_GRIP,rear:TYRE_GRIP*traction};
 const axleDrive=axleDriveForces(config,{throttle:service?0:throttle,handbrake,frontGrip:tyreGrip.front,rearGrip:tyreGrip.rear});
 const axleBrakes=axleBrakeForces(config,{service,handbrake,sliding});
 const target=throttle>0?config.maxSpeed/(1+uphill*1.4):throttle<0?-config.maxSpeed*.4/(1+uphill*1.4):0;
 const driveAcceleration=Math.abs(axleDrive.front+axleDrive.rear),brakeAcceleration=axleBrakes.front+axleBrakes.rear;
 if(!service&&driveAcceleration)longitudinal=approach(longitudinal,target,dt*driveAcceleration);
 if(brakeAcceleration)longitudinal=approach(longitudinal,0,dt*brakeAcceleration);
 else if(!throttle)longitudinal=approach(longitudinal,0,dt*5);
 if(!service&&!handbrake&&!state.airborne)longitudinal+=9.8*Math.sin(ground.pitch)*dt;
 const absSpeed=Math.abs(longitudinal),gripYaw=STEERING_RESPONSE*Math.min(config.turnRate*TYRE_GRIP/(1+absSpeed*absSpeed/900),12.5*TYRE_GRIP/Math.max(1,absSpeed));
 const targetYaw=steer*gripYaw*(sliding?1.85:1)*Math.min(1,absSpeed/4)*Math.sign(longitudinal);
 const yawRate=approach(state.yawRate??0,targetYaw,dt*(sliding?3.5:5.5*STEERING_RESPONSE)),heading=state.heading+yawRate*dt;
 vx=f.x*longitudinal+r.x*lateral;vz=f.z*longitudinal+r.z*lateral;
 const nf={x:Math.sin(heading),z:Math.cos(heading)},nr={x:Math.cos(heading),z:-Math.sin(heading)};
 let forward=vx*nf.x+vz*nf.z,side=vx*nr.x+vz*nr.z;
 // The front tyres still guide the car. Rear grip returns progressively after release.
 // Steering/front contact stays available when only the rear tyres are locked.
 side*=Math.exp(-(state.airborne?.15:.65*tyreGrip.front+14*tyreGrip.rear)*dt);
 if(service){side=approach(side,0,(axleBrakes.front+axleBrakes.rear)*dt);}
 if(Math.abs(forward)<.05&&!throttle)forward=0;if(Math.abs(side)<.01)side=0;
 vx=nf.x*forward+nr.x*side;vz=nf.z*forward+nr.z*side;
 const delta={x:vx*dt,z:vz*dt};
 const moved=resolveMovement(state,delta,colliders,config.radius,{vehicle:true,heightAt,allowWater:true,waterAllowedAt:(x,z)=>vehicleWaterAllowed({...state,x,z,heading},config,heightAt,environment.waterSurfaceAt??waterSurfaceAt),footY:state.bodyY??ground.height,bodyHeight:state.kind==='motorhome'?4.6:3.7});
 const desired=Math.hypot(delta.x,delta.z),actual=Math.hypot(moved.x-state.x,moved.z-state.z),blocked=desired>1e-7&&actual<desired*.45;
 if(blocked){forward=0;vx=0;vz=0;side=0;}
 else if(desired>.002&&actual<desired*.98){vx=(moved.x-state.x)/dt;vz=(moved.z-state.z)/dt;forward=vx*nf.x+vz*nf.z;side=vx*nr.x+vz*nr.z;}
 const slipAngle=Math.atan2(side,Math.max(.1,Math.abs(forward)));
 const braking=service&&!input.park||handbrake,speed=Math.hypot(vx,vz);
 const lateralSkid=speed>8&&Math.abs(slipAngle)>.085?Math.min(1,Math.abs(side)/3):0;
 const serviceSkid=service&&!input.park&&speed>8?.6:0,contact=!state.airborne&&!blocked;
 const skidAxles={front:contact&&!handbrake?Math.max(lateralSkid,serviceSkid):0,rear:contact?Math.max(lateralSkid,serviceSkid,handbrake&&speed>3?.75:0):0};
 const skidIntensity=Math.max(skidAxles.front,skidAxles.rear);
 const next={...state,...moved,heading,speed:forward,vx,vz,yawRate,blocked,traction,tyreGrip,axleBrakes,axleDrive,handbrake,braking,reversing:forward<-.2,slipAngle,skidAxles,skidIntensity,drifting:speed>8&&Math.abs(slipAngle)>.1};
 return {...next,...stepChassis(next,sampleWheelGround(next,config,heightAt),dt,config,{acceleration:(forward-state.speed)/dt,turnRate:yawRate})};
}
/** Find dry, unobstructed ground beside the stopped vehicle, never inside a wall or water. */
export function dismountPosition(state, colliders = []) {
  const radius = VEHICLES[state.kind].radius;
  for (const angle of [-Math.PI / 2, Math.PI / 2, Math.PI, 0]) for (const extra of [1.0, 1.8, 2.8]) {
    const x = state.x + Math.sin(state.heading + angle) * (radius + extra), z = state.z + Math.cos(state.heading + angle) * (radius + extra);
    if (canOccupy(x, z, colliders, .55) && Math.abs(terrainHeight(x, z) - terrainHeight(state.x, state.z)) < 2.2 && !isWater(x, z)) return { x, z };
  }
  return null;
}
export function createVehicle(parent, kind, origin, heading = 0, environment={}) {
  if (!VEHICLES[kind]) throw new Error('Unknown vehicle');
  const root = new THREE.Group(); root.name = `Camper ${kind}`; parent.add(root);
  const geometries = new Set(), materials = new Map(), wheels = [], frontWheels = [];
  const material = (color, glass = false) => {
    const key = color + glass;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: glass ? .25 : .65, transparent: glass, opacity: glass ? .38 : 1, depthWrite: !glass }));
    return materials.get(key);
  };
  function part(geo, color, x, y, z, glass = false) { geometries.add(geo); const m = new THREE.Mesh(geo, material(color, glass)); m.position.set(x, y, z); m.castShadow = !glass; m.receiveShadow = true; root.add(m); return m; }
  const box = (c, x, y, z, w, h, d, glass = false) => part(new RoundedBoxGeometry(w, h, d, 3, .10), c, x, y, z, glass);
  const cylinder = (c, x, y, z, radius, depth) => part(new THREE.CylinderGeometry(radius, radius, depth, 24), c, x, y, z);
  const scooter = kind === 'scooter', suv = kind === 'suv', color = scooter ? '#d9907f' : suv ? '#8eaf99' : '#e6bd73';
  const tyre = VEHICLES[kind].wheelRadius/(kind==='motorhome'?1.1:1);
  for (const side of scooter ? [0] : [-1, 1]) for (const front of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(side * VEHICLES[kind].track / 2 / (kind==='motorhome'?1.1:1), tyre, front * VEHICLES[kind].wheelBase / 2 / (kind==='motorhome'?1.1:1)); root.add(pivot);
    const wheel = new THREE.Group(); pivot.add(wheel);
    const tire = part(new THREE.CylinderGeometry(tyre, tyre, scooter ? .20 : .40, 28), '#454944', 0, 0, 0); tire.rotation.z = Math.PI / 2; wheel.add(tire);
    const hub = part(new THREE.CylinderGeometry(tyre * .59, tyre * .59, scooter ? .22 : .43, 20), '#e5ddc8', 0, 0, 0); hub.rotation.z = Math.PI / 2; wheel.add(hub);
    wheels.push(wheel); if (front === 1) frontWheels.push(pivot);
  }
  if (scooter) {
    box(color, 0, .62, -.35, .85, .65, 1.55);
    box('#4f645c', 0, 1.10, -.35, .83, .22, 1.18);
    box('#ead8b8', 0, .49, .40, .94, .12, 1.0);
    const shield = box(color, 0, 1.25, .91, .95, 1.20, .22); shield.rotation.x = -.15;
    const stem = cylinder('#788d82', 0, 1.85, .90, .055, .85); stem.rotation.x = -.12;
    const handle = cylinder('#4d6157', 0, 2.20, .82, .06, 1.06); handle.rotation.z = Math.PI / 2;
    part(new THREE.SphereGeometry(.20, 20, 14), '#fff2c4', 0, 1.85, 1.08).scale.set(1, 1, .4);
    for (const side of [-1, 1]) { const mirror = part(new THREE.SphereGeometry(.12, 16, 12), '#a6c9c1', side * .56, 2.38, .85); mirror.scale.z = .3; }
    box('#e6d9bf', 0, 1.1, -1.05, .54, .18, .14);
  } else if (kind === 'motorhome') {
    // Compact coachbuilt motorhome: over-cab bunk, habitation box and separate cab.
    box('#52635c',0,.7,0,3.6,.4,8);
    box('#eee7d5',0,2.35,-.9,3.8,3.25,6.1);
    box('#74988d',0,1.25,-.9,3.84,.45,6.12);
    box('#eee7d5',0,1.6,2.7,3.5,1.6,2.5);
    box('#bad7d5',0,2.55,2.65,3.25,1.05,2.25,true);
    box('#eee7d5',0,3.65,2.1,3.7,.9,3.4);
    box('#c5d9d6',0,3.68,3.83,2.5,.42,.05,true);
    for(const side of [-1,1]) {
      for(const z of [-2.8,-.8])box('#8eafb4',side*1.92,2.65,z,.04,1.05,1.35,true);
      box('#f6e8b5',side*1.15,1.45,4.01,.6,.3,.08);
      box('#bd6c58',side*1.3,1.3,-3.99,.35,.5,.08);
      box('#546b60',side*1.87,2.4,2.5,.25,.3,.45);
    }
    box('#d8cbb0',1.94,1.95,-1.95,.1,2.3,.95);
    box('#647e75',2.01,2.2,-1.95,.04,.08,.25);
    box('#566b60',2.1,.7,-1.95,.6,.15,1.3);
    box('#a6c6cb',0,4.03,-.9,1.2,.12,1.5,true);
    box('#526e7d',0,4.02,-2.8,2.5,.09,1.1);
    box('#52635c',0,.95,4.05,3.5,.22,.2);
  } else {
    const width = suv ? 3.1 : 2.95, length = VEHICLES[kind].length;
    box('#59665b', 0, .72, 0, width - .18, .44, length - .3);
    box(color, 0, 1.25, 0, width, 1.02, length);
    box(color, 0, 1.85, suv ? .05 : -.12, width - .22, .42, length - 1.2);
    box('#bdd9cf', 0, suv ? 2.65 : 2.58, -.25, width - .45, suv ? 1.65 : 1.45, 2.9, true);
    box(color, 0, suv ? 3.48 : 3.32, -.25, width - .35, .18, 3.08);
    for (const side of [-1, 1]) {
      for (const z of [-1.61, .3, 1.12]) box(color, side * (width / 2 - .20), 2.61, z, .10, 1.45, .10);
      box('#eee3bf', side * .55, 1.40, length / 2 + .03, .67, .28, .12);
      box('#c87560', side * 1.02, 1.37, -length / 2 - .03, .42, .25, .12);
      box('#f2e5c8', side * (width / 2 + .02), 1.85, -.40, .07, .07, .36);
      box(color, side * (width / 2 + .10), 2.40, .80, .32, .23, .37);
      box('#6b7c69', side * .55, 1.65, -.25, .74, .45, .95);
      box('#6b7c69', side * .55, 2.12, -.65, .74, .88, .27);
    }
    box('#788d7c', 0, 1.04, length / 2 + .10, width - .15, .20, .20);
    box('#788d7c', 0, 1.04, -length / 2 - .10, width - .15, .20, .20);
    box('#f6edd5', 0, 1.26, length / 2 + .19, .57, .19, .03);
    const steering = part(new THREE.TorusGeometry(.25, .035, 8, 24), '#4c6054', -.55, 2.02, .68); steering.rotation.x = -.4;
    if (suv) for (const side of [-1, 1]) box('#6f8170', side * .9, 3.65, -.25, .10, .12, 2.4);
  }
  if(kind==='motorhome'){
    root.traverse(o=>{o.position.multiplyScalar(1.1);});geometries.forEach(g=>g.scale(1.1,1.1,1.1));
  }
  const lampMaterials={head:new THREE.MeshStandardMaterial({color:'#f6ecd2',emissive:'#fff1c4',emissiveIntensity:0,roughness:.3}),brake:new THREE.MeshStandardMaterial({color:'#a83430',emissive:'#ff2616',emissiveIntensity:0}),reverse:new THREE.MeshStandardMaterial({color:'#cfcfc0',emissive:'#fffcec',emissiveIntensity:0})};
  const front=VEHICLES[kind].length/2+.16,rear=-VEHICLES[kind].length/2-.08;
  const lamps=[];
  for(const side of scooter?[0]:[-1,1]){
    for(const [type,z,y,w] of [['head',front,scooter?1.85:1.5,scooter?.32:.55],['brake',rear,scooter?1.12:1.4,scooter?.26:.42],['reverse',rear-.015,scooter?.88:1.02,scooter?.16:.28]]){
      const geo=new THREE.BoxGeometry(w,type==='reverse'?.18:.25,.06);geometries.add(geo);const lamp=new THREE.Mesh(geo,lampMaterials[type]);lamp.name=type+' light';lamp.position.set(side*(kind==='motorhome'?1.4:1),y,z);root.add(lamp);lamps.push(lamp);
    }
  }
  const headlight=new THREE.SpotLight('#fff0cc',0,100,.44,.55,1.2);headlight.position.set(0,scooter?1.85:1.9,front);headlight.target.position.set(0,0,front+55);root.add(headlight,headlight.target);
  let lightState={auto:false,brake:false,reverse:false};
  function setLights({dark=false}={}){
    lightState={auto:dark,brake:!!state.braking,reverse:!!state.reversing};
    lampMaterials.head.emissiveIntensity=dark?3:0;lampMaterials.brake.emissiveIntensity=lightState.brake?3.5:dark?.45:0;lampMaterials.reverse.emissiveIntensity=lightState.reverse?2.5:0;
    headlight.intensity=dark?160:0;
    return lightState;
  }
  const contactRadius=VEHICLES[kind].wheelRadius;
  let state = { kind, x: origin.x, z: origin.z, heading, speed: 0, blocked: false };
  const skidMarks=createSkidMarks(parent,{heightAt:environment.heightAt??((x,z,y)=>travelHeight(x,z,y))});
  const model = { root, wheels, frontWheels, lamps, headlight, skidMarks, setLights, get lights(){return {...lightState};}, config: VEHICLES[kind], get state() { return state; },
    update(next, dt = 0, steering = 0) {
      state = { ...next }; const ground=state.ground??sampleWheelGround(state,VEHICLES[kind],environment.heightAt??((x,z)=>travelHeight(x,z,state.bodyY??terrainHeight(state.x,state.z))));
      if(!Number.isFinite(state.bodyY))Object.assign(state,stepChassis(state,ground,0,VEHICLES[kind]));
      root.position.set(state.x,state.bodyY,state.z);root.rotation.set(state.pitch,state.heading,state.roll,'YXZ');root.updateMatrixWorld(true);
      const up=Math.max(.5,Math.cos(state.pitch)*Math.cos(state.roll));
      const heightAt=environment.heightAt??((x,z)=>travelHeight(x,z,state.bodyY??terrainHeight(state.x,state.z)));
      wheels.forEach(wheel=>{const pivot=wheel.parent;let suspension=contactRadius;
        for(let i=0;i<4;i++){
          const point=new THREE.Vector3(pivot.position.x,suspension,pivot.position.z).applyQuaternion(root.quaternion).add(root.position);
          suspension+=((heightAt(point.x,point.z)+contactRadius)-point.y)/up;
          suspension=THREE.MathUtils.clamp(suspension,contactRadius-VEHICLES[kind].travel,contactRadius+VEHICLES[kind].travel);
        }
        pivot.position.y=suspension;
      });
      // A locked rear wheel leaves a ribbon while the free front wheel keeps rolling.
      wheels.forEach(w => {if(!(state.handbrake&&w.parent.position.z<0))w.rotation.x += state.speed * dt / contactRadius;}); frontWheels.forEach(w => w.rotation.y = steering * .35);skidMarks.update(state,VEHICLES[kind],dt);
    },
    collider() { return { kind: 'circle', x: state.x, z: state.z, radius: VEHICLES[kind].radius,minY:root.position.y,maxY:root.position.y+(kind==='motorhome'?4.62:scooter?2.5:3.7), id: 'player-vehicle' }; },
    dispose() { root.removeFromParent();skidMarks.dispose(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());Object.values(lampMaterials).forEach(m=>m.dispose());headlight.dispose(); },
  };
  model.update(state);setLights();return model;
}
