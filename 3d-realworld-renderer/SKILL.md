---
name: 3d-realworld-renderer
description: >
  Create photorealistic 3D scenes of real-world subjects — cars, beaches, cities, 
  buildings, landscapes, and environments — rendered directly in the browser using 
  Three.js, WebGL, and GLSL shaders. Use this skill whenever the user asks to "create 
  a 3D image", "render a realistic scene", "show me a 3D car/beach/city", "make 
  something that looks real", "photorealistic render", or wants any visually immersive 
  3D environment that feels like real life. Also trigger for "3D visualization", 
  "real-time render", "lifelike scene", "realistic environment" or similar requests. 
  This skill produces self-contained HTML files using Three.js CDN with no build step required.
---

# 3D Real-World Renderer Skill

Produces photorealistic, interactive 3D scenes of real-world subjects (cars, beaches, 
cities, nature) using Three.js + WebGL, delivered as single HTML files runnable in any browser.

---

## Stack & Libraries (CDN — no install needed)

```html
<!-- Core 3D engine -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

<!-- Post-processing (bloom, SSAO, tone-mapping) -->
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js"></script>

<!-- Orbit / touch controls -->
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>

<!-- GLTF loader (if loading 3D models) -->
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
```

> **Note:** three@0.128.0 — stick to r128. Do NOT use `THREE.OrbitControls` directly; 
> import via the examples path above. `CapsuleGeometry` doesn't exist in r128 — 
> use `CylinderGeometry` + `SphereGeometry` for pill shapes.

---

## Scene Architecture

Every scene follows this initialization pattern:

```javascript
// 1. RENDERER — physically correct, HDR capable
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;  // cinematic look
renderer.toneMappingExposure = 1.0;
renderer.physicallyCorrectLights = true;
document.body.appendChild(renderer.domElement);

// 2. SCENE
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);  // atmospheric depth

// 3. CAMERA
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 5, 15);

// 4. CONTROLS (orbit + touch)
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = true;
controls.minDistance = 2;
controls.maxDistance = 200;
controls.target.set(0, 0, 0);

// 5. RESIZE handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 6. ANIMATION LOOP
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
```

---

## Lighting Presets

### Daytime Outdoor (beaches, cities, roads)
```javascript
// Sky ambient
const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
scene.add(ambientLight);

// Sun — directional + shadows
const sun = new THREE.DirectionalLight(0xfff5e0, 2.5);
sun.position.set(50, 100, 30);
sun.castShadow = true;
sun.shadow.mapSize.width = 4096;
sun.shadow.mapSize.height = 4096;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 500;
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
sun.shadow.bias = -0.0001;
scene.add(sun);

// Sky fill (bounce light from sky)
const skyFill = new THREE.HemisphereLight(0x87ceeb, 0x4a7c59, 0.6);
scene.add(skyFill);
```

### Night City
```javascript
const ambientLight = new THREE.AmbientLight(0x0a0a2e, 0.3);
scene.add(ambientLight);

// Moon
const moon = new THREE.DirectionalLight(0x8899bb, 0.3);
moon.position.set(-50, 80, -30);
scene.add(moon);

// Street lamp point lights
function addStreetLamp(x, z, color = 0xffdd88) {
  const lamp = new THREE.PointLight(color, 2, 20);
  lamp.position.set(x, 6, z);
  lamp.castShadow = true;
  scene.add(lamp);
}
```

### Golden Hour / Sunset
```javascript
const sun = new THREE.DirectionalLight(0xff6633, 1.8);
sun.position.set(-80, 15, 20);
scene.add(sun);

const sky = new THREE.HemisphereLight(0xff9944, 0x553311, 0.8);
scene.add(sky);
```

---

## Subject Templates

### 🚗 Photorealistic Car

```javascript
function createCar(scene) {
  const carGroup = new THREE.Group();

  // --- Body ---
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xcc2200,          // deep red
    metalness: 0.9,
    roughness: 0.15,
    envMapIntensity: 1.5,
  });

  // Main body shell
  const bodyGeo = new THREE.BoxGeometry(4.2, 0.8, 2);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  carGroup.add(body);

  // Cabin / roof (tapered using scale trick)
  const cabinGeo = new THREE.BoxGeometry(2.2, 0.7, 1.85);
  const cabin = new THREE.Mesh(cabinGeo, bodyMat);
  cabin.position.set(-0.2, 1.15, 0);
  cabin.castShadow = true;
  carGroup.add(cabin);

  // Hood slope
  const hoodGeo = new THREE.BoxGeometry(1.2, 0.15, 1.9);
  const hood = new THREE.Mesh(hoodGeo, bodyMat);
  hood.position.set(1.5, 0.95, 0);
  hood.rotation.z = -0.12;
  carGroup.add(hood);

  // --- Windows (dark glass) ---
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x111122,
    metalness: 0.0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.7,
  });
  const windshieldGeo = new THREE.BoxGeometry(0.05, 0.55, 1.75);
  const windshield = new THREE.Mesh(windshieldGeo, glassMat);
  windshield.position.set(1.0, 1.1, 0);
  windshield.rotation.z = -0.5;
  carGroup.add(windshield);

  // --- Wheels ---
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.1 });
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 28);
  const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.3, 8);

  [[1.4, -1.1], [1.4, 1.1], [-1.4, -1.1], [-1.4, 1.1]].forEach(([x, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.35, z);
    wheel.castShadow = true;
    carGroup.add(wheel);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, 0.35, z);
    carGroup.add(rim);
  });

  // --- Headlights ---
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffcc, emissiveIntensity: 2 });
  const lightGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16);
  [-0.55, 0.55].forEach(z => {
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.rotation.x = Math.PI / 2;
    light.position.set(2.1, 0.65, z);
    carGroup.add(light);
    const pointLight = new THREE.SpotLight(0xffffcc, 3, 15, Math.PI / 6, 0.5);
    pointLight.position.set(2.2, 0.65, z);
    pointLight.target.position.set(10, 0, z);
    scene.add(pointLight);
    scene.add(pointLight.target);
  });

  // --- Ground shadow plane ---
  carGroup.traverse(obj => { if (obj.isMesh) obj.castShadow = true; });

  scene.add(carGroup);
  return carGroup;
}
```

### 🏖️ Beach Scene

```javascript
function createBeach(scene) {
  // Ocean plane — animated waves via shader
  const waterGeo = new THREE.PlaneGeometry(400, 400, 80, 80);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x006994,
    metalness: 0.1,
    roughness: 0.2,
    transparent: true,
    opacity: 0.88,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0, -80);
  water.receiveShadow = true;
  scene.add(water);

  // Wave animation — displace vertices each frame
  const posAttr = waterGeo.attributes.position;
  function animateWaves(t) {
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      posAttr.setZ(i, Math.sin(x * 0.1 + t) * 0.4 + Math.cos(y * 0.15 + t * 0.7) * 0.3);
    }
    posAttr.needsUpdate = true;
    waterGeo.computeVertexNormals();
  }

  // Sandy beach
  const sandGeo = new THREE.PlaneGeometry(200, 60, 40, 20);
  const sandMat = new THREE.MeshStandardMaterial({
    color: 0xf5deb3,
    roughness: 0.95,
    metalness: 0.0,
  });
  // Ripple the sand slightly
  const sandPos = sandGeo.attributes.position;
  for (let i = 0; i < sandPos.count; i++) {
    sandPos.setZ(i, (Math.random() - 0.5) * 0.08);
  }
  sandGeo.computeVertexNormals();
  const sand = new THREE.Mesh(sandGeo, sandMat);
  sand.rotation.x = -Math.PI / 2;
  sand.receiveShadow = true;
  scene.add(sand);

  // Palm trees
  function addPalm(x, z) {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d7a2d, roughness: 0.8, side: THREE.DoubleSide });

    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 5, 8);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 2.5, z);
    trunk.rotation.z = (Math.random() - 0.5) * 0.3;
    trunk.castShadow = true;
    scene.add(trunk);

    // Leaves (flat planes fanned out)
    for (let i = 0; i < 7; i++) {
      const leafGeo = new THREE.PlaneGeometry(2.5, 0.5);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(x, 5.2, z);
      leaf.rotation.y = (i / 7) * Math.PI * 2;
      leaf.rotation.x = -0.4;
      leaf.castShadow = true;
      scene.add(leaf);
    }
  }

  [[-12, -5], [-8, -3], [10, -4], [14, -6], [-5, -8]].forEach(([x, z]) => addPalm(x, z));

  // Foam / surf line
  const foamGeo = new THREE.PlaneGeometry(200, 3, 60, 1);
  const foamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, roughness: 1 });
  const foam = new THREE.Mesh(foamGeo, foamMat);
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, 0.02, -50);
  scene.add(foam);

  return { animateWaves };
}
```

### 🌆 City Scene

```javascript
function createCity(scene) {
  const buildingMats = [
    new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.5, roughness: 0.4 }),
    new THREE.MeshStandardMaterial({ color: 0x667788, metalness: 0.7, roughness: 0.2 }),
    new THREE.MeshStandardMaterial({ color: 0xaabbcc, metalness: 0.3, roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.8, roughness: 0.15 }),
  ];

  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffee88,
    emissive: 0xffdd55,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.9,
  });

  function addBuilding(x, z, w, h, d) {
    const mat = buildingMats[Math.floor(Math.random() * buildingMats.length)];
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Windows grid
    const cols = Math.floor(w / 1.5);
    const rows = Math.floor(h / 2.5);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.3) {  // some lit, some dark
          const wGeo = new THREE.PlaneGeometry(0.5, 0.7);
          const wMesh = new THREE.Mesh(wGeo, Math.random() > 0.2 ? windowMat : 
            new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 1 }));
          wMesh.position.set(
            x - w / 2 + (c + 0.75) * (w / cols),
            (r + 0.75) * (h / rows),
            z + d / 2 + 0.01
          );
          scene.add(wMesh);
        }
      }
    }
  }

  // City grid layout
  const cityData = [
    [0, 0, 8, 60, 8], [-15, 5, 6, 40, 6], [15, -5, 7, 80, 7],
    [-30, 0, 5, 35, 5], [30, 10, 9, 55, 9], [-20, -15, 6, 45, 6],
    [20, -10, 5, 30, 5], [5, 20, 7, 65, 7], [-10, 15, 4, 25, 4],
    [40, 0, 6, 70, 6], [-40, 5, 5, 50, 5],
  ];
  cityData.forEach(args => addBuilding(...args));

  // Road
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.95 });
  const roadGeo = new THREE.PlaneGeometry(200, 12);
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  scene.add(road);

  // Road markings
  const markMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  for (let i = -90; i < 90; i += 8) {
    const markGeo = new THREE.PlaneGeometry(3, 0.2);
    const mark = new THREE.Mesh(markGeo, markMat);
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(i, 0.01, 0);
    scene.add(mark);
  }

  // Sidewalks
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9 });
  [-7, 7].forEach(z => {
    const swGeo = new THREE.PlaneGeometry(200, 3);
    const sw = new THREE.Mesh(swGeo, sidewalkMat);
    sw.rotation.x = -Math.PI / 2;
    sw.position.set(0, 0.01, z);
    scene.add(sw);
  });

  // Street lamps
  function addLamp(x, z) {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 });
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 6, 8);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 3, z);
    scene.add(pole);

    const lampLight = new THREE.PointLight(0xffdd88, 1.5, 20);
    lampLight.position.set(x, 6.2, z);
    scene.add(lampLight);
  }
  for (let x = -80; x <= 80; x += 20) { addLamp(x, -8); addLamp(x, 8); }
}
```

---

## Sky & Environment

### Procedural Sky (gradient dome)
```javascript
function addSky(scene, timeOfDay = 'day') {
  const palettes = {
    day:    { top: 0x1a6fa8, bottom: 0x87ceeb },
    sunset: { top: 0x1a1a4a, bottom: 0xff6633 },
    night:  { top: 0x020210, bottom: 0x0a0a30 },
  };
  const p = palettes[timeOfDay] || palettes.day;

  const skyGeo = new THREE.SphereGeometry(900, 32, 32);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor:    { value: new THREE.Color(p.top) },
      bottomColor: { value: new THREE.Color(p.bottom) },
      offset:      { value: 400 },
      exponent:    { value: 0.6 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide,
  });

  scene.add(new THREE.Mesh(skyGeo, skyMat));
}
```

### Stars (night scenes)
```javascript
function addStars(scene) {
  const starGeo = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < 6000; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r = 800;
    positions.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8 });
  scene.add(new THREE.Points(starGeo, starMat));
}
```

---

## Post-Processing (Bloom + Film Grain)

```javascript
// After renderer setup:
const composer = new THREE.EffectComposer(renderer);
composer.addPass(new THREE.RenderPass(scene, camera));

const bloomPass = new THREE.UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.4,   // strength
  0.5,   // radius
  0.85   // threshold
);
composer.addPass(bloomPass);

// In animation loop, replace renderer.render(scene, camera) with:
composer.render();
```

---

## Touch & Interaction

```javascript
// Touch support (mobile pinch-zoom + swipe)
// OrbitControls handles this automatically when added to renderer.domElement

// Click-to-highlight object
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  if (hits.length > 0) {
    const obj = hits[0].object;
    // pulse emissive
    obj.material.emissive = new THREE.Color(0x334466);
    setTimeout(() => obj.material.emissive = new THREE.Color(0x000000), 500);
  }
});

// Touch drag on mobile — handled by OrbitControls automatically
// For custom gestures:
let touchStartX = 0;
renderer.domElement.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; });
renderer.domElement.addEventListener('touchmove', e => {
  const dx = e.touches[0].clientX - touchStartX;
  scene.rotation.y += dx * 0.005;
  touchStartX = e.touches[0].clientX;
});
```

---

## Full HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3D Real World Scene</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; background: #000; font-family: 'Segoe UI', sans-serif; }
    canvas { display: block; }
    #ui {
      position: fixed; top: 20px; left: 20px; z-index: 100;
      display: flex; gap: 10px; flex-wrap: wrap;
    }
    .btn {
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.3);
      color: #fff; padding: 8px 16px; border-radius: 20px;
      cursor: pointer; font-size: 13px; transition: all 0.2s;
    }
    .btn:hover { background: rgba(255,255,255,0.3); transform: scale(1.05); }
    #info {
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      color: rgba(255,255,255,0.6); font-size: 12px; text-align: center;
    }
  </style>
</head>
<body>
  <div id="ui">
    <button class="btn" onclick="setTime('day')">☀️ Day</button>
    <button class="btn" onclick="setTime('sunset')">🌅 Sunset</button>
    <button class="btn" onclick="setTime('night')">🌙 Night</button>
  </div>
  <div id="info">Drag to rotate • Scroll to zoom • Touch supported</div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
  <script>
    // INSERT SCENE CODE HERE
  </script>
</body>
</html>
```

---

## Material Reference (Photorealism Cheat Sheet)

| Surface      | metalness | roughness | color      | notes                        |
|--------------|-----------|-----------|------------|------------------------------|
| Car paint    | 0.85      | 0.15      | any        | high envMapIntensity          |
| Car glass    | 0.0       | 0.05      | #111122    | transparent 0.7              |
| Chrome       | 1.0       | 0.05      | #ffffff    | —                            |
| Wet sand     | 0.0       | 0.6       | #c2a87b    | —                            |
| Dry sand     | 0.0       | 0.95      | #f5deb3    | —                            |
| Ocean water  | 0.1       | 0.15      | #006994    | transparent 0.88             |
| Glass façade | 0.1       | 0.05      | #aaccdd    | transparent 0.5              |
| Concrete     | 0.0       | 0.9       | #888888    | —                            |
| Asphalt      | 0.0       | 0.95      | #333333    | —                            |
| Rubber tyre  | 0.0       | 0.95      | #111111    | —                            |

---

## Output Format

- **Always produce a single self-contained `.html` file**
- Full-screen canvas, black background default
- Includes OrbitControls for mouse + touch interaction
- UI controls (time of day, color, etc.) via glassmorphism buttons
- Info tooltip at bottom: "Drag to rotate • Scroll to zoom • Touch supported"
- Smooth 60fps animation loop
- Responsive (handles window resize)

---

## Quality Checklist

Before delivering, verify:
- [ ] `renderer.shadowMap.enabled = true` and objects have `castShadow = true`
- [ ] `renderer.toneMapping = THREE.ACESFilmicToneMapping`
- [ ] `controls.enableDamping = true` for smooth feel
- [ ] `window.addEventListener('resize', ...)` handler present
- [ ] No `THREE.OrbitControls` — must use CDN path version
- [ ] No `CapsuleGeometry` — use Cylinder + Sphere instead
- [ ] Scene has at least 3 light types (ambient, directional, hemisphere or point)
- [ ] Materials use physically correct metalness/roughness values
