/**
 * Logros de club contra un Mongo en memoria: oficiales y amistosos suman juntos, los hitos
 * dan un desbloqueo por escalón, las rachas y el calendario salen del estado por jugador, y
 * al cambiar las definiciones se rehace lo desbloqueado. Todo en silencio (sin RabbitMQ).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_METRICS, rarityFromPoints, type IMatch } from "@trueno-proclub-services/shared"
import {
    AchievementDefinitionModel, AchievementProgressModel, AchievementUnlockedModel, MatchModel, MemberTotwAppearancesModel,
    PlayerStatsFriendlyModel, PlayerStatsOfficialModel
} from "@trueno-proclub-services/shared/models"

const mongod = await MongoMemoryServer.create()
const { syncAchievementDefinitions, recalculateAllTOTWAchievements, pendingSteps } = await import("../src/services/achievement.service.js")
const { accumulateStatsFromMatch, recalculateAllPlayerStats } = await import("../src/services/playerStats.service.js")

const CLUB = 1
let nextMatchId = 1
/** 2027-03-01 12:00 UTC (lunes) */
const BASE = Date.UTC(2027, 2, 1, 12) / 1000
const DAY = 86_400

const basePlayer = { playerId: "p1", playerName: "Uno", position: "forward", secondsPlayed: 5400, rating: 7, goals: 0, assists: 0, shots: 0, passesMade: 0, passesSuccess: 0, tacklesMade: 0, tacklesSuccess: 0, saves: 0, redCards: 0, goalsConceded: 0 }

interface MatchOptions {
    type?: "league" | "playoff" | "friendly"
    result?: "win" | "tie" | "loose"
    score?: [number, number]
    at?: number
    teammates?: Record<string, unknown>[]
    rivals?: number
    extra?: Record<string, unknown>
}

/** Partido nuestro (local) con el jugador p1 y lo que se le añada */
const match = (player: Record<string, unknown> = {}, o: MatchOptions = {}): IMatch => {
    const matchId = nextMatchId++
    const score = o.score ?? [1, 0]
    return {
        matchId,
        timestamp: o.at ?? BASE + matchId * 60,
        matchType: o.type ?? "league",
        result: o.result ?? (score[0] > score[1] ? "win" : score[0] < score[1] ? "loose" : "tie"),
        winnerByDnf: false,
        localTeam: true,
        localClub: {
            id: CLUB,
            matchStats: { goals: score[0] },
            players: [{ ...basePlayer, ...player }, ...(o.teammates ?? []).map((t, i) => ({ ...basePlayer, playerId: `t${i}`, playerName: `T${i}`, ...t }))],
        },
        awayClub: { id: 2, matchStats: { goals: score[1] }, players: Array.from({ length: o.rivals ?? 0 }, (_, i) => ({ ...basePlayer, playerId: `r${i}` })) },
        ...o.extra,
    } as unknown as IMatch
}

const play = (m: IMatch) => accumulateStatsFromMatch(m, CLUB, false, true)

const unlocked = async (playerId = "p1") =>
    (await AchievementUnlockedModel.find({ playerId }).lean()).map((u) => u.achievementId + (u.reached ? `@${u.reached}` : "")).sort()

beforeAll(async () => {
    await mongoose.connect(mongod.getUri(), { dbName: "workertest" })
})
beforeEach(async () => {
    await Promise.all([
        AchievementDefinitionModel.deleteMany({}), AchievementUnlockedModel.deleteMany({}), AchievementProgressModel.deleteMany({}), MatchModel.deleteMany({}),
        PlayerStatsOfficialModel.deleteMany({}), PlayerStatsFriendlyModel.deleteMany({}), MemberTotwAppearancesModel.deleteMany({}),
    ])
})
afterAll(async () => {
    await mongoose.disconnect()
    await mongod.stop()
})

describe("definiciones", () => {
    it("son coherentes: ids y nombres únicos, de club, con puntos, rareza acorde y métrica conocida", () => {
        expect(new Set(ACHIEVEMENT_DEFINITIONS.map((d) => d._id)).size).toBe(ACHIEVEMENT_DEFINITIONS.length)
        expect(new Set(ACHIEVEMENT_DEFINITIONS.map((d) => d.name)).size).toBe(ACHIEVEMENT_DEFINITIONS.length)
        for (const d of ACHIEVEMENT_DEFINITIONS) {
            expect(d.type, d._id).toBe("club")
            expect(d.points, d._id).toBeGreaterThan(0)
            expect(d.rarity, d._id).toBe(rarityFromPoints(d.points))
            expect(d.hidden, d._id).toBe(d.category === "curiosities" || d.rarity === "legendary")
            expect(ACHIEVEMENT_METRICS, d._id).toContain(d.metric)
            expect(ACHIEVEMENT_CATEGORIES, d._id).toContain(d.category)
            if (d.mode === "infinite") expect(d.step, d._id).toBeGreaterThan(0)
            else expect(d.threshold !== undefined || d.exact !== undefined, d._id).toBe(true)
        }
    })

    it("la rareza sale de los puntos", () => {
        expect([5, 10, 15, 25, 30, 50, 60, 100].map(rarityFromPoints)).toEqual(["common", "common", "rare", "rare", "epic", "epic", "legendary", "legendary"])
    })

    it("pide rehacer si desaparece, cambia o aparece un logro; no por textos o puntos, ni la primera vez", async () => {
        expect(await syncAchievementDefinitions()).toBe(false) // DB vacía
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

        // Uno nuevo (aquí: se borra uno de la DB y vuelve a entrar): pudo ganarse en un partido antiguo
        await AchievementDefinitionModel.deleteOne({ _id: "manita_achievement" })
        expect(await syncAchievementDefinitions()).toBe(true)

        // Cambiar solo el texto o los puntos no obliga a rehacer nada
        await AchievementDefinitionModel.updateOne({ _id: "goals_milestone" }, { $set: { name: "Otro nombre", points: 1 } })
        expect(await syncAchievementDefinitions()).toBe(false)
        expect((await AchievementDefinitionModel.findById("goals_milestone").lean())?.name).toBe("Goles")
    })

    it("pendingSteps da todos los escalones que faltan", () => {
        expect(pendingSteps(24, 0, 25)).toEqual([])
        expect(pendingSteps(25, 0, 25)).toEqual([25])
        expect(pendingSteps(80, 25, 25)).toEqual([50, 75])
        expect(pendingSteps(10, 0, 0)).toEqual([])
    })
})

describe("logros por partido", () => {
    beforeEach(async () => { await syncAchievementDefinitions() })

    it("oficiales y amistosos suman juntos", async () => {
        // 13 goles en liga + 12 en amistosos = 25: el hito de goles salta en el amistoso
        await play(match({ goals: 13, shots: 13 }, { score: [13, 0] }))
        expect(await unlocked()).not.toContain("goals_milestone@25")
        await play(match({ goals: 12, shots: 12 }, { type: "friendly", score: [12, 0] }))

        const got = await unlocked()
        expect(got).toEqual(expect.arrayContaining([
            "goals_milestone@25", "1match_achievement", "1goal_achievement", "1win_achievement",
            "manita_achievement",                        // 5 o más en un partido
            "pokers_milestone@1", "pokers_milestone@2",  // hito de 1 en 1: dos partidos, dos hitos
            "perfectHattrick_achievement",               // 3 o más sin fallar un tiro
            "soloScorer_achievement",                    // todos los goles del equipo
            "teamGoals10_achievement", "shutout6_achievement", "winBy5_achievement", "totalGoals10_achievement",
        ]))
    })

    it("un logro de un partido lleva la fecha y el id de ese partido, y solo se da una vez", async () => {
        const m = match({ rating: 10, passesMade: 60, passesSuccess: 60 }, { type: "friendly" })
        await play(m)
        await play(match({ rating: 10 }))

        const perfect = await AchievementUnlockedModel.find({ playerId: "p1", achievementId: "rating10_achievement" }).lean()
        expect(perfect).toHaveLength(1)
        expect(perfect[0].matchId).toBe(String(m.matchId))
        expect(new Date(perfect[0].unlockedAt).getTime()).toBe(m.timestamp * 1000)
        expect(await unlocked()).toEqual(expect.arrayContaining(["perfectPassing_achievement", "metronome_achievement"]))
    })

    it("un partido nulo o con menos de 15' no desbloquea nada ni mueve las rachas", async () => {
        await play(match({ goals: 5 }, { extra: { voided: true } }))
        await play(match({ goals: 5, secondsPlayed: 600 }))
        expect(await unlocked()).toEqual([])
        expect(await AchievementProgressModel.countDocuments()).toBe(0)
    })

    it("combinaciones del jugador: portero que marca, héroe y villano, sin el mínimo no cuenta", async () => {
        await play(match({ position: "goalkeeper", goals: 1, shots: 1, assists: 1, saves: 9, cleanSheet: true, redCards: 1, manOfTheMatch: true, passesMade: 5, passesSuccess: 0 }))
        const got = await unlocked()
        expect(got).toEqual(expect.arrayContaining([
            "gkGoal_achievement", "gkAssist_achievement", "cleanSheetSaves_achievement", "goalAndRedCard_achievement", "goalAssistMotm_achievement",
        ]))
        // 5 pases fallados no llegan al mínimo de 10, y un tiro no llega al de 3
        expect(got).not.toContain("nullPassing_achievement")
        expect(got).not.toContain("perfectShooting_achievement")
        // de portero no hay "Fantasma"
        expect(got).not.toContain("ghost_achievement")
    })

    it("lo malo también cuenta: fantasma, chupón, coladero, mejor del partido perdiendo", async () => {
        await play(match({}, { score: [0, 5] }))                                              // sin tocarla y 0-5
        await play(match({ shots: 10 }, { score: [0, 1] }))
        await play(match({ position: "goalkeeper", goalsConceded: 7, manOfTheMatch: true }, { score: [2, 7] }))
        expect(await unlocked()).toEqual(expect.arrayContaining([
            "ghost_achievement", "lossBy5_achievement", "shotsWithoutGoal_achievement", "gkConceded_achievement", "motmInLoss_achievement",
        ]))
    })

    it("de equipo: se lo llevan todos los que juegan, y dependen del marcador y de quién juega", async () => {
        const scorers = Array.from({ length: 4 }, () => ({ goals: 1, shots: 1 }))
        await play(match({ goals: 1, shots: 1 }, { type: "playoff", score: [5, 5], result: "win", teammates: scorers, rivals: 8, extra: { winnerByPen: true } }))

        for (const id of ["p1", "t0", "t3"]) {
            expect(await unlocked(id), id).toEqual(expect.arrayContaining([
                "teamScorers5_achievement", "penaltyWin_achievement", "playoffWin_achievement", "outnumberedWin_achievement", "totalGoals10_achievement",
            ]))
        }
        expect(await unlocked()).not.toContain("winBy5_achievement")

        await play(match({}, { score: [0, 0] }))
        await play(match({}, { score: [4, 4] }))
        await play(match({}, { score: [3, 0], teammates: Array.from({ length: 10 }, () => ({})), extra: { winnerByDnf: true } }))
        expect(await unlocked()).toEqual(expect.arrayContaining([
            "goallessDraw_achievement", "highScoringDraw_achievement", "fullSquadWin_achievement", "dnfWin_achievement",
        ]))
    })
})

describe("rachas", () => {
    beforeEach(async () => { await syncAchievementDefinitions() })

    it("victorias seguidas: una derrota la corta y hay que empezar de nuevo", async () => {
        for (let i = 0; i < 4; i++) await play(match({ goals: 1 }))
        await play(match({}, { score: [0, 1] }))
        for (let i = 0; i < 4; i++) await play(match({ goals: 1 }))
        expect(await unlocked()).not.toContain("winStreak5_achievement")
        expect((await AchievementProgressModel.findOne({ playerId: "p1" }).lean())?.winStreak).toBe(4)

        await play(match({ goals: 1 }))
        const got = await unlocked()
        expect(got).toContain("winStreak5_achievement")
        expect(got).toContain("scoringStreak5_achievement")
        expect(got).not.toContain("winStreak10_achievement")
    })

    it("sequía de delantero: solo cuentan sus partidos de delantero, y un gol la corta", async () => {
        for (let i = 0; i < 9; i++) await play(match({}, { score: [0, 0] }))
        await play(match({ position: "defender" }, { score: [0, 0] }))   // de defensa: ni suma ni corta
        expect(await unlocked()).not.toContain("forwardDrought10_achievement")
        await play(match({}, { score: [0, 0] }))
        expect(await unlocked()).toContain("forwardDrought10_achievement")
        expect(await unlocked()).toContain("sameScore3_achievement")
    })

    it("posiciones: jugar y marcar en las cuatro", async () => {
        for (const position of ["goalkeeper", "defender", "midfielder"]) await play(match({ position, goals: 1, shots: 1 }))
        expect(await unlocked()).not.toContain("positionsPlayed_achievement")
        await play(match({ position: "forward" }))
        expect(await unlocked()).toContain("positionsPlayed_achievement")
        expect(await unlocked()).not.toContain("positionsScored_achievement")
        await play(match({ position: "forward", goals: 1, shots: 1 }))
        expect(await unlocked()).toContain("positionsScored_achievement")
    })
})

describe("calendario (hora de Madrid)", () => {
    beforeEach(async () => { await syncAchievementDefinitions() })

    it("partidos en un mismo día, y el día cambia a medianoche de aquí", async () => {
        // 9 partidos el 1 de marzo y otro a las 23:30 UTC, que en Madrid ya es día 2
        for (let i = 0; i < 9; i++) await play(match({ goals: 1 }, { at: BASE + i * 600 }))
        await play(match({ goals: 1 }, { at: Date.UTC(2027, 2, 1, 23, 30) / 1000 }))
        expect(await unlocked()).not.toContain("dayMatches10_achievement")
        expect((await AchievementProgressModel.findOne({ playerId: "p1" }).lean())).toMatchObject({ day: "2027-03-02", dayMatches: 1, daysPlayed: 2 })

        for (let i = 1; i < 10; i++) await play(match({ goals: 1 }, { at: BASE + DAY + i * 600 }))
        const got = await unlocked()
        expect(got).toEqual(expect.arrayContaining(["dayMatches10_achievement", "dayPerfectWins_achievement", "dayGoals10_achievement"]))
        expect(got).not.toContain("dayAllLosses_achievement")
    })

    it("fin de semana, siete días de una semana, y volver tras un mes", async () => {
        // BASE es lunes: de lunes a domingo
        for (let d = 0; d < 7; d++) {
            await play(match({}, { at: BASE + d * DAY }))
            if (d === 5) expect(await unlocked()).not.toContain("weekend_achievement")
        }
        expect(await unlocked()).toEqual(expect.arrayContaining(["weekend_achievement", "weekDays7_achievement"]))
        expect(await unlocked()).not.toContain("comeback30_achievement")

        await play(match({}, { at: BASE + 40 * DAY }))
        expect(await unlocked()).toContain("comeback30_achievement")
        expect((await AchievementProgressModel.findOne({ playerId: "p1" }).lean())?.weekStreak).toBe(1)
    })

    it("semanas seguidas y aniversario", async () => {
        for (let w = 0; w < 8; w++) await play(match({}, { at: BASE + w * 7 * DAY }))
        expect(await unlocked()).toContain("weekStreak8_achievement")
        expect(await unlocked()).not.toContain("anniversary_achievement")
        await play(match({}, { at: BASE + 366 * DAY }))
        expect(await unlocked()).toContain("anniversary_achievement")
    })

    it("fechas señaladas", async () => {
        await play(match({}, { at: Date.UTC(2027, 11, 24, 18) / 1000 }))
        await play(match({}, { at: Date.UTC(2027, 11, 31, 23, 30) / 1000 })) // en Madrid ya es 1 de enero
        await play(match({}, { at: Date.UTC(2028, 1, 29, 12) / 1000 }))
        const got = await unlocked()
        expect(got).toEqual(expect.arrayContaining(["christmas_achievement", "newYear_achievement", "leapDay_achievement"]))
        expect(got).not.toContain("halloween_achievement")
    })
})

describe("recálculo completo", () => {
    it("rehace logros y rachas desde el historial, en orden, y quita lo que sobra", async () => {
        await syncAchievementDefinitions()
        // Guardados desordenados: el recálculo los procesa por fecha
        const history = [
            match({ goals: 1, shots: 1 }, { at: BASE + 5 * 600 }),
            match({ redCards: 1 }, { type: "friendly", at: BASE + 1 * 600 }),
            match({ goals: 1, shots: 1 }, { at: BASE + 4 * 600 }),
            match({ goals: 1, shots: 1 }, { at: BASE + 3 * 600 }),
            match({ goals: 1, shots: 1 }, { at: BASE + 2 * 600 }),
        ]
        await MatchModel.collection.insertMany(history as any[])
        // Un desbloqueo de un logro que ya no existe, otro que no le corresponde y un estado viejo
        await AchievementUnlockedModel.collection.insertMany([
            { playerId: "p1", playerName: "Uno", achievementId: "goals_milestone_official", reached: 25, unlockedAt: new Date() },
            { playerId: "p1", playerName: "Uno", achievementId: "100goal_achievement", unlockedAt: new Date() },
        ] as any[])
        await AchievementProgressModel.create({ playerId: "p1", winStreak: 99, scoringStreak: 99 })

        await recalculateAllPlayerStats(CLUB)

        const got = await unlocked()
        expect(got).toEqual(expect.arrayContaining(["1match_achievement", "1goal_achievement", "1redCard_achievement", "1win_achievement", "winStreak5_achievement"]))
        expect(got).not.toContain("goals_milestone_official@25")
        expect(got).not.toContain("100goal_achievement")
        expect(got).not.toContain("perfectShooting_achievement") // un solo tiro por partido: hacen falta 3
        expect(await AchievementProgressModel.findOne({ playerId: "p1" }).lean()).toMatchObject({ winStreak: 5, scoringStreak: 4 })
    })
})

describe("equipo de la semana", () => {
    it("un hito por cada escalón, no solo el último", async () => {
        // Hoy no hay logros de equipo de la semana en el repo: se prueban con unos de mentira
        const fake = { name: "x", scope: "cumulative", type: "club", category: "milestones", rarity: "common", points: 1 }
        await AchievementDefinitionModel.insertMany([
            { ...fake, _id: "totwBest_milestone", metric: "totwBest", mode: "infinite", step: 5 },
            { ...fake, _id: "1totwBest_achievement", metric: "totwBest", mode: "unique", threshold: 1 },
            { ...fake, _id: "1totwWorst_achievement", metric: "totwWorst", mode: "unique", threshold: 1 },
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
