import { shorelineX } from './shore-waves.js';
import * as THREE from 'three';
import { WORLD, terrainHeight } from './terrain.js';

export const SEAFOOD = Object.freeze({
  crab: Object.freeze({ category: 'ingredient', edibleWhenPrepared: true, name: 'crab' }),
  conch: Object.freeze({ category: 'ingredient', edibleWhenPrepared: true, name: 'conch' }),
  lobster: Object.freeze({ category: 'ingredient', edibleWhenPrepared: true, name: 'lobster' }),
});

/** Original little sea creatures; all assets and animation work offline. */
export function createMarine(scene) {
  const root=new THREE.Group();root.name='Coastal ecosystem';scene.add(root);
  let seed=921;const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.72});
  const palette=['#ffc981','#83dfe2','#f7aab9','#a9b6ec'].map(mat), dark=mat('#304b55'),white=mat('#fff8df');
  const sphere=new THREE.SphereGeometry(1,12,8), cone=new THREE.ConeGeometry(1,1,8);
  function part(g,geo,m,x,y,z,sx,sy,sz){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);g.add(o);return o;}
  const creatures=[];
  function fish(x,z,index){
    const g=new THREE.Group(),m=palette[index%4];root.add(g);
    part(g,sphere,m,0,0,0,.58,.32,.24);
    const tail=part(g,cone,m,-.66,0,0,.31,.42,.12);tail.rotation.z=Math.PI/2;
    part(g,cone,m,.02,.25,0,.15,.22,.1);
    for(const side of [-1,1]){part(g,sphere,white,.32,.08,side*.19,.11,.11,.045);part(g,sphere,dark,.36,.08,side*.23,.05,.06,.025);}
    g.position.set(x,Math.max(terrainHeight(x,z)+1.3,-1.9-index%3*.65),z);
    g.userData={kind:'fish',home:g.position.clone(),phase:index*.7};creatures.push(g);return g;
  }
  for(let school=0;school<18;school++){
    const x=school===0?WORLD.landMaxX+14:WORLD.landMaxX+12+random()*(WORLD.maxX-WORLD.landMaxX-40),z=school===0?0:WORLD.minZ+30+random()*(WORLD.maxZ-WORLD.minZ-60);
    for(let i=0;i<8;i++)fish(x+random()*9,z+random()*12,school*8+i);
  }
  for(let i=0;i<10;i++){
    const x=WORLD.landMaxX+18+i*47,z=i===0?10:WORLD.minZ+70+random()*(WORLD.maxZ-WORLD.minZ-140),g=new THREE.Group();root.add(g);
    const shell=mat('#8fb784'),skin=mat('#b8d78d');part(g,sphere,shell,0,0,0,.9,.38,.65);part(g,sphere,skin,.95,0,0,.35,.25,.28);
    for(const side of [-1,1])for(const end of [-1,1])part(g,sphere,skin,end*.5,-.1,side*.68,.32,.08,.32);
    for(const side of [-1,1])part(g,sphere,dark,1.1,.1,side*.2,.055,.065,.04);
    g.position.set(x,-1.4,z);g.userData={kind:'turtle',home:g.position.clone(),phase:i};creatures.push(g);
  }
  const crabBlue=mat('#739eae'),pink=mat('#f1a5ba'),kelpMaterial=mat('#70bda1'),coralMaterial=mat('#e9b1a0');
  const sites=[];
  for(let i=0;i<170;i++){
    const x=i<12?WORLD.landMaxX+9+random()*38:WORLD.landMaxX+5+random()*(WORLD.maxX-WORLD.landMaxX-15),z=i<12?-20+random()*40:WORLD.minZ+15+random()*(WORLD.maxZ-WORLD.minZ-30);
    const y=terrainHeight(x,z),g=new THREE.Group();g.position.set(x,y+.1,z);root.add(g);
    if(i%4===0){ // soft branching coral
      for(let n=0;n<5;n++){const o=part(g,new THREE.CapsuleGeometry(.12,.6+n*.12,3,6),i%8?pink:coralMaterial,Math.sin(n*2)*.4,.5+n*.08,Math.cos(n*2)*.4,1,1,1);o.rotation.z=Math.sin(n)*.6;}
      sites.push({position:g.position,kind:'coral'});
    }else{for(let n=0;n<4;n++){const o=part(g,new THREE.CapsuleGeometry(.08,.8+n*.27,3,5),kelpMaterial,Math.sin(n)*.32,.6+n*.1,Math.cos(n)*.32,1,1,.35);o.rotation.z=Math.sin(n)*.2;}}
    g.userData.phase=i;
  }
  // Tiny beach crabs inhabit the sand rather than the deep sea.
  for(let i=0;i<14;i++){
    const g=new THREE.Group(),z=i===0?0:-200+random()*400,x=shorelineX(z)-8-random()*8;root.add(g);
    part(g,sphere,crabBlue,0,.2,0,.42,.17,.28);
    for(const side of [-1,1])for(let n=0;n<3;n++){const spike=part(g,cone,crabBlue,side*(.38+n*.04),.2,(n-1)*.13,.09,.18,.09);spike.rotation.z=side*Math.PI/2;}
    for(const side of [-1,1]){for(let n=0;n<3;n++){const leg=part(g,cone,pink,side*.35,.14,(n-1)*.16,.045,.35,.045);leg.rotation.z=side*.9;}part(g,sphere,pink,side*.37,.35,.22,.12,.12,.12);part(g,sphere,dark,side*.12,.4,.18,.045,.065,.045);}
    g.position.set(x,terrainHeight(x,z),z);g.userData={kind:'crab',home:g.position.clone(),phase:i};creatures.push(g);
  }
  // Sea snails on the strand and lobsters in the shallow coastal seabed.
  const shellMaterial=mat('#dbc49c'),shellStripe=mat('#ad795a'),lobsterMaterial=mat('#af785e');
  for(let i=0;i<20;i++){
    const g=new THREE.Group();root.add(g);
    const z=i===0?5:-220+random()*440,x=shorelineX(z)-4-random()*8;
    part(g,sphere,shellMaterial,0,.2,0,.3,.25,.25);
    const tip=part(g,cone,shellMaterial,-.22,.3,0,.19,.5,.19);tip.rotation.z=-.8;
    for(let n=0;n<4;n++)part(g,sphere,n%2?shellStripe:shellMaterial,.02-n*.07,.24+n*.04,.1,.2-n*.03,.17-n*.02,.16-n*.02);
    part(g,sphere,dark,.23,.13,.05,.1,.07,.12);
    g.position.set(x,terrainHeight(x,z),z);g.userData={kind:'conch',home:g.position.clone(),phase:i};creatures.push(g);
  }
  for(let i=0;i<16;i++){
    const g=new THREE.Group();root.add(g);
    const z=i===0?10:-220+random()*440,x=shorelineX(z)+6+random()*6;
    part(g,sphere,lobsterMaterial,0,.18,0,.20,.17,.55);
    for(let n=0;n<5;n++)part(g,sphere,lobsterMaterial,0,.17,-.30-n*.12,.22-n*.022,.13,.10);
    for(const side of [-1,1]){
      const claw=part(g,sphere,lobsterMaterial,side*.32,.20,.5,.17,.12,.28);claw.rotation.y=-side*.35;
      part(g,cone,lobsterMaterial,side*.29,.20,.77,.09,.23,.07).rotation.x=Math.PI/2;
      for(let n=0;n<4;n++){const leg=part(g,cone,lobsterMaterial,side*.29,.10,.18-n*.19,.035,.38,.035);leg.rotation.z=side*1.1;}
      part(g,sphere,dark,side*.13,.34,.4,.04,.05,.04);
      const antenna=part(g,cone,lobsterMaterial,side*.13,.35,.72,.015,.65,.015);antenna.rotation.x=1.15;antenna.rotation.z=side*.3;
    }
    g.position.set(x,terrainHeight(x,z)+.05,z);g.userData={kind:'lobster',home:g.position.clone(),phase:i};creatures.push(g);
  }
  const harvestables=creatures.filter(g=>SEAFOOD[g.userData.kind]);
  for(const [index,g] of harvestables.entries()){g.userData.id=`seafood-${index}`;g.userData.collected=false;}
  const bubbleGeometry=new THREE.BufferGeometry(),bubbles=new Float32Array(240*3);
  for(let i=0;i<240;i++){bubbles[i*3]=WORLD.landMaxX+6+random()*70;bubbles[i*3+1]=-random()*7;bubbles[i*3+2]=-55+random()*110;}
  bubbleGeometry.setAttribute('position',new THREE.BufferAttribute(bubbles,3));
  const dots=new THREE.Points(bubbleGeometry,new THREE.PointsMaterial({color:'#dcffff',size:.07,transparent:true,opacity:.65,depthWrite:false}));root.add(dots);
  function update(dt,time,center={x:WORLD.landMaxX,z:0}){
    for (const g of root.children) g.visible = !g.userData.collected && (g === dots ? center.x > WORLD.landMaxX-90 : Math.hypot(g.position.x-center.x,g.position.z-center.z)<145);
    for(const g of creatures){if(g.userData.collected)continue;const h=g.userData.home,a=time*.18+g.userData.phase;g.position.x=h.x+Math.sin(a)*(SEAFOOD[g.userData.kind]?(g.userData.kind==='conch'?0:.25):3);g.position.z=h.z+Math.cos(a)*(SEAFOOD[g.userData.kind]?(g.userData.kind==='conch'?0:.3):2);g.position.y=h.y+Math.sin(a*2)*(SEAFOOD[g.userData.kind]?0:.15);g.rotation.y=-a;}
    for(let i=0;i<240;i++){bubbles[i*3+1]+=dt*.3;if(bubbles[i*3+1]>-.1)bubbles[i*3+1]=-6;}bubbleGeometry.attributes.position.needsUpdate=true;
  }
  function collect(target, player) {
    if(!harvestables.includes(target)||target.userData.collected||!player)return null;
    if(![player.x,player.y,player.z].every(Number.isFinite)||target.position.distanceTo(player)>3.5)return null;
    target.userData.collected=true;target.visible=false;
    return {id:target.userData.kind,count:1,category:'ingredient'};
  }
  return {root,creatures,sites,harvestables,collect,update,getState:()=>({fish:144,turtles:10,crabs:14,conches:20,lobsters:16,reefSites:170,available:harvestables.filter(g=>!g.userData.collected).length})};
}
