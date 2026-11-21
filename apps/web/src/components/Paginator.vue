<script setup lang="ts">
/**
 * Paginador genérico: anterior / páginas / siguiente (join de daisyUI) y, debajo, "21–40 de 131".
 * Siempre la primera y la última, la actual con sus vecinas y "…" donde se salta (ver pageItems en
 * lib/pagination.ts); el número de botones no cambia al moverse. No pinta nada con una sola página.
 *
 *   <Paginator :items-count="lista.length" :items-per-page="20" :current-page="page" @pagechange="page = $event" />
 *
 * Para cortar la lista, paginate() de lib/pagination.ts.
 */
import { computed } from "vue"
import { clampPage, pageCount, pageItems } from "@/lib/pagination"

const props = withDefaults(defineProps<{
    itemsCount: number
    itemsPerPage: number
    currentPage: number
    /** páginas a cada lado de la actual */
    siblings?: number
    /** "21–40 de 131" debajo */
    showRange?: boolean
    /** qué se pagina, para los lectores de pantalla ("Páginas de la plantilla") */
    label?: string
}>(), { siblings: 1, showRange: true, label: "Páginas" })

const emit = defineEmits<{ pagechange: [page: number] }>()

const pages = computed(() => pageCount(props.itemsCount, props.itemsPerPage))
const page = computed(() => clampPage(props.currentPage, pages.value))
const items = computed(() => pageItems(page.value, pages.value, props.siblings))
const from = computed(() => (page.value - 1) * props.itemsPerPage + 1)
const to = computed(() => Math.min(page.value * props.itemsPerPage, props.itemsCount))

const go = (n: number) => {
    const target = clampPage(n, pages.value)
    if (target !== page.value) emit("pagechange", target)
}
</script>

<template>
    <nav v-if="pages > 1" :aria-label="label" class="flex flex-col items-center gap-2">
        <div class="join">
            <button type="button" class="join-item btn btn-sm" :disabled="page === 1" aria-label="Página anterior" @click="go(page - 1)">
                <svg class="size-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m15 6-6 6 6 6" /></svg>
            </button>
            <template v-for="(n, k) in items" :key="`${n}-${k}`">
                <span v-if="n === '…'" class="join-item btn btn-sm btn-disabled px-2" aria-hidden="true">…</span>
                <button v-else type="button" class="join-item btn btn-sm min-w-9 tabular-nums" :class="n === page && 'btn-primary'"
                    :aria-current="n === page ? 'page' : undefined" :aria-label="`Página ${n}`" @click="go(n)">{{ n }}</button>
            </template>
            <button type="button" class="join-item btn btn-sm" :disabled="page === pages" aria-label="Página siguiente" @click="go(page + 1)">
                <svg class="size-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m9 6 6 6-6 6" /></svg>
            </button>
        </div>
        <p v-if="showRange" class="text-xs text-base-content/50 tabular-nums">{{ from }}–{{ to }} de {{ itemsCount }}</p>
    </nav>
</template>
