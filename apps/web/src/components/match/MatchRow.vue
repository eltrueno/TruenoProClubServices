<script setup lang="ts">
/**
 * Un partido en la lista de /partidos: fila compacta que lleva a su página de detalle.
 * A la izquierda, una casilla con la letra del resultado (V, E, D o N si es nulo) en su color;
 * luego marcador y rival, fecha y tipo (con su icono; "Derbi" contra el otro club), nuestros
 * goleadores y asistentes, y a la derecha avisos (Jugaste, nulo, penaltis, desconexión, prórroga)
 * y el MVP. Al pasar por encima se levanta un poco (neutro: el color de marca es para "Jugaste").
 */
import { computed } from "vue"
import type ClubMatchEntity from "@/model/match/ClubMatchEntity"
import { routes } from "@/lib/query"
import { hasExtraTime } from "@/lib/matchList"
import { useMembers } from "@/composables/useMembers"
import { onPlayerImageError } from "@/lib/playerImage"
import { OTHER_CLUBS } from "@/config/club"
import MvpIcon from "@/components/ui/MvpIcon.vue"
import GoalIcon from "@/components/ui/GoalIcon.vue"
import AssistIcon from "@/components/ui/AssistIcon.vue"

const props = defineProps<{ match: ClubMatchEntity; myId?: string | null }>()
const { memberFor, imageFor } = useMembers()

const m = computed(() => props.match)
const us = computed(() => m.value.ourClub)
const them = computed(() => m.value.opponentClub)

/** Tipo de partido: texto e icono (Heroicons, relleno) */
const TYPE: Record<string, { label: string; icon: string }> = {
    league: { label: "Liga", icon: "M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 0 0-.584.859 6.753 6.753 0 0 0 6.138 5.6 6.73 6.73 0 0 0 2.743 1.346A6.707 6.707 0 0 1 9.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 0 0-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 0 1-1.112-3.173 6.73 6.73 0 0 0 2.743-1.347 6.753 6.753 0 0 0 6.139-5.6.75.75 0 0 0-.585-.858 47.077 47.077 0 0 0-3.07-.543V2.62a.75.75 0 0 0-.658-.744 49.798 49.798 0 0 0-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 0 0-.657.744Zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 0 1 3.16 5.337a45.6 45.6 0 0 1 2.006-.343v.256Zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 0 1-2.863 3.207 6.72 6.72 0 0 0 .857-3.294Z" },
    playoff: { label: "Playoff", icon: "M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" },
    friendly: { label: "Amistoso", icon: "M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 0 0-1.032-.211 50.89 50.89 0 0 0-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 0 0 2.433 3.984L7.28 21.53A.75.75 0 0 1 6 21v-4.03a48.527 48.527 0 0 1-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979Z M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 0 0 1.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0 0 15.75 7.5Z" },
}
const isDerby = computed(() => OTHER_CLUBS.some((c) => c.name.trim().toLowerCase() === them.value.name.trim().toLowerCase()))

/** Casilla del resultado: letra y colores */
const RESULT = computed(() => (m.value.voided ? { letter: "N", text: "Nulo", tile: "bg-base-content/8 text-base-content/50 ring-base-content/15" }
    : m.value.result === "win" ? { letter: "V", text: "Victoria", tile: "bg-success/15 text-success ring-success/30" }
        : m.value.result === "loose" ? { letter: "D", text: "Derrota", tile: "bg-error/15 text-error ring-error/30" }
            : { letter: "E", text: "Empate", tile: "bg-base-content/10 text-base-content/80 ring-base-content/20" }))

const when = computed(() => {
    const d = new Date(m.value.timestamp * 1000)
    return `${d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })} · ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`
})

const scorers = computed(() => us.value.players.filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals))
const assisters = computed(() => us.value.players.filter((p) => p.assists > 0).sort((a, b) => b.assists - a.assists))
const mvp = computed(() => [...us.value.players, ...them.value.players].find((p) => p.manOfTheMatch) ?? null)
const mvpOurs = computed(() => !!mvp.value && us.value.players.some((p) => p.playerId === mvp.value!.playerId))
const iPlayed = computed(() => !!props.myId && us.value.players.some((p) => p.playerId === props.myId))
const extraTime = computed(() => hasExtraTime(m.value))
</script>

<template>
    <a :href="routes.match(m.matchId)" class="match-row group flex items-center gap-3 sm:gap-4 rounded-2xl bg-base-100 dark:bg-base-200 ring-1 ring-base-content/5 px-3 sm:px-4 py-3
        transition-[translate,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-base-content/15 focus-visible:outline-2 focus-visible:outline-primary">
        <!-- Resultado -->
        <span class="size-11 sm:size-12 shrink-0 rounded-xl ring-1 grid place-items-center text-lg sm:text-xl font-black" :class="RESULT.tile" :title="RESULT.text" aria-hidden="true">{{ RESULT.letter }}</span>

        <!-- Marcador, rival, fecha y tipo -->
        <span class="flex-1 min-w-0 flex flex-col gap-1">
            <span class="flex items-baseline gap-2 sm:gap-3 min-w-0">
                <span class="text-2xl sm:text-3xl font-black tabular-nums leading-none shrink-0" :class="m.voided && 'line-through opacity-50'">
                    {{ us.matchStats.goals }}<span class="text-base-content/30 mx-0.5">–</span>{{ them.matchStats.goals }}
                </span>
                <span class="font-black truncate">
                    <span class="sr-only">{{ RESULT.text }} </span>vs {{ them.name }}
                </span>
                <span v-if="m.winnerByPen" class="text-xs font-bold text-base-content/60 shrink-0">pen. {{ us.penaltiesScore ?? "?" }}–{{ them.penaltiesScore ?? "?" }}</span>
            </span>
            <span class="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-base-content/60">
                <span class="capitalize">{{ when }}</span>
                <span class="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-[0.65rem] text-base-content/70">
                    <svg class="size-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" :d="TYPE[m.matchType]?.icon" /></svg>
                    {{ TYPE[m.matchType]?.label ?? m.matchType }}
                </span>
                <span v-if="isDerby" class="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-[0.65rem] text-primary">
                    <svg class="size-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z" clip-rule="evenodd" /></svg>
                    Derbi
                </span>
            </span>
            <!-- Goleadores y asistentes -->
            <span v-if="scorers.length || assisters.length" class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-base-content/75">
                <span v-if="scorers.length" class="flex items-center gap-1 min-w-0">
                    <GoalIcon class="size-3.5 shrink-0 text-base-content/60" />
                    <span class="truncate">
                        <template v-for="(p, i) in scorers.slice(0, 4)" :key="p.playerId">{{ i ? ", " : "" }}<span :class="p.playerId === myId && 'font-black text-primary'">{{ p.playerName }}</span><template v-if="p.goals > 1"> ×{{ p.goals }}</template></template><template v-if="scorers.length > 4">…</template>
                    </span>
                </span>
                <span v-if="assisters.length" class="hidden md:flex items-center gap-1 min-w-0">
                    <AssistIcon class="size-3.5 shrink-0 text-base-content/60" />
                    <span class="truncate">
                        <template v-for="(p, i) in assisters.slice(0, 3)" :key="p.playerId">{{ i ? ", " : "" }}<span :class="p.playerId === myId && 'font-black text-primary'">{{ p.playerName }}</span><template v-if="p.assists > 1"> ×{{ p.assists }}</template></template><template v-if="assisters.length > 3">…</template>
                    </span>
                </span>
            </span>
        </span>

        <!-- Avisos y MVP -->
        <span class="flex flex-col items-end justify-center gap-1.5 shrink-0">
            <span class="flex flex-wrap justify-end gap-1">
                <span v-if="iPlayed" class="badge badge-sm badge-primary font-bold gap-1">
                    <svg class="size-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                    Jugaste
                </span>
                <span v-if="m.voided" class="badge badge-xs badge-ghost" title="No cuenta para stats, rachas ni logros">Nulo</span>
                <span v-if="m.winnerByDnf" class="badge badge-xs badge-warning badge-soft" title="Alguien se desconectó">Desconexión</span>
                <span v-else-if="extraTime && !m.winnerByPen" class="badge badge-xs badge-ghost">Prórroga</span>
            </span>
            <span v-if="mvp" class="flex items-center gap-1.5" :title="`MVP: ${mvp.playerName}${mvpOurs ? '' : ' (rival)'}`">
                <span class="hidden md:block text-xs font-bold truncate max-w-28" :class="mvpOurs ? '' : 'text-base-content/50'">{{ mvp.playerName }}</span>
                <span class="relative">
                    <span class="block size-9 rounded-full overflow-hidden outline-2" :class="mvpOurs ? 'outline-warning bg-primary/45' : 'outline-base-content/20 bg-base-content/10'">
                        <img v-if="memberFor(mvp.playerId)" :src="imageFor(mvp.playerId)" alt="" loading="lazy" class="size-full object-cover object-top scale-[2] origin-top" @error="onPlayerImageError" />
                        <span v-else class="size-full grid place-items-center text-xs font-black text-base-content/60" aria-hidden="true">{{ mvp.playerName.slice(0, 2).toUpperCase() }}</span>
                    </span>
                    <MvpIcon class="absolute -top-1.5 -right-1.5 size-4 drop-shadow" />
                </span>
            </span>
        </span>
    </a>
</template>
