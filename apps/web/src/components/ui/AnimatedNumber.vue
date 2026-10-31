<script setup lang="ts">
/**
 * Número que cuenta desde 0 (o desde el valor anterior) cuando entra en pantalla: espera a que
 * se vea de verdad (bien dentro, no asomando por abajo) para que la cuenta no pase sin verse.
 * Si el valor cambia después, vuelve a animar desde donde estaba.
 * Admite texto no numérico (p. ej. "Oro IV"): entonces solo lo muestra.
 */
import { computed, ref, watch } from "vue"
import { useInView } from "@/composables/useInView"

const props = withDefaults(defineProps<{
    value?: number | string | null
    decimals?: number
    /** se añade detrás del número ("%", " OVR"…) */
    suffix?: string
    prefix?: string
    duration?: number
    /** separador de miles */
    grouping?: boolean
}>(), { value: 0, decimals: 0, suffix: "", prefix: "", duration: 1600, grouping: true })

const numeric = computed(() => (typeof props.value === "number" && Number.isFinite(props.value) ? props.value : null))
const text = computed(() => (props.value === null || props.value === undefined ? "" : String(props.value)))

// Con el número entero a la vista (95%, por los medios píxeles) y por encima del 15% inferior de la
// pantalla, tanto al cargar como al hacer scroll: así se le ve contar en vez de pillarlo terminado
const { target, inView } = useInView({ threshold: 0.95, rootMargin: "0px 0px -15% 0px" })
const displayed = ref(0)
let frame = 0
let from = 0

// toLocaleString con opciones crea un Intl.NumberFormat en cada llamada, y aquí se llama
// en cada fotograma de cada número animado: se crea uno y se reutiliza
const formatter = computed(() => new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals,
    useGrouping: props.grouping
}))
const format = (n: number) => formatter.value.format(n)

// Suave al final pero sin dar casi todo el salto de golpe (out-quad): con out-cubic el número
// llegaba casi al final en las primeras décimas y la cuenta apenas se apreciaba
const ease = (t: number) => 1 - (1 - t) * (1 - t)

const run = (to: number) => {
    cancelAnimationFrame(frame)
    const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced || props.duration <= 0) { displayed.value = to; return }
    const start = performance.now()
    const origin = from
    const step = (now: number) => {
        const t = Math.min(1, (now - start) / props.duration)
        displayed.value = origin + (to - origin) * ease(t)
        if (t < 1) frame = requestAnimationFrame(step)
        else from = to
    }
    frame = requestAnimationFrame(step)
}

watch([inView, numeric], ([visible, value]) => {
    if (!visible || value === null) return
    run(value)
}, { immediate: true })
</script>

<template>
    <span ref="target" class="tabular-nums">
        <template v-if="numeric === null">{{ text }}</template>
        <template v-else>{{ prefix }}{{ format(displayed) }}{{ suffix }}</template>
    </span>
</template>
