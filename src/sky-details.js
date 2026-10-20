import * as THREE from 'three';
import {createSkySchedule,skyEventState}from './sky-events.js';

/** Distant, fully procedural sky events. All motion uses paused game time. */
export function createSkyDetails(scene,{random=Math.random}={}){
  const schedule=createSkySchedule(random),group=new THREE.Group();group.name='sky-details';scene.add(group);
  const moonUniforms={phase:{value:0},visibility:{value:1}};
  const moon=new THREE.Mesh(new THREE.SphereGeometry(31,32,24),new THREE.ShaderMaterial({uniforms:moonUniforms,transparent:true,depthWrite:false,
    vertexShader:'varying vec3 vNormal;varying vec3 vLocal;void main(){vNormal=normalize(normalMatrix*normal);vLocal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 vNormal;varying vec3 vLocal;uniform float phase;uniform float visibility;
      void main(){vec3 n=normalize(vNormal);float light=smoothstep(-.08,.12,dot(n,normalize(vec3(sin(phase),.12,cos(phase)))));float crater=sin(vLocal.x*29.+sin(vLocal.y*12.))*sin(vLocal.y*23.+vLocal.z*13.);vec3 c=vec3(.85,.91,.91)*(1.-max(0.,crater)*.12);gl_FragColor=vec4(c*(.13+.87*light),visibility);}`,
  }));moon.name='moon-disc';moon.renderOrder=-750;group.add(moon);
  const galaxyUniforms={strength:{value:0}};
  const galaxy=new THREE.Mesh(new THREE.SphereGeometry(4480,40,28),new THREE.ShaderMaterial({uniforms:galaxyUniforms,side:THREE.BackSide,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
    vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 direction;uniform float strength;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){vec3 d=normalize(direction);float band=dot(d,normalize(vec3(.45,.36,.82)));float n=noise(d*22.)*.55+noise(d*65.)*.3+noise(d*170.)*.15;float dust=exp(-band*band*65.)*(.22+n*.85);float rift=1.-exp(-pow(band+.035*sin(d.x*18.),2.)*900.)*.57;float horizon=smoothstep(.03,.20,d.y);vec3 tint=mix(vec3(.24,.26,.46),vec3(.68,.66,.68),n);gl_FragColor=vec4(tint*dust*rift,strength*horizon*.47);}`,
  }));galaxy.name='milky-way';galaxy.renderOrder=-900;galaxy.frustumCulled=false;group.add(galaxy);
  const auroraUniforms={time:{value:0},strength:{value:0}};
  const vertices=[],uvs=[],indices=[];const segments=96;
  for(let i=0;i<=segments;i++)for(let j=0;j<2;j++){
    const a=-1.2+i/segments*2.4,r=3100;vertices.push(Math.sin(a)*r,650+j*1000,-Math.cos(a)*r);uvs.push(i/segments,j);
    if(i<segments&&j===0){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const auroraGeo=new THREE.BufferGeometry();auroraGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));auroraGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));auroraGeo.setIndex(indices);
  const aurora=new THREE.Mesh(auroraGeo,new THREE.ShaderMaterial({uniforms:auroraUniforms,transparent:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false,
    vertexShader:`varying vec2 vUv;uniform float time;void main(){vUv=uv;vec3 p=position;p.y+=sin(uv.x*16.+time*.09)*95.+sin(uv.x*36.-time*.05)*40.;p.z+=sin(uv.x*12.+time*.06)*130.;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`varying vec2 vUv;uniform float time;uniform float strength;void main(){float fold=.5+.5*sin(vUv.x*34.+sin(vUv.x*11.+time*.05)*3.+time*.06);float rays=.6+.4*sin(vUv.x*290.+sin(vUv.x*17.+time*.03)*12.);float low=.13+fold*.13;float glow=exp(-pow((vUv.y-low)*4.2,2.));float fade=smoothstep(0.,.08,vUv.y)*(1.-smoothstep(.4,1.,vUv.y))*smoothstep(0.,.1,vUv.x)*(1.-smoothstep(.9,1.,vUv.x));vec3 c=mix(vec3(.20,.82,.58),vec3(.48,.30,.80),smoothstep(.20,.90,vUv.y));gl_FragColor=vec4(c,strength*glow*fade*rays*.44);}`,
  }));aurora.name='winter-aurora';aurora.frustumCulled=false;group.add(aurora);

  const plane=new THREE.Group();plane.name='distant-airplane';group.add(plane);
  const white=new THREE.MeshBasicMaterial({color:'#f2f3e5',fog:false}),silver=new THREE.MeshBasicMaterial({color:'#aebec0',fog:false});
  const fuselage=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),white);fuselage.scale.set(1.5,1.4,13);plane.add(fuselage);
  function fin(points,material){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));geo.computeVertexNormals();material.side=THREE.DoubleSide;const mesh=new THREE.Mesh(geo,material);plane.add(mesh);return mesh;}
  fin([[0,0,5],[-15,0,-4],[0,0,-1],[0,0,5],[0,0,-1],[15,0,-4]],white);
  fin([[0,0,-8],[-5,0,-12],[0,0,-11],[0,0,-8],[0,0,-11],[5,0,-12]],silver);
  fin([[0,0,-8],[0,5,-12],[0,0,-12]],silver);
  for(const x of [-5,5]){const engine=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),silver);engine.position.set(x,-1,-1);engine.scale.set(.9,1,2.3);plane.add(engine);}
  const trailUniforms={opacity:{value:1}};
  const trailMaterial=new THREE.ShaderMaterial({uniforms:trailUniforms,transparent:true,side:THREE.DoubleSide,depthWrite:false,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 vUv;uniform float opacity;void main(){float soft=exp(-pow((vUv.y-.5)*4.0,2.));float endFade=smoothstep(0.,.2,vUv.x)*(1.-smoothstep(.94,1.,vUv.x));gl_FragColor=vec4(.91,.95,.95,soft*endFade*opacity*.62);}',
  });
  const trails=[];
  for(let side=0;side<2;side++)for(let cross=0;cross<2;cross++){
    const positions=new Float32Array(65*2*3),uv=new Float32Array(65*2*2),ids=[];
    for(let i=0;i<=64;i++)for(let j=0;j<2;j++){uv.set([i/64,j],(i*2+j)*2);if(i<64&&j===0){const k=i*2;ids.push(k,k+1,k+2,k+1,k+3,k+2);}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setIndex(ids);
    const mesh=new THREE.Mesh(geo,trailMaterial);mesh.name='airplane-contrail';mesh.frustumCulled=false;group.add(mesh);trails.push({mesh,side:side?1:-1,cross});
  }
  let state={};
  return {group,schedule,update(hour,weather,elapsed,center,cover,season,sunDirection){
    const event=skyEventState(schedule,elapsed,hour,season,weather,cover),visibility=weather==='clear'?1-cover*.7:weather==='overcast'?.08:weather==='fog'?.02:.015;
    moon.position.copy(sunDirection).multiplyScalar(-4200);moon.position.x+=center.x;moon.position.z+=center.z;moon.visible=moon.position.y>0&&visibility>.03;moonUniforms.visibility.value=visibility;moonUniforms.phase.value=(Math.floor(elapsed/2880)+3)/29.5*Math.PI*2;
    galaxy.position.set(center.x,0,center.z);galaxy.visible=event.galaxy;galaxyUniforms.strength.value=event.clarity*event.darkness;
    aurora.position.set(center.x,0,center.z);aurora.visible=event.aurora;auroraUniforms.strength.value=event.clarity*event.darkness;auroraUniforms.time.value=elapsed;
    plane.visible=!!event.flight&&event.flightProgress<1;trails.forEach(t=>t.mesh.visible=!!event.flight);trailUniforms.opacity.value=visibility*(event.night?.32:1);
    if(event.flight){const f=event.flight,p=event.flightProgress,dx=f.end.x-f.start.x,dz=f.end.z-f.start.z,length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;
      plane.position.set(f.start.x+dx*p,f.start.y,f.start.z+dz*p);plane.rotation.y=f.angle;
      const fade=Math.max(0,1-Math.max(0,elapsed-f.at-f.duration)/45);trailUniforms.opacity.value*=fade;
      for(const trail of trails){const positions=trail.mesh.geometry.attributes.position;const tail=Math.max(0,p-.30);
        for(let i=0;i<=64;i++){const u=i/64,t=tail+(p-tail)*u,width=3+(1-u)*18,drift=Math.sin(t*9)*12*(1-u);
          for(let j=0;j<2;j++){const side=(j?1:-1)*width,x=f.start.x+dx*t-uz*(trail.side*5+drift),z=f.start.z+dz*t+ux*(trail.side*5+drift);positions.setXYZ(i*2+j,x+(trail.cross?0:-uz*side),f.start.y-2+(trail.cross?side:0),z+(trail.cross?0:ux*side));}}
        positions.needsUpdate=true;}
    }
    state={sunAboveHorizon:sunDirection.y>0,moonVisible:moon.visible,starsVisible:event.night&&event.clarity>0,galaxyVisible:galaxy.visible,auroraVisible:aurora.visible,nightIndex:event.nightIndex,galaxyNights:[...schedule.galaxyNights],airplaneVisible:plane.visible,contrailVisible:!!event.flight,flightProgress:event.flightProgress,nextFlight:schedule.flights.find(f=>f.at>elapsed)?.at??null};
  },getState(){return {...state};}};
}
