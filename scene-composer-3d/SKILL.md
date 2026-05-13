---
name: scene-composer-3d
description: >
  Compose polished, real-life-looking 3D scenes combining multiple elements — vehicles, 
  nature, architecture, atmospheric effects, animated characters, weather — into a single 
  cohesive interactive experience with professional UI/UX design. Use this skill whenever 
  the user wants to combine multiple 3D subjects together ("car on a beach", "city near 
  water", "coastal city map", "sunset beach with palm trees and road"), wants cinematic 
  camera effects, atmospheric realism (rain, fog, god rays, reflections), an interactive 
  scene explorer, or a "real-life" looking 3D environment that goes beyond a single object. 
  Also trigger for "immersive 3D experience", "realistic environment", "scene with 
  atmosphere", "cinematic render", "animated scene", or when a user's request naturally 
  calls for combining elements from the 3d-realworld-renderer and interactive-map-3d skills. 
  Delivers single self-contained HTML files.
---

# Scene Composer 3D Skill

Orchestrates multiple 3D subjects (cars, beaches, cities, terrain, vehicles) into unified, 
cinematic, interactive browser experiences — like a real-time game engine demo, but 
delivered as a single HTML file.

---

## Design Principles

1. **Cinematic first** — ACESFilmic tone mapping, bloom, depth-of-field-like fog
2. **Touch-native** — OrbitControls + custom gesture handling for mobile
3. **Layered atmosphere** — fog + sky gradient + environmental lighting
4. **Real design** — glassmorphism HUD, smooth transitions, animated UI
5. **Performance** — LOD strategy, instanced meshes for repeated objects

---

## Master Scene Setup

```javascript
function createMasterScene() {
  // RENDERER
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.physicallyCorrectLights = true;
  document.body.appendChild(renderer.domElement);

  // SCENE
  const scene = new THREE.Scene();

  // CAMERA
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 3000);
  camera.position.set(0, 12, 30);

  // CONTROLS
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minDistance = 3;
  controls.maxDistance = 500;
  controls.target.set(0, 0, 0);

  // RESIZE
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera, controls };
}
```

---

## Atmosphere System

```javascript
function setupAtmosphere(scene, renderer, preset = 'golden_hour') {
  const presets = {
    clear_day: {
      fogColor: 0x87ceeb, fogDensity: 0.004,
      skyTop: 0x1a6fa8, skyBottom: 0x87ceeb,
      sunColor: 0xfff5e0, sunIntensity: 2.5, sunPos: [80, 120, 50],
      ambientColor: 0x404060, ambientIntensity: 0.4,
      exposure: 1.0,
    },
    golden_hour: {
      fogColor: 0xff9966, fogDensity: 0.006,
      skyTop: 0x1a1a4a, skyBottom: 0xff6633,
      sunColor: 0xff8833, sunIntensity: 2.0, sunPos: [-100, 20, 30],
      ambientColor: 0x664422, ambientIntensity: 0.5,
      exposure: 1.2,
    },
    night: {
      fogColor: 0x020210, fogDensity: 0.012,
      skyTop: 0x020210, skyBottom: 0x0a0a30,
      sunColor: 0x8899bb, sunIntensity: 0.2, sunPos: [-80, 100, -40],
      ambientColor: 0x0a0a2e, ambientIntensity: 0.3,
      exposure: 0.6,
    },
    overcast: {
      fogColor: 0xaaaaaa, fogDensity: 0.008,
      skyTop: 0x888888, skyBottom: 0xcccccc,
      sunColor: 0xddddee, sunIntensity: 1.0, sunPos: [20, 100, 20],
      ambientColor: 0x999999, ambientIntensity: 0.6,
      exposure: 0.9,
    },
    storm: {
      fogColor: 0x333344, fogDensity: 0.015,
      skyTop: 0x111122, skyBottom: 0x334455,
      sunColor: 0x445566, sunIntensity: 0.5, sunPos: [40, 80, 10],
      ambientColor: 0x223344, ambientIntensity: 0.4,
      exposure: 0.7,
    },
  };

  const p = presets[preset] || presets.clear_day;

  // Fog
  scene.fog = new THREE.FogExp2(p.fogColor, p.fogDensity);

  // Sky dome (gradient shader)
  const skyGeo = new THREE.SphereGeometry(1200, 32, 32);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor:    { value: new THREE.Color(p.skyTop) },
      bottomColor: { value: new THREE.Color(p.skyBottom) },
      offset:      { value: 600 },
      exponent:    { value: 0.5 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor, bottomColor;
      uniform float offset, exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h,0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // Sun / directional light
  const sun = new THREE.DirectionalLight(p.sunColor, p.sunIntensity);
  sun.position.set(...p.sunPos);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 4096;
  sun.shadow.mapSize.height = 4096;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 600;
  sun.shadow.camera.left = -150;
  sun.shadow.camera.right = 150;
  sun.shadow.camera.top = 150;
  sun.shadow.camera.bottom = -150;
  sun.shadow.bias = -0.0001;
  scene.add(sun);

  // Hemisphere sky fill
  const hemi = new THREE.HemisphereLight(p.skyTop, 0x3a3a20, 0.5);
  scene.add(hemi);

  // Ambient
  const ambient = new THREE.AmbientLight(p.ambientColor, p.ambientIntensity);
  scene.add(ambient);

  // Exposure
  renderer.toneMappingExposure = p.exposure;

  return { sun, skyMat, presets };
}
```

---

## Weather Particle Systems

### Rain
```javascript
function createRain(scene, intensity = 500) {
  const geo = new THREE.BufferGeometry();
  const positions = [];
  const velocities = [];

  for (let i = 0; i < intensity; i++) {
    positions.push(
      (Math.random() - 0.5) * 200,
      Math.random() * 80,
      (Math.random() - 0.5) * 200
    );
    velocities.push(0, -0.5 - Math.random() * 0.5, 0);
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xaaccff, size: 0.15, transparent: true, opacity: 0.5,
  });
  const rain = new THREE.Points(geo, mat);
  scene.add(rain);

  function animateRain() {
    const pos = rain.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, pos.getY(i) + velocities[i * 3 + 1]);
      if (pos.getY(i) < 0) pos.setY(i, 80);
    }
    pos.needsUpdate = true;
  }

  return { animateRain, rain };
}
```

### Fog Volumetric (low-lying mist)
```javascript
function createGroundFog(scene) {
  const fogGeo = new THREE.PlaneGeometry(300, 300, 20, 20);
  const fogMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, transparent: true, opacity: 0.12,
    depthWrite: false, roughness: 1,
  });
  const fogPlane = new THREE.Mesh(fogGeo, fogMat);
  fogPlane.rotation.x = -Math.PI / 2;
  fogPlane.position.y = 0.5;
  scene.add(fogPlane);

  // Drift animation
  function animateFog(t) {
    fogPlane.position.x = Math.sin(t * 0.05) * 5;
    fogPlane.position.z = Math.cos(t * 0.04) * 3;
    fogMat.opacity = 0.08 + Math.sin(t * 0.1) * 0.04;
  }

  return { animateFog };
}
```

### Snow
```javascript
function createSnow(scene, count = 800) {
  const geo = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < count; i++) {
    positions.push(
      (Math.random() - 0.5) * 200,
      Math.random() * 80,
      (Math.random() - 0.5) * 200
    );
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, transparent: true, opacity: 0.8 });
  const snow = new THREE.Points(geo, mat);
  scene.add(snow);

  function animateSnow(t) {
    const pos = snow.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, pos.getY(i) - 0.05 - Math.random() * 0.05);
      pos.setX(i, pos.getX(i) + Math.sin(t + i) * 0.01);
      if (pos.getY(i) < 0) pos.setY(i, 80);
    }
    pos.needsUpdate = true;
  }
  return { animateSnow };
}
```

---

## Instanced Rendering (Trees, Lamp Posts, Cars)

```javascript
// Efficient: 1000 trees with 1 draw call
function createInstancedTrees(scene, count = 200, spread = 150) {
  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 3, 6);
  const canopyGeo = new THREE.ConeGeometry(1.5, 4, 8);

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4f2a, roughness: 0.9 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x2d6e2d, roughness: 0.8 });

  const trunks  = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, count);
  trunks.castShadow = true;
  canopies.castShadow = true;

  const dummy = new THREE.Object3D();

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * spread;
    const z = (Math.random() - 0.5) * spread;
    const scale = 0.7 + Math.random() * 0.6;

    dummy.position.set(x, 1.5 * scale, z);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, (3 + 2) * scale, z);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    canopies.setMatrixAt(i, dummy.matrix);
  }

  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  scene.add(trunks, canopies);
}
```

---

## Scene Presets (Combine Multiple Elements)

### "Coastal City at Golden Hour"
```javascript
function buildCoastalCityScene(scene, renderer) {
  setupAtmosphere(scene, renderer, 'golden_hour');

  // Ground layers
  // Ocean
  addOcean(scene, { center: [0, -120], size: 400 });
  // Beach strip
  addBeachStrip(scene, { z: -60, width: 30 });
  // Road
  addRoad(scene, { z: -20, length: 200, lanes: 2 });
  // City blocks
  addCityBlock(scene, { center: [0, 20], count: 25, minH: 10, maxH: 90, style: 'modern' });

  // Props
  createInstancedTrees(scene, 40, 60);
  addStreetLamps(scene);

  // Vehicles
  addCar(scene, { position: [-8, 0, -22], color: 0x223399, heading: 0 });
  addCar(scene, { position: [4, 0, -18],  color: 0xcc2211, heading: Math.PI });

  // Stars (visible in sky gradient)
  addStars(scene, 1000);
}
```

### "Desert Highway at Noon"
```javascript
function buildDesertScene(scene, renderer) {
  setupAtmosphere(scene, renderer, 'clear_day');
  addDesertGround(scene, { size: 500 });
  addHighway(scene, { length: 400 });
  addCar(scene, { position: [0, 0, 0], color: 0xdd3311, heading: 0 });
  addMesas(scene);         // flat-top rock formations
  addHeatHaze(scene);      // distortion shader effect
  addCacti(scene, 30);
}
```

### "Rainy Night City"
```javascript
function buildNightCityScene(scene, renderer) {
  setupAtmosphere(scene, renderer, 'night');
  addCity(scene, { count: 40, style: 'modern' });
  addRoads(scene, cityRoads);
  addStreetLamps(scene);
  const { animateRain } = createRain(scene, 800);
  const { animateFog }  = createGroundFog(scene);
  addStars(scene, 3000);
  addReflectiveWetRoad(scene);
  return { animateRain, animateFog };
}
```

---

## Reflective Wet Road (Night Scenes)

```javascript
function addReflectiveWetRoad(scene) {
  const roadGeo = new THREE.PlaneGeometry(200, 20);
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    metalness: 0.2,
    roughness: 0.05,       // very low = mirror-like
    envMapIntensity: 1.5,
  });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01;
  road.receiveShadow = true;
  scene.add(road);

  // Neon reflections: colored point lights near road
  [0xff2244, 0x2244ff, 0x44ff22].forEach((color, i) => {
    const light = new THREE.PointLight(color, 1.5, 25);
    light.position.set(-20 + i * 20, 5, 2);
    scene.add(light);
  });
}
```

---

## HUD & UI System

```javascript
const HUD = {
  init() {
    this.el = document.createElement('div');
    this.el.style.cssText = `
      position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
      display:flex; gap:12px; z-index:1000; flex-wrap:wrap; justify-content:center;
    `;
    document.body.appendChild(this.el);
  },

  addButton(label, onClick, icon = '') {
    const btn = document.createElement('button');
    btn.innerHTML = `${icon} ${label}`;
    btn.style.cssText = `
      background:rgba(0,0,0,0.65); backdrop-filter:blur(14px);
      border:1px solid rgba(255,255,255,0.2); color:#fff;
      padding:10px 20px; border-radius:50px; cursor:pointer;
      font-size:13px; letter-spacing:0.5px; transition:all 0.25s;
      font-family:'Segoe UI',sans-serif;
    `;
    btn.onmouseover = () => { btn.style.background = 'rgba(255,255,255,0.18)'; btn.style.transform = 'scale(1.05)'; };
    btn.onmouseout  = () => { btn.style.background = 'rgba(0,0,0,0.65)';       btn.style.transform = 'scale(1)'; };
    btn.onclick = onClick;
    this.el.appendChild(btn);
    return btn;
  },

  addLabel(text) {
    const label = document.createElement('div');
    label.style.cssText = `
      position:fixed; top:20px; left:50%; transform:translateX(-50%);
      background:rgba(0,0,0,0.5); backdrop-filter:blur(10px);
      border:1px solid rgba(255,255,255,0.15); color:rgba(255,255,255,0.9);
      padding:8px 24px; border-radius:50px; font-size:14px;
      font-family:'Segoe UI',sans-serif; letter-spacing:1px;
      z-index:1000; pointer-events:none;
    `;
    label.textContent = text;
    document.body.appendChild(label);
    return label;
  },

  addToast(msg, duration = 2500) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed; top:60px; left:50%; transform:translateX(-50%);
      background:rgba(0,150,255,0.8); backdrop-filter:blur(10px);
      color:#fff; padding:8px 20px; border-radius:20px; font-size:13px;
      z-index:2000; pointer-events:none; transition:opacity 0.5s;
      font-family:'Segoe UI',sans-serif;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, duration);
  },
};
```

---

## Master Animation Loop

```javascript
const clock = new THREE.Clock();
let weatherAnimFns = [];
let poiAnimFns = [];

function masterAnimate() {
  requestAnimationFrame(masterAnimate);
  const t = clock.getElapsedTime();
  const delta = clock.getDelta();

  controls.update();

  // Run all registered animation functions
  weatherAnimFns.forEach(fn => fn(t));
  poiAnimFns.forEach(fn => fn(t));

  // Subtle camera bob (cinematic feel)
  camera.position.y += Math.sin(t * 0.3) * 0.001;

  renderer.render(scene, camera);
}
masterAnimate();
```

---

## Complete HTML Shell

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>3D Scene — Interactive</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    canvas { display: block; width: 100% !important; height: 100% !important; }
    /* Loading overlay */
    #loading {
      position: fixed; inset: 0; background: #000;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      z-index: 9999; color: #fff; font-family: 'Segoe UI', sans-serif;
      transition: opacity 1s;
    }
    #loading-bar-track {
      width: 200px; height: 3px; background: rgba(255,255,255,0.2);
      border-radius: 2px; margin-top: 20px;
    }
    #loading-bar { height: 100%; width: 0%; background: #4af; border-radius: 2px; transition: width 0.3s; }
    #loading p { margin-top: 12px; font-size: 13px; color: rgba(255,255,255,0.5); }
  </style>
</head>
<body>
  <div id="loading">
    <div style="font-size:28px;letter-spacing:4px;font-weight:200;">LOADING SCENE</div>
    <div id="loading-bar-track"><div id="loading-bar"></div></div>
    <p id="loading-msg">Initializing renderer…</p>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
  <script>
    // Fake loading progress
    const bar = document.getElementById('loading-bar');
    const msg = document.getElementById('loading-msg');
    const steps = ['Initializing renderer…','Building terrain…','Placing buildings…','Adding atmosphere…','Starting scene…'];
    let step = 0;
    const loadInterval = setInterval(() => {
      if (step >= steps.length) {
        clearInterval(loadInterval);
        document.getElementById('loading').style.opacity = '0';
        setTimeout(() => document.getElementById('loading').remove(), 1000);
        return;
      }
      bar.style.width = ((step + 1) / steps.length * 100) + '%';
      msg.textContent = steps[step++];
    }, 400);

    // === INSERT SCENE CODE HERE ===

  </script>
</body>
</html>
```

---

## Output Standard

- **File:** single `.html`, zero dependencies, no server
- **Load screen:** animated progress bar + status text → fades out
- **Scene label:** subtle pill at top with scene name
- **Controls bar:** bottom-center, glassmorphism buttons
- **Interaction hints:** "Drag · Scroll · Touch" shown briefly then fades
- **Responsive:** adapts to any screen size, mobile-friendly
- **Performance target:** 60fps on mid-range devices; use instanced meshes for repeated objects

---

## Checklist Before Output

- [ ] Loading screen present (fades after ~2s)
- [ ] At least 3 scene-type buttons (time of day or weather)
- [ ] OrbitControls with damping + polar angle limits
- [ ] ACESFilmic tone mapping enabled
- [ ] Shadows enabled (directional light + PCFSoft)
- [ ] Fog/atmosphere matched to time-of-day preset
- [ ] Scene has depth (foreground, midground, background elements)
- [ ] No bare `THREE.OrbitControls` — use CDN examples path
- [ ] No `CapsuleGeometry` (Three r128 limitation)
- [ ] Touch interaction works on mobile
- [ ] File is self-contained (no external asset dependencies beyond CDN scripts)
