import type { NextFunction, Request, Response } from "express"
import type { IAdminStatus, IAdminWorkerHealth, IWorkerStatus } from "@trueno-proclub-services/shared"
import { RpcError } from "@trueno-proclub-services/mq"
import { ClubMemberModel, LinkRequestModel, MatchModel, WorkerStatusModel, WORKER_STATUS_ID } from "@trueno-proclub-services/shared/models"
import { eventsEnabled, requestStatsRecalculation, requestSyncNow, rpc } from "../services/events.service.js"
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

/** POST /admin/sync: el worker sincroniza ya con EA. `queued: false` = RabbitMQ no está */
async function syncNow(req: Request, res: Response, next: NextFunction) {
    try {
        const queued = await requestSyncNow(req.user?.id ?? null)
        if (queued) await logAdminAction(req, "worker.sync")
        ok(res, { queued })
    } catch (err) {
        next(err)
    }
}

/** POST /admin/recalculate: el worker rehace stats, logros y medias */
async function recalculate(req: Request, res: Response, next: NextFunction) {
    try {
        const queued = await requestStatsRecalculation({ requestedBy: req.user?.id ?? null, reason: "admin-panel" })
        if (queued) await logAdminAction(req, "worker.recalculate")
        ok(res, { queued })
    } catch (err) {
        next(err)
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

export { getStatus, getWorkerHealth, syncNow, recalculate, getAudit, getLinkRequestHistory }
