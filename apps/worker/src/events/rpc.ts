import { readFileSync } from "node:fs"
import { RpcServer, type MqConnection } from "@trueno-proclub-services/mq"
import type { IWorkerPing, WorkerRpc } from "@trueno-proclub-services/shared"
import { exclusiveState } from "../utils/exclusive.js"

/**
 * Lo que el api puede preguntar al worker por RPC (packages/mq, tipos en shared `WorkerRpc`).
 * Por ahora, el ping: está vivo, versión, desde cuándo y qué tiene en la cola.
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
    }
}

export async function setupRpc(mq: MqConnection, clubId: number): Promise<void> {
    const rpc = new RpcServer<WorkerRpc>(mq)
    rpc.handle("worker.ping", () => workerPing(clubId))
    await rpc.init()
}
