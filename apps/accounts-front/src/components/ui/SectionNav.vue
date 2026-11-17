<script setup lang="ts">
/**
 * Índice de la página de cuenta en móvil: iconos, y el texto solo en la sección en la que
 * se está. La sección activa se sigue con IntersectionObserver (la alternativa nativa,
 * `scroll-target-group` + `:target-current`, de momento solo existe en Chrome) y se expone
 * con aria-current, no solo con el color.
 */
import { onMounted, onUnmounted, ref } from "vue"

export interface NavSection { id: string; label: string; icon: string }
const props = defineProps<{ sections: NavSection[] }>()

const active = ref(props.sections[0]?.id ?? "")
let observer: IntersectionObserver | null = null

onMounted(() => {
    observer = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) active.value = e.target.id
    }, { rootMargin: "-20% 0px -79% 0px", threshold: 0 })
    for (const s of props.sections) {
        const el = document.getElementById(s.id)
        if (el) observer.observe(el)
    }
})
onUnmounted(() => observer?.disconnect())

/** Al pulsar: se marca ya (sin esperar al scroll) y el foco pasa a la sección */
function go(id: string) {
    active.value = id
    requestAnimationFrame(() => document.getElementById(id)?.focus({ preventScroll: true }))
}
</script>

<template>
    <nav aria-label="Secciones de la cuenta" class="sm:hidden sticky top-0 z-20 -mx-4 px-4 py-2 bg-base-100/90 backdrop-blur border-b border-base-content/10">
        <ul class="flex items-center justify-between gap-1">
            <li v-for="s in sections" :key="s.id">
                <a :href="`#${s.id}`" :aria-current="active === s.id ? 'location' : undefined"
                    :aria-label="active === s.id ? undefined : s.label" :title="s.label"
                    class="btn rounded-full gap-1.5 transition-[padding,background-color] duration-200 motion-reduce:transition-none"
                    :class="active === s.id ? 'btn-primary px-4' : 'btn-ghost btn-square text-base-content/75'"
                    @click="go(s.id)">
                    <svg class="size-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" :d="s.icon" />
                    </svg>
                    <span v-if="active === s.id" class="text-sm font-bold">{{ s.label }}</span>
                </a>
            </li>
        </ul>
    </nav>
</template>
