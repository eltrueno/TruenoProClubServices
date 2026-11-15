/**
 * Tokens de API y consulta de cuentas (/api/v1/accounts) contra un Mongo en memoria.
 * El api del club (de donde sale el jugador vinculado) se simula con `fetch`.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { MongoMemoryServer } from "mongodb-memory-server"

const mongod = await MongoMemoryServer.create()
process.env.MONGODB_URI = mongod.getUri()
process.env.DBNAME = "authtokentest"
process.env.CLUB_API_URL = "http://club-api.test/"

const { connectToDatabase, db } = await import("../src/db/index.js")
const { apiTokenService } = await import("../src/services/apiTokenService.js")
const { accountLookupService } = await import("../src/services/accountLookupService.js")

const addUser = async (doc: Record<string, unknown>) =>
    (await db.collection("user").insertOne({ email: `${Math.random()}@x.test`, ...doc })).insertedId.toString()

/** Simula GET /members/by-user del api con estos vínculos */
const mockClubApi = (links: Record<string, string>) =>
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = new URL(String(input))
        const ids = (url.searchParams.get("ids") ?? "").split(",")
        const response = ids.filter((id) => links[id]).map((userId) => ({ userId, playerId: links[userId] }))
        return new Response(JSON.stringify({ status: { code: 200, message: "Ok" }, response }), { status: 200 })
    })

beforeAll(async () => {
    await connectToDatabase()
    await apiTokenService.ensureIndexes()
})
afterEach(() => vi.restoreAllMocks())
afterAll(async () => { await mongod.stop() })

describe("apiTokenService", () => {
    it("crea, valida, lista sin el token y revoca", async () => {
        const created = await apiTokenService.create("Web del draft", "admin1")
        expect(created.token).toMatch(/^tpcs_[\w-]{43}$/)
        expect(created.hint).toBe(created.token.slice(0, 9))

        // En la base no queda el token en claro
        const stored = await db.collection("api_tokens").findOne({})
        expect(JSON.stringify(stored)).not.toContain(created.token)

        expect(await apiTokenService.verify(created.token)).toMatchObject({ id: created.id, name: "Web del draft" })
        expect(await apiTokenService.verify(created.token + "x")).toBeNull()
        expect(await apiTokenService.verify("otra-cosa")).toBeNull()

        const listed = await apiTokenService.list()
        expect(listed).toHaveLength(1)
        expect(listed[0]).not.toHaveProperty("token")
        expect(listed[0]).not.toHaveProperty("tokenHash")

        expect(await apiTokenService.revoke(created.id)).toBe(true)
        expect(await apiTokenService.verify(created.token)).toBeNull()
        expect(await apiTokenService.revoke(created.id)).toBe(false)
        expect(await apiTokenService.revoke("no-es-un-id")).toBe(false)
    })
})

describe("accountLookupService", () => {
    it("busca por id de Twitch, por nombre (sin distinguir mayúsculas) y por id de cuenta, con su jugador", async () => {
        const ana = await addUser({ name: "AnaGamer", image: "a.png", role: "subscriber", twitchId: "111", twitchFollowing: true, twitchSub: true, twitchSubTier: "1000", showPublicName: false })
        const bob = await addUser({ name: "Bob_99", twitchId: "222", discordId: "900", discordName: "bob" })
        const cia = await addUser({ name: "Cia", twitchId: "333" })
        const fetchMock = mockClubApi({ [ana]: "EA-1" })

        const result = await accountLookupService.lookup({ ids: [cia], twitchIds: ["111", "999"], twitchLogins: ["bob_99", "anagamer"] })
        expect(result.ok).toBe(true)
        if (!result.ok) return
        const byName = Object.fromEntries(result.data.map((a) => [a.name, a]))

        // Ana sale una sola vez aunque coincida por id de Twitch y por nombre
        expect(result.data).toHaveLength(3)
        // La privacidad (showPublicName) no se aplica aquí, y el email no sale nunca
        expect(byName.AnaGamer).toEqual({
            id: ana, name: "AnaGamer", image: "a.png", role: "subscriber", twitchId: "111",
            twitchFollowing: true, twitchSub: true, twitchSubTier: "1000", twitchSyncedAt: null, twitchNeedsReauth: false, discordId: null, discordName: null, playerId: "EA-1"
        })
        expect(byName.Bob_99).toMatchObject({ id: bob, role: "visitor", twitchFollowing: false, playerId: null, discordId: "900", discordName: "bob" })
        expect(byName.Cia.playerId).toBeNull()
        expect(JSON.stringify(result.data)).not.toContain("@x.test")

        expect(String(fetchMock.mock.calls[0][0])).toMatch(/^http:\/\/club-api\.test\/members\/by-user\?ids=/)
    })

    it("busca por id de Discord (lo que usa el bot para saber quién es alguien)", async () => {
        const eva = await addUser({ name: "Eva", twitchId: "555", discordId: "901", discordName: "eva.gg" })
        mockClubApi({ [eva]: "EA-9" })
        const result = await accountLookupService.lookup({ ids: [], twitchIds: [], twitchLogins: [], discordIds: ["901", "nope"] })
        expect(result).toMatchObject({ ok: true, data: [{ id: eva, discordId: "901", discordName: "eva.gg", playerId: "EA-9" }] })
    })

    it("rechaza peticiones vacías, inválidas o demasiado grandes sin consultar nada", async () => {
        const fetchMock = mockClubApi({})
        expect(await accountLookupService.lookup({ ids: [], twitchIds: [], twitchLogins: [] })).toMatchObject({ ok: false, error: { code: "NO_VALID_PARAMS" } })
        expect(await accountLookupService.lookup({ ids: ["zzz"], twitchIds: ["abc"], twitchLogins: ["no vale!"] })).toMatchObject({ ok: false, error: { code: "NO_VALID_PARAMS" } })
        const many = Array.from({ length: 101 }, (_, i) => String(i + 1))
        expect(await accountLookupService.lookup({ ids: [], twitchIds: many, twitchLogins: [] })).toMatchObject({ ok: false, error: { code: "TOO_MANY" } })
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("si el api del club no responde, avisa en vez de decir que nadie tiene jugador", async () => {
        await addUser({ name: "Dani", twitchId: "444" })
        vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 500 }))
        vi.spyOn(console, "error").mockImplementation(() => undefined)
        expect(await accountLookupService.lookup({ ids: [], twitchIds: ["444"], twitchLogins: [] })).toMatchObject({ ok: false, error: { code: "PLAYERS_UNAVAILABLE" } })
    })

    it("sin coincidencias devuelve lista vacía y no pregunta al api", async () => {
        const fetchMock = mockClubApi({})
        expect(await accountLookupService.lookup({ ids: [], twitchIds: ["987654"], twitchLogins: [] })).toEqual({ ok: true, data: [] })
        expect(fetchMock).not.toHaveBeenCalled()
    })
})
