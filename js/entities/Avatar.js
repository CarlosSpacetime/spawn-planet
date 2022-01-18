import { CapsuleEntity } from "./CapsuleEntity.js";
import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';
import * as SkeletonUtils from 'https://threejs.org/examples/jsm/utils/SkeletonUtils.js';
import Controller from "./animation/Controller.js";
import { IdleGoal } from "./goals/IdleGoal.js";
import { TargetGoal } from "./goals/TargetGoal.js";

function angleDifference(angle1, angle2) {
    const diff = ((angle2 - angle1 + Math.PI) % (Math.PI * 2)) - Math.PI;
    return (diff < -Math.PI) ? diff + (Math.PI * 2) : diff;
}

class Avatar extends CapsuleEntity {
    constructor(radius, size, model, animations, {
        scene,
        collider,
        entities
    }) {
        super(radius, size);
        this.model = SkeletonUtils.clone(model);
        this.model.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.frustumCulled = false;
            }
        });
        this.mixer = new THREE.AnimationMixer(this.model);
        this.animations = animations;
        this.controller = new Controller(this.mixer, this.animations);
        this.scene = scene;
        this.scene.add(this.model);
        this.state = null;
        this.goal = null;
        this.collider = collider;
        this.entities = entities;
        this.delta = 0;
        this.setGoal(new IdleGoal({
            excitementDistance: 100,
            excitementChancePlayer: 0.0005,
            excitementChanceEntity: 0.001
        }));
        this.box = new THREE.Box3();
        this.updateBox();
        /* const helper = new THREE.Box3Helper(this.box, 0xffff00);
         this.scene.add(helper);*/
    }
    setState(state) {
        if (this.state) {
            this.state.deinit(this);
        }
        this.state = state;
        this.state.init(this);
    }
    setGoal(goal) {
        if (this.goal) {
            this.goal.deinit(this);
        }
        this.goal = goal;
        this.goal.init(this);
    }
    update(delta, frustum) {
        super.update(delta, this.collider);
        this.delta = delta;
        this.goal.update(this);
        this.state.update(this);
        this.updateBox();
        this.model.position.copy(this.position);
        this.model.position.y -= this.size + this.radius;
        if (!frustum.intersectsBox(this.box)) {
            this.model.visible = false;
        } else {
            this.model.visible = true;
            this.mixer.update(delta);
        }
        this.entities.forEach(entity => {
            if (entity === this) {
                return;
            }
            const size = entity.radius + this.radius;
            if (this.position.distanceTo(entity.position) < size) {
                const toEntity = Math.atan2(entity.position.x - this.position.x, entity.position.z - this.position.z);
                this.position.x -= Math.sin(toEntity) * (size - this.position.distanceTo(entity.position));
                this.position.z -= Math.cos(toEntity) * (size - this.position.distanceTo(entity.position));
            }
        });
    }
    updateBox() {
        this.box.setFromPoints([
            new THREE.Vector3(this.position.x + this.radius, this.position.y, this.position.z + this.radius),
            new THREE.Vector3(this.position.x - this.radius, this.position.y - this.size - this.radius, this.position.z - this.radius),
        ]);
    }
}

export { Avatar };