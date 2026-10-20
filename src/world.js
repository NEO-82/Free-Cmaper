import * as THREE from 'three';
import { createGroundCover } from './groundcover.js';
import * as geography from './terrain.js';
const { WORLD, SHOP, SUMMIT, LAKE, terrainHeight, isWater, riverX, trailPoint, trailSurfaceAt, terrainSlope } = geography;

function generator(seed = 82021) { return () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }; }
function paintedTexture(kind, random) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d');
  c.fillStyle = kind === 'bark' ? '#dfb773' : kind === 'stone' ? '#efcfaa' : kind === 'trail' ? '#e7c595' : '#e3f1cc'; c.fillRect(0, 0, 256, 256);
  if (kind === 'bark') {
    for (let x = -12; x < 280; x += 25) {
      c.strokeStyle = '#9b602236'; c.lineWidth = 3 + random() * 4; c.beginPath(); c.moveTo(x, -5); c.bezierCurveTo(x - 15, 80, x + 20, 170, x + 4, 270); c.stroke();
      c.strokeStyle = '#fff0ba55'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 8, 0); c.bezierCurveTo(x - 1, 80, x + 24, 150, x + 15, 256); c.stroke();
    }
    for (let i = 0; i < 6; i++) { c.strokeStyle = '#98663140'; c.lineWidth = 2; c.beginPath(); c.ellipse(random() * 256, random() * 256, 4, 12 + random() * 10, -.1, 0, Math.PI * 2); c.stroke(); }
  } else if (kind === 'stone') {
    c.strokeStyle = '#a47b6550'; c.lineWidth = 2;
    for (let i = 0; i < 7; i++) { const y = 15 + i * 38; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(70, y + 6, 175, y - 7, 256, y + 1); c.stroke(); }
  } else {
    for (let i = 0; i < 145; i++) {
      c.fillStyle = random() > .5 ? '#ffffff12' : '#76944310';
      c.beginPath(); c.ellipse(random() * 256, random() * 256, 1 + random() * 7, .5 + random() * 2, random() * 3, 0, Math.PI * 2); c.fill();
    }
  }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 4;
  return map;
}
function mesh(parent, geometry, material, x, y, z) {
  const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function ribbon(points, width, material, parent) {
  const positions = [], uvs = [], indices = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i], a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1;
    for (const side of [-1, 1]) {
      const x = p.x - dz / len * width / 2 * side, z = p.z + dx / len * width / 2 * side;
      positions.push(x, p.y ?? terrainHeight(x, z) + .17, z); uvs.push(side === -1 ? 0 : 1, i / 4);
    }
    if (i) { const k = i * 2; indices.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(indices); geo.computeVertexNormals();
  const m = mesh(parent, geo, material, 0, 0, 0); m.castShadow = false; return m;
}
function coloredGeometry(geometry, lower, upper) {
  const p = geometry.attributes.position, colors = [], a = new THREE.Color(lower), b = new THREE.Color(upper), c = new THREE.Color();
  geometry.computeBoundingBox(); const min = geometry.boundingBox.min.y, height = geometry.boundingBox.max.y - min || 1;
  for (let i = 0; i < p.count; i++) { c.copy(a).lerp(b, THREE.MathUtils.clamp((p.getY(i) - min) / height, 0, 1)); colors.push(c.r, c.g, c.b); }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); return geometry;
}
function canopyGeometry(pine = false) {
  if (!pine) {
    const geo = new THREE.SphereGeometry(1, 12, 8), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = 1 + Math.sin(x * 9 + y * 4) * Math.cos(z * 7) * .065; p.setXYZ(i, x * f, y * f, z * f); }
    geo.computeVertexNormals(); return coloredGeometry(geo, '#79a675', '#d1e2b7');
  }
  // A scalloped, softly curved pine bough with visible overlapping skirts.
  const geo = new THREE.ConeGeometry(1, 1, 10, 3), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), f = y < -.15 ? 1.12 : y > .15 ? .92 : 1.02; p.setXYZ(i, p.getX(i) * f, y + (y < -.45 ? Math.sin(Math.atan2(p.getZ(i), p.getX(i)) * 5) * .045 : 0), p.getZ(i) * f); }
  geo.computeVertexNormals(); return coloredGeometry(geo, '#76a63b', '#d7ed70');
}
function tuftGeometry(fern = false) {
  const positions = [], colors = [], indices = [], bottom = new THREE.Color(fern ? '#158333' : '#218c30'), top = new THREE.Color(fern ? '#a5e456' : '#a9ec4e');
  function blade(angle, length, width, offset = 0) {
    const c = Math.cos(angle), s = Math.sin(angle), index = positions.length / 3;
    const points = [[-width, offset, 0], [width, offset, 0], [-width * .65, length * .48 + offset, length * .2], [width * .65, length * .48 + offset, length * .2], [0, length + offset, length * .48]];
    for (let i = 0; i < points.length; i++) { const [x, y, z] = points[i]; positions.push(x * c - z * s, y, x * s + z * c); const t = i < 2 ? 0 : i === 4 ? 1 : .5; const color = bottom.clone().lerp(top, t); colors.push(color.r, color.g, color.b); }
    indices.push(index, index + 1, index + 2, index + 1, index + 3, index + 2, index + 2, index + 3, index + 4);
  }
  if (fern) { for (let i = 0; i < 7; i++) blade(i / 7 * Math.PI * 2, .8 + i % 3 * .23, .09, 0); }
  else { for (let i = 0; i < 4; i++) blade(i / 4 * Math.PI * 2 + .4, .55 + i % 2 * .24, .075); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.setIndex(indices); geo.computeVertexNormals(); return geo;
}
function boulderGeometry() {
  // Broad sculpted planes, a flattened footing and broken strata, rather than a sphere.
  const geo = new THREE.IcosahedronGeometry(1, 1), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const angle = Math.atan2(z, x), ripple = 1 + Math.sin(angle * 5 + y * 3) * .09;
    x *= ripple; z *= ripple; y = Math.max(-.55, y) * .9;
    if (y > .35) { x *= .88; z *= .88; }
    p.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals(); return coloredGeometry(geo, '#ad6e49', '#ffe0ac');
}
export function createWorld(scene) {
  const group = new THREE.Group(); group.name = 'Painted adventure landscape'; scene.add(group);
  const random = generator(), colliders = [], trees = [], rocks = [], interactables = [], falling = [];
  const width = WORLD.maxX - WORLD.minX, depth = WORLD.maxZ - WORLD.minZ, landWidth = WORLD.landMaxX - WORLD.minX;
  const riverStart = geography.RIVER_START ?? LAKE.z + LAKE.radiusZ - 2;
  const coastStart = geography.COAST_START ?? WORLD.landMaxX - 35;
  const barkMap = paintedTexture('bark', random), stoneMap = paintedTexture('stone', random), groundMap = paintedTexture('ground', random);
  groundMap.repeat.set(width / 12, depth / 12); barkMap.repeat.set(1, 2);
  const groundMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, map: groundMap });
  // Concentrate samples on the detailed central mountain; distant land uses a coarse grid.
  function axis(min,max,fineMin,fineMax){ const values=[min];let x=min;while(x<max){x=Math.min(max,x+(x>=fineMin&&x<fineMax?2.5:12));values.push(x);}return values; }
  const xs=axis(WORLD.minX,WORLD.maxX,-480,110), zs=axis(WORLD.minZ,WORLD.maxZ,-480,50);
  const terrain = new THREE.PlaneGeometry(width,depth,xs.length-1,zs.length-1);terrain.rotateX(-Math.PI/2);
  const vertices=terrain.attributes.position,uvs=terrain.attributes.uv,colors=new Float32Array(vertices.count*3);
  for(let i=0;i<vertices.count;i++){
    const x=xs[i%xs.length],z=zs[Math.floor(i/xs.length)];vertices.setXYZ(i,x,terrainHeight(x,z),z);uvs.setXY(i,(x-WORLD.minX)/width,(WORLD.maxZ-z)/depth);
  }
  terrain.setAttribute('color', new THREE.BufferAttribute(colors, 3)); terrain.computeVertexNormals();
  mesh(group, terrain, groundMaterial, 0, 0, 0).castShadow = false;
  const foliageMaterials = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: '#71c746', vertexColors: true, roughness: .88 }));
  const barkMaterials = ['#d5a14f', '#c79749', '#e8d7a1'].map(color => new THREE.MeshStandardMaterial({ color, roughness: .94, map: barkMap }));
  const rockMaterial = new THREE.MeshStandardMaterial({ color: '#e8ba86', vertexColors: true, map: stoneMap, roughness: .92, flatShading: false });
  const mossMaterial = new THREE.MeshStandardMaterial({ color: '#76ba39', vertexColors: true, roughness: .95 });
  const woodMaterial = new THREE.MeshStandardMaterial({ color: '#b88643', map: barkMap, roughness: .9 });
  const waterTime = { value: 0 };
  const waterMaterial = new THREE.MeshStandardMaterial({ color: '#24b7b5', roughness: .3, metalness: .12, transparent: true, opacity: .56, side: THREE.DoubleSide, depthWrite: false });
  waterMaterial.onBeforeCompile = shader => {
    shader.uniforms.uLandscapeTime = waterTime;
    shader.vertexShader = `varying vec3 vPaintedWater;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaintedWater = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = `uniform float uLandscapeTime; varying vec3 vPaintedWater;\n${shader.fragmentShader}`.replace('#include <color_fragment>', '#include <color_fragment>\nfloat ripple = sin(vPaintedWater.x * .42 + sin(vPaintedWater.z * .13) * 1.8 + uLandscapeTime * .8) * sin(vPaintedWater.z * .57 - uLandscapeTime * .46); float line = smoothstep(.86, .99, ripple); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.6,.94,.9), line * .24);');
  };
  waterMaterial.customProgramCacheKey = () => 'painted-water-v1';
  const seaStart = coastStart + 8, seaWidth = WORLD.maxX - seaStart;
  const sea = mesh(group, new THREE.PlaneGeometry(seaWidth, depth, 28, 60), waterMaterial, seaStart + seaWidth / 2, 0, (WORLD.minZ + WORLD.maxZ) / 2); sea.rotation.x = -Math.PI / 2; sea.castShadow = false;
  const lake = mesh(group, new THREE.CircleGeometry(1, 80), waterMaterial, LAKE.x, .1, LAKE.z); lake.rotation.x = -Math.PI / 2; lake.scale.set(LAKE.radiusX, LAKE.radiusZ, 1); lake.castShadow = false;
  const river = ribbon(Array.from({ length: 85 }, (_, i) => { const z = riverStart + i / 84 * (WORLD.maxZ - riverStart); return { x: riverX(z), y: .12, z }; }), 11, waterMaterial, group);
  const foamMaterial = new THREE.MeshBasicMaterial({ color: '#d8fff0', transparent: true, opacity: .52, side: THREE.DoubleSide, depthWrite: false });
  const shoreLines = [];
  for (let n = 0; n < 3; n++) {
    const pts = Array.from({ length: 190 }, (_, i) => ({ x: coastStart + 22 + n * 4 + Math.sin(i * .3) * .6, y: .14, z: WORLD.minZ + 1 + i / 189 * (depth - 2) }));
    shoreLines.push(ribbon(pts, .25 + n * .15, foamMaterial, group));
  }
  const trailSamples = Array.from({ length: 360 }, (_, i) => trailPoint(i / 359));
  const trailMap = paintedTexture('trail', random);
  const trailMaterial = new THREE.MeshStandardMaterial({ color: '#e1c19a', map: trailMap, roughness: 1, side: THREE.DoubleSide });
  ribbon(trailSamples, 3.8, trailMaterial, group);
  const shopTrail = Array.from({ length: 110 }, (_, i) => ({ x: SHOP.x + Math.sin(i / 24) * 3, z: -12 + i / 109 * (WORLD.maxZ + 11) }));
  ribbon(shopTrail, 4.2, trailMaterial, group);
  function nearTrail(x, z) { return trailSurfaceAt(x,z).distance < 4.6; }
  const cliffSites = [{ x: -58, z: -37, r: 6.2 }, { x: -72, z: -45, r: 8.2 }, { x: -64, z: -59, r: 5.4 }];
  function reserved(x, z) {
    return isWater(x, z) || cliffSites.some(p => Math.hypot(x - p.x, z - p.z) < p.r + 3) || x > coastStart - 4 || (x > SHOP.x - 19 && x < SHOP.x + 19 && z > SHOP.z - 19 && z < SHOP.z + 17) || Math.hypot(x - SUMMIT.x, z - SUMMIT.z) < SUMMIT.radius + 5 || nearTrail(x, z) || Math.hypot(x - SHOP.x, z + 12) < 8;
  }
  const trunkGeo = coloredGeometry(new THREE.CylinderGeometry(.62, 1, 1, 10, 3), '#ab8140', '#ffdc90');
  const branchGeo = new THREE.CylinderGeometry(.13, .25, 1, 6);
  const leafGeo = canopyGeometry(), pineGeo = canopyGeometry(true);
  const TREE_COUNT = 3600, LEAF_LAYERS = 6, BRANCHES = 5;
  const specifications = [{ x: -23, z: -8, radius: .72, h: 10.5, species: 1 }];
  // A readable, lush foreground around the trailhead, and equally dense new land.
  let attempts = 0;
  while (specifications.length < TREE_COUNT && attempts++ < 40000) {
    const local = specifications.length < 120, mountain = !local && specifications.length < 350;
    const x = local ? SHOP.x - 85 + random() * 170 : mountain ? SUMMIT.x-175+random()*350 : WORLD.minX + 15 + random() * (landWidth - 30);
    const z = local ? SHOP.z - 90 + random() * 180 : mountain ? SUMMIT.z-175+random()*350 : WORLD.minZ + 14 + random() * (depth - 28);
    if (reserved(x, z) || terrainSlope(x,z)>1.1 || specifications.some(t => Math.hypot(t.x - x, t.z - z) < 5.6)) continue;
    const h = 7.5 + random() * 8;
    specifications.push({ x, z, radius: .42 + h * .028, h, species: terrainHeight(x, z) > 62 && random() < .7 ? 0 : random() < .16 ? 0 : random() < .6 ? 1 : 2 });
  }
  // Spatial batches keep a tripled map from drawing every tree into each shadow.
  const tiles = new Map();
  for (const spec of specifications) {
    spec.batchKey = `${spec.species}:${Math.floor(spec.x/180)}:${Math.floor(spec.z/180)}`;
    if (!tiles.has(spec.batchKey)) tiles.set(spec.batchKey, []);
    tiles.get(spec.batchKey).push(spec);
  }
  const batchByTile = new Map();
  const batches = [...tiles].map(([key, specs]) => {
    const species = specs[0].species, capacity = specs.length;
    const trunk = new THREE.InstancedMesh(trunkGeo, barkMaterials[species], capacity);
    const branches = new THREE.InstancedMesh(branchGeo, barkMaterials[species], capacity * BRANCHES);
    const leaves = Array.from({ length: LEAF_LAYERS }, () => new THREE.InstancedMesh(species === 0 ? pineGeo : leafGeo, foliageMaterials[species], capacity));
    [trunk, branches, ...leaves].forEach(m => { m.count = 0; m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(m); });
    const batch = { trunk, branches, leaves, count: 0 }; batchByTile.set(key, batch); return batch;
  });
  const dummy = new THREE.Object3D(), hide = new THREE.Matrix4().makeScale(0, 0, 0), instanceTint = new THREE.Color();
  for (const spec of specifications) {
    const { x, z, radius, h, species } = spec, y = terrainHeight(x, z), batch = batchByTile.get(spec.batchKey), index = batch.count++;
    const object = new THREE.Group(); object.position.set(x, y, z); object.userData.interaction = 'tree'; group.add(object);
    const tree = { ...spec, id: `tree-${trees.length}`, y, hits: 0, felled: false, object, stump: null, index, batch };
    const collider = { kind: 'circle', x, z, radius, active: true, id: tree.id }; tree.collider = collider; colliders.push(collider); trees.push(tree);
    dummy.position.set(x, y + h * .34, z); dummy.rotation.set(0, Math.sin(index) * .14, Math.sin(index * 2) * .025); dummy.scale.set(radius, h * .68, radius); dummy.updateMatrix(); batch.trunk.setMatrixAt(index, dummy.matrix);
    for (let j = 0; j < BRANCHES; j++) {
      const a = j / BRANCHES * Math.PI * 2 + index;
      if (j < 3) { dummy.position.set(x + Math.cos(a) * h * .12, y + h * (.48 + j * .085), z + Math.sin(a) * h * .12); dummy.rotation.set(Math.cos(a) * .85, a, Math.sin(a) * .85); dummy.scale.set(radius * 1.3, h * .34, radius * 1.3); }
      else { dummy.position.set(x + Math.cos(a) * radius * .9, y + .2, z + Math.sin(a) * radius * .9); dummy.rotation.set(Math.cos(a) * 1.1, a, Math.sin(a) * 1.1); dummy.scale.set(radius * 1.4, radius * 2.3, radius * 1.4); }
      dummy.updateMatrix(); batch.branches.setMatrixAt(index * BRANCHES + j, dummy.matrix);
    }
    batch.leaves.forEach((m, j) => {
      if (species === 0) { dummy.position.set(x + Math.sin(index + j) * .12, y + h * (.44 + j * .105), z); dummy.rotation.set(0, index * .4 + j, 0); dummy.scale.set(h * (.31 - j * .037), h * .34, h * (.31 - j * .037)); }
      else if (j < 4) { const a = j / 4 * Math.PI * 2 + index; dummy.position.set(x + Math.cos(a) * h * .18, y + h * (.65 + j % 2 * .075), z + Math.sin(a) * h * .18); dummy.rotation.set(index * .2, j, .1); dummy.scale.set(h * .24, h * (species === 2 ? .26 : .22), h * .25); }
      else { dummy.position.set(x + (j === 4 ? -.055 : .075) * h, y + h * (.84 + (j - 4) * .06), z + Math.sin(index) * h * .05); dummy.rotation.set(.3, index, -.15); dummy.scale.set(h * .25, h * .23, h * .23); }
      dummy.updateMatrix(); m.setMatrixAt(index, dummy.matrix); instanceTint.setHSL(.21 + species * .012 + Math.sin(index) * .012, .22, .88 + Math.sin(index * 3 + j) * .055); m.setColorAt(index, instanceTint);
    });
  }
  batches.forEach(b => { b.trunk.count = b.count; b.branches.count = b.count * BRANCHES; b.leaves.forEach(m => { m.count = b.count; }); [b.trunk, b.branches, ...b.leaves].forEach(m => { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }); });
  function chopTree(tree) {
    if (!tree || tree.felled) return { felled: false, wood: 0, hits: tree?.hits ?? 0 };
    tree.hits++;
    if (tree.hits < 3) return { felled: false, wood: 0, hits: tree.hits };
    tree.felled = true; tree.collider.active = false;
    tree.batch.trunk.setMatrixAt(tree.index, hide); tree.batch.trunk.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < BRANCHES; i++) tree.batch.branches.setMatrixAt(tree.index * BRANCHES + i, hide);
    tree.batch.branches.instanceMatrix.needsUpdate = true;
    tree.batch.leaves.forEach(m => { m.setMatrixAt(tree.index, hide); m.instanceMatrix.needsUpdate = true; });
    tree.stump = mesh(group, new THREE.CylinderGeometry(tree.radius * .85, tree.radius, .5, 12), woodMaterial, tree.x, tree.y + .25, tree.z);
    const rings = mesh(tree.stump, new THREE.RingGeometry(tree.radius * .35, tree.radius * .4, 20), new THREE.MeshBasicMaterial({ color: '#75502b', side: THREE.DoubleSide }), 0, .255, 0); rings.rotation.x = -Math.PI / 2;
    const fallingTree = new THREE.Group(); fallingTree.position.set(tree.x, tree.y + .3, tree.z); group.add(fallingTree);
    mesh(fallingTree, trunkGeo, barkMaterials[tree.species], 0, tree.h * .34, 0).scale.set(tree.radius, tree.h * .68, tree.radius);
    for (let i = 0; i < 3; i++) mesh(fallingTree, tree.species === 0 ? pineGeo : leafGeo, foliageMaterials[tree.species], Math.sin(i * 2) * tree.h * .13, tree.h * (.66 + i * .12), Math.cos(i * 2) * tree.h * .13).scale.set(tree.h * .23, tree.h * .28, tree.h * .23);
    falling.push({ object: fallingTree, time: 0, direction: tree.index % 2 ? 1 : -1 });
    return { felled: true, wood: 3, hits: tree.hits };
  }
  const rockPositions = [{ x: -39, z: -10, r: 1.2 }, ...cliffSites];
  let rockAttempts = 0;
  while (rockPositions.length < 220 && rockAttempts++ < 10000) { const mountain=rockPositions.length<100;const x = mountain ? SUMMIT.x-180+random()*360 : WORLD.minX + 20 + random() * (landWidth - 45), z = mountain ? SUMMIT.z-180+random()*360 : WORLD.minZ + 20 + random() * (depth - 40); if (!reserved(x, z) && !trees.some(t => Math.hypot(t.x - x, t.z - z) < 4)) rockPositions.push({ x, z, r: 1.4 + random() * 3.3 }); }
  const rockGeo = boulderGeometry(), mossGeo = coloredGeometry(new THREE.IcosahedronGeometry(.85, 1), '#55a72d', '#c7e960');
  for (const p of rockPositions) {
    const y = terrainHeight(p.x, p.z), r = p.r;
    const stone = mesh(group, rockGeo, rockMaterial, p.x, y + r * .4, p.z); stone.scale.set(r, r * .98, r * .88); stone.rotation.y = random() * Math.PI;
    const cap = mesh(stone, mossGeo, mossMaterial, -.05, .76, 0); cap.scale.set(.84, .16, .83);
    const rock = { id: `rock-${rocks.length}`, x: p.x, z: p.z, y, radius: r * .99, object: stone, mined: false };
    rock.collider = { id: rock.id, kind: 'circle', x: p.x, z: p.z, radius: rock.radius, active: true }; rocks.push(rock); colliders.push(rock.collider);
  }
  // A single draw call for thousands of sculpted tufts; local clusters make
  // the ground richly planted at actual walking scale, not only in a map view.
  const grassMaterial = new THREE.MeshStandardMaterial({ color: '#87d94b', vertexColors: true, roughness: .95, side: THREE.DoubleSide });
  const groundCover=createGroundCover(group,{geometry:tuftGeometry(),material:grassMaterial,heightAt:terrainHeight,allowed:(x,z)=>{
    if(x<WORLD.minX||x>coastStart-2||z<WORLD.minZ||z>WORLD.maxZ||isWater(x,z)||nearTrail(x,z))return false;
    if(x>SHOP.x-11&&x<SHOP.x+11&&z>SHOP.z-10&&z<SHOP.z+14)return false;
    if(z>-12&&Math.abs(x-SHOP.x)<5)return false;
    return terrainSlope(x,z)<1.1;
  }});
  groundCover.update(SHOP);
  const fernMaterial = new THREE.MeshStandardMaterial({ color: '#8de14c', vertexColors: true, roughness: .92, side: THREE.DoubleSide });
  const ferns = new THREE.InstancedMesh(tuftGeometry(true), fernMaterial, 780); let fernCount = 0;
  for (let i = 0; i < 1700 && fernCount < 780; i++) {
    const local = fernCount < 125;
    const x = local ? SHOP.x - 65 + random() * 130 : WORLD.minX + 15 + random() * (landWidth - 30), z = local ? SHOP.z - 55 + random() * 125 : WORLD.minZ + 15 + random() * (depth - 30);
    if (reserved(x, z) || terrainHeight(x, z) > 80) continue;
    dummy.position.set(x, terrainHeight(x, z), z); dummy.rotation.set(0, random() * Math.PI * 2, 0); const s = .6 + random() * .75; dummy.scale.set(s, s, s); dummy.updateMatrix(); ferns.setMatrixAt(fernCount++, dummy.matrix);
  }
  ferns.count = fernCount; ferns.instanceMatrix.needsUpdate = true; ferns.computeBoundingSphere(); group.add(ferns);
  const flowerMaterial = new THREE.MeshStandardMaterial({ color: '#fff1ae', roughness: .9 });
  const flowerGeo = new THREE.IcosahedronGeometry(.13, 1), flowers = new THREE.InstancedMesh(flowerGeo, flowerMaterial, 1100); let flowerCount = 0;
  for (let i = 0; i < 1500 && flowerCount < 1100; i++) {
    const base = i < 210 ? trailSamples[Math.floor(random() * trailSamples.length)] : { x: WORLD.minX + random() * landWidth, z: WORLD.minZ + random() * depth };
    const x = base.x + (random() - .5) * 10, z = base.z + (random() - .5) * 10;
    if (reserved(x, z) || terrainHeight(x, z) > 80) continue;
    dummy.position.set(x, terrainHeight(x, z) + .3, z); dummy.rotation.set(0, random() * 3, 0); dummy.scale.set(1, .7, 1); dummy.updateMatrix(); flowers.setMatrixAt(flowerCount, dummy.matrix); instanceTint.set(['#fff5a7', '#ffc4ce', '#e8dbff'][flowerCount % 3]); flowers.setColorAt(flowerCount++, instanceTint);
  }
  flowers.count = flowerCount; flowers.instanceMatrix.needsUpdate = true; flowers.computeBoundingSphere(); group.add(flowers);
  const herbMaterial = new THREE.MeshStandardMaterial({ color: '#7ed541', vertexColors: true, side: THREE.DoubleSide });
  for (let i = 0; i < 14; i++) {
    const t = trailPoint(.05 + i / 18), x = t.x + (i % 2 ? 5 : -5), z = t.z, y = terrainHeight(x, z);
    const plant = mesh(group, tuftGeometry(true), herbMaterial, x, y, z); plant.scale.set(1.25, 1.25, 1.25);
    mesh(plant, flowerGeo, flowerMaterial, 0, 1.1, 0);
    interactables.push({ id: `herb-${i}`, type: 'plant', x, z, y, radius: .25, object: plant, collected: false });
  }
  const signMaterial = new THREE.MeshStandardMaterial({ color: '#e8b878', roughness: .9 });
  function sign(x, z, text, id) {
    const y = terrainHeight(x, z), object = new THREE.Group(); object.position.set(x, y, z); group.add(object);
    mesh(object, new THREE.CylinderGeometry(.11, .15, 2.7, 7), woodMaterial, 0, 1.35, 0);
    mesh(object, new THREE.BoxGeometry(2.5, .9, .15), signMaterial, 0, 2.4, 0);
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 160; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e9bd84'; ctx.fillRect(0, 0, 512, 160); ctx.fillStyle = '#3e623e'; ctx.font = 'bold 38px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 256, 95);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    mesh(object, new THREE.PlaneGeometry(2.35, .76), new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }), 0, 2.4, .08);
    colliders.push({ id, kind: 'circle', x, z, radius: .18, active: true }); interactables.push({ id, type: 'sign', x, z, y, radius: .3, object, text });
  }
  sign(-36, -57, 'SUMMIT TRAIL ↑', 'trail-sign'); sign(SUMMIT.x - 13, SUMMIT.z + 13, `SUMMIT · ${SUMMIT.height} m`, 'summit-sign');
  const summitStones = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.22, 1), rockMaterial, 34);
  for (let i = 0; i < 34; i++) { const angle = i / 34 * Math.PI * 2; dummy.position.set(SUMMIT.x + Math.cos(angle) * (SUMMIT.radius - 2), SUMMIT.height + .12, SUMMIT.z + Math.sin(angle) * (SUMMIT.radius - 2)); dummy.rotation.set(0, i, 0); dummy.scale.set(1.4, .8, 1); dummy.updateMatrix(); summitStones.setMatrixAt(i, dummy.matrix); }
  summitStones.instanceMatrix.needsUpdate = true; group.add(summitStones);
  interactables.push({ id: 'summit-meadow', type: 'landmark', x: SUMMIT.x, z: SUMMIT.z, y: SUMMIT.height, radius: SUMMIT.radius, text: 'summit' });
  interactables.push({ id: 'lake-shore', type: 'water', x: LAKE.x, z: LAKE.z - LAKE.radiusZ - 1, y: 0, radius: 2, text: 'lake' });
  const baseColor = new THREE.Color(), green = new THREE.Color(), cliff = new THREE.Color();
  function updateSeason(index) {
    const normals = terrain.attributes.normal;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i), patch = Math.sin(x * .037 + Math.cos(z * .05)) * Math.sin(z * .031) * .035;
      const coast = x > coastStart - 10;
      green.set(index === 3 ? y > 10 ? '#e9f2ec' : '#cfdfd2' : ['#a3c99b', '#86bd93', '#ccb689', '#dce9e1'][index]);
      cliff.set(index === 3 ? '#c0c6bc' : '#daa676');
      const slope = 1 - Math.max(0, normals.getY(i));
      baseColor.copy(green).lerp(cliff, THREE.MathUtils.smoothstep(slope, .1, .34));
      if (coast) baseColor.set('#f1d5a0');
      baseColor.offsetHSL(0, 0, patch); colors[i * 3] = baseColor.r; colors[i * 3 + 1] = baseColor.g; colors[i * 3 + 2] = baseColor.b;
    }
    terrain.attributes.color.needsUpdate = true;
    foliageMaterials.forEach((m, species) => m.color.set(index === 3 ? species === 0 ? '#9bbda4' : '#b9d4b6' : index === 2 ? ['#a7b63d', '#e6a23a', '#e3bf4c'][species] : index === 0 ? ['#89b793', '#a3c799', '#c1d4a7'][species] : ['#36a338', '#64c62f', '#86d63c'][species]));
    grassMaterial.color.set(['#85d548', '#63c43d', '#c5ba54', '#d9e7d8'][index]); fernMaterial.color.copy(grassMaterial.color);
    flowerMaterial.color.set(['#fff0b5', '#ffedaf', '#edbe7b', '#f4f6f1'][index]);
  }
  updateSeason(0);
  function animate(dt, time) {
    waterTime.value = time; sea.position.y = Math.sin(time * .4) * .04;
    shoreLines.forEach((line, i) => { line.position.x = Math.sin(time * .5 + i * .9) * .7; });
    for (let i = falling.length - 1; i >= 0; i--) { const f = falling[i]; f.time += dt; f.object.rotation.z = Math.min(Math.PI * .48, f.time * f.time * .8) * f.direction; if (f.time > 3.2) { group.remove(f.object); falling.splice(i, 1); } }
  }
  return { group, terrain, sea, lake, river, trees, rocks, groundCover, updateCover:groundCover.update, colliders, interactables, updateSeason, animate, chopTree, heightAt: terrainHeight };
}
