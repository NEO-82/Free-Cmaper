const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function ejectFromAirplane(plane){return {x:plane.x+Math.cos(plane.heading)*6.5,z:plane.z-Math.sin(plane.heading)*6.5,y:plane.bodyY+2.2,vx:(plane.vx??0)+Math.cos(plane.heading)*5,vz:(plane.vz??0)-Math.sin(plane.heading)*5,vy:(plane.vy??0)+3,open:false,inflation:0,landed:false};}
export function stepParachute(state,input,dt,{heightAt=()=>0,waterSurfaceAt=()=>-Infinity,bounds={minX:-Infinity,maxX:Infinity,minZ:-Infinity,maxZ:Infinity}}={}){
 let s={...state};if(s.landed||!Number.isFinite(dt)||dt<=0)return s;const count=Math.ceil(Math.min(dt,.1)*120),h=Math.min(dt,.1)/count;
 for(let i=0;i<count;i++){
  const inflation=s.open?Math.min(1,s.inflation+h*.9):0,drag=.16+inflation*2.4,control=inflation?10:2;
  const vx=s.vx+((input.x??0)*control-s.vx)*Math.min(1,drag*h),vz=s.vz+((input.z??0)*control-s.vz)*Math.min(1,drag*h),terminal=-55+(55-5.2)*inflation;
  let vy=Math.max(terminal,s.vy-9.81*h);if(inflation>0)vy+=(Math.max(terminal,vy)-vy)*Math.min(1,inflation*5*h);
  const x=clamp(s.x+vx*h,bounds.minX+1,bounds.maxX-1),z=clamp(s.z+vz*h,bounds.minZ+1,bounds.maxZ-1),floor=Math.max(heightAt(x,z,s.y),waterSurfaceAt(x,z)??-Infinity),y=Math.max(floor,s.y+vy*h),landed=y<=floor+.01&&vy<=0;
  s={...s,x,z,y,vx:landed?0:vx,vz:landed?0:vz,vy:landed?0:vy,inflation,landed};
 }
 return s;
}
export function createParachute(scene,C){
 const {Group,Mesh,SphereGeometry,MeshStandardMaterial,CylinderGeometry,Vector3}=C,root=new Group();root.name='Player parachute';scene.add(root);root.visible=false;
 const material=new MeshStandardMaterial({color:'#f1bd70',roughness:.85,side:2}),lineMaterial=new MeshStandardMaterial({color:'#fff4d8',roughness:1}),geometry=new SphereGeometry(3.4,24,12,0,Math.PI*2,0,Math.PI/2),canopy=new Mesh(geometry,material);canopy.scale.set(1,.4,1);canopy.position.y=5;root.add(canopy);
 const lines=[];for(let i=0;i<8;i++){const a=i/8*Math.PI*2,start=new Vector3(Math.cos(a)*3.3,5,Math.sin(a)*3.3),end=new Vector3(Math.cos(a)*.35,1.7,Math.sin(a)*.35),delta=start.clone().sub(end),g=new CylinderGeometry(.018,.018,delta.length(),5),mesh=new Mesh(g,lineMaterial);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new Vector3(0,1,0),delta.normalize());root.add(mesh);lines.push(g);}
 return {root,update(s,heading=0){root.visible=!!s?.open;if(!s)return;root.position.set(s.x,s.y,s.z);root.rotation.y=heading;root.scale.setScalar(.1+.9*s.inflation);},dispose(){root.removeFromParent();geometry.dispose();material.dispose();lineMaterial.dispose();for(const g of lines)g.dispose();}};
}
