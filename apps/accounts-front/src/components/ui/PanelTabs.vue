<script setup lang="ts">
/**
 * Pestañas con icono (mismo estilo que el índice de la cuenta). En móvil, solo la activa
 * enseña el texto; en escritorio, todas. `count` pone un contador al lado (p. ej. pendientes).
 *
 * Teclado: las flechas (e Inicio/Fin) mueven el foco entre pestañas y Enter/Espacio la elige
 * ("selección por activación"): elegir una cambia la URL, así que no se hace solo con mover
 * el foco. Al entrar con Tab el foco cae en la elegida.
 */
export interface PanelTab { id: string; label: string; icon: string; count?: number }
const props = defineProps<{ tabs: PanelTab[]; modelValue: string; label: string }>()
const emit = defineEmits<{ "update:modelValue": [id: string] }>()

function onKey(e: KeyboardEvent) {
    const buttons = [...((e.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]'))]
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (i < 0) return
    const target = e.key === "ArrowRight" ? buttons[(i + 1) % buttons.length]
        : e.key === "ArrowLeft" ? buttons[(i - 1 + buttons.length) % buttons.length]
            : e.key === "Home" ? buttons[0]
                : e.key === "End" ? buttons[buttons.length - 1]
                    : null
    if (!target) return
    e.preventDefault()
    target.focus()
}

const select = (id: string) => { if (id !== props.modelValue) emit("update:modelValue", id) }
</script>

<template>
    <div role="tablist" :aria-label="label" @keydown="onKey"
        class="sticky top-0 z-20 -mx-4 px-4 sm:mx-0 sm:px-2 py-2 bg-base-100/90 backdrop-blur border-b border-base-content/10 sm:rounded-box sm:border sm:bg-base-200/80 flex items-center justify-between sm:justify-start gap-1 sm:gap-2">
        <button v-for="t in tabs" :id="`tab-${t.id}`" :key="t.id" type="button" role="tab"
            :aria-selected="modelValue === t.id" :tabindex="modelValue === t.id ? 0 : -1"
            :aria-label="t.label" :title="t.label"
            class="tab-pill btn rounded-full gap-2 transition-[padding,background-color] duration-200 motion-reduce:transition-none"
            :class="modelValue === t.id ? 'btn-primary px-4' : 'btn-ghost text-base-content/75 max-sm:btn-square'"
            @click="select(t.id)">
            <span class="relative">
                <svg class="size-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" :d="t.icon" />
                </svg>
                <span v-if="t.count && modelValue !== t.id" class="sm:hidden absolute -top-1.5 -right-2 badge badge-warning badge-xs px-1 font-bold" aria-hidden="true">{{ t.count }}</span>
            </span>
            <span class="text-sm font-bold" :class="modelValue === t.id ? '' : 'max-sm:hidden'">{{ t.label }}</span>
            <span v-if="t.count" class="badge badge-sm font-bold" :class="[modelValue === t.id ? 'bg-white/20 border-0 text-inherit' : 'badge-warning', modelValue === t.id ? '' : 'max-sm:hidden']">
                {{ t.count }}<span class="sr-only"> pendientes</span>
            </span>
        </button>
    </div>
</template>

<style scoped>
/*
 * La elegida no se marca solo con color: lleva además una raya debajo. Es un borde en un
 * pseudo-elemento (el modo de alto contraste quita fondos y sombras, pero no bordes).
 */
.tab-pill {
    position: relative;
}
.tab-pill[aria-selected="true"]::after {
    content: "";
    position: absolute;
    inset: auto 30% -0.3rem;
    border-block-end: 3px solid currentColor;
    border-radius: 2px;
    opacity: 0.8;
}
.tab-pill.btn-primary[aria-selected="true"]::after {
    border-color: var(--color-primary);
}
</style>
