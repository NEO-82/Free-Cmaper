"""Validate seeded streams in the active world and render alpine/desert/water views."""
import sys,json,base64
from pathlib import Path
from direct_launch import start_trip
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1000,'height':700});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('window.requestAnimationFrame=()=>0')
 page.route('**/@vite/client',lambda r:r.fulfill(body='',content_type='application/javascript'))
 page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded',timeout=240000)
 start_trip(page,'helicopter')
 result=page.evaluate('''()=>{
 const q=__portalQA,d=q.data,waters=d.ADDITIONAL_WATERS.waters;
 for(const w of waters)for(const p of w.points){if(!d.isWater(p.x,p.z)||Math.abs(d.waterSurfaceAt(p.x,p.z)-d.ADDITIONAL_WATERS.waterAt(p.x,p.z))>.01)throw Error('Water physics mismatch');}
 let blocked=0,road=0,total=0;
 for(const w of waters){const mesh=q.scene.getObjectByName(w.id).getObjectByName(w.id+'-continuous-mountain-stream-and-waterfall'),a=mesh.geometry.attributes.position;
 for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i),y=a.getY(i);
 if([w.sourceLake,w.lowerLake].some(p=>Math.hypot((x-p.x)/p.radiusX,(z-p.z)/p.radiusZ)<1.1))continue;
 total++;if(q.world.renderedTerrainHeight(x,z)>y-.15)blocked++;
 if(d.roadSurfaceAt(x,z).distance<45)road++;
 }}
 return {waters:waters.map(w=>({id:w.id,mountain:w.mountainId,length:w.points.length*32,drop:w.points[0].y-w.points.at(-1).y,fall:w.waterfall.height,source:w.sourceLake,pool:w.lowerLake})),blocked,road,total};
 }''')
 print(json.dumps(result),flush=True)
 assert len(result['waters'])==4,result
 assert result['total']>1000 and result['blocked']==0 and result['road']==0,result
 for label in ['alpine','desert','water']:
  data=page.evaluate('''label=>{const q=__portalQA,d=q.data;let x,z,y;
  if(label==='alpine'){const m=d.MOUNTAINS.find(m=>m.id==='cloud');x=m.x;z=m.z;y=d.naturalLandscapeHeight(x,z);}
  else if(label==='water'){const w=d.ADDITIONAL_WATERS.waters[0];const p=w.points[Math.floor(w.points.length/2)];x=p.x;z=p.z;y=p.y;}
  else {let best=0;for(let a=d.WORLD.minX;a<d.WORLD.maxX;a+=65)for(let b=d.WORLD.minZ;b<d.WORLD.maxZ;b+=65)if(d.isDesert(a,b)&&d.dunesHeight(a,b)>best){best=d.dunesHeight(a,b);x=a;z=b;y=best;}}
  q.scene.fog.density=.0003;q.camera.far=1800;q.camera.updateProjectionMatrix();q.renderer.shadowMap.enabled=false;q.renderer.setPixelRatio(.7);q.renderer.setSize(1000,700,false);q.camera.position.set(x+(label==='desert'?95:label==='alpine'?800:270),y+(label==='desert'?14:label==='alpine'?130:210),z+(label==='desert'?110:label==='alpine'?950:310));q.camera.lookAt(x,y,z);q.scene.updateMatrixWorld(true);q.renderer.render(q.scene,q.camera);q.renderer.getContext().finish();return q.renderer.domElement.toDataURL('image/png');
  }''',label)
  open('/tmp/camper-landscape-'+label+'.png','wb').write(base64.b64decode(data.split(',')[1]))
 print(json.dumps({'errors':errors}),flush=True)
 assert not errors
 b.close()
