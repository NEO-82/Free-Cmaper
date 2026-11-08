const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/** Ballistic chassis support: tyres do not pull an airborne vehicle down to the road. */
export function stepVehicleJump(previous,suspension,ground,dt,config,{jump=false,ceiling=Infinity}={}){
 const h=Math.max(0,Math.min(dt,.1)),last=previous.groundHeight??ground.height,rate=clamp((ground.height-last)/Math.max(h,1e-6),-30,30),momentum=previous.groundVerticalSpeed??0;
 let airborne=!!previous.airborne,y=previous.bodyY??ground.height,vy=previous.heaveVelocity??0,launched=false,landed=false,landingSpeed=0;
 const impulse=previous.kind==='motorhome'?6:previous.kind==='scooter'?7:7.4;
 if(!airborne&&jump&&!previous.jumpHeld){airborne=true;vy=Math.max(0,momentum)+impulse;launched=true;}
 if(!airborne&&(ground.height<y-(config.travel??.4)-.12||momentum>1.4&&momentum-rate>2&&y+momentum*h>ground.height+.07)){airborne=true;vy=Math.max(vy,momentum);launched=true;}
 if(airborne){vy-=9.81*h;y+=vy*h;const roof=ceiling-(previous.kind==='motorhome'?4.62:previous.kind==='scooter'?3.4:3.5);if(y>roof){y=roof;vy=Math.min(0,vy);}if(y<=ground.height&&vy<=0){landingSpeed=-vy;y=ground.height;vy=0;airborne=false;landed=true;}}
 else {y=suspension.bodyY;vy=suspension.heaveVelocity;}
 return {...suspension,bodyY:y,heaveVelocity:vy,airborne,grounded:!airborne,contacts:airborne?0:ground.wheels.length,groundHeight:ground.height,groundVerticalSpeed:airborne?momentum:momentum+(rate-momentum)*(1-Math.exp(-10*h)),jumpHeld:!!jump,launched,landed,landingSpeed};
}
