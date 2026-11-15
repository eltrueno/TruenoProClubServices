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
process.env.DISCORD_CLIENT_ID = "discord-client"
process.env.DISCORD_CLIENT_SECRET = "discord-secret"
process.env.ALLOWED_ORIGINS = "http://localhost:4323, http://localhost:4321" // con espacio a propósito

const { createAuth } = await import("@trueno-proclub-services/auth")
const { initTokenCrypto, readToken } = await import("../src/services/tokenCrypto.js")

const client = new MongoClient(mongod.getUri())
const signIns: any[] = []
const reads: any[] = []
const discordLinks: any[] = []
let auth: ReturnType<typeof createAuth>
let ctx: any

beforeAll(async () => {
    await client.connect()
    auth = createAuth(client.db("authtest"), {
        onSignIn: (u: any) => { signIns.push(u) },
        onSessionRead: (u: any) => { reads.push(u) },
        onDiscordLinked: (userId: string, account: any) => { discordLinks.push({ userId, account }) },
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

describe("Discord vinculado a la cuenta", () => {
    const post = (path: string, body: unknown, cookie?: string) =>
        auth.handler(new Request(`http://localhost:4000/api/auth${path}`, {
            method: "POST",
            headers: { "content-type": "application/json", origin: "http://localhost:4323", ...(cookie ? { cookie } : {}) },
            body: JSON.stringify(body),
        }))

    it("al crear la cuenta de Discord se guarda discordId en el usuario y se avisa", async () => {
        const user = await ctx.internalAdapter.createUser({ name: "ConDiscord", email: "d@x.test", emailVerified: true })
        await ctx.internalAdapter.createAccount({ userId: user.id, providerId: "discord", accountId: "123456789012345678", accessToken: "tok" })
        await new Promise((r) => setTimeout(r, 50))

        const stored = await client.db("authtest").collection("user").findOne({ email: "d@x.test" })
        expect(stored?.discordId).toBe("123456789012345678")
        expect(discordLinks.at(-1)).toMatchObject({ userId: user.id, account: { accountId: "123456789012345678" } })
    })

    it("se puede vincular con otro email (y sin email), pero solo Discord", async () => {
        expect(ctx.options.account?.accountLinking).toMatchObject({ enabled: true, allowDifferentEmails: true, trustedProviders: ["discord"] })
        const user = await ctx.internalAdapter.createUser({ name: "Vincula", email: "v@x.test", emailVerified: true })
        const session = await ctx.internalAdapter.createSession(user.id)
        const cookie = sessionCookie(session.token)

        const link = await post("/link-social", { provider: "discord", callbackURL: "http://localhost:4323/" }, cookie)
        expect(link.status).toBe(200)
        const url = new URL((await link.json()).url)
        expect(url.origin + url.pathname).toBe("https://discord.com/api/oauth2/authorize")
        // Solo `identify`: sin email no se puede crear ni abrir una cuenta con Discord
        expect(url.searchParams.get("scope")).toBe("identify")
        expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:4000/api/auth/callback/discord")

        expect((await post("/link-social", { provider: "twitch", callbackURL: "http://localhost:4323/" }, cookie)).status).toBe(403)
    })

    it("no se entra con Discord ni se desvincula nada por Better Auth", async () => {
        expect((await post("/sign-in/social", { provider: "discord", callbackURL: "http://localhost:4323/" })).status).toBe(403)

        const user = await ctx.internalAdapter.createUser({ name: "NoSuelta", email: "n@x.test", emailVerified: true })
        const session = await ctx.internalAdapter.createSession(user.id)
        const res = await post("/unlink-account", { providerId: "twitch" }, sessionCookie(session.token))
        expect(res.status).toBe(403)
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
