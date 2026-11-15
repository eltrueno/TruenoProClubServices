/**
 * discordService contra un Mongo en memoria: completar la vinculación (nombre de usuario,
 * con Discord simulado) y desvincular.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { MongoMemoryServer } from "mongodb-memory-server"
import { ObjectId } from "mongodb"

const mongod = await MongoMemoryServer.create()
process.env.MONGODB_URI = mongod.getUri()
process.env.DBNAME = "authdiscordtest"

const { connectToDatabase, db } = await import("../src/db/index.js")
const { discordService } = await import("../src/services/discordService.js")

const users = () => db.collection("user")
const accounts = () => db.collection("account")
const addUser = async (doc: Record<string, unknown>) =>
    (await users().insertOne({ name: "x", email: `${Math.random()}@x.test`, ...doc })).insertedId
const get = (_id: ObjectId) => users().findOne({ _id })

beforeAll(async () => { await connectToDatabase() })
afterEach(() => vi.restoreAllMocks())
afterAll(async () => { await mongod.stop() })

describe("completeLink", () => {
    it("guarda el nombre de usuario de Discord con el token de la cuenta", async () => {
        const _id = await addUser({ discordId: "111" })
        const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify({ id: "111", username: "pepe.gg", global_name: "Pepe" }), { status: 200 }))

        // Token en claro: readToken lo deja tal cual (los cifrados se prueban en betterAuth.test)
        await discordService.completeLink(_id.toString(), { accountId: "111", accessToken: "Token-En-Claro" })

        expect(fetchMock.mock.calls[0][0]).toBe("https://discord.com/api/users/@me")
        expect((fetchMock.mock.calls[0][1] as any).headers.authorization).toBe("Bearer Token-En-Claro")
        expect(await get(_id)).toMatchObject({ discordId: "111", discordName: "pepe.gg" })
    })

    it("si Discord falla o ya se ha desvinculado, no toca nada", async () => {
        const _id = await addUser({ discordId: "222" })
        vi.spyOn(console, "warn").mockImplementation(() => undefined)
        vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("no", { status: 401 }))
        await discordService.completeLink(_id.toString(), { accountId: "222", accessToken: "Token-En-Claro" })
        expect((await get(_id))?.discordName).toBeUndefined()

        // Desvinculada (o cambiada por otra) mientras se pedía el nombre
        await users().updateOne({ _id }, { $set: { discordId: null } })
        vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "222", username: "tarde" }), { status: 200 }))
        await discordService.completeLink(_id.toString(), { accountId: "222", accessToken: "Token-En-Claro" })
        expect((await get(_id))?.discordName).toBeUndefined()
    })
})

describe("unlink", () => {
    it("borra la cuenta de Discord y limpia el usuario, sin tocar Twitch ni a otros", async () => {
        const _id = await addUser({ discordId: "333", discordName: "ana", twitchId: "t1" })
        const other = await addUser({ discordId: "444", discordName: "otro" })
        await accounts().insertMany([
            { userId: _id, providerId: "discord", accountId: "333", accessToken: "a" },
            { userId: _id, providerId: "twitch", accountId: "t1", accessToken: "b" },
            { userId: other, providerId: "discord", accountId: "444", accessToken: "c" },
        ])

        expect(await discordService.unlink(_id.toString())).toBe(true)

        expect(await get(_id)).toMatchObject({ discordId: null, discordName: null, twitchId: "t1" })
        expect(await accounts().find({ userId: _id }).toArray()).toMatchObject([{ providerId: "twitch" }])
        expect(await get(other)).toMatchObject({ discordId: "444" })
        expect(await accounts().countDocuments({ userId: other })).toBe(1)

        // Ya no hay nada que desvincular
        expect(await discordService.unlink(_id.toString())).toBe(false)
    })
})
