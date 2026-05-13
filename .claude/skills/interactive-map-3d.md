---
name: interactive-map-3d
description: >
  Create interactive 3D maps with real-world terrain, cities, roads, POIs (points of 
  interest), satellite-style overlays, and touch/click navigation — rendered directly 
  in the browser using Three.js and Leaflet.js. Use this skill whenever the user asks 
  for "3D map", "map with 3D buildings", "interactive map", "city over map", "terrain 
  map", "map visualization", "place buildings on a map", "real map with 3D overlay", 
  "geographic 3D view", "topographic map", or wants to display geographic/spatial data 
  interactively. Also trigger for "fly-over map", "bird's eye city view", "map with 
  touch controls", "satellite 3D view". Produces self-contained HTML files — no server needed.
---

# Interactive 3D Map Skill

Creates browser-based interactive 3D maps combining real tile data (OpenStreetMap / 
Mapbox-style) with procedural 3D geometry — buildings, terrain, markers, routes — 
with full touch and mouse interaction.

---

## Two Rendering Modes

### Mode A — Pure Three.js 3D Map (full 3D, no external tile dependency)
Best for: City models, terrain flyovers, stylized geographic art.

### Mode B — Leaflet.js + Three.js Hybrid (real tile map + 3D overlay)
Best for: Real-world locations, clickable POIs, GPS-accurate placement.

---

## Stack

```html
<!-- Three.js (3D engine) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>

<!-- Leaflet (real tile maps — Mode B) -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- Tween (smooth camera animation) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js"></script>
```

---

## Mode A: Pure 3D Map (Recommended for most requests)

### Setup

```javascript
// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 200, 800);

// Top-down camera (map view)
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 120, 80);
camera.lookAt(0, 0, 0);

// Map controls — restricted to map-like interaction
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI / 2.2;    // prevent going underground
controls.minDistance = 15;
controls.maxDistance = 400;
controls.screenSpacePanning = true;
controls.target.set(0, 0, 0);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

### Ground Plane (map base)

```javascript
function createGroundMap(scene, style = 'city') {
  const styles = {
    city:    { base: 0x3a3a3a, grid: 0x555555 },   // dark asphalt
    terrain: { base: 0x5a8a40, grid: 0x4a7a30 },   // green land
    desert:  { base: 0xd4a854, grid: 0xc49844 },   // sand
    water:   { base: 0x1a5276, grid: 0x1a6090 },   // ocean
  };
  const s = styles[style] || styles.city;

  // Base ground
  const groundGeo = new THREE.PlaneGeometry(500, 500, 50, 50);
  const groundMat = new THREE.MeshStandardMaterial({ color: s.base, roughness: 0.95 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Grid lines (street grid feel)
  const gridHelper = new THREE.GridHelper(500, 50, s.grid, s.grid);
  gridHelper.position.y = 0.02;
  gridHelper.material.opacity = 0.4;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);
}
```

### Road Network

```javascript
function createRoads(scene, roads) {
  // roads: array of { start: [x,z], end: [x,z], width: number, type: 'highway'|'street'|'path' }
  const matMap = {
    highway: new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 }),
    street:  new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.95 }),
    path:    new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 1.0 }),
  };
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.3 });

  roads.forEach(({ start, end, width = 6, type = 'street' }) => {
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);

    const geo = new THREE.PlaneGeometry(width, length);
    const mesh = new THREE.Mesh(geo, matMap[type]);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = -angle;
    mesh.position.set((start[0] + end[0]) / 2, 0.05, (start[1] + end[1]) / 2);
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Center dashes
    if (type !== 'path') {
      for (let t = 0; t < 1; t += 0.1) {
        const mx = start[0] + dx * (t + 0.05);
        const mz = start[1] + dz * (t + 0.05);
        const dashGeo = new THREE.PlaneGeometry(0.3, length * 0.07);
        const dash = new THREE.Mesh(dashGeo, lineMat);
        dash.rotation.x = -Math.PI / 2;
        dash.rotation.z = -angle;
        dash.position.set(mx, 0.06, mz);
        scene.add(dash);
      }
    }
  });
}

// Example road network (city grid)
const cityRoads = [
  { start: [-100, 0],  end: [100, 0],  width: 10, type: 'highway' },
  { start: [0, -100],  end: [0, 100],  width: 10, type: 'highway' },
  { start: [-100, 30], end: [100, 30], width: 6, type: 'street' },
  { start: [-100, -30],end: [100,-30], width: 6, type: 'street' },
  { start: [30, -100], end: [30, 100], width: 6, type: 'street' },
  { start: [-30,-100], end: [-30,100], width: 6, type: 'street' },
];
```

### 3D Buildings on Map

```javascript
function addCityBlock(scene, options = {}) {
  const {
    center = [0, 0],       // [x, z]
    count = 30,
    spread = 80,
    minH = 5, maxH = 80,
    style = 'modern',      // 'modern' | 'classic' | 'mixed'
  } = options;

  const palettes = {
    modern:  [0x7fb3cc, 0x5588aa, 0x8899bb, 0x334455, 0xaabbcc],
    classic: [0xcc9966, 0xddaa77, 0xbb8855, 0x997755, 0xeebb88],
    mixed:   [0x667788, 0xcc9966, 0x8899aa, 0xddaa77, 0x556677],
  };
  const colors = palettes[style];

  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffee88, emissive: 0xffdd55, emissiveIntensity: 0.6,
    transparent: true, opacity: 0.85,
  });
  const darkWindowMat = new THREE.MeshStandardMaterial({
    color: 0x223344, roughness: 1,
  });

  for (let i = 0; i < count; i++) {
    const w = 4 + Math.random() * 10;
    const d = 4 + Math.random() * 10;
    const h = minH + Math.random() * (maxH - minH);
    const x = center[0] + (Math.random() - 0.5) * spread;
    const z = center[1] + (Math.random() - 0.5) * spread;

    const color = colors[Math.floor(Math.random() * colors.length)];
    const mat = new THREE.MeshStandardMaterial({
      color,
      metalness: style === 'modern' ? 0.5 : 0.1,
      roughness: style === 'modern' ? 0.3 : 0.7,
    });

    const geo = new THREE.BoxGeometry(w, h, d);
    const building = new THREE.Mesh(geo, mat);
    building.position.set(x, h / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    building.userData = { type: 'building', height: h };
    scene.add(building);

    // Rooftop features (modern buildings)
    if (style === 'modern' && Math.random() > 0.5) {
      const antennaGeo = new THREE.CylinderGeometry(0.05, 0.05, h * 0.15, 6);
      const antennaMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9 });
      const antenna = new THREE.Mesh(antennaGeo, antennaMat);
      antenna.position.set(x, h + h * 0.075, z);
      scene.add(antenna);
    }

    // Windows
    const rows = Math.floor(h / 3);
    const cols = Math.floor(w / 2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isLit = Math.random() > 0.35;
        const wGeo = new THREE.PlaneGeometry(0.6, 0.9);
        const wMesh = new THREE.Mesh(wGeo, isLit ? windowMat : darkWindowMat);
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
```

### Terrain Generation

```javascript
function createTerrain(scene, options = {}) {
  const {
    size = 400,
    resolution = 80,
    maxHeight = 30,
    waterLevel = 2,
    style = 'mountain',   // 'mountain' | 'coast' | 'plains' | 'desert'
  } = options;

  const geo = new THREE.PlaneGeometry(size, size, resolution, resolution);
  const pos = geo.attributes.position;

  // Simplex-like noise using sin/cos layering
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    let z = 0;
    z += Math.sin(x * 0.02) * Math.cos(y * 0.02) * maxHeight * 0.6;
    z += Math.sin(x * 0.05 + 1.3) * Math.cos(y * 0.04 + 0.7) * maxHeight * 0.3;
    z += Math.sin(x * 0.12 + 0.4) * Math.sin(y * 0.11 + 1.1) * maxHeight * 0.1;
    // Coast: flatten towards edges
    if (style === 'coast') {
      const edgeDist = Math.min(Math.abs(x), Math.abs(y)) / (size / 2);
      z *= edgeDist;
    }
    pos.setZ(i, Math.max(z, 0));
  }
  geo.computeVertexNormals();

  // Vertex colors by height
  const colors = [];
  const colorLow  = new THREE.Color(0x4a8f3f);   // green valley
  const colorMid  = new THREE.Color(0x7a6a55);   // rocky
  const colorHigh = new THREE.Color(0xfafafa);   // snow
  const colorWater= new THREE.Color(0x1a5276);

  for (let i = 0; i < pos.count; i++) {
    const h = pos.getZ(i) / maxHeight;
    let c;
    if (pos.getZ(i) < waterLevel) c = colorWater;
    else if (h < 0.3) c = colorLow.clone().lerp(colorMid, h / 0.3);
    else c = colorMid.clone().lerp(colorHigh, (h - 0.3) / 0.7);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.0,
  });

  const terrain = new THREE.Mesh(geo, mat);
  terrain.rotation.x = -Math.PI / 2;
  terrain.receiveShadow = true;
  terrain.castShadow = false;
  scene.add(terrain);

  // Water plane
  if (waterLevel > 0) {
    const waterGeo = new THREE.PlaneGeometry(size, size);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1a5276, metalness: 0.1, roughness: 0.1,
      transparent: true, opacity: 0.8,
    });
    const waterPlane = new THREE.Mesh(waterGeo, waterMat);
    waterPlane.rotation.x = -Math.PI / 2;
    waterPlane.position.y = waterLevel;
    scene.add(waterPlane);
  }

  return terrain;
}
```

---

## Mode B: Leaflet + Three.js Hybrid

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    body { margin: 0; }
    #map { width: 100vw; height: 100vh; }
    #three-overlay {
      position: fixed; top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 500;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <canvas id="three-overlay"></canvas>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script>
    // Leaflet map
    const map = L.map('map').setView([48.8566, 2.3522], 13);  // Paris
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Three.js overlay (transparent canvas on top)
    const canvas = document.getElementById('three-overlay');
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);  // transparent

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    // Project lat/lng to Three.js coordinates
    function latLngToXZ(lat, lng, centerLat, centerLng) {
      const R = 6371000;
      const x = (lng - centerLng) * (Math.PI / 180) * R * Math.cos(centerLat * Math.PI / 180) / 1000;
      const z = -(lat - centerLat) * (Math.PI / 180) * R / 1000;
      return [x, z];
    }

    // Add 3D marker at real lat/lng
    function add3DMarker(lat, lng, label, color = 0xff3333) {
      const [x, z] = latLngToXZ(lat, lng, 48.8566, 2.3522);
      const geo = new THREE.ConeGeometry(0.2, 0.8, 8);
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 });
      const marker = new THREE.Mesh(geo, mat);
      marker.position.set(x, 0.4, z);
      marker.rotation.x = Math.PI;
      scene.add(marker);
      return marker;
    }
  </script>
</body>
</html>
```

---

## POI (Points of Interest) System

```javascript
const poiData = [
  { name: 'City Hall',    x: 10, z: -5,  type: 'government', color: 0x4444ff },
  { name: 'Hospital',     x: -20, z: 15, type: 'medical',    color: 0xff4444 },
  { name: 'Park',         x: 5,  z: 30,  type: 'nature',     color: 0x44aa44 },
  { name: 'Train Station',x: -10, z: -20,type: 'transport',  color: 0xffaa00 },
  { name: 'Hotel',        x: 25, z: 5,   type: 'lodging',    color: 0xaa44ff },
];

const poiMeshes = [];

function createPOI(scene, poi) {
  const group = new THREE.Group();

  // Pin stem
  const stemGeo = new THREE.CylinderGeometry(0.08, 0.08, 3, 8);
  const stemMat = new THREE.MeshStandardMaterial({ color: poi.color, metalness: 0.5 });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = 1.5;
  group.add(stem);

  // Pin head (sphere)
  const headGeo = new THREE.SphereGeometry(0.4, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({
    color: poi.color, emissive: poi.color, emissiveIntensity: 0.4, metalness: 0.3,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 3.4;
  group.add(head);

  // Point light for glow
  const light = new THREE.PointLight(poi.color, 1, 8);
  light.position.y = 3.4;
  group.add(light);

  group.position.set(poi.x, 0, poi.z);
  group.userData = { ...poi, isPoiGroup: true };
  scene.add(group);
  poiMeshes.push(group);

  return group;
}

poiData.forEach(poi => createPOI(scene, poi));

// Click to show info
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const infoBox = document.getElementById('info-box');  // create this div

renderer.domElement.addEventListener('click', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const meshes = [];
  poiMeshes.forEach(g => g.traverse(c => { if (c.isMesh) meshes.push(c); }));
  const hits = raycaster.intersectObjects(meshes);

  if (hits.length > 0) {
    let obj = hits[0].object;
    while (obj.parent && !obj.userData.isPoiGroup) obj = obj.parent;
    if (obj.userData.name) {
      infoBox.innerHTML = `<strong>${obj.userData.name}</strong><br>Type: ${obj.userData.type}`;
      infoBox.style.display = 'block';
      infoBox.style.left = e.clientX + 10 + 'px';
      infoBox.style.top = e.clientY - 10 + 'px';
    }
  } else {
    infoBox.style.display = 'none';
  }
});

// Pulse animation on POI pins
function animatePOIs(t) {
  poiMeshes.forEach((group, i) => {
    const head = group.children[1];
    if (head) head.scale.setScalar(1 + Math.sin(t * 2 + i * 1.2) * 0.08);
  });
}
```

---

## Camera Control Modes

```javascript
// Mode 1: Map view (top-down, limited tilt)
function setMapView() {
  controls.maxPolarAngle = Math.PI / 3;
  controls.minPolarAngle = 0;
  controls.enableRotate = true;
  camera.position.set(0, 150, 50);
  controls.target.set(0, 0, 0);
}

// Mode 2: Street view (eye-level)
function setStreetView() {
  camera.position.set(0, 2, 0);
  controls.maxPolarAngle = Math.PI / 2;
  controls.minPolarAngle = Math.PI / 4;
  controls.target.set(10, 2, 0);
}

// Mode 3: Fly-over (animated tour)
function startFlyover(waypoints) {
  let idx = 0;
  function flyTo(wp) {
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const duration = 2000;
    const start = Date.now();

    function step() {
      const t = Math.min((Date.now() - start) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      camera.position.lerpVectors(startPos, new THREE.Vector3(...wp.camera), ease);
      controls.target.lerpVectors(startTarget, new THREE.Vector3(...wp.target), ease);
      controls.update();
      if (t < 1) requestAnimationFrame(step);
      else if (++idx < waypoints.length) flyTo(waypoints[idx]);
    }
    step();
  }
  flyTo(waypoints[0]);
}

// Example flyover path
startFlyover([
  { camera: [0, 80, 60],  target: [0, 0, 0] },
  { camera: [60, 40, 30], target: [20, 0, 0] },
  { camera: [-40, 30, 20],target: [-10, 0, -10] },
  { camera: [0, 100, 0],  target: [0, 0, 0] },
]);
```

---

## Map UI Controls

```css
/* Glassmorphism map controls */
#map-ui {
  position: fixed;
  top: 20px; right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.map-btn {
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.2);
  color: #fff; padding: 10px 18px;
  border-radius: 8px; cursor: pointer;
  font-size: 13px; letter-spacing: 0.5px;
  transition: all 0.2s; min-width: 120px;
}
.map-btn:hover { background: rgba(255,255,255,0.15); transform: translateX(-3px); }
.map-btn.active { border-color: #4af; color: #4af; }

/* POI Info popup */
#info-box {
  display: none;
  position: fixed; z-index: 2000;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.2);
  color: #fff; padding: 12px 16px;
  border-radius: 10px; font-size: 13px;
  max-width: 200px; pointer-events: none;
}

/* Minimap */
#minimap {
  position: fixed; bottom: 20px; right: 20px;
  width: 150px; height: 150px;
  background: rgba(0,0,0,0.7);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 8px; overflow: hidden;
}
```

---

## HTML Template for Map

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Interactive 3D Map</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; background: #0a0a1a; font-family: 'Segoe UI', sans-serif; }
    canvas { display: block; }
    /* paste map-ui CSS above */
  </style>
</head>
<body>
  <div id="map-ui">
    <button class="map-btn active" onclick="setView('map')">🗺 Map View</button>
    <button class="map-btn" onclick="setView('street')">🚶 Street</button>
    <button class="map-btn" onclick="setView('flyover')">✈️ Flyover</button>
    <hr style="border-color:rgba(255,255,255,0.1)">
    <button class="map-btn" onclick="toggleLayer('buildings')">🏢 Buildings</button>
    <button class="map-btn" onclick="toggleLayer('terrain')">🏔 Terrain</button>
    <button class="map-btn" onclick="toggleLayer('pois')">📍 POIs</button>
  </div>
  <div id="info-box"></div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
  <script>
    // INSERT MAP SCENE CODE HERE
  </script>
</body>
</html>
```

---

## Layer System

```javascript
const layers = { buildings: [], terrain: [], pois: [], roads: [] };

function toggleLayer(name) {
  const visible = layers[name][0]?.visible ?? true;
  layers[name].forEach(obj => obj.visible = !visible);
}

// Register objects to layers when creating them
function registerToLayer(obj, layerName) {
  if (!layers[layerName]) layers[layerName] = [];
  layers[layerName].push(obj);
}
```

---

## Animation Loop

```javascript
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  controls.update();
  animatePOIs(t);
  // Water animation if present
  if (waterGeo) animateWater(t);
  renderer.render(scene, camera);
}
animate();
```

---

## Output Format

- Single self-contained `.html` file
- Full-screen canvas
- Glass-morphism UI panels (dark, translucent)
- Layer toggles (buildings, terrain, POIs, roads)
- 3 camera modes: map / street / flyover
- Click-to-info POI system
- Touch-friendly (OrbitControls handles pinch/swipe)
- Responsive resize

---

## Quality Checklist

- [ ] Camera starts in map view (top-down ish)
- [ ] `maxPolarAngle` set to prevent camera going underground
- [ ] All POIs clickable with info popup
- [ ] Layer toggle buttons wired up
- [ ] Smooth camera transitions (lerp, not snap)
- [ ] Touch support verified (OrbitControls)
- [ ] No imports that require a build step
- [ ] Three.js r128 only — no `CapsuleGeometry`, no bare `OrbitControls`
