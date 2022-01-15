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
import { Player } from './entities/Player.js';
import { StdEnv } from './StdEnv.js';
import Stats from "./util/stats.js";
import localProxy from "./util/localProxy.js";
let controls, player, stats, raycaster, collider, visualizer, mergedGeometry;
// let bloomPass, boxBlur, bloomAddPass, aoPass, fogPass, smaaPass, fxaaPass, filmPass, renderPass, bloomTexture, defaultTexture;
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

const VE = new StdEnv();

init();

function init() {
    // ===== Virtual Env =====
    VE.init(graphicTier); 

    // ===== load scene =====
    GLBSpawner('glb/spawnplanet.glb', 0, -20, 0);

    // ===== controls =====
    controls = new PointerLockControls(VE.camera, document.body);
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

    VE.scene.add(controls.getObject());

    const onKeyDown = function(event) { VE.player.keys[event.key] = true; };
    const onKeyUp = function(event) { VE.player.keys[event.key] = false; };

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

    VE.composer.setGraphicsSetting(graphicTier, VE.renderer, VE.scene);

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
        VE.scene.add(object.scene);
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
        VE.scene.add(collider);

        visualizer = new MeshBVHVisualizer(collider, 10);
        visualizer.visible = false;
        visualizer.update();

        VE.scene.add(visualizer);
    }, onProgress, onError);
};


function animate() {

    requestAnimationFrame(animate);

    VE.update();

    stats.update();

    const delta = Math.min(clock.getDelta(), 0.1);

    if (collider) {
        for (let i = 0; i < 5; i++) {
            VE.player.update(delta / 5, VE.camera, collider);
            VE.camera.position.copy(VE.player.position);
        }
    }
}
animate();

graphics.innerHTML = "Graphics: " + settings[graphicTier];
graphics.onclick = () => {
    graphicTier += 1;
    graphicTier %= settings.length;
    localProxy.tier = graphicTier;
    graphics.innerHTML = "Graphics: " + settings[graphicTier];
    VE.composer.setGraphicsSetting(graphicTier, VE.renderer, VE.scene);
    VE.setShadowLightTier(graphicTier);
}
