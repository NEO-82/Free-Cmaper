// One active campsite; replacing it restores the previous site's original ground.
let active = null;
export function setCampGround(patch) {
  if(patch===null){active=null;return;}
  if(!patch||![patch.x,patch.z,patch.width,patch.depth,patch.y,patch.rotation??0].every(Number.isFinite)||patch.width<=0||patch.depth<=0)throw new Error('Invalid campsite ground');
  active=Object.freeze({...patch,rotation:patch.rotation??0});
}
export const getCampGround=()=>active;
export function insideCampGround(x,z,patch=active) {
  if(!patch)return false;
  const dx=x-patch.x,dz=z-patch.z,c=Math.cos(patch.rotation??0),s=Math.sin(patch.rotation??0);
  return Math.abs(c*dx-s*dz)<=patch.width/2+1e-8&&Math.abs(s*dx+c*dz)<=patch.depth/2+1e-8;
}
export function campGroundHeight(x,z,original){return insideCampGround(x,z)?active.y:original;}
