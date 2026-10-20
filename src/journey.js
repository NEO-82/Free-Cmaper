import { WORLD, SHOP, ARRIVAL } from './terrain.js';

export { ARRIVAL };
export const BUS_STOP = Object.freeze({ x: ARRIVAL.x - 20, z: ARRIVAL.z - 5 });
export const TRAIN_STATION = Object.freeze({ x: ARRIVAL.x + 28, z: ARRIVAL.z - 28 });
export const PARKING = Object.freeze({ x: ARRIVAL.x + 8, z: ARRIVAL.z + 18 });
export const TRAVEL_CHOICES = Object.freeze(['bus', 'train', 'sedan', 'suv', 'scooter', 'motorhome']);
export const isPrivateVehicle = kind => ['sedan', 'suv', 'scooter', 'motorhome'].includes(kind);
export function arrivalFor(kind) {
  if (kind === 'train') return { x: TRAIN_STATION.x - 8, z: TRAIN_STATION.z + 11 };
  if (kind === 'bus') return { x: BUS_STOP.x + 4, z: BUS_STOP.z + 7 };
  return { x: PARKING.x - (kind==='scooter'?3:5), z: PARKING.z };
}
export function journeyHours(kind) { return kind === 'bus' ? 2 : kind === 'train' ? 1.5 : kind === 'scooter' ? 1.5 : 1; }
export function arrivalRoadPoint(t) {
  return { x: ARRIVAL.x + (SHOP.x - ARRIVAL.x) * t, z: ARRIVAL.z + (-12 - ARRIVAL.z) * t + Math.sin(t * Math.PI * 2) * 15 };
}
export function nearArrivalRoad(x, z, width = 7) {
  const t = (x - ARRIVAL.x) / (SHOP.x - ARRIVAL.x);
  return t >= -.01 && t <= 1.01 && Math.abs(z - arrivalRoadPoint(Math.max(0, Math.min(1, t))).z) < width;
}
export function arrivalReserved(x, z) { return Math.abs(x - ARRIVAL.x) < 58 && Math.abs(z - ARRIVAL.z) < 54; }
