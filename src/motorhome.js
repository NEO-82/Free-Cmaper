import * as THREE from 'three';

export const MOTORHOME_SIZE = Object.freeze({ width: 3.8, length: 8, height: 4.1 });
export const INTERIOR_CHOICES = Object.freeze({ wood: ['oak', 'walnut', 'white'], bedding: ['sage', 'blue', 'terracotta'], layout: ['left', 'right'] });
export function normalizeInterior(value = {}) {
  return Object.fromEntries(Object.entries(INTERIOR_CHOICES).map(([key, choices]) => [key, choices.includes(value?.[key]) ? value[key] : choices[0]]));
}
/** Heading is +Z in the vehicle frame, even after parking in another direction. */
export function motorhomeBoarding(state, point) {
  const dx=point.x-state.x,dz=point.z-state.z;
  const forward=dx*Math.sin(state.heading)+dz*Math.cos(state.heading);
  return forward>=1?'drive':'interior';
}

export function createMotorhomeInterior(config = {}) {
  const scene = new THREE.Group(); scene.name='motorhome-interior';
  const lamp = new THREE.PointLight('#ffe2aa', 22, 15); lamp.position.set(0, 2.7, 0); scene.add(lamp);
  let furniture = new THREE.Group(); scene.add(furniture);
  let settings, targets = [], obstacles = [], resting = false, exterior=null, exteriorWasVisible=true;
  const position = new THREE.Vector3(0, 0, 1.7);
  function disposeGroup(group) { group.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); group.clear(); }
  function rebuild(value) {
    settings = normalizeInterior(value); disposeGroup(furniture); targets = []; obstacles = []; resting = false;
    const wood = { oak: '#bb9568', walnut: '#70503b', white: '#e8e2d5' }[settings.wood];
    const cloth = { sage: '#94ad92', blue: '#779ab3', terracotta: '#c47e66' }[settings.bedding];
    const side = settings.layout === 'left' ? -1 : 1;
    function box(name, color, x,y,z,w,h,d, block=false) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.8}));
      m.name=name;m.position.set(x,y,z);furniture.add(m);
      if(block)obstacles.push({x,z,w,d});return m;
    }
    box('floor',wood,0,-.1,0,3.6,.2,6);
    box('ceiling','#eee8da',0,2.95,0,3.6,.1,6);
    function glass(name,x,y,z,w,h,d){
      const pane=box(name,'#c6e9e6',x,y,z,w,h,d);
      Object.assign(pane.material,{transparent:true,opacity:.12,depthWrite:false,roughness:.1,side:THREE.DoubleSide});
      return pane;
    }
    // The window is an actual hole in the wall; no opaque box sits behind the glass.
    for(const sign of [-1,1]) {
      box('wall lower','#f4eddd',sign*1.8,.675,0,.1,1.35,6);
      box('wall upper','#f4eddd',sign*1.8,2.6,0,.1,.7,6);
      box('wall rear','#f4eddd',sign*1.8,1.8,-1.75,.1,.9,2.5);
      box('wall front','#f4eddd',sign*1.8,1.8,2.1,.1,.9,1.8);
      glass('window',sign*1.8,1.8,.35,.025,.9,1.7);
      for(const y of [1.32,2.28])box('window frame',wood,sign*1.73,y,.35,.07,.06,1.8);
      for(const z of [-.53,1.23])box('window frame',wood,sign*1.73,1.8,z,.07,.96,.06);
    }
    box('rear wall','#eee8da',0,1.4,-3,3.6,3,.1);
    box('cab divider lower',wood,0,.75,3,3.6,1.5,.1);
    box('cab divider upper',wood,0,2.6,3,3.6,.7,.1);
    for(const sign of [-1,1])box('cab divider side',wood,sign*1.3,1.875,3,1,.75,.1);
    glass('cab window',0,1.875,3,1.6,.75,.025);
    box('bed base',wood,0,.35,-2,3.25,.7,1.7,true);
    box('mattress','#f3eedc',0,.79,-2,3.2,.2,1.65);
    box('duvet',cloth,0,.93,-1.8,3.1,.15,1.1);
    for(const x of [-.85,.85])box('pillow','#fff5db',x,.98,-2.48,.85,.2,.4);
    box('kitchen cabinet',wood,side*1.2,.55,0,.95,1.1,1.85,true);
    for(const z of [-.55,.1,.65]){box('drawer handle','#515e54',side*.713,.85,z,.04,.05,.32);}
    box('counter','#eee7d8',side*1.2,1.14,0,1.02,.12,1.95);
    box('sink rim','#7c999b',side*1.2,1.21,-.45,.65,.05,.55);
    box('sink basin','#435c61',side*1.2,1.24,-.45,.46,.03,.38);
    box('tap','#a6b8af',side*1.4,1.4,-.45,.06,.35,.06);
    for(const z of [.25,.65]) {
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.15,.025,8,24),new THREE.MeshStandardMaterial({color:'#404a48'}));ring.rotation.x=Math.PI/2;ring.position.set(side*1.2,1.23,z);furniture.add(ring);
    }
    box('shower tray','#e7e6d9',-side*1.2,.05,1.8,.95,.1,1.4,true);
    box('bath partition','#e5dac5',-side*.68,1.25,1.8,.08,2.5,1.5);
    box('toilet cistern','#faf5e9',-side*1.2,.8,2.25,.55,.8,.22);
    box('toilet bowl','#fff9ed',-side*1.2,.42,1.9,.55,.65,.6);
    const seat = new THREE.Mesh(new THREE.TorusGeometry(.24,.055,10,32),new THREE.MeshStandardMaterial({color:'#faf5e9'}));
    seat.name='toilet seat';seat.rotation.x=Math.PI/2;seat.scale.y=1.2;seat.position.set(-side*1.2,.77,1.9);furniture.add(seat);
    box('shower head','#9caea5',-side*1.2,2.5,2.7,.3,.08,.2);
    box('entry door','#aac0b2',1.73,1.2,-1.05,.03,2.3,.85);
    targets = [
      {id:'rvBed', x:0,z:-1.05}, {id:'rvCook',x:side*.55,z:0},
      {id:'rvToilet',x:-side*.55,z:1.8}, {id:'rvExit',x:.65,z:-1.05}, {id:'rvDrive',x:0,z:2.7},
    ];
    position.set(0,0,-.7);
  }
  rebuild(config);
  return { scene, position, get settings(){return {...settings};}, get targets(){return targets;}, get resting(){return resting;},
    configure: rebuild,
    mount(parent,vehicleRoot){
      if(exterior&&exterior!==vehicleRoot)exterior.visible=exteriorWasVisible;
      if(exterior!==vehicleRoot){exterior=vehicleRoot;exteriorWasVisible=vehicleRoot.visible;}
      parent.updateWorldMatrix(true,false);vehicleRoot.updateWorldMatrix(true,false);
      parent.add(scene);
      const transform=new THREE.Matrix4().copy(parent.matrixWorld).invert().multiply(vehicleRoot.matrixWorld).multiply(new THREE.Matrix4().makeTranslation(0,.9,-.9));
      transform.decompose(scene.position,scene.quaternion,scene.scale);scene.updateMatrixWorld(true);
      exterior.visible=false;
    },
    toWorld(point){scene.updateWorldMatrix(true,false);return scene.localToWorld(point.clone());},
    toggleRest(){resting=!resting;},
    move(dx,dz){
      if(resting)return;
      // Small steps prevent clipping across furniture even after a slow frame.
      const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));
      const valid=(x,z)=>Math.abs(x)<=1.45&&Math.abs(z)<=2.65&&!obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.22&&Math.abs(z-o.z)<o.d/2+.22);
      for(let i=0;i<n;i++){if(valid(position.x+dx/n,position.z))position.x+=dx/n;if(valid(position.x,position.z+dz/n))position.z+=dz/n;}
    },
    nearest(){return targets.map(o=>({...o,d:Math.hypot(position.x-o.x,position.z-o.z)})).filter(o=>o.d<1.15).sort((a,b)=>a.d-b.d)[0];},
    dispose(){if(exterior)exterior.visible=exteriorWasVisible;scene.removeFromParent();disposeGroup(furniture);scene.clear();},
  };
}
