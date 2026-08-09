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

const geo = new THREE.BoxGeometry(2, 2, 2);
const testCube = new THREE.Mesh(geo, mirrorMat);
testCube.position.set(5, 0, 0);
scene.add(testCube);

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