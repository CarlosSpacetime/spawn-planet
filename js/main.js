import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';

import { PointerLockControls } from 'https://threejs.org/examples/jsm/controls/PointerLockControls.js';
import { RoundedBoxGeometry } from 'https://threejs.org/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as SkeletonUtils from 'https://threejs.org/examples/jsm/utils/SkeletonUtils.js';
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
} from "./render/BloomShader.js";
import {
    BoxBlurShader
} from "./render/BoxBlurShader.js";
import {
    BloomAddShader
} from './render/BloomAddShader.js';
import {
    FogShader
} from "./render/FogShader.js";
import {
    AOShader
} from "./render/AOShader.js";
import {
    FXAAShader
} from 'https://cdn.skypack.dev/three@0.135.0/examples/jsm/shaders/FXAAShader.js';
import { MeshBVH, MeshBVHVisualizer } from './util/three-mesh-bvh.js';
import { CapsuleEntity } from './entities/CapsuleEntity.js';
import { Avatar } from "./entities/Avatar.js";
import Stats from "./util/stats.js";
import localProxy from "./util/localProxy.js";
let camera, scene, renderer, controls, player, stats, raycaster, dirLight, collider, visualizer, mergedGeometry;
let composer, bloomPass, boxBlur, bloomAddPass, aoPass, fogPass, smaaPass, fxaaPass, filmPass, renderPass, bloomTexture, defaultTexture;
let playerVelocity, playerDirection, model, skeleton, mixer;
let entities = [];
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let keys = {};
let prevTime = performance.now();
let movement_speed = 400.0;
let playerCapsule = new CapsuleEntity(5, 27);
playerCapsule.position.y = 50;
playerCapsule.position.z = -30;
let frame = 0;
let graphicTier = localProxy.tier !== undefined ? localProxy.tier : 0;
const bloomScene = new THREE.Scene();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const vertex = new THREE.Vector3();
const color = new THREE.Color();
const clock = new THREE.Clock();


let settings = ["Low", "Medium", "High", "Ultra"];
const LOW = 0;
const MEDIUM = 1;
const HIGH = 2;
const ULTRA = 3;

const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');
const flyout = document.getElementById('fly-out');
const graphics = document.getElementById("graphics");

init();

function init() {
    // ===== renderer =====
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    document.body.appendChild(renderer.domElement);

    // ===== scene =====
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x69e6f4);

    scene.fog = new THREE.Fog(0x69e6f4, 1600, 2000);

    // ===== camera =====
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.y = 1.6;
    camera.lookAt(0, 1.7, -1);

    // ===== lights =====
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
    if (graphicTier === MEDIUM) {
        dirLight.shadow.bias = -0.005;
    } else if (graphicTier === HIGH) {
        dirLight.shadow.bias = -0.0025;
    } else {
        dirLight.shadow.bias = -0.001;
    }
    scene.add(dirLight);
    scene.add(dirLight.target);

    // ===== shaders =====
    composer = new EffectComposer(renderer);
    bloomPass = new(class BloomPass extends ShaderPass {})(BloomShader);
    boxBlur = new(class BlurPass extends ShaderPass {})(BoxBlurShader);
    bloomAddPass = new(class AddPass extends ShaderPass {})(BloomAddShader);
    aoPass = new ShaderPass(AOShader);
    fogPass = new ShaderPass(FogShader);
    fxaaPass = new ShaderPass(FXAAShader);
    // Postprocessing gets rid of MSAA so SMAA is used instead
    smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
    filmPass = new FilmPass(0.05, 0, 0, false);
    renderPass = new RenderPass(scene, camera);
    composer.addPass(bloomPass);
    composer.addPass(boxBlur);
    composer.addPass(bloomAddPass);
    composer.addPass(aoPass);
    //composer.addPass(fogPass);
    //composer.addPass(filmPass);
    composer.addPass(smaaPass);
    composer.addPass(fxaaPass);
    composer.addPass(renderPass);
    // Full Scene Render Target
    defaultTexture = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter
    });
    defaultTexture.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight, THREE.FloatType);
    // Bloom Scene (Only Glowing Objects) Render Target
    bloomTexture = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter
    });
    bloomTexture.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight, THREE.FloatType);

    // ===== load scene =====
    GLBSpawner('glb/spawnplanet.glb', 0, -20, 0);

    // ===== player =====
    player = new THREE.Mesh(
        new RoundedBoxGeometry(1.0, 27, 1.0, 10, 5),
        new THREE.MeshStandardMaterial()
    );
    player.geometry.translate(0, -27, 0);
    player.capsuleInfo = {
        radius: 5,
        segment: new THREE.Line3(new THREE.Vector3(), new THREE.Vector3(0, -27, 0.0))
    };
    player.visible = false;
    player.position.y = 50;
    player.position.z = -30;
    scene.add(player);

    playerDirection = new THREE.Vector3();

    // ===== avatar =====
    const loader = new GLTFLoader();
    loader.load('./glb/y_bot.glb', function(gltf) {

        const avatar = new Avatar(5, 27, gltf.scene, gltf.animations, scene);
        avatar.position.y = 30;
        avatar.position.z = 50;
        entities.push(avatar);


    });


    // ===== controls =====
    controls = new PointerLockControls(camera, document.body);
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

    const onKeyDown = function(event) { keys[event.key] = true; };
    const onKeyUp = function(event) { keys[event.key] = false; };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    window.addEventListener('keydown', (e) => {
        if (e.keyCode === 32 && e.target === document.body) {
            e.preventDefault();
        }
    });

    // ===== menu =====
    instructions.addEventListener('click', function() {
        controls.lock();
    });

    setGraphicsSetting(graphicTier);

    // ===== stats =====
    stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
}




// ===== utils =====
function onProgress(xr) { console.log((xr.loaded / xr.total) * 100) }

function onError(e) { console.log(e) };

function GLBSpawner(path, x, y, z) {
    const loader = new GLTFLoader();
    loader.load(path, function(object) {
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
                    if (key !== 'position') { cloned.deleteAttribute(key); }
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
    if (keys["w"]) {
        playerCapsule.horizontalVelocity.add(getForwardVector().multiplyScalar(1 * delta));
    }

    if (keys["s"]) {
        playerCapsule.horizontalVelocity.add(getForwardVector().multiplyScalar(-1 * delta));
    }

    if (keys["a"]) {
        playerCapsule.horizontalVelocity.add(getSideVector().multiplyScalar(-1 * delta));
    }

    if (keys["d"]) {
        playerCapsule.horizontalVelocity.add(getSideVector().multiplyScalar(1 * delta));
    }
    playerCapsule.update(delta, collider);
    camera.position.copy(playerCapsule.position);
    entities.forEach(entity => {
        const size = playerCapsule.radius + entity.radius;
        if (playerCapsule.position.distanceTo(entity.position) < size) {
            const toEntity = Math.atan2(entity.position.x - playerCapsule.position.x, entity.position.z - playerCapsule.position.z);
            playerCapsule.position.x -= Math.sin(toEntity) * (size - playerCapsule.position.distanceTo(entity.position));
            playerCapsule.position.z -= Math.cos(toEntity) * (size - playerCapsule.position.distanceTo(entity.position));
        }
    })

}

function setGraphicsSetting(tier) {
    switch (tier) {
        case ULTRA:
            updateDirLight(2048);
            aoPass.enabled = true;
            smaaPass.enabled = true;
            fxaaPass.enabled = false;
            bloomPass.enabled = true;
            boxBlur.enabled = true;
            bloomAddPass.enabled = true;
            renderPass.enabled = false;
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.VSMShadowMap;
            scene.fog.color = new THREE.Color(0x69e6f4);
            scene.fog.near = 1600;
            scene.fog.far = 2000;
            break;

        case HIGH:
            updateDirLight(1024);
            aoPass.enabled = false;
            smaaPass.enabled = true;
            fxaaPass.enabled = false;
            bloomPass.enabled = true;
            boxBlur.enabled = true;
            bloomAddPass.enabled = true;
            renderPass.enabled = false;
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.VSMShadowMap;
            scene.fog.color = new THREE.Color(0.8, 0.8, 0.8);
            scene.fog.near = 100;
            scene.fog.far = 1500;
            break;

        case MEDIUM:
            updateDirLight(512);
            aoPass.enabled = false;
            smaaPass.enabled = false;
            fxaaPass.enabled = true;
            bloomPass.enabled = true;
            boxBlur.enabled = true;
            bloomAddPass.enabled = true;
            renderPass.enabled = false;
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            scene.fog.color = new THREE.Color(0.8, 0.8, 0.8);
            scene.fog.near = 100;
            scene.fog.far = 1500;
            break;

        case LOW:
            updateDirLight(0);
            aoPass.enabled = false;
            smaaPass.enabled = false;
            fxaaPass.enabled = false;
            bloomPass.enabled = false;
            boxBlur.enabled = false;
            bloomAddPass.enabled = false;
            renderPass.enabled = true;
            renderer.shadowMap.enabled = false;
            scene.fog.color = new THREE.Color(0.8, 0.8, 0.8);
            scene.fog.near = 100;
            scene.fog.far = 1500;
            break;
    }
}

function updateDirLight(size) {
    scene.remove(dirLight.target);
    scene.remove(dirLight);
    dirLight.dispose();
    dirLight.shadow.dispose();
    dirLight = new THREE.DirectionalLight(0x8888ff, 1);
    dirLight.position.set(90, 360, 170 * 3);
    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 1000;
    dirLight.shadow.camera.right = 400;
    dirLight.shadow.camera.left = -400;
    dirLight.shadow.camera.top = 400;
    dirLight.shadow.camera.bottom = -400;
    dirLight.shadow.mapSize.width = size;
    dirLight.shadow.mapSize.height = size;
    dirLight.shadow.radius = 4;
    if (graphicTier === MEDIUM) {
        dirLight.shadow.bias = -0.005;
    } else if (graphicTier === HIGH) {
        dirLight.shadow.bias = -0.0025;
    } else {
        dirLight.shadow.bias = -0.001;
    }
    if (size !== 0) {
        scene.add(dirLight);
        scene.add(dirLight.target);
    }
}

function animate() {

    requestAnimationFrame(animate);


    stats.update();
    frame++;
    if (frame === 0) {
        setGraphicsSetting(graphicTier);
    }
    scene.fog.needsUpdate = true;
    if (playerCapsule.y < -1000) {
        playerCapsule.position.set(0, 30, -30);
    }

    const delta = Math.min(clock.getDelta(), 0.1);
    if (typeof mixer !== 'undefined') {
        mixer.update(delta);
    }


    if (keys[" "]) {
        if (playerCapsule.onGround) {
            playerCapsule.velocity.y = 150.0;
        }
    }

    if (collider) {
        for (let i = 0; i < 5; i++) {
            updatePlayer(delta / 5);
            entities.forEach(entity => {
                entity.update(delta / 5, collider, playerCapsule.position, entities);
            })
        }
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
    if (graphicTier > LOW) {
        renderer.setRenderTarget(defaultTexture);
        renderer.clear();
        renderer.render(scene, camera);
        renderer.setRenderTarget(bloomTexture);
        renderer.clear();
        renderer.render(bloomScene, camera);
    }
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
    aoPass.uniforms["sceneDepth"].value = defaultTexture.depthTexture;
    aoPass.uniforms["projectionMatrixInv"].value = camera.projectionMatrixInverse;
    aoPass.uniforms["viewMatrixInv"].value = camera.matrixWorld;
    aoPass.uniforms["viewMat"].value = camera.matrixWorldInverse;
    aoPass.uniforms["projMat"].value = camera.projectionMatrix;
    aoPass.uniforms["cameraPos"].value = camera.position;
    aoPass.uniforms["time"].value = performance.now() / 1000;
    aoPass.uniforms["resolution"].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    renderer.setRenderTarget(null);
    renderer.clear();
    // Render the full postprocessing stack
    composer.render();
}
requestAnimationFrame(animate);
graphics.innerHTML = "Graphics: " + settings[graphicTier];
graphics.onclick = () => {
    graphicTier += 1;
    graphicTier %= settings.length;
    localProxy.tier = graphicTier;
    graphics.innerHTML = "Graphics: " + settings[graphicTier];
    setGraphicsSetting(graphicTier);
}
