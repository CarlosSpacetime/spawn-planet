import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';

import { PointerLockControls } from 'https://threejs.org/examples/jsm/controls/PointerLockControls.js';
import { RoundedBoxGeometry } from 'https://threejs.org/examples/jsm/geometries/RoundedBoxGeometry.js';
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
import { MeshBVH, MeshBVHVisualizer } from './three-mesh-bvh.js';

let camera, scene, renderer, controls;

const objects = [];

let raycaster;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let keys = {};
let prevTime = performance.now();
let movement_speed = 400.0;
let dirLight;
const bloomScene = new THREE.Scene();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const vertex = new THREE.Vector3();
const color = new THREE.Color();
const clock = new THREE.Clock();
let collider;
let visualizer;
let mergedGeometry;
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
dirLight.shadow.bias = -0.005;
scene.add(dirLight);
scene.add(dirLight.target);
const player = new THREE.Mesh(
    new RoundedBoxGeometry(1.0, 40.0, 1.0, 10, 5),
    new THREE.MeshStandardMaterial()
);
player.geometry.translate(0, -10, 0);
player.capsuleInfo = {
    radius: 2.5,
    segment: new THREE.Line3(new THREE.Vector3(), new THREE.Vector3(0, -20.0, 0.0))
};
player.visible = false;
player.position.y = 30;
player.position.z = -30;
scene.add(player);

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

function onProgress(xr) { console.log((xr.loaded / xr.total) * 100) }

function onError(e) { console.log(e) };

function GLBSpawner(path, x, y, z) {
    const loader = new GLTFLoader();
    loader.load(
        path,
        function(object) {
            object.scene.position.set(x, y, z);
            object.scene.traverse(object => {
                if (object.isMesh) {
                    object.castShadow = true;
                    object.receiveShadow = true;
                    object.material.roughness = 1;
                    if (object.material.map) {
                        object.material.map.anisotropy = 16;
                        object.material.map.needsUpdate = true;
                    }
                    const cloned = object.clone();
                    object.getWorldPosition(cloned.position);
                    if (object.material.emissive && (object.material.emissive.r > 0 || object.material.emissive.g > 0 || object.material.color.b > 0)) {
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
                if (object.geometry && object.visible) {
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
GLBSpawner('spawnplanet2.glb', 0, -20, 0);
renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;

document.body.appendChild(renderer.domElement);
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

let playerIsOnGround;
const playerVelocity = new THREE.Vector3();
const horizontalVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

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

function updatePlayer(delta) {
    playerVelocity.y += playerIsOnGround ? 0 : delta * -300;
    player.position.addScaledVector(playerVelocity, delta);
    if (keys["w"]) {

        horizontalVelocity.add(getForwardVector().multiplyScalar(1 * delta));

    }

    if (keys["s"]) {

        horizontalVelocity.add(getForwardVector().multiplyScalar(-1 * delta));

    }

    if (keys["a"]) {

        horizontalVelocity.add(getSideVector().multiplyScalar(-1 * delta));

    }

    if (keys["d"]) {

        horizontalVelocity.add(getSideVector().multiplyScalar(1 * delta));

    }
    player.position.add(horizontalVelocity);
    horizontalVelocity.multiplyScalar(0.99);
    player.updateMatrixWorld();
    const capsuleInfo = player.capsuleInfo;
    const tempBox = new THREE.Box3();
    const tempMat = new THREE.Matrix4();
    const tempSegment = new THREE.Line3();
    tempBox.makeEmpty();
    tempMat.copy(collider.matrixWorld).invert();
    tempSegment.copy(capsuleInfo.segment);
    tempSegment.start.applyMatrix4(player.matrixWorld).applyMatrix4(tempMat);
    tempSegment.end.applyMatrix4(player.matrixWorld).applyMatrix4(tempMat);
    tempBox.expandByPoint(tempSegment.start);
    tempBox.expandByPoint(tempSegment.end);
    tempBox.min.addScalar(-capsuleInfo.radius);
    tempBox.max.addScalar(capsuleInfo.radius);
    const tempVector = new THREE.Vector3();
    const tempVector2 = new THREE.Vector3();
    collider.geometry.boundsTree.shapecast({

        intersectsBounds: box => box.intersectsBox(tempBox),

        intersectsTriangle: tri => {

            // check if the triangle is intersecting the capsule and adjust the
            // capsule position if it is.
            const triPoint = tempVector;
            const capsulePoint = tempVector2;

            const distance = tri.closestPointToSegment(tempSegment, triPoint, capsulePoint);
            if (distance < capsuleInfo.radius) {

                const depth = capsuleInfo.radius - distance;
                const direction = capsulePoint.sub(triPoint).normalize();

                tempSegment.start.addScaledVector(direction, depth);
                tempSegment.end.addScaledVector(direction, depth);

            }

        }

    });
    const newPosition = tempVector;
    newPosition.copy(tempSegment.start).applyMatrix4(collider.matrixWorld);

    const deltaVector = tempVector2;
    deltaVector.subVectors(newPosition, player.position);

    playerIsOnGround = deltaVector.y > Math.abs(delta * playerVelocity.y * 0.25);
    const offset = Math.max(0.0, deltaVector.length() - 1e-5);
    deltaVector.normalize().multiplyScalar(offset);
    player.position.add(deltaVector);
    if (!playerIsOnGround) {

        deltaVector.normalize();
        playerVelocity.addScaledVector(deltaVector, -deltaVector.dot(playerVelocity));

    } else {

        playerVelocity.set(0, 0, 0);

    }
    camera.position.copy(player.position);

}

function animate() {

    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    if (keys[" "]) {
        if (playerIsOnGround) {
            playerVelocity.y = 150.0;
        }
    }
    for (let i = 0; i < 5; i++) {

        updatePlayer(delta / 5);

    }

    const time = performance.now();
    dirLight.position.x = camera.position.x + 90;
    dirLight.position.y = 360;
    dirLight.position.z = camera.position.z + 170 * 3;
    dirLight.target.position.x = camera.position.x;
    dirLight.target.position.y = 0;
    dirLight.target.position.z = camera.position.z;
    dirLight.shadow.camera.updateProjectionMatrix();
    dirLight.updateMatrix();

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