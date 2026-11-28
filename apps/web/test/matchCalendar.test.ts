import { describe, expect, it } from "vitest"
import { buildCalendar, dayTone } from "../src/lib/matchCalendar"

/** Partido a una hora local concreta */
const at = (y: number, mo: number, d: number, h: number, result: "win" | "tie" | "loose", counts = true, id = Math.random()) =>
    ({ matchId: id, timestamp: new Date(y, mo - 1, d, h).getTime() / 1000, result, counts }) as never

describe("matchCalendar", () => {
    it("sin partidos, nada", () => {
        expect(buildCalendar([])).toBeNull()
    })

    it("semanas completas de lunes a domingo, de la del primero a la del último", () => {
        // Miércoles 4 y lunes 16 de noviembre de 2026
        const cal = buildCalendar([at(2026, 11, 4, 21, "win"), at(2026, 11, 16, 21, "loose")])!
        expect(cal.weeks.length).toBe(3)
        expect(cal.weeks.every((w) => w.length === 7)).toBe(true)
        expect(cal.weeks[0][0].date.getDay()).toBe(1) // lunes
        expect(cal.weeks[0][0].key).toBe("2026-11-02")
        expect(cal.weeks[2][6].key).toBe("2026-11-22")
    })

    it("agrupa por día, cuenta el balance y gradúa la intensidad", () => {
        const cal = buildCalendar([
            at(2026, 11, 21, 21, "win"), at(2026, 11, 21, 22, "win"), at(2026, 11, 21, 23, "loose"),
            at(2026, 11, 22, 21, "tie"), at(2026, 11, 22, 22, "win", false),
        ])!
        const sat = cal.activeDays.find((d) => d.key === "2026-11-21")!
        expect([sat.wins, sat.ties, sat.losses, sat.level, sat.tone]).toEqual([2, 0, 1, 3, "win"])
        const sun = cal.activeDays.find((d) => d.key === "2026-11-22")!
        expect([sun.ties, sun.level, sun.tone]).toEqual([1, 2, "even"])
        // más reciente primero
        expect(cal.activeDays.map((d) => d.key)).toEqual(["2026-11-22", "2026-11-21"])
        // los del día, en orden de hora
        expect(sat.items.map((m: { timestamp: number }) => m.timestamp)).toEqual([...sat.items.map((m: { timestamp: number }) => m.timestamp)].sort())
    })

    it("con `until` llega hasta esa semana", () => {
        const cal = buildCalendar([at(2026, 11, 4, 21, "win")], new Date(2026, 10, 27))!
        expect(cal.weeks[cal.weeks.length - 1][6].key).toBe("2026-11-29")
    })

    it("etiqueta cada mes en la semana de su día 1", () => {
        const cal = buildCalendar([at(2026, 9, 20, 21, "win"), at(2026, 11, 20, 21, "win")])!
        expect(cal.months.map((m) => m.label)).toEqual(["sept", "oct", "nov"])
    })

    it("tono del día", () => {
        expect(dayTone({ wins: 1, ties: 0, losses: 1 }, 2)).toBe("even")
        expect(dayTone({ wins: 0, ties: 0, losses: 0 }, 1)).toBe("void")
        expect(dayTone({ wins: 0, ties: 0, losses: 0 }, 0)).toBeNull()
    })
})
