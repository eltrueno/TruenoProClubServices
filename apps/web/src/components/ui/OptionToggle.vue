<script setup lang="ts" generic="T extends string">
/**
 * Toggle de N posiciones (normalmente 3: izquierda / centro / derecha), como el selector
 * de tema de Mi cuenta: pista redondeada y un "pulgar" que se desliza hasta la opción activa.
 * Cada opción puede llevar icono, texto o ambos. v-model: el `value` de la opción activa.
 */
import { computed, nextTick, onMounted, ref, watch, type Component } from "vue"

export interface ToggleOption<V extends string = string> {
    value: V
    label: string
    /** componente SVG (import con `?component`) */
    icon?: Component
    /** true = solo icono, el texto queda en el tooltip / aria-label */
    iconOnly?: boolean
    disabled?: boolean
}

const props = withDefaults(defineProps<{
    modelValue: T
    options: ToggleOption<T>[]
    size?: "sm" | "md"
    /** reparte las opciones a todo el ancho */
    block?: boolean
}>(), { size: "md", block: false })
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
onMounted(() => {
    place()
    if (track.value) new ResizeObserver(place).observe(track.value)
})

const select = (o: ToggleOption<T>) => { if (!o.disabled && o.value !== props.modelValue) emit("update:modelValue", o.value) }

const SIZES = {
    sm: { pad: "p-0.5", thumb: "top-0.5 bottom-0.5", btn: "h-8 px-3 text-[11px] gap-1.5", icon: "size-4" },
    md: { pad: "p-1", thumb: "top-1 bottom-1", btn: "h-10 px-4 text-xs gap-2", icon: "size-5" }
}
</script>

<template>
    <div
        ref="track"
        role="radiogroup"
        class="relative inline-flex items-center rounded-2xl bg-base-300 select-none shadow-inner-xl"
        :class="[SIZES[size].pad, block ? 'flex w-full' : '']"
    >
        <!-- pulgar -->
        <span
            aria-hidden="true"
            class="absolute rounded-2xl bg-base-100 shadow-lg transition-[left,width] duration-300 ease-out"
            :class="[SIZES[size].thumb, { 'opacity-0': !thumb.ready }]"
            :style="{ left: `${thumb.left}px`, width: `${thumb.width}px` }"
        ></span>

        <button
            v-for="o in options"
            :key="o.value"
            :ref="(el) => { if (el) buttons[options.indexOf(o)] = el as HTMLButtonElement }"
            type="button"
            role="radio"
            :aria-checked="o.value === modelValue"
            :aria-label="o.label"
            :title="o.iconOnly ? o.label : undefined"
            :disabled="o.disabled"
            class="relative z-10 inline-flex items-center justify-center rounded-2xl font-bold uppercase tracking-wide whitespace-nowrap transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            :class="[
                SIZES[size].btn,
                block ? 'flex-1' : '',
                o.iconOnly ? (size === 'sm' ? 'w-10 px-0' : 'w-14 px-0') : '',
                o.value === modelValue ? 'text-primary' : 'text-base-content/60 hover:text-base-content'
            ]"
            @click="select(o)"
        >
            <component :is="o.icon" v-if="o.icon" :class="SIZES[size].icon" aria-hidden="true" />
            <span v-if="!o.iconOnly">{{ o.label }}</span>
        </button>
    </div>
</template>
