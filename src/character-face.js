import * as THREE from 'three';

export const CHARACTER_FACE_COLORS=Object.freeze({male:['#ffe0bf','#789aa5'],female:['#ffddc0','#6b8e9f']});
const rgb=hex=>[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
const DARK=rgb('#493b32'),WHITE=rgb('#fffaf0'),PINK=rgb('#f3a9a5'),MASK=rgb('#514c45'),MOUTH=rgb('#804940'),TONGUE=rgb('#e99d93'),IRIS=rgb('#624c41');
const ellipse=(x,y,cx,cy,rx,ry)=>((x-cx)/rx)**2+((y-cy)/ry)**2<=1;
export function faceExpression(time,pose='stand'){
  const t=Math.max(0,Number.isFinite(time)?time:0),phase=t%4.6;
  const blink=phase>3.9&&phase<4.12?Math.abs((phase-4.01)/.11):1;
  const effort=pose==='run'||pose==='swim';
  return {blink:Math.round(Math.max(.06,Math.min(1,blink))*8)/8,mouth:Math.round((effort?.78+.08*Math.sin(t*5):.42+.08*Math.max(0,Math.sin(t*1.5)))*8)/8};
}

/** A single 2D atlas paints the entire head: eyes, nose, mouth and hair are pixels. */
export function createCharacterFace(species='male'){
  const width=1024,height=512,data=new Uint8Array(width*height*4);
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);texture.name='animated-2d-human-face';texture.colorSpace=THREE.SRGBColorSpace;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;
  let current='',state={species,blink:1,mouth:0};
  function update(time=0,pose='stand',nextSpecies=state.species){
    const kind=CHARACTER_FACE_COLORS[nextSpecies]?nextSpecies:'male',expression=faceExpression(time,pose),key=`${kind}:${expression.blink}:${expression.mouth}`;
    if(key===current)return false;current=key;state={species:kind,...expression};
    const fur=rgb(CHARACTER_FACE_COLORS[kind][0]),cream=rgb(CHARACTER_FACE_COLORS[kind][1]);
    for(let row=0;row<height;row++)for(let col=0;col<width;col++){
      // SphereGeometry's front (+Z) is u=.25; data rows run from v=0 at the bottom.
      const x=((col+.5)/width-.25)*Math.PI*2,y=((row+.5)/height-.5)*Math.PI;let color=fur;
      const front=Math.abs(x)<1.3,hairline=.68+.08*Math.sin(x*5)+(kind==='female'?.05*Math.cos(x*3):0);
      if(y>hairline||!front&&y>-.35)color=cream;
      if(Math.abs(x)<1.2){
        if(ellipse(x,y,-.64,-.22,.17,.10)||ellipse(x,y,.64,-.22,.17,.10))color=PINK;
        for(const side of [-1,1]){
          const ex=side*.38,ey=.10;
          if(state.blink>.15){
            if(ellipse(x,y,ex,ey,.17,.17*state.blink))color=DARK;
            if(ellipse(x,y,ex,ey+.015,.125,.13*state.blink))color=IRIS;
            if(ellipse(x,y,ex-.035,ey+.065*state.blink,.032,.043*state.blink))color=WHITE;
          }else if(Math.abs(x-ex)<.15&&Math.abs(y-ey-((x-ex)**2)*.3)<.018)color=DARK;
        }
        if(ellipse(x,y,0,-.20,.025,.025))color=PINK;
        for(const side of [-1,1])if(Math.abs(x-side*.38)<.085&&Math.abs(y-(.36+.10*(x-side*.38)**2))<.012)color=DARK;
        const mouthWidth=.23,lip=-.27-.035*(1-(x/mouthWidth)**2),bottom=-.28-(.20+state.mouth*.15)*Math.sqrt(Math.max(0,1-(x/mouthWidth)**2));
        if(state.mouth>.14&&Math.abs(x)<mouthWidth&&y<lip&&y>bottom){
          color=MOUTH;if(ellipse(x,y,0,-.49,.14,.035+state.mouth*.06))color=TONGUE;
        }
        if(Math.abs(x)<.23&&Math.abs(y-(-.29-.25*(1-(x/.23)**2)))<.012&&state.mouth<.14)color=DARK;

      }
      const i=(row*width+col)*4;data[i]=color[0];data[i+1]=color[1];data[i+2]=color[2];data[i+3]=255;
    }
    texture.needsUpdate=true;return true;
  }
  update(0,'stand',species);
  return {texture,update,getState:()=>({...state}),dispose:()=>texture.dispose()};
}
