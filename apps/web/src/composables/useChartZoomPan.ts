import type { Chart } from "chart.js"
import type { Ref } from "vue"
import { createRangeWheelHandler, panRange, rangeSize, sameRange, zoomRange, type IndexRange } from "../lib/chartRange"

/**
 * Zoom y desplazamiento sobre una gráfica de Chart.js con ventana (ver useChartWindow):
 * - Ctrl (o ⌘) + rueda, o pellizcar en el trackpad: zoom alrededor del ratón.
 * - Rueda horizontal (o Mayús + rueda): desplazar. La rueda normal sigue moviendo la página.
 * - Con zoom, arrastrar con el ratón: desplazar. En táctil no, que ahí deslizar el dedo recorre
 *   los puntos (tooltip) y mueve la página; para eso está el navegador de debajo.
 * - En táctil, pellizcar con dos dedos: zoom alrededor de los dedos (y moverlos juntos, desplazar).
 *   El contenedor necesita `touch-action: pan-y` (clase `touch-pan-y`): si no, el pellizco hace
 *   zoom de toda la página.
 *
 * Los eventos van en el contenedor de la gráfica:
 *   const zoomPan = useChartZoomPan({ chart: () => chartRef.value?.chart, range, count, setRange })
 *   <div v-on="zoomPan.listeners"> <Line ref="chartRef" @click="onClick" /> </div>
 * y en el clic de la gráfica: `if (zoomPan.consumeDragClick()) return` (soltar un arrastre no es un clic).
 */
export function useChartZoomPan(options: {
    chart: () => Chart | null | undefined
    range: Ref<IndexRange | null>
    /** puntos que hay en total */
    count: () => number
    setRange: (range: IndexRange) => void
    /** lo mínimo que se puede ver de una vez */
    minSize?: number
    /** p. ej. que no haga nada con pocos puntos */
    enabled?: () => boolean
}) {
    const { chart, range, count, setRange, minSize = 3, enabled = () => true } = options

    /** Píxeles entre dos puntos seguidos en la gráfica */
    const pxPerPoint = () => {
        const width = chart()?.chartArea?.width ?? 0
        return width / Math.max(1, (range.value ? rangeSize(range.value) : 1) - 1)
    }

    const wheel = createRangeWheelHandler({
        count,
        range: () => range.value,
        setRange,
        minSize,
        pxPerPoint,
        anchorAt: (e) => {
            const c = chart()
            if (!c?.chartArea?.width) return 0.5
            const x = e.clientX - c.canvas.getBoundingClientRect().left
            return (x - c.chartArea.left) / c.chartArea.width
        },
    })

    const onWheel = (e: WheelEvent) => {
        if (enabled()) wheel(e)
    }

    let drag: { id: number; x: number; range: IndexRange; moved: boolean } | null = null
    let suppressClick = false

    // ── Pellizco con dos dedos ──
    /** Dedos en la gráfica: id → x */
    const fingers = new Map<number, number>()
    let pinch: { dist: number; mid: number; range: IndexRange; anchor: number; step: number } | null = null
    /** Distancia horizontal entre los dos dedos (con un mínimo, para no dividir casi por cero) */
    const fingerGap = () => {
        const [a, b] = [...fingers.values()]
        return { dist: Math.max(40, Math.abs(a - b)), mid: (a + b) / 2 }
    }

    const onTouchDown = (e: PointerEvent) => {
        fingers.set(e.pointerId, e.clientX)
        const c = chart()
        const r = range.value
        if (fingers.size !== 2 || !enabled() || !c?.chartArea?.width || !r) {
            pinch = null
            return
        }
        const { dist, mid } = fingerGap()
        const x = mid - c.canvas.getBoundingClientRect().left
        pinch = {
            dist,
            mid,
            range: r,
            anchor: Math.min(1, Math.max(0, (x - c.chartArea.left) / c.chartArea.width)),
            step: pxPerPoint(),
        }
        c.tooltip?.setActiveElements([], { x: 0, y: 0 })
    }

    const onTouchMove = (e: PointerEvent) => {
        if (!fingers.has(e.pointerId)) return
        fingers.set(e.pointerId, e.clientX)
        if (!pinch || fingers.size !== 2) return
        const { dist, mid } = fingerGap()
        // Separar los dedos = acercar
        let next = zoomRange(pinch.range, pinch.dist / dist, count(), minSize, pinch.anchor)
        // Moverlos juntos = desplazar (como arrastrar: a la derecha, lo anterior)
        const step = pinch.step * (rangeSize(pinch.range) - 1) / Math.max(1, rangeSize(next) - 1)
        if (step) next = panRange(next, -Math.round((mid - pinch.mid) / step), count())
        if (!sameRange(next, range.value)) setRange(next)
    }

    const onTouchUp = (e: PointerEvent) => {
        fingers.delete(e.pointerId)
        if (fingers.size < 2) pinch = null
    }

    const onPointerDown = (e: PointerEvent) => {
        suppressClick = false
        drag = null
        if (e.pointerType === "touch") return onTouchDown(e)
        const c = chart()
        const r = range.value
        if (!enabled() || e.pointerType !== "mouse" || e.button !== 0 || !c || e.target !== c.canvas || !r) return
        if (rangeSize(r) >= count()) return // sin zoom no hay nada que mover
        drag = { id: e.pointerId, x: e.clientX, range: r, moved: false }
    }

    const onPointerMove = (e: PointerEvent) => {
        if (e.pointerType === "touch") return onTouchMove(e)
        if (!drag || e.pointerId !== drag.id) return
        // Soltó fuera antes de empezar a arrastrar (sin captura, el pointerup no llegó aquí): se acabó
        if ((e.buttons & 1) === 0) {
            drag = null
            return
        }
        const dx = e.clientX - drag.x
        if (!drag.moved) {
            // Un clic con algo de pulso sigue siendo un clic
            if (Math.abs(dx) < 6) return
            drag.moved = true
            try {
                (e.currentTarget as Element | null)?.setPointerCapture(e.pointerId)
            } catch {
                /* puntero que ya no existe: se arrastra igual, sin captura */
            }
            const canvas = chart()?.canvas
            if (canvas) canvas.style.cursor = "grabbing"
        }
        const step = pxPerPoint()
        if (!step) return
        // Arrastrar a la derecha = ver puntos anteriores
        const next = panRange(drag.range, -Math.round(dx / step), count())
        if (!sameRange(next, range.value)) setRange(next)
    }

    const onPointerUp = (e: PointerEvent) => {
        if (e.pointerType === "touch") return onTouchUp(e)
        if (!drag || e.pointerId !== drag.id) return
        if (drag.moved) {
            suppressClick = true
            const canvas = chart()?.canvas
            if (canvas) canvas.style.cursor = "default"
        }
        drag = null
    }

    /** true si el clic que llega es el de soltar un arrastre (y entonces hay que ignorarlo) */
    const consumeDragClick = () => {
        const was = suppressClick
        suppressClick = false
        return was
    }

    return {
        consumeDragClick,
        /** para `v-on` en el contenedor de la gráfica */
        listeners: {
            wheel: onWheel,
            pointerdown: onPointerDown,
            pointermove: onPointerMove,
            pointerup: onPointerUp,
            pointercancel: onPointerUp,
        },
    }
}
