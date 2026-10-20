import { canOccupy, terrainHeight } from './terrain.js';

const SIZE_SCALE = Object.freeze({ standard: 1, large: 1.25, family: 1.5 });

/** Test the entire proposed footprint, including objects between terrain samples. */
export function footprintClear({ x, z, width, depth }, colliders = [], margin = 0.6) {
  if (![x, z, width, depth, margin].every(Number.isFinite) || width <= 0 || depth <= 0 || margin < 0) return false;
  const minX = x - width / 2 - margin, maxX = x + width / 2 + margin;
  const minZ = z - depth / 2 - margin, maxZ = z + depth / 2 + margin;
  return !colliders.some(c => {
    if (c.active === false) return false;
    if (c.kind === 'box') return c.maxX > minX && c.minX < maxX && c.maxZ > minZ && c.minZ < maxZ;
    if (c.kind === 'circle') {
      const nearX = Math.max(minX, Math.min(maxX, c.x)), nearZ = Math.max(minZ, Math.min(maxZ, c.z));
      return (c.x - nearX) ** 2 + (c.z - nearZ) ** 2 < c.radius ** 2;
    }
    return false;
  });
}

/** Keep tent walls, floor and entry above usable land; no teleport or terrain edits. */
export function findCampLocation(player, tentConfig = {}, colliders = []) {
  if (![player?.x, player?.z].every(Number.isFinite)) return null;
  const scale = SIZE_SCALE[tentConfig?.size] ?? 1;
  const width = 9 * scale, depth = 8 * scale, halfW = width / 2, halfD = depth / 2;
  const offsets = [[8 * scale, 0], [-8 * scale, 0], [0, -9 * scale], [0, 9 * scale], [0, 0]];
  for (const [ox, oz] of offsets) {
    const x = player.x + ox, z = player.z + oz;
    if (!footprintClear({ x, z, width, depth }, colliders)) continue;
    const heights = [];
    let valid = true;
    for (let i = 0; i <= 4 && valid; i++) for (let j = 0; j <= 4; j++) {
      const sx = x - halfW + i / 4 * width, sz = z - halfD + j / 4 * depth;
      if (!canOccupy(sx, sz, colliders, .9)) { valid = false; break; }
      heights.push(terrainHeight(sx, sz));
    }
    if (valid && Math.max(...heights) - Math.min(...heights) < 1.6) return { x, z, y: Math.max(...heights) + .03 };
  }
  return null;
}
