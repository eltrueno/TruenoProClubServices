/**
 * Limpieza de vínculos de cuentas borradas contra un Mongo real (en memoria) y un auth
 * simulado.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"

const mongod = await MongoMemoryServer.create()
process.env.SHARED_DB_NAME = "shared_test"
process.env.AUTH_URL = "http://auth.test"

const { PlayerIdentityModel, LinkRequestModel } = await import("@trueno-proclub-services/shared/models")
const { sweepOrphanLinks, unlinkUser } = await import("../src/services/identityCleanup.service.js")

const oid = () => new mongoose.Types.ObjectId().toString()

// auth simulado: existen las cuentas de `alive`
let alive = new Set<string>()
let calls = 0
let authDown = false
const fakeFetch = (async (url: string) => {
    calls++
    if (authDown) return new Response("{}", { status: 503 })
    const ids = new URL(url).searchParams.get("ids")!.split(",")
    const data = ids.filter((id) => alive.has(id)).map((id) => ({ id, name: "x", image: null }))
    return new Response(JSON.stringify({ status: "success", data }), { status: 200 })
}) as typeof fetch

const link = (playerId: string, userId: string | null) => PlayerIdentityModel.create({ playerId, userId })
const userOf = async (playerId: string) => (await PlayerIdentityModel.findOne({ playerId }).lean())?.userId ?? null
const linkedCount = () => PlayerIdentityModel.countDocuments({ userId: { $ne: null } })

beforeAll(async () => { await mongoose.connect(mongod.getUri(), { dbName: "club_test" }) })
afterAll(async () => {
    await mongoose.disconnect()
    await mongod.stop()
})
beforeEach(async () => {
    await PlayerIdentityModel.deleteMany({})
    await LinkRequestModel.deleteMany({})
    alive = new Set()
    calls = 0
    authDown = false
})

describe("unlinkUser", () => {
    it("deja el jugador libre y retira solo las solicitudes pendientes", async () => {
        const u = oid()
        await link("p1", u)
        await LinkRequestModel.create({ userId: u, userName: "a", playerId: "p9", playerName: "P9", status: "pending" })
        await LinkRequestModel.create({ userId: u, userName: "a", playerId: "p1", playerName: "P1", status: "approved" })
        const r = await unlinkUser(u)
        expect(r).toEqual({ unlinked: 1, requests: 1 })
        expect(await userOf("p1")).toBeNull()
        expect(await LinkRequestModel.countDocuments({ userId: u })).toBe(1) // el histórico se queda
    })
})

describe("sweepOrphanLinks", () => {
    it("libera solo el jugador de la cuenta borrada", async () => {
        const [a, b, c, borrada] = [oid(), oid(), oid(), oid()]
        alive = new Set([a, b, c])
        await link("a", a); await link("b", b); await link("c", c); await link("d", borrada)
        await link("e", "no-es-un-objectid"); await link("f", null)
        const r = await sweepOrphanLinks(fakeFetch)
        expect(r.aborted).toBe(false)
        expect(r.orphans).toEqual([borrada])
        expect(await userOf("d")).toBeNull()
        expect(await userOf("a")).toBe(a)
        expect(await userOf("e")).toBe("no-es-un-objectid") // ids raros: no se tocan
    })

    it("auth caído: no toca nada", async () => {
        await link("a", oid()); await link("b", oid())
        authDown = true
        const r = await sweepOrphanLinks(fakeFetch)
        expect(r.aborted).toBe(true)
        expect(await linkedCount()).toBe(2)
    })

    it("no aparece NINGUNA de las cuentas (auth con otra base): no toca nada, aunque sean pocas", async () => {
        await link("a", oid())
        const r = await sweepOrphanLinks(fakeFetch)
        expect(r.aborted).toBe(true)
        expect(await linkedCount()).toBe(1)
    })

    it("faltan más de la mitad de golpe (3 o más): no toca nada", async () => {
        const keep = oid()
        alive = new Set([keep])
        await link("a", keep); await link("b", oid()); await link("c", oid()); await link("d", oid())
        const r = await sweepOrphanLinks(fakeFetch)
        expect(r.aborted).toBe(true)
        expect(await linkedCount()).toBe(4)
    })

    it("va en lotes de 50 (lo que acepta el auth)", async () => {
        for (let i = 0; i < 120; i++) { const id = oid(); alive.add(id); await link(`p${i}`, id) }
        const r = await sweepOrphanLinks(fakeFetch)
        expect(calls).toBe(3)
        expect(r).toMatchObject({ aborted: false, checked: 120, orphans: [] })
    })

    it("sin vínculos ni siquiera llama al auth", async () => {
        const r = await sweepOrphanLinks(fakeFetch)
        expect(calls).toBe(0)
        expect(r.checked).toBe(0)
    })
})
