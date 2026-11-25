<script setup lang="ts">
/**
 * Equipo: ranking de notas de los jugadores de los dos equipos (barras de 0 a 10, color por equipo y
 * el valor escrito) y quién llevó el peso: el reparto de goles, tiros, pases y entradas entre los
 * jugadores de un equipo (los cuatro primeros y el resto juntos).
 */
import { computed, ref } from "vue"
import type ClubMatchEntity from "@/model/match/ClubMatchEntity"
import { shareOf, type ShareMetric } from "@/lib/matchInsights"
import { routes } from "@/lib/query"
import MatchCard from "./MatchCard.vue"
import { useMembers } from "@/composables/useMembers"
import MvpIcon from "@/components/ui/MvpIcon.vue"

const props = defineProps<{ match: ClubMatchEntity; myId?: string | null }>()
const { memberFor } = useMembers()
/** Es de nuestra plantilla (puede haber jugado ese día con el rival): foto y enlace a su perfil */
const isMember = (playerId: string) => !!memberFor(playerId)
const fmt1 = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// ── Notas ──
const ratings = computed(() =>
    [
        ...props.match.ourClub.players.map((p) => ({ p, ours: true })),
        ...props.match.opponentClub.players.map((p) => ({ p, ours: false })),
    ]
        .filter((x) => x.p.rating > 0)
        .sort((a, b) => b.p.rating - a.p.rating || Number(b.ours) - Number(a.ours)))

// ── Reparto ──
const side = ref<"us" | "them">("us")
const METRICS: { key: ShareMetric; label: string }[] = [
    { key: "goals", label: "Goles" },
    { key: "shots", label: "Tiros" },
    { key: "passesMade", label: "Pases" },
    { key: "tacklesMade", label: "Entradas" },
]
const TOP = 4
const shares = computed(() => {
    const players = side.value === "us" ? props.match.ourClub.players : props.match.opponentClub.players
    return METRICS.map((m) => {
        const { total, rows } = shareOf(players, m.key)
        const rest = rows.slice(TOP)
        return {
            ...m,
            total,
            rows: rows.slice(0, TOP),
            rest: rest.length ? { count: rest.length, value: rest.reduce((s, r) => s + r.value, 0), share: rest.reduce((s, r) => s + r.share, 0) } : null,
        }
    })
})
const pct = (n: number) => `${Math.round(n * 100)}%`
</script>

<template>
    <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4 sm:gap-6 py-2">
        <!-- Notas -->
        <MatchCard title="Notas" hint="Todos los jugadores de los dos equipos, de mejor a peor nota.">
            <template #actions>
                <span class="flex items-center gap-3 text-xs font-bold">
                    <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-(--us)"></span>{{ match.ourClub.name }}</span>
                    <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-(--them)"></span>{{ match.opponentClub.name }}</span>
                </span>
            </template>
            <ol class="flex flex-col gap-2">
                <li v-for="(x, i) in ratings" :key="`${x.ours}-${x.p.playerId}`" class="grid grid-cols-[1.5rem_minmax(0,9rem)_minmax(0,1fr)_2.5rem] items-center gap-2 text-sm rounded-lg"
                    :class="x.p.playerId === myId && 'bg-primary/10 ring-1 ring-primary/40 -mx-1 px-1 py-0.5'">
                    <span class="text-xs text-base-content/40 tabular-nums text-right">{{ i + 1 }}</span>
                    <component :is="isMember(x.p.playerId) ? 'a' : 'span'" :href="isMember(x.p.playerId) ? routes.player(x.p.playerId) : undefined"
                        class="truncate font-bold" :class="[isMember(x.p.playerId) && 'hover:text-primary', !x.ours && 'text-base-content/70']">
                        {{ x.p.playerName }}<MvpIcon v-if="x.p.manOfTheMatch" class="size-4 ml-1 -mt-0.5" label="MVP" /><span v-if="x.p.playerId === myId" class="badge badge-xs badge-primary font-black tracking-widest ml-1 align-middle">TÚ</span>
                    </component>
                    <span class="h-3 rounded-full bg-base-content/8 overflow-hidden"><span class="block h-full rounded-full bar" :class="x.ours ? 'bg-(--us)' : 'bg-(--them)'" :style="{ width: `${x.p.rating * 10}%`, '--k': i }"></span></span>
                    <b class="tabular-nums text-right">{{ fmt1(x.p.rating) }}</b>
                </li>
            </ol>
        </MatchCard>

        <!-- Quién llevó el peso -->
        <MatchCard title="Quién llevó el peso" hint="Qué parte de los goles, tiros, pases y entradas del equipo hizo cada jugador.">
            <template #actions>
                <div role="group" aria-label="Equipo" class="join">
                    <button type="button" class="join-item btn btn-sm" :class="side === 'us' && 'btn-primary'" :aria-pressed="side === 'us'" @click="side = 'us'">{{ match.ourClub.name }}</button>
                    <button type="button" class="join-item btn btn-sm" :class="side === 'them' && 'btn-primary'" :aria-pressed="side === 'them'" @click="side = 'them'">Rival</button>
                </div>
            </template>
            <Transition name="side-swap" mode="out-in">
            <div :key="side" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div v-for="m in shares" :key="`${side}-${m.key}`" class="rounded-2xl dark:bg-base-100 bg-base-300 p-3 sm:p-4">
                    <p class="flex items-baseline justify-between mb-3">
                        <span class="text-base-content/50 uppercase text-xs font-black tracking-widest">{{ m.label }}</span>
                        <span class="text-2xl font-black tabular-nums leading-none">{{ m.total }}</span>
                    </p>
                    <ul v-if="m.total" class="flex flex-col gap-2">
                        <li v-for="r in m.rows" :key="r.playerId" class="text-sm">
                            <span class="flex justify-between gap-2 mb-0.5"><component :is="isMember(r.playerId) ? 'a' : 'span'" :href="isMember(r.playerId) ? routes.player(r.playerId) : undefined" class="truncate font-bold" :class="[isMember(r.playerId) && 'hover:text-primary', r.playerId === myId && 'text-primary']">{{ r.playerName }}<span v-if="r.playerId === myId" class="badge badge-xs badge-primary font-black tracking-widest ml-1 align-middle">TÚ</span></component><span class="tabular-nums shrink-0"><b>{{ r.value }}</b> <span class="text-base-content/50 text-xs">{{ pct(r.share) }}</span></span></span>
                            <span class="block h-2 rounded-full bg-base-content/8 overflow-hidden"><span class="block h-full rounded-full bar" :class="side === 'us' ? 'bg-(--us)' : 'bg-(--them)'" :style="{ width: pct(r.share) }"></span></span>
                        </li>
                        <li v-if="m.rest" class="text-sm text-base-content/60">
                            <span class="flex justify-between gap-2 mb-0.5"><span class="truncate">Resto ({{ m.rest.count }})</span><span class="tabular-nums"><b>{{ m.rest.value }}</b> <span class="text-xs">{{ pct(m.rest.share) }}</span></span></span>
                            <span class="block h-2 rounded-full bg-base-content/8 overflow-hidden"><span class="block h-full rounded-full bg-base-content/30" :style="{ width: pct(m.rest.share) }"></span></span>
                        </li>
                    </ul>
                    <p v-else class="text-sm text-base-content/50">Ninguno.</p>
                </div>
            </div>
            </Transition>
        </MatchCard>
    </div>
</template>

<style scoped>
.side-swap-enter-active, .side-swap-leave-active { transition: opacity 0.25s, translate 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
.side-swap-enter-from { opacity: 0; translate: 1.5rem 0; }
.side-swap-leave-to { opacity: 0; translate: -1.5rem 0; }
@media (prefers-reduced-motion: reduce) { .side-swap-enter-active, .side-swap-leave-active { transition: none; } }
@media (prefers-reduced-motion: no-preference) {
    .bar {
        transform-origin: left;
        animation: grow 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        animation-delay: calc(var(--k, 0) * 30ms);
    }
}
@keyframes grow { from { scale: 0 1; } }
</style>
