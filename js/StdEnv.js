import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';
import { PointerLockControls } from 'https://threejs.org/examples/jsm/controls/PointerLockControls.js';

import { DefaultDirectionalLight } from "./render/DefaultDirectionalLight.js"
import { DefaultComposer } from "./render/DefaultComposer.js"
import { Player } from './entities/Player.js';

import localProxy from "./util/localProxy.js";

const LOW = 0;
const MEDIUM = 1;
const HIGH = 2;
const ULTRA = 3;

let shadowLight;

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
*/

class StdEnv {
    constructor() {  
        this.init = function () {
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

            if(this.graphicTier !== LOW){
                shadowLight = new DefaultDirectionalLight(this.graphicTier);
                this.scene.add(shadowLight);
                this.scene.add(shadowLight.target);
            }

            // ===== shaders =====
            this.composer = new DefaultComposer(this.renderer, this.scene, this.camera);

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

        this.setShadowLightTier = function (graphicTier) {
            if(shadowLight){
                this.scene.remove(shadowLight.target);
                this.scene.remove(shadowLight);
                shadowLight.dispose();
                shadowLight.shadow.dispose();
            }

            if (graphicTier !== LOW) {
                shadowLight = new DefaultDirectionalLight(this.graphicTier);
                this.scene.add(shadowLight);
                this.scene.add(shadowLight.target);
            }
        }

        this.setGraphicsSetting = function (graphicTier) {
            this.graphicTier = graphicTier;
            this.setShadowLightTier(graphicTier);
            this.composer.setGraphicsSetting(graphicTier, this.renderer, this. scene);
        }

        this.increaseGraphicSettings = function () {
            this.graphicTier += 1;
            this.graphicTier %= 4;
            localProxy.tier = this.graphicTier;
            this.setGraphicsSetting(this.graphicTier)
        }
    } // -- end constructor


    update(){
        this.scene.fog.needsUpdate = true;

        if(this.graphicTier !== LOW){
            shadowLight.update(this.camera);
        }
        this.composer.update(this.camera);

        if (this.graphicTier > LOW) {
            this.renderer.setRenderTarget(this.composer.defaultTexture);
            this.renderer.clear();
            this.renderer.render(this.scene, this.camera);
            this.renderer.setRenderTarget(this.composer.bloomTexture);
            this.renderer.clear();
            // renderer.render(bloomScene, camera); 
        }
        
        this.renderer.setRenderTarget(null);
        this.renderer.clear();
        this.composer.render();

    }
}

export { StdEnv };