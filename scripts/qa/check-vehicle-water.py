from playwright.sync_api import sync_playwright
from pathlib import Path
import json,base64
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':900,'height':650});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.add_init_script('window.requestAnimationFrame=()=>0');page.route('**/@vite/client',lambda r:r.fulfill(body='',content_type='application/javascript'))
 page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded',timeout=240000);page.locator('[data-mode="suv"]').click(timeout=240000);page.locator('#start').click(timeout=240000)
 page.wait_for_function('!!window.__portalQA&&__portalQA.phase==="world"||!!document.querySelector("#startup-error")?.textContent',timeout=240000,polling=100);assert not page.locator('#startup-error').text_content()
 result=page.evaluate('''async()=>{
 const q=__portalQA,{WATER_VEHICLE_SETTINGS}=await import('/src/vehicle-water.js'),out=[],base=q.data.ARRIVAL;
 for(const kind of ['scooter','sedan','suv','motorhome']){
  const initial={kind,x:base.x,z:base.z,heading:Math.PI/2,speed:24,vx:24,vz:0,bodyY:0},heightAt=(x,z)=>x>base.x+9&&x<base.x+21?-3:0,waterSurfaceAt=(x,z)=>x>base.x+9&&x<base.x+21?0:null;let s=initial,wet=0,minClearance=Infinity;
  for(let i=0;i<300;i++){s=q.stepGroundVehicle(s,{forward:true,jump:i<12},1/120,[],{heightAt,waterSurfaceAt,ceilingAt:()=>Infinity});if(s.x>base.x+9&&s.x<base.x+21){minClearance=Math.min(minClearance,s.bodyY);wet=Math.max(wet,s.waterImmersion);}}
  const cross={x:s.x-base.x,minClearance,wet};
  function deep(backward){let v={...initial,x:base.x,bodyY:-WATER_VEHICLE_SETTINGS[kind].draft,speed:0,vx:0,vz:0};for(let i=0;i<480;i++)v=q.stepGroundVehicle(v,{forward:!backward,backward},1/120,[],{heightAt:()=>-4,waterSurfaceAt:()=>0});return {dx:v.x-base.x,speed:v.speed,bodyY:v.bodyY,floating:v.floating};}
  function escape(backward){let v={...initial,x:base.x-5,heading:backward?-Math.PI/2:Math.PI/2,bodyY:-WATER_VEHICLE_SETTINGS[kind].draft,speed:0,vx:0,vz:0};const h=x=>Math.min(.5,-3+Math.max(0,x-base.x)*.2);for(let i=0;i<1440;i++)v=q.stepGroundVehicle(v,{forward:!backward,backward},1/120,[],{heightAt:h,waterSurfaceAt:x=>x<base.x+15?0:null});return {dx:v.x-base.x,bodyY:v.bodyY,wet:v.waterImmersion};}
  out.push({kind,cross,forward:deep(false),reverse:deep(true),exitForward:escape(false),exitReverse:escape(true)});
 }
 return out;}''');print('ALL CHASSIS '+json.dumps(result),flush=True)
 for item in result:
  assert item['cross']['x']>30 and item['cross']['minClearance']>.3 and item['cross']['wet']==0,item
  assert item['forward']['dx']>5 and item['reverse']['dx']<-5,item
  assert item['exitForward']['dx']>18 and item['exitReverse']['dx']>18,item
 river=page.evaluate('''()=>{const q=__portalQA,d=q.data;let site;for(let z=d.RIVER_START+100;z<d.WORLD.maxZ-200;z+=83){const x=d.riverX(z),water=d.waterSurfaceAt(x,z);if(water===null||d.roadSurfaceAt(x,z).distance<45)continue;const left=q.world.walkingHeightAt(x-16,z),right=q.world.walkingHeightAt(x+16,z);if(left>water+.5&&right>water+.5){site={x,z,water,left,right};break;}}if(!site)throw Error('No stream site');window.__waterSite=site;const out=[];for(const kind of ['scooter','sedan','suv','motorhome']){let s={kind,x:site.x-16,z:site.z,heading:Math.PI/2,speed:30,vx:30,vz:0,bodyY:site.left};let passed=false,wet=0;for(let i=0;i<330;i++){s=q.stepGroundVehicle(s,{forward:true,jump:i<12},1/120,[],{heightAt:(x,z)=>q.world.walkingHeightAt(x,z,s.bodyY),waterSurfaceAt:d.waterSurfaceAt});wet=Math.max(wet,s.waterImmersion);if(s.x>site.x+16)passed=true;}out.push({kind,passed,x:s.x-site.x,wet});}return {site,crossings:out};}''');print('REAL STREAM '+json.dumps(river),flush=True);assert all(c['passed'] for c in river['crossings']),river
 # Actual W/S inputs recover the player SUV from the real stream, in either facing direction.
 live=[]
 for backward in [False,True]:
  page.evaluate('''backward=>{const q=__portalQA,p=window.__waterSite;window.__render??=q.renderer.render.bind(q.renderer);q.renderer.render=()=>{};q.vehicle.update({...q.vehicle.state,x:p.x,z:p.z,bodyY:p.water-.65,heading:backward?-Math.PI/2:Math.PI/2,speed:0,vx:0,vz:0,airborne:false,groundHeight:p.water-.65,heaveVelocity:0,groundVerticalSpeed:0,pitch:0,roll:0,yawRate:0});if(!q.driving)q.player.position.set(p.x-3,p.water,p.z);}''',backward)
  if not page.evaluate('__portalQA.driving'):page.keyboard.press('f')
  assert page.evaluate('__portalQA.driving')
  key='s' if backward else 'w';page.keyboard.down(key);page.evaluate('for(let i=0;i<100;i++)__portalQA.advanceFlight(.1)');page.keyboard.up(key)
  state=page.evaluate('({x:__portalQA.vehicle.state.x,y:__portalQA.vehicle.state.bodyY,wet:__portalQA.vehicle.state.waterImmersion})');state['backward']=backward;live.append(state);assert state['x']>river['site']['x']+16,state
 print('PLAYER RECOVERY '+json.dumps(live),flush=True)
 assert not errors,errors
 print('PASS: 4 kinds jump streams, move forward/reverse in deep water, climb either way, and actual W/S recover from the real stream; errors0',flush=True)
 b.close()
