import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PendingCalls, RpcError, decodeParams, dispatch, type RpcHandler } from "../src/rpc"

describe("dispatch (worker)", () => {
    const handlers = new Map<string, RpcHandler>([
        ["worker.ping", () => ({ alive: true })],
        ["echo", (p) => p],
        ["boom", () => { throw new Error("se rompió") }],
        ["busy", () => { throw new RpcError("unavailable", "ocupado") }],
    ])

    it("responde con lo que devuelve el handler", async () => {
        expect(await dispatch(handlers, "worker.ping", undefined)).toEqual({ ok: true, data: { alive: true } })
        expect(await dispatch(handlers, "echo", { a: 1 })).toEqual({ ok: true, data: { a: 1 } })
    })

    it("método desconocido o sin método", async () => {
        expect(await dispatch(handlers, "nope", undefined)).toMatchObject({ ok: false, error: { code: "unknown_method" } })
        expect(await dispatch(handlers, undefined, undefined)).toMatchObject({ ok: false, error: { code: "unknown_method" } })
    })

    it("un error del handler vuelve como respuesta, no rompe el worker", async () => {
        expect(await dispatch(handlers, "boom", undefined)).toEqual({ ok: false, error: { code: "handler_error", message: "se rompió" } })
        expect(await dispatch(handlers, "busy", undefined)).toEqual({ ok: false, error: { code: "unavailable", message: "ocupado" } })
    })
})

describe("decodeParams", () => {
    it("lee { params }, vacío o ilegible", () => {
        expect(decodeParams(Buffer.from(JSON.stringify({ params: { week: "2026-W48" } })))).toEqual({ ok: true, params: { week: "2026-W48" } })
        expect(decodeParams(Buffer.from(JSON.stringify({})))).toEqual({ ok: true, params: undefined })
        expect(decodeParams("")).toEqual({ ok: true, params: undefined })
        expect(decodeParams("{no es json")).toEqual({ ok: false })
    })
})

describe("PendingCalls (api)", () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it("resuelve con su respuesta, aunque lleguen en otro orden", async () => {
        const p = new PendingCalls()
        const a = p.add("a", "worker.ping", 1000)
        const b = p.add("b", "worker.ping", 1000)
        expect(p.settle("b", { ok: true, data: "B" })).toBe(true)
        expect(p.settle("a", { ok: true, data: "A" })).toBe(true)
        await expect(a).resolves.toBe("A")
        await expect(b).resolves.toBe("B")
        expect(p.size).toBe(0)
    })

    it("una respuesta con error rechaza con su código", async () => {
        const p = new PendingCalls()
        const a = p.add("a", "boom", 1000)
        p.settle("a", { ok: false, error: { code: "handler_error", message: "se rompió" } })
        await expect(a).rejects.toMatchObject({ name: "RpcError", code: "handler_error", message: "se rompió" })
    })

    it("sin respuesta a tiempo: timeout, y la respuesta tardía se ignora", async () => {
        const p = new PendingCalls()
        const a = p.add("a", "worker.ping", 5000)
        const check = expect(a).rejects.toMatchObject({ code: "timeout" })
        vi.advanceTimersByTime(5000)
        await check
        expect(p.settle("a", { ok: true, data: "tarde" })).toBe(false)
    })

    it("se cae la conexión: fallan todas las que esperaban", async () => {
        const p = new PendingCalls()
        const a = p.add("a", "worker.ping", 5000)
        const b = p.add("b", "worker.ping", 5000)
        p.failAll(new RpcError("unavailable", "sin conexión"))
        await expect(a).rejects.toMatchObject({ code: "unavailable" })
        await expect(b).rejects.toMatchObject({ code: "unavailable" })
        expect(p.size).toBe(0)
    })

    it("devuelta por RabbitMQ (nadie escucha): falla solo esa", async () => {
        const p = new PendingCalls()
        const a = p.add("a", "worker.ping", 5000)
        const b = p.add("b", "worker.ping", 5000)
        p.fail("a", new RpcError("unavailable", "El worker no está escuchando"))
        await expect(a).rejects.toMatchObject({ code: "unavailable" })
        p.settle("b", { ok: true, data: 1 })
        await expect(b).resolves.toBe(1)
    })
})
