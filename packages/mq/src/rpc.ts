import { randomUUID } from "node:crypto"
import type { Channel, ChannelModel, ConsumeMessage } from "amqplib"
import type { MqConnection } from "./connection.js"

/**
 * RPC sobre RabbitMQ (api → worker): el api pregunta y espera la respuesta, con un tiempo máximo.
 *
 * - La petición va a la cola `worker.rpc` con el nombre del método en `type`, un `correlationId`
 *   y `replyTo: amq.rabbitmq.reply-to` (direct reply-to: sin cola de respuestas que mantener).
 * - Caduca a la vez que el timeout del que pregunta: si el api ya se ha rendido, el worker no la
 *   ejecuta más tarde (nada de sincronizaciones "fantasma" diez minutos después).
 * - `mandatory`: si nadie escucha (worker parado), RabbitMQ la devuelve y se sabe al momento.
 * - La cola del worker es exclusiva y no durable: desaparece con él, así que nada se acumula.
 *
 * Los métodos y sus tipos se declaran con un mapa { método: { params, result } } (en shared,
 * `WorkerRpc`), y así `call("worker.ping")` sabe qué devuelve.
 */

export const RPC_QUEUE = "worker.rpc"
const REPLY_TO = "amq.rabbitmq.reply-to"

export type RpcMap = Record<string, { params: unknown; result: unknown }>

export type RpcErrorCode = "unavailable" | "timeout" | "unknown_method" | "bad_request" | "handler_error"

export interface RpcReplyOk<T = unknown> { ok: true; data: T }
export interface RpcReplyError { ok: false; error: { code: RpcErrorCode; message: string } }
export type RpcReply<T = unknown> = RpcReplyOk<T> | RpcReplyError

/** Error de una llamada: el worker no está, no contestó a tiempo o su handler falló */
export class RpcError extends Error {
    constructor(readonly code: RpcErrorCode, message: string) {
        super(message)
        this.name = "RpcError"
    }
}

// ── Lado del worker: repartir la petición a su handler (puro, sin RabbitMQ) ──

export type RpcHandler<P = unknown, R = unknown> = (params: P) => Promise<R> | R

/** Ejecuta el handler del método y lo envuelve en una respuesta (nunca lanza) */
export async function dispatch(handlers: ReadonlyMap<string, RpcHandler>, method: string | undefined, params: unknown): Promise<RpcReply> {
    const handler = method ? handlers.get(method) : undefined
    if (!handler) return { ok: false, error: { code: "unknown_method", message: `Método desconocido: ${method ?? "(sin método)"}` } }
    try {
        return { ok: true, data: await handler(params) }
    } catch (err) {
        if (err instanceof RpcError) return { ok: false, error: { code: err.code, message: err.message } }
        return { ok: false, error: { code: "handler_error", message: err instanceof Error ? err.message : String(err) } }
    }
}

/** Lee el cuerpo de una petición: `{ params }` en JSON (vacío = sin parámetros) */
export function decodeParams(body: Buffer | string): { ok: true; params: unknown } | { ok: false } {
    const text = body.toString()
    if (!text) return { ok: true, params: undefined }
    try {
        const parsed = JSON.parse(text) as { params?: unknown }
        return { ok: true, params: parsed?.params }
    } catch {
        return { ok: false }
    }
}

// ── Lado del api: llamadas esperando respuesta (puro, sin RabbitMQ) ──

interface Pending { resolve: (v: unknown) => void; reject: (e: RpcError) => void; timer: ReturnType<typeof setTimeout>; method: string }

/** Llamadas en vuelo por correlationId, cada una con su tiempo máximo */
export class PendingCalls {
    private readonly calls = new Map<string, Pending>()

    get size(): number { return this.calls.size }

    add<T>(id: string, method: string, timeoutMs: number): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.calls.delete(id)
                reject(new RpcError("timeout", `El worker no ha contestado a ${method} en ${timeoutMs / 1000} s`))
            }, timeoutMs)
            this.calls.set(id, { resolve: resolve as (v: unknown) => void, reject, timer, method })
        })
    }

    /** Llega la respuesta: resuelve (o rechaza con su error). Una respuesta tardía o ajena se ignora */
    settle(id: string, reply: RpcReply): boolean {
        const p = this.calls.get(id)
        if (!p) return false
        clearTimeout(p.timer)
        this.calls.delete(id)
        if (reply.ok) p.resolve(reply.data)
        else p.reject(new RpcError(reply.error.code, reply.error.message))
        return true
    }

    /** Falla una sola (p. ej. RabbitMQ la devolvió porque nadie escucha) */
    fail(id: string, err: RpcError): void {
        const p = this.calls.get(id)
        if (!p) return
        clearTimeout(p.timer)
        this.calls.delete(id)
        p.reject(err)
    }

    /** Se cayó la conexión: las respuestas ya no pueden llegar */
    failAll(err: RpcError): void {
        for (const id of [...this.calls.keys()]) this.fail(id, err)
    }
}

// ── Con RabbitMQ ──

/** Cliente (api): `call(método, params, { timeoutMs })` */
export class RpcClient<M extends RpcMap> {
    private channel: Channel | null = null
    private readonly pending = new PendingCalls()

    constructor(private readonly mq: MqConnection, private readonly defaultTimeoutMs = 10_000) {
        mq.onDown(() => {
            this.channel = null
            this.pending.failAll(new RpcError("unavailable", "Se ha perdido la conexión con RabbitMQ"))
        })
    }

    /** Monta el canal de respuestas en cada conexión. Llamar una vez al arrancar */
    async init(): Promise<void> {
        await this.mq.onReady(async (conn: ChannelModel) => {
            const ch = await conn.createChannel()
            ch.on("error", (err) => console.error("[RPC] Channel error", err))
            ch.on("close", () => { if (this.channel === ch) this.channel = null })
            // Devuelta por RabbitMQ: no hay cola worker.rpc (el worker no está)
            ch.on("return", (msg: ConsumeMessage) => {
                const id = msg.properties.correlationId as string | undefined
                if (id) this.pending.fail(id, new RpcError("unavailable", "El worker no está escuchando"))
            })
            // direct reply-to: hay que consumir (sin ack) en el mismo canal antes de publicar
            await ch.consume(REPLY_TO, (msg) => {
                if (!msg) return
                const id = msg.properties.correlationId as string | undefined
                if (!id) return
                try {
                    this.pending.settle(id, JSON.parse(msg.content.toString()) as RpcReply)
                } catch {
                    this.pending.fail(id, new RpcError("bad_request", "Respuesta ilegible del worker"))
                }
            }, { noAck: true })
            this.channel = ch
        })
    }

    async call<K extends keyof M & string>(method: K, ...[params, opts]: M[K]["params"] extends undefined | void
        ? [params?: M[K]["params"], opts?: { timeoutMs?: number }]
        : [params: M[K]["params"], opts?: { timeoutMs?: number }]): Promise<M[K]["result"]> {
        if (!this.mq.enabled) throw new RpcError("unavailable", "RabbitMQ no está configurado")
        const ch = this.channel
        if (!ch) throw new RpcError("unavailable", "Sin conexión con RabbitMQ")
        const timeoutMs = opts?.timeoutMs ?? this.defaultTimeoutMs
        const id = randomUUID()
        const result = this.pending.add<M[K]["result"]>(id, method, timeoutMs)
        ch.sendToQueue(RPC_QUEUE, Buffer.from(JSON.stringify({ params })), {
            type: method,
            correlationId: id,
            replyTo: REPLY_TO,
            expiration: String(timeoutMs),
            contentType: "application/json",
            mandatory: true,
        })
        return result
    }
}

/** Servidor (worker): `handle(método, fn)` y `init()` */
export class RpcServer<M extends RpcMap> {
    private readonly handlers = new Map<string, RpcHandler>()

    /** `prefetch`: cuántas peticiones a la vez (un ping no espera a que acabe otra cosa) */
    constructor(private readonly mq: MqConnection, private readonly prefetch = 4) { }

    handle<K extends keyof M & string>(method: K, fn: RpcHandler<M[K]["params"], M[K]["result"]>): this {
        this.handlers.set(method, fn as RpcHandler)
        return this
    }

    async init(): Promise<void> {
        await this.mq.onReady(async (conn: ChannelModel) => {
            const ch = await conn.createChannel()
            ch.on("error", (err) => console.error("[RPC] Channel error", err))
            await ch.assertQueue(RPC_QUEUE, { durable: false, exclusive: true })
            await ch.prefetch(this.prefetch)
            await ch.consume(RPC_QUEUE, async (msg) => {
                if (!msg) return
                const decoded = decodeParams(msg.content)
                const reply: RpcReply = decoded.ok
                    ? await dispatch(this.handlers, msg.properties.type as string | undefined, decoded.params)
                    : { ok: false, error: { code: "bad_request", message: "Petición ilegible" } }
                const { replyTo, correlationId } = msg.properties
                if (replyTo) ch.sendToQueue(replyTo, Buffer.from(JSON.stringify(reply)), { correlationId, contentType: "application/json" })
                ch.ack(msg)
            })
            console.info(`[RPC] Listening on '${RPC_QUEUE}' (${[...this.handlers.keys()].join(", ")})`)
        })
    }
}
