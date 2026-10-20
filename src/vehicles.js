import * as THREE from 'three';
import { pathSurfaceHeight } from './paths.js';
import { sampleWheelGround, stepChassis } from './vehicle-physics.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { resolveMovement, terrainHeight, canOccupy, isWater } from './terrain.js';

export const VEHICLES = Object.freeze({
  motorhome: Object.freeze({ maxSpeed: 48, acceleration: 12, brake: 28, turnRate: 1.05, radius: 4.2, wheelRadius: .65, length: 8, wheelBase: 5.1, track: 3.1, travel: .4 }),
  sedan: Object.freeze({ maxSpeed: 64, acceleration: 18, brake: 30, turnRate: 1.45, radius: 2.8, wheelRadius: .55, length: 5.8, wheelBase:3.7, track:2.56, travel:.3 }),
  suv: Object.freeze({ maxSpeed: 56, acceleration: 16, brake: 30, turnRate: 1.3, radius: 3, wheelRadius: .67, length: 6.2, wheelBase:4, track:2.74, travel:.44 }),
  scooter: Object.freeze({ maxSpeed: 40, acceleration: 14, brake: 24, turnRate: 1.9, radius: 1.35, wheelRadius: .40, length: 2.8, wheelBase:1.84, track:0, travel:.20 }),
});
const approach = (v, target, step) => v < target ? Math.min(target, v + step) : Math.max(target, v - step);
/** WASD drive: W/S forward/reverse, A/D steering, Space brake. No road constraint. */
export function stepDrive(state, input, dt, colliders = [], environment = {}) {
  const config = VEHICLES[state.kind];
  if (!config || !Number.isFinite(dt) || dt <= 0) return { ...state };
  dt = Math.min(dt, .1);
  const throttle = Number(!!input.forward) - Number(!!input.backward), steer = Number(!!input.left) - Number(!!input.right);
  const heightAt=environment.heightAt??pathSurfaceHeight,terrain=sampleWheelGround(state,config,heightAt);
  const uphill=Math.max(0,-Math.sin(terrain.pitch)*Math.sign(throttle||state.speed));
  const target = input.brake ? 0 : throttle > 0 ? config.maxSpeed/(1+uphill*1.4) : throttle < 0 ? -config.maxSpeed*.4/(1+uphill*1.4) : 0;
  const braking = input.brake || state.speed * target < 0;
  let speed = approach(state.speed, target, dt * (braking ? config.brake : throttle ? config.acceleration : 5));
  if(!input.brake&&!state.airborne)speed+=9.8*Math.sin(terrain.pitch)*dt;
  if((input.brake&&Math.abs(speed)<config.brake*dt)||(!throttle&&Math.abs(speed)<.05))speed=0;
  const yawRate=steer*config.turnRate*Math.min(1,Math.abs(speed)/5)*Math.sign(speed)/(1+speed*speed/180);
  const heading = state.heading + yawRate*dt;
  const delta = { x: Math.sin(heading) * speed * dt, z: Math.cos(heading) * speed * dt };
  const moved = resolveMovement(state, delta, colliders, config.radius);
  const desired = Math.hypot(delta.x, delta.z), actual = Math.hypot(moved.x - state.x, moved.z - state.z);
  const blocked = desired > .005 && actual < desired * .45;
  if (blocked) speed = 0;
  const next={...state,...moved,heading,speed,blocked},ground=sampleWheelGround(next,config,heightAt);
  return {...next,...stepChassis(next,ground,dt,config,{acceleration:(speed-state.speed)/dt,turnRate:yawRate})};
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
  const tyre = VEHICLES[kind].wheelRadius;
  for (const side of scooter ? [0] : [-1, 1]) for (const front of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(side * VEHICLES[kind].track / 2, tyre, front * VEHICLES[kind].wheelBase / 2); root.add(pivot);
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
    box('#d8cbb0',1.94,1.95,1.1,.1,2.3,.95);
    box('#647e75',2.01,2.2,1.1,.04,.08,.25);
    box('#566b60',2.1,.7,1.1,.6,.15,1.3);
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
  let state = { kind, x: origin.x, z: origin.z, heading, speed: 0, blocked: false };
  const model = { root, wheels, frontWheels, config: VEHICLES[kind], get state() { return state; },
    update(next, dt = 0, steering = 0) {
      state = { ...next }; const ground=state.ground??sampleWheelGround(state,VEHICLES[kind],environment.heightAt??pathSurfaceHeight);
      if(!Number.isFinite(state.bodyY))Object.assign(state,stepChassis(state,ground,0,VEHICLES[kind]));
      root.position.set(state.x,state.bodyY,state.z);root.rotation.set(state.pitch,state.heading,state.roll,'YXZ');root.updateMatrixWorld(true);
      const up=Math.max(.5,Math.cos(state.pitch)*Math.cos(state.roll));
      const heightAt=environment.heightAt??pathSurfaceHeight;
      wheels.forEach(wheel=>{const pivot=wheel.parent;let suspension=tyre;
        for(let i=0;i<4;i++){
          const point=new THREE.Vector3(pivot.position.x,suspension,pivot.position.z).applyQuaternion(root.quaternion).add(root.position);
          suspension+=((heightAt(point.x,point.z)+tyre)-point.y)/up;
          suspension=THREE.MathUtils.clamp(suspension,tyre-VEHICLES[kind].travel,tyre+VEHICLES[kind].travel);
        }
        pivot.position.y=suspension;
      });
      wheels.forEach(w => w.rotation.x += state.speed * dt / tyre); frontWheels.forEach(w => w.rotation.y = steering * .35);
    },
    collider() { return { kind: 'circle', x: state.x, z: state.z, radius: VEHICLES[kind].radius,minY:root.position.y,maxY:root.position.y+(kind==='motorhome'?4.2:scooter?2.5:3.7), id: 'player-vehicle' }; },
    dispose() { root.removeFromParent(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
  model.update(state); return model;
}
