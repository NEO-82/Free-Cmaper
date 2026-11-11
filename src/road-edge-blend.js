const smooth = t => t*t*(3-2*t);

/** Hidden approach support prevents the 10m terrain grid from interpolating
 * the bridge's submerged bed onto the land approach. The bridge footprint
 * remains clipped on CPU/GPU, so this never adds visible land under the span. */
export function bridgeBedHeight(bridge,x,z,gridStep) {
  const edge = Math.min(x-bridge.startX,bridge.endX-x);
  return edge>=0 && edge<gridStep*Math.SQRT2+2 &&
    Math.abs(z-bridge.z)<bridge.width/2+gridStep*Math.SQRT2+8 ? bridge.height : -5;
}

/** A continuous shoulder-to-ground ramp, shared by rendering and walking.
 * Do not omit faces because of a height mismatch: that is when they matter most.
 * Rows follow exactly the same averaged tangent as the road mesh. */
export function buildRoadEdgeBlend(road, side, {heightAt, excludedAt = () => false, width = 6}) {
  const positions = [], indices = [], columns = 4;
  const track = road.track;
  const enabled = [];
  track.forEach((p, i) => {
    const a = track[Math.max(0,i-1)], b = track[Math.min(track.length-1,i+1)];
    const dx = b.x-a.x, dz = b.z-a.z, length = Math.hypot(dx,dz)||1;
    enabled.push(!p.tunnel && !excludedAt(p.x,p.z));
    for (let j=0; j<columns; j++) {
      const t = j/(columns-1), offset = side*(road.width/2-.05+width*t);
      const x = p.x+dz/length*offset, z = p.z-dx/length*offset;
      const ground = heightAt(x,z), blend = smooth(t);
      const y = (p.y+.005)*(1-blend)+(ground-.04)*blend;
      positions.push(x,y,z);
    }
    if (!i || !enabled[i] || !enabled[i-1]) return;
    // Keep waterways open and leave the starting bridge unsupported over water.
    const prev = track[i-1];
    if (excludedAt((p.x+prev.x)/2,(p.z+prev.z)/2)) return;
    for (let j=0;j<columns-1;j++) {
      const k = i*columns+j, a = k-columns;
      const x = (positions[k*3]+positions[(k+1)*3]+positions[a*3]+positions[(a+1)*3])/4;
      const z = (positions[k*3+2]+positions[(k+1)*3+2]+positions[a*3+2]+positions[(a+1)*3+2])/4;
      if (excludedAt(x,z) || [a,a+1,k,k+1].some(v=>excludedAt(positions[v*3],positions[v*3+2]))) continue;
      indices.push(a,k,a+1,a+1,k,k+1);
    }
  });
  return {positions,indices,columns};
}
