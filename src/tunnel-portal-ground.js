// Keep the ground below the road; only remove terrain inside the tunnel cavity.
export const TUNNEL_CAVITY_HEIGHT = 11.3;
export function isWithinTunnelCut(height, ceiling, roadFloor = ceiling - TUNNEL_CAVITY_HEIGHT) {
  return Number.isFinite(ceiling) && height > roadFloor - .02 && height < ceiling;
}

/** Cover the exact rasterized excavation footprint, including both portal approaches. */
export function buildPortalFoundation({ data, size, bounds, heightAt = () => Infinity, roadFloor = null }) {
  const positions = [], indices = [], spans = [];
  const dx = (bounds.maxX - bounds.minX) / size, dz = (bounds.maxZ - bounds.minZ) / size;
  let cells = 0;
  const ceilingAt = (x, z) => {
    const gx = Math.floor((x - bounds.minX) / dx), gz = Math.floor((z - bounds.minZ) / dz);
    if (gx < 0 || gz < 0 || gx >= size || gz >= size) return -Infinity;
    const k = (gz * size + gx) * 4;
    return data[k + 2] > 127 ? (data[k] * 256 + data[k + 1]) / 65535 * 512 : -Infinity;
  };
  function floorAt(gx, gz) {
    const k = (gz * size + gx) * 4;
    if (data[k + 2] < 128) return null;
    // Do not pave actual sea outside the island.
    if (heightAt(bounds.minX + (gx + .5) * dx, bounds.minZ + (gz + .5) * dz) <= 0) return null;
    return (roadFloor ?? ((data[k] * 256 + data[k + 1]) / 65535 * 512 - TUNNEL_CAVITY_HEIGHT)) - .12;
  }
  for (let gz = 0; gz < size; gz++) {
    let gx = 0;
    while (gx < size) {
      const floor = floorAt(gx, gz);
      if (floor === null) { gx++; continue; }
      const start = gx++;
      while (gx < size) { const next = floorAt(gx, gz); if (next === null || Math.abs(next - floor) > .0001) break; gx++; }
      const x0 = bounds.minX + start * dx, x1 = bounds.minX + gx * dx;
      const z0 = bounds.minZ + gz * dz, z1 = bounds.minZ + (gz + 1) * dz, index = positions.length / 3;
      positions.push(x0,floor,z0, x0,floor,z1, x1,floor,z0, x1,floor,z1);
      indices.push(index,index+1,index+2, index+2,index+1,index+3);
      spans.push({ x0, x1, z0, z1, floor }); cells += gx - start;
    }
  }
  return { positions, indices, spans, cells, ceilingAt };
}

export function addPortalFoundation({ root, data, size, bounds, heightAt, roadFloor = null, constructors }) {
  const coverage = buildPortalFoundation({ data, size, bounds, heightAt, roadFloor });
  const { BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial } = constructors;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(coverage.positions, 3));
  geometry.setIndex(coverage.indices); geometry.computeVertexNormals();
  const material = new MeshStandardMaterial({ color: '#b9b8a7', roughness: 1, side: 2 });
  const foundation = new Mesh(geometry, material);
  // The existing contact sampler already collects this category of solid floor.
  foundation.name = 'walkable-path'; foundation.userData.tunnelPortalFoundation = true;
  foundation.receiveShadow = true; root.add(foundation);
  root.userData.portalGroundRepair = { foundation, spans: coverage.spans.length, cells: coverage.cells, roadFloor, ceilingAt: coverage.ceilingAt };
  return foundation;
}
