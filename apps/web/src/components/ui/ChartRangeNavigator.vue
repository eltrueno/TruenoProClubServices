<template>
    <div class="flex flex-col gap-2">
        <!--
            Minigráfica con todos los puntos y, encima, la ventana de lo que se ve en la gráfica grande.
            - Los tiradores (dos <input type="range"> nativos: teclado, lector de pantalla y táctil
              de serie) van por fuera de la ventana, así que por estrecha que sea siempre se puede
              agarrar la ventana para moverla. Cambian el zoom.
            - Arrastrar la ventana la mueve; pulsar fuera la centra ahí (y se puede seguir arrastrando).
              En táctil, solo con un toque o un deslizamiento horizontal: el scroll de la página no la mueve.
            - Ctrl + rueda o pellizcar el trackpad: zoom; rueda horizontal o Mayús + rueda: mover.
        -->
        <!--
            Modo "chart": encima, la gráfica grande con solo el tramo elegido. Arrastrar sobre ella
            marca un trozo y al soltar se acerca a él; doble clic, todo; Ctrl + rueda, zoom.
            Es solo para el ratón / el dedo: con teclado, los tiradores y los botones de debajo.
        -->
        <div v-if="variant === 'chart'" ref="zoomArea"
            class="nav-zoom relative rounded-xl bg-base-300/50 dark:bg-base-100/50 ring-1 ring-base-content/10 select-none cursor-crosshair overflow-hidden"
            :style="{ height: height ?? '16rem' }" aria-hidden="true"
            @pointerdown="onBrushDown" @pointermove="onBrushMove" @pointerup="onBrushUp" @pointercancel="cancelBrush"
            @dblclick="showAll" @wheel="onZoomWheel">
            <svg v-if="zoomPaths.line" class="absolute inset-0 size-full" viewBox="0 0 1000 100" preserveAspectRatio="none">
                <path :d="zoomPaths.area" class="fill-primary/15" />
                <path :d="zoomPaths.line" fill="none" class="stroke-primary" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
            </svg>
            <div v-if="brush" class="absolute inset-y-0 bg-primary/20 border-x-2 border-primary"
                :style="{ left: `${Math.min(brush.a, brush.b) * 100}%`, width: `${Math.abs(brush.b - brush.a) * 100}%` }"></div>
        </div>

        <div ref="strip" class="nav-strip relative rounded-xl bg-base-300/50 dark:bg-base-100/50 ring-1 ring-base-content/10 select-none"
            :class="`nav-${variant}`" :style="height && variant !== 'chart' ? { '--nav-h': height } : undefined"
            role="group" :aria-label="label"
            @pointerdown="onPointerDown" @pointermove="onPointerMove"
            @pointerup="onPointerUp" @pointercancel="endDrag" @lostpointercapture="onLostCapture"
            @wheel="onWheel">
            <div ref="plot" class="nav-plot absolute inset-y-0" :class="dragging ? 'cursor-grabbing' : 'cursor-pointer'">
                <!-- La línea entera en gris y, recortada a la ventana, en el color principal -->
                <svg v-if="variant !== 'controls' && values?.length" class="absolute inset-0 size-full" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                        <clipPath :id="clipId">
                            <rect :x="startPct * 10" y="0" :width="(endPct - startPct) * 10" height="100" />
                        </clipPath>
                    </defs>
                    <path :d="paths.area" class="fill-base-content/5" />
                    <path :d="paths.line" fill="none" class="stroke-base-content/55" :stroke-width="lineWidth" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
                    <g :clip-path="`url(#${clipId})`">
                        <path :d="paths.area" class="fill-primary/20" />
                        <path :d="paths.line" fill="none" class="stroke-primary" :stroke-width="lineWidth" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
                    </g>
                </svg>
                <div class="absolute inset-y-1 rounded-md border-2 border-primary ring-1 ring-base-content/30"
                    :class="[variant === 'controls' ? 'bg-primary/30' : 'bg-primary/10', dragging ? 'cursor-grabbing' : 'cursor-grab']"
                    :style="{ left: `${startPct}%`, width: `${endPct - startPct}%` }"></div>
            </div>

            <input type="range" class="nav-thumb nav-thumb-start"
                min="0" :max="last" step="1" :value="model.start"
                :aria-label="startLabel" :aria-valuetext="valueText?.(model.start)"
                @input="onEdgeInput('start', $event)" />
            <input type="range" class="nav-thumb nav-thumb-end"
                min="0" :max="last" step="1" :value="model.end"
                :aria-label="endLabel" :aria-valuetext="valueText?.(model.end)"
                @input="onEdgeInput('end', $event)" />
        </div>

        <div v-if="$slots.summary || summary || zoomButtons" class="flex items-center justify-between gap-3">
            <p class="text-xs text-base-content/75">
                <slot name="summary" :size="size" :count="count">
                    <template v-if="summary">
                        <span class="font-black text-base-content tabular-nums">{{ size }}</span> de {{ count }} {{ count === 1 ? unit.one : unit.many }}
                        <span v-if="hintText" class="hidden md:inline"> · {{ hintText }}</span>
                    </template>
                </slot>
            </p>
            <!-- aria-disabled en vez de disabled: un botón deshabilitado pierde el foco y el teclado se queda en el aire -->
            <div v-if="zoomButtons" class="join shrink-0">
                <button type="button" class="btn btn-sm btn-square btn-ghost join-item" :class="{ 'opacity-40 cursor-default': atMax }"
                    :aria-label="zoomOutLabel" :aria-disabled="atMax" @click="!atMax && zoom(2)">
                    <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                        <path stroke-linecap="round" d="M5 12h14" />
                    </svg>
                </button>
                <button type="button" class="btn btn-sm btn-square btn-ghost join-item" :class="{ 'opacity-40 cursor-default': atMin }"
                    :aria-label="zoomInLabel" :aria-disabled="atMin" @click="!atMin && zoom(0.5)">
                    <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                        <path stroke-linecap="round" d="M12 5v14M5 12h14" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
/**
 * Navegador de una gráfica (zoom y desplazamiento): una minigráfica con todos los puntos y la
 * ventana de los que se ven en la gráfica grande. No sabe nada de partidos ni de Chart.js: solo
 * de índices (ver lib/chartRange.ts). Con useChartWindow se sincroniza con fechas y atajos.
 *
 *   <ChartRangeNavigator v-model="range" :values="valores" :unit="{ one: 'partido', many: 'partidos' }" />
 *
 * - `variant`:
 *   - "mini" (por defecto): la minigráfica, para ponerla debajo de una gráfica de verdad.
 *   - "chart": hace de gráfica ella misma: arriba, en grande, solo el tramo elegido (arrastrar
 *     sobre ella marca un trozo y se acerca a él; doble clic, todo) y debajo la minigráfica.
 *   - "controls": solo la barra con la ventana y los tiradores, sin línea.
 *   `height`: alto de la gráfica grande en "chart" y de la tira en los otros dos.
 * - `values`: para dibujar la minigráfica (sin ellos, solo la ventana).
 * - `count`: cuántos puntos hay, si no se pasan `values`.
 * - Slot `summary` ({ size, count }) para cambiar el texto de debajo.
 * - Expone `zoom(factor)` y `showAll()`.
 */
import { computed, ref, useId } from "vue"
import { createRangeWheelHandler, fullRange, moveEdge, panRange, rangeBetween, rangeSize, sameRange, zoomRange, type IndexRange } from "@/lib/chartRange"

const model = defineModel<IndexRange>({ required: true })

const props = withDefaults(defineProps<{
    /** "mini": minigráfica; "chart": gráfica grande con el tramo elegido + minigráfica; "controls": solo la barra */
    variant?: "mini" | "chart" | "controls"
    /** alto (cualquier medida CSS): el de la gráfica grande en "chart", el de la tira en los demás */
    height?: string
    /** valores de todos los puntos (del más antiguo al más nuevo), para la minigráfica */
    values?: number[]
    /** cuántos puntos hay (si no se pasan `values`) */
    count?: number
    /** lo mínimo que se puede ver de una vez */
    minSize?: number
    /** texto del lector de pantalla para cada punto ("Partido 3 de 40: …") */
    valueText?: (index: number) => string
    /** cómo se llaman los puntos en el texto de debajo */
    unit?: { one: string, many: string }
    /** pista de uso al lado del recuento (solo en pantallas anchas) */
    hint?: string
    /** el texto de debajo ("12 de 40 …") */
    summary?: boolean
    /** botones de − / + */
    zoomButtons?: boolean
    label?: string
    startLabel?: string
    endLabel?: string
    zoomInLabel?: string
    zoomOutLabel?: string
}>(), {
    variant: "mini",
    minSize: 3,
    unit: () => ({ one: "punto", many: "puntos" }),
    hint: undefined,
    summary: true,
    zoomButtons: true,
    label: "Zoom de la gráfica",
    startLabel: "Inicio de lo que se ve",
    endLabel: "Final de lo que se ve",
    zoomInLabel: "Acercar",
    zoomOutLabel: "Alejar",
})

const clipId = `nav-clip-${useId()}`
const lineWidth = 1.5
const hintText = computed(() => props.hint ?? (props.variant === "chart"
    ? "Arrastra sobre la gráfica para acercar un tramo; doble clic para verlo todo"
    : "Arrastra la ventana o sus bordes; Ctrl + rueda para acercar"))
const strip = ref<HTMLElement | null>(null)
const plot = ref<HTMLElement | null>(null)

const count = computed(() => props.values?.length ?? props.count ?? 0)
const last = computed(() => Math.max(0, count.value - 1))
const size = computed(() => rangeSize(model.value))
const startPct = computed(() => (last.value ? (model.value.start / last.value) * 100 : 0))
const endPct = computed(() => (last.value ? (model.value.end / last.value) * 100 : 100))
const atMax = computed(() => size.value >= count.value)
const atMin = computed(() => size.value <= Math.min(props.minSize, count.value))

const set = (next: IndexRange) => {
    if (!sameRange(next, model.value)) model.value = next
}

/** Línea y área de unos valores, de lado a lado del viewBox 0 0 1000 100 */
const buildPaths = (v: number[]) => {
    const n = v.length
    if (n < 2) return { line: "", area: "" }
    let min = Math.min(...v)
    let max = Math.max(...v)
    if (max === min) {
        max += 1
        min -= 1
    }
    const pts = v.map((y, i) => `${((i / (n - 1)) * 1000).toFixed(1)},${(92 - ((y - min) / (max - min)) * 84).toFixed(1)}`)
    const line = `M${pts.join("L")}`
    return { line, area: `${line}L1000,100L0,100Z` }
}

const paths = computed(() => buildPaths(props.values ?? []))

// ── Bordes (inputs nativos) ──
const onEdgeInput = (edge: "start" | "end", e: Event) => {
    const el = e.target as HTMLInputElement
    const next = moveEdge(model.value, edge, Number(el.value), count.value, props.minSize)
    // Si se ha topado con el otro borde el valor no cambia y Vue no lo repintaría
    el.value = String(next[edge])
    set(next)
}

const zoom = (factor: number) => set(zoomRange(model.value, factor, count.value, props.minSize))
const showAll = () => set(fullRange(count.value))

// ── Arrastrar la ventana ──
/** Captura el puntero (si ya no está activo, el navegador lanza un error: se ignora) */
const capture = (el: Element | null | undefined, id: number) => {
    try {
        el?.setPointerCapture(id)
    } catch {
        /* puntero que ya no existe */
    }
}

/** En táctil, cuánto hay que moverse en horizontal para que sea un arrastre y no un toque o scroll */
const TOUCH_SLOP = 6

const pxPerPoint = () => (plot.value?.clientWidth ?? 0) / Math.max(1, last.value)

/** Punto (con decimales) que hay bajo el ratón */
const pointAt = (clientX: number) => {
    const rect = plot.value?.getBoundingClientRect()
    if (!rect?.width) return 0
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * last.value
}

/** La ventana, del mismo tamaño, centrada en el punto `p` */
const centeredAt = (p: number) => panRange(model.value, p - (model.value.start + (size.value - 1) / 2), count.value)

const dragging = ref(false)
let drag: { id: number; x: number; range: IndexRange; inside: boolean; mouse: boolean; moved: boolean } | null = null

const onPointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement
    // Los tiradores son los inputs: de esos se encarga el navegador
    if (e.button !== 0 || target.tagName === "INPUT" || count.value < 2) return
    const p = pointAt(e.clientX)
    // Dentro o fuera de la ventana por la posición, no por el elemento pulsado
    const inside = p >= model.value.start - 0.5 && p <= model.value.end + 0.5
    const mouse = e.pointerType === "mouse"
    let range = model.value
    if (mouse) {
        // Con el ratón, al momento (en táctil se espera: puede ser el inicio de un scroll)
        if (!inside) {
            range = centeredAt(p)
            set(range)
        }
        capture(strip.value, e.pointerId)
        dragging.value = true
        e.preventDefault()
    }
    drag = { id: e.pointerId, x: e.clientX, range, inside, mouse, moved: false }
}

const onPointerMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return
    if (drag.mouse && (e.buttons & 1) === 0) return endDrag(e)
    const dx = e.clientX - drag.x
    if (!drag.moved) {
        if (!drag.mouse && Math.abs(dx) < TOUCH_SLOP) return
        drag.moved = true
        if (!drag.mouse) {
            if (!drag.inside) {
                drag.range = centeredAt(pointAt(drag.x))
                set(drag.range)
            }
            capture(strip.value, e.pointerId)
            dragging.value = true
        }
    }
    const step = pxPerPoint()
    if (!step) return
    set(panRange(drag.range, Math.round(dx / step), count.value))
}

const onPointerUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return
    // Un toque fuera de la ventana: se centra ahí
    if (!drag.mouse && !drag.moved && !drag.inside) set(centeredAt(pointAt(drag.x)))
    endDrag(e)
}

const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return
    drag = null
    dragging.value = false
}

// En táctil el navegador captura el puntero en el elemento tocado; al pasarla a la tira, ese
// elemento la pierde (y el evento sube hasta aquí): eso no es el final del arrastre
const onLostCapture = (e: PointerEvent) => {
    if (e.target === strip.value) endDrag(e)
}

// ── Rueda / trackpad ──
const onWheel = createRangeWheelHandler({
    count: () => count.value,
    range: () => model.value,
    setRange: set,
    get minSize() { return props.minSize },
    pxPerPoint,
    anchorAt: (e) => {
        const { start, end } = model.value
        return end > start ? (pointAt(e.clientX) - start) / (end - start) : 0.5
    },
})

// ── Modo "chart": la gráfica grande, con el tramo elegido ──
const zoomArea = ref<HTMLElement | null>(null)
/** Solo lo que se ve, con su propia escala (así se aprecia el detalle al acercar) */
const zoomPaths = computed(() => buildPaths((props.values ?? []).slice(model.value.start, model.value.end + 1)))

/** Posición del ratón en la gráfica grande, de 0 (izquierda) a 1 (derecha) */
const zoomFrac = (clientX: number) => {
    const rect = zoomArea.value?.getBoundingClientRect()
    if (!rect?.width) return 0
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
}
/** Punto que hay en esa posición */
const zoomPointAt = (frac: number) => model.value.start + frac * (size.value - 1)

/** El trozo que se está marcando (de 0 a 1 en la gráfica grande) */
const brush = ref<{ a: number; b: number } | null>(null)
let brushPtr: { id: number; x: number; mouse: boolean; active: boolean } | null = null

const onBrushDown = (e: PointerEvent) => {
    if (e.button !== 0 || count.value < 2) return
    brushPtr = { id: e.pointerId, x: e.clientX, mouse: e.pointerType === "mouse", active: false }
    if (brushPtr.mouse) {
        brushPtr.active = true
        capture(zoomArea.value, e.pointerId)
        brush.value = { a: zoomFrac(e.clientX), b: zoomFrac(e.clientX) }
        e.preventDefault()
    }
}

const onBrushMove = (e: PointerEvent) => {
    if (!brushPtr || e.pointerId !== brushPtr.id) return
    if (brushPtr.mouse && (e.buttons & 1) === 0) return cancelBrush()
    if (!brushPtr.active) {
        // En táctil, solo si es claramente horizontal (si no, es el scroll de la página)
        if (Math.abs(e.clientX - brushPtr.x) < TOUCH_SLOP) return
        brushPtr.active = true
        capture(zoomArea.value, e.pointerId)
    }
    brush.value = { a: zoomFrac(brushPtr.x), b: zoomFrac(e.clientX) }
}

const onBrushUp = (e: PointerEvent) => {
    if (!brushPtr || e.pointerId !== brushPtr.id) return
    const b = brush.value
    const width = zoomArea.value?.clientWidth ?? 0
    // Un clic (o un trozo de menos de 8 px) no acerca nada
    if (brushPtr.active && b && Math.abs(b.b - b.a) * width >= 8) {
        set(rangeBetween(zoomPointAt(Math.min(b.a, b.b)), zoomPointAt(Math.max(b.a, b.b)), count.value, props.minSize))
    }
    cancelBrush()
}

const cancelBrush = () => {
    brushPtr = null
    brush.value = null
}

const onZoomWheel = createRangeWheelHandler({
    count: () => count.value,
    range: () => model.value,
    setRange: set,
    get minSize() { return props.minSize },
    pxPerPoint: () => (zoomArea.value?.clientWidth ?? 0) / Math.max(1, size.value - 1),
    anchorAt: (e) => zoomFrac(e.clientX),
})

defineExpose({ zoom, showAll })
</script>

<style scoped>
/*
 * Tiradores: dos <input type="range"> encima de la minigráfica. Los inputs no reciben el ratón
 * (pointer-events: none), solo sus tiradores, así que se puede arrastrar la ventana por debajo.
 *
 * Van por fuera de la ventana: la minigráfica deja un tirador de hueco a cada lado y cada input
 * se desplaza un tirador (el de inicio hacia la izquierda, el de final hacia la derecha), así el
 * borde derecho del tirador de inicio cae justo en el inicio de la ventana y el izquierdo del
 * de final, en su final.
 * Medidas cambiables desde fuera: --nav-h (alto), --thumb-w y --thumb-h.
 */
.nav-strip {
    --nav-h: 3rem;
    --thumb-w: 1.5rem;
    --thumb-h: 2.25rem;
    height: var(--nav-h);
    /* El scroll vertical de la página sigue funcionando; el horizontal es para la ventana */
    touch-action: pan-y;
}

/* La gráfica grande del modo "chart": el scroll vertical de la página sigue funcionando */
.nav-zoom {
    touch-action: pan-y;
}

/* La de solo barra, fina (en modo "chart" la tira de debajo es la minigráfica normal) */
.nav-strip.nav-controls {
    --nav-h: 2.25rem;
    --thumb-h: 1.75rem;
}

.nav-plot {
    left: var(--thumb-w);
    right: var(--thumb-w);
}

.nav-thumb {
    -webkit-appearance: none;
    appearance: none;
    position: absolute;
    top: 0;
    width: calc(100% - var(--thumb-w));
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    pointer-events: none;
}

.nav-thumb-start {
    left: 0;
}

.nav-thumb-end {
    left: var(--thumb-w);
}

.nav-thumb:focus {
    outline: none;
}

/* El que tiene el foco, siempre encima */
.nav-thumb:focus-visible {
    z-index: 1;
}

/* WebKit / Blink */
.nav-thumb::-webkit-slider-runnable-track {
    height: 100%;
    border: 0;
    background: transparent;
}

.nav-thumb::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    pointer-events: auto;
    box-sizing: border-box;
    width: var(--thumb-w);
    height: var(--thumb-h);
    margin-top: calc((var(--nav-h) - var(--thumb-h)) / 2);
    border: 0;
    border-radius: 0.5rem;
    background-color: var(--color-primary);
    /* Dos rayitas de agarre */
    background-image: linear-gradient(to right,
            transparent 32%, var(--color-primary-content) 32% 42%,
            transparent 42% 58%, var(--color-primary-content) 58% 68%, transparent 68%);
    background-size: 100% 40%;
    background-position: center;
    background-repeat: no-repeat;
    /* Contorno para que se distinga también sobre el fondo oscuro */
    box-shadow: 0 0 0 1px color-mix(in oklab, var(--color-base-content) 55%, transparent), 0 1px 3px rgb(0 0 0 / 0.3);
    cursor: ew-resize;
}

.nav-thumb:focus-visible::-webkit-slider-thumb {
    box-shadow: 0 0 0 2px var(--color-base-100), 0 0 0 4px var(--color-base-content);
}

/* Firefox (en bloques aparte: si se mezclan con los de WebKit en una lista, se descarta la regla entera) */
.nav-thumb::-moz-range-track {
    height: 100%;
    border: 0;
    background: transparent;
}

.nav-thumb::-moz-range-thumb {
    pointer-events: auto;
    box-sizing: border-box;
    width: var(--thumb-w);
    height: var(--thumb-h);
    border: 0;
    border-radius: 0.5rem;
    background-color: var(--color-primary);
    background-image: linear-gradient(to right,
            transparent 32%, var(--color-primary-content) 32% 42%,
            transparent 42% 58%, var(--color-primary-content) 58% 68%, transparent 68%);
    background-size: 100% 40%;
    background-position: center;
    background-repeat: no-repeat;
    box-shadow: 0 0 0 1px color-mix(in oklab, var(--color-base-content) 55%, transparent), 0 1px 3px rgb(0 0 0 / 0.3);
    cursor: ew-resize;
}

.nav-thumb:focus-visible::-moz-range-thumb {
    box-shadow: 0 0 0 2px var(--color-base-100), 0 0 0 4px var(--color-base-content);
}
</style>
