<script setup lang="ts">
/**
 * Datos curiosos del club calculados de los partidos: balance local/visitante,
 * cuándo se juega, remontadas de marcador en contra ya no (no hay minutos), racha actual,
 * reparto de goles por posición y la gente que más repite.
 */
import { computed, onBeforeMount } from "vue"
import { useMatches } from "@/composables/useMatches"
import { useMembers } from "@/composables/useMembers"
import { usePlayerStats } from "@/composables/usePlayerStats"
import { routes } from "@/lib/query"
import { translatePosition } from "@/i18n/translations"
import AnimatedNumber from "@/components/ui/AnimatedNumber.vue"
import PlayerCard from "@/components/ui/PlayerCard.vue"

const { matches, loading, load: loadMatches } = useMatches()
const { load: loadMembers, memberFor } = useMembers()
const { stats, load: loadStats, positionsOf } = usePlayerStats()

onBeforeMount(() => {
    loadMatches()
    loadMembers()
    loadStats()
})

const sorted = computed(() => [...matches.value].sort((a, b) => b.timestamp - a.timestamp))

/** Racha actual: cuántos partidos seguidos sin perder / ganando, desde el último */
const currentStreak = computed(() => {
    const list = sorted.value
    if (list.length === 0) return null
    const first = list[0].result
    let count = 0
    for (const m of list) {
        if (m.result !== first) break
        count++
    }
    const label = first === "win" ? "victorias seguidas" : first === "loose" ? "derrotas seguidas" : "empates seguidos"
    return { count, label, result: first }
})

/** Partido más loco: el de más goles entre los dos equipos */
const wildestMatch = computed(() => {
    let best: { total: number; match: (typeof matches.value)[number] } | null = null
    for (const m of matches.value) {
        const total = m.ourClub.matchStats.goals + m.opponentClub.matchStats.goals
        if (!best || total > best.total) best = { total, match: m }
    }
    return best
})

/** Tandas de penaltis y partidos ganados por abandono del rival */
const specials = computed(() => ({
    penalties: matches.value.filter((m) => m.winnerByPen).length,
    dnf: matches.value.filter((m) => m.winnerByDnf).length,
    playoff: matches.value.filter((m) => m.matchType === "playoff").length
}))

/** Precisión del club: tiros, pases y entradas acumulados */
const accuracy = computed(() => {
    let shots = 0, goals = 0, passes = 0, passesOk = 0, tackles = 0, tacklesOk = 0
    for (const m of matches.value) {
        const s = m.ourClub.matchStats
        shots += s.shots ?? 0
        goals += s.goals ?? 0
        passes += s.passesMade ?? 0
        passesOk += s.passesSuccess ?? 0
        tackles += s.tacklesMade ?? 0
        tacklesOk += s.tackleSuccess ?? 0
    }
    return {
        shotRate: shots > 0 ? (goals / shots) * 100 : 0,
        passRate: passes > 0 ? (passesOk / passes) * 100 : 0,
        tackleRate: tackles > 0 ? (tacklesOk / tackles) * 100 : 0,
        passes
    }
})

/** Reparto de goles del club por posición de quien los marcó */
const goalsByPosition = computed(() => {
    const totals = new Map<string, number>()
    for (const s of [...stats.value.official, ...stats.value.friendly]) {
        if (!s.playerId || !s.goals) continue
        totals.set(s.position, (totals.get(s.position) ?? 0) + s.goals)
    }
    const all = [...totals.values()].reduce((a, b) => a + b, 0)
    if (all === 0) return []
    return [...totals.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([position, goals]) => ({ position, goals, percent: (goals / all) * 100 }))
})

/** Quién no se pierde una: más partidos jugados */
const mostPresent = computed(() => {
    const games = new Map<string, number>()
    for (const m of matches.value) {
        for (const p of m.ourClub.players) {
            if (!p.played || !p.playerId) continue
            games.set(p.playerId, (games.get(p.playerId) ?? 0) + 1)
        }
    }
    const top = [...games.entries()].sort((a, b) => b[1] - a[1])[0]
    if (!top) return null
    const [playerId, count] = top
    return { playerId, count, percent: matches.value.length > 0 ? (count / matches.value.length) * 100 : 0 }
})

/** Hora a la que suele jugar el club */
const favouriteHour = computed(() => {
    if (matches.value.length === 0) return null
    const hours = new Array(24).fill(0)
    for (const m of matches.value) hours[new Date(m.timestamp * 1000).getHours()]++
    const hour = hours.indexOf(Math.max(...hours))
    return { hour, count: hours[hour] }
})

const STREAK_CLASS: Record<string, string> = { win: "text-success", loose: "text-error", tie: "text-base-content" }
</script>

<template>
    <section v-if="loading || matches.length > 0" class="flex flex-col gap-4">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 reveal-stagger">
            <!-- Racha actual -->
            <div class="rounded-xl bg-base-200 p-4">
                <p class="text-[11px] uppercase tracking-widest font-black text-base-content/50">Racha actual</p>
                <AnimatedNumber v-if="currentStreak" class="text-2xl lg:text-3xl font-black tracking-tight mt-1 block" :class="STREAK_CLASS[currentStreak.result]" :value="currentStreak.count" />
                <p class="text-xs text-base-content/50 mt-1 truncate">{{ currentStreak?.label ?? "—" }}</p>
            </div>

            <!-- Puntería -->
            <div class="rounded-xl bg-base-200 p-4">
                <p class="text-[11px] uppercase tracking-widest font-black text-base-content/50">Puntería</p>
                <AnimatedNumber class="text-2xl lg:text-3xl font-black tracking-tight mt-1 block" :value="accuracy.shotRate" :decimals="0" suffix="%" />
                <p class="text-xs text-base-content/50 mt-1 truncate">de los tiros acaban en gol</p>
            </div>

            <!-- Pases -->
            <div class="rounded-xl bg-base-200 p-4">
                <p class="text-[11px] uppercase tracking-widest font-black text-base-content/50">Pases buenos</p>
                <AnimatedNumber class="text-2xl lg:text-3xl font-black tracking-tight mt-1 block" :value="accuracy.passRate" :decimals="0" suffix="%" />
                <p class="text-xs text-base-content/50 mt-1 truncate">de <AnimatedNumber :value="accuracy.passes" /> pases</p>
            </div>

            <!-- Entradas -->
            <div class="rounded-xl bg-base-200 p-4">
                <p class="text-[11px] uppercase tracking-widest font-black text-base-content/50">Entradas ganadas</p>
                <AnimatedNumber class="text-2xl lg:text-3xl font-black tracking-tight mt-1 block" :value="accuracy.tackleRate" :decimals="0" suffix="%" />
                <p class="text-xs text-base-content/50 mt-1 truncate">de todas las disputas</p>
            </div>
        </div>

        <div class="grid lg:grid-cols-[1fr_1fr] gap-4">
            <!-- Quién marca los goles -->
            <div class="reveal rounded-2xl bg-base-200 p-5">
                <h3 class="text-[11px] uppercase tracking-widest font-black text-base-content/50 mb-4">¿Quién marca los goles?</h3>
                <p v-if="goalsByPosition.length === 0" class="text-sm text-base-content/50 py-4">Todavía no hay goles registrados.</p>
                <div v-else class="flex flex-col gap-3">
                    <div v-for="row in goalsByPosition" :key="row.position">
                        <div class="flex justify-between text-sm mb-1">
                            <span class="font-bold">{{ translatePosition(row.position) }}</span>
                            <span class="text-base-content/60"><AnimatedNumber :value="row.goals" /> goles</span>
                        </div>
                        <!-- La barra crece al entrar en pantalla (transición CSS sobre el ancho) -->
                        <div class="h-2 rounded-full bg-base-300 overflow-hidden">
                            <div class="h-full rounded-full bg-primary transition-[width] duration-700 ease-out" :style="{ width: `${row.percent}%` }"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Curiosidades sueltas -->
            <div class="reveal rounded-2xl bg-base-200 p-5 flex flex-col gap-4">
                <h3 class="text-[11px] uppercase tracking-widest font-black text-base-content/50">Para la hemeroteca</h3>

                <a v-if="wildestMatch" :href="routes.match(wildestMatch.match.matchId)" class="flex items-baseline gap-3 hover:text-primary transition-colors">
                    <AnimatedNumber class="text-2xl font-black tracking-tight" :value="wildestMatch.total" />
                    <span class="text-sm text-base-content/60">goles en un solo partido, vs {{ wildestMatch.match.opponentClub.name }}</span>
                </a>

                <div v-if="mostPresent" class="flex items-center gap-3">
                    <PlayerCard
                        :member="memberFor(mostPresent.playerId) ?? { playerId: mostPresent.playerId, playerName: '—' }"
                        :positions="positionsOf(mostPresent.playerId)"
                        link
                        no-dates
                    >
                        <p class="text-xs text-base-content/60 mt-0.5">No se pierde una: {{ mostPresent.count }} partidos ({{ mostPresent.percent.toFixed(0) }}%)</p>
                    </PlayerCard>
                </div>

                <div class="flex flex-wrap gap-2 mt-auto">
                    <span v-if="favouriteHour" class="badge badge-lg badge-soft badge-primary font-semibold">Se juega sobre las {{ favouriteHour.hour }}:00</span>
                    <span v-if="specials.playoff" class="badge badge-lg badge-soft badge-primary font-semibold">{{ specials.playoff }} partidos de playoff</span>
                    <span v-if="specials.penalties" class="badge badge-lg badge-soft badge-primary font-semibold">{{ specials.penalties }} tandas de penaltis</span>
                    <span v-if="specials.dnf" class="badge badge-lg badge-soft badge-primary font-semibold">{{ specials.dnf }} rivales que se fueron</span>
                </div>
            </div>
        </div>
    </section>
</template>
