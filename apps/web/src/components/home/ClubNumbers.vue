<template>
    <!--
        "Todos los números" de la portada: las stats del club que da EA (useClub).
        Izquierda, el balance (donut + goles); derecha, fichas y la escalera de divisiones.
        Al entrar en pantalla se dibuja el donut, crecen las barras y cuentan los números
        (sin movimiento con prefers-reduced-motion).
    -->
    <!-- El ref va en un contenedor que existe siempre: los datos llegan después de montar -->
    <div ref="target">
    <div v-if="club" class="club-numbers" :class="{ 'is-in': inView }">
        <p class="text-center text-xs text-base-content/50 -mt-3 mb-8">
            Datos de EA<span v-if="updatedAt"> · actualizados el {{ updatedAt }}</span>
        </p>

        <div class="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <!-- Balance -->
            <div class="panel p-6 lg:p-8 flex flex-col gap-6 reveal-left">
                <span class="kicker">Balance oficial</span>
                <div class="flex flex-col sm:flex-row items-center gap-6 lg:gap-8">
                    <div class="relative size-44 shrink-0">
                        <svg viewBox="0 0 180 180" class="size-full -rotate-90" aria-hidden="true">
                            <circle cx="90" cy="90" :r="R" fill="none" class="stroke-base-content/10" stroke-width="18" />
                            <circle v-for="(arc, i) in arcs" :key="arc.key" class="donut-arc" cx="90" cy="90" :r="R" fill="none"
                                :class="arc.stroke" stroke-width="18"
                                :stroke-dasharray="`${inView ? arc.length : 0} ${CIRCUMFERENCE}`" :stroke-dashoffset="-arc.offset"
                                :style="{ transitionDelay: `${150 + i * 250}ms` }" />
                        </svg>
                        <div class="absolute inset-0 flex flex-col items-center justify-center">
                            <AnimatedNumber class="text-4xl font-black" :value="s.gamesPlayed" />
                            <span class="kicker">partidos</span>
                        </div>
                    </div>
                    <ul class="flex-1 w-full flex flex-col gap-3">
                        <li v-for="row in record" :key="row.label" class="flex items-center gap-3">
                            <span class="size-3 rounded-full shrink-0" :class="row.dot"></span>
                            <span class="flex-1 font-semibold">{{ row.label }}</span>
                            <AnimatedNumber class="font-black" :value="row.value" />
                            <span class="w-12 text-right text-sm text-base-content/50 tabular-nums">{{ percent(row.value) }}%</span>
                        </li>
                    </ul>
                </div>

                <!-- Goles a favor / en contra -->
                <div class="mt-auto">
                    <div class="flex justify-between text-sm mb-2">
                        <span><AnimatedNumber class="text-lg font-black" :value="s.goals" /> <span class="text-base-content/60">a favor</span></span>
                        <span><span class="text-base-content/60">en contra</span> <AnimatedNumber class="text-lg font-black" :value="s.goalsAgainst" /></span>
                    </div>
                    <div class="flex h-2.5 rounded-full overflow-hidden gap-0.5 bg-base-content/5">
                        <div class="goals-bar bg-primary rounded-l-full" :style="{ flexGrow: inView ? s.goals : 0 }"></div>
                        <div class="goals-bar bg-base-content/25 rounded-r-full" :style="{ flexGrow: inView ? s.goalsAgainst : 0 }"></div>
                    </div>
                    <p v-if="s.gamesPlayed" class="mt-2 text-xs text-base-content/50">
                        {{ perGame(s.goals) }} goles por partido · {{ perGame(s.goalsAgainst) }} encajados
                    </p>
                </div>
            </div>

            <!-- Fichas + escalera de divisiones -->
            <div class="flex flex-col gap-4">
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 reveal-stagger">
                    <div v-for="tile in tiles" :key="tile.label" class="panel tile p-4 flex flex-col gap-2 min-w-0">
                        <span class="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
                            <svg class="size-4.5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" :d="tile.icon" />
                            </svg>
                        </span>
                        <span class="kicker text-[0.65rem]! truncate">{{ tile.label }}</span>
                        <AnimatedNumber class="font-black leading-none truncate" :class="typeof tile.value === 'number' ? 'text-2xl' : 'text-lg sm:text-xl'"
                            :value="tile.value" :prefix="tile.prefix ?? ''" />
                    </div>
                </div>

                <div class="panel p-5 lg:p-6 flex-1 flex flex-col reveal">
                    <div class="flex items-baseline justify-between mb-4 gap-3">
                        <span class="kicker">Mejor división</span>
                        <span class="text-xl font-black">{{ s.bestDivisionName }}</span>
                    </div>
                    <!-- De la 10 (la más baja) a la 1 (élite): la mejor alcanzada, en el color del club -->
                    <div class="flex-1 flex items-end gap-1.5 min-h-24" role="img"
                        :aria-label="`Mejor división alcanzada: ${s.bestDivisionName} (${s.bestDivision} de 10, siendo la 1 la élite)`">
                        <div v-for="(d, i) in DIVISIONS" :key="d" class="flex-1 flex flex-col items-center gap-1.5">
                            <div class="ladder-bar w-full rounded-t-md origin-bottom"
                                :class="d === s.bestDivision ? 'bg-primary' : d > s.bestDivision ? 'bg-primary/25' : 'bg-base-content/10'"
                                :style="{ height: `${(11 - d) * 9 + 8}px`, transitionDelay: `${300 + i * 60}ms` }"></div>
                            <span class="text-[0.65rem] font-black tabular-nums" :class="d === s.bestDivision ? 'text-primary' : 'text-base-content/40'">{{ d }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Cargando: el mismo hueco, para que nada salte -->
    <div v-else-if="loading" class="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" aria-busy="true">
        <div class="skeleton rounded-2xl h-96"></div>
        <div class="flex flex-col gap-4">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div v-for="n in 8" :key="n" class="skeleton rounded-2xl h-28"></div>
            </div>
            <div class="skeleton rounded-2xl flex-1 min-h-40"></div>
        </div>
    </div>

    <div v-else class="w-full text-center py-8 text-base-content/60">
        <p class="font-bold">Los datos del club no están disponibles ahora mismo</p>
        <p class="text-xs">EA no responde y aún no hay datos en caché. Vuelve a intentarlo en unos minutos.</p>
    </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeMount } from "vue"
import { useClub } from "@/composables/useClub"
import { useInView } from "@/composables/useInView"
import AnimatedNumber from "@/components/ui/AnimatedNumber.vue"

const { club, loading, load } = useClub()
onBeforeMount(load)

// Con todo el panel bien dentro: así se ve dibujarse
const { target, inView } = useInView({ threshold: 0.2, rootMargin: "0px 0px -15% 0px" })

const s = computed(() => club.value!.stats)

const updatedAt = computed(() => {
    const d = club.value?.updatedAt ? new Date(club.value.updatedAt) : null
    return d && !isNaN(d.getTime()) ? d.toLocaleDateString("es-ES") : ""
})

const percent = (n: number) => (s.value.gamesPlayed ? Math.round((n / s.value.gamesPlayed) * 100) : 0)
const perGame = (n: number) => (n / s.value.gamesPlayed).toLocaleString("es-ES", { maximumFractionDigits: 1, minimumFractionDigits: 1 })

const record = computed(() => [
    { label: "Victorias", value: s.value.wins, dot: "bg-success" },
    { label: "Empates", value: s.value.ties, dot: "bg-base-content/35" },
    { label: "Derrotas", value: s.value.losses, dot: "bg-error" },
])

// Donut: un arco por resultado, con un pequeño hueco entre ellos
const R = 70
const CIRCUMFERENCE = 2 * Math.PI * R
const arcs = computed(() => {
    const total = s.value.gamesPlayed || 1
    const parts = [
        { key: "w", n: s.value.wins, stroke: "stroke-success" },
        { key: "t", n: s.value.ties, stroke: "stroke-base-content/35" },
        { key: "l", n: s.value.losses, stroke: "stroke-error" },
    ]
    let offset = 0
    return parts.map((p) => {
        const full = (p.n / total) * CIRCUMFERENCE
        const arc = { ...p, length: Math.max(0, full - 3), offset }
        offset += full
        return arc
    })
})

// Iconos: Heroicons outline (24×24)
const tiles = computed(() => [
    { label: "Habilidad", value: s.value.skill, icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" },
    { label: "Reputación", value: s.value.reputationName, icon: "M11.48 3.5a.56.56 0 0 1 1.04 0l2.13 5.11 5.52.44c.5.04.7.66.32.99l-4.2 3.6 1.28 5.39a.56.56 0 0 1-.84.61L12 16.77l-4.73 2.87a.56.56 0 0 1-.84-.61l1.28-5.39-4.2-3.6a.56.56 0 0 1 .32-.99l5.52-.44 2.13-5.11Z" },
    { label: "Racha victorias", value: s.value.winstreak, icon: "M15.36 5.21A8.25 8.25 0 0 1 12 21a8.25 8.25 0 0 1-5.96-13.95A8.29 8.29 0 0 0 9 9.6a8.98 8.98 0 0 1 3.36-6.87 8.21 8.21 0 0 0 3 2.48Z" },
    { label: "Sin perder", value: s.value.unbeatenstreak, icon: "M9 12.75 11.25 15 15 9.75m-3-7.04A11.96 11.96 0 0 1 3.6 6 12 12 0 0 0 3 9.75c0 5.59 3.82 10.29 9 11.62 5.18-1.33 9-6.03 9-11.62 0-1.31-.21-2.57-.6-3.75h-.15c-3.2 0-6.1-1.25-8.25-3.29Z" },
    { label: "Ascensos", value: s.value.promotions, icon: "M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" },
    { label: "Descensos", value: s.value.relegations, icon: "M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" },
    { label: "Playoffs", value: s.value.gamesPlayedPlayoff, icon: "M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.38c0-.62-.5-1.12-1.13-1.12h-.87m-5.25 4.5v-3.38c0-.62.5-1.12 1.13-1.12h.86m7.5-10.42c.98.14 1.95.32 2.92.52a6 6 0 0 1-5.9 5.5M7.5 4.24c-.98.14-1.95.32-2.92.52a6 6 0 0 0 5.9 5.5m0 0a6.73 6.73 0 0 0 2.75.98m-2.75-.98a6.75 6.75 0 0 1-3-5.6V3.75h12v.9a6.75 6.75 0 0 1-3 5.6m-3 .98a6.73 6.73 0 0 1-2.75-.98" },
    {
        label: "Diferencia goles",
        value: s.value.goals - s.value.goalsAgainst,
        prefix: s.value.goals - s.value.goalsAgainst > 0 ? "+" : "",
        icon: "M3 13.13C3 12.5 3.5 12 4.13 12h2.25c.62 0 1.12.5 1.12 1.13v6.75C7.5 20.5 7 21 6.38 21H4.13C3.5 21 3 20.5 3 19.88v-6.75ZM9.75 8.63c0-.63.5-1.13 1.13-1.13h2.25c.62 0 1.12.5 1.12 1.13v11.25c0 .62-.5 1.12-1.12 1.12h-2.25c-.63 0-1.13-.5-1.13-1.12V8.63ZM16.5 4.13c0-.63.5-1.13 1.13-1.13h2.25C20.5 3 21 3.5 21 4.13v15.75c0 .62-.5 1.12-1.12 1.12h-2.25c-.63 0-1.13-.5-1.13-1.12V4.13Z",
    },
] as { label: string; value: number | string; prefix?: string; icon: string }[])

/** Divisiones de EA, de la 10 (la más baja) a la 1 (élite) */
const DIVISIONS = Array.from({ length: 10 }, (_, i) => 10 - i)
</script>

<style scoped>
.panel {
    border-radius: 1rem;
    background: color-mix(in oklab, var(--color-base-200) 90%, transparent);
    backdrop-filter: blur(6px);
    border: 1px solid color-mix(in oklab, var(--color-base-content) 5%, transparent);
}
.kicker {
    font-size: 0.75rem;
    text-transform: uppercase;
    font-weight: 900;
    letter-spacing: 0.1em;
    color: color-mix(in oklab, var(--color-base-content) 50%, transparent);
}
.tile {
    transition: translate 0.25s, border-color 0.25s;
}
.tile:hover {
    translate: 0 -2px;
    border-color: color-mix(in oklab, var(--color-primary) 30%, transparent);
}

/* Al entrar en pantalla (.is-in): el donut se dibuja, las barras crecen */
.donut-arc {
    transition: stroke-dasharray 1.1s cubic-bezier(0.22, 1, 0.36, 1);
}
.goals-bar {
    flex-basis: 0;
    transition: flex-grow 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.3s;
}
.ladder-bar {
    scale: 1 0;
    transition: scale 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}
.is-in .ladder-bar {
    scale: 1 1;
}
@media (prefers-reduced-motion: reduce) {
    .donut-arc,
    .goals-bar,
    .ladder-bar {
        transition: none;
    }
}
</style>
