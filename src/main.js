import * as THREE from 'three';
import { DEFAULT_OPTIONS, normalizeOptions, lookAngles, movementSpeed, togglePosture, verticalStep, timeAdvances } from './controls.js';
import { translate, seasonKeys } from './i18n.js';

const $ = s => document.querySelector(s);
let options = { ...DEFAULT_OPTIONS };
try { options = normalizeOptions(JSON.parse(localStorage.getItem('free-camper-options')) ?? {}); } catch { /* Private browsing can disable storage. */ }
const t = key => translate(key, options.language);
let season = 0, mode = 'car', running = false, paused = false, elapsed = 0, money = 180000;
let camp = null, clean = false, protectedCamp = false, danger = false, campCount = 0;
let backpackOpen = false, optionsOpen = false, posture = 'stand', jumpHeight = 0, jumpVelocity = 0;
let target = null, yaw = 0.65, pitch = 0.6, dist = 28, weather = 'clear', weatherTick = -1, lastEncounter = 0;
const inventory = new Set(), visited = new Set(), keys = new Set();
const essentials = ['tent', 'bedding', 'clothing', 'cookware', 'food', 'survival'];
const goods = [['tarp', 45000], ['mat', 25000], ['winterBag', 60000], ['repellent', 30000]];
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
  <h3 data-i18n="who"></h3><div class="row"><select id="age" data-label="age"><option value="young" data-i18n="young"></option><option value="middle" data-i18n="middle"></option><option value="older" data-i18n="older"></option></select><select id="gender" data-label="gender"><option value="male" data-i18n="male"></option><option value="female" data-i18n="female"></option></select><select id="body" data-label="body"><option value="normal" data-i18n="normal"></option><option value="large" data-i18n="large"></option><option value="slim" data-i18n="slim"></option></select></div>
  <h3 data-i18n="chooseSeason"></h3><div id="seasons" class="row">${seasonKeys.map((s, i) => `<button data-season="${i}" data-i18n="${s}" class="${i === 0 ? 'active' : ''}" aria-pressed="${i === 0}"></button>`).join('')}</div>
  <h3><span data-i18n="gearCheck"></span> <span class="small" data-i18n="ownedGear"></span></h3><div id="gear" class="gear">${essentials.map(x => `<label><input type="checkbox" value="${x}"><span data-i18n="${x}"></span></label>`).join('')}</div>
  <h3 data-i18n="transport"></h3><div id="travel" class="row"><button class="active" data-mode="car" aria-pressed="true" data-i18n="carChoice"></button><button data-mode="walk" aria-pressed="false" data-i18n="walkChoice"></button></div>
  <p class="note"><span data-i18n="timeNote"></span><br><span data-i18n="gearNote"></span></p><button id="depart" class="primary depart" data-i18n="depart"></button><div id="home-error" class="note" role="alert"></div>
</main></div>
<div id="hud" class="hud hidden"><div><div class="top"><div class="glass"><div class="brand">FREE CAMPER</div><div id="clock" class="clock"></div><div id="weather" class="small"></div><div id="pause-badge" class="pause-badge hidden" data-i18n="pausedBadge"></div></div><div class="glass"><div id="balance"></div><div id="status" class="small"></div><div class="row hud-buttons"><button id="pause" data-i18n="pause"></button><button id="game-options" data-i18n="options"></button></div></div></div>
<div class="glass mission"><div data-i18n="missionTitle"></div><div id="missions" class="small"></div></div></div>
<div class="bottom"><div><div class="actions"><button id="camp" class="primary" data-i18n="camp"></button><button id="clean" data-i18n="clean"></button><button id="protect" data-i18n="protect"></button><button id="repel" data-i18n="repel"></button><button id="backpack-toggle"><span data-i18n="backpack"></span> <kbd>B</kbd></button><button id="shop-toggle" data-i18n="shop"></button><button id="sleep" data-i18n="rest"></button><button id="return" data-i18n="return"></button></div><div class="small help" data-i18n="help"></div><div class="small" data-i18n="mouseHint"></div><div id="journal" class="small"></div></div>
<div id="map" class="map" role="button" tabindex="0" aria-label="Map"><div class="mountain">▲▲▲</div><div class="lake"></div><div id="pin" class="pin">●</div><span data-i18n="coast"></span></div></div></div>
<div id="shop" class="panel glass hidden"></div>
<div id="backpack-modal" class="modal hidden"><section class="dialog backpack-dialog" role="dialog" aria-modal="true" aria-labelledby="backpack-heading"><header><div><div class="eyebrow">A PLACE FOR EVERYTHING</div><h2 id="backpack-heading" data-i18n="backpackTitle"></h2></div><button id="backpack-close" data-i18n="close"></button></header><p class="pause-message" data-i18n="backpackNote"></p><div id="backpack-items" class="inventory-grid"></div><footer data-i18n="backpackClose"></footer></section></div>
<div id="options-modal" class="modal hidden"><section class="dialog options-dialog" role="dialog" aria-modal="true" aria-labelledby="options-heading"><header><div><div class="eyebrow">MAKE YOURSELF COMFORTABLE</div><h2 id="options-heading" data-i18n="options"></h2></div><button id="options-close" data-i18n="close"></button></header><p class="small" data-i18n="optionsNote"></p>
<label class="setting" for="brightness"><span data-i18n="brightness"></span><output id="brightness-value"></output><input id="brightness" type="range" min="60" max="150" step="5"></label>
<label class="setting" for="sensitivity"><span data-i18n="sensitivity"></span><output id="sensitivity-value"></output><input id="sensitivity" type="range" min="0.2" max="3" step="0.1"></label>
<label class="setting toggle" for="invert-x"><span data-i18n="invertX"></span><input id="invert-x" type="checkbox"></label><label class="setting toggle" for="invert-y"><span data-i18n="invertY"></span><input id="invert-y" type="checkbox"></label>
<label class="setting language-setting" for="language"><span data-i18n="language"></span><select id="language"><option value="ko">한국어</option><option value="en">English</option></select></label>
<h3 data-i18n="controls"></h3><div class="control-grid">${[['W A S D','move'],['Mouse','look'],['Space','jump'],['Left Shift','slow'],['C','crouch'],['V','prone'],['B','backpack']].map(([key,label]) => `<div><kbd>${key}</kbd><span data-i18n="${label}"></span></div>`).join('')}</div><p class="small" data-i18n="controlsNote"></p><div id="save-warning" class="small" role="status"></div></section></div>
<div id="toast" class="toast hidden" role="status"></div>`;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#acc4c0');
scene.fog = new THREE.FogExp2('#b5c6bd', 0.006);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
$('#scene').appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 600);
const ambient = new THREE.HemisphereLight('#e5f1e8', '#3e5441', 2);
scene.add(ambient);
const sun = new THREE.DirectionalLight('#ffe1a0', 3);
sun.position.set(-40, 60, -20); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110 });
scene.add(sun);
function mesh(geo, color, x, y, z, parent = scene) {
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
const ground = mesh(new THREE.BoxGeometry(160, 3, 180), '#7c9364', -20, -1.7, 0);
const sea = mesh(new THREE.PlaneGeometry(65, 180, 30, 30), '#639eaa', 92, -0.05, 0);
sea.rotation.x = -Math.PI / 2; sea.material.roughness = 0.25; sea.material.metalness = 0.35;
mesh(new THREE.BoxGeometry(12, 0.3, 180), '#d8cba0', 54, -0.1, 0);
const lake = mesh(new THREE.CircleGeometry(18, 48), '#72adb3', -25, 0.05, 63);
lake.rotation.x = -Math.PI / 2; lake.scale.y = 0.65;
for (let i = 0; i < 16; i++) mesh(new THREE.CircleGeometry(5, 20), '#72adb3', -25 + Math.sin(i * 0.5) * 12, 0.08, 63 + i * 3).rotation.x = -Math.PI / 2;
let seed = 82;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const trees = [];
for (let i = 0; i < 120; i++) {
  const x = rand() * 140 - 95, z = rand() * 145 - 75;
  if (Math.hypot(x + 10, z) < 15 || Math.hypot(x + 25, z - 63) < 22) continue;
  const h = 4 + rand() * 5;
  mesh(new THREE.CylinderGeometry(0.35, 0.55, h, 6), '#675c45', x, h / 2, z);
  trees.push(mesh(new THREE.ConeGeometry(h * 0.55, h * 1.4, 7), '#3e7151', x, h * 1.1, z));
}
for (let i = 0; i < 12; i++) {
  const h = 15 + rand() * 25, x = -95 + i * 14;
  mesh(new THREE.ConeGeometry(15 + rand() * 12, h, 5), '#7c8b83', x, h / 2 - 1, -84);
  mesh(new THREE.ConeGeometry(6, h * 0.32, 5), '#e4e8dc', x, h * 0.85, -84);
}
for (let i = 0; i < 35; i++) mesh(new THREE.DodecahedronGeometry(1 + rand() * 1.5), '#9a9e8a', rand() * 140 - 95, 0.4, rand() * 155 - 75);
for (let i = 0; i < 28; i++) mesh(new THREE.CircleGeometry(3.2, 12), '#b8b18a', Math.sin(i * 0.25) * 9 - 10, 0.03, i * 5 - 70).rotation.x = -Math.PI / 2;
mesh(new THREE.BoxGeometry(10, 5, 7), '#ab8260', -10, 2.5, -48);
mesh(new THREE.ConeGeometry(8, 4, 4), '#5a665a', -10, 6.5, -48).rotation.y = Math.PI / 4;
mesh(new THREE.BoxGeometry(2, 3, 0.2), '#3e5345', -10, 1.5, -44.4);

function createCamper(parent) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); parent.add(root);
  const torso = mesh(new THREE.CylinderGeometry(0.5, 0.45, 1.2, 8), '#e6b168', 0, 1.5, 0, body);
  mesh(new THREE.SphereGeometry(0.38, 12, 8), '#dbb391', 0, 2.4, 0, body);
  mesh(new THREE.SphereGeometry(0.39, 12, 8), '#4a4037', 0, 2.55, 0.05, body).scale.y = 0.55;
  mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), '#526e62', 0, 1.5, 0.4, body);
  const legs = [-0.23, 0.23].map(x => {
    const pivot = new THREE.Group(); pivot.position.set(x, 1, 0); body.add(pivot);
    mesh(new THREE.BoxGeometry(0.28, 0.9, 0.3), '#40574d', 0, -0.45, 0, pivot);
    return pivot;
  });
  [-0.67, 0.67].forEach(x => mesh(new THREE.CapsuleGeometry(0.13, 0.65, 3, 6), '#d4a777', x, 1.45, 0, body));
  return { root, body, torso, legs };
}
const camper = createCamper(scene), player = camper.root;
player.position.set(-10, 0, 0);
function poseCamper(model, pose, walking = false, now = 0) {
  model.body.rotation.x = pose === 'prone' ? -Math.PI / 2 : pose === 'crouch' ? 0.24 : 0;
  model.body.position.set(0, pose === 'prone' ? 0.42 : pose === 'crouch' ? -0.62 : 0, 0);
  model.legs.forEach((leg, i) => { leg.rotation.x = pose === 'crouch' ? -1.35 : walking ? Math.sin(now * 0.009 + i * Math.PI) * 0.45 : 0; });
}

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
poseCamper(menuCamper, 'crouch');
menuCamper.body.position.y = -0.75; menuCamper.body.rotation.x = 0.12;
mesh(new THREE.DodecahedronGeometry(1), '#6b7661', 12, 3.4, 4, titleScene).scale.set(1.7, 0.6, 1.3);
for (let i = 0; i < 22; i++) {
  const x = 18 + rand() * 25, z = -35 + rand() * 30, h = 4 + rand() * 5;
  mesh(new THREE.CylinderGeometry(0.16, 0.3, h, 5), '#414839', x, h / 2 - 0.3, z, titleScene);
  mesh(new THREE.ConeGeometry(h * 0.4, h * 1.2, 6), '#334e43', x, h * 0.95, z, titleScene);
}

const animals = [];
for (let i = 0; i < 12; i++) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), new THREE.MeshStandardMaterial({ color: i < 6 ? '#b39c77' : '#82928d' }));
  b.scale.set(1, 0.8, 0.6); g.add(b);
  const head = b.clone(); head.scale.set(0.4, 0.6, 0.4); head.position.set(0.65, 0.4, 0); g.add(head);
  g.position.set(rand() * 110 - 85, 0.8, rand() * 110 - 55); scene.add(g); animals.push(g);
}
const count = 1400, positions = new Float32Array(count * 3);
for (let i = 0; i < count; i++) { positions[i * 3] = rand() * 180 - 100; positions[i * 3 + 1] = rand() * 65; positions[i * 3 + 2] = rand() * 180 - 90; }
const particlesGeo = new THREE.BufferGeometry(); particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const particles = new THREE.Points(particlesGeo, new THREE.PointsMaterial({ color: '#f6d9df', size: 0.28, transparent: true, opacity: 0.8 })); scene.add(particles);
function applySeason() {
  ground.material.color.set(['#82986c', '#67845c', '#a28b5b', '#dce3df'][season]);
  trees.forEach((tree, i) => tree.material.color.set(['#668864', '#39745b', i % 3 ? '#b17e4c' : '#c59a57', '#718a7f'][season]));
  particles.material.color.set(['#f6d4df', '#c0dce8', '#e4ad61', '#ffffff'][season]);
} applySeason();

function toast(key) {
  $('#toast').textContent = t(key); $('#toast').classList.remove('hidden');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.add('hidden'), 4500);
}
function advancing() { return timeAdvances({ running, paused, backpackOpen, optionsOpen, hidden: document.hidden }); }
function clearMovement() { keys.clear(); target = null; }
function releaseMouse() { if (document.pointerLockElement) document.exitPointerLock(); }
let modalTrigger = null;
function openModal(kind) {
  modalTrigger = document.activeElement; clearMovement(); releaseMouse();
  if (kind === 'options') { optionsOpen = true; syncOptions(); } else { backpackOpen = true; renderBackpack(); }
  $(`#${kind}-modal`).classList.remove('hidden'); $(`#${kind}-close`).focus(); renderHUD();
}
function closeModal(kind) {
  if (kind === 'options') optionsOpen = false; else backpackOpen = false;
  $(`#${kind}-modal`).classList.add('hidden'); clearMovement();
  if (modalTrigger?.isConnected) modalTrigger.focus(); renderHUD();
}
$('#title-options').onclick = $('#game-options').onclick = () => openModal('options');
$('#options-close').onclick = () => closeModal('options');
$('#backpack-close').onclick = () => closeModal('backpack');
$('#backpack-toggle').onclick = () => { if (running && !optionsOpen) openModal('backpack'); };
$('#start').onclick = () => { $('#title-screen').classList.add('hidden'); $('#home').classList.remove('hidden'); $('#age').focus(); };
$('#prep-back').onclick = () => { $('#home').classList.add('hidden'); $('#title-screen').classList.remove('hidden'); $('#start').focus(); };
function syncOptions() {
  $('#brightness').value = options.brightness; $('#brightness-value').value = `${options.brightness}%`;
  $('#sensitivity').value = options.sensitivity; $('#sensitivity-value').value = `${options.sensitivity.toFixed(1)}×`;
  $('#invert-x').checked = options.invertX; $('#invert-y').checked = options.invertY; $('#language').value = options.language;
  renderer.toneMappingExposure = options.brightness / 100;
}
function localize() {
  document.documentElement.lang = options.language;
  document.title = `Free Camper · ${t('subtitle')}`;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-label]').forEach(el => el.setAttribute('aria-label', t(el.dataset.label)));
  $('#pause').textContent = t(paused ? 'resume' : 'pause');
  if ($('#home-error').textContent) $('#home-error').textContent = t('gearError');
  if (!$('#shop').classList.contains('hidden')) renderShop();
  if (backpackOpen) renderBackpack();
  $('#toast').classList.add('hidden'); renderHUD();
}
$('#options-modal').addEventListener('input', e => {
  const ids = { brightness: 'brightness', sensitivity: 'sensitivity', 'invert-x': 'invertX', 'invert-y': 'invertY', language: 'language' };
  const key = ids[e.target.id]; if (!key) return;
  options[key] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'range' ? +e.target.value : e.target.value;
  options = normalizeOptions(options); syncOptions();
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
$('#depart').onclick = () => {
  const checked = [...document.querySelectorAll('#gear input:checked')];
  if (checked.length !== 6) { $('#home-error').textContent = t('gearError'); return; }
  checked.forEach(i => inventory.add(i.value));
  camper.torso.scale.x = [1, 1.4, 0.75][$('#body').selectedIndex]; camper.torso.material.color.set($('#gender').value === 'female' ? '#cf947f' : '#e6b168');
  elapsed = (mode === 'car' ? 1 : 3) * 120; running = true; clearMovement();
  $('#home').classList.add('hidden'); $('#hud').classList.remove('hidden'); document.activeElement?.blur();
  toast('arrived'); renderHUD();
};
function hour() { return (5 + elapsed / 120) % 24; }
function night() { return hour() < 6 || hour() >= 19; }
function finish() {
  running = false; clearMovement(); releaseMouse(); $('#shop').classList.add('hidden');
  $('#hud').classList.add('hidden');
  const el = document.createElement('div'); el.className = 'end';
  el.innerHTML = `<div><div class="brand">UNTIL NEXT TIME</div><h1>${t('endTitle')}</h1><p>${Math.min(7, Math.floor(elapsed / 2880) + 1)} ${t('tripDays')} · ${campCount} ${t('camps')} · ${visited.size} ${t('views')}<br>${t('remaining')} ₩${money.toLocaleString()}</p><button id="again" class="primary">${t('again')}</button></div>`;
  app.appendChild(el); $('#again').onclick = () => location.reload(); $('#again').focus();
}
$('#return').onclick = () => { if (advancing()) finish(); };
$('#pause').onclick = () => { if (backpackOpen || optionsOpen) return; paused = !paused; clearMovement(); if (paused) releaseMouse(); $('#pause').textContent = t(paused ? 'resume' : 'pause'); renderHUD(); };
function setPosture(next) { if (jumpHeight > 0) return; posture = togglePosture(posture, next); poseCamper(camper, posture); renderHUD(); }
const gameCodes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'KeyC', 'KeyV', 'KeyB'];
addEventListener('keydown', e => {
  const modal = optionsOpen ? 'options' : backpackOpen ? 'backpack' : null;
  if (modal && e.code === 'Tab') {
    const nodes = [...$(`#${modal}-modal`).querySelectorAll('button, input, select, [tabindex="0"]')];
    const first = nodes[0], last = nodes.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  if (e.code === 'Escape') { if (modal) { e.preventDefault(); closeModal(modal); } else releaseMouse(); return; }
  const editing = e.target.matches('input, select, textarea, [contenteditable="true"]');
  if (e.code === 'KeyB' && running && !optionsOpen && !editing && !e.repeat) {
    e.preventDefault(); if (backpackOpen) closeModal('backpack'); else openModal('backpack'); return;
  }
  if (!advancing() || editing || modal) return;
  if (gameCodes.includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (!e.repeat && e.code === 'KeyC') setPosture('crouch');
  if (!e.repeat && e.code === 'KeyV') setPosture('prone');
  if (!e.repeat && e.code === 'Space' && posture === 'stand' && jumpHeight === 0) { jumpVelocity = 7; jumpHeight = 0.001; renderHUD(); }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', clearMovement);
document.addEventListener('visibilitychange', () => { previous = performance.now(); clearMovement(); renderHUD(); });
document.addEventListener('pointerlockchange', () => { clearMovement(); });
function look(dx, dy) { if (advancing()) ({ yaw, pitch } = lookAngles(yaw, pitch, dx, dy, options)); }
document.addEventListener('mousemove', e => { if (document.pointerLockElement === renderer.domElement) look(e.movementX, e.movementY); });
let touchPosition = null;
renderer.domElement.addEventListener('pointerdown', e => {
  if (!advancing()) return;
  if (e.pointerType === 'touch') { touchPosition = { x: e.clientX, y: e.clientY }; renderer.domElement.setPointerCapture(e.pointerId); }
  else if (!document.pointerLockElement) {
    try { const promise = renderer.domElement.requestPointerLock?.(); promise?.catch(() => toast('mouseFallback')); } catch { toast('mouseFallback'); }
  }
});
renderer.domElement.addEventListener('pointermove', e => {
  if (document.pointerLockElement) return;
  if (e.pointerType === 'touch') { if (touchPosition) { look(e.clientX - touchPosition.x, e.clientY - touchPosition.y); touchPosition = { x: e.clientX, y: e.clientY }; } }
  else look(e.movementX, e.movementY);
});
renderer.domElement.addEventListener('pointerup', () => { touchPosition = null; });
renderer.domElement.addEventListener('pointercancel', () => { touchPosition = null; });
renderer.domElement.addEventListener('wheel', e => { if (advancing()) dist = THREE.MathUtils.clamp(dist + e.deltaY * 0.025, 12, 60); });
$('#map').onclick = e => {
  if (!advancing()) return; const r = e.currentTarget.getBoundingClientRect();
  target = new THREE.Vector3(THREE.MathUtils.clamp((e.clientX - r.left) / r.width * 220 - 100, -96, 48), 0, THREE.MathUtils.clamp((e.clientY - r.top) / r.height * 180 - 90, -70, 83));
};
$('#camp').onclick = () => {
  if (!advancing()) return;
  if (player.position.z > 48 && Math.hypot(player.position.x + 25, player.position.z - 63) < 22) { toast('waterWarning'); return; }
  if (camp) scene.remove(camp); camp = new THREE.Group();
  mesh(new THREE.ConeGeometry(3, 3.2, 4), '#dcaa65', 0, 1.6, 0, camp).rotation.y = Math.PI / 4;
  camp.position.set(player.position.x + 3, 0, player.position.z); scene.add(camp); clean = false; protectedCamp = false; campCount++; toast('campDone'); renderHUD();
};
$('#clean').onclick = () => { if (!advancing()) return; if (!camp) { toast('needCamp'); return; } clean = true; toast('cleanDone'); renderHUD(); };
$('#protect').onclick = () => { if (!advancing()) return; if (!camp) { toast('needCamp'); return; } if (!inventory.has('repellent')) { toast('needRepellent'); return; } protectedCamp = true; toast('protectDone'); };
$('#repel').onclick = () => { if (!advancing()) return; if (!danger) { toast('noAnimal'); return; } if (!inventory.has('repellent')) { toast('needRepellent'); return; } danger = false; toast('repelDone'); renderHUD(); };
$('#sleep').onclick = () => { if (!advancing()) return; if (!camp) { toast('needCamp'); return; } elapsed += 120; toast('restDone'); renderHUD(); };
function nearShop() { return Math.hypot(player.position.x + 10, player.position.z + 44) < 15; }
function renderShop() {
  const near = nearShop();
  $('#shop').innerHTML = `<h3>${t('shopTitle')}</h3><p class="small">${t(near ? 'welcomeShop' : 'farShop')}<br>${t('usedNote')}</p>` + goods.map(([n, p], i) => `<div class="item"><div>${t(n)}<div class="small">₩${p.toLocaleString()}</div></div><div>${inventory.has(n) ? `<button data-sell="${i}" ${near ? '' : 'disabled'}>${t('sell')}</button>` : `<button data-buy="${i}" ${near ? '' : 'disabled'}>${t('new')}</button> <button data-used="${i}" ${near ? '' : 'disabled'}>${t('used')}</button>`}</div></div>`).join('');
}
$('#shop-toggle').onclick = () => { if (!advancing()) return; clearMovement(); releaseMouse(); $('#shop').classList.toggle('hidden'); renderShop(); };
$('#shop').onclick = e => {
  if (!advancing() || !nearShop()) return; const b = e.target;
  if (b.dataset.sell !== undefined) { const [n, p] = goods[+b.dataset.sell]; inventory.delete(n); money += Math.floor(p * 0.4); if (n === 'repellent') protectedCamp = false; }
  else { const idx = b.dataset.buy ?? b.dataset.used; if (idx === undefined) return; const [n, p] = goods[+idx], price = b.dataset.used !== undefined ? Math.floor(p * 0.65) : p; if (money < price) { toast('noMoney'); return; } money -= price; inventory.add(n); }
  renderShop(); renderHUD();
};
const icons = { tent: '⛺', bedding: '▤', clothing: '♧', cookware: '♨', food: '◒', survival: '✚', tarp: '⌂', mat: '▥', winterBag: '▰', repellent: '☀' };
function renderBackpack() {
  $('#backpack-items').innerHTML = inventory.size ? [...inventory].map(id => `<article class="inventory-card"><div class="item-icon" aria-hidden="true">${icons[id]}</div><div><h3>${t(id)}</h3><span class="small">${t(essentials.includes(id) ? 'essential' : 'extra')}</span></div><span class="item-quantity">×1</span></article>`).join('') : `<p>${t('empty')}</p>`;
}
function renderHUD() {
  if (!running) return;
  $('#clock').textContent = `DAY ${Math.floor(elapsed / 2880) + 1} / 7 · ${String(Math.floor(hour())).padStart(2, '0')}:${String(Math.floor(hour() % 1 * 60)).padStart(2, '0')}`;
  $('#weather').textContent = `${t(seasonKeys[season])} · ${t(weather)} · ${t(night() ? 'night' : 'day')}`;
  $('#balance').textContent = `₩ ${money.toLocaleString()}`;
  const state = jumpHeight > 0 ? 'airborne' : posture === 'crouch' ? 'crouched' : posture === 'prone' ? 'proneState' : 'stand';
  $('#status').textContent = `${t(mode)} · ${t(danger ? 'danger' : 'safe')} · ${t(state)}`;
  $('#missions').innerHTML = `${camp ? '✓' : '○'} ${t('campGoal')}<br>${clean ? '✓' : '○'} ${t('cleanGoal')}<br>${visited.size >= 3 ? '✓' : '○'} ${t('exploreGoal')} (${visited.size}/3)`;
  $('#journal').textContent = t(season === 3 && !inventory.has('winterBag') ? 'winterTip' : weather === 'rain' && !inventory.has('tarp') ? 'rainTip' : 'peacefulTip');
  $('#pin').style.left = `${(player.position.x + 100) / 220 * 100}%`; $('#pin').style.top = `${(player.position.z + 90) / 180 * 100}%`;
  $('#pause-badge').classList.toggle('hidden', advancing());
}
function stepGame(dt, now, realSeconds) {
  elapsed += realSeconds;
  if (elapsed >= 7 * 24 * 120) { finish(); return; }
  let dx = 0, dz = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) dz--;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dz++;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx--;
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx++;
  const dir = new THREE.Vector3(dx, 0, dz);
  if (dir.length()) { target = null; dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw); }
  else if (target) { dir.copy(target).sub(player.position); dir.y = 0; if (dir.length() < 0.5) { target = null; dir.set(0, 0, 0); } else dir.normalize(); }
  player.position.addScaledVector(dir, movementSpeed(mode, posture, keys.has('ShiftLeft')) * dt);
  player.position.x = THREE.MathUtils.clamp(player.position.x, -96, 48); player.position.z = THREE.MathUtils.clamp(player.position.z, -70, 83);
  if (jumpHeight > 0 || jumpVelocity > 0) { ({ height: jumpHeight, velocity: jumpVelocity } = verticalStep(jumpHeight, jumpVelocity, dt)); }
  player.position.y = jumpHeight;
  if (dir.length()) player.rotation.y = Math.atan2(dir.x, dir.z);
  poseCamper(camper, posture, dir.length() > 0, now);
  visited.add(player.position.z < -30 ? 'mountain' : player.position.z > 35 ? 'lake' : player.position.x > 25 ? 'coast' : 'forest');
  const tick = Math.floor(elapsed / 120);
  if (tick !== weatherTick) {
    weatherTick = tick; weather = ['clear', ['blossoms', 'rain', 'leaves', 'snow'][season], 'fog'][Math.floor(Math.random() * 3)];
    if (tick > lastEncounter) { lastEncounter = tick; if (!danger && Math.random() < (night() ? (clean && protectedCamp ? 0.005 : 0.25) : 0.05)) { danger = true; toast('animalWarning'); } }
  }
  if (danger && player.position.z < -35) { danger = false; toast('safeZone'); }
  particles.visible = weather !== 'clear' && weather !== 'fog'; particles.material.size = weather === 'rain' ? 0.13 : season === 3 ? 0.22 : 0.32;
  const a = particlesGeo.attributes.position.array;
  for (let i = 0; i < count; i++) { a[i * 3 + 1] -= dt * (weather === 'rain' ? 25 : 2); a[i * 3] += dt * Math.sin(now * 0.0003 + i) * 1.5; if (a[i * 3 + 1] < 0) a[i * 3 + 1] = 65; }
  particlesGeo.attributes.position.needsUpdate = true;
  animals.forEach((g, i) => { g.visible = i < 6 ? !night() : night(); g.position.x += Math.sin(now * 0.0002 + i) * dt * 0.5; });
  sea.position.y = -0.05 + Math.sin(elapsed * 0.6) * 0.07;
  if (!$('#shop').classList.contains('hidden') && renderShop.wasNear !== nearShop()) { renderShop.wasNear = nearShop(); renderShop(); }
  renderHUD();
}
let previous = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const realSeconds = (now - previous) / 1000;
  const dt = Math.min(realSeconds, 0.1); previous = now;
  if (advancing()) stepGame(dt, now, realSeconds);
  if (!running) { renderer.render(titleScene, titleCamera); return; }
  const daylight = THREE.MathUtils.clamp(Math.sin((hour() - 6) / 12 * Math.PI), 0.05, 1);
  ambient.intensity = 0.35 + daylight * 1.5; sun.intensity = daylight * 2.8;
  sun.position.set(Math.cos(hour() / 24 * Math.PI * 2) * 60, Math.max(6, daylight * 65), -35);
  const sky = new THREE.Color().lerpColors(new THREE.Color('#152a42'), new THREE.Color('#b9d1cf'), daylight);
  scene.background.copy(sky); scene.fog.color.copy(sky); scene.fog.density = weather === 'fog' ? 0.022 : 0.006;
  const eye = posture === 'prone' ? 0.6 : posture === 'crouch' ? 0.9 : 1.5;
  camera.position.set(player.position.x + Math.sin(yaw) * dist * Math.cos(pitch), player.position.y + eye + Math.sin(pitch) * dist, player.position.z + Math.cos(yaw) * dist * Math.cos(pitch));
  camera.lookAt(player.position.x, player.position.y + eye, player.position.z);
  renderer.render(scene, camera);
}
addEventListener('resize', () => {
  [camera, titleCamera].forEach(c => { c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix(); }); renderer.setSize(innerWidth, innerHeight);
});
syncOptions(); localize(); requestAnimationFrame(animate);
