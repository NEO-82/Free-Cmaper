import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCamper, poseCamper, CHARACTER_STYLES } from '../src/characters.js';

const bounds = model => { model.root.updateMatrixWorld(true); const b=new THREE.Box3(); model.root.traverseVisible(o=>{if(o.isMesh){if(o.isSkinnedMesh){o.computeBoundingBox();b.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld));}else{o.geometry.computeBoundingBox();b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}}});return b; };

test('human camper retains its articulated limbs, small hiking pack and gameplay scale', () => {
  const scene = new THREE.Scene(), model = createCamper(scene);
  assert.equal(scene.children[0], model.root);
  assert.equal(model.legs.length, 2); assert.equal(model.knees.length, 2); assert.equal(model.ankles.length, 2);
  assert.equal(model.arms.length, 2); assert.equal(model.elbows.length, 2);
  assert.ok(model.face.material.map.isDataTexture);
  assert.equal(model.head.children.filter(o=>o.name==='Painted human face').length,1);assert.equal(model.limbMeshes.length,4);assert.ok(model.limbMeshes.every(m=>m.isSkinnedMesh));
  assert.ok(model.backpack.getObjectById(model.bottle.id));
  assert.ok(bounds(model).max.y > 2.6 && bounds(model).max.y < 3);
  assert.ok(Math.abs(bounds(model).min.y) < .01);
  model.dispose(); assert.equal(scene.children.length, 0);
});

test('man is the default and both human choices have distinct hairstyles', () => {
  const model=createCamper(new THREE.Scene());assert.deepEqual(model.settings,{species:'male'});
  const children=model.head.children.length,colors=new Set();
  for(const species of CHARACTER_STYLES){
    model.configure({species});assert.deepEqual(model.settings,{species});
    assert.equal(model.head.children.length,children);
    assert.equal(model.details[species].visible,true);
    for(const other of CHARACTER_STYLES.filter(s=>s!==species)){assert.equal(model.details[other].visible,false);}
    colors.add(model.materials.fur.color.getHex());assert.ok(Number.isFinite(bounds(model).max.y));
  }
  assert.equal(colors.size,2);model.configure({species:'unknown'});assert.equal(model.settings.species,'female');
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
    if (pose === 'prone') assert.ok(b.max.y < 1.7);
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
  for(const species of CHARACTER_STYLES){
    model.configure({species});poseCamper(model,'stand');model.root.updateMatrixWorld(true);
    const full=bounds(model),face=new THREE.Box3().setFromObject(model.face,true),pack=new THREE.Box3().setFromObject(model.backpack,true);
    const ratio=(face.max.y-face.min.y)/(full.max.y-full.min.y);
    assert.ok(ratio>.4&&ratio<.51,`${species}: head ratio ${ratio}`);
    assert.ok(full.max.y<3.05,'all choices fit the tent doorway');
    assert.ok(pack.max.y<face.min.y+.2,'the pack does not overwhelm the head');
  }
  model.dispose();
});

test('swimming has a horizontal alternating stroke, a distinct idle tread and a face held above the water',()=>{
  const model=createCamper(new THREE.Scene());
  poseCamper(model,'swim',true,500,{swimBlend:1});const stroke=model.arms.map(a=>a.rotation.x);
  assert.ok(model.body.rotation.x>1);assert.ok(Math.abs(stroke[0]-stroke[1])>.2);assert.ok(Math.abs(model.knees[0].rotation.x-model.knees[1].rotation.x)>.01);
  model.root.updateMatrixWorld(true);const faceDirection=new THREE.Vector3(0,0,1).transformDirection(model.head.matrixWorld);assert.ok(faceDirection.z>.99);
  poseCamper(model,'swim',false,500,{swimBlend:0});assert.ok(model.body.rotation.x<.25);
  poseCamper(model,'swim',true,500,{swimBlend:1});assert.deepEqual(model.arms.map(a=>a.rotation.x),stroke,'the pose freezes at the same simulation time');
  poseCamper(model,'stand');assert.equal(model.body.rotation.x,0);assert.equal(model.body.rotation.z,0);model.dispose();
});


test('reference outfits switch between a male sun hat and female short overalls, with denim cuffs and white footwear following the rig',()=>{
 const model=createCamper(new THREE.Scene());
 for(const species of CHARACTER_STYLES){
  model.configure({species});poseCamper(model,'stand');assert.equal(model.hat.visible,species==='male');assert.equal(model.overalls.visible,species==='female');
  assert.ok(model.hat.getObjectByName('Cream broad hat brim'));assert.ok(model.overalls.getObjectByName('Bib patch pocket'));
  for(let i=0;i<2;i++){assert.ok(model.legs[i].getObjectByName('Turned up denim hem'));assert.ok(model.knees[i].getObjectByName('White sock'));assert.ok(model.ankles[i].getObjectByName('Rounded ankle boot cuff'));}
  for(const pose of ['run','sit','crouch','prone']){poseCamper(model,pose,true,96);model.root.updateMatrixWorld(true);for(const mesh of model.limbMeshes)assert.ok([...mesh.matrixWorld.elements].every(Number.isFinite));}
 }
 model.dispose();
});
