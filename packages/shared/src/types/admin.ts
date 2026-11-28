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
    /** los últimos trabajos pedidos desde el panel (el más reciente primero) */
    jobs: IWorkerJob[]
}

/** Trabajo largo pedido desde el panel (sincronizar, recalcular, aplicar un mantenimiento) */
export type WorkerJobKind = "sync" | "recalculate" | "maintenance"
export type WorkerJobState = "queued" | "running" | "done" | "failed"
export interface IWorkerJob {
    id: string
    kind: WorkerJobKind
    /** qué es, para el panel ("Sincronizar con EA", "Penaltis mal detectados"…) */
    label: string
    state: WorkerJobState
    requestedBy: string | null
    queuedAt: string
    startedAt: string | null
    finishedAt: string | null
    /** al acabar bien: un resumen ("3 partidos nuevos") y los números */
    result?: { summary: string; [key: string]: unknown } | null
    error?: string | null
}

/** Arreglo de datos ya guardados que se puede lanzar desde el panel (con vista previa antes) */
export interface IMaintenanceTask {
    name: string
    title: string
    description: string
    /** al aplicarlo se recalculan stats, logros y medias */
    recalculates: boolean
}
/** Un partido que cambiaría: el marcador y el resultado antes y después */
export interface IMaintenanceChange {
    matchId: number
    timestamp: number
    rival: string
    before: string
    after: string
}
export interface IMaintenancePreview {
    name: string
    /** partidos revisados */
    scanned: number
    /** cuántos cambiarían (para aplicar hay que mandar este número: si cambia, se vuelve a mirar) */
    affected: number
    /** los primeros (como mucho 50), del más reciente al más antiguo */
    changes: IMaintenanceChange[]
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
    /** Sincronizar ya / recalcular: se acepta al momento y se sigue con worker.job */
    "worker.sync": { params: { requestedBy: string | null }; result: IWorkerJob }
    "worker.recalculate": { params: { requestedBy: string | null }; result: IWorkerJob }
    /** Cómo va un trabajo (null: no lo conoce, p. ej. el worker se ha reiniciado) */
    "worker.job": { params: { id: string }; result: IWorkerJob | null }
    "maintenance.list": { params: void; result: IMaintenanceTask[] }
    "maintenance.preview": { params: { name: string }; result: IMaintenancePreview }
    /** `expected`: los afectados de la vista previa; si ya no son esos, no se aplica */
    "maintenance.apply": { params: { name: string; expected: number; requestedBy: string | null }; result: IWorkerJob }
}

/** Qué hizo un admin */
export type AdminAction =
    | "member.link" | "member.unlink" | "member.photo" | "member.photo.upload"
    | "linkRequest.approve" | "linkRequest.reject"
    | "match.void" | "match.unvoid" | "match.voidAuto"
    | "worker.sync" | "worker.recalculate" | "worker.maintenance"
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

