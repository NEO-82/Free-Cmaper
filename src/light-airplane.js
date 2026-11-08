export const AIRPLANE_CONFIG=Object.freeze({maxSpeed:90,takeoffSpeed:26,stallSpeed:20,radius:2.6,length:8.4,height:3.2,wingSpan:11.4,ceiling:1800});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const approach=(v,t,d)=>v<t?Math.min(t,v+d):Math.max(t,v-d);
export function planeSpawn(bridge){return {x:bridge.startX+35,z:bridge.z,heading:Math.PI/2};}
export function stepAirplane(state,input,dt,colliders=[],options={}){
 if(!Number.isFinite(dt)||dt<=0)return {...state};const cfg=AIRPLANE_CONFIG,height=options.heightAt??(()=>0),bounds=options.bounds??{minX:-Infinity,maxX:Infinity,minZ:-Infinity,maxZ:Infinity};
 let s={speed:0,vy:0,heading:Math.PI/2,pitch:0,roll:0,throttle:0,grounded:true,engineOn:false,...state};const count=Math.ceil(Math.min(dt,.1)*120),h=Math.min(dt,.1)/count;
 for(let i=0;i<count;i++){
  const unattended=!!input.park,throttle=unattended?0:clamp(s.throttle+(+!!input.forward*.3-+!!input.backward*.5)*h,0,1),engineOn=unattended?false:s.engineOn||input.forward,turn=+!!input.left-+!!input.right;
  const target=unattended?-.12:input.level?0:clamp(input.pitchCommand??0,-.48,.6),pitch=approach(s.pitch,s.grounded?clamp(target,-.03,.14):target,h*.65),roll=approach(s.roll,s.grounded?0:-turn*.46,h*1.3);
  let speed=clamp(s.speed+((engineOn?throttle*9:0)-.0015*s.speed*s.speed-(s.grounded?.65:.2)-Math.sin(pitch)*3.4-(input.brake&&s.grounded?12:0))*h,0,cfg.maxSpeed),heading=s.heading+turn*(s.grounded?.3:.55)*Math.min(1,speed/20)*h;
  let x=clamp(s.x+Math.sin(heading)*Math.cos(pitch)*speed*h,bounds.minX+6,bounds.maxX-6),z=clamp(s.z+Math.cos(heading)*Math.cos(pitch)*speed*h,bounds.minZ+6,bounds.maxZ-6),grounded=s.grounded,vy=s.vy,y=s.bodyY,impactSpeed=0;
  if(grounded&&speed>=cfg.takeoffSpeed&&pitch>.055){grounded=false;vy=Math.max(2,speed*Math.sin(pitch));}
  if(!grounded){const lift=9.81*Math.min(1,(speed/cfg.stallSpeed)**2)*Math.cos(roll),targetVy=speed*Math.sin(pitch),control=clamp((targetVy-vy)*1.7,-12,12);vy+=(lift-9.81+control)*h;y+=vy*h;}else{vy=0;y=height(x,z,s.bodyY)+.02;}
  const ceiling=options.ceilingAt?.(x,z,y)??Infinity;if(y+cfg.height>ceiling){y=ceiling-cfg.height;vy=Math.min(0,vy);}
  const collision=colliders.some(c=>c.id!=='player-vehicle'&&y+cfg.height>(c.minY??-Infinity)&&y<(c.maxY??Infinity)&&options.blocksMovement?.(s,{x,z},cfg.radius,c));
  if(collision){x=s.x;z=s.z;impactSpeed=speed;speed=0;}
  const floor=Math.max(height(x,z,y),options.waterSurfaceAt?.(x,z)??-Infinity)+.02;
  if(y<=floor&&vy<=0){impactSpeed=Math.max(impactSpeed,-vy);y=floor;grounded=true;vy=0;}
  if(y>=cfg.ceiling){y=cfg.ceiling;vy=Math.min(0,vy);}
  s={...s,x,z,bodyY:y,heading,pitch:grounded?Math.min(pitch,.14):pitch,roll:grounded?0:roll,speed,vy,vx:Math.sin(heading)*Math.cos(pitch)*speed,vz:Math.cos(heading)*Math.cos(pitch)*speed,grounded,airborne:!grounded,throttle,engineOn,rotorSpeed:engineOn?.25+throttle*.75:0,stalled:!grounded&&speed<cfg.stallSpeed,impactSpeed,skidIntensity:0};
 }
 return s;
}
export function createAirplane(scene,C,position,heading=Math.PI/2,{heightAt=()=>0}={}){
 const {Group,Mesh,MeshStandardMaterial,BoxGeometry,SphereGeometry,CylinderGeometry}=C,root=new Group();root.name='Camping light airplane';scene.add(root);const geometries=new Set(),materials=new Set();
 const paint=new MeshStandardMaterial({color:'#f4bc57',roughness:.65}),cream=new MeshStandardMaterial({color:'#fff3d5',roughness:.7}),dark=new MeshStandardMaterial({color:'#455953',roughness:.8}),glass=new MeshStandardMaterial({color:'#aed7db',transparent:true,opacity:.32,roughness:.2,depthWrite:false});for(const m of [paint,cream,dark,glass])materials.add(m);
 const part=(g,m,x,y,z,parent=root)=>{geometries.add(g);const o=new Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;},box=(w,h,d,m,x,y,z,p=root)=>part(new BoxGeometry(w,h,d),m,x,y,z,p);
 const body=part(new SphereGeometry(1,20,12),paint,0,1.2,0);body.scale.set(.9,.6,3.4);
 const cockpit=part(new SphereGeometry(1,16,12),glass,0,1.55,.65);cockpit.scale.set(.82,.9,1.35);box(1.2,.12,1.5,dark,0,.85,.5);
 box(11.4,.16,1.55,cream,0,2.55,.1);for(const side of [-1,1]){box(.75,.18,1.57,paint,side*4.5,2.56,.1);const strut=box(.07,1.85,.07,dark,side*2.1,1.68,.1);strut.rotation.z=-side*.65;}
 box(3.8,.13,1.2,cream,0,1.25,-3.15);box(.15,1.6,1.35,paint,0,2,-3.2);
 for(const [x,z]of[[-1.15,-.3],[1.15,-.3],[0,2.25]]){box(.09,.7,.09,dark,x,.67,z);const wheel=part(new CylinderGeometry(.34,.34,.2,16),dark,x,.34,z);wheel.rotation.z=Math.PI/2;}
 const propeller=new Group();propeller.position.set(0,1.35,3.42);root.add(propeller);for(const rotation of[0,Math.PI/2]){const blade=box(.12,2.5,.08,dark,0,0,0,propeller);blade.rotation.z=rotation;}part(new SphereGeometry(.22,12,8),cream,0,1.35,3.52);
 let s={kind:'airplane',...position,heading,bodyY:heightAt(position.x,position.z)+.02,speed:0,vy:0,grounded:true,airborne:false,pitch:0,roll:0,throttle:0,engineOn:false,rotorSpeed:0};
 const vehicle={root,config:AIRPLANE_CONFIG,wheels:[],get state(){return s;},update(next,dt=0){s={...next};root.position.set(s.x,s.bodyY,s.z);root.rotation.set(-s.pitch,s.heading,s.roll,'YXZ');propeller.rotation.z+=dt*(s.rotorSpeed??0)*65;root.updateMatrixWorld(true);},setLights(){},get lights(){return {auto:false};},skidMarks:{getState:()=>({segments:0,lifetime:20})},collider(){return {kind:'circle',id:'player-vehicle',x:s.x,z:s.z,radius:2.6,minY:s.bodyY,maxY:s.bodyY+3.2};},dispose(){root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}};vehicle.update(s);return vehicle;
}
