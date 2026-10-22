import {findRoadJunctions} from './road-topology.js';
import {ARRIVAL,BRIDGE,SUMMITS,VILLAGE_SITES,villagePoint,referencePoint,smoothPath,naturalLandscapeHeight,clamp,smooth} from './landscape-layout.js';
export const ROAD_WIDTH=22,PAVEMENT_WIDTH=18,TRAIL_WIDTH=22,TRAIL_SAMPLES=1200;
const zigzag=[[400,520],[420,460],[360,420],[-340,380],[-380,320],[-320,280],[280,240],[320,180],[260,140],[-220,110],[-250,65],[-190,20],[-120,-30],[-150,-110],[-70,-140],[40,-100],[65,-60],[0,0]];
const scenic=[[-440,470],[-380,430],[-300,400],[-350,280],[-400,180],[-360,100],[-250,120],[-100,240],[120,300],[300,240],[360,120],[300,20],[190,-40],[150,-160],[60,-250],[-80,-260],[-170,-170],[-150,-60],[-60,-20],[0,0]];
function arcPath(controls,closed=false){const points=smoothPath(controls,24,closed);let length=0;points.forEach((p,i)=>{if(i)length+=Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z);p.distance=length;});return {points,length};}
function atPath(path,t){const distance=clamp(t,0,1)*path.length;let lo=0,hi=path.points.length-2;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(path.points[mid].distance<=distance)lo=mid;else hi=mid-1;}const a=path.points[lo],b=path.points[lo+1],f=(distance-a.distance)/(b.distance-a.distance||1);return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f};}
const summitPaths=SUMMITS.map((m,i)=>arcPath((i?scenic:zigzag).map(([x,z])=>({x:m.x+x,z:m.z+z}))));
export function trailPoint(t,index=0){return atPath(summitPaths[index]??summitPaths[0],t);}
const starts=SUMMITS.map((_,i)=>trailPoint(0,i));
export const SHOP_SITES=Object.freeze([{id:'parking',x:ARRIVAL.x-15,z:ARRIVAL.z-45},{id:'island-entry',x:BRIDGE.endX+100,z:BRIDGE.z-36},...starts.map((p,i)=>({id:SUMMITS[i].id+'-gate',x:p.x-60,z:p.z+60})),...VILLAGE_SITES.map(v=>({id:v.id+'-shop',...villagePoint(v,0,-60)}))].map(Object.freeze));
export const SHOP=SHOP_SITES[0];
const coastRefs=[[75,320],[65,272],[85,235],[115,206],[160,180],[190,153],[215,112],[253,81],[271,53],[310,49],[352,50],[362,76],[402,87],[439,99],[437,142],[436,181],[444,216],[467,235],[493,240],[501,261],[491,275],[475,277],[459,266],[447,255],[414,275],[402,301],[379,314],[352,331],[326,343],[300,349],[270,353],[234,359],[195,354],[159,352],[127,349],[98,338]];
const refRoute=points=>points.map(referencePoint);
const coastControls=refRoute(coastRefs),bridgeJunction=arcPath(coastControls,true).points.reduce((a,b)=>Math.hypot(a.x-BRIDGE.endX-80,a.z-BRIDGE.z)<Math.hypot(b.x-BRIDGE.endX-80,b.z-BRIDGE.z)?a:b);
const mainNetwork=[
 [ARRIVAL,{x:BRIDGE.startX,z:BRIDGE.z},{x:BRIDGE.endX,z:BRIDGE.z},{x:BRIDGE.endX+60,z:BRIDGE.z},bridgeJunction],
 coastControls,
 // Two independent inland bypasses connect through the coastal loop.
 // Mountain base hubs each have two approach arms, one summit arm and one shop driveway.
 [referencePoint([65,272]),{x:-950,z:550},{x:-730,z:380},{x:-520,z:270},{x:-220,z:260},starts[0]],
 [starts[0],{x:230,z:310},{x:350,z:170},{x:323,z:55},{x:360,z:-80},{x:460,z:-360},{x:660,z:-650},referencePoint([352,50])],
 [referencePoint([414,275]),{x:900,z:610},{x:790,z:560},{x:640,z:540},{x:440,z:600},starts[1]],
 [starts[1],{x:170,z:830},{x:80,z:1070},referencePoint([234,359])],
 ...starts.map((p,i)=>[p,{x:SHOP_SITES[i+2].x,z:SHOP_SITES[i+2].z+14}]),
];
const mainPaths=mainNetwork.map((p,i)=>arcPath(p,i===1));
const mainHubs=[bridgeJunction,referencePoint([65,272]),referencePoint([352,50]),referencePoint([414,275]),referencePoint([234,359]),...starts];
const accessNetwork=VILLAGE_SITES.map(v=>{
 const entry=villagePoint(v,0,96),end=villagePoint(v,0,21);
 const anchor=mainPaths.flatMap(p=>p.points).filter(p=>naturalLandscapeHeight(p.x,p.z)<10&&mainHubs.every(j=>Math.hypot(p.x-j.x,p.z-j.z)>160)).reduce((a,b)=>Math.hypot(a.x-entry.x,a.z-entry.z)<Math.hypot(b.x-entry.x,b.z-entry.z)?a:b);
 return [anchor,entry,end];
});
export const ROAD_NETWORK=Object.freeze([...mainNetwork,...accessNetwork]);
const paths=ROAD_NETWORK.map((p,i)=>arcPath(p,i===1));
export function roadPoint(t,branch=0){return atPath(paths[branch]??paths[0],t);}
function makeRoad(id,path,{summit=null,closed=false,kind='inland'}={}){
 const count=Math.ceil(path.length/2),track=Array.from({length:count+1},(_,i)=>{const p=atPath(path,i/count),distance=i/count*path.length;
  const y=summit?2.5+(summit.height-2.5)*smooth(0,1,distance/(path.length-32)):id==='gateway'?(p.x>=BRIDGE.startX-60&&p.x<=BRIDGE.endX+60&&Math.abs(p.z-BRIDGE.z)<BRIDGE.width/2?2.5+2*Math.min(smooth(BRIDGE.startX-60,BRIDGE.startX,p.x),1-smooth(BRIDGE.endX,BRIDGE.endX+60,p.x)):2.5):2.5;
  return {...p,y,distance,tunnel:false};});
 return {id,kind,track,length:path.length,width:kind==='village'?8:ROAD_WIDTH,pavementWidth:kind==='village'?6.5:PAVEMENT_WIDTH,summit,closed};
}
export const ROADS=paths.map((p,i)=>makeRoad(i===0?'gateway':i===1?'coastal-loop':'inland-'+i,p,{kind:i>=mainNetwork.length?'village':i===1?'coast':'inland',closed:i===1}));
export const TRAILS=SUMMITS.map((mountain,index)=>{const road=makeRoad(mountain.id+'-summit',summitPaths[index],{summit:mountain,kind:'summit'});ROADS.push(road);return {...road,mountain,index};});
const openJunctions=findRoadJunctions(ROADS);
// Every low road that crosses solid mountain cover receives a complete tunnel.
export const TUNNELS=[];
for(const road of ROADS.filter(r=>!r.summit&&r.id!=='gateway')){
 const flags=road.track.map(p=>naturalLandscapeHeight(p.x,p.z)>p.y+13&&openJunctions.every(j=>Math.hypot(p.x-j.x,p.z-j.z)>90));let begin=-1;
 for(let i=0;i<=flags.length;i++){
  if(flags[i]&&begin<0)begin=i;
  if((!flags[i]||i===flags.length)&&begin>=0){const end=i-1;
   if(road.track[end].distance-road.track[begin].distance>=110){
    const a=Math.max(0,begin-4),b=Math.min(road.track.length-1,end+4),tunnel={id:'tunnel-'+TUNNELS.length,road,start:a,end:b,track:road.track.slice(a,b+1),length:road.track[b].distance-road.track[a].distance};
    for(let j=a;j<=b;j++){road.track[j].tunnel=true;road.track[j].tunnelId=tunnel.id;}TUNNELS.push(tunnel);
   }begin=-1;
  }
 }
}
const CELL=32,buckets=new Map();
for(const road of ROADS)for(let i=1;i<road.track.length;i++){
 const a=road.track[i-1],b=road.track[i],s={a,b,road,tunnel:a.tunnel||b.tunnel,tunnelId:a.tunnelId??b.tunnelId};
 for(let gx=Math.floor((Math.min(a.x,b.x)-38)/CELL);gx<=Math.floor((Math.max(a.x,b.x)+38)/CELL);gx++)for(let gz=Math.floor((Math.min(a.z,b.z)-38)/CELL);gz<=Math.floor((Math.max(a.z,b.z)+38)/CELL);gz++){
  const key=`${gx}:${gz}`;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(s);
 }
}
export function roadSurfaceAt(x,z,{summitOnly=false,altitude=Infinity,excludeRoad=null}={}){
 const nearest=new Map();
 for(const s of buckets.get(`${Math.floor(x/CELL)}:${Math.floor(z/CELL)}`)??[]){
  if(s.road===excludeRoad||summitOnly&&!s.road.summit)continue;
  const {a,b}=s,dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1),px=a.x+t*dx,pz=a.z+t*dz,distance=Math.hypot(x-px,z-pz);
  if(distance<(nearest.get(s.road)?.distance??Infinity))nearest.set(s.road,{distance,height:a.y+t*(b.y-a.y),tunnel:s.tunnel,tunnelId:s.tunnelId,road:s.road,x:px,z:pz,heading:Math.atan2(dx,dz)});
 }
 let best=Infinity,result={distance:Infinity,height:2.5,tunnel:false,road:null,x,z,heading:0};
 for(const p of nearest.values()){
  const score=p.distance<12?(Number.isFinite(altitude)?Math.abs(p.height-altitude)*.3+p.distance*.001:-p.height*.3+p.distance*.001):1000+p.distance;
  if(score<best){best=score;result=p;}
 }return result;
}
export function trailSurfaceAt(x,z){const p=roadSurfaceAt(x,z,{summitOnly:true});return {...p,mountain:p.road?.summit??SUMMITS[0]};}
export const roadDistance=(x,z)=>roadSurfaceAt(x,z).distance;
export function tunnelAt(x,z,altitude=-Infinity){const p=roadSurfaceAt(x,z,{altitude:Number.isFinite(altitude)?altitude:-100});return p.tunnel&&p.distance<10.8&&altitude<p.height+11?p:null;}
export function tunnelCeilingAt(x,z,altitude=-Infinity){const p=tunnelAt(x,z,altitude);return p?p.height+5.8+4.8*Math.sqrt(Math.max(0,1-(p.distance/11.2)**2)):Infinity;}
export const ROAD_JUNCTIONS=findRoadJunctions(ROADS);

/** Lower the rendered terrain beneath every exposed road, including crossings.
 * Six metres of margin cover a four-metre terrain cell diagonal. Tunnel roofs stay intact. */
export function roadUnderlayLimit(x,z,height){
 for(const s of buckets.get(`${Math.floor(x/CELL)}:${Math.floor(z/CELL)}`)??[]){
  if(s.tunnel)continue;
  const {a,b}=s,dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);
  const distance=Math.hypot(x-a.x-t*dx,z-a.z-t*dz),edge=s.road.width/2+6;
  if(distance>edge+10)continue;
  const blend=clamp((edge+10-distance)/10,0,1),ceiling=a.y+t*(b.y-a.y)-1.5;
  if(height>ceiling)height+=(ceiling-height)*blend;
 }
 return height;
}
