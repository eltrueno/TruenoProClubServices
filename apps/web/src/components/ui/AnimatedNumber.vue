<script setup lang="ts">
/**
 * Número que cuenta desde 0 (o desde el valor anterior) cuando entra en pantalla.
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
}>(), { value: 0, decimals: 0, suffix: "", prefix: "", duration: 1100, grouping: true })

const numeric = computed(() => (typeof props.value === "number" && Number.isFinite(props.value) ? props.value : null))
const text = computed(() => (props.value === null || props.value === undefined ? "" : String(props.value)))

const { target, inView } = useInView()
const displayed = ref(0)
let frame = 0
let from = 0

const format = (n: number) =>
    n.toLocaleString("es-ES", {
        minimumFractionDigits: props.decimals,
        maximumFractionDigits: props.decimals,
        useGrouping: props.grouping
    })

// easing suave al final (out-cubic)
const ease = (t: number) => 1 - Math.pow(1 - t, 3)

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
