/** Clip an orbit camera against nearby canopies/rocks without raycasting every instance. */
export function outdoorCameraPosition(focus, desired, { trees = [], rocks = [], groundHeight = () => -Infinity } = {}) {
  const dx = desired.x - focus.x, dy = desired.y - focus.y, dz = desired.z - focus.z;
  const length = Math.hypot(dx, dy, dz);
  if (!length) return { ...focus };
  let fraction = 1;
  function avoid(cx, cy, cz, rx, ry, rz) {
    const ox = (focus.x - cx) / rx, oy = (focus.y - cy) / ry, oz = (focus.z - cz) / rz;
    const vx = dx / rx, vy = dy / ry, vz = dz / rz;
    const a = vx * vx + vy * vy + vz * vz, b = 2 * (ox * vx + oy * vy + oz * vz), c = ox * ox + oy * oy + oz * oz - 1;
    if (c < 0 || !a) return;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return;
    const entry = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (entry > 0 && entry < fraction) fraction = Math.max(0.12, entry - 0.35 / length);
  }
  for (const tree of trees) {
    if (tree.felled || Math.hypot(tree.x - focus.x, tree.z - focus.z) > length + tree.h * 0.6) continue;
    avoid(tree.x, tree.y + tree.h * 0.76, tree.z, tree.h * 0.46 + 0.2, tree.h * 0.39 + 0.2, tree.h * 0.46 + 0.2);
    avoid(tree.x, tree.y + tree.h * 0.35, tree.z, tree.radius + 0.22, tree.h * 0.5, tree.radius + 0.22);
  }
  for (const rock of rocks) {
    if (rock.mined || rock.collider?.active === false) continue;
    avoid(rock.x, rock.y + rock.radius * 0.6, rock.z, rock.radius + 0.3, rock.radius * 0.9, rock.radius + 0.3);
  }
  const point = { x: focus.x + dx * fraction, y: focus.y + dy * fraction, z: focus.z + dz * fraction };
  point.y = Math.max(point.y, groundHeight(point.x, point.z) + 0.65);
  return point;
}

/** Pixel, line and page wheel deltas share the same bounded camera distance. */
export function zoomDistance(distance, deltaY, deltaMode = 0) {
  if (!Number.isFinite(distance) || !Number.isFinite(deltaY)) return Number.isFinite(distance) ? distance : 9.5;
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? 800 : 1);
  return Math.max(0, Math.min(45, distance + pixels * .025));
}
export const isFirstPerson = distance => distance <= .5;
export function driverEye(kind) {
  return kind === 'motorhome' ? {x:-.55,y:2.9,z:2.7} : kind === 'scooter' ? {x:0,y:2.5,z:-.2} : {x:-.55,y:2.65,z:.65};
}
