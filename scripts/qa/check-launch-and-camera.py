from playwright.sync_api import sync_playwright
from pathlib import Path
import json,time,base64
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page(viewport={'width':1440,'height':900},reduced_motion='reduce');errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR '+str(e),flush=True)))
 page.add_init_script("window.requestAnimationFrame=()=>0;let last='';setInterval(()=>{const t=document.querySelector('#launch-progress span')?.textContent;if(t&&t!==last){last=t;console.info('STAGE '+t)}},250)");page.on('console',lambda m:print(m.text,flush=True) if m.text.startswith('STAGE ') else None);page.route('**/@vite/client',lambda r:r.fulfill(body='',content_type='application/javascript'))
 started=time.monotonic();page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded',timeout=240000)
 page.wait_for_function('!!window.__launchQA||!!document.querySelector("#startup-error")?.textContent',timeout=240000,polling=100);assert not page.locator('#startup-error').text_content()
 print('TITLE '+json.dumps({'seconds':time.monotonic()-started,'timing':page.evaluate('__launchQA.timing')}),flush=True)
 assert page.locator('#title-screen h1').get_attribute('aria-label')=='뿌뿌의 자유로운 캠핑'
 assert page.locator('#title-screen #species').is_visible() and page.locator('#title-screen #seasons').is_visible() and page.locator('#title-screen #travel').is_visible() and page.locator('#launch-weather').is_visible()
 page.locator('#title-options').click();page.locator('#music-volume').evaluate("e=>{e.value=50;e.dispatchEvent(new Event('input',{bubbles:true}))}");page.locator('#language').select_option('en');assert page.locator('html').get_attribute('lang')=='en'
 page.locator('#language').select_option('ko');page.locator('#options-close').click()
 page.locator('#species').select_option('female');page.locator('[data-season="2"]').click();page.locator('#launch-weather').select_option('overcast');page.locator('[data-mode="suv"]').click()
 session=page.context.new_cdp_session(page)
 for width,height,name in [(1440,900,'desktop'),(1280,720,'laptop'),(390,844,'mobile')]:
  page.set_viewport_size({'width':width,'height':height});data=session.send('Page.captureScreenshot',{'format':'png'})['data'];Path('/tmp/camper-launch-'+name+'.png').write_bytes(base64.b64decode(data))
 page.set_viewport_size({'width':900,'height':650});page.locator('#start').click();page.wait_for_function('!!window.__portalQA&&__portalQA.phase==="world"||!!document.querySelector("#startup-error")?.textContent',timeout=240000,polling=100);assert not page.locator('#startup-error').text_content()
 result=page.evaluate('''()=>{const q=__portalQA;return {timing:__launchQA.timing,phase:q.phase,kind:q.vehicle.state.kind,character:q.selectedCharacter,weather:document.querySelector('#weather').textContent,oldSetup:!document.querySelector('#home').classList.contains('hidden'),titleHidden:document.querySelector('#title-screen').classList.contains('hidden')};}''');print('READY '+json.dumps(result,ensure_ascii=False),flush=True)
 assert result['character']=='female' and result['kind']=='suv' and '가을' in result['weather'] and '흐림' in result['weather'] and not result['oldSetup'] and result['titleHidden'],result
 q=page.evaluate('''()=>{const q=__portalQA,r=q.renderer.render.bind(q.renderer);window.__originalRender=r;q.renderer.render=()=>{};const s=q.vehicle.state;q.player.position.set(s.x-5,s.bodyY,s.z);return true;}''');page.keyboard.press('f');assert page.evaluate('__portalQA.driving')
 # Both camera modes use grade rather than chassis roll; a one-second idle delay precedes ground-vehicle return.
 camera=page.evaluate('''async()=>{const q=__portalQA,{terrainCameraTarget,groundCameraDirection}=await import('/src/terrain-vehicle-camera.js');let road,candidate;for(const r of q.data.ROADS){const p=r.track.find((p,i)=>i>12&&i<r.track.length-12&&!p.tunnel&&p.y>20&&Math.abs(r.track[i+12].y-r.track[i-12].y)>.1);if(p){road=r;candidate=p;break;}}if(!candidate)throw Error('No hill sample');const s={...q.vehicle.state,x:candidate.x,z:candidate.z,bodyY:candidate.y,heading:candidate.heading??Math.atan2(road.track[road.track.indexOf(candidate)+1].x-candidate.x,road.track[road.track.indexOf(candidate)+1].z-candidate.z),speed:10,pitch:1,roll:.6};const options={roadAt:q.data.roadSurfaceAt,heightAt:q.world.walkingHeightAt},a=terrainCameraTarget(s,options),b=terrainCameraTarget({...s,pitch:-1,roll:-.6},options),cam={yaw:1,pitch:-.4};return {target:a,unchanged:JSON.stringify(a)===JSON.stringify(b),early:q.cameraReturn(cam,.1,.99,10),late:q.cameraReturn(cam,1,2,10,1,a),stopped:q.cameraReturn(cam,1,20,0),view:groundCameraDirection(s,a),helicopter:q.cameraReturn(cam,.1,6.99,10,7)};}''');print('CAMERA '+json.dumps(camera),flush=True)
 assert camera['unchanged'] and camera['early']['yaw']==1 and camera['stopped']['yaw']==1 and camera['helicopter']['yaw']==1
 assert abs(camera['late']['pitch']-camera['target']['pitch'])<.001
 actual=page.evaluate('''()=>{const q=__portalQA,base=q.vehicle.state;q.vehicle.update({...base,speed:12,vx:Math.sin(base.heading)*12,vz:Math.cos(base.heading)*12});q.look(150,40);const at=performance.now(),before=q.cameraOrbit;q.advanceFrame(at+990);const early=q.cameraOrbit;q.advanceFrame(at+3000);return {before,early,late:q.cameraOrbit};}''');assert abs(actual['before']['yaw']-actual['early']['yaw'])<.01,actual
 page.locator('canvas').first.dispatch_event('wheel',{'deltaY':-4000});page.evaluate('__portalQA.advanceFrame(performance.now()+4000)')
 assert page.locator('#status').text_content().find('1인칭')>=0
 print('ACTUAL CAMERA '+json.dumps(actual),flush=True)
 # Render/check all portals after the optimized mask creation.
 seals=page.evaluate('''()=>{const q=__portalQA;return {tunnels:q.tunnels.length,seals:q.world.roadView.root.userData.mountainSeals,repair:{cells:q.world.roadView.root.userData.portalGroundRepair.cells,spans:q.world.roadView.root.userData.portalGroundRepair.spans}};}''');print('TUNNELS '+json.dumps(seals),flush=True);assert seals['seals']['collars']==20
 for i in range(20):
  data=page.evaluate('''i=>{const q=__portalQA,t=q.tunnels[Math.floor(i/2)],end=i%2,p=t.track[end?t.track.length-1:0],a=t.track[end?t.track.length-2:1],l=Math.hypot(a.x-p.x,a.z-p.z),dx=(a.x-p.x)/l,dz=(a.z-p.z)/l;q.renderer.shadowMap.enabled=false;q.renderer.setPixelRatio(.4);q.camera.far=160;q.camera.updateProjectionMatrix();q.camera.position.set(p.x-dx*48,p.y+30,p.z-dz*48);q.camera.lookAt(p.x+dx*12,p.y+5,p.z+dz*12);window.__originalRender(q.scene,q.camera);q.renderer.getContext().finish();return q.renderer.domElement.toDataURL('image/png');}''',i)
  if i in [0,19]:Path('/tmp/camper-launch-portal-'+str(i)+'.png').write_bytes(base64.b64decode(data.split(',')[1]))
 print('ALL 20 PORTALS RENDERED',flush=True)
 assert not errors,errors
 print('PASS: direct launch, selections, title options, terrain camera, one/7-second delay and 20 sealed portals; errors0',flush=True)
 b.close()
