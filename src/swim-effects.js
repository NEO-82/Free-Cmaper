import * as THREE from 'three';
/** Small wakes and alternating hand splashes follow the same paused physics clock. */
export function createSwimEffects(scene){
  const group=new THREE.Group();group.name='swimming-wake';group.visible=false;scene.add(group);
  const rings=[];
  for(let i=0;i<3;i++){
    const ring=new THREE.Mesh(new THREE.RingGeometry(.93,1,40),new THREE.MeshBasicMaterial({color:'#ddf7e5',transparent:true,opacity:.4,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;group.add(ring);rings.push(ring);
  }
  const drops=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),new THREE.MeshBasicMaterial({color:'#c5f0e6',transparent:true,opacity:.75,depthWrite:false}),16);drops.frustumCulled=false;group.add(drops);
  const dummy=new THREE.Object3D();
  return {update(active,position,time,depth,speed,heading){
    group.visible=active&&depth<.7;if(!group.visible)return;group.position.set(position.x,.14,position.z);
    rings.forEach((ring,i)=>{const cycle=(time*.7+i/3)%1,scale=.5+cycle*1.9;ring.scale.set(scale,scale,scale);ring.position.set(-Math.sin(heading)*cycle*speed*.22,0,-Math.cos(heading)*cycle*speed*.22);ring.material.opacity=(1-cycle)*(.12+Math.min(1,speed/4)*.23);});
    for(let i=0;i<16;i++){const p=(time*1.5+i/16)%1,side=i%2?1:-1;dummy.position.set(Math.cos(heading)*side*(.55+p*.45)+Math.sin(heading)*.7,Math.sin(p*Math.PI)*(.12+Math.min(speed,4)*.06),-Math.sin(heading)*side*(.55+p*.45)+Math.cos(heading)*.7);dummy.scale.setScalar((1-p)*.05);dummy.updateMatrix();drops.setMatrixAt(i,dummy.matrix);}drops.instanceMatrix.needsUpdate=true;
  }};
}
