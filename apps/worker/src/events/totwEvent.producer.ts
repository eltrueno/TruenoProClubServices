import { Channel } from 'amqplib';
import { EXCHANGE_NAME } from '@config/rabbitmq.config';
import { ITOTW } from '@interfaces/totw.interface';

export class TOTWEvent {
    constructor(private channel: Channel) { }

    async publish(totw: ITOTW) {
        try {
            const result = this.channel.publish(EXCHANGE_NAME, 'totw.new', Buffer.from(JSON.stringify(totw)), {
                persistent: true,
            });

            if (!result) {
                console.warn("[Event System] 'totw.new' event NOT published (buffer full)");
            } else {
                console.info("[Event System] 'totw.new' event published into rabbitmq exchange")
            }
        } catch (error) {
            console.error("[Event System] 'totw.new' producer error: ", error);
        }
    }
}
