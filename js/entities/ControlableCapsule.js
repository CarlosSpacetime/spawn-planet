import { CapsuleEntity } from "./CapsuleEntity.js";
import { Vector3 } from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';

class ControlableCapsule extends CapsuleEntity {
    constructor() {
        super(2.5, 27);

        this.playerDirection = new Vector3();
        this.keys = {};

        this.visible = false;
        this.position.y = 50;
        this.position.z = -30;

        this.getForwardVector = function(camera) {
            camera.getWorldDirection(this.playerDirection);
            this.playerDirection.y = 0;
            this.playerDirection.normalize();

            return this.playerDirection;
        }

        this.getSideVector = function(camera) {
            camera.getWorldDirection(this.playerDirection);
            this.playerDirection.y = 0;
            this.playerDirection.normalize();
            this.playerDirection.cross(camera.up);

            return this.playerDirection;
        }
    }

    update(delta, camera, collider) {
        if (this.keys["w"]) {
            this.horizontalVelocity.add(this.getForwardVector(camera).multiplyScalar(1 * delta));
        }

        if (this.keys["s"]) {
            this.horizontalVelocity.add(this.getForwardVector(camera).multiplyScalar(-1 * delta));
        }

        if (this.keys["a"]) {
            this.horizontalVelocity.add(this.getSideVector(camera).multiplyScalar(-1 * delta));
        }

        if (this.keys["d"]) {
            this.horizontalVelocity.add(this.getSideVector(camera).multiplyScalar(1 * delta));
        }
        if (this.keys[" "]) {
            if (this.onGround) { this.velocity.y = 150.0; }
        }
        super.update(delta, collider);
    }
}

export { ControlableCapsule }