import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_OPTIONS, normalizeOptions, lookAngles, movementSpeed, togglePosture, verticalStep, timeAdvances } from '../src/controls.js';
import { translate } from '../src/i18n.js';

test('options accept saved values and constrain corrupt or out-of-range settings', () => {
  assert.deepEqual(normalizeOptions(null), DEFAULT_OPTIONS);
  assert.deepEqual(normalizeOptions({ brightness: 500, sensitivity: -2, invertX: true, invertY: 'false', language: 'xx' }), { brightness: 150, sensitivity: 0.2, invertX: true, invertY: false, language: 'ko' });
  assert.equal(normalizeOptions({ sensitivity: 'bad' }).sensitivity, 1);
});
test('mouse sensitivity scales yaw and pitch, inversion reverses each axis independently', () => {
  const normal = lookAngles(0, 0.6, 10, 10, DEFAULT_OPTIONS);
  assert.ok(normal.yaw < 0 && normal.pitch > 0.6);
  const inverted = lookAngles(0, 0.6, 10, 10, { ...DEFAULT_OPTIONS, invertX: true, invertY: true });
  assert.equal(inverted.yaw, -normal.yaw);
  assert.ok(Math.abs(inverted.pitch + normal.pitch - 1.2) < 1e-10);
  const fast = lookAngles(0, 0.6, 10, 10, { ...DEFAULT_OPTIONS, sensitivity: 2 });
  assert.equal(fast.yaw, 2 * normal.yaw);
  assert.equal(lookAngles(0, 0.6, 0, 10000, DEFAULT_OPTIONS).pitch, 1.3);
  assert.equal(lookAngles(0, 0.6, 0, -10000, DEFAULT_OPTIONS).pitch, 0.12);
});
test('slow movement and postures reduce speed without changing the transport choice', () => {
  assert.equal(movementSpeed('walk', 'stand', false), 3);
  assert.ok(movementSpeed('walk', 'stand', true) < 3);
  assert.ok(movementSpeed('walk', 'prone', false) < movementSpeed('walk', 'crouch', false));
  assert.equal(movementSpeed('car', 'stand', false), 8);
});
test('C and V toggle their respective postures and switch directly between them', () => {
  assert.equal(togglePosture('stand', 'crouch'), 'crouch');
  assert.equal(togglePosture('crouch', 'crouch'), 'stand');
  assert.equal(togglePosture('crouch', 'prone'), 'prone');
  assert.equal(togglePosture('prone', 'prone'), 'stand');
});
test('jump rises, falls under gravity, and lands without sinking or bouncing', () => {
  let state = { height: 0.001, velocity: 7 }, peak = 0;
  for (let i = 0; i < 120; i++) { state = verticalStep(state.height, state.velocity, 1 / 60); peak = Math.max(peak, state.height); }
  assert.ok(peak > 1 && peak < 1.5);
  assert.deepEqual(state, { height: 0, velocity: 0 });
});
test('closing a backpack cannot override an existing pause or another blocking state', () => {
  const base = { running: true, paused: false, backpackOpen: false, optionsOpen: false, hidden: false };
  assert.equal(timeAdvances(base), true);
  for (const key of ['paused', 'backpackOpen', 'optionsOpen', 'hidden']) assert.equal(timeAdvances({ ...base, [key]: true }), false);
  assert.equal(timeAdvances({ ...base, running: false }), false);
  assert.equal(timeAdvances({ ...base, paused: true, backpackOpen: false }), false);
});
test('core control and inventory labels are available in both languages', () => {
  for (const key of ['start', 'options', 'brightness', 'sensitivity', 'invertY', 'backpack', 'backpackNote', 'tent', 'stand', 'crouched', 'proneState', 'airborne']) {
    assert.notEqual(translate(key, 'ko'), key); assert.notEqual(translate(key, 'en'), key);
    assert.notEqual(translate(key, 'ko'), translate(key, 'en'));
  }
});
