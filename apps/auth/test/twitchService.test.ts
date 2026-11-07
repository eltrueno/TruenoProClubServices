/**
 * Sincronización con Twitch (follow, sub, rol) con Twitch y los modelos simulados:
 * ni red ni Mongo.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.stubEnv("MONGODB_URI", "mongodb://127.0.0.1:1") // db/index.ts la exige al importarse (no conecta)
vi.stubEnv("TWITCH_CLIENT_ID", "cid")
vi.stubEnv("TWITCH_CLIENT_SECRET", "secret")
vi.stubEnv("TWITCH_CHANNEL_ID", "999")

const { twitchService } = await import("../src/services/twitchService.js")
const { accountModel } = await import("../src/models/accountModel.js")
const { userModel } = await import("../src/models/userModel.js")
const { initTokenCrypto, readToken, writeToken } = await import("../src/services/tokenCrypto.js")

type R = { status: number; body?: unknown }
interface Routes { follow: R; sub: R; user: R }

const FOLLOWS: R = { status: 200, body: { total: 101, data: [{ broadcaster_id: "999" }] } }
const NO_FOLLOW: R = { status: 200, body: { total: 101, data: [] } }
const USER_OK: R = { status: 200, body: { data: [{ id: "t1", display_name: "Nuevo", profile_image_url: "new.png" }] } }
const SUB = (tier = "1000"): R => ({ status: 200, body: { data: [{ tier }] } })
const NOT_SUB: R = { status: 404 }

let account: any
let writes: any[]
let attempts: string[]
let reauth: string[]
let tokenUpdates: any[]
let sentTokens: string[]
let refreshCalls: number
let refreshBody: string
let routes: Routes
let afterRefresh: Routes | null
let refreshed: boolean
let dbRole: string
let n = 0

const json = (r: R) => new Response(r.body === undefined ? "{}" : JSON.stringify(r.body), { status: r.status })
const user = (over: Record<string, unknown> = {}) => ({
    id: `u${++n}`, name: "Viejo", image: "old.png", twitchId: "t1",
    role: "subscriber", twitchFollowing: true, twitchSub: true, twitchSubTier: "1000", ...over,
}) as any

beforeAll(async () => {
    await initTokenCrypto({ $context: Promise.resolve({ secretConfig: "clave-de-prueba-clave-de-prueba-32" }) })
    accountModel.findTwitchAccount = async () => account
    accountModel.updateTokens = async (_id: any, tokens: any) => { tokenUpdates.push(tokens) }
    userModel.applyTwitchSync = async (_id: string, payload: any, role: string) => {
        writes.push({ ...payload, role })
        return ["admin", "mod", "vip"].includes(dbRole) ? dbRole : role
    }
    userModel.markTwitchSyncAttempt = async (id: string) => { attempts.push(id) }
    userModel.markTwitchNeedsReauth = async (id: string) => { reauth.push(id) }

    vi.stubGlobal("fetch", async (url: string, init?: any) => {
        if (url.includes("oauth2/token")) {
            refreshCalls++
            refreshBody = String(init?.body)
            await new Promise((r) => setTimeout(r, 20))
            refreshed = true
            return json({ status: 200, body: { access_token: "nuevoacceso", refresh_token: "nuevorefresh", expires_in: 3600 } })
        }
        sentTokens.push(init?.headers?.Authorization)
        const set = refreshed && afterRefresh ? afterRefresh : routes
        if (url.includes("channels/followed")) return json(set.follow)
        if (url.includes("subscriptions/user")) return json(set.sub)
        return json(set.user)
    })
})

afterAll(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

beforeEach(async () => {
    writes = []; attempts = []; reauth = []; tokenUpdates = []; sentTokens = []
    refreshCalls = 0; refreshBody = ""; refreshed = false; afterRefresh = null; dbRole = "subscriber"
    routes = { follow: FOLLOWS, sub: NOT_SUB, user: USER_OK }
    account = {
        _id: "a1", accountId: "t1",
        accessToken: await writeToken("tokenrealtwitch"),
        refreshToken: await writeToken("refreshrealtwitch"),
        scope: "user:read:email,openid,user:read:follows,user:read:subscriptions",
    }
    process.env.TWITCH_CHANNEL_ID = "999"
})

describe("follow, sub y rol", () => {
    it("sub de nivel 2 que sigue el canal", async () => {
        routes = { follow: FOLLOWS, sub: SUB("2000"), user: USER_OK }
        const r = await twitchService.syncTwitchData(user())
        expect(r.ok && r.data).toMatchObject({ twitchFollowing: true, twitchSub: true, twitchSubTier: "2000", role: "subscriber", partial: false })
        expect(writes[0].twitchSyncedAt).toBeInstanceOf(Date)
        expect(writes[0].twitchNeedsReauth).toBe(false)
        expect(writes[0].name).toBe("Nuevo")
    })

    it("404 en la suscripción: deja de ser sub y queda como seguidor", async () => {
        const r = await twitchService.syncTwitchData(user())
        expect(r.ok && r.data).toMatchObject({ twitchSub: false, twitchSubTier: null, role: "follower" })
    })

    it("sigue otros canales pero NO este: no es seguidor (antes `total > 0` decía que sí)", async () => {
        routes = { follow: NO_FOLLOW, sub: NOT_SUB, user: USER_OK }
        const r = await twitchService.syncTwitchData(user({ role: "visitor", twitchFollowing: false, twitchSub: false }))
        expect(r.ok && r.data).toMatchObject({ twitchFollowing: false, role: "visitor" })
    })

    it("admin, mod y vip no se tocan", async () => {
        routes = { follow: NO_FOLLOW, sub: NOT_SUB, user: USER_OK }
        dbRole = "admin"
        const r = await twitchService.syncTwitchData(user({ role: "admin" }))
        expect(r.ok && r.data.role).toBe("admin")
    })

    it("si en la base ya es vip (cambio a mano en mitad), devuelve vip", async () => {
        routes = { follow: NO_FOLLOW, sub: NOT_SUB, user: USER_OK }
        dbRole = "vip"
        const r = await twitchService.syncTwitchData(user({ role: "subscriber" }))
        expect(r.ok && r.data.role).toBe("vip")
    })
})

describe("errores de Twitch", () => {
    it("429 en la suscripción: se conserva el sub que tenía", async () => {
        routes = { follow: FOLLOWS, sub: { status: 429 }, user: USER_OK }
        const r = await twitchService.syncTwitchData(user())
        expect(r.ok && r.data).toMatchObject({ twitchSub: true, twitchSubTier: "1000", partial: true })
    })

    it("fallan follow y sub: error, no se escribe nada y queda el intento", async () => {
        routes = { follow: { status: 500 }, sub: { status: 503 }, user: { status: 500 } }
        const u = user()
        const r = await twitchService.syncTwitchData(u)
        expect(!r.ok && r.error.code).toBe("FOLLOW_CHECK_FAILED")
        expect(writes).toHaveLength(0)
        expect(attempts).toEqual([u.id])
        expect(twitchService.isStale({ ...u, twitchSyncedAt: null })).toBe(false) // no reintenta enseguida
    })

    it.each(["0", "", "mr_casemuro"])("TWITCH_CHANNEL_ID=%j: MISSING_CHANNEL_ID sin consultar", async (bad) => {
        process.env.TWITCH_CHANNEL_ID = bad
        const r = await twitchService.syncTwitchData(user())
        expect(!r.ok && r.error.code).toBe("MISSING_CHANNEL_ID")
        expect(sentTokens).toHaveLength(0)
    })
})

describe("tokens", () => {
    it("el token cifrado de la base llega descifrado a Twitch", async () => {
        await twitchService.syncTwitchData(user())
        expect(sentTokens.every((h) => h === "Bearer tokenrealtwitch")).toBe(true)
    })

    it("un token antiguo en claro se usa tal cual", async () => {
        account.accessToken = "tokenrealtwitch"
        const r = await twitchService.syncTwitchData(user())
        expect(r.ok).toBe(true)
        expect(sentTokens.every((h) => h === "Bearer tokenrealtwitch")).toBe(true)
    })

    it("token caducado: renueva una vez y guarda los nuevos cifrados", async () => {
        routes = { follow: { status: 401 }, sub: { status: 401 }, user: { status: 401 } }
        afterRefresh = { follow: NO_FOLLOW, sub: NOT_SUB, user: USER_OK }
        const r = await twitchService.syncTwitchData(user({ role: "visitor" }))
        expect(r.ok).toBe(true)
        expect(refreshCalls).toBe(1)
        expect(refreshBody).toContain("refresh_token=refreshrealtwitch")
        expect(tokenUpdates[0].accessToken).not.toBe("nuevoacceso")
        expect(await readToken(tokenUpdates[0].accessToken)).toBe("nuevoacceso")
        expect(await readToken(tokenUpdates[0].refreshToken)).toBe("nuevorefresh")
    })

    it("sigue dando 401 tras renovar: pide reconectar", async () => {
        routes = { follow: { status: 401 }, sub: { status: 401 }, user: { status: 401 } }
        afterRefresh = routes
        const u = user()
        const r = await twitchService.syncTwitchData(u)
        expect(!r.ok && r.error.code).toBe("TOKEN_EXPIRED")
        expect(reauth).toContain(u.id)
    })

    it("token sin los permisos de follows/subs: pide reconectar sin llamar a Twitch", async () => {
        account.scope = "user:read:email,openid"
        const r = await twitchService.syncTwitchData(user())
        expect(!r.ok && r.error.code).toBe("TOKEN_EXPIRED")
        expect(sentTokens).toHaveLength(0)
    })

    it("token ilegible (cifrado con otra clave): pide reconectar sin romper", async () => {
        account.accessToken = "ab".repeat(40)
        const r = await twitchService.syncTwitchData(user())
        expect(!r.ok && r.error.code).toBe("TOKEN_EXPIRED")
        expect(reauth).toHaveLength(1)
    })
})

describe("concurrencia y frecuencia", () => {
    it("dos sincronizaciones a la vez del mismo usuario se comparten (un solo refresh)", async () => {
        routes = { follow: { status: 401 }, sub: { status: 401 }, user: { status: 401 } }
        afterRefresh = { follow: FOLLOWS, sub: NOT_SUB, user: USER_OK }
        const u = user()
        const [a, b] = await Promise.all([twitchService.syncTwitchData(u), twitchService.syncTwitchData(u)])
        expect(a).toBe(b)
        expect(refreshCalls).toBe(1)
        expect(writes).toHaveLength(1)
    })

    it("a mano: la segunda seguida da TOO_SOON", async () => {
        const u = user()
        const first = await twitchService.syncTwitchDataManual(u)
        const second = await twitchService.syncTwitchDataManual(u)
        expect(first.ok).toBe(true)
        expect(!second.ok && second.error.code).toBe("TOO_SOON")
    })

    it("isStale: cuándo toca refrescar en segundo plano", () => {
        const now = Date.now()
        const h = 3600e3
        expect(twitchService.isStale({ twitchId: "t1" })).toBe(true)
        expect(twitchService.isStale({ twitchId: "t1", twitchSyncedAt: new Date(now - h) })).toBe(false)
        expect(twitchService.isStale({ twitchId: "t1", twitchSyncedAt: new Date(now - 7 * h), twitchSyncAttemptAt: new Date(now - h) })).toBe(true)
        expect(twitchService.isStale({ twitchId: "t1", twitchSyncedAt: new Date(now - 7 * h), twitchSyncAttemptAt: new Date(now - 120e3) })).toBe(false)
        expect(twitchService.isStale({ twitchId: "t1", twitchNeedsReauth: true })).toBe(false)
    })
})
