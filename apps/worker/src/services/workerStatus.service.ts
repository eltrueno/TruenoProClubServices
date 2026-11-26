import { WorkerStatusModel, WORKER_STATUS_ID } from "@trueno-proclub-services/shared/models"
import type { IWorkerStatus } from "@trueno-proclub-services/shared"

/**
 * Estado del worker para el panel admin (doc único en la base del club). Nunca rompe lo que
 * está haciendo el worker: si no se puede escribir, lo dice en el log y sigue.
 */
export const setWorkerStatus = (patch: Partial<IWorkerStatus>) =>
    WorkerStatusModel.updateOne({ _id: WORKER_STATUS_ID }, { $set: patch }, { upsert: true })
        .catch((err) => console.warn("[Worker status] No se ha podido guardar:", err instanceof Error ? err.message : err))
