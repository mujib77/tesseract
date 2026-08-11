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
let finalReadout = '';
let detectorCount = 0;

function world(point) {
  return new THREE.Vector3(
    point[0] * 1.15,
    0,
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
  chamber.add(sprite);
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
  const position = world(component.position);
  const color = componentColor(component.type);

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
  plinth.position.y = -0.72;
  chamber.add(plinth);

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
  chamber.add(enclosure);

  const enclosureEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.7, 1.45, 1.25)),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
    }),
  );

  enclosureEdges.position.copy(position);
  chamber.add(enclosureEdges);
  chamber.add(mesh);
  componentMeshes.set(component.name, mesh);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.025, 8, 32),
    new THREE.MeshBasicMaterial({ color }),
  );

  ring.position.copy(position);
  ring.rotation.x = Math.PI / 2;
  chamber.add(ring);

  label(
    component.name.replaceAll('_', ' '),
    position.clone().add(new THREE.Vector3(0, 1.2, 0)),
    `#${color.toString(16).padStart(6, '0')}`,
    0.58,
  );
}

function addWire(segment) {
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

  chamber.add(fibre);

  const core = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([start, end]),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: segment.active ? 0.7 : 0.08,
    }),
  );

  chamber.add(core);

  if (!segment.active) return;

  const photon = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 16),
    new THREE.MeshBasicMaterial({ color }),
  );

  photon.visible = false;
  chamber.add(photon);

  pulses.push({
    photon,
    start,
    end,
    startTime: segment.startTime,
    endTime: segment.endTime,
  });
}

function buildChamber(trace) {
  trace.components.forEach(addComponent);
  trace.segments.forEach(addWire);

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
      replayStart = clock.getElapsedTime();
    });

    function animate() {
      requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime() - replayStart;
      update(elapsed % cycleDuration, trace);

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