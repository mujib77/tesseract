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

let currentCubes = [];
let currentMeshes = [];

function clearScene() {
  currentMeshes.forEach(m => scene.remove(m));
  currentMeshes = [];
}

function buildScene(cubes) {
  clearScene();

  const mirrorMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0.85, roughness: 0.15, clearcoat: 1.0,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x88ccff, metalness: 0.0, roughness: 0.05, transmission: 0.9, transparent: true, opacity: 0.4,
  });
  const geo = new THREE.BoxGeometry(2, 2, 2);

  cubes.forEach(cube => {
    const mat = cube.state ? mirrorMat : glassMat;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cube.point[0], cube.point[1], cube.point[2]);
    scene.add(mesh);
    currentMeshes.push(mesh);
  });
}

function runTrace(expr) {
  const { cubes, result } = compileExpression(expr);
  const points = traceGeometry(cubes).map(p => new THREE.Vector3(p[0], p[1], p[2]));

  buildScene(cubes);
  document.getElementById('resultLabel').textContent = `out = ${result}`;
  animateBeamFromPoints(points);
}

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

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  composer.render();
}
animate();