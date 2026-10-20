import * as THREE from 'three';
import { WORLD, COAST_START, terrainHeight } from './terrain.js';

/** Still-water coastline follows the real beach rather than a straight decoration. */
export function shorelineX(z) {
  let lo=COAST_START,hi=WORLD.landMaxX;
  for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(terrainHeight(mid,z)>0)lo=mid;else hi=mid;}
  return (lo+hi)/2;
}
export function shoreWaveHeight(distance,z,time) {
  const fade=Math.max(0,1-distance/70);
  return .025+(.065+.045*Math.sin(distance*.7+time*.9+Math.sin(z*.025)*.35)+.015*Math.sin(distance*1.3+time*1.2))*fade;
}
export function foamFront(z,time) {return 2+1.2*Math.sin(time*.8+z*.023);}

/** A bounded strip, animated entirely on the GPU; no collision or swimming changes. */
export function createShoreWaves(parent) {
  const across=64,along=320,positions=[],distances=[],indices=[];
  for(let row=0;row<=along;row++){
    const z=WORLD.minZ+(WORLD.maxZ-WORLD.minZ)*row/along,shore=shorelineX(z);
    for(let col=0;col<=across;col++){
      const d=-.8+70.8*col/across;positions.push(shore+d,.05,z);distances.push(d);
      if(row&&col<across){const a=row*(across+1)+col,b=a-across-1;indices.push(b,b+1,a,b+1,a+1,a);}
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('shoreDistance',new THREE.Float32BufferAttribute(distances,1));geometry.setIndex(indices);
  const uniforms=THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{waveTime:{value:0},waterColor:{value:new THREE.Color('#52c4bf')},foamColor:{value:new THREE.Color('#e8fff1')}}]);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:true,uniforms,
    vertexShader:`attribute float shoreDistance; uniform float waveTime; varying float vDistance; varying float vAlong;
      #include <fog_pars_vertex>
      void main(){vDistance=shoreDistance;vAlong=position.z;
        vec3 transformed=position;
        float phase=shoreDistance*.7+waveTime*.9+sin(position.z*.025)*.35;
        transformed.y=.025+(.065+.045*sin(phase)+.015*sin(shoreDistance*1.3+waveTime*1.2))*max(0.,1.-shoreDistance/70.);
        vec4 mvPosition=modelViewMatrix*vec4(transformed,1.);gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader:`uniform float waveTime;uniform vec3 waterColor;uniform vec3 foamColor;varying float vDistance;varying float vAlong;
      #include <fog_pars_fragment>
      void main(){
        float phase=vDistance*.7+waveTime*.9+sin(vAlong*.025)*.35;
        float front=2.+1.2*sin(waveTime*.8+vAlong*.023);
        float wash=exp(-pow((vDistance-front)/.48,2.))*(.38+.18*sin(waveTime*.8+vAlong*.023));
        float crest=smoothstep(.89,.995,sin(phase))*.12;
        float broken=.7+.3*sin(vAlong*.9+sin(vAlong*.15)*2.);
        float foam=clamp((wash+crest)*broken,0.,.65);
        float edge=smoothstep(-.8,.2,vDistance)*(1.-smoothstep(42.,70.,vDistance));
        gl_FragColor=vec4(mix(waterColor,foamColor,foam),edge*(.25+foam*.75));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const surface=new THREE.Mesh(geometry,material);surface.name='gentle-shore-waves';surface.renderOrder=2;surface.frustumCulled=false;parent.add(surface);
  return {surface,update(time){uniforms.waveTime.value=time;},getState(){return {time:uniforms.waveTime.value,maxHeight:.16,vertices:geometry.attributes.position.count};},dispose(){surface.removeFromParent();geometry.dispose();material.dispose();}};
}
