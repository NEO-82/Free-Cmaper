// Shared world coordinates and collision math. Keep independent of Three.js so
// hiking, terrain sampling and tests all use exactly the same surface.
export const WORLD = Object.freeze({ minX: -870, maxX: 870, minZ: -690, maxZ: 690, landMaxX: 285 });
// The unreachable ring has twice the playable area; total scenery is 3×.
export const SCENERY = Object.freeze({ minX: WORLD.minX * Math.sqrt(3), maxX: WORLD.maxX * Math.sqrt(3), minZ: WORLD.minZ * Math.sqrt(3), maxZ: WORLD.maxZ * Math.sqrt(3) });
export const SHOP = Object.freeze({ x: -30, z: -35 });
export const SUMMIT = Object.freeze({ x: -145, z: -195, radius: 20, height: 88 });
export const LAKE = Object.freeze({ x: -160, z: 250, radiusX: 55, radiusZ: 42 });
export const RIVER_START = 280;
export const COAST_START = 250;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function riverX(z) { return LAKE.x + Math.sin((z - RIVER_START) * 0.03) * 19; }
export function isWater(x, z) {
  if (x >= WORLD.landMaxX) return true;
  const lake = ((x - LAKE.x) / LAKE.radiusX) ** 2 + ((z - LAKE.z) / LAKE.radiusZ) ** 2;
  return lake < 1 || (z >= RIVER_START && Math.abs(x - riverX(z)) < 5.5);
}
export function terrainHeight(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return 0;
  const r = Math.hypot(x - SUMMIT.x, z - SUMMIT.z);
  if (r <= SUMMIT.radius) return SUMMIT.height;
  let h = 2.5 + Math.sin(x * 0.026) * Math.cos(z * 0.021) * 2.2 + Math.sin(x * 0.012 + z * 0.041) * 1.15;
  const mountain = 85.5 * (1 - smooth(20, 162, r));
  const westRidge = 32 * Math.exp(-(((x + 290) / 59) ** 2 + ((z + 234) / 66) ** 2));
  const northRidge = 22 * Math.exp(-(((x - 8) / 64) ** 2 + ((z + 250) / 42) ** 2));
  const roughness = Math.sin(x * 0.1 + z * 0.032) * Math.sin(z * 0.08) * 2.1 * smooth(23, 70, r);
  const frontierRidge = 43 * Math.exp(-(((x + 405) / 88) ** 2 + ((z + 140) / 130) ** 2)) + 32 * Math.exp(-(((x + 255) / 108) ** 2 + ((z + 365) / 58) ** 2));
  h += mountain + westRidge + northRidge + frontierRidge + roughness * Math.min(1, mountain / 30);
  // Blend into an exactly level 40 m wide summit, with no ledge to climb over.
  h = SUMMIT.height * (1 - smooth(20, 29, r)) + h * smooth(20, 29, r);
  const outsideShop = Math.hypot(Math.max(-46 - x, 0, x + 14), Math.max(-50 - z, 0, z + 18));
  const shopBlend = 1 - smooth(0, 12, outsideShop);
  h = h * (1 - shopBlend) + 2.5 * shopBlend;
  const coast = smooth(COAST_START, WORLD.landMaxX + 8, x);
  h = h * (1 - coast) - coast * 2.8;
  if (x >= WORLD.landMaxX) h = -3.5 - Math.min(5, (x - WORLD.landMaxX) * 0.025);
  if (((x - LAKE.x) / LAKE.radiusX) ** 2 + ((z - LAKE.z) / LAKE.radiusZ) ** 2 < 1) h = -3;
  if (z >= RIVER_START && Math.abs(x - riverX(z)) < 5.5) h = -2.4;
  return h;
}
const trail = [
  [-40, -56], [-78, -82], [-142, -90], [-185, -113],
  [-188, -145], [-120, -161], [-96, -181], [-145, -195],
];
export function trailPoint(t) {
  const u = clamp(t, 0, 1) * (trail.length - 1), segment = Math.min(trail.length - 2, Math.floor(u)), f = u - segment;
  const p0 = trail[Math.max(0, segment - 1)], p1 = trail[segment], p2 = trail[segment + 1], p3 = trail[Math.min(trail.length - 1, segment + 2)];
  const catmull = i => 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * f + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * f * f + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * f * f * f);
  return { x: catmull(0), z: catmull(1) };
}
export function circleOverlaps(x, z, radius, collider) {
  if (collider.active === false) return false;
  if (collider.kind === 'circle') return Math.hypot(x - collider.x, z - collider.z) < radius + collider.radius;
  if (collider.kind === 'box') {
    const nearX = clamp(x, collider.minX, collider.maxX), nearZ = clamp(z, collider.minZ, collider.maxZ);
    return Math.hypot(x - nearX, z - nearZ) < radius;
  }
  return false;
}
export function canOccupy(x, z, colliders = [], radius = 0.55, { allowWater = false } = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (x < WORLD.minX + radius || x > WORLD.maxX - radius || z < WORLD.minZ + radius || z > WORLD.maxZ - radius) return false;
  if (!allowWater) {
    if (isWater(x, z) || (x > COAST_START && terrainHeight(x, z) < .15)) return false;
    for (let i = 0; i < 8; i++) if (isWater(x + Math.cos(i * Math.PI / 4) * radius, z + Math.sin(i * Math.PI / 4) * radius)) return false;
  }
  return !colliders.some(c => circleOverlaps(x, z, radius, c));
}
export function resolveMovement(position, delta, colliders = [], radius = 0.55, options = {}) {
  if (![position.x, position.z, delta.x, delta.z].every(Number.isFinite)) return { x: position.x, z: position.z };
  let x = position.x, z = position.z;
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / Math.max(0.15, radius * 0.65)));
  const dx = delta.x / steps, dz = delta.z / steps;
  for (let i = 0; i < steps; i++) {
    if (canOccupy(x + dx, z + dz, colliders, radius, options)) { x += dx; z += dz; }
    else {
      if (canOccupy(x + dx, z, colliders, radius, options)) x += dx;
      if (canOccupy(x, z + dz, colliders, radius, options)) z += dz;
    }
  }
  return { x, z };
}
