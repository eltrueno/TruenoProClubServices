<script setup lang="ts">
/** Barra de datos del club bajo el hero: los números que resumen la temporada */
import { computed, onBeforeMount } from "vue"
import { useClub } from "@/composables/useClub"
import { translateDivision } from "@/i18n/translations"

const { club, loading, hasError, load } = useClub()
onBeforeMount(load)

const stats = computed(() => club.value?.stats)
const winrate = computed(() => {
    const s = stats.value
    return s && s.gamesPlayed > 0 ? Math.round((s.wins / s.gamesPlayed) * 100) : 0
})

const items = computed(() => {
    const s = stats.value
    if (!s) return []
    return [
        { label: "División", value: translateDivision(s.bestDivision) },
        { label: "Partidos", value: s.gamesPlayed.toLocaleString("es-ES") },
        { label: "Victorias", value: `${winrate.value}%` },
        { label: "Goles", value: s.goals.toLocaleString("es-ES") },
        { label: "Racha", value: s.winstreak },
        { label: "Habilidad", value: s.skill }
    ]
})
</script>

<template>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 reveal-stagger">
        <template v-if="loading">
            <div v-for="i in 6" :key="i" class="rounded-xl bg-base-200 p-4">
                <div class="skeleton h-3 w-16 mb-2"></div>
                <div class="skeleton h-7 w-20"></div>
            </div>
        </template>
        <p v-else-if="hasError || items.length === 0" class="col-span-full text-center text-sm text-base-content/50 py-4">
            Los datos del club no están disponibles ahora mismo.
        </p>
        <div
            v-else
            v-for="item in items"
            :key="item.label"
            class="rounded-xl bg-base-200 p-4 transition-transform duration-300 hover:-translate-y-1"
        >
            <p class="text-[11px] uppercase tracking-widest font-black text-base-content/50">{{ item.label }}</p>
            <p class="text-2xl lg:text-3xl font-black tracking-tight mt-1">{{ item.value }}</p>
        </div>
    </div>
</template>
