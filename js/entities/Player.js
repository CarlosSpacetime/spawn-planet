import { ControlableCapsule } from "../entities/ControlableCapsule.js";
import { Vector3 } from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';

class Player extends ControlableCapsule {
    constructor() {
        super();
        this.keys = {};
    }

    update(delta, camera, collider, entities) {
        super.update(delta, camera, collider);

        if (this.position.y < -1000) {
            this.position.set(0, 30, -30);
        }
        entities.forEach(entity => {
            const size = this.radius + entity.radius;
            if (this.position.distanceTo(entity.position) < size) {
                const toEntity = Math.atan2(entity.position.x - this.position.x, entity.position.z - this.position.z);
                this.position.x -= Math.sin(toEntity) * (size - this.position.distanceTo(entity.position));
                this.position.z -= Math.cos(toEntity) * (size - this.position.distanceTo(entity.position));
            }
        })
    }
}

export { Player };