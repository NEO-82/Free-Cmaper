from direct_launch import start_trip
from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page(viewport={'width':800,'height':600});errors=[]
 page.on('pageerror',lambda e:(errors.append(str(e)),print('ERROR '+str(e),flush=True)))
 page.add_init_script('const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>raf(t=>{if(!window.__freeze)fn(t)});')
 page.route('**/@vite/client',lambda route:route.fulfill(body='',content_type='application/javascript'))
 page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded',timeout=240000)
 start_trip(page,'helicopter')
 page.wait_for_function('!!window.__portalQA||!!document.querySelector("#startup-error")?.textContent',timeout=240000)
 assert not page.locator('#startup-error').text_content()
 print('BOOT READY',flush=True)
 page.evaluate('window.__skipRender=true;const q=__portalQA,render=q.renderer.render.bind(q.renderer);q.renderer.render=(...args)=>{if(!window.__skipRender)render(...args)}')
 page.evaluate('window.__freeze=true;const q=__portalQA,s=q.vehicle.state;window.__heliStart={...s};q.player.position.set(s.x-5,s.bodyY,s.z)')
 page.keyboard.press('f');assert page.evaluate('__portalQA.driving'),'F boards helicopter'
 page.keyboard.press('g');assert page.evaluate('__portalQA.driving'),'G has no exit action'
 assert page.locator('#interact kbd').text_content()=='F'
 page.locator('canvas').first.dispatch_event('mousedown',{'button':0})
 page.evaluate('for(let i=0;i<180;i++)__portalQA.advanceFlight(1/60)')
 page.dispatch_event('body','mouseup',{'button':0})
 takeoff=page.evaluate('({...__portalQA.vehicle.state})');assert not takeoff['grounded'] and takeoff['bodyY']>10,takeoff
 page.keyboard.press('f');assert page.evaluate('__portalQA.driving'),'cannot exit while airborne'
 page.evaluate('const q=__portalQA;q.vehicle.update({...q.vehicle.state,x:0,z:0,bodyY:1200,grounded:false,vx:0,vz:0,vy:0,speed:0})')
 page.keyboard.down('w');page.evaluate('for(let i=0;i<600;i++)__portalQA.advanceFlight(1/60)');page.keyboard.up('w')
 cruise=page.evaluate('__portalQA.vehicle.state.speed');assert abs(cruise-117.6)<.01,cruise
 camera=page.evaluate('''()=>{const q=__portalQA;q.look(180,65);const before=q.cameraOrbit,at=performance.now();q.advanceFrame(at+6990);const early=q.cameraOrbit;q.advanceFrame(at+10000);return {before,early,late:q.cameraOrbit};}''')
 assert abs(camera['before']['yaw']-camera['early']['yaw'])<.001,camera
 assert abs(camera['late']['yaw'])<.01,camera
 page.evaluate('const q=__portalQA;q.vehicle.update({...q.vehicle.state,...window.__heliStart,bodyY:18,grounded:false,engineOn:true,rotorSpeed:1,landedFor:0,vx:0,vz:0,vy:0,speed:0})')
 page.locator('canvas').first.dispatch_event('mousedown',{'button':2})
 landing=page.evaluate('''()=>{const q=__portalQA;for(let i=0;i<900&&!q.vehicle.state.grounded;i++)q.advanceFlight(1/120);const touchdown={...q.vehicle.state};for(let i=0;i<580;i++)q.advanceFlight(1/120);const beforeShutdown={...q.vehicle.state};for(let i=0;i<25;i++)q.advanceFlight(1/120);const shutdown={...q.vehicle.state};for(let i=0;i<240;i++)q.advanceFlight(1/120);q.audio.updateVehicle(q.vehicle.state,{active:true});return {touchdown,beforeShutdown,shutdown,settled:{...q.vehicle.state},sound:q.audio.getState()};}''')
 page.dispatch_event('body','mouseup',{'button':2})
 assert landing['touchdown']['grounded'] and landing['touchdown']['speed']==0,landing
 assert landing['beforeShutdown']['engineOn'] and not landing['shutdown']['engineOn'],landing
 assert landing['settled']['rotorSpeed']==0 and landing['sound']['vehicleKind'] is None,landing
 page.keyboard.press('f');assert not page.evaluate('__portalQA.driving'),'F exits after landing'
 page.wait_for_timeout(450)
 page.evaluate('const q=__portalQA,s=q.vehicle.state;q.player.position.set(s.x-5,s.bodyY,s.z)')
 page.keyboard.press('f');assert page.evaluate('__portalQA.driving'),'F boards again'
 page.locator('canvas').first.dispatch_event('mousedown',{'button':0});page.evaluate('for(let i=0;i<120;i++)__portalQA.advanceFlight(1/120)');page.dispatch_event('body','mouseup',{'button':0})
 assert page.evaluate('__portalQA.vehicle.state.engineOn&&!__portalQA.vehicle.state.grounded')
 music=page.evaluate('__portalQA.audio.getState().music');assert music['trackCount']==10 and music['bitDepth']==32 and music['channels']==2 and music['scheduledNotes']>0,music
 print(json.dumps({'takeoff':takeoff,'cruiseKmh':cruise*3.6,'camera':camera,'landing':landing,'music':music,'errors':errors},ensure_ascii=False),flush=True)
 assert not errors,errors
 print('LIVE PASS: F boarding/exit, G removed, flight, 7s camera, landing/5s shutdown/restart, Float32 music',flush=True)
 b.close()
