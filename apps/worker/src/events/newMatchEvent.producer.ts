import { RabbitMQManager } from '@config/rabbitmq.config';
import { IMatch } from 'srcinterfaces/match.interface';

export class NewMatchEvent {
    constructor(private mqManager: RabbitMQManager) { }

    async publish(match: IMatch) {
        //await this.mqManager.publish('match.new', match);
        //console.info("[Event System] 'match.new' event published into rabbitmq exchange")
    }
}

