import { connect, ChannelModel, Channel } from 'amqplib';
import dotenv from "dotenv"
dotenv.config()

const EXCHANGE_NAME = 'events';

export class RabbitMQManager {
    private connection: ChannelModel | null = null;
    private channel: Channel | null = null;
    private isConnecting = false;

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