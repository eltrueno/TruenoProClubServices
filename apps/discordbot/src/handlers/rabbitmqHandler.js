const amqp = require('amqplib');
require('dotenv').config();

const newMatchHook = require('../hook/newmatch.hook');
const memberAchievementHook = require('../hook/memberachievement.hook');
const totwHook = require('../hook/totw.hook');

const EXCHANGE_NAME = 'events';
const QUEUE_NAME = 'discordbot';

class RabbitMQManager {
    constructor(client) {
        this.client = client;
        this.connection = null;
        this.channel = null;
        this.isConnecting = false;
        this.url = process.env.RABBITMQ_URL || 'amqp://localhost';
    }

    async connect() {
        if (this.isConnecting) return;
        this.isConnecting = true;

        try {
            this.connection = await amqp.connect(this.url);

            this.connection.on('error', (err) => {
                console.error('[RabbitMQ] Connection error', err);
                this.handleDisconnect();
            });

            this.connection.on('close', () => {
                console.warn('[RabbitMQ] Connection closed');
                this.handleDisconnect();
            });

            this.channel = await this.connection.createChannel();

            this.channel.on('error', (err) => {
                console.error('[RabbitMQ] Channel error', err);
            });

            this.channel.on('close', () => {
                console.warn('[RabbitMQ] Channel closed');
                this.channel = null;
            });

            await this.setup();
            await this.startConsumption();

            console.log('[RabbitMQ] Connected and consuming events');
            this.isConnecting = false;
        } catch (error) {
            console.error('[RabbitMQ] Connection failed:', error.message);
            this.isConnecting = false;
            this.handleDisconnect();
        }
    }

    handleDisconnect() {
        this.connection = null;
        this.channel = null;
        setTimeout(() => this.connect(), 5000);
    }

    async setup() {
        await this.channel.prefetch(1);
        await this.channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        await this.channel.assertQueue(QUEUE_NAME, { durable: true });

        await this.channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'match.new');
        await this.channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'player.achievement');
        await this.channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'totw.new');
    }

    async startConsumption() {
        if (!this.channel) return;

        this.channel.consume(QUEUE_NAME, async (msg) => {
            if (!msg) return;

            const routingKey = msg.fields.routingKey;
            const content = JSON.parse(msg.content.toString());

            try {
                switch (routingKey) {
                    case 'match.new':
                        await newMatchHook.handle(this.client, content);
                        break;
                    case 'player.achievement':
                        await memberAchievementHook.handle(this.client, content);
                        break;
                    case 'totw.new':
                        await totwHook.handle(this.client, content);
                        break;
                    default:
                        console.warn(`[RabbitMQ] Unknown event type: ${routingKey}`);
                }
                
                if (this.channel) {
                    this.channel.ack(msg);
                }
            } catch (err) {
                console.error(`[RabbitMQ] Error processing event ${routingKey}`, err);
                if (this.channel) {
                    this.channel.nack(msg, false, true);
                }
            }
        });
    }
}

function startConsumer(client) {
    const manager = new RabbitMQManager(client);
    manager.connect();
}

module.exports = { startConsumer };

