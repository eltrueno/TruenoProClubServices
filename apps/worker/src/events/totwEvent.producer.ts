import type { MqConnection } from "@trueno-proclub-services/mq";
import type { ITOTW } from "@trueno-proclub-services/shared"

export class TOTWEvent {
    constructor(private mqManager: MqConnection) { }

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

