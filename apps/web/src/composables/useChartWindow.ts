import { computed, ref, watch, type Ref } from "vue"
import { fullRange, rangeFromDates, sameRange, type IndexRange } from "../lib/chartRange"

/**
 * Ventana de una gráfica temporal (qué puntos se ven) sincronizada con un selector de fechas
 * (DateRangePicker) y con unos atajos ("Todo", "Últ. 10"...). Va con ChartRangeNavigator (el
 * zoom de debajo de la gráfica) y useChartZoomPan (rueda y arrastre sobre la gráfica).
 *
 *   const win = useChartWindow({ timestamps, presets, initialPreset: 20 })
 *   const visibles = computed(() => win.slice(misPuntos.value))
 *   <DateRangePicker :model-value="win.dateFilter.value" @update:model-value="win.setDates" />
 *   <ChartRangeNavigator v-if="win.range.value" :model-value="win.range.value" @update:model-value="win.setRange" ... />
 *   <Line :update-mode="win.updateMode.value" ... />
 *
 * La ventana va por índices y no por fechas para poder acercarse a media noche de partidos; al
 * moverla, el selector enseña las fechas de su primer y último punto.
 */

export interface DateRangeValue {
    /** DD/MM/YYYY, "" = sin límite */
    startDate: string
    endDate: string
}

export interface ChartWindowPreset {
    key: string | number
    label: string
    /** su ventana, con los timestamps de los puntos (segundos, de menor a mayor) */
    range: (timestamps: number[]) => IndexRange
}

const pad = (n: number) => String(n).padStart(2, "0")

/** Segundos → DD/MM/YYYY (el formato de DateRangePicker) */
export const toPickerDate = (timestamp: number) => {
    const d = new Date(timestamp * 1000)
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

/** DD/MM/YYYY → Date (a las 0:00, o al final del día) */
export const fromPickerDate = (value: string, endOfDay = false) => {
    const [d, m, y] = value ? value.split("/").map(Number) : []
    if (!d || !m || !y) return null
    return endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d)
}

const sameList = (a: number[], b: number[] | undefined) => !!b && a.length === b.length && a.every((v, i) => v === b[i])

export function useChartWindow(options: {
    /** cuándo es cada punto (segundos), de menor a mayor */
    timestamps: Ref<number[]>
    presets?: ChartWindowPreset[]
    /** atajo con el que empieza (y al que vuelve si cambian los datos); sin él, se ve todo */
    initialPreset?: ChartWindowPreset["key"]
}) {
    const { timestamps, presets = [], initialPreset } = options

    /** Lo que se ve: índices de los puntos (null = ninguno entre las fechas elegidas) */
    const range = ref<IndexRange | null>(null)
    const dateFilter = ref<DateRangeValue>({ startDate: "", endDate: "" })
    /**
     * Para el `update-mode` de vue-chartjs: lo que hace el usuario con la ventana se repinta al
     * momento (animar de una ventana a otra deforma la línea, los puntos ya no son los mismos)
     */
    const updateMode = ref<"none" | undefined>(undefined)

    const count = computed(() => timestamps.value.length)

    const setRange = (next: IndexRange | null) => {
        updateMode.value = "none"
        range.value = next
    }

    /** Que el próximo cambio de la gráfica sí se anime (p. ej. al cambiar de métrica) */
    const animateNextUpdate = () => {
        updateMode.value = undefined
    }

    const presetRange = (key: ChartWindowPreset["key"]) => presets.find((p) => p.key === key)?.range(timestamps.value) ?? null
    const initialRange = () => (initialPreset !== undefined ? presetRange(initialPreset) : null) ?? fullRange(count.value)

    // Datos nuevos (otro filtro, o han llegado): la vista de partida. Si son los mismos puntos, no se toca
    watch(timestamps, (ts, prev) => {
        if (sameList(ts, prev) && range.value) return
        updateMode.value = undefined
        range.value = ts.length ? initialRange() : null
    }, { immediate: true })

    /** Fechas del primer y el último punto de la ventana */
    const edgeDates = (r: IndexRange): DateRangeValue | null => {
        const ts = timestamps.value
        if (ts[r.start] === undefined || ts[r.end] === undefined) return null
        return { startDate: toPickerDate(ts[r.start]), endDate: toPickerDate(ts[r.end]) }
    }

    // Ventana → selector de fechas
    watch(range, (r) => {
        const next = r && edgeDates(r)
        if (next && (next.startDate !== dateFilter.value.startDate || next.endDate !== dateFilter.value.endDate)) dateFilter.value = next
    }, { immediate: true })

    /**
     * Selector de fechas → ventana (para su @update:model-value). Siempre se aplica, aunque sean
     * las mismas fechas que ya enseña: así una ventana a mitad de noche se puede ampliar al día entero
     */
    const setDates = (f: DateRangeValue) => {
        dateFilter.value = f
        if (count.value) setRange(rangeFromDates(timestamps.value, fromPickerDate(f.startDate), fromPickerDate(f.endDate, true)))
    }

    /** El atajo que coincide con lo que se ve (el primero de la lista si coinciden varios) */
    const activePreset = computed(() => {
        const r = range.value
        if (!r) return null
        return presets.find((p) => sameRange(p.range(timestamps.value), r))?.key ?? null
    })

    const setPreset = (key: ChartWindowPreset["key"]) => {
        const r = presetRange(key)
        if (r) setRange(r)
    }

    const showAll = () => {
        if (count.value) setRange(fullRange(count.value))
    }

    /** Los elementos de `items` (en el mismo orden que los timestamps) que se ven */
    const slice = <T>(items: T[]): T[] => (range.value ? items.slice(range.value.start, range.value.end + 1) : [])

    return { range, setRange, dateFilter, setDates, updateMode, animateNextUpdate, count, presets, activePreset, setPreset, showAll, slice }
}
