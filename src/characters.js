import { createCharacterFace, CHARACTER_FACE_COLORS } from './character-face.js';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export const CHARACTER_STYLES = Object.freeze(['male', 'female']);
const PI = Math.PI;

/** Original human campers with continuous skinned limbs and animated painted faces. Forward is +Z. */
export function createCamper(parent, settings = {}) {
  const root = new THREE.Group(); root.name = 'Human camper'; parent.add(root);
  const body = new THREE.Group(); root.add(body);
  const upperBody = new THREE.Group(); upperBody.position.y = .76; body.add(upperBody);
  const materials = {};
  const mat = (name, color) => materials[name] ??= new THREE.MeshStandardMaterial({color, roughness:.85});
  const fur=mat('fur','#f1c6a1'), cream=mat('cream','#fff6db'), dark=mat('dark','#34342e'), pink=mat('pink','#e5a193'), ivory=mat('ivory','#fffdf3');
  const pack=mat('pack','#8da878'),packDark=mat('packDark','#607c54'),canvas=mat('canvas','#e7ce9b');
  const sphere=new THREE.SphereGeometry(1,24,18), cube=new THREE.BoxGeometry(1,1,1), cone=new THREE.ConeGeometry(1,1,24);
  const geometries=new Set([sphere,cube,cone]);
  function add(p,geo,m,x,y,z,sx,sy,sz){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
  const orb=(p,m,x,y,z,sx,sy=sx,sz=sx)=>add(p,sphere,m,x,y,z,sx,sy,sz);
  const box=(p,m,x,y,z,sx,sy,sz)=>{const geo=new RoundedBoxGeometry(sx,sy,sz,3,Math.min(sx,sy,sz)*.16);geometries.add(geo);return add(p,geo,m,x,y,z,1,1,1);};
  const denim=mat('denim','#88acbb'),cuff=mat('cuff','#a9c4cc'),stitch=mat('stitch','#e4e6d8'),brass=mat('brass','#aa8c57');
  const torsoRig=new THREE.Group();upperBody.add(torsoRig);
  const torso=orb(torsoRig,cream,0,.36,0,.41,.44,.29);
  const shortsGeo=new RoundedBoxGeometry(.70,.26,.50,5,.115);geometries.add(shortsGeo);const shorts=add(body,shortsGeo,denim,0,.77,-.005,1,1,1);shorts.name='Denim shorts waistband';
  const neck=orb(upperBody,fur,0,.76,.015,.18,.15,.17);
  const head=new THREE.Group();head.position.set(0,1.34,.025);upperBody.add(head);
  const faceAnimation=createCharacterFace(settings.species),faceMaterial=mat('face','#ffffff');faceMaterial.map=faceAnimation.texture;
  const headGeometry=new THREE.SphereGeometry(1,40,28);const hp=headGeometry.attributes.position;for(let i=0;i<hp.count;i++){hp.setXYZ(i,Math.sign(hp.getX(i))*Math.abs(hp.getX(i))**.88,Math.sign(hp.getY(i))*Math.abs(hp.getY(i))**.90,hp.getZ(i));}headGeometry.computeVertexNormals();geometries.add(headGeometry);
  const face=add(head,headGeometry,faceMaterial,0,0,.02,.64,.65,.56);face.name='Painted human face';
  const hair=mat('hair','#7597a4');
  const details=Object.fromEntries(CHARACTER_STYLES.map(id=>{const g=new THREE.Group();g.name=id+' hairstyle';head.add(g);return [id,g];}));
  for(const side of [-1,1])orb(head,fur,side*.62,-.07,0,.105,.14,.09);
  function strand(parent,points,width=.17,thickness=.055){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),positions=[],indices=[],rings=32,sides=16;
    for(let i=0;i<=rings;i++){const t=i/rings,p=curve.getPoint(t),tangent=curve.getTangent(t),normal=new THREE.Vector3(-tangent.y,tangent.x,0).normalize(),taper=(.14+.86*Math.sin(Math.PI*t)**.3)*(1-.32*t);
      for(let j=0;j<sides;j++){const a=j/sides*PI*2;positions.push(p.x+normal.x*Math.cos(a)*width*taper,p.y+normal.y*Math.cos(a)*width*taper,p.z+Math.sin(a)*thickness*taper);if(i){const k=i*sides+j,n=i*sides+(j+1)%sides;indices.push(k-sides,k,n-sides,n-sides,k,n);}}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();geometries.add(geo);return add(parent,geo,hair,0,0,0,1,1,1);
  }
  for(const style of CHARACTER_STYLES){
    const capGeo=new THREE.SphereGeometry(1,40,24,0,PI*2,0,PI*.55),cp=capGeo.attributes.position;
    for(let i=0;i<cp.count;i++){const x=cp.getX(i),z=cp.getZ(i),r=Math.hypot(x,z),t=Math.acos(THREE.MathUtils.clamp(cp.getY(i),-1,1))/(PI*.55),front=Math.max(0,z/(r||1)),angle=t*(1.90-.85*Math.sqrt(front));cp.setXYZ(i,r?x/r*Math.sin(angle):0,Math.cos(angle),r?z/r*Math.sin(angle):0);}capGeo.computeVertexNormals();geometries.add(capGeo);
    const cap=add(details[style],capGeo,hair,0,.02,-.02,.68,.68,.60);cap.name='Blue grey hair cap';
    const fringe=strand(details[style],[[.28,.56,.21],[.11,.58,.43],[-.18,.43,.54],[-.45,.20,.45],[-.58,.08,.30]],style==='female'?.20:.16,.065);
    const sideFringe=strand(details[style],[[.30,.55,.22],[.48,.35,.41],[.56,.11,.39],[.59,-.17,.29]],.14,.06);
    if(style==='male'){for(const lock of [fringe,sideFringe]){lock.position.y=-.08;lock.scale.z=.88;}}
    if(style==='female'){
      const bob=orb(details.female,hair,0,-.15,-.17,.69,.56,.36);bob.name='Rounded blue bob';
      for(const side of [-1,1]){
        const bun=orb(details.female,hair,side*.70,-.18,-.04,.23,.24,.20);bun.name='Side hair bun';
        strand(details.female,[[side*.54,.29,.37],[side*.59,.05,.45],[side*.61,-.25,.39],[side*.68,-.49,.20]],.13,.07);
      }
    }
  }
  const hat=new THREE.Group();hat.name='Male canvas sun hat';details.male.add(hat);hat.rotation.z=.055;
  function hatCylinder(name,top,bottom,height,y,material,zScale=1){const geo=new THREE.CylinderGeometry(top,bottom,height,56);geometries.add(geo);const m=add(hat,geo,material,0,y,0,1,1,zScale);m.name=name;return m;}
  hatCylinder('Sage hat brim edge',.915,.925,.04,.445,packDark,.83);
  hatCylinder('Cream broad hat brim',.89,.90,.055,.47,cream,.83);
  hatCylinder('Cream canvas hat crown',.49,.60,.28,.635,cream,.87);
  hatCylinder('Blue hat band',.588,.608,.075,.53,cuff,.87);
  // Overalls and pack straps follow the shoulder rather than crossing the neck.
  function shoulderStrap(parent,x,material,width=.085,frontZ=.30){
    const curve=new THREE.CatmullRomCurve3([[x,.15,frontZ],[x,.48,frontZ],[x,.70,.16],[x,.74,-.05],[x,.53,-.30],[x,.22,-.39]].map(p=>new THREE.Vector3(...p))),positions=[],indices=[],steps=32;
    const profile=[[-1,-.012],[-.82,-.018],[.82,-.018],[1,-.012],[1,.012],[.82,.018],[-.82,.018],[-1,.012]];
    for(let i=0;i<=steps;i++){const p=curve.getPoint(i/steps),t=curve.getTangent(i/steps),n=new THREE.Vector3(0,-t.z,t.y).normalize();profile.forEach(([x,y],j)=>{positions.push(p.x+x*width/2,p.y+n.y*y,p.z+n.z*y);if(i){const k=i*8+j,b=i*8+(j+1)%8;indices.push(k-8,k,b-8,b-8,k,b);}});}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();geometries.add(geo);return add(parent,geo,material,0,0,0,1,1,1);
  }
  const overalls=new THREE.Group();overalls.name='Female denim short overalls';upperBody.add(overalls);
  box(overalls,denim,0,.32,.273,.49,.50,.085).name='Denim overall bib';
  box(overalls,cuff,0,.29,.329,.28,.21,.022).name='Bib patch pocket';
  const pocketCurve=new THREE.CatmullRomCurve3([[-.13,.37,.344],[-.13,.23,.344],[0,.18,.344],[.13,.23,.344],[.13,.37,.344]].map(p=>new THREE.Vector3(...p))),pocketGeo=new THREE.TubeGeometry(pocketCurve,32,.004,5,false);geometries.add(pocketGeo);add(overalls,pocketGeo,stitch,0,0,0,1,1,1);
  for(const side of [-1,1]){shoulderStrap(overalls,side*.19,denim,.085);box(overalls,brass,side*.19,.52,.326,.064,.082,.026);}
  const arms=[],elbows=[],legs=[],knees=[],ankles=[],limbMeshes=[];
  // One continuous surface per limb. Hidden bones bend the skin across joints.
  function smoothLimb(upper,lower,ankle,length,radius){
    const parent=upper.parent,geo=new THREE.CapsuleGeometry(radius,length-radius*2,12,20,16);
    geo.translate(upper.position.x,upper.position.y-length/2+.05,upper.position.z);
    const indices=[],weights=[],vertices=geo.attributes.position;
    const blend=(a,b,v)=>{const t=THREE.MathUtils.clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
    for(let i=0;i<vertices.count;i++){
      const distance=upper.position.y-vertices.getY(i),joint=-lower.position.y;
      const kneeWeight=blend(joint-.13,joint+.13,distance),ankleWeight=ankle?blend(length-.25,length-.09,distance):0;
      indices.push(0,1,2,0);weights.push(1-kneeWeight,kneeWeight*(1-ankleWeight),kneeWeight*ankleWeight,0);
    }
    geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));geometries.add(geo);
    const skin=new THREE.SkinnedMesh(geo,fur);skin.name='Continuous '+(ankle?'leg':'arm')+' skin';skin.castShadow=true;skin.receiveShadow=true;skin.frustumCulled=false;parent.add(skin);
    root.updateMatrixWorld(true);skin.bind(new THREE.Skeleton(ankle?[upper,lower,ankle]:[upper,lower,lower]));limbMeshes.push(skin);
  }
  for(const side of [-1,1]){
    const arm=new THREE.Bone();arm.position.set(side*.455,.59,0);upperBody.add(arm);arms.push(arm);

    const elbow=new THREE.Bone();elbow.position.y=-.235;arm.add(elbow);elbows.push(elbow);

    smoothLimb(arm,elbow,null,.57,.15);
    orb(arm,cream,0,-.055,0,.18,.145,.18).name='Cream short sleeve';

    const leg=new THREE.Bone();leg.position.set(side*.205,.76,0);body.add(leg);legs.push(leg);

    const knee=new THREE.Bone();knee.position.y=-.32;leg.add(knee);knees.push(knee);

    const ankle=new THREE.Bone();ankle.position.y=-.31;knee.add(ankle);ankles.push(ankle);
    smoothLimb(leg,knee,ankle,.70,.16);
    box(leg,denim,0,-.075,0,.34,.20,.35).name='Denim short leg';
    box(leg,cuff,0,-.15,.005,.35,.075,.36).name='Turned up denim hem';
    const sockGeo=new THREE.CylinderGeometry(.165,.17,.22,24);geometries.add(sockGeo);add(knee,sockGeo,ivory,0,-.18,0,1,1,1).name='White sock';
    const shoe=orb(ankle,ivory,0,0,.075,.17,.13,.22);shoe.name='Cream white hiking shoe';
    orb(ankle,ivory,0,-.105,.075,.17,.025,.22).name='White shoe sole';
    const bootCuffGeo=new THREE.CylinderGeometry(.15,.16,.16,28);geometries.add(bootCuffGeo);add(ankle,bootCuffGeo,ivory,0,.095,.005,1,1,1).name='Rounded ankle boot cuff';
    const trimGeo=new THREE.TorusGeometry(.173,.007,6,28);geometries.add(trimGeo);const trim=add(ankle,trimGeo,cuff,0,.115,0,1,1,1);trim.rotation.x=PI/2;trim.name='Blue shoe piping';
  }
  const tails={};
  const backpack=new THREE.Group();upperBody.add(backpack);
  box(backpack,packDark,0,.32,-.32,.55,.65,.23);
  box(backpack,pack,0,.34,-.43,.51,.59,.24);
  box(backpack,pack,0,.62,-.43,.57,.13,.27);
  box(backpack,packDark,0,.19,-.58,.34,.26,.10);
  box(backpack,canvas,0,.25,-.64,.14,.065,.025);
  for(const side of [-1,1]){
    box(backpack,packDark,side*.19,.35,-.59,.045,.53,.035);
    box(backpack,canvas,side*.19,.34,-.619,.065,.08,.025);
    box(backpack,pack,side*.32,.20,-.40,.14,.27,.18);
  }
  orb(backpack,canvas,0,.73,-.4,.34,.10,.10);
  for(const side of [-1,1])shoulderStrap(backpack,side*.33,pack,.10,.24);
  const bottle=orb(backpack,mat('bottle','#8fc9cb'),.335,.23,-.4,.074,.18,.074);
  const model={root,body,upperBody,torsoRig,torso,head,face,legs,knees,ankles,arms,elbows,backpack,neck,materials,bottle,tails,details,hat,overalls,limbMeshes,faceAnimation,updateFace(time,pose='stand'){return faceAnimation.update(time,pose,this.settings.species);},settings:{},
    configure(next={}){
      const species=CHARACTER_STYLES.includes(next.species)?next.species:this.settings.species??'male';
      this.settings={species};root.name=`Human camper: ${species}`;
      const colors=CHARACTER_FACE_COLORS;
      fur.color.set(colors[species][0]);hair.color.set(colors[species][1]);cream.color.set('#fff6db');overalls.visible=species==='female';hat.visible=species==='male';
      for(const id of CHARACTER_STYLES){details[id].visible=id===species;}
faceAnimation.update(0,'stand',species);
      return this;
    },
    dispose(){limbMeshes.forEach(m=>m.skeleton.dispose());faceAnimation.dispose();root.removeFromParent();geometries.forEach(g=>g.dispose());Object.values(materials).forEach(m=>m.dispose());},
  };
  model.configure(settings);poseCamper(model,'stand');return model;
}

/** Articulated gameplay poses. Feet are at ground level in stand/sit/crouch. */
export function poseCamper(model, pose, walking = false, now = 0, detail = {}) {
  model.updateFace(now/1000,pose);model.hat.visible=model.settings.species==='male'&&pose!=='prone';
  const { body, upperBody, legs, knees, ankles, arms, elbows, head } = model;
  const wave = walking ? Math.sin(now * (pose === 'run' ? .013 : .008)) : 0;
  body.position.set(0, 0, 0); body.rotation.set(0, 0, 0);
  upperBody.rotation.set(0, 0, 0);
  head.rotation.set(0, walking ? Math.sin(now * .004) * .025 : 0, 0);
  legs.forEach((leg, i) => { leg.rotation.set(wave * (i ? -1 : 1) * .38, 0, 0); knees[i].rotation.set(Math.max(0, wave * (i ? 1 : -1)) * .38, 0, 0); });
  arms.forEach((arm, i) => { arm.rotation.set(wave * (i ? 1 : -1) * .35, 0, (i ? 1 : -1) * .055); elbows[i].rotation.set(-.10, 0, 0); });
  for(const tail of Object.values(model.tails)) {tail.rotation.y=pose==='prone'?PI/2:0;tail.rotation.z=walking?Math.sin(now*.008)*.15:0;}
  if (pose === 'swim') {
    const amount=detail.swimBlend??(walking?1:0),cycle=now*.0055;
    body.position.set(0,.06+.19*amount+Math.sin(cycle*2)*.025,-.35*amount);body.rotation.x=.18+.97*amount;
    upperBody.rotation.x=-.06*amount;head.rotation.x=-(body.rotation.x+upperBody.rotation.x)*(detail.diving?.7:1);
    body.rotation.z=Math.sin(cycle)*.045*amount;
    legs.forEach((leg,i)=>{const kick=Math.sin(cycle*2+i*Math.PI);leg.rotation.set(kick*(.12+.20*amount),0,(i?-1:1)*(.08+.08*(1-amount)));knees[i].rotation.x=.22+Math.max(0,kick)*.32;});
    arms.forEach((arm,i)=>{const phase=cycle+i*Math.PI;
      arm.rotation.set((-.6+Math.cos(phase)*.25)*(1-amount)+(-1.4+Math.cos(phase)*1.05)*amount,0,(i?-1:1)*(.65+Math.sin(phase)*(.15+.18*amount)));
      elbows[i].rotation.x=-.25-Math.max(0,Math.sin(phase))*(.15+.65*amount);
    });
  } else if(pose==='jump'){
    const falling=(detail.verticalVelocity??0)<0;upperBody.rotation.x=.08;
    legs.forEach((leg,i)=>{leg.rotation.x=falling?-.12:-(i?.45:.30);knees[i].rotation.x=falling?.3:(i?.8:.65);});
    arms.forEach((arm,i)=>{arm.rotation.set(-.85,0,(i?-1:1)*.30);elbows[i].rotation.x=-.35;});
  } else if (pose === 'sneak') {
    body.position.y = -.06; upperBody.rotation.x = .17;
    legs.forEach((leg,i) => { leg.rotation.x = -.45 + wave * (i ? -.08 : .08); knees[i].rotation.x = .9; });
    arms.forEach((arm,i) => { arm.rotation.x = -.15 + wave * (i ? .2 : -.2); elbows[i].rotation.x = -.2; });
  } else if (pose === 'run') {
    body.position.y = Math.abs(wave) * .06; upperBody.rotation.x = .12;
    legs.forEach((leg,i) => { leg.rotation.x = wave * (i ? -1 : 1) * .72; knees[i].rotation.x = Math.max(0,wave*(i ? 1 : -1)) * .85; });
    arms.forEach((arm,i) => { arm.rotation.x = wave * (i ? 1 : -1) * .8; elbows[i].rotation.x = -.8; });
  } else if (pose === 'crouch') {
    body.position.y = -.18; upperBody.rotation.x = .18;
    legs.forEach((leg, i) => { leg.rotation.x = -.80; knees[i].rotation.x = 1.70; });
    arms.forEach((arm, i) => { arm.rotation.x = -.35; elbows[i].rotation.x = -.20; });
  } else if (pose === 'sit') {
    body.position.y = -.28; upperBody.rotation.x = .055;
    legs.forEach((leg, i) => { leg.rotation.x = -1.45; knees[i].rotation.x = 1.45; });
    arms.forEach((arm, i) => { arm.rotation.x = -.88; elbows[i].rotation.x = -.5; });
  } else if (pose === 'prone') {
    body.position.set(0, .84, -1.10); body.rotation.x = PI / 2;
    upperBody.rotation.x = -.08;
    legs.forEach((leg, i) => { leg.rotation.x = walking ? wave * (i ? -.14 : .14) : 0; knees[i].rotation.x = .07; });
    arms.forEach((arm, i) => { arm.rotation.x = 2.85 + (walking ? wave * (i ? -.12 : .12) : 0); elbows[i].rotation.x = .35; });
  }
  ankles.forEach((ankle, i) => { ankle.rotation.x = pose === 'prone' ? 0 : -(legs[i].rotation.x + knees[i].rotation.x); });
}
