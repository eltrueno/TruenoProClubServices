import { randomUUID } from "node:crypto"
import type { IWorkerJob, WorkerJobKind } from "@trueno-proclub-services/shared"

/**
 * Trabajos largos pedidos desde el panel (sincronizar, recalcular, aplicar un mantenimiento). El RPC
 * contesta al momento con el trabajo "en cola" y el panel lo va consultando (`worker.job`) hasta que
 * acaba. En memoria: si el worker se reinicia se pierden (el panel lo dice así).
 *
 * Quien lanza el trabajo pasa `run(started)`: lo mete él en la cola de runExclusive y llama a
 * `started()` cuando de verdad empieza (hasta entonces sigue "en cola").
 */

const MAX_KEPT = 30
const jobs = new Map<string, IWorkerJob>()

export type JobResult = { summary: string; [key: string]: unknown }

const copy = (j: IWorkerJob): IWorkerJob => ({ ...j, result: j.result ? { ...j.result } : j.result })

function keep(job: IWorkerJob) {
    jobs.set(job.id, job)
    // Los más viejos fuera (el Map guarda el orden de entrada)
    while (jobs.size > MAX_KEPT) jobs.delete(jobs.keys().next().value!)
}

/**
 * Lanza un trabajo y lo devuelve ya, en cola. Si ya hay uno igual esperando (mismo tipo y misma
 * etiqueta, aún sin empezar), devuelve ese: pulsar dos veces no encola dos.
 */
export function startJob(kind: WorkerJobKind, label: string, requestedBy: string | null, run: (started: () => void) => Promise<JobResult>): IWorkerJob {
    const waiting = [...jobs.values()].find((j) => j.kind === kind && j.label === label && j.state === "queued")
    if (waiting) return copy(waiting)

    const job: IWorkerJob = {
        id: randomUUID(), kind, label, state: "queued", requestedBy,
        queuedAt: new Date().toISOString(), startedAt: null, finishedAt: null, result: null, error: null,
    }
    keep(job)
    const started = () => {
        job.state = "running"
        job.startedAt = new Date().toISOString()
    }
    run(started).then(
        (result) => { job.state = "done"; job.result = result },
        (err: unknown) => {
            job.state = "failed"
            job.error = err instanceof Error ? err.message : String(err)
            console.error(`[Jobs] ${label} falló:`, err)
        },
    ).finally(() => { job.finishedAt = new Date().toISOString() })
    return copy(job)
}

export const getJob = (id: string): IWorkerJob | null => {
    const j = jobs.get(id)
    return j ? copy(j) : null
}

/** Los últimos, del más reciente al más antiguo */
export const recentJobs = (n = 5): IWorkerJob[] => [...jobs.values()].slice(-n).reverse().map(copy)

/** Para los tests */
export const clearJobs = () => jobs.clear()
