<script setup lang="ts">
/**
 * Pinta los avisos de lib/toast. Se monta una vez por isla; solo la primera los enseña.
 * El contenedor existe desde el principio (región con nombre y aria-live), así los lectores
 * de pantalla anuncian cada aviso nuevo y lo encuentran siempre en el mismo sitio.
 */
import { nextTick, onMounted, onUnmounted, ref } from "vue"
import { dismissToast, setToastFocus, toasts } from "@/lib/toast"

const owner = ref(false)
const region = ref<HTMLElement | null>(null)
onMounted(() => {
    const w = window as unknown as { __toasterMounted?: boolean }
    if (!w.__toasterMounted) { w.__toasterMounted = true; owner.value = true }
})
onUnmounted(() => {
    if (owner.value) (window as unknown as { __toasterMounted?: boolean }).__toasterMounted = false
})

/** Al cerrar a mano el aviso que tenía el foco: al siguiente, o de vuelta a donde se estaba */
const previousFocus = ref<HTMLElement | null>(null)
function close(id: number) {
    const hadFocus = !!region.value?.contains(document.activeElement)
    dismissToast(id)
    if (!hadFocus) return
    nextTick(() => {
        const next = region.value?.querySelector<HTMLButtonElement>("button[data-toast-close]")
        const target = next ?? previousFocus.value
        target?.focus()
    })
}
function onFocusIn(id: number, e: FocusEvent) {
    const from = e.relatedTarget
    if (from instanceof HTMLElement && !region.value?.contains(from)) previousFocus.value = from
    setToastFocus(id, true)
}

const ALERT = { success: "alert-success", error: "alert-error", info: "alert-info" } as const
</script>

<template>
    <div v-if="owner" ref="region" role="region" aria-label="Avisos"
        class="toast toast-bottom toast-center sm:toast-end z-50 w-full max-w-sm px-4 sm:px-0">
        <div aria-live="polite" class="flex flex-col gap-2">
            <TransitionGroup name="toast">
                <div v-for="t in toasts" :key="t.id" class="alert flex items-center justify-between gap-3 shadow-lg text-sm font-semibold py-3" :class="ALERT[t.kind]"
                    @focusin="onFocusIn(t.id, $event)" @focusout="setToastFocus(t.id, false)">
                    <span class="flex-1">{{ t.text }}</span>
                    <button type="button" data-toast-close class="btn btn-ghost btn-sm btn-circle -my-2 -mr-2" aria-label="Cerrar aviso" @click="close(t.id)">
                        <svg class="size-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </TransitionGroup>
        </div>
    </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: opacity 200ms ease, transform 200ms ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
@media (prefers-reduced-motion: reduce) {
    .toast-enter-active, .toast-leave-active { transition: none; }
}
</style>
