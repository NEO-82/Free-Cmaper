from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page(viewport={'width':800,'height':550});errors=[]
 page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR '+str(e),flush=True)));page.on('console',lambda m:(errors.append(m.text),print('CONSOLE ERROR '+m.text,flush=True)) if m.type=='error' else None)
 page.add_init_script('const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>raf(t=>{if(!window.__freeze)fn(t)});')
 page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded',timeout=240000);page.wait_for_function('!!window.__portalQA',timeout=240000)
 print('BOOT READY',flush=True)
 page.evaluate('const q=__portalQA,original=q.renderer.render.bind(q.renderer);q.renderer.render=(...a)=>{if(!window.__skipRender)original(...a)};window.__skipRender=true')
 page.locator('#start').click(timeout=240000);page.locator('[data-mode="helicopter"]').click();page.locator('#begin-prep').click();page.wait_for_function('__portalQA.phase==="world"')
 page.evaluate('window.__freeze=true;document.querySelector("#hud").style.display="none";__portalQA.renderer.shadowMap.enabled=false;__portalQA.renderer.setPixelRatio(.5);__portalQA.renderer.setSize(320,220,false);__portalQA.camera.far=150;__portalQA.camera.updateProjectionMatrix()')
 result=page.evaluate('''()=>{
  const q=__portalQA,world=q.world,repair=world.roadView.root.userData.portalGroundRepair,foundation=repair.foundation;
  q.scene.updateMatrixWorld(true);const origin=new q.Vector3(),down=new q.Vector3(0,-1,0),ray=new q.Raycaster();let portals=0,samples=0,removed=0,preserved=0,supported=0;
  const floors=[foundation,...world.roadView.roadMeshes];world.roadView.root.traverse(o=>{if(o.name.includes('-floor-'))floors.push(o)});
  const failures=[];
  for(const t of q.tunnels)for(const side of [0,1]){
   const p=t.track[side?t.track.length-1:0],near=t.track[side?t.track.length-2:1],len=Math.hypot(near.x-p.x,near.z-p.z),dx=(near.x-p.x)/len,dz=(near.z-p.z)/len;portals++;
   for(const along of [-48,-30,-12,0,15,40,70])for(const across of [-21,-18,-14,-11,0,11,14,18,21]){
    const x=p.x+dx*along+dz*across,z=p.z+dz*along-dx*across,ceiling=repair.ceilingAt(x,z),raw=world.renderedTerrainHeight(x,z);if(!Number.isFinite(ceiling)||raw<=0||raw>=ceiling)continue;samples++;
    if(raw<=ceiling-11.32){preserved++;if(world.roadView.groundOpeningAt(x,raw,z))failures.push({t:t.id,side,x,z,reason:'floor removed'});continue;}
    removed++;origin.set(x,ceiling+.1,z);ray.set(origin,down);ray.near=0;ray.far=ceiling;
    const hit=ray.intersectObjects(floors,false).find(h=>h.point.y>.2&&h.point.y<ceiling);if(hit)supported++;else failures.push({t:t.id,side,x,z,raw,ceiling,reason:'sea hole'});
   }
  }
  if(failures.length)throw Error(JSON.stringify(failures));
  const upper=q.scene.getObjectByName('summit-lake-water'),lower=q.scene.getObjectByName('waterfall-lower-lake');if(!upper||!lower||world.mountainWaters.getState().fallHeight!==65)throw Error('Current lake edition not preserved');
  return {tunnels:q.tunnels.length,portals,samples,previouslyRemoved:removed+preserved,preserved,supported,foundationCells:repair.cells,foundationSpans:repair.spans,lakeHeight:upper.position.y,lowerLakeHeight:lower.position.y,helicopter:q.vehicle.state.kind};
 }''');print('PORTAL GROUND '+json.dumps(result),flush=True)
 assert result['portals']==20 and result['supported']>0 and result['preserved']>0,result
 for i in range(result['portals']):
  page.evaluate('''i=>{const q=__portalQA,t=q.tunnels[Math.floor(i/2)],end=i%2,p=t.track[end?t.track.length-1:0],a=t.track[end?t.track.length-2:1],len=Math.hypot(a.x-p.x,a.z-p.z),dx=(a.x-p.x)/len,dz=(a.z-p.z)/len;q.camera.position.set(p.x-dx*27+dz*5,p.y+5,p.z-dz*27-dx*5);q.camera.lookAt(p.x+dx*20,p.y+.3,p.z+dz*20);q.world.roadView.update({x:p.x,y:p.y+1,z:p.z});window.__skipRender=false;q.renderer.render(q.scene,q.camera);q.renderer.getContext().finish();window.__skipRender=true;}''',i)
  print('RENDERED PORTAL '+str(i),flush=True)
 print('ALL 20 PORTALS RENDERED',flush=True);print('ERRORS '+json.dumps(errors),flush=True);assert not errors
 b.close()
