<script setup lang="ts">
/**
 * Botones del repositorio en GitHub: estrella (con el número de estrellas) y, si se pide, fork.
 * Los números salen de useGithubRepo; si GitHub no responde, los botones salen igual, sin número.
 */
import { REPO } from "@/config/developer"
import { useGithubRepo } from "@/composables/useGithubRepo"

withDefaults(defineProps<{
    /** también el botón de fork */
    fork?: boolean
    size?: "sm" | "md"
}>(), { fork: false, size: "md" })

const { stars, forks } = useGithubRepo()
const compact = (n: number) => n.toLocaleString("es-ES", { notation: "compact", maximumFractionDigits: 1 })

// Iconos de GitHub (Octicons, MIT): estrella y fork
const STAR = "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"
const FORK = "M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"
</script>

<template>
    <div class="inline-flex flex-wrap items-center gap-2">
        <a :href="REPO.url" target="_blank" rel="noopener"
            class="gh-btn group" :class="size === 'sm' ? 'gh-btn-sm' : ''"
            :aria-label="`Dar una estrella al proyecto en GitHub${stars !== null ? ` (${stars} estrellas)` : ''}`">
            <svg class="gh-star size-4 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path :d="STAR" /></svg>
            <span>Star</span>
            <span v-if="stars !== null" class="gh-count tabular-nums">{{ compact(stars) }}</span>
        </a>
        <a v-if="fork" :href="REPO.forkUrl" target="_blank" rel="noopener"
            class="gh-btn" :class="size === 'sm' ? 'gh-btn-sm' : ''"
            :aria-label="`Hacer un fork del proyecto en GitHub${forks !== null ? ` (${forks} forks)` : ''}`">
            <svg class="size-4 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path :d="FORK" /></svg>
            <span>Fork</span>
            <span v-if="forks !== null" class="gh-count tabular-nums">{{ compact(forks) }}</span>
        </a>
    </div>
</template>

<style scoped>
.gh-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    height: 2.25rem;
    padding: 0 0.85rem;
    border-radius: 0.75rem;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-base-content);
    background: color-mix(in oklab, var(--color-base-content) 6%, transparent);
    border: 1px solid color-mix(in oklab, var(--color-base-content) 12%, transparent);
    transition: background-color 0.2s, border-color 0.2s, translate 0.2s;
}
.gh-btn:hover,
.gh-btn:focus-visible {
    background: color-mix(in oklab, var(--color-primary) 12%, transparent);
    border-color: color-mix(in oklab, var(--color-primary) 50%, transparent);
    translate: 0 -1px;
}
.gh-btn-sm {
    height: 1.9rem;
    padding: 0 0.65rem;
    font-size: 0.78rem;
}
.gh-count {
    padding-left: 0.45rem;
    margin-left: 0.1rem;
    border-left: 1px solid color-mix(in oklab, var(--color-base-content) 15%, transparent);
    color: color-mix(in oklab, var(--color-base-content) 70%, transparent);
}
/* La estrella se enciende al pasar el ratón */
.gh-star {
    transition: color 0.2s, scale 0.2s;
}
.group:hover .gh-star {
    color: #e3b341;
    scale: 1.15;
}
@media (prefers-reduced-motion: reduce) {
    .gh-btn,
    .gh-star {
        transition: none;
    }
}
</style>
