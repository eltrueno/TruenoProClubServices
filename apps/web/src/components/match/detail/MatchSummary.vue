<script setup lang="ts">
/**
 * Resumen del partido: momentos (rachas, récords e hitos), cara a cara de equipo (barras enfrentadas
 * con su valor escrito: nosotros en el color del club, el rival en azul), historial con ese rival y
 * destacados. Lo que sale del historial espera a `history` (null mientras carga).
 */
import { computed } from "vue"
import type ClubMatchEntity from "@/model/match/ClubMatchEntity"
import type MatchPlayerEntity from "@/model/match/MatchPlayerEntity"
import { headToHead, playerMoments, teamMoments, type Moment } from "@/lib/matchInsights"
import { useMembers } from "@/composables/useMembers"
import { onPlayerImageError } from "@/lib/playerImage"
import { routes } from "@/lib/query"
import SectionCard from "@/components/ui/SectionCard.vue"
import MatchYou from "./MatchYou.vue"
import MvpIcon from "@/components/ui/MvpIcon.vue"
import { shownWinner } from "@/lib/statCompare"

const props = defineProps<{ match: ClubMatchEntity; history: ClubMatchEntity[] | null; myId: string | null }>()
const emit = defineEmits<{ see: [playerId: string] }>()
const { imageFor, memberFor } = useMembers()
/** Es de nuestra plantilla (puede haber jugado ese día con el rival): foto y enlace a su perfil */
const isMember = (playerId: string) => !!memberFor(playerId)

const us = computed(() => props.match.ourClub)
const them = computed(() => props.match.opponentClub)
const fmt = (n: number, d = 0) => (Number.isFinite(n) ? n : 0).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d })

// ── Momentos ──
const moments = computed<Moment[] | null>(() => {
    if (!props.history) return null
    if (props.match.voided) return []
    return [...teamMoments(props.history, props.match.matchId), ...playerMoments(props.history, props.match.matchId)]
})
const MOMENT_ICON: Record<Moment["kind"], string> = {
    streak: "M13 10V3L4 14h7v7l9-11h-7Z",
    unbeaten: "M9 12.75 11.25 15 15 9.75m-3-7.04A11.96 11.96 0 0 1 3.6 6 12 12 0 0 0 3 9.75c0 5.59 3.82 10.29 9 11.62 5.18-1.33 9-6.03 9-11.62 0-1.31-.21-2.57-.6-3.75h-.15c-3.2 0-6.1-1.25-8.25-3.29Z",
    record: "M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0",
    cleanSheet: "M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88",
    milestone: "M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z",
}
const TONE: Record<Moment["tone"], string> = {
    good: "bg-success/12 text-success ring-success/25",
    bad: "bg-error/12 text-error ring-error/25",
    neutral: "bg-base-content/8 text-base-content/80 ring-base-content/15",
}

// ── Cara a cara ──
const rate = (ok: number, total: number) => (total ? (ok / total) * 100 : 0)
const sideStats = (side: ClubMatchEntity["ourClub"]) => {
    const s = side.matchStats
    return {
        shots: s.shots,
        shotAcc: rate(s.goals, s.shots),
        passes: s.passesMade,
        passAcc: rate(s.passesSuccess, s.passesMade),
        tackles: s.tacklesMade,
        tackleAcc: rate(s.tackleSuccess, s.tacklesMade),
        saves: side.players.reduce((n, p) => n + (p.saves ?? 0), 0),
        reds: s.redCards,
    }
}
/** Los porcentajes, también como aciertos/intentos */
const fractions = (side: ClubMatchEntity["ourClub"]): Record<string, string> => {
    const s = side.matchStats
    return { shotAcc: `${s.goals}/${s.shots}`, passAcc: `${s.passesSuccess}/${s.passesMade}`, tackleAcc: `${s.tackleSuccess}/${s.tacklesMade}` }
}
const ROWS = [
    { key: "shots", label: "Tiros" },
    { key: "shotAcc", label: "Tiros convertidos", pct: true },
    { key: "passes", label: "Pases" },
    { key: "passAcc", label: "Acierto de pase", pct: true },
    { key: "tackles", label: "Entradas" },
    { key: "tackleAcc", label: "Acierto de entrada", pct: true },
    { key: "saves", label: "Paradas" },
    { key: "reds", label: "Rojas" },
] as const
const comparison = computed(() => {
    const a = sideStats(us.value), b = sideStats(them.value)
    const fa = fractions(us.value), fb = fractions(them.value)
    return ROWS.map((r) => {
        const x = a[r.key], y = b[r.key]
        // Los porcentajes, sobre 100; el resto, sobre el mayor de los dos
        const max = "pct" in r ? 100 : Math.max(x, y, 1)
        return { ...r, pct: "pct" in r, us: x, them: y, usFrac: fa[r.key], themFrac: fb[r.key], usW: (x / max) * 100, themW: (y / max) * 100, usBetter: shownWinner(x, y, 0) === "a", themBetter: shownWinner(x, y, 0) === "b" }
    })
})
// Posesión aproximada: reparto de pases
const possession = computed(() => {
    const a = us.value.matchStats.passesMade, b = them.value.matchStats.passesMade
    return a + b ? Math.round((a / (a + b)) * 100) : 50
})

// ── Historial con el rival ──
const h2h = computed(() => (props.history ? headToHead(props.history, props.match) : null))
const shortDate = (ts: number) => new Date(ts * 1000).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "2-digit" })

// ── Destacados ──
const allPlayers = computed(() => [
    ...us.value.players.map((p) => ({ p, ours: true })),
    ...them.value.players.map((p) => ({ p, ours: false })),
])
const top = (list: { p: MatchPlayerEntity; ours: boolean }[], f: (p: MatchPlayerEntity) => number) =>
    list.filter((x) => f(x.p) > 0).sort((a, b) => f(b.p) - f(a.p) || b.p.rating - a.p.rating)[0]
const highlights = computed(() => {
    const ours = allPlayers.value.filter((x) => x.ours)
    const mvp = allPlayers.value.find((x) => x.p.manOfTheMatch)
    type H = { label: string; big: string; unit: string; who: { p: MatchPlayerEntity; ours: boolean }; mvp?: boolean }
    const out: H[] = []
    if (mvp) out.push({ label: "MVP", big: fmt(mvp.p.rating, 1), unit: "de nota", who: mvp, mvp: true })
    const best = top(ours.filter((x) => x !== mvp), (p) => p.rating)
    if (best) out.push({ label: "Mejor nota", big: fmt(best.p.rating, 1), unit: "de nota", who: best })
    const scorer = top(ours, (p) => p.goals)
    if (scorer) out.push({ label: "Goleador", big: String(scorer.p.goals), unit: scorer.p.goals === 1 ? "gol" : "goles", who: scorer })
    const assist = top(ours, (p) => p.assists)
    if (assist) out.push({ label: "Asistente", big: String(assist.p.assists), unit: assist.p.assists === 1 ? "asistencia" : "asistencias", who: assist })
    const keeper = ours.find((x) => x.p.position === "goalkeeper" && x.p.saves > 0)
    if (keeper && out.length < 4) out.push({ label: "Portero", big: String(keeper.p.saves), unit: "paradas", who: keeper })
    return out.slice(0, 4)
})
</script>

<template>
    <div class="flex flex-col gap-4 sm:gap-6 py-2">
        <!-- Con sesión: tu partido (o que no jugaste) -->
        <MatchYou v-if="myId" :match="match" :history="history" :my-id="myId" @see="emit('see', $event)" />

        <!-- Momentos -->
        <SectionCard title="Momentos del partido" hint="Rachas, récords e hitos de los jugadores que se dieron en este partido, mirando todo el historial del club.">
            <div v-if="moments === null" class="flex flex-wrap gap-2" aria-busy="true">
                <span v-for="n in 3" :key="n" class="skeleton h-9 w-48 rounded-full"></span>
            </div>
            <ul v-else-if="moments.length" class="flex flex-wrap gap-2">
                <li v-for="(m, i) in moments" :key="m.text" class="moment-chip inline-flex items-center gap-2 rounded-full pl-2 pr-3.5 py-1.5 text-sm font-bold ring-1" :class="TONE[m.tone]" :style="{ '--k': i }">
                    <span class="grid place-items-center size-6 rounded-full bg-current/15"><svg class="size-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" :d="MOMENT_ICON[m.kind]" /></svg></span>
                    <a v-if="m.playerId" :href="routes.player(m.playerId)" class="hover:underline">{{ m.text }}</a>
                    <span v-else>{{ m.text }}</span>
                </li>
            </ul>
            <p v-else class="text-sm text-base-content/60">{{ match.voided ? "Partido nulo: no cuenta para rachas ni récords." : "Un partido más: sin rachas ni hitos que destacar." }}</p>
        </SectionCard>

        <!-- Destacados -->
        <SectionCard v-if="highlights.length" title="Destacados" hint="Los nombres propios del partido.">
            <ul class="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-2 sm:gap-4">
                <li v-for="h in highlights" :key="h.label">
                    <component :is="isMember(h.who.p.playerId) ? 'a' : 'div'" :href="isMember(h.who.p.playerId) ? routes.player(h.who.p.playerId) : undefined"
                        class="group h-full flex items-center gap-3 rounded-2xl dark:bg-base-100 bg-base-300 p-3 sm:p-4 shadow-sm transition-shadow"
                        :class="[isMember(h.who.p.playerId) && 'hover:ring-2 hover:ring-primary/40', h.who.p.playerId === myId && 'ring-2 ring-primary/60']">
                        <!-- Cara (recortada a la cabeza), con borde dorado para el MVP -->
                        <span class="relative shrink-0 size-14 sm:size-16 rounded-full overflow-hidden outline-2"
                            :class="[h.mvp ? 'outline-warning' : h.who.ours ? 'outline-(--us)' : 'outline-(--them)', h.who.ours ? 'bg-(--us)/45' : 'bg-(--them)/45']">
                            <img v-if="isMember(h.who.p.playerId)" :src="imageFor(h.who.p.playerId)" alt="" loading="lazy" class="size-full object-cover object-top scale-[2] origin-top" @error="onPlayerImageError" />
                            <span v-else class="size-full grid place-items-center font-black text-lg text-(--them)" aria-hidden="true">{{ h.who.p.playerName.slice(0, 2).toUpperCase() }}</span>
                        </span>
                        <span class="flex flex-col min-w-0">
                            <span class="flex items-center gap-1 text-base-content/50 uppercase text-[0.65rem] sm:text-xs font-black tracking-widest">
                                <MvpIcon v-if="h.mvp" class="size-3.5" />
                                {{ h.label }}
                            </span>
                            <span class="font-black truncate group-hover:text-primary transition-colors">{{ h.who.p.playerName }}<span v-if="h.who.p.playerId === myId" class="badge badge-xs badge-primary font-black tracking-widest ml-1 align-middle">TÚ</span></span>
                            <span class="flex items-baseline gap-1">
                                <span class="text-2xl font-black tabular-nums leading-none">{{ h.big }}</span>
                                <span class="text-xs text-base-content/50 font-semibold">{{ h.unit }}</span>
                            </span>
                        </span>
                    </component>
                </li>
            </ul>
        </SectionCard>

        <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-4 sm:gap-6">
            <!-- Cara a cara -->
            <SectionCard title="Cara a cara" hint="Los números de los dos equipos. En negrita, quién gana cada dato.">
                <div class="flex items-center justify-between gap-2 text-sm font-black">
                    <span class="flex items-center gap-2 min-w-0"><span class="size-3 rounded-sm bg-(--us) shrink-0"></span><span class="truncate">{{ us.name }}</span></span>
                    <span class="flex items-center gap-2 min-w-0"><span class="truncate">{{ them.name }}</span><span class="size-3 rounded-sm bg-(--them) shrink-0"></span></span>
                </div>
                <!-- Posesión aproximada (reparto de pases) -->
                <div>
                    <div class="flex justify-between text-sm font-black tabular-nums mb-1"><span>{{ possession }}%</span><span class="text-xs text-base-content/60 font-semibold self-center">Posesión (por pases)</span><span>{{ 100 - possession }}%</span></div>
                    <div class="flex h-3 gap-0.5 rounded-full overflow-hidden" role="img" :aria-label="`Reparto de pases: ${possession}% ${us.name}, ${100 - possession}% ${them.name}`">
                        <span class="h-full bg-(--us) grow-bar origin-left" :style="{ width: `${possession}%` }"></span>
                        <span class="h-full bg-(--them) grow-bar origin-right flex-1"></span>
                    </div>
                </div>
                <dl class="flex flex-col gap-3">
                    <div v-for="r in comparison" :key="r.key" class="grid grid-cols-[3.25rem_minmax(0,1fr)_minmax(0,1fr)_3.25rem] sm:grid-cols-[3.75rem_minmax(0,1fr)_9rem_minmax(0,1fr)_3.75rem] items-center gap-x-2 gap-y-1">
                        <dd class="text-right tabular-nums" :class="r.usBetter ? 'font-black' : 'text-base-content/60'">{{ fmt(r.us) }}{{ r.pct ? "%" : "" }}<span v-if="r.usFrac" class="block text-[0.65rem] font-medium text-base-content/45 leading-none">{{ r.usFrac }}</span></dd>
                        <div class="flex justify-end"><span class="h-3 rounded-l-full bg-(--us) grow-bar origin-right" :class="!r.usBetter && 'opacity-50'" :style="{ width: `${r.usW}%` }"></span></div>
                        <!-- En móvil, la etiqueta encima de las barras (en medio no les dejaba sitio) -->
                        <dt class="col-span-4 sm:col-span-1 order-first sm:order-none text-center text-xs uppercase tracking-wider text-base-content/60 font-bold">{{ r.label }}</dt>
                        <div><span class="block h-3 rounded-r-full bg-(--them) grow-bar origin-left" :class="!r.themBetter && 'opacity-50'" :style="{ width: `${r.themW}%` }"></span></div>
                        <dd class="tabular-nums" :class="r.themBetter ? 'font-black' : 'text-base-content/60'">{{ fmt(r.them) }}{{ r.pct ? "%" : "" }}<span v-if="r.themFrac" class="block text-[0.65rem] font-medium text-base-content/45 leading-none">{{ r.themFrac }}</span></dd>
                    </div>
                </dl>
            </SectionCard>

            <!-- Historial con el rival -->
            <SectionCard :title="`Contra ${them.name}`" hint="Todos los partidos contra este rival, este incluido.">
                <div v-if="!h2h" class="flex flex-col gap-3" aria-busy="true">
                    <span class="skeleton h-16 w-full rounded-xl"></span><span class="skeleton h-4 w-2/3"></span><span class="skeleton h-4 w-1/2"></span>
                </div>
                <template v-else-if="h2h.played > 1">
                    <div class="grid grid-cols-3 gap-2">
                        <div class="rounded-2xl dark:bg-base-100 bg-base-300 p-3 text-center"><p class="text-3xl font-black text-success tabular-nums">{{ h2h.wins }}</p><p class="text-[0.65rem] text-base-content/50 uppercase font-black tracking-widest">Victorias</p></div>
                        <div class="rounded-2xl dark:bg-base-100 bg-base-300 p-3 text-center"><p class="text-3xl font-black tabular-nums">{{ h2h.ties }}</p><p class="text-[0.65rem] text-base-content/50 uppercase font-black tracking-widest">Empates</p></div>
                        <div class="rounded-2xl dark:bg-base-100 bg-base-300 p-3 text-center"><p class="text-3xl font-black text-error tabular-nums">{{ h2h.losses }}</p><p class="text-[0.65rem] text-base-content/50 uppercase font-black tracking-widest">Derrotas</p></div>
                    </div>
                    <div class="flex h-2 rounded-full overflow-hidden gap-0.5" role="img" :aria-label="`${h2h.wins} victorias, ${h2h.ties} empates y ${h2h.losses} derrotas`">
                        <span class="bg-success" :style="{ flex: h2h.wins }"></span><span class="bg-base-content/30" :style="{ flex: h2h.ties }"></span><span class="bg-error" :style="{ flex: h2h.losses }"></span>
                    </div>
                    <ul class="flex flex-col divide-y divide-base-content/10 text-sm">
                        <li class="flex justify-between gap-2 py-2"><span class="text-base-content/60">Partidos jugados</span><b class="tabular-nums">{{ h2h.played }}</b></li>
                        <li class="flex justify-between gap-2 py-2"><span class="text-base-content/60">Goles (a favor – en contra)</span><b class="tabular-nums">{{ h2h.goalsFor }} – {{ h2h.goalsAgainst }}</b></li>
                        <li v-if="h2h.previous" class="flex justify-between gap-2 py-2">
                            <span class="text-base-content/60">El anterior</span>
                            <a :href="routes.match(h2h.previous.matchId)" class="font-bold tabular-nums hover:text-primary">{{ h2h.previous.ourClub.matchStats.goals }}–{{ h2h.previous.opponentClub.matchStats.goals }} <span class="font-normal text-base-content/50">· {{ shortDate(h2h.previous.timestamp) }}</span></a>
                        </li>
                        <li v-if="h2h.biggestWin && h2h.biggestWin.matchId !== match.matchId" class="flex justify-between gap-2 py-2">
                            <span class="text-base-content/60">Mayor victoria</span>
                            <a :href="routes.match(h2h.biggestWin.matchId)" class="font-bold tabular-nums hover:text-primary">{{ h2h.biggestWin.ourClub.matchStats.goals }}–{{ h2h.biggestWin.opponentClub.matchStats.goals }} <span class="font-normal text-base-content/50">· {{ shortDate(h2h.biggestWin.timestamp) }}</span></a>
                        </li>
                    </ul>
                </template>
                <p v-else class="text-sm text-base-content/60">Es el primer partido contra este rival.</p>
            </SectionCard>
        </div>
    </div>
</template>

<style scoped>
/* Entradas: las barras crecen y los momentos aparecen en cascada (quietos con reduced-motion) */
@media (prefers-reduced-motion: no-preference) {
    .grow-bar { animation: grow 0.8s cubic-bezier(0.22, 1, 0.36, 1) both; }
    .moment-chip { animation: chip-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: calc(var(--k, 0) * 60ms); }
}
@keyframes grow { from { scale: 0 1; } }
@keyframes chip-in { from { opacity: 0; translate: 0 0.5rem; scale: 0.9; } }
</style>
