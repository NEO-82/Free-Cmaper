import * as THREE from 'three';
import { WORLD, SHOP, SUMMIT, LAKE, terrainHeight, isWater, riverX, trailPoint } from './terrain.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);
function generator(seed = 82021) { return () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }; }
function texture(kind, random) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = kind === 'bark' ? '#85745a' : kind === 'stone' ? '#a5aba0' : '#c1b591'; c.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1100; i++) {
    const alpha = 0.04 + random() * 0.12; c.fillStyle = random() > 0.5 ? `rgba(255,255,230,${alpha})` : `rgba(25,32,22,${alpha})`;
    const x = random() * 128, y = random() * 128;
    if (kind === 'bark') c.fillRect(x, y, 1 + random() * 3, 8 + random() * 28);
    else { c.beginPath(); c.ellipse(x, y, 0.4 + random() * 2, 0.4 + random() * 1.3, 0, 0, Math.PI * 2); c.fill(); }
  }
  if (kind === 'bark') { c.strokeStyle = '#3b392c55'; c.lineWidth = 1; for (let x = 5; x < 128; x += 13) { c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 5, 40, x - 4, 85, x + 3, 128); c.stroke(); } }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 4;
  return map;
}
function mesh(parent, geometry, material, x, y, z) {
  const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function ribbon(points, width, material, parent) {
  const positions = [], uvs = [], indices = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i], before = points[Math.max(0, i - 1)], after = points[Math.min(points.length - 1, i + 1)];
    const dx = after.x - before.x, dz = after.z - before.z, len = Math.hypot(dx, dz) || 1;
    for (const side of [-1, 1]) {
      const x = p.x - dz / len * width / 2 * side, z = p.z + dx / len * width / 2 * side;
      positions.push(x, p.y ?? terrainHeight(x, z) + 0.13, z); uvs.push(side === -1 ? 0 : 1, i / 3);
    }
    if (i) { const k = i * 2; indices.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(indices); geo.computeVertexNormals();
  const m = mesh(parent, geo, material, 0, 0, 0); m.castShadow = false; return m;
}
export function createWorld(scene) {
  const group = new THREE.Group(); group.name = 'Expanded outdoor world'; scene.add(group);
  const random = generator(), colliders = [], trees = [], rocks = [], interactables = [], falling = [];
  const barkMap = texture('bark', random), stoneMap = texture('stone', random), groundMap = texture('ground', random);
  groundMap.repeat.set(90, 76); barkMap.repeat.set(1, 2);
  const groundMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.98, map: groundMap });
  const terrain = new THREE.PlaneGeometry(700, 570, 180, 150); terrain.rotateX(-Math.PI / 2);
  const vertices = terrain.attributes.position, colors = new Float32Array(vertices.count * 3);
  for (let i = 0; i < vertices.count; i++) vertices.setY(i, terrainHeight(vertices.getX(i), vertices.getZ(i)));
  terrain.setAttribute('color', new THREE.BufferAttribute(colors, 3)); terrain.computeVertexNormals();
  mesh(group, terrain, groundMaterial, 0, 0, 0).castShadow = false;
  const foliageMaterials = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: '#507c47', roughness: 0.95 }));
  const barkMaterials = ['#77624a', '#786647', '#c4c0a6'].map(color => new THREE.MeshStandardMaterial({ color, roughness: 1, map: barkMap }));
  const rockMaterial = new THREE.MeshStandardMaterial({ color: '#939d95', map: stoneMap, roughness: 0.98 });
  const mossMaterial = new THREE.MeshStandardMaterial({ color: '#6d8252', roughness: 1 });
  const woodMaterial = new THREE.MeshStandardMaterial({ color: '#8b7352', map: barkMap, roughness: 0.9 });
  const waterMaterial = new THREE.MeshStandardMaterial({ color: '#477f89', roughness: 0.25, metalness: 0.35, transparent: true, opacity: 0.88 });
  const sea = mesh(group, new THREE.PlaneGeometry(242, 570, 25, 56), waterMaterial, 229, 0, 0); sea.rotation.x = -Math.PI / 2; sea.castShadow = false;
  const lake = mesh(group, new THREE.CircleGeometry(1, 72), waterMaterial, LAKE.x, 0.1, LAKE.z); lake.rotation.x = -Math.PI / 2; lake.scale.set(LAKE.radiusX, LAKE.radiusZ, 1); lake.castShadow = false;
  const river = ribbon(Array.from({ length: 60 }, (_, i) => { const z = 190 + i * 1.65; return { x: riverX(z), y: 0.12, z }; }), 11, waterMaterial, group);
  const foamMaterial = new THREE.MeshBasicMaterial({ color: '#d8e7df', transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false });
  const shoreLines = [];
  for (let n = 0; n < 3; n++) {
    const pts = Array.from({ length: 150 }, (_, i) => ({ x: 111 + n * 4 + Math.sin(i * 0.3) * 0.5, y: 0.11, z: -283 + i * 3.8 }));
    shoreLines.push(ribbon(pts, 0.2 + n * 0.1, foamMaterial, group));
  }
  const trailSamples = Array.from({ length: 340 }, (_, i) => trailPoint(i / 339));
  const trailMap = texture('ground', random); trailMap.repeat.set(1, 1);
  const trailMaterial = new THREE.MeshStandardMaterial({ color: '#b6a07b', map: trailMap, roughness: 1, side: THREE.DoubleSide });
  ribbon(trailSamples, 3.4, trailMaterial, group);
  const shopTrail = Array.from({ length: 75 }, (_, i) => ({ x: -30 + Math.sin(i / 18) * 3, z: -12 + i * 3.6 }));
  ribbon(shopTrail, 3.8, trailMaterial, group);
  function nearTrail(x, z) { return trailSamples.some((p, i) => i % 3 === 0 && Math.hypot(x - p.x, z - p.z) < 4.2); }
  function reserved(x, z) {
    return isWater(x, z) || x > 98 || (x > -49 && x < -11 && z > -54 && z < -18) || Math.hypot(x - SUMMIT.x, z - SUMMIT.z) < 25 || nearTrail(x, z) || Math.hypot(x + 30, z + 12) < 8;
  }
  // Shared instance batches keep hundreds of individually harvestable trees affordable.
  const trunkGeo = new THREE.CylinderGeometry(0.7, 1, 1, 9, 3), branchGeo = new THREE.CylinderGeometry(0.13, 0.25, 1, 6);
  const leafGeo = new THREE.IcosahedronGeometry(1, 2), pineGeo = new THREE.ConeGeometry(1, 1, 11, 2);
  const specifications = [{ x: -23, z: -8, radius: 0.72, h: 10.5, species: 1 }];
  let attempts = 0;
  while (specifications.length < 520 && attempts++ < 15000) {
    const x = -335 + random() * 433, z = -271 + random() * 540;
    if (reserved(x, z) || specifications.some(t => Math.hypot(t.x - x, t.z - z) < 4.8)) continue;
    const h = 6.5 + random() * 7.5;
    specifications.push({ x, z, radius: 0.42 + h * 0.028, h, species: random() < 0.45 || terrainHeight(x, z) > 45 ? 0 : random() < 0.5 ? 1 : 2 });
  }
  const batches = Array.from({ length: 3 }, (_, species) => {
    const trunk = new THREE.InstancedMesh(trunkGeo, barkMaterials[species], 520);
    const branches = new THREE.InstancedMesh(branchGeo, barkMaterials[species], 520 * 3);
    const leaves = Array.from({ length: 4 }, () => new THREE.InstancedMesh(species === 0 ? pineGeo : leafGeo, foliageMaterials[species], 520));
    [trunk, branches, ...leaves].forEach(m => { m.count = 0; m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(m); });
    return { trunk, branches, leaves, count: 0 };
  });
  const dummy = new THREE.Object3D(), hide = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const spec of specifications) {
    const { x, z, radius, h, species } = spec, y = terrainHeight(x, z), batch = batches[species], index = batch.count++;
    const object = new THREE.Group(); object.position.set(x, y, z); object.userData.interaction = 'tree'; group.add(object);
    const tree = { ...spec, id: `tree-${trees.length}`, y, hits: 0, felled: false, object, stump: null, index, batch };
    const collider = { kind: 'circle', x, z, radius, active: true, id: tree.id }; tree.collider = collider; colliders.push(collider); trees.push(tree);
    dummy.position.set(x, y + h * 0.39, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(radius, h * 0.78, radius); dummy.updateMatrix(); batch.trunk.setMatrixAt(index, dummy.matrix);
    for (let j = 0; j < 3; j++) {
      const a = j / 3 * Math.PI * 2 + index;
      dummy.position.set(x + Math.cos(a) * h * 0.12, y + h * (0.54 + j * 0.08), z + Math.sin(a) * h * 0.12);
      dummy.rotation.set(Math.cos(a) * 0.8, a, Math.sin(a) * 0.8); dummy.scale.set(radius * 1.1, h * 0.3, radius * 1.1); dummy.updateMatrix(); batch.branches.setMatrixAt(index * 3 + j, dummy.matrix);
    }
    batch.leaves.forEach((m, j) => {
      if (species === 0) { dummy.position.set(x, y + h * (0.53 + j * 0.16), z); dummy.rotation.set(0, index * 0.4 + j, 0); dummy.scale.set(h * (0.29 - j * 0.041), h * 0.43, h * (0.29 - j * 0.041)); }
      else { const a = j / 4 * Math.PI * 2 + index; dummy.position.set(x + Math.cos(a) * h * 0.13, y + h * (0.74 + j % 2 * 0.1), z + Math.sin(a) * h * 0.13); dummy.rotation.set(index, j, index * 0.1); dummy.scale.set(h * 0.24, h * (species === 2 ? 0.3 : 0.24), h * 0.24); }
      dummy.updateMatrix(); m.setMatrixAt(index, dummy.matrix);
    });
  }
  batches.forEach(b => { b.trunk.count = b.count; b.branches.count = b.count * 3; b.leaves.forEach(m => { m.count = b.count; }); [b.trunk, b.branches, ...b.leaves].forEach(m => { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }); });
  function chopTree(tree) {
    if (!tree || tree.felled) return { felled: false, wood: 0, hits: tree?.hits ?? 0 };
    tree.hits++;
    if (tree.hits < 3) return { felled: false, wood: 0, hits: tree.hits };
    tree.felled = true; tree.collider.active = false;
    tree.batch.trunk.setMatrixAt(tree.index, hide); tree.batch.trunk.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 3; i++) tree.batch.branches.setMatrixAt(tree.index * 3 + i, hide);
    tree.batch.branches.instanceMatrix.needsUpdate = true;
    tree.batch.leaves.forEach(m => { m.setMatrixAt(tree.index, hide); m.instanceMatrix.needsUpdate = true; });
    tree.stump = mesh(group, new THREE.CylinderGeometry(tree.radius * 0.85, tree.radius, 0.5, 12), woodMaterial, tree.x, tree.y + 0.25, tree.z);
    const rings = mesh(tree.stump, new THREE.RingGeometry(tree.radius * 0.35, tree.radius * 0.4, 20), new THREE.MeshBasicMaterial({ color: '#5d4b33', side: THREE.DoubleSide }), 0, 0.255, 0); rings.rotation.x = -Math.PI / 2;
    const fallingTree = new THREE.Group(); fallingTree.position.set(tree.x, tree.y + 0.3, tree.z); group.add(fallingTree);
    mesh(fallingTree, trunkGeo, barkMaterials[tree.species], 0, tree.h * 0.39, 0).scale.set(tree.radius, tree.h * 0.78, tree.radius);
    mesh(fallingTree, tree.species === 0 ? pineGeo : leafGeo, foliageMaterials[tree.species], 0, tree.h * 0.76, 0).scale.set(tree.h * 0.25, tree.h * 0.6, tree.h * 0.25);
    falling.push({ object: fallingTree, time: 0, direction: tree.index % 2 ? 1 : -1 });
    return { felled: true, wood: 3, hits: tree.hits };
  }
  const rockPositions = [{ x: -39, z: -10, r: 1.2 }];
  while (rockPositions.length < 44) { const x = -330 + random() * 425, z = -265 + random() * 525; if (!reserved(x, z) && !trees.some(t => Math.hypot(x - t.x, z - t.z) < 3)) rockPositions.push({ x, z, r: 1 + random() * 2.3 }); }
  const rockGeo = new THREE.DodecahedronGeometry(1, 1);
  for (const p of rockPositions) {
    const y = terrainHeight(p.x, p.z), r = p.r;
    const stone = mesh(group, rockGeo, rockMaterial, p.x, y + r * 0.34, p.z); stone.scale.set(r, r * 0.65, r * 0.85); stone.rotation.y = random() * Math.PI;
    const cap = mesh(stone, new THREE.SphereGeometry(0.7, 9, 5), mossMaterial, -0.1, 0.65, 0); cap.scale.set(1, 0.12, 0.8);
    const rock = { id: `rock-${rocks.length}`, x: p.x, z: p.z, y, radius: r * 0.88, object: stone, mined: false };
    rock.collider = { id: rock.id, kind: 'circle', x: p.x, z: p.z, radius: rock.radius, active: true }; rocks.push(rock); colliders.push(rock.collider);
  }
  // Instanced grass and fallen twigs give the forest floor scale without thousands of draw calls.
  const grassGeo = new THREE.PlaneGeometry(0.3, 0.8); grassGeo.translate(0, 0.4, 0);
  const grassMaterial = new THREE.MeshStandardMaterial({ color: '#8a9b5e', roughness: 1, side: THREE.DoubleSide });
  const grass = new THREE.InstancedMesh(grassGeo, grassMaterial, 2400); let grassCount = 0;
  for (let i = 0; i < 3400 && grassCount < 2400; i++) {
    const x = -335 + random() * 435, z = -273 + random() * 545;
    if (reserved(x, z) || terrainHeight(x, z) > 73) continue;
    dummy.position.set(x, terrainHeight(x, z) + 0.04, z); dummy.rotation.set(0, random() * Math.PI, 0); const s = 0.6 + random() * 1.3; dummy.scale.set(s, s, s); dummy.updateMatrix(); grass.setMatrixAt(grassCount++, dummy.matrix);
  }
  grass.count = grassCount; grass.instanceMatrix.needsUpdate = true; grass.computeBoundingSphere(); group.add(grass);
  const flowerMaterial = new THREE.MeshStandardMaterial({ color: '#e2bbab', roughness: 0.9 });
  for (let i = 0; i < 14; i++) {
    const t = trailPoint(0.05 + i / 18), x = t.x + (i % 2 ? 5 : -5), z = t.z, y = terrainHeight(x, z);
    const plant = new THREE.Group(); plant.position.set(x, y, z); group.add(plant);
    const stem = mesh(plant, new THREE.CylinderGeometry(0.035, 0.045, 0.7, 5), grassMaterial, 0, 0.35, 0);
    mesh(plant, new THREE.IcosahedronGeometry(0.22, 1), flowerMaterial, 0, 0.78, 0);
    interactables.push({ id: `herb-${i}`, type: 'plant', x, z, y, radius: 0.25, object: plant, collected: false });
  }
  const signMaterial = new THREE.MeshStandardMaterial({ color: '#bd9e71', roughness: 1 });
  function sign(x, z, text, id) {
    const y = terrainHeight(x, z), object = new THREE.Group(); object.position.set(x, y, z); group.add(object);
    mesh(object, new THREE.CylinderGeometry(0.11, 0.15, 2.7, 7), woodMaterial, 0, 1.35, 0);
    mesh(object, new THREE.BoxGeometry(2.5, 0.9, 0.15), signMaterial, 0, 2.4, 0);
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 160; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#c3a574'; ctx.fillRect(0, 0, 512, 160); ctx.fillStyle = '#344939'; ctx.font = 'bold 38px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 256, 95);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    mesh(object, new THREE.PlaneGeometry(2.35, 0.76), new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }), 0, 2.4, 0.08);
    colliders.push({ id, kind: 'circle', x, z, radius: 0.18, active: true });
    interactables.push({ id, type: 'sign', x, z, y, radius: 0.3, object, text });
  }
  sign(-36, -57, 'SUMMIT TRAIL ↑', 'trail-sign');
  sign(SUMMIT.x - 13, SUMMIT.z + 13, 'SUMMIT · 88 m', 'summit-sign');
  const summitStones = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 7, 5), rockMaterial, 34);
  for (let i = 0; i < 34; i++) { const angle = i / 34 * Math.PI * 2; dummy.position.set(SUMMIT.x + Math.cos(angle) * 18, SUMMIT.height + 0.12, SUMMIT.z + Math.sin(angle) * 18); dummy.rotation.set(0, i, 0); dummy.scale.set(1.4, 0.8, 1); dummy.updateMatrix(); summitStones.setMatrixAt(i, dummy.matrix); }
  summitStones.instanceMatrix.needsUpdate = true; group.add(summitStones);
  interactables.push({ id: 'summit-meadow', type: 'landmark', x: SUMMIT.x, z: SUMMIT.z, y: SUMMIT.height, radius: SUMMIT.radius, text: 'summit' });
  interactables.push({ id: 'lake-shore', type: 'water', x: LAKE.x, z: LAKE.z - LAKE.radiusZ - 1, y: 0, radius: 2, text: 'lake' });
  const baseColor = new THREE.Color();
  function updateSeason(index) {
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i), noise = (Math.sin(x * 0.15) * Math.sin(z * 0.11) + 1) * 0.025;
      const coast = x > 85;
      const color = coast ? '#ccbc93' : index === 3 ? y > 10 ? '#dbe4df' : '#bbcbbd' : y > 68 ? '#8e9984' : ['#78945f', '#688459', '#a28b57', '#dbe4df'][index];
      baseColor.set(color).offsetHSL(0, 0, noise - 0.015); colors[i * 3] = baseColor.r; colors[i * 3 + 1] = baseColor.g; colors[i * 3 + 2] = baseColor.b;
    }
    terrain.attributes.color.needsUpdate = true;
    foliageMaterials.forEach((m, species) => m.color.set(index === 3 ? species === 0 ? '#79988a' : '#a6b8a2' : index === 2 ? ['#6f824d', '#b8793c', '#c79d48'][species] : index === 0 ? ['#50744a', '#7a9a65', '#9aaa68'][species] : ['#375f47', '#598052', '#698855'][species]));
    grassMaterial.color.set(['#91a76b', '#729154', '#ad9a67', '#bccdc1'][index]);
    flowerMaterial.color.set(['#e2bbab', '#ddcf9a', '#bb9662', '#e9e7d3'][index]);
  }
  updateSeason(0);
  function animate(dt, time) {
    sea.position.y = Math.sin(time * 0.4) * 0.05;
    shoreLines.forEach((line, i) => { line.position.x = Math.sin(time * 0.5 + i * 0.9) * 0.65; });
    for (let i = falling.length - 1; i >= 0; i--) {
      const f = falling[i]; f.time += dt; f.object.rotation.z = Math.min(Math.PI * 0.48, f.time * f.time * 0.8) * f.direction;
      if (f.time > 3.2) { group.remove(f.object); falling.splice(i, 1); }
    }
  }
  return { group, terrain, sea, lake, river, trees, rocks, colliders, interactables, updateSeason, animate, chopTree, heightAt: terrainHeight };
}
