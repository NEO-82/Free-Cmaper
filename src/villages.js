import * as THREE from 'three';
import {VILLAGE_SITES,terrainHeight,isWater,circleOverlaps} from './terrain.js';
import {createCamper,poseCamper} from './characters.js';

/** Three small roadside settlements, each with four houses and four local residents. */
export function createVillages(parent){
 const root=new THREE.Group();root.name='Island rural villages';parent.add(root);const colliders=[],residents=[],houses=[];
 const material=color=>new THREE.MeshStandardMaterial({color,roughness:.9});
 const plaster=['#f0dabc','#e6d8b0','#d4e2cb','#e4cfb8'].map(material),roofMaterials=['#a26754','#7c8773','#947b59'].map(material),wood=material('#9d7753'),glass=new THREE.MeshStandardMaterial({color:'#acd4d1',roughness:.24,metalness:.1});
 function box(parent,w,h,d,m,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 VILLAGE_SITES.forEach((v,vi)=>{
  const village=new THREE.Group();village.name=v.name;village.position.set(v.x,2.5,v.z);root.add(village);
  const plaza=new THREE.Mesh(new THREE.CircleGeometry(21,48),material('#d1c5a2'));plaza.rotation.x=-Math.PI/2;plaza.position.y=.035;village.add(plaza);
  const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=128;const c=signCanvas.getContext('2d');c.fillStyle='#e8d6ad';c.fillRect(0,0,512,128);c.fillStyle='#526c4f';c.textAlign='center';c.font='bold 48px sans-serif';c.fillText(v.name,256,83);const map=new THREE.CanvasTexture(signCanvas);map.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(11,2.75),new THREE.MeshStandardMaterial({map,side:THREE.DoubleSide}));sign.position.set(0,4,18);village.add(sign);box(village,.3,4,.3,wood,-4,2,18);box(village,.3,4,.3,wood,4,2,18);
  for(const [hi,[x,z]] of [[-42,-28],[38,-28],[-42,35],[38,35]].entries()){
   const house=new THREE.Group();house.name=v.id+' cottage '+hi;house.position.set(x,0,z);village.add(house);
   box(house,15,7,13,plaster[(vi+hi)%4],0,3.5,0);
   const points=[-9,0,-8,9,0,-8,0,5,-8,-9,0,8,9,0,8,0,5,8],geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setIndex([0,2,1,3,4,5,0,3,2,2,3,5,1,2,4,2,5,4,0,1,3,1,4,3]);geo.computeVertexNormals();const roof=new THREE.Mesh(geo,roofMaterials[vi]);roof.position.y=7;roof.castShadow=true;house.add(roof);
   box(house,2.8,4.4,.18,wood,0,2.2,6.56);
   for(const side of [-1,1]){box(house,2.5,2.4,.2,wood,side*4.7,4,6.56);box(house,2.1,2,.22,glass,side*4.7,4,6.59);}
   const hx=v.x+x,hz=v.z+z;const collider={kind:'box',id:house.name,minX:hx-7.5,maxX:hx+7.5,minZ:hz-6.5,maxZ:hz+6.5,minY:2.5,maxY:14.5};colliders.push(collider);houses.push({village:v.id,x:hx,z:hz});
   const npc=createCamper(root,{species:hi%2?'female':'male'});npc.root.scale.setScalar(.85);npc.backpack.visible=false;npc.materials.cream.color.copy(plaster[(hi+vi)%4].color);npc.updateFace=()=>false;
   const home={x:v.x+(hi%2?19:-19),z:v.z+(hi<2?-12:16)};npc.root.position.set(home.x,2.5,home.z);poseCamper(npc,'stand');
   residents.push({id:v.id+'-resident-'+hi,name:['지우','하루','소연','민우'][(hi+vi)%4],village:v.id,model:npc,home,phase:hi*1.9+vi});
  }
  // A well, seats and planters make the shared square useful at walking scale.
  const well=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.4,1.2,20),material('#b1b4a3'));well.position.set(0,.6,0);village.add(well);colliders.push({kind:'circle',x:v.x,z:v.z,radius:2.4,minY:2.5,maxY:3.7,id:v.id+'-well'});
  for(const x of [-10,10]){box(village,4,.35,1.2,wood,x,1,7);box(village,.3,1,.8,wood,x-1.5,.5,7);box(village,.3,1,.8,wood,x+1.5,.5,7);}
 });
 function update(time,nearColliders=colliders,observer=null){for(const r of residents){if(observer&&r.model.root.position.distanceTo(observer)<40)r.model.faceAnimation.update(time,'stand',r.model.settings.species);const a=time*.055+r.phase,target={x:r.home.x+Math.sin(a)*5,z:r.home.z+Math.cos(a*.83)*5},p=r.model.root.position;
   if(!isWater(target.x,target.z)&&!nearColliders.some(c=>circleOverlaps(target.x,target.z,.5,c))){const dx=target.x-p.x,dz=target.z-p.z;if(Math.hypot(dx,dz)>.001)r.model.root.rotation.y=Math.atan2(dx,dz);p.set(target.x,terrainHeight(target.x,target.z),target.z);poseCamper(r.model,'stand',true,time*1000);}
 }}
 return {root,colliders,residents,houses,update,getState:()=>VILLAGE_SITES.map(v=>({...v,houses:houses.filter(h=>h.village===v.id).length,residents:residents.filter(r=>r.village===v.id).length})),nearest(point){return residents.filter(r=>r.model.root.position.distanceTo(point)<3.5).sort((a,b)=>a.model.root.position.distanceTo(point)-b.model.root.position.distanceTo(point))[0];}};
}
