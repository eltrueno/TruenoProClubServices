<script setup lang="ts" generic="T extends string">
/**
 * Toggle de N posiciones (normalmente 3: izquierda / centro / derecha), como el selector
 * de tema de Mi cuenta: pista redondeada y un "pulgar" que se desliza hasta la opción activa.
 * Cada opción puede llevar icono, texto o ambos. v-model: el `value` de la opción activa.
 * El icono puede ser un componente SVG (`icon`) o el contenido de un SVG de 24×24 relleno (`svg`,
 * p. ej. un path de Heroicons o de lib/kpiIcons). `tone="primary"`: la pastilla en el color del club
 * (para elegir equipo, periodo… donde la opción activa tiene que destacar). Con el teclado, las
 * flechas (e Inicio / Fin) cambian de opción, como en un grupo de radios.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from "vue"

export interface ToggleOption<V extends string = string> {
    value: V
    label: string
    /** componente SVG (import con `?component`) */
    icon?: Component
    /** o el contenido de un SVG 24×24 relleno (paths): se pinta con fill="currentColor" */
    svg?: string
    /** true = solo icono, el texto queda en el tooltip / aria-label */
    iconOnly?: boolean
    disabled?: boolean
}

const props = withDefaults(defineProps<{
    modelValue: T
    options: ToggleOption<T>[]
    size?: "xs" | "sm" | "md"
    /** reparte las opciones a todo el ancho */
    block?: boolean
    /** "primary": pastilla en el color del club y texto claro en la activa */
    tone?: "default" | "primary"
    /** nombre del grupo para lectores de pantalla */
    label?: string
}>(), { size: "md", block: false, tone: "default" })
const emit = defineEmits<{ (e: "update:modelValue", value: T): void }>()

const track = ref<HTMLDivElement | null>(null)
const buttons = ref<HTMLButtonElement[]>([])
const thumb = ref({ left: 0, width: 0, ready: false })

const activeIndex = computed(() => props.options.findIndex((o) => o.value === props.modelValue))

/** Coloca el pulgar bajo el botón activo (valor/opciones nuevas o cambio de tamaño) */
const place = async () => {
    await nextTick()
    const btn = buttons.value[activeIndex.value]
    if (!btn || !track.value) { thumb.value.ready = false; return }
    thumb.value = { left: btn.offsetLeft, width: btn.offsetWidth, ready: true }
}
watch(() => [props.modelValue, props.options], place, { deep: true })
let resizeObserver: ResizeObserver | null = null
onMounted(() => {
    place()
    if (track.value) {
        resizeObserver = new ResizeObserver(place)
        resizeObserver.observe(track.value)
    }
})
onBeforeUnmount(() => resizeObserver?.disconnect())

const select = (o: ToggleOption<T>) => { if (!o.disabled && o.value !== props.modelValue) emit("update:modelValue", o.value) }

/** Flechas / Inicio / Fin: a la opción siguiente (saltando las desactivadas) y con el foco en ella */
function onKey(e: KeyboardEvent) {
    const enabled = props.options.map((o, i) => ({ o, i })).filter((x) => !x.o.disabled)
    if (!enabled.length) return
    const at = enabled.findIndex((x) => x.i === activeIndex.value)
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? enabled[(at + 1) % enabled.length]
        : e.key === "ArrowLeft" || e.key === "ArrowUp" ? enabled[(at - 1 + enabled.length) % enabled.length]
            : e.key === "Home" ? enabled[0] : e.key === "End" ? enabled[enabled.length - 1] : null
    if (!next) return
    e.preventDefault()
    select(next.o)
    buttons.value[next.i]?.focus()
}

const SIZES = {
    xs: { pad: "p-0.5", thumb: "top-0.5 bottom-0.5", btn: "h-7 px-2.5 text-[10px] gap-1", icon: "size-3.5" },
    sm: { pad: "p-0.5", thumb: "top-0.5 bottom-0.5", btn: "h-8 px-3 text-[11px] gap-1.5", icon: "size-4" },
    md: { pad: "p-1", thumb: "top-1 bottom-1", btn: "h-10 px-4 text-xs gap-2", icon: "size-5" }
}
</script>

<template>
    <div
        ref="track"
        role="radiogroup"
        :aria-label="label"
        class="relative inline-flex items-center rounded-2xl bg-base-300 select-none shadow-inner-xl"
        @keydown="onKey"
        :class="[SIZES[size].pad, block ? 'flex w-full' : '']"
    >
        <!-- pulgar -->
        <span
            aria-hidden="true"
            class="absolute rounded-2xl shadow-lg transition-[left,width] duration-300 ease-out"
            :class="[tone === 'primary' ? 'bg-primary' : 'bg-base-100', SIZES[size].thumb, { 'opacity-0': !thumb.ready }]"
            :style="{ left: `${thumb.left}px`, width: `${thumb.width}px` }"
        ></span>

        <button
            v-for="o in options"
            :key="o.value"
            :ref="(el) => { if (el) buttons[options.indexOf(o)] = el as HTMLButtonElement }"
            type="button"
            role="radio"
            :aria-checked="o.value === modelValue"
            :tabindex="o.value === modelValue ? 0 : -1"
            :aria-label="o.label"
            :title="o.iconOnly ? o.label : undefined"
            :disabled="o.disabled"
            class="relative z-10 inline-flex items-center justify-center rounded-2xl font-bold uppercase tracking-wide whitespace-nowrap transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            :class="[
                SIZES[size].btn,
                block ? 'flex-1' : '',
                o.iconOnly ? (size === 'md' ? 'w-14 px-0' : size === 'sm' ? 'w-10 px-0' : 'w-8 px-0') : '',
                o.value === modelValue
                    ? (tone === 'primary' ? 'text-primary-content' : 'text-primary')
                    : 'text-base-content/60 hover:text-base-content'
            ]"
            @click="select(o)"
        >
            <component :is="o.icon" v-if="o.icon" :class="SIZES[size].icon" aria-hidden="true" />
            <svg v-else-if="o.svg" :class="SIZES[size].icon" class="shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" v-html="o.svg"></svg>
            <span v-if="!o.iconOnly">{{ o.label }}</span>
        </button>
    </div>
</template>
