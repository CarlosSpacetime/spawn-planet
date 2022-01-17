import { CapsuleEntity } from "./CapsuleEntity.js";
import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';
import * as SkeletonUtils from 'https://threejs.org/examples/jsm/utils/SkeletonUtils.js';

function angleDifference(angle1, angle2) {
    const diff = ((angle2 - angle1 + Math.PI) % (Math.PI * 2)) - Math.PI;
    return (diff < -Math.PI) ? diff + (Math.PI * 2) : diff;
}

class Avatar extends CapsuleEntity {
    constructor(radius, size, model, animations, scene) {
        super(radius, size);
        this.model = SkeletonUtils.clone(model);
        this.model.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        this.mixer = new THREE.AnimationMixer(this.model);
        this.animations = animations;
        const action = this.mixer.clipAction(this.animations[1]);
        action.time = Math.random() * action._clip.duration;
        action.play();
        this.scene = scene;
        this.scene.add(this.model);
    }
    update(delta, bvh, target, entities) {
        super.update(delta, bvh);
        this.model.position.copy(this.position);
        this.model.position.y -= this.size + this.radius;
        this.mixer.update(delta);
        let toTarget = Math.atan2(target.x - this.position.x, target.z - this.position.z);
        entities.forEach(entity => {
            if (entity === this) {
                return;
            }
            const size = entity.radius + this.radius;
            if (this.position.distanceTo(entity.position) < size) {
                const toEntity = Math.atan2(entity.position.x - this.position.x, entity.position.z - this.position.z);
                this.position.x -= Math.sin(toEntity) * (size - this.position.distanceTo(entity.position));
                this.position.z -= Math.cos(toEntity) * (size - this.position.distanceTo(entity.position));
            }
            if (this.position.distanceTo(entity.position) < size * 6) {
                const toAvoid = Math.atan2(entity.position.x - this.position.x, entity.position.z - this.position.z);
                const factor = Math.min(Math.max(1.0 - ((this.position.distanceTo(entity.position) - size * 3) / size * 3), 0), 1);
                toTarget += (angleDifference(toAvoid, toTarget) * factor) / 5;
            }
        })
        this.horizontalVelocity.x += 0.5 * Math.sin(toTarget) * delta;
        this.horizontalVelocity.z += 0.5 * Math.cos(toTarget) * delta;
        this.model.rotation.y += angleDifference(this.model.rotation.y, toTarget) / 50;
    }
}

export { Avatar };