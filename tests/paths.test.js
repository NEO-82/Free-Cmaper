import test from 'node:test';import assert from 'node:assert/strict';
import {pathSurfaceHeight,pathUnderlayHeight,shopRoadPoint}from '../src/paths.js';
import {trailPoint,terrainHeight}from '../src/terrain.js';
import {arrivalRoadPoint}from '../src/journey.js';

test('roads sit just below surrounding ground while collision and visible road use the same surface',()=>{
  for(const path of [trailPoint,shopRoadPoint,arrivalRoadPoint])for(let i=1;i<80;i++){
    const p=path(i/80),ground=terrainHeight(p.x,p.z),surface=pathSurfaceHeight(p.x,p.z),underlay=pathUnderlayHeight(p.x,p.z);
    assert.ok(surface<=ground+.0001&&surface>=ground-.041);assert.ok(underlay<surface-.09);
  }
});
