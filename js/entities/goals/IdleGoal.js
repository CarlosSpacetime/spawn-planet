import { Goal } from "./Goal.js";
import { IdleState } from "../states/IdleState.js";
class IdleGoal extends Goal {
    constructor(memory) {
        super(memory);
    }
    init(agent) {
        agent.setState(new IdleState({}));
    }
}
export { IdleGoal };