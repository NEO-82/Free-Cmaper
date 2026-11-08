/** Excavate after road/campsite grading. Include the terrain triangle footprint,
 * so interpolation cannot put a ridge across the water between grid vertices. */
export function createStreamClearance(points, gridStep = 10) {
  const buckets = new Map(), size = 64, footprint = Math.SQRT2 * gridStep;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z;
    const length = Math.hypot(dx, dz), width = Math.max(a.width, b.width) / 2;
    const segment = {a, b, dx, dz, length, width}, margin = width + footprint + 16;
    for (let x = Math.floor((Math.min(a.x,b.x)-margin)/size); x <= Math.floor((Math.max(a.x,b.x)+margin)/size); x++)
      for (let z = Math.floor((Math.min(a.z,b.z)-margin)/size); z <= Math.floor((Math.max(a.z,b.z)+margin)/size); z++) {
        const key = x+':'+z;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(segment);
      }
  }
  return (x, z, terrain) => {
    for (const s of buckets.get(Math.floor(x/size)+':'+Math.floor(z/size)) ?? []) {
      const t = Math.max(0,Math.min(1,((x-s.a.x)*s.dx+(z-s.a.z)*s.dz)/(s.length*s.length||1)));
      const distance = Math.hypot(x-s.a.x-t*s.dx,z-s.a.z-t*s.dz);
      const core = s.width+footprint;
      if (distance >= core+16) continue;
      // The lowest water elevation reachable by a neighbouring triangle matters
      // on the waterfall and steep reaches, not just the nearest centre point.
      const reach = footprint/(s.length||1);
      const low = Math.max(0,Math.min(1,t+(s.b.y<s.a.y?reach:-reach)));
      const bed = s.a.y+(s.b.y-s.a.y)*low-3;
      const u = Math.max(0,Math.min(1,(distance-core)/16));
      const blend = u*u*(3-2*u);
      terrain = Math.min(terrain,bed+(terrain-bed)*blend);
    }
    return terrain;
  };
}
