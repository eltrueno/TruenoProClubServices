import { Schema, model } from "mongoose"

/**
 * Marcas de migraciones de una sola vez del worker (`_id`: `migration:*`, `doneAt`).
 */
export interface IWorkerTask {
    _id: string
    doneAt?: Date
}

const workerTaskSchema = new Schema<IWorkerTask>(
    {
        _id: { type: String },
        doneAt: { type: Date }
    },
    { collection: "worker_tasks", versionKey: false }
)

export const WorkerTaskModel = model<IWorkerTask>("worker_tasks", workerTaskSchema)
