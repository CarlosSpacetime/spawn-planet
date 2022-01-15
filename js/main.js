import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';
import { GLTFLoader } from 'https://threejs.org/examples/jsm/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'https://cdn.skypack.dev/three@0.135.0/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshBVH, MeshBVHVisualizer } from './util/three-mesh-bvh.js';
import { StdEnv } from './StdEnv.js';
import Stats from "./util/stats.js";

let stats, collider, visualizer, mergedGeometry;

const bloomScene = new THREE.Scene();
const clock = new THREE.Clock();

let settings = ["Low", "Medium", "High", "Ultra"];

const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');
const flyout = document.getElementById('fly-out');
const graphics = document.getElementById("graphics");

const VE = new StdEnv();

init();

function init() {
    // ===== Virtual Env =====
    VE.init(); 

    // ===== load scene =====
    GLBSpawner('glb/spawnplanet.glb', 0, -20, 0);

    // ===== controls =====
    VE.controls.addEventListener('lock', function() {
        flyout.innerHTML = 'ESC To Return'
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });

    VE.controls.addEventListener('unlock', function() {
        flyout.innerHTML = 'Back To Map'
        blocker.style.display = 'block';
        instructions.style.display = '';
    });

    instructions.addEventListener('click', function() {
        VE.controls.lock();
    });

    graphics.innerHTML = "Graphics: " + settings[VE.graphicTier];
    graphics.addEventListener('click', function () {
        VE.increaseGraphicSettings();
        graphics.innerHTML = "Graphics: " + settings[VE.graphicTier];
    });

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


