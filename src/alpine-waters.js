import {createStreamClearance} from './stream-clearance.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

// Broad wind-shaped crests: 2–15m, with no conical peaks or high-frequency spikes.
export function roundedDunes(x,z){
 const u=x*.018+z*.007+Math.sin(z*.008)*.65;
 const v=z*.023-x*.006;
 return 2+9*(.5+.5*Math.sin(u))**2+4*(.5+.5*Math.sin(v+.6*Math.sin(u)))**2;
}
export function alpineRelief(x,z,mountain){
 const dx=(x-mountain.x)/mountain.rx,dz=(z-mountain.z)/mountain.rz;
 const mask=1-smooth(.15,1.05,Math.hypot(dx,dz));
 const ridge=Math.max(0,1-Math.abs(dz+.16*Math.sin(dx*7))/.28);
 const shoulders=Math.exp(-(((dx+.25)/.22)**2)-((dz-.12)/.5)**2);
 return mask*(260*ridge*(1-.32*Math.abs(Math.sin(dx*9)))+80*shoulders);
}
export function alpineHeight(x,z,mountain,existing){
 const r=Math.hypot((x-mountain.x)/mountain.rx,(z-mountain.z)/mountain.rz);
 const blend=1-smooth(.55,1.1,r);
 const massif=2.5+(mountain.height-2.5)*Math.max(0,1-r/1.18)**1.15;
 const foldedRock=12*Math.sin(x*.018+Math.sin(z*.009))*Math.sin(z*.017);
 return existing*(1-blend)+(massif+alpineRelief(x,z,mountain)+foldedRock)*blend;
}
export function alpineSnow(x,z,height,mountain){
 const distance=Math.hypot((x-mountain.x)/mountain.rx,(z-mountain.z)/mountain.rz);
 const snowline=mountain.height*.85+14*Math.sin(x*.018)+10*Math.cos(z*.022);
 return (1-smooth(.65,1.05,distance))*smooth(snowline,snowline+65,height);
}

/** Seeded downhill channels; reject every reach near roads/settlements.
 * Water, rendered bed, swimming and map queries share the same indexed paths. */
export function createAlpineWaters({mountains,heightAt,blocked,seed=82114,count=4,gridStep=10}){
 let state=seed>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const waters=[];
 for(const mountain of mountains.filter(m=>!m.drivable)){
  for(let attempt=0;attempt<24&&waters.filter(w=>w.mountainId===mountain.id).length<1;attempt++){
   const angle=random()*Math.PI*2,offset=.2+random()*.22;
   let x=mountain.x+Math.cos(angle)*mountain.rx*offset,z=mountain.z+Math.sin(angle)*mountain.rz*offset;
   if(blocked(x,z)||waters.some(w=>w.points.some(p=>Math.hypot(x-p.x,z-p.z)<130)))continue;
   let y=heightAt(x,z)-.7,heading=angle;
   const points=[{x,z,y,width:13+random()*5}];
   for(let step=0;step<42;step++){
    const candidates=[];
    for(let j=0;j<11;j++){
     const direction=heading+(j-5)*.19+(random()-.5)*.12;
     const nx=x+Math.cos(direction)*32,nz=z+Math.sin(direction)*32;
     if(blocked(nx,nz)||points.slice(0,-4).some(p=>Math.hypot(nx-p.x,nz-p.z)<58))continue;
     const h=heightAt(nx,nz);
     if(h>y+24||h<5)continue;
     candidates.push({x:nx,z:nz,h,direction,score:h+Math.abs(j-5)*1.7});
    }
    candidates.sort((a,b)=>a.score-b.score);
    if(!candidates.length)break;
    const next=candidates[0];x=next.x;z=next.z;heading=next.direction;
    y=Math.min(y-.16,next.h-.7);
    points.push({x,z,y,width:points[0].width+step*.08});
   }
   if(points.length<13||points[0].y-points.at(-1).y<45)continue;
   // A short rock step makes a visible cascade, followed by a descending valley.
   let fall=1;
   for(let i=2;i<points.length-2;i++)if(points[i-1].y-points[i].y>points[fall-1].y-points[fall].y)fall=i;
   const top=points[fall-1],bottom=points[fall],drop=top.y-bottom.y;
   if(drop>8){bottom.x=top.x+(bottom.x-top.x)*.28;bottom.z=top.z+(bottom.z-top.z)*.28;}
   const first=points[0],last=points.at(-1);
   const sourceLake={x:first.x,z:first.z,level:first.y,radiusX:12,radiusZ:10,depth:3};
   const lowerLake={x:last.x,z:last.z,level:last.y,radiusX:23,radiusZ:19,depth:4};
   waters.push({id:`mountain-stream-${waters.length+1}`,mountainId:mountain.id,points,sourceLake,lowerLake,waterfall:{top,bottom,height:drop,width:first.width}});
  }
  if(waters.length>=count)break;
 }
 const buckets=new Map(),cell=64;
 for(const w of waters)for(let i=1;i<w.points.length;i++){
  const a=w.points[i-1],b=w.points[i],margin=48;
  for(let bx=Math.floor((Math.min(a.x,b.x)-margin)/cell);bx<=Math.floor((Math.max(a.x,b.x)+margin)/cell);bx++)for(let bz=Math.floor((Math.min(a.z,b.z)-margin)/cell);bz<=Math.floor((Math.max(a.z,b.z)+margin)/cell);bz++){
   const key=`${bx}:${bz}`;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push({a,b});
  }
 }
 function channelAt(x,z){
  let nearest=null;
  for(const {a,b} of buckets.get(`${Math.floor(x/cell)}:${Math.floor(z/cell)}`)??[]){
   const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);
   const distance=Math.hypot(x-a.x-dx*t,z-a.z-dz*t),halfWidth=(a.width+(b.width-a.width)*t)/2;
   if(!nearest||distance<nearest.distance)nearest={distance,halfWidth,height:a.y+(b.y-a.y)*t};
  }
  return nearest;
 }
 const pools=waters.flatMap(w=>[w.sourceLake,w.lowerLake]);
 const clearers=waters.map(w=>createStreamClearance(w.points,gridStep));
 function waterAt(x,z){
  for(const p of pools)if(Math.hypot((x-p.x)/p.radiusX,(z-p.z)/p.radiusZ)<1)return p.level;
  const c=channelAt(x,z);return c&&c.distance<c.halfWidth?c.height:null;
 }
 function terrain(x,z,height){
  if(!buckets.has(`${Math.floor(x/cell)}:${Math.floor(z/cell)}`)&&!pools.some(p=>Math.hypot((x-p.x)/p.radiusX,(z-p.z)/p.radiusZ)<1.8))return height;
  const base=heightAt(x,z);
  for(const clear of clearers){const bed=clear(x,z,base);if(bed<base)height=Math.min(height,bed);}
  for(const p of pools){const r=Math.hypot((x-p.x)/p.radiusX,(z-p.z)/p.radiusZ);if(r<1.8){const b=smooth(.7,1.8,r);height=Math.min(height,(p.level-p.depth)*(1-b)+base*b);}}
  return height;
 }
 return {waters,waterAt,terrain,channelAt};
}
