import * as THREE from 'three';
import {createCamper} from './characters.js';
import { pathSurfaceHeight } from './paths.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const DEFAULT_TENT = Object.freeze({ size: 'standard', type: 'dome', color: 'sand', material: 'canvas' });
export const TENT_OPTIONS = Object.freeze({
  size: ['standard', 'large', 'family'],
  type: ['dome', 'ridge', 'tunnel'],
  color: ['sand', 'forest', 'rust', 'navy'],
  material: ['canvas', 'ripstop'],
});
export const TENT_COLORS = Object.freeze({ sand: '#e8bc72', forest: '#4e9a68', rust: '#e37c47', navy: '#497da5' });
const SIZE_SCALE = { standard: 1, large: 1.25, family: 1.5 };

export function normalizeTentConfig(config = {}) {
  return Object.fromEntries(Object.keys(DEFAULT_TENT).map(key => [key, TENT_OPTIONS[key].includes(config[key]) ? config[key] : DEFAULT_TENT[key]]));
}
export function tentDimensions(config = DEFAULT_TENT) {
  const scale = SIZE_SCALE[normalizeTentConfig(config).size];
  return { width: 9 * scale, depth: 8 * scale, height: 5 * scale, scale };
}

function canvasTexture(kind, color = '#ffffff') {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color; ctx.fillRect(0, 0, 256, 256);
  if (kind === 'wood') {
    for (let x = 0; x < 256; x += 32) {
      ctx.fillStyle = x % 64 ? '#ffe3a417' : '#6d452016'; ctx.fillRect(x + 1, 0, 30, 256);
      ctx.strokeStyle = '#70421f6b'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const yy = i * 80 + x % 21; ctx.strokeStyle = '#87502d38'; ctx.beginPath(); ctx.ellipse(x + 16, yy, 4, 18, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#f3cc8f44'; ctx.beginPath(); ctx.moveTo(x + 6, yy - 30); ctx.bezierCurveTo(x + 15, yy - 15, x + 4, yy + 15, x + 6, yy + 35); ctx.stroke();
      }
    }
  } else {
    for (let i = 0; i < 256; i += 3) {
      ctx.fillStyle = '#ffffff07'; ctx.fillRect(0, i, 256, 1);
      ctx.fillStyle = '#283e3105'; ctx.fillRect(i, 0, 1, 256);
    }
    if (kind === 'ripstop') for (let i = 0; i < 256; i += 24) { ctx.fillStyle = '#ffffff21'; ctx.fillRect(i, 0, 1, 256); ctx.fillRect(0, i, 256, 1); }
    else for (let i = 0; i < 256; i += 12) { ctx.fillStyle = '#ffecc20a'; ctx.fillRect(i, 0, 1, 256); }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(kind === 'wood' ? 2 : 3, kind === 'wood' ? 1 : 3);
  return texture;
}
function material(color, options = {}) { return new THREE.MeshStandardMaterial({ color, roughness: .72, ...options }); }
function add(parent, geometry, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function box(parent, width, height, depth, mat, x, y, z) {
  const radius = Math.min(.07, Math.min(width, height, depth) * .18);
  return add(parent, new RoundedBoxGeometry(width, height, depth, 1, radius), mat, x, y, z);
}
function tubeLine(parent, points, radius, mat, segments = 48) {
  const path = new THREE.CurvePath();
  for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(...points[i - 1]), new THREE.Vector3(...points[i])));
  return add(parent, new THREE.TubeGeometry(path, segments, radius, 6, false), mat);
}
function instances(parent, geometry, mat, transforms) {
  const batch = new THREE.InstancedMesh(geometry, mat, transforms.length), dummy = new THREE.Object3D();
  transforms.forEach((tr, i) => {
    dummy.position.set(...tr.position); dummy.rotation.set(...(tr.rotation || [0, 0, 0])); dummy.scale.set(...(tr.scale || [1, 1, 1])); dummy.updateMatrix(); batch.setMatrixAt(i, dummy.matrix);
    if (tr.color) batch.setColorAt(i, new THREE.Color(tr.color));
  });
  batch.castShadow = true; batch.receiveShadow = true; batch.instanceMatrix.needsUpdate = true; batch.computeBoundingSphere(); parent.add(batch); return batch;
}
function flowerBox(parent, x, y, z, wood, leaf, bloom) {
  box(parent, 2.2, .5, .55, wood, x, y, z);
  const shapes = [], flowers = [];
  for (let i = 0; i < 8; i++) {
    const xx = x - .95 + i * .27, yy = y + .25 + Math.sin(i * 1.7) * .12;
    shapes.push({ position: [xx, yy + .3, z], rotation: [0, i, (i % 2 ? 1 : -1) * .5], scale: [.22, .5, .14] });
    if (i % 2 === 0) flowers.push({ position: [xx, yy + .6, z + .02], scale: [.13, .13, .1], color: i % 3 ? '#f3d764' : '#f0b3bd' });
  }
  instances(parent, new THREE.SphereGeometry(1, 7, 5), leaf, shapes);
  instances(parent, new THREE.IcosahedronGeometry(1, 1), bloom, flowers);
}
function rod(parent, from, to, radius, mat) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), vector = b.clone().sub(a);
  const m = add(parent, new THREE.CylinderGeometry(radius, radius, vector.length(), 7), mat);
  m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vector.normalize()); return m;
}
function worldPosition(origin, x, y, z) { return new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), origin.rotation || 0).add(new THREE.Vector3(origin.x, origin.y, origin.z)); }
function localPosition(origin, x, z) { return new THREE.Vector3(x - origin.x, 0, z - origin.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), -(origin.rotation || 0)); }
function collider(origin, minX, maxX, minZ, maxZ, active = true, id = '') {
  const points = [[minX, minZ], [minX, maxZ], [maxX, minZ], [maxX, maxZ]].map(([x, z]) => worldPosition(origin, x, 0, z));
  const heights={'shop-wall':6.8,'shop-door':4.2,'shop-door-open':4.2,'shop-shelf':4.6,'shop-counter':2.5,'shopkeeper':2.9,'shop-porch-post':6.5};
  return { kind: 'box', minY:origin.y,maxY:origin.y+(heights[id]??Infinity), minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)), minZ: Math.min(...points.map(p => p.z)), maxZ: Math.max(...points.map(p => p.z)), active, id };
}
function disposeGroup(group) {
  const geometries = new Set(), mats = new Set(), textures = new Set();
  group.traverse(o => { if (o.geometry) geometries.add(o.geometry); for (const m of [].concat(o.material || [])) { mats.add(m); for (const v of Object.values(m)) if (v?.isTexture) textures.add(v); } });
  geometries.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); group.removeFromParent();
}
function label(parent, text, x, y, z, width, height) {
  const wood = material('#473d2b'); box(parent, width, height, .16, wood, x, y, z);
  if (typeof document === 'undefined') return;
  const c = document.createElement('canvas'); c.width = 768; c.height = 192;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#344b39'; ctx.fillRect(0, 0, 768, 192);
  ctx.strokeStyle = '#dbcc9b'; ctx.lineWidth = 5; ctx.strokeRect(10, 10, 748, 172);
  ctx.fillStyle = '#efe1b3'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 48px sans-serif'; ctx.fillText(text, 384, 96);
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
  add(parent, new THREE.PlaneGeometry(width * .97, height * .9), new THREE.MeshBasicMaterial({ map: texture }), x, y, z + .09);
}
function lantern(parent, x, y, z, metal, glow) {
  add(parent, new THREE.CylinderGeometry(.18, .2, .42, 9), glow, x, y, z);
  add(parent, new THREE.CylinderGeometry(.27, .27, .08, 10), metal, x, y - .25, z);
  add(parent, new THREE.ConeGeometry(.3, .17, 10), metal, x, y + .3, z);
  const light = new THREE.PointLight('#ffd29a', 5, 6, 1.5); light.position.set(x, y, z); parent.add(light);
}

/** Front is +Z. 20×17m footprint; front door at local (0, 0, 8.5). */
export function createShop(scene, position) {
  const origin = { x: 0, y: 0, z: 0, rotation: 0, ...position };
  const group = new THREE.Group(); group.position.set(origin.x, origin.y, origin.z); group.rotation.y = origin.rotation; scene.add(group);
  group.userData.interaction = 'shop';
  const woodTexture = canvasTexture('wood', '#c08d5e');
  const wood = material('#ffffff', { map: woodTexture });
  const darkWood = material('#795237'), beam = material('#8f5e37'), roofMat = material('#437e83', { roughness: .68 });
  const metal = material('#414c46', { metalness: .65, roughness: .35 });
  const glass = material('#96c3bf', { transparent: true, opacity: .45, metalness: .25, roughness: .15, side: THREE.DoubleSide });
  const glow = material('#ffe8ae', { emissive: '#ffbe68', emissiveIntensity: .65 });
  const gold = material('#d4a550', { metalness: .35, roughness: .48 }), cream = material('#f2d49c');
  box(group, 20.5, .3, 17.5, wood, 0, .15, 0);
  const foundation = [];
  for (let i = 0; i < 13; i++) for (const z of [-8.52, 8.52]) foundation.push({ position: [-9.25 + i * 1.54, -.12, z], scale: [1, .42, .72], color: i % 3 ? '#b8a17f' : '#d0b28a' });
  for (let i = 0; i < 10; i++) for (const x of [-10, 10]) foundation.push({ position: [x, -.12, -7.5 + i * 1.66], rotation: [0, Math.PI / 2, 0], scale: [1, .42, .72], color: i % 3 ? '#b8a17f' : '#d0b28a' });
  instances(group, new RoundedBoxGeometry(1.48, .8, .65, 1, .12), material('#ffffff'), foundation);
  for (let i = -8; i <= 8; i += 1) box(group, 20.2, .025, .025, darkWood, 0, .315, i);
  const walls = new THREE.Group(); group.add(walls);
  // Solid walls are split around the functional front door and side windows.
  box(walls, 8.4, 6.8, .3, wood, -5.8, 3.4, 8.5);
  box(walls, 8.4, 6.8, .3, wood, 5.8, 3.4, 8.5);
  box(walls, 3.2, 3, .3, wood, 0, 5.3, 8.5);
  box(walls, 20, 6.8, .3, wood, 0, 3.4, -8.5);
  for (const side of [-1, 1]) {
    box(walls, .3, 6.8, 5.8, wood, side * 10, 3.4, -5.6);
    box(walls, .3, 6.8, 5.8, wood, side * 10, 3.4, 5.6);
    box(walls, .3, 2, 5.4, wood, side * 10, 1, 0);
    box(walls, .3, 2.1, 5.4, wood, side * 10, 5.75, 0);
    box(walls, .08, 2.7, 5.4, glass, side * 10, 3.35, 0);
    for (const zz of [-2.7, 0, 2.7]) box(walls, .4, 2.95, .13, beam, side * 10, 3.35, zz);
    for (const yy of [2, 4.7]) box(walls, .4, .15, 5.7, beam, side * 10, yy, 0);
  }
  // Separate overlapping cedar courses catch highlights along the cabin facade.
  const siding = [];
  for (let row = 0; row < 12; row++) for (const side of [-1, 1]) siding.push({ position: [side * 5.8, .45 + row * .54, 8.69], color: row % 3 ? '#d2a06c' : '#c58c56' });
  instances(walls, new RoundedBoxGeometry(8.28, .54, .13, 1, .04), material('#ffffff'), siding);
  for (const x of [-10, 10]) for (const z of [-8.5, 8.5]) box(group, .5, 7, .5, beam, x, 3.5, z);
  for (const x of [-1.7, 1.7]) box(group, .24, 4, .5, beam, x, 2, 8.5);
  box(group, 3.65, .22, .5, beam, 0, 3.9, 8.5);
  const roof = new THREE.Group(); group.add(roof);
  for (const side of [-1, 1]) {
    const roofSide = new THREE.Group(); roofSide.position.set(side * 5.3, 8, 0); roofSide.rotation.z = -side * .29; roof.add(roofSide);
    box(roofSide, 11.9, .28, 19, roofMat, 0, 0, 0);
    const shingles = [];
    for (let row = 0; row < 5; row++) for (let col = 0; col < 26; col++) shingles.push({ position: [-4.7 + row * 2.36, .2 + row * .012, -9.12 + col * .73 + row % 2 * .14], color: ['#4d9090', '#498383', '#559891', '#39747b'][(row + col) % 4] });
    instances(roofSide, new RoundedBoxGeometry(2.4, .14, .76, 1, .04), material('#ffffff'), shingles);
    box(roofSide, .18, .45, 19.5, beam, side * 5.9, -.04, 0);
  }
  box(roof, .22, .3, 19.4, metal, 0, 9.7, 0);
  for (const z of [-8.5, 8.5]) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-10, 6.7, z, 10, 6.7, z, 0, 9.55, z], 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, .5, 1], 2)); geometry.computeVertexNormals();
    add(roof, geometry, material('#c0a376', { side: THREE.DoubleSide }));
  }
  // A permanent timber ceiling under the roof, with warm suspended indoor lamps.
  const ceiling=box(group,19.7,.18,16.7,material('#d8bb8c'),0,6.65,0);ceiling.name='Shop ceiling';
  for(const z of [-5,0,5])box(group,19.8,.22,.23,beam,0,6.4,z);
  const interiorLights=[];
  for(const x of [-4.5,4.5]){
    rod(group,[x,6.5,-1],[x,5.9,-1],.035,metal);
    add(group,new THREE.SphereGeometry(.3,12,8),material('#fff0be',{emissive:'#ffd18a',emissiveIntensity:2.2}),x,5.75,-1).scale.set(1,.65,1);
    const shade=add(group,new THREE.ConeGeometry(.65,.3,16,1,true),material('#6d9987',{side:THREE.DoubleSide}),x,5.98,-1);
    const light=new THREE.PointLight('#ffe0ae',42,19,1.5);light.position.set(x,5.55,-1);light.name='Shop indoor lamp';group.add(light);interiorLights.push(light);
  }
  label(group, 'TRAIL OUTFITTER', 0, 5.45, 8.91, 10, 1.15);
  for (const side of [-1, 1]) flowerBox(group, side * 6.6, 1.35, 8.98, beam, material('#51a34c'), material('#ffffff'));
  for (const x of [-1.72, 1.72]) for (let i = 0; i < 3; i++) {
    add(group, new THREE.SphereGeometry(.095, 8, 6), gold, x, .7 + i * 1.15, 8.82);
  }
  box(group, 22, .17, 3.4, darkWood, 0, .08, 10.2);
  for (const x of [-9, 9]) box(group, .3, 6.5, .3, beam, x, 3.25, 11.4);
  box(group, 22, .25, 3.7, roofMat, 0, 6.5, 10.2).rotation.x = .1;
  const doorPivot = new THREE.Group(); doorPivot.position.set(-1.6, .3, 8.5); group.add(doorPivot);
  box(doorPivot, 3.2, 3.6, .15, darkWood, 1.6, 1.8, 0);
  box(doorPivot, 2.6, 1.65, .06, glass, 1.6, 2.4, .09);
  for (const x of [.24, 2.96]) box(doorPivot, .12, 3.35, .12, cream, x, 1.8, .12);
  for (const y of [.25, 1.42, 3.43]) box(doorPivot, 2.84, .11, .12, cream, 1.6, y, .12);
  add(doorPivot, new THREE.SphereGeometry(.105, 12, 8), gold, 2.84, 1.48, .25);
  box(doorPivot, .12, .3, .08, gold, 2.84, 1.48, .17);
  lantern(group, -2.7, 3.3, 9, metal, glow); lantern(group, 2.7, 3.3, 9, metal, glow);
  // Shelves, pots, rolled mats, tent display and climbing tools.
  const productMats = ['#dfb15f', '#69a862', '#de7f5c', '#598eb9', '#e9c991'].map(c => material(c));
  for (const side of [-1, 1]) for (let shelf = 0; shelf < 3; shelf++) {
    const y = 1 + shelf * 1.35;
    box(group, 1.65, .18, 11.5, darkWood, side * 8.8, y, -1);
    for (let j = 0; j < 6; j++) {
      const m = productMats[(j + shelf) % productMats.length], z = -5.5 + j * 1.8;
      if (side < 0) { const roll = add(group, new THREE.CylinderGeometry(.35, .35, .95, 10), m, side * 8.8, y + .43, z); roll.rotation.z = Math.PI / 2; box(group, .04, .74, .08, metal, side * 8.1, y + .43, z); }
      else { box(group, .7, .65, .7, m, side * 8.8, y + .42, z); box(group, .73, .05, .73, metal, side * 8.8, y + .77, z); }
    }
  }
  for (const side of [-1, 1]) for (const z of [-6.9, 4.9]) box(group, .15, 4.5, .18, metal, side * 9.6, 2.5, z);
  box(group, 8, 1.7, 1.8, wood, 3, 1.15, -3.8);
  box(group, 8.2, .16, 2, darkWood, 3, 2.08, -3.8);
  box(group, .85, .45, .7, metal, 5.5, 2.4, -3.8);
  const registerScreen = box(group, .65, .38, .07, material('#98c6a8', { emissive: '#335941', emissiveIntensity: .22 }), 5.5, 2.76, -3.8); registerScreen.rotation.x = -.28;
  for (let j = 0; j < 3; j++) box(group, .1, .04, .06, cream, 5.25 + j * .22, 2.66, -3.44);
  for (let j = 0; j < 3; j++) { const mug = add(group, new THREE.CylinderGeometry(.16, .14, .28, 12), productMats[j], 1.1 + j * .47, 2.3, -3.7); add(mug, new THREE.TorusGeometry(.105, .03, 6, 12), productMats[j], .18, 0, 0); }
  const folded = [];
  for (let i = 0; i < 4; i++) folded.push({ position: [3.8, 2.23 + i * .16, -3.65], color: ['#dd9f63', '#77a37e', '#d8c996', '#5f8eac'][i] });
  instances(group, new RoundedBoxGeometry(1.05, .15, .7, 1, .06), material('#ffffff'), folded);
  lantern(group, -.5, 2.45, -3.8, metal, glow);
  const ownerModel=createCamper(group,{species:Math.round(Math.abs(origin.x))%2?'female':'male'}),owner=ownerModel.root;
  owner.position.set(3,.3,-5.7);ownerModel.backpack.visible=false;ownerModel.materials.cream.color.set('#d9b46a');
  let ownerTime=0;
  label(group, 'WELCOME / 숲길 상점', 3, 4.25, -8.1, 8, 1);
  for (let i = 0; i < 5; i++) {
    const x = -5 + i;
    rod(group, [x, 1.45, -8.1], [x, 4.35, -8.1], .055, beam);
    if (i === 1) { // Pickaxe: tapered opposed metal heads.
      const head = add(group, new THREE.ConeGeometry(.13, .72, 7), metal, x + .31, 4.12, -8.1); head.rotation.z = -Math.PI / 2;
      const other = add(group, new THREE.ConeGeometry(.12, .55, 7), metal, x - .23, 4.12, -8.1); other.rotation.z = Math.PI / 2;
    } else if (i === 2) {
      box(group, .48, .58, .09, metal, x, 4.12, -8.1); box(group, .32, .42, .09, metal, x, 4.48, -8.1);
    } else {
      const head = box(group, .56, .33, .15, metal, x + .16, 4.12, -8.1); head.rotation.z = -.16;
      box(group, .09, .33, .17, cream, x + .42, 4.1, -8.1);
    }
    box(group, .1, .58, .1, material('#624431'), x, 1.72, -8.1);
  }
  const model = {
    group, doorPivot, doorOpen: false, roof, ceiling, interiorLights, owner,
    doorPosition: worldPosition(origin, 0, .3, 8.9),
    entrance: worldPosition(origin, 0, .3, 6.2),
    ownerPosition: worldPosition(origin, 3, .3, -5.7),
    bounds: { minX: origin.x - 10, maxX: origin.x + 10, minZ: origin.z - 8.5, maxZ: origin.z + 8.5 },
    floorY: origin.y + .3,
    interiorTargets: [
      { id: 'shop-tools', position: worldPosition(origin, -5, 1, -6.8), labelKey: 'toolShelf' },
      { id: 'shop-camping', position: worldPosition(origin, -7, 1, 1), labelKey: 'campShelf' },
      { id: 'shop-supplies', position: worldPosition(origin, 7, 1, 1), labelKey: 'supplyShelf' },
    ],
    setDoor(open) { this.doorOpen = !!open; doorPivot.rotation.y = this.doorOpen ? -Math.PI / 2 : 0; },
    isInside(x, z) { const p = localPosition(origin, x, z); return Math.abs(p.x) < 9.7 && Math.abs(p.z) < 8.2; },
    setInterior(inside) { this.interior = !!inside; roof.visible = true; ceiling.visible = true; },
    colliders() {
      return [
        collider(origin, -10.2, -9.8, -8.7, 8.7, true, 'shop-wall'), collider(origin, 9.8, 10.2, -8.7, 8.7, true, 'shop-wall'),
        collider(origin, -10, 10, -8.7, -8.3, true, 'shop-wall'),
        collider(origin, -10, -1.6, 8.3, 8.7, true, 'shop-wall'), collider(origin, 1.6, 10, 8.3, 8.7, true, 'shop-wall'),
        collider(origin, -1.6, 1.6, 8.32, 8.68, !this.doorOpen, 'shop-door'),
        collider(origin, -1.75, -1.45, 8.5, 11.7, this.doorOpen, 'shop-door-open'),
        collider(origin, -9.7, -7.8, -7, 5, true, 'shop-shelf'), collider(origin, 7.8, 9.7, -7, 5, true, 'shop-shelf'),
        collider(origin, -1.2, 7.2, -4.85, -2.75, true, 'shop-counter'),
        collider(origin, 2.5, 3.5, -6.2, -5.2, true, 'shopkeeper'),
        collider(origin, -9.2, -8.8, 11.2, 11.6, true, 'shop-porch-post'),
        collider(origin, 8.8, 9.2, 11.2, 11.6, true, 'shop-porch-post'),
      ];
    },
    update(dt) { ownerTime+=dt;owner.rotation.y=Math.sin(ownerTime*.5)*.06;if(this.interior)ownerModel.updateFace(ownerTime); },
    dispose() { ownerModel.dispose();disposeGroup(group); },
  };
  return model;
}
function performanceNow() { return typeof performance !== 'undefined' ? performance.now() : 0; }

function archGeometry(width, depth, height, type) {
  function roofY(x,z=0) {
    const u=Math.abs(x/(width/2));
    if(type==='ridge')return height*(.43+.57*(1-u));
    const dome=type==='dome'?Math.sqrt(Math.max(0,1-(z/(depth/2)*.55)**2)):1;
    return height*(.34+.66*Math.sqrt(Math.max(0,1-u*u))*dome);
  }
  const windows=[-1,1].map(side=>({minX:side*width*.29-width*.095,maxX:side*width*.29+width*.095,minZ:-depth*.34,maxZ:-depth*.02}));
  const sorted=values=>[...new Set(values)].sort((a,b)=>a-b);
  const xs=sorted([...Array.from({length:25},(_,i)=>-width/2+i/24*width),...windows.flatMap(w=>[w.minX,w.maxX])]);
  const zs=sorted([...Array.from({length:13},(_,i)=>-depth/2+i/12*depth),windows[0].minZ,windows[0].maxZ]);
  const positions=[],uvs=[],opaque=[],clear=[];
  for(const x of xs)for(const z of zs){positions.push(x,roofY(x,z),z);uvs.push((x/width+.5)*3,(z/depth+.5)*3);}
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
    const x=(xs[i]+xs[i+1])/2,z=(zs[j]+zs[j+1])/2;
    const indices=windows.some(w=>x>w.minX&&x<w.maxX&&z>w.minZ&&z<w.maxZ)?clear:opaque;
    const k=i*zs.length+j,n=zs.length;indices.push(k,k+1,k+n,k+1,k+n+1,k+n);
  }
  function geometry(indices){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;}
  return {geometry:geometry(opaque),windowGeometry:geometry(clear),windows,roofY};
}
function endPanel(parent, width, depth, roofY, mat, front, doorWidth = 0, doorHeight = 0) {
  const xs = [-width / 2, ...Array.from({ length: 25 }, (_, i) => -width / 2 + width * i / 24), -doorWidth / 2, doorWidth / 2, width / 2].sort((a, b) => a - b).filter((v, i, list) => i === 0 || v - list[i - 1] > .001);
  const vertices = [], uvs = [], indices = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1], lower = front && Math.abs((a + b) / 2) < doorWidth / 2 ? doorHeight : 0, k = vertices.length / 3;
    vertices.push(a, lower, depth, b, lower, depth, a, roofY(a), depth, b, roofY(b), depth);
    uvs.push(a / width, lower / width, b / width, lower / width, a / width, roofY(a) / width, b / width, roofY(b) / width);
    indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(indices); geo.computeVertexNormals(); return add(parent, geo, mat);
}

/** Standard tent is 9×8×5m with a full-height walk-through entrance. */
export function createTent(scene, requestedConfig = DEFAULT_TENT, position = {}) {
  const config = normalizeTentConfig(requestedConfig), dims = tentDimensions(config), { width: w, depth: d, height: h, scale: s } = dims;
  const origin = { x: 0, y: 0, z: 0, rotation: 0, ...position };
  const group = new THREE.Group(); group.position.set(origin.x, origin.y, origin.z); group.rotation.y = origin.rotation; group.userData.interaction = 'tent'; scene.add(group);
  const fabric = material('#ffffff', { map: canvasTexture(config.material, TENT_COLORS[config.color]), color: typeof document === 'undefined' ? TENT_COLORS[config.color] : '#ffffff', side: THREE.DoubleSide, roughness: config.material === 'ripstop' ? .55 : .95 });
  const trim = material('#314c48'), pole = material('#a9b2a6', { metalness: .7, roughness: .3 }), rope = material('#d8c59b');
  const floor = material('#526b5e', { side: THREE.DoubleSide }), bedding = material('#deb978'), dark = material('#2d665d');
  box(group, w, .12, d, floor, 0, .06, 0);
  const shell = new THREE.Group(); group.add(shell);
  const { geometry, windowGeometry, windows, roofY } = archGeometry(w, d, h, config.type);
  add(shell, geometry, fabric);
  const skylight=add(shell,windowGeometry,material('#cdeeed',{transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide,roughness:.18}));skylight.name='Tent skylights';skylight.castShadow=false;
  for(const window of windows){
    const points=[[window.minX,window.minZ],[window.maxX,window.minZ],[window.maxX,window.maxZ],[window.minX,window.maxZ],[window.minX,window.minZ]].map(([x,z])=>[x,roofY(x,z)+.025,z]);
    tubeLine(shell,points,.035*s,trim,24);
  }
  const edgeY = roofY(w / 2);
  box(shell, .05, edgeY, d, fabric, -w / 2, edgeY / 2, 0);
  box(shell, .05, edgeY, d, fabric, w / 2, edgeY / 2, 0);
  const doorW = 2.4 * s, doorH = 2.9 * s;
  endPanel(shell, w, d / 2, x => roofY(x, d / 2), fabric, true, doorW, doorH);
  endPanel(shell, w, -d / 2, x => roofY(x, -d / 2), fabric, false);
  // Continuous bent poles and raised stitched seams follow the fabric silhouette.
  const ribZ = config.type === 'tunnel' ? [-d / 2, -d / 6, d / 6, d / 2] : [-d / 2, d / 2];
  for (const z of ribZ) {
    const points = [[-w / 2, 0, z], [-w / 2, edgeY, z]];
    for (let i = 0; i <= 28; i++) { const x = -w / 2 + w * i / 28; points.push([x, roofY(x, z) + .055, z]); }
    points.push([w / 2, 0, z]); tubeLine(group, points, .055 * s, pole, 60);
  }
  if (config.type === 'dome') for (const direction of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= 28; i++) { const x = -w / 2 + w * i / 28, z = direction * x / w * d; points.push([x, roofY(x, z) + .1, z]); }
    tubeLine(group, points, .05 * s, pole);
  }
  if (config.type === 'ridge') rod(group, [0, h + .06, -d / 2], [0, h + .06, d / 2], .07 * s, pole);
  const seam = material('#f0d6a2');
  for (const x of [-w * .28, w * .28]) {
    const points = Array.from({ length: 17 }, (_, i) => { const z = -d / 2 + d * i / 16; return [x, roofY(x, z) + .025, z]; });
    tubeLine(shell, points, .022 * s, seam, 24);
  }
  // A real opening below the front end-panel, with an independently opening flap.
  const doorPivot = new THREE.Group(); doorPivot.position.set(-doorW / 2, .1, d / 2 + .055); group.add(doorPivot);
  box(doorPivot, doorW, doorH, .045, fabric, doorW / 2, doorH / 2, 0);
  for (const x of [.1 * s, doorW - .1 * s]) box(doorPivot, .035 * s, doorH - .2 * s, .025, trim, x, doorH / 2, .035);
  box(doorPivot, .12 * s, .22 * s, .04, pole, doorW - .16 * s, 1.35 * s, .06);
  box(doorPivot, doorW - .2 * s, .035 * s, .025, trim, doorW / 2, doorH - .1 * s, .035);
  box(doorPivot, doorW - .5 * s, .42 * s, .035, dark, doorW / 2, doorH * .73, .04);
  for (const x of [-doorW / 2, doorW / 2]) rod(group, [x, .1, d / 2 + .1], [x, doorH + .1, d / 2 + .1], .045 * s, trim);
  rod(group, [-doorW / 2, doorH + .1, d / 2 + .1], [doorW / 2, doorH + .1, d / 2 + .1], .045 * s, trim);
  for (const side of [-1, 1]) for (const zz of [-d / 2, d / 2]) {
    const stakeX=side*(w/2+2*s),stakeZ=zz+Math.sign(zz)*1.6*s;
    const stakeY=position.foundation?pathSurfaceHeight(position.x+stakeX,position.z+stakeZ)-position.y:0;
    rod(group, [side*w/2,edgeY*.9,zz], [stakeX,stakeY+.06,stakeZ], .027*s, rope);
    rod(group, [stakeX,stakeY+.02,stakeZ], [stakeX,stakeY+.4,stakeZ], .055*s, pole);
  }
  // Cloth tiebacks, rainfly reinforcement patches and breathable mesh vents.
  for (const side of [-1, 1]) {
    box(shell, w * .19, .65 * s, .035, dark, side * w * .31, h * .43, d / 2 + .035);
    box(shell, w * .21, .08 * s, .06, seam, side * w * .31, h * .43 + .38 * s, d / 2 + .07);
    const tie = add(group, new THREE.TorusGeometry(.17 * s, .025 * s, 6, 12), rope, side * (doorW / 2 + .15 * s), 1.6 * s, d / 2 + .13); tie.rotation.y = side * .3;
  }
  for (const x of [-w * .29, w * .29]) {
    box(group, w * .23, .18, d * .52, dark, x, .22, -d * .12);
    box(group, w * .21, .2, d * .46, bedding, x, .4, -d * .1);
    box(group, w * .15, .28, d * .1, material('#f0e0b5'), x, .6, -d * .3);
    for (let i = 0; i < 7; i++) box(group, w * .2, .018, .035, material('#c9995e'), x, .515, -d * .28 + i * d * .052);
    rod(group, [x + w * .1, .52, -d * .31], [x + w * .1, .52, d * .11], .025, pole);
  }
  box(group, 1.6 * s, .65 * s, 1.2 * s, trim, 0, .45 * s, -d * .28);
  lantern(group, 0, 1.1 * s, -d * .28, pole, material('#ffe6ad', { emissive: '#ffc96e', emissiveIntensity: 1 }));
  const packed = new THREE.Group(); packed.position.set(-w * .36, .3, d * .2); group.add(packed);
  box(packed, .8 * s, 1.1 * s, .5 * s, material('#bd8751'), 0, .55, 0);
  box(packed, .62 * s, .4 * s, .15 * s, material('#d3a36d'), 0, .36, .31 * s);
  for (const x of [-.23 * s, .23 * s]) box(packed, .065 * s, .9 * s, .055, dark, x, .62, .29 * s);
  const roll = add(packed, new THREE.CylinderGeometry(.16 * s, .16 * s, .9 * s, 12), bedding, 0, 1.2 * s, 0); roll.rotation.z = Math.PI / 2;
  box(packed, .24 * s, .16 * s, .06, pole, 0, .56, .4 * s);
  // A folded mat and enamel mug make the first-person interior feel inhabited.
  const mug = add(group, new THREE.CylinderGeometry(.23 * s, .21 * s, .35 * s, 14), material('#e8dfbd'), .42 * s, .98 * s, -d * .28);
  add(mug, new THREE.TorusGeometry(.13 * s, .035 * s, 6, 12), material('#e8dfbd'), .25 * s, 0, 0);
  box(group, .5 * s, .045 * s, .7 * s, material('#d9c699'), -.4 * s, .8 * s, -d * .28);
  const model = {
    group, shell, skylight, config, dimensions: dims, foundation:position.foundation??null, doorPivot, doorOpen: false,
    roofHeightAt(x,z) {const p=localPosition(origin,x,z);return origin.y+roofY(p.x,p.z);},
    entrance: worldPosition(origin, 0, .14, d / 2 + 1),
    doorPosition: worldPosition(origin, 0, .14, d / 2 + .1),
    insidePosition: worldPosition(origin, 0, .14, d / 2 - 2.1),
    floorY: origin.y + .14,
    bounds: { minX: origin.x - w / 2, maxX: origin.x + w / 2, minZ: origin.z - d / 2, maxZ: origin.z + d / 2 },
    interiorTargets: [
      ...[-1,1].map(side=>({id:side<0?'tent-bedding-left':'tent-bedding-right',position:worldPosition(origin,side*w*.29,.4,-d*.12),labelKey:'bedding',
        restPosition:worldPosition(origin,side*w*.29,.14,d*.08),eyePosition:worldPosition(origin,side*w*.29,1.91,d*.08-2.02)})),
      { id: 'tent-lantern', position: worldPosition(origin, 0, .7, -d * .28), labelKey: 'lantern' },
      { id: 'tent-backpack', position: worldPosition(origin, -w * .36, .5, d * .2), labelKey: 'backpack' },
    ],
    setDoor(open) { this.doorOpen = !!open; doorPivot.rotation.y = this.doorOpen ? -Math.PI / 2 : 0; },
    isInside(x, z) { const p = localPosition(origin, x, z); return Math.abs(p.x) < w / 2 - .2 && Math.abs(p.z) < d / 2 - .2; },
    setInterior(inside) { this.interior = !!inside; /* First-person view keeps the fabric ceiling visible. */ },
    colliders() {
      return [
        collider(origin, -w / 2 - .1, -w / 2 + .1, -d / 2, d / 2, true, 'tent-wall'),
        collider(origin, w / 2 - .1, w / 2 + .1, -d / 2, d / 2, true, 'tent-wall'),
        collider(origin, -w / 2, w / 2, -d / 2 - .1, -d / 2 + .1, true, 'tent-wall'),
        collider(origin, -w / 2, -doorW / 2, d / 2 - .1, d / 2 + .1, true, 'tent-wall'),
        collider(origin, doorW / 2, w / 2, d / 2 - .1, d / 2 + .1, true, 'tent-wall'),
        collider(origin, -doorW / 2, doorW / 2, d / 2 - .1, d / 2 + .1, !this.doorOpen, 'tent-door'),
        collider(origin, -doorW / 2 - .1, -doorW / 2 + .1, d / 2, d / 2 + doorW, this.doorOpen, 'tent-door-open'),
        collider(origin, -w * .405, -w * .175, -d * .38, d * .14, true, 'tent-bedding'),
        collider(origin, w * .175, w * .405, -d * .38, d * .14, true, 'tent-bedding'),
        collider(origin, -.8 * s, .8 * s, -d * .28 - .6 * s, -d * .28 + .6 * s, true, 'tent-storage'),
        collider(origin, -w * .36 - .4 * s, -w * .36 + .4 * s, d * .2 - .25 * s, d * .2 + .25 * s, true, 'tent-backpack'),
      ];
    },
    dispose() { disposeGroup(group); },
  };
  return model;
}
