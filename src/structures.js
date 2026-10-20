import * as THREE from 'three';

export const DEFAULT_TENT = Object.freeze({ size: 'standard', type: 'dome', color: 'sand', material: 'canvas' });
export const TENT_OPTIONS = Object.freeze({
  size: ['standard', 'large', 'family'],
  type: ['dome', 'ridge', 'tunnel'],
  color: ['sand', 'forest', 'rust', 'navy'],
  material: ['canvas', 'ripstop'],
});
export const TENT_COLORS = Object.freeze({ sand: '#cca368', forest: '#536d4c', rust: '#b56a48', navy: '#4a617b' });
const SIZE_SCALE = { standard: 1, large: 1.25, family: 1.5 };

export function normalizeTentConfig(config = {}) {
  return Object.fromEntries(Object.keys(DEFAULT_TENT).map(key => [key, TENT_OPTIONS[key].includes(config[key]) ? config[key] : DEFAULT_TENT[key]]));
}
export function tentDimensions(config = DEFAULT_TENT) {
  const scale = SIZE_SCALE[normalizeTentConfig(config).size];
  return { width: 18 * scale, depth: 16 * scale, height: 7 * scale, scale };
}

function canvasTexture(kind, color = '#ffffff') {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 128);
  if (kind === 'wood') {
    for (let x = 0; x < 128; x += 16) {
      ctx.fillStyle = x % 32 ? '#ffffff08' : '#0000000c'; ctx.fillRect(x + 1, 0, 14, 128);
      ctx.strokeStyle = '#35281d88'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke();
      for (let i = 0; i < 5; i++) { const y = i * 25 + (x % 18); ctx.strokeStyle = '#30221c35'; ctx.beginPath(); ctx.ellipse(x + 7, y, 2, 6, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
  } else {
    for (let i = 0; i < 128; i += 3) {
      ctx.fillStyle = '#ffffff0c'; ctx.fillRect(0, i, 128, 1);
      ctx.fillStyle = '#0000000a'; ctx.fillRect(i, 0, 1, 128);
    }
    if (kind === 'ripstop') for (let i = 0; i < 128; i += 16) { ctx.fillStyle = '#ffffff38'; ctx.fillRect(i, 0, 1, 128); ctx.fillRect(0, i, 128, 1); }
    else for (let i = 0; i < 128; i += 8) { ctx.fillStyle = '#ffffff13'; ctx.fillRect(i, 0, 1, 128); }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(kind === 'wood' ? 2 : 3, kind === 'wood' ? 1 : 3);
  return texture;
}
function material(color, options = {}) { return new THREE.MeshStandardMaterial({ color, roughness: .83, ...options }); }
function add(parent, geometry, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function box(parent, width, height, depth, mat, x, y, z) { return add(parent, new THREE.BoxGeometry(width, height, depth), mat, x, y, z); }
function rod(parent, from, to, radius, mat) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), vector = b.clone().sub(a);
  const m = add(parent, new THREE.CylinderGeometry(radius, radius, vector.length(), 7), mat);
  m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vector.normalize()); return m;
}
function worldPosition(origin, x, y, z) { return new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), origin.rotation || 0).add(new THREE.Vector3(origin.x, origin.y, origin.z)); }
function localPosition(origin, x, z) { return new THREE.Vector3(x - origin.x, 0, z - origin.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), -(origin.rotation || 0)); }
function collider(origin, minX, maxX, minZ, maxZ, active = true, id = '') {
  const points = [[minX, minZ], [minX, maxZ], [maxX, minZ], [maxX, maxZ]].map(([x, z]) => worldPosition(origin, x, 0, z));
  return { kind: 'box', minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)), minZ: Math.min(...points.map(p => p.z)), maxZ: Math.max(...points.map(p => p.z)), active, id };
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
  const woodTexture = canvasTexture('wood', '#9a7952');
  const wood = material('#ffffff', { map: woodTexture });
  const darkWood = material('#544738'), beam = material('#65523b'), roofMat = material('#47564e', { metalness: .12 });
  const metal = material('#414c46', { metalness: .65, roughness: .35 });
  const glass = material('#96c3bf', { transparent: true, opacity: .45, metalness: .25, roughness: .15, side: THREE.DoubleSide });
  const glow = material('#ffe0a2', { emissive: '#ffc778', emissiveIntensity: .8 });
  box(group, 20.5, .3, 17.5, wood, 0, .15, 0);
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
  for (const x of [-10, 10]) for (const z of [-8.5, 8.5]) box(group, .5, 7, .5, beam, x, 3.5, z);
  for (const x of [-1.7, 1.7]) box(group, .24, 4, .5, beam, x, 2, 8.5);
  box(group, 3.65, .22, .5, beam, 0, 3.9, 8.5);
  const roof = new THREE.Group(); group.add(roof);
  for (const side of [-1, 1]) {
    const panel = box(roof, 11.9, .28, 19, roofMat, side * 5.3, 8, 0); panel.rotation.z = -side * .29;
    for (let z = -9; z <= 9; z += .75) { const seam = box(roof, 11.9, .08, .04, metal, side * 5.3, 8.17, z); seam.rotation.z = -side * .29; }
  }
  box(roof, .22, .3, 19.4, metal, 0, 9.7, 0);
  for (const z of [-8.5, 8.5]) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-10, 6.7, z, 10, 6.7, z, 0, 9.55, z], 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, .5, 1], 2)); geometry.computeVertexNormals();
    add(roof, geometry, material('#c0a376', { side: THREE.DoubleSide }));
  }
  label(group, 'TRAIL OUTFITTER', 0, 5.45, 8.75, 10, 1.15);
  box(group, 22, .17, 3.4, darkWood, 0, .08, 10.2);
  for (const x of [-9, 9]) box(group, .3, 6.5, .3, beam, x, 3.25, 11.4);
  box(group, 22, .25, 3.7, roofMat, 0, 6.5, 10.2).rotation.x = .1;
  const doorPivot = new THREE.Group(); doorPivot.position.set(-1.6, .3, 8.5); group.add(doorPivot);
  box(doorPivot, 3.2, 3.6, .15, darkWood, 1.6, 1.8, 0);
  box(doorPivot, 2.6, 1.65, .06, glass, 1.6, 2.4, .09);
  box(doorPivot, .12, .32, .18, metal, 2.85, 1.5, .2);
  lantern(group, -2.7, 3.3, 9, metal, glow); lantern(group, 2.7, 3.3, 9, metal, glow);
  // Shelves, pots, rolled mats, tent display and climbing tools.
  const productMats = ['#b9945d', '#586f50', '#ab6550', '#526a84', '#d3ba82'].map(c => material(c));
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
  lantern(group, -.5, 2.45, -3.8, metal, glow);
  const owner = new THREE.Group(); owner.position.set(3, .3, -5.7); group.add(owner);
  const skin = material('#c99774'), shirt = material('#c7b27c'), trousers = material('#4d6259');
  add(owner, new THREE.CylinderGeometry(.38, .32, 1.05, 10), shirt, 0, 1.45, 0);
  add(owner, new THREE.SphereGeometry(.34, 14, 10), skin, 0, 2.25, 0);
  add(owner, new THREE.SphereGeometry(.35, 12, 10), material('#a6a392'), 0, 2.4, -.03).scale.y = .65;
  for (const x of [-.19, .19]) box(owner, .26, .8, .28, trousers, x, .5, 0);
  for (const x of [-.5, .5]) add(owner, new THREE.CapsuleGeometry(.12, .6, 3, 6), shirt, x, 1.4, 0);
  box(owner, .5, .7, .1, trousers, 0, 1.3, .36);
  for (const x of [-.12, .12]) add(owner, new THREE.SphereGeometry(.035, 7, 6), material('#3b332e'), x, 2.3, .31);
  label(group, 'WELCOME / 숲길 상점', 3, 4.25, -8.1, 8, 1);
  for (let i = 0; i < 5; i++) {
    rod(group, [-5 + i, 1.4, -8.1], [-5 + i, 4.4, -8.1], .055, beam);
    const head = box(group, .5, .24, .17, metal, -5 + i, 4.15, -8.1); head.rotation.z = i % 2 ? .2 : -.1;
  }
  const model = {
    group, doorPivot, doorOpen: false, roof, owner,
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
    setInterior(inside) { roof.visible = !inside; },
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
    update(dt) { owner.rotation.y = Math.sin(performanceNow() * .0005) * .06; },
    dispose() { disposeGroup(group); },
  };
  return model;
}
function performanceNow() { return typeof performance !== 'undefined' ? performance.now() : 0; }

function archGeometry(width, depth, height, type) {
  const position = [], uv = [], indices = [], segments = type === 'ridge' ? 2 : 24, depthSegments = type === 'dome' ? 12 : 1;
  function roofY(x, z = 0) {
    const u = Math.abs(x / (width / 2));
    if (type === 'ridge') return height * (.43 + .57 * (1 - u));
    const dome = type === 'dome' ? Math.sqrt(Math.max(0, 1 - (z / (depth / 2) * .55) ** 2)) : 1;
    return height * (.34 + .66 * Math.sqrt(Math.max(0, 1 - u * u)) * dome);
  }
  for (let i = 0; i <= segments; i++) for (let j = 0; j <= depthSegments; j++) {
    const x = -width / 2 + width * i / segments, z = -depth / 2 + depth * j / depthSegments;
    position.push(x, roofY(x, z), z); uv.push(i / segments * 3, j / depthSegments * 3);
    if (i < segments && j < depthSegments) {
      const k = i * (depthSegments + 1) + j, stride = depthSegments + 1;
      indices.push(k, k + 1, k + stride, k + 1, k + stride + 1, k + stride);
    }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return { geometry, roofY };
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

/** Standard tent is 18×16×7m, three times the previous six-metre width. */
export function createTent(scene, requestedConfig = DEFAULT_TENT, position = {}) {
  const config = normalizeTentConfig(requestedConfig), dims = tentDimensions(config), { width: w, depth: d, height: h, scale: s } = dims;
  const origin = { x: 0, y: 0, z: 0, rotation: 0, ...position };
  const group = new THREE.Group(); group.position.set(origin.x, origin.y, origin.z); group.rotation.y = origin.rotation; group.userData.interaction = 'tent'; scene.add(group);
  const fabric = material('#ffffff', { map: canvasTexture(config.material, TENT_COLORS[config.color]), color: typeof document === 'undefined' ? TENT_COLORS[config.color] : '#ffffff', side: THREE.DoubleSide, roughness: config.material === 'ripstop' ? .55 : .95 });
  const trim = material('#3b493e'), pole = material('#a9b2a6', { metalness: .7, roughness: .3 }), rope = material('#d8c59b');
  const floor = material('#5b5f49', { side: THREE.DoubleSide }), bedding = material('#c1b89b'), dark = material('#36483e');
  box(group, w, .12, d, floor, 0, .06, 0);
  const shell = new THREE.Group(); group.add(shell);
  const { geometry, roofY } = archGeometry(w, d, h, config.type);
  add(shell, geometry, fabric);
  const edgeY = roofY(w / 2);
  box(shell, .05, edgeY, d, fabric, -w / 2, edgeY / 2, 0);
  box(shell, .05, edgeY, d, fabric, w / 2, edgeY / 2, 0);
  const doorW = 3.4 * s, doorH = 3.6 * s;
  endPanel(shell, w, d / 2, x => roofY(x, d / 2), fabric, true, doorW, doorH);
  endPanel(shell, w, -d / 2, x => roofY(x, -d / 2), fabric, false);
  // Arched aluminium poles follow the fabric profile. Dome poles cross overhead.
  const ribZ = config.type === 'tunnel' ? [-d / 2, -d / 6, d / 6, d / 2] : [-d / 2, d / 2];
  for (const z of ribZ) {
    rod(group, [-w / 2, 0, z], [-w / 2, edgeY, z], .055 * s, pole);
    for (let i = 0; i < 20; i++) { const a = -w / 2 + w * i / 20, b = -w / 2 + w * (i + 1) / 20; rod(group, [a, roofY(a, z) + .05, z], [b, roofY(b, z) + .05, z], .055 * s, pole); }
    rod(group, [w / 2, edgeY, z], [w / 2, 0, z], .055 * s, pole);
  }
  if (config.type === 'dome') {
    for (const direction of [-1, 1]) for (let i = 0; i < 20; i++) {
      const a = -w / 2 + w * i / 20, b = -w / 2 + w * (i + 1) / 20;
      rod(group, [a, roofY(a, direction * a / w * d) + .1, direction * a / w * d], [b, roofY(b, direction * b / w * d) + .1, direction * b / w * d], .05 * s, pole);
    }
  } else if (config.type === 'ridge') rod(group, [0, h + .06, -d / 2], [0, h + .06, d / 2], .07 * s, pole);
  // A real opening below the front end-panel, with an independently opening flap.
  const doorPivot = new THREE.Group(); doorPivot.position.set(-doorW / 2, .1, d / 2 + .055); group.add(doorPivot);
  box(doorPivot, doorW, doorH, .045, fabric, doorW / 2, doorH / 2, 0);
  for (const x of [-doorW / 2, doorW / 2]) rod(group, [x, .1, d / 2 + .1], [x, doorH + .1, d / 2 + .1], .045 * s, trim);
  rod(group, [-doorW / 2, doorH + .1, d / 2 + .1], [doorW / 2, doorH + .1, d / 2 + .1], .045 * s, trim);
  for (const side of [-1, 1]) for (const zz of [-d / 2, d / 2]) {
    rod(group, [side * w / 2, edgeY * .9, zz], [side * (w / 2 + 2 * s), .06, zz + Math.sign(zz) * 1.6 * s], .027 * s, rope);
    rod(group, [side * (w / 2 + 2 * s), .02, zz + Math.sign(zz) * 1.6 * s], [side * (w / 2 + 2 * s), .4, zz + Math.sign(zz) * 1.6 * s], .055 * s, pole);
  }
  for (const x of [-w * .29, w * .29]) {
    box(group, w * .23, .18, d * .52, dark, x, .22, -d * .12);
    box(group, w * .21, .2, d * .46, bedding, x, .4, -d * .1);
    box(group, w * .15, .2, d * .1, material('#ece2bc'), x, .58, -d * .3);
  }
  box(group, 1.6 * s, .65 * s, 1.2 * s, trim, 0, .45 * s, -d * .28);
  lantern(group, 0, 1.1 * s, -d * .28, pole, material('#ffe6ad', { emissive: '#ffc96e', emissiveIntensity: 1 }));
  box(group, .8 * s, 1.1 * s, .5 * s, material('#926b45'), -w * .36, .7, d * .2);
  const model = {
    group, shell, config, dimensions: dims, doorPivot, doorOpen: false,
    entrance: worldPosition(origin, 0, .14, d / 2 + 1),
    doorPosition: worldPosition(origin, 0, .14, d / 2 + .1),
    insidePosition: worldPosition(origin, 0, .14, d / 2 - 2.1),
    floorY: origin.y + .14,
    bounds: { minX: origin.x - w / 2, maxX: origin.x + w / 2, minZ: origin.z - d / 2, maxZ: origin.z + d / 2 },
    interiorTargets: [
      { id: 'tent-bedding', position: worldPosition(origin, -w * .29, .3, -d * .12), labelKey: 'bedding' },
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
