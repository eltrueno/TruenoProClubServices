import { MqConnection, RpcClient } from "@trueno-proclub-services/mq"
import { STATS_RECALCULATE_ROUTING_KEY, SYNC_NOW_ROUTING_KEY, type IStatsRecalculatePayload, type ISyncNowPayload, type WorkerRpc } from "@trueno-proclub-services/shared"
import dotenv from "dotenv"
dotenv.config()

/**
 * El api y el worker del club por RabbitMQ (conexión común de packages/mq, mismo vhost que el
 * worker):
 * - avisos (exchange `events`, colas durables): recalcular stats, sincronizar ya. Si el worker
 *   está parado, esperan a que vuelva;
 * - RPC (`rpc.call(...)`): preguntas con respuesta y tiempo máximo, como el ping del panel admin.
 * Sin `RABBITMQ_URL` no se publica nada (quien llame lo sabe por el `false`) y el RPC dice que no
 * está disponible.
 */
const mq = new MqConnection({ url: process.env.RABBITMQ_URL || "", name: "api" })

/** RPC con el worker del club (tipos de los métodos en shared `WorkerRpc`) */
export const rpc = new RpcClient<WorkerRpc>(mq)

/** Pide al worker que recalcule stats, logros y medias (p. ej. tras marcar un partido como nulo) */
export const requestStatsRecalculation = (payload: Omit<IStatsRecalculatePayload, "requestedAt">) =>
    mq.publish(STATS_RECALCULATE_ROUTING_KEY, { ...payload, requestedAt: new Date().toISOString() } satisfies IStatsRecalculatePayload)

/** Pide al worker que sincronice ya con EA (botón del panel admin) */
export const requestSyncNow = (requestedBy: string | null) =>
    mq.publish(SYNC_NOW_ROUTING_KEY, { requestedAt: new Date().toISOString(), requestedBy } satisfies ISyncNowPayload)

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
