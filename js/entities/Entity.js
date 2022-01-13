import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';

class Entity extends THREE.Object3D {
    constructor() {
        super();
        this.box = new THREE.Box3();
        this.velocity = new THREE.Vector3();
    }
    update(delta) {}
}
export { Entity };