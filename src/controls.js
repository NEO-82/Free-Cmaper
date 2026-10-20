export const DEFAULT_OPTIONS = Object.freeze({ brightness: 100, sensitivity: 1, invertX: false, invertY: false, language: 'ko', musicVolume: .35, sfxVolume: .65, muted: false });
export function normalizeOptions(value = {}) {
  const clamp = (v, fallback, min, max) => Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : fallback;
  return {
    brightness: clamp(value?.brightness, 100, 60, 150),
    sensitivity: clamp(value?.sensitivity, 1, 0.2, 3),
    invertX: value?.invertX === true,
    invertY: value?.invertY === true,
    language: value?.language === 'en' ? 'en' : 'ko',
    musicVolume: clamp(value?.musicVolume, .35, 0, 1), sfxVolume: clamp(value?.sfxVolume, .65, 0, 1), muted: value?.muted === true,
  };
}
export function lookAngles(yaw, pitch, dx, dy, options) {
  const rate = 0.003 * options.sensitivity;
  return {
    yaw: yaw - dx * rate * (options.invertX ? -1 : 1),
    pitch: Math.min(1.82, Math.max(-1.22, pitch + dy * rate * (options.invertY ? -1 : 1))),
  };
}
export function movementSpeed(mode, posture, sprint = false, creep = false) {
  const base = mode === 'car' ? 4 : 1.5;
  const stance = posture === 'prone' ? .25 : posture === 'crouch' ? .5 : 1;
  return base * stance * (creep ? .4 : sprint ? 3 : 1);
}
export function togglePosture(current, requested) {
  return current === requested ? 'stand' : requested;
}
export function verticalStep(height, velocity, dt) {
  const nextVelocity = velocity - 18 * dt;
  const nextHeight = height + nextVelocity * dt;
  return nextHeight <= 0 ? { height: 0, velocity: 0 } : { height: nextHeight, velocity: nextVelocity };
}
export function timeAdvances({ running, paused, backpackOpen, optionsOpen, hidden }) {
  return running && !paused && !backpackOpen && !optionsOpen && !hidden;
}
