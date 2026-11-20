/**
 * Ventana visible de una gráfica (zoom y desplazamiento), por índices de sus puntos ordenados
 * del más antiguo al más nuevo: `start` y `end` incluidos. La usan el navegador de debajo de la
 * gráfica de Evolución (ChartRangeNavigator) y la rueda / el arrastre sobre la propia gráfica.
 *
 * Se trabaja por partidos y no por fechas porque en una noche se juegan muchos: por fechas no se
 * podría acercar a media sesión.
 */
export interface IndexRange {
    start: number
    end: number
}

/** Todos los puntos */
export const fullRange = (count: number): IndexRange => ({ start: 0, end: Math.max(0, count - 1) })

/** Los `n` más recientes */
export const lastRange = (count: number, n: number): IndexRange => ({ start: Math.max(0, count - n), end: Math.max(0, count - 1) })

/** Puntos visibles */
export const rangeSize = (range: IndexRange) => range.end - range.start + 1

/** Lo mínimo que se puede ver de una vez (o todos, si hay menos) */
const minSizeFor = (count: number, minSize: number) => Math.max(1, Math.min(minSize, count))

/** Una ventana de `size` puntos que empieza (más o menos) en `start`, movida para que quepa entera */
const place = (start: number, size: number, count: number): IndexRange => {
    const s = Math.min(Math.max(0, Math.round(start)), Math.max(0, count - size))
    return { start: s, end: s + size - 1 }
}

export const sameRange = (a: IndexRange | null | undefined, b: IndexRange | null | undefined) =>
    !!a && !!b && a.start === b.start && a.end === b.end

/**
 * La ventana entre dos puntos (con decimales, en cualquier orden), de al menos `minSize` puntos
 * (si el trozo es más pequeño, se agranda alrededor de su centro)
 */
export function rangeBetween(a: number, b: number, count: number, minSize: number): IndexRange {
    const lo = Math.max(0, Math.round(Math.min(a, b)))
    const hi = Math.min(count - 1, Math.round(Math.max(a, b)))
    const size = Math.min(count, Math.max(hi - lo + 1, minSizeFor(count, minSize)))
    return place((lo + hi) / 2 - (size - 1) / 2, size, count)
}

/** Mueve la ventana `delta` puntos (negativo = hacia el pasado) sin cambiar su tamaño */
export const panRange = (range: IndexRange, delta: number, count: number): IndexRange =>
    place(range.start + delta, Math.min(rangeSize(range), count), count)

/**
 * Acerca (`factor` < 1) o aleja (> 1) la ventana dejando quieto el punto que hay en `anchor`
 * (0 = su borde izquierdo, 0.5 = el centro, 1 = el derecho).
 */
export function zoomRange(range: IndexRange, factor: number, count: number, minSize: number, anchor = 0.5): IndexRange {
    if (count <= 0) return fullRange(count)
    const size = rangeSize(range)
    const next = Math.min(count, Math.max(minSizeFor(count, minSize), Math.round(size * factor)))
    // Una ventana ya más pequeña que el mínimo (p. ej. un solo día en el selector): acercar no la agranda
    if (factor < 1 && next > size) return range
    const a = Math.min(1, Math.max(0, anchor))
    const pivot = range.start + a * (size - 1)
    return place(pivot - a * (next - 1), next, count)
}

/**
 * Mueve un borde a `value` respetando el tamaño mínimo (el otro borde no se toca). Nunca lo
 * mueve al revés de lo pedido, aunque la ventana ya sea más pequeña que el mínimo.
 */
export function moveEdge(range: IndexRange, edge: "start" | "end", value: number, count: number, minSize: number): IndexRange {
    const gap = minSizeFor(count, minSize) - 1
    const v = Math.round(value)
    return edge === "start"
        ? { start: Math.max(0, Math.min(v, Math.max(range.start, range.end - gap))), end: range.end }
        : { start: range.start, end: Math.min(count - 1, Math.max(v, Math.min(range.end, range.start + gap))) }
}

/**
 * Los partidos entre dos fechas (`timestamps` en segundos y de menor a mayor; los límites
 * incluidos). null si no hay ninguno.
 */
export function rangeFromDates(timestamps: number[], from: Date | null, to: Date | null): IndexRange | null {
    const fromS = from ? from.getTime() / 1000 : -Infinity
    const toS = to ? to.getTime() / 1000 : Infinity
    const start = timestamps.findIndex((t) => t >= fromS)
    if (start === -1) return null
    let end = -1
    for (let i = timestamps.length - 1; i >= start; i--) {
        if (timestamps[i] <= toS) {
            end = i
            break
        }
    }
    return end >= start ? { start, end } : null
}

export interface RangeWheelTarget {
    /** puntos que hay en total */
    count: () => number
    range: () => IndexRange | null
    setRange: (range: IndexRange) => void
    minSize: number
    /** píxeles entre dos puntos seguidos, para que desplazar siga al dedo o a la rueda */
    pxPerPoint: () => number
    /** dónde está el ratón respecto a la ventana: 0 = su borde izquierdo, 1 = el derecho */
    anchorAt: (e: WheelEvent) => number
}

/**
 * Rueda del ratón / trackpad sobre una gráfica con ventana:
 * - Ctrl (o ⌘) + rueda, o pellizcar en el trackpad: zoom alrededor del ratón.
 * - Rueda horizontal (o Mayús + rueda): desplazar.
 * La rueda normal no se toca: sigue moviendo la página.
 * Los trackpads mandan muchos movimientos pequeños: se acumulan hasta que llegan a un punto.
 */
export function createRangeWheelHandler(target: RangeWheelTarget) {
    let zoomAcc = 1
    let panAcc = 0
    return (e: WheelEvent) => {
        const count = target.count()
        const range = target.range()
        if (count < 2 || !range) return
        const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1
        const dx = e.deltaX * unit
        const dy = e.deltaY * unit

        if (e.ctrlKey || e.metaKey) {
            // Si no, el navegador hace zoom de toda la página
            e.preventDefault()
            panAcc = 0
            const size = rangeSize(range)
            // Sin pasarse de los topes: si no, al volver, los primeros movimientos no harían nada
            const lowest = Math.min(1, minSizeFor(count, target.minSize) / size)
            zoomAcc = Math.min(count / size, Math.max(lowest, zoomAcc * Math.exp(Math.max(-100, Math.min(100, dy)) * 0.005)))
            const next = zoomRange(range, zoomAcc, count, target.minSize, target.anchorAt(e))
            if (!sameRange(next, range)) {
                target.setRange(next)
                zoomAcc = 1
            }
            return
        }

        const horizontal = e.shiftKey ? dx || dy : Math.abs(dx) > Math.abs(dy) ? dx : 0
        if (!horizontal || rangeSize(range) >= count) return
        e.preventDefault()
        zoomAcc = 1
        panAcc += horizontal
        const step = Math.max(1, target.pxPerPoint())
        const delta = Math.trunc(panAcc / step)
        if (delta) {
            panAcc -= delta * step
            const next = panRange(range, delta, count)
            if (!sameRange(next, range)) target.setRange(next)
            else panAcc = 0
        }
    }
}
