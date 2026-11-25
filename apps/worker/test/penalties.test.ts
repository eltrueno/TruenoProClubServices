import { describe, expect, it } from "vitest"
import { detectPenalties } from "@trueno-proclub-services/eafcapi"

// Partido mínimo: clubs.goals (con tanda / goles en propia) y aggregate.goals (goles de jugadores)
const match = (clubs: [number, number], agg: [number, number], seconds = 7200) => ({
    clubs: { a: { goals: String(clubs[0]) }, b: { goals: String(clubs[1]) } },
    aggregate: { a: { goals: agg[0] }, b: { goals: agg[1] } },
    players: { a: { p1: { secondsPlayed: String(seconds) } } },
}) as never

describe("detectPenalties", () => {
    it("tanda de verdad: empate y la tanda tiene ganador", () => {
        expect(detectPenalties(match([5, 4], [1, 1]), "a", "b")).toEqual({ hasPenalties: true, scores: { a: 4, b: 3 }, realScores: { a: 1, b: 1 } })
    })
    it("no hay tanda si el partido no acabó en empate (los dos inflados por otra cosa)", () => {
        expect(detectPenalties(match([2, 3], [1, 2]), "a", "b").hasPenalties).toBe(false)
    })
    it("no hay tanda si saldría empatada", () => {
        expect(detectPenalties(match([2, 2], [1, 1]), "a", "b").hasPenalties).toBe(false)
    })
    it("tanda tras un empate con gol en propia: 2-2 (uno en propia) y tanda 4-3", () => {
        // agregado 1-2: el 2-2 real lleva un gol en propia a favor de a; clubs.goals = 2+4 y 2+3
        expect(detectPenalties(match([6, 5], [1, 2]), "a", "b")).toEqual({ hasPenalties: true, scores: { a: 4, b: 3 }, realScores: { a: 2, b: 2 } })
    })
    it("el partido de prod: 2-3 con un gol en propia por lado, sin tanda", () => {
        expect(detectPenalties(match([2, 3], [1, 2]), "a", "b").hasPenalties).toBe(false)
    })
    it("sin prórroga no hay tanda", () => {
        expect(detectPenalties(match([5, 4], [1, 1], 5400), "a", "b").hasPenalties).toBe(false)
    })
})

import { penaltyPatch } from "../src/services/penaltyPatch.js"

// Partido guardado: marcador = agregado de jugadores; penaltiesScore = lo que sobraba de clubs.goals
const saved = (goals: [number, number], pens: [number, number], localTeam = true) => ({
    matchId: 1, winnerByPen: true, localTeam, result: "tie",
    localClub: { matchStats: { goals: goals[0] }, penaltiesScore: pens[0] },
    awayClub: { matchStats: { goals: goals[1] }, penaltiesScore: pens[1] },
}) as never

describe("penaltyPatch", () => {
    it("el de prod: 1–2 con tanda 1–1 → 2–3 sin penaltis, derrota", () => {
        expect(penaltyPatch(saved([1, 2], [1, 1]))).toEqual({
            $set: { winnerByPen: false, result: "loose", "localClub.matchStats.goals": 2, "awayClub.matchStats.goals": 3 },
            $unset: { "localClub.penaltiesScore": "", "awayClub.penaltiesScore": "" },
        })
    })
    it("siendo visitantes, el resultado sale de nuestro lado", () => {
        expect(penaltyPatch(saved([1, 2], [1, 1], false))!.$set.result).toBe("win")
    })
    it("una tanda buena no se toca", () => {
        expect(penaltyPatch(saved([1, 1], [4, 3]))).toBeNull()
    })
    it("tanda buena con gol en propia: corrige marcador y tanda", () => {
        expect(penaltyPatch(saved([1, 2], [5, 3]))!.$set).toEqual({
            result: "win", "localClub.matchStats.goals": 2, "awayClub.matchStats.goals": 2,
            "localClub.penaltiesScore": 4, "awayClub.penaltiesScore": 3,
        })
    })
})
