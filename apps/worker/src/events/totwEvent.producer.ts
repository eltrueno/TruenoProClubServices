import { Channel } from 'amqplib';
import { EXCHANGE_NAME } from '@config/rabbitmq.config';
import { ITOTW } from '@interfaces/totw.interface';

export class TOTWEvent {
    constructor(private channel: Channel) { }

    async publish(totw: ITOTW) {
        await this.channel.publish(EXCHANGE_NAME, 'totw.new', Buffer.from(JSON.stringify(totw)), {
            persistent: true,
        });
        console.info("[Event System] 'totw.new' event published into rabbitmq exchange")
    }
}
