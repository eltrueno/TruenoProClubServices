import type { NextFunction, Request, Response } from "express"
import type { IAdminStatus, IAdminWorkerHealth, IWorkerStatus } from "@trueno-proclub-services/shared"
import { RpcError } from "@trueno-proclub-services/mq"
import { ClubMemberModel, LinkRequestModel, MatchModel, WorkerStatusModel, WORKER_STATUS_ID } from "@trueno-proclub-services/shared/models"
import { eventsEnabled, rpc } from "../services/events.service.js"
import { listAdminActions, logAdminAction } from "../services/adminAudit.service.js"

const ok = (res: Response, response: unknown) => res.json({ status: { code: 200, message: "Ok" }, response })
const CLUB_ID = Number(process.env.CLUBID) || 0

/** GET /admin/status: cómo está el club (worker, partidos, miembros, RabbitMQ) */
async function getStatus(_req: Request, res: Response, next: NextFunction) {
    try {
        const [worker, matches, members, last] = await Promise.all([
            WorkerStatusModel.findById(WORKER_STATUS_ID).lean<IWorkerStatus & { _id?: string }>(),
            MatchModel.countDocuments(),
            ClubMemberModel.countDocuments(),
            MatchModel.findOne({}, { matchId: 1, timestamp: 1 }).sort({ timestamp: -1 }).lean<{ matchId: number; timestamp: number }>(),
        ])
        if (worker) delete worker._id
        const status: IAdminStatus = {
            clubId: CLUB_ID,
            worker: worker ?? null,
            matches,
            members,
            lastMatch: last ? { matchId: last.matchId, timestamp: last.timestamp } : null,
            events: eventsEnabled(),
            serverTime: new Date().toISOString(),
        }
        ok(res, status)
    } catch (err) {
        next(err)
    }
}

/**
 * GET /admin/worker: ping al worker por RPC (5 s como mucho). Siempre 200: `alive: false` con el
 * motivo si no contesta (sin RabbitMQ, worker parado, no responde a tiempo).
 */
async function getWorkerHealth(_req: Request, res: Response, next: NextFunction) {
    try {
        const started = Date.now()
        let health: IAdminWorkerHealth
        try {
            const ping = await rpc.call("worker.ping", undefined, { timeoutMs: 5000 })
            health = { alive: true, latencyMs: Date.now() - started, ...ping }
        } catch (err) {
            const code = err instanceof RpcError ? err.code : "error"
            const reason = !eventsEnabled() ? "disabled" : code === "timeout" ? "timeout" : code === "unavailable" ? "unavailable" : "error"
            health = { alive: false, reason, message: err instanceof Error ? err.message : String(err) }
        }
        ok(res, health)
    } catch (err) {
        next(err)
    }
}

/**
 * Error del RPC con el worker → respuesta HTTP: 503 si no está o no contesta, 409 si la petición ya
 * no vale (p. ej. la vista previa de un mantenimiento ha cambiado), 500 si su handler ha fallado.
 * Va con `message` legible para el panel.
 */
function sendRpcError(res: Response, err: unknown): boolean {
    if (!(err instanceof RpcError)) return false
    const [http, code] = err.code === "unavailable" ? [503, "WORKER_UNAVAILABLE"]
        : err.code === "timeout" ? [503, "WORKER_TIMEOUT"]
            : err.code === "bad_request" ? [409, "WORKER_CONFLICT"]
                : err.code === "unknown_method" ? [501, "WORKER_OUTDATED"]
                    : [500, "WORKER_ERROR"]
    res.status(http).json({ status: { code: http, message: code }, message: err.message })
    return true
}

/** POST /admin/sync: el worker sincroniza ya con EA. Devuelve el trabajo (`IWorkerJob`), que se sigue con /admin/jobs/:id */
async function syncNow(req: Request, res: Response, next: NextFunction) {
    try {
        const job = await rpc.call("worker.sync", { requestedBy: req.user?.id ?? null })
        await logAdminAction(req, "worker.sync")
        ok(res, job)
    } catch (err) {
        if (!sendRpcError(res, err)) next(err)
    }
}

/** POST /admin/recalculate: el worker rehace stats, logros y medias. Devuelve el trabajo */
async function recalculate(req: Request, res: Response, next: NextFunction) {
    try {
        const job = await rpc.call("worker.recalculate", { requestedBy: req.user?.id ?? null })
        await logAdminAction(req, "worker.recalculate")
        ok(res, job)
    } catch (err) {
        if (!sendRpcError(res, err)) next(err)
    }
}

/** GET /admin/jobs/:id: cómo va un trabajo. 404 si el worker no lo conoce (p. ej. se ha reiniciado) */
async function getJob(req: Request, res: Response, next: NextFunction) {
    try {
        const job = await rpc.call("worker.job", { id: String(req.params.id) }, { timeoutMs: 5000 })
        if (!job) {
            res.status(404).json({ status: { code: 404, message: "JOB_NOT_FOUND" }, message: "El worker no conoce ese trabajo (puede que se haya reiniciado)" })
            return
        }
        ok(res, job)
    } catch (err) {
        if (!sendRpcError(res, err)) next(err)
    }
}

/** GET /admin/maintenance: los mantenimientos que se pueden lanzar */
async function listMaintenance(_req: Request, res: Response, next: NextFunction) {
    try {
        ok(res, await rpc.call("maintenance.list", undefined, { timeoutMs: 5000 }))
    } catch (err) {
        if (!sendRpcError(res, err)) next(err)
    }
}

/** POST /admin/maintenance/:name/preview: cuántos y qué partidos cambiaría (no toca nada) */
async function previewMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
        ok(res, await rpc.call("maintenance.preview", { name: String(req.params.name) }, { timeoutMs: 30_000 }))
    } catch (err) {
        if (!sendRpcError(res, err)) next(err)
    }
}

/**
 * POST /admin/maintenance/:name/apply `{ expected }`: lo aplica si siguen siendo `expected` partidos
 * (los de la vista previa; si no, 409). Devuelve el trabajo.
 */
async function applyMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
        const name = String(req.params.name)
        const expected = Number(req.body?.expected)
        if (!Number.isInteger(expected) || expected < 0) return next(new Error("ERROR_BAD_REQUEST"))
        const job = await rpc.call("maintenance.apply", { name, expected, requestedBy: req.user?.id ?? null }, { timeoutMs: 30_000 })
        await logAdminAction(req, "worker.maintenance", { target: name, targetName: job.label, details: { expected } })
        ok(res, job)
    } catch (err) {
        if (!sendRpcError(res, err)) next(err)
    }
}

/** GET /admin/audit?limit=&before= : registro de acciones (este club y las globales) */
async function getAudit(req: Request, res: Response, next: NextFunction) {
    try {
        const limit = Number(req.query.limit) || 100
        const before = typeof req.query.before === "string" ? req.query.before : undefined
        ok(res, await listAdminActions(limit, before))
    } catch (err) {
        next(err)
    }
}

/** GET /admin/link-requests/history?playerId= : solicitudes ya resueltas de un jugador (quién y cuándo) */
async function getLinkRequestHistory(req: Request, res: Response, next: NextFunction) {
    try {
        const playerId = typeof req.query.playerId === "string" ? req.query.playerId : ""
        if (!playerId) return next(new Error("ERROR_BAD_REQUEST"))
        const docs = await LinkRequestModel.find({ playerId, status: { $ne: "pending" } }).sort({ resolvedAt: -1, createdAt: -1 }).limit(50)
        ok(res, docs.map((d) => d.toJSON()))
    } catch (err) {
        next(err)
    }
}

export { getStatus, getWorkerHealth, syncNow, recalculate, getJob, listMaintenance, previewMaintenance, applyMaintenance, getAudit, getLinkRequestHistory }
