import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';
import { StdEnv } from './StdEnv.js';
import Stats from "./util/stats.js";

let stats;

let settings = ["Low", "Medium", "High", "Ultra"];

const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');
const flyout = document.getElementById('fly-out');
const graphics = document.getElementById("graphics");

const VE = new StdEnv();

init();

function init() {
    // ===== Virtual Env =====
    VE.init('glb/spawnplanet.glb', 0, -20, 0);

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
    graphics.addEventListener('click', function() {
        VE.increaseGraphicSettings();
        graphics.innerHTML = "Graphics: " + settings[VE.graphicTier];
    });

    // ===== stats =====
    // stats = new Stats();
    // stats.showPanel(0);
    // document.body.appendChild(stats.dom);
}

if (!window.requestPostAnimationFrame) {
    window.requestPostAnimationFrame = function(task) {
        requestAnimationFrame(() => {
            setTimeout(task, 0);
        });
    }
}

function animate() {
    requestPostAnimationFrame(animate);

    VE.update();

    // stats.update();
}
requestPostAnimationFrame(animate);