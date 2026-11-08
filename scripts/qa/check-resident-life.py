from direct_launch import start_trip
from playwright.sync_api import sync_playwright
import json,base64
from pathlib import Path
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page(viewport={'width':900,'height':650});errors=[]
 page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR '+str(e),flush=True)));page.on('console',lambda m:(errors.append(m.text),print('CONSOLE ERROR '+m.text,flush=True)) if m.type=='error' else None)
 page.add_init_script('const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>raf(t=>{if(!window.__freeze)fn(t)});')
 page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded',timeout=240000)
 start_trip(page,'helicopter')
 page.wait_for_function('!!window.__portalQA||!!document.querySelector("#startup-error")?.textContent',timeout=240000)
 error=page.locator('#startup-error').text_content();assert not error,error
 print('BOOT READY',flush=True)
 page.evaluate('const q=__portalQA,original=q.renderer.render.bind(q.renderer);q.renderer.render=(...a)=>{if(!window.__skipRender)original(...a)};window.__skipRender=true')
 page.evaluate('window.__freeze=true;__portalQA.renderer.shadowMap.enabled=false;__portalQA.renderer.setPixelRatio(.55);__portalQA.camera.far=180;__portalQA.camera.updateProjectionMatrix()')
 initial=page.evaluate('''()=>{const q=__portalQA,s=q.traffic.getState();return {...s,appearances:q.villages.residents.map(r=>r.model.appearance),mainColor:q.vehicle.paintColor,bridge:q.data.BRIDGE,roles:[...new Set(s.agents.map(a=>a.role))]};}''');print('INITIAL '+json.dumps(initial),flush=True)
 assert len(initial['agents'])==9 and len(initial['roles'])==3 and initial['routeFailures']==0,initial
 assert len(set(a['fingerprint'] for a in initial['appearances']))==12
 assert all(a['color'] for a in initial['agents']) and initial['mainColor']
 result=page.evaluate('''()=>{const q=__portalQA,b=q.data.BRIDGE;let sand=0;for(let t=.05;t<1;t+=.05)for(const side of [-65,-40,-20,20,40,65]){const h=q.world.renderedTerrainHeight(b.startX+b.length*t,b.z+side);if(h>-.5)sand++;}return {sand};}''');assert result['sand']==0,result;print('BRIDGE WATER '+json.dumps(result),flush=True)
 result=page.evaluate('''()=>{const q=__portalQA;for(let i=0;i<3000;i++)q.traffic.update(.1,{hour:12});return q.traffic.getState();}''');print('AFTER 300 SECONDS '+json.dumps(result),flush=True)
 assert result['routeFailures']==0 and all(a['travelled']>100 for a in result['agents']),result
 assert any(a['visits']>0 for a in result['agents'] if a['role']=='shop_commuter'),result
 assert all(all(__import__('math').isfinite(a[k]) for k in ['x','z','y','speed']) for a in result['agents'])
 # A player directly ahead should make a moving resident brake, then depart after release.
 block=page.evaluate('''()=>{const q=__portalQA,a=q.traffic.agents.find(a=>a.phase==='driving'&&a.speed>4&&a.path.length-a.progress>100),s={...a.vehicle.state},player={x:s.x+Math.sin(s.heading)*10,z:s.z+Math.cos(s.heading)*10,bodyY:s.bodyY};for(let i=0;i<30;i++)q.traffic.update(.1,{player,hour:12});const stopped=a.speed;for(let i=0;i<50;i++)q.traffic.update(.1,{hour:12});return {before:s.speed,stopped,restarted:a.speed};}''');print('TRAFFIC BRAKING '+json.dumps(block),flush=True);assert block['stopped']<.1 and block['restarted']>1,block
 page.evaluate('document.querySelector("#hud").style.display="none"')
 # Render every entrance from above as in the reported screenshot.
 result=page.evaluate('''()=>{const q=__portalQA;let collars=0;for(const tunnel of q.tunnels)for(const side of [0,1]){if(!q.world.roadView.root.getObjectByName(tunnel.id+'-mountain-collar-'+side))throw Error('Missing collar');collars++;}return {tunnels:q.tunnels.length,collars,seals:q.world.roadView.root.userData.mountainSeals};}''');print('MOUNTAIN SEALS '+json.dumps(result),flush=True);assert result['collars']==20
 for i in range(20):
  image=page.evaluate('''i=>{const q=__portalQA,t=q.tunnels[Math.floor(i/2)],end=i%2,p=t.track[end?t.track.length-1:0],a=t.track[end?t.track.length-2:1],l=Math.hypot(a.x-p.x,a.z-p.z),dx=(a.x-p.x)/l,dz=(a.z-p.z)/l;q.camera.position.set(p.x-dx*48,p.y+30,p.z-dz*48);q.camera.lookAt(p.x+dx*12,p.y+5,p.z+dz*12);window.__skipRender=false;q.renderer.render(q.scene,q.camera);q.renderer.getContext().finish();window.__skipRender=true;return q.renderer.domElement.toDataURL("image/png");}''',i)
  if i in [0,1,8,19]:Path(f'/tmp/camper-mountain-portal-{i}.png').write_bytes(base64.b64decode(image.split(',')[1]))
  print('RENDERED MOUNTAIN PORTAL '+str(i),flush=True)
 image=page.evaluate('''()=>{const q=__portalQA,v=q.data.VILLAGE_SITES[0];q.camera.far=500;q.camera.updateProjectionMatrix();q.camera.position.set(v.x+95,70,v.z+120);q.camera.lookAt(v.x,4,v.z);for(const a of q.traffic.agents){a.vehicle.root.visible=true;a.resident.model.root.visible=a.phase==='driving';}window.__skipRender=false;q.renderer.render(q.scene,q.camera);q.renderer.getContext().finish();window.__skipRender=true;return q.renderer.domElement.toDataURL("image/png");}''')
 Path('/tmp/camper-resident-life.png').write_bytes(base64.b64decode(image.split(',')[1]))
 for kind in ['sedan','scooter']:
  image=page.evaluate("""async kind=>{const q=__portalQA,C=q.residentConstructors,{createResidentModel,residentSeatPose}=await import('/src/resident-appearance.js'),preview=new q.scene.constructor(),camera=q.camera.clone();preview.background=q.scene.background.clone();for(const light of q.scene.children.filter(o=>o.isHemisphereLight||o.isDirectionalLight))preview.add(light.clone());const vehicle=q.createVehicle(preview,kind,{x:0,z:0},0,{heightAt:()=>0});vehicle.update({...vehicle.state,x:0,z:0,heading:0,bodyY:0,pitch:0,roll:0,speed:0});const person=createResidentModel(preview,C);person.root.scale.setScalar(kind==='scooter'?1.12:.8);const seat=residentSeatPose(kind,vehicle.state,person.root.scale.y);person.root.position.set(seat.x,seat.y,seat.z);person.root.rotation.set(seat.pitch,0,0,'YXZ');person.pose(seat.posture);const floor=new C.Mesh(new C.BoxGeometry(30,.1,30),new C.MeshStandardMaterial({color:'#a9c393'}));floor.position.y=-.09;preview.add(floor);camera.position.set(kind==='scooter'?3:7,3.3,kind==='scooter'?4:7);camera.lookAt(0,1.4,0);window.__skipRender=false;q.renderer.render(preview,camera);q.renderer.getContext().finish();window.__skipRender=true;return q.renderer.domElement.toDataURL('image/png');}""",kind)
  Path(f'/tmp/camper-resident-driver-{kind}.png').write_bytes(base64.b64decode(image.split(',')[1]))
 print('ERRORS '+json.dumps(errors),flush=True);assert not errors
 b.close()
