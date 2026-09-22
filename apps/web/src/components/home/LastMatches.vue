<script setup lang="ts">
/** Último partido con el marcador grande, la forma reciente y el jugador del momento */
import { computed, onBeforeMount } from "vue"
import { useMatches } from "@/composables/useMatches"
import { useMembers } from "@/composables/useMembers"
import { usePlayerStats } from "@/composables/usePlayerStats"
import { routes } from "@/lib/query"
import { translateMatchType } from "@/i18n/translations"
import PlayerCard from "@/components/ui/PlayerCard.vue"

const { latest, loading, hasError, load } = useMatches()
const { members, load: loadMembers, memberFor } = useMembers()
const { positionsOf, load: loadStats } = usePlayerStats()

onBeforeMount(() => {
    load()
    loadMembers()
    loadStats()
})

const lastMatch = computed(() => latest.value[0])
const form = computed(() => latest.value.slice(0, 5))

const fmtDate = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

const RESULT_CLASS: Record<string, string> = { win: "text-success", loose: "text-error", tie: "text-base-content/70" }
const FORM_CLASS: Record<string, string> = { win: "bg-success text-success-content", loose: "bg-error text-error-content", tie: "bg-base-300 text-base-content" }
const FORM_LETTER: Record<string, string> = { win: "V", loose: "D", tie: "E" }

/** Mejor jugador de los últimos 5 partidos: mejor media entre quienes jugaron al menos 2 */
const playerOfTheMoment = computed(() => {
    const acc = new Map<string, { playerId: string; playerName: string; games: number; rating: number; goals: number }>()
    for (const match of form.value) {
        for (const p of match.ourClub.players) {
            if (!p.played || !p.playerId) continue
            const entry = acc.get(p.playerId) ?? { playerId: p.playerId, playerName: p.playerName, games: 0, rating: 0, goals: 0 }
            entry.games++
            entry.rating += p.rating
            entry.goals += p.goals
            acc.set(p.playerId, entry)
        }
    }
    const list = [...acc.values()].filter((p) => p.games >= 2)
    if (list.length === 0) return null
    const best = list.sort((a, b) => b.rating / b.games - a.rating / a.games)[0]
    return { ...best, avg: best.rating / best.games, member: memberFor(best.playerId) }
})
</script>

<template>
    <div class="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <!-- Último partido + forma -->
        <div class="reveal rounded-2xl bg-base-200 p-5">
            <h3 class="text-[11px] uppercase tracking-widest font-black text-base-content/50 mb-3">Último partido</h3>

            <div v-if="loading" class="space-y-3">
                <div class="skeleton h-16 w-full rounded-xl"></div>
                <div class="skeleton h-8 w-40"></div>
            </div>
            <p v-else-if="hasError || !lastMatch" class="text-sm text-base-content/50 py-6 text-center">Todavía no hay partidos.</p>

            <template v-else>
                <a :href="routes.match(lastMatch.matchId)" class="group flex items-center gap-3 rounded-xl bg-base-100 p-4 hover:bg-base-300/40 transition-colors">
                    <span class="flex-1 min-w-0 truncate font-bold text-sm lg:text-base">{{ lastMatch.ourClub.name }}</span>
                    <span class="text-2xl lg:text-4xl font-black tracking-tight tabular-nums transition-transform duration-300 group-hover:scale-110" :class="RESULT_CLASS[lastMatch.result]">
                        {{ lastMatch.ourClub.matchStats.goals }} : {{ lastMatch.opponentClub.matchStats.goals }}
                    </span>
                    <span class="flex-1 min-w-0 truncate text-right text-sm lg:text-base text-base-content/70">{{ lastMatch.opponentClub.name }}</span>
                </a>
                <div class="flex items-center gap-2 mt-3 flex-wrap">
                    <span class="badge badge-sm badge-soft badge-primary">{{ translateMatchType(lastMatch.matchType) }}</span>
                    <span class="text-xs text-base-content/50">{{ fmtDate(lastMatch.timestamp) }}</span>
                </div>

                <div class="mt-5">
                    <p class="text-[11px] uppercase tracking-widest font-black text-base-content/50 mb-2">Forma reciente</p>
                    <div class="flex gap-2">
                        <a
                            v-for="m in form"
                            :key="m.matchId"
                            :href="routes.match(m.matchId)"
                            class="size-8 rounded-lg grid place-items-center font-black text-xs transition-transform hover:scale-110"
                            :class="FORM_CLASS[m.result]"
                            :title="`${m.ourClub.matchStats.goals}-${m.opponentClub.matchStats.goals} vs ${m.opponentClub.name}`"
                        >{{ FORM_LETTER[m.result] }}</a>
                    </div>
                </div>
            </template>
        </div>

        <!-- Jugador del momento -->
        <div class="reveal-zoom aura aura-glow text-primary/40 rounded-2xl w-full">
        <div class="rounded-2xl bg-base-200 p-5 h-full">
            <h3 class="text-[11px] uppercase tracking-widest font-black text-base-content/50 mb-3">Jugador del momento</h3>
            <div v-if="loading" class="flex items-center gap-3">
                <div class="skeleton w-12 h-14 rounded-lg shrink-0"></div>
                <div class="flex-1 space-y-2"><div class="skeleton h-4 w-28"></div><div class="skeleton h-3 w-36"></div></div>
            </div>
            <p v-else-if="!playerOfTheMoment" class="text-sm text-base-content/50 py-6">Aún no hay partidos suficientes.</p>
            <template v-else>
                <PlayerCard
                    :member="playerOfTheMoment.member ?? { playerId: playerOfTheMoment.playerId, playerName: playerOfTheMoment.playerName }"
                    :positions="positionsOf(playerOfTheMoment.playerId)"
                    size="md"
                    link
                    no-dates
                />
                <div class="flex gap-4 mt-4">
                    <div>
                        <p class="text-[11px] uppercase tracking-widest font-black text-base-content/50">Media</p>
                        <p class="text-2xl font-black tracking-tight">{{ playerOfTheMoment.avg.toFixed(1) }}</p>
                    </div>
                    <div>
                        <p class="text-[11px] uppercase tracking-widest font-black text-base-content/50">Goles</p>
                        <p class="text-2xl font-black tracking-tight">{{ playerOfTheMoment.goals }}</p>
                    </div>
                    <div>
                        <p class="text-[11px] uppercase tracking-widest font-black text-base-content/50">Partidos</p>
                        <p class="text-2xl font-black tracking-tight">{{ playerOfTheMoment.games }}</p>
                    </div>
                </div>
                <p class="text-xs text-base-content/40 mt-2">En los últimos {{ form.length }} partidos</p>
            </template>
        </div>
        </div>
    </div>
</template>
