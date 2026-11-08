import sys,json
from direct_launch import start_trip
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page();page.add_init_script('window.requestAnimationFrame=()=>0');page.route('**/@vite/client',lambda r:r.fulfill(body='',content_type='application/javascript'));page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded',timeout=240000);start_trip(page,'helicopter')
 result=page.evaluate('''()=>{const q=__portalQA,w=q.data.MOUNTAIN_WATERS,mesh=q.scene.getObjectByName('continuous-mountain-stream-and-waterfall'),a=mesh.geometry.attributes.position;
let blocked=0,worst=0,examples=[];
for(let i=0;
i<a.count;
i++){const x=a.getX(i),z=a.getZ(i),water=a.getY(i),source=w.sourceLake,lower=w.lowerLake;
if(Math.hypot((x-source.x)/source.radiusX,(z-source.z)/source.radiusZ)<1.05||w.lakeDistance(x,z)<1.05)continue;
const terrain=q.world.renderedTerrainHeight(x,z),excess=terrain-(water-.2);
if(excess>0){blocked++;
worst=Math.max(worst,excess);
if(examples.length<8)examples.push({x,z,water,terrain});
}}let intrusions=[];
for(const c of q.world.colliders){if(String(c.id??'').includes('tunnel'))continue;
const r=c.radius??Math.hypot((c.maxX-c.minX)/2,(c.maxZ-c.minZ)/2),x=c.x??(c.minX+c.maxX)/2,z=c.z??(c.minZ+c.maxZ)/2;
for(let i=0;
i<9;
i++){const px=x+(i?Math.cos(i/8*Math.PI*2)*r:0),pz=z+(i?Math.sin(i/8*Math.PI*2)*r:0),ceiling=q.data.tunnelTerrainCutHeight(px,pz);
if((c.minY??0)<ceiling&&(c.maxY??99)>2.5){intrusions.push({id:c.id,x,z,r,minY:c.minY,ceiling});
break;
}}}let tunnelSamples=0,terrainIntrusions=[];
const repair=q.world.roadView.root.userData.portalGroundRepair;
for(const tunnel of q.tunnels)for(let i=1;
i<tunnel.track.length;
i++){const a=tunnel.track[i-1],b=tunnel.track[i],length=Math.hypot(b.x-a.x,b.z-a.z);
for(let along=0;
along<=length;
along+=4)for(let lateral=-16;
lateral<=16;
lateral+=2){const t=along/(length||1),x=a.x+(b.x-a.x)*t+(b.z-a.z)/(length||1)*lateral,z=a.z+(b.z-a.z)*t-(b.x-a.x)/(length||1)*lateral,ceiling=a.y+(b.y-a.y)*t+5.8+4.8*Math.sqrt(1-(lateral/17)**2),raw=q.world.renderedTerrainHeight(x,z);
tunnelSamples++;
if(raw>2.48&&raw<ceiling&&(!q.world.roadView.groundOpeningAt(x,raw,z)||repair.ceilingAt(x,z)<raw))terrainIntrusions.push({id:tunnel.id,x,z,raw,ceiling,mask:repair.ceilingAt(x,z)});
}}return {tunnelSamples,terrainIntrusions:terrainIntrusions.slice(0,10),terrainIntrusionCount:terrainIntrusions.length,outlet:w.points.at(-1),outletLand:q.data.islandDistance(w.points.at(-1).x,w.points.at(-1).z),blocked,worst,examples,intrusions:intrusions.slice(0,20),intrusionCount:intrusions.length,rows:a.count/5};
}''');print(json.dumps(result),flush=True);assert result['terrainIntrusionCount']==0,result;assert result['blocked']==0,result;assert result['intrusionCount']==0,result;assert result['outletLand']<0 and result['outlet']['y']==0,result;b.close()
