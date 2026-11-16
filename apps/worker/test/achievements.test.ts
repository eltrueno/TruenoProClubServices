/**
 * Logros de club contra un Mongo en memoria: oficiales y amistosos suman juntos, los hitos
 * dan un desbloqueo por escalón, y al cambiar las definiciones se rehace lo desbloqueado.
 * Todo en silencio (sin RabbitMQ).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"
import { ACHIEVEMENT_DEFINITIONS, type IMatch } from "@trueno-proclub-services/shared"
import {
    AchievementDefinitionModel, AchievementUnlockedModel, MatchModel, MemberTotwAppearancesModel,
    PlayerStatsFriendlyModel, PlayerStatsOfficialModel
} from "@trueno-proclub-services/shared/models"

const mongod = await MongoMemoryServer.create()
const { syncAchievementDefinitions, recalculateAllTOTWAchievements } = await import("../src/services/achievement.service.js")
const { accumulateStatsFromMatch, recalculateAllPlayerStats } = await import("../src/services/playerStats.service.js")

const CLUB = 1
let nextMatchId = 1

/** Partido nuestro (local) con un jugador, lo justo para que sume stats */
const match = (matchType: "league" | "friendly", player: Record<string, unknown>, extra: Record<string, unknown> = {}): IMatch => {
    const matchId = nextMatchId++
    return {
        matchId,
        timestamp: 1_800_000_000 + matchId * 3600,
        matchType,
        result: "win",
        localTeam: true,
        localClub: {
            id: CLUB,
            players: [{ playerId: "p1", playerName: "Uno", position: "forward", secondsPlayed: 5400, rating: 7, goals: 0, assists: 0, shots: 0, passesMade: 0, passesSuccess: 0, ...player }],
        },
        awayClub: { id: 2, players: [] },
        ...extra,
    } as unknown as IMatch
}

const unlocked = async (playerId = "p1") =>
    (await AchievementUnlockedModel.find({ playerId }).lean()).map((u) => u.achievementId + (u.reached ? `@${u.reached}` : "")).sort()

beforeAll(async () => {
    await mongoose.connect(mongod.getUri(), { dbName: "workertest" })
})
beforeEach(async () => {
    await Promise.all([
        AchievementDefinitionModel.deleteMany({}), AchievementUnlockedModel.deleteMany({}), MatchModel.deleteMany({}),
        PlayerStatsOfficialModel.deleteMany({}), PlayerStatsFriendlyModel.deleteMany({}), MemberTotwAppearancesModel.deleteMany({}),
    ])
})
afterAll(async () => {
    await mongoose.disconnect()
    await mongod.stop()
})

describe("definiciones", () => {
    it("todas son de club, con puntos, e ids únicos", () => {
        expect(new Set(ACHIEVEMENT_DEFINITIONS.map((d) => d._id)).size).toBe(ACHIEVEMENT_DEFINITIONS.length)
        for (const d of ACHIEVEMENT_DEFINITIONS) {
            expect(d.type, d._id).toBe("club")
            expect(d.points, d._id).toBeGreaterThan(0)
            if (d.mode === "infinite") expect(d.step, d._id).toBeGreaterThan(0)
            else expect(d.threshold !== undefined || d.exact !== undefined, d._id).toBe(true)
        }
    })

    it("la primera vez no pide rehacer; si desaparece o cambia un logro, sí", async () => {
        expect(await syncAchievementDefinitions()).toBe(false)
        expect(await AchievementDefinitionModel.countDocuments()).toBe(ACHIEVEMENT_DEFINITIONS.length)
        expect(await syncAchievementDefinitions()).toBe(false)

        // Una definición antigua que ya no está en el repo: se borra y hay que rehacer
        await AchievementDefinitionModel.collection.insertOne({ _id: "goals_milestone_official", name: "Goles", category: "goals", scope: "cumulative", type: "official", mode: "infinite", step: 25 } as any)
        expect(await syncAchievementDefinitions()).toBe(true)
        expect(await AchievementDefinitionModel.exists({ _id: "goals_milestone_official" })).toBeNull()

        // Le cambian las condiciones a una que sigue existiendo
        await AchievementDefinitionModel.updateOne({ _id: "goals_milestone" }, { $set: { step: 999 } })
        expect(await syncAchievementDefinitions()).toBe(true)
        expect((await AchievementDefinitionModel.findById("goals_milestone").lean())?.step).toBe(25)

        // Cambiar solo el texto o los puntos no obliga a rehacer nada
        await AchievementDefinitionModel.updateOne({ _id: "goals_milestone" }, { $set: { name: "Otro nombre", points: 1 } })
        expect(await syncAchievementDefinitions()).toBe(false)
        expect((await AchievementDefinitionModel.findById("goals_milestone").lean())?.name).toBe("Goles")
    })
})

describe("logros por partido", () => {
    beforeEach(async () => { await syncAchievementDefinitions() })

    it("oficiales y amistosos suman juntos", async () => {
        // 13 goles en liga + 12 en amistosos = 25: el hito de goles salta en el amistoso
        await accumulateStatsFromMatch(match("league", { goals: 13, shots: 13 }), CLUB, false, true)
        expect(await unlocked()).not.toContain("goals_milestone@25")
        await accumulateStatsFromMatch(match("friendly", { goals: 12, shots: 12 }), CLUB, false, true)

        const got = await unlocked()
        expect(got).toContain("goals_milestone@25")
        expect(got).toContain("1match_achievement")
        expect(got).toContain("1goal_achievement")
        expect(got).toContain("manita_achievement") // 5 o más en un partido
        expect(got).toContain("1win_achievement")
        // Los pókers (4 o más) son hito de 1 en 1: dos partidos, dos hitos
        expect(got).toEqual(expect.arrayContaining(["pokers_milestone@1", "pokers_milestone@2"]))
    })

    it("un logro de un partido se desbloquea con la fecha y el id de ese partido, y solo una vez", async () => {
        const m = match("friendly", { rating: 10, passesMade: 20, passesSuccess: 20 })
        await accumulateStatsFromMatch(m, CLUB, false, true)
        await accumulateStatsFromMatch(match("league", { rating: 10 }), CLUB, false, true)

        const perfect = await AchievementUnlockedModel.find({ playerId: "p1", achievementId: "rating10_achievement" }).lean()
        expect(perfect).toHaveLength(1)
        expect(perfect[0].matchId).toBe(String(m.matchId))
        expect(new Date(perfect[0].unlockedAt).getTime()).toBe(m.timestamp * 1000)
        expect(await unlocked()).toContain("perfectPassing_achievement")
    })

    it("un partido nulo o con menos de 15' no desbloquea nada", async () => {
        await accumulateStatsFromMatch(match("league", { goals: 5 }, { voided: true }), CLUB, false, true)
        await accumulateStatsFromMatch(match("league", { goals: 5, secondsPlayed: 600 }), CLUB, false, true)
        expect(await unlocked()).toEqual([])
    })
})

describe("recálculo completo", () => {
    it("rehace los logros desde el historial y quita los que sobran", async () => {
        await syncAchievementDefinitions()
        await MatchModel.collection.insertMany([
            match("league", { goals: 1, shots: 1 }),
            match("friendly", { goals: 0, redCards: 1 }),
        ] as any[])
        // Un desbloqueo de un logro que ya no existe y otro que no le corresponde
        await AchievementUnlockedModel.collection.insertMany([
            { playerId: "p1", playerName: "Uno", achievementId: "goals_milestone_official", reached: 25, unlockedAt: new Date() },
            { playerId: "p1", playerName: "Uno", achievementId: "100goal_achievement", unlockedAt: new Date() },
        ] as any[])

        await recalculateAllPlayerStats(CLUB)

        const got = await unlocked()
        expect(got).toEqual(expect.arrayContaining(["1match_achievement", "1goal_achievement", "1redCard_achievement", "1win_achievement"]))
        expect(got).not.toContain("perfectShooting_achievement") // un solo tiro: hacen falta 3
        expect(got).not.toContain("goals_milestone_official@25")
        expect(got).not.toContain("100goal_achievement")
    })
})

describe("equipo de la semana", () => {
    it("un hito por cada escalón, no solo el último", async () => {
        // Hoy no hay logros de equipo de la semana en el repo: se prueban con unos de mentira
        await AchievementDefinitionModel.insertMany([
            { _id: "totwBest_milestone", name: "x", category: "totwBest", scope: "cumulative", type: "club", mode: "infinite", step: 5, points: 1 },
            { _id: "1totwBest_achievement", name: "x", category: "totwBest", scope: "cumulative", type: "club", mode: "unique", threshold: 1, points: 1 },
            { _id: "1totwWorst_achievement", name: "x", category: "totwWorst", scope: "cumulative", type: "club", mode: "unique", threshold: 1, points: 1 },
        ])
        await MemberTotwAppearancesModel.insertMany([
            ...Array.from({ length: 11 }, (_, i) => ({ playerId: "p1", playerName: "Uno", type: "best", position: "forward", rating: 8, isoWeek: `2026-W${10 + i}` })),
            { playerId: "p1", playerName: "Uno", type: "worst", position: "forward", rating: 4, isoWeek: "2026-W40" },
        ])

        await recalculateAllTOTWAchievements()
        await recalculateAllTOTWAchievements() // repetirlo no duplica nada

        expect(await unlocked()).toEqual(["1totwBest_achievement", "1totwWorst_achievement", "totwBest_milestone@10", "totwBest_milestone@5"])
    })
})
