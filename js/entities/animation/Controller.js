class Controller {
    constructor(mixer, animations) {
        this.current = "none";
        this.animations = {};
        this.mixer = mixer;
        Object.entries(animations).forEach(([anim, clip]) => {
            this.animations[anim] = this.mixer.clipAction(clip);
        });
    }
    play(anim, time = 0.25) {
        if (this.current !== "none") {
            this.animations[this.current].fadeOut(time);
        }
        this.current = anim;
        if (this.current !== "none") {
            this.animations[this.current].enabled = true;
            this.animations[this.current].reset();
            this.animations[this.current].fadeIn(time);
            this.animations[this.current].play();
        }
    }
}
export default Controller;