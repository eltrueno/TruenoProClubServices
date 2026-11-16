/**
 * Logros de cuenta contra un Mongo en memoria: el resumen de cada club en la base compartida,
 * las métricas entre clubes y de la cuenta, y que solo se dan (nunca se quitan) a cuentas
 * vinculadas. El auth se sustituye por una función.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"
import { ACCOUNT_ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_METRICS, rarityFromPoints } from "@trueno-proclub-services/shared"
import {
    AccountAchievementUnlockedModel, AchievementDefinitionModel, AchievementProgressModel, AchievementUnlockedModel,
    PlayerClubTotalsModel, PlayerIdentityModel, PlayerStatsFriendlyModel, PlayerStatsOfficialModel
} from "@trueno-proclub-services/shared/models"

const mongod = await MongoMemoryServer.create()
const { accountMetrics, evaluateAccountAchievements, refreshClubTotals } = await import("../src/services/accountAchievement.service.js")
type AccountInfo = import("../src/services/accountAchievement.service.js").AccountInfo

const NOW = new Date("2027-06-01T12:00:00Z")
const club = (o: Record<string, unknown> = {}) => ({ gamesPlayed: 0, wins: 0, goals: 0, assists: 0, lastDay: null, achievements: 0, points: 0, ...o })
const auth = (accounts: AccountInfo[]) => async () => new Map(accounts.map((a) => [a.id, a]))
const unlocked = async (userId: string) =>
    (await AccountAchievementUnlockedModel.find({ userId }).lean()).map((u) => u.achievementId + (u.reached ? `@${u.reached}` : "")).sort()

beforeAll(async () => {
    await mongoose.connect(mongod.getUri(), { dbName: "workeraccounttest" })
    await Promise.all([PlayerClubTotalsModel.syncIndexes(), AccountAchievementUnlockedModel.syncIndexes(), PlayerIdentityModel.syncIndexes()])
})
beforeEach(async () => {
    await Promise.all([
        PlayerClubTotalsModel.deleteMany({}), AccountAchievementUnlockedModel.deleteMany({}), PlayerIdentityModel.deleteMany({}),
        AchievementDefinitionModel.deleteMany({}), AchievementUnlockedModel.deleteMany({}), AchievementProgressModel.deleteMany({}),
        PlayerStatsOfficialModel.deleteMany({}), PlayerStatsFriendlyModel.deleteMany({}),
    ])
})
afterAll(async () => {
    await mongoose.disconnect()
    await mongod.stop()
})

describe("definiciones de cuenta", () => {
    it("son coherentes y no chocan con las de club", () => {
        const ids = [...ACCOUNT_ACHIEVEMENT_DEFINITIONS, ...ACHIEVEMENT_DEFINITIONS].map((d) => d._id)
        expect(new Set(ids).size).toBe(ids.length)
        for (const d of ACCOUNT_ACHIEVEMENT_DEFINITIONS) {
            expect(d.type, d._id).toBe("account")
            expect(d.scope, d._id).toBe("cumulative")
            expect(d.rarity, d._id).toBe(rarityFromPoints(d.points))
            expect(ACHIEVEMENT_METRICS, d._id).toContain(d.metric)
            expect(["account", "global", "collection"], d._id).toContain(d.category)
        }
    })

    it("todas las métricas que usan las calcula accountMetrics", () => {
        const metrics = accountMetrics({ id: "u" }, [club()], NOW)
        for (const d of ACCOUNT_ACHIEVEMENT_DEFINITIONS) expect(metrics, d._id).toHaveProperty(d.metric)
    })
})

describe("accountMetrics", () => {
    it("suma entre clubes y mira el segundo club para los 'en cada uno de dos'", () => {
        const m = accountMetrics(null, [
            club({ gamesPlayed: 120, wins: 60, goals: 150, assists: 30, lastDay: "2027-05-30", achievements: 20, points: 300 }),
            club({ gamesPlayed: 55, wins: 20, goals: 0, assists: 5, lastDay: "2027-05-30", achievements: 8, points: 250 }),
            club(), // dado de alta en un tercer club pero sin jugar
        ], NOW)
        expect(m).toMatchObject({
            playerLinked: 1, clubsPlayed: 2, minGamesPerClub: 55, clubsScored: 1, minGoalsPerClub: 0, sameDayClubs: 2,
            totalGamesPlayed: 175, totalGoalsScored: 150, totalAssists: 35, totalWins: 80, clubAchievements: 28, clubPoints: 550,
        })
        // Sin datos del auth, las de la cuenta ni se afirman ni se niegan
        expect(m).not.toHaveProperty("twitchSub")
        expect(m).not.toHaveProperty("discordLinked")
    })

    it("con un solo club no hay 'dos clubes' ni 'mismo día'", () => {
        expect(accountMetrics(null, [club({ gamesPlayed: 300, goals: 200, lastDay: "2027-05-30" })], NOW))
            .toMatchObject({ clubsPlayed: 1, minGamesPerClub: 0, minGoalsPerClub: 0, sameDayClubs: 1 })
        expect(accountMetrics(null, [], NOW)).toMatchObject({ clubsPlayed: 0, sameDayClubs: 0, totalGamesPlayed: 0 })
    })

    it("datos de la cuenta: sub, nivel, pack completo y antigüedad", () => {
        const base = { id: "u", twitchFollowing: true, twitchSub: true, twitchSubTier: "1000", discordId: "9", createdAt: "2026-05-31T12:00:00Z" }
        expect(accountMetrics(base, [], NOW)).toMatchObject({ discordLinked: 1, twitchFollower: 1, twitchSub: 1, twitchSubHighTier: 0, fullPack: 1, accountAgeDays: 366 })
        expect(accountMetrics({ ...base, twitchSubTier: "3000", discordId: null }, [], NOW)).toMatchObject({ twitchSubHighTier: 1, discordLinked: 0, fullPack: 0 })
        // Nivel alto guardado de una sub que ya no está activa: no cuenta
        expect(accountMetrics({ ...base, twitchSub: false, twitchSubTier: "3000" }, [], NOW)).toMatchObject({ twitchSub: 0, twitchSubHighTier: 0 })
        expect(accountMetrics({ id: "u" }, [], NOW)).toMatchObject({ accountAgeDays: 0, twitchSub: 0 })
    })
})

describe("refreshClubTotals", () => {
    it("resume a los jugadores de este club (oficial + amistoso, logros y puntos) sin tocar a los de otro", async () => {
        await PlayerStatsOfficialModel.collection.insertMany([
            { playerId: "p1", position: "forward", gamesPlayed: 10, wins: 6, goals: 12, assists: 3 },
            { playerId: "p1", position: "midfielder", gamesPlayed: 5, wins: 2, goals: 1, assists: 4 },
        ])
        await PlayerStatsFriendlyModel.collection.insertMany([{ playerId: "p1", position: "forward", gamesPlayed: 4, wins: 1, goals: 2, assists: 0 }])
        await AchievementDefinitionModel.collection.insertMany([{ _id: "a", points: 5 }, { _id: "m", points: 10 }] as any[])
        await AchievementUnlockedModel.collection.insertMany([
            { playerId: "p1", achievementId: "a" }, { playerId: "p1", achievementId: "m", reached: 25 }, { playerId: "p1", achievementId: "m", reached: 50 },
        ])
        await AchievementProgressModel.collection.insertOne({ playerId: "p1", day: "2027-05-30" })
        // Lo de otro club no se toca; lo de este club que ya no existe, se borra
        await PlayerClubTotalsModel.collection.insertMany([
            { playerId: "p1", clubId: 2, gamesPlayed: 99 }, { playerId: "viejo", clubId: 1, gamesPlayed: 3 },
        ])

        expect(await refreshClubTotals(1)).toBe(1)

        expect(await PlayerClubTotalsModel.findOne({ playerId: "p1", clubId: 1 }).lean()).toMatchObject({
            gamesPlayed: 19, wins: 9, goals: 15, assists: 7, lastDay: "2027-05-30", achievements: 3, points: 25,
        })
        expect((await PlayerClubTotalsModel.findOne({ playerId: "p1", clubId: 2 }).lean())?.gamesPlayed).toBe(99)
        expect(await PlayerClubTotalsModel.exists({ playerId: "viejo" })).toBeNull()
    })
})

describe("evaluateAccountAchievements", () => {
    beforeEach(async () => {
        await PlayerIdentityModel.collection.insertMany([
            { playerId: "p1", userId: "u1", imageUrl: null },
            { playerId: "p2", userId: null, imageUrl: null },      // sin cuenta: no recibe nada
            { playerId: "p3", userId: "borrada", imageUrl: null }, // el auth ya no la conoce
        ])
        await PlayerClubTotalsModel.collection.insertMany([
            { playerId: "p1", clubId: 1, gamesPlayed: 180, wins: 90, goals: 210, assists: 20, lastDay: "2027-05-30", achievements: 20, points: 400 },
            { playerId: "p1", clubId: 2, gamesPlayed: 60, wins: 20, goals: 3, assists: 1, lastDay: "2027-05-29", achievements: 6, points: 150 },
            { playerId: "p2", clubId: 1, gamesPlayed: 900, wins: 500, goals: 900, assists: 900, lastDay: null, achievements: 90, points: 3000 },
            { playerId: "p3", clubId: 1, gamesPlayed: 900, wins: 500, goals: 900, assists: 900, lastDay: null, achievements: 90, points: 3000 },
        ])
    })

    it("al vincularse recibe de golpe todo lo que ya cumple, con un hito por escalón", async () => {
        const count = await evaluateAccountAchievements(auth([{ id: "u1", twitchFollowing: true, twitchSub: false, discordId: null, createdAt: "2027-05-01T00:00:00Z" }]), NOW)

        expect(await unlocked("u1")).toEqual([
            "account_follower", "account_playerLinked",
            "collection_10", "collection_25", "collection_points_milestone@500",
            "global_2clubs", "global_50each",
            "global_games_milestone@100", "global_games_milestone@200", "global_goals_milestone@100", "global_goals_milestone@200", "global_scored2clubs",
            "global_wins_milestone@100",
        ].sort())
        expect(count).toBe(13)
        expect(await unlocked("borrada")).toEqual([])
        expect(await AccountAchievementUnlockedModel.countDocuments({ playerId: "p2" })).toBe(0)

        const one = await AccountAchievementUnlockedModel.findOne({ userId: "u1", achievementId: "account_playerLinked" }).lean()
        expect(one).toMatchObject({ playerId: "p1" })
        expect(new Date(one!.unlockedAt).getTime()).toBe(NOW.getTime())
    })

    it("repetirlo no duplica, y lo ganado no se pierde aunque deje de cumplirse", async () => {
        const sub = { id: "u1", twitchFollowing: true, twitchSub: true, twitchSubTier: "2000", discordId: "9" }
        await evaluateAccountAchievements(auth([sub]), NOW)
        expect(await evaluateAccountAchievements(auth([sub]), NOW)).toBe(0)
        const before = await unlocked("u1")
        expect(before).toEqual(expect.arrayContaining(["account_sub", "account_subHighTier", "account_fullPack", "account_discordLinked"]))

        // Deja de ser sub, desconecta Discord y deja de seguir: conserva todo
        expect(await evaluateAccountAchievements(auth([{ id: "u1", twitchFollowing: false, twitchSub: false, discordId: null }]), NOW)).toBe(0)
        expect(await unlocked("u1")).toEqual(before)

        // Y si se desvincula del jugador, también (ya no se le evalúa, pero no se borra nada)
        await PlayerIdentityModel.updateOne({ playerId: "p1" }, { $set: { userId: null } })
        expect(await evaluateAccountAchievements(auth([]), NOW)).toBe(0)
        expect(await unlocked("u1")).toEqual(before)
    })

    it("si el auth no responde, da solo los de juego y no afirma nada de la cuenta", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => undefined)
        await evaluateAccountAchievements(async () => null, NOW)
        const got = await unlocked("u1")
        expect(got).toEqual(expect.arrayContaining(["account_playerLinked", "global_2clubs"]))
        expect(got.some((id) => ["account_follower", "account_sub", "account_discordLinked", "account_age365"].includes(id))).toBe(false)
        // Sin saber si la cuenta "borrada" existe, se le evalúa lo de juego igualmente
        expect(await unlocked("borrada")).toContain("global_500games")
    })
})
