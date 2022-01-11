import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';

import { PointerLockControls } from 'https://threejs.org/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://threejs.org/examples/jsm/loaders/GLTFLoader.js';
//import { Octree } from 'https://threejs.org/examples/jsm/math/Octree.js';
import { Capsule } from 'https://threejs.org/examples/jsm/math/Capsule.js';
import {
    EffectComposer
} from 'https://cdn.skypack.dev/three@0.135.0/examples/jsm/postprocessing/EffectComposer.js';
import {
    RenderPass
} from 'https://cdn.skypack.dev/three@0.135.0/examples/jsm/postprocessing/RenderPass.js';
import {
    ShaderPass
} from 'https://cdn.skypack.dev/three@0.135.0/examples/jsm/postprocessing/ShaderPass.js';
import {
    FilmPass
} from 'https://cdn.skypack.dev/three@0.135.0/examples/jsm/postprocessing/FilmPass.js';
import { SMAAPass } from 'https://cdn.skypack.dev/three@0.135.0/examples/jsm/postprocessing/SMAAPass.js';
import * as BufferGeometryUtils from 'https://cdn.skypack.dev/three@0.135.0/examples/jsm/utils/BufferGeometryUtils.js';

import {
    BloomShader
} from "./BloomShader.js";
import {
    BoxBlurShader
} from "./BoxBlurShader.js";
import {
    BloomAddShader
} from './BloomAddShader.js';
import {
    FogShader
} from "./FogShader.js";
import { Octree } from "./Octree.js";
import { MeshBVH, MeshBVHVisualizer } from './three-mesh-bvh.js';

let camera, scene, renderer, controls;

const objects = [];

let raycaster;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

let prevTime = performance.now();
let movement_speed = 400.0;
let dirLight;
const bloomScene = new THREE.Scene();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const vertex = new THREE.Vector3();
const color = new THREE.Color();
let collider;
let visualizer;
let mergedGeometry;
init();
const keys = {};

function init() {

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.y = 1.6;
    camera.lookAt(0, 1.7, -1);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x69e6f4);
    scene.fog = new THREE.Fog(0x69e6f4, 1600, 2000);
    const light = new THREE.HemisphereLight(0xffeeff, 0x777788, 1);
    light.position.set(0.5, 1, 0.75);
    scene.add(light);
    dirLight = new THREE.DirectionalLight(0x8888ff, 1);
    dirLight.position.set(90, 360, 170 * 3);
    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 1000;
    dirLight.shadow.camera.right = 400;
    dirLight.shadow.camera.left = -400;
    dirLight.shadow.camera.top = 400;
    dirLight.shadow.camera.bottom = -400;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.radius = 4;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);
    scene.add(dirLight.target);
    const helper = new THREE.CameraHelper(dirLight.shadow.camera);
    //scene.add(helper);
    controls = new PointerLockControls(camera, document.body);

    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');
    const flyout = document.getElementById('fly-out');

    instructions.addEventListener('click', function() {
        controls.lock();

    });

    controls.addEventListener('lock', function() {
        flyout.innerHTML = 'ESC To Return'
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });

    controls.addEventListener('unlock', function() {
        flyout.innerHTML = 'Back To Map'
        blocker.style.display = 'block';
        instructions.style.display = '';

    });

    scene.add(controls.getObject());

    const onKeyDown = function(event) {
        keys[event.key] = true;
    };

    const onKeyUp = function(event) {
        keys[event.key] = false;
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    window.addEventListener('keydown', (e) => {
        if (e.keyCode === 32 && e.target === document.body) {
            e.preventDefault();
        }
    });

    raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 10);

    function onProgress(xr) { console.log((xr.loaded / xr.total) * 100) }

    function onError(e) { console.log(e) };

    function GLBSpawner(path, x, y, z) {
        const loader = new GLTFLoader();
        loader.load(
            path,
            function(object) {
                object.scene.position.set(x, y, z);
                worldOctree.fromGraphNode(object.scene);
                object.scene.traverse(object => {
                    if (object.isMesh) {
                        object.castShadow = true;
                        object.receiveShadow = true;
                        object.material.roughness = 1;
                        if (object.material.emissive && (object.material.emissive.r > 0 || object.material.emissive.g > 0 || object.material.color.b > 0)) {
                            const cloned = object.clone();
                            object.getWorldPosition(cloned.position);
                            bloomScene.add(cloned);
                        }
                    }
                    if (object.isLight) {
                        object.parent.remove(object);
                    }
                });
                scene.add(object.scene);
                let geometries = [];
                object.scene.traverse(object => {
                    if (object.geometry) {
                        const cloned = object.geometry.clone();
                        cloned.applyMatrix4(object.matrixWorld);
                        for (const key in cloned.attributes) {

                            if (key !== 'position') {

                                cloned.deleteAttribute(key);

                            }

                        }

                        geometries.push(cloned);
                    }
                });
                mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries, false);
                mergedGeometry.boundsTree = new MeshBVH(mergedGeometry, { lazyGeneration: false });
                collider = new THREE.Mesh(mergedGeometry);
                collider.material.wireframe = true;
                collider.material.opacity = 0.5;
                collider.material.transparent = true;
                collider.visible = false;
                scene.add(collider);

                visualizer = new MeshBVHVisualizer(collider, 10);
                visualizer.visible = false;
                visualizer.update();

                scene.add(visualizer);
            }, onProgress, onError);
    };
    GLBSpawner('spawnplanet.glb', 0, -10, 0);



    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;

    document.body.appendChild(renderer.domElement);

    //

    window.addEventListener('resize', onWindowResize);

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}
const playerCollider = new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 15, 0), 0.35);
playerCollider.translate(new THREE.Vector3(0, 10, 0));
const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();
const clock = new THREE.Clock();
const worldOctree = new Octree();

const STEPS_PER_FRAME = 5;
let playerOnFloor;

function getForwardVector() {

    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();

    return playerDirection;

}

function getSideVector() {

    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();
    playerDirection.cross(camera.up);

    return playerDirection;

}

function updateControls(deltaTime) {

    // gives a bit of air control
    const speedDelta = deltaTime * (playerOnFloor ? 250 : 80);

    if (keys["w"]) {

        playerVelocity.add(getForwardVector().multiplyScalar(speedDelta));

    }

    if (keys["s"]) {

        playerVelocity.add(getForwardVector().multiplyScalar(-speedDelta));

    }

    if (keys["a"]) {

        playerVelocity.add(getSideVector().multiplyScalar(-speedDelta));

    }

    if (keys["d"]) {

        playerVelocity.add(getSideVector().multiplyScalar(speedDelta));

    }

    if (playerOnFloor) {
        if (keys[' ']) {

            playerVelocity.y = 150;

        }

    }

}
const GRAVITY = 300;

function updatePlayer(deltaTime) {

    let damping = Math.exp(-4 * deltaTime) - 1;

    if (!playerOnFloor) {

        playerVelocity.y -= GRAVITY * deltaTime;

        // small air resistance
        damping *= 0.1;

    }

    playerVelocity.addScaledVector(playerVelocity, damping);

    playerCollisions();
    const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
    playerCollider.translate(deltaPosition);

    playerCollisions();

    camera.position.copy(playerCollider.end);

}

function playerCollisions() {
    const result = worldOctree.capsuleIntersect(playerCollider);
    playerOnFloor = false;

    if (result) {

        playerOnFloor = result.normal.y > 0;

        if (!playerOnFloor) {

            playerVelocity.addScaledVector(result.normal, -result.normal.dot(playerVelocity));

        }

        playerCollider.translate(result.normal.multiplyScalar(result.depth));
    }

}
const composer = new EffectComposer(renderer);
const bloomPass = new(class BloomPass extends ShaderPass {})(BloomShader);
const boxBlur = new(class BlurPass extends ShaderPass {})(BoxBlurShader);
const bloomAddPass = new(class AddPass extends ShaderPass {})(BloomAddShader);
const fogPass = new ShaderPass(FogShader);
// Postprocessing gets rid of MSAA so SMAA is used instead
const smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
const filmPass = new FilmPass(0.05, 0, 0, false);
composer.addPass(bloomPass);
composer.addPass(boxBlur);
composer.addPass(bloomAddPass);
composer.addPass(fogPass);
//composer.addPass(filmPass);
composer.addPass(smaaPass);

// Full Scene Render Target
const defaultTexture = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.NearestFilter
});
defaultTexture.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight, THREE.FloatType);
// Bloom Scene (Only Glowing Objects) Render Target
const bloomTexture = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.NearestFilter
});
bloomTexture.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight, THREE.FloatType);

function animate() {

    requestAnimationFrame(animate);

    const time = performance.now();
    dirLight.position.x = camera.position.x + 90;
    dirLight.position.y = 360;
    dirLight.position.z = camera.position.z + 170 * 3;
    dirLight.target.position.x = camera.position.x;
    dirLight.target.position.y = 0;
    dirLight.target.position.z = camera.position.z;
    dirLight.shadow.camera.updateProjectionMatrix();
    dirLight.updateMatrix();

    if (controls.isLocked === true) {
        const deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;
        for (let i = 0; i < STEPS_PER_FRAME; i++) {

            updateControls(deltaTime);

            updatePlayer(deltaTime);

            //teleportPlayerIfOob();

        }
        let damping = Math.exp(-4 * deltaTime) - 1;
    }

    prevTime = time;

    // renderer.render(scene, camera);
    renderer.setRenderTarget(defaultTexture);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(bloomTexture);
    renderer.clear();
    renderer.render(bloomScene, camera);
    bloomPass.uniforms["sceneDiffuse"].value = defaultTexture.texture;
    bloomPass.uniforms["bloomDiffuse"].value = bloomTexture.texture;
    bloomPass.uniforms["sceneDepth"].value = defaultTexture.depthTexture;
    bloomPass.uniforms["bloomDepth"].value = bloomTexture.depthTexture;
    boxBlur.uniforms["resolution"].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    bloomAddPass.uniforms["sceneDiffuse"].value = defaultTexture.texture;
    bloomAddPass.uniforms["bloomAmt"].value = 1.0;
    fogPass.uniforms["sceneDepth"].value = defaultTexture.depthTexture;
    camera.updateMatrixWorld();
    fogPass.uniforms["projectionMatrixInv"].value = camera.projectionMatrixInverse;
    fogPass.uniforms["viewMatrixInv"].value = camera.matrixWorld;
    fogPass.uniforms["cameraPos"].value = camera.position;
    fogPass.uniforms["time"].value = performance.now() / 1000;
    renderer.setRenderTarget(null);
    renderer.clear();
    // Render the full postprocessing stack
    composer.render();
}
requestAnimationFrame(animate);