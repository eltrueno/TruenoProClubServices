import { connect, ChannelModel, Channel, ConsumeMessage } from 'amqplib';
import dotenv from "dotenv"
dotenv.config()

const EXCHANGE_NAME = 'events';

interface ConsumerSpec {
    queue: string
    routingKey: string
    handler: (content: unknown) => Promise<void>
}

export class RabbitMQManager {
    private connection: ChannelModel | null = null;
    private channel: Channel | null = null;
    private isConnecting = false;
    /** Se vuelven a registrar en cada reconexión */
    private consumers: ConsumerSpec[] = [];

    private url: string;

    constructor() {
        this.url = process.env.RABBITMQ_URL || 'amqp://localhost';
    }

    async connect(): Promise<void> {
        if (this.isConnecting) return;
        this.isConnecting = true;

        try {
            const connection = await connect(this.url);
            this.connection = connection;
            
            connection.on('error', (err) => {
                console.error('[RabbitMQ] Connection error', err);
                this.handleDisconnect();
            });

            connection.on('close', () => {
                console.warn('[RabbitMQ] Connection closed');
                this.handleDisconnect();
            });

            const channel = await connection.createChannel();
            this.channel = channel;
            
            channel.on('error', (err) => {
                console.error('[RabbitMQ] Channel error', err);
            });

            channel.on('close', () => {
                console.warn('[RabbitMQ] Channel closed');
                this.channel = null;
            });

            await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
            for (const spec of this.consumers) await this.setupConsumer(channel, spec);
            
            this.isConnecting = false;
        } catch (error: any) {
            console.error('[RabbitMQ] connection failed:', error.message);
            this.isConnecting = false;
            this.handleDisconnect();
        }
    }

    private handleDisconnect() {
        this.connection = null;
        this.channel = null;
        setTimeout(() => this.connect(), 5000);
    }

    /**
     * Cola durable propia del worker atada a `routingKey`. Un mensaje se confirma cuando el
     * handler termina; si falla, se descarta (sin reintentos en bucle) y se deja en el log.
     */
    async consume(queue: string, routingKey: string, handler: (content: unknown) => Promise<void>): Promise<void> {
        const spec = { queue, routingKey, handler };
        this.consumers.push(spec);
        if (this.channel) await this.setupConsumer(this.channel, spec);
    }

    private async setupConsumer(channel: Channel, { queue, routingKey, handler }: ConsumerSpec): Promise<void> {
        await channel.assertQueue(queue, { durable: true });
        await channel.bindQueue(queue, EXCHANGE_NAME, routingKey);
        // De uno en uno: el handler puede tardar (recálculo completo)
        await channel.prefetch(1);
        await channel.consume(queue, async (msg: ConsumeMessage | null) => {
            if (!msg) return;
            try {
                await handler(JSON.parse(msg.content.toString()));
                channel.ack(msg);
            } catch (error) {
                console.error(`[RabbitMQ] Error handling ${routingKey}:`, error);
                channel.nack(msg, false, false);
            }
        });
        console.info(`[RabbitMQ] Consuming '${routingKey}' on queue '${queue}'`);
    }

    async publish(routingKey: string, content: any): Promise<boolean> {
        if (!this.channel) {
            console.error(`[RabbitMQ] Failed to publish ${routingKey}: channel not available`);
            return false;
        }

        try {
            return this.channel.publish(
                EXCHANGE_NAME,
                routingKey,
                Buffer.from(JSON.stringify(content)),
                { persistent: true }
            );
        } catch (error) {
            console.error(`[RabbitMQ] Publish error on ${routingKey}:`, error);
            return false;
        }
    }
}

export { EXCHANGE_NAME }