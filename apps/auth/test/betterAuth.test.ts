/**
 * Con Better Auth de verdad (createAuth de packages/auth) y un Mongo en memoria:
 * los hooks de inicio y lectura de sesión, el cifrado de tokens y el login de desarrollo.
 */
import { createHmac } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { MongoMemoryServer } from "mongodb-memory-server"
import { MongoClient } from "mongodb"
import { symmetricEncrypt } from "better-auth/crypto"

const mongod = await MongoMemoryServer.create()
process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret"
process.env.BETTER_AUTH_URL = "http://localhost:4000"
process.env.DEVMODE = "true"
process.env.TWITCH_CLIENT_ID = "test-client" // si no, Better Auth avisa de que faltan credenciales
process.env.TWITCH_CLIENT_SECRET = "test-secret"
process.env.ALLOWED_ORIGINS = "http://localhost:4323, http://localhost:4321" // con espacio a propósito

const { createAuth } = await import("@trueno-proclub-services/auth")
const { initTokenCrypto, readToken } = await import("../src/services/tokenCrypto.js")

const client = new MongoClient(mongod.getUri())
const signIns: any[] = []
const reads: any[] = []
let auth: ReturnType<typeof createAuth>
let ctx: any

beforeAll(async () => {
    await client.connect()
    auth = createAuth(client.db("authtest"), {
        onSignIn: (u: any) => { signIns.push(u) },
        onSessionRead: (u: any) => { reads.push(u) },
    })
    ctx = await auth.$context
})
afterAll(async () => {
    await client.close()
    await mongod.stop()
})

const sessionCookie = (token: string) => {
    const sig = createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(token).digest("base64")
    return `better-auth.session_token=${encodeURIComponent(`${token}.${sig}`)}`
}

describe("hooks de sesión", () => {
    it("onSignIn salta al crear la sesión y onSessionRead al leerla", async () => {
        const user = await ctx.internalAdapter.createUser({ name: "Prueba", email: "p@x.test", emailVerified: true })
        const session = await ctx.internalAdapter.createSession(user.id)
        await new Promise((r) => setTimeout(r, 50))
        expect(signIns.at(-1)?.id).toBe(user.id)

        const res = await auth.handler(new Request("http://localhost:4000/api/auth/get-session", { headers: { cookie: sessionCookie(session.token) } }))
        const body = await res.json()
        expect(body.user.id).toBe(user.id)
        expect(reads.at(-1)?.id).toBe(user.id)
        expect("twitchNeedsReauth" in body.user).toBe(true)
    })

    it("otras rutas no disparan onSessionRead", async () => {
        const before = reads.length
        const res = await auth.handler(new Request("http://localhost:4000/api/auth/ok"))
        expect(res.ok).toBe(true)
        expect(reads.length).toBe(before)
    })
})

describe("configuración", () => {
    it("ALLOWED_ORIGINS admite espacios tras las comas", () => {
        const trusted: string[] = ctx.trustedOrigins ?? ctx.options.trustedOrigins
        expect(trusted).toContain("http://localhost:4321")
        expect(trusted.some((o) => o.startsWith(" "))).toBe(false)
    })

    it("los tokens OAuth se guardan cifrados", () => {
        expect(ctx.options.account?.encryptOAuthTokens).toBe(true)
    })

    it("apps/auth lee bien un token cifrado por Better Auth con su clave", async () => {
        await initTokenCrypto(auth as any)
        const encrypted = await symmetricEncrypt({ key: ctx.secretConfig, data: "tokendebetterauth" })
        expect(await readToken(encrypted)).toBe("tokendebetterauth")
    })
})
