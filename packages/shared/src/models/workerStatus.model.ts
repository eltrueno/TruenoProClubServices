import { Schema, model } from "mongoose"
import type { IWorkerStatus } from "../types/admin.js"

/**
 * Estado del worker del club (un solo doc, `_id: "worker"`, en la base del club): lo escribe el
 * worker al sincronizar y recalcular, y lo lee el api para el panel admin.
 */
const workerStatusSchema = new Schema<IWorkerStatus & { _id: string }>(
    {
        _id: { type: String },
        clubId: { type: Number },
        lastSyncAt: { type: Date, default: null },
        lastSyncOk: { type: Boolean },
        lastSyncError: { type: String, default: null },
        lastSyncInserted: { type: Number, default: 0 },
        lastRecalcAt: { type: Date, default: null },
        intervalSec: { type: Number },
        startedAt: { type: Date, default: null },
    },
    { collection: "worker_status", versionKey: false }
)

export const WorkerStatusModel = model<IWorkerStatus & { _id: string }>("worker_status", workerStatusSchema)
export const WORKER_STATUS_ID = "worker"
