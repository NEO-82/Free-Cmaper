import * as THREE from 'three';

/** Reuse a small tile pool: dense grass follows the player across the entire world. */
export function createGroundCover(parent, {geometry,material,heightAt,allowed,tileSize=32,radius=4,density=.225}) {
  const root=new THREE.Group(); root.name='Patchy meadow cover';parent.add(root);
  const capacity=Math.ceil(tileSize*tileSize*density), tiles=new Map(), pool=[];
  const count=(radius*2+1)**2, dummy=new THREE.Object3D();
  for(let i=0;i<count;i++){
    const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.castShadow=false;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;root.add(mesh);pool.push(mesh);
  }
  let lastKey='';
  function update(center,exclusion=null){
    const cx=Math.floor(center.x/tileSize),cz=Math.floor(center.z/tileSize);
    const key=`${cx}:${cz}:${exclusion?`${exclusion.minX}:${exclusion.minZ}:${exclusion.maxX}:${exclusion.maxZ}`:''}`;
    if(key===lastKey)return;const changedFootprint=lastKey.split(':').slice(2).join(':')!==key.split(':').slice(2).join(':');lastKey=key;
    const needed=new Set();for(let x=cx-radius;x<=cx+radius;x++)for(let z=cz-radius;z<=cz+radius;z++)needed.add(`${x}:${z}`);
    for(const [key,tile] of tiles)if(!needed.has(key)||changedFootprint){tiles.delete(key);tile.count=0;pool.push(tile);}
    for(const key of needed){
      if(tiles.has(key))continue;
      const [gx,gz]=key.split(':').map(Number),mesh=pool.pop();let seed=((gx*73856093^gz*19349663)>>>0)%2147483646+1;
      const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
      let used=0;
      for(let i=0;i<capacity;i++){
        const x=(gx+random())*tileSize,z=(gz+random())*tileSize;
        const yaw=random()*Math.PI*2,scale=.55+random()*.5,stretch=.42+random()*.5;
        if(!allowed(x,z)||exclusion&&x>exclusion.minX-1&&x<exclusion.maxX+1&&z>exclusion.minZ-1&&z<exclusion.maxZ+1)continue;
        dummy.position.set(x,heightAt(x,z)+.025,z);dummy.rotation.set(0,yaw,0);dummy.scale.set(scale,stretch,scale);dummy.updateMatrix();mesh.setMatrixAt(used++,dummy.matrix);
      }
      mesh.count=used;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();tiles.set(key,mesh);
    }
  }
  return {root,update,getState:()=>({tiles:tiles.size,poolCapacity:count,tufts:[...tiles.values()].reduce((n,m)=>n+m.count,0),density,viewDistance:tileSize*(radius+.5)}),dispose(){root.removeFromParent();root.children.forEach(mesh=>mesh.dispose());}};
}
