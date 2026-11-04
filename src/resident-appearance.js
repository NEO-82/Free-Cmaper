export const VEHICLE_PALETTE=['#dc8279','#79acd0','#81b59a','#e7bd65','#ad94c8','#e5ded0','#bb6266','#657f9d','#8b9d6b','#d99b64','#70b5b8','#c78baa'];
const paintBases={sedan:['e6bd73'],suv:['8eaf99'],scooter:['d9907f'],motorhome:['eee7d5','74988d'],helicopter:['f4bc57','e2ad52','e4ae54','f3d18a']};
export function randomizeVehiclePaint(vehicle,kind=vehicle.state?.kind,random=Math.random){
 const color=VEHICLE_PALETTE[Math.floor(random()*VEHICLE_PALETTE.length)%VEHICLE_PALETTE.length],seen=new Set();
 vehicle.root.traverse(o=>{for(const material of Array.isArray(o.material)?o.material:[o.material]){if(!material?.color||seen.has(material))continue;seen.add(material);const hex=material.userData.vehiclePaintBase??material.color.getHexString();if(!(paintBases[kind]??[]).includes(hex))continue;material.userData.vehiclePaintBase=hex;material.color.set(color);if(['74988d','e2ad52'].includes(hex))material.color.offsetHSL(0,-.04,-.08);}});
 vehicle.root.userData.paintColor=color;vehicle.paintColor=color;return color;
}
const pick=(a,r)=>a[Math.floor(r()*a.length)%a.length];
export function createResidentModel(parent,C,{random=Math.random}={}){
 const {Group,Mesh,MeshStandardMaterial,BoxGeometry,SphereGeometry,CylinderGeometry}=C,root=new Group();root.name='Unique island resident';root.userData.resident=true;parent.add(root);
 const skin=pick(['#efc9ab','#ddb18b','#c98f69','#ad7959','#f3d7bd'],random),hair=pick(['#3b302b','#665047','#998171','#c6b5a1','#403f44'],random),shirtColor=pick(VEHICLE_PALETTE,random),pantsColor=pick(['#50657a','#637368','#8e7562','#6d647c'],random);
 const materials={skin:new MeshStandardMaterial({color:skin,roughness:.9}),hair:new MeshStandardMaterial({color:hair,roughness:1}),shirt:new MeshStandardMaterial({color:shirtColor,roughness:.85}),pants:new MeshStandardMaterial({color:pantsColor,roughness:1}),shoe:new MeshStandardMaterial({color:'#4b4844',roughness:1}),eye:new MeshStandardMaterial({color:'#292c30',roughness:.6}),white:new MeshStandardMaterial({color:'#fff5e5',roughness:.8})};
 const bodyWidth=.55+random()*.2,height=.9+random()*.22,headWidth=.88+random()*.25,hairStyle=pick(['short','bob','ponytail','curly'],random),outfitStyle=pick(['shirt','coat','dress'],random),hat=random()<.45,glasses=random()<.4,beard=hairStyle==='short'&&random()<.4;
 function part(g,m,x,y,z,p=root){const mesh=new Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;p.add(mesh);return mesh;}
 const box=(w,h,d,m,x,y,z,p=root)=>part(new BoxGeometry(w,h,d),m,x,y,z,p),sphere=(radius,m,x,y,z,p=root)=>part(new SphereGeometry(radius,12,8),m,x,y,z,p);
 const torso=box(bodyWidth,.65,.37,materials.shirt,0,1.18,0),head=new Group();head.position.set(0,1.84,0);root.add(head);sphere(.32,materials.skin,0,0,0,head).scale.set(headWidth,1.05,1);
 const hairCap=sphere(.325,materials.hair,0,.12,-.035,head);hairCap.scale.set(headWidth,.65,.93);for(const side of [-1,1]){sphere(.065,materials.skin,side*.32,-.025,0,head);sphere(.043,materials.eye,side*.115,.01,.292,head);sphere(.018,materials.white,side*.108,.025,.325,head);}
 if(hairStyle==='bob'){sphere(.35,materials.hair,0,.01,-.08,head).scale.set(headWidth,1.05,.86);for(const side of [-1,1])sphere(.12,materials.hair,side*.3,-.15,-.01,head).scale.set(.9,1.65,.9);}
 if(hairStyle==='ponytail')sphere(.17,materials.hair,0,-.09,-.37,head).scale.set(.9,1.9,.9);
 if(hairStyle==='curly')for(let i=0;i<5;i++)sphere(.14,materials.hair,Math.cos(i/5*Math.PI*2)*.23,.24,Math.sin(i/5*Math.PI*2)*.17-.04,head);
 if(outfitStyle==='coat'){box(bodyWidth+.04,.95,.4,materials.shirt,0,1.06,0);for(const y of [.86,1.08,1.3])sphere(.025,materials.white,0,y,.215);}
 if(outfitStyle==='dress')part(new CylinderGeometry(bodyWidth*.47,bodyWidth*.75,.65,10),materials.shirt,0,.82,0);
 sphere(.066,materials.skin,0,-.055,.325,head);box(.13,.024,.02,materials.eye,0,-.155,.293,head);
 if(glasses){for(const side of [-1,1]){box(.17,.025,.045,materials.hair,side*.115,.075,.335,head);box(.025,.12,.045,materials.hair,side*.2,.02,.335,head);}box(.08,.025,.04,materials.hair,0,.045,.34,head);}
 if(beard)sphere(.23,materials.hair,0,-.19,.07,head).scale.set(1,.55,.95);
 if(hat){part(new CylinderGeometry(.37,.37,.12,12),materials.shirt,0,.28,0,head);part(new CylinderGeometry(.26,.29,.25,12),materials.shirt,0,.43,-.02,head);}
 const arms=[],legs=[],shoes=[];for(const side of [-1,1]){const arm=new Group();arm.position.set(side*(bodyWidth/2+.085),1.47,0);root.add(arm);box(.17,.55,.19,materials.shirt,0,-.24,0,arm);sphere(.095,materials.skin,0,-.55,0,arm);arms.push(arm);const leg=new Group();leg.position.set(side*.16,.84,0);root.add(leg);box(.22,.7,.25,materials.pants,0,-.34,0,leg);shoes.push(box(.24,.16,.4,materials.shoe,0,-.76,.07,leg));legs.push(leg);}
 root.scale.setScalar(height);const backpack=new Group();backpack.visible=false;root.add(backpack);
 function pose(posture='stand',moving=false,time=0){const t=time*.006;for(let i=0;i<2;i++){arms[i].rotation.x=posture==='scooter'?-2.3:posture==='sit'?-.95:moving?Math.sin(t+i*Math.PI)*.35:0;shoes[i].rotation.x=posture==='scooter'?.8:0;legs[i].rotation.x=posture==='scooter'?-.95:posture==='sit'?-1.2:moving?-Math.sin(t+i*Math.PI)*.4:0;}torso.rotation.z=moving?Math.sin(t)*.025:0;}
 const fingerprint=[skin,hair,shirtColor,pantsColor,bodyWidth.toFixed(3),height.toFixed(3),headWidth.toFixed(3),hairStyle,outfitStyle,hat,glasses,beard].join('|');root.userData.appearance=fingerprint;
 return {root,pose,backpack,materials:{...materials,cream:materials.shirt},settings:{species:'resident'},appearance:{skin,hair,shirtColor,pantsColor,hairStyle,outfitStyle,hat,glasses,beard,fingerprint},faceAnimation:{update(){}},updateFace:()=>false,dispose(){root.removeFromParent();root.traverse(o=>o.geometry?.dispose());Object.values(materials).forEach(m=>m.dispose());}};
}
/** Align the procedural resident's hip with the actual seat, including road pitch. */
export function residentSeatPose(kind,state,scale){
 const scooter=kind==='scooter',motorhome=kind==='motorhome',seatX=scooter?0:motorhome?-.605:-.55,seatZ=scooter?.05:motorhome?2.75:0,seatY=scooter?1.21:motorhome?2.05:1.875;
 const heading=state.heading??0,bodyPitch=state.pitch??0,pitch=bodyPitch+(scooter?.15:0),hip=.84*scale,forward=Math.sin(bodyPitch)*seatY+Math.cos(bodyPitch)*seatZ-Math.sin(pitch)*hip;
 return {x:state.x+Math.cos(heading)*seatX+Math.sin(heading)*forward,z:state.z-Math.sin(heading)*seatX+Math.cos(heading)*forward,y:(state.bodyY??0)+Math.cos(bodyPitch)*seatY-Math.sin(bodyPitch)*seatZ-Math.cos(pitch)*hip,heading,pitch,posture:scooter?'scooter':'sit'};
}
