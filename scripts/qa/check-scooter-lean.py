from direct_launch import start_trip
"""Exercise scooter steering and inward banking through the real player controls."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,base64
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page(viewport={'width':900,'height':650});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>raf(t=>{if(!window.__freeze)fn(t)});')
 page.route('**/@vite/client',lambda r:r.fulfill(body='',content_type='application/javascript'))
 page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded',timeout=240000)
 start_trip(page,'scooter')
 page.wait_for_function('!!window.__portalQA||!!document.querySelector("#startup-error")?.textContent',timeout=240000)
 assert not page.locator('#startup-error').text_content()
 page.evaluate('const q=__portalQA,render=q.renderer.render.bind(q.renderer);window.__skipRender=true;q.renderer.render=(...a)=>{if(!window.__skipRender)render(...a)}')
 page.evaluate('window.__freeze=true;const q=__portalQA,s=q.vehicle.state;window.__start={...s};q.player.position.set(s.x-3,s.bodyY,s.z)')
 page.keyboard.press('f');assert page.evaluate('__portalQA.driving')
 results=[]
 for key in ['a','d','ArrowLeft','ArrowRight']:
  page.evaluate('const q=__portalQA,s=window.__start;q.vehicle.update({...s,heading:0,speed:12,vx:0,vz:12,yawRate:0,roll:0,rollVelocity:0,pitch:0,pitchVelocity:0,heaveVelocity:0,airborne:false})')
  page.keyboard.down('w');page.keyboard.down(key);page.evaluate('for(let i=0;i<72;i++)__portalQA.advanceFlight(1/120)');page.keyboard.up(key);page.keyboard.up('w')
  result=page.evaluate('''()=>{const q=__portalQA,s=q.vehicle.state,up=new q.Vector3(0,1,0).applyQuaternion(q.vehicle.root.quaternion),turn=Math.sign(s.yawRate*s.speed),inward=up.x*Math.cos(s.heading)*turn-up.z*Math.sin(s.heading)*turn;return {heading:s.heading,yawRate:s.yawRate,roll:s.roll,inward,riderAngle:q.player.quaternion.angleTo(q.vehicle.root.quaternion)};}''');result['key']=key;results.append(result)
  assert result['inward']>.005 and result['riderAngle']<1e-6,result
  assert (result['heading']>0)==(key in ['a','ArrowLeft']),result
  if key in ['a','d']:
   data=page.evaluate('''()=>{const q=__portalQA,s=q.vehicle.state;q.renderer.shadowMap.enabled=false;q.renderer.setPixelRatio(.7);q.camera.far=90;q.camera.updateProjectionMatrix();q.camera.position.set(s.x-Math.sin(s.heading)*8,s.bodyY+3.2,s.z-Math.cos(s.heading)*8);q.camera.lookAt(s.x,s.bodyY+1.3,s.z);window.__skipRender=false;q.renderer.render(q.scene,q.camera);q.renderer.getContext().finish();window.__skipRender=true;return q.renderer.domElement.toDataURL('image/png');}''')
   Path('/tmp/camper-scooter-lean-'+key+'.png').write_bytes(base64.b64decode(data.split(',')[1]))
  # Release steering while coasting: the suspension smoothly returns toward upright.
  neutral=page.evaluate('''()=>{const q=__portalQA,before=Math.abs(q.vehicle.state.roll);for(let i=0;i<240;i++)q.advanceFlight(1/120);return {before,after:Math.abs(q.vehicle.state.roll)};}''')
  assert neutral['after']<neutral['before']*.15,neutral
 assert not errors,errors
 print(json.dumps({'controls':'unchanged','lean':'into the turn','results':results,'errors':errors}),flush=True)
 b.close()
