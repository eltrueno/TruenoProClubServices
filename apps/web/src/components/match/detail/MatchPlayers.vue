<script setup lang="ts">
/**
 * Jugadores del partido: selector Nosotros / Rival, campo y lista (por nota) y la ficha del elegido:
 * su nota frente a su media, la forma en sus últimos 5 partidos y sus números comparados con su
 * media, con la media de su posición o con el equipo en este partido (barra con una raya de
 * referencia y la diferencia escrita). Del rival no hay historial: solo posición y equipo.
 */
import { computed, ref, watch } from "vue"
import type ClubMatchEntity from "@/model/match/ClubMatchEntity"
import type MatchPlayerEntity from "@/model/match/MatchPlayerEntity"
import type AverageStatsEntity from "@/model/AverageStatsEntity"
import { playerForm } from "@/lib/matchInsights"
import { playerPhrase } from "@/lib/matchPhrases"
import { translatePosition } from "@/i18n/translations"
import { useMembers } from "@/composables/useMembers"
import { onPlayerImageError } from "@/lib/playerImage"
import { routes } from "@/lib/query"
import MatchPitch from "./MatchPitch.vue"
import MatchCard from "./MatchCard.vue"
import MvpIcon from "@/components/ui/MvpIcon.vue"

const props = defineProps<{
    match: ClubMatchEntity
    history: ClubMatchEntity[] | null
    averages: AverageStatsEntity[]
    initialPlayer: string | null
    myId?: string | null
}>()
const { imageFor, memberFor } = useMembers()
/** Es de nuestra plantilla (puede haber jugado ese día con el rival): foto y enlace a su perfil */
const isMember = (playerId: string) => !!memberFor(playerId)

const fmt = (n: number, d = 0) => (Number.isFinite(n) ? n : 0).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d })
const signed = (n: number, d = 1) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${fmt(Math.abs(n), d)}`

// ── Equipo y jugador elegidos ──
const side = ref<"us" | "them">(props.match.opponentClub.players.some((p) => p.playerId === props.initialPlayer) ? "them" : "us")
const players = computed(() => (side.value === "us" ? props.match.ourClub.players : props.match.opponentClub.players)
    .slice().sort((a, b) => b.rating - a.rating))
const selectedId = ref<string | null>(null)
watch(players, (list) => {
    if (!list.some((p) => p.playerId === selectedId.value)) {
        selectedId.value = list.find((p) => p.playerId === props.initialPlayer)?.playerId ?? list[0]?.playerId ?? null
    }
}, { immediate: true })
const player = computed(() => players.value.find((p) => p.playerId === selectedId.value) ?? null)
const ours = computed(() => side.value === "us")

// La frase solo cambia al cambiar de jugador (es al azar)
const phrase = computed(() => (player.value ? playerPhrase(player.value) : ""))

// ── Forma y medias ──
const form = computed(() => (ours.value && props.history && player.value ? playerForm(props.history, props.match.matchId, player.value.playerId) : null))
const ratingDelta = computed(() => (form.value && player.value && form.value.games > 1 ? player.value.rating - form.value.ratingAve : null))

/** Puntos de la minigráfica de forma (nota de 0 a 10) */
const spark = computed(() => {
    const last = form.value?.last ?? []
    if (last.length < 2) return null
    const W = 160, H = 44, pad = 6
    const pts = last.map((g, i) => ({ ...g, x: pad + (i / (last.length - 1)) * (W - pad * 2), y: H - pad - (g.rating / 10) * (H - pad * 2) }))
    return { W, H, pts, path: pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") }
})

// ── Comparación ──
type Ref = "self" | "position" | "team"
const reference = ref<Ref>("self")
const REFS = computed(() => [
    { key: "self" as const, label: "Su media", disabled: !ours.value },
    { key: "position" as const, label: "Su posición", disabled: false },
    { key: "team" as const, label: "Equipo hoy", disabled: false },
])
watch(ours, (o) => { if (!o && reference.value === "self") reference.value = "position" }, { immediate: true })

type Row = { label: string; value: number; ref: number | null; pct?: boolean; decimals?: number }
const rows = computed<Row[]>(() => {
    const p = player.value
    if (!p) return []
    const team = (side.value === "us" ? props.match.ourClub.players : props.match.opponentClub.players).filter((x) => x.rating > 0)
    const teamAvg = (f: (x: MatchPlayerEntity) => number) => (team.length ? team.reduce((s, x) => s + f(x), 0) / team.length : null)
    const teamRate = (ok: (x: MatchPlayerEntity) => number, tot: (x: MatchPlayerEntity) => number) => {
        const t = team.reduce((s, x) => s + tot(x), 0)
        return t ? (team.reduce((s, x) => s + ok(x), 0) / t) * 100 : null
    }
    const pos = props.averages.find((a) => a.position === p.position)
    const perGame = (n: number) => (pos && pos.gamesPlayed ? n / pos.gamesPlayed : null)
    const self = form.value?.perMatch
    const pick = (selfV: number | undefined, posV: number | null | undefined, teamV: number | null) =>
        reference.value === "self" ? (self && form.value!.games > 0 ? selfV ?? null : null) : reference.value === "position" ? posV ?? null : teamV

    const list: Row[] = [
        { label: "Goles", value: p.goals, ref: pick(self?.goals, pos?.goalsPerMatch, teamAvg((x) => x.goals)), decimals: 1 },
        { label: "Asistencias", value: p.assists, ref: pick(self?.assists, pos?.assistsPerMatch, teamAvg((x) => x.assists)), decimals: 1 },
        { label: "Tiros", value: p.shots, ref: pick(self?.shots, perGame(pos?.shots ?? 0), teamAvg((x) => x.shots)), decimals: 1 },
        { label: "Pases", value: p.passesMade, ref: pick(self?.passesMade, pos?.passesMadePerMatch, teamAvg((x) => x.passesMade)), decimals: 0 },
        { label: "Acierto de pase", value: p.passesMade ? (p.passesSuccess / p.passesMade) * 100 : 0, ref: pick(self?.passSuccessRate, pos?.passSuccessRate, teamRate((x) => x.passesSuccess, (x) => x.passesMade)), pct: true },
        { label: "Entradas", value: p.tacklesMade, ref: pick(self?.tacklesMade, perGame(pos?.tacklesMade ?? 0), teamAvg((x) => x.tacklesMade)), decimals: 1 },
        { label: "Acierto de entrada", value: p.tacklesMade ? (p.tacklesSuccess / p.tacklesMade) * 100 : 0, ref: pick(self?.tackleSuccessRate, pos?.tackleSuccessRate, teamRate((x) => x.tacklesSuccess, (x) => x.tacklesMade)), pct: true },
    ]
    if (p.position === "goalkeeper") list.push({ label: "Paradas", value: p.saves, ref: pick(self?.saves, pos?.savesPerMatch, teamAvg((x) => x.saves)), decimals: 1 })
    return list
})
const scale = (r: Row) => (r.pct ? 100 : Math.max(r.value, r.ref ?? 0, 1) * 1.25)
const refLabel = computed(() => REFS.value.find((r) => r.key === reference.value)?.label.toLowerCase() ?? "")

const RATING_TONE = (r: number) => (r >= 8 ? "bg-success text-success-content" : r >= 7 ? "bg-lime-500 text-black" : r >= 6 ? "bg-warning text-warning-content" : "bg-error text-error-content")
</script>

<template>
    <div class="py-2">
    <MatchCard title="Jugadores" hint="Pulsa un jugador en el campo o en la lista para ver su partido al detalle.">
        <template #actions>
            <div role="group" aria-label="Equipo" class="join">
                <button type="button" class="join-item btn btn-sm" :class="side === 'us' && 'btn-primary'" :aria-pressed="side === 'us'" @click="side = 'us'">{{ match.ourClub.name }}</button>
                <button type="button" class="join-item btn btn-sm" :class="side === 'them' && 'btn-primary'" :aria-pressed="side === 'them'" @click="side = 'them'">Rival</button>
            </div>
        </template>

        <!-- Campo (protagonista) y ficha del elegido -->
        <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4 sm:gap-6 items-start">
            <Transition name="side-swap" mode="out-in">
                <MatchPitch :key="side" :players="players" :selected="selectedId" :my-id="myId" :rival="!ours" @select="selectedId = $event" class="w-full max-w-xl mx-auto lg:max-w-none" />
            </Transition>

            <Transition name="card-swap" mode="out-in">
                <article v-if="player" :key="`${side}-${player.playerId}`" class="rounded-2xl p-4 sm:p-5 dark:bg-base-100 bg-base-300 shadow-sm flex flex-col gap-5 lg:sticky lg:top-[calc(var(--nav-h,4rem)+5.5rem)]">
                    <header class="flex gap-4 items-end">
                        <!-- Foto como en la ficha de jugador -->
                        <div class="relative shrink-0 w-24 sm:w-28 aspect-8/9 rounded-2xl overflow-hidden dark:bg-base-200 bg-base-100 ring-2" :class="ours ? 'ring-(--us)/60' : 'ring-(--them)/60'">
                            <img v-if="isMember(player.playerId)" :src="imageFor(player.playerId)" alt="" class="w-full h-full object-contain object-top scale-[1.55] origin-top" @error="onPlayerImageError" />
                            <span v-else class="size-full grid place-items-center text-3xl font-black text-(--them)" aria-hidden="true">{{ player.playerName.slice(0, 2).toUpperCase() }}</span>
                        </div>
                        <div class="flex-1 min-w-0 flex flex-col gap-1">
                            <p class="text-xs uppercase tracking-widest font-black text-base-content/50">{{ translatePosition(player.position) }} · {{ Math.round(player.minutesPlayed) }} min</p>
                            <h3 class="text-xl sm:text-2xl font-black leading-tight truncate">{{ player.playerName }}<MvpIcon v-if="player.manOfTheMatch" class="size-5 ml-1.5 -mt-1" label="MVP" /></h3>
                            <div class="flex items-end gap-3">
                                <span class="text-4xl sm:text-5xl font-black tabular-nums leading-none">{{ fmt(player.rating, 1) }}</span>
                                <span v-if="ratingDelta !== null" class="text-sm font-bold pb-1" :class="ratingDelta >= 0 ? 'text-success' : 'text-error'">{{ signed(ratingDelta) }} sobre su media</span>
                            </div>
                            <a v-if="isMember(player.playerId)" :href="routes.player(player.playerId)" class="link link-hover text-sm font-bold text-primary w-fit">Ver su perfil →</a>
                        </div>
                    </header>

                    <p class="text-sm italic text-base-content/70">{{ phrase }}</p>

                    <!-- Forma -->
                    <div v-if="ours">
                        <p class="text-xs uppercase tracking-widest font-black text-base-content/50 mb-1">Sus últimos partidos</p>
                        <div v-if="!history" class="skeleton h-12 w-48"></div>
                        <svg v-else-if="spark" :viewBox="`0 0 ${spark.W} ${spark.H}`" class="spark w-48 h-12 overflow-visible" role="img"
                            :aria-label="`Notas en sus últimos partidos: ${spark.pts.map((p) => fmt(p.rating, 1)).join(', ')}`">
                            <line :x1="0" :x2="spark.W" :y1="spark.H - 6 - 0.6 * (spark.H - 12)" :y2="spark.H - 6 - 0.6 * (spark.H - 12)" class="stroke-base-content/15" stroke-dasharray="3 3" />
                            <path :d="spark.path" fill="none" class="spark-line stroke-(--us)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" />
                            <circle v-for="(p, i) in spark.pts" :key="p.matchId" :cx="p.x" :cy="p.y" :r="p.current ? 5 : 3.5" class="spark-dot" :style="{ '--k': i }"
                                :class="p.current ? 'fill-(--us) stroke-base-100' : 'fill-base-100 stroke-(--us)'" stroke-width="2" />
                        </svg>
                        <p v-else class="text-xs text-base-content/50">Su primer partido con el club.</p>
                    </div>

                    <!-- Comparación -->
                    <div>
                        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <p class="text-xs uppercase tracking-widest font-black text-base-content/50">Comparado con</p>
                            <div role="group" aria-label="Comparar con" class="join">
                                <button v-for="r in REFS" :key="r.key" type="button" class="join-item btn btn-xs" :class="reference === r.key && 'btn-primary'"
                                    :disabled="r.disabled" :aria-pressed="reference === r.key" @click="reference = r.key">{{ r.label }}</button>
                            </div>
                        </div>
                        <dl class="flex flex-col gap-2.5">
                            <div v-for="(r, i) in rows" :key="r.label" class="grid grid-cols-[7rem_minmax(0,1fr)_3rem_3rem] sm:grid-cols-[8rem_minmax(0,1fr)_3rem_3rem] items-center gap-2 text-sm">
                                <dt class="text-base-content/70 truncate">{{ r.label }}</dt>
                                <div class="relative h-3 rounded-full bg-base-content/8">
                                    <span class="stat-bar absolute inset-y-0 left-0 rounded-full" :class="ours ? 'bg-(--us)' : 'bg-(--them)'" :style="{ width: `${Math.min(100, (r.value / scale(r)) * 100)}%`, '--k': i }"></span>
                                    <span v-if="r.ref !== null" class="ref-mark absolute -top-1 -bottom-1 w-1 -ml-0.5 rounded-full bg-base-content/80" :style="{ left: `${Math.min(100, (r.ref / scale(r)) * 100)}%` }" :title="`${refLabel}: ${fmt(r.ref, r.pct ? 0 : r.decimals)}${r.pct ? '%' : ''}`"></span>
                                </div>
                                <dd class="text-right font-black tabular-nums">{{ fmt(r.value) }}{{ r.pct ? "%" : "" }}</dd>
                                <dd class="text-right text-xs tabular-nums font-bold">
                                    <span :key="reference" class="delta inline-block" :class="r.ref === null ? 'text-base-content/30' : r.value - r.ref >= 0 ? 'text-success' : 'text-error'">
                                        {{ r.ref === null ? "—" : signed(r.value - r.ref, r.pct ? 0 : 1) }}
                                    </span>
                                </dd>
                            </div>
                        </dl>
                        <p class="text-xs text-base-content/50 mt-3">La raya marca {{ reference === "team" ? "la media del equipo en este partido" : reference === "position" ? `la media de un ${translatePosition(player.position).toLowerCase()} por partido` : "su media por partido" }}.</p>
                    </div>
                </article>
            </Transition>
        </div>

        <!-- Lista por nota -->
        <Transition name="side-swap" mode="out-in">
            <ol :key="side" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1.5" :aria-label="`Jugadores de ${ours ? match.ourClub.name : match.opponentClub.name}, por nota`">
                <li v-for="(p, i) in players" :key="p.playerId" class="list-row" :style="{ '--k': i }">
                    <button type="button" class="w-full grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors cursor-pointer"
                        :class="selectedId === p.playerId ? 'dark:bg-base-100 bg-base-300 ring-2 ring-primary/50' : 'hover:bg-base-content/5'" :aria-pressed="selectedId === p.playerId" @click="selectedId = p.playerId">
                        <span class="rounded-md text-center text-sm font-black tabular-nums py-0.5" :class="RATING_TONE(p.rating)">{{ fmt(p.rating, 1) }}</span>
                        <span class="min-w-0"><span class="font-bold truncate block">{{ p.playerName }} <span v-if="p.playerId === myId" class="badge badge-xs badge-primary font-black tracking-widest ml-0.5 align-middle">TÚ</span></span><span class="text-xs text-base-content/50">{{ translatePosition(p.position) }} · {{ Math.round(p.minutesPlayed) }}'</span></span>
                        <span class="flex items-center gap-1.5 text-xs font-bold text-base-content/70">
                            <span v-if="p.goals" :title="`${p.goals} goles`" class="inline-flex items-center gap-0.5 tabular-nums">
                                <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path stroke-linejoin="round" d="m12 7.5 4 2.9-1.5 4.6h-5L8 10.4l4-2.9ZM12 7.5V3m4 7.4 4.3-1.4M14.5 15l2.6 3.7M9.5 15l-2.6 3.7M8 10.4 3.7 9" /></svg>{{ p.goals > 1 ? p.goals : "" }}
                            </span>
                            <span v-if="p.assists" :title="`${p.assists} asistencias`" class="tabular-nums">A{{ p.assists }}</span>
                            <MvpIcon v-if="p.manOfTheMatch" class="size-4" label="MVP" />
                            <span v-if="p.redCards" class="inline-block w-2.5 h-3.5 rounded-[2px] bg-error" title="Roja"></span>
                        </span>
                    </button>
                </li>
            </ol>
        </Transition>
    </MatchCard>
    </div>
</template>

<style scoped>
/* Cambio de equipo: lo de antes se va hacia un lado y lo nuevo llega */
.side-swap-enter-active, .side-swap-leave-active { transition: opacity 0.25s, translate 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
.side-swap-enter-from { opacity: 0; translate: 1.5rem 0; }
.side-swap-leave-to { opacity: 0; translate: -1.5rem 0; }
/* Cambio de jugador: la ficha sube */
.card-swap-enter-active { transition: opacity 0.3s, translate 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
.card-swap-leave-active { transition: opacity 0.12s; }
.card-swap-enter-from { opacity: 0; translate: 0 0.75rem; }
.card-swap-leave-to { opacity: 0; }

/* Barras: crecen al entrar y se deslizan (ellas y la raya) al cambiar la comparación */
.stat-bar { transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
.ref-mark { transition: left 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
@media (prefers-reduced-motion: no-preference) {
    .stat-bar { transform-origin: left; animation: grow 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: calc(var(--k, 0) * 40ms); }
    .delta { animation: pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
    .list-row { animation: row-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: calc(var(--k, 0) * 25ms); }
    .spark-line { stroke-dasharray: 1; animation: draw 0.8s ease-out both; }
    .spark-dot { animation: pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: calc(0.3s + var(--k, 0) * 80ms); transform-box: fill-box; transform-origin: center; }
}
@media (prefers-reduced-motion: reduce) {
    .side-swap-enter-active, .side-swap-leave-active, .card-swap-enter-active, .card-swap-leave-active, .stat-bar, .ref-mark { transition: none; }
}
@keyframes grow { from { scale: 0 1; } }
@keyframes pop { from { opacity: 0; scale: 0.6; } }
@keyframes row-in { from { opacity: 0; translate: 0 0.4rem; } }
@keyframes draw { from { stroke-dashoffset: 1; } }
</style>
