import { connect, type ChannelModel, type ConfirmChannel } from "amqplib"
import { STATS_RECALCULATE_ROUTING_KEY, type IStatsRecalculatePayload } from "@trueno-proclub-services/shared"
import dotenv from "dotenv"
dotenv.config()

/**
 * Avisos del api al worker por RabbitMQ (mismo exchange `events` y mismo vhost que el worker
 * del club). El api solo publica; la conexión se abre al primer aviso y se rehace si se cae.
 * Sin `RABBITMQ_URL` no se publica nada (y quien llame lo sabe por el `false`).
 */
const EXCHANGE_NAME = "events"
const RABBITMQ_URL = process.env.RABBITMQ_URL || ""

let connection: ChannelModel | null = null
let channel: ConfirmChannel | null = null
let connecting: Promise<ConfirmChannel | null> | null = null

const reset = () => {
    connection = null
    channel = null
}

async function getChannel(): Promise<ConfirmChannel | null> {
    if (!RABBITMQ_URL) return null
    if (channel) return channel
    if (connecting) return connecting

    connecting = (async () => {
        try {
            const conn = await connect(RABBITMQ_URL)
            conn.on("error", (err) => console.error("[RabbitMQ] Connection error", err))
            conn.on("close", reset)
            const ch = await conn.createConfirmChannel()
            ch.on("error", (err) => console.error("[RabbitMQ] Channel error", err))
            ch.on("close", () => { channel = null })
            await ch.assertExchange(EXCHANGE_NAME, "topic", { durable: true })
            connection = conn
            channel = ch
            return ch
        } catch (err) {
            console.error("[RabbitMQ] Connection failed:", err instanceof Error ? err.message : err)
            reset()
            return null
        } finally {
            connecting = null
        }
    })()
    return connecting
}

/** Publica y espera la confirmación del broker. true = el aviso está en RabbitMQ */
async function publish(routingKey: string, payload: unknown): Promise<boolean> {
    const ch = await getChannel()
    if (!ch) return false
    try {
        ch.publish(EXCHANGE_NAME, routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true, contentType: "application/json" })
        await ch.waitForConfirms()
        return true
    } catch (err) {
        console.error(`[RabbitMQ] Publish error on ${routingKey}:`, err)
        return false
    }
}

/** Pide al worker que recalcule stats, logros y medias (p. ej. tras marcar un partido como nulo) */
export const requestStatsRecalculation = (payload: Omit<IStatsRecalculatePayload, "requestedAt">) =>
    publish(STATS_RECALCULATE_ROUTING_KEY, { ...payload, requestedAt: new Date().toISOString() } satisfies IStatsRecalculatePayload)

/** Para los tests y el apagado */
export async function closeEvents(): Promise<void> {
    await connection?.close().catch(() => undefined)
    reset()
}
