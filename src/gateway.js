import * as THREE from 'three';
import { BRIDGE, ARRIVAL } from './terrain.js';
/** Mainland parking and a real 500 m driveable bridge; no public transport. */
export function createGateway(parent){
 const group=new THREE.Group();group.name='mainland-parking-and-island-bridge';parent.add(group);const colliders=[];
 const mats=new Map();const mat=color=>{if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.85}));return mats.get(color);};
 function box(name,color,x,y,z,w,h,d){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.name=name;m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;group.add(m);return m;}
 box('mainland parking','#b5b8aa',ARRIVAL.x,2.51,ARRIVAL.z,130,.02,130);
 for(let i=-3;i<=3;i++)for(const sign of [-1,1])box('parking stripe','#fff5d1',ARRIVAL.x+i*15,2.535,ARRIVAL.z+sign*25,.15,.025,16);
 box('bridge deck','#d4c6aa',(BRIDGE.startX+BRIDGE.endX)/2,BRIDGE.height-.18,BRIDGE.z,BRIDGE.length,.36,BRIDGE.width);
 for(const side of [-1,1]){
  box('bridge guardrail','#c0c7bb',(BRIDGE.startX+BRIDGE.endX)/2,BRIDGE.height+.9,BRIDGE.z+side*9,500,.18,.3);
  box('bridge curb','#a8b8ad',(BRIDGE.startX+BRIDGE.endX)/2,BRIDGE.height+.2,BRIDGE.z+side*9,500,.4,.45);
  colliders.push({id:'bridge-rail-'+side,kind:'box',minX:BRIDGE.startX,maxX:BRIDGE.endX,minZ:BRIDGE.z+side*9-.28,maxZ:BRIDGE.z+side*9+.28,minY:BRIDGE.height,maxY:BRIDGE.height+1.1});
  for(let i=0;i<=40;i++)box('bridge rail post','#a8b8ad',BRIDGE.startX+i*12.5,BRIDGE.height+.55,BRIDGE.z+side*9,.18,1.1,.18);
 }
 for(let i=0;i<8;i++)box('bridge pier','#afbbad',BRIDGE.startX+(i+.5)*62.5,-.4,BRIDGE.z,3.5,9,10);
 return {group,colliders,dispose(){group.removeFromParent();group.traverse(o=>o.geometry?.dispose());mats.forEach(m=>m.dispose());}};
}
