import { ControlableCapsule } from "../entities/ControlableCapsule.js";
import { Vector3 } from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';

class Player extends ControlableCapsule {
    constructor() {
        super();
        this.keys = {};
    }
    
    update(delta, camera, collider){
        super.update(delta, camera, collider);

        if (this.position.y < -1000) {
            this.position.set(0, 30, -30);
        }
    }
}

export { Player };