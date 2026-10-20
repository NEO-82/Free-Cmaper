import * as THREE from 'three';

export const ANIMAL_SPECIES = Object.freeze(['puppy', 'cat', 'sheep', 'raccoon', 'deer']);
const PI = Math.PI;

/** Original animal campers with paws, muzzles, species ears and tails. Forward is +Z. */
export function createCamper(parent, settings = {}) {
  const root = new THREE.Group(); root.name = 'Animal camper'; parent.add(root);
  const body = new THREE.Group(); root.add(body);
  const upperBody = new THREE.Group(); upperBody.position.y = .76; body.add(upperBody);
  const materials = {};
  const mat = (name, color) => materials[name] ??= new THREE.MeshStandardMaterial({color, roughness:.85});
  const fur=mat('fur','#e9bb68'), cream=mat('cream','#fff0c8'), dark=mat('dark','#34342e'), pink=mat('pink','#e5a193'), ivory=mat('ivory','#fffdf3');
  const pack=mat('pack','#79a18a'),packDark=mat('packDark','#4c7665'),canvas=mat('canvas','#e7ce9b');
  const sphere=new THREE.SphereGeometry(1,24,18), cube=new THREE.BoxGeometry(1,1,1), cone=new THREE.ConeGeometry(1,1,24);
  const geometries=new Set([sphere,cube,cone]);
  function add(p,geo,m,x,y,z,sx,sy,sz){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
  const orb=(p,m,x,y,z,sx,sy=sx,sz=sx)=>add(p,sphere,m,x,y,z,sx,sy,sz);
  const box=(p,m,x,y,z,sx,sy,sz)=>add(p,cube,m,x,y,z,sx,sy,sz);
  const torsoRig=new THREE.Group();upperBody.add(torsoRig);
  const torso=orb(torsoRig,fur,0,.36,0,.41,.44,.29);
  orb(torsoRig,cream,0,.31,.255,.28,.33,.065);
  const neck=orb(upperBody,fur,0,.76,.015,.18,.15,.17);
  const head=new THREE.Group();head.position.set(0,1.34,.025);upperBody.add(head);
  const face=orb(head,fur,0,0,.02,.64,.65,.56);face.name='Animal face';
  const details=Object.fromEntries(ANIMAL_SPECIES.map(id=>{const g=new THREE.Group();g.name=id+' features';head.add(g);return [id,g];}));
  for(const side of [-1,1]){
    const eye=orb(head,dark,side*.245,.025,.553,.095,.12,.035);eye.name='Animal eye';
    orb(head,ivory,side*.245-.025,.065,.582,.027,.034,.012);
    orb(head,pink,side*.42,-.19,.44,.075,.035,.02);
    const ear=orb(details.puppy,fur,side*.61,-.10,-.01,.23,.48,.14);ear.rotation.z=side*.18;ear.name='Floppy retriever ear';
    orb(details.puppy,cream,side*.14,-.21,.58,.23,.18,.22);
    const catEar=add(details.cat,cone,fur,side*.44,.5,-.02,.25,.55,.22);catEar.rotation.z=-side*.18;
    add(details.cat,cone,pink,side*.44,.53,.125,.12,.32,.025);
    for(let n=0;n<3;n++){const w=box(details.cat,cream,side*.45,-.23+n*.07,.57,.38,.012,.013);w.rotation.z=side*(n-1)*.16;}
    const sheepEar=orb(details.sheep,fur,side*.68,.03,-.02,.24,.10,.13);sheepEar.rotation.z=side*.3;
    orb(details.raccoon,cream,side*.46,-.22,.3,.22,.21,.3);
    // Eye patches sit around the shared eyes, leaving pupils and highlights visible.
    orb(details.raccoon,mat('mask','#4d4943'),side*.245,.02,.49,.225,.205,.065);
    orb(details.raccoon,fur,side*.49,.48,-.05,.19,.24,.12);
    orb(details.raccoon,dark,side*.49,.49,.04,.10,.13,.03);
    const deerEar=orb(details.deer,fur,side*.65,.29,-.03,.29,.13,.13);deerEar.rotation.z=side*.55;
    orb(details.deer,cream,side*.67,.29,.08,.16,.07,.025);
    // Small forked antlers keep the deer within the same doorway clearance.
    const stem=box(details.deer,mat('antler','#95734f'),side*.33,.63,-.12,.07,.44,.07);stem.rotation.z=-side*.15;
    const fork=box(details.deer,materials.antler,side*.43,.69,-.12,.22,.055,.055);fork.rotation.z=side*.55;
  }
  for(let n=0;n<16;n++){const a=n/16*PI*2;orb(details.sheep,cream,Math.sin(a)*.53,Math.cos(a)*.53,-.03,.17,.18,.19);}
  orb(details.sheep,cream,0,.42,.38,.4,.2,.22);
  const muzzle=orb(head,cream,0,-.24,.52,.24,.18,.15);
  const nose=orb(head,dark,0,-.15,.705,.09,.065,.05);nose.name='Animal nose';
  const mouth=box(head,dark,0,-.29,.663,.025,.10,.018);
  for(const side of [-1,1]){const smile=orb(head,dark,side*.064,-.335,.64,.066,.016,.014);smile.rotation.z=side*.16;}
  const arms=[],elbows=[],legs=[],knees=[],ankles=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.455,.59,0);upperBody.add(arm);arms.push(arm);
    orb(arm,fur,0,-.12,0,.16,.23,.16);
    const elbow=new THREE.Group();elbow.position.y=-.235;arm.add(elbow);elbows.push(elbow);
    orb(elbow,fur,0,-.11,0,.12,.18,.12);
    const paw=orb(elbow,fur,0,-.235,.04,.145,.14,.15);paw.name='Front paw';
    for(let n=-1;n<=1;n++)orb(elbow,cream,n*.065,-.26,.17,.021,.03,.012);
    const leg=new THREE.Group();leg.position.set(side*.205,.76,0);body.add(leg);legs.push(leg);
    orb(leg,fur,0,-.15,0,.175,.205,.175);
    const knee=new THREE.Group();knee.position.y=-.32;leg.add(knee);knees.push(knee);
    orb(knee,fur,0,-.12,0,.12,.18,.12);
    const ankle=new THREE.Group();ankle.position.y=-.31;knee.add(ankle);ankles.push(ankle);
    const hindPaw=orb(ankle,fur,0,0,.075,.165,.13,.21);hindPaw.name='Hind paw';
    for(let n=-1;n<=1;n++)orb(ankle,cream,n*.065,-.015,.273,.023,.035,.012);
  }
  const tails=Object.fromEntries(ANIMAL_SPECIES.map(id=>{const g=new THREE.Group();g.name=id+' tail';g.position.set(0,.85,-.27);body.add(g);return[id,g];}));
  for(let n=0;n<5;n++)orb(tails.puppy,fur,0,.05+n*.045,-n*.13,.14-n*.017,.14-n*.017,.2);
  for(let n=0;n<7;n++)orb(tails.cat,n%2?fur:mat('catStripe','#a47853'),0,n*.065,-n*.11,.105,.11,.16);
  orb(tails.sheep,cream,0,0,-.12,.16,.18,.2);
  for(let n=0;n<7;n++)orb(tails.raccoon,n%2?materials.mask:fur,0,.04,-n*.12,.20-n*.014,.20-n*.014,.15);
  orb(tails.deer,cream,0,.06,-.10,.13,.19,.16);
  const spots=new THREE.Group();torsoRig.add(spots);
  for(const side of [-1,1])for(let n=0;n<5;n++)orb(spots,cream,side*(.26+n%2*.06),.13+n*.105,-.19,.045,.055,.035);
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
  const bottle=orb(backpack,mat('bottle','#8fc9cb'),.335,.23,-.4,.074,.18,.074);
  const model={root,body,upperBody,torsoRig,torso,head,face,legs,knees,ankles,arms,elbows,backpack,neck,materials,bottle,tails,details,settings:{},
    configure(next={}){
      const species=ANIMAL_SPECIES.includes(next.species)?next.species:this.settings.species??'puppy';
      this.settings={species};root.name=`Animal camper: ${species}`;
      const colors={puppy:['#e9bb68','#fff0c8'],cat:['#c99462','#f8e4ca'],sheep:['#e0cfb0','#fff7e3'],raccoon:['#9b9182','#e9e0ce'],deer:['#b98151','#f9e3ba']};
      fur.color.set(colors[species][0]);cream.color.set(colors[species][1]);
      for(const id of ANIMAL_SPECIES){details[id].visible=id===species;tails[id].visible=id===species;}
      spots.visible=species==='deer';muzzle.scale.set(species==='puppy'?.28:.24,species==='puppy'?.19:.18,species==='puppy'?.22:.15);
      nose.position.z=species==='puppy'?.775:.705;mouth.position.z=species==='puppy'?.75:.663;
      return this;
    },
    dispose(){root.removeFromParent();geometries.forEach(g=>g.dispose());Object.values(materials).forEach(m=>m.dispose());},
  };
  model.configure(settings);poseCamper(model,'stand');return model;
}

/** Articulated gameplay poses. Feet are at ground level in stand/sit/crouch. */
export function poseCamper(model, pose, walking = false, now = 0, detail = {}) {
  const { body, upperBody, legs, knees, ankles, arms, elbows, head } = model;
  const wave = walking ? Math.sin(now * (pose === 'run' ? .013 : .008)) : 0;
  body.position.set(0, 0, 0); body.rotation.set(0, 0, 0);
  upperBody.rotation.set(0, 0, 0);
  head.rotation.set(0, walking ? Math.sin(now * .004) * .025 : 0, 0);
  legs.forEach((leg, i) => { leg.rotation.set(wave * (i ? -1 : 1) * .38, 0, 0); knees[i].rotation.set(Math.max(0, wave * (i ? 1 : -1)) * .38, 0, 0); });
  arms.forEach((arm, i) => { arm.rotation.set(wave * (i ? 1 : -1) * .35, 0, (i ? -1 : 1) * .055); elbows[i].rotation.set(-.10, 0, 0); });
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
