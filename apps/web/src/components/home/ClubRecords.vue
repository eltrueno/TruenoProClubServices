<script setup lang="ts">
/**
 * Récords del club: marcas de equipo (de los partidos + EA) y los mejores en cada faceta
 * (de las stats por jugador). Se oculta entero si todavía hay pocos partidos.
 */
import { computed, onBeforeMount } from "vue"
import type { PlayerPosition } from "@trueno-proclub-services/shared"
import PlayerStatsEntity from "@/model/PlayerStatsEntity"
import { useMatches } from "@/composables/useMatches"
import { useMembers } from "@/composables/useMembers"
import { usePlayerStats } from "@/composables/usePlayerStats"
import { useClub } from "@/composables/useClub"
import { routes } from "@/lib/query"
import PlayerCard from "@/components/ui/PlayerCard.vue"

/** Partidos mínimos del club para que los récords signifiquen algo */
const MIN_CLUB_MATCHES = 10
/** Mínimos por jugador para las marcas de media / porcentaje */
const MIN_PLAYER_GAMES = 5
const MIN_PASSES = 100

const { matches, loading: matchesLoading, load: loadMatches } = useMatches()
const { load: loadMembers, memberFor } = useMembers()
const { stats, loading: statsLoading, load: loadStats, positionsOf } = usePlayerStats()
const { club, load: loadClub } = useClub()

onBeforeMount(() => {
    loadMatches()
    loadMembers()
    loadStats()
    loadClub()
})

const loading = computed(() => matchesLoading.value || statsLoading.value)
const enoughData = computed(() => matches.value.length >= MIN_CLUB_MATCHES)

const fmtMonth = (ts: number) => new Date(ts * 1000).toLocaleDateString("es-ES", { month: "short", year: "numeric" })

// ---- Récords de equipo -----------------------------------------------------
const biggestWin = computed(() => {
    let best: { diff: number; match: (typeof matches.value)[number] } | null = null
    for (const m of matches.value) {
        const diff = m.ourClub.matchStats.goals - m.opponentClub.matchStats.goals
        if (!best || diff > best.diff) best = { diff, match: m }
    }
    return best && best.diff > 0 ? best.match : null
})

const bestTeamRating = computed(() => {
    let best: { avg: number; match: (typeof matches.value)[number] } | null = null
    for (const m of matches.value) {
        const played = m.ourClub.players.filter((p) => p.played)
        if (played.length === 0) continue
        const avg = played.reduce((acc, p) => acc + p.rating, 0) / played.length
        if (!best || avg > best.avg) best = { avg, match: m }
    }
    return best
})

const cleanSheets = computed(() => matches.value.filter((m) => m.opponentClub.matchStats.goals === 0).length)

const teamRecords = computed(() => {
    const win = biggestWin.value
    const rating = bestTeamRating.value
    return [
        win && {
            label: "Mayor goleada",
            value: `${win.ourClub.matchStats.goals} : ${win.opponentClub.matchStats.goals}`,
            sub: `vs ${win.opponentClub.name} · ${fmtMonth(win.timestamp)}`,
            href: routes.match(win.matchId)
        },
        {
            label: "Mejor racha",
            value: club.value?.stats.winstreak ?? 0,
            sub: "victorias seguidas"
        },
        {
            label: "Sin encajar",
            value: cleanSheets.value,
            sub: `de ${matches.value.length} partidos`
        },
        rating && {
            label: "Mejor partido",
            value: rating.avg.toFixed(1),
            sub: `media del equipo · vs ${rating.match.opponentClub.name}`,
            href: routes.match(rating.match.matchId)
        }
    ].filter(Boolean) as Array<{ label: string; value: string | number; sub: string; href?: string }>
})

// ---- Mejores jugadores -----------------------------------------------------
/** Stats agregadas por jugador (oficiales + amistosos, todas las posiciones) */
const totals = computed(() => {
    const byPlayer = new Map<string, PlayerStatsEntity[]>()
    for (const s of [...stats.value.official, ...stats.value.friendly]) {
        if (!s.playerId) continue
        byPlayer.set(s.playerId, [...(byPlayer.get(s.playerId) ?? []), s])
    }
    return [...byPlayer.values()].map((list) => PlayerStatsEntity.aggregate(list))
})

interface Award {
    label: string
    playerId: string
    playerName: string
    detail: string
}

const best = (
    label: string,
    pool: PlayerStatsEntity[],
    score: (s: PlayerStatsEntity) => number,
    detail: (s: PlayerStatsEntity) => string
): Award | null => {
    const winner = pool.filter((s) => score(s) > 0).sort((a, b) => score(b) - score(a))[0]
    return winner ? { label, playerId: winner.playerId, playerName: winner.playerName, detail: detail(winner) } : null
}

const isPosition = (playerId: string, position: PlayerPosition) => positionsOf(playerId).includes(position)

const awards = computed<Award[]>(() => {
    const all = totals.value
    const regulars = all.filter((s) => s.gamesPlayed >= MIN_PLAYER_GAMES)
    const keepers = regulars.filter((s) => isPosition(s.playerId, "goalkeeper"))
    const defenders = regulars.filter((s) => isPosition(s.playerId, "defender"))
    const passers = regulars.filter((s) => s.passesMade >= MIN_PASSES)

    return [
        best("Máximo goleador", all, (s) => s.goals, (s) => `${s.goals} goles · ${s.goalsPerMatch.toFixed(2)} por partido`),
        best("Mejor asistente", all, (s) => s.assists, (s) => `${s.assists} asistencias`),
        best("Mejor defensa", defenders, (s) => s.tacklesSuccess / s.gamesPlayed, (s) => `${(s.tacklesSuccess / s.gamesPlayed).toFixed(1)} entradas ganadas por partido`),
        best("Mejor portero", keepers, (s) => s.savesPercent, (s) => `${s.savesPercent.toFixed(0)}% de paradas · ${s.cleanSheets} a cero`),
        best("Mejor pase", passers, (s) => (s.passesSuccess / s.passesMade) * 100, (s) => `${((s.passesSuccess / s.passesMade) * 100).toFixed(0)}% de acierto`),
        best("Más MVP", all, (s) => s.manOfTheMatch, (s) => `${s.manOfTheMatch} veces · ${s.manOfTheMatchPercent.toFixed(0)}% de sus partidos`),
        best("Mejor media", regulars, (s) => s.ratingAve, (s) => `${s.ratingAve.toFixed(2)} de valoración`),
        best("Más expulsado", all, (s) => s.redCards, (s) => `${s.redCards} rojas`)
    ].filter(Boolean) as Award[]
})

// ---- Curiosidades ----------------------------------------------------------
const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]

const curiosities = computed(() => {
    const total = matches.value.length
    if (total === 0) return []
    const goals = matches.value.reduce((acc, m) => acc + m.ourClub.matchStats.goals, 0)

    const rivals = new Map<string, number>()
    const days = new Array(7).fill(0)
    for (const m of matches.value) {
        rivals.set(m.opponentClub.name, (rivals.get(m.opponentClub.name) ?? 0) + 1)
        days[new Date(m.timestamp * 1000).getDay()]++
    }
    const topRival = [...rivals.entries()].sort((a, b) => b[1] - a[1])[0]
    const topDay = days.indexOf(Math.max(...days))

    return [
        `${(goals / total).toFixed(1)} goles por partido`,
        `${totals.value.length} jugadores distintos`,
        topRival ? `Rival más repetido: ${topRival[0]} (${topRival[1]})` : "",
        `Día favorito: ${DAYS[topDay]}`
    ].filter(Boolean)
})
</script>

<template>
    <section v-if="loading || enoughData" class="flex flex-col gap-8">
        <!-- Récords de equipo -->
        <div>
            <h3 class="text-[11px] uppercase tracking-widest font-black text-base-content/50 mb-3">Récords de equipo</h3>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 reveal-stagger">
                <template v-if="loading">
                    <div v-for="i in 4" :key="i" class="rounded-xl bg-base-200 p-4">
                        <div class="skeleton h-3 w-20 mb-2"></div>
                        <div class="skeleton h-7 w-16 mb-2"></div>
                        <div class="skeleton h-3 w-24"></div>
                    </div>
                </template>
                <component
                    v-for="r in loading ? [] : teamRecords"
                    :key="r.label"
                    :is="r.href ? 'a' : 'div'"
                    :href="r.href"
                    class="rounded-xl bg-base-200 p-4 transition-all duration-300"
                    :class="r.href ? 'hover:bg-base-300/60 hover:-translate-y-1' : ''"
                >
                    <p class="text-[11px] uppercase tracking-widest font-black text-base-content/50">{{ r.label }}</p>
                    <p class="text-2xl lg:text-3xl font-black tracking-tight mt-1">{{ r.value }}</p>
                    <p class="text-xs text-base-content/50 mt-1 truncate">{{ r.sub }}</p>
                </component>
            </div>
        </div>

        <!-- Premios individuales -->
        <div>
            <h3 class="text-[11px] uppercase tracking-widest font-black text-base-content/50 mb-3">Los mejores en cada cosa</h3>
            <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 reveal-stagger">
                <template v-if="loading">
                    <div v-for="i in 8" :key="i" class="rounded-xl bg-base-200 p-4 flex items-center gap-3">
                        <div class="skeleton w-10 h-12 rounded-lg shrink-0"></div>
                        <div class="flex-1 space-y-2"><div class="skeleton h-3 w-24"></div><div class="skeleton h-4 w-20"></div></div>
                    </div>
                </template>
                <div v-for="a in loading ? [] : awards" :key="a.label" class="rounded-xl bg-base-200 p-4 transition-transform duration-300 hover:-translate-y-1">
                    <p class="text-[11px] uppercase tracking-widest font-black text-primary mb-2">{{ a.label }}</p>
                    <PlayerCard
                        :member="memberFor(a.playerId) ?? { playerId: a.playerId, playerName: a.playerName }"
                        :positions="positionsOf(a.playerId)"
                        link
                        no-dates
                    >
                        <p class="text-xs text-base-content/60 mt-0.5">{{ a.detail }}</p>
                    </PlayerCard>
                </div>
            </div>
        </div>

        <!-- Curiosidades -->
        <div v-if="!loading && curiosities.length" class="flex flex-wrap gap-2 justify-center reveal-stagger">
            <span v-for="c in curiosities" :key="c" class="badge badge-lg badge-soft badge-primary font-semibold">{{ c }}</span>
        </div>
    </section>
</template>
