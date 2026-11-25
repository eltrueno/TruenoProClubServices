import { describe, expect, it } from "vitest"
import { playerPhrase } from "../src/lib/matchPhrases"

const pl = (o: Record<string, unknown>) => ({
    playerId: "a", playerName: "A", position: "midfielder", rating: 7, goals: 0, assists: 0, shots: 0, passesMade: 20, passesSuccess: 16,
    tacklesMade: 2, tacklesSuccess: 1, saves: 0, goalsConceded: 0, redCards: 0, manOfTheMatch: false, minutesPlayed: 90,
    reflexSaves: 0, ballDiveSaves: 0, ...o,
}) as never
const ctx = (teammates: never[], extra = {}) => ({ teammates, result: "win" as const, goalsFor: 4, goalsAgainst: 1, seed: 1, ...extra })

describe("playerPhrase", () => {
    it("lo más llamativo manda: un póker gana a unos buenos pases", () => {
        const p = pl({ goals: 4, shots: 6, passesMade: 45, passesSuccess: 44 })
        expect(["No tiene cartas pero... póker", "Hizo lo que quiso en el área", "Cuatro. Ni en el FIFA en principiante", "Todos los goles del equipo llevan su nombre", "Él solito contra el mundo"])
            .toContain(playerPhrase(p, ctx([p])))
    })
    it("siempre la misma frase para el mismo jugador y partido", () => {
        const p = pl({ goals: 1, shots: 1 })
        const first = playerPhrase(p, ctx([p]))
        for (let i = 0; i < 10; i++) expect(playerPhrase(p, ctx([p]))).toBe(first)
    })
    it("tiene en cuenta el partido: MVP en una derrota", () => {
        const p = pl({ manOfTheMatch: true, rating: 8.2 })
        expect(playerPhrase(p, ctx([p], { result: "loose", goalsFor: 0, goalsAgainst: 2 }))).toBe("MVP en una derrota: hizo lo que pudo")
    })
})

import { matchPhrase } from "../src/lib/matchPhrases"
const base = { matchId: 7, result: "win" as const, goalsFor: 1, goalsAgainst: 0, shotsFor: 6, shotsAgainst: 6, passesFor: 100, passesAgainst: 100, redsFor: 0, redsAgainst: 0, penalties: null, dnf: false, extraTime: false, voided: false, rivalName: "X", derby: false }
describe("matchPhrase", () => {
    it("1-0 limpio: autobús", () => {
        expect(["1-0 y autobús aparcado. Cholismo puro", "Gol, candado y a casa"]).toContain(matchPhrase(base))
    })
    it("nulo manda sobre todo y la frase no cambia", () => {
        const p = matchPhrase({ ...base, voided: true, goalsFor: 8 })
        expect(["Partido fantasma: se jugó, pero no cuenta", "Como si no hubiera pasado. Literalmente"]).toContain(p)
        expect(matchPhrase({ ...base, voided: true, goalsFor: 8 })).toBe(p)
    })
})
