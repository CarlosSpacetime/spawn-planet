import { State } from "./State.js";
class IdleState extends State {
    constructor(memory) {
        super(memory);
    }
    update(agent) {
        agent.controller.play("idle");
    }
}
export { IdleState };