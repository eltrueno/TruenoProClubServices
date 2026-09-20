import { RabbitMQManager } from "../config/rabbitmq.config.js";
import type { IMatch } from "@trueno-proclub-services/shared"

export class NewMatchEvent {
    constructor(private mqManager: RabbitMQManager) { }

    async publish(match: IMatch) {
        //await this.mqManager.publish('match.new', match);
        //console.info("[Event System] 'match.new' event published into rabbitmq exchange")
    }
}

