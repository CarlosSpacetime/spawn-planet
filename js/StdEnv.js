import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';
import { PointerLockControls } from 'https://threejs.org/examples/jsm/controls/PointerLockControls.js';

import { GLTFLoader } from 'https://threejs.org/examples/jsm/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'https://cdn.skypack.dev/three@0.135.0/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshBVH, MeshBVHVisualizer } from './util/three-mesh-bvh.js';

import { DefaultDirectionalLight } from "./render/DefaultDirectionalLight.js"
import { DefaultComposer } from "./render/DefaultComposer.js"
import { Player } from './entities/Player.js';
import { Avatar } from './entities/Avatar.js';
import localProxy from "./util/localProxy.js";

const LOW = 0;
const MEDIUM = 1;
const HIGH = 2;
const ULTRA = 3;

let shadowLight, collider;

const bloomScene = new THREE.Scene();
const clock = new THREE.Clock();

/*
This class wraps the whole Virtual Environement and provide an easy to use API for
people who want to build standard worlds.

In main.js, this class should be used the following way:

const VE = new StdEnv();
function init() { 
    VE.init("path/to/terrain.glb"); 
    // .. other stuff for the webpage
}

function animate() {
    VE.update();
    // .. other stuff
}

init();
animate();


Other usages should be like:
    to change the graphic tier:
    VE.setGraphicsSetting(graphicTier);
    VE.increaseGraphicSettings()

    for events on control lock and unlock
    VE.controls.addEventListener('lock', function() { .. do stuff });
    VE.controls.addEventListener('unlock', function() { .. do stuff });
    VE.controls.lock();
*/

class StdEnv {
    constructor() {
            this.init = function(terrainPath, x, y, z) {
                    this.graphicTier = localProxy.tier !== undefined ? localProxy.tier : 0;

                    // ===== renderer =====
                    this.renderer = new THREE.WebGLRenderer();
                    this.renderer.setPixelRatio(1);
                    this.renderer.setSize(window.innerWidth, window.innerHeight);
                    this.renderer.shadowMap.enabled = true;
                    this.renderer.shadowMap.type = THREE.VSMShadowMap;
                    document.body.appendChild(this.renderer.domElement);

                    // ===== scene =====
                    this.scene = new THREE.Scene();
                    const scene = this.scene;
                    this.scene.background = new THREE.Color(0x69e6f4);
                    this.scene.fog = new THREE.Fog(0x69e6f4, 1600, 2000);

                    // ===== camera =====
                    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
                    this.camera.position.y = 1.6;
                    this.camera.lookAt(0, 1.7, -1);

                    // ===== lights =====
                    const light = new THREE.HemisphereLight(0xffeeff, 0x777788, 1);
                    light.position.set(0.5, 1, 0.75);
                    this.scene.add(light);

                    if (this.graphicTier !== LOW) {
                        shadowLight = new DefaultDirectionalLight(this.graphicTier);
                        this.scene.add(shadowLight);
                        this.scene.add(shadowLight.target);
                    }

                    // ===== shaders =====
                    this.composer = new DefaultComposer(this.renderer, this.scene, this.camera);

                    // ===== load the terrain =====
                    function onProgress(xr) { console.log((xr.loaded / xr.total) * 100) }

                    function onError(e) { console.log(e) };

                    const loader = new GLTFLoader();
                    loader.load(terrainPath, function(object) {
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
                        const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries, false);
                        mergedGeometry.boundsTree = new MeshBVH(mergedGeometry, { lazyGeneration: false });
                        collider = new THREE.Mesh(mergedGeometry);
                        collider.material.wireframe = true;
                        collider.material.opacity = 0.5;
                        collider.material.transparent = true;
                        collider.visible = false;
                        scene.add(collider);

                        const visualizer = new MeshBVHVisualizer(collider, 10);
                        visualizer.visible = false;
                        visualizer.update();

                        scene.add(visualizer);
                    }, onProgress, onError);
                    this.entities = [];
                    loader.load('glb/y_bot.glb', (gltf) => {

                        const avatar = new Avatar(5, 27, gltf.scene, {
                            "idle": gltf.animations[2],
                            "walk": gltf.animations[1],
                            "run": gltf.animations[3],
                        }, scene);
                        avatar.position.y = 30;
                        avatar.position.z = 50;
                        this.entities.push(avatar);


                    });
                    // ===== player =====
                    this.player = new Player();
                    this.scene.add(this.player);

                    // ===== controls =====
                    this.controls = new PointerLockControls(this.camera, document.body);
                    this.scene.add(this.controls.getObject());

                    document.addEventListener('keydown', (event) => {
                        this.player.keys[event.key] = true;
                    });
                    document.addEventListener('keyup', (event) => {
                        this.player.keys[event.key] = false;
                    });

                    window.addEventListener('keydown', (e) => {
                        if (e.keyCode === 32 && e.target === document.body) {
                            e.preventDefault();
                        }
                    });

                    // ===== graphic settings =====
                    this.setGraphicsSetting(this.graphicTier);

                } // -- end init

            this.setShadowLightTier = function(graphicTier) {
                if (shadowLight) {
                    this.scene.remove(shadowLight.target);
                    this.scene.remove(shadowLight);
                    shadowLight.dispose();
                    shadowLight.shadow.dispose();
                }

                if (graphicTier !== LOW) {
                    shadowLight = new DefaultDirectionalLight(this.graphicTier);
                    this.scene.add(shadowLight);
                    this.scene.add(shadowLight.target);
                } else {
                    shadowLight = undefined;
                }
            }

            this.setGraphicsSetting = function(graphicTier) {
                this.graphicTier = graphicTier;
                this.setShadowLightTier(graphicTier);
                this.composer.setGraphicsSetting(graphicTier, this.renderer, this.scene);
            }

            this.increaseGraphicSettings = function() {
                this.graphicTier += 1;
                this.graphicTier %= 4;
                localProxy.tier = this.graphicTier;
                this.setGraphicsSetting(this.graphicTier)
            }
        } // -- end constructor


    update() {
        const delta = Math.min(clock.getDelta(), 0.1);
        if (collider) {
            for (let i = 0; i < 5; i++) {
                this.player.update(delta / 5, this.camera, collider, this.entities);
                this.camera.position.copy(this.player.position);
                this.entities.forEach(entity => {
                    entity.update(delta / 5, collider, this.player.position, this.entities);
                })
            }
        }

        this.scene.fog.needsUpdate = true;

        if (this.graphicTier !== LOW) {
            shadowLight.update(this.camera);
        }
        this.composer.update(this.camera);
        if (this.graphicTier > LOW) {
            this.renderer.setRenderTarget(this.composer.defaultTexture);
            this.renderer.clear();
            this.renderer.render(this.scene, this.camera);
            this.renderer.setRenderTarget(this.composer.bloomTexture);
            this.renderer.clear();
            this.renderer.render(bloomScene, this.camera);
        }

        this.renderer.setRenderTarget(null);
        this.renderer.clear();
        this.composer.render();
    }

}

export { StdEnv };