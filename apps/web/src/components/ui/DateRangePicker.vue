<script setup lang="ts">
/**
 * Selector de rango de fechas (calendario de DaisyUI 5 sobre `cally`).
 * v-model: `{ startDate: "DD/MM/YYYY", endDate: "DD/MM/YYYY" }` ("" = sin filtro),
 * el mismo contrato que tenía vue-tailwind-datepicker para no tocar los filtros.
 */
import { computed, onMounted, ref, watch } from "vue"

type Range = { startDate: string; endDate: string }

const props = withDefaults(defineProps<{ modelValue: Range; placeholder?: string; size?: "sm" | "md" }>(), {
    placeholder: "Todas las fechas",
    size: "sm"
})
const emit = defineEmits<{ (e: "update:modelValue", value: Range): void }>()

const ready = ref(false)
onMounted(async () => {
    // Web component: solo en cliente
    await import("cally")
    ready.value = true
})

// ISO (YYYY-MM-DD, lo que usa cally) <-> DD/MM/YYYY (lo que usan los filtros)
const toIso = (dmy: string) => {
    const [d, m, y] = dmy.split("/")
    return d && m && y ? `${y}-${m}-${d}` : ""
}
const fromIso = (iso: string) => {
    const [y, m, d] = iso.split("-")
    return d && m && y ? `${d}/${m}/${y}` : ""
}

const callyValue = computed(() => {
    const s = toIso(props.modelValue.startDate)
    const e = toIso(props.modelValue.endDate)
    return s && e ? `${s}/${e}` : ""
})

const label = computed(() =>
    props.modelValue.startDate && props.modelValue.endDate
        ? `${props.modelValue.startDate} – ${props.modelValue.endDate}`
        : props.placeholder
)

const popover = ref<HTMLDivElement | null>(null)
const popoverId = `drp-${Math.random().toString(36).slice(2, 9)}`

// Selección en curso (cally emite `change` al completar el rango)
const onChange = (ev: Event) => {
    const value = (ev.target as HTMLElement & { value: string }).value ?? ""
    const [s, e] = value.split("/")
    if (!s || !e) return
    emit("update:modelValue", { startDate: fromIso(s), endDate: fromIso(e) })
    popover.value?.hidePopover?.()
}

const clear = () => {
    emit("update:modelValue", { startDate: "", endDate: "" })
    popover.value?.hidePopover?.()
}

// Si el valor cambia desde fuera (atajos, reset) el calendario se coloca en ese mes
const calendar = ref<HTMLElement | null>(null)
watch(callyValue, (v) => {
    if (calendar.value && v) calendar.value.setAttribute("focused-date", v.split("/")[0])
})
</script>

<template>
    <div class="w-full">
        <button
            type="button"
            class="input input-bordered w-full flex items-center justify-between gap-2 cursor-pointer text-left"
            :class="size === 'sm' ? 'input-sm' : ''"
            :popovertarget="popoverId"
            :style="`anchor-name: --${popoverId}`"
        >
            <span class="truncate" :class="{ 'text-base-content/40': !modelValue.startDate }">{{ label }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="size-4 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
            </svg>
        </button>

        <div
            ref="popover"
            :id="popoverId"
            popover
            class="rounded-box bg-base-100 text-base-content border border-base-300 shadow-xl p-2 m-0 w-fit"
            :style="`position-anchor: --${popoverId}; inset: auto; top: calc(anchor(bottom) + 4px); left: anchor(left); position-try-fallbacks: flip-block, flip-inline`"
        >
            <calendar-range
                v-if="ready"
                ref="calendar"
                class="cally"
                :value="callyValue"
                locale="es-ES"
                :months="1"
                first-day-of-week="1"
                @change="onChange"
            >
                <svg aria-label="Anterior" class="size-4" slot="previous" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15.75 19.5 8.25 12l7.5-7.5"></path></svg>
                <svg aria-label="Siguiente" class="size-4" slot="next" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m8.25 4.5 7.5 7.5-7.5 7.5"></path></svg>
                <calendar-month></calendar-month>
            </calendar-range>
            <div class="flex justify-end mt-1">
                <button type="button" class="btn btn-ghost btn-xs" @click="clear">Limpiar</button>
            </div>
        </div>
    </div>
</template>
