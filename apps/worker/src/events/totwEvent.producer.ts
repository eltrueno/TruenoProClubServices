import { RabbitMQManager } from "../config/rabbitmq.config.js";
import type { ITOTW } from "@trueno-proclub-services/shared"

export class TOTWEvent {
    constructor(private mqManager: RabbitMQManager) { }

    async publish(totw: ITOTW) {
        try {
            const result = await this.mqManager.publish('totw.new', totw);

            if (!result) {
                console.warn("[Event System] 'totw.new' event NOT published (manager returned false)");
            } else {
                console.info("[Event System] 'totw.new' event published into rabbitmq exchange")
            }
        } catch (error) {
            console.error("[Event System] 'totw.new' producer error: ", error);
        }
    }
}

