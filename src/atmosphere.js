import * as THREE from 'three';
import { weatherState } from './weather.js';
import { createSkyDetails } from './sky-details.js';

// All visual assets are generated locally, so the downloadable game stays offline.
export function weatherTextures() {
  const textures = {};
  for (const kind of ['snow', 'blossoms', 'leaves', 'rain']) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d'); ctx.translate(32, 32);
    if (kind === 'rain') {
      const gradient = ctx.createLinearGradient(0, -30, 0, 28);
      gradient.addColorStop(0, 'rgba(220,244,255,0)'); gradient.addColorStop(0.7, 'rgba(226,247,255,.9)'); gradient.addColorStop(1, 'rgba(226,247,255,0)');
      ctx.strokeStyle = gradient; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 28); ctx.stroke();
    } else if (kind === 'blossoms') {
      for (let i = 0; i < 5; i++) { ctx.rotate(Math.PI * 2 / 5); ctx.fillStyle = '#ffe2eb'; ctx.beginPath(); ctx.ellipse(0, -12, 10, 16, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#fff3b7'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'leaves') {
      ctx.fillStyle = '#ffc466'; ctx.beginPath(); ctx.moveTo(0, -28); ctx.bezierCurveTo(37, -7, 20, 26, 0, 25); ctx.bezierCurveTo(-20, 15, -25, -10, 0, -28); ctx.fill();
      ctx.strokeStyle = '#b98236'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -19); ctx.lineTo(0, 27); ctx.stroke();
    } else {
      ctx.strokeStyle = '#f5fcff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -24); ctx.moveTo(0, -14); ctx.lineTo(-7, -21); ctx.moveTo(0, -14); ctx.lineTo(7, -21); ctx.stroke(); }
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures[kind] = texture;
  }
  return textures;
}
export function createAtmosphere(scene) {
  const uniforms = {
    top: { value: new THREE.Color('#65bfe6') }, horizon: { value: new THREE.Color('#d2f0e0') },
    low: { value: new THREE.Color('#b0d5b8') }, sunDirection: { value: new THREE.Vector3(1, 0.3, -0.5).normalize() },
    sunlight: { value: new THREE.Color('#ffe5b9') },
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(6000, 48, 32), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms,
    vertexShader: 'varying vec3 direction; void main(){direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 direction; uniform vec3 top; uniform vec3 horizon; uniform vec3 low; uniform vec3 sunDirection; uniform vec3 sunlight;
      void main(){vec3 d=normalize(direction); vec3 c=mix(horizon,top,smoothstep(-.02,.72,d.y)); c=mix(low,c,smoothstep(-.22,.015,d.y));
      float halo=pow(max(dot(d,sunDirection),0.),80.); c+=sunlight*halo*.18; gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  }));
  sky.name = 'sky-dome'; sky.renderOrder = -1000; sky.frustumCulled = false; scene.add(sky);
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(35, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff2bb', fog: false, toneMapped: false }));
  sunDisc.name = 'sun-disc';sunDisc.material.transparent=true; scene.add(sunDisc);
  const details=createSkyDetails(scene);

  // One draw call for every cloud lobe, including dense layered storm skies.
  const groupCount = 36, lobesPerGroup = 8, fieldSize = 5200;
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: '#fffdf1', roughness: 1, fog: false, emissive: '#24282a' });
  const clouds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 10), cloudMaterial, groupCount * lobesPerGroup);
  clouds.name = 'weather-clouds'; clouds.frustumCulled = false; clouds.count = 0;
  clouds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const cloudParts = [], dummy = new THREE.Object3D(), tint = new THREE.Color();
  let seed = 2241; const rand = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  const cells = Array.from({ length: groupCount }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  for (let i = 0; i < groupCount; i++) {
    const cell = cells[i], x = ((cell % 6 + 0.2 + rand() * 0.6) / 6 - 0.5) * fieldSize;
    const z = ((Math.floor(cell / 6) + 0.2 + rand() * 0.6) / 6 - 0.5) * fieldSize, height = rand();
    for (let j = 0; j < lobesPerGroup; j++) {
      cloudParts.push({ x, z, height, offsetX: (j - 3.5) * 38, offsetZ: Math.sin(j * 1.7) * 42, rise: Math.sin(j / 7 * Math.PI) * 35, size: 65 + rand() * 45 });
      clouds.setColorAt(i * lobesPerGroup + j, tint.setScalar(0.86 + rand() * 0.14));
    }
  }
  scene.add(clouds);
  const starPositions = new Float32Array(1400 * 3);
  for (let i = 0; i < 1400; i++) { const a = rand() * Math.PI * 2, h = rand() * 0.965 + 0.035, r = Math.sqrt(1 - h * h); starPositions.set([Math.cos(a) * r * 4400, h * 4400, Math.sin(a) * r * 4400], i * 3); }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#e4f3ff', size: 1.45, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false, depthWrite: false, toneMapped: false }));
  const starTime={value:0};starGeo.setAttribute('twinkle',new THREE.Float32BufferAttribute(Array.from({length:1400},()=>rand()*Math.PI*2),1));
  stars.material.onBeforeCompile=shader=>{
    shader.uniforms.skyTime=starTime;
    shader.vertexShader='attribute float twinkle;varying float vSpark;uniform float skyTime;\n'+shader.vertexShader.replace('#include <begin_vertex>','vSpark=.68+.32*sin(skyTime*1.3+twinkle);\n#include <begin_vertex>');
    shader.fragmentShader='varying float vSpark;\n'+shader.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );','vec2 starPoint=gl_PointCoord-.5;float glow=smoothstep(.25,.015,dot(starPoint,starPoint));vec4 diffuseColor=vec4(diffuse,opacity*vSpark*glow);');
  };
  stars.name = 'night-stars'; stars.frustumCulled = false; scene.add(stars);
  const styles = {
    clear: { height: 430, spread: 210, width: 1.45, thickness: 0.68, color: '#fffdf3', sky: '#82c4e1', haze: 0 },
    overcast: { height: 360, spread: 125, width: 3.4, thickness: 0.46, color: '#c3cbd0', sky: '#9aaebd', haze: 0.72 },
    rain: { height: 290, spread: 130, width: 3.15, thickness: 0.9, color: '#788996', sky: '#728a9e', haze: 0.9 },
    snow: { height: 320, spread: 150, width: 2.95, thickness: 0.64, color: '#d8dfe3', sky: '#aabdc9', haze: 0.76 },
    fog: { height: 165, spread: 55, width: 4.2, thickness: 0.2, color: '#c3d1ce', sky: '#aebfbd', haze: 0.92 },
  };
  const wrap = value => ((value + fieldSize / 2) % fieldSize + fieldSize) % fieldSize - fieldSize / 2;
  const shade = new THREE.Color(), nightCloud = new THREE.Color('#26374d'), nightSky = new THREE.Color('#25384d');
  let cloudTransformKey = '', state = { cloudCount: 0, cloudCover: 0, weather: 'clear' };
  return {
    update(hour, weather, elapsed, center, profile, season=0) {
      const current = weatherState(weather, profile?.cloudCover), style = styles[weather];
      const cover = current.cloudCover, wind = Number.isFinite(profile?.wind) ? Math.max(0, profile.wind) : current.wind;
      const day = Math.max(0, Math.sin((hour - 5) / 14 * Math.PI));
      const dawn = hour >= 5 && hour < 8 || hour > 17 && hour < 20;
      const isNight = hour < 5 || hour >= 20;
      uniforms.top.value.set(isNight ? '#112a4c' : dawn ? '#88c0e3' : '#63bde4');
      uniforms.horizon.value.set(isNight ? '#34516c' : dawn ? '#ffe7b5' : '#daf4d9');
      uniforms.low.value.set(isNight ? '#2c4355' : '#a4d7b2');
      shade.set(isNight ? nightSky : style.sky);
      uniforms.top.value.lerp(shade, style.haze);
      uniforms.horizon.value.lerp(shade, style.haze * 0.7);
      uniforms.low.value.lerp(shade, style.haze * 0.6);
      const a = (hour - 6) / 24 * Math.PI * 2;
      uniforms.sunDirection.value.set(Math.cos(a), Math.sin(a), -0.5).normalize();
      uniforms.sunlight.value.set(isNight ? '#25334b' : '#ffe5b9').multiplyScalar(1 - style.haze);
      sky.position.set(center.x, 0, center.z);
      sunDisc.position.copy(uniforms.sunDirection.value).multiplyScalar(4200); sunDisc.position.x += center.x; sunDisc.position.z += center.z;
      sunDisc.material.opacity=weather==='clear'?1-cover*.7:weather==='overcast'?.08:0;
      sunDisc.visible=uniforms.sunDirection.value.y>0&&sunDisc.material.opacity>.03;
      details.update(hour,weather,elapsed,center,cover,season,uniforms.sunDirection.value);starTime.value=elapsed;
      clouds.count = cover === 0 ? 0 : Math.max(1, Math.round(groupCount * cover)) * lobesPerGroup;
      clouds.visible = clouds.count > 0;
      const frame = Math.floor(elapsed * 12);
      const transformKey = `${frame}:${weather}:${cover}:${wind}:${Math.floor(center.x / 80)}:${Math.floor(center.z / 80)}`;
      if (transformKey !== cloudTransformKey && clouds.count > 0) {
        cloudTransformKey = transformKey;
        const time = frame / 12;
        for (let i = 0; i < clouds.count; i++) {
          const part = cloudParts[i];
          // World anchored clouds drift continuously; recycling happens beyond the scenery,
          // with a shrinking edge so crossing the large map never reveals a hard wrap.
          const x = wrap(part.x + time * wind * 5 - center.x), z = wrap(part.z + time * wind * 0.75 - center.z);
          const edge = 1 - THREE.MathUtils.smoothstep(Math.max(Math.abs(x), Math.abs(z)), fieldSize * 0.43, fieldSize * 0.5);
          dummy.position.set(center.x + x + part.offsetX * style.width, style.height + part.height * style.spread + part.rise * style.thickness, center.z + z + part.offsetZ * style.width);
          dummy.scale.set(part.size * style.width * edge, part.size * style.thickness * edge, part.size * style.width * 0.7 * edge);
          dummy.rotation.set(0, Math.floor(i / lobesPerGroup) * 0.37, 0); dummy.updateMatrix(); clouds.setMatrixAt(i, dummy.matrix);
        }
        clouds.instanceMatrix.needsUpdate = true;
      }
      cloudMaterial.color.set(style.color);
      if (isNight) cloudMaterial.color.lerp(nightCloud, 0.8);
      else if (dawn) cloudMaterial.color.lerp(shade.set('#ffe6c4'), 0.17 * (1 - style.haze));
      cloudMaterial.emissive.copy(cloudMaterial.color).multiplyScalar(isNight ? 0.08 : 0.16);
      const translucent = weather === 'fog';
      if (cloudMaterial.transparent !== translucent) { cloudMaterial.transparent = translucent; cloudMaterial.depthWrite = !translucent; cloudMaterial.needsUpdate = true; }
      cloudMaterial.opacity = translucent ? 0.48 : 1;
      stars.position.set(center.x, 0, center.z);
      stars.material.opacity = 0.9 * (1 - cover);
      stars.visible = isNight && weather === 'clear' && stars.material.opacity > 0.02;
      state = { cloudCount: clouds.count, cloudCover: cover, weather };
      return { horizon: uniforms.horizon.value, daylight: day };
    },
    getState() { return { ...state }; },
    getSkyState(){return details.getState();},
  };
}
