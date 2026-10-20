import * as THREE from 'three';

const AGE = ['young', 'middle', 'older'];
const GENDER = ['male', 'female'];
const BODY = ['normal', 'large', 'slim'];
const PI = Math.PI;

/** A self-contained, rounded adventure-game camper. Forward is local +Z. */
export function createCamper(parent, settings = {}) {
  const root = new THREE.Group(); root.name = 'Adventure camper';
  const body = new THREE.Group(); root.add(body); parent.add(root);
  const upperBody = new THREE.Group(); upperBody.position.y = 1.03; body.add(upperBody);
  const materials = {};
  const mat = (name, color, roughness = .78) => materials[name] ??= new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  const skin = mat('skin', '#efbd91'), blush = mat('blush', '#d4947f'), hair = mat('hair', '#67422a');
  const shirt = mat('shirt', '#087eb5'), shirtLight = mat('shirtLight', '#2e9dc5'), shirtDark = mat('shirtDark', '#075b85');
  const pants = mat('pants', '#254a5b'), boot = mat('boot', '#684a32'), sole = mat('sole', '#d3b58c');
  const pack = mat('pack', '#467968'), packDark = mat('packDark', '#28594f'), canvas = mat('canvas', '#d7b97f');
  const ivory = mat('ivory', '#fff7dd'), eye = mat('eye', '#3d3028'), metal = mat('metal', '#c5bda0', .43);
  const shadow = mat('shadow', '#3b352e');
  const sphere = new THREE.SphereGeometry(1, 16, 12);
  const capsule = new THREE.CapsuleGeometry(1, 1, 4, 10);
  const roundedBox = roundBox();
  const geometries = new Set([sphere, capsule, roundedBox]);
  function add(parent, geometry, material, x, y, z, sx = 1, sy = sx, sz = sx) {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  const orb = (p, m, x, y, z, sx, sy, sz) => add(p, sphere, m, x, y, z, sx, sy, sz);
  const box = (p, m, x, y, z, sx, sy, sz) => add(p, roundedBox, m, x, y, z, sx, sy, sz);

  // The jacket has a rounded silhouette, raised seams, a collar and real pockets.
  const torsoRig = new THREE.Group(); upperBody.add(torsoRig);
  const torso = orb(torsoRig, shirt, 0, .42, 0, .46, .48, .28);
  const abdomen = orb(torsoRig, shirt, 0, .17, .01, .42, .24, .29);
  box(torsoRig, shirtDark, 0, .05, .02, .71, .1, .43);
  const zip = box(torsoRig, shirtDark, 0, .44, .278, .025, .67, .023);
  for (const x of [-.24, .24]) {
    box(torsoRig, shirtLight, x, .39, .251, .23, .23, .065);
    box(torsoRig, shirtDark, x, .50, .282, .25, .055, .045);
    orb(torsoRig, metal, x, .48, .312, .022, .022, .012);
    const collar = box(torsoRig, shirtLight, x * .53, .79, .14, .18, .12, .19); collar.rotation.z = -Math.sign(x) * .30;
  }
  const neck = orb(upperBody, skin, 0, .85, .015, .15, .18, .14);

  // Sculpted face. The darker cap sits behind the face, leaving the cheeks clear.
  const head = new THREE.Group(); head.position.set(0, 1.19, .025); upperBody.add(head);
  orb(head, skin, 0, 0, .005, .39, .43, .35);
  orb(head, hair, 0, .065, -.095, .425, .43, .365);
  for (const side of [-1, 1]) {
    orb(head, skin, side * .395, -.005, -.015, .105, .15, .10);
    orb(head, blush, side * .448, -.008, .045, .033, .085, .032);
    orb(head, blush, side * .235, -.075, .280, .075, .045, .018);
    orb(head, ivory, side * .14, .055, .325, .080, .103, .037);
    orb(head, eye, side * .13, .049, .358, .037, .057, .018);
    orb(head, ivory, side * .13 - .01, .071, .375, .012, .018, .007);
    const eyebrow = box(head, hair, side * .14, .183, .323, .16, .035, .037); eyebrow.rotation.z = -side * .09;
  }
  orb(head, skin, 0, -.055, .345, .063, .081, .075);
  const smileCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-.065, -.142, .32), new THREE.Vector3(0, -.158, .341), new THREE.Vector3(.065, -.142, .32)]);
  const smileGeo = new THREE.TubeGeometry(smileCurve, 8, .011, 5, false); geometries.add(smileGeo); add(head, smileGeo, mat('smile', '#9f6552'), 0, 0, 0);
  // Multi-faceted tufts add the same chunky, sculpted hair detail as the reference.
  const tuftGeo = new THREE.IcosahedronGeometry(1, 1); geometries.add(tuftGeo);
  const tufts = new THREE.InstancedMesh(tuftGeo, hair, 14); tufts.castShadow = true; head.add(tufts);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 14; i++) {
    const ring = i < 9, angle = i * 2.399963;
    dummy.position.set(Math.cos(angle) * (ring ? .26 : .14), ring ? .27 + Math.sin(i * 1.7) * .04 : .38, Math.sin(angle) * (ring ? .22 : .12) - .055);
    dummy.rotation.set(i * .18, angle, Math.sin(i) * .18); dummy.scale.set(ring ? .17 : .13, ring ? .13 : .10, ring ? .15 : .12); dummy.updateMatrix(); tufts.setMatrixAt(i, dummy.matrix);
    tufts.setColorAt(i, new THREE.Color().setRGB(.87 + i % 3 * .055, .85 + i % 3 * .055, .82 + i % 3 * .055));
  }
  tufts.instanceMatrix.needsUpdate = true; tufts.computeBoundingSphere();
  const fringe = new THREE.Group(); head.add(fringe);
  for (let i = 0; i < 3; i++) {
    const bang = orb(fringe, hair, -.22 + i * .19, .285 - i * .025, .235, .16, .125, .13); bang.rotation.z = -.28 + i * .13;
  }
  const ponytail = new THREE.Group(); head.add(ponytail);
  orb(ponytail, hair, .08, -.08, -.37, .23, .26, .16);
  orb(ponytail, hair, .07, -.33, -.39, .18, .25, .14);
  box(ponytail, mat('hairTie', '#e6ae58'), .08, -.15, -.40, .28, .07, .12);
  const glasses = new THREE.Group(); head.add(glasses);
  const lensGeo = new THREE.TorusGeometry(.095, .011, 5, 18); geometries.add(lensGeo);
  for (const side of [-1, 1]) { const lens = add(glasses, lensGeo, shadow, side * .14, .052, .379); lens.scale.y = 1.03; }
  box(glasses, shadow, 0, .07, .38, .10, .015, .015);
  const moustache = new THREE.Group(); head.add(moustache);
  for (const side of [-1, 1]) orb(moustache, hair, side * .055, -.12, .326, .073, .028, .028);

  // Shoulder, elbow, hip and knee joints are independently animated.
  const arms = [], elbows = [], legs = [], knees = [], ankles = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * .57, .71, 0); upperBody.add(arm); arms.push(arm);
    orb(arm, shirt, 0, -.12, 0, .20, .24, .20);
    add(arm, capsule, shirt, 0, -.24, 0, .145, .15, .145);
    const elbow = new THREE.Group(); elbow.position.y = -.43; arm.add(elbow); elbows.push(elbow);
    add(elbow, capsule, shirtLight, 0, -.17, 0, .135, .14, .135);
    box(elbow, shirtDark, 0, -.34, .01, .25, .07, .24);
    orb(elbow, skin, 0, -.435, .015, .13, .16, .115);
    orb(elbow, skin, -side * .09, -.405, .075, .055, .085, .065);
    const leg = new THREE.Group(); leg.position.set(side * .22, 1.03, 0); body.add(leg); legs.push(leg);
    orb(leg, pants, 0, -.24, 0, .18, .29, .18);
    box(leg, mat('pocket', '#365b65'), side * .12, -.22, .07, .12, .22, .16);
    const knee = new THREE.Group(); knee.position.y = -.48; leg.add(knee); knees.push(knee);
    orb(knee, pants, 0, -.21, 0, .15, .25, .15);
    box(knee, pants, 0, -.36, .015, .25, .08, .25);
    const ankle = new THREE.Group(); ankle.position.y = -.42; knee.add(ankle); ankles.push(ankle);
    orb(ankle, boot, 0, 0, .12, .18, .13, .29);
    box(ankle, sole, 0, -.095, .12, .34, .055, .51);
    for (let j = 0; j < 3; j++) box(ankle, canvas, 0, .05 + j * .026, .32 - j * .016, .13, .018, .025);
  }

  // Soft pack, flap, pockets, straps, buckles, and an attached rolled sleeping mat.
  const backpack = new THREE.Group(); upperBody.add(backpack);
  box(backpack, packDark, 0, .40, -.40, .76, .98, .40);
  box(backpack, pack, 0, .46, -.49, .71, .86, .32);
  box(backpack, pack, 0, .90, -.48, .76, .18, .39);
  box(backpack, packDark, 0, .24, -.68, .47, .39, .12);
  box(backpack, pack, 0, .27, -.72, .42, .28, .10);
  for (const side of [-1, 1]) {
    box(backpack, packDark, side * .27, .42, -.70, .07, .82, .04);
    box(backpack, metal, side * .27, .40, -.735, .11, .12, .035);
    const strap = box(torsoRig, packDark, side * .29, .45, .22, .075, .76, .07); strap.rotation.z = -side * .08;
    box(torsoRig, metal, side * .29, .19, .29, .10, .11, .035);
    box(backpack, packDark, side * .46, .27, -.48, .18, .40, .24);
  }
  const bedGeo = new THREE.CylinderGeometry(.16, .16, .87, 14); geometries.add(bedGeo);
  const bedroll = add(backpack, bedGeo, canvas, 0, 1.035, -.47); bedroll.rotation.z = PI / 2;
  const ringGeo = new THREE.TorusGeometry(.165, .018, 5, 14); geometries.add(ringGeo);
  for (const x of [-.28, .28]) { const band = add(backpack, ringGeo, packDark, x, 1.035, -.47); band.rotation.y = PI / 2; }
  const bottle = orb(backpack, mat('bottle', '#64b6bd', .4), .49, .25, -.47, .10, .24, .10);
  box(backpack, metal, .49, .49, -.47, .10, .06, .10);

  const model = {
    root, body, upperBody, torsoRig, torso, head, legs, knees, ankles, arms, elbows, backpack, neck,
    settings: {}, materials, ponytail, glasses, moustache, bottle,
    configure(next = {}) {
      const previous = this.settings;
      const age = AGE.includes(next.age) ? next.age : previous.age ?? 'young';
      const gender = GENDER.includes(next.gender) ? next.gender : previous.gender ?? 'male';
      const bodyType = BODY.includes(next.bodyType) ? next.bodyType : previous.bodyType ?? 'normal';
      this.settings = { age, gender, bodyType };
      const width = bodyType === 'large' ? 1.27 : bodyType === 'slim' ? .80 : 1;
      torsoRig.scale.set(width, 1, bodyType === 'large' ? 1.14 : bodyType === 'slim' ? .90 : 1);
      arms.forEach((arm, i) => { arm.position.x = (i ? 1 : -1) * .57 * width; arm.scale.set(bodyType === 'large' ? 1.08 : .98, 1, bodyType === 'large' ? 1.08 : .98); });
      legs.forEach((leg, i) => { leg.position.x = (i ? 1 : -1) * .22 * (bodyType === 'large' ? 1.2 : bodyType === 'slim' ? .9 : 1); });
      backpack.position.z = bodyType === 'large' ? -.07 : 0;
      hair.color.set(age === 'older' ? '#b5b1a3' : age === 'middle' ? '#604b3a' : '#70462c');
      skin.color.set(age === 'older' ? '#e3b792' : '#efbd91');
      shirt.color.set(gender === 'female' ? '#238c91' : '#087eb5');
      shirtLight.color.set(gender === 'female' ? '#4ca9a2' : '#2e9dc5');
      shirtDark.color.set(gender === 'female' ? '#17656c' : '#075b85');
      ponytail.visible = gender === 'female'; glasses.visible = age === 'older'; moustache.visible = gender === 'male' && age !== 'young';
      head.scale.setScalar(gender === 'female' ? .98 : 1);
      return this;
    },
    dispose() {
      root.removeFromParent(); geometries.forEach(g => g.dispose()); Object.values(materials).forEach(m => m.dispose());
    },
  };
  model.configure(settings); poseCamper(model, 'stand'); return model;
}

function roundBox() {
  const shape = new THREE.Shape(); const r = .13, l = -.5, h = .5;
  shape.moveTo(l + r, l); shape.lineTo(h - r, l); shape.quadraticCurveTo(h, l, h, l + r);
  shape.lineTo(h, h - r); shape.quadraticCurveTo(h, h, h - r, h); shape.lineTo(l + r, h); shape.quadraticCurveTo(l, h, l, h - r);
  shape.lineTo(l, l + r); shape.quadraticCurveTo(l, l, l + r, l);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .74, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .12, bevelThickness: .13, curveSegments: 3 });
  geometry.center(); return geometry;
}

/** Articulated gameplay poses. Feet are at ground level in stand/sit/crouch. */
export function poseCamper(model, pose, walking = false, now = 0) {
  const { body, upperBody, legs, knees, ankles, arms, elbows, head } = model;
  const wave = walking ? Math.sin(now * .008) : 0;
  body.position.set(0, 0, 0); body.rotation.set(0, 0, 0);
  upperBody.rotation.set(model.settings.age === 'older' ? .055 : 0, 0, 0);
  head.rotation.set(0, walking ? Math.sin(now * .004) * .025 : 0, 0);
  legs.forEach((leg, i) => { leg.rotation.set(wave * (i ? -1 : 1) * .38, 0, 0); knees[i].rotation.set(Math.max(0, wave * (i ? 1 : -1)) * .38, 0, 0); });
  arms.forEach((arm, i) => { arm.rotation.set(wave * (i ? 1 : -1) * .35, 0, (i ? -1 : 1) * .055); elbows[i].rotation.set(-.10, 0, 0); });
  if (pose === 'crouch') {
    body.position.y = -.29; upperBody.rotation.x = .18;
    legs.forEach((leg, i) => { leg.rotation.x = -.80; knees[i].rotation.x = 1.70; });
    arms.forEach((arm, i) => { arm.rotation.x = -.35; elbows[i].rotation.x = -.20; });
  } else if (pose === 'sit') {
    body.position.y = -.42; upperBody.rotation.x = .055;
    legs.forEach((leg, i) => { leg.rotation.x = -1.45; knees[i].rotation.x = 1.45; });
    arms.forEach((arm, i) => { arm.rotation.x = -.88; elbows[i].rotation.x = -.5; });
  } else if (pose === 'prone') {
    body.position.set(0, .46, -1.10); body.rotation.x = PI / 2;
    upperBody.rotation.x = -.08;
    legs.forEach((leg, i) => { leg.rotation.x = walking ? wave * (i ? -.14 : .14) : 0; knees[i].rotation.x = .07; });
    arms.forEach((arm, i) => { arm.rotation.x = 2.85 + (walking ? wave * (i ? -.12 : .12) : 0); elbows[i].rotation.x = .35; });
  }
  ankles.forEach((ankle, i) => { ankle.rotation.x = pose === 'prone' ? 0 : -(legs[i].rotation.x + knees[i].rotation.x); });
}
