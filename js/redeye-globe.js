// Interactive RedEye globe: real Earth texture maps, progressive city labels,
// swipe/drag/pinch navigation, and a live-position aircraft model. Everything
// stays client-side so the static Vercel deployment needs no build pipeline.

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";
const GLTF_LOADER_URL = "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js";
// Cesium's textured commercial-airliner sample is a complete GLB asset from
// the Apache-2.0 CesiumJS repository. Pinning the release keeps geometry and
// materials stable across deployments. The primitive fallback is only shown
// after a confirmed asset/network failure.
const AIRCRAFT_MODEL_URL = "/assets/models/redeye-aircraft.glb";
const TEXTURES = {
  surface: "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_atmos_2048.jpg",
  normal: "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_normal_2048.jpg",
  specular: "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_specular_2048.jpg",
  clouds: "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_clouds_1024.png",
};

const CITIES = [
  { name: "London", country: "United Kingdom", lat: 51.5072, lon: -0.1276, tier: 1, image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=720&q=80", description: "A layered city of royal landmarks, gallery districts, and river walks along the Thames." },
  { name: "New York", country: "United States", lat: 40.7128, lon: -74.006, tier: 1, image: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=720&q=80", description: "A high-energy grid of landmark architecture, neighborhood dining, and waterfront views." },
  { name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503, tier: 1, image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=720&q=80", description: "An electric convergence of design, late-night food culture, shrines, and precision rail." },
  { name: "Paris", country: "France", lat: 48.8566, lon: 2.3522, tier: 2, image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=720&q=80", description: "Boulevard cafés, museum collections, and a walkable architectural skyline around the Seine." },
  { name: "Singapore", country: "Singapore", lat: 1.3521, lon: 103.8198, tier: 2, image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=720&q=80", description: "A compact tropical metropolis where hawker centres, gardens, and waterfront districts connect." },
  { name: "Dubai", country: "United Arab Emirates", lat: 25.2048, lon: 55.2708, tier: 2, image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=720&q=80", description: "A contemporary desert hub with striking vertical architecture, souks, and coastal resorts." },
  { name: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093, tier: 2, image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=720&q=80", description: "Harbour ferries, coastal paths, and a famously photogenic opera house and bridge." },
  { name: "Los Angeles", country: "United States", lat: 34.0522, lon: -118.2437, tier: 2, image: "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?auto=format&fit=crop&w=720&q=80", description: "A sprawling creative capital with cinematic viewpoints, beach neighborhoods, and studio history." },
  { name: "Rome", country: "Italy", lat: 41.9028, lon: 12.4964, tier: 3, image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=720&q=80", description: "Ancient monuments and lively piazzas woven into a city made for long evening walks." },
  { name: "Istanbul", country: "Türkiye", lat: 41.0082, lon: 28.9784, tier: 3, image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=720&q=80", description: "A cross-continental city of domes, markets, ferries, and Bosphorus panoramas." },
  { name: "Mexico City", country: "Mexico", lat: 19.4326, lon: -99.1332, tier: 3, image: "https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?auto=format&fit=crop&w=720&q=80", description: "A vast cultural capital with historic plazas, modern art, and celebrated street food." },
  { name: "Cape Town", country: "South Africa", lat: -33.9249, lon: 18.4241, tier: 3, image: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=720&q=80", description: "Mountain-to-ocean scenery, vineyard day trips, and a richly layered waterfront city." },
  { name: "Honolulu", country: "United States", lat: 21.3099, lon: -157.8581, tier: 2, image: "https://images.unsplash.com/photo-1507876466758-bc54f384809c?auto=format&fit=crop&w=720&q=80", description: "A Pacific crossroads of volcanic ridgelines, warm-water beaches, and island food culture." },
  { name: "Seoul", country: "South Korea", lat: 37.5665, lon: 126.978, tier: 2, image: "https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=720&q=80", description: "A fast-moving capital where historic palaces meet mountain trails and late-night neighborhoods." },
  { name: "Bangkok", country: "Thailand", lat: 13.7563, lon: 100.5018, tier: 3, image: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=720&q=80", description: "Canal-side temples, celebrated street kitchens, and a vivid skyline along the Chao Phraya." },
  { name: "Toronto", country: "Canada", lat: 43.6532, lon: -79.3832, tier: 3, image: "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?auto=format&fit=crop&w=720&q=80", description: "A lakeside city of distinct neighborhoods, global dining, galleries, and landmark views." },
  { name: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lon: -43.1729, tier: 3, image: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=720&q=80", description: "Mountain-backed beaches, energetic streets, and panoramic viewpoints above Guanabara Bay." },
  { name: "Nairobi", country: "Kenya", lat: -1.2921, lon: 36.8219, tier: 3, image: "https://images.unsplash.com/photo-1611348586804-61bf6c080437?auto=format&fit=crop&w=720&q=80", description: "An East African capital balancing contemporary culture with national park landscapes nearby." },
];

const instances = new Set();
let threePromise;
let gltfLoaderPromise;
let aircraftTemplatePromise;

function loadThree() {
  if (!threePromise) threePromise = import(THREE_URL);
  return threePromise;
}

function loadGltfLoader() {
  if (!gltfLoaderPromise) gltfLoaderPromise = import(GLTF_LOADER_URL);
  return gltfLoaderPromise;
}

function sphericalPoint(THREE, lat, lon, radius) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function loadTexture(THREE, loader, url, color = false) {
  const texture = loader.load(url);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makePlane(THREE) {
  const aircraft = new THREE.Group();
  const fuselageMaterial = new THREE.MeshStandardMaterial({ color: 0xf6fafc, metalness: 0.72, roughness: 0.22 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: 0xe3232d, metalness: 0.55, roughness: 0.24 });
  const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x112f59, metalness: 0.2, roughness: 0.12 });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.48, 14), fuselageMaterial);
  fuselage.rotation.x = Math.PI / 2;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 12, 0, Math.PI * 2, 0, Math.PI / 2), fuselageMaterial);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = 0.24;
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.047, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), windowMaterial);
  cockpit.rotation.x = -Math.PI / 2;
  cockpit.position.set(0, 0.018, 0.238);
  const wings = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.015, 0.115), fuselageMaterial);
  wings.position.z = -0.015;
  const wingAccent = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.008, 0.025), accentMaterial);
  wingAccent.position.set(0, -0.012, -0.01);
  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.012, 0.06), fuselageMaterial);
  tailplane.position.z = -0.19;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.14, 0.07), accentMaterial);
  fin.position.set(0, 0.075, -0.195);
  const engineGeometry = new THREE.CylinderGeometry(0.035, 0.04, 0.11, 12);
  const leftEngine = new THREE.Mesh(engineGeometry, windowMaterial);
  const rightEngine = leftEngine.clone();
  [leftEngine, rightEngine].forEach((engine, index) => {
    engine.rotation.x = Math.PI / 2;
    engine.position.set(index ? 0.18 : -0.18, -0.038, -0.01);
  });
  aircraft.add(fuselage, nose, cockpit, wings, wingAccent, tailplane, fin, leftEngine, rightEngine);
  aircraft.scale.setScalar(0.62);
  return aircraft;
}

async function loadAircraftModel(THREE) {
  if (!aircraftTemplatePromise) {
    aircraftTemplatePromise = loadGltfLoader().then(({ GLTFLoader }) => {
      const loader = new GLTFLoader();
      return new Promise((resolve, reject) => loader.load(AIRCRAFT_MODEL_URL, (gltf) => resolve(gltf.scene), undefined, reject));
    });
  }
  const aircraft = (await aircraftTemplatePromise).clone(true);
  const bounds = new THREE.Box3().setFromObject(aircraft);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const longestEdge = Math.max(size.x, size.y, size.z);
  if (!longestEdge) throw new Error("Aircraft asset has no measurable geometry");
  const targetLength = 0.38;
  aircraft.scale.setScalar(targetLength / longestEdge);
  aircraft.position.copy(center).multiplyScalar(-targetLength / longestEdge);
  aircraft.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
    if (node.material) {
      node.material.side = THREE.FrontSide;
      if (node.material.map) {
        node.material.map.colorSpace = THREE.SRGBColorSpace;
        node.material.map.anisotropy = 8;
      }
    }
  });
  return aircraft;
}

function addLatitudeLongitudeGrid(THREE, group, radius) {
  const material = new THREE.LineBasicMaterial({ color: 0xb8c9da, transparent: true, opacity: 0.2 });
  for (let lat = -60; lat <= 60; lat += 30) {
    const points = [];
    for (let lon = -180; lon <= 180; lon += 4) points.push(sphericalPoint(THREE, lat, lon, radius));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }
  for (let lon = -150; lon < 180; lon += 30) {
    const points = [];
    for (let lat = -90; lat <= 90; lat += 4) points.push(sphericalPoint(THREE, lat, lon, radius));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }
}

function makeObservedTrack(THREE) {
  const material = new THREE.LineBasicMaterial({ color: 0x6fb6ff, transparent: true, opacity: 0.8 });
  return new THREE.Line(new THREE.BufferGeometry(), material);
}

function makeProjectedTrack(THREE) {
  const material = new THREE.LineBasicMaterial({
    color: 0xe3232d,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  return new THREE.Line(new THREE.BufferGeometry(), material);
}

function makeRouteArcPoints(THREE, origin, destination, radius) {
  const start = sphericalPoint(THREE, origin.lat, origin.lon, 1).normalize();
  const end = sphericalPoint(THREE, destination.lat, destination.lon, 1).normalize();
  const angle = start.angleTo(end);
  const denominator = Math.sin(angle);
  const steps = Math.max(54, Math.ceil(THREE.MathUtils.radToDeg(angle) * 0.85));
  const peak = Math.min(0.52, Math.max(0.2, angle * 0.18));
  const points = [];

  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    let direction;
    if (Math.abs(denominator) < 0.00001) {
      direction = start.clone().lerp(end, t).normalize();
    } else {
      direction = start.clone()
        .multiplyScalar(Math.sin((1 - t) * angle) / denominator)
        .add(end.clone().multiplyScalar(Math.sin(t * angle) / denominator))
        .normalize();
    }
    // The sine envelope puts both airports back on the surface and raises
    // the middle of the route into the air. This is a real spherical arc,
    // not a flat chord or a line painted onto the texture.
    const height = 0.025 + Math.sin(Math.PI * t) * peak;
    points.push(direction.multiplyScalar(radius + height));
  }
  return points;
}

function routePointForState(instance, state) {
  if (!instance.routePoints?.length || !state.snapToRoute) return null;
  const routeMatchesState =
    state.originIata === instance.routeAirports?.origin?.iata &&
    state.destinationIata === instance.routeAirports?.destination?.iata;
  if (!routeMatchesState && !Number.isFinite(state.routeProgress)) return null;

  let progress = Number.isFinite(state.routeProgress) ? state.routeProgress : null;
  if (progress == null) {
    const current = sphericalPoint(instance.THREE, state.latitude, state.longitude, 1).normalize();
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    instance.routePoints.forEach((point, index) => {
      const distance = point.clone().normalize().distanceToSquared(current);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    progress = nearestIndex / Math.max(1, instance.routePoints.length - 1);
  }
  const index = Math.round(instance.THREE.MathUtils.clamp(progress, 0, 1) * (instance.routePoints.length - 1));
  return instance.routePoints[index];
}

function updateRouteTrackSegments(instance, state) {
  if (!instance.routePoints?.length || !Number.isFinite(state?.routeProgress)) return false;
  const index = Math.round(
    instance.THREE.MathUtils.clamp(state.routeProgress, 0, 1) *
      (instance.routePoints.length - 1)
  );
  const altitude = Math.max(
    0.018,
    instance.radius * Math.max(0, state.baroAltitude ?? state.geoAltitude ?? 0) / 6371000
  );
  const currentPoint = state.snapToRoute
    ? instance.routePoints[index]
    : sphericalPoint(instance.THREE, state.latitude, state.longitude, instance.radius + altitude);
  const history = [...instance.routePoints.slice(0, index), currentPoint];
  const projected = [currentPoint, ...instance.routePoints.slice(index + 1)];
  instance.observedTrack.geometry.dispose();
  instance.observedTrack.geometry = new instance.THREE.BufferGeometry().setFromPoints(history);
  instance.observedTrack.computeLineDistances();
  instance.projectedTrack.geometry.dispose();
  instance.projectedTrack.geometry = new instance.THREE.BufferGeometry().setFromPoints(projected);
  return true;
}

function setDestinationCard(instance, city) {
  instance.selectedCity = city;
  instance.destinationCard.hidden = false;
  instance.destinationCard.innerHTML = `
    <img src="${city.image}" alt="${city.name}" loading="lazy">
    <div><span>Destination signal</span><strong>${city.name}</strong><small>${city.country}</small><p>${city.description}</p></div>`;
}

function cityTierForZoom(distance) {
  if (distance > 10.4) return 1;
  if (distance > 7.2) return 2;
  return 3;
}

function updateCityLayer(instance) {
  const { camera, globe, plane, root, cityButtons, THREE } = instance;
  const rect = root.getBoundingClientRect();
  const tier = cityTierForZoom(camera.position.length());
  if (!rect.width || !rect.height) return;
  // A texture sphere remains an overview tool. At closer range, labels become
  // visually misleading because we do not have licensed street/province tiles.
  // Hide them rather than pretending this is a full GIS map.
  const showOverviewLabels = camera.position.length() >= 8.65;
  camera.updateMatrixWorld();
  globe.updateMatrixWorld();
  const globeCenter = globe.getWorldPosition(new THREE.Vector3());
  const cameraVector = camera.position.clone().sub(globeCenter).normalize();
  const cameraRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  const cameraUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
  const centerProjected = globeCenter.clone().project(camera);
  const rightProjected = globeCenter.clone().addScaledVector(cameraRight, instance.radius).project(camera);
  const upProjected = globeCenter.clone().addScaledVector(cameraUp, instance.radius).project(camera);
  const radiusX = Math.max(0.001, Math.abs(rightProjected.x - centerProjected.x));
  const radiusY = Math.max(0.001, Math.abs(upProjected.y - centerProjected.y));
  const candidates = [];
  let planeScreen = null;
  if (instance.liveState && plane.visible) {
    plane.updateMatrixWorld();
    const planeWorld = plane.getWorldPosition(new THREE.Vector3());
    const planeProjected = planeWorld.clone().project(camera);
    const planeFacingCamera = planeWorld.clone().sub(globeCenter).normalize().dot(cameraVector) > 0.05;
    if (planeFacingCamera && planeProjected.z > -1 && planeProjected.z < 1) {
      planeScreen = {
        x: (planeProjected.x + 1) * 0.5 * rect.width,
        y: (-planeProjected.y + 1) * 0.5 * rect.height,
      };
    }
  }
  cityButtons.forEach((button) => { button.hidden = true; });
  if (!showOverviewLabels) return;
  CITIES.forEach((city, index) => {
    const button = cityButtons[index];
    const position = sphericalPoint(THREE, city.lat, city.lon, instance.radius + 0.035);
    globe.localToWorld(position);
    const surfaceNormal = position.clone().sub(globeCenter).normalize();
    const projected = position.clone().project(camera);
    const withinGlobe = (((projected.x - centerProjected.x) / radiusX) ** 2) + (((projected.y - centerProjected.y) / radiusY) ** 2) < 0.9;
    const screenX = (projected.x + 1) * 0.5 * rect.width;
    const screenY = (-projected.y + 1) * 0.5 * rect.height;
    const insideLabelSafeArea = screenX > 64 && screenX < rect.width - 64 && screenY > 72 && screenY < rect.height - 78;
    const insideViewport = projected.z > -1 && projected.z < 1;
    const clearsAircraft = !planeScreen || Math.hypot(screenX - planeScreen.x, screenY - planeScreen.y) > (instance.compact ? 88 : 106);
    const visible = city.tier <= tier && surfaceNormal.dot(cameraVector) > 0.16 && withinGlobe && insideViewport && insideLabelSafeArea && clearsAircraft;
    if (visible) candidates.push({ city, button, screenX, screenY, priority: city === instance.selectedCity ? -1 : city.tier });
  });
  const occupied = [];
  candidates.sort((a, b) => a.priority - b.priority).slice(0, instance.compact ? 1 : 2).forEach((candidate) => {
    const width = Math.max(76, candidate.city.name.length * 7.2 + 36);
    const box = { left: candidate.screenX - width / 2, right: candidate.screenX + width / 2, top: candidate.screenY - 15, bottom: candidate.screenY + 15 };
    if (occupied.some((other) => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top)) return;
    occupied.push(box);
    candidate.button.style.left = `${candidate.screenX.toFixed(1)}px`;
    candidate.button.style.top = `${candidate.screenY.toFixed(1)}px`;
    candidate.button.hidden = false;
  });
}

function wireNavigation(instance) {
  const { root, globe, camera, THREE } = instance;
  const pointers = new Map();
  let last = null;
  let pinchDistance = 0;
  const clampDistance = (amount) => {
    // Do not permit the camera to enter the low-resolution planet texture.
    // Detailed satellite/province imagery belongs to a licensed map-tile layer.
    const distance = THREE.MathUtils.clamp(camera.position.length() + amount, 6.45, 12.4);
    camera.position.setLength(distance);
    const nextMode = distance <= 6.65 ? "2d" : "3d";
    if (nextMode !== instance.mapMode) {
      instance.mapMode = nextMode;
      root.dispatchEvent(new CustomEvent("redeye:map-mode", { detail: { mode: nextMode, distance } }));
    }
  };
  instance.zoomControls?.querySelector('[data-globe-zoom="in"]')?.addEventListener("click", () => {
    clampDistance(-0.8);
    instance.interacted = true;
  });
  instance.zoomControls?.querySelector('[data-globe-zoom="out"]')?.addEventListener("click", () => {
    clampDistance(0.8);
    instance.interacted = true;
  });
  instance.zoomControls?.addEventListener("pointerdown", (event) => event.stopPropagation());

  root.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".city-pin")) return;
    root.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    last = { x: event.clientX, y: event.clientY };
    instance.interacted = true;
  });
  root.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const nextDistance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance) clampDistance((pinchDistance - nextDistance) * 0.012);
      pinchDistance = nextDistance;
      return;
    }
    if (last) {
      const dx = event.clientX - last.x;
      const dy = event.clientY - last.y;
      globe.rotation.y += dx * 0.006;
      globe.rotation.x = THREE.MathUtils.clamp(globe.rotation.x + dy * 0.005, -0.72, 0.72);
      last = { x: event.clientX, y: event.clientY };
    }
  });
  const release = (event) => {
    pointers.delete(event.pointerId);
    last = null;
    pinchDistance = 0;
  };
  root.addEventListener("pointerup", release);
  root.addEventListener("pointercancel", release);
  root.addEventListener("wheel", (event) => {
    event.preventDefault();
    clampDistance(event.deltaY * 0.008);
    instance.interacted = true;
  }, { passive: false });
}

function extrapolatedPosition(THREE, state, now = Date.now()) {
  const elapsed = Math.min(20, Math.max(0, (now - (state.observedAt || now)) / 1000));
  if (!elapsed || state.velocity == null || state.trueTrack == null) return state;
  const angularDistance = (state.velocity * elapsed) / 6371000;
  const bearing = THREE.MathUtils.degToRad(state.trueTrack);
  const latitude = THREE.MathUtils.degToRad(state.latitude);
  const longitude = THREE.MathUtils.degToRad(state.longitude);
  const nextLatitude = Math.asin(Math.sin(latitude) * Math.cos(angularDistance) + Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing));
  const nextLongitude = longitude + Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude), Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(nextLatitude));
  return { ...state, latitude: THREE.MathUtils.radToDeg(nextLatitude), longitude: THREE.MathUtils.radToDeg(nextLongitude) };
}

function advancePosition(THREE, state, seconds) {
  if (state.velocity == null || state.trueTrack == null) return state;
  const angularDistance = (state.velocity * seconds) / 6371000;
  const bearing = THREE.MathUtils.degToRad(state.trueTrack);
  const latitude = THREE.MathUtils.degToRad(state.latitude);
  const longitude = THREE.MathUtils.degToRad(state.longitude);
  const nextLatitude = Math.asin(Math.sin(latitude) * Math.cos(angularDistance) + Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing));
  const nextLongitude = longitude + Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude), Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(nextLatitude));
  return { ...state, latitude: THREE.MathUtils.radToDeg(nextLatitude), longitude: THREE.MathUtils.radToDeg(nextLongitude) };
}

function updateProjectedTrack(instance, state) {
  const routeMatchesState =
    state.originIata === instance.routeAirports?.origin?.iata &&
    state.destinationIata === instance.routeAirports?.destination?.iata;
  if (instance.routePoints?.length && (routeMatchesState || Number.isFinite(state.routeProgress))) return;
  if (state.velocity == null || state.trueTrack == null) return;
  const points = [];
  // Thirty minutes of constant-track geodesic projection. Each point is
  // calculated on the sphere from the live ADS-B speed and heading, so the
  // aircraft remains on the first segment as new positions arrive.
  for (let seconds = 0; seconds <= 1800; seconds += 90) {
    const projected = advancePosition(instance.THREE, state, seconds);
    const altitude = Math.max(0.018, instance.radius * Math.max(0, projected.baroAltitude ?? projected.geoAltitude ?? 0) / 6371000);
    points.push(sphericalPoint(instance.THREE, projected.latitude, projected.longitude, instance.radius + altitude));
  }
  instance.projectedTrack.geometry.dispose();
  instance.projectedTrack.geometry = new instance.THREE.BufferGeometry().setFromPoints(points);
}

function updatePlane(instance, state, now) {
  if (state.latitude == null || state.longitude == null) return;
  const { THREE, plane, globe, radius } = instance;
  const current = extrapolatedPosition(THREE, state, now);
  const altitude = Math.max(0.018, radius * Math.max(0, current.baroAltitude ?? current.geoAltitude ?? 0) / 6371000);
  const position = routePointForState(instance, current) ||
    sphericalPoint(THREE, current.latitude, current.longitude, radius + altitude);
  plane.position.copy(position);
  const normal = position.clone().normalize();
  let forward;
  if (instance.routePoints?.length && Number.isFinite(current.routeProgress)) {
    const routeIndex = Math.round(
      THREE.MathUtils.clamp(current.routeProgress, 0, 1) *
        (instance.routePoints.length - 1)
    );
    const nextPoint = instance.routePoints[Math.min(routeIndex + 1, instance.routePoints.length - 1)];
    forward = nextPoint.clone().sub(position);
  } else {
    const latitude = THREE.MathUtils.degToRad(current.latitude);
    const longitude = THREE.MathUtils.degToRad(current.longitude);
    const north = new THREE.Vector3(
      -Math.sin(latitude) * Math.cos(longitude),
      Math.cos(latitude),
      Math.sin(latitude) * Math.sin(longitude)
    ).normalize();
    const east = new THREE.Vector3(
      -Math.sin(longitude),
      0,
      -Math.cos(longitude)
    ).normalize();
    const heading = THREE.MathUtils.degToRad(current.trueTrack || 0);
    forward = north.multiplyScalar(Math.cos(heading)).add(east.multiplyScalar(Math.sin(heading)));
  }
  forward.addScaledVector(normal, -forward.dot(normal)).normalize();
  // CesiumAir's fuselage points down its local +Z axis. Keep +Y radial from
  // the globe and map +Z to the route tangent so the nose follows the same
  // bearing used by the 2D aircraft marker.
  const lateral = normal.clone().cross(forward).normalize();
  plane.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(lateral, normal, forward)
  );
  if (!instance.interacted && !instance.initialFlightCentered) {
    const direction = position.clone().normalize();
    const longitude = THREE.MathUtils.radToDeg(Math.atan2(-direction.z, direction.x));
    const latitude = THREE.MathUtils.radToDeg(Math.asin(direction.y));
    globe.rotation.y = THREE.MathUtils.degToRad(-longitude - 90);
    globe.rotation.x = THREE.MathUtils.degToRad(Math.max(-28, Math.min(28, latitude * 0.35)));
    instance.initialFlightCentered = true;
  }
}

export async function mountGlobeTracker(root, { compact = false } = {}) {
  if (!root || root.dataset.ready) return;
  root.dataset.ready = "true";
  root.innerHTML = `<div class="globe-loading" aria-hidden="true">Calibrating airspace</div>`;

  try {
    const THREE = await loadThree();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, compact ? 0.2 : 0.25, compact ? 9.35 : 9.1);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const cityLayer = document.createElement("div");
    cityLayer.className = "globe-city-layer";
    const destinationCard = document.createElement("aside");
    destinationCard.className = "destination-card";
    destinationCard.hidden = true;
    const zoomControls = document.createElement("div");
    zoomControls.className = "globe-zoom-controls";
    zoomControls.setAttribute("aria-label", "Globe zoom controls");
    zoomControls.innerHTML = `
      <button type="button" data-globe-zoom="in" aria-label="Zoom in">+</button>
      <button type="button" data-globe-zoom="out" aria-label="Zoom out">−</button>`;
    root.replaceChildren(renderer.domElement, cityLayer, destinationCard, zoomControls);

    const globe = new THREE.Group();
    const radius = compact ? 2.1 : 2.35;
    const loader = new THREE.TextureLoader();
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 128, 128),
      new THREE.MeshPhongMaterial({
        map: loadTexture(THREE, loader, TEXTURES.surface, true),
        normalMap: loadTexture(THREE, loader, TEXTURES.normal),
        normalScale: new THREE.Vector2(0.55, 0.55),
        specularMap: loadTexture(THREE, loader, TEXTURES.specular),
        specular: new THREE.Color(0x3e6e9d),
        shininess: 8,
      })
    );
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.012, 96, 96),
      new THREE.MeshPhongMaterial({ map: loadTexture(THREE, loader, TEXTURES.clouds, true), transparent: true, opacity: 0.37, depthWrite: false })
    );
    globe.add(earth, clouds);
    addLatitudeLongitudeGrid(THREE, globe, radius + 0.012);
    const observedTrack = makeObservedTrack(THREE);
    const projectedTrack = makeProjectedTrack(THREE);
    globe.add(observedTrack, projectedTrack);
    scene.add(globe);

    const plane = new THREE.Group();
    const fallbackPlane = makePlane(THREE);
    globe.add(plane);
    root.dataset.aircraft = "loading";
    updatePlane({ THREE, plane, globe, radius }, { latitude: 48.4, longitude: -31.2, trueTrack: 75 });
    scene.add(new THREE.HemisphereLight(0xf8fbff, 0x132640, 2.25));
    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(4, 5, 6);
    scene.add(sun);

    const cityButtons = CITIES.map((city) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "city-pin";
      button.innerHTML = `<span></span>${city.name}`;
      button.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        instance.interacted = true;
      });
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setDestinationCard(instance, city);
      });
      cityLayer.append(button);
      return button;
    });
    const instance = { THREE, renderer, scene, camera, globe, earth, clouds, plane, observedTrack, projectedTrack, pathPoints: [], routePoints: [], routeAirports: null, radius, compact, root, cityButtons, destinationCard, zoomControls, interacted: false, initialFlightCentered: false, mapMode: "3d" };
    instances.add(instance);
    wireNavigation(instance);
    loadAircraftModel(THREE).then((aircraft) => {
      if (!document.body.contains(root)) return;
      plane.clear();
      plane.add(aircraft);
      plane.userData.visual = aircraft;
      root.dataset.aircraft = "gltf";
      requestAnimationFrame(() => root.dispatchEvent(new CustomEvent("redeye:globe-ready")));
    }).catch((error) => {
      // Do not show a large primitive while a real model is loading. This small
      // marker is only a degraded-mode indicator after a confirmed failure.
      plane.add(fallbackPlane);
      plane.userData.visual = fallbackPlane;
      root.dataset.aircraft = "fallback";
      root.dataset.aircraftError = String(error?.message || "asset load failed").slice(0, 120);
      requestAnimationFrame(() => root.dispatchEvent(new CustomEvent("redeye:globe-ready")));
    });

    const resize = () => {
      const { width, height } = root.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(root);
    resize();

    const start = performance.now();
    const render = (now) => {
      if (!document.body.contains(root)) return instances.delete(instance);
      const t = (now - start) / 1000;
      if (!instance.interacted && !instance.tracked) globe.rotation.y += 0.00105;
      clouds.rotation.y += 0.00035;
      if (instance.liveState) {
        const currentState = extrapolatedPosition(THREE, instance.liveState, Date.now());
        updatePlane(instance, instance.liveState, Date.now());
        if (!instance.lastProjectionUpdate || now - instance.lastProjectionUpdate > 750) {
          updateProjectedTrack(instance, currentState);
          instance.lastProjectionUpdate = now;
        }
      }
      if (plane.userData.visual === fallbackPlane) fallbackPlane.rotation.z = Math.sin(t * 2.4) * 0.045;
      updateCityLayer(instance);
      renderer.render(scene, camera);
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  } catch {
    root.innerHTML = `<div class="globe-fallback"><span>✦</span><strong>Global position view</strong><small>3D view is available when WebGL is enabled.</small></div>`;
  }
}

export function setTrackedFlight(state) {
  if (state.latitude == null || state.longitude == null) return;

  instances.forEach((instance) => {
    instance.tracked = true;
    instance.liveState = { ...state, observedAt: state.observedAt || Date.now() };
    if (!updateRouteTrackSegments(instance, state)) {
      const point = sphericalPoint(instance.THREE, state.latitude, state.longitude, instance.radius + 0.024);
      if (!instance.pathPoints.length || instance.pathPoints[instance.pathPoints.length - 1].distanceTo(point) > 0.002) {
        instance.pathPoints.push(point);
        if (instance.pathPoints.length > 180) instance.pathPoints.shift();
        instance.observedTrack.geometry.dispose();
        instance.observedTrack.geometry = new instance.THREE.BufferGeometry().setFromPoints(instance.pathPoints);
        instance.observedTrack.computeLineDistances();
      }
    }
    updateProjectedTrack(instance, instance.liveState);
    updatePlane(instance, instance.liveState);
  });
}

export function setGlobeRouteAirports(origin, destination) {
  if (!origin || !destination) return;
  instances.forEach((instance) => {
    instance.routeAirports = { origin, destination };
    instance.routePoints = makeRouteArcPoints(instance.THREE, origin, destination, instance.radius);
    instance.projectedTrack.geometry.dispose();
    instance.projectedTrack.geometry = new instance.THREE.BufferGeometry().setFromPoints(instance.routePoints);
    instance.root.dataset.routeArc = `${origin.iata}-${destination.iata}`;
    if (!instance.interacted && instance.routePoints.length) {
      const midpoint = instance.routePoints[Math.floor(instance.routePoints.length / 2)].clone().normalize();
      const midpointLongitude = instance.THREE.MathUtils.radToDeg(Math.atan2(-midpoint.z, midpoint.x));
      const midpointLatitude = instance.THREE.MathUtils.radToDeg(Math.asin(midpoint.y));
      instance.globe.rotation.y = instance.THREE.MathUtils.degToRad(-midpointLongitude - 90);
      instance.globe.rotation.x = instance.THREE.MathUtils.degToRad(Math.max(-24, Math.min(24, midpointLatitude * 0.3)));
    }
    if (instance.liveState) {
      updateRouteTrackSegments(instance, instance.liveState);
      updatePlane(instance, instance.liveState);
    }
  });
}

export function setGlobeViewDistance(root, distance, mode = "3d") {
  const instance = [...instances].find((candidate) => candidate.root === root);
  if (!instance) return;
  instance.camera.position.setLength(
    instance.THREE.MathUtils.clamp(distance, 6.45, 12.4)
  );
  instance.mapMode = mode;
}
