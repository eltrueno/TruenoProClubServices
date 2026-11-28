/**
 * Lo que usa el panel admin (accounts): estado del sistema y registro de acciones.
 */

/** Último paso del worker de un club por la sincronización con EA (doc `worker_status` de la base del club) */
export interface IWorkerStatus {
    /** EA id del club */
    clubId: number
    /** cuándo terminó la última sincronización (bien o mal) */
    lastSyncAt?: Date | string | null
    lastSyncOk?: boolean
    lastSyncError?: string | null
    /** partidos nuevos que metió la última sincronización */
    lastSyncInserted?: number
    /** cuándo terminó el último recálculo completo de stats */
    lastRecalcAt?: Date | string | null
    /** cada cuánto sincroniza (segundos) */
    intervalSec?: number
    /** cuándo arrancó el worker */
    startedAt?: Date | string | null
}

/** `GET /admin/status` del api de un club */
export interface IAdminStatus {
    clubId: number
    worker: IWorkerStatus | null
    matches: number
    members: number
    lastMatch: { matchId: number; timestamp: number } | null
    /** el api tiene RabbitMQ configurado (sin él, ni sincronizar ahora ni recalcular llegan al worker) */
    events: boolean
    serverTime: string
}

/** Respuesta del worker a `worker.ping` (RPC api → worker): está vivo y qué está haciendo */
export interface IWorkerPing {
    clubId: number
    /** versión del worker (su package.json) */
    version: string
    node: string
    /** cuándo arrancó y cuánto lleva (s) */
    startedAt: string
    uptimeSec: number
    /** la cola de lo que toca stats (sincronizar, recalcular, TOTW): lo que corre ahora y cuántas esperan */
    queue: { running: string | null; runningSince: string | null; waiting: number }
}

/** Lo que devuelve el api en GET /admin/worker: el ping, o por qué no hay respuesta */
export type IAdminWorkerHealth =
    | ({ alive: true; latencyMs: number } & IWorkerPing)
    | { alive: false; reason: "disabled" | "unavailable" | "timeout" | "error"; message: string }

/**
 * Métodos del RPC api → worker (packages/mq): { método: { params, result } }. El api llama con
 * `rpc.call("worker.ping")` y el worker responde con `rpc.handle("worker.ping", …)`.
 */
export type WorkerRpc = {
    "worker.ping": { params: void; result: IWorkerPing }
}

/** Qué hizo un admin */
export type AdminAction =
    | "member.link" | "member.unlink" | "member.photo" | "member.photo.upload"
    | "linkRequest.approve" | "linkRequest.reject"
    | "match.void" | "match.unvoid" | "match.voidAuto"
    | "worker.sync" | "worker.recalculate"
    | "user.role" | "token.create" | "token.revoke"

/** Una entrada del registro de acciones de admin */
export interface IAdminAuditEntry {
    id: string
    action: AdminAction
    /** id de la cuenta del admin */
    actorId: string | null
    actorName?: string | null
    /** sobre qué: playerId, matchId, userId, tokenId… */
    target?: string | null
    targetName?: string | null
    /** EA id del club donde se hizo (lo de cuenta y lo global, null) */
    clubId?: number | null
    /** detalles (valor anterior y nuevo, etc.) */
    details?: Record<string, unknown> | null
    createdAt: Date | string
}

/** Del api al worker: sincroniza ya con EA (sin esperar al siguiente intervalo) */
export interface ISyncNowPayload {
    requestedAt: string
    requestedBy: string | null
}
