/** Ventana de la gráfica de Evolución: zoom, desplazamiento, bordes, fechas y rueda (lib/chartRange) */
import { describe, expect, it, vi } from "vitest"
import { createRangeWheelHandler, fullRange, lastRange, moveEdge, panRange, rangeBetween, rangeFromDates, rangeSize, zoomRange, type IndexRange } from "../src/lib/chartRange"

describe("ventanas básicas", () => {
    it("todo y los últimos N", () => {
        expect(fullRange(10)).toEqual({ start: 0, end: 9 })
        expect(lastRange(10, 5)).toEqual({ start: 5, end: 9 })
        expect(lastRange(3, 5)).toEqual({ start: 0, end: 2 })
        expect(rangeSize({ start: 5, end: 9 })).toBe(5)
    })
})

describe("panRange", () => {
    it("mueve sin cambiar el tamaño y sin salirse", () => {
        expect(panRange({ start: 10, end: 19 }, 5, 100)).toEqual({ start: 15, end: 24 })
        expect(panRange({ start: 10, end: 19 }, -50, 100)).toEqual({ start: 0, end: 9 })
        expect(panRange({ start: 80, end: 89 }, 50, 100)).toEqual({ start: 90, end: 99 })
    })
})

describe("zoomRange", () => {
    it("acerca y aleja alrededor del centro", () => {
        expect(zoomRange({ start: 0, end: 99 }, 0.5, 100, 3)).toEqual({ start: 25, end: 74 })
        expect(zoomRange({ start: 25, end: 74 }, 2, 100, 3)).toEqual({ start: 0, end: 99 })
    })

    it("deja quieto el punto del ancla", () => {
        // Ancla en el borde derecho: el último partido sigue siendo el último
        expect(zoomRange({ start: 0, end: 99 }, 0.5, 100, 3, 1)).toEqual({ start: 50, end: 99 })
        expect(zoomRange({ start: 0, end: 99 }, 0.5, 100, 3, 0)).toEqual({ start: 0, end: 49 })
    })

    it("no baja del mínimo ni pasa de todos, y se mueve para caber", () => {
        expect(rangeSize(zoomRange({ start: 10, end: 13 }, 0.1, 100, 3))).toBe(3)
        expect(zoomRange({ start: 90, end: 99 }, 3, 100, 3, 0)).toEqual({ start: 70, end: 99 })
        expect(zoomRange({ start: 0, end: 9 }, 50, 10, 3)).toEqual({ start: 0, end: 9 })
        // Menos partidos que el mínimo: se ven todos
        expect(zoomRange({ start: 0, end: 1 }, 0.5, 2, 3)).toEqual({ start: 0, end: 1 })
    })
})

describe("rangeBetween", () => {
    it("el trozo marcado, en cualquier orden y sin bajar del mínimo", () => {
        expect(rangeBetween(12.4, 30.6, 100, 3)).toEqual({ start: 12, end: 31 })
        expect(rangeBetween(30, 12, 100, 3)).toEqual({ start: 12, end: 30 })
        expect(rangeBetween(50, 50.4, 100, 3)).toEqual({ start: 49, end: 51 })
        expect(rangeBetween(98.7, 99, 100, 3)).toEqual({ start: 97, end: 99 })
    })
})

describe("moveEdge", () => {
    it("respeta el tamaño mínimo y los límites", () => {
        const r: IndexRange = { start: 10, end: 20 }
        expect(moveEdge(r, "start", 5, 100, 3)).toEqual({ start: 5, end: 20 })
        expect(moveEdge(r, "start", 25, 100, 3)).toEqual({ start: 18, end: 20 })
        expect(moveEdge(r, "end", 2, 100, 3)).toEqual({ start: 10, end: 12 })
        expect(moveEdge(r, "end", 500, 100, 3)).toEqual({ start: 10, end: 99 })
        expect(moveEdge(r, "start", -4, 100, 3)).toEqual({ start: 0, end: 20 })
        // Ventana ya más pequeña que el mínimo: los bordes no se mueven al revés
        const one: IndexRange = { start: 10, end: 10 }
        expect(moveEdge(one, "start", 11, 30, 3)).toEqual({ start: 10, end: 10 })
        expect(moveEdge(one, "end", 9, 30, 3)).toEqual({ start: 10, end: 10 })
        expect(zoomRange(one, 0.5, 30, 3)).toEqual(one)
    })
})

describe("rangeFromDates", () => {
    // Dos partidos el día 1, uno el 2 y dos el 4 (segundos)
    const day = (d: number, h: number) => new Date(2026, 5, d, h).getTime() / 1000
    const ts = [day(1, 21), day(1, 22), day(2, 21), day(4, 20), day(4, 23)]

    it("incluye los límites (el último día entero)", () => {
        expect(rangeFromDates(ts, new Date(2026, 5, 1), new Date(2026, 5, 2, 23, 59, 59, 999))).toEqual({ start: 0, end: 2 })
        expect(rangeFromDates(ts, new Date(2026, 5, 2), null)).toEqual({ start: 2, end: 4 })
        expect(rangeFromDates(ts, null, null)).toEqual({ start: 0, end: 4 })
    })

    it("null si no hay partidos entre esas fechas", () => {
        expect(rangeFromDates(ts, new Date(2026, 5, 3), new Date(2026, 5, 3, 23, 59))).toBeNull()
        expect(rangeFromDates(ts, new Date(2026, 6, 1), null)).toBeNull()
        expect(rangeFromDates([], null, null)).toBeNull()
    })
})

describe("createRangeWheelHandler", () => {
    const setup = (initial: IndexRange, count = 100) => {
        let range = initial
        const setRange = vi.fn((r: IndexRange) => { range = r })
        const handler = createRangeWheelHandler({
            count: () => count,
            range: () => range,
            setRange,
            minSize: 3,
            pxPerPoint: () => 10,
            anchorAt: () => 0.5,
        })
        const wheel = (init: Partial<WheelEvent>) => {
            const e = { deltaX: 0, deltaY: 0, deltaMode: 0, ctrlKey: false, metaKey: false, shiftKey: false, preventDefault: vi.fn(), ...init } as unknown as WheelEvent
            handler(e)
            return e
        }
        return { wheel, setRange, get range() { return range } }
    }

    it("la rueda normal no se toca (mueve la página)", () => {
        const t = setup({ start: 0, end: 49 })
        const e = t.wheel({ deltaY: 100 })
        expect(e.preventDefault).not.toHaveBeenCalled()
        expect(t.setRange).not.toHaveBeenCalled()
    })

    it("Ctrl + rueda: zoom (y no deja que el navegador haga zoom de la página)", () => {
        const t = setup({ start: 0, end: 99 })
        const e = t.wheel({ deltaY: -100, ctrlKey: true })
        expect(e.preventDefault).toHaveBeenCalled()
        expect(rangeSize(t.range)).toBeLessThan(100)
    })

    it("el pellizco del trackpad (pasitos pequeños) se acumula hasta que se nota", () => {
        // Con 10 a la vista, cada partido es un 10 %: unos pocos pasitos no llegan
        const t = setup({ start: 40, end: 49 })
        for (let i = 0; i < 3; i++) t.wheel({ deltaY: -0.5, ctrlKey: true })
        expect(t.setRange).not.toHaveBeenCalled()
        for (let i = 0; i < 20; i++) t.wheel({ deltaY: -0.5, ctrlKey: true })
        expect(t.setRange).toHaveBeenCalled()
    })

    it("pasarse del tope no deja un tramo muerto al volver", () => {
        const t = setup({ start: 0, end: 99 })
        t.wheel({ deltaY: 100, ctrlKey: true })
        t.wheel({ deltaY: 100, ctrlKey: true })
        expect(t.setRange).not.toHaveBeenCalled()
        t.wheel({ deltaY: -100, ctrlKey: true })
        expect(t.setRange).toHaveBeenCalledTimes(1)
    })

    it("rueda horizontal: desplaza un punto cada 10 px, acumulando los restos", () => {
        const t = setup({ start: 10, end: 19 })
        t.wheel({ deltaX: 6 })
        expect(t.setRange).not.toHaveBeenCalled()
        t.wheel({ deltaX: 6 })
        expect(t.range).toEqual({ start: 11, end: 20 })
        t.wheel({ deltaX: -25 })
        expect(t.range).toEqual({ start: 9, end: 18 })
    })

    it("Mayús + rueda vertical también desplaza; sin zoom no hay nada que desplazar", () => {
        const t = setup({ start: 10, end: 19 })
        t.wheel({ deltaY: 30, shiftKey: true })
        expect(t.range).toEqual({ start: 13, end: 22 })
        const all = setup({ start: 0, end: 99 })
        const e = all.wheel({ deltaX: 50 })
        expect(e.preventDefault).not.toHaveBeenCalled()
    })
})
