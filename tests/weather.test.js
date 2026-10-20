import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { sampleWeather, weatherState } from '../src/weather.js';
import { createAtmosphere } from '../src/atmosphere.js';

const draw = (chance, clouds = 0.25, season = 0) => {
  const values = [chance, clouds];
  return sampleWeather(season, () => values.shift());
};

test('10,000 evenly spaced hourly draws give the exact requested probabilities in every season', () => {
  for (let season = 0; season < 4; season++) {
    const counts = { clear: 0, rain: 0, snow: 0, overcast: 0, fog: 0 };
    for (let i = 0; i < 10000; i++) counts[draw((i + 0.5) / 10000, 0.25, season).kind]++;
    assert.deepEqual(counts, { clear: 7000, rain: season === 3 ? 0 : 1000, snow: season === 3 ? 1000 : 0, overcast: 1000, fog: 1000 });
  }
});

test('weather threshold boundaries and winter precipitation are unambiguous', () => {
  const cases = [[0, 'clear'], [0.7 - Number.EPSILON, 'clear'], [0.7, 'rain'], [0.8 - Number.EPSILON, 'rain'], [0.8, 'overcast'], [0.9 - Number.EPSILON, 'overcast'], [0.9, 'fog'], [1 - Number.EPSILON, 'fog']];
  for (const [chance, expected] of cases) {
    assert.equal(draw(chance).kind, expected);
    assert.equal(draw(chance, 0.25, 3).kind, expected === 'rain' ? 'snow' : expected);
  }
});

test('clear skies independently select either no clouds or a few clouds', () => {
  assert.equal(draw(0.3, 0).cloudCover, 0);
  assert.equal(draw(0.3, 0.5 - Number.EPSILON).cloudCover, 0);
  assert.equal(draw(0.3, 0.5).cloudCover, 0.15);
  assert.ok(Math.abs(draw(0.3, 1 - Number.EPSILON).cloudCover - 0.3) < 1e-12);
  for (const chance of [0.7, 0.8, 0.9]) {
    let calls = 0;
    sampleWeather(0, () => { calls++; return chance; });
    assert.equal(calls, 1, 'cloud randomness must never change a non-clear weather draw');
  }
});

test('weather profiles and supplied random sources reject invalid input', () => {
  for (const season of [-1, 4, 0.5, NaN, 'winter']) assert.throws(() => sampleWeather(season), RangeError);
  assert.throws(() => sampleWeather(0, 0.5), TypeError);
  for (const chance of [-0.1, 1, Infinity, NaN, undefined]) assert.throws(() => sampleWeather(0, () => chance), RangeError);
  assert.throws(() => draw(0.1, 1), RangeError);
  assert.throws(() => weatherState('storm'), RangeError);
  assert.throws(() => weatherState('toString'), RangeError);
  for (const cover of [-0.01, 1.01, NaN, Infinity]) assert.throws(() => weatherState('clear', cover), RangeError);
  assert.equal(weatherState('rain').precipitation, 1);
  assert.equal(weatherState('overcast').precipitation, 0);
});

test('seeded random sources reproduce the same sequence without shared mutable profiles', () => {
  const seeded = seed => () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  const sequence = seed => { const random = seeded(seed); return Array.from({ length: 40 }, () => sampleWeather(3, random)); };
  assert.deepEqual(sequence(42), sequence(42));
  assert.notDeepEqual(sequence(42), sequence(43));
  const first = weatherState('rain'); first.cloudCover = 0;
  assert.equal(weatherState('rain').cloudCover, 0.96);
});

test('cloudless clear weather actually draws zero clouds and preserves the distant sky dome', () => {
  const scene = new THREE.Scene(), atmosphere = createAtmosphere(scene), center = new THREE.Vector3(810, 210, -620);
  const sky = atmosphere.update(12, 'clear', 0, center, weatherState('clear', 0));
  assert.deepEqual(atmosphere.getState(), { cloudCount: 0, cloudCover: 0, weather: 'clear' });
  assert.equal(scene.getObjectByName('weather-clouds').count, 0);
  assert.equal(scene.getObjectByName('weather-clouds').visible, false);
  assert.equal(scene.getObjectByName('sun-disc').visible, true);
  assert.equal(scene.getObjectByName('night-stars').visible, false);
  assert.equal(scene.getObjectByName('sky-dome').geometry.parameters.radius, 6000);
  assert.equal(scene.getObjectByName('sky-dome').position.x, center.x);
  assert.ok(sky.horizon.isColor && sky.daylight > 0.9);
  const snapshot = atmosphere.getState(); snapshot.cloudCount = 999;
  assert.equal(atmosphere.getState().cloudCount, 0);
});

test('cloud weather changes density, height, tint and visibility immediately, even while time is paused', () => {
  const scene = new THREE.Scene(), atmosphere = createAtmosphere(scene), center = new THREE.Vector3();
  const clouds = scene.getObjectByName('weather-clouds'), matrix = new THREE.Matrix4();
  const sample = kind => {
    atmosphere.update(12, kind, 100, center, weatherState(kind));
    clouds.getMatrixAt(0, matrix);
    return { count: clouds.count, height: matrix.elements[13], color: clouds.material.color.clone() };
  };
  const clear = sample('clear'), overcast = sample('overcast'), rain = sample('rain'), snow = sample('snow'), fog = sample('fog');
  assert.ok(clear.count > 0 && clear.count < overcast.count);
  assert.ok(rain.count > clear.count && snow.count > clear.count);
  assert.ok(rain.height < clear.height && snow.height < clear.height && fog.height < rain.height);
  assert.ok(rain.color.r < overcast.color.r && snow.color.r > rain.color.r);
  assert.equal(clouds.material.transparent, true);
  assert.ok(clouds.material.opacity < 1);
  assert.equal(scene.children.filter(object => object.isInstancedMesh).length, 1);
  assert.ok(clouds.count <= 288);
  for (let i = 0; i < clouds.count; i++) { clouds.getMatrixAt(i, matrix); assert.ok(matrix.elements.every(Number.isFinite)); }
  atmosphere.update(12, 'clear', 100, center, weatherState('clear', 0));
  assert.equal(clouds.count, 0, 'a paused weather change must remove the previous cloud layer');
});

test('cloud movement freezes with game time and stars stay clear-colored behind appropriate weather', () => {
  const scene = new THREE.Scene(), atmosphere = createAtmosphere(scene), center = new THREE.Vector3();
  const clouds = scene.getObjectByName('weather-clouds'), stars = scene.getObjectByName('night-stars');
  atmosphere.update(23, 'clear', 50, center, weatherState('clear', 0.2));
  const frozen = clouds.instanceMatrix.array.slice();
  const starColor = stars.material.color.clone();
  assert.equal(stars.visible, true);
  atmosphere.update(23, 'clear', 50, center, weatherState('clear', 0.2));
  assert.deepEqual(clouds.instanceMatrix.array, frozen);
  atmosphere.update(23, 'clear', 70, center, weatherState('clear', 0.2));
  assert.notDeepEqual(clouds.instanceMatrix.array, frozen);
  for (const kind of ['overcast', 'rain', 'snow', 'fog']) {
    atmosphere.update(23, kind, 70, center);
    assert.equal(stars.visible, false);
    assert.equal(scene.getObjectByName('sun-disc').visible, false);
    assert.ok(stars.material.color.equals(starColor));
  }
  atmosphere.update(23, 'clear', 70, center, weatherState('clear', 0));
  assert.equal(stars.visible, true);
  assert.equal(stars.material.opacity, 0.9);
});
