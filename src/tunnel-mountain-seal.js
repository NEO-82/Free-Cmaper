export const TUNNEL_HALF_WIDTH=17, TUNNEL_FLOOR=2.5;
export function tunnelArchCeiling(floor,lateral){
 const r=Math.abs(lateral)/TUNNEL_HALF_WIDTH;
 return r>=1?-Infinity:floor+5.8+4.8*Math.sqrt(1-r*r)+.1;
}
export function tunnelPortalCut(portal,x,z){
 const dx=x-portal.x,dz=z-portal.z,c=Math.cos(portal.heading),s=Math.sin(portal.heading),lateral=c*dx-s*dz,longitudinal=s*dx+c*dz;
 return longitudinal< -3||longitudinal>6?-Infinity:tunnelArchCeiling(portal.y,lateral);
}
export function sealSections(){
 const inner=[[-17,-.18]],outer=[[-20,-.25]];
 for(let i=0;i<=16;i++){const a=Math.PI-i/16*Math.PI;inner.push([Math.cos(a)*17,5.8+Math.sin(a)*4.8]);outer.push([Math.cos(a)*20,5.8+Math.sin(a)*6.5]);}
 inner.push([17,-.18]);outer.push([20,-.25]);return {inner,outer};
}
/** Rock backing and annular collars overlap the cavity, without a face across the road. */
export function addTunnelMountainSeals({root,tunnels,liningTrack,constructors}){
 const {BufferGeometry,Float32BufferAttribute,Mesh,MeshStandardMaterial}=constructors;
 const rock=new MeshStandardMaterial({color:'#92947d',roughness:1,side:2}),lining=new MeshStandardMaterial({color:'#a9a69a',roughness:1,side:2});
 const {inner,outer}=sealSections();let collars=0;
 function mesh(positions,indices,name,material=rock){const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();const m=new Mesh(g,material);m.name=name;m.receiveShadow=true;root.add(m);return m;}
 function section(p,shape){return shape.flatMap(([x,y])=>[p.x+p.nx*x,p.y+y,p.z+p.nz*x]);}
 function strip(track,shape,name,material){const positions=[],indices=[];track.forEach((p,i)=>{positions.push(...section(p,shape));for(let j=0;i&&j<shape.length-1;j++){const k=i*shape.length+j,a=k-shape.length;indices.push(a,k,a+1,a+1,k,k+1);}});return mesh(positions,indices,name,material);}
 for(const tunnel of tunnels){
  const track=liningTrack(tunnel),first=track[0],last=track.at(-1),a=track[1],b=track.at(-2);
  function extend(p,near){const dx=p.x-near.x,dz=p.z-near.z,len=Math.hypot(dx,dz)||1;return {...p,x:p.x+dx/len*6,z:p.z+dz/len*6};}
  const start=extend(first,a),end=extend(last,b);
  strip([start,...track,end],outer,tunnel.id+'-mountain-backing');
  strip([start,first],inner,tunnel.id+'-entrance-throat',lining);strip([last,end],inner,tunnel.id+'-exit-throat',lining);
  for(const [index,p] of [start,end].entries()){
   const positions=[],indices=[];const inside=section(p,inner),outside=section(p,outer);
   for(let j=0;j<inner.length;j++){positions.push(...inside.slice(j*3,j*3+3),...outside.slice(j*3,j*3+3));if(j){const k=j*2;indices.push(k-2,k-1,k,k-1,k+1,k);}}
   mesh(positions,indices,tunnel.id+'-mountain-collar-'+index);collars++;
  }
 }
 root.userData.mountainSeals={tunnels:tunnels.length,collars,innerHalfWidth:17,outerHalfWidth:20};
 return root.userData.mountainSeals;
}
export function createTunnelPortalPlanes(tunnels){
 return new Map(tunnels.map(t=>{const start=t.track[0],end=t.track.at(-1),a=t.track[1],b=t.track.at(-2),sl=Math.hypot(a.x-start.x,a.z-start.z)||1,el=Math.hypot(b.x-end.x,b.z-end.z)||1;return [t.id,{start,end,enter:{x:(a.x-start.x)/sl,z:(a.z-start.z)/sl},exit:{x:(b.x-end.x)/el,z:(b.z-end.z)/el}}];}));
}
export function canCarveTunnelSegment(segment,planes,x,z){
 if(!segment.a.tunnel||!segment.b.tunnel||!planes)return false;
 if(Math.hypot(segment.a.x-planes.start.x,segment.a.z-planes.start.z)<22&&(x-planes.start.x)*planes.enter.x+(z-planes.start.z)*planes.enter.z<-.001)return false;
 if(Math.hypot(planes.end.x-segment.b.x,planes.end.z-segment.b.z)<22&&(x-planes.end.x)*planes.exit.x+(z-planes.end.z)*planes.exit.z<-.001)return false;
 return true;
}
