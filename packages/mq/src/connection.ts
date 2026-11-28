import { connect, type Channel, type ChannelModel, type ConfirmChannel, type ConsumeMessage } from "amqplib"

/**
 * Conexión a RabbitMQ compartida por el api y el worker (antes cada uno tenía la suya, casi igual).
 *
 * - Se reconecta sola (cada 5 s) y, en cada conexión, vuelve a montar lo que se haya registrado con
 *   `onReady` (consumidores, el canal del RPC…).
 * - `publish` va por un canal con confirmaciones: true = el mensaje está en RabbitMQ.
 * - `consume` ata una cola durable al exchange `events` y procesa de uno en uno.
 * - Sin URL no se conecta: `publish` devuelve false y el RPC dice que no está disponible.
 */

export const EXCHANGE_NAME = "events"

export type ReadyHook = (conn: ChannelModel) => Promise<void>

export interface MqConnectionOptions {
    url: string
    /** para el log: "api", "worker"… */
    name: string
    /** espera entre reintentos de conexión (ms) */
    retryMs?: number
}

export class MqConnection {
    private conn: ChannelModel | null = null
    private pubChannel: ConfirmChannel | null = null
    private connecting: Promise<void> | null = null
    private retryTimer: ReturnType<typeof setTimeout> | null = null
    private closed = false
    private readonly hooks: ReadyHook[] = []
    private readonly downHooks: (() => void)[] = []

    constructor(private readonly opts: MqConnectionOptions) { }

    get enabled(): boolean { return !!this.opts.url }
    get connected(): boolean { return !!this.conn && !!this.pubChannel }

    /** Se ejecuta en cada (re)conexión, y ya mismo si está conectada */
    async onReady(hook: ReadyHook): Promise<void> {
        this.hooks.push(hook)
        if (this.conn) await this.runHook(this.conn, hook)
    }

    /** Se ejecuta cuando se pierde la conexión (p. ej. para soltar las llamadas RPC pendientes) */
    onDown(hook: () => void): void {
        this.downHooks.push(hook)
    }

    /** Primer intento de conexión. No lanza: si falla, lo dice en el log y reintenta solo */
    start(): Promise<void> {
        if (!this.enabled) {
            console.warn(`[RabbitMQ:${this.opts.name}] disabled (no RABBITMQ_URL)`)
            return Promise.resolve()
        }
        return this.connect()
    }

    private connect(): Promise<void> {
        if (!this.enabled || this.closed || this.conn) return Promise.resolve()
        if (this.connecting) return this.connecting
        this.connecting = (async () => {
            try {
                const conn = await connect(this.opts.url)
                conn.on("error", (err) => console.error(`[RabbitMQ:${this.opts.name}] Connection error`, err))
                conn.on("close", () => this.handleDown(conn))
                const ch = await conn.createConfirmChannel()
                ch.on("error", (err) => console.error(`[RabbitMQ:${this.opts.name}] Channel error`, err))
                await ch.assertExchange(EXCHANGE_NAME, "topic", { durable: true })
                this.conn = conn
                this.pubChannel = ch
                console.log(`[RabbitMQ:${this.opts.name}] Connected`)
                for (const hook of this.hooks) await this.runHook(conn, hook)
            } catch (err) {
                console.error(`[RabbitMQ:${this.opts.name}] Connection failed:`, err instanceof Error ? err.message : err)
                this.scheduleRetry()
            } finally {
                this.connecting = null
            }
        })()
        return this.connecting
    }

    private async runHook(conn: ChannelModel, hook: ReadyHook) {
        try {
            await hook(conn)
        } catch (err) {
            console.error(`[RabbitMQ:${this.opts.name}] Setup error:`, err)
        }
    }

    private handleDown(conn: ChannelModel) {
        if (this.conn !== conn) return
        console.warn(`[RabbitMQ:${this.opts.name}] Connection closed`)
        this.conn = null
        this.pubChannel = null
        for (const hook of this.downHooks) hook()
        this.scheduleRetry()
    }

    private scheduleRetry() {
        if (this.closed || this.retryTimer) return
        this.retryTimer = setTimeout(() => {
            this.retryTimer = null
            void this.connect()
        }, this.opts.retryMs ?? 5000)
    }

    /** Publica en el exchange `events` y espera la confirmación del broker */
    async publish(routingKey: string, payload: unknown): Promise<boolean> {
        if (!this.pubChannel) await this.connect()
        const ch = this.pubChannel
        if (!ch) return false
        try {
            ch.publish(EXCHANGE_NAME, routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true, contentType: "application/json" })
            await ch.waitForConfirms()
            return true
        } catch (err) {
            console.error(`[RabbitMQ:${this.opts.name}] Publish error on ${routingKey}:`, err)
            return false
        }
    }

    /**
     * Cola durable atada a `routingKey`, en un canal propio y de uno en uno. El mensaje se confirma
     * al terminar el handler; si falla, se descarta (sin reintentos en bucle) y queda en el log.
     */
    async consume(queue: string, routingKey: string, handler: (content: unknown) => Promise<void>): Promise<void> {
        await this.onReady(async (conn) => {
            const ch: Channel = await conn.createChannel()
            ch.on("error", (err) => console.error(`[RabbitMQ:${this.opts.name}] Channel error (${queue})`, err))
            await ch.assertQueue(queue, { durable: true })
            await ch.bindQueue(queue, EXCHANGE_NAME, routingKey)
            await ch.prefetch(1)
            await ch.consume(queue, async (msg: ConsumeMessage | null) => {
                if (!msg) return
                try {
                    await handler(JSON.parse(msg.content.toString()))
                    ch.ack(msg)
                } catch (err) {
                    console.error(`[RabbitMQ:${this.opts.name}] Error handling ${routingKey}:`, err)
                    ch.nack(msg, false, false)
                }
            })
            console.info(`[RabbitMQ:${this.opts.name}] Consuming '${routingKey}' on queue '${queue}'`)
        })
    }

    async close(): Promise<void> {
        this.closed = true
        if (this.retryTimer) clearTimeout(this.retryTimer)
        const conn = this.conn
        this.conn = null
        this.pubChannel = null
        await conn?.close().catch(() => undefined)
    }
}
