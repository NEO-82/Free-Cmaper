import { createMotorhomeInterior, INTERIOR_CHOICES, normalizeInterior, motorhomeBoarding } from './motorhome.js';
import * as THREE from 'three';
import { pathSurfaceHeight } from './paths.js';
import { createSwimEffects } from './swim-effects.js';
import { createPerson, stepPerson, jumpPerson, worldWaterAt } from './person-physics.js';
import { ARRIVAL, PARKING, TRAVEL_CHOICES, STARTING_GEAR, arrivalFor } from './journey.js';
import { createGateway } from './gateway.js';
import { createVehicle, stepDrive, dismountPosition } from './vehicles.js';
import { createWorldMap } from './worldmap.js';
import { DEFAULT_OPTIONS, normalizeOptions, lookAngles, movementSpeed, togglePosture, timeAdvances, canJump } from './controls.js';
import { translate, seasonKeys } from './i18n.js';
import { WORLD, SHOP, SHOP_SITES, SUMMIT, SUMMITS, MOUNTAINS, BRIDGE, MAINLAND, LAKE, COAST_START, coastDistance, terrainHeight, isWater, resolveMovement, trailPoint, TRAIL_SAMPLES } from './terrain.js';
import { sampleWeather } from './weather.js';
import { createScenery } from './scenery.js';
import { createMarine } from './marine.js';
import { createAudio } from './audio.js';
import { createWorld } from './world.js';
import { createAtmosphere, weatherTextures } from './atmosphere.js';
import { poseBedRest, restStep, smoothRest } from './rest.js';
import { createCamper, poseCamper, ANIMAL_SPECIES } from './characters.js';
import { outdoorCameraPosition, zoomDistance, isFirstPerson, driverEye } from './camera.js';
import { createWildlife, animateWildlife, dangerHours, dangerEncounter, wildlifePosition } from './wildlife.js';
import { findCampLocation } from './placement.js';
import { createShop, createTent } from './structures.js';
import { GOODS, DEFAULT_TENT_CONFIG, TENT_CHOICES, tentPrice, buyItem, sellItem, buyTent, LOGS_PER_TREE } from './economy.js';

const $ = s => document.querySelector(s);
let options = { ...DEFAULT_OPTIONS };
try { options = normalizeOptions(JSON.parse(localStorage.getItem('free-camper-options')) ?? {}); } catch { /* Private browsing can disable storage. */ }
const t = key => translate(key, options.language);
let season = 0, mode = 'sedan', running = false, paused = false, elapsed = 0, money = 180000;
let camp = null, clean = false, protectedCamp = false, danger = false, campCount = 0;
let backpackOpen = false, optionsOpen = false, posture = 'stand', jumpHeight = 0, jumpVelocity = 0;
let target = null, yaw = 0, pitch = 0.32, dist = 9.5, weather = 'clear', weatherTick = -1, lastEncounter = 0;
let inventory = new Map();
const visited = new Set(), keys = new Set();
let tentConfig = { ...DEFAULT_TENT_CONFIG }, tentDraft = { ...DEFAULT_TENT_CONFIG }, shopOpen = false, cameraMode = 'outdoor', actionAt = -1000, treeCount = 0;
let contextAction = null, activeTool = null, lastHUD = 0;
let activeThreat=null;
let threatSpawned = false, sceneDirty = true, simulationSeconds = 0;
let person=null;
let rvInside = false, rvRoom = null;
let rvSettings = normalizeInterior();
try { rvSettings = normalizeInterior(JSON.parse(localStorage.getItem('free-camper-rv'))); } catch {}
let bedRest = null, phase = 'title', mapOpen = false, mapWasPaused = false, vehicle = null, driving = false;
let diveDepth = 0, selectedItem = 0, lastFootstep = 0, pauseChangedAt = -1000;
let weatherProfile = sampleWeather(season);
const audio = createAudio();
const harvested = new Set();
const goods = GOODS.filter(item => !['tent', 'firewood', 'stone', 'soil', 'water'].includes(item.id));
const app = $('#app');
app.innerHTML = `
<div id="scene"></div>
<section id="title-screen" class="title-screen" aria-label="Free Camper">
  <div class="title-content"><div class="brand">FREE CAMPER <span>— 01</span></div>
    <div class="eyebrow">A LITTLE CLOSER TO THE QUIET</div><h1 data-i18n="title"></h1>
    <p data-i18n="titleNote"></p><nav class="title-nav"><button id="start" class="primary" data-i18n="start">${t('start')}</button><button id="title-options" data-i18n="options">${t('options')}</button></nav>
  </div><div class="title-footer"><span data-i18n="menuFooter"></span><span>TAKE YOUR TIME. STAY A WHILE.</span></div>
</section>
<div id="home" class="overlay hidden"><main class="home">
  <button id="prep-back" class="text-button" data-i18n="back"></button><div class="brand">FREE CAMPER / <span data-i18n="subtitle"></span></div>
  <h1 data-i18n="prepTitle"></h1><p data-i18n="prepNote"></p><span class="tag" data-i18n="prepStep"></span>
  <h3 data-i18n="who"></h3><div class="row"><label><span data-i18n="animalSpecies"></span><select id="species" data-label="animalSpecies">${ANIMAL_SPECIES.map(id=>`<option value="${id}" data-i18n="${id}"></option>`).join('')}</select></label></div>
  <h3 data-i18n="chooseSeason"></h3><div id="seasons" class="row">${seasonKeys.map((s, i) => `<button data-season="${i}" data-i18n="${s}" class="${i === 0 ? 'active' : ''}" aria-pressed="${i === 0}"></button>`).join('')}</div>
  <h3 data-i18n="transport"></h3><div id="travel" class="travel-grid">${TRAVEL_CHOICES.map(kind=>`<button data-mode="${kind}" class="${mode===kind?'active':''}" aria-pressed="${mode===kind}" data-i18n="${kind}Choice"></button>`).join('')}</div><p class="note" data-i18n="islandStartNote"></p><button id="begin-prep" class="primary depart" data-i18n="beginPrep"></button>
</main></div>
<div id="world-map-modal" class="modal hidden"><section class="dialog world-map-dialog" role="dialog" aria-modal="true" aria-labelledby="world-map-title"><header><div><div class="eyebrow">FREE CAMPER / WORLD</div><h2 id="world-map-title" data-i18n="worldMap"></h2></div><button id="world-map-close" data-i18n="closeMap"></button></header><p class="small" data-i18n="mapNote"></p><canvas id="world-map-canvas" role="img" aria-label="World map"></canvas><footer><span id="map-position"></span><span data-i18n="mapLegend"></span></footer></section></div>
<div id="hud" class="hud hidden"><div><div class="top"><div class="glass"><div class="brand">FREE CAMPER</div><div id="clock" class="clock"></div><div id="weather" class="small"></div><div id="pause-badge" class="pause-badge hidden" data-i18n="pausedBadge"></div></div><div class="glass"><div id="balance"></div><div id="status" class="small"></div></div></div>
<div class="glass mission"><div data-i18n="missionTitle"></div><div id="missions" class="small"></div></div></div>
<div class="bottom"><div><div class="context-action"><div id="interact" class="interaction-hint"><kbd>F</kbd> <span id="interaction-label"></span></div><span id="location-label"></span></div><div class="small help" data-i18n="menuHint"></div><div id="journal" class="small"></div></div>
<div id="map" class="map" role="img" aria-label="Island map"><canvas id="mini-map"></canvas></div></div></div>
<div id="pause-menu" class="modal hidden"><section class="dialog pause-dialog" role="dialog" aria-modal="true" aria-labelledby="pause-title"><header><div><div class="eyebrow">A MOMENT TO YOURSELF</div><h2 id="pause-title" data-i18n="pauseTitle"></h2></div><button id="pause" class="primary" data-i18n="resume"></button></header><p data-i18n="pauseNote"></p><div class="actions"><button id="camp" class="primary" data-i18n="camp"></button><button id="clean" data-i18n="clean"></button><button id="protect" data-i18n="protect"></button><button id="repel" data-i18n="repel"></button><button id="backpack-toggle"><span data-i18n="backpack"></span> <kbd>B</kbd></button><button id="shop-toggle" data-i18n="shop"></button><button id="sleep" data-i18n="rest"></button><button id="return" data-i18n="return"></button></div><button id="open-map" data-i18n="worldMap"></button><button id="game-options" data-i18n="options"></button><p class="small" data-i18n="controlsNote"></p></section></div>
<div id="shop-modal" class="modal hidden"><section class="dialog shop-dialog" role="dialog" aria-modal="true" aria-labelledby="shop-heading"><header><div><div class="eyebrow">TRAIL OUTFITTER</div><h2 id="shop-heading" data-i18n="shopTitle"></h2></div><button id="shop-close" data-i18n="close"></button></header><div id="shop"></div></section></div>
<div id="backpack-modal" class="backpack-bubble hidden"><section class="backpack-dialog" role="dialog" aria-labelledby="backpack-heading"><header><div><div class="eyebrow">MY LITTLE BACKPACK</div><h2 id="backpack-heading" data-i18n="backpackTitle"></h2></div><button id="backpack-close" data-i18n="close"></button></header><p class="small" data-i18n="backpackNote"></p><div id="backpack-items" class="inventory-grid"></div><footer data-i18n="backpackClose"></footer><p class="small" data-i18n="bagHint"></p></section></div>
<div id="options-modal" class="modal hidden"><section class="dialog options-dialog" role="dialog" aria-modal="true" aria-labelledby="options-heading"><header><div><div class="eyebrow">MAKE YOURSELF COMFORTABLE</div><h2 id="options-heading" data-i18n="options"></h2></div><button id="options-close" data-i18n="close"></button></header><p class="small" data-i18n="optionsNote"></p>
<label class="setting" for="brightness"><span data-i18n="brightness"></span><output id="brightness-value"></output><input id="brightness" type="range" min="60" max="150" step="5"></label>
<label class="setting" for="sensitivity"><span data-i18n="sensitivity"></span><output id="sensitivity-value"></output><input id="sensitivity" type="range" min="0.2" max="3" step="0.1"></label>
<label class="setting" for="music-volume"><span data-i18n="musicVolume"></span><output id="music-value"></output><input id="music-volume" type="range" min="0" max="100" step="5"></label><label class="setting" for="sfx-volume"><span data-i18n="sfxVolume"></span><output id="sfx-value"></output><input id="sfx-volume" type="range" min="0" max="100" step="5"></label><label class="setting toggle" for="muted"><span data-i18n="muted"></span><input id="muted" type="checkbox"></label>
<label class="setting toggle" for="invert-x"><span data-i18n="invertX"></span><input id="invert-x" type="checkbox"></label><label class="setting toggle" for="invert-y"><span data-i18n="invertY"></span><input id="invert-y" type="checkbox"></label>
<label class="setting language-setting" for="language"><span data-i18n="language"></span><select id="language"><option value="ko">한국어</option><option value="en">English</option></select></label>
<h3 data-i18n="controls"></h3><div class="control-grid">${[['W A S D','move'],['Mouse','look'],['Space','jump'],['Left Shift','run'],['Left Ctrl','sneak'],['C','crouch'],['V','prone'],['B','backpack'],['F','interact'],['Q / Space','dive'],['M','worldMap'],['ESC','pause']].map(([key,label]) => `<div><kbd>${key}</kbd><span data-i18n="${label}"></span></div>`).join('')}</div><p class="small" data-i18n="controlsNote"></p><div id="save-warning" class="small" role="status"></div></section></div>
<div id="toast" class="toast hidden" role="status"></div>`;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#acc4c0');
scene.fog = new THREE.FogExp2('#b5c6bd', 0.006);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
$('#scene').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.08, 9000);
const ambient = new THREE.HemisphereLight('#d7edff', '#7d9564', 2);
scene.add(ambient);
const sun = new THREE.DirectionalLight('#fff0d0', 3);
sun.position.set(-40, 60, -20); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -65, right: 65, top: 65, bottom: -65, far: 340 });
sun.shadow.normalBias = 0.04; sun.shadow.bias = -0.00012; sun.shadow.radius = 2;
scene.add(sun, sun.target);
function mesh(geo, color, x, y, z, parent = scene) {
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
const world = createWorld(scene);
const scenery = createScenery(scene);
const marine = createMarine(scene);
const atmosphere = createAtmosphere(scene);
const swimEffects=createSwimEffects(scene);
const gateway=createGateway(scene);
const worldMap=createWorldMap($('#world-map-canvas'));
const miniMap=createWorldMap($('#mini-map'),{size:240,labels:false});
const shopBuildings=SHOP_SITES.map(site=>createShop(scene,{x:site.x,y:terrainHeight(site.x,site.z),z:site.z}));
let shopBuilding=shopBuildings[0];
let seed = 82;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

const camper = createCamper(scene), player = camper.root;
player.position.set(SHOP.x, terrainHeight(SHOP.x, -12), -12);

// A separate, quiet title scene: a seated camper, rolling hill and a distant sunset.
const titleScene = new THREE.Scene();
titleScene.fog = new THREE.FogExp2('#c88975', 0.0035);
const titleCamera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 700);
titleCamera.position.set(11, 9, 23); titleCamera.lookAt(-3, 6, -20);
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 20), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  vertexShader: 'varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'varying vec3 vPosition; void main(){float h=normalize(vPosition).y; vec3 c=mix(vec3(.94,.58,.38),vec3(.24,.29,.39),smoothstep(-.06,.65,h));gl_FragColor=vec4(c,1.);}',
})); titleScene.add(skyDome);
titleScene.add(new THREE.HemisphereLight('#ffd0a0', '#314844', 2));
const sunsetLight = new THREE.DirectionalLight('#ffb16c', 3); sunsetLight.position.set(-35, 12, -90); titleScene.add(sunsetLight);
const sunset = new THREE.Mesh(new THREE.SphereGeometry(8, 40, 24), new THREE.MeshBasicMaterial({ color: '#ffda9b' }));
sunset.position.set(-35, 14, -130); titleScene.add(sunset);
const hill = mesh(new THREE.SphereGeometry(1, 48, 24), '#455b48', 0, -9, 0, titleScene); hill.scale.set(48, 13, 42);
for (let i = 0; i < 6; i++) {
  const h = mesh(new THREE.SphereGeometry(1, 24, 16), i % 2 ? '#65746b' : '#7d8072', -100 + i * 45, -16, -90 - i % 2 * 25, titleScene);
  h.scale.set(45, 12 + i % 3 * 2, 30);
}
const menuCamper = createCamper(titleScene);
menuCamper.root.position.set(10, 3.7, 2); menuCamper.root.rotation.y = Math.PI + 0.32;
poseCamper(menuCamper, 'sit');
mesh(new THREE.DodecahedronGeometry(1), '#6b7661', 12, 3.4, 4, titleScene).scale.set(1.7, 0.6, 1.3);
for (let i = 0; i < 22; i++) {
  const x = 18 + rand() * 25, z = -35 + rand() * 30, h = 4 + rand() * 5;
  mesh(new THREE.CylinderGeometry(0.16, 0.3, h, 5), '#414839', x, h / 2 - 0.3, z, titleScene);
  mesh(new THREE.ConeGeometry(h * 0.4, h * 1.2, 6), '#334e43', x, h * 0.95, z, titleScene);
}

const rvPanel = document.createElement('div');
rvPanel.id='rv-controls'; rvPanel.className='hidden';
rvPanel.innerHTML=Object.entries(INTERIOR_CHOICES).map(([key,values])=>`<label><span data-i18n="rv${key}">${t('rv'+key)}</span> <select id="rv-${key}">${values.map(v=>`<option data-i18n="rv${v}" value="${v}" ${rvSettings[key]===v?'selected':''}>${t('rv'+v)}</option>`).join('')}</select></label>`).join('');
$('#pause-menu .dialog').append(rvPanel);
const rvHeading=document.createElement('h3');rvHeading.id='rv-custom';rvHeading.className='hidden';rvHeading.dataset.i18n='rvCustom';rvHeading.textContent=t('rvCustom');rvPanel.before(rvHeading);
rvPanel.addEventListener('change',()=>{
  rvSettings=normalizeInterior(Object.fromEntries(Object.keys(INTERIOR_CHOICES).map(k=>[k,$('#rv-'+k).value])));
  rvRoom.configure(rvSettings);sceneDirty=true;
  try{localStorage.setItem('free-camper-rv',JSON.stringify(rvSettings));}catch{toast('saveUnavailable');}
});
function openRV(){
  if(!vehicle||vehicle.state.kind!=='motorhome'||Math.abs(vehicle.state.speed)>.7)return;
  clearThreat();
  rvRoom?.dispose();rvRoom=createMotorhomeInterior(rvSettings);rvRoom.mount(scene,vehicle.root);player.visible=false;rvInside=true;driving=false;yaw=Math.PI;pitch=.32;clearMovement();sceneDirty=true;syncMenus();renderHUD();toast('rvWelcome');
}
function leaveRV(drive=false){
  if(!rvInside)return;
  if(!drive&&!dismountPosition(vehicle.state,allColliders().filter(c=>c.id!=='player-vehicle'))){toast('noDismount');return;}
  rvInside=false;rvRoom.dispose();rvRoom=null;sceneDirty=true;camera.up.set(0,1,0);
  $('[data-i18n="menuHint"]').textContent=t('menuHint');
  if(drive){cameraMode='outdoor';enterVehicle();}else exitVehicle();
  syncMenus();renderHUD();
}
function interactRV(){
  if(rvRoom.resting){rvRoom.toggleRest();sceneDirty=true;return;}
  const item=rvRoom.nearest();if(!item)return;
  if(item.id==='rvExit')leaveRV();
  else if(item.id==='rvDrive')leaveRV(true);
  else if(item.id==='rvBed'){rvRoom.toggleRest();audio.effect('open');}
  else if(item.id==='rvCook'){if((inventory.get('food')??0)>0){inventory.set('food',inventory.get('food')-1);elapsed+=15;toast('rvMeal');audio.effect('collect');}else toast('rvNoFood');}
  else if(item.id==='rvToilet'){elapsed+=5;toast('rvFresh');audio.effect('water');}
  sceneDirty=true;
}
function renderRV(dt, realSeconds){
  if(advancing()){
    const v=new THREE.Vector3(Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),0,Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp')));
    if(v.length())v.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),yaw).multiplyScalar(dt*1.8);
    rvRoom.move(v.x,v.z);elapsed+=realSeconds;simulationSeconds+=dt;
    if(elapsed>=7*24*120){rvInside=false;rvRoom.dispose();rvRoom=null;finish();return;}
  }
  const p=rvRoom.position;
  const localEye=rvRoom.resting?new THREE.Vector3(0,1.15,-2):new THREE.Vector3(p.x,1.8,p.z);
  const localTarget=rvRoom.resting?new THREE.Vector3(Math.sin(yaw)*.5,2.9,-2+Math.cos(yaw)*.5):new THREE.Vector3(p.x-Math.sin(yaw)*Math.cos(pitch-.32)*5,1.8-Math.sin(pitch-.32)*5,p.z-Math.cos(yaw)*Math.cos(pitch-.32)*5);
  camera.position.copy(rvRoom.toWorld(localEye));camera.up.set(0,1,0).applyQuaternion(rvRoom.scene.quaternion);camera.lookAt(rvRoom.toWorld(localTarget));
  player.visible=false;
  const daylight=THREE.MathUtils.clamp(Math.sin((hour()-5)/14*Math.PI),.10,1);
  ambient.intensity=night()?.65:1.4+Math.sqrt(daylight)*1.8;sun.intensity=daylight*2.5;
  const center=vehicle.root.position;
  sun.target.position.copy(center);sun.position.set(center.x+Math.cos(hour()/24*Math.PI*2)*80,center.y+Math.max(16,daylight*110),center.z-45);
  const sky=atmosphere.update(hour(),weather,elapsed,center,weatherProfile,season);
  scene.fog.color.copy(sky.horizon);scene.fog.density=weather==='fog'?.0045:.00038;
  if(advancing()){world.animate(dt,elapsed,center);marine.update(dt,elapsed,center);world.updateCover(center,camp?.bounds);}
  renderer.render(scene,camera);
  if(performance.now()-lastHUD>250){renderHUD();lastHUD=performance.now();}
  $('[data-i18n="menuHint"]').textContent=t('rvMenuHint');
  $('#status').textContent=t('rvInterior')+' · '+t(rvRoom.resting?'lyingBack':'stand');
  $('#interaction-label').textContent=t(rvRoom.resting?'rvGetUp':rvRoom.nearest()?.id??'rvExplore');
  $('#location-label').textContent=t('rvInterior');$('#journal').textContent=t('rvWelcome');$('#pause-badge').classList.toggle('hidden',advancing());
}
const animals = createWildlife(scene,{colliders:world.colliders});
const count = 1400, positions = new Float32Array(count * 3);
for (let i = 0; i < count; i++) { positions[i * 3] = rand() * 160 - 80; positions[i * 3 + 1] = rand() * 65; positions[i * 3 + 2] = rand() * 160 - 80; }
const particlesGeo = new THREE.BufferGeometry(); particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const precipitationMaps = weatherTextures();
const particles = new THREE.Points(particlesGeo, new THREE.PointsMaterial({ color: '#f6d9df', size: 0.28, transparent: true, opacity: 0.85, depthWrite: false, alphaTest: 0.03, map: precipitationMaps.blossoms })); scene.add(particles);
function applySeason() {
  world.updateSeason(season);
  particles.material.color.set(['#f6d4df', '#c0dce8', '#e4ad61', '#ffffff'][season]);
} applySeason();

function toast(key) {
  $('#toast').textContent = t(key); $('#toast').classList.remove('hidden');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.add('hidden'), 4500);
}
function advancing() { return timeAdvances({ running, paused, backpackOpen, optionsOpen, hidden: document.hidden || shopOpen || mapOpen }); }
function clearMovement() { keys.clear(); target = null; }
function releaseMouse() { if (document.pointerLockElement) document.exitPointerLock(); }
function syncMenus() {
  $('#pause-menu').classList.toggle('hidden', !running || !paused || optionsOpen || shopOpen || backpackOpen || mapOpen);
  $('#backpack-modal').classList.toggle('selectable', paused);
  document.body.classList.toggle('in-menu', paused);

  for(const id of ['camp','clean','protect','repel','shop-toggle','sleep']) $('#'+id).disabled=phase!=='world'||driving||rvInside;
  $('#open-map').disabled=phase!=='world'||rvInside;
  $('#backpack-toggle').disabled=rvInside;
  $('#rv-custom').classList.toggle('hidden', !rvInside);
  $('#rv-controls').classList.toggle('hidden', !rvInside);
}
function setPaused(value) {
  paused = value; pauseChangedAt = performance.now(); clearMovement();
  if (paused) releaseMouse();
  else { ['options','shop','backpack'].forEach(kind => { $(`#${kind}-modal`).classList.add('hidden'); }); optionsOpen = shopOpen = backpackOpen = false; document.activeElement?.blur(); }
  audio.effect(value ? 'open' : 'close'); syncMenus(); renderHUD();
}
function openModal(kind) {
  clearMovement();
  if (kind === 'shop' && running) paused = true;
  if (kind === 'options') { optionsOpen = true; syncOptions(); }
  else if (kind === 'shop') { shopOpen = true; renderShop(); }
  else { backpackOpen = true; selectedItem = 0; renderBackpack(); }
  releaseMouse(); audio.effect('open');
  $(`#${kind}-modal`).classList.remove('hidden'); syncMenus();
  if (kind !== 'backpack' || paused) $(`#${kind}-close`).focus(); else document.activeElement?.blur();
  renderHUD();
}
function closeModal(kind) {
  if (kind === 'options') optionsOpen = false; else if (kind === 'shop') shopOpen = false; else backpackOpen = false;
  $(`#${kind}-modal`).classList.add('hidden'); clearMovement(); audio.effect('close');
  document.activeElement?.blur(); syncMenus(); renderHUD();
}
const canAct = () => running && !optionsOpen && !shopOpen && !backpackOpen;
$('#title-options').onclick = $('#game-options').onclick = () => openModal('options');
$('#options-close').onclick = () => closeModal('options');
$('#backpack-close').onclick = () => closeModal('backpack');
$('#shop-close').onclick = () => closeModal('shop');
$('#backpack-toggle').onclick = () => { if (running && !optionsOpen) openModal('backpack'); };
$('#start').onclick=()=>{audio.unlock();phase='setup';sceneDirty=true;$('#title-screen').classList.add('hidden');$('#home').classList.remove('hidden');$('#species').focus();};
$('#begin-prep').onclick=()=>{
 const arrival=arrivalFor(mode);phase='world';cameraMode='outdoor';running=true;paused=false;
 scene.add(player);player.position.set(arrival.x,terrainHeight(arrival.x,arrival.z),arrival.z);person=createPerson(player.position);yaw=-Math.PI/2;pitch=.32;player.rotation.y=Math.PI/2;
 STARTING_GEAR.forEach(id=>inventory.set(id,1));camper.backpack.visible=true;
 vehicle=createVehicle(scene,mode,PARKING,Math.PI/2);elapsed=240;weatherTick=lastEncounter=2;weatherProfile=sampleWeather(season);weather=weatherProfile.kind;
 $('#home').classList.add('hidden');$('#hud').classList.remove('hidden');document.activeElement?.blur();clearMovement();updateInterior();syncMenus();renderHUD();toast('islandWelcome');
};
$('#species').addEventListener('change',()=>{const value={species:$('#species').value};camper.configure(value);menuCamper.configure(value);poseCamper(menuCamper,'sit');sceneDirty=true;});
$('#prep-back').onclick=()=>{phase='title';$('#home').classList.add('hidden');$('#title-screen').classList.remove('hidden');$('#start').focus();};
function syncOptions() {
  sceneDirty = true;
  $('#brightness').value = options.brightness; $('#brightness-value').value = `${options.brightness}%`;
  $('#sensitivity').value = options.sensitivity; $('#sensitivity-value').value = `${options.sensitivity.toFixed(1)}×`;
  $('#invert-x').checked = options.invertX; $('#invert-y').checked = options.invertY; $('#language').value = options.language;
  renderer.toneMappingExposure = options.brightness / 100;
  $('#music-volume').value = options.musicVolume * 100; $('#music-value').value = `${Math.round(options.musicVolume*100)}%`;
  $('#sfx-volume').value = options.sfxVolume * 100; $('#sfx-value').value = `${Math.round(options.sfxVolume*100)}%`; $('#muted').checked = options.muted; audio.setOptions(options);
}
function localize() {
  document.documentElement.lang = options.language;
  document.title = `Free Camper · ${t('subtitle')}`;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-label]').forEach(el => el.setAttribute('aria-label', t(el.dataset.label)));
  $('#pause').textContent = t('resume');
  if (shopOpen) renderShop();
  if (backpackOpen) renderBackpack();
  $('#toast').classList.add('hidden'); renderHUD();
}
$('#options-modal').addEventListener('input', e => {
  const ids = { brightness: 'brightness', sensitivity: 'sensitivity', 'invert-x': 'invertX', 'invert-y': 'invertY', language: 'language', 'music-volume': 'musicVolume', 'sfx-volume': 'sfxVolume', muted: 'muted' };
  const key = ids[e.target.id]; if (!key) return;
  options[key] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'range' ? +e.target.value : e.target.value;
  if (key === 'musicVolume' || key === 'sfxVolume') options[key] /= 100;
  options = normalizeOptions(options); syncOptions(); audio.effect('item');
  if (key === 'language') localize();
  try { localStorage.setItem('free-camper-options', JSON.stringify(options)); $('#save-warning').textContent = ''; }
  catch { $('#save-warning').textContent = t('saveUnavailable'); }
});
$('#seasons').onclick = e => {
  if (e.target.dataset.season === undefined) return; season = +e.target.dataset.season;
  $('#seasons').querySelectorAll('button').forEach((b, i) => { b.classList.toggle('active', i === season); b.setAttribute('aria-pressed', i === season); }); applySeason();
};
$('#travel').onclick = e => {
  if (!e.target.dataset.mode) return; mode = e.target.dataset.mode;
  $('#travel').querySelectorAll('button').forEach(b => { b.classList.toggle('active', b.dataset.mode === mode); b.setAttribute('aria-pressed', b.dataset.mode === mode); });
};
function drawMap(){worldMap.draw({player:player.position,vehicle:vehicle?.state,camp:camp?.group.position,heading:driving?vehicle.state.heading:player.rotation.y,t});$('#map-position').textContent=`${t('yourPosition')} ${Math.round(player.position.x)}, ${Math.round(player.position.z)} m`;}
function toggleWorldMap(){
  if(rvInside||phase!=='world'||optionsOpen||shopOpen)return;
  if(mapOpen){mapOpen=false;$('#world-map-modal').classList.add('hidden');setPaused(mapWasPaused);return;}
  if(backpackOpen)closeModal('backpack');mapWasPaused=paused;mapOpen=true;setPaused(true);drawMap();$('#world-map-modal').classList.remove('hidden');$('#world-map-close').focus();
}
$('#world-map-close').onclick=toggleWorldMap;$('#open-map').onclick=toggleWorldMap;

function hour() { return (5 + elapsed / 120) % 24; }
function night() { return hour() < 6 || hour() >= 19; }
function finish() {
  clearThreat();world.setCampGround(null);
  rvInside=false;rvRoom?.dispose();rvRoom=null;camera.up.set(0,1,0);
  running = false; clearMovement(); releaseMouse(); $('#shop-modal').classList.add('hidden'); shopOpen = false;
  $('#hud').classList.add('hidden'); $('#pause-menu').classList.add('hidden'); $('#backpack-modal').classList.add('hidden'); $('#options-modal').classList.add('hidden'); backpackOpen = optionsOpen = false; paused = false; syncMenus(); audio.setMode('calm');
  const el = document.createElement('div'); el.className = 'end';
  el.innerHTML = `<div><div class="brand">UNTIL NEXT TIME</div><h1>${t('endTitle')}</h1><p>${Math.min(7, Math.floor(elapsed / 2880) + 1)} ${t('tripDays')} · ${campCount} ${t('camps')} · ${visited.size} ${t('views')}<br>${t('remaining')} ₩${money.toLocaleString()}</p><button id="again" class="primary">${t('again')}</button></div>`;
  app.appendChild(el); $('#again').onclick = () => location.reload(); $('#again').focus();
}
$('#return').onclick = () => { if (canAct()) finish(); };
$('#pause').onclick = () => setPaused(false);
function displayPosture(moving = ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].some(key=>keys.has(key))) {
  if (posture !== 'stand') return posture;
  return keys.has('ControlLeft') ? 'sneak' : keys.has('ShiftLeft') && moving ? 'run' : 'stand';
}
function setPosture(next) { if (bedRest || driving || jumpHeight > 0) return; posture = togglePosture(posture, next); poseCamper(camper, posture); renderHUD(); }
const gameCodes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'KeyC', 'KeyV', 'KeyB', 'KeyF', 'KeyQ', 'KeyM', 'ControlLeft', 'ControlRight'];
addEventListener('keydown', e => {
  const modal = optionsOpen ? 'options' : backpackOpen ? 'backpack' : shopOpen ? 'shop' : mapOpen ? 'world-map' : null;
  if (modal && e.code === 'Tab') {
    const nodes = [...$(`#${modal}-modal`).querySelectorAll('button, input, select, [tabindex="0"]')];
    const first = nodes[0], last = nodes.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  if (e.code === 'Escape' && !e.repeat) {
    e.preventDefault(); if(mapOpen){toggleWorldMap();return;} if (!running) { if (modal) closeModal(modal); return; }
    if (modal) { closeModal(modal); if (!paused) setPaused(true); }
    else if (performance.now() - pauseChangedAt > 160) setPaused(!paused);
    return;
  }
  if(e.code==='KeyM'&&running&&!e.repeat){e.preventDefault();toggleWorldMap();return;}
  if (backpackOpen && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)) {
    e.preventDefault(); const count = inventory.size; selectedItem = (selectedItem + (['ArrowLeft','ArrowUp'].includes(e.code) ? -1 : 1) + count) % Math.max(1,count); audio.effect('item'); renderBackpack(); return;
  }
  const editing = e.target.matches('input, select, textarea, [contenteditable="true"]');
  if (e.code === 'KeyB' && running && !mapOpen && !driving && !rvInside && !optionsOpen && !shopOpen && !editing && !e.repeat) {
    e.preventDefault(); if (backpackOpen) closeModal('backpack'); else openModal('backpack'); return;
  }
  if (!advancing() || editing || modal) return;
  if (gameCodes.includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if(rvInside){if(!e.repeat&&e.code==='KeyF')interactRV();return;}
  if (!e.repeat && e.code === 'KeyF') interact();
  if (!e.repeat && e.code === 'KeyC') setPosture('crouch');
  if (!e.repeat && e.code === 'KeyV') setPosture('prone');
  if (!e.repeat && e.code === 'Space' && !driving && canJump({cameraMode,resting:!!bedRest,water:inWater(),posture,height:jumpHeight,grounded:person?.grounded??true}) && person && jumpPerson(person,{sprint:keys.has('ShiftLeft')&&!keys.has('ControlLeft')&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].some(key=>keys.has(key))})) { jumpVelocity = person.vy; jumpHeight = 0.001; audio.effect('jump'); renderHUD(); }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', clearMovement);
document.addEventListener('visibilitychange', () => { previous = performance.now(); clearMovement(); renderHUD(); });
document.addEventListener('pointerlockchange', () => { clearMovement(); if (!document.pointerLockElement && running && !paused && !backpackOpen && !optionsOpen && !shopOpen) setPaused(true); });
function look(dx, dy) { if (advancing()) ({ yaw, pitch } = lookAngles(yaw, pitch, dx, dy, options)); }
document.addEventListener('mousemove', e => { if (document.pointerLockElement === renderer.domElement) look(e.movementX, e.movementY); });
let touchPosition = null, mouseDragging = false;
renderer.domElement.addEventListener('pointerdown', e => {
  if (!advancing()) return;
  if (e.pointerType === 'touch') { touchPosition = { x: e.clientX, y: e.clientY }; renderer.domElement.setPointerCapture(e.pointerId); }
  else if (!document.pointerLockElement) {
    mouseDragging = true;
    try { const promise = renderer.domElement.requestPointerLock?.(); promise?.catch(() => toast('mouseFallback')); } catch { toast('mouseFallback'); }
  }
});
renderer.domElement.addEventListener('pointermove', e => {
  if (document.pointerLockElement) return;
  if (e.pointerType === 'touch') { if (touchPosition) { look(e.clientX - touchPosition.x, e.clientY - touchPosition.y); touchPosition = { x: e.clientX, y: e.clientY }; } }
  else if (mouseDragging) look(e.movementX, e.movementY);
});
renderer.domElement.addEventListener('pointerup', () => { touchPosition = null; mouseDragging = false; });
renderer.domElement.addEventListener('pointercancel', () => { touchPosition = null; mouseDragging = false; });
renderer.domElement.addEventListener('wheel', e => { if (advancing()&&!rvInside) { e.preventDefault(); dist=zoomDistance(dist,e.deltaY,e.deltaMode);sceneDirty=true; } }, {passive:false});
$('#camp').onclick = placeCamp;
$('#clean').onclick = () => { if (!canAct()) return; if (!camp) { toast('needCamp'); return; } clean = true; toast('cleanDone'); renderHUD(); };
$('#protect').onclick = () => { if (!canAct()) return; if (!camp) { toast('needCamp'); return; } if (!inventory.has('repellent')) { toast('needRepellent'); return; } protectedCamp = true; toast('protectDone'); };
$('#repel').onclick = () => { if (!canAct()) return; if (!danger) { toast('noAnimal'); return; } if (!inventory.has('repellent')) { toast('needRepellent'); return; } clearThreat(); audio.effect('repel'); audio.setMode('calm'); toast('repelDone'); renderHUD(); };
$('#sleep').onclick = () => { if (!canAct()) return; if (!camp) { toast('needCamp'); return; } elapsed += 120; toast('restDone'); renderHUD(); };
function nearShop(){return cameraMode==='shop'&&flatDistance(shopBuilding.ownerPosition)<5.6;}
function flatDistance(point) { return Math.hypot(player.position.x - point.x, player.position.z - point.z); }
function allColliders() { return [...world.colliders, ...shopBuildings.flatMap(b=>b.colliders()), ...gateway.colliders, ...(vehicle&&!driving?[vehicle.collider()]:[]), ...(camp?.colliders() ?? [])]; }
function inWater() { return phase==='world'&&!driving&&cameraMode==='outdoor'&&!!person?.swimming; }
function currentFloor(x = player.position.x, z = player.position.z) {
  const indoorShop=shopBuildings.find(b=>b.isInside(x,z));if(indoorShop)return indoorShop.floorY;
  if (camp?.isInside(x, z)) return camp.floorY;
  return pathSurfaceHeight(x,z);
}
function updateInterior() {
  if(driving){cameraMode='outdoor';player.visible=true;return;}
  shopBuilding=shopBuildings.find(b=>b.isInside(player.position.x,player.position.z))??shopBuildings.reduce((a,b)=>flatDistance(a.ownerPosition)<flatDistance(b.ownerPosition)?a:b);
  cameraMode = camp?.isInside(player.position.x, player.position.z) ? 'tent' : shopBuilding.isInside(player.position.x, player.position.z) ? 'shop' : 'outdoor';
  shopBuildings.forEach(b=>b.setInterior(cameraMode==='shop'&&b===shopBuilding)); camp?.setInterior(cameraMode === 'tent');
  if (camp) { camp.shell.visible = true; camp.doorPivot.visible = true; }
  if (cameraMode === 'tent') {jumpHeight = jumpVelocity = 0;if(person&&!bedRest){person.y=currentFloor();person.vy=0;person.grounded=true;person.swimming=false;player.position.y=person.y;}}
  player.visible = cameraMode !== 'tent' && !(inWater() && diveDepth > 1.1);
}
function updateContext() {
  if(driving){contextAction={kind:'exitVehicle',label:'exitVehicle'};$('#interaction-label').textContent=t('exitVehicle');return;}

  if (bedRest) { contextAction={kind:'getUp',label:'getUp'};$('#interaction-label').textContent=t('getUp');return; }
  const candidates = [];
  const add = (kind, point, range, label, object = null, priority = 0) => {
    const d = flatDistance(point);
    if (d <= range) candidates.push({ kind, point, label, object, score: d + priority });
  };
  if(vehicle&&cameraMode==='outdoor'){
    const living=vehicle.state.kind==='motorhome'&&motorhomeBoarding(vehicle.state,player.position)==='interior';
    add(living?'enterRV':'enterVehicle',vehicle.root.position,vehicle.config.radius+2.2,living?'rvEnter':vehicle.state.kind==='motorhome'?'rvEnterCab':'enterVehicle',vehicle,-3);
  }
  for(const building of shopBuildings)add('shopDoor',building.doorPosition,3.5,building.doorOpen?'closeDoor':'openDoor',building,-1.2);
  if (cameraMode === 'shop') {
    add('owner', shopBuilding.ownerPosition, 5.6, 'tradeOwner', shopBuilding, -1);
    for (const item of shopBuilding.interiorTargets ?? []) add('shelf', item.position, 2.8, 'inspectShelf', item);
  } else if (cameraMode === 'tent') {
    add('tentDoor', camp.doorPosition, 3.5, camp.doorOpen ? 'closeTent' : 'openTent', camp, -1);
    for (const item of camp.interiorTargets) { const bed=item.id.startsWith('tent-bedding');add(bed ? 'bedding' : item.id === 'tent-backpack' ? 'backpack' : 'lantern', item.position, bed?2.4:2.7, bed?'lieInBed':item.id === 'tent-backpack'?'openBackpack':'toggleLantern', item, bed?-.7:0); }
  } else {
    if (camp) add('tentDoor', camp.doorPosition, 3.5, camp.doorOpen ? 'closeTent' : 'openTent', camp, -0.7);
    for (const tree of world.trees) if (!tree.felled) add('tree', tree, tree.radius + 2.6, 'chopTree', tree);
    for (const rock of world.rocks) if (!harvested.has(rock.id)) add('rock', rock, rock.radius + 2, 'mineRock', rock);
    for (const item of world.interactables ?? []) if (!item.collected) add(item.type === 'plant' ? 'plant' : item.type === 'water' ? 'water' : 'landmark', item.position ?? item, 3.5, item.type === 'plant' ? 'collectHerb' : item.type === 'water' ? 'fillWater' : 'inspect', item);
    for (let i = 0; i < 8; i++) {
      const p = { x: player.position.x + Math.cos(i * Math.PI / 4) * 3, z: player.position.z + Math.sin(i * Math.PI / 4) * 3 };
      if (isWater(p.x, p.z)) { add('water', player.position, 1, 'fillWater'); break; }
    }
    for (const animal of animals) if (animal.visible) add('animal', animal.position, 3.5, 'observeAnimal', animal);
    for (const animal of marine.creatures) {
      if(animal.userData.collected)continue;
      const collectible=marine.harvestables.includes(animal);
      if(collectible&&animal.position.distanceTo(player.position)>3.5)continue;
      add(collectible?'seafood':'marine',animal.position,collectible?3.5:5,collectible?'collectSeafood':'observeMarine',animal,-3);
    }
    for (const coral of marine.sites) add('marine', coral.position, 4.5, 'observeMarine', coral, -2);
  }
  candidates.sort((a, b) => a.score - b.score);
  contextAction = candidates[0] ?? { kind: 'ground', label: inventory.has('shovel') ? 'digGround' : 'inspectGround' };
  $('#interaction-label').textContent = t(contextAction.label) + (contextAction.kind==='animal'?` · ${t(contextAction.object.userData.species)}`:contextAction.kind === 'seafood'?` · ${t(contextAction.object.userData.kind)}`:contextAction.kind === 'tree' ? ` (${contextAction.object.hits}/3)` : '');
}
function addInventory(id, count = 1) { if (count > 0) audio.effect('collect'); inventory.set(id, (inventory.get(id) ?? 0) + count); }
function toggleBedRest(bed) {
  if (bedRest) { bedRest.target=0; audio.effect('close'); return; }
  if (!camp || cameraMode!=='tent' || !bed?.restPosition) return;
  clearMovement();jumpHeight=jumpVelocity=0;posture='stand';
  bedRest={bed,progress:0,target:1,start:player.position.clone(),rotation:player.rotation.y,yaw,pitch,cameraStart:camera.position.clone(),viewStart:camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(5).add(camera.position)};
  audio.effect('open');toast('bedRestStarted');renderHUD();
}
function advanceBedRest(dt) {
  if (!bedRest) return;
  const state=bedRest;state.progress=restStep(state.progress,state.target,dt);
  player.position.lerpVectors(state.start,state.bed.restPosition,smoothRest(state.progress));player.rotation.y=camp.group.rotation.y;
  poseBedRest(camper,state.progress,elapsed);
  if (state.progress===0 && state.target===0) {
    player.position.copy(state.start);player.rotation.y=state.rotation;yaw=state.yaw;pitch=state.pitch;bedRest=null;
    camper.backpack.visible=true;poseCamper(camper,'stand');person=createPerson(player.position);toast('gotUp');renderHUD();
  }
}
function interact() {
  if (!advancing()) return;
  updateContext(); const action = contextAction;
  if (performance.now() - actionAt < 400) return;
  actionAt = performance.now();
  if(action.kind==='enterVehicle'){enterVehicle();return;}
  if(action.kind==='enterRV'){openRV();return;}
  if(action.kind==='exitVehicle'){exitVehicle();return;}
  if (action.kind === 'getUp') { toggleBedRest();return; }
  if (action.kind === 'shopDoor' || action.kind === 'tentDoor') {
    const structure = action.object;
    if (structure.doorOpen && flatDistance(structure.doorPosition ?? action.point) < 1.4) { toast('clearDoor'); return; }
    audio.effect('door'); structure.setDoor(!structure.doorOpen); toast(structure.doorOpen ? 'doorOpened' : 'doorClosed');
  } else if (action.kind === 'owner') {
    openModal('shop');
  } else if (action.kind === 'tree') {
    if (!inventory.has('axe')) { toast('needAxe'); return; }
    audio.effect('chop'); activeTool = 'axe'; world.chopTree(action.object);
    if (action.object.felled) { addInventory('firewood', LOGS_PER_TREE); treeCount++; toast('woodCollected'); }
    else toast('treeHit');
  } else if (action.kind === 'rock') {
    if (!inventory.has('pickaxe')) { toast('needPickaxe'); return; }
    audio.effect('mine'); activeTool = 'pickaxe';
    action.object.hits = (action.object.hits ?? 0) + 1;
    if (action.object.hits >= 3) {
      harvested.add(action.object.id); action.object.object.visible = false;
      for (const c of world.colliders) if (c.id === action.object.id || (c.x === action.object.x && c.z === action.object.z)) c.active = false;
      addInventory('stone', 3); toast('stoneCollected');
    } else toast('rockHit');
  } else if (action.kind === 'plant') { action.object.collected = true; action.object.object.visible = false; addInventory('herbs'); toast('herbCollected');
  } else if (action.kind === 'water') { audio.effect('splash'); addInventory('water'); toast('waterCollected');
  } else if (action.kind === 'backpack') { openModal('backpack');
  } else if (action.kind === 'lantern') { camp.group.traverse(object => { if (object.isPointLight) { object.userData.originalIntensity ??= object.intensity; object.intensity = object.intensity ? 0 : object.userData.originalIntensity; } }); toast('lanternToggled');
  } else if (action.kind === 'bedding') { toggleBedRest(action.object);
  } else if (action.kind === 'shelf') { toast('shelfHint');
  } else if (action.kind === 'animal') { toast('animalObserved');
  } else if (action.kind === 'seafood') {
    const result=marine.collect(action.object,player.position);if(result){addInventory(result.id,result.count);toast('seafoodCollected');renderHUD();}
  } else if (action.kind === 'marine') { audio.effect('item'); toast('marineObserved');
  } else if (action.kind === 'ground' && inventory.has('shovel')) {
    audio.effect('dig'); activeTool = 'shovel'; addInventory('soil'); toast('soilCollected');
  } else toast('sceneryInfo');
  updateContext(); renderHUD();
}

function enterVehicle(){
  if(!vehicle||cameraMode!=='outdoor'||inWater())return;driving=true;posture='stand';jumpHeight=jumpVelocity=diveDepth=0;activeTool=null;clearMovement();camper.backpack.visible=false;yaw=vehicle.state.heading-Math.PI;audio.effect('door');toast('driveHint');syncMenus();renderHUD();
}
function exitVehicle(){
  if(!vehicle)return;
  if(Math.abs(vehicle.state.speed)>.7){toast('stopToExit');return;}
  const position=dismountPosition(vehicle.state,allColliders());
  if(!position){toast('noDismount');return;}
  driving=false;player.rotation.set(0,vehicle.state.heading,0);camper.backpack.visible=true;player.position.set(position.x,terrainHeight(position.x,position.z),position.z);posture='stand';poseCamper(camper,'stand');person=createPerson(player.position);clearMovement();audio.effect('door');updateInterior();syncMenus();renderHUD();
}
function placeCamp() {
  if (!canAct()) return;
  if (phase!=='world'||driving||cameraMode !== 'outdoor') { toast('campOutdoors'); return; }
  const location = findCampLocation(player.position,tentConfig,[...world.colliders,...shopBuildings.flatMap(b=>b.colliders()),...gateway.colliders,...(vehicle?[vehicle.collider()]:[])]);
  if (!location) { toast('needFlatCamp'); return; }
  camp?.dispose();
  world.setCampGround(location.foundation);
  camp = createTent(scene, tentConfig, location); campCount++; clean = false; protectedCamp = false; audio.effect('collect');
  const outside = { x: camp.entrance.x, z: camp.entrance.z + 2.1 };
  if (camp.isInside(player.position.x, player.position.z)) { player.position.x = outside.x; player.position.z = outside.z; }
  player.position.y = currentFloor();person=createPerson(player.position); target = null; toast('campDone'); updateInterior(); updateContext(); renderHUD();
}
function readTentSelection() { return Object.fromEntries(Object.keys(TENT_CHOICES).map(key => [key, $(`#tent-${key}`).value])); }
function renderShop() {
  const balance = `<div class="shop-welcome"><strong>${t('ownerName')}</strong><span>${t('ownerGreeting')}</span><b>₩ ${money.toLocaleString()}</b></div>`;
  $('#shop').innerHTML = balance + `<h3>${t('tentCustom')}</h3><div class="tent-config">${Object.entries(TENT_CHOICES).map(([key, values]) => `<label>${t('tent' + key[0].toUpperCase() + key.slice(1))}<select id="tent-${key}">${values.map(value => `<option value="${value}" ${tentDraft[key] === value ? 'selected' : ''}>${t(({ standard: 'tentStandard', large: 'tentLarge', family: 'tentFamily' })[value] ?? value)}</option>`).join('')}</select></label>`).join('')}</div><div class="tent-purchase"><div id="tent-swatch"></div><span id="tent-price"></span><button id="buy-tent" class="primary">${t('buyTent')}</button></div><p class="small">${t('tentHint')}</p><h3>${t('toolsAndGear')}</h3>` +
    goods.map(({ id, price }) => `<div class="item"><div>${t(id)} <span class="small">×${inventory.get(id) ?? 0}</span><div class="small">₩${price.toLocaleString()}</div></div><div><button data-buy="${id}">${t('new')}</button> <button data-used="${id}">${t('used')}</button> <button data-sell="${id}" ${inventory.has(id) ? '' : 'disabled'}>${t('sell')}</button></div></div>`).join('') +
    `<div class="item"><div>${t('firewood')} ×${inventory.get('firewood') ?? 0}<div class="small">₩1,200 / ${t('each')}</div></div><button data-sell="firewood" ${inventory.has('firewood') ? '' : 'disabled'}>${t('sell')}</button></div><p class="small">${t('usedNote')}</p>`;
  updateTentPreview();
}
function updateTentPreview() {
  const config = readTentSelection();
  $('#tent-price').textContent = `₩ ${tentPrice(config).toLocaleString()}`;
  $('#tent-swatch').style.backgroundColor = { sand: '#d3b481', forest: '#58705a', rust: '#be7049', navy: '#485e78' }[config.color];
  $('#tent-swatch').classList.toggle('ripstop', config.material === 'ripstop');
}
$('#shop').oninput = () => { tentDraft = readTentSelection(); updateTentPreview(); };
$('#shop-toggle').onclick = () => {
  if (!canAct()) return;
  if (!nearShop()) { toast('findOwner'); return; }
  openModal('shop');
};
$('#shop').onclick = e => {
  if (!shopOpen || !nearShop()) return;
  const b = e.target.closest('button'); if (!b) return;
  let result;
  if (b.id === 'buy-tent') result = buyTent(money, inventory, readTentSelection());
  else if (b.dataset.sell) result = sellItem(money, inventory, b.dataset.sell);
  else if (b.dataset.buy || b.dataset.used) result = buyItem(money, inventory, b.dataset.buy ?? b.dataset.used, !!b.dataset.used);
  else return;
  if (!result.ok) { toast('noMoney'); return; }
  audio.effect('item'); money = result.money; inventory = result.inventory;
  if (result.tentConfig) { tentConfig = result.tentConfig; tentDraft = { ...tentConfig }; }
  if (!inventory.has('repellent')) protectedCamp = false;
  renderShop(); renderHUD(); toast(result.tentConfig ? 'tentPurchased' : 'tradeDone');
};
const icons = { crab:'🦀', conch:'🐚', lobster:'🦞', tent: '⛺', bedding: '▤', clothing: '♧', cookware: '♨', food: '◒', survival: '✚', tarp: '⌂', mat: '▥', winterBag: '▰', repellent: '☀', axe: '⚒', shovel: '♠', pickaxe: '⚒', rope: '∞', firewood: '▰', stone: '◆', soil: '▥', water: '◉' };
function renderBackpack() {
  $('#backpack-items').innerHTML = inventory.size ? [...inventory].filter(([, count]) => count > 0).map(([id, count],i) => `<button class="inventory-card ${i === selectedItem ? 'selected' : ''}" data-item-index="${i}" ${paused ? '' : 'tabindex="-1"'}><span class="item-icon" aria-hidden="true">${icons[id] ?? '◇'}</span><span><strong>${t(id)}</strong><small>×${count}</small></span></button>`).join('') : `<p>${t('empty')}</p>`;
  const card = $('#backpack-items .selected'); if (card) $('#backpack-items').scrollTop = Math.max(0, card.offsetTop - $('#backpack-items').offsetTop - 70);
}
$('#backpack-items').onclick = e => { if (!paused) return; const item=e.target.closest('[data-item-index]'); if(item){ selectedItem=+item.dataset.itemIndex; audio.effect('item'); renderBackpack(); } };
// Menus are the only mouse-selectable game UI. Hover uses a short, gentle plip.
document.addEventListener('pointerover', e => { const item=e.target.closest('button,select,input'); if(item && !item.disabled && (!running || paused)) audio.effect('hover'); });
document.addEventListener('click', e => { if (e.target.closest('button') && (!running || paused)) { audio.unlock(); audio.effect('select'); } });

function renderHUD() {
  sceneDirty = true;
  if (!running) return;
  $('#clock').textContent = `DAY ${Math.floor(elapsed / 2880) + 1} / 7 · ${String(Math.floor(hour())).padStart(2, '0')}:${String(Math.floor(hour() % 1 * 60)).padStart(2, '0')}`;
  $('#weather').textContent = `${t(seasonKeys[season])} · ${t(weather)} · ${t(night() ? 'night' : 'day')}`;
  $('#balance').textContent = `₩ ${money.toLocaleString()}`;
  const state = driving ? 'driving' : inWater() ? (diveDepth > 1.1 ? 'underwater' : 'swimming') : bedRest ? (bedRest.target===0?'gettingUp':bedRest.progress===1?'lyingBack':'lyingDown') : jumpHeight > 0 ? 'airborne' : posture === 'crouch' ? 'crouched' : posture === 'prone' ? 'proneState' : displayPosture() === 'sneak' ? 'sneaking' : displayPosture() === 'run' ? 'runningState' : 'stand';
  $('#status').textContent = `${t(danger ? 'danger' : 'safe')} · ${t(state)} · ${t(isFirstPerson(dist)?'zoomFirstPerson':cameraMode === 'tent' ? 'firstPerson' : cameraMode === 'shop' ? 'shoulderView' : 'outdoorView')}`;
  $('#missions').innerHTML =  `${camp ? '✓' : '○'} ${t('campGoal')}<br>${treeCount ? '✓' : '○'} ${t('treeGoal')}<br>${visited.has('summit') ? '✓' : '○'} ${t('summitGoal')}`;
  $('#journal').textContent = driving?`${t(vehicle.state.kind)} · ${Math.round(Math.abs(vehicle.state.speed)*3.6)} km/h · ${t('driveHint')}`:t(season === 3 && !inventory.has('winterBag') ? 'winterTip' : weather === 'rain' && !inventory.has('tarp') ? 'rainTip' : 'peacefulTip');
  miniMap.draw({player:player.position,vehicle:vehicle?.state,camp:camp?.group.position,heading:driving?vehicle.state.heading:player.rotation.y,t});
  const area = SUMMITS.some(m=>Math.hypot(player.position.x-m.x,player.position.z-m.z)<m.radius) ? 'summit' : player.position.z > LAKE.z - 60 ? 'lakeside' : coastDistance(player.position.x,player.position.z)<40 ? 'seaside' : 'woodland';
  $('#location-label').textContent = `${t(area)} · ${t('altitude')} ${Math.round(currentFloor())} m`;
  $('#pause-badge').classList.toggle('hidden', advancing());
  updateContext();
}
const heldTool = new THREE.Group(); camper.elbows[0].add(heldTool); heldTool.position.set(0, -.235, .10); heldTool.visible = false;
mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.0, 7), '#805f3a', 0, 0.35, 0, heldTool);
const toolHead = mesh(new THREE.BoxGeometry(0.42, 0.32, 0.09), '#abb2ae', 0.15, 0.8, 0, heldTool);
function stepGame(dt, now, realSeconds) {
  simulationSeconds += dt;
  elapsed += realSeconds;
  if (elapsed >= 7 * 24 * 120) { finish(); return; }
  let dx = 0, dz = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) dz--;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dz++;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx--;
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx++;
  const dir = new THREE.Vector3(dx, 0, dz);
  if (dir.length()) { target = null; dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw); }
  else if (target) { dir.copy(target).sub(player.position); dir.y = 0; if (dir.length() < 0.7) { target = null; dir.set(0, 0, 0); } else dir.normalize(); }
  const creep = keys.has('ControlLeft'), sprint = keys.has('ShiftLeft');
  if (bedRest) dir.set(0,0,0);
  if(vehicle&&!driving){const parked=stepDrive(vehicle.state,{brake:true},dt,allColliders().filter(c=>c.id!=='player-vehicle'));vehicle.update(parked,dt);}
  const speed = inWater() ? 3.4 * (creep ? .4 : sprint ? 3 : 1) : movementSpeed(cameraMode === 'outdoor' ? 'car' : 'walk', posture, sprint, creep);
  if(driving){
    const input={forward:keys.has('KeyW')||keys.has('ArrowUp'),backward:keys.has('KeyS')||keys.has('ArrowDown'),left:keys.has('KeyA')||keys.has('ArrowLeft'),right:keys.has('KeyD')||keys.has('ArrowRight'),brake:keys.has('Space')};
    const next=stepDrive(vehicle.state,input,dt,allColliders());vehicle.update(next,dt,Number(input.left)-Number(input.right));
    const offset=new THREE.Vector3(vehicle.state.kind==='scooter'?0:vehicle.state.kind==='motorhome'?-.605:-.55,vehicle.state.kind==='scooter'?.80:vehicle.state.kind==='motorhome'?.726:.66,vehicle.state.kind==='motorhome'?2.75:vehicle.state.kind==='scooter'?-.20:0).applyQuaternion(vehicle.root.quaternion);
    player.position.copy(vehicle.root.position).add(offset);player.quaternion.copy(vehicle.root.quaternion);poseCamper(camper,'sit',false,simulationSeconds*1000);camper.backpack.visible=false;camper.arms.forEach((arm,i)=>{arm.rotation.x=-1.05;camper.elbows[i].rotation.x=-.25;});
    dir.set(0,0,0);
  }
  if(!driving&&!bedRest){
    person??=createPerson(player.position);
    person=stepPerson(person,{x:dir.x,z:dir.z,speed,posture,dive:keys.has('KeyQ'),rise:keys.has('Space')},dt,{
      colliders:[...allColliders(),...world.platformsNear(person.x,person.z)],heightAt:currentFloor,waterAt:(x,z)=>!shopBuildings.some(b=>b.isInside(x,z))&&!camp?.isInside(x,z)&&worldWaterAt(x,z),
      ceilingAt:(x,z)=>{const b=shopBuildings.find(b=>b.isInside(x,z));return b?b.floorY+6.3:camp?.isInside(x,z)?camp.roofHeightAt(x,z):Infinity;},
    });
    player.position.set(person.x,person.y,person.z);diveDepth=person.diveDepth;jumpVelocity=person.vy;jumpHeight=person.grounded||person.swimming?0:Math.max(.001,person.y-currentFloor());
    if(person.landed)audio.effect('step');
  }
  updateInterior();const wet=inWater();
  if (dir.length() && now-lastFootstep > (wet ? 650 : creep ? 760 : sprint ? 240 : 460)) { audio.effect(wet ? 'splash' : 'step'); lastFootstep = now; }
  if (dir.length()) player.rotation.y = Math.atan2(dir.x, dir.z);
  else if (!driving && cameraMode !== 'outdoor') player.rotation.y = yaw + Math.PI;
  if (bedRest) advanceBedRest(dt);else if(!driving) { camper.backpack.visible=true;poseCamper(camper, inWater() ? 'swim' : jumpHeight>0?'jump':displayPosture(dir.length() > 0), dir.length() > 0, simulationSeconds*1000,{swimBlend:person?.swimBlend,diving:diveDepth>1.1,verticalVelocity:person?.vy}); }
  swimEffects.update(wet,player.position,simulationSeconds,diveDepth,Math.hypot(person?.vx??0,person?.vz??0),player.rotation.y);
  heldTool.visible = !driving && !bedRest && !!activeTool && inventory.has(activeTool);
  heldTool.rotation.z = now - actionAt < 350 ? Math.sin((now - actionAt) / 350 * Math.PI) * 1.7 : .45;
  toolHead.scale.set(activeTool === 'pickaxe' ? 1.8 : 1, activeTool === 'shovel' ? 1.6 : 1, 1);
  visited.add(player.position.z < -110 ? 'mountain' : player.position.z > LAKE.z - 60 ? 'lake' : coastDistance(player.position.x,player.position.z)<40 ? 'coast' : 'forest');
  if (SUMMITS.some(m=>Math.hypot(player.position.x-m.x,player.position.z-m.z)<m.radius)) visited.add('summit');
  const tick = Math.floor(elapsed / 120);
  if (tick !== weatherTick) {
    weatherTick = tick; weatherProfile = sampleWeather(season); weather = weatherProfile.kind;
    if(tick>lastEncounter){lastEncounter=tick;if(dangerEncounter({hour:hour(),active:danger,clean,protectedCamp,safe:cameraMode!=='outdoor'||inWater()}))danger=true;}
  }
  if(danger&&(!dangerHours(hour())||cameraMode!=='outdoor'||inWater())){if(cameraMode!=='outdoor')toast('safeZone');clearThreat();}
  if(danger&&!threatSpawned){
    const point=wildlifePosition(Math.random,{around:player.position,colliders:allColliders()});
    if(point){
      const choices=animals.filter(a=>a.userData.dangerous);activeThreat=choices[Math.floor(Math.random()*choices.length)];
      activeThreat.position.set(point.x,point.y,point.z);activeThreat.rotation.y=Math.atan2(player.position.x-point.x,player.position.z-point.z);
      threatSpawned=true;activeThreat.visible=true;audio.effect('animal');toast(activeThreat.userData.species+'Warning');
    }else clearThreat();
  }
  if(!danger)clearThreat();
  particles.visible = cameraMode === 'outdoor' && (weather === 'rain' || weather === 'snow') && diveDepth < 1.1;
  particles.position.set(player.position.x, currentFloor(), player.position.z);
  particles.material.map = precipitationMaps[weather] ?? precipitationMaps.blossoms;
  particles.material.size = weather === 'rain' ? 0.7 : season === 3 ? 0.25 : 0.33;
  const a = particlesGeo.attributes.position.array;
  for (let i = 0; i < count; i++) { a[i * 3 + 1] -= dt * (weather === 'rain' ? 25 : 2); a[i * 3] += dt * Math.sin(now * 0.0003 + i) * 1.5; if (a[i * 3 + 1] < 0) a[i * 3 + 1] = 65; }
  particlesGeo.attributes.position.needsUpdate = true;
  animals.forEach((g, i) => {
    g.visible=g.userData.dangerous?danger&&g===activeThreat&&dangerHours(hour()):g.userData.nocturnal?night():!night();
    if(!g.visible)return;
    const nextX = g.position.x + Math.sin(now * 0.0002 + i) * dt * 0.5;
    if (!isWater(nextX, g.position.z)) g.position.x = nextX;
    g.position.y = terrainHeight(g.position.x, g.position.z) + (g.userData.groundOffset ?? 0);
  });
  animateWildlife(animals, elapsed, dt);
  world.animate(dt, elapsed, player.position); shopBuildings.forEach(b=>b.update(dt));
  marine.update(dt, elapsed, player.position);
  audio.setMode(danger ? 'tense' : 'calm'); audio.setAmbience(weather,inWater() || player.position.x > WORLD.landMaxX-30);
  if (now - lastHUD > 100) { renderHUD(); lastHUD = now; }
}
function clearThreat(){danger=false;threatSpawned=false;if(activeThreat)activeThreat.visible=false;activeThreat=null;}
function anchorBackpack(viewCamera){
  viewCamera.updateMatrixWorld(true);camper.root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(camper.head,true),head=camper.head.getWorldPosition(new THREE.Vector3());head.y=bounds.max.y+.22;head.project(viewCamera);
  const bubble=$('#backpack-modal'),bx=(head.x*.5+.5)*innerWidth,by=(-head.y*.5+.5)*innerHeight;
  bubble.style.left=`${THREE.MathUtils.clamp(bx,Math.min(240,innerWidth/2),innerWidth-Math.min(240,innerWidth/2))}px`;
  bubble.style.top=`${THREE.MathUtils.clamp(by,Math.min(bubble.offsetHeight+24,innerHeight*.7),innerHeight-45)}px`;
}
let previous = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const realSeconds = Math.max(0, (now - previous) / 1000);
  const dt = Math.min(realSeconds, 0.1); previous = now;
  if(rvInside){renderRV(dt,realSeconds);return;}
  if(advancing())stepGame(dt,now,realSeconds);
  if (!running) { menuCamper.updateFace(now/1000);renderer.render(titleScene, titleCamera); return; }
  // A paused view is static. Redraw only for a menu action, option or resize.
  if (!advancing() && !sceneDirty) return;
  sceneDirty = false; updateInterior();
  const daylight = THREE.MathUtils.clamp(Math.sin((hour() - 5) / 14 * Math.PI), 0.10, 1);
  ambient.intensity = cameraMode !== 'outdoor' ? (night() ? .65 : 1.0) : night() ? 0.65 : 1.4 + Math.sqrt(daylight) * 1.8; sun.intensity = daylight * 2.5;
  sun.target.position.copy(player.position);
  sun.position.set(player.position.x + Math.cos(hour() / 24 * Math.PI * 2) * 80, player.position.y + Math.max(16, daylight * 110), player.position.z - 45);
  const sky = atmosphere.update(hour(), weather, elapsed, player.position, weatherProfile,season);
  scene.fog.color.copy(sky.horizon); scene.fog.density = cameraMode !== 'outdoor' ? 0.0003 : weather === 'fog' ? 0.0045 : 0.00038;
  const eye = inWater()?1.0:posture === 'prone' ? 0.6 : posture === 'crouch' ? 1.1 : displayPosture() === 'sneak' ? 1.9 : 2.1;
  if (bedRest) {
    const settle=THREE.MathUtils.smoothstep(bedRest.progress,.65,1),bed=bedRest.bed;
    const side=player.position.clone().add(new THREE.Vector3(bed.id.endsWith('right')?-1.9:1.9,2.8,1.0).applyAxisAngle(new THREE.Vector3(0,1,0),camp.group.rotation.y));
    const eyePosition=bed.eyePosition.clone();
    side.lerpVectors(bedRest.cameraStart,side,THREE.MathUtils.smoothstep(bedRest.progress,0,.2));
    camera.position.lerpVectors(side,eyePosition,settle);
    const tilt=THREE.MathUtils.clamp(pitch-.32,-.5,.5);
    const skyTarget=eyePosition.clone().add(new THREE.Vector3(Math.sin(yaw)*Math.sin(tilt)*5,Math.cos(tilt)*5,Math.cos(yaw)*Math.sin(tilt)*5));
    const torso=player.position.clone().add(new THREE.Vector3(0,.9,-1.2).applyAxisAngle(new THREE.Vector3(0,1,0),camp.group.rotation.y));
    torso.lerpVectors(bedRest.viewStart,torso,THREE.MathUtils.smoothstep(bedRest.progress,0,.2));
    camera.lookAt(torso.lerp(skyTarget,settle));player.visible=bedRest.progress>.12&&settle<.78;
  } else if(driving&&isFirstPerson(dist)){
    const eye=driverEye(vehicle.state.kind);
    camera.position.copy(vehicle.root.localToWorld(new THREE.Vector3(eye.x,eye.y,eye.z)));
    camera.lookAt(camera.position.x-Math.sin(yaw)*Math.cos(pitch-.32)*10,camera.position.y-Math.sin(pitch-.32)*10,camera.position.z-Math.cos(yaw)*Math.cos(pitch-.32)*10);
    player.visible=false;
  } else if(driving){
    const orbitPitch=THREE.MathUtils.clamp(pitch,.12,1.3),back=dist*(vehicle.state.kind==='scooter'?1.05:1.47);
    camera.position.set(vehicle.state.x+Math.sin(yaw)*back*Math.cos(orbitPitch),vehicle.root.position.y+3+Math.sin(orbitPitch)*back,vehicle.state.z+Math.cos(yaw)*back*Math.cos(orbitPitch));
    const safe=outdoorCameraPosition({x:vehicle.state.x,y:vehicle.root.position.y+2.2,z:vehicle.state.z},camera.position,{trees:world.trees,rocks:world.rocks,groundHeight:terrainHeight});camera.position.set(safe.x,safe.y,safe.z);
    const baseAim=Math.atan2(camera.position.y-vehicle.root.position.y-1.8,Math.hypot(camera.position.x-vehicle.state.x,camera.position.z-vehicle.state.z));
    const aim=pitch<.12?baseAim+(pitch-.12)*(baseAim+1.54)/1.34:baseAim;
    camera.lookAt(camera.position.x-Math.sin(yaw)*Math.cos(aim)*10,camera.position.y-Math.sin(aim)*10,camera.position.z-Math.cos(yaw)*Math.cos(aim)*10);
  } else if(isFirstPerson(dist)){
    camera.position.set(player.position.x,player.position.y+eye,player.position.z);
    camera.lookAt(camera.position.x-Math.sin(yaw)*Math.cos(pitch-.32)*10,camera.position.y-Math.sin(pitch-.32)*10,camera.position.z-Math.cos(yaw)*Math.cos(pitch-.32)*10);
    player.visible=false;
  } else if (cameraMode === 'tent' || (inWater() && diveDepth > 1.1)) {
    camera.position.set(player.position.x, player.position.y + eye, player.position.z);
    camera.lookAt(camera.position.x - Math.sin(yaw) * Math.cos(pitch-.32) * 10, camera.position.y - Math.sin(pitch-.32) * 10, camera.position.z - Math.cos(yaw) * Math.cos(pitch-.32) * 10);
  } else if (cameraMode === 'shop') {
    const b = shopBuilding.bounds, back = 2.7;
    camera.position.set(THREE.MathUtils.clamp(player.position.x + Math.sin(yaw) * back + Math.cos(yaw) * 0.8, b.minX + 0.7, b.maxX - 0.7), player.position.y + 2.6 + Math.sin(pitch - 0.32), THREE.MathUtils.clamp(player.position.z + Math.cos(yaw) * back - Math.sin(yaw) * 0.8, b.minZ + 0.7, b.maxZ - 0.7));
    const safeCamera = resolveMovement(player.position, { x: camera.position.x - player.position.x, z: camera.position.z - player.position.z }, shopBuilding.colliders(), 0.22);
    camera.position.x = safeCamera.x; camera.position.z = safeCamera.z;
    camera.lookAt(camera.position.x - Math.sin(yaw)*Math.cos(pitch-.32)*10, camera.position.y - Math.sin(pitch-.32)*10, camera.position.z - Math.cos(yaw)*Math.cos(pitch-.32)*10);
  } else {
    const orbitPitch = Math.max(.12, Math.min(1.3, pitch));
    camera.position.set(player.position.x + Math.sin(yaw) * dist * Math.cos(orbitPitch), player.position.y + eye + Math.sin(orbitPitch) * dist, player.position.z + Math.cos(yaw) * dist * Math.cos(orbitPitch));
    const safe = outdoorCameraPosition({ x: player.position.x, y: player.position.y + 1.8, z: player.position.z }, camera.position, { trees: world.trees, rocks: world.rocks, groundHeight: terrainHeight });
    camera.position.set(safe.x, safe.y, safe.z);
    const baseAim = Math.atan2(camera.position.y-player.position.y-1.8, Math.hypot(camera.position.x-player.position.x,camera.position.z-player.position.z));
    const aim = pitch < .12 ? baseAim + (pitch-.12) * (baseAim+1.54) / 1.34 : baseAim;
    camera.lookAt(camera.position.x-Math.sin(yaw)*Math.cos(aim)*10,camera.position.y-Math.sin(aim)*10,camera.position.z-Math.cos(yaw)*Math.cos(aim)*10);
  }
  if (backpackOpen) {
    player.visible=true;
    const outside=cameraMode==='outdoor',back=outside?12:2.1,bounds=cameraMode==='shop'?shopBuilding.bounds:camp?.bounds;
    camera.position.set(player.position.x+Math.sin(yaw)*back,player.position.y+(outside?6:3.1),player.position.z+Math.cos(yaw)*back);
    if(!outside&&bounds){camera.position.x=THREE.MathUtils.clamp(camera.position.x,bounds.minX+.8,bounds.maxX-.8);camera.position.z=THREE.MathUtils.clamp(camera.position.z,bounds.minZ+.8,bounds.maxZ-.8);}
    if(cameraMode==='tent')camera.position.y=Math.min(camera.position.y,camp.roofHeightAt(camera.position.x,camera.position.z)-.3);
    if(bedRest)camera.lookAt(bedRest.bed.eyePosition.clone().add(new THREE.Vector3(0,1.3,0)));
    else camera.lookAt(player.position.x,player.position.y+(outside?3.4:3.2),player.position.z);
  }
  world.updateCover(player.position,camp?.bounds);
  const submerged = camera.position.y < -.15 && isWater(camera.position.x,camera.position.z) && terrainHeight(camera.position.x,camera.position.z)<-.25;
  scene.getObjectByName('sky-dome').visible = !submerged;
  scenery.group.visible = !submerged;scene.getObjectByName('sky-details').visible=!submerged;
  if (submerged) {
    scene.fog.color.set('#69afb4'); scene.fog.density=.045; scene.background.copy(scene.fog.color);
    for (const name of ['weather-clouds','sun-disc','night-stars']) scene.getObjectByName(name).visible = false;
  }
  if (backpackOpen) {
    anchorBackpack(camera);
  }
  renderer.render(scene, camera);
}
addEventListener('resize', () => { sceneDirty = true;
  [camera,titleCamera].forEach(c => { c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix(); }); renderer.setSize(innerWidth, innerHeight);
});
syncOptions(); localize(); requestAnimationFrame(animate);
if (import.meta.env.DEV) {
  window.__camper = {
    snapshot: () => ({ cameraDistance:dist, firstPerson:isFirstPerson(dist)||rvInside, cameraPosition:(phase==='setup'?titleCamera:camera).position.toArray(), avatarVisible:player.visible, shoreWaves:world.shoreWaves.getState(), danger, dangerSpecies:activeThreat?.userData.species??null, wildlife:animals.map(a=>({species:a.userData.species,dangerous:a.userData.dangerous,visible:a.visible,position:a.position.toArray()})), face:camper.faceAnimation.getState(), avatar:camper.settings, rvInside, rvSettings, rvPosition:rvRoom?.position.toArray(), rvWorldPosition:rvRoom?.toWorld(rvRoom.position).toArray(), rvExteriorVisible:vehicle?.root.visible, rvMounted:rvRoom?.scene.parent===scene, rvResting:rvRoom?.resting, running, paused, phase, mapOpen, driving, vehicle:vehicle?{...vehicle.state}:null,  simulationSeconds, pose: displayPosture(), bodyRotation:camper.body.rotation.toArray(), bodyLean: camper.upperBody.rotation.x, jumpHeight,person:person?{...person}:null, bedRest:bedRest?{progress:bedRest.progress,target:bedRest.target,bed:bedRest.bed.id}:null, shopRoof:shopBuilding.roof.visible, shopCeiling:shopBuilding.ceiling.visible, indoorLights:shopBuilding.interiorLights.length, groundCover:world.groundCover.getState(), backpackOpen, optionsOpen, shopOpen, weather, weatherProfile, atmosphere: atmosphere.getState?.(), skyEvents:atmosphere.getSkyState(), audio: audio.getState(), marine: marine.getState(), harvestables:marine.harvestables.map(g=>({id:g.userData.id,kind:g.userData.kind,collected:g.userData.collected,position:g.position.toArray()})), seaLife: marine.creatures.slice(0,8).map(g=>g.position.toArray()), diveDepth, inWater: inWater(), cameraY: camera.position.y, viewDirection: camera.getWorldDirection(new THREE.Vector3()).toArray(), world:WORLD,island:{bridge:BRIDGE,mainland:MAINLAND,mountains:MOUNTAINS,shops:SHOP_SITES},shopDoors:shopBuildings.map(b=>({door:b.doorPosition.toArray(),owner:b.ownerPosition.toArray(),inside:b.isInside(player.position.x,player.position.z)})), scenery: scenery.bounds, cameraMode, elapsed, money, inventory: Object.fromEntries(inventory), player: player.position.toArray(), yaw, pitch, tentConfig: { ...tentConfig }, treeCount, shopDoor: shopBuilding.doorOpen, context: contextAction?.kind, nearbyPlatforms:world.platformsNear(player.position.x,player.position.z), trees: world.trees.map(({ id, x, z, y, h, radius, hits, felled }) => ({ id, x, z, y, h, radius, hits, felled })), camp: camp ? { foundation:camp.foundation, position: camp.group.position.toArray(), entrance: camp.entrance.toArray(), inside: camp.insidePosition.toArray(), doorOpen: camp.doorOpen, bounds: camp.bounds,dimensions:camp.dimensions,beds:camp.interiorTargets.filter(i=>i.id.startsWith('tent-bedding')).map(i=>({id:i.id,position:i.position.toArray(),rest:i.restPosition.toArray(),eye:i.eyePosition.toArray()})) } : null }),
    setVehiclePosition(x,z,heading=0){if(vehicle){driving=false;vehicle.update({kind:vehicle.state.kind,x,z,heading,speed:0});sceneDirty=true;}},
    validateTrail(index=0){
      const first=trailPoint(0,index),colliders=allColliders();let state=createPerson({...first,y:pathSurfaceHeight(first.x,first.z)}),length=0,previous=first;
      for(let i=1;i<=TRAIL_SAMPLES;i++){
        const next=trailPoint(i/TRAIL_SAMPLES,index);length+=Math.hypot(next.x-previous.x,next.z-previous.z);
        for(let j=0;j<100&&Math.hypot(state.x-next.x,state.z-next.z)>.20;j++){
          const d=Math.hypot(state.x-next.x,state.z-next.z);state=stepPerson(state,{x:(next.x-state.x)/d,z:(next.z-state.z)/d,speed:8},1/120,{colliders,heightAt:pathSurfaceHeight});
        }
        if(Math.hypot(state.x-next.x,state.z-next.z)>.25)return {ok:false,segment:i,position:[state.x,state.y,state.z],target:next};previous=next;
      }
      return {ok:true,length,position:[state.x,state.y,state.z]};
    },
    campSite(x,z){return findCampLocation({x,z},tentConfig,[...world.colliders,...shopBuildings.flatMap(b=>b.colliders()),...gateway.colliders,...(vehicle?[vehicle.collider()]:[])]);},
    groundContact(x,z){
      scene.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(x,1000,z),new THREE.Vector3(0,-1,0));
      const meshes=[world.groundMesh,...world.campGroundView.root.children,...world.group.children.filter(m=>(m.name==='walkable-path'||m.name==='summit-campsite'))];
      return {floor:pathSurfaceHeight(x,z),hits:ray.intersectObjects(meshes,false).map(hit=>({height:hit.point.y,name:hit.object.name}))};
    },
    validateRoad(index=0,kind='motorhome'){
      const points=Array.from({length:1201},(_,i)=>trailPoint(i/1200,index));let state={kind,...points[0],heading:Math.atan2(points[1].x-points[0].x,points[1].z-points[0].z),speed:0},steps=0,maxError=0;
      const colliders=allColliders().filter(c=>c.id!=='player-vehicle');
      for(let i=1;i<points.length;i++){
        const p=points[i],near=colliders.filter(c=>c.kind==='circle'?Math.hypot(c.x-p.x,c.z-p.z)<c.radius+25:c.maxX>p.x-25&&c.minX<p.x+25&&c.maxZ>p.z-25&&c.minZ<p.z+25);
        // Follow each centreline segment with the actual drivetrain and contact controller.
        for(let j=0;j<100&&Math.hypot(state.x-p.x,state.z-p.z)>.5;j++){
          state.heading=Math.atan2(p.x-state.x,p.z-state.z);state.yawRate=0;
          state=stepDrive(state,{forward:state.speed<8,brake:state.speed>9},1/60,near);steps++;
        }
        const error=Math.hypot(state.x-p.x,state.z-p.z);maxError=Math.max(maxError,error);
        if(error>1)return {ok:false,index,segment:i,error,state};
      }
      return {ok:true,index,steps,maxError,state};
    },
    roadContact(x,z){
      scene.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(x,pathSurfaceHeight(x,z)+10,z),new THREE.Vector3(0,-1,0));
      const hit=ray.intersectObjects(world.group.children.filter(m=>(m.name==='walkable-path'||m.name==='summit-campsite')),false)[0];return {floor:pathSurfaceHeight(x,z),visible:hit?.point.y,gap:hit?pathSurfaceHeight(x,z)-hit.point.y:null};
    },
    setRenderQuality({shadows=true,pixelRatio=1}={}){renderer.shadowMap.enabled=shadows;renderer.setPixelRatio(pixelRatio);sceneDirty=true;},
    configureAvatar(value){camper.configure(value);sceneDirty=true;},
    setWeather(kind,cover=0) { sceneDirty = true; weather=kind;weatherProfile={kind,cloudCover:cover,wind:1,precipitation:kind==='rain'||kind==='snow'?1:0}; },
    setTime(hours) { elapsed=(hours-5+24)%24*120;weatherTick=Math.floor(elapsed/120);renderHUD(); },
    setDanger(value) {danger=value;},
    teleport(x, z, facing = 0) { if (!Number.isFinite(x) || !Number.isFinite(z)) return; driving=false;bedRest=null;camper.backpack.visible=true;poseCamper(camper,'stand');player.position.set(x, terrainHeight(x, z), z); yaw = facing; pitch = .32; jumpHeight = 0; jumpVelocity = 0; clearMovement(); updateInterior(); diveDepth = 0; player.position.y = currentFloor();person=createPerson(player.position); player.rotation.set(0,yaw+Math.PI,0); renderHUD(); },
  };
}
