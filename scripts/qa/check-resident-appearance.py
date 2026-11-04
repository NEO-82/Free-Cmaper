from playwright.sync_api import sync_playwright
from pathlib import Path
import base64,json
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/src/current-game.js*',lambda r:r.fulfill(body='',content_type='application/javascript'))
 page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded');page.evaluate('document.body.innerHTML=""')
 image=page.evaluate('''async()=>{const THREE=await import('/node_modules/three/build/three.module.js'),{createResidentModel}=await import('/src/resident-appearance.js');const scene=new THREE.Scene(),renderer=new THREE.WebGLRenderer({antialias:true}),camera=new THREE.PerspectiveCamera(48,900/480,.1,100);renderer.setSize(900,480);scene.background=new THREE.Color('#d6e8d7');scene.add(new THREE.HemisphereLight('#ffffff','#718365',2.5));const sun=new THREE.DirectionalLight('#fff2dc',2);sun.position.set(-3,6,8);scene.add(sun);for(let i=0;i<5;i++){const person=createResidentModel(scene,THREE);person.root.position.x=(i-2)*1.7;person.pose('stand');}const ground=new THREE.Mesh(new THREE.PlaneGeometry(50,50),new THREE.MeshStandardMaterial({color:'#bccca7'}));ground.rotation.x=-Math.PI/2;scene.add(ground);camera.position.set(0,2.5,7.2);camera.lookAt(0,1.2,0);renderer.render(scene,camera);renderer.getContext().finish();const url=renderer.domElement.toDataURL('image/png');renderer.dispose();return url;}''')
 Path('/tmp/camper-random-residents.png').write_bytes(base64.b64decode(image.split(',')[1]));print(json.dumps({'errors':errors}),flush=True);assert not errors;b.close()
