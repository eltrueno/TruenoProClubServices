<script setup lang="ts">
/**
 * Página de partidos (/partidos), con el mismo lenguaje que la plantilla:
 * - Barra de filtros pegada al bajar: buscador (rival o id), tipo (liga, playoff, amistoso), jugadores
 *   (que estuvieran todos), fechas y, en "Más", el mínimo de jugadores nuestros. Todo en la URL.
 * - Resumen de lo filtrado: balance, goles, % de victorias y racha con la que acaba.
 * - Partidos agrupados por mes (cada mes con su balance), en filas que llevan al detalle del partido.
 * La lógica, en lib/matchList.ts (test/matchList.test.ts).
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import type { MatchResult, MatchType } from "@trueno-proclub-services/shared"
import { useMatches } from "@/composables/useMatches"
import { useMembers } from "@/composables/useMembers"
import { usePlayerStats } from "@/composables/usePlayerStats"
import { useAuth } from "@/composables/useAuth"
import { currentStreak, filterMatches, groupByMonth, recordOf, sortMatches, MATCH_SORTS, type MatchSort } from "@/lib/matchList"
import { paginate } from "@/lib/pagination"
import { getQueryParam, hasQueryParam, setQueryParams } from "@/lib/query"
import { PLAYER_PLACEHOLDER } from "@/lib/playerImage"
import Paginator from "@/components/Paginator.vue"
import DateRangePicker from "@/components/ui/DateRangePicker.vue"
import PlayerPickerModal, { type PickerItem } from "@/components/ui/PlayerPickerModal.vue"
import MatchRow from "./MatchRow.vue"
import GoalIcon from "@/components/ui/GoalIcon.vue"
import { KPI_ICONS } from "@/lib/kpiIcons"
import { OTHER_CLUBS } from "@/config/club"

const { matches, loading, status, load: loadMatches } = useMatches()
const { members, load: loadMembers } = useMembers()
const { positionsOf, load: loadPositions } = usePlayerStats()
const { myPlayerId, isLoggedIn, loadMyMember } = useAuth()
watch(isLoggedIn, (l) => { if (l) loadMyMember() }, { immediate: true })

// ── Filtros (de la URL; también los de antes: ?id, ?liga, ?playoff, ?amistoso, ?player) ──
const TYPES: { value: MatchType; label: string; legacy: string }[] = [
    { value: "league", label: "Liga", legacy: "liga" },
    { value: "playoff", label: "Playoff", legacy: "playoff" },
    { value: "friendly", label: "Amistoso", legacy: "amistoso" },
]
const fromQuery = (): MatchType[] => {
    const tipo = getQueryParam("tipo")
    if (tipo) return TYPES.filter((t) => tipo.split(",").includes(t.legacy)).map((t) => t.value)
    const legacy = TYPES.filter((t) => hasQueryParam(t.legacy) || (t.value === "friendly" && hasQueryParam("draft")))
    return legacy.length ? legacy.map((t) => t.value) : []
}
const query = ref(getQueryParam("q") || getQueryParam("id"))
/** vacío = todos los tipos */
const types = ref<MatchType[]>(fromQuery())
const players = ref<string[]>((getQueryParam("jugadores") || getQueryParam("player")).split(",").filter(Boolean))
const dates = ref({ startDate: getQueryParam("desde"), endDate: getQueryParam("hasta") })
const minPlayers = ref(Number(getQueryParam("min")) || 0)
/** Solo derbis (contra los otros clubes de la comunidad) */
const DERBY_RIVALS = OTHER_CLUBS.map((c) => c.name)
const derby = ref(getQueryParam("derbi") === "1")
const page = ref(Number(getQueryParam("pagina")) || 1)
/** Resultado (vacío = todos), solo prórroga / penaltis, y orden */
const RESULTS: { value: MatchResult; label: string; short: string; on: string }[] = [
    { value: "win", label: "Victorias", short: "v", on: "bg-success text-success-content border-success" },
    { value: "tie", label: "Empates", short: "e", on: "bg-base-content text-base-100 border-base-content" },
    { value: "loose", label: "Derrotas", short: "d", on: "bg-error text-error-content border-error" },
]
const results = ref<MatchResult[]>(RESULTS.filter((r) => getQueryParam("resultado").split(",").includes(r.short)).map((r) => r.value))
const extraTimeOnly = ref(getQueryParam("prorroga") === "1")
const penaltiesOnly = ref(getQueryParam("penaltis") === "1")
const sort = ref<MatchSort>(MATCH_SORTS.some((o) => o.key === getQueryParam("orden")) ? (getQueryParam("orden") as MatchSort) : "recent")
const toggleResult = (r: MatchResult) => { results.value = results.value.includes(r) ? results.value.filter((x) => x !== r) : [...results.value, r] }
/** Lo que va en "+" (para el puntito del botón) */
const moreActive = computed(() => (minPlayers.value ? 1 : 0) + (results.value.length ? 1 : 0) + (extraTimeOnly.value ? 1 : 0) + (penaltiesOnly.value ? 1 : 0))

const toggleType = (t: MatchType) => { types.value = types.value.includes(t) ? types.value.filter((x) => x !== t) : [...types.value, t] }
const activeFilters = computed(() => (derby.value ? 1 : 0) + (query.value ? 1 : 0) + (types.value.length ? 1 : 0) + (players.value.length ? 1 : 0) + (dates.value.startDate ? 1 : 0) + moreActive.value)
function clearFilters() {
    query.value = ""; types.value = []; players.value = []; derby.value = false; dates.value = { startDate: "", endDate: "" }; minPlayers.value = 0
    results.value = []; extraTimeOnly.value = false; penaltiesOnly.value = false
}

watch([query, types, players, dates, minPlayers, derby, results, extraTimeOnly, penaltiesOnly, sort], () => { page.value = 1 })
watch([query, types, players, dates, minPlayers, derby, results, extraTimeOnly, penaltiesOnly, sort, page], () => setQueryParams({
    derbi: derby.value ? "1" : null,
    resultado: results.value.length ? RESULTS.filter((r) => results.value.includes(r.value)).map((r) => r.short).join(",") : null,
    prorroga: extraTimeOnly.value ? "1" : null,
    penaltis: penaltiesOnly.value ? "1" : null,
    orden: sort.value === "recent" ? null : sort.value,
    q: query.value.trim() || null, id: null,
    tipo: types.value.length ? TYPES.filter((t) => types.value.includes(t.value)).map((t) => t.legacy).join(",") : null,
    liga: null, playoff: null, amistoso: null, draft: null,
    jugadores: players.value.length ? players.value.join(",") : null, player: null,
    desde: dates.value.startDate || null, hasta: dates.value.endDate || null,
    min: minPlayers.value ? String(minPlayers.value) : null,
    pagina: page.value > 1 ? String(page.value) : null,
}), { deep: true })

// ── Lista ──
const filtered = computed(() => filterMatches(matches.value, {
    query: query.value,
    types: types.value.length ? types.value : TYPES.map((t) => t.value),
    players: players.value,
    from: dates.value.startDate && dates.value.endDate ? dates.value.startDate : "",
    to: dates.value.startDate && dates.value.endDate ? dates.value.endDate : "",
    minPlayers: minPlayers.value,
    derbyRivals: derby.value ? DERBY_RIVALS : undefined,
    results: results.value,
    extraTime: extraTimeOnly.value,
    penalties: penaltiesOnly.value,
}))
/** Ordenada; por fecha se agrupa por meses, por marcador va sin agrupar */
const sorted = computed(() => sortMatches(filtered.value, sort.value))
const byDate = computed(() => sort.value === "recent" || sort.value === "oldest")
const PAGE_SIZE = 20
const paged = computed(() => paginate(sorted.value, page.value, PAGE_SIZE))
const groups = computed(() => (byDate.value ? groupByMonth(paged.value.items, filtered.value) : []))
const listTop = ref<HTMLElement | null>(null)
function goToPage(p: number) {
    page.value = p
    listTop.value?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" })
}

// ── Resumen de lo filtrado ──
const record = computed(() => recordOf(filtered.value))
const streak = computed(() => currentStreak(filtered.value))
const winPct = computed(() => (record.value.games ? Math.round((record.value.wins / record.value.games) * 100) : 0))
const STREAK_WORD = { win: ["victoria", "victorias"], tie: ["empate", "empates"], loose: ["derrota", "derrotas"] } as const
const playerNames = computed(() => players.value.map((id) => members.value.find((m) => m.playerId === id)?.playerName ?? "?"))
const withPlayers = computed(() => {
    const n = playerNames.value
    return n.length === 0 ? "" : n.length === 1 ? `con ${n[0]}` : `con ${n.slice(0, -1).join(", ")} y ${n[n.length - 1]} juntos`
})

// ── Selector de jugadores (el genérico) ──
const pickerItems = computed<PickerItem[]>(() => members.value.map((m) => ({ id: m.playerId, name: m.playerName, image: m.imageUrl, positions: positionsOf(m.playerId), member: m })))

// ── Barra pegada (como la de la plantilla) ──
const sentinel = ref<HTMLElement | null>(null)
const stuck = ref(false)
/** Mes por el que vas: el último cuyo separador ya ha pasado bajo la barra */
const currentKey = ref<string | null>(null)
const currentMonth = computed(() => groups.value.find((g) => g.key === currentKey.value) ?? null)
const updateStuck = () => {
    const navH = document.querySelector<HTMLElement>("nav.navbar")?.offsetHeight ?? 68
    stuck.value = !!sentinel.value && sentinel.value.getBoundingClientRect().top < navH + 4
    const limit = navH + 90
    let key: string | null = null
    for (const el of document.querySelectorAll<HTMLElement>(".month-head")) {
        if (el.getBoundingClientRect().top < limit) key = el.dataset.month ?? null
        else break
    }
    currentKey.value = key
}
onMounted(() => {
    addEventListener("scroll", updateStuck, { passive: true })
    addEventListener("resize", updateStuck, { passive: true })
    updateStuck()
    loadPositions()
    loadMembers()
    loadMatches()
})
onBeforeUnmount(() => {
    removeEventListener("scroll", updateStuck)
    removeEventListener("resize", updateStuck)
})
const filtersDialog = ref<HTMLDialogElement | null>(null)
const hasError = computed(() => !loading.value && status.value !== 200)
</script>

<template>
    <!-- Todo sobre un bloque con fondo, la barra de filtros un tono más marcado (como la plantilla) -->
    <div class="w-full flex flex-col gap-5 rounded-3xl bg-(--list-bg) px-3 pb-4 lg:px-5 lg:pb-6
        [--list-bg:color-mix(in_oklab,var(--color-base-200)_50%,var(--color-base-100))]
        dark:[--list-bg:color-mix(in_oklab,var(--color-base-200)_50%,var(--color-base-300))]
        [--toolbar-bg:color-mix(in_oklab,var(--color-base-200)_94%,var(--color-base-content))] dark:[--toolbar-bg:color-mix(in_oklab,var(--color-base-200)_92%,var(--color-base-content))]">
        <div ref="sentinel" aria-hidden="true" class="h-0 -mb-5"></div>
        <!-- Barra de filtros (pegada al bajar). En móvil: buscador y "Filtros" (el resto en un panel) -->
        <div role="toolbar" aria-label="Filtrar partidos"
            class="sticky top-[4.25rem] z-30 -mx-3 lg:-mx-5 px-3 lg:px-5 py-3 flex flex-wrap items-center gap-2 transition-[border-radius,background-color,box-shadow] duration-300"
            :class="stuck
                ? (currentMonth ? 'rounded-none' : 'rounded-b-2xl shadow-lg shadow-black/25') + ' bg-[color-mix(in_oklab,var(--toolbar-bg)_95%,transparent)] backdrop-blur-md'
                : 'rounded-t-3xl bg-(--toolbar-bg)'">
            <label class="input input-sm rounded-xl flex-1 min-w-56 bg-base-100">
                <svg class="size-4 opacity-60" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" /></svg>
                <input v-model="query" type="search" placeholder="Buscar rival o id del partido" aria-label="Buscar rival o id del partido" />
            </label>
            <label class="select select-sm rounded-xl bg-base-100 border-base-content/10 w-auto focus-within:border-primary">
                <span class="label text-[0.65rem] uppercase tracking-widest font-black text-base-content/50 hidden lg:inline">Orden</span>
                <span class="w-1 h-4 rounded-full bg-primary shrink-0" aria-hidden="true"></span>
                <select v-model="sort" aria-label="Ordenar partidos" class="font-black text-primary">
                    <option v-for="o in MATCH_SORTS" :key="o.key" :value="o.key" class="text-base-content active:bg-primary! active:text-primary-content! active:shadow-none!">{{ o.label }}</option>
                </select>
            </label>

            <div class="hidden md:flex flex-wrap items-center gap-2">
                <!-- Tipo: chips, varias a la vez; sin ninguna, todos -->
                <div role="group" aria-label="Tipo de partido (puedes marcar varios)" class="flex items-center gap-1">
                    <button v-for="t in TYPES" :key="t.value" type="button" :aria-pressed="types.includes(t.value)"
                        class="btn btn-sm rounded-full font-bold" :class="types.includes(t.value) ? 'btn-primary' : 'btn-ghost bg-base-100/60'"
                        @click="toggleType(t.value)">{{ t.label }}</button>
                    <!-- Derbi: solo contra el otro club de la comunidad -->
                    <button v-if="DERBY_RIVALS.length" type="button" :aria-pressed="derby" :title="`Solo contra ${DERBY_RIVALS.join(' y ')}`"
                        class="btn btn-sm rounded-full font-bold gap-1" :class="derby ? 'btn-primary' : 'btn-ghost bg-base-100/60'" @click="derby = !derby">
                        <svg class="size-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z" clip-rule="evenodd" /></svg>
                        Derbi
                    </button>
                </div>
                <div class="w-48">
                    <PlayerPickerModal v-model="players" :items="pickerItems" multiple zoom="2xl" :fallback-image="PLAYER_PLACEHOLDER"
                        title="Partidos en los que estuvieron…" placeholder="Jugadores" search-placeholder="Buscar jugador…" size="sm" />
                </div>
                <div class="w-56"><DateRangePicker v-model="dates" size="sm" placeholder="Fechas" /></div>
                <!-- Lo que menos se usa, en un desplegable -->
                <details class="more dropdown dropdown-end">
                    <summary class="btn btn-sm btn-square rounded-xl bg-base-100 border-base-content/10 relative" aria-label="Más filtros" title="Más filtros">
                        <svg class="more-icon size-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" d="M12 5v14M5 12h14" /></svg>
                        <span v-if="moreActive" class="absolute -top-1 -right-1 size-2.5 rounded-full bg-primary ring-2 ring-base-100"></span>
                    </summary>
                    <div class="dropdown-content z-40 mt-2 w-72 rounded-2xl bg-base-100 p-4 shadow-xl ring-1 ring-base-content/10 flex flex-col gap-4">
                        <div>
                            <p class="text-xs uppercase tracking-widest font-black text-base-content/60 mb-2">Resultado</p>
                            <div class="flex gap-1">
                                <button v-for="r in RESULTS" :key="r.value" type="button" :aria-pressed="results.includes(r.value)"
                                    class="btn btn-xs rounded-full font-bold flex-1" :class="results.includes(r.value) ? r.on : 'btn-ghost bg-base-200'" @click="toggleResult(r.value)">{{ r.label }}</button>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="flex items-center justify-between gap-3 text-sm font-semibold cursor-pointer">Solo con prórroga <input v-model="extraTimeOnly" type="checkbox" class="toggle toggle-sm toggle-primary" /></label>
                            <label class="flex items-center justify-between gap-3 text-sm font-semibold cursor-pointer">Solo a penaltis <input v-model="penaltiesOnly" type="checkbox" class="toggle toggle-sm toggle-primary" /></label>
                        </div>
                        <div>
                            <label class="flex items-center justify-between text-xs uppercase tracking-widest font-black text-base-content/60 mb-2" for="min-players">Mínimo de jugadores nuestros <span class="tabular-nums text-primary">{{ minPlayers || "—" }}</span></label>
                            <input id="min-players" v-model.number="minPlayers" type="range" min="0" max="11" class="range range-xs range-primary" />
                        </div>
                    </div>
                </details>
            </div>
            <button v-if="activeFilters" type="button" class="hidden md:inline-flex btn btn-sm btn-ghost rounded-xl text-base-content/60" @click="clearFilters">Quitar filtros</button>
            <!-- Pegada: el mes por el que vas y su balance, como segunda fila de la barra -->
            <div class="current-month absolute inset-x-0 top-full flex items-baseline justify-between gap-3 px-3 lg:px-5 py-2 rounded-b-2xl border-t border-base-content/10
                    bg-[color-mix(in_oklab,var(--toolbar-bg)_96%,transparent)] backdrop-blur-md shadow-lg shadow-black/25"
                :data-show="stuck && !!currentMonth" :aria-hidden="!(stuck && currentMonth)">
                <span class="font-black text-sm">{{ currentMonth?.label }}</span>
                <span v-if="currentMonth?.record.games" class="text-xs font-bold tabular-nums text-base-content/70">
                    <span class="text-success">{{ currentMonth.record.wins }}V</span> · {{ currentMonth.record.ties }}E · <span class="text-error">{{ currentMonth.record.losses }}D</span>
                </span>
            </div>
            <button type="button" class="md:hidden btn btn-sm rounded-xl bg-base-100 border-base-content/10 gap-1.5" @click="filtersDialog?.showModal()">
                <svg class="size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" d="M3 6h18M6 12h12M10 18h4" /></svg>
                Filtros <span v-if="activeFilters" class="badge badge-xs badge-primary">{{ activeFilters }}</span>
            </button>
        </div>

        <!-- Cargando -->
        <div v-if="loading" class="flex flex-col gap-3" aria-busy="true">
            <div class="skeleton h-24 w-full rounded-2xl"></div>
            <div v-for="n in 6" :key="n" class="skeleton h-20 w-full rounded-2xl"></div>
        </div>

        <div v-else-if="hasError" class="text-center py-12 text-base-content/60">
            <p class="font-bold">Los partidos no están disponibles ahora mismo</p>
            <p class="text-sm">Vuelve a intentarlo en unos minutos.</p>
        </div>

        <div v-else-if="!matches.length" class="flex flex-col items-center gap-2 py-10 text-center">
            <p class="text-2xl font-black">Todavía no hay partidos</p>
            <p class="text-base-content/60">Se añaden solos en cuanto el club juega. ¡Vuelve pronto!</p>
            <img src="/illustrations/soccer1.svg" class="w-full max-w-xs mt-4 select-none pointer-events-none" alt="" />
        </div>

        <template v-else>
            <!-- Resumen de lo que se está viendo -->
            <section class="summary rounded-2xl bg-base-100 dark:bg-base-200 ring-1 ring-base-content/5 p-4 sm:p-5" aria-label="Resumen de los partidos filtrados">
                <p class="text-xs text-base-content/60 mb-3">
                    <b class="text-base-content">{{ filtered.length }}</b> {{ filtered.length === 1 ? "partido" : "partidos" }}<template v-if="withPlayers"> {{ withPlayers }}</template><template v-if="filtered.length !== record.games"> · {{ filtered.length - record.games }} nulos, que no cuentan</template>
                </p>
                <div v-if="record.games" class="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
                    <div class="col-span-2">
                        <p class="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-widest font-black text-base-content/50 mb-1">
                            <svg class="size-4 text-primary" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" v-html="KPI_ICONS.games"></svg>Balance
                        </p>
                        <p class="flex items-baseline gap-3 font-black tabular-nums">
                            <span class="text-3xl text-success">{{ record.wins }}<span class="text-xs ml-0.5">V</span></span>
                            <span class="text-3xl">{{ record.ties }}<span class="text-xs ml-0.5 text-base-content/60">E</span></span>
                            <span class="text-3xl text-error">{{ record.losses }}<span class="text-xs ml-0.5">D</span></span>
                        </p>
                        <div class="flex h-2 mt-2 rounded-full overflow-hidden bg-base-content/8" aria-hidden="true">
                            <span class="bar bg-success" :style="{ width: `${(record.wins / record.games) * 100}%` }"></span>
                            <span class="bar bg-base-content/35" :style="{ width: `${(record.ties / record.games) * 100}%` }"></span>
                            <span class="bar bg-error" :style="{ width: `${(record.losses / record.games) * 100}%` }"></span>
                        </div>
                    </div>
                    <div>
                        <p class="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-widest font-black text-base-content/50"><GoalIcon class="size-4 text-primary" />Goles</p>
                        <p class="text-xl font-black tabular-nums">{{ record.goalsFor }}<span class="text-base-content/30 mx-1">–</span>{{ record.goalsAgainst }}</p>
                        <p class="text-xs text-base-content/60 tabular-nums">{{ (record.goalsFor / record.games).toLocaleString("es-ES", { maximumFractionDigits: 1 }) }} por partido</p>
                    </div>
                    <div>
                        <p class="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-widest font-black text-base-content/50">
                            <svg class="size-4 text-primary" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" v-html="KPI_ICONS.wins"></svg>Victorias
                        </p>
                        <p class="text-xl font-black tabular-nums">{{ winPct }}%</p>
                        <p v-if="streak && streak.count > 1" class="flex items-center gap-1 text-xs font-bold" :class="streak.result === 'win' ? 'text-success' : streak.result === 'loose' ? 'text-error' : 'text-base-content/60'">
                            <svg class="size-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z" clip-rule="evenodd" /></svg>
                            Racha: {{ streak.count }} {{ STREAK_WORD[streak.result][1] }}
                        </p>
                        <p v-else-if="streak" class="text-xs text-base-content/60">Último: {{ STREAK_WORD[streak.result][0] }}</p>
                    </div>
                </div>
            </section>

            <div ref="listTop" class="scroll-mt-36 -mb-2" aria-hidden="true"></div>

            <!-- Por meses -->
            <div v-if="groups.length" class="flex flex-col gap-5">
                <section v-for="g in groups" :key="g.key" :aria-label="g.label">
                    <!-- Separador del mes: el título, una raya y su balance (no se pega: el mes actual va en la barra) -->
                    <header class="month-head flex items-center gap-3 mb-3" :data-month="g.key">
                        <h2 class="font-black text-lg shrink-0">{{ g.label }}</h2>
                        <span class="h-px flex-1 bg-base-content/10" aria-hidden="true"></span>
                        <p v-if="g.record.games" class="text-xs font-bold tabular-nums text-base-content/70">
                            <span class="text-success">{{ g.record.wins }}V</span> · {{ g.record.ties }}E · <span class="text-error">{{ g.record.losses }}D</span>
                            <span class="hidden sm:inline text-base-content/50"> · {{ g.record.goalsFor }}–{{ g.record.goalsAgainst }}</span>
                        </p>
                    </header>
                    <ul class="flex flex-col gap-2">
                        <li v-for="(m, i) in g.items" :key="m.matchId" class="row-in" :style="{ '--k': Math.min(i, 10) }">
                            <MatchRow :match="m" :my-id="myPlayerId" />
                        </li>
                    </ul>
                </section>
            </div>
            <ul v-else-if="paged.items.length" class="flex flex-col gap-2" :aria-label="`Partidos, ${MATCH_SORTS.find((o) => o.key === sort)?.label.toLowerCase()}`">
                <li v-for="(m, i) in paged.items" :key="m.matchId" class="row-in" :style="{ '--k': Math.min(i, 10) }">
                    <MatchRow :match="m" :my-id="myPlayerId" />
                </li>
            </ul>
            <div v-else class="text-center py-12 text-base-content/60">
                <p class="font-bold">Ningún partido con esos filtros</p>
                <button type="button" class="btn btn-sm btn-ghost mt-2" @click="clearFilters">Quitar los filtros</button>
            </div>

            <Paginator :items-count="filtered.length" :items-per-page="PAGE_SIZE" :current-page="paged.page" label="Páginas de partidos" @pagechange="goToPage" />
        </template>

        <!-- Filtros en móvil -->
        <dialog ref="filtersDialog" class="modal modal-bottom" aria-labelledby="match-filters-title">
            <div class="modal-box flex flex-col gap-5">
                <h3 id="match-filters-title" class="font-black text-lg">Filtros</h3>
                <div>
                    <p class="text-xs uppercase tracking-widest font-black text-base-content/60 mb-2">Tipo</p>
                    <div class="flex flex-wrap gap-1">
                        <button v-for="t in TYPES" :key="t.value" type="button" :aria-pressed="types.includes(t.value)"
                            class="btn btn-sm rounded-full font-bold" :class="types.includes(t.value) ? 'btn-primary' : 'btn-ghost bg-base-200'"
                            @click="toggleType(t.value)">{{ t.label }}</button>
                    </div>
                </div>
                <div>
                    <p class="text-xs uppercase tracking-widest font-black text-base-content/60 mb-2">Jugadores</p>
                    <PlayerPickerModal v-model="players" :items="pickerItems" multiple zoom="2xl" :fallback-image="PLAYER_PLACEHOLDER"
                        title="Partidos en los que estuvieron…" placeholder="Todos" search-placeholder="Buscar jugador…" size="md" />
                </div>
                <div>
                    <p class="text-xs uppercase tracking-widest font-black text-base-content/60 mb-2">Fechas</p>
                    <DateRangePicker v-model="dates" size="md" placeholder="Cualquier fecha" />
                </div>
                <div>
                    <p class="text-xs uppercase tracking-widest font-black text-base-content/60 mb-2">Resultado</p>
                    <div class="flex gap-1">
                        <button v-for="r in RESULTS" :key="r.value" type="button" :aria-pressed="results.includes(r.value)"
                            class="btn btn-sm rounded-full font-bold flex-1" :class="results.includes(r.value) ? r.on : 'btn-ghost bg-base-200'" @click="toggleResult(r.value)">{{ r.label }}</button>
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="flex items-center justify-between gap-3 text-sm font-semibold cursor-pointer">Solo con prórroga <input v-model="extraTimeOnly" type="checkbox" class="toggle toggle-sm toggle-primary" /></label>
                    <label class="flex items-center justify-between gap-3 text-sm font-semibold cursor-pointer">Solo a penaltis <input v-model="penaltiesOnly" type="checkbox" class="toggle toggle-sm toggle-primary" /></label>
                </div>
                <div>
                    <label class="flex items-center justify-between text-xs uppercase tracking-widest font-black text-base-content/60 mb-2" for="min-players-m">Mínimo de jugadores nuestros <span class="tabular-nums text-primary">{{ minPlayers || "—" }}</span></label>
                    <input id="min-players-m" v-model.number="minPlayers" type="range" min="0" max="11" class="range range-xs range-primary" />
                </div>
                <div class="modal-action">
                    <button v-if="activeFilters" type="button" class="btn btn-ghost" @click="clearFilters">Quitar filtros</button>
                    <form method="dialog"><button class="btn btn-primary">Ver {{ filtered.length }} partidos</button></form>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop"><button tabindex="-1">Cerrar</button></form>
        </dialog>
    </div>
</template>

<style scoped>
/* El mes actual: cuelga bajo la barra pegada (fuera del flujo: aparecer no mueve nada) y sale de debajo de ella */
.current-month {
    opacity: 0;
    translate: 0 -0.75rem;
    pointer-events: none;
    transition: translate 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s;
}
.current-month[data-show="true"] { opacity: 1; translate: 0 0; pointer-events: auto; }
/* "Más": el + gira y se vuelve × al abrirse */
.more-icon { transition: rotate 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
.more[open] .more-icon { rotate: 135deg; }
@media (prefers-reduced-motion: reduce) { .current-month, .more-icon { transition: none; } }
.bar { transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
@media (prefers-reduced-motion: no-preference) {
    .summary { animation: rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
    .row-in { animation: rise 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: calc(var(--k, 0) * 30ms); }
}
@keyframes rise { from { opacity: 0; translate: 0 0.5rem; } }
</style>
