import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
kind=sys.argv[1] if len(sys.argv)>1 else 'helicopter'
assert kind in ['helicopter','airplane','scooter','sedan','suv','motorhome']
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(offline=True,viewport={'width':640,'height':480});page=c.new_page();errors=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 page.evaluate('window.requestAnimationFrame=()=>0')
 page.set_content(Path('dist-offline/Free-Camper.html').read_text(),wait_until='domcontentloaded',timeout=240000)
 page.evaluate("kind=>{document.querySelector('[data-mode='+kind+']').click();document.querySelector('#start').click()}",kind)
 page.locator('#clock').wait_for(state='visible',timeout=240000)
 assert page.locator('#missions').count()==0
 assert page.evaluate('typeof window.__portalQA')=='undefined'
 assert not requests and not errors,{'errors':errors,'requests':requests}
 print(json.dumps({'offlineVehicle':kind,'started':True,'networkRequests':0,'errors':errors}),flush=True)
 b.close()
