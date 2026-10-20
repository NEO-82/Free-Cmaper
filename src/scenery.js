import * as THREE from 'three';
import { WORLD, SCENERY, terrainHeight } from './terrain.js';

/** Visual-only land ring. Movement remains bounded by WORLD, including the sea. */
export function createScenery(scene) {
  const group = new THREE.Group(); group.name = 'Unreachable scenery and painted mountain horizon'; scene.add(group);
  const material = new THREE.MeshStandardMaterial({ color: '#a6c58d', roughness: 1 });
  const strips = [
    [SCENERY.minX, WORLD.minX, SCENERY.minZ, SCENERY.maxZ],
    [WORLD.maxX, SCENERY.maxX, SCENERY.minZ, SCENERY.maxZ],
    [WORLD.minX, WORLD.maxX, SCENERY.minZ, WORLD.minZ],
    [WORLD.minX, WORLD.maxX, WORLD.maxZ, SCENERY.maxZ],
  ];
  for (const [x0,x1,z0,z1] of strips) {
    const g = new THREE.PlaneGeometry(x1-x0,z1-z0,50,40); g.rotateX(-Math.PI/2); g.translate((x0+x1)/2,0,(z0+z1)/2);
    const p=g.attributes.position;
    for(let i=0;i<p.count;i++) p.setY(i,terrainHeight(p.getX(i),p.getZ(i)));
    g.computeVertexNormals(); const m=new THREE.Mesh(g,material); m.receiveShadow=true; group.add(m);
  }
  // A seamless, hand-painted 2D panorama on eight distant planes, never a solid wall.
  const canvas=document.createElement('canvas'); canvas.width=2048;canvas.height=512;
  const c=canvas.getContext('2d');
  for(let layer=0;layer<3;layer++) {
    c.fillStyle=['#b8cbd0','#97b4be','#799eaa'][layer]; c.beginPath();c.moveTo(0,512);
    for(let x=0;x<=2048;x+=8) {
      const a=x/2048*Math.PI*2;
      const height=315-layer*24-Math.sin(a*5+layer)*48-Math.sin(a*9-layer)*28-Math.cos(a*3)*45;
      c.lineTo(x,height);
    }
    c.lineTo(2048,512);c.closePath();c.fill();
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const mountainMaterial=new THREE.MeshBasicMaterial({map,transparent:true,side:THREE.DoubleSide,depthWrite:false,fog:true});
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2, r=Math.max(SCENERY.maxX,SCENERY.maxZ)*1.02;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(r*.84,680),mountainMaterial);
    m.position.set(Math.sin(a)*r,220,Math.cos(a)*r);m.rotation.y=a;group.add(m);
  }
  const water=new THREE.Mesh(new THREE.PlaneGeometry(SCENERY.maxX-WORLD.landMaxX,SCENERY.maxZ-SCENERY.minZ),new THREE.MeshStandardMaterial({color:'#6bcac9',roughness:.45,transparent:true,opacity:.65}));
  water.rotation.x=-Math.PI/2;water.position.set((SCENERY.maxX+WORLD.landMaxX)/2,-.12,0);group.add(water);
  return {group,bounds:SCENERY};
}
