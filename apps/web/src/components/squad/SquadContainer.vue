<script setup lang="ts">
/**
 * La plantilla: cuadrícula de cartas (SquadCard) con barra de filtros fija (buscador, orden,
 * posición, oficiales/todos/amistosos y "solo habituales"). En pantallas grandes los tres primeros
 * van solos en un podio. Los de menos de REGULAR_MIN_GAMES partidos van plegados en "Han pasado por
 * el club". Tu jugador (con sesión) va marcado, y una burbuja lleva hasta él cuando no se ve.
 * Va paginada (SQUAD_PAGE_SIZE cartas por página: menos cartas y menos Atropos montados a la vez).
 * El orden, la dirección, las posiciones, el ámbito, "todos" y la página van en la URL
 * (?orden=&dir=&pos=defender,midfielder&tipo=&todos=&pagina=).
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import type { PlayerPosition } from "@trueno-proclub-services/shared"
import { useMembers } from "@/composables/useMembers"
import { usePlayerStats } from "@/composables/usePlayerStats"
import { useAuth } from "@/composables/useAuth"
import OptionToggle from "@/components/ui/OptionToggle.vue"
import SquadCard from "./SquadCard.vue"
import Paginator from "@/components/Paginator.vue"
import { MATCH_SCOPE_OPTIONS, type MatchScope } from "@/lib/matchScope"
import { getQueryParam, routes, setQueryParams } from "@/lib/query"
import { playerImage } from "@/lib/playerImage"
import { paginate } from "@/lib/pagination"
import EmptyState from "@/components/ui/EmptyState.vue"
import { navTop } from "@/lib/navOffset"
import {
    DEFAULT_SORT, REGULAR_MIN_GAMES, SQUAD_PAGE_SIZE, SQUAD_SORTS, buildSquad, filterSquad, isRegular, sortByKey, sortSquad,
    type SquadSortKey,
} from "@/lib/squad"

// /plantilla?id=<playerId> (enlaces antiguos): al perfil
const legacyDetailId = getQueryParam("id")

const { members, load: loadMembers, loaded: membersLoaded } = useMembers()
const playerStats = usePlayerStats()
const { isLoggedIn, myMember, loadMyMember } = useAuth()

const loading = computed(() => !membersLoaded.value || playerStats.loading.value || !playerStats.loaded.value)
const hasError = computed(() => playerStats.hasError.value)

// ── Filtros y orden (con su valor inicial de la URL) ──
const POSITIONS: { value: PlayerPosition; label: string }[] = [
    { value: "goalkeeper", label: "POR" },
    { value: "defender", label: "DEF" },
    { value: "midfielder", label: "MED" },
    { value: "forward", label: "DEL" },
]
const SCOPES: MatchScope[] = ["official", "all", "friendly"]

const search = ref("")
const sortKey = ref<SquadSortKey>(sortByKey(getQueryParam("orden", DEFAULT_SORT)).key)
const direction = ref<"asc" | "desc">(getQueryParam("dir") === "asc" ? "asc" : "desc")
/** Posiciones elegidas (chips, varias a la vez); vacío = todas. En la URL: ?pos=defender,midfielder */
const positions = ref<PlayerPosition[]>(
    (getQueryParam("pos") ?? "").split(",").filter((v): v is PlayerPosition => POSITIONS.some((p) => p.value === v)))
const scope = ref<MatchScope>(SCOPES.find((s) => s === getQueryParam("tipo")) ?? "all")
const onlyRegulars = ref(getQueryParam("todos") !== "1")
const page = ref(Math.max(1, Number(getQueryParam("pagina")) || 1))

const togglePosition = (pos: PlayerPosition) => {
    positions.value = positions.value.includes(pos)
        ? positions.value.filter((p) => p !== pos)
        // En el orden de siempre (POR, DEF, MED, DEL), para que la URL no dependa del orden de los clics
        : POSITIONS.map((p) => p.value).filter((p) => p === pos || positions.value.includes(p))
}

// Al cambiar cualquier filtro o el orden, a la primera página
watch([sortKey, direction, positions, scope, onlyRegulars, search], () => { page.value = 1 })

watch([sortKey, direction, positions, scope, onlyRegulars, page], () =>
    setQueryParams({
        orden: sortKey.value === DEFAULT_SORT ? null : sortKey.value,
        dir: direction.value === "asc" ? "asc" : null,
        pos: positions.value.length ? positions.value.join(",") : null,
        tipo: scope.value === "all" ? null : scope.value,
        todos: onlyRegulars.value ? null : "1",
        pagina: page.value > 1 ? String(page.value) : null,
    }))

const sort = computed(() => sortByKey(sortKey.value))

// ── La plantilla ──
const squad = computed(() => buildSquad(members.value, playerStats.stats.value, scope.value))
const filtered = computed(() => sortSquad(filterSquad(squad.value, { search: search.value, positions: positions.value }), sortKey.value, direction.value))
const shown = computed(() => (onlyRegulars.value ? filtered.value.filter(isRegular) : filtered.value))
const casuals = computed(() => (onlyRegulars.value ? filtered.value.filter((p) => !isRegular(p)) : []))
const regularsTotal = computed(() => squad.value.filter(isRegular).length)

// ── Paginación: solo se montan las cartas de la página (cada una con su Atropos) ──
const paged = computed(() => paginate(shown.value, page.value, SQUAD_PAGE_SIZE))
const gridTop = ref<HTMLElement | null>(null)
function goToPage(n: number) {
    if (n === paged.value.page) return
    page.value = n
    // Al principio de la cuadrícula (bajo la barra pegada), no arriba del todo
    nextTick(() => {
        const el = gridTop.value
        if (!el) return
        const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
        const top = el.getBoundingClientRect().top + scrollY - 190
        if (top < scrollY) scrollTo({ top, behavior: reduce ? "auto" : "smooth" })
    })
}

/** Podio (y halos): solo en la primera página, si se ordena de más a menos y no se está buscando */
const podium = computed(() => paged.value.page === 1 && direction.value === "desc" && !search.value.trim())

/** Filtros cambiados respecto a lo de siempre (para el número del botón "Filtros" en móvil) */
const activeFilters = computed(() => Number(positions.value.length > 0) + Number(scope.value !== "all") + Number(!onlyRegulars.value))

// ── Tu jugador ──
const myId = computed(() => myMember.value?.playerId ?? null)
const mineInGrid = computed(() => !!myId.value && shown.value.some((p) => p.member.playerId === myId.value))
const mineAnywhere = computed(() => !!myId.value && squad.value.some((p) => p.member.playerId === myId.value))
watch(isLoggedIn, (logged) => { if (logged) loadMyMember() }, { immediate: true })

const mineVisible = ref(false)
const mineAbove = ref(false)
let mineObserver: IntersectionObserver | null = null
const observeMine = async () => {
    mineObserver?.disconnect()
    mineVisible.value = false
    await nextTick()
    const el = document.getElementById("squad-me")
    if (!el) return
    mineObserver ??= new IntersectionObserver(([entry]) => {
        mineVisible.value = entry.isIntersecting
        mineAbove.value = entry.boundingClientRect.top < 0
    }, { threshold: 0.2 })
    mineObserver.observe(el)
}
watch([() => paged.value.items, myId], observeMine)
onBeforeUnmount(() => mineObserver?.disconnect())

// ── Barra pegada: con una medida en el scroll (como la de la ficha de jugador) ──
const toolbarSentinel = ref<HTMLElement | null>(null)
const toolbarStuck = ref(false)
const updateStuck = () => {
    const el = toolbarSentinel.value
    const navH = navTop()
    toolbarStuck.value = !!el && el.getBoundingClientRect().top < navH + 1
}
onMounted(() => {
    addEventListener("scroll", updateStuck, { passive: true })
    addEventListener("resize", updateStuck, { passive: true })
    updateStuck()
})
onBeforeUnmount(() => {
    removeEventListener("scroll", updateStuck)
    removeEventListener("resize", updateStuck)
})

/** Lleva a tu carta: si un filtro la esconde, lo quita antes, y pasa a la página donde está */
async function goToMine() {
    if (!mineInGrid.value) {
        const me = squad.value.find((p) => p.member.playerId === myId.value)
        if (!me) return
        search.value = ""
        if (positions.value.length && !positions.value.some((pos) => me.positions.includes(pos))) positions.value = []
        if (onlyRegulars.value && !isRegular(me)) onlyRegulars.value = false
        await nextTick()
    }
    // Después de los filtros (que vuelven a la página 1): la página de tu carta
    const index = shown.value.findIndex((p) => p.member.playerId === myId.value)
    if (index >= 0) page.value = Math.floor(index / SQUAD_PAGE_SIZE) + 1
    await nextTick()
    const el = document.getElementById("squad-me")
    if (!el) return
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" })
    el.querySelector("a")?.focus({ preventScroll: true })
    el.classList.remove("flash")
    void el.offsetWidth
    el.classList.add("flash")
}

// ── Panel de filtros (móvil) ──
const filtersDialog = ref<HTMLDialogElement | null>(null)

onMounted(() => {
    if (legacyDetailId) window.location.replace(routes.player(legacyDetailId))
    loadMembers()
    playerStats.load()
})

/** Podio en 5 columnas: el #1 en el centro, el #2 a su izquierda y el #3 a su derecha */
const PODIUM_CELLS = ["xl:col-start-3 xl:row-start-1 xl:-translate-y-3", "xl:col-start-2 xl:row-start-1", "xl:col-start-4 xl:row-start-1"]
const AURA = ["aura-gold", "aura-silver", "aura-bronze"]
</script>

<template>
    <!-- Todo sobre un bloque con fondo (--squad-bg: el mismo que el de las pestañas de la ficha de jugador; la barra de controles, --toolbar-bg, un tono distinto para que se separe) -->
    <div class="w-full flex flex-col gap-6 rounded-3xl bg-(--squad-bg) px-3 pb-4 lg:px-5 lg:pb-6
        [--squad-bg:color-mix(in_oklab,var(--color-base-200)_50%,var(--color-base-100))]
        dark:[--squad-bg:color-mix(in_oklab,var(--color-base-200)_50%,var(--color-base-300))]
        [--toolbar-bg:color-mix(in_oklab,var(--color-base-200)_94%,var(--color-base-content))] dark:[--toolbar-bg:color-mix(in_oklab,var(--color-base-200)_92%,var(--color-base-content))]">
        <!-- Marcador justo encima de la barra: cuando pasa bajo el menú, la barra está pegada -->
        <div ref="toolbarSentinel" aria-hidden="true" class="h-0 -mb-6"></div>
        <!-- Barra de filtros (fija al bajar). Sin pegar: parte del bloque. Pegada: lámina medio translúcida que se
             solapa sobre las cartas. En móvil: orden, buscador y "Filtros" (el resto en un panel) -->
        <div role="toolbar" aria-label="Filtrar y ordenar la plantilla"
            class="sticky top-(--nav-top) z-30 -mx-3 lg:-mx-5 px-3 lg:px-5 py-3 flex flex-wrap items-center gap-2 transition-[top,border-radius,background-color,box-shadow] duration-300"
            :class="toolbarStuck
                ? 'rounded-b-2xl bg-[color-mix(in_oklab,var(--toolbar-bg)_88%,transparent)] backdrop-blur-md shadow-lg shadow-black/25'
                : 'rounded-t-3xl bg-(--toolbar-bg)'">
            <label class="input input-sm rounded-xl flex-1 min-w-40 bg-base-100">
                <svg class="size-4 opacity-60" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" /></svg>
                <input v-model="search" type="search" placeholder="Buscar jugador o pro" aria-label="Buscar jugador" />
            </label>

            <!-- Ordenar: siempre a la vista -->
            <div class="flex items-center gap-1 order-first sm:order-none w-full sm:w-auto">
                <label class="select select-sm rounded-xl bg-base-100 border-base-content/10 flex-1 sm:flex-none sm:w-60 focus-within:border-primary">
                    <span class="label text-[0.65rem] uppercase tracking-widest font-black text-base-content/50">Ordenar por</span>
                    <span class="w-1 h-4 rounded-full bg-primary shrink-0" aria-hidden="true"></span>
                    <select v-model="sortKey" aria-label="Ordenar por" class="font-black text-primary">
                        <option v-for="o in SQUAD_SORTS" :key="o.key" :value="o.key" class="text-base-content active:bg-primary! active:text-primary-content! active:shadow-none!">{{ o.label }}</option>
                    </select>
                </label>
                <button type="button" class="btn btn-sm btn-square rounded-xl bg-base-100 border-base-content/10"
                    :aria-label="direction === 'desc' ? 'De más a menos (pulsa para invertir)' : 'De menos a más (pulsa para invertir)'"
                    :title="direction === 'desc' ? 'De más a menos' : 'De menos a más'"
                    @click="direction = direction === 'desc' ? 'asc' : 'desc'">
                    <svg class="size-4 transition-transform" :class="direction === 'asc' && '-scale-y-100'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" /></svg>
                </button>
            </div>

            <div class="hidden md:flex flex-wrap items-center gap-2">
                <!-- Chips de posición: se pueden marcar varias; sin ninguna, todas -->
                <div role="group" aria-label="Posición (puedes marcar varias)" class="flex items-center gap-1">
                    <button v-for="p in POSITIONS" :key="p.value" type="button" :aria-pressed="positions.includes(p.value)"
                        class="pos-chip btn btn-sm rounded-full font-bold gap-1" :class="positions.includes(p.value) ? 'btn-primary' : 'btn-ghost bg-base-100/60'"
                        @click="togglePosition(p.value)">
                        <svg class="pos-check size-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                        {{ p.label }}
                    </button>
                    <button v-if="positions.length" type="button" class="btn btn-xs btn-ghost rounded-full text-base-content/60" @click="positions = []">Quitar</button>
                </div>
                <OptionToggle v-model="scope" :options="MATCH_SCOPE_OPTIONS" size="sm" />
                <!-- Tooltip con el criterio (también con el foco del teclado); el lector de pantalla lo lee por aria-describedby -->
                <label class="tooltip tooltip-bottom flex items-center gap-2 text-sm font-semibold px-2 cursor-pointer"
                    :data-tip="`Jugadores con ${REGULAR_MIN_GAMES} partidos o más. El resto aparece abajo, en «Han pasado por el club»`">
                    <input v-model="onlyRegulars" type="checkbox" class="toggle toggle-sm toggle-primary" aria-describedby="regulars-tip" />
                    Solo habituales
                    <svg class="size-3.5 opacity-50" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
                    <span id="regulars-tip" class="sr-only">Jugadores con {{ REGULAR_MIN_GAMES }} partidos o más</span>
                </label>
            </div>
            <button type="button" class="md:hidden btn btn-sm rounded-xl bg-base-100 border-base-content/10 gap-1.5" @click="filtersDialog?.showModal()">
                <svg class="size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" d="M3 6h18M6 12h12M10 18h4" /></svg>
                Filtros <span v-if="activeFilters" class="badge badge-xs badge-primary">{{ activeFilters }}</span>
            </button>
        </div>

        <!-- Recuento -->
        <p v-if="!loading && !hasError" class="-mt-2 text-sm text-base-content/60" role="status">
            <template v-if="onlyRegulars"><strong class="text-base-content">{{ shown.length }}</strong> habituales<span v-if="casuals.length"> · {{ casuals.length }} con menos de {{ REGULAR_MIN_GAMES }} partidos</span></template>
            <template v-else><strong class="text-base-content">{{ shown.length }}</strong> jugadores · {{ regularsTotal }} habituales</template>
        </p>

        <!-- Cargando: el mismo hueco que las cartas -->
        <ul v-if="loading" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-5" aria-busy="true">
            <li v-for="n in 10" :key="n" class="skeleton aspect-[3/4] rounded-2xl"></li>
        </ul>

        <EmptyState v-else-if="hasError" illustration="/illustrations/serverdown.svg" title="La plantilla no está disponible ahora mismo" text="Vuelve a intentarlo en unos minutos." />

        <template v-else>
            <!-- TransitionGroup: al reordenar o filtrar, las cartas se deslizan a su nuevo sitio -->
            <div ref="gridTop" aria-hidden="true" class="-mb-6"></div>
            <!-- :duration="0": las que salen se desmontan al momento. Si no, Vue espera a que acabe su
                 animación, y la del halo del podio es infinita: se quedaban montadas (con su Atropos) -->
            <TransitionGroup v-if="shown.length" tag="ul" name="squad" :duration="0" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-5" :aria-label="`Jugadores, ordenados por ${sort.label.toLowerCase()}${paged.pages > 1 ? `, página ${paged.page} de ${paged.pages}` : ''}`">
                <!-- Huecos a los lados del podio (solo con 5 columnas): así el #4 y siguientes empiezan en la fila 2 -->
                <template v-if="podium && paged.items.length > 3">
                    <li key="spacer-l" aria-hidden="true" class="hidden xl:block xl:col-start-1 xl:row-start-1"></li>
                    <li key="spacer-r" aria-hidden="true" class="hidden xl:block xl:col-start-5 xl:row-start-1"></li>
                </template>
                <li v-for="(p, i) in paged.items" :key="p.member.playerId" :id="p.member.playerId === myId ? 'squad-me' : undefined"
                    class="squad-cell"
                    :class="podium && i < 3 ? ['aura aura-sm', AURA[i], paged.items.length > 3 ? PODIUM_CELLS[i] : ''] : ''"
                    :style="`--i: ${Math.min(i, 14)};${podium && i < 3 ? ' --aura-radius: 1rem' : ''}`">
                    <SquadCard :player="p" :rank="paged.offset + i + 1" :sort="sort" :medal="podium && i < 3 ? (i as 0 | 1 | 2) : null" :mine="p.member.playerId === myId" />
                </li>
            </TransitionGroup>

            <EmptyState v-else illustration="/illustrations/noresults.svg" title="No hay nadie con esos filtros" text="Revisa el nombre o quita alguna posición.">
                <button type="button" class="btn btn-sm btn-primary" @click="search = ''; positions = []; onlyRegulars = false">Quitar los filtros</button>
            </EmptyState>

            <!-- Páginas (el paginador genérico; no pinta nada con una sola) -->
            <Paginator :items-count="shown.length" :items-per-page="SQUAD_PAGE_SIZE" :current-page="paged.page" label="Páginas de la plantilla" @pagechange="goToPage" />

            <!-- Los de pocos partidos, plegados -->
            <details v-if="casuals.length" class="group rounded-2xl bg-base-200/60 ring-1 ring-base-content/5">
                <summary class="cursor-pointer list-none flex items-center justify-between gap-3 p-4">
                    <span>
                        <span class="font-black">Han pasado por el club</span>
                        <span class="text-sm text-base-content/60"> · {{ casuals.length }} {{ casuals.length === 1 ? "jugador" : "jugadores" }} con menos de {{ REGULAR_MIN_GAMES }} partidos</span>
                    </span>
                    <svg class="size-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" d="m6 9 6 6 6-6" /></svg>
                </summary>
                <ul class="flex flex-wrap gap-2 px-4 pb-4">
                    <li v-for="p in casuals" :key="p.member.playerId">
                        <a :href="routes.player(p.member.playerId)" class="badge badge-lg bg-base-100 border-base-content/10 font-semibold hover:border-primary/60 hover:text-primary transition-colors"
                            :class="p.member.playerId === myId && 'border-primary text-primary'">
                            {{ p.member.playerName }} <span class="opacity-50 ml-1 tabular-nums">{{ p.stats.gamesPlayed }}</span>
                        </a>
                    </li>
                </ul>
            </details>
        </template>

        <!-- Ir a mi jugador: burbuja con tu foto cuando tu carta no se ve; la flecha indica hacia dónde está -->
        <button v-if="mineAnywhere && !loading" type="button" aria-label="Ir a mi jugador"
            class="go-to-me fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center rounded-full bg-base-200/90 backdrop-blur-md shadow-lg ring-1 ring-base-content/10 p-1 cursor-pointer"
            :data-visible="String(!mineVisible)" :data-dir="mineInGrid && mineAbove ? 'up' : 'down'" @click="goToMine">
            <span class="relative shrink-0">
                <!-- Recortada a la cabeza: la foto es de cuerpo entero, así que se amplía desde arriba -->
                <span class="go-face block size-10 rounded-full overflow-hidden bg-base-300 ring-2 ring-primary">
                    <img :src="playerImage(myMember)" alt="" class="size-full object-cover object-top scale-[2.6] origin-[50%_6%]" />
                </span>
                <span class="go-arrow absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-primary text-primary-content grid place-items-center ring-2 ring-base-200">
                    <svg class="size-2.5" fill="none" stroke="currentColor" stroke-width="3.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" /></svg>
                </span>
            </span>
            <span class="go-label text-sm font-bold whitespace-nowrap overflow-hidden" aria-hidden="true">Mi jugador</span>
        </button>

        <!-- Panel de filtros en móvil -->
        <dialog ref="filtersDialog" class="modal modal-bottom" aria-labelledby="squad-filters-title">
            <div class="modal-box flex flex-col gap-5">
                <h2 id="squad-filters-title" class="font-black text-lg">Filtros</h2>
                <div>
                    <p class="text-xs uppercase font-black tracking-widest text-base-content/50 mb-2">Posición</p>
                    <div role="group" aria-label="Posición (puedes marcar varias)" class="flex flex-wrap gap-2">
                        <button v-for="p in POSITIONS" :key="p.value" type="button" :aria-pressed="positions.includes(p.value)"
                            class="pos-chip btn rounded-full font-bold gap-1" :class="positions.includes(p.value) ? 'btn-primary' : 'btn-ghost bg-base-200'"
                            @click="togglePosition(p.value)">
                            <svg class="pos-check size-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                            {{ p.label }}
                        </button>
                    </div>
                    <p class="text-xs text-base-content/50 mt-1.5">Puedes marcar varias; sin ninguna salen todas.</p>
                </div>
                <div>
                    <p class="text-xs uppercase font-black tracking-widest text-base-content/50 mb-2">Partidos</p>
                    <OptionToggle v-model="scope" :options="MATCH_SCOPE_OPTIONS" size="md" block />
                </div>
                <label class="flex items-center justify-between gap-3 font-semibold cursor-pointer">
                    Solo habituales ({{ REGULAR_MIN_GAMES }}+ partidos)
                    <input v-model="onlyRegulars" type="checkbox" class="toggle toggle-primary" />
                </label>
                <form method="dialog" class="modal-action mt-0">
                    <button class="btn btn-primary w-full rounded-xl">Ver {{ shown.length }} {{ shown.length === 1 ? "jugador" : "jugadores" }}</button>
                </form>
            </div>
            <form method="dialog" class="modal-backdrop"><button aria-label="Cerrar">cerrar</button></form>
        </dialog>
    </div>
</template>

<style scoped>
/* Halos de plata y bronce (el oro es aura-gold de daisyUI), como aura-brand en los logros */
:deep(.aura-silver) {
    background-image: conic-gradient(from var(--aura-angle), transparent 200deg, #e5e7eb 290deg, #94a3b8);
}
:deep(.aura-bronze) {
    background-image: conic-gradient(from var(--aura-angle), transparent 200deg, #fdba74 290deg, #b45309);
}

/* Cartas: entran en cascada (al cargar y al aparecer por un filtro) y se deslizan al reordenar.
   Las que salen desaparecen al momento: en un grid, dejarlas animando descoloca a las demás */
@media (prefers-reduced-motion: no-preference) {
    /* En el hijo, no en la celda: la celda del podio es un .aura y su animación es la que gira el halo */
    .squad-cell > * {
        animation: squad-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        animation-delay: calc(var(--i, 0) * 35ms);
    }
    .squad-move {
        transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
    }
}
.squad-leave-active { display: none; }
@keyframes squad-in {
    from { opacity: 0; translate: 0 1.25rem; scale: 0.96; }
}

/* Chips de posición: la marca ✓ solo en las elegidas, entrando con un pequeño salto */
.pos-chip .pos-check {
    display: none;
}
.pos-chip[aria-pressed="true"] .pos-check {
    display: block;
}
@media (prefers-reduced-motion: no-preference) {
    .pos-chip[aria-pressed="true"] .pos-check { animation: pos-check-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
}
@keyframes pos-check-in {
    from { scale: 0; }
}

/* Tu jugador: al llegar con la burbuja, un destello del color del club */
@media (prefers-reduced-motion: no-preference) {
    #squad-me.flash :deep(.squad-card) {
        animation: mine-flash 1.4s ease-out;
    }
}
@keyframes mine-flash {
    0%, 100% { box-shadow: 0 0 0 0 transparent; }
    25% { box-shadow: 0 0 0 6px var(--color-primary), 0 0 40px 8px color-mix(in oklab, var(--color-primary) 60%, transparent); }
}

/* Burbuja "Mi jugador": entra desde abajo con un pequeño rebote; el texto se despliega con el ratón o el foco */
.go-to-me {
    opacity: 0;
    translate: 0 1.5rem;
    scale: 0.6;
    pointer-events: none;
    transition: opacity 0.25s, translate 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), scale 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
}
.go-to-me[data-visible="true"] {
    opacity: 1;
    translate: 0 0;
    scale: 1;
    pointer-events: auto;
}
.go-to-me:hover, .go-to-me:focus-visible {
    box-shadow: 0 10px 30px -8px color-mix(in oklab, var(--color-primary) 70%, transparent);
}
.go-arrow { transition: rotate 0.3s; }
.go-to-me[data-dir="up"] .go-arrow { rotate: 180deg; }
.go-label {
    max-width: 0;
    opacity: 0;
    transition: max-width 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s, padding 0.3s;
}
.go-to-me:hover .go-label, .go-to-me:focus-visible .go-label {
    max-width: 8rem;
    opacity: 1;
    padding: 0 0.75rem 0 0.6rem;
}
@media (prefers-reduced-motion: no-preference) {
    .go-to-me[data-visible="true"] .go-face { animation: go-ping 1.2s ease-out 0.3s; }
}
@keyframes go-ping {
    0% { box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-primary) 70%, transparent); }
    100% { box-shadow: 0 0 0 14px transparent; }
}
@media (prefers-reduced-motion: reduce) {
    .go-to-me, .go-arrow, .go-label { transition: none; }
}
</style>
