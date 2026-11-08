const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const WATER_VEHICLE_SETTINGS=Object.freeze({sedan:{draft:.6,maxSpeed:8},suv:{draft:.65,maxSpeed:9},motorhome:{draft:.75,maxSpeed:6},scooter:{draft:.3,maxSpeed:6}});
/** Keep shallow-water tyre contact; support deep water with buoyancy instead of a depth wall. */
export function vehicleWaterSupport(kind,x,z,heightAt,waterAt){
 const ground=heightAt(x,z),water=waterAt(x,z),settings=WATER_VEHICLE_SETTINGS[kind];
 return settings&&typeof water==='number'&&Number.isFinite(water)?Math.max(ground,water-settings.draft):ground;
}
export function vehicleWaterState(state,heightAt,waterAt){
 const settings=WATER_VEHICLE_SETTINGS[state.kind],water=waterAt(state.x,state.z),ground=heightAt(state.x,state.z);
 if(!settings||typeof water!=='number'||!Number.isFinite(water)||water<=ground)return {immersion:0,floating:false,drag:0,driveScale:1,maxSpeed:Infinity,reverseSpeed:Infinity};
 const immersion=clamp((water-(state.bodyY??ground)+.04)/settings.draft,0,1);
 return {immersion,floating:ground<water-settings.draft,drag:immersion*1.35,driveScale:1-immersion*.5,maxSpeed:settings.maxSpeed,reverseSpeed:settings.maxSpeed*.65};
}
