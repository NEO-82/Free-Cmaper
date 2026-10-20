import * as THREE from 'three';

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
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1450, 32, 18), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms,
    vertexShader: 'varying vec3 direction; void main(){direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 direction; uniform vec3 top; uniform vec3 horizon; uniform vec3 low; uniform vec3 sunDirection; uniform vec3 sunlight;
      void main(){vec3 d=normalize(direction); vec3 c=mix(horizon,top,smoothstep(-.02,.72,d.y)); c=mix(low,c,smoothstep(-.22,.015,d.y));
      float halo=pow(max(dot(d,sunDirection),0.),80.); c+=sunlight*halo*.18; gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -1000; sky.frustumCulled = false; scene.add(sky);
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff2bb', fog: false, toneMapped: false })); scene.add(sunDisc);
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: '#fffdf1', roughness: 1, fog: false });
  const clouds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 9), cloudMaterial, 84);
  clouds.frustumCulled = false; const cloudParts = [], dummy = new THREE.Object3D();
  let seed = 2241; const rand = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 14; i++) {
    const x = rand() * 1400 - 700, z = rand() * 1200 - 650, y = 160 + rand() * 80;
    for (let j = 0; j < 6; j++) cloudParts.push({ x: x + j * 14, y: y + Math.sin(j / 5 * Math.PI) * 12, z: z + Math.sin(j) * 8, size: 13 + rand() * 12 });
  }
  scene.add(clouds);
  const starPositions = new Float32Array(320 * 3);
  for (let i = 0; i < 320; i++) { const a = rand() * Math.PI * 2, h = rand() * 0.9 + 0.1, r = Math.sqrt(1 - h * h); starPositions.set([Math.cos(a) * r * 1100, h * 1100, Math.sin(a) * r * 1100], i * 3); }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#e4f3ff', size: 1.8, transparent: true, opacity: 0.8, fog: false, depthWrite: false })); scene.add(stars);
  let cloudFrame = -1;
  return {
    update(hour, weather, elapsed, center) {
      const day = Math.max(0, Math.sin((hour - 5) / 14 * Math.PI));
      const dawn = hour >= 5 && hour < 8 || hour > 17 && hour < 20;
      const isNight = hour < 5 || hour >= 20;
      uniforms.top.value.set(isNight ? '#112a4c' : dawn ? '#88c0e3' : '#63bde4');
      uniforms.horizon.value.set(isNight ? '#34516c' : dawn ? '#ffe7b5' : '#daf4d9');
      uniforms.low.value.set(isNight ? '#2c4355' : '#a4d7b2');
      const overcast = weather === 'rain' || weather === 'fog' || weather === 'snow';
      if (overcast) { uniforms.top.value.lerp(new THREE.Color('#96b7c9'), 0.5); uniforms.horizon.value.lerp(new THREE.Color('#d4e2df'), 0.4); }
      const a = (hour - 6) / 24 * Math.PI * 2;
      uniforms.sunDirection.value.set(Math.cos(a), Math.sin(a), -0.5).normalize();
      sky.position.set(center.x, 0, center.z); sunDisc.position.copy(uniforms.sunDirection.value).multiplyScalar(1000).add(new THREE.Vector3(center.x, 0, center.z)); sunDisc.visible = !isNight && !overcast;
      const frame = Math.floor(elapsed * 12);
      if (frame !== cloudFrame) {
        cloudFrame = frame;
        cloudParts.forEach((part, i) => { const x = (part.x + elapsed * 0.45 + 750) % 1500 - 750; dummy.position.set(x + center.x * 0.25, part.y, part.z + center.z * 0.25); dummy.scale.set(part.size * 1.4, part.size * 0.55, part.size); dummy.rotation.set(0, i * 0.32, 0); dummy.updateMatrix(); clouds.setMatrixAt(i, dummy.matrix); });
        clouds.instanceMatrix.needsUpdate = true;
      }
      cloudMaterial.color.set(isNight ? '#52677e' : overcast ? '#e2e7e0' : '#fffdf3');
      stars.position.set(center.x, 0, center.z); stars.visible = isNight;
      return { horizon: uniforms.horizon.value, daylight: day };
    },
  };
}
