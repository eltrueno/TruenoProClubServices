import { readFileSync } from "node:fs"
import { RpcError, RpcServer, type MqConnection } from "@trueno-proclub-services/mq"
import type { IWorkerPing, WorkerRpc } from "@trueno-proclub-services/shared"
import { exclusiveState, runExclusive } from "../utils/exclusive.js"
import { getJob, recentJobs, startJob } from "../utils/jobs.js"
import { runSync } from "../utils/NewMatchesFinder.js"
import { recalculateEverything } from "../services/voidMatches.service.js"
import { applyMaintenance, listMaintenance, maintenanceRecalculates, maintenanceTitle, previewMaintenance } from "../services/maintenance.js"

/**
 * Lo que el api puede pedir al worker por RPC (packages/mq, tipos en shared `WorkerRpc`):
 * - ping: vivo, versión, qué tiene en la cola y los últimos trabajos;
 * - sincronizar / recalcular: se aceptan al momento como trabajo (utils/jobs.ts) y el panel los
 *   sigue con `worker.job`;
 * - mantenimientos (services/maintenance.ts): lista, vista previa y aplicar (también como trabajo).
 */

const STARTED_AT = new Date()
/** Versión del package.json del worker (src/events o dist/events: los dos a dos niveles) */
const VERSION = (() => {
    try {
        return (JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version?: string }).version ?? "?"
    } catch {
        return "?"
    }
})()

export function workerPing(clubId: number): IWorkerPing {
    return {
        clubId,
        version: VERSION,
        node: process.version,
        startedAt: STARTED_AT.toISOString(),
        uptimeSec: Math.round(process.uptime()),
        queue: exclusiveState(),
        jobs: recentJobs(5),
    }
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export async function setupRpc(mq: MqConnection, clubId: number): Promise<void> {
    const rpc = new RpcServer<WorkerRpc>(mq)

    rpc.handle("worker.ping", () => workerPing(clubId))

    // runSync ya va por la cola de runExclusive y avisa cuando empieza de verdad
    rpc.handle("worker.sync", ({ requestedBy }) => startJob("sync", "Sincronizar con EA", requestedBy, async (started) => {
        console.info(`[Sync] Sincronización pedida desde el panel${requestedBy ? ` por ${requestedBy}` : ""}`)
        const r = await runSync("panel", started)
        if (r.error) throw new Error(r.error)
        return { summary: r.inserted ? plural(r.inserted, "partido nuevo", "partidos nuevos") : "Sin partidos nuevos", inserted: r.inserted }
    }))

    rpc.handle("worker.recalculate", ({ requestedBy }) => startJob("recalculate", "Recalcular stats", requestedBy, (started) =>
        runExclusive(async () => {
            started()
            console.info(`[Stats] Recálculo pedido desde el panel${requestedBy ? ` por ${requestedBy}` : ""}`)
            await recalculateEverything(clubId)
            return { summary: "Stats, logros y medias rehechos" }
        }, "recalculate")))

    rpc.handle("worker.job", ({ id }) => getJob(id))

    rpc.handle("maintenance.list", () => listMaintenance())
    rpc.handle("maintenance.preview", ({ name }) => previewMaintenance(name))
    rpc.handle("maintenance.apply", async ({ name, expected, requestedBy }) => {
        // Antes de aceptarlo: si ya no son los de la vista previa, se dice ya (no tras la cola)
        const now = await previewMaintenance(name)
        if (now.affected !== expected) throw new RpcError("bad_request", `Ha cambiado desde la vista previa (${expected} → ${now.affected} partidos): vuelve a mirarlo`)
        const title = maintenanceTitle(name)
        return startJob("maintenance", title, requestedBy, (started) => runExclusive(async () => {
            started()
            const { changed } = await applyMaintenance(name, expected)
            if (changed && maintenanceRecalculates(name)) await recalculateEverything(clubId)
            return {
                summary: changed ? `${plural(changed, "partido arreglado", "partidos arreglados")}${maintenanceRecalculates(name) ? " y stats recalculadas" : ""}` : "Nada que arreglar",
                changed,
            }
        }, "maintenance"))
    })

    await rpc.init()
}
