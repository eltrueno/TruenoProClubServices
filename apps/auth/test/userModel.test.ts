/**
 * userModel contra un Mongo real (en memoria): el rol con condición y el orden del
 * repaso periódico de Twitch.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { MongoMemoryServer } from "mongodb-memory-server"
import { ObjectId } from "mongodb"

const mongod = await MongoMemoryServer.create()
process.env.MONGODB_URI = mongod.getUri()
process.env.DBNAME = "authtest"

const { connectToDatabase, db } = await import("../src/db/index.js")
const { userModel } = await import("../src/models/userModel.js")

const users = () => db.collection("user")
const add = async (doc: Record<string, unknown>) =>
    (await users().insertOne({ name: "x", email: `${Math.random()}@x.test`, ...doc })).insertedId.toString()
const get = (id: string) => users().findOne({ _id: new ObjectId(id) })

beforeAll(async () => { await connectToDatabase() })
afterAll(async () => { await mongod.stop() })

describe("applyTwitchSync", () => {
    it("actualiza el rol normal", async () => {
        const id = await add({ role: "follower", twitchId: "1" })
        expect(await userModel.applyTwitchSync(id, { twitchSub: true } as any, "subscriber")).toBe("subscriber")
        expect(await get(id)).toMatchObject({ role: "subscriber", twitchSub: true })
    })

    it("no pisa un rol puesto a mano en mitad de la sincronización, pero sí guarda lo de Twitch", async () => {
        const id = await add({ role: "subscriber", twitchId: "2" })
        await users().updateOne({ _id: new ObjectId(id) }, { $set: { role: "vip" } }) // un admin, a mitad
        expect(await userModel.applyTwitchSync(id, { twitchSub: false, twitchFollowing: false } as any, "visitor")).toBe("vip")
        expect(await get(id)).toMatchObject({ role: "vip", twitchSub: false, twitchFollowing: false })
    })
})

describe("findTwitchSyncDue (repaso periódico)", () => {
    it("elige los que tocan, en orden, y respeta el freno de reintentos", async () => {
        await users().deleteMany({})
        const now = Date.now()
        const h = 3600e3
        const nunca = await add({ twitchId: "3" })
        const viejo = await add({ twitchId: "4", twitchSyncedAt: new Date(now - 10 * h), twitchSyncAttemptAt: new Date(now - 10 * h) })
        const fallaSiempre = await add({ twitchId: "5", twitchSyncedAt: new Date(now - 48 * h), twitchSyncAttemptAt: new Date(now - 120e3) })
        const reciente = await add({ twitchId: "6", twitchSyncedAt: new Date(now - h) })
        const reauth = await add({ twitchId: "7", twitchNeedsReauth: true })
        const sinTwitch = await add({})

        const due = (await userModel.findTwitchSyncDue(new Date(now - 6 * h), new Date(now - 10 * 60e3), 10)).map((u: any) => u.id)
        expect(due).toContain(nunca)
        expect(due).toContain(viejo)
        expect(due.indexOf(nunca)).toBeLessThan(due.indexOf(viejo))
        expect(due).not.toContain(fallaSiempre)
        expect(due).not.toContain(reciente)
        expect(due).not.toContain(reauth)
        expect(due).not.toContain(sinTwitch)
    })

    it("markTwitchNeedsReauth marca la cuenta y registra el intento", async () => {
        const id = await add({ twitchId: "8" })
        await userModel.markTwitchNeedsReauth(id, new Date())
        const doc = await get(id)
        expect(doc?.twitchNeedsReauth).toBe(true)
        expect(doc?.twitchSyncAttemptAt).toBeInstanceOf(Date)
    })
})
