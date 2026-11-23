import { describe, expect, it } from "vitest"
import { headToHead, neighbours, playerForm, playerMoments, shareOf, teamMoments } from "../src/lib/matchInsights"

type P = { playerId: string; playerName: string; played?: boolean; goals?: number; assists?: number; rating?: number; manOfTheMatch?: boolean; shots?: number; passesMade?: number; passesSuccess?: number; tacklesMade?: number; tacklesSuccess?: number; saves?: number }
const pl = (p: P) => ({ played: true, goals: 0, assists: 0, rating: 7, manOfTheMatch: false, shots: 0, passesMade: 0, passesSuccess: 0, tacklesMade: 0, tacklesSuccess: 0, saves: 0, ...p })

let id = 0
/** Partido de prueba: nuestros goles - los suyos, contra el rival `rival`, con jugadores */
function m(gf: number, ga: number, players: P[] = [], { rival = 99, counts = true } = {}) {
    id++
    const result = gf > ga ? "win" : gf < ga ? "loose" : "tie"
    return {
        matchId: id, timestamp: id * 1000, result, counts,
        ourClub: { id: 1, name: "Nosotros", matchStats: { goals: gf }, players: players.map(pl) },
        opponentClub: { id: rival, name: `Rival ${rival}`, matchStats: { goals: ga }, players: [] },
    } as never
}

describe("neighbours", () => {
    it("anterior y siguiente por fecha, aunque lleguen desordenados", () => {
        const [a, b, c] = [m(1, 0), m(2, 0), m(3, 0)]
        expect(neighbours([c, a, b] as { matchId: number; timestamp: number }[], (b as { matchId: number }).matchId)).toEqual({ prev: a, next: c })
        expect(neighbours([a] as { matchId: number; timestamp: number }[], (a as { matchId: number }).matchId)).toEqual({ prev: null, next: null })
    })
})

describe("teamMoments", () => {
    it("racha de victorias y sin perder", () => {
        const list = [m(1, 1), m(2, 0), m(3, 1), m(1, 0)]
        const last = list[3] as { matchId: number }
        const texts = teamMoments(list, last.matchId).map((x) => x.text)
        expect(texts).toContain("3.ª victoria seguida")
        expect(texts).toContain("4 partidos sin perder")
        expect(texts).toContain("Portería a cero")
    })
    it("fin de racha sin perder y los nulos no cuentan", () => {
        const list = [m(1, 0), m(1, 1), m(0, 5, [], { counts: false }), m(2, 2), m(0, 1)]
        const last = list[4] as { matchId: number }
        expect(teamMoments(list, last.matchId).map((x) => x.text)).toEqual(["Se acaba una racha de 3 sin perder"])
    })
    it("récords solo con historial detrás", () => {
        const list = [m(1, 0), m(2, 1), m(1, 1), m(0, 1), m(2, 0), m(6, 0)]
        const last = list[5] as { matchId: number }
        expect(teamMoments(list, last.matchId).map((x) => x.text)).toContain("Mayor goleada de la historia del club")
        const early = [m(9, 0)]
        expect(teamMoments(early, (early[0] as { matchId: number }).matchId).map((x) => x.text)).not.toContain("Mayor goleada de la historia del club")
    })
})

describe("playerMoments", () => {
    it("debut, primer gol, hat-trick y primer MVP", () => {
        const list = [
            m(1, 0, [{ playerId: "a", playerName: "Ana" }]),
            m(4, 0, [{ playerId: "a", playerName: "Ana", goals: 3, manOfTheMatch: true }, { playerId: "b", playerName: "Bea" }]),
        ]
        const texts = playerMoments(list, (list[1] as { matchId: number }).matchId).map((x) => x.text)
        expect(texts).toEqual(expect.arrayContaining(["Hat-trick de Ana", "Primer gol de Ana con el club", "Primer MVP de Ana", "Debut de Bea con el club"]))
    })
    it("partido 10 de un jugador", () => {
        const list = Array.from({ length: 10 }, () => m(1, 0, [{ playerId: "a", playerName: "Ana" }]))
        expect(playerMoments(list, (list[9] as { matchId: number }).matchId).map((x) => x.text)).toContain("Partido 10 de Ana")
    })
})

describe("headToHead", () => {
    it("balance, el anterior y la mayor victoria contra ese rival", () => {
        const list = [m(3, 0, [], { rival: 5 }), m(1, 1, [], { rival: 7 }), m(0, 2, [], { rival: 5 }), m(2, 1, [], { rival: 5 })]
        const h = headToHead(list, list[3])
        expect(h).toMatchObject({ played: 3, wins: 2, ties: 0, losses: 1, goalsFor: 5, goalsAgainst: 3 })
        expect(h.previous).toBe(list[2])
        expect(h.biggestWin).toBe(list[0])
    })
})

describe("playerForm", () => {
    it("últimos partidos hasta este y medias", () => {
        const list = [1, 2, 3, 4, 5, 6].map((r) => m(1, 0, [{ playerId: "a", playerName: "Ana", rating: r, goals: r % 2, passesMade: 10, passesSuccess: 8 }]))
        const f = playerForm(list, (list[4] as { matchId: number }).matchId, "a", 3)
        expect(f.last.map((x) => x.rating)).toEqual([3, 4, 5])
        expect(f.last[2].current).toBe(true)
        expect(f.games).toBe(6)
        expect(f.ratingAve).toBe(3.5)
        expect(f.perMatch.passSuccessRate).toBe(80)
    })
})

describe("shareOf", () => {
    it("reparto de una stat, sin los que se quedan en 0", () => {
        const players = [pl({ playerId: "a", playerName: "Ana", shots: 3 }), pl({ playerId: "b", playerName: "Bea", shots: 1 }), pl({ playerId: "c", playerName: "Cris" })] as never
        const s = shareOf(players, "shots")
        expect(s.total).toBe(4)
        expect(s.rows.map((r) => [r.playerId, r.share])).toEqual([["a", 0.75], ["b", 0.25]])
    })
})
