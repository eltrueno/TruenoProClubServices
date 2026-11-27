import { describe, expect, it } from "vitest"
import { currentStreak, filterMatches, groupByMonth, parseDay, recordOf, sortMatches, type MatchFilters } from "../src/lib/matchList"

let id = 0
/** Partido de prueba: fecha (aaaa-mm-dd), goles nuestros-suyos, rival, tipo y quién jugó */
function m(date: string, gf: number, ga: number, { rival = "Rival FC", type = "league", players = ["a", "b"], counts = true } = {}) {
    id++
    return {
        matchId: id, matchType: type, timestamp: new Date(`${date}T20:00:00`).getTime() / 1000, counts,
        result: gf > ga ? "win" : gf < ga ? "loose" : "tie",
        ourClub: { matchStats: { goals: gf }, players: players.map((p) => ({ playerId: p, played: true })) },
        opponentClub: { name: rival, matchStats: { goals: ga }, players: [] },
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
    it("solo derbis: el rival es otro club de la comunidad (sin mayúsculas ni tildes)", () => {
        const withDerby = [...list, m("2026-11-21", 1, 0, { rival: "CASEMURO UNITED" })]
        expect(filterMatches(withDerby, { ...ALL, derbyRivals: ["Casemuro United"] }).map((x: { opponentClub: { name: string } }) => x.opponentClub.name)).toEqual(["CASEMURO UNITED"])
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

describe("filtros de resultado, prórroga y penaltis", () => {
    const pen = { ...(m("2026-11-01", 1, 1) as object), winnerByPen: true } as never
    const et = m("2026-11-02", 2, 1)
    ;(et as { ourClub: { players: { minutesPlayed: number }[] } }).ourClub.players[0].minutesPlayed = 120
    const list = [m("2026-11-03", 0, 2), pen, et, m("2026-11-04", 0, 0, { counts: false })]
    it("resultado (sin nulos), penaltis y prórroga", () => {
        expect(filterMatches(list, { ...ALL, results: ["loose"] })).toHaveLength(1)
        expect(filterMatches(list, { ...ALL, results: ["tie"] })).toHaveLength(1)
        expect(filterMatches(list, { ...ALL, penalties: true })).toHaveLength(1)
        expect(filterMatches(list, { ...ALL, extraTime: true })).toHaveLength(1)
    })
})

describe("sortMatches", () => {
    const list = [m("2026-11-01", 5, 0), m("2026-11-02", 1, 4), m("2026-11-03", 6, 3)]
    const ids = (l: { matchId: number }[]) => l.map((x) => x.matchId)
    it("por fecha, goles, goleada y derrota", () => {
        const [a, b, c] = ids(list as never)
        expect(ids(sortMatches(list, "oldest"))).toEqual([a, b, c])
        expect(ids(sortMatches(list, "goals"))).toEqual([c, a, b])
        expect(ids(sortMatches(list, "biggestWin"))).toEqual([a, c, b])
        expect(ids(sortMatches(list, "worstLoss"))[0]).toBe(b)
    })
})
