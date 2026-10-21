import {picnicNotes,PICNIC_BPM} from './picnic-score.js';
/** Original synthesized music and SFX: no network, media files or autoplay dependency. */
export function createAudio() {
  let context, musicBus, sfxBus, ambientBus, noise, ambientFilter, timer, nextBeat=0, beat=0, mode='calm', available=true;
  let ambience='clear';
  let settings={musicVolume:.35,sfxVolume:.65,muted:false}, lastHover=-1, effects=0;
  const midi=n=>440*2**((n-69)/12);
  function tone(frequency,at,length,gain,type='sine',bus=musicBus){
    if(!context||!bus)return;
    const oscillator=context.createOscillator(),envelope=context.createGain();
    oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,at);
    envelope.gain.setValueAtTime(.0001,at);envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),at+.016);
    envelope.gain.exponentialRampToValueAtTime(.0001,at+length);
    oscillator.connect(envelope);envelope.connect(bus);oscillator.start(at);oscillator.stop(at+length+.04);
    oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();};
  }
  function volumes(){if(!context)return;const now=context.currentTime;musicBus.gain.setTargetAtTime(settings.muted?0:settings.musicVolume*.38,now,.15);sfxBus.gain.setTargetAtTime(settings.muted?0:settings.sfxVolume*.5,now,.03);}
  function schedule(){
    if(!context||context.state!=='running')return;
    if(nextBeat<context.currentTime-.5)nextBeat=context.currentTime+.05;
    while(nextBeat<context.currentTime+.2){
      if(mode==='tense'){
        const bass=[45,45,48,43][Math.floor(beat/4)%4];tone(midi(bass),nextBeat,.25,.19,'triangle');
        tone(midi([69,72,68,71][beat%4]),nextBeat,.15,.065,'sine');
        if(beat%2===0)tone(82,nextBeat,.11,.25,'triangle');nextBeat+=.28;
      }else{
        for(const event of picnicNotes(beat)){
          const type={bass:'triangle',guitar:'triangle',bell:'sine',flute:'sine',shaker:'triangle'}[event.voice];
          tone(midi(event.note),nextBeat+event.offset,event.duration,event.gain,type);
          if(event.voice==='guitar')tone(midi(event.note)*2,nextBeat+event.offset,.13,event.gain*.18,'sine');
          if(event.voice==='flute')tone(midi(event.note)*2,nextBeat+event.offset,event.duration,event.gain*.12,'sine');
        }
        nextBeat+=60/PICNIC_BPM/2;
      }beat++;
    }
  }
  async function unlock(){
    if(!available)return;
    try{
      if(!context){const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio){available=false;return;}context=new Audio();musicBus=context.createGain();sfxBus=context.createGain();musicBus.connect(context.destination);sfxBus.connect(context.destination);volumes();
        const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),data=buffer.getChannelData(0);
        for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.3;
        noise=context.createBufferSource();noise.buffer=buffer;noise.loop=true;
        ambientFilter=context.createBiquadFilter();ambientFilter.type='lowpass';ambientFilter.frequency.value=600;
        ambientBus=context.createGain();ambientBus.gain.value=0;noise.connect(ambientFilter);ambientFilter.connect(ambientBus);ambientBus.connect(sfxBus);noise.start();
      }
      await context.resume();if(!timer){nextBeat=context.currentTime+.06;timer=setInterval(schedule,90);}schedule();
    }catch{available=false;}
  }
  function effect(kind='select'){
    if(!context||context.state!=='running'||settings.muted)return;
    const now=context.currentTime;
    if(kind==='hover'){if(now-lastHover<.075)return;lastHover=now;}
    effects++;
    const patterns={hover:[880],select:[660,990],item:[784,1047,1319],open:[523,784],close:[587,392],door:[185,247],chop:[105,76],mine:[660,330],dig:[130,95],collect:[659,880,1047],jump:[392,587],splash:[220,330,165],step:[125],repel:[392,784,1175],animal:[220,165,196]};
    const notes=patterns[kind]||patterns.select;
    notes.forEach((note,i)=>tone(note,now+i*.065,kind==='step'?.045:kind==='hover'?.065:.15,kind==='hover'?.08:kind==='step'?.05:.16,['chop','dig','step'].includes(kind)?'triangle':'sine',sfxBus));
  }
  return {unlock,effect,setAmbience(weather,wet=false){const kind=wet?'water':weather;if(kind===ambience)return;ambience=kind;if(ambientBus){ambientBus.gain.setTargetAtTime(wet ? .12 : weather==='rain' ? .16 : weather==='snow' ? .025 : weather==='overcast' ? .035 : 0,context.currentTime,1.5);ambientFilter.frequency.setTargetAtTime(wet?550:weather==='rain'?2200:450,context.currentTime,.8);}},setOptions(value){settings={...settings,...value};volumes();},setMode(value){if(value!==mode){mode=value;beat=0;nextBeat=(context?.currentTime??0)+.12;}},getState:()=>({mode,ambience,available,started:context?.state==='running',effects,...settings}),dispose(){clearInterval(timer);noise?.stop();context?.close();}};
}
