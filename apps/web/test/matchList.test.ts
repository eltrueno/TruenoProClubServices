import { describe, expect, it } from "vitest"
import { currentStreak, filterMatches, groupByMonth, parseDay, recordOf, type MatchFilters } from "../src/lib/matchList"

let id = 0
/** Partido de prueba: fecha (aaaa-mm-dd), goles nuestros-suyos, rival, tipo y quién jugó */
function m(date: string, gf: number, ga: number, { rival = "Rival FC", type = "league", players = ["a", "b"], counts = true } = {}) {
    id++
    return {
        matchId: id, matchType: type, timestamp: new Date(`${date}T20:00:00`).getTime() / 1000, counts,
        result: gf > ga ? "win" : gf < ga ? "loose" : "tie",
        ourClub: { matchStats: { goals: gf }, players: players.map((p) => ({ playerId: p, played: true })) },
        opponentClub: { name: rival, matchStats: { goals: ga } },
    } as never
}
const ALL: MatchFilters = { query: "", types: ["league", "playoff", "friendly"], players: [], from: "", to: "", minPlayers: 0 }

describe("filterMatches", () => {
    const list = [
        m("2026-10-01", 2, 0, { rival: "Atlético Pepe" }),
        m("2026-11-05", 1, 1, { type: "friendly", players: ["a"] }),
        m("2026-11-20", 0, 3, { rival: "Manporros FC", players: ["a", "b", "c"] }),
    ]
    it("del más reciente al más antiguo", () => {
        expect(filterMatches(list, ALL).map((x: { matchId: number }) => x.matchId)).toEqual([3, 2, 1])
    })
    it("busca el rival sin tildes ni mayúsculas, y por id", () => {
        expect(filterMatches(list, { ...ALL, query: "atletico" })).toHaveLength(1)
        expect(filterMatches(list, { ...ALL, query: "2" }).map((x: { matchId: number }) => x.matchId)).toContain(2)
    })
    it("tipo, jugadores juntos, fechas y mínimo de jugadores", () => {
        expect(filterMatches(list, { ...ALL, types: ["friendly"] })).toHaveLength(1)
        expect(filterMatches(list, { ...ALL, players: ["a", "b"] })).toHaveLength(2)
        expect(filterMatches(list, { ...ALL, from: "01/11/2026", to: "30/11/2026" })).toHaveLength(2)
        expect(filterMatches(list, { ...ALL, minPlayers: 3 })).toHaveLength(1)
    })
})

describe("recordOf / currentStreak", () => {
    it("balance sin nulos y la racha con la que acaba", () => {
        const list = [m("2026-11-03", 2, 1), m("2026-11-02", 3, 0), m("2026-11-01", 0, 9, { counts: false }), m("2026-10-31", 0, 1)]
        expect(recordOf(list)).toEqual({ games: 3, wins: 2, ties: 0, losses: 1, goalsFor: 5, goalsAgainst: 2 })
        expect(currentStreak(list)).toEqual({ result: "win", count: 2 })
    })
})

describe("groupByMonth", () => {
    it("por mes, con el balance de todo el mes aunque la página tenga solo una parte", () => {
        const all = [m("2026-11-20", 1, 0), m("2026-11-10", 0, 1), m("2026-10-05", 2, 2)]
        const groups = groupByMonth(all.slice(0, 1), all)
        expect(groups).toHaveLength(1)
        expect(groups[0].label).toBe("Noviembre de 2026")
        expect(groups[0].record).toMatchObject({ games: 2, wins: 1, losses: 1 })
    })
})

describe("parseDay", () => {
    it("dd/mm/aaaa", () => {
        expect(parseDay("05/11/2026")?.getDate()).toBe(5)
        expect(parseDay("nope")).toBeNull()
    })
})
