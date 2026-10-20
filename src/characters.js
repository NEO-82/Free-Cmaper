import * as THREE from 'three';

const AGE = ['young', 'middle', 'older'];
const GENDER = ['male', 'female'];
const BODY = ['normal', 'large', 'slim'];
const PI = Math.PI;

/** Original toy-like camper. The round head occupies almost half the silhouette; forward is +Z. */
export function createCamper(parent, settings = {}) {
  const root = new THREE.Group(); root.name = 'Round little camper';
  const body = new THREE.Group(); root.add(body); parent.add(root);
  const upperBody = new THREE.Group(); upperBody.position.y = .76; body.add(upperBody);
  const materials = {};
  const mat = (name, color, roughness = .82) => materials[name] ??= new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  const skin = mat('skin', '#ffd1aa'), blush = mat('blush', '#efa696'), hair = mat('hair', '#69422e');
  const shirt = mat('shirt', '#eaa851'), shirtLight = mat('shirtLight', '#fff1ca'), shirtDark = mat('shirtDark', '#b77935');
  const pants = mat('pants', '#507e88'), boot = mat('boot', '#d77955'), sole = mat('sole', '#fff5dd');
  const pack = mat('pack', '#73a68c'), packDark = mat('packDark', '#4b7968'), canvas = mat('canvas', '#efd6a2');
  const ivory = mat('ivory', '#fffdf5'), eye = mat('eye', '#39352e', .5), metal = mat('metal', '#e6c985', .5);
  const shadow = mat('shadow', '#51433b');
  const sphere = new THREE.SphereGeometry(1, 24, 18);
  const roundedBox = roundBox();
  const geometries = new Set([sphere, roundedBox]);
  function add(parent, geometry, material, x, y, z, sx = 1, sy = sx, sz = sx) {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  const orb = (p, m, x, y, z, sx, sy, sz) => add(p, sphere, m, x, y, z, sx, sy, sz);
  const box = (p, m, x, y, z, sx, sy, sz) => add(p, roundedBox, m, x, y, z, sx, sy, sz);

  // A soft casual shirt, cream collar and a tiny embroidered sprout pocket.
  const torsoRig = new THREE.Group(); upperBody.add(torsoRig);
  const torso = orb(torsoRig, shirt, 0, .36, 0, .40, .40, .27);
  box(torsoRig, shirt, 0, .17, .015, .65, .30, .43);
  box(torsoRig, shirtLight, 0, .045, .02, .67, .075, .43);
  orb(torsoRig, shirtLight, 0, .72, .015, .19, .06, .17);
  box(torsoRig, shirtLight, -.17, .34, .253, .20, .19, .036);
  const leaf = mat('leaf', '#6b9564');
  for (const side of [-1, 1]) {
    const sprout = orb(torsoRig, leaf, -.17 + side * .035, .36, .28, .04, .025, .012); sprout.rotation.z = side * .45;
  }
  box(torsoRig, leaf, -.17, .323, .281, .012, .055, .012);
  const neck = orb(upperBody, skin, 0, .76, .015, .13, .13, .13);

  const head = new THREE.Group(); head.position.set(0, 1.34, .025); upperBody.add(head);
  const face = orb(head, skin, 0, 0, .02, .64, .65, .56); face.name = 'Round face';
  const capGeo = hairCap(); geometries.add(capGeo);
  const cap = add(head, capGeo, hair, 0, 0, 0); cap.name = 'Smooth swept hair';
  for (const side of [-1, 1]) {
    orb(head, skin, side * .635, -.08, .005, .135, .15, .115);
    orb(head, blush, side * .704, -.08, .075, .038, .07, .024);
    const cheek = orb(head, blush, side * .405, -.19, .441, .092, .048, .014); cheek.rotation.y = side * .5;
    const white = orb(head, ivory, side * .245, -.015, .533, .125, .161, .028); white.rotation.y = side * .23;
    const pupil = orb(head, eye, side * .235, -.025, .562, .087, .127, .021); pupil.rotation.y = side * .19;
    orb(head, ivory, side * .235 - .025, .018, .584, .024, .033, .010);
    orb(head, ivory, side * .235 + .026, -.075, .583, .011, .014, .007);
    const brow = box(head, hair, side * .245, .197, .539, .17, .028, .023); brow.rotation.z = -side * .07;
  }
  orb(head, mat('nose', '#edac88'), 0, -.18, .567, .055, .057, .061);
  // The smile is wrapped onto the face rather than floating in front of it.
  const smileShape = new THREE.Shape(); smileShape.moveTo(-.115, -.29); smileShape.quadraticCurveTo(0, -.31, .115, -.29);
  smileShape.bezierCurveTo(.095, -.455, -.095, -.455, -.115, -.29);
  const smileGeo = new THREE.ShapeGeometry(smileShape, 16);
  const positions = smileGeo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i);
    positions.setZ(i, .02 + .56 * Math.sqrt(Math.max(0, 1 - (x/.64)**2 - (y/.65)**2)) + .012);
  }
  smileGeo.computeVertexNormals(); geometries.add(smileGeo);
  add(head, smileGeo, mat('smile', '#b84c45'), 0, 0, 0).name = 'Happy smile';
  orb(head, mat('tongue', '#f38b83'), 0, -.382, .486, .061, .025, .012);

  // Short side locks and a tied bun stay smooth at close range, without polygonal clumps.
  const ponytail = new THREE.Group(); head.add(ponytail);
  for (const side of [-1, 1]) orb(ponytail, hair, side * .55, .015, -.205, .16, .40, .33);
  orb(ponytail, hair, .10, .48, -.415, .225, .23, .22);
  box(ponytail, mat('hairTie', '#f1c66e'), .10, .34, -.59, .24, .075, .085);
  const glasses = new THREE.Group(); head.add(glasses);
  const lensGeo = new THREE.TorusGeometry(.145, .014, 7, 28); geometries.add(lensGeo);
  for (const side of [-1, 1]) { const lens = add(glasses, lensGeo, shadow, side * .245, -.018, .594); lens.scale.y = 1.12; lens.rotation.y = side * .15; }
  box(glasses, shadow, 0, .015, .608, .20, .018, .018);
  const moustache = new THREE.Group(); head.add(moustache);
  for (const side of [-1, 1]) { const tuft = orb(moustache, hair, side * .065, -.262, .548, .073, .025, .018); tuft.rotation.z = side * .15; }

  // Compact mitten hands and sneakers retain separate joints for all game actions.
  const arms = [], elbows = [], legs = [], knees = [], ankles = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * .455, .59, 0); upperBody.add(arm); arms.push(arm);
    orb(arm, shirt, 0, -.105, 0, .18, .20, .18);
    orb(arm, shirtLight, 0, -.215, 0, .155, .055, .155);
    const elbow = new THREE.Group(); elbow.position.y = -.235; arm.add(elbow); elbows.push(elbow);
    orb(elbow, skin, 0, -.105, 0, .105, .16, .105);
    orb(elbow, skin, 0, -.235, .025, .137, .14, .12);
    orb(elbow, skin, -side * .085, -.20, .09, .052, .068, .055);
    const leg = new THREE.Group(); leg.position.set(side * .205, .76, 0); body.add(leg); legs.push(leg);
    orb(leg, pants, 0, -.145, 0, .175, .205, .175);
    box(leg, pants, 0, -.255, .012, .29, .10, .28);
    const knee = new THREE.Group(); knee.position.y = -.32; leg.add(knee); knees.push(knee);
    orb(knee, skin, 0, -.105, 0, .12, .15, .12);
    orb(knee, ivory, 0, -.23, .015, .125, .09, .125);
    const ankle = new THREE.Group(); ankle.position.y = -.31; knee.add(ankle); ankles.push(ankle);
    orb(ankle, boot, 0, 0, .09, .165, .13, .235);
    box(ankle, sole, 0, -.095, .09, .31, .055, .42);
    box(ankle, ivory, 0, .055, .265, .14, .055, .025);
    for (let j = 0; j < 2; j++) box(ankle, ivory, 0, .095 + j * .018, .16 - j * .045, .15, .014, .025);
  }

  const backpack = new THREE.Group(); upperBody.add(backpack);
  box(backpack, packDark, 0, .32, -.30, .55, .65, .25);
  box(backpack, pack, 0, .34, -.40, .51, .59, .24);
  box(backpack, pack, 0, .62, -.40, .57, .13, .27);
  box(backpack, packDark, 0, .19, -.54, .34, .26, .10);
  box(backpack, canvas, 0, .25, -.60, .14, .065, .025);
  for (const side of [-1, 1]) {
    box(backpack, packDark, side * .19, .35, -.55, .045, .53, .035);
    box(backpack, metal, side * .19, .34, -.579, .065, .08, .025);
    const strap = box(torsoRig, packDark, side * .30, .40, .203, .045, .55, .04); strap.rotation.z = -side * .12;
    box(backpack, pack, side * .32, .20, -.37, .14, .27, .18);
  }
  const bedGeo = new THREE.CylinderGeometry(.10, .10, .62, 18); geometries.add(bedGeo);
  const bedroll = add(backpack, bedGeo, canvas, 0, .73, -.38); bedroll.rotation.z = PI / 2;
  const ringGeo = new THREE.TorusGeometry(.103, .012, 6, 18); geometries.add(ringGeo);
  for (const x of [-.20, .20]) { const band = add(backpack, ringGeo, packDark, x, .73, -.38); band.rotation.y = PI / 2; }
  const bottle = orb(backpack, mat('bottle', '#8fc9cb', .5), .335, .23, -.37, .074, .18, .074);
  box(backpack, metal, .335, .41, -.37, .075, .045, .075);

  const model = {
    root, body, upperBody, torsoRig, torso, head, face, legs, knees, ankles, arms, elbows, backpack, neck,
    settings: {}, materials, ponytail, glasses, moustache, bottle,
    configure(next = {}) {
      const previous = this.settings;
      const age = AGE.includes(next.age) ? next.age : previous.age ?? 'young';
      const gender = GENDER.includes(next.gender) ? next.gender : previous.gender ?? 'male';
      const bodyType = BODY.includes(next.bodyType) ? next.bodyType : previous.bodyType ?? 'normal';
      this.settings = { age, gender, bodyType };
      const width = bodyType === 'large' ? 1.27 : bodyType === 'slim' ? .80 : 1;
      torsoRig.scale.set(width, 1, bodyType === 'large' ? 1.14 : bodyType === 'slim' ? .90 : 1);
      arms.forEach((arm, i) => { arm.position.x = (i ? 1 : -1) * .455 * width; arm.scale.set(bodyType === 'large' ? 1.08 : .98, 1, bodyType === 'large' ? 1.08 : .98); });
      legs.forEach((leg, i) => { leg.position.x = (i ? 1 : -1) * .205 * (bodyType === 'large' ? 1.2 : bodyType === 'slim' ? .9 : 1); });
      backpack.position.z = bodyType === 'large' ? -.05 : 0;
      hair.color.set(age === 'older' ? '#c3bdae' : age === 'middle' ? '#594135' : gender === 'female' ? '#795243' : '#795330');
      skin.color.set(age === 'older' ? '#f2c8a5' : '#ffd1aa');
      shirt.color.set(gender === 'female' ? '#81b8aa' : '#eaa851');
      shirtLight.color.set('#fff1ca'); shirtDark.color.set(gender === 'female' ? '#4c887b' : '#b77935');
      boot.color.set(gender === 'female' ? '#d8857c' : '#d77955');
      ponytail.visible = gender === 'female'; glasses.visible = age === 'older'; moustache.visible = gender === 'male' && age !== 'young';
      head.scale.setScalar(1);
      return this;
    },
    dispose() {
      root.removeFromParent(); geometries.forEach(g => g.dispose()); Object.values(materials).forEach(m => m.dispose());
    },
  };
  model.configure(settings); poseCamper(model, 'stand'); return model;
}

// A continuous rounded cap with a swept fringe; the back extends past the ears.
function hairCap() {
  const vertices = [], indices = [], rows = 16, columns = 48;
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
    const phi = col / columns * PI * 2;
    const front = Math.max(0, Math.cos(phi));
    const edge = 1.68 - .51 * Math.cos(phi) + .10 * Math.sin(phi * 3 + .35) * front;
    const theta = row / rows * edge;
    vertices.push(.674 * Math.sin(theta) * Math.sin(phi), .695 * Math.cos(theta) + .015, .587 * Math.sin(theta) * Math.cos(phi) - .025);
    if (row < rows && col < columns) {
      const a = row * (columns + 1) + col, b = a + columns + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

function roundBox() {
  const shape = new THREE.Shape(); const r = .13, l = -.5, h = .5;
  shape.moveTo(l + r, l); shape.lineTo(h - r, l); shape.quadraticCurveTo(h, l, h, l + r);
  shape.lineTo(h, h - r); shape.quadraticCurveTo(h, h, h - r, h); shape.lineTo(l + r, h); shape.quadraticCurveTo(l, h, l, h - r);
  shape.lineTo(l, l + r); shape.quadraticCurveTo(l, l, l + r, l);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .74, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .12, bevelThickness: .13, curveSegments: 5 });
  geometry.center(); return geometry;
}

/** Articulated gameplay poses. Feet are at ground level in stand/sit/crouch. */
export function poseCamper(model, pose, walking = false, now = 0, detail = {}) {
  const { body, upperBody, legs, knees, ankles, arms, elbows, head } = model;
  const wave = walking ? Math.sin(now * (pose === 'run' ? .013 : .008)) : 0;
  body.position.set(0, 0, 0); body.rotation.set(0, 0, 0);
  upperBody.rotation.set(model.settings.age === 'older' ? .055 : 0, 0, 0);
  head.rotation.set(0, walking ? Math.sin(now * .004) * .025 : 0, 0);
  legs.forEach((leg, i) => { leg.rotation.set(wave * (i ? -1 : 1) * .38, 0, 0); knees[i].rotation.set(Math.max(0, wave * (i ? 1 : -1)) * .38, 0, 0); });
  arms.forEach((arm, i) => { arm.rotation.set(wave * (i ? 1 : -1) * .35, 0, (i ? -1 : 1) * .055); elbows[i].rotation.set(-.10, 0, 0); });
  if (pose === 'swim') {
    const amount=detail.swimBlend??(walking?1:0),cycle=now*.0055;
    body.position.set(0,.06+.19*amount+Math.sin(cycle*2)*.025,-.35*amount);body.rotation.x=.18+.97*amount;
    upperBody.rotation.x=-.06*amount;head.rotation.x=-(body.rotation.x+upperBody.rotation.x)*(detail.diving?.7:1);
    body.rotation.z=Math.sin(cycle)*.045*amount;
    legs.forEach((leg,i)=>{const kick=Math.sin(cycle*2+i*Math.PI);leg.rotation.set(kick*(.12+.20*amount),0,(i?-1:1)*(.08+.08*(1-amount)));knees[i].rotation.x=.22+Math.max(0,kick)*.32;});
    arms.forEach((arm,i)=>{const phase=cycle+i*Math.PI;
      arm.rotation.set((-.6+Math.cos(phase)*.25)*(1-amount)+(-1.4+Math.cos(phase)*1.05)*amount,0,(i?-1:1)*(.65+Math.sin(phase)*(.15+.18*amount)));
      elbows[i].rotation.x=-.25-Math.max(0,Math.sin(phase))*(.15+.65*amount);
    });
  } else if(pose==='jump'){
    const falling=(detail.verticalVelocity??0)<0;upperBody.rotation.x=.08;
    legs.forEach((leg,i)=>{leg.rotation.x=falling?-.12:-(i?.45:.30);knees[i].rotation.x=falling?.3:(i?.8:.65);});
    arms.forEach((arm,i)=>{arm.rotation.set(-.85,0,(i?-1:1)*.30);elbows[i].rotation.x=-.35;});
  } else if (pose === 'sneak') {
    body.position.y = -.06; upperBody.rotation.x = .17;
    legs.forEach((leg,i) => { leg.rotation.x = -.45 + wave * (i ? -.08 : .08); knees[i].rotation.x = .9; });
    arms.forEach((arm,i) => { arm.rotation.x = -.15 + wave * (i ? .2 : -.2); elbows[i].rotation.x = -.2; });
  } else if (pose === 'run') {
    body.position.y = Math.abs(wave) * .06; upperBody.rotation.x = .12;
    legs.forEach((leg,i) => { leg.rotation.x = wave * (i ? -1 : 1) * .72; knees[i].rotation.x = Math.max(0,wave*(i ? 1 : -1)) * .85; });
    arms.forEach((arm,i) => { arm.rotation.x = wave * (i ? 1 : -1) * .8; elbows[i].rotation.x = -.8; });
  } else if (pose === 'crouch') {
    body.position.y = -.18; upperBody.rotation.x = .18;
    legs.forEach((leg, i) => { leg.rotation.x = -.80; knees[i].rotation.x = 1.70; });
    arms.forEach((arm, i) => { arm.rotation.x = -.35; elbows[i].rotation.x = -.20; });
  } else if (pose === 'sit') {
    body.position.y = -.28; upperBody.rotation.x = .055;
    legs.forEach((leg, i) => { leg.rotation.x = -1.45; knees[i].rotation.x = 1.45; });
    arms.forEach((arm, i) => { arm.rotation.x = -.88; elbows[i].rotation.x = -.5; });
  } else if (pose === 'prone') {
    body.position.set(0, .60, -1.10); body.rotation.x = PI / 2;
    upperBody.rotation.x = -.08;
    legs.forEach((leg, i) => { leg.rotation.x = walking ? wave * (i ? -.14 : .14) : 0; knees[i].rotation.x = .07; });
    arms.forEach((arm, i) => { arm.rotation.x = 2.85 + (walking ? wave * (i ? -.12 : .12) : 0); elbows[i].rotation.x = .35; });
  }
  ankles.forEach((ankle, i) => { ankle.rotation.x = pose === 'prone' ? 0 : -(legs[i].rotation.x + knees[i].rotation.x); });
}
