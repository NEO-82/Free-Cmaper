import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnimalFace, faceExpression, ANIMAL_FACE_COLORS } from '../src/animal-face.js';

const pixel=(face,x,y)=>{
  const {data,width,height}=face.texture.image;
  const index=(Math.floor((y/Math.PI+.5)*height)*width+Math.floor((x/(Math.PI*2)+.25)*width))*4;
  return Array.from(data.slice(index,index+4));
};
test('blink and mouth animate painted pixels while unchanged expressions reuse the texture',()=>{
  const face=createAnimalFace();
  const openEye=pixel(face,.38,.22),closedMouth=pixel(face,0,-.50),version=face.texture.version;
  assert.equal(face.update(0),false);assert.equal(face.texture.version,version);
  face.update(4.01);assert.equal(face.getState().blink,0);
  assert.notDeepEqual(pixel(face,.38,.22),openEye,'the eyes close on the head texture');
  face.update(0,'run');assert.equal(face.getState().blink,1);
  assert.deepEqual(pixel(face,.38,.22),openEye);
  assert.notDeepEqual(pixel(face,0,-.50),closedMouth,'running opens the painted mouth');
  const running=face.texture.image.data.slice();face.update(0,'stand');face.update(0,'run');
  assert.deepEqual(face.texture.image.data,running,'the same simulation time reproduces every pixel');
  face.dispose();
});
test('each species paints its own whole head without changing the atlas or introducing geometry',()=>{
  const face=createAnimalFace(),texture=face.texture,colors=new Set();
  for(const species of Object.keys(ANIMAL_FACE_COLORS)){
    face.update(0,'stand',species);assert.equal(face.texture,texture);assert.equal(face.getState().species,species);
    colors.add(pixel(face,2,0).join(','));
    const {data}=texture.image;for(let i=3;i<data.length;i+=4)assert.equal(data[i],255);
  }
  assert.equal(colors.size,5);assert.deepEqual(faceExpression(NaN),faceExpression(0));face.dispose();
});
