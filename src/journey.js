import { ARRIVAL, BRIDGE, ROAD_NETWORK, roadPoint, roadDistance } from './terrain.js';
export { ARRIVAL };
export const PARKING=Object.freeze({x:ARRIVAL.x,z:ARRIVAL.z});
export const TRAVEL_CHOICES=Object.freeze(['scooter','sedan','suv','motorhome']);
export const STARTING_GEAR=Object.freeze(['tent','bedding','clothing','cookware','food','survival']);
export const isPrivateVehicle=kind=>TRAVEL_CHOICES.includes(kind);
export function arrivalFor(kind='sedan'){return {x:PARKING.x,z:PARKING.z+(kind==='motorhome'?6.2:kind==='scooter'?3.2:4.5)};}
export function journeyHours(){return 0;}
export function arrivalRoadPoint(t){return roadPoint(t);}
export function nearArrivalRoad(x,z,width=10){return roadDistance(x,z)<width;}
export function arrivalReserved(x,z){return Math.abs(x-ARRIVAL.x)<90&&Math.abs(z-ARRIVAL.z)<95;}
