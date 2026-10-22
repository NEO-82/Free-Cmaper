import * as THREE from 'three';
import {ROADS,TUNNELS,ROAD_JUNCTIONS,roadSurfaceAt,tunnelAt,tunnelCeilingAt} from './road-network.js';
import {pathUnderlayHeight} from './paths.js';
import {WORLD,BRIDGE} from './landscape-layout.js';

export function portalCutHeight(p,x,z){
 const dx=x-p.x,dz=z-p.z,lateral=Math.cos(p.heading)*dx-Math.sin(p.heading)*dz,longitudinal=Math.sin(p.heading)*dx+Math.cos(p.heading)*dz;
 const collar=Math.abs(longitudinal)<5;
 if(Math.abs(lateral)>=(collar?12.88:10.9)||longitudinal<=-50||longitudinal>=75)return -Infinity;
 return p.y+(collar?6.67+5.52*Math.sqrt(Math.max(0,1-(lateral/12.88)**2)):10.7);
}
export function tunnelWallColliders(tunnels=TUNNELS){
 const walls=[];
 for(const tunnel of tunnels){const track=tunnel.track.filter((_,i)=>i%4===0||i===tunnel.track.length-1);
  for(let i=1;i<track.length;i++){const a=track[i-1],b=track[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),heading=Math.atan2(dx,dz);if(!len)continue;
   for(const side of [-1,1]){const x=(a.x+b.x)/2+side*dz/len*11.6,z=(a.z+b.z)/2-side*dx/len*11.6,width=.8,depth=len+1;
    const other=roadSurfaceAt(x,z,{altitude:a.y,excludeRoad:tunnel.road});if(other.distance<12&&Math.abs(other.height-a.y)<2)continue;
    const ex=Math.abs(Math.cos(heading))*width/2+Math.abs(Math.sin(heading))*depth/2,ez=Math.abs(Math.sin(heading))*width/2+Math.abs(Math.cos(heading))*depth/2;
    walls.push({kind:'obb',id:tunnel.id+'-wall',x,z,width,depth,heading,minX:x-ex,maxX:x+ex,minZ:z-ez,maxZ:z+ez,minY:Math.min(a.y,b.y)-.1,maxY:Math.max(a.y,b.y)+10.7});
   }
  }
 }return walls;
}
function strip(parent,track,left,right,material,offset=.02){
 const positions=[],uvs=[],indices=[];
 track.forEach((p,i)=>{const a=track[Math.max(0,i-1)],b=track[Math.min(track.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1;
  for(const side of [left,right]){positions.push(p.x+dz/len*side,p.y+offset,p.z-dx/len*side);uvs.push(side/6,p.distance/6);}
  if(i){const k=i*2;indices.push(k-2,k,k-1,k-1,k,k+1);}
 });
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,material);mesh.name='walkable-path';mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
/** Keep orbit cameras inside the arch even when a bend places them outside its footprint. */
export function constrainTunnelCamera(camera,focus){
 const inside=tunnelAt(focus.x,focus.z,focus.y);if(!inside)return;
 const firstPerson=camera.position.distanceTo(focus)<4;
 const p=roadSurfaceAt(camera.position.x,camera.position.z,{altitude:inside.height});
 const dx=camera.position.x-p.x,dz=camera.position.z-p.z,len=Math.hypot(dx,dz);
 if(len>8.8){camera.position.x=p.x+dx/len*8.8;camera.position.z=p.z+dz/len*8.8;}
 camera.position.y=Math.max(p.height+.5,Math.min(camera.position.y,p.height+5.5,tunnelCeilingAt(camera.position.x,camera.position.z)-.6));
 if(!firstPerson)camera.lookAt(focus.x,focus.y+1.8,focus.z);
}
export function createRoadView(parent,groundMesh){
 const root=new THREE.Group();root.name='Asphalt roads and illuminated tunnels';parent.add(root);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#929699';c.fillRect(0,0,128,128);
 let seed=61;for(let i=0;i<2500;i++){seed=seed*16807%2147483647;const x=seed%128;seed=seed*16807%2147483647;c.fillStyle=i%2?'#ffffff0d':'#00000018';c.fillRect(x,seed%128,1,1);}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;
 const asphalt=new THREE.MeshStandardMaterial({color:'#ffffff',map:texture,roughness:.96,side:THREE.DoubleSide});
 const shoulder=new THREE.MeshStandardMaterial({color:'#b9b8a7',roughness:1,side:THREE.DoubleSide});
 const yellow=new THREE.MeshStandardMaterial({color:'#f0c659',roughness:.8,side:THREE.DoubleSide});
 const white=new THREE.MeshStandardMaterial({color:'#f1ead6',roughness:.85,side:THREE.DoubleSide});
 const roadMeshes=[];
 function embankment(road){
  for(const side of [-1,1]){
   const positions=[],indices=[];
   road.track.forEach((p,i)=>{
    const a=road.track[Math.max(0,i-1)],b=road.track[Math.min(road.track.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1;
    for(const extra of [0,8]){const offset=side*(road.width/2+extra),x=p.x+dz/len*offset,z=p.z-dx/len*offset;positions.push(x,extra?Math.min(p.y,pathUnderlayHeight(x,z))+.01:p.y,z);}
    const onBridge=q=>q.x>=BRIDGE.startX&&q.x<=BRIDGE.endX&&Math.abs(q.z-BRIDGE.z)<BRIDGE.width/2;
    if(i&&!p.tunnel&&!road.track[i-1].tunnel&&!onBridge(p)&&!onBridge(road.track[i-1])){const k=i*2;indices.push(k-2,k,k-1,k-1,k,k+1);}
   });
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
   const mesh=new THREE.Mesh(geometry,shoulder);mesh.name='road embankment';mesh.receiveShadow=true;root.add(mesh);
  }
 }

 const dirt=new THREE.MeshStandardMaterial({color:'#c7a77a',roughness:1,side:THREE.DoubleSide});
 for(const road of ROADS){embankment(road);if(road.kind==='village'){roadMeshes.push(strip(parent,road.track,-road.width/2,road.width/2,shoulder));roadMeshes.push(strip(parent,road.track,-road.pavementWidth/2,road.pavementWidth/2,dirt,.045));continue;}roadMeshes.push(strip(parent,road.track,-11,11,shoulder,0));roadMeshes.push(strip(parent,road.track,-9,9,asphalt));
  const lineTracks=[];let line=[];
  for(const p of road.track){if(ROAD_JUNCTIONS.some(j=>Math.hypot(p.x-j.x,p.z-j.z)<14)){if(line.length>1)lineTracks.push(line);line=[];}else line.push(p);}if(line.length>1)lineTracks.push(line);
  for(const track of lineTracks){strip(root,track,-.22,-.08,yellow,.04);strip(root,track,.08,.22,yellow,.04);strip(root,track,-8.6,-8.43,white,.04);strip(root,track,8.43,8.6,white,.04);}
 }
 const concrete=new THREE.MeshStandardMaterial({color:'#a6aea6',roughness:.94,side:THREE.DoubleSide});
 const portalMaterial=new THREE.MeshStandardMaterial({color:'#c2bdab',roughness:.9,side:THREE.DoubleSide});
 const led=new THREE.MeshStandardMaterial({color:'#fff5ce',emissive:'#fff2bb',emissiveIntensity:2,roughness:.4});
 const panel=new THREE.MeshStandardMaterial({color:'#d3d9c9',roughness:.7,side:THREE.DoubleSide});
 const fixtures=[],fixtureMatrices=[],reflectors=[];const dummy=new THREE.Object3D(),portals=[];
 const section=[[-11.2,0],[-11.2,5.8],...Array.from({length:17},(_,i)=>{const angle=Math.PI-i/16*Math.PI;return [Math.cos(angle)*11.2,5.8+Math.sin(angle)*4.8];}),[11.2,0]];
 for(const tunnel of TUNNELS){
  const track=tunnel.track.filter((_,i)=>i%4===0||i===tunnel.track.length-1),positions=[],indices=[];
  track.forEach((p,i)=>{const a=track[Math.max(0,i-1)],b=track[Math.min(track.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1;
   for(const [x,y] of section)positions.push(p.x+dz/len*x,p.y+y,p.z-dx/len*x);
   for(let j=0;i&&j<section.length-1;j++){const k=i*section.length+j,prev=k-section.length;const mx=(positions[prev*3]+positions[k*3])/2,mz=(positions[prev*3+2]+positions[k*3+2])/2;
    const other=roadSurfaceAt(mx,mz,{altitude:p.y,excludeRoad:tunnel.road});
    if(other.distance<11.8&&Math.abs(other.height-p.y)<2)continue;
    indices.push(prev,k,prev+1,prev+1,k,k+1);}
   if(i%2===0){const heading=Math.atan2(dx,dz);dummy.position.set(p.x,p.y+10,p.z);dummy.rotation.set(0,heading,0);dummy.scale.set(1,1,1);dummy.updateMatrix();fixtureMatrices.push(dummy.matrix.clone());fixtures.push({x:p.x,y:p.y+8.5,z:p.z});
    for(const side of [-1,1]){const lx=p.x+dz/len*side*11.04,lz=p.z-dx/len*side*11.04,other=roadSurfaceAt(lx,lz,{altitude:p.y,excludeRoad:tunnel.road});if(other.distance<12&&Math.abs(other.height-p.y)<2)continue;dummy.position.set(lx,p.y+1.1,lz);dummy.rotation.set(0,heading,0);dummy.updateMatrix();reflectors.push(dummy.matrix.clone());}
   }
  });
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();const shell=new THREE.Mesh(geo,concrete);shell.name=tunnel.id;root.add(shell);
  strip(root,track,-11.1,-9.4,panel,.18);strip(root,track,9.4,11.1,panel,.18);
  for(const end of [0,1]){const p=track[end?track.length-1:0],near=track[end?track.length-2:1],heading=Math.atan2(near.x-p.x,near.z-p.z);portals.push({...p,heading});
   const vertices=[],tri=[];
   section.forEach(([x,y],i)=>{for(const scale of [1,1.3]){const lx=x*scale,ly=y*scale;vertices.push(p.x+Math.cos(heading)*lx,p.y+ly,p.z-Math.sin(heading)*lx);}if(i){const k=i*2;tri.push(k-2,k-1,k,k-1,k+1,k);}});
   const ring=new THREE.BufferGeometry();ring.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));ring.setIndex(tri);ring.computeVertexNormals();root.add(new THREE.Mesh(ring,portalMaterial));
  }
 }
 // Shared junction chambers keep crossing arches above the full driving clearance.
 for(const junction of ROAD_JUNCTIONS){
  const p=roadSurfaceAt(junction.x,junction.z,{altitude:2.5});if(!p.tunnel)continue;
  const ceiling=new THREE.Mesh(new THREE.BoxGeometry(38,.35,38),concrete);ceiling.name='tunnel junction ceiling';ceiling.position.set(junction.x,p.height+10.7,junction.z);root.add(ceiling);
 }
 function instances(geometry,material,matrices){const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));root.add(mesh);return mesh;}
 instances(new THREE.BoxGeometry(2.4,.12,.5),led,fixtureMatrices);instances(new THREE.BoxGeometry(.12,.22,.8),yellow,reflectors);
 // Cut only the portal opening out of the landscape; the mountain roof stays intact.
 const size=4096,data=new Uint8Array(size*size*4),width=WORLD.maxX-WORLD.minX,depth=WORLD.maxZ-WORLD.minZ;
 const bridgeOpening=(x,z)=>x>BRIDGE.startX&&x<BRIDGE.endX&&Math.abs(z-BRIDGE.z)<BRIDGE.width/2;
 const openingAt=(x,y,z)=>bridgeOpening(x,z)||portals.some(p=>y<portalCutHeight(p,x,z));
 for(const p of portals){const x0=Math.max(0,Math.floor((p.x-80-WORLD.minX)/width*size)),x1=Math.min(size-1,Math.ceil((p.x+80-WORLD.minX)/width*size)),z0=Math.max(0,Math.floor((p.z-80-WORLD.minZ)/depth*size)),z1=Math.min(size-1,Math.ceil((p.z+80-WORLD.minZ)/depth*size));
  for(let gz=z0;gz<=z1;gz++)for(let gx=x0;gx<=x1;gx++){const x=WORLD.minX+(gx+.5)/size*width,z=WORLD.minZ+(gz+.5)/size*depth;const cut=portalCutHeight(p,x,z);if(Number.isFinite(cut)){const k=(gz*size+gx)*4,h=Math.max(data[k]*256+data[k+1],Math.round(cut/512*65535));data[k]=Math.floor(h/256);data[k+1]=h%256;data[k+2]=255;data[k+3]=255;}}
 }
 const mask=new THREE.DataTexture(data,size,size);mask.minFilter=mask.magFilter=THREE.NearestFilter;mask.needsUpdate=true;
 const material=groundMesh.material,previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,...args){previous.call(this,shader,...args);shader.uniforms.portalMask={value:mask};shader.uniforms.portalBounds={value:new THREE.Vector4(WORLD.minX,WORLD.minZ,width,depth)};
  shader.vertexShader='varying vec3 vTunnelWorld;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTunnelWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.uniforms.bridgeFootprint={value:new THREE.Vector4(BRIDGE.startX,BRIDGE.endX,BRIDGE.z,BRIDGE.width/2)};
  shader.fragmentShader='uniform vec4 bridgeFootprint;uniform sampler2D portalMask;uniform vec4 portalBounds;varying vec3 vTunnelWorld;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(vTunnelWorld.x>bridgeFootprint.x&&vTunnelWorld.x<bridgeFootprint.y&&abs(vTunnelWorld.z-bridgeFootprint.z)<bridgeFootprint.w)discard;\nvec4 portal=texture2D(portalMask,(vTunnelWorld.xz-portalBounds.xy)/portalBounds.zw);float portalHeight=(portal.r*65280.+portal.g*255.)/65535.*512.;if(portal.b>.5&&vTunnelWorld.y<portalHeight)discard;');
 };material.customProgramCacheKey=()=>key+'-tunnel-portals-bridge-v3';material.needsUpdate=true;
 const original=groundMesh.raycast;groundMesh.raycast=function(ray,hits){const found=[];original.call(this,ray,found);for(const hit of found)if(!openingAt(hit.point.x,hit.point.y,hit.point.z))hits.push(hit);};
 const lights=Array.from({length:6},()=>{const light=new THREE.PointLight('#fff1cf',0,48,1.5);root.add(light);return light;});let active=null;
 function update(point){active=tunnelAt(point.x,point.z,point.y);const near=fixtures.filter(p=>Math.hypot(p.x-point.x,p.z-point.z)<70).sort((a,b)=>(a.x-point.x)**2+(a.z-point.z)**2-(b.x-point.x)**2-(b.z-point.z)**2);
  lights.forEach((light,i)=>{const p=near[i];light.intensity=p?18:0;if(p)light.position.set(p.x,p.y,p.z);});return active;
 }

 return {root,roadMeshes,colliders:tunnelWallColliders(),update,constrainCamera:constrainTunnelCamera,getState:()=>({active:active?.tunnelId??null,tunnels:TUNNELS.length,fixtures:fixtures.length,activeLights:lights.filter(l=>l.intensity>0).length})};
}
