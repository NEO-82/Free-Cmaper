// Ten original five-minute arrangements; notes are scale degrees, not borrowed melodies.
export const MUSIC_FORMAT=Object.freeze({bitDepth:32,sampleFormat:'float',channels:2,duration:300});
const major=[0,2,4,5,7,9,11];
export const CAMPING_TRACKS=Object.freeze([
 ['햇살 담은 피크닉',60,88,[0,4,5,3,0,5,1,4],[4,2,1,null,0,2,4,5,4,null,2,1,2,0,null,null],'guitar'],
 ['숲속의 돗자리',62,96,[0,3,1,4,5,3,4,0],[0,null,2,4,3,2,null,1,2,4,5,null,4,2,1,null],'flute'],
 ['바구니 속 봄바람',65,100,[0,5,3,4,2,5,1,4],[2,4,null,5,7,5,4,null,3,2,1,null,2,1,0,null],'piano'],
 ['나무 그늘 아래',57,80,[0,2,3,4,5,1,4,0],[4,null,2,null,1,0,1,null,2,null,3,2,1,null,0,null],'guitar'],
 ['호숫가의 오후',67,88,[0,4,3,0,5,2,1,4],[0,2,null,4,5,null,4,2,3,null,2,1,0,1,2,null],'flute'],
 ['캠핑 의자와 구름',59,96,[0,5,1,4,3,2,1,4],[2,null,4,2,0,null,1,2,4,5,null,4,2,1,0,null],'marimba'],
 ['노을빛 텐트',60,80,[0,3,5,4,2,3,1,4],[7,null,5,4,2,null,4,null,5,4,3,null,2,1,0,null],'piano'],
 ['별빛 아래 머무는 밤',62,80,[0,5,3,4,0,2,1,4],[4,null,null,2,1,null,0,null,2,null,4,null,3,2,1,null],'celesta'],
 ['바닷바람 산책',64,104,[0,1,3,4,5,2,1,4],[0,2,4,null,5,4,2,null,1,3,5,null,4,2,1,null],'guitar'],
 ['다시 떠나는 아침',65,96,[0,4,5,2,3,0,1,4],[2,1,0,null,4,5,7,null,5,4,2,null,3,2,1,null],'flute']
].map(([title,tonic,bars,progression,motif,lead],id)=>Object.freeze({id,title,tonic,bars,bpm:bars*.8,duration:300,progression,motif,lead})));
export function scaleNote(track,degree,octave=0){const oct=Math.floor(degree/7),d=((degree%7)+7)%7;return track.tonic+major[d]+12*(oct+octave);}
export function pickCampingTrack(random=Math.random){return CAMPING_TRACKS[Math.min(9,Math.max(0,Math.floor(random()*10)))];}
export function composeCampingTrack(track){
 const notes=[],beat=60/track.bpm,sections=[.68,.84,1,.72,.92,.65];
 function add(bar,at,degree,octave,duration,gain,voice,pan=0){const time=(bar*4+at)*beat;if(time>=300)return;notes.push({time,note:scaleNote(track,degree,octave),duration:duration*beat,gain,voice,pan});}
 for(let bar=0;bar<track.bars;bar++){
  const section=Math.min(5,Math.floor(bar/track.bars*6)),phrase=Math.floor(bar/8),degree=track.progression[bar%8],energy=sections[section];
  // Intro/outro share the same sparse texture. Last dominant resolves into the first tonic.
  const edge=bar<4||bar>=track.bars-4,quiet=section===3,melody=!edge&&bar%8!==7;
  add(bar,0,degree,-1,1.9,.19*energy,'bass',-.05);
  if(!quiet)add(bar,2,degree+4,-1,1.45,.13*energy,'bass',-.05);
  for(const at of edge?[0,2]:[0,1.5,2.5])for(let i=0;i<4;i++)add(bar,at+i*.035,degree+[0,2,4,6][i],0,edge?2.2:1.3,.065*energy,'guitar',-.32);
  // Gentle piano/celesta arpeggios answer the lead rather than doubling it.
  for(let i=0;i<(edge?2:4);i++)add(bar,.5+i*.85,degree+[2,4,6,4][(i+phrase)%4],1,1.1,.055*energy,section===4?'celesta':'piano',.35);
  if(bar%2===0)for(const interval of [0,2,4])add(bar,.07,degree+interval,0,7.8,.025*energy,'pad',interval===2?-.55:.55);
  if(melody)for(let i=0;i<4;i++){
   const m=track.motif[((bar%4)*4+i)%16];if(m===null)continue;
   // Middle sections develop the motif with chord-aware answers and octave lifts.
   const answer=bar%8>=4,variant=section===2&&i===2?2:0,d=answer?degree+[0,2,4,2][i]:m+variant;
   add(bar,i+(i%2?.07:0),d,1,quiet?1.55:.7+(i===3?.5:0),.12*energy,track.lead,0);
  }
  if(!edge&&!quiet)for(const at of [1,3])add(bar,at,0,0,.13,.018*energy,'shaker',at===1?-.55:.55);
 }
 return notes.sort((a,b)=>a.time-b.time);
}
