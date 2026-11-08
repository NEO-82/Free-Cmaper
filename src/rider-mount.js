/** Fit only visible posed meshes inside each cabin, including hats and hair. */
export function visibleRiderBounds(root,{Box3}){
 root.updateMatrixWorld(true);const bounds=new Box3(),Matrix4=root.matrixWorld.constructor,inverse=new Matrix4().copy(root.matrixWorld).invert(),local=new Matrix4(),part=new Box3();
 function visit(node){if(!node.visible)return;if(node.isMesh&&node.geometry){if(node.isSkinnedMesh)node.computeBoundingBox();else if(!node.geometry.boundingBox)node.geometry.computeBoundingBox();const box=node.isSkinnedMesh?node.boundingBox:node.geometry.boundingBox;if(box){local.multiplyMatrices(inverse,node.matrixWorld);part.copy(box).applyMatrix4(local);bounds.union(part);}}for(const child of node.children)visit(child);}
 visit(root);return bounds;
}
export function makeRiderMount(model,kind,C,pose){
 const root=model.root,position=root.position.clone(),rotation=root.quaternion.clone(),scale=root.scale.clone(),wasVisible=root.visible;root.position.set(0,0,0);root.quaternion.identity();root.scale.setScalar(1);root.visible=true;model.backpack.visible=false;pose();
 const bounds=visibleRiderBounds(root,C),size=bounds.getSize(new C.Vector3());let factor,offset,envelope;
 if(kind==='scooter'){factor=.82;offset={x:0,y:1.21-.48*factor,z:-.05};}
 else {
  envelope=kind==='motorhome'?{minX:-1.1,maxX:.03,floor:1.25,roof:3.42,minZ:1.9,maxZ:3.48}:kind==='helicopter'?{minX:-1.05,maxX:.05,floor:.8,roof:2.8,minZ:.5,maxZ:2.35}:kind==='airplane'?{minX:-.43,maxX:.43,floor:.7,roof:2.18,minZ:-.05,maxZ:1.25}:{minX:-1.17,maxX:.06,floor:.95,roof:kind==='suv'?3.28:3.12,minZ:-.72,maxZ:1.18};
  factor=Math.min(.85,(envelope.maxX-envelope.minX)/size.x,(envelope.roof-envelope.floor)/size.y,(envelope.maxZ-envelope.minZ)/size.z)*.95;
  offset={x:(envelope.minX+envelope.maxX)/2-(bounds.min.x+bounds.max.x)/2*factor,y:envelope.roof-bounds.max.y*factor-.03,z:(envelope.minZ+envelope.maxZ)/2-(bounds.min.z+bounds.max.z)/2*factor};
 }
 root.position.copy(position);root.quaternion.copy(rotation);root.scale.copy(scale);root.visible=wasVisible;
 return {kind,scale:factor,offset,envelope,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}};
}
export function updateMountedRider(model,vehicle,mount,C){
 const root=model.root,local=new C.Vector3(mount.offset.x,mount.offset.y,mount.offset.z).applyQuaternion(vehicle.root.quaternion);root.scale.setScalar(mount.scale);root.position.copy(vehicle.root.position).add(local);root.quaternion.copy(vehicle.root.quaternion);model.backpack.visible=false;root.updateMatrixWorld(true);
}
export function restoreRider(model){model.root.scale.setScalar(1);model.backpack.visible=true;}
