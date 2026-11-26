<template>
    <div class="flex flex-col gap-4 sm:gap-6 py-2 text-left [--a:var(--color-primary)] [--b:#2f6fd6] dark:[--b:#5b8def]">
        <!-- Sin rival elegido: a elegirlo -->
        <MatchCard v-if="!other && !loadingOther" title="Comparador" hint="Elige a otro jugador del club para verlos cara a cara.">
            <div class="flex flex-col items-center gap-4 py-6 text-center">
                <svg class="size-12 text-base-content/30" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0-4-4m4 4-4 4m0 6H4m0 0 4 4m-4-4 4-4" /></svg>
                <p class="text-sm text-base-content/70 max-w-sm">Goles, pases, notas, lo que han jugado juntos y quién tiene más logros. Se puede compartir el enlace.</p>
                <button type="button" class="btn btn-primary" @click="openPicker">Elegir jugador</button>
                <p v-if="loadError" class="text-sm text-error">No se ha podido cargar ese jugador.</p>
            </div>
        </MatchCard>

        <div v-else-if="loadingOther" class="flex flex-col gap-4" aria-busy="true">
            <div class="skeleton h-40 w-full rounded-2xl"></div>
            <div class="skeleton h-96 w-full rounded-2xl"></div>
        </div>

        <template v-else-if="other">
            <!-- Cabecera: los dos frente a frente y el marcador de "ventajas" -->
            <section class="vs-head rounded-2xl bg-base-200 p-4 sm:p-6 shadow-md">
                <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
                    <div v-for="(side, si) in sides" :key="side.key" class="flex flex-col items-center gap-2 text-center min-w-0" :class="si === 1 && 'order-3'">
                        <span class="relative">
                            <span class="block size-16 sm:size-24 rounded-full overflow-hidden outline-2" :class="si === 0 ? 'outline-(--a) bg-(--a)/45' : 'outline-(--b) bg-(--b)/45'">
                                <img :src="imageFor(side.profile.member.playerId)" alt="" class="size-full object-cover object-top scale-[2] origin-top" @error="onPlayerImageError" />
                            </span>
                        </span>
                        <component :is="si === 0 ? 'span' : 'a'" :href="si === 1 ? routes.player(side.profile.member.playerId) : undefined"
                            class="font-black text-sm sm:text-xl leading-tight wrap-anywhere line-clamp-2" :class="si === 1 && 'hover:text-primary'">{{ side.profile.member.playerName }}</component>
                        <p class="text-[0.65rem] sm:text-xs uppercase tracking-wider font-black text-base-content/50">
                            {{ side.profile.mostPlayedPosition ? translatePosition(side.profile.mostPlayedPosition) : "—" }} · {{ side.stats.gamesPlayed }} PJ
                        </p>
                    </div>
                    <div class="order-2 flex flex-col items-center gap-1">
                        <span class="text-[0.65rem] uppercase tracking-widest font-black text-base-content/50">Ventajas</span>
                        <span class="text-3xl sm:text-5xl font-black tabular-nums leading-none">
                            <span class="text-(--a)">{{ score.a }}</span><span class="text-base-content/30 mx-1">–</span><span class="text-(--b)">{{ score.b }}</span>
                        </span>
                        <span class="text-[0.65rem] text-base-content/50">en {{ rows.length }} stats</span>
                        <button type="button" class="btn btn-xs btn-ghost mt-1" @click="openPicker">Cambiar</button>
                    </div>
                </div>
                <ul v-if="warnings.length" class="mt-4 flex flex-col gap-1 text-xs text-warning">
                    <li v-for="w in warnings" :key="w">{{ w }}</li>
                </ul>
            </section>

            <!-- Perfil superpuesto -->
            <MatchCard title="Perfil" hint="Los dos en las mismas ocho cosas, de 0 al máximo razonable.">
                <div class="relative w-full max-w-md mx-auto aspect-square">
                    <Radar :data="radarData" :options="radarOptions" />
                </div>
                <div class="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs font-bold text-base-content/70">
                    <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-(--a)"></span>{{ profile.member.playerName }}</span>
                    <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-(--b)"></span>{{ other.member.playerName }}</span>
                </div>
            </MatchCard>

            <!-- Stat a stat, barras enfrentadas -->
            <MatchCard title="Stat a stat" hint="En negrita, quien gana cada fila. En rojas, gana quien tiene menos.">
                <template #actions>
                    <div role="group" aria-label="Modo" class="join">
                        <button v-for="m in MODES" :key="m.key" type="button" class="join-item btn btn-sm"
                            :class="mode === m.key ? 'btn-primary' : 'bg-base-300! dark:bg-base-100! border-base-content/10'"
                            :aria-pressed="mode === m.key" @click="mode = m.key">{{ m.label }}</button>
                    </div>
                </template>
                <div class="flex flex-col gap-3">
                    <div v-for="(r, i) in rows" :key="`${mode}-${r.label}`" class="grid grid-cols-[3.25rem_minmax(0,1fr)_minmax(0,1fr)_3.25rem] sm:grid-cols-[4rem_minmax(0,1fr)_10rem_minmax(0,1fr)_4rem] items-center gap-x-2 gap-y-1">
                        <span class="text-right tabular-nums" :class="r.win === 'a' ? 'font-black text-(--a)' : 'text-base-content/60'">{{ r.aText }}</span>
                        <span class="h-2.5 rounded-full bg-base-content/8 overflow-hidden flex justify-end"><span class="bar h-full rounded-full bg-(--a)" :class="r.win !== 'a' && 'opacity-45'" :style="{ width: `${r.aPct}%`, '--k': i }"></span></span>
                        <span class="hidden sm:block text-center text-xs font-black uppercase tracking-wider text-base-content/60 truncate">{{ r.label }}</span>
                        <span class="h-2.5 rounded-full bg-base-content/8 overflow-hidden"><span class="bar bar-b block h-full rounded-full bg-(--b)" :class="r.win !== 'b' && 'opacity-45'" :style="{ width: `${r.bPct}%`, '--k': i }"></span></span>
                        <span class="tabular-nums" :class="r.win === 'b' ? 'font-black text-(--b)' : 'text-base-content/60'">{{ r.bText }}</span>
                        <span class="sm:hidden col-span-4 -order-1 text-center text-[0.65rem] font-black uppercase tracking-wider text-base-content/60">{{ r.label }}</span>
                    </div>
                </div>
            </MatchCard>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
                <!-- Juntos -->
                <MatchCard title="Juntos" hint="Partidos en los que jugaron los dos en el club (con el filtro de arriba).">
                    <p v-if="!together.games" class="text-sm text-base-content/60">Todavía no han coincidido en un partido.</p>
                    <template v-else>
                        <div class="grid grid-cols-3 gap-2 text-center">
                            <div class="rounded-xl bg-success/12 py-3"><p class="text-2xl font-black text-success tabular-nums">{{ together.wins }}</p><p class="text-xs font-bold text-success">Victorias</p></div>
                            <div class="rounded-xl bg-base-content/8 py-3"><p class="text-2xl font-black tabular-nums">{{ together.ties }}</p><p class="text-xs font-bold text-base-content/70">Empates</p></div>
                            <div class="rounded-xl bg-error/12 py-3"><p class="text-2xl font-black text-error tabular-nums">{{ together.losses }}</p><p class="text-xs font-bold text-error">Derrotas</p></div>
                        </div>
                        <dl class="mt-4 flex flex-col divide-y divide-base-content/8 text-sm">
                            <div class="flex justify-between py-2"><dt class="text-base-content/70">Partidos juntos</dt><dd class="font-black tabular-nums">{{ together.games }}</dd></div>
                            <div class="flex justify-between py-2"><dt class="text-base-content/70">% victorias juntos</dt><dd class="font-black tabular-nums">{{ pct(together.wins, together.games) }}%</dd></div>
                            <div class="flex justify-between py-2"><dt class="text-base-content/70">Goles del equipo por partido</dt><dd class="font-black tabular-nums">{{ fmt(together.goalsFor / together.games, 1) }}</dd></div>
                            <div class="flex justify-between py-2"><dt class="text-(--a) font-bold truncate">{{ profile.member.playerName }}</dt><dd class="tabular-nums"><b>{{ together.a.goals }}</b> G · <b>{{ together.a.assists }}</b> A · {{ fmt(together.a.rating / together.games, 1) }} nota</dd></div>
                            <div class="flex justify-between py-2"><dt class="text-(--b) font-bold truncate">{{ other.member.playerName }}</dt><dd class="tabular-nums"><b>{{ together.b.goals }}</b> G · <b>{{ together.b.assists }}</b> A · {{ fmt(together.b.rating / together.games, 1) }} nota</dd></div>
                        </dl>
                        <a v-if="together.last" :href="routes.match(together.last.matchId)" class="link link-hover text-xs font-bold text-primary mt-2 inline-block">Último juntos: {{ together.last.label }} →</a>
                    </template>
                </MatchCard>

                <!-- Logros -->
                <MatchCard title="Logros" hint="Los de este club, por rareza, y lo que tiene uno y el otro no.">
                    <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 items-center text-sm">
                        <template v-for="r in rarityRows" :key="r.rarity">
                            <span class="text-right tabular-nums" :class="r.a > r.b ? 'font-black text-(--a)' : 'text-base-content/60'">{{ r.a }}</span>
                            <span class="text-center text-xs font-black uppercase tracking-wider" :class="RARITY_TONE[r.rarity]">{{ ACHIEVEMENT_RARITY_LABELS[r.rarity] }}</span>
                            <span class="tabular-nums" :class="r.b > r.a ? 'font-black text-(--b)' : 'text-base-content/60'">{{ r.b }}</span>
                        </template>
                        <span class="text-right tabular-nums font-black border-t border-base-content/10 pt-1.5" :class="points.a >= points.b && 'text-(--a)'">{{ points.a }}</span>
                        <span class="text-center text-xs font-black uppercase tracking-wider border-t border-base-content/10 pt-1.5 text-base-content/60">Puntos</span>
                        <span class="tabular-nums font-black border-t border-base-content/10 pt-1.5" :class="points.b >= points.a && 'text-(--b)'">{{ points.b }}</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                        <div v-for="side in onlyOne" :key="side.key">
                            <p class="text-[0.7rem] uppercase tracking-widest font-black mb-1.5" :class="side.key === 'a' ? 'text-(--a)' : 'text-(--b)'">Solo {{ side.name }}</p>
                            <ul v-if="side.list.length" class="flex flex-wrap gap-1">
                                <li v-for="a in side.list.slice(0, 10)" :key="a.id" class="badge badge-sm font-semibold" :class="RARITY_BADGE[a.rarity]">{{ a.name }}</li>
                                <li v-if="side.list.length > 10" class="badge badge-sm badge-ghost">+{{ side.list.length - 10 }}</li>
                            </ul>
                            <p v-else class="text-xs text-base-content/60">Nada que no tenga el otro.</p>
                        </div>
                    </div>
                </MatchCard>
            </div>
        </template>

        <!-- Elegir jugador -->
        <dialog ref="picker" class="modal modal-bottom sm:modal-middle" closedby="any" aria-labelledby="picker-title">
            <div class="modal-box text-left max-h-[80svh] flex flex-col">
                <h3 id="picker-title" class="font-black text-lg mb-3">Comparar a {{ profile.member.playerName }} con…</h3>
                <label class="input input-sm w-full mb-3">
                    <svg class="size-4 opacity-60" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                    <input ref="search" v-model="query" type="search" placeholder="Buscar jugador" aria-label="Buscar jugador" />
                </label>
                <ul class="overflow-y-auto -mx-2 flex flex-col">
                    <li v-for="m in candidates" :key="m.playerId">
                        <button type="button" class="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left hover:bg-base-content/5 focus-visible:bg-base-content/5 cursor-pointer" @click="choose(m.playerId)">
                            <span class="size-9 rounded-full overflow-hidden bg-base-300 shrink-0"><img :src="imageFor(m.playerId)" alt="" loading="lazy" class="size-full object-cover object-top scale-[2] origin-top" @error="onPlayerImageError" /></span>
                            <span class="font-bold truncate flex-1">{{ m.playerName }}</span>
                            <span v-if="m.playerId === vsId" class="badge badge-sm badge-primary">Elegido</span>
                        </button>
                    </li>
                    <li v-if="!candidates.length" class="text-sm text-base-content/60 px-2 py-4">Nadie coincide.</li>
                </ul>
                <div class="modal-action mt-3"><form method="dialog"><button class="btn btn-ghost btn-sm">Cerrar</button></form></div>
            </div>
            <form method="dialog" class="modal-backdrop"><button tabindex="-1">Cerrar</button></form>
        </dialog>
    </div>
</template>

<script setup lang="ts">
/**
 * Pestaña "Comparador" de la ficha: este jugador contra otro del club (?vs=<playerId>, para compartir).
 * Cabecera con el marcador de "ventajas" (en cuántas stats gana cada uno), radar superpuesto, barras
 * enfrentadas stat a stat (por partido o totales), lo que han jugado juntos y sus logros.
 * Los dos con el mismo filtro de oficiales / amistosos que la ficha.
 */
import { computed, nextTick, onMounted, ref, watch } from "vue"
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, RadarController, type ChartOptions } from "chart.js"
import { Radar } from "vue-chartjs"
import { ACHIEVEMENT_RARITIES, ACHIEVEMENT_RARITY_LABELS, type AchievementRarity } from "@trueno-proclub-services/shared"
import { translatePosition, Position } from "@/i18n/translations"
import { useMembers } from "@/composables/useMembers"
import { useSiteFontInCharts } from "@/lib/chartFont"
import { onPlayerImageError } from "@/lib/playerImage"
import { getQueryParam, routes, setQueryParams } from "@/lib/query"
import { tpcsApi } from "@/lib/api"
import { CLUB } from "@/config/club"
import { hexToRgba } from "@/lib/color"
import PlayerStatsEntity from "@/model/PlayerStatsEntity"
import PlayerProfileEntity from "@/model/PlayerProfileEntity"
import type ClubMatchEntity from "@/model/match/ClubMatchEntity"
import MatchCard from "@/components/match/detail/MatchCard.vue"

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, RadarController)
useSiteFontInCharts()

const props = defineProps<{
    profile: PlayerProfileEntity
    matches: ClubMatchEntity[] | undefined
    currentFilter: string
}>()
const { members, imageFor, load: loadMembers } = useMembers()

// ── El otro jugador ──
const vsId = ref<string>(getQueryParam("vs"))
const other = ref<PlayerProfileEntity | null>(null)
const loadingOther = ref(false)
const loadError = ref(false)
async function loadOther(id: string) {
    if (!id || id === props.profile.member.playerId) { other.value = null; return }
    loadingOther.value = true
    loadError.value = false
    try {
        const { member, stats, achievements, totw, account, progress } = await tpcsApi.members.getProfile(id)
        if (vsId.value !== id) return
        other.value = new PlayerProfileEntity(member, stats, achievements, totw, account, progress)
    } catch {
        other.value = null
        loadError.value = true
    } finally {
        loadingOther.value = false
    }
}
watch(vsId, (id) => { setQueryParams({ vs: id || null }); loadOther(id) }, { immediate: true })
onMounted(() => loadMembers())

// ── Selector ──
const picker = ref<HTMLDialogElement | null>(null)
const search = ref<HTMLInputElement | null>(null)
const query = ref("")
async function openPicker() {
    query.value = ""
    picker.value?.showModal()
    await nextTick()
    search.value?.focus()
}
function choose(id: string) {
    vsId.value = id
    picker.value?.close()
}
const candidates = computed(() => {
    const q = query.value.trim().toLowerCase()
    return members.value
        .filter((m) => m.playerId !== props.profile.member.playerId && (!q || m.playerName.toLowerCase().includes(q)))
        .sort((a, b) => (b.lastSeenAt ?? 0) - (a.lastSeenAt ?? 0))
})

// ── Stats con el filtro de la ficha ──
function statsOf(p: PlayerProfileEntity): PlayerStatsEntity {
    const { official, friendly } = p.stats
    const list = props.currentFilter === "official" ? official : props.currentFilter === "friendly" ? friendly : [...official, ...friendly]
    return PlayerStatsEntity.aggregate(list)
}
const statsA = computed(() => statsOf(props.profile))
const statsB = computed(() => (other.value ? statsOf(other.value) : null))
const sides = computed(() => (other.value && statsB.value ? [
    { key: "a", profile: props.profile, stats: statsA.value },
    { key: "b", profile: other.value, stats: statsB.value },
] : []))

const warnings = computed(() => {
    const out: string[] = []
    for (const s of sides.value) if (s.stats.gamesPlayed < 5) out.push(`${s.profile.member.playerName} solo tiene ${s.stats.gamesPlayed} ${s.stats.gamesPlayed === 1 ? "partido" : "partidos"}: sus números bailan mucho.`)
    const [a, b] = sides.value
    if (a && b && a.profile.mostPlayedPosition && b.profile.mostPlayedPosition && a.profile.mostPlayedPosition !== b.profile.mostPlayedPosition) {
        out.push(`Juegan en posiciones distintas (${translatePosition(a.profile.mostPlayedPosition).toLowerCase()} y ${translatePosition(b.profile.mostPlayedPosition).toLowerCase()}): hay stats que no son justas para uno de los dos.`)
    }
    return out
})

// ── Filas enfrentadas ──
type Mode = "perGame" | "total"
const MODES: { key: Mode; label: string }[] = [{ key: "perGame", label: "Por partido" }, { key: "total", label: "Totales" }]
const mode = ref<Mode>("perGame")
type Metric = { label: string; get: (s: PlayerStatsEntity) => number; d?: number; pct?: boolean; lowerBetter?: boolean }
const per = (k: keyof PlayerStatsEntity) => (s: PlayerStatsEntity) => (s.gamesPlayed ? Number(s[k] ?? 0) / s.gamesPlayed : 0)
const val = (k: keyof PlayerStatsEntity) => (s: PlayerStatsEntity) => Number(s[k] ?? 0) || 0
const anyGK = computed(() => sides.value.some((s) => s.profile.mostPlayedPosition === Position.goalkeeper))
const METRICS = computed<Metric[]>(() => mode.value === "perGame" ? [
    { label: "Nota media", get: val("ratingAve"), d: 1 },
    { label: "Goles", get: per("goals"), d: 2 },
    { label: "Asistencias", get: per("assists"), d: 2 },
    { label: "G + A", get: per("goalsPlusAssists"), d: 2 },
    { label: "% tiros a gol", get: val("shotSuccessRate"), pct: true },
    { label: "Pases", get: per("passesMade"), d: 1 },
    { label: "% pase", get: val("passSuccessRate"), pct: true },
    { label: "Entradas", get: per("tacklesMade"), d: 1 },
    { label: "% entradas", get: val("tackleSuccessRate"), pct: true },
    { label: "% portería a 0", get: val("cleanSheetsPercent"), pct: true },
    { label: "% victorias", get: val("winRate"), pct: true },
    { label: "% MVP", get: val("manOfTheMatchPercent"), pct: true },
    ...(anyGK.value ? [{ label: "Paradas", get: per("saves"), d: 1 }] : []),
    { label: "Rojas", get: per("redCards"), d: 2, lowerBetter: true },
] : [
    { label: "Partidos", get: val("gamesPlayed") },
    { label: "Goles", get: val("goals") },
    { label: "Asistencias", get: val("assists") },
    { label: "G + A", get: val("goalsPlusAssists") },
    { label: "Pases buenos", get: val("passesSuccess") },
    { label: "Entradas ganadas", get: val("tacklesSuccess") },
    { label: "Porterías a 0", get: val("cleanSheets") },
    { label: "Victorias", get: val("wins") },
    { label: "MVP", get: val("manOfTheMatch") },
    { label: "Hat-tricks", get: val("hattricks") },
    ...(anyGK.value ? [{ label: "Paradas", get: val("saves") }] : []),
    { label: "Rojas", get: val("redCards"), lowerBetter: true },
])
const fmt = (n: number, d = 0) => (Number.isFinite(n) ? n : 0).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d })
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
const rows = computed(() => {
    const A = statsA.value, B = statsB.value
    if (!B) return []
    return METRICS.value.map((m) => {
        const a = m.get(A), b = m.get(B)
        const max = m.pct ? 100 : Math.max(a, b, 0.0001)
        const close = Math.abs(a - b) < (m.d ? 10 ** -m.d / 2 : 0.5)
        const win: "a" | "b" | null = close ? null : (a > b) !== !!m.lowerBetter ? "a" : "b"
        const text = (v: number) => (m.pct ? `${fmt(v)}%` : fmt(v, m.d ?? 0))
        return { label: m.label, aText: text(a), bText: text(b), aPct: (a / max) * 100, bPct: (b / max) * 100, win }
    })
})
const score = computed(() => ({ a: rows.value.filter((r) => r.win === "a").length, b: rows.value.filter((r) => r.win === "b").length }))

// ── Radar ──
const norm = (v: number, max: number) => Math.max(0, Math.min(100, ((Number.isFinite(v) ? v : 0) / max) * 100))
const RADAR = computed(() => [
    { label: "Nota", get: val("ratingAve"), max: 10 },
    { label: "G+A/p", get: per("goalsPlusAssists"), max: 1.5 },
    { label: "% Pase", get: val("passSuccessRate"), max: 100 },
    { label: "% Entrada", get: val("tackleSuccessRate"), max: 100 },
    { label: "% Imbatido", get: val("cleanSheetsPercent"), max: 100 },
    anyGK.value ? { label: "% Paradas", get: val("savesPercent"), max: 100 } : { label: "% Tiro", get: val("shotSuccessRate"), max: 100 },
    { label: "% MVP", get: val("manOfTheMatchPercent"), max: 30 },
    { label: "% Victorias", get: val("winRate"), max: 100 },
])
const B_COLOR = "#5b8def"
const radarData = computed(() => ({
    labels: RADAR.value.map((m) => m.label),
    datasets: sides.value.map((s, i) => ({
        label: s.profile.member.playerName,
        data: RADAR.value.map((m) => norm(m.get(s.stats), m.max)),
        fill: true,
        backgroundColor: hexToRgba(i === 0 ? CLUB.colors.primary : B_COLOR, 0.22),
        borderColor: i === 0 ? CLUB.colors.primary : B_COLOR,
        borderWidth: 2.5,
        pointBackgroundColor: i === 0 ? CLUB.colors.primary : B_COLOR,
        pointBorderColor: "#fff",
        pointRadius: 3,
    })),
}))
const radarOptions = computed<ChartOptions<"radar">>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeOutQuart" as const },
    interaction: { mode: "index" as const, intersect: false },
    scales: {
        r: {
            type: "radialLinear", suggestedMin: 0, suggestedMax: 100,
            angleLines: { color: "rgba(166, 173, 187, 0.2)" },
            grid: { color: "rgba(166, 173, 187, 0.15)", circular: true },
            ticks: { display: false, stepSize: 25 },
            pointLabels: { font: { size: 11, weight: "bold" }, color: "#A6ADBB", padding: 6 },
        },
    },
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: "#1D232A", padding: 10, cornerRadius: 8,
            callbacks: {
                label: (ctx) => {
                    const m = RADAR.value[ctx.dataIndex]
                    const v = m.get(sides.value[ctx.datasetIndex].stats)
                    return `${ctx.dataset.label}: ${m.max === 100 || m.max === 30 ? `${fmt(v)}%` : fmt(v, m.max === 10 ? 1 : 2)}`
                },
            },
        },
    },
}))

// ── Juntos (los partidos de este jugador en los que también jugó el otro, con el filtro) ──
const together = computed(() => {
    const idA = props.profile.member.playerId, idB = other.value?.member.playerId
    const t = { games: 0, wins: 0, ties: 0, losses: 0, goalsFor: 0, a: { goals: 0, assists: 0, rating: 0 }, b: { goals: 0, assists: 0, rating: 0 }, last: null as null | { matchId: number; label: string } }
    let lastTs = -1
    if (!idB) return t
    for (const m of props.matches ?? []) {
        const official = m.matchType === "league" || m.matchType === "playoff"
        if (props.currentFilter === "official" ? !official : props.currentFilter === "friendly" ? official : false) continue
        const pa = m.ourClub.players.find((p) => p.playerId === idA)
        const pb = m.ourClub.players.find((p) => p.playerId === idB)
        if (!pa?.played || !pb?.played) continue
        t.games++
        if (m.result === "win") t.wins++
        else if (m.result === "loose") t.losses++
        else t.ties++
        t.goalsFor += m.ourClub.matchStats.goals
        t.a.goals += pa.goals; t.a.assists += pa.assists; t.a.rating += pa.rating
        t.b.goals += pb.goals; t.b.assists += pb.assists; t.b.rating += pb.rating
        if (m.timestamp > lastTs) {
            lastTs = m.timestamp
            t.last = { matchId: m.matchId, label: `${m.ourClub.matchStats.goals}–${m.opponentClub.matchStats.goals} contra ${m.opponentClub.name}` }
        }
    }
    return t
})

// ── Logros (de club, en este club) ──
type Ach = { id: string; name: string; rarity: AchievementRarity; points: number }
const achOf = (p: PlayerProfileEntity): Ach[] => {
    const byId = new Map<string, Ach>()
    for (const a of p.achievements as unknown as { achievementId: string; definition?: { name: string; rarity: AchievementRarity; points: number } }[]) {
        if (!byId.has(a.achievementId)) byId.set(a.achievementId, { id: a.achievementId, name: a.definition?.name ?? a.achievementId, rarity: a.definition?.rarity ?? "common", points: a.definition?.points ?? 0 })
    }
    return [...byId.values()]
}
const achA = computed(() => achOf(props.profile))
const achB = computed(() => (other.value ? achOf(other.value) : []))
const rarityRows = computed(() => [...ACHIEVEMENT_RARITIES].reverse().map((r) => ({
    rarity: r, a: achA.value.filter((x) => x.rarity === r).length, b: achB.value.filter((x) => x.rarity === r).length,
})))
const sumPoints = (p: PlayerProfileEntity) => (p.achievements as unknown as { definition?: { points: number } }[]).reduce((s, a) => s + (a.definition?.points ?? 0), 0)
const points = computed(() => ({ a: sumPoints(props.profile), b: other.value ? sumPoints(other.value) : 0 }))
const RANK: Record<string, number> = { legendary: 3, epic: 2, rare: 1, common: 0 }
const onlyOne = computed(() => {
    const idsA = new Set(achA.value.map((x) => x.id)), idsB = new Set(achB.value.map((x) => x.id))
    const sort = (l: Ach[]) => l.sort((x, y) => RANK[y.rarity] - RANK[x.rarity] || y.points - x.points)
    return [
        { key: "a", name: props.profile.member.playerName, list: sort(achA.value.filter((x) => !idsB.has(x.id))) },
        { key: "b", name: other.value?.member.playerName ?? "", list: sort(achB.value.filter((x) => !idsA.has(x.id))) },
    ]
})
const RARITY_TONE: Record<AchievementRarity, string> = {
    common: "text-base-content/70", rare: "text-sky-600 dark:text-sky-300", epic: "text-violet-600 dark:text-violet-300", legendary: "text-amber-600 dark:text-amber-300",
}
const RARITY_BADGE: Record<AchievementRarity, string> = {
    common: "badge-ghost", rare: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30", epic: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30", legendary: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
}
</script>

<style scoped>
.bar { transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
@media (prefers-reduced-motion: no-preference) {
    .bar { transform-origin: right; animation: grow 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: calc(var(--k, 0) * 35ms); }
    .bar-b { transform-origin: left; }
    .vs-head { animation: rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
}
@keyframes grow { from { scale: 0 1; } }
@keyframes rise { from { opacity: 0; translate: 0 0.5rem; } }
</style>
