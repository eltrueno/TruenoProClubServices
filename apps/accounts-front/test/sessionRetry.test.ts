/** Reintentos de get-session cuando Cloudflare corta a ratos la petición al auth. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick, ref } from "vue"
import { watchSessionWithRetry } from "../src/lib/sessionRetry.js"

const DELAYS = [1000, 2000, 4000]

/** Estado de sesión simulado: `refetch` decide si el siguiente intento falla o va bien */
function fakeSession(results: boolean[]) {
    const calls: number[] = []
    const state = ref<{ error: unknown; refetch: () => void } | null>(null)
    const refetch = () => {
        calls.push(Date.now())
        const ok = results.shift() ?? true
        state.value = { error: ok ? null : new Error("403"), refetch }
    }
    state.value = { error: new Error("403"), refetch } // el primer get-session ya ha fallado
    return { state, calls }
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe("watchSessionWithRetry", () => {
    it("tras un fallo reintenta y, si el siguiente va bien, deja de reintentar", async () => {
        const { state, calls } = fakeSession([true])
        const r = watchSessionWithRetry(state, DELAYS)
        await nextTick()
        expect(r.retrying.value).toBe(true)
        await vi.advanceTimersByTimeAsync(1000)
        expect(calls).toHaveLength(1)
        expect(r.retrying.value).toBe(false)
        expect(r.gaveUp.value).toBe(false)
        r.stop()
    })

    it("espera cada vez más entre intentos", async () => {
        const { state, calls } = fakeSession([false, false, true])
        const r = watchSessionWithRetry(state, DELAYS)
        const start = Date.now()
        await vi.advanceTimersByTimeAsync(1000 + 2000 + 4000)
        expect(calls.map((t) => t - start)).toEqual([1000, 3000, 7000])
        expect(r.retrying.value).toBe(false)
        r.stop()
    })

    it("si fallan todos los intentos, se rinde (y la página ya puede decir que el auth no responde)", async () => {
        const { state, calls } = fakeSession([false, false, false])
        const r = watchSessionWithRetry(state, DELAYS)
        await vi.advanceTimersByTimeAsync(20_000)
        expect(calls).toHaveLength(3)
        expect(r.retrying.value).toBe(false)
        expect(r.gaveUp.value).toBe(true)
        r.stop()
    })

    it("sin errores no hace nada", async () => {
        const state = ref<{ error: unknown; refetch: () => void } | null>({ error: null, refetch: vi.fn() })
        const r = watchSessionWithRetry(state, DELAYS)
        await vi.advanceTimersByTimeAsync(20_000)
        expect(state.value!.refetch).not.toHaveBeenCalled()
        expect(r.retrying.value).toBe(false)
        r.stop()
    })

    it("tras recuperarse, un fallo nuevo vuelve a empezar desde la espera corta", async () => {
        const { state, calls } = fakeSession([true, true])
        const r = watchSessionWithRetry(state, DELAYS)
        await vi.advanceTimersByTimeAsync(1000) // se recupera
        state.value = { error: new Error("403 otra vez"), refetch: state.value!.refetch }
        await nextTick()
        const t0 = Date.now()
        await vi.advanceTimersByTimeAsync(1000)
        expect(calls).toHaveLength(2)
        expect(calls[1] - t0).toBe(1000)
        r.stop()
    })
})
