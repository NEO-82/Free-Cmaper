"""Audit both sides of every current road, including the actual walkable mesh."""
import base64
import json
from pathlib import Path
from direct_launch import start_trip
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
        args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width':700,'height':400})
    page.add_init_script('window.requestAnimationFrame=()=>0')
    page.route('**/@vite/client', lambda r:r.fulfill(body='',content_type='application/javascript'))
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded',timeout=240000)
    start_trip(page,'suv')
    result=page.evaluate('''()=>{
      const q=__portalQA,bridge=q.data.BRIDGE,waters=q.data.MOUNTAIN_WATERS;
      const excluded=(x,z)=>x>bridge.startX&&x<bridge.endX&&Math.abs(z-bridge.z)<80 ||
        waters.waterAt(x,z)!==null || q.data.summitLakeDistance(x,z)<1;
      const meshes=[];q.world.roadView.root.traverse(m=>{if(m.name==='road edge blend')meshes.push(m)});
      const failures=[],roads=[];let seams=0,outerSamples=0,walkSamples=0;
      for(const road of q.data.ROADS){
        let maxSeam=0,maxOuter=0,maxTerrainGap=0,missing=0,connected=0;
        for(const side of [-1,1]){
          const mesh=meshes.find(m=>m.userData.roadId===road.id&&m.userData.side===side);
          if(!mesh)throw Error('missing side '+road.id);
          const a=mesh.geometry.attributes.position,indices=mesh.geometry.index.array,c=mesh.userData.columns;
          const rows=new Set();for(let k=0;k<indices.length;k+=6)if(indices[k]%c===0)rows.add(Math.floor(indices[k]/c)+1);
          for(let i=0;i<road.track.length;i++){
            const p=road.track[i],first=i*c,last=first+c-1;
            if(!p.tunnel&&!excluded(p.x,p.z)){
              const seam=Math.abs(a.getY(first)-(p.y+.005));maxSeam=Math.max(maxSeam,seam);seams++;
              const raw=q.world.renderedTerrainHeight(a.getX(first),a.getZ(first));
              if(!excluded(a.getX(first),a.getZ(first)))maxTerrainGap=Math.max(maxTerrainGap,Math.abs(raw-p.y));
              if(seam>.001)failures.push({id:road.id,i,reason:'road seam',seam});
              const outer=Math.abs(a.getY(last)-(q.world.renderedTerrainHeight(a.getX(last),a.getZ(last))-.04));
              maxOuter=Math.max(maxOuter,outer);outerSamples++;
              if(outer>.01)failures.push({id:road.id,i,reason:'outer rim',outer});
            }
            if(!i)continue;
            const prev=road.track[i-1];
            const corners=[first-c,first-c+1,first,first+1];
            const cx=corners.reduce((sum,k)=>sum+a.getX(k),0)/4,cz=corners.reduce((sum,k)=>sum+a.getZ(k),0)/4;
            const forbidden=p.tunnel||prev.tunnel||excluded(p.x,p.z)||excluded(prev.x,prev.z)||
              excluded((p.x+prev.x)/2,(p.z+prev.z)/2)||excluded(cx,cz)||
              corners.some(k=>excluded(a.getX(k),a.getZ(k)));
            if(!forbidden&&!rows.has(i)){missing++;failures.push({id:road.id,i,reason:'missing ramp'});}
            if(rows.has(i)){
              connected++;
              if(i%5===0){
                const x=(a.getX(first-c)+a.getX(first+1))/2,z=(a.getZ(first-c)+a.getZ(first+1))/2;
                const expected=(a.getY(first-c)+a.getY(first+1))/2;
                const height=q.world.walkingHeightAt(x,z,Math.max(p.y,prev.y)+1);walkSamples++;
                if(height<expected-.03)failures.push({id:road.id,i,reason:'walking gap',height,expected});
              }
            }
          }
        }
        roads.push({id:road.id,maxSeam,maxOuter,maxTerrainGap,connected,missing});
      }
      return {roads,seams,outerSamples,walkSamples,failures:failures.slice(0,20),failureCount:failures.length};
    }''')
    pavement=page.evaluate('()=>{const q=__portalQA,bridge=q.data.BRIDGE;let count=0,max=0,examples=[];for(const road of q.data.ROADS)road.track.forEach((p,i)=>{if(p.tunnel||p.x>=bridge.startX-10&&p.x<=bridge.endX+10&&Math.abs(p.z-bridge.z)<80)return;const a=road.track[Math.max(0,i-1)],b=road.track[Math.min(road.track.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1;for(const across of [-.7,0,.7]){const offset=road.pavementWidth/2*across,x=p.x+dz/len*offset,z=p.z-dx/len*offset,raw=q.world.renderedTerrainHeight(x,z),excess=raw-p.y-.02;if(excess>.005){count++;max=Math.max(max,excess);if(examples.length<10)examples.push({road:road.id,i,x,z,raw,y:p.y,excess});}}});return {count,max,examples};}')
    print("PAVEMENT "+json.dumps(pavement),flush=True)
    assert pavement["count"]==0,pavement
    print(json.dumps(result),flush=True)
    assert result['failureCount']==0,result
    assert len(result['roads'])==13 and result['walkSamples']>1000
    page.evaluate('''()=>{const q=__portalQA;q.renderer.shadowMap.enabled=false;q.renderer.setPixelRatio(.6);
      q.renderer.setSize(700,400,false);q.camera.far=180;q.camera.updateProjectionMatrix();}''')
    for name,index in [('cedar-summit',4276),('sunrise-summit',2035),('coastal-loop',1500),('gateway',70)]:
        data=page.evaluate('''([name,index])=>{const q=__portalQA,r=q.data.ROADS.find(r=>r.id===name),p=r.track[index],
          a=r.track[Math.max(0,index-3)],b=r.track[Math.min(r.track.length-1,index+3)],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;
          q.camera.position.set(p.x+dz/l*27-dx/l*15,p.y+9,p.z-dx/l*27-dz/l*15);
          q.camera.lookAt(p.x+dx/l*12,p.y-1,p.z+dz/l*12);q.scene.updateMatrixWorld(true);
          q.renderer.render(q.scene,q.camera);q.renderer.getContext().finish();return q.renderer.domElement.toDataURL('image/png');}''',[name,index])
        Path('/tmp/camper-road-'+name+'.png').write_bytes(base64.b64decode(data.split(',')[1]))
        print('RENDERED '+name,flush=True)
    assert not errors,errors
    print('ERRORS '+json.dumps(errors),flush=True)
    browser.close()
