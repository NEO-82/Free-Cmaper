export const DEFAULT_OPTIONS = Object.freeze({ brightness: 100, sensitivity: 1, invertX: false, invertY: false, language: 'ko' });
export function normalizeOptions(value = {}) {
  const clamp = (v, fallback, min, max) => Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : fallback;
  return {
    brightness: clamp(value?.brightness, 100, 60, 150),
    sensitivity: clamp(value?.sensitivity, 1, 0.2, 3),
    invertX: value?.invertX === true,
    invertY: value?.invertY === true,
    language: value?.language === 'en' ? 'en' : 'ko',
  };
}
export function lookAngles(yaw, pitch, dx, dy, options) {
  const rate = 0.003 * options.sensitivity;
  return {
    yaw: yaw - dx * rate * (options.invertX ? -1 : 1),
    pitch: Math.min(1.3, Math.max(0.12, pitch + dy * rate * (options.invertY ? -1 : 1))),
  };
}
export function movementSpeed(mode, posture, slow) {
  return (mode === 'car' ? 8 : 3) * (posture === 'prone' ? 0.25 : posture === 'crouch' ? 0.5 : 1) * (slow ? 0.35 : 1);
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
