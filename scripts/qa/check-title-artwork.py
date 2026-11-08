"""Verify the actual self-contained release, including offline artwork and menu transitions."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64,json
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(offline=True,viewport={'width':1440,'height':900},reduced_motion='reduce');page=c.new_page();errors=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 page.evaluate('window.requestAnimationFrame=()=>0')
 page.set_content(Path('dist-offline/Free-Camper.html').read_text(),wait_until='domcontentloaded',timeout=240000)
 page.locator('#title-screen').wait_for(state='visible',timeout=240000)
 assert not page.locator('#startup-error').text_content()
 result=page.evaluate('''async()=>{await document.fonts.ready;const screen=document.querySelector('#title-screen'),h=document.querySelector('#title-screen h1'),image=getComputedStyle(screen).getPropertyValue('--title-camping-art').trim(),url=image.slice(5,-2),img=new Image();img.src=url;await img.decode();return {title:h.getAttribute('aria-label'),width:img.naturalWidth,height:img.naturalHeight,embedded:url.startsWith('data:image/webp;base64,'),devHook:typeof window.__portalQA};}''')
 assert result['title']=='뿌뿌의 자유로운 캠핑',result
 assert result['embedded'] and result['width']>=1600 and result['devHook']=='undefined',result
 session=c.new_cdp_session(page)
 def capture(name):
  data=session.send('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})['data'];Path('/tmp/'+name).write_bytes(base64.b64decode(data))
 capture('camper-title-desktop.png')
 page.set_viewport_size({'width':390,'height':844});capture('camper-title-mobile.png')
 page.set_viewport_size({'width':1280,'height':720});capture('camper-title-laptop.png')
 assert page.locator('#title-screen #species').is_visible() and page.locator('#title-screen #travel').is_visible() and page.locator('#launch-weather').is_visible()
 page.locator('#title-options').click();assert page.locator('#options-modal').is_visible()
 assert not requests and not errors,{'requests':requests,'errors':errors}
 print(json.dumps({**result,'desktop':'1440x900','laptop':'1280x720','mobile':'390x844','directTitleChoicesAndOptions':True,'networkRequests':len(requests),'errors':errors},ensure_ascii=False),flush=True)
 b.close()
