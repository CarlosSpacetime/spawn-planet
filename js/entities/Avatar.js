import { CapsuleEntity } from "./CapsuleEntity.js";
import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';
import * as SkeletonUtils from 'https://threejs.org/examples/jsm/utils/SkeletonUtils.js';


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
        this.mixer.clipAction(this.animations[2]).play();
        this.scene = scene;
        this.scene.add(this.model);
        //this.model.scale.set(size, size, size);
    }
    update(delta, bvh) {
        super.update(delta, bvh);
        this.model.position.copy(this.position);
        this.model.position.y -= this.size + this.radius;
        this.mixer.update(delta);
    }
}

export { Avatar };