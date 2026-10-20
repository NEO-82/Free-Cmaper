import { WORLD, SHOP, SUMMIT, LAKE, terrainHeight, isWater, COAST_START } from './terrain.js';
import { ARRIVAL, BUS_STOP, TRAIN_STATION, arrivalRoadPoint } from './journey.js';
export function mapPoint(x, z, width, height) { return { x: (x - WORLD.minX) / (WORLD.maxX - WORLD.minX) * width, y: (z - WORLD.minZ) / (WORLD.maxZ - WORLD.minZ) * height }; }
export function createWorldMap(canvas) {
  const width = 1000, height = Math.round(width * (WORLD.maxZ - WORLD.minZ) / (WORLD.maxX - WORLD.minX));
  canvas.width = width; canvas.height = height;
  const base = document.createElement('canvas'); base.width = 200; base.height = Math.round(200 * height / width);
  const b = base.getContext('2d');
  for (let px = 0; px < base.width; px++) for (let py = 0; py < base.height; py++) {
    const x = WORLD.minX + px / base.width * (WORLD.maxX - WORLD.minX), z = WORLD.minZ + py / base.height * (WORLD.maxZ - WORLD.minZ), y = terrainHeight(x, z);
    b.fillStyle = isWater(x, z) ? '#88c9cf' : x > COAST_START ? '#ead2a0' : y > 130 ? '#c2b69d' : y > 65 ? '#a6ac87' : y > 25 ? '#a3bc88' : '#bdd49b'; b.fillRect(px, py, 1, 1);
  }
  return { draw({ player, vehicle, camp, heading = 0, t }) {
    const c = canvas.getContext('2d'); c.drawImage(base, 0, 0, width, height);
    const point = (x, z) => mapPoint(x, z, width, height);
    const road = Array.from({ length: 121 }, (_, i) => arrivalRoadPoint(i / 120));
    c.strokeStyle = '#f8e5b4'; c.lineWidth = 4; c.beginPath(); road.forEach((p, i) => { const a = point(p.x, p.z); if (!i) c.moveTo(a.x, a.y); else c.lineTo(a.x, a.y); }); c.stroke();
    function marker(x, z, text, color = '#5b7057', dx = 10, dy = -10) {
      const p = point(x, z); c.fillStyle = color; c.strokeStyle = '#fff8df'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, 5, 0, Math.PI * 2); c.fill(); c.stroke();
      c.font = 'bold 15px sans-serif'; c.lineWidth = 4; c.textAlign = dx < 0 ? 'right' : 'left'; c.strokeText(text, p.x + dx, p.y + dy); c.fillText(text, p.x + dx, p.y + dy);
    }
    marker(ARRIVAL.x, ARRIVAL.z, t('arrivalGateway'), '#779078', 14, -32);
    marker(BUS_STOP.x, BUS_STOP.z, t('busStop'), '#5e8c80', 14, -8);
    marker(TRAIN_STATION.x, TRAIN_STATION.z, t('trainStation'), '#a0835b', 14, 34);
    marker(SHOP.x, SHOP.z, t('shop'), '#987b57'); marker(SUMMIT.x, SUMMIT.z, t('summit'), '#7d7465'); marker(LAKE.x, LAKE.z, t('lakeside'), '#5d9eaa');
    if (camp) marker(camp.x, camp.z, t('mapCamp'), '#bf8862', 10, 23);
    if (vehicle) marker(vehicle.x, vehicle.z, t(vehicle.kind), '#ba9471', 12, 56);
    const p = point(player.x, player.z); c.save(); c.translate(p.x, p.y); c.rotate(-heading); c.fillStyle = '#d47b64'; c.strokeStyle = '#fff9e6'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 11); c.lineTo(-8, -8); c.lineTo(0, -4); c.lineTo(8, -8); c.closePath(); c.fill(); c.stroke(); c.restore();
    c.strokeStyle = '#fcf6df'; c.lineWidth = 5; c.strokeRect(2, 2, width - 4, height - 4);
  } };
}
