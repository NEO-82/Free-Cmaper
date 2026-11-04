import test from 'node:test';
import assert from 'node:assert/strict';
import {HELICOPTER_CONFIG as config,helicopterGroundPose,stepHelicopter} from '../src/helicopter-flight.js';
import {CAMPING_TRACKS,MUSIC_FORMAT,composeCampingTrack} from '../src/camping-music-score.js';
const flat={heightAt:()=>2.5},initial={kind:'helicopter',x:0,z:0,bodyY:20,heading:0,grounded:false,engineOn:true,rotorSpeed:1};
function run(state,input,seconds,options=flat){for(let i=0;i<Math.round(seconds*120);i++)state=stepHelicopter(state,input,1/120,[],options);return state;}
test('helicopter cruise is 40 percent faster, with equal diagonal speed and reverse',()=>{
 for(const input of [{forward:true},{forward:true,left:true},{backward:true}]){
  const s=run(initial,input,10);assert.ok(Math.abs(s.speed-84*1.4)<1e-7);assert.equal(config.maxSpeed,117.6);
 }
});
test('holding descent lands on rotated sloping terrain without skid penetration, then shuts down after five seconds',()=>{
 for(const heading of [0,.8,2.4]){
  const heightAt=(x,z)=>2.5+.12*x+.15*z,options={heightAt};let s={...initial,heading};
  for(let i=0;i<3000&&!s.grounded;i++)s=stepHelicopter(s,{descend:true},1/120,[],options);
  assert.ok(s.grounded);assert.equal(s.speed,0);assert.equal(s.vy,0);assert.equal(s.engineOn,true);
  const pose=helicopterGroundPose(s.x,s.z,s.heading,heightAt,s.bodyY);
  for(const p of pose.samples){const skid=s.bodyY+Math.cos(s.pitch)*Math.sin(s.roll)*p.sx-Math.sin(s.pitch)*p.sz;assert.ok(skid>=p.height+.039);assert.ok(skid-p.height<.08);}
  s=run(s,{descend:true},4.9,options);assert.equal(s.engineOn,true);
  s=run(s,{descend:true},.15,options);assert.equal(s.engineOn,false);
  s=run(s,{descend:true},2,options);assert.equal(s.rotorSpeed,0);assert.equal(s.grounded,true);
  s=run(s,{rise:true},1,options);assert.equal(s.engineOn,true);assert.equal(s.grounded,false);assert.equal(s.landedFor,0);assert.ok(s.bodyY>pose.bodyY+2);
 }
});
test('near-ground descent brakes horizontal travel; unattended touchdown still shuts down and water stays above surface',()=>{
 let s=run({...initial,bodyY:5,vx:30,speed:30},{descend:true,forward:true},4);assert.equal(s.grounded,true);assert.equal(s.speed,0);
 s=run(s,{park:true},5.1);assert.equal(s.engineOn,false);
 s=run(initial,{descend:true},10,{heightAt:()=>-5,waterSurfaceAt:()=>0});assert.equal(s.grounded,true);assert.ok(Math.abs(s.bodyY-.04)<1e-6);
});
test('ten distinct original scores have exactly five minutes, developed arrangements, playable ranges and loop-friendly edges',()=>{
 assert.deepEqual(MUSIC_FORMAT,{bitDepth:32,sampleFormat:'float',channels:2,duration:300});assert.equal(CAMPING_TRACKS.length,10);
 const signatures=new Set();
 for(const t of CAMPING_TRACKS){
  assert.ok(Math.abs(t.bars*4*60/t.bpm-300)<1e-9);const score=composeCampingTrack(t);signatures.add(JSON.stringify(score));for(let sec=0;sec<300;sec+=10)assert.ok(score.some(n=>n.time>=sec&&n.time<sec+10),'no uncomposed spans');
  assert.equal(score[0].time,0);assert.ok(score.at(-1).time>295);assert.ok(score.every(n=>n.time<300&&n.time>=0&&n.note>=36&&n.note<=100&&n.duration>0&&n.gain>0));
  assert.ok(new Set(score.map(n=>n.voice)).size>=5);assert.equal(t.progression[0],0);assert.ok([0,4].includes(t.progression.at(-1)));
  const density=at=>score.filter(n=>n.time>=at&&n.time<at+10).length;assert.ok(density(100)>density(0),'middle has development beyond intro');
  // Bound normal and crossfade overlap so music remains below the audio voice budget.
  let peak=0;for(let time=0;time<303;time+=.25){const count=score.filter(n=>n.time<=time&&n.time+n.duration+1.8>time).length;peak=Math.max(peak,count);}assert.ok(peak<64,`peak ${peak}`);
 }
 assert.equal(signatures.size,10);
});
