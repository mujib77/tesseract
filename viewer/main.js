import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/environments/RoomEnvironment.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000010, 0.015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(8, 6, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);  
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(5, 0, 0);
controls.enableDamping = true;

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const cyan = new THREE.PointLight(0x00ffff, 8, 50);
cyan.position.set(0, 5, 10);
scene.add(cyan);

const magenta = new THREE.PointLight(0xff00ff, 8, 50);
magenta.position.set(10, 10, -5);
scene.add(magenta);

const white = new THREE.PointLight(0xffffff, 5, 50);
white.position.set(5, 15, 5);
scene.add(white);

scene.add(new THREE.AmbientLight(0x111122));

const mirrorMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0.85,
  roughness: 0.15,
  clearcoat: 1.0,
});

async function loadGeometry() {
  const res = await fetch('geometry.json');
  const data = await res.json();

  const mirrorMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.85,
    roughness: 0.15,
    clearcoat: 1.0,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x88ccff,
    metalness: 0.0,
    roughness: 0.05,
    transmission: 0.9,
    transparent: true,
    opacity: 0.4,
  });

  const geo = new THREE.BoxGeometry(2, 2, 2);

  data.cubes.forEach(cube => {
    const mat = cube.state ? mirrorMat : glassMat;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cube.point[0], cube.point[1], cube.point[2]);
    scene.add(mesh);
  });
}

async function animateBeam() {
  const res = await fetch('trace.json');
  const data = await res.json();
  const points = data.points.map(p => new THREE.Vector3(p[0], p[1], p[2]));

  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0);
  const material = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 3 });

  const beamGeo = new THREE.BufferGeometry().setFromPoints([points[0]]);
  const beamLine = new THREE.Line(beamGeo, material);
  scene.add(beamLine);

  const photonGeo = new THREE.SphereGeometry(0.15, 16, 16);
  const photonMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  const photon = new THREE.Mesh(photonGeo, photonMat);
  scene.add(photon);

  const totalSegments = points.length - 1;
  const segmentDuration = 1.2;
  let currentSegment = 0;
  let segmentStart = performance.now();
  const drawnPoints = [points[0]];

  function step(now) {
    const elapsed = (now - segmentStart) / 1000;
    const t = Math.min(elapsed / segmentDuration, 1);

    const from = points[currentSegment];
    const to = points[currentSegment + 1];
    const current = new THREE.Vector3().lerpVectors(from, to, t);
    photon.position.copy(current);

    const previewPoints = [...drawnPoints, current];
    beamLine.geometry.dispose();
    beamLine.geometry = new THREE.BufferGeometry().setFromPoints(previewPoints);

    if (t >= 1) {
      drawnPoints.push(to);
      currentSegment++;
      segmentStart = now;
      if (currentSegment >= totalSegments) {
        return; 
      }
    }

    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

let mathScope = {};
let currentMeshes = [];
let lightPulses = [];

function formatNumber(value) {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(4)));
}

function toBinary(value) {
  if (!Number.isSafeInteger(value)) return null;

  const sign = value < 0 ? '-' : '';
  const magnitude = Math.abs(value);

  const width = Math.max(
    4,
    magnitude === 0 ? 1 : Math.ceil(Math.log2(magnitude + 1)),
  );

  return sign + magnitude.toString(2).padStart(width, '0');
}

function binarySummary(value) {
  const binary = toBinary(value);
  if (!binary) return null;

  const bitCount = binary.replace('-', '').length;

  return bitCount <= 12
    ? binary
    : `${bitCount}-bit light bus`;
}

function addBitStrip(value, center) {
  const binary = toBinary(value);
  if (!binary) return;

  const bits = binary.replace('-', '');
  const maxWidth = 3.0;
  const cellWidth = Math.min(0.28, maxWidth / bits.length);
  const blockWidth = cellWidth * 0.7;
  const totalWidth = cellWidth * bits.length;
  const startX = center.x - totalWidth / 2 + cellWidth / 2;

  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(totalWidth + 0.16, 0.48, 0.05),
    new THREE.MeshBasicMaterial({
      color: 0x07151c,
      transparent: true,
      opacity: 0.8,
    }),
  );

  rail.position.set(center.x, center.y, center.z - 0.08);
  scene.add(rail);
  currentMeshes.push(rail);

  bits.split('').forEach((bit, index) => {
    const on = bit === '1';

    const block = new THREE.Mesh(
      new THREE.BoxGeometry(blockWidth, 0.32, 0.12),
      new THREE.MeshBasicMaterial({
        color: on ? 0x68ff88 : 0x123343,
        transparent: true,
        opacity: on ? 1 : 0.32,
      }),
    );

    block.position.set(
      startX + index * cellWidth,
      center.y,
      center.z,
    );

    scene.add(block);
    currentMeshes.push(block);
  });
}

function clearScene() {
  currentMeshes.forEach(mesh => scene.remove(mesh));
  currentMeshes = [];
  lightPulses = [];
}

function addLabel(text, position, color, scale = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 54px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = `#${color.toString(16).padStart(6, '0')}`;
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  const label = new THREE.Sprite(material);
  label.position.copy(position);
  label.scale.set(2.8 * scale, 0.7 * scale, 1);

  scene.add(label);
  currentMeshes.push(label);
}

function addLaser(from, to, color, offset = 0) {
  const middle = from.clone().lerp(to, 0.5);
  middle.y += from.y <= to.y ? 0.55 : -0.55;

  const curve = new THREE.QuadraticBezierCurve3(from, middle, to);
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(32));
  const lineMaterial = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.88,
  });

  const line = new THREE.Line(lineGeometry, lineMaterial);
  scene.add(line);
  currentMeshes.push(line);

  const photon = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 16, 16),
    new THREE.MeshBasicMaterial({ color }),
  );

  photon.position.copy(from);
  scene.add(photon);
  currentMeshes.push(photon);

  lightPulses.push({ photon, curve, offset });
}

function updateLightPulses(time) {
  lightPulses.forEach(pulse => {
    const progress = (time * 0.00028 + pulse.offset) % 1;
    pulse.photon.position.copy(pulse.curve.getPoint(progress));

    const size = 0.8 + Math.sin(progress * Math.PI) * 0.55;
    pulse.photon.scale.setScalar(size);
  });
}

function getGraphLayout(steps) {
  const byId = new Map(steps.map(step => [step.id, step]));
  const depths = new Map();

  function getDepth(id) {
    if (depths.has(id)) return depths.get(id);

    const step = byId.get(id);
    const depth = step.inputs.length === 0
      ? 0
      : Math.max(...step.inputs.map(getDepth)) + 1;

    depths.set(id, depth);
    return depth;
  }

  steps.forEach(step => getDepth(step.id));

  const levels = new Map();
  steps.forEach(step => {
    const depth = depths.get(step.id);
    if (!levels.has(depth)) levels.set(depth, []);
    levels.get(depth).push(step);
  });

  const positions = new Map();
  let maxDepth = 0;

  levels.forEach((level, depth) => {
    maxDepth = Math.max(maxDepth, depth);

    level.forEach((step, index) => {
      const y = (index - (level.length - 1) / 2) * 2.7;
      positions.set(step.id, new THREE.Vector3(depth * 3.6, y, 0));
    });
  });

  return { positions, maxDepth };
}

function addMathNode(step, position) {
  const source = step.kind === 'source';
  const assignment = step.kind === 'assign';

  const color = source
    ? 0x00d9ff
    : assignment
      ? 0xffb000
      : 0xff00d4;

  const geometry = source
    ? new THREE.SphereGeometry(0.62, 32, 32)
    : assignment
      ? new THREE.BoxGeometry(1.05, 1.05, 1.05)
      : new THREE.OctahedronGeometry(0.85);

  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.7,
    metalness: 0.45,
    roughness: 0.2,
  });

  const node = new THREE.Mesh(geometry, material);
  node.position.copy(position);
  scene.add(node);
  currentMeshes.push(node);

  const glow = new THREE.PointLight(color, 3.5, 8);
  glow.position.copy(position);
  scene.add(glow);
  currentMeshes.push(glow);

  addLabel(
    step.label,
    position.clone().add(new THREE.Vector3(0, 1.2, 0)),
    color,
    0.82,
  );

 const bitSummary = binarySummary(step.value);

addLabel(
  bitSummary
  ? `${formatNumber(step.value)}  |  ${bitSummary}`
  : formatNumber(step.value),
  position.clone().add(new THREE.Vector3(0, -1.1, 0)),
  color,
  0.58,
);

addBitStrip(
  step.value,
  position.clone().add(new THREE.Vector3(0, -0.18, 0.78)),
);
}

function addResultNode(result, position) {
  const color = 0x68ff88;

  const prism = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.0),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.1,
      metalness: 0.25,
      roughness: 0.1,
    }),
  );

  prism.position.copy(position);
  scene.add(prism);
  currentMeshes.push(prism);

  const glow = new THREE.PointLight(color, 5, 12);
  glow.position.copy(position);
  scene.add(glow);
  currentMeshes.push(glow);

  addLabel(
    `= ${formatNumber(result)}`,
    position.clone().add(new THREE.Vector3(0, 1.55, 0)),
    color,
    1.15,
  );

  const binary = toBinary(result);

if (binary) {
  addBitStrip(
    result,
    position.clone().add(new THREE.Vector3(0, -0.2, 0.95)),
  );

  addLabel(
    binarySummary(result),
    position.clone().add(new THREE.Vector3(0, -1.45, 0)),
    color,
    0.68,
  );
}
}

function buildMathScene(program) {
  clearScene();

  const { positions, maxDepth } = getGraphLayout(program.steps);

  program.steps.forEach(step => {
    const destination = positions.get(step.id);

    step.inputs.forEach((inputId, index) => {
      const origin = positions.get(inputId);
      const color = index === 0 ? 0x00e5ff : 0xff35d3;
      addLaser(origin, destination, color, step.id * 0.13 + index * 0.37);
    });
  });

  program.steps.forEach(step => {
    addMathNode(step, positions.get(step.id));
  });

  const finalStep = program.steps.at(-1);
  const finalPosition = new THREE.Vector3((maxDepth + 1) * 3.6, 0, 0);

  addLaser(
    positions.get(finalStep.id),
    finalPosition,
    0x68ff88,
    0.85,
  );

  addResultNode(program.result, finalPosition);

  const focusX = finalPosition.x / 2;
  controls.target.set(focusX, 0, 0);
  camera.position.set(focusX + 7, 6, 12);
}

function runTrace(expr) {
  try {
    const program = TesseractMath.run(expr, mathScope);
    mathScope = program.scope;

    buildMathScene(program);

    document.getElementById('resultLabel').textContent =
      `out = ${formatNumber(program.result)}`;
  } catch (error) {
    document.getElementById('resultLabel').textContent =
      `Error: ${error.message}`;
  }
}

document.getElementById('runBtn').addEventListener('click', () => {
  runTrace(document.getElementById('exprInput').value);
});

runTrace('1 + 1');

function animateBeamFromPoints(points) {
  const material = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 3 });
  const beamGeo = new THREE.BufferGeometry().setFromPoints([points[0]]);
  const beamLine = new THREE.Line(beamGeo, material);
  scene.add(beamLine);
  currentMeshes.push(beamLine);

  const photonGeo = new THREE.SphereGeometry(0.15, 16, 16);
  const photonMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  const photon = new THREE.Mesh(photonGeo, photonMat);
  scene.add(photon);
  currentMeshes.push(photon);

  const totalSegments = points.length - 1;
  const segmentDuration = 1.2;
  let currentSegment = 0;
  let segmentStart = performance.now();
  const drawnPoints = [points[0]];

  function step(now) {
    const elapsed = (now - segmentStart) / 1000;
    const t = Math.min(elapsed / segmentDuration, 1);
    const from = points[currentSegment];
    const to = points[currentSegment + 1];
    const current = new THREE.Vector3().lerpVectors(from, to, t);
    photon.position.copy(current);

    beamLine.geometry.dispose();
    beamLine.geometry = new THREE.BufferGeometry().setFromPoints([...drawnPoints, current]);

    if (t >= 1) {
      drawnPoints.push(to);
      currentSegment++;
      segmentStart = now;
      if (currentSegment >= totalSegments) return;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

document.getElementById('runBtn').addEventListener('click', () => {
  runTrace(document.getElementById('exprInput').value);
});

runTrace('out = (true AND false) OR true');

const grid = new THREE.GridHelper(30, 30, 0x330033, 0x110011);
scene.add(grid);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.6,  
  0.4,  
  0.6   
);
composer.addPass(bloomPass);

function animate(time = 0) {
  requestAnimationFrame(animate);
  updateLightPulses(time);
  controls.update();
  composer.render();
}
animate();