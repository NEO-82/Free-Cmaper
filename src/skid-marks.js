import * as THREE from 'three';
import {travelHeight,waterSurfaceAt} from './terrain.js';

/** Bounded tyre ribbons remain in world space and gradually fade away. */
export function createSkidMarks(parent,{capacity=4096,lifetime=75,heightAt=travelHeight,surfaceAt=waterSurfaceAt}={}){
 const positions=new Float32Array(capacity*12),stamps=new Float32Array(capacity*4),strengths=new Float32Array(capacity*4),indices=[];
 for(let i=0;i<capacity;i++){const k=i*4;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
 const geometry=new THREE.BufferGeometry();geometry.setIndex(indices);
 for(const [name,array,size] of [['position',positions,3],['skidBorn',stamps,1],['skidStrength',strengths,1]])geometry.setAttribute(name,new THREE.BufferAttribute(array,size).setUsage(THREE.DynamicDrawUsage));
 const normals=new Float32Array(capacity*12);for(let i=1;i<normals.length;i+=3)normals[i]=1;
 geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));
 geometry.setDrawRange(0,0);
 const clock={value:0},material=new THREE.MeshStandardMaterial({color:'#070806',transparent:true,opacity:.78,roughness:1,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 material.onBeforeCompile=shader=>{
  shader.uniforms.skidClock=clock;
  shader.vertexShader='attribute float skidBorn;attribute float skidStrength;varying float vSkidBorn;varying float vSkidStrength;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSkidBorn=skidBorn;vSkidStrength=skidStrength;');
  shader.fragmentShader='uniform float skidClock;varying float vSkidBorn;varying float vSkidStrength;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\ndiffuseColor.a*=vSkidStrength*(1.-smoothstep(${(lifetime-20).toFixed(1)},${lifetime.toFixed(1)},skidClock-vSkidBorn));if(diffuseColor.a<.01)discard;`);
 };material.customProgramCacheKey=()=>`skid-ribbon-${lifetime}`;
 const mesh=new THREE.Mesh(geometry,material);mesh.name='Fading tyre skid marks';mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.renderOrder=2;parent.add(mesh);
 let cursor=0,count=0,emitted=0,last=[];
 function update(state,config,dt){
  clock.value+=Math.max(0,dt);const s=Math.sin(state.heading),c=Math.cos(state.heading),active=state.skidIntensity>.12&&!state.airborne&&state.contacts!==0;
  const contacts=[];let wheel=0;
  for(const side of config.track?[-1,1]:[0])for(const end of [-1,1]){
   const lx=side*config.track/2,lz=end*config.wheelBase/2,x=state.x+c*lx+s*lz,z=state.z-s*lx+c*lz,y=heightAt(x,z,state.bodyY),water=surfaceAt(x,z);
   const point={x,y:y+.065,z},previous=last[wheel++],intensity=state.skidAxles?.[end<0?'rear':'front']??state.skidIntensity,enabled=active&&intensity>.12&&(water===null||water<y);
   const length=previous?Math.hypot(x-previous.x,z-previous.z):0;
   // Losing contact or teleporting breaks the ribbon instead of drawing across the map.
   if(enabled&&previous&&length>.04&&length<12&&Math.abs(point.y-previous.y)<1.5){
    const steps=Math.ceil(length/.8),width=config.track?.19:.095,dx=(x-previous.x)/length*width,dz=(z-previous.z)/length*width;
    for(let j=0;j<steps;j++){
     const vertices=[];
     for(const t of [j/steps,(j+1)/steps]){const px=previous.x+(x-previous.x)*t,pz=previous.z+(z-previous.z)*t,py=heightAt(px+dz,pz-dx,state.bodyY)+.065,qy=heightAt(px-dz,pz+dx,state.bodyY)+.065;vertices.push(px+dz,py,pz-dx,px-dz,qy,pz+dx);}
     positions.set(vertices,cursor*12);stamps.fill(clock.value,cursor*4,cursor*4+4);strengths.fill(intensity,cursor*4,cursor*4+4);
     cursor=(cursor+1)%capacity;count=Math.min(capacity,count+1);emitted++;
    }
   }
   contacts.push(!state.airborne&&state.contacts!==0?point:null);
  }
  last=contacts;if(active){for(const name of ['position','skidBorn','skidStrength'])geometry.attributes[name].needsUpdate=true;geometry.setDrawRange(0,count*6);}
 }
 return {mesh,update,getState:()=>({segments:count,emitted,capacity,time:clock.value,lifetime}),dispose(){mesh.removeFromParent();geometry.dispose();material.dispose();}};
}
