import * as THREE from 'three';

export const ANIMAL_FACE_COLORS=Object.freeze({puppy:['#e9bb68','#fff0c8'],cat:['#c99462','#f8e4ca'],sheep:['#e0cfb0','#fff7e3'],raccoon:['#9b9182','#e9e0ce'],deer:['#b98151','#f9e3ba']});
const rgb=hex=>[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
const DARK=rgb('#34332d'),WHITE=rgb('#fffaf0'),PINK=rgb('#e9a094'),MASK=rgb('#514c45'),MOUTH=rgb('#804940'),TONGUE=rgb('#e99d93');
const ellipse=(x,y,cx,cy,rx,ry)=>((x-cx)/rx)**2+((y-cy)/ry)**2<=1;
export function faceExpression(time,pose='stand'){
  const t=Math.max(0,Number.isFinite(time)?time:0),phase=t%4.6;
  const blink=phase>3.9&&phase<4.12?Math.abs((phase-4.01)/.11):1;
  const effort=pose==='run'||pose==='swim';
  return {blink:Math.round(Math.max(.06,Math.min(1,blink))*8)/8,mouth:Math.round((effort?.55+.25*Math.sin(t*5):.08+.16*Math.max(0,Math.sin(t*1.5)))*8)/8};
}

/** A single 2D atlas paints the entire head: eyes, nose, mouth and markings are pixels. */
export function createAnimalFace(species='puppy'){
  const width=1024,height=512,data=new Uint8Array(width*height*4);
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);texture.name='animated-2d-animal-face';texture.colorSpace=THREE.SRGBColorSpace;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;
  let current='',state={species,blink:1,mouth:0};
  function update(time=0,pose='stand',nextSpecies=state.species){
    const kind=ANIMAL_FACE_COLORS[nextSpecies]?nextSpecies:'puppy',expression=faceExpression(time,pose),key=`${kind}:${expression.blink}:${expression.mouth}`;
    if(key===current)return false;current=key;state={species:kind,...expression};
    const fur=rgb(ANIMAL_FACE_COLORS[kind][0]),cream=rgb(ANIMAL_FACE_COLORS[kind][1]);
    for(let row=0;row<height;row++)for(let col=0;col<width;col++){
      // SphereGeometry's front (+Z) is u=.25; data rows run from v=0 at the bottom.
      const x=((col+.5)/width-.25)*Math.PI*2,y=((row+.5)/height-.5)*Math.PI;let color=fur;
      if(Math.abs(x)<1.2){
        if(ellipse(x,y,0,-.27,.5,.31))color=cream;
        if(kind==='raccoon'&&(ellipse(x,y,-.38,.08,.34,.29)||ellipse(x,y,.38,.08,.34,.29)||ellipse(x,y,0,.08,.3,.13)))color=MASK;
        if(kind==='deer'&&y>.45&&y<.55&&Math.abs(Math.abs(x)-.38)<.05)color=cream;
        if(ellipse(x,y,-.65,-.23,.11,.055)||ellipse(x,y,.65,-.23,.11,.055))color=PINK;
        for(const side of [-1,1]){
          const ex=side*.38,ey=.10;
          if(state.blink>.15){
            if(ellipse(x,y,ex,ey,.17,.225*state.blink))color=WHITE;
            if(ellipse(x,y,ex,ey-.015,.115,.18*state.blink))color=DARK;
            if(ellipse(x,y,ex-.035,ey+.065*state.blink,.032,.043*state.blink))color=WHITE;
          }else if(Math.abs(x-ex)<.15&&Math.abs(y-ey-((x-ex)**2)*.3)<.018)color=DARK;
        }
        if(ellipse(x,y,0,-.20,kind==='cat'?.065:.11,.062))color=kind==='cat'?PINK:DARK;
        if(Math.abs(x)<.014&&y<-.245&&y>-.39)color=DARK;
        if(state.mouth>.14&&ellipse(x,y,0,-.44,.15,.04+state.mouth*.12)){
          color=MOUTH;if(ellipse(x,y,0,-.48,.09,state.mouth*.06))color=TONGUE;
        }
        if(Math.abs(x)<.23&&Math.abs(y-(-.43+.65*x*x))<.017)color=DARK;
        if(kind==='cat'&&Math.abs(x)>.48&&Math.abs(x)<.88){for(const offset of [-.07,0,.07])if(Math.abs(y-(-.26+offset+(Math.abs(x)-.48)*offset))<.009)color=cream;}
      }
      const i=(row*width+col)*4;data[i]=color[0];data[i+1]=color[1];data[i+2]=color[2];data[i+3]=255;
    }
    texture.needsUpdate=true;return true;
  }
  update(0,'stand',species);
  return {texture,update,getState:()=>({...state}),dispose:()=>texture.dispose()};
}
