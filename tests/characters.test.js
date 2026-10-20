import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCamper, poseCamper } from '../src/characters.js';

const bounds = model => { model.root.updateMatrixWorld(true); return new THREE.Box3().setFromObject(model.root, true); };

test('round camper retains its articulated limbs, small hiking pack and gameplay scale', () => {
  const scene = new THREE.Scene(), model = createCamper(scene);
  assert.equal(scene.children[0], model.root);
  assert.equal(model.legs.length, 2); assert.equal(model.knees.length, 2); assert.equal(model.ankles.length, 2);
  assert.equal(model.arms.length, 2); assert.equal(model.elbows.length, 2);
  assert.ok(model.head.children.length >= 15);
  assert.ok(model.backpack.children.length >= 15);
  assert.ok(bounds(model).max.y > 2.6 && bounds(model).max.y < 3);
  assert.ok(Math.abs(bounds(model).min.y) < .01);
  model.dispose(); assert.equal(scene.children.length, 0);
});

test('all age, gender and body settings change appearance without rebuilding or invalidating the avatar', () => {
  const model = createCamper(new THREE.Scene());
  const children = model.body.children.length;
  model.configure({ age: 'young', gender: 'male', bodyType: 'slim' });
  const slimWidth = model.torsoRig.scale.x, brownHair = model.materials.hair.color.getHex();
  model.configure({ age: 'older', gender: 'female', bodyType: 'large' });
  assert.ok(model.torsoRig.scale.x > slimWidth);
  assert.notEqual(model.materials.hair.color.getHex(), brownHair);
  assert.equal(model.ponytail.visible, true); assert.equal(model.glasses.visible, true); assert.equal(model.moustache.visible, false);
  for (const age of ['young', 'middle', 'older']) for (const gender of ['male', 'female']) for (const bodyType of ['normal', 'large', 'slim']) {
    model.configure({ age, gender, bodyType });
    assert.deepEqual(model.settings, { age, gender, bodyType });
    assert.equal(model.body.children.length, children);
    assert.ok(Number.isFinite(bounds(model).max.y));
  }
  model.dispose();
});

test('standing, crouching, sitting and prone poses keep feet and hands above the ground', () => {
  const model = createCamper(new THREE.Scene());
  let standingHeight;
  for (const pose of ['stand', 'sneak', 'crouch', 'sit', 'prone']) {
    poseCamper(model, pose);
    const b = bounds(model);
    assert.ok(b.min.y >= -.01, `${pose} sinks below ground: ${b.min.y}`);
    if (pose === 'stand') standingHeight = b.max.y;
    else assert.ok(b.max.y < standingHeight, `${pose} should lower the silhouette`);
    if (pose === 'prone') assert.ok(b.max.y < 1.4);
  }
  poseCamper(model, 'stand');
  assert.equal(model.body.rotation.x, 0); assert.equal(model.body.position.y, 0);
  assert.ok(Math.abs(bounds(model).min.y) < .01);
  model.dispose();
});

test('walking bends opposite limbs and keeps every transform finite across pose changes', () => {
  const model = createCamper(new THREE.Scene());
  for (const pose of ['stand', 'sneak', 'run', 'crouch', 'prone', 'sit', 'stand']) for (const time of [0, 96, 196, 392]) {
    poseCamper(model, pose, true, time);
    model.root.traverse(o => {
      assert.ok([...o.position, ...o.scale, ...o.quaternion].every(Number.isFinite));
    });
  }
  poseCamper(model, 'stand', true, 96);
  assert.ok(model.legs[0].rotation.x * model.legs[1].rotation.x < 0);
  assert.ok(model.arms[0].rotation.x * model.legs[0].rotation.x < 0);
  assert.ok(bounds(model).min.y >= -.01);
  model.dispose();
});


test('the large round face takes almost half the height while the small pack stays below the head',()=>{
  const model=createCamper(new THREE.Scene());
  for(const age of ['young','middle','older'])for(const gender of ['male','female'])for(const bodyType of ['normal','large','slim']){
    model.configure({age,gender,bodyType});poseCamper(model,'stand');model.root.updateMatrixWorld(true);
    const full=bounds(model),face=new THREE.Box3().setFromObject(model.face,true),pack=new THREE.Box3().setFromObject(model.backpack,true);
    const ratio=(face.max.y-face.min.y)/(full.max.y-full.min.y);
    assert.ok(ratio>.43&&ratio<.5,`${age}/${gender}/${bodyType}: head ratio ${ratio}`);
    assert.ok(full.max.y<2.9,'all choices fit the tent doorway');
    assert.ok(pack.max.y<face.min.y+.2,'the pack does not overwhelm the head');
  }
  model.dispose();
});
