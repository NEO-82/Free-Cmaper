// Derive junctions from the rendered centre lines, rather than repeated control points.
const cross=(a,b)=>a.x*b.z-a.z*b.x;
function pointAt(road,d){
 const t=road.track;let lo=0,hi=t.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(t[m].distance<d)lo=m;else hi=m;}
 const a=t[lo],b=t[hi],f=Math.max(0,Math.min(1,(d-a.distance)/(b.distance-a.distance||1)));
 return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f};
}
export function findRoadJunctions(roads){
 const cells=new Map(),events=[],segments=[];
 const add=(x,z,y,a,ta,b,tb)=>{
  if(Math.abs((a.a.y+(a.b.y-a.a.y)*ta)-(b.a.y+(b.b.y-b.a.y)*tb))>2)return;
  events.push({x,z,y,underground:!!(a.a.tunnel||a.b.tunnel||b.a.tunnel||b.b.tunnel),contacts:[{road:a.road,d:a.a.distance+(a.b.distance-a.a.distance)*ta},{road:b.road,d:b.a.distance+(b.b.distance-b.a.distance)*tb}]});
 };
 for(const road of roads)for(let i=1;i<road.track.length;i++){
  const a=road.track[i-1],b=road.track[i],s={a,b,road,i,id:segments.length};segments.push(s);
  for(let gx=Math.floor((Math.min(a.x,b.x)-1)/64);gx<=Math.floor((Math.max(a.x,b.x)+1)/64);gx++)for(let gz=Math.floor((Math.min(a.z,b.z)-1)/64);gz<=Math.floor((Math.max(a.z,b.z)+1)/64);gz++){
   const k=gx+':'+gz;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(s);
  }
 }
 const seen=new Set();
 for(const cell of cells.values())for(let i=0;i<cell.length;i++)for(let j=i+1;j<cell.length;j++){
  const a=cell[i],b=cell[j];if(a.road===b.road&&(Math.abs(a.i-b.i)<3||a.road.closed&&Math.abs(a.i-b.i)>a.road.track.length-4))continue;
  const k=a.id+':'+b.id;if(seen.has(k))continue;seen.add(k);
  const r={x:a.b.x-a.a.x,z:a.b.z-a.a.z},s={x:b.b.x-b.a.x,z:b.b.z-b.a.z},q={x:b.a.x-a.a.x,z:b.a.z-a.a.z},den=cross(r,s);
  if(Math.abs(den)>1e-9){const t=cross(q,s)/den,u=cross(q,r)/den;if(t>=0&&t<=1&&u>=0&&u<=1)add(a.a.x+t*r.x,a.a.z+t*r.z,a.a.y+t*(a.b.y-a.a.y),a,t,b,u);}
  // A branch may terminate between the two-metre samples of the receiving road.
  if(a.road!==b.road)for(const [branch,through] of [[a,b],[b,a]])for(const end of [0,1]){
   if(end?branch.i!==branch.road.track.length-1:branch.i!==1)continue;
   const p=end?branch.b:branch.a,dx=through.b.x-through.a.x,dz=through.b.z-through.a.z,t=Math.max(0,Math.min(1,((p.x-through.a.x)*dx+(p.z-through.a.z)*dz)/(dx*dx+dz*dz||1)));
   if(Math.hypot(p.x-through.a.x-t*dx,p.z-through.a.z-t*dz)<.75)add(p.x,p.z,p.y,branch,end,through,t);
  }
 }
 const groups=[];
 for(const e of events){let g=groups.find(g=>Math.hypot(g.x-e.x,g.z-e.z)<32&&Math.abs(g.y-e.y)<2);if(!g){g={x:e.x,z:e.z,y:e.y,underground:false,contacts:[]};groups.push(g);}g.underground||=e.underground;for(const c of e.contacts)if(!g.contacts.some(p=>p.road===c.road&&Math.abs(p.d-c.d)<32))g.contacts.push(c);}
 return groups.map(g=>{
  const headings=[];
  for(const {road,d} of g.contacts)for(const sign of [-1,1]){
   let sample=d+sign*40;if(road.closed)sample=(sample+road.length)%road.length;else {if(sign<0&&d<2||sign>0&&road.length-d<2)continue;sample=Math.max(0,Math.min(road.length,sample));}
   const p=pointAt(road,sample),angle=Math.atan2(p.x-g.x,p.z-g.z);
   if(!headings.some(h=>Math.abs(Math.atan2(Math.sin(h-angle),Math.cos(h-angle)))<.3))headings.push(angle);
  }
  return {x:g.x,z:g.z,y:g.y,underground:g.underground,arms:headings.length,roads:[...new Set(g.contacts.map(c=>c.road.id))]};
 }).filter(g=>g.arms>=3);
}
