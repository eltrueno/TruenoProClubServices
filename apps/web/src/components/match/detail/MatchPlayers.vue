<script setup lang="ts">
/**
 * Jugadores del partido: selector Nosotros / Rival, campo (con goles, asistencias y rojas) y la ficha del elegido:
 * su nota frente a su media, la forma en sus últimos 5 partidos y sus números comparados con su
 * media, con la media de su posición o con el equipo en este partido (barra con una raya de
 * referencia y la diferencia escrita). Del rival no hay historial: solo posición y equipo.
 */
import { computed, nextTick, ref, watch } from "vue"
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
import AssistIcon from "@/components/ui/AssistIcon.vue"
import GoalIcon from "@/components/ui/GoalIcon.vue"

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

/** Sus últimos partidos (con este), de más antiguo a más reciente */
const lastGames = computed(() => ((form.value?.last.length ?? 0) > 1 ? form.value!.last : null))

// En móvil la ficha va debajo del campo: al elegir a alguien, se baja hasta ella si no se ve
function pick(id: string) {
    selectedId.value = id
    if (!matchMedia("(max-width: 1023px)").matches) return
    nextTick(() => setTimeout(() => {
        const el = document.getElementById("match-player-card")
        if (!el) return
        const r = el.getBoundingClientRect()
        if (r.top > innerHeight * 0.6 || r.bottom < 0) el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" })
    }, 150))
}

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
    <MatchCard title="Jugadores" hint="Pulsa un jugador en el campo para ver su partido al detalle.">
        <template #actions>
            <div role="group" aria-label="Equipo" class="join">
                <button type="button" class="join-item btn btn-sm" :class="side === 'us' && 'btn-primary'" :aria-pressed="side === 'us'" @click="side = 'us'">{{ match.ourClub.name }}</button>
                <button type="button" class="join-item btn btn-sm" :class="side === 'them' && 'btn-primary'" :aria-pressed="side === 'them'" @click="side = 'them'">Rival</button>
            </div>
        </template>

        <!-- Campo (protagonista) y ficha del elegido -->
        <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4 sm:gap-6 items-start">
            <!-- Sin <Transition> out-in: junto a la de la ficha se quedaba a medias y el campo no volvía.
                 Al cambiar de equipo, el campo nuevo entra con una animación -->
            <MatchPitch :key="side" :players="players" :selected="selectedId" :my-id="myId" :rival="!ours" @select="pick" class="side-in w-full max-w-xl mx-auto lg:max-w-none" />

            <Transition name="card-swap" mode="out-in">
                <article v-if="player" id="match-player-card" :key="`${side}-${player.playerId}`"
                    class="scroll-mt-[calc(var(--nav-h,4rem)+6rem)] rounded-2xl p-3 sm:p-5 dark:bg-base-100 bg-base-300 shadow-sm flex flex-col gap-4 sm:gap-5 lg:sticky lg:top-[calc(var(--nav-h,4rem)+5.5rem)]"
                    :class="player.playerId === myId && 'ring-2 ring-primary/60'">
                    <!-- Cabecera: cara, nombre y la nota con su color -->
                    <header class="flex items-center gap-3 sm:gap-4">
                        <!-- Cara; el MVP y el «TÚ» van encima (como en el campo) para dejar sitio al nombre -->
                        <span class="relative shrink-0">
                            <span class="block size-14 sm:size-24 rounded-full overflow-hidden outline-2"
                                :class="[player.playerId === myId ? 'outline-primary' : ours ? 'outline-(--us)' : 'outline-(--them)', isMember(player.playerId) ? (ours ? 'bg-(--us)/45' : 'bg-(--them)/45') : (ours ? 'bg-(--us)' : 'bg-(--them)')]">
                                <img v-if="isMember(player.playerId)" :src="imageFor(player.playerId)" alt="" class="size-full object-cover object-top scale-[2] origin-top" @error="onPlayerImageError" />
                                <span v-else class="size-full grid place-items-center text-xl sm:text-3xl font-black text-white" aria-hidden="true">{{ player.playerName.slice(0, 2).toUpperCase() }}</span>
                            </span>
                            <MvpIcon v-if="player.manOfTheMatch" class="absolute -top-1 -right-1.5 size-5 sm:size-6 drop-shadow" label="MVP" />
                            <span v-if="player.playerId === myId" class="absolute -top-2 -left-2 badge badge-xs badge-primary font-black tracking-widest shadow">TÚ</span>
                        </span>
                        <div class="flex-1 min-w-0">
                            <p class="text-[0.6rem] sm:text-xs uppercase tracking-wider sm:tracking-widest font-black text-base-content/50">{{ translatePosition(player.position) }} · {{ Math.round(player.minutesPlayed) }}'</p>
                            <h3 class="text-base sm:text-2xl font-black leading-tight wrap-anywhere line-clamp-2">{{ player.playerName }}</h3>
                            <a v-if="isMember(player.playerId)" :href="routes.player(player.playerId)" class="link link-hover text-xs sm:text-sm font-bold text-primary">Ver su perfil →</a>
                        </div>
                        <div class="shrink-0 flex flex-col items-center gap-1">
                            <span class="rating-pop rounded-xl px-2 py-1 sm:px-3 sm:py-1.5 text-xl sm:text-4xl font-black tabular-nums leading-none shadow" :class="RATING_TONE(player.rating)">{{ fmt(player.rating, 1) }}</span>
                            <span v-if="ratingDelta !== null" class="text-[0.6rem] sm:text-xs font-bold tabular-nums whitespace-nowrap" :class="ratingDelta >= 0 ? 'text-success' : 'text-error'" :title="`${signed(ratingDelta)} sobre su media`">{{ signed(ratingDelta) }}</span>
                        </div>
                    </header>

                    <!-- Goles, asistencias… de un vistazo -->
                    <ul v-if="player.goals || player.assists || player.redCards" class="flex flex-wrap gap-1.5 -mt-1">
                        <li v-if="player.goals" class="badge badge-sm font-bold"><GoalIcon class="size-3.5" />{{ player.goals }} {{ player.goals === 1 ? "gol" : "goles" }}</li>
                        <li v-if="player.assists" class="badge badge-sm font-bold"><AssistIcon class="size-3.5" />{{ player.assists }} {{ player.assists === 1 ? "asistencia" : "asistencias" }}</li>
                        <li v-if="player.redCards" class="badge badge-sm badge-error font-bold">Roja</li>
                    </ul>

                    <p class="text-sm italic text-base-content/70">{{ phrase }}</p>

                    <!-- Forma: sus últimas notas, cada una con su color; la de hoy, marcada -->
                    <div v-if="ours">
                        <p class="text-xs uppercase tracking-widest font-black text-base-content/50 mb-2">Sus últimos partidos</p>
                        <div v-if="!history" class="skeleton h-14 w-full"></div>
                        <ol v-else-if="lastGames" class="flex items-end gap-1.5 sm:gap-2 h-28" :aria-label="`Notas en sus últimos partidos: ${lastGames.map((g) => fmt(g.rating, 1)).join(', ')}`">
                            <li v-for="(g, i) in lastGames" :key="g.matchId" class="flex-1 h-full flex flex-col justify-end items-center gap-1">
                                <span class="text-[0.7rem] font-black tabular-nums" :class="g.current ? 'text-base-content' : 'text-base-content/60'">{{ fmt(g.rating, 1) }}</span>
                                <span class="relative w-full flex-1 min-h-0">
                                    <span class="form-bar absolute inset-x-0 bottom-0 rounded-md" :class="[RATING_TONE(g.rating), !g.current && 'opacity-55']" :style="{ height: `${Math.max(10, ((g.rating - 4) / 6) * 100)}%`, '--k': i }"></span>
                                </span>
                                <span class="text-[0.6rem] uppercase font-black tracking-wider" :class="g.current ? 'text-primary' : 'text-transparent'" :aria-hidden="!g.current">Hoy</span>
                            </li>
                        </ol>
                        <p v-else class="text-xs text-base-content/50">Su primer partido con el club.</p>
                    </div>

                    <!-- Comparación -->
                    <div>
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                            <p class="text-xs uppercase tracking-widest font-black text-base-content/50">Comparado con</p>
                            <div role="group" aria-label="Comparar con" class="join w-full sm:w-auto">
                                <button v-for="r in REFS" :key="r.key" type="button" class="join-item btn btn-xs flex-1 sm:flex-none" :class="reference === r.key && 'btn-primary'"
                                    :disabled="r.disabled" :aria-pressed="reference === r.key" @click="reference = r.key">{{ r.label }}</button>
                            </div>
                        </div>
                        <dl class="flex flex-col gap-3 sm:gap-2.5">
                            <!-- Móvil: nombre, valor y diferencia arriba y la barra debajo. Desde sm, todo en una fila -->
                            <div v-for="(r, i) in rows" :key="r.label" class="grid grid-cols-[minmax(0,1fr)_auto_3rem] sm:grid-cols-[8rem_minmax(0,1fr)_3rem_3rem] items-center gap-x-2 gap-y-1 text-sm">
                                <dt class="text-base-content/70 truncate">{{ r.label }}</dt>
                                <div class="relative h-2.5 sm:h-3 rounded-full bg-base-content/8 col-span-3 row-start-2 sm:col-span-1 sm:row-start-auto">
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
    .form-bar { transform-origin: bottom; animation: grow-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: calc(var(--k, 0) * 60ms); }
    .side-in { animation: side-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }
    .rating-pop { animation: pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both; }
}
@media (prefers-reduced-motion: reduce) {
    .side-swap-enter-active, .side-swap-leave-active, .card-swap-enter-active, .card-swap-leave-active, .stat-bar, .ref-mark { transition: none; }
}
@keyframes grow { from { scale: 0 1; } }
@keyframes pop { from { opacity: 0; scale: 0.6; } }
@keyframes side-in { from { opacity: 0; translate: 1.5rem 0; } }
@keyframes grow-up { from { scale: 1 0; } }
</style>
