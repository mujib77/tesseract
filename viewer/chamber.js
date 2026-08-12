import * as THREE from 'three';
import { OrbitControls } from
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020407);
scene.fog = new THREE.FogExp2(0x020407, 0.022);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(10, 14, 23);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(8, 0, 0);
controls.enableDamping = true;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.0,
  0.65,
  0.55,
));

scene.add(new THREE.AmbientLight(0x102030, 1.2));

const ceilingLight = new THREE.PointLight(0x8fdfff, 20, 45);
ceilingLight.position.set(7, 10, 5);
scene.add(ceilingLight);

const floor = new THREE.GridHelper(35, 35, 0x103744, 0x07151c);
floor.position.y = -0.85;
scene.add(floor);

const chamber = new THREE.Group();
scene.add(chamber);

const pulses = [];
const componentMeshes = new Map();
let cycleDuration = 1;
let replayStart = 0;
let cinematic = false;

const buildQueue = [];
let buildTarget = null;
let chamberPhase = 'ready';
let constructionStart = 0;
let constructionDuration = 0;

function addToChamber(object) {
  (buildTarget ?? chamber).add(object);
  return object;
}

function componentBuildTime(component) {
  if (component.type === 'output_wall') return 5.1;
  if (component.type === 'detector') return 5.6;

  return 0.25 + Math.max(0, component.position[0] - 1) * 0.17 +
    (component.type === 'full_adder' ? 0.16 : 0);
}

function wireBuildTime(segment) {
  if (segment.end[0] >= 33) return 5.35;
  return 0.45 + Math.max(segment.start[0], segment.end[0]) * 0.17;
}

function stageForConstruction(group, startTime) {
  const items = [];

  group.traverse(object => {
    if (!object.isMesh && !object.isLine && !object.isSprite) return;

    const materials = (Array.isArray(object.material)
      ? object.material
      : [object.material]
    ).filter(Boolean).map(material => {
      const opacity = material.opacity ?? 1;
      material.transparent = true;
      material.needsUpdate = true;
      return { material, opacity };
    });

    items.push({
      object,
      baseScale: object.scale.clone(),
      materials,
    });
  });

  group.visible = false;

  buildQueue.push({ group, startTime, items });

  constructionDuration = Math.max(
    constructionDuration,
    startTime + 0.55,
  );
}

function showAllBuildables() {
  buildQueue.forEach(entry => {
    entry.group.visible = true;

    entry.items.forEach(item => {
      item.object.scale.copy(item.baseScale);

      item.materials.forEach(({ material, opacity }) => {
        material.opacity = opacity;
      });
    });
  });
}

function resetConstruction() {
  buildQueue.forEach(entry => {
    entry.group.visible = false;
  });
}

function updateConstruction(elapsed) {
  let completed = 0;

  buildQueue.forEach(entry => {
    const progress = THREE.MathUtils.clamp(
      (elapsed - entry.startTime) / 0.55,
      0,
      1,
    );

    const ease = 1 - (1 - progress) ** 3;
    entry.group.visible = progress > 0;

    entry.items.forEach(item => {
      item.object.scale
        .copy(item.baseScale)
        .multiplyScalar(0.64 + ease * 0.36);

      item.materials.forEach(({ material, opacity }) => {
        material.opacity = opacity * (0.08 + ease * 0.92);
      });
    });

    if (progress === 1) completed++;
  });

  const percent = Math.round(
    Math.min(elapsed / constructionDuration, 1) * 100,
  );

  document.getElementById('result').textContent =
    `COMPILER / ASSEMBLING PHYSICAL CHAMBER ${percent}% ` +
    `(${completed}/${buildQueue.length} MODULES)`;

  return completed === buildQueue.length;
}

function beginCinematicConstruction(now) {
  cinematic = true;
  controls.enabled = false;
  chamberPhase = 'building';
  constructionStart = now;

  resetConstruction();
  frameChamber();

  document.getElementById('result').textContent =
    'COMPILER / MATERIALIZING PHYSICAL CHAMBER';
}

let finalReadout = '';
let detectorCount = 0;

function world(point) {
  return new THREE.Vector3(
    point[0] * 1.15,
    point[2] * 1.15,
    point[1] * 1.15,
  );
}

function label(text, position, color, scale = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;

  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 46px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  }));

  sprite.position.copy(position);
  sprite.scale.set(3 * scale, 0.75 * scale, 1);
  addToChamber(sprite);
}

function componentGeometry(type) {
  if (type === 'emitter') return new THREE.CylinderGeometry(0.42, 0.72, 1.2, 24);
  if (type === 'splitter') return new THREE.ConeGeometry(0.7, 1.25, 4);
  if (type === 'detector') return new THREE.BoxGeometry(0.38, 1.3, 1.3);
  if (type === 'xor_gate') return new THREE.OctahedronGeometry(0.82);
  if (type === 'and_gate') return new THREE.BoxGeometry(1.15, 0.9, 0.7);
  if (type === 'full_adder') return new THREE.BoxGeometry(2.2, 1.35, 1.5);
  return new THREE.DodecahedronGeometry(0.8);
}

function componentColor(type) {
  if (type === 'emitter') return 0x00d9ff;
  if (type === 'splitter') return 0xffb000;
  if (type === 'detector') return 0x74ff9b;
  if (type === 'xor_gate') return 0xff35d3;
  if (type === 'and_gate') return 0x8d76ff;
  if (type === 'full_adder') return 0xff4fd8;
  return 0xcf7cff;
}

function addComponent(component) {
  const group = new THREE.Group();
  chamber.add(group);
  buildTarget = group;

  const position = world(component.position);
  const color = componentColor(component.type);

  if (component.type === 'output_wall') {
    const wallPosition = position.clone();
    wallPosition.y = 5.5;

    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 11.5, 2.2),
      new THREE.MeshPhysicalMaterial({
        color: 0x0b2c34,
        emissive: 0x06222a,
        emissiveIntensity: 0.35,
        metalness: 0.5,
        roughness: 0.14,
        transparent: true,
        opacity: 0.42,
        transmission: 0.25,
      }),
    );

    wall.position.copy(wallPosition);
    addToChamber(wall);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.5, 11.5, 2.2)),
      new THREE.LineBasicMaterial({
        color: 0x00d9ff,
        transparent: true,
        opacity: 0.45,
      }),
    );

    edges.position.copy(wallPosition);
    addToChamber(edges);

    label(
      'OUTPUT DETECTOR WALL',
      wallPosition.clone().add(new THREE.Vector3(0, 6.3, 0)),
      '#68ff88',
      0.75,
    );

    componentMeshes.set(component.name, wall);

    buildTarget = null;
    stageForConstruction(group, componentBuildTime(component));
    return;
  }

  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.12,
    metalness: 0.55,
    roughness: 0.18,
    transparent: true,
    opacity: 0.9,
  });

  const mesh = new THREE.Mesh(componentGeometry(component.type), material);
  mesh.position.copy(position);

  if (component.type === 'emitter') {
    mesh.rotation.z = Math.PI / 2;
  }

  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.92, 1.15, 0.14, 6),
    new THREE.MeshStandardMaterial({
      color: 0x07151c,
      metalness: 0.8,
      roughness: 0.28,
    }),
  );

  plinth.position.copy(position);
  plinth.position.y = position.y - 0.72;
  addToChamber(plinth);

  const enclosure = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 1.45, 1.25),
    new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity: 0.13,
      transmission: 0.35,
      roughness: 0.08,
      metalness: 0.2,
    }),
  );

  enclosure.position.copy(position);
  addToChamber(enclosure);

  const enclosureEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.7, 1.45, 1.25)),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
    }),
  );

  enclosureEdges.position.copy(position);
  addToChamber(enclosureEdges);

  addToChamber(mesh);
  componentMeshes.set(component.name, mesh);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.025, 8, 32),
    new THREE.MeshBasicMaterial({ color }),
  );

  ring.position.copy(position);
  ring.rotation.x = Math.PI / 2;
  addToChamber(ring);

  label(
    component.name.replaceAll('_', ' '),
    position.clone().add(new THREE.Vector3(0, 1.2, 0)),
    `#${color.toString(16).padStart(6, '0')}`,
    0.58,
  );

  buildTarget = null;
  stageForConstruction(group, componentBuildTime(component));
}

function addWire(segment) {
  const group = new THREE.Group();
  chamber.add(group);
  buildTarget = group;

  const start = world(segment.start);
  const end = world(segment.end);
  const color = new THREE.Color(segment.color);
  const wireColor = segment.active ? color : new THREE.Color(0x15303b);

  const path = new THREE.LineCurve3(start, end);

  const fibre = new THREE.Mesh(
    new THREE.TubeGeometry(path, 16, 0.07, 8, false),
    new THREE.MeshPhysicalMaterial({
      color: wireColor,
      emissive: wireColor,
      emissiveIntensity: segment.active ? 0.18 : 0.02,
      transparent: true,
      opacity: segment.active ? 0.42 : 0.12,
      transmission: 0.4,
      roughness: 0.08,
    }),
  );

  addToChamber(fibre);

  const core = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([start, end]),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: segment.active ? 0.7 : 0.08,
    }),
  );

  addToChamber(core);

  if (segment.active) {
    const photon = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 16),
      new THREE.MeshBasicMaterial({ color }),
    );

    photon.visible = false;
    addToChamber(photon);

    pulses.push({
      photon,
      start,
      end,
      startTime: segment.startTime,
      endTime: segment.endTime,
    });
  }

  buildTarget = null;
  stageForConstruction(group, wireBuildTime(segment));
}

function frameChamber() {
  const bounds = new THREE.Box3().setFromObject(chamber);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.z);

  controls.target.set(center.x, 3.5, center.z);

  camera.position.set(
    center.x - span * 0.18,
    Math.max(11, span * 0.42),
    center.z + Math.max(18, span * 0.9),
  );
}

function updateCinematic(simulationTime, trace) {
  const completedGates = trace.events
    .filter(event =>
      event.type === 'full_adder' &&
      event.time <= simulationTime,
    );

  const finalDetectorTime = Math.max(
    ...trace.detectors.map(detector => detector.time),
  );

  let focusName = completedGates.length > 0
    ? completedGates.at(-1).name
    : 'CARRY_IN';

  if (simulationTime >= finalDetectorTime - 0.65) {
    focusName = 'READOUT_WALL';
  }

  const focusMesh = componentMeshes.get(focusName);
  if (!focusMesh) return;

  const target = focusMesh.position;

  const finalReveal = focusName === 'READOUT_WALL';

  const desiredCameraPosition = target.clone().add(
    finalReveal
      ? new THREE.Vector3(-8, 2.5, 9)
      : new THREE.Vector3(-6, 4.5, 8),
  );

  camera.position.lerp(desiredCameraPosition, 0.045);
  controls.target.lerp(target, 0.07);
}

function buildChamber(trace) {
  trace.components.forEach(addComponent);
  trace.segments.forEach(addWire);
  showAllBuildables();
  frameChamber();

  cycleDuration = Math.max(
    ...trace.detectors.map(detector => detector.time),
  ) + 1.2;

    const sumDetectors = trace.detectors
    .filter(detector =>
      detector.name === 'SUM' || detector.name.startsWith('SUM_'),
    )
    .sort((left, right) => {
      const leftBit = left.name === 'SUM'
        ? 0
        : Number(left.name.split('_')[1]);

      const rightBit = right.name === 'SUM'
        ? 0
        : Number(right.name.split('_')[1]);

      return leftBit - rightBit;
    });

  const carry = trace.detectors.find(detector =>
    detector.name === 'CARRY' || detector.name === 'CARRY_OUT',
  );

  let decimal = 0;
  sumDetectors.forEach((detector, bit) => {
    if (detector.value) decimal += 2 ** bit;
  });

  if (carry?.value) {
    decimal += 2 ** sumDetectors.length;
  }

  const lowBits = sumDetectors
    .slice()
    .reverse()
    .map(detector => Number(detector.value))
    .join('');

  const binary = `${carry?.value ? '1' : ''}${lowBits}`;

  document.getElementById('input').textContent =
    `INPUT PACKET / A:${trace.inputs.a} B:${trace.inputs.b} CIN:${Number(trace.inputs.carryIn ?? false)}`;

finalReadout = `DETECTOR ARRAY / ${binary}₂ = ${decimal}`;
detectorCount = trace.detectors.length;

document.getElementById('result').textContent =
  'DETECTOR ARRAY / WAITING FOR LIGHT';
}

function update(simulationTime, trace) {
  pulses.forEach(pulse => {
    const progress = (simulationTime - pulse.startTime) /
      (pulse.endTime - pulse.startTime);

    pulse.photon.visible = progress >= 0 && progress <= 1;

    if (pulse.photon.visible) {
      pulse.photon.position.lerpVectors(pulse.start, pulse.end, progress);
      const scale = 0.8 + Math.sin(progress * Math.PI) * 0.75;
      pulse.photon.scale.setScalar(scale);
    }
  });

  trace.events.forEach(event => {
    const mesh = componentMeshes.get(event.name);
    if (!mesh) return;

    const active = simulationTime >= event.time;
    mesh.material.emissiveIntensity = active && event.value ? 1.25 : 0.12;
  });
    const completedDetectors = trace.detectors.filter(detector =>
    simulationTime >= detector.time,
  ).length;

  document.getElementById('result').textContent =
    completedDetectors === detectorCount
      ? finalReadout
      : `DETECTOR ARRAY / COLLECTING ${completedDetectors}/${detectorCount} SIGNALS`;

       if (cinematic && chamberPhase === 'executing') {
  updateCinematic(simulationTime, trace);
}
}

fetch('adder_trace.json')
  .then(response => {
    if (!response.ok) throw new Error('adder_trace.json was not found');
    return response.json();
  })
  .then(trace => {
    buildChamber(trace);

    const clock = new THREE.Clock();

 document.getElementById('replay').addEventListener('click', () => {
  cinematic = false;
  controls.enabled = true;
  chamberPhase = 'executing';
  showAllBuildables();
  replayStart = clock.getElapsedTime();
});

document.getElementById('cinematic').addEventListener('click', () => {
  beginCinematicConstruction(clock.getElapsedTime());
});

function animate() {
  requestAnimationFrame(animate);

  const now = clock.getElapsedTime();

  if (chamberPhase === 'building') {
    const ready = updateConstruction(now - constructionStart);

    if (ready) {
      chamberPhase = 'executing';
      replayStart = now;

      document.getElementById('result').textContent =
        'DETECTOR ARRAY / WAITING FOR LIGHT';
    }
  } else {
    const elapsed = now - replayStart;
    update(elapsed % cycleDuration, trace);
  }

  controls.update();
  composer.render();
}

    animate();
  })
  .catch(error => {
    document.getElementById('input').textContent = `ERROR / ${error.message}`;
  });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});