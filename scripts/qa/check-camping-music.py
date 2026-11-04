from playwright.sync_api import sync_playwright
import json,base64,struct
from pathlib import Path
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/src/current-game.js*',lambda route:route.fulfill(status=200,content_type='application/javascript',body=''))
 page.route('**/@vite/client',lambda route:route.fulfill(body='',content_type='application/javascript'))
 page.goto('http://127.0.0.1:5173/',wait_until='domcontentloaded',timeout=120000)
 result=page.evaluate('''async()=>{
 const {CAMPING_TRACKS,composeCampingTrack}=await import('/src/camping-music-score.js'),{scheduleCampingNote,createCampingMusic}=await import('/src/camping-music-audio.js');
 function stats(buffer,from=0,to=buffer.duration){const l=buffer.getChannelData(0),r=buffer.getChannelData(1),a=Math.floor(from*buffer.sampleRate),b=Math.min(l.length,Math.floor(to*buffer.sampleRate));let sum=0,peak=0,diff=0,jump=0;for(let i=a;i<b;i++){if(!Number.isFinite(l[i])||!Number.isFinite(r[i]))throw Error('Nonfinite audio');sum+=l[i]*l[i]+r[i]*r[i];diff+=(l[i]-r[i])**2;peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));if(i>a)jump=Math.max(jump,Math.abs(l[i]-l[i-1]));}return {rms:Math.sqrt(sum/((b-a)*2)),peak,stereo:Math.sqrt(diff/(b-a)),maxStep:jump};}
 const tracks=[];for(const track of CAMPING_TRACKS){const c=new OfflineAudioContext(2,24000*12,24000),out=c.createGain();out.gain.value=.32;out.connect(c.destination);const buffers=new Map();for(const event of composeCampingTrack(track).filter(n=>n.time<12))scheduleCampingNote(c,out,event,event.time,buffers);const data=await c.startRendering();tracks.push({title:track.title,...stats(data),float32:data.getChannelData(0) instanceof Float32Array});}
 const c=new OfflineAudioContext(2,24000*306,24000),out=c.createGain();out.gain.value=.32;out.connect(c.destination);const music=createCampingMusic(c,out,{random:()=>.37});music.schedule(297.5);const initial=music.getState(),pause=c.suspend(297.2),rendering=c.startRendering();await pause;music.schedule(306);await c.resume();const data=await rendering;const boundary=[];for(let at=294;at<305;at+=.5)boundary.push({at,...stats(data,at,at+.5)});
 const endState=music.getState();const l=data.getChannelData(0),r=data.getChannelData(1),preview=new Float32Array(20*24000*2);for(let i=0;i<preview.length/2;i++){preview[i*2]=l[i];preview[i*2+1]=r[i];}const bytes=new Uint8Array(preview.buffer);let str='';for(let i=0;i<bytes.length;i+=16384)str+=String.fromCharCode(...bytes.subarray(i,i+16384));window.__preview=btoa(str);
 return {tracks,initial,endState,boundary,full:stats(data)};}''')
 print(json.dumps(result,ensure_ascii=False),flush=True)
 assert len(result['tracks'])==10 and result['initial']['trackCount']==10
 assert len(set(result['initial']['playlist']))==10
 assert all(t['float32'] and t['rms']>.005 and t['peak']<.98 and t['stereo']>.0001 for t in result['tracks'])
 assert all(s['rms']>.003 and s['peak']<.98 and s['maxStep']<.15 for s in result['boundary']),result['boundary']
 assert result['endState']['trackId']!=result['initial']['trackId']
 raw=base64.b64decode(page.evaluate('window.__preview'));size=len(raw)
 header=struct.pack('<4sI4s4sIHHIIHH4sI',b'RIFF',size+36,b'WAVE',b'fmt ',16,3,2,24000,24000*8,8,32,b'data',size)
 Path('/tmp/camper-music-preview-32float.wav').write_bytes(header+raw)
 assert not errors,errors
 print('AUDIO PASS: all ten Float32 stereo excerpts and full 5-minute track/crossfade; errors0',flush=True)
 b.close()
