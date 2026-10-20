import * as THREE from 'three';

/** Reachable branch steps lead from the ground to the crown of every tree. */
export function treePlatforms(tree) {
  const platforms=[],side=tree.radius+1.1,crown=tree.h*1.13;
  for(let height=2.6;height<crown-.5;height+=2.7){
    platforms.push({kind:'circle',id:`${tree.id}-branch-${platforms.length}`,x:tree.x+side,z:tree.z,radius:.95,minY:tree.y+height-.22,maxY:tree.y+height,oneWay:true,active:true});
  }
  platforms.push({kind:'circle',id:`${tree.id}-crown`,x:tree.x,z:tree.z,radius:Math.max(side+.25,tree.h*.18),minY:tree.y+crown-.22,maxY:tree.y+crown,oneWay:true,active:true});
  return platforms;
}

/** Raycast the actual rendered rock and moss cap, including rotation and scale. */
export function rockSurface(mesh) {
  mesh.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(mesh,true),ray=new THREE.Raycaster();
  return {maxY:bounds.max.y,surfaceAt(x,z){
    ray.set(new THREE.Vector3(x,bounds.max.y+1,z),new THREE.Vector3(0,-1,0));
    return ray.intersectObject(mesh,true)[0]?.point.y;
  }};
}
