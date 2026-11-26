<template>
    <div class="flex flex-col gap-4 sm:gap-6 py-2 text-left">
        <!-- Controles: periodo y con qué se compara (pegados bajo la barra de pestañas al bajar) -->
        <div class="stats-controls sm:sticky z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-2.5 sm:p-3 shadow-sm
                [--ctl-bg:color-mix(in_oklab,var(--color-base-200)_94%,var(--color-base-content))]
                dark:[--ctl-bg:color-mix(in_oklab,var(--color-base-200)_92%,var(--color-base-content))]
                bg-[color-mix(in_oklab,var(--ctl-bg)_92%,transparent)] backdrop-blur-md">
            <div class="flex items-center gap-2 min-w-0">
                <span class="text-[0.65rem] uppercase tracking-widest font-black text-base-content/60 shrink-0">Periodo</span>
                <div role="group" aria-label="Periodo" class="join">
                    <button v-for="p in PERIODS" :key="p.key" type="button" class="join-item btn btn-xs sm:btn-sm"
                        :class="period === p.key ? 'btn-primary' : 'bg-base-300! dark:bg-base-100! border-base-content/10'"
                        :aria-pressed="period === p.key" @click="period = p.key">{{ p.label }}</button>
                </div>
            </div>
            <div class="flex items-center gap-2 min-w-0">
                <span class="text-[0.65rem] uppercase tracking-widest font-black text-base-content/60 shrink-0">Comparado con</span>
                <div role="group" aria-label="Comparado con" class="join">
                    <button v-for="r in refOptions" :key="r.key" type="button" class="join-item btn btn-xs sm:btn-sm"
                        :class="reference === r.key ? 'btn-primary' : 'bg-base-300! dark:bg-base-100! border-base-content/10'"
                        :disabled="r.disabled" :aria-pressed="reference === r.key" @click="reference = r.key">{{ r.label }}</button>
                </div>
            </div>
        </div>

        <p v-if="current.gamesPlayed > 0 && current.gamesPlayed < 5" class="text-xs text-warning px-1 -mt-2">
            Solo {{ current.gamesPlayed }} {{ current.gamesPlayed === 1 ? "partido" : "partidos" }}: con tan pocos, los números bailan mucho.
        </p>

        <!-- Perfil: radar frente a la referencia, y dónde destaca / flojea -->
        <MatchCard title="Su perfil" :hint="`${period === 'total' ? 'Todo su historial' : PERIODS.find((p) => p.key === period)?.label} contra ${refLong.toLowerCase()}.`">
            <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-5 lg:gap-8 items-center">
                <div>
                    <div ref="radarCard" class="relative w-full max-w-md mx-auto aspect-square">
                        <Radar ref="radarChart" :data="radarData" :options="radarOptions" />
                    </div>
                    <div class="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs font-bold text-base-content/70 mt-2">
                        <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-primary"></span>{{ periodLabel }}</span>
                        <span v-if="refStats" class="flex items-center gap-1.5"><span class="w-4 border-t-2 border-dashed border-base-content/60"></span>{{ refLong }}</span>
                    </div>
                </div>

                <div class="flex flex-col gap-4">
                    <div v-if="!refStats" class="text-sm text-base-content/60">Cargando las medias…</div>
                    <template v-else>
                        <div>
                            <p class="text-[0.7rem] uppercase tracking-widest font-black text-success mb-2">Donde más destaca</p>
                            <ul v-if="highlights.best.length" class="flex flex-col gap-1.5">
                                <li v-for="h in highlights.best" :key="h.label" class="highlight flex items-baseline justify-between gap-3 rounded-xl bg-success/10 ring-1 ring-success/25 px-3 py-2">
                                    <span class="font-bold text-sm">{{ h.label }}</span>
                                    <span class="text-sm tabular-nums shrink-0"><b>{{ h.value }}</b> <span class="text-success font-bold">{{ h.diff }}</span></span>
                                </li>
                            </ul>
                            <p v-else class="text-sm text-base-content/60">En nada por encima: está en la media o por debajo.</p>
                        </div>
                        <div>
                            <p class="text-[0.7rem] uppercase tracking-widest font-black text-error mb-2">Donde flojea</p>
                            <ul v-if="highlights.worst.length" class="flex flex-col gap-1.5">
                                <li v-for="h in highlights.worst" :key="h.label" class="highlight flex items-baseline justify-between gap-3 rounded-xl bg-error/10 ring-1 ring-error/25 px-3 py-2">
                                    <span class="font-bold text-sm">{{ h.label }}</span>
                                    <span class="text-sm tabular-nums shrink-0"><b>{{ h.value }}</b> <span class="text-error font-bold">{{ h.diff }}</span></span>
                                </li>
                            </ul>
                            <p v-else class="text-sm text-base-content/60">En nada por debajo. Ahí es nada.</p>
                        </div>
                    </template>
                </div>
            </div>
        </MatchCard>

        <!-- Sus números, por bloques: total y por partido, barra con la raya de la referencia y la diferencia -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
            <MatchCard v-for="g in groups" :key="g.key" :title="g.title" :hint="g.hint">
                <template #actions>
                    <GoalIcon v-if="g.icon === 'goal'" class="size-6 text-primary" />
                    <MvpIcon v-else-if="g.icon === 'mvp'" class="size-6" />
                    <svg v-else class="size-6 text-primary" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" v-html="KPI_ICONS[g.icon as KpiIcon]"></svg>
                </template>
                <dl class="flex flex-col">
                    <div v-for="(r, i) in g.rows" :key="r.label" class="py-2.5 border-b border-base-content/8 last:border-0">
                        <div class="grid grid-cols-[minmax(0,1fr)_auto_3.25rem] items-baseline gap-x-3">
                            <dt class="text-sm text-base-content/75 truncate">{{ r.label }}</dt>
                            <dd class="text-base font-black tabular-nums text-right">
                                {{ r.display }}<span v-if="r.sub" class="ml-1.5 text-xs font-semibold text-base-content/50">{{ r.sub }}</span>
                            </dd>
                            <dd class="text-xs font-bold tabular-nums text-right" :class="diffTone(r)">
                                <span :key="`${reference}-${period}`" class="delta inline-block">{{ r.ref === null ? "" : signed(r) }}</span>
                            </dd>
                        </div>
                        <!-- Barra con la raya de la referencia; al pasar por encima, el detalle -->
                        <div v-if="r.bar" tabindex="0" class="tooltip tooltip-top w-full block mt-1.5 py-1 -my-1 cursor-help rounded-full focus-visible:outline-2 focus-visible:outline-primary">
                            <div class="tooltip-content text-left text-xs leading-snug px-3 py-2">
                                <p class="font-black mb-0.5">{{ r.label }}</p>
                                <p>{{ periodLabel }}: <b class="tabular-nums">{{ r.display }}</b></p>
                                <template v-if="r.ref !== null">
                                    <p>{{ refLong }}: <b class="tabular-nums">{{ fmtValue(r, r.ref) }}</b></p>
                                    <p :class="diffTone(r)">{{ diffText(r) }}</p>
                                </template>
                            </div>
                            <div class="relative h-1.5 rounded-full bg-base-content/8">
                                <span class="stat-bar absolute inset-y-0 left-0 rounded-full bg-primary" :style="{ width: `${barPct(r, r.value)}%`, '--k': i }"></span>
                                <span v-if="r.ref !== null" class="ref-mark absolute -top-1 -bottom-1 w-1 -ml-0.5 rounded-full bg-base-content/80" :style="{ left: `${barPct(r, r.ref)}%` }"></span>
                            </div>
                        </div>
                    </div>
                </dl>
            </MatchCard>
        </div>
    </div>
</template>

<script setup lang="ts">
/**
 * Pestaña "Estadísticas" de la ficha del jugador (mismo lenguaje que la ficha de partido):
 * - Controles: periodo (histórico, últimos 5, últimos 10) y referencia (la media de su posición,
 *   la del club o su otro periodo: los últimos 5 si se mira el histórico y al revés).
 * - Su perfil: radar él contra la referencia y dónde más destaca / flojea.
 * - Sus números por bloques: total y por partido en una fila, con barra, raya de la referencia,
 *   diferencia (verde = mejor, también en lo que cuanto menos mejor) y tooltip con el detalle.
 */
import { computed, onMounted, onUnmounted, ref } from "vue"
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, RadarController, type ChartOptions } from "chart.js"
import { Radar } from "vue-chartjs"
import { translatePosition, Position } from "@/i18n/translations"
import { useInView } from "@/composables/useInView"
import { useSiteFontInCharts } from "@/lib/chartFont"
import { tpcsApi } from "@/lib/api"
import { KPI_ICONS, type KpiIcon } from "@/lib/kpiIcons"
import { CLUB } from "@/config/club"
import { hexToRgba } from "@/lib/color"
import PlayerStatsEntity from "@/model/PlayerStatsEntity"
import AverageStatsEntity from "@/model/AverageStatsEntity"
import type ClubMatchEntity from "@/model/match/ClubMatchEntity"
import type PlayerProfileEntity from "@/model/PlayerProfileEntity"
import MatchCard from "@/components/match/detail/MatchCard.vue"
import GoalIcon from "@/components/ui/GoalIcon.vue"
import MvpIcon from "@/components/ui/MvpIcon.vue"

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, RadarController)
useSiteFontInCharts()

const props = defineProps<{
    profile: PlayerProfileEntity
    stats: PlayerStatsEntity
    matches: ClubMatchEntity[] | undefined
    currentFilter: string
    positionFilter: string | null
}>()

// ── Periodo ──
type Period = "total" | "last5" | "last10"
const PERIODS: { key: Period; label: string }[] = [
    { key: "total", label: "Histórico" },
    { key: "last5", label: "Últimos 5" },
    { key: "last10", label: "Últimos 10" },
]
const period = ref<Period>("total")

/** Sus stats en sus últimos N partidos jugados (con el filtro oficiales / amistosos de la ficha) */
function aggregate(count: number): PlayerStatsEntity {
    const id = props.profile.member.playerId
    const list = (props.matches ?? []).filter((m) => {
        if (!m.ourClub.players.find((p) => p.playerId === id)?.played) return false
        const official = m.matchType === "league" || m.matchType === "playoff"
        return props.currentFilter === "official" ? official : props.currentFilter === "friendly" ? !official : true
    }).slice(0, count)
    if (!list.length) return props.stats
    const a: Record<string, any> = {
        gamesPlayed: 0, ratingSum: 0, goals: 0, assists: 0, shots: 0, passesMade: 0, passesSuccess: 0, tacklesMade: 0, tacklesSuccess: 0,
        saves: 0, goalsConceded: 0, cleanSheets: 0, manOfTheMatch: 0, redCards: 0, wins: 0, losses: 0, ties: 0, minutesPlayed: 0,
        hattricks: 0, pokers: 0, playedPositions: {}, mostPlayedPosition: props.profile.mostPlayedPosition,
    }
    for (const m of list) {
        const p = m.ourClub.players.find((x) => x.playerId === id)!
        a.gamesPlayed++; a.ratingSum += p.rating; a.goals += p.goals; a.assists += p.assists; a.shots += p.shots
        a.passesMade += p.passesMade; a.passesSuccess += p.passesSuccess; a.tacklesMade += p.tacklesMade; a.tacklesSuccess += p.tacklesSuccess
        a.saves += p.saves; a.goalsConceded += p.goalsConceded; a.redCards += p.redCards; a.minutesPlayed += p.minutesPlayed || 0
        if (p.cleanSheet) a.cleanSheets++
        if (p.manOfTheMatch) a.manOfTheMatch++
        if (p.goals >= 4) a.pokers++
        else if (p.goals === 3) a.hattricks++
        a.playedPositions[p.position] = (a.playedPositions[p.position] || 0) + 1
        if (m.result === "win") a.wins++
        else if (m.result === "loose") a.losses++
        else a.ties++
    }
    a.mostPlayedPosition = Object.entries(a.playedPositions as Record<string, number>).sort((x, y) => y[1] - x[1])[0]?.[0] ?? a.mostPlayedPosition
    return new PlayerStatsEntity(a)
}
const last5 = computed(() => aggregate(5))
const last10 = computed(() => aggregate(10))
const statsFor = (p: Period) => (p === "last5" ? last5.value : p === "last10" ? last10.value : props.stats)
const current = computed(() => statsFor(period.value))
const periodLabel = computed(() => PERIODS.find((p) => p.key === period.value)!.label)

// ── Referencia ──
type RefKey = "position" | "club" | "other"
const reference = ref<RefKey>("position")
/** Medias por posición (y la `general`, la del club): se piden una vez y se reutilizan */
let averagesCache: Promise<AverageStatsEntity[]> | null = null
const averages = ref<AverageStatsEntity[]>([])
onMounted(() => {
    averagesCache ??= tpcsApi.averages.getAll().then((l) => l.map((a) => new AverageStatsEntity(a))).catch(() => [])
    averagesCache.then((l) => { averages.value = l })
})
const position = computed(() => (props.positionFilter ?? current.value.mostPlayedPosition ?? props.profile.mostPlayedPosition) as string)
const isGK = computed(() => position.value === Position.goalkeeper)
/** "Su otro periodo": con el histórico, sus últimos 5; con un periodo reciente, su histórico */
const otherPeriod = computed<Period>(() => (period.value === "total" ? "last5" : "total"))
const refOptions = computed(() => [
    { key: "position" as const, label: "Su posición", disabled: false },
    { key: "club" as const, label: "El club", disabled: false },
    { key: "other" as const, label: otherPeriod.value === "total" ? "Su histórico" : "Sus últimos 5", disabled: false },
])
/** Las stats de referencia: medias (por partido y porcentajes) o las suyas de otro periodo */
const refStats = computed<Record<string, any> | null>(() => {
    if (reference.value === "other") return statsFor(otherPeriod.value)
    const key = reference.value === "club" ? "general" : position.value
    return averages.value.find((a) => a.position === key) ?? null
})
const refLong = computed(() =>
    reference.value === "club" ? "La media del club"
        : reference.value === "position" ? `La media de un ${translatePosition(position.value).toLowerCase()}`
            : otherPeriod.value === "total" ? "Su histórico" : "Sus últimos 5")

// ── Filas ──
type Row = {
    label: string
    /** el número que se compara (por partido o porcentaje) */
    value: number
    ref: number | null
    display: string
    sub?: string
    pct?: boolean
    decimals?: number
    /** menos es mejor (goles encajados, rojas) */
    lowerBetter?: boolean
    /** barra (no en las filas solo informativas) */
    bar?: boolean
    /** tope de la barra (los porcentajes, 100) */
    max?: number
    /** no cuenta para "destaca / flojea" (p. ej. rojas: no verlas no es destacar) */
    noHighlight?: boolean
}
const num = (n: number | undefined | null, d = 0) => (Number.isFinite(n ?? NaN) ? (n as number) : 0).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d })
const perMatch = (total: number, games: number) => (games ? total / games : 0)
const refOf = (key: string, perGame?: string): number | null => {
    const r = refStats.value
    if (!r) return null
    const v = r[key]
    if (Number.isFinite(v)) return v
    // Las medias no traen todo por partido: se saca del total y los partidos
    if (perGame && Number.isFinite(r[perGame]) && r.gamesPlayed) return r[perGame] / r.gamesPlayed
    return null
}
const pctRow = (label: string, value: number, refKey: string, sub?: string, lowerBetter = false): Row =>
    ({ label, value: value || 0, ref: refOf(refKey), display: `${num(value)}%`, sub, pct: true, bar: true, max: 100, lowerBetter })
const pgRow = (label: string, total: number, games: number, refKey: string, refTotalKey: string, decimals = 2, lowerBetter = false): Row => {
    const v = perMatch(total, games)
    return { label, value: v, ref: refOf(refKey, refTotalKey), display: num(v, decimals), sub: `${num(total)} en total`, decimals, bar: true, lowerBetter }
}

type Group = { key: string; title: string; hint: string; icon: string; rows: Row[] }
const groups = computed<Group[]>(() => {
    const s = current.value
    const g = s.gamesPlayed
    const out: Group[] = [
        {
            key: "games", title: "Partidos", hint: "Cuánto juega y cómo le va.", icon: "mvp", rows: [
                { label: "Jugados", value: g, ref: null, display: num(g), sub: `${num(s.minutesPlayed)} min` },
                { label: "Nota media", value: s.ratingAve || 0, ref: refOf("ratingAve"), display: num(s.ratingAve, 1), decimals: 1, bar: true, max: 10 },
                pctRow("% victorias", s.winRate, "winRate", `${s.wins}V · ${s.ties}E · ${s.losses}D`),
                pctRow("% MVP", s.manOfTheMatchPercent, "manOfTheMatchPercent", `${num(s.manOfTheMatch)} MVP`),
                { ...pgRow("Rojas por partido", s.redCards, g, "redCardsPerMatch", "redCards", 2, true), noHighlight: true },
            ],
        },
        {
            key: "attack", title: "Ataque", hint: "Goles, asistencias y puntería. Por partido; el total, al lado.", icon: "goal", rows: [
                pgRow("Goles", s.goals, g, "goalsPerMatch", "goals"),
                pgRow("Asistencias", s.assists, g, "assistsPerMatch", "assists"),
                pgRow("Goles + asistencias", s.goalsPlusAssists, g, "goalsPlusAssistsPerMatch", "goalsPlusAssists"),
                pctRow("% tiros que acaban en gol", s.shotSuccessRate, "shotSuccessRate", `${num(s.shots)} tiros`),
                { label: "Hat-tricks · pókers", value: 0, ref: null, display: `${num(s.hattricks)} · ${num(s.pokers)}` },
            ],
        },
        {
            key: "ball", title: "Con el balón", hint: "Cuánto la toca y cuánto la pierde.", icon: "passes", rows: [
                pgRow("Pases", s.passesMade, g, "passesMadePerMatch", "passesMade", 1),
                pctRow("% acierto de pase", s.passSuccessRate, "passSuccessRate", `${num(s.passesSuccess)} de ${num(s.passesMade)}`),
            ],
        },
        {
            key: "def", title: "Defensa", hint: "Entradas y portería a cero mientras está en el campo.", icon: "tackles", rows: [
                pgRow("Entradas", s.tacklesMade, g, "tacklesMadePerMatch", "tacklesMade", 1),
                pctRow("% entradas ganadas", s.tackleSuccessRate, "tackleSuccessRate", `${num(s.tacklesSuccess)} de ${num(s.tacklesMade)}`),
                pctRow("% porterías a cero", s.cleanSheetsPercent, "cleanSheetsPercent", `${num(s.cleanSheets)} partidos`),
                // Encajados solo cuentan de verdad para defensas y porteros (la media de las demás posiciones se calcula distinto)
                ...(isGK.value || position.value === Position.defender ? [pgRow("Goles encajados", s.goalsConceded, g, "goalsConcededPerMatch", "goalsConceded", 2, true)] : []),
            ],
        },
    ]
    if (isGK.value || s.saves > 0) {
        out.push({
            key: "gk", title: "Portería", hint: "Lo que para de lo que le llega.", icon: "saves", rows: [
                pgRow("Paradas", s.saves, g, "savesPerMatch", "saves", 1),
                pctRow("% paradas", s.savesPercent, "savesPercent", `${num(s.saves)} paradas`),
            ],
        })
    }
    return out
})

const better = (r: Row) => (r.ref === null ? 0 : (r.value - r.ref) * (r.lowerBetter ? -1 : 1))
const diffTone = (r: Row) => (r.ref === null || Math.abs(r.value - r.ref) < 0.005 ? "text-base-content/40" : better(r) > 0 ? "text-success" : "text-error")
const signed = (r: Row) => {
    const d = r.value - (r.ref ?? 0)
    const s = d > 0 ? "+" : d < 0 ? "−" : "±"
    return `${s}${num(Math.abs(d), r.pct ? 0 : r.decimals ?? 2)}`
}
const fmtValue = (r: Row, v: number) => (r.pct ? `${num(v)}%` : num(v, r.decimals ?? 2))
function diffText(r: Row): string {
    if (r.ref === null) return ""
    const d = r.value - r.ref
    if (Math.abs(d) < 0.005) return "Justo en la media"
    const abs = r.pct ? `${num(Math.abs(d))} puntos` : num(Math.abs(d), r.decimals ?? 2)
    const rel = !r.pct && r.ref ? ` (un ${Math.round((Math.abs(d) / r.ref) * 100)}% ${d > 0 ? "más" : "menos"})` : ""
    return `${abs} ${d > 0 ? "por encima" : "por debajo"}${rel}${r.lowerBetter ? (d > 0 ? ": peor" : ": mejor") : ""}`
}
const barPct = (r: Row, v: number) => Math.max(0, Math.min(100, (v / (r.max ?? Math.max(r.value, r.ref ?? 0, 0.01) * 1.25)) * 100))

/** Lo mejor y lo peor frente a la referencia (diferencia relativa; los porcentajes, en puntos sobre 100) */
const highlights = computed(() => {
    const rows = groups.value.flatMap((g) => g.rows).filter((r) => r.ref !== null && r.bar && !r.noHighlight)
    const score = (r: Row) => (r.pct ? (r.value - r.ref!) / 100 * 2.5 : r.ref ? (r.value - r.ref!) / r.ref! : 0) * (r.lowerBetter ? -1 : 1)
    const sorted = rows.map((r) => ({ r, s: score(r) })).filter((x) => Number.isFinite(x.s))
    const item = (x: { r: Row }) => ({ label: x.r.label, value: x.r.display, diff: signed(x.r) })
    return {
        best: sorted.filter((x) => x.s > 0.08).sort((a, b) => b.s - a.s).slice(0, 3).map(item),
        worst: sorted.filter((x) => x.s < -0.08).sort((a, b) => a.s - b.s).slice(0, 2).map(item),
    }
})

// ── Radar ──
const norm = (v: number | undefined, max: number) => Math.max(0, Math.min(100, ((Number.isFinite(v) ? v! : 0) / max) * 100))
const RADAR = computed(() => [
    { label: "Nota", key: "ratingAve", max: 10 },
    { label: "G+A/p", key: "goalsPlusAssistsPerMatch", max: 1.5 },
    { label: "% Pase", key: "passSuccessRate", max: 100 },
    { label: "% Entrada", key: "tackleSuccessRate", max: 100 },
    { label: "% Imbatido", key: "cleanSheetsPercent", max: 100 },
    isGK.value ? { label: "% Paradas", key: "savesPercent", max: 100 } : { label: "% Tiro", key: "shotSuccessRate", max: 100 },
    { label: "% MVP", key: "manOfTheMatchPercent", max: 30 },
    { label: "% Victorias", key: "winRate", max: 100 },
])
const isMobile = ref(false)
const updateMobile = () => { isMobile.value = window.innerWidth < 640 }
onMounted(() => { updateMobile(); addEventListener("resize", updateMobile) })
onUnmounted(() => removeEventListener("resize", updateMobile))

const radarData = computed(() => {
    const s = current.value as unknown as Record<string, number>
    const r = refStats.value
    return {
        labels: RADAR.value.map((m) => m.label),
        datasets: [
            {
                label: periodLabel.value, data: RADAR.value.map((m) => norm(s[m.key], m.max)), fill: true,
                backgroundColor: hexToRgba(CLUB.colors.primary, 0.3), borderColor: CLUB.colors.primary, borderWidth: 2.5,
                pointBackgroundColor: CLUB.colors.primary, pointBorderColor: "#fff", pointRadius: 3.5, order: 1,
            },
            ...(r ? [{
                label: refLong.value, data: RADAR.value.map((m) => norm(r[m.key], m.max)), fill: false,
                backgroundColor: "transparent", borderColor: "rgba(200, 205, 215, 0.95)", borderWidth: 2.5, borderDash: [6, 4],
                pointRadius: 0, pointHoverRadius: 3, order: 2,
            }] : []),
        ],
    }
})
const fmtRadar = (key: string, v: number) => (key === "ratingAve" ? num(v, 1) : key === "goalsPlusAssistsPerMatch" ? num(v, 2) : `${num(v)}%`)
const { target: radarCard, inView: radarInView } = useInView()
const radarOptions = computed<ChartOptions<"radar">>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: radarInView.value ? { duration: 700, easing: "easeOutQuart" as const } : { duration: 0 },
    interaction: { mode: "index" as const, intersect: false },
    scales: {
        r: {
            type: "radialLinear", suggestedMin: 0, suggestedMax: 100,
            angleLines: { color: "rgba(166, 173, 187, 0.2)" },
            grid: { color: "rgba(166, 173, 187, 0.15)", circular: true },
            ticks: { display: false, stepSize: 25 },
            pointLabels: { display: true, font: { size: isMobile.value ? 10 : 12, weight: "bold" }, color: "#A6ADBB", padding: isMobile.value ? 4 : 8 },
        },
    },
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: "#1D232A", padding: 10, cornerRadius: 8, displayColors: true,
            callbacks: {
                label: (ctx) => {
                    const m = RADAR.value[ctx.dataIndex]
                    const src = ctx.datasetIndex === 0 ? (current.value as unknown as Record<string, number>) : refStats.value
                    return `${ctx.dataset.label}: ${fmtRadar(m.key, src?.[m.key] ?? 0)}`
                },
            },
        },
    },
}))
</script>

<style scoped>
/* Pegados justo bajo la barra de pestañas de la ficha (que va bajo el menú) */
.stats-controls { top: calc(var(--nav-h, 4rem) + 4.75rem); }
.stat-bar { transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
.ref-mark { transition: left 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
@media (prefers-reduced-motion: no-preference) {
    .stat-bar { transform-origin: left; animation: grow 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: calc(var(--k, 0) * 40ms); }
    .delta { animation: pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
    .highlight { animation: rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
}
@media (prefers-reduced-motion: reduce) {
    .stat-bar, .ref-mark { transition: none; }
}
@keyframes grow { from { scale: 0 1; } }
@keyframes pop { from { opacity: 0; scale: 0.6; } }
@keyframes rise { from { opacity: 0; translate: 0 0.4rem; } }
</style>
