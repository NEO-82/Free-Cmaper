import {CAMPING_TRACKS,MUSIC_FORMAT,composeCampingTrack} from './camping-music-score.js';
const frequency=note=>440*2**((note-69)/12);
const profiles={guitar:[1,.45,.22,.13,.07,.025],piano:[1,.36,.18,.12,.06,.025],flute:[1,.12,.08,.02],celesta:[1,.1,.3,.02,.13],marimba:[1,.05,.32,.015],bass:[1,.23,.08],pad:[1,.18,.08,.035]};
export function makeInstrumentBuffer(context,voice){
 const noise=voice==='shaker',size=noise?Math.round(context.sampleRate*.18):2048,buffer=context.createBuffer(1,size,context.sampleRate),data=buffer.getChannelData(0);
 let seed=6731;
 for(let i=0;i<size;i++){
  if(noise){seed=seed*16807%2147483647;data[i]=(seed/2147483647*2-1)*.65;continue;}
  const harmonics=profiles[voice]??profiles.piano;
  data[i]=harmonics.reduce((sum,amplitude,h)=>sum+Math.sin(i/size*Math.PI*2*(h+1))*amplitude,0)/harmonics.reduce((a,b)=>a+b,0);
 }
 return buffer;
}
export function makeRoomImpulse(context){
 const buffer=context.createBuffer(2,Math.round(context.sampleRate*2.4),context.sampleRate);
 for(let ch=0;ch<2;ch++){let seed=937+ch*1247;const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i++){seed=seed*16807%2147483647;data[i]=(seed/2147483647*2-1)*Math.exp(-i/context.sampleRate*3.7)*.12;}}
 return buffer;
}
export function scheduleCampingNote(context,destination,event,start,buffers,active=new Set()){
 const source=context.createBufferSource(),gain=context.createGain(),pan=context.createStereoPanner(),filter=context.createBiquadFilter();
 const voice=event.voice,noise=voice==='shaker',buffer=buffers.get(voice)??makeInstrumentBuffer(context,voice);buffers.set(voice,buffer);source.buffer=buffer;source.loop=!noise;
 if(!noise)source.playbackRate.value=frequency(event.note)*buffer.length/context.sampleRate;
 filter.type=noise?'highpass':'lowpass';filter.frequency.value=noise?4500:voice==='bass'?650:voice==='pad'?1800:voice==='flute'?3000:5200;
 const attack=voice==='pad'?.55:voice==='flute'?.075:.012,release=voice==='pad'?1.8:voice==='flute'?.32:.5,duration=Math.max(event.duration,attack+.06),end=start+duration+release;
 gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(event.gain,start+attack);
 gain.gain.exponentialRampToValueAtTime(Math.max(.0001,event.gain*(voice==='pad'?.8:voice==='flute'?.65:.16)),start+duration);
 gain.gain.linearRampToValueAtTime(0,end);pan.pan.value=event.pan;
 source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(destination);active.add(source);
 source.start(start);source.stop(noise?Math.min(end,start+buffer.duration):end+.01);
 source.onended=()=>{active.delete(source);source.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();};
 return source;
}
const FADE=3,SPACING=300-FADE;
export function createCampingMusic(context,destination,{random=Math.random}={}){
 // Fisher-Yates gives every track an equal chance to start, then plays all ten.
 const order=CAMPING_TRACKS.map(t=>t.id);for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 const scores=new Map(CAMPING_TRACKS.map(t=>[t.id,composeCampingTrack(t)])),buffers=new Map(),active=new Set(),parts=new Map();
 let origin=null,disposed=false,scheduledNotes=0;
 const curve=(fadeIn)=>Float32Array.from({length:65},(_,i)=>fadeIn?Math.sin(i/64*Math.PI/2):Math.cos(i/64*Math.PI/2));
 function part(index){
  if(parts.has(index))return parts.get(index);
  const track=CAMPING_TRACKS[order[index%10]],start=origin+index*SPACING,bus=context.createGain(),dry=context.createGain(),wet=context.createGain(),room=context.createConvolver();
  dry.gain.value=.78;wet.gain.value=.2;room.buffer=makeRoomImpulse(context);dry.connect(bus);room.connect(wet);wet.connect(bus);bus.connect(destination);
  bus.gain.setValueAtTime(0,start);bus.gain.setValueCurveAtTime(curve(true),start,index===0?.035:FADE);bus.gain.setValueAtTime(1,start+FADE);bus.gain.setValueCurveAtTime(curve(false),start+300-FADE,FADE);
  const input=context.createGain();input.connect(dry);input.connect(room);
  const state={index,track,start,input,bus,dry,wet,room,cursor:0,score:scores.get(track.id)};parts.set(index,state);return state;
 }
 function schedule(until){
  if(disposed)return;if(origin===null)origin=context.currentTime+.06;
  const now=context.currentTime,horizon=until??now+.45,index=Math.max(0,Math.floor((now-origin)/SPACING));
  for(const k of [index-1,index,index+1].filter(k=>k>=0)){
   const start=origin+k*SPACING;if(start>horizon)continue;
   const p=part(k);
   while(p.cursor<p.score.length&&p.start+p.score[p.cursor].time<horizon){const event=p.score[p.cursor++],at=p.start+event.time;if(at>=now-.02){scheduleCampingNote(context,p.input,event,Math.max(now,at),buffers,active);scheduledNotes++;}}
  }
  for(const [k,p] of parts)if(now>p.start+303){for(const node of [p.input,p.bus,p.dry,p.wet,p.room])node.disconnect();parts.delete(k);}
 }
 return {schedule,getState(){const elapsed=origin===null?0:Math.max(0,context.currentTime-origin),index=Math.floor(elapsed/SPACING),track=CAMPING_TRACKS[order[index%10]];return {...MUSIC_FORMAT,trackCount:10,trackId:track.id,title:track.title,trackSeconds:elapsed%SPACING,playlist:[...order],crossfadeSeconds:FADE,scheduledNotes,activeVoices:active.size};},dispose(){disposed=true;for(const source of active){source.onended?.();try{source.stop();}catch{}}active.clear();for(const p of parts.values())for(const node of [p.input,p.bus,p.dry,p.wet,p.room])node.disconnect();parts.clear();}};
}
