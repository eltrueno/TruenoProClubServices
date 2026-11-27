<script setup lang="ts">
/**
 * Detalle de un partido (/partido?id=<matchId>&player=<playerId>&tab=<resumen|equipo|jugadores>).
 * Mismo esquema que la ficha de jugador: cabecera en tarjeta (marcador y KPIs), barra de pestañas
 * pegada (al bajar se compacta y enseña el marcador) y el contenido de la pestaña debajo.
 * El contexto (rachas, hitos, historial, forma) sale de la lista de todos los partidos, que se carga
 * aparte: el partido se enseña en cuanto llega y el contexto aparece después.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useMatches } from "@/composables/useMatches"
import { useMembers } from "@/composables/useMembers"
import { useAuth } from "@/composables/useAuth"
import type ClubMatchEntity from "@/model/match/ClubMatchEntity"
import AverageStatsEntity from "@/model/AverageStatsEntity"
import { translateMatchResult, translateMatchType } from "@/i18n/translations"
import { getQueryParam, routes, setQueryParams } from "@/lib/query"
import { ApiError, tpcsApi } from "@/lib/api"
import { neighbours } from "@/lib/matchInsights"
import { matchPhrase } from "@/lib/matchPhrases"
import { CLUB, OTHER_CLUBS } from "@/config/club"
import AnimatedNumber from "@/components/ui/AnimatedNumber.vue"
import MvpIcon from "@/components/ui/MvpIcon.vue"
import { KPI_ICONS, type KpiIcon } from "@/lib/kpiIcons"
import MatchSummary from "./MatchSummary.vue"
import MatchTeam from "./MatchTeam.vue"
import MatchPlayers from "./MatchPlayers.vue"
import MatchDetailSkeleton from "./MatchDetailSkeleton.vue"
import { navTop, navTopFor } from "@/lib/navOffset"
import EmptyState from "@/components/ui/EmptyState.vue"

const matchId = Number(getQueryParam("id"))
const initialPlayer = getQueryParam("player")

const matches = useMatches()
const matchResource = matches.match(matchId)
const match = computed(() => matchResource.data.value as ClubMatchEntity | undefined)
const loading = computed(() => !matchResource.loaded.value && !matchResource.hasError.value)
const hasError = computed(() => matchResource.hasError.value || (matchResource.loaded.value && !match.value))

const { load: loadMembers } = useMembers()

// Todos los partidos: para el contexto (se enseña cuando llega)
const history = computed(() => (matches.loaded.value ? matches.matches.value : null))
const nav = computed(() => (history.value && match.value ? neighbours(history.value, match.value.matchId) : { prev: null, next: null }))

// Medias por posición (para comparar en la ficha del jugador)
const averages = ref<AverageStatsEntity[]>([])

onMounted(() => {
    matchResource.load()
    loadMembers()
    matches.load()
    tpcsApi.averages.getAll().then((list) => { averages.value = list.map((a) => new AverageStatsEntity(a)) }).catch(() => {})
})

// ── Cabecera ──
const us = computed(() => match.value?.ourClub)
const them = computed(() => match.value?.opponentClub)
/** Escudos solo en el derbi (el rival es otro club de la comunidad): de los demás no tenemos escudo */
const rivalConfig = computed(() => {
    const name = them.value?.name.trim().toLowerCase()
    return OTHER_CLUBS.find((c) => c.name.toLowerCase() === name)
})
/** Escudo monocolor (United): en blanco sobre el color del club, como en la navbar */
const crestBg = (club: { logoMono?: boolean; colors: { primary: string } }) => (club.logoMono ? club.colors.primary : "#fff")

const RESULT_TONE: Record<string, string> = { win: "badge-success", tie: "badge-neutral", loose: "badge-error" }
const dateText = computed(() => match.value
    ? new Date(match.value.timestamp * 1000).toLocaleString("es-ES", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
    : "")
const shortDate = computed(() => match.value ? new Date(match.value.timestamp * 1000).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "")
const teamRating = (players: { rating: number }[] = []) => {
    const list = players.filter((p) => p.rating > 0)
    return list.length ? list.reduce((s, p) => s + p.rating, 0) / list.length : 0
}
const fmt = (n: number, d = 0) => (Number.isFinite(n) ? n : 0).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d })

/** Iconos (Heroicons 2, contorno) de las notas del partido; los de los KPIs, rellenos, en lib/kpiIcons */
const ICONS = {
    target: "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M12 2.25v2.25m0 15v2.25M2.25 12h2.25m15 0h2.25M18.364 5.636l-1.59 1.59M7.227 16.773l-1.591 1.591m0-12.728 1.59 1.59m9.546 9.546 1.591 1.591 M19.5 12a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
    ban: "M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636",
    clock: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    unplug: "M13.181 8.68a4.503 4.503 0 0 1 1.903 6.405m-9.768-2.782L3.56 14.06a4.5 4.5 0 0 0 6.364 6.365l3.129-3.129m5.614-5.615 1.757-1.757a4.5 4.5 0 0 0-6.364-6.365l-4.5 4.5c-.258.26-.479.541-.661.84m1.903 6.405a4.495 4.495 0 0 1-1.242-.88 4.483 4.483 0 0 1-1.062-1.683m6.587 2.345 5.907 5.907m-5.907-5.907L8.898 8.898M2.991 2.99 8.898 8.9",
}

// Lo que hace especial al partido, explicado (nulo, penaltis, desconexión)
type Note = { tone: "neutral" | "good" | "bad"; icon: string; title: string; text: string }
const NOTE_TONE: Record<Note["tone"], string> = {
    neutral: "bg-base-content/5 ring-base-content/15 text-base-content",
    good: "bg-success/10 ring-success/30 text-success",
    bad: "bg-error/10 ring-error/30 text-error",
}
/** Hubo prórroga: alguien pasó de ~117 min (el mismo umbral que usa el worker, EXTRA_TIME_SECONDS = 7000 s) */
/** La frase del partido (lo más llamativo; siempre la misma para cada partido) */
const phrase = computed(() => {
    const m = match.value, a = us.value, b = them.value
    if (!m || !a || !b) return ""
    return matchPhrase({
        matchId: m.matchId, result: m.result, goalsFor: a.matchStats.goals, goalsAgainst: b.matchStats.goals,
        shotsFor: a.matchStats.shots, shotsAgainst: b.matchStats.shots, passesFor: a.matchStats.passesMade, passesAgainst: b.matchStats.passesMade,
        redsFor: a.matchStats.redCards, redsAgainst: b.matchStats.redCards,
        penalties: m.winnerByPen ? { for: a.penaltiesScore ?? 0, against: b.penaltiesScore ?? 0 } : null,
        dnf: !!m.winnerByDnf, extraTime: extraTime.value, voided: !!m.voided, rivalName: b.name, derby: !!rivalConfig.value,
    })
})
const extraTime = computed(() => !!match.value && [...match.value.ourClub.players, ...match.value.opponentClub.players].some((p) => p.minutesPlayed * 60 >= 7000))
const notes = computed<Note[]>(() => {
    const m = match.value
    if (!m || !us.value || !them.value) return []
    const out: Note[] = []
    const tone: Note["tone"] = m.result === "win" ? "good" : m.result === "loose" ? "bad" : "neutral"
    if (m.voided) out.push({
        tone: "neutral", icon: ICONS.ban, title: "Partido nulo",
        text: `Se puede ver, pero no cuenta para estadísticas, logros, medias, TOTW ni rachas. ${m.voidedBy === "admin" ? "Lo ha marcado un admin." : "Nadie llegó a jugar 15 minutos."}`,
    })
    if (m.winnerByPen) {
        const tied = us.value.matchStats.goals === them.value.matchStats.goals
        const shootout = `${us.value.penaltiesScore ?? "?"}–${them.value.penaltiesScore ?? "?"}`
        out.push({
            tone, icon: ICONS.target,
            title: m.result === "win" ? "Ganado en los penaltis" : m.result === "loose" ? "Perdido en los penaltis" : "Se fue a penaltis",
            text: tied ? `Empate a ${us.value.matchStats.goals} tras la prórroga; la tanda acabó ${shootout}.` : `La tanda acabó ${shootout}.`,
        })
    }
    if (extraTime.value && !m.winnerByPen && !m.winnerByDnf) out.push({
        tone, icon: ICONS.clock, title: "Hubo prórroga",
        text: m.result === "tie" ? "Se jugaron los 120 minutos y acabó en empate, sin tanda de penaltis." : "Se jugaron los 120 minutos: se decidió en la prórroga, sin llegar a penaltis.",
    })
    if (m.winnerByDnf) out.push({
        tone, icon: ICONS.unplug, title: m.result === "win" ? "El rival se desconectó" : "Nos desconectamos",
        text: "Cuando alguien abandona, EA da el partido al equipo que se queda (normalmente 3–0), así que el marcador puede no ser el que había en el campo.",
    })
    return out
})

type Kpi = { label: string; value?: number; text?: string; decimals?: number; suffix?: string; sub?: string; icon: string }
// KPIs: tres grandes y una fila más discreta (como en la ficha de jugador)
const kpis = computed<{ main: Kpi[]; secondary: Kpi[] }>(() => {
    if (!us.value || !them.value) return { main: [], secondary: [] }
    const ourSide = us.value, rival = them.value
    const a = ourSide.matchStats, b = rival.matchStats
    const possession = a.passesMade + b.passesMade ? Math.round((a.passesMade / (a.passesMade + b.passesMade)) * 100) : 50
    const mvp = [...ourSide.players, ...rival.players].find((p) => p.manOfTheMatch)
    const ourMvp = !!mvp && ourSide.players.includes(mvp)
    const saves = (side: typeof ourSide) => side.players.reduce((n, p) => n + (p.saves ?? 0), 0)
    return {
        main: [
            { label: "Nota del equipo", icon: "rating", value: teamRating(ourSide.players), decimals: 1, sub: `Rival: ${fmt(teamRating(rival.players), 1)}` },
            { label: "Posesión", icon: "possession", value: possession, suffix: "%", sub: "Según el reparto de pases" },
            { label: "Tiros", icon: "shots", value: a.shots, sub: `Rival: ${b.shots}` },
        ],
        secondary: [
            { label: "MVP", text: mvp?.playerName ?? "—", sub: mvp ? (ourMvp ? `Nota ${fmt(mvp.rating, 1)}` : "Del rival") : "", icon: "mvp" },
            { label: "Pases", icon: "passes", value: a.passesMade, sub: `${fmt(a.passesMade ? (a.passesSuccess / a.passesMade) * 100 : 0)}% acertados` },
            { label: "Entradas", icon: "tackles", value: a.tacklesMade, sub: `${fmt(a.tacklesMade ? (a.tackleSuccess / a.tacklesMade) * 100 : 0)}% ganadas` },
            { label: "Paradas", icon: "saves", value: saves(ourSide), sub: `Rival: ${saves(rival)}` },
        ],
    }
})

// ── Pestañas (como en la ficha de jugador) ──
const TABS = [
    { key: "resumen", label: "Resumen", icon: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" },
    { key: "equipo", label: "Equipo", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" },
    { key: "jugadores", label: "Jugadores", icon: "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" },
] as const
type TabKey = typeof TABS[number]["key"]
const tabFromUrl = getQueryParam("tab")
const activeTab = ref<TabKey>(TABS.some((t) => t.key === tabFromUrl) ? (tabFromUrl as TabKey) : initialPlayer ? "jugadores" : "resumen")
watch(activeTab, (t) => setQueryParams({ tab: t === "resumen" ? null : t }))

const tabSentinel = ref<HTMLElement | null>(null)
const tabsStuck = ref(false)
let navH = 64
let fullBarH = 0
const measureNav = () => {
    navH = document.querySelector<HTMLElement>("nav.navbar")?.offsetHeight ?? 64
    document.documentElement.style.setProperty("--nav-h", `${navH}px`)
}
const smooth = (): ScrollBehavior => (matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth")
const updateStuck = () => {
    const el = tabSentinel.value
    tabsStuck.value = !!el && el.getBoundingClientRect().top < navTop() - 0.5
}
const onResize = () => { measureNav(); updateStuck(); fullBarH = 0 }
watch(tabSentinel, (el) => { if (el) { measureNav(); updateStuck() } })

// Al pegarse, la barra cambia de alto (pestañas compactas + marcador). Para que el contenido de debajo no
// pegue un salto, se compensa con margen inferior la diferencia con su alto normal, en cada frame del cambio
const tabsBar = ref<HTMLElement | null>(null)
const barComp = ref(0)
let barRO: ResizeObserver | null = null
watch(tabsBar, (el) => {
    barRO?.disconnect()
    if (!el) return
    // Alto normal = el mayor visto sin pegar (al despegarse crece poco a poco hasta él)
    barRO = new ResizeObserver(() => {
        const h = el.offsetHeight
        if (!tabsStuck.value) fullBarH = Math.max(fullBarH, h)
        barComp.value = Math.max(0, fullBarH - h)
    })
    barRO.observe(el)
})
watch(tabsStuck, () => { const el = tabsBar.value; if (el) barComp.value = Math.max(0, fullBarH - el.offsetHeight) })
onBeforeUnmount(() => barRO?.disconnect())
onMounted(() => {
    addEventListener("scroll", updateStuck, { passive: true })
    addEventListener("resize", onResize, { passive: true })
})
onBeforeUnmount(() => {
    removeEventListener("scroll", updateStuck)
    removeEventListener("resize", onResize)
})
function selectTab(key: TabKey) {
    const wasStuck = tabsStuck.value
    activeTab.value = key
    if (!wasStuck || !tabSentinel.value) return
    nextTick(() => {
        // 1px más abajo: sigue pegada (compacta) y no da el salto a la grande
        const y = tabSentinel.value!.getBoundingClientRect().top + scrollY
        const top = y - navTopFor(y - navH) + 1
        scrollTo({ top, behavior: smooth() })
    })
}
const tabBody = ref<HTMLElement | null>(null)
const lockTabBody = () => { if (tabBody.value) tabBody.value.style.minHeight = `${tabBody.value.offsetHeight}px` }
const unlockTabBody = () => { if (tabBody.value) tabBody.value.style.minHeight = "" }
const scrollToTop = () => scrollTo({ top: 0, behavior: smooth() })

// ── Admin: marcar / desmarcar como nulo ──
const { isAdmin, isLoggedIn, myMember, loadMyMember } = useAuth()
watch(isLoggedIn, (logged) => { if (logged) loadMyMember() }, { immediate: true })
/** Tu jugador (con sesión y jugador vinculado). En desarrollo, ?yo=<playerId> lo simula para probar */
const devMe = import.meta.env.DEV ? getQueryParam("yo") : null
const myId = computed(() => devMe ?? myMember.value?.playerId ?? null)
/** Jugador que abre la pestaña Jugadores (el de ?player= o el que pide "Ver tu partido") */
const focusPlayer = ref<string | null>(initialPlayer)
function seePlayer(playerId: string) {
    focusPlayer.value = playerId
    selectTab("jugadores")
    nextTick(() => tabSentinel.value?.scrollIntoView({ behavior: smooth(), block: "start" }))
}
const voidBusy = ref(false)
const voidMessage = ref<{ ok: boolean; text: string } | null>(null)
async function setVoided(voided: boolean | null) {
    if (!match.value) return
    voidBusy.value = true
    voidMessage.value = null
    try {
        const { match: updated, recalculation } = await tpcsApi.admin.setMatchVoided(match.value.matchId, voided)
        Object.assign(match.value, { voided: updated.voided, voidedBy: updated.voidedBy })
        voidMessage.value = { ok: true, text: recalculation === "queued" ? "Guardado. Las estadísticas se están recalculando." : "Guardado, pero no se han podido recalcular las estadísticas ahora." }
    } catch (e) {
        const code = e instanceof ApiError ? e.code : "ERROR"
        voidMessage.value = { ok: false, text: `No se ha podido guardar (${code}).` }
    } finally {
        voidBusy.value = false
    }
}
</script>

<template>
    <MatchDetailSkeleton v-if="loading" />

    <div v-else-if="hasError || !match || !us || !them">
        <nav class="breadcrumbs text-sm text-base-content/60" aria-label="Migas de pan">
            <ul>
                <li><a href="/" class="hover:text-primary">Inicio</a></li>
                <li><a href="/partidos" class="hover:text-primary">Partidos</a></li>
            </ul>
        </nav>
        <EmptyState illustration="/illustrations/bugfixingsvg.svg" title="No se ha podido cargar el partido" text="Puede que el enlace no sea de este club o que EA no responda ahora mismo.">
            <a href="/partidos" class="btn btn-primary rounded-xl">Ver todos los partidos</a>
        </EmptyState>
    </div>

    <div v-else class="w-full pb-2 [--us:var(--color-primary)] [--them:#2f6fd6] dark:[--them:#5b8def]"
        :class="rivalConfig && 'derby'" :style="rivalConfig ? { '--rival': rivalConfig.colors.primary } : undefined">
        <nav class="breadcrumbs text-sm text-base-content/60" aria-label="Migas de pan">
            <ul>
                <li><a href="/" class="hover:text-primary">Inicio</a></li>
                <li><a href="/partidos" class="hover:text-primary">Partidos</a></li>
                <li><span aria-current="page" class="text-base-content font-semibold">{{ us.name }} – {{ them.name }} · {{ shortDate }}</span></li>
            </ul>
        </nav>

        <!-- ── Cabecera: marcador y KPIs ── -->
        <section class="relative bg-base-200 rounded-2xl shadow-md">
            <div class="px-4 py-6 lg:py-10 flex flex-col gap-6">
                <!-- Tipo, fecha y anterior / siguiente -->
                <div class="flex items-center justify-between gap-2">
                    <a v-if="nav.prev" :href="routes.match(nav.prev.matchId)" class="btn btn-sm btn-ghost rounded-xl gap-1 px-2" title="Partido anterior">
                        <svg class="size-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m15 6-6 6 6 6" /></svg>
                        <span class="hidden sm:inline">Anterior</span>
                    </a>
                    <span v-else class="w-10"></span>
                    <p class="text-center text-xs sm:text-sm text-base-content/60">
                        <span class="badge badge-sm badge-primary font-bold uppercase mr-1.5">{{ translateMatchType(match.matchType) }}</span>
                        <span class="capitalize">{{ dateText }}</span>
                    </p>
                    <a v-if="nav.next" :href="routes.match(nav.next.matchId)" class="btn btn-sm btn-ghost rounded-xl gap-1 px-2" title="Partido siguiente">
                        <span class="hidden sm:inline">Siguiente</span>
                        <svg class="size-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m9 6 6 6-6 6" /></svg>
                    </a>
                    <span v-else class="w-10"></span>
                </div>

                <!-- Marcador -->
                <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-8">
                    <div class="flex flex-col sm:flex-row-reverse items-center gap-2 sm:gap-4 min-w-0 text-center sm:text-right">
                        <span v-if="rivalConfig" class="crest" :style="{ background: crestBg(CLUB) }">
                            <span v-if="CLUB.logoMono" class="crest-mask" :style="{ '--crest': `url('${CLUB.logo}')` }" role="img" :aria-label="`Escudo de ${CLUB.name}`"></span>
                            <img v-else :src="CLUB.logo" :alt="`Escudo de ${CLUB.name}`" />
                        </span>
                        <h1 class="text-lg sm:text-3xl font-black tracking-tight leading-tight break-words min-w-0">{{ us.name }}</h1>
                    </div>
                    <div class="flex flex-col items-center gap-2">
                        <span class="badge font-black uppercase tracking-widest" :class="match.voided ? 'badge-ghost' : RESULT_TONE[match.result]">
                            {{ match.voided ? "Nulo" : translateMatchResult(match.result) }}
                        </span>
                        <!-- Nulo: el marcador apagado y un sello encima -->
                        <div class="relative">
                            <p class="text-5xl sm:text-7xl font-black tabular-nums tracking-tighter leading-none transition-opacity" :class="match.voided && 'opacity-30'"
                                :aria-label="`${us.matchStats.goals} a ${them.matchStats.goals}${match.voided ? ' (nulo)' : ''}`">
                                {{ us.matchStats.goals }}<span class="text-base-content/25 mx-1 sm:mx-3">–</span>{{ them.matchStats.goals }}
                            </p>
                            <span v-if="match.voided" class="void-stamp" aria-hidden="true">Nulo</span>
                        </div>
                        <!-- Penaltis: la tanda como un segundo marcador, más pequeño -->
                        <div v-if="match.winnerByPen" class="flex items-center gap-2 rounded-full bg-base-content/8 pl-2 pr-3 py-1">
                            <svg class="size-4 text-base-content/60" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" :d="ICONS.target" /></svg>
                            <span class="uppercase text-[0.65rem] font-black tracking-widest text-base-content/60">Penaltis</span>
                            <b class="tabular-nums text-lg leading-none">{{ us.penaltiesScore ?? "?" }}–{{ them.penaltiesScore ?? "?" }}</b>
                        </div>
                        <!-- Prórroga sin penaltis -->
                        <div v-else-if="extraTime && !match.winnerByDnf" class="flex items-center gap-1.5 rounded-full bg-base-content/8 pl-2 pr-3 py-1">
                            <svg class="size-4 text-base-content/60" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" :d="ICONS.clock" /></svg>
                            <span class="uppercase text-[0.65rem] font-black tracking-widest text-base-content/60">Prórroga</span>
                        </div>
                    </div>
                    <div class="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 min-w-0 text-center sm:text-left">
                        <span v-if="rivalConfig" class="crest" :style="{ background: crestBg(rivalConfig) }">
                            <span v-if="rivalConfig.logoMono" class="crest-mask" :style="{ '--crest': `url('${rivalConfig.logo}')` }" role="img" :aria-label="`Escudo de ${rivalConfig.name}`"></span>
                            <img v-else :src="rivalConfig.logo" :alt="`Escudo de ${rivalConfig.name}`" />
                        </span>
                        <p class="text-lg sm:text-3xl font-black tracking-tight leading-tight break-words min-w-0 text-base-content/80">{{ them.name }}</p>
                    </div>
                </div>

                <!-- Lo que hace especial al partido (nulo, penaltis, desconexión), explicado -->
                <!-- La frase del partido -->
                <p v-if="phrase" class="match-phrase mx-auto max-w-2xl text-center text-base sm:text-xl font-black italic text-base-content/85 text-balance">
                    <span class="text-primary/70 not-italic" aria-hidden="true">“</span>{{ phrase }}<span class="text-primary/70 not-italic" aria-hidden="true">”</span>
                </p>

                <ul v-if="notes.length" class="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-2 sm:gap-3 max-w-4xl w-full mx-auto">
                    <li v-for="n in notes" :key="n.title" class="note flex items-start gap-3 rounded-2xl p-3 sm:p-4 ring-1" :class="NOTE_TONE[n.tone]">
                        <span class="grid place-items-center size-10 shrink-0 rounded-full bg-current/12">
                            <svg class="size-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" :d="n.icon" /></svg>
                        </span>
                        <span class="min-w-0">
                            <span class="block font-black">{{ n.title }}</span>
                            <span class="block text-sm text-base-content/70">{{ n.text }}</span>
                        </span>
                    </li>
                </ul>

                <!-- KPIs: planos, con un icono cada uno (sin tarjeta): los tres principales grandes -->
                <div :class="match.voided && 'opacity-60'">
                    <div class="grid grid-cols-3 divide-x divide-base-content/10 reveal-stagger">
                        <div v-for="k in kpis.main" :key="k.label" class="kpi flex flex-col items-center text-center px-2 py-1">
                            <svg class="size-7 sm:size-9 text-primary mb-1.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" v-html="KPI_ICONS[k.icon as KpiIcon]"></svg>
                            <AnimatedNumber class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-none" :value="k.value ?? 0" :decimals="k.decimals ?? 0" :suffix="k.suffix ?? ''" />
                            <span class="mt-1.5 text-base-content/60 uppercase text-[0.65rem] sm:text-xs font-black tracking-widest">{{ k.label }}</span>
                            <span class="text-[0.65rem] sm:text-xs text-base-content/45 font-medium tabular-nums">{{ k.sub }}</span>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 sm:flex sm:justify-evenly [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1 gap-y-4 mt-6 pt-5 border-t border-base-content/10 reveal-stagger">
                        <div v-for="k in kpis.secondary" :key="k.label" class="kpi flex justify-center px-2 min-w-0">
                            <!-- Contenido alineado a la izquierda pero centrado en su hueco: así la fila se ve centrada -->
                            <div class="flex items-center gap-2.5 min-w-0">
                                <MvpIcon v-if="k.icon === 'mvp'" class="size-6" />
                                <svg v-else class="size-6 shrink-0 text-base-content/45" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" v-html="KPI_ICONS[k.icon as KpiIcon]"></svg>
                                <span class="min-w-0 leading-tight">
                                    <span class="block text-base-content/50 uppercase text-[0.6rem] sm:text-[0.65rem] font-black tracking-widest">{{ k.label }}</span>
                                    <span v-if="k.text !== undefined" class="block text-sm sm:text-base font-black truncate">{{ k.text }}</span>
                                    <AnimatedNumber v-else class="block text-lg sm:text-xl font-black" :value="k.value ?? 0" />
                                    <span v-if="k.sub" class="block text-[0.65rem] text-base-content/45 font-medium tabular-nums truncate">{{ k.sub }}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Solo admins -->
                <div v-if="isAdmin" class="flex flex-wrap items-center justify-center gap-2">
                    <button type="button" class="btn btn-sm" :class="match.voided ? 'btn-outline' : 'btn-neutral'" :disabled="voidBusy" @click="setVoided(!match.voided)">
                        <span v-if="voidBusy" class="loading loading-spinner loading-xs"></span>
                        {{ match.voided ? "Quitar nulo" : "Marcar como nulo" }}
                    </button>
                    <button v-if="match.voidedBy === 'admin'" type="button" class="btn btn-sm btn-ghost" :disabled="voidBusy" @click="setVoided(null)"
                        title="Que decida el criterio automático (nadie llega a 15')">Volver al automático</button>
                    <span v-if="voidMessage" class="text-xs w-full text-center" :class="voidMessage.ok ? 'text-success' : 'text-error'">{{ voidMessage.text }}</span>
                </div>
            </div>
        </section>

        <!-- ── Pestañas + contenido (como en la ficha de jugador) ── -->
        <section class="w-full px-1 pt-8">
            <div ref="tabSentinel" class="h-px -mb-px" aria-hidden="true"></div>
            <div ref="tabsBar" class="tabs-bar sticky z-40 flex flex-col p-2 transition-[border-radius,background-color,box-shadow] duration-300
                    [--tabs-bg:color-mix(in_oklab,var(--color-base-200)_94%,var(--color-base-content))]
                    dark:[--tabs-bg:color-mix(in_oklab,var(--color-base-200)_92%,var(--color-base-content))]"
                :style="{ marginBottom: `${barComp}px` }"
                :class="tabsStuck
                    ? 'rounded-b-2xl overflow-hidden bg-[color-mix(in_oklab,var(--tabs-bg)_88%,transparent)] backdrop-blur-md shadow-lg shadow-black/25'
                    : 'rounded-t-3xl bg-(--tabs-bg)'">
                <!-- Marcador compacto, encima de las pestañas: al pegarse la barra se despliega hacia abajo y
                     queda como su primera fila (todo el ancho, separado de las pestañas por una raya) -->
                <button type="button" @click="scrollToTop" title="Volver arriba" :tabindex="tabsStuck ? 0 : -1" :aria-hidden="!tabsStuck"
                    class="mini-score group -mx-2 flex items-center justify-center gap-3 sm:gap-4 cursor-pointer border-b border-base-content/10"
                    :data-show="tabsStuck">
                    <span class="size-2 rounded-full shrink-0" :class="match.voided ? 'bg-base-content/30' : match.result === 'win' ? 'bg-success' : match.result === 'loose' ? 'bg-error' : 'bg-base-content/40'" aria-hidden="true"></span>
                    <span class="flex-1 min-w-0 truncate text-right text-xs sm:text-sm font-black group-hover:text-primary transition-colors">{{ us.name }}</span>
                    <span class="text-lg sm:text-xl font-black tabular-nums tracking-tight leading-none" :class="match.voided && 'line-through opacity-50'">{{ us.matchStats.goals }}–{{ them.matchStats.goals }}</span>
                    <span class="flex-1 min-w-0 truncate text-left text-xs sm:text-sm font-black text-base-content/70 group-hover:text-primary transition-colors">{{ them.name }}</span>
                    <span class="hidden sm:inline text-[0.6rem] uppercase font-black tracking-widest text-base-content/50">{{ match.voided ? "Nulo" : match.winnerByPen ? `Pen. ${us.penaltiesScore ?? "?"}–${them.penaltiesScore ?? "?"}` : translateMatchResult(match.result) }}</span>
                </button>

                <div class="flex justify-around gap-2">
                    <button v-for="tab in TABS" :key="tab.key" type="button" @click="selectTab(tab.key)"
                        :aria-pressed="activeTab === tab.key" :aria-label="tab.label"
                        class="flex-1 flex items-center justify-center rounded-2xl transition-all duration-300 relative overflow-hidden group border cursor-pointer"
                        :class="[
                            tabsStuck ? 'flex-row gap-2 py-2' : 'flex-col gap-1.5 py-4',
                            activeTab === tab.key
                                ? 'bg-primary text-primary-content shadow-xl z-10 border-primary' + (tabsStuck ? '' : ' scale-[1.02]')
                                : 'bg-base-100 text-base-content/70 shadow-sm border-base-content/10 hover:border-primary/40 hover:text-base-content hover:-translate-y-0.5'
                        ]">
                        <svg class="h-5 w-5 transition-transform duration-300" :class="activeTab === tab.key ? 'scale-110' : 'group-hover:scale-110 opacity-80'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon" />
                        </svg>
                        <span class="text-xs font-bold tracking-wide uppercase" :class="tabsStuck && 'hidden lg:block'">{{ tab.label }}</span>
                        <div v-if="activeTab === tab.key && !tabsStuck" class="absolute bottom-1 w-6 h-1 bg-primary-content/30 rounded-full blur-[1px]"></div>
                    </button>
                </div>
            </div>

            <div ref="tabBody" class="tab-body rounded-b-2xl bg-[color-mix(in_oklab,var(--color-base-200)_50%,var(--color-base-100))] dark:bg-[color-mix(in_oklab,var(--color-base-200)_50%,var(--color-base-300))] p-2 sm:p-3 overflow-x-clip">
                <!-- El alto se fija mientras una pestaña sale y entra la otra: si no, entre medias el contenedor
                     se queda vacío, la página encoge y el scroll pega un salto -->
                <Transition name="tab-slide" mode="out-in" @before-leave="lockTabBody" @after-enter="unlockTabBody" @enter-cancelled="unlockTabBody">
                    <MatchSummary v-if="activeTab === 'resumen'" key="resumen" :match="match" :history="history" :my-id="myId" @see="seePlayer" />
                    <MatchTeam v-else-if="activeTab === 'equipo'" key="equipo" :match="match" :my-id="myId" />
                    <MatchPlayers v-else key="jugadores" :match="match" :history="history" :averages="averages" :initial-player="focusPlayer" :my-id="myId" />
                </Transition>
            </div>
        </section>
    </div>
</template>

<style scoped>
/* Derbi: el rival va con su color, pero acentuado para no confundirse con el nuestro (los dos clubes
   son rojos): más oscuro en tema claro y más claro en el oscuro */
.derby { --them: color-mix(in oklab, var(--rival) 62%, black); }
[data-theme="dark"] .derby { --them: color-mix(in oklab, var(--rival) 60%, white); }
/* Escudos (solo en el derbi): los dos iguales y redondos */
.crest {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 4rem;
    height: 4rem;
    border-radius: 9999px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgb(0 0 0 / 0.25);
}
@media (min-width: 640px) {
    .crest { width: 6rem; height: 6rem; }
}
.crest img {
    width: 72%;
    height: 72%;
    object-fit: contain;
}
.crest-mask {
    display: block;
    width: 62%;
    height: 62%;
    background: #fff;
    -webkit-mask: var(--crest) center / contain no-repeat;
    mask: var(--crest) center / contain no-repeat;
}
/* Sello de "Nulo" sobre el marcador */
.void-stamp {
    position: absolute;
    left: 50%;
    top: 50%;
    translate: -50% -50%;
    rotate: -12deg;
    padding: 0.1em 0.6em;
    border: 3px solid currentColor;
    border-radius: 0.5rem;
    font-size: clamp(1.25rem, 4vw, 2rem);
    font-weight: 900;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: color-mix(in oklab, var(--color-base-content) 75%, transparent);
    background: color-mix(in oklab, var(--color-base-200) 15%, transparent);
}
@media (prefers-reduced-motion: no-preference) {
    .void-stamp { animation: stamp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both; }
    .match-phrase { animation: note-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both; }
    .note { animation: note-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
}
@keyframes stamp { from { opacity: 0; scale: 1.6; } }
@keyframes note-in { from { opacity: 0; translate: 0 0.5rem; } }
/* Marcador compacto de la barra pegada: se despliega hacia abajo (alto y opacidad) al pegarse */
.mini-score {
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    padding: 0 1rem;
    border-bottom-width: 0;
    translate: 0 -0.5rem;
    pointer-events: none;
    transition: max-height 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s, translate 0.4s cubic-bezier(0.22, 1, 0.36, 1), padding 0.4s cubic-bezier(0.22, 1, 0.36, 1), margin 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.mini-score[data-show="true"] {
    max-height: 3rem;
    opacity: 1;
    padding: 0.5rem 1rem;
    margin-top: -0.5rem;
    margin-bottom: 0.5rem;
    border-bottom-width: 1px;
    translate: 0 0;
    pointer-events: auto;
}
@media (prefers-reduced-motion: reduce) {
    .mini-score { transition: none; }
}
/* Justo bajo el menú de arriba, que también es sticky (su alto lo pone el script en --nav-h) */
.tabs-bar {
    top: var(--nav-top, 4rem);
    /* El menú se esconde al bajar en móvil (--nav-top pasa a 0): la barra sube con él */
    transition: top 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
</style>
