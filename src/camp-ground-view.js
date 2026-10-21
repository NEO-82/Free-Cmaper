import * as THREE from 'three';
import { setCampGround, insideCampGround } from './camp-ground.js';

/** Keep all original terrain outside the footprint, including coarse grid triangles. */
export function createCampGroundView(parent,{baseHeightAt,groundMap=null,worldBounds=null}={}) {
  const root=new THREE.Group();root.name='leveled-campsite';parent.add(root);
  const uniforms={campEnabled:{value:0},campCenter:{value:new THREE.Vector2()},campHalfSize:{value:new THREE.Vector2()},campRotation:{value:new THREE.Vector2(1,0)}};
  const materials=new Set(),meshes=new WeakSet();let patch=null;
  const topMaterial=new THREE.MeshStandardMaterial({color:'#a3c99b',map:groundMap,roughness:1,side:THREE.DoubleSide});
  const soilMaterial=new THREE.MeshStandardMaterial({color:'#a5805b',roughness:1,side:THREE.DoubleSide});
  function maskMaterial(material){
    if(materials.has(material))return;materials.add(material);
    const previous=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
    material.onBeforeCompile=function(shader,...args){
      previous.call(this,shader,...args);Object.assign(shader.uniforms,uniforms);
      shader.vertexShader='varying vec2 vCampXZ;\n'+shader.vertexShader.replace('#include <project_vertex>',`vec4 campPosition=vec4(transformed,1.);
        #ifdef USE_INSTANCING
        campPosition=instanceMatrix*campPosition;
        #endif
        vCampXZ=(modelMatrix*campPosition).xz;
        #include <project_vertex>`);
      shader.fragmentShader='uniform float campEnabled;uniform vec2 campCenter;uniform vec2 campHalfSize;uniform vec2 campRotation;varying vec2 vCampXZ;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
        vec2 campDelta=vCampXZ-campCenter;
        vec2 campLocal=vec2(campRotation.x*campDelta.x-campRotation.y*campDelta.y,campRotation.y*campDelta.x+campRotation.x*campDelta.y);
        if(campEnabled>.5&&all(lessThanEqual(abs(campLocal),campHalfSize)))discard;`);
    };
    material.customProgramCacheKey=()=>cacheKey+'-camp-ground-cutout-v1';material.needsUpdate=true;
  }
  function maskMesh(mesh){
    if(meshes.has(mesh))return;meshes.add(mesh);
    for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])maskMaterial(material);
    // Picking must agree with the visible hole rather than hit hidden original ground.
    const raycast=mesh.raycast;
    mesh.raycast=function(ray,hits){const original=[];raycast.call(this,ray,original);for(const hit of original)if(!insideCampGround(hit.point.x,hit.point.z,patch))hits.push(hit);};
  }
  function clearGeometry(){for(const child of [...root.children]){root.remove(child);child.geometry.dispose();}}
  function setPatch(next){
    setCampGround(next);patch=next;clearGeometry();uniforms.campEnabled.value=patch?1:0;
    if(!patch)return;
    uniforms.campCenter.value.set(patch.x,patch.z);uniforms.campHalfSize.value.set(patch.width/2,patch.depth/2);uniforms.campRotation.value.set(Math.cos(patch.rotation??0),Math.sin(patch.rotation??0));
    root.position.set(patch.x,patch.y,patch.z);root.rotation.y=patch.rotation??0;
    const geometry=new THREE.PlaneGeometry(patch.width,patch.depth);geometry.rotateX(-Math.PI/2);
    const points=geometry.attributes.position,uvs=geometry.attributes.uv,c=Math.cos(patch.rotation??0),s=Math.sin(patch.rotation??0);
    for(let i=0;i<points.count;i++)if(worldBounds){const x=patch.x+c*points.getX(i)+s*points.getZ(i),z=patch.z-s*points.getX(i)+c*points.getZ(i);uvs.setXY(i,(x-worldBounds.minX)/(worldBounds.maxX-worldBounds.minX),(worldBounds.maxZ-z)/(worldBounds.maxZ-worldBounds.minZ));}
    const top=new THREE.Mesh(geometry,topMaterial);top.name='camp-level-ground';top.receiveShadow=true;root.add(top);
    const w=patch.width/2,d=patch.depth/2,corners=[[-w,-d],[w,-d],[w,d],[-w,d]],positions=[],indices=[];
    for(let side=0;side<4;side++){
      const a=corners[side],b=corners[(side+1)%4],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.2);
      for(let j=0;j<=steps;j++){
        const x=a[0]+(b[0]-a[0])*j/steps,z=a[1]+(b[1]-a[1])*j/steps;
        const base=baseHeightAt(patch.x+c*x+s*z,patch.z-s*x+c*z)-patch.y,k=positions.length/3;
        positions.push(x,0,z,x,base,z);
        if(j)indices.push(k-2,k-1,k,k-1,k+1,k);
      }
    }
    const sides=new THREE.BufferGeometry();sides.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));sides.setIndex(indices);sides.computeVertexNormals();
    const earth=new THREE.Mesh(sides,soilMaterial);earth.name='camp-cut-and-fill';earth.castShadow=earth.receiveShadow=true;root.add(earth);root.updateMatrixWorld(true);
  }
  return {root,setPatch,maskMesh,maskMaterial,setSeason(index){topMaterial.color.set(['#a3c99b','#86bd93','#ccb689','#cfdfd2'][index]);},dispose(){setPatch(null);root.removeFromParent();topMaterial.dispose();soilMaterial.dispose();}};
}
