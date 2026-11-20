/** Ventana de una gráfica sincronizada con fechas y atajos (useChartWindow) */
import { describe, expect, it } from "vitest"
import { nextTick, ref } from "vue"
import { fullRange, lastRange } from "../src/lib/chartRange"
import { useChartWindow, type ChartWindowPreset } from "../src/composables/useChartWindow"

// Partidos: 3 noches de 3 partidos (21:00, 21:30, 22:00) el 1, 10 y 20 de junio, y 2 el 28
const at = (d: number, h: number, m = 0) => new Date(2026, 5, d, h, m).getTime() / 1000
const NIGHT = (d: number) => [at(d, 21), at(d, 21, 30), at(d, 22)]
const TS = [...NIGHT(1), ...NIGHT(10), ...NIGHT(20), at(28, 21), at(28, 21, 30)]

const PRESETS: ChartWindowPreset[] = [
    { key: "all", label: "Todo", range: (ts) => fullRange(ts.length) },
    { key: 5, label: "Últ. 5", range: (ts) => lastRange(ts.length, 5) },
]

describe("useChartWindow", () => {
    const setup = (ts = TS) => {
        const timestamps = ref(ts)
        return { timestamps, win: useChartWindow({ timestamps, presets: PRESETS, initialPreset: 5 }) }
    }

    it("empieza en el atajo inicial, con sus fechas en el selector", () => {
        const { win } = setup()
        expect(win.range.value).toEqual({ start: 6, end: 10 })
        expect(win.activePreset.value).toBe(5)
        expect(win.dateFilter.value).toEqual({ startDate: "20/06/2026", endDate: "28/06/2026" })
    })

    it("mover la ventana cambia las fechas, y a mitad de noche no salta al día entero", async () => {
        const { win } = setup()
        // Del 2º al 3º partido de la noche del 10
        win.setRange({ start: 4, end: 5 })
        await nextTick()
        expect(win.dateFilter.value).toEqual({ startDate: "10/06/2026", endDate: "10/06/2026" })
        expect(win.range.value).toEqual({ start: 4, end: 5 })
        expect(win.activePreset.value).toBeNull()
        expect(win.updateMode.value).toBe("none")
    })

    it("elegir fechas mueve la ventana (días enteros); sin partidos en ellas, null", async () => {
        const { win } = setup()
        win.setDates({ startDate: "01/06/2026", endDate: "10/06/2026" })
        await nextTick()
        expect(win.range.value).toEqual({ start: 0, end: 5 })
        win.setDates({ startDate: "02/06/2026", endDate: "05/06/2026" })
        await nextTick()
        expect(win.range.value).toBeNull()
        expect(win.slice(TS)).toEqual([])
        // Borrar las fechas: todo
        win.setDates({ startDate: "", endDate: "" })
        await nextTick()
        expect(win.range.value).toEqual({ start: 0, end: 10 })
        expect(win.activePreset.value).toBe("all")
    })

    it("elegir las mismas fechas que ya enseña amplía una ventana a mitad de noche al día entero", async () => {
        const { win } = setup()
        win.setRange({ start: 4, end: 5 })
        await nextTick()
        win.setDates({ startDate: "10/06/2026", endDate: "10/06/2026" })
        await nextTick()
        expect(win.range.value).toEqual({ start: 3, end: 5 })
    })

    it("atajos, ver todo y lo que se ve", async () => {
        const { win } = setup()
        win.showAll()
        expect(win.activePreset.value).toBe("all")
        win.setPreset(5)
        expect(win.range.value).toEqual({ start: 6, end: 10 })
        expect(win.activePreset.value).toBe(5)
        win.showAll()
        expect(win.activePreset.value).toBe("all")
        win.setRange({ start: 1, end: 2 })
        expect(win.slice(["a", "b", "c", "d"])).toEqual(["b", "c"])
    })

    it("con otros datos vuelve al inicio; con los mismos no toca la ventana", async () => {
        const { win, timestamps } = setup()
        win.setRange({ start: 0, end: 2 })
        await nextTick()
        timestamps.value = [...TS]
        await nextTick()
        expect(win.range.value).toEqual({ start: 0, end: 2 })
        timestamps.value = TS.slice(0, 6)
        await nextTick()
        // Los 5 últimos de los nuevos
        expect(win.range.value).toEqual({ start: 1, end: 5 })
        expect(win.updateMode.value).toBeUndefined()
        timestamps.value = []
        await nextTick()
        expect(win.range.value).toBeNull()
    })
})
