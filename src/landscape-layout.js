/** Original geography interpreted from the supplied southwest-to-northeast island map. */
const SCALE=Math.sqrt(6);
export const WORLD=Object.freeze({minX:-870*SCALE,maxX:870*SCALE,minZ:-690*SCALE,maxZ:690*SCALE,landMaxX:1800});
export const SCENERY=Object.freeze({minX:-2610,maxX:2610,minZ:-2070,maxZ:2070});
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export const referencePoint=([x,z])=>({x:(x-50)*6.15-1200,z:(z-185)*7.5});
export function smoothPath(points,steps=12,closed=false){
 const out=[],n=points.length,at=i=>points[closed?(i%n+n)%n:clamp(i,0,n-1)];
 for(let i=0;i<(closed?n:n-1);i++)for(let j=0;j<steps;j++){
  const a=at(i-1),b=at(i),c=at(i+1),d=at(i+2),t=j/steps,t2=t*t,t3=t2*t;
  // Modest tangents round hairpins without large overshoots into neighbouring lanes.
  const tx=(c.x-a.x)*.32,tz=(c.z-a.z)*.32,ux=(d.x-b.x)*.32,uz=(d.z-b.z)*.32;
  out.push({x:(2*t3-3*t2+1)*b.x+(t3-2*t2+t)*tx+(-2*t3+3*t2)*c.x+(t3-t2)*ux,z:(2*t3-3*t2+1)*b.z+(t3-2*t2+t)*tz+(-2*t3+3*t2)*c.z+(t3-t2)*uz});
 }
 out.push({...points[closed?0:n-1]});return out;
}
const outline=[[56,278],[55,247],[75,213],[93,193],[124,180],[151,160],[188,147],[201,124],[205,100],[228,91],[242,71],[257,48],[285,37],[303,17],[321,24],[341,19],[350,40],[373,54],[389,70],[412,78],[429,92],[448,88],[458,72],[474,64],[482,80],[471,95],[481,119],[477,145],[490,164],[484,185],[486,205],[505,211],[515,199],[522,208],[513,226],[505,242],[511,260],[499,279],[481,287],[462,285],[449,266],[433,264],[415,278],[406,301],[391,318],[365,331],[340,344],[315,350],[286,359],[261,361],[234,366],[203,364],[179,369],[153,362],[128,362],[105,353],[87,342],[73,328],[68,309]].map(referencePoint);
export const ISLAND_OUTLINE=Object.freeze(smoothPath(outline,10,true));
export const ISLAND=Object.freeze({x:220,z:-50,rx:1500,rz:1450});
const rows=new Map(),shoreBuckets=new Map(),CELL=64;
const shoreSegments=ISLAND_OUTLINE.slice(1).map((b,i)=>({a:ISLAND_OUTLINE[i],b}));
for(const s of shoreSegments){
 for(let k=Math.floor(Math.min(s.a.z,s.b.z)/CELL);k<=Math.floor(Math.max(s.a.z,s.b.z)/CELL);k++){if(!rows.has(k))rows.set(k,[]);rows.get(k).push(s);}
 for(let x=Math.floor((Math.min(s.a.x,s.b.x)-192)/CELL);x<=Math.floor((Math.max(s.a.x,s.b.x)+192)/CELL);x++)for(let z=Math.floor((Math.min(s.a.z,s.b.z)-192)/CELL);z<=Math.floor((Math.max(s.a.z,s.b.z)+192)/CELL);z++){
  const key=`${x}:${z}`;if(!shoreBuckets.has(key))shoreBuckets.set(key,[]);shoreBuckets.get(key).push(s);
 }
}
export function shoreCrossings(z){const xs=[];for(const {a,b} of rows.get(Math.floor(z/CELL))??[])if((a.z>z)!==(b.z>z))xs.push(a.x+(b.x-a.x)*(z-a.z)/(b.z-a.z));return xs.sort((a,b)=>a-b);}
export function islandDistance(x,z){
 let inside=false;for(const {a,b} of rows.get(Math.floor(z/CELL))??[])if((a.z>z)!==(b.z>z)&&x<a.x+(b.x-a.x)*(z-a.z)/(b.z-a.z))inside=!inside;
 let best=256;for(const {a,b} of shoreBuckets.get(`${Math.floor(x/CELL)}:${Math.floor(z/CELL)}`)??[]){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);best=Math.min(best,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));}
 return inside?best:-best;
}
export function islandCoastPoint(angle){const t=((angle/(Math.PI*2))%1+1)%1*(ISLAND_OUTLINE.length-1),i=Math.floor(t),a=ISLAND_OUTLINE[i],b=ISLAND_OUTLINE[i+1];return {x:a.x+(b.x-a.x)*(t-i),z:a.z+(b.z-a.z)*(t-i)};}
export function islandCoastNormal(angle){const a=islandCoastPoint(angle-.002),b=islandCoastPoint(angle+.002),len=Math.hypot(b.x-a.x,b.z-a.z);return {x:(b.z-a.z)/len,z:-(b.x-a.x)/len};}
// A seeded coastal biome is stable across reloads and the offline build.
const biomeSeed=82021,biomeAngle=(.64+(biomeSeed%97)/970)*Math.PI*2;
const desertShore=islandCoastPoint(biomeAngle),desertNormal=islandCoastNormal(biomeAngle);
const desertCenter={x:desertShore.x-desertNormal.x*370,z:desertShore.z-desertNormal.z*370};
const desertMetric=(x,z)=>Math.hypot((x-desertCenter.x)/1.5,z-desertCenter.z)*(1+.075*Math.sin(x*.004+z*.002)+.045*Math.cos(z*.008));
const biomeSamples=[];
for(let x=WORLD.minX+25;x<WORLD.maxX;x+=50)for(let z=WORLD.minZ+25;z<WORLD.maxZ;z+=50)if(islandDistance(x,z)>0)biomeSamples.push(desertMetric(x,z));
biomeSamples.sort((a,b)=>a-b);
const desertRadius=biomeSamples[Math.min(biomeSamples.length-1,Math.round((WORLD.maxX-WORLD.minX)*(WORLD.maxZ-WORLD.minZ)*.15/2500))];
export const DESERT=Object.freeze({...desertCenter,radius:desertRadius,seed:biomeSeed,targetAreaFraction:.15});
export function desertAmount(x,z){return islandDistance(x,z)>0?1-smooth(desertRadius*.88,desertRadius,desertMetric(x,z)):0;}
export function isDesert(x,z){return islandDistance(x,z)>0&&desertMetric(x,z)<desertRadius;}
export function dunesHeight(x,z){
 const ridge=Math.sin(x*.014+Math.sin(z*.008)*2.4+z*.007)*.5+.5;
 return Math.max(.65,3+18*ridge**2+7*(.5+.5*Math.sin(z*.023-x*.006))**3+3*Math.sin((x+z)*.047));
}
export function grassPatch(x,z){return Math.sin(x*.008+Math.cos(z*.006)*1.7)*Math.sin(z*.009-x*.002)+.28*Math.sin((x+z)*.021)>.12;}
const bridgeZ=1120,bridgeEnd=shoreCrossings(bridgeZ)[0];
export const BRIDGE=Object.freeze({startX:bridgeEnd-500,endX:bridgeEnd,z:bridgeZ,length:500,width:22,height:4.5});
const width=BRIDGE.startX-WORLD.minX,area=(WORLD.maxX-WORLD.minX)*(WORLD.maxZ-WORLD.minZ);
export const MAINLAND=Object.freeze({minX:WORLD.minX,maxX:BRIDGE.startX,minZ:WORLD.maxZ-area*.05/width,maxZ:WORLD.maxZ});
export const ARRIVAL=Object.freeze({x:BRIDGE.startX-140,z:bridgeZ});
export const MOUNTAINS=Object.freeze([
 {id:'cedar',x:-320,z:-200,height:310,radius:32,rx:500,rz:540,drivable:true},
 {id:'sunrise',x:650,z:150,height:245,radius:30,rx:450,rz:500,drivable:true},
 {id:'cloud',x:280,z:-860,height:410,radius:18,rx:430,rz:420,drivable:false},
 {id:'fern',x:-420,z:500,height:205,radius:18,rx:330,rz:300,drivable:false},
 {id:'stone',x:1030,z:-520,height:350,radius:18,rx:420,rz:410,drivable:false},
].map(Object.freeze));
export const SUMMITS=Object.freeze(MOUNTAINS.filter(m=>m.drivable)),SUMMIT=SUMMITS[0];
export const MOUNTAIN_PEAKS=Object.freeze(MOUNTAINS.flatMap((m,i)=>[[.64,-.3,.86],[-.55,-.42,.82],[-.38,.65,.74]].map(([x,z,h],j)=>Object.freeze({x:m.x+x*m.rx,z:m.z+z*m.rz,height:m.height*h,rx:m.rx*(.29+j*.025),rz:m.rz*(.31+j*.02),phase:i+j}))));
export const MOUNTAIN_RIDGES=MOUNTAINS,ROCK_SHELVES=Object.freeze([]);
export const LAKE=Object.freeze({x:-800,z:250,radiusX:55,radiusZ:42});
// Local +Z faces the access lane. Entire settlements remain clear of main roads.
export const VILLAGE_SITES=Object.freeze([
 {x:-923,z:725,heading:-2.5442737980723926,id:'stone-village',name:'돌담 마을'},
 {x:176,z:38,heading:-.579861123394205,id:'pine-village',name:'솔바람 마을'},
 {x:641,z:712,heading:2.257152245384367,id:'sunset-village',name:'노을 마을'},
].map(v=>Object.freeze({...v,radius:82})));
export function villagePoint(v,x,z){const c=Math.cos(v.heading),s=Math.sin(v.heading);return {x:v.x+c*x+s*z,z:v.z-s*x+c*z};}
export const RIVER_START=280,COAST_START=WORLD.landMaxX-35;
export function riverX(z){return LAKE.x+Math.sin((z-RIVER_START)*.03)*19;}
export function mainlandDistance(x,z){return Math.min(x-MAINLAND.minX,MAINLAND.maxX-x,z-MAINLAND.minZ,MAINLAND.maxZ-z);}
export function coastDistance(x,z){return Math.max(islandDistance(x,z),mainlandDistance(x,z));}
export function bridgeSurfaceAt(x,z){if(Math.abs(z-BRIDGE.z)>BRIDGE.width/2||x<BRIDGE.startX-60||x>BRIDGE.endX+60)return null;return 2.5+2*Math.min(smooth(BRIDGE.startX-60,BRIDGE.startX,x),1-smooth(BRIDGE.endX,BRIDGE.endX+60,x));}
export function mountainHeight(x,z){
 let h=2.5;
 for(let i=0;i<MOUNTAINS.length;i++){const m=MOUNTAINS[i],dx=(x-m.x)/m.rx,dz=(z-m.z)/m.rz,a=Math.atan2(dz,dx),r=Math.hypot(dx,dz)/(1+.12*Math.sin(a*3+i)+.06*Math.cos(a*7-i));h=Math.max(h,2.5+(m.height-2.5)*(1-smooth(.07,1.18,r)));}
 for(const p of MOUNTAIN_PEAKS){const d=Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz);h=Math.max(h,2.5+(p.height-2.5)*(1-smooth(.04,1.25,d)));}
 const rugged=(Math.sin(x*.037+Math.sin(z*.014)*2)*Math.sin(z*.031)+.45*Math.sin((x+z)*.067))*Math.min(17,h*.055);
 h+=rugged;
 for(const m of MOUNTAINS){const d=Math.hypot(x-m.x,z-m.z),blend=1-smooth(m.radius,m.radius+12,d);h=h*(1-blend)+m.height*blend;}
 return h;
}
export function naturalLandscapeHeight(x,z){
 const bridge=bridgeSurfaceAt(x,z);if(bridge!==null)return bridge;
 const coast=coastDistance(x,z);if(coast<=0)return -.15-Math.min(8,-coast*.06);
 let h=Math.max(.65,2.5+Math.sin(x*.026)*Math.cos(z*.021)*2.2+Math.sin(x*.012+z*.041)*1.15);
 if(islandDistance(x,z)>0)h=Math.max(h,2.5+(mountainHeight(x,z)-2.5)*Math.max(smooth(90,300,coast),...MOUNTAINS.map(m=>1-smooth(m.radius,m.radius+20,Math.hypot(x-m.x,z-m.z)))));
 const desert=desertAmount(x,z)*(1-smooth(35,90,h));h=h*(1-desert)+dunesHeight(x,z)*desert;
 h=h*smooth(0,35,coast)-.15*(1-smooth(0,35,coast));
 const lake=Math.hypot((x-LAKE.x)/LAKE.radiusX,(z-LAKE.z)/LAKE.radiusZ);
 if(lake<1)h=-3+2.9*smooth(.89,1,lake);else if(lake<1.08)h=-.1+(h+.1)*smooth(1,1.08,lake);
 if(z>=RIVER_START&&islandDistance(x,z)>0){const bank=Math.abs(x-riverX(z));if(bank<5.5)h=-2.4+2.3*smooth(3.5,5.5,bank);else if(bank<14)h=.15+(Math.max(.65,h)-.15)*smooth(5.5,14,bank);}
 return h;
}
