<script setup lang="ts">
/**
 * Un partido en la lista de /partidos: fila compacta que lleva a su página de detalle.
 * Tira de color del resultado, fecha y tipo, marcador y rival, nuestros goleadores y asistentes,
 * el MVP y avisos (nulo, penaltis, desconexión, prórroga). Tu jugador, si jugó, marcado.
 */
import { computed } from "vue"
import type ClubMatchEntity from "@/model/match/ClubMatchEntity"
import { routes } from "@/lib/query"
import { useMembers } from "@/composables/useMembers"
import { onPlayerImageError } from "@/lib/playerImage"
import MvpIcon from "@/components/ui/MvpIcon.vue"
import GoalIcon from "@/components/ui/GoalIcon.vue"
import AssistIcon from "@/components/ui/AssistIcon.vue"

const props = defineProps<{ match: ClubMatchEntity; myId?: string | null }>()
const { memberFor, imageFor } = useMembers()

const m = computed(() => props.match)
const us = computed(() => m.value.ourClub)
const them = computed(() => m.value.opponentClub)

const TYPE: Record<string, { label: string; tone: string }> = {
    league: { label: "Liga", tone: "badge-primary badge-soft" },
    playoff: { label: "Playoff", tone: "badge-warning badge-soft" },
    friendly: { label: "Amistoso", tone: "badge-ghost" },
}
const RESULT = computed(() => (m.value.voided ? { bar: "bg-base-content/25", text: "Nulo", tone: "text-base-content/50" }
    : m.value.result === "win" ? { bar: "bg-success", text: "Victoria", tone: "text-success" }
        : m.value.result === "loose" ? { bar: "bg-error", text: "Derrota", tone: "text-error" }
            : { bar: "bg-base-content/40", text: "Empate", tone: "text-base-content/70" }))

const when = computed(() => {
    const d = new Date(m.value.timestamp * 1000)
    return {
        day: d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }),
        time: d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
    }
})

/** Nuestros goleadores y asistentes (los que más primero), en pocas líneas */
const scorers = computed(() => us.value.players.filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals))
const assisters = computed(() => us.value.players.filter((p) => p.assists > 0).sort((a, b) => b.assists - a.assists))
const mvp = computed(() => [...us.value.players, ...them.value.players].find((p) => p.manOfTheMatch) ?? null)
const mvpOurs = computed(() => !!mvp.value && us.value.players.some((p) => p.playerId === mvp.value!.playerId))
const iPlayed = computed(() => !!props.myId && us.value.players.some((p) => p.playerId === props.myId))
/** Prórroga: alguien pasó de ~117 min (el umbral del worker) */
const extraTime = computed(() => [...us.value.players, ...them.value.players].some((p) => p.minutesPlayed * 60 >= 7000))
</script>

<template>
    <a :href="routes.match(m.matchId)" class="match-row group relative flex items-stretch gap-3 sm:gap-4 rounded-2xl bg-base-100 dark:bg-base-200 ring-1 ring-base-content/5 pl-4 pr-3 sm:pr-4 py-3 overflow-hidden
        transition-[box-shadow,translate] duration-200 hover:ring-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary"
        :class="iPlayed && 'ring-primary/30'">
        <!-- Tira del resultado -->
        <span class="absolute left-0 inset-y-0 w-1.5" :class="RESULT.bar" aria-hidden="true"></span>

        <!-- Fecha y tipo -->
        <span class="hidden sm:flex flex-col justify-center w-24 shrink-0 text-xs">
            <span class="font-bold capitalize">{{ when.day }}</span>
            <span class="text-base-content/50 tabular-nums">{{ when.time }}</span>
            <span class="badge badge-xs mt-1 w-fit" :class="TYPE[m.matchType]?.tone">{{ TYPE[m.matchType]?.label ?? m.matchType }}</span>
        </span>

        <!-- Marcador y rival -->
        <span class="flex-1 min-w-0 flex flex-col justify-center gap-1">
            <span class="flex items-baseline gap-2 sm:gap-3 min-w-0">
                <span class="text-2xl sm:text-3xl font-black tabular-nums leading-none shrink-0" :class="m.voided && 'line-through opacity-50'">
                    {{ us.matchStats.goals }}<span class="text-base-content/30 mx-0.5">–</span>{{ them.matchStats.goals }}
                </span>
                <span class="min-w-0">
                    <span class="block text-[0.65rem] uppercase tracking-widest font-black" :class="RESULT.tone">{{ RESULT.text }}<template v-if="m.winnerByPen"> · pen. {{ us.penaltiesScore ?? "?" }}–{{ them.penaltiesScore ?? "?" }}</template></span>
                    <span class="block font-black truncate group-hover:text-primary transition-colors">vs {{ them.name }}</span>
                </span>
            </span>
            <!-- En móvil: fecha y tipo aquí -->
            <span class="sm:hidden flex items-center gap-2 text-xs text-base-content/60">
                <span class="capitalize">{{ when.day }}</span>
                <span class="badge badge-xs" :class="TYPE[m.matchType]?.tone">{{ TYPE[m.matchType]?.label ?? m.matchType }}</span>
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
                <span v-if="iPlayed" class="badge badge-xs badge-primary font-black tracking-widest">TÚ</span>
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
