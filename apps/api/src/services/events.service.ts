import { MqConnection, RpcClient } from "@trueno-proclub-services/mq"
import { STATS_RECALCULATE_ROUTING_KEY, type IStatsRecalculatePayload, type WorkerRpc } from "@trueno-proclub-services/shared"
import dotenv from "dotenv"
dotenv.config()

/**
 * El api y el worker del club por RabbitMQ (conexión común de packages/mq, mismo vhost que el
 * worker):
 * - avisos (exchange `events`, colas durables): recalcular stats tras marcar un nulo. Si el worker
 *   está parado, esperan a que vuelva;
 * - RPC (`rpc.call(...)`): preguntas con respuesta y tiempo máximo (lo del panel admin: ping,
 *   sincronizar, recalcular, mantenimientos).
 * Sin `RABBITMQ_URL` no se publica nada (quien llame lo sabe por el `false`) y el RPC dice que no
 * está disponible.
 */
const mq = new MqConnection({ url: process.env.RABBITMQ_URL || "", name: "api" })

/** RPC con el worker del club (tipos de los métodos en shared `WorkerRpc`) */
export const rpc = new RpcClient<WorkerRpc>(mq)

/** Pide al worker que recalcule stats, logros y medias (p. ej. tras marcar un partido como nulo) */
export const requestStatsRecalculation = (payload: Omit<IStatsRecalculatePayload, "requestedAt">) =>
    mq.publish(STATS_RECALCULATE_ROUTING_KEY, { ...payload, requestedAt: new Date().toISOString() } satisfies IStatsRecalculatePayload)

/** Hay RabbitMQ configurado (sin él, los avisos al worker no salen) */
export const eventsEnabled = () => mq.enabled

/** Al arrancar el api: abre la conexión, monta el RPC y deja dicho en el log si hay RabbitMQ o no */
export async function initEvents(): Promise<void> {
    if (!mq.enabled) {
        console.warn("Connection to RabbitMQ: disabled (RABBITMQ_URL not set). Marking a match as void will not trigger the stats recalculation")
        return
    }
    await rpc.init()
    await mq.start()
}

/** Para los tests y el apagado */
export const closeEvents = () => mq.close()
