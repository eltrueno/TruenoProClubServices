import { describe, expect, it } from "vitest"
import type { IClubMember } from "@trueno-proclub-services/shared"
import PlayerStatsEntity from "../src/model/PlayerStatsEntity"
import { buildSquad, filterSquad, formatStat, isRegular, sortByKey, sortSquad } from "../src/lib/squad"

const member = (playerId: string, playerName: string, extra: Partial<IClubMember> = {}) =>
    ({ playerId, playerName, nameHistory: [playerName], ...extra }) as IClubMember
const doc = (playerId: string, position: string, gamesPlayed: number, extra: Record<string, number> = {}) =>
    new PlayerStatsEntity({ playerId, position: position as never, gamesPlayed, ...extra })

const members = [
    member("1", "Álvaro", { proName: "PICHICHI" }),
    member("2", "Berto"),
    member("3", "Carlos"),
    member("4", "Sin partidos"),
]
const stats = {
    official: [
        doc("1", "forward", 8, { goals: 10, wins: 6, ratingSum: 60 }),
        doc("1", "midfielder", 2, { goals: 1, wins: 1, ratingSum: 14 }),
        doc("2", "defender", 12, { goals: 1, assists: 4, wins: 6 }),
    ],
    friendly: [
        doc("3", "goalkeeper", 3, { cleanSheets: 2 }),
        doc("1", "midfielder", 5, { goals: 2 }),
    ],
}

describe("buildSquad", () => {
    it("agrega por jugador en el ámbito elegido y deja fuera a quien no ha jugado", () => {
        const all = buildSquad(members, stats, "all")
        expect(all.map((p) => p.member.playerId)).toEqual(["1", "2", "3"])
        const alvaro = all.find((p) => p.member.playerId === "1")!
        expect(alvaro.stats.gamesPlayed).toBe(15)
        expect(alvaro.stats.goals).toBe(13)
        // Posiciones de más a menos jugada: 8 de delantero, 7 de medio
        expect(alvaro.positions).toEqual(["forward", "midfielder"])

        const official = buildSquad(members, stats, "official")
        expect(official.map((p) => p.member.playerId)).toEqual(["1", "2"])
        expect(official[0].stats.gamesPlayed).toBe(10)
    })

    it("habitual = 10 partidos o más en ese ámbito", () => {
        const all = buildSquad(members, stats, "all")
        expect(all.filter(isRegular).map((p) => p.member.playerId)).toEqual(["1", "2"])
    })
})

describe("filterSquad", () => {
    const squad = buildSquad(members, stats, "all")
    it("busca sin tildes ni mayúsculas, también por el nombre del pro", () => {
        expect(filterSquad(squad, { search: "alvaro", position: null }).map((p) => p.member.playerId)).toEqual(["1"])
        expect(filterSquad(squad, { search: "pichi", position: null }).map((p) => p.member.playerId)).toEqual(["1"])
    })
    it("por posición, también las secundarias", () => {
        // Álvaro: delantero sobre todo, pero también medio
        expect(filterSquad(squad, { search: "", position: "midfielder" }).map((p) => p.member.playerId)).toEqual(["1"])
        expect(filterSquad(squad, { search: "", position: "forward" }).map((p) => p.member.playerId)).toEqual(["1"])
        expect(filterSquad(squad, { search: "", position: "goalkeeper" }).map((p) => p.member.playerId)).toEqual(["3"])
    })
})

describe("sortSquad", () => {
    const squad = buildSquad(members, stats, "all")
    it("ordena por la stat elegida, en las dos direcciones", () => {
        expect(sortSquad(squad, "goles", "desc").map((p) => p.member.playerId)).toEqual(["1", "2", "3"])
        expect(sortSquad(squad, "porterias", "desc")[0].member.playerId).toBe("3")
        expect(sortSquad(squad, "goles", "asc")[0].member.playerId).toBe("3")
    })
    it("a igualdad, más partidos primero", () => {
        // Asistencias: Berto 4; Álvaro y Carlos 0 → Álvaro (15 PJ) antes que Carlos (3 PJ)
        expect(sortSquad(squad, "asistencias", "desc").map((p) => p.member.playerId)).toEqual(["2", "1", "3"])
    })
})

describe("formatStat", () => {
    it("decimales con coma y sufijo", () => {
        expect(formatStat(sortByKey("valoracion"), 7.36)).toBe("7,4")
        expect(formatStat(sortByKey("victorias"), 70.4)).toBe("70%")
        expect(formatStat(sortByKey("goles"), 12)).toBe("12")
    })
    it("una clave desconocida cae en partidos", () => {
        expect(sortByKey("loquesea").key).toBe("partidos")
    })
})
