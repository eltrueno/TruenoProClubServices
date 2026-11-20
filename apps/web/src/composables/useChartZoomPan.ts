import type { Chart } from "chart.js"
import type { Ref } from "vue"
import { createRangeWheelHandler, panRange, rangeSize, sameRange, type IndexRange } from "../lib/chartRange"

/**
 * Zoom y desplazamiento sobre una gráfica de Chart.js con ventana (ver useChartWindow):
 * - Ctrl (o ⌘) + rueda, o pellizcar en el trackpad: zoom alrededor del ratón.
 * - Rueda horizontal (o Mayús + rueda): desplazar. La rueda normal sigue moviendo la página.
 * - Con zoom, arrastrar con el ratón: desplazar. En táctil no, que ahí deslizar el dedo recorre
 *   los puntos (tooltip) y mueve la página; para eso está el navegador de debajo.
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

    const onPointerDown = (e: PointerEvent) => {
        suppressClick = false
        drag = null
        const c = chart()
        const r = range.value
        if (!enabled() || e.pointerType !== "mouse" || e.button !== 0 || !c || e.target !== c.canvas || !r) return
        if (rangeSize(r) >= count()) return // sin zoom no hay nada que mover
        drag = { id: e.pointerId, x: e.clientX, range: r, moved: false }
    }

    const onPointerMove = (e: PointerEvent) => {
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
