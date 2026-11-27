<script setup lang="ts">
/**
 * Estado vacío común a toda la web (sin resultados, sin datos, error…): icono o ilustración, título,
 * una frase y, si hace falta, una acción (slot por defecto: un botón, un enlace…).
 *
 * - `icon`: el contenido de un SVG 24×24 de contorno (paths de Heroicons outline), o uno de los
 *   nombres de ICONS (search, compare, calendar, trophy, error, ball).
 * - `illustration`: una imagen (las de /illustrations) en lugar del icono, para los vacíos grandes.
 * - `compact`: para dentro de una tarjeta (menos aire y sin ilustración).
 */
import { computed } from "vue"

const props = withDefaults(defineProps<{
    title: string
    text?: string
    icon?: string
    illustration?: string
    compact?: boolean
    tone?: "neutral" | "error"
}>(), { compact: false, tone: "neutral" })

const ICONS: Record<string, string> = {
    search: "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z",
    compare: "M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
    calendar: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5",
    trophy: "M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0",
    error: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
    ball: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.5 3.5 2.55-1.34 4.12H9.84L8.5 10.05 12 7.5Z",
}
const path = computed(() => (props.icon ? ICONS[props.icon] ?? props.icon : ICONS.search))
</script>

<template>
    <div class="empty-state flex flex-col items-center text-center" :class="compact ? 'gap-2 py-6 px-4' : 'gap-3 py-10 sm:py-14 px-6'" role="status">
        <img v-if="illustration && !compact" :src="illustration" alt="" class="w-full max-w-56 sm:max-w-64 mb-2 select-none pointer-events-none" />
        <span v-else class="grid place-items-center rounded-2xl" :class="[compact ? 'size-10' : 'size-14', tone === 'error' ? 'bg-error/10 text-error' : 'bg-base-content/5 text-base-content/50']" aria-hidden="true">
            <svg :class="compact ? 'size-5' : 'size-7'" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" :d="path" /></svg>
        </span>
        <p class="font-black" :class="compact ? 'text-sm' : 'text-lg'">{{ title }}</p>
        <p v-if="text" class="text-sm text-base-content/60 max-w-sm">{{ text }}</p>
        <div v-if="$slots.default" class="mt-1"><slot /></div>
    </div>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
    .empty-state { animation: rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
}
@keyframes rise { from { opacity: 0; translate: 0 0.5rem; } }
</style>
