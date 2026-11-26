<script setup lang="ts">
/**
 * Partidos de los clubes (los últimos de cada uno) para marcarlos como nulos a mano, quitarles el
 * nulo o devolverlos al criterio automático. "Para revisar" junta los que suelen necesitar una
 * mirada: desconexiones, penaltis, partidos cortos y nulos automáticos.
 *
 * Al cambiar un nulo, el api avisa al worker de ese club para que recalcule stats, logros y medias.
 */
import { computed, onMounted, ref, watch } from "vue"
import { FULL_TIME_MIN_SECONDS } from "@/lib/matchConstants"
import { isShortMatch, maxSecondsPlayed, type IMatch } from "@trueno-proclub-services/shared"
import { ApiError, clubApi } from "@/lib/api"
import { CLUBS, type ClubLink } from "@/config/site"
import { toast } from "@/lib/toast"
import ClubCrest from "./ClubCrest.vue"

const props = defineProps<{ clubFilter: "all" | ClubLink["id"] }>()

type Row = { club: ClubLink; match: IMatch }
const rows = ref<Row[]>([])
const loading = ref(true)
const failed = ref<ClubLink[]>([])
const busy = ref<Record<string, boolean>>({})

const LIMIT = 150
async function load() {
    loading.value = true
    failed.value = []
    const perClub = await Promise.all(CLUBS.map((c) => clubApi(c).latestMatches(LIMIT).then((m) => ({ c, m }), () => ({ c, m: null }))))
    failed.value = perClub.filter((x) => !x.m).map((x) => x.c)
    rows.value = perClub.flatMap(({ c, m }) => (m ?? []).map((match) => ({ club: c, match })))
        .sort((a, b) => b.match.timestamp - a.match.timestamp)
    loading.value = false
}
onMounted(load)

// ── Lado del club (EA guarda local / visitante; el nuestro es el que marca localTeam) ──
const ours = (m: IMatch) => (m.localTeam === false ? m.awayClub : m.localClub)
const theirs = (m: IMatch) => (m.localTeam === false ? m.localClub : m.awayClub)

/** Por qué conviene mirarlo (vacío = nada raro) */
function flags(m: IMatch): { label: string; tone: string; title: string }[] {
    const out: { label: string; tone: string; title: string }[] = []
    if (m.voided) out.push(m.voidedBy === "admin"
        ? { label: "Nulo (admin)", tone: "badge-neutral", title: "Lo marcó un admin" }
        : { label: "Nulo (auto)", tone: "badge-ghost", title: "Nadie llegó a 15 minutos" })
    if (m.winnerByDnf) out.push({ label: "Desconexión", tone: "badge-warning", title: "Alguien se desconectó: EA da el 3-0 al que se queda" })
    if (m.winnerByPen) out.push({ label: "Penaltis", tone: "badge-info", title: `Tanda ${ours(m).penaltiesScore ?? "?"}–${theirs(m).penaltiesScore ?? "?"}` })
    const max = maxSecondsPlayed(m)
    if (!m.voided && !isShortMatch(m) && max < FULL_TIME_MIN_SECONDS && !m.winnerByDnf) out.push({ label: "Corto", tone: "badge-warning", title: `Nadie pasó de ${Math.round(max / 60)} min` })
    return out
}

type Filter = "all" | "review" | "voided"
const filter = ref<Filter>("review")
const FILTERS: { id: Filter; label: string }[] = [
    { id: "review", label: "Para revisar" },
    { id: "voided", label: "Nulos" },
    { id: "all", label: "Todos" },
]
const inClub = (r: Row) => props.clubFilter === "all" || r.club.id === props.clubFilter
const matchesFilter = (r: Row, f: Filter) => f === "all" || (f === "voided" ? !!r.match.voided : flags(r.match).length > 0)
const count = (f: Filter) => rows.value.filter((r) => inClub(r) && matchesFilter(r, f)).length
const visible = computed(() => rows.value.filter((r) => inClub(r) && matchesFilter(r, filter.value)))

// Paginación sencilla: los partidos son muchos
const PAGE = 30
const shown = ref(PAGE)
watch([filter, () => props.clubFilter], () => { shown.value = PAGE })

async function setVoided(r: Row, voided: boolean | null) {
    const key = `${r.club.id}-${r.match.matchId}`
    busy.value[key] = true
    try {
        const { match, recalculation } = await clubApi(r.club).admin.setMatchVoided(r.match.matchId, voided)
        Object.assign(r.match, { voided: match.voided, voidedBy: match.voidedBy })
        const what = voided === null ? "Vuelve al criterio automático" : voided ? "Marcado como nulo" : "Ya no es nulo"
        toast(recalculation === "queued" ? `${what}. Recalculando stats…` : `${what}, pero el worker no se ha enterado (RabbitMQ): recalcula desde Sistema`, recalculation === "queued" ? "success" : "error")
    } catch (e) {
        toast(`No se ha podido cambiar (${e instanceof ApiError ? e.code : "ERROR"})`, "error")
    } finally {
        busy.value[key] = false
    }
}

const TYPE_LABEL: Record<string, string> = { league: "Liga", playoff: "Playoff", friendly: "Amistoso" }
const dateFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
const matchUrl = (r: Row) => `${r.club.webUrl}/partido?id=${r.match.matchId}`
const resultTone = (m: IMatch) => (m.voided ? "bg-base-content/30" : m.result === "win" ? "bg-success" : m.result === "loose" ? "bg-error" : "bg-base-content/50")
</script>

<template>
    <div>
        <div class="flex flex-wrap items-center gap-1.5 mb-4" role="group" aria-label="Filtrar partidos">
            <button v-for="f in FILTERS" :key="f.id" type="button" :aria-pressed="filter === f.id"
                class="btn btn-sm rounded-full" :class="filter === f.id ? 'btn-neutral' : 'btn-ghost'" @click="filter = f.id">
                {{ f.label }} <span class="text-xs opacity-70 tabular-nums">{{ count(f.id) }}</span>
            </button>
            <button type="button" class="btn btn-sm btn-ghost ml-auto" :disabled="loading" @click="load">Recargar</button>
        </div>
        <p class="text-xs text-base-content/70 mb-3">
            «Para revisar»: nulos, desconexiones, penaltis y partidos en los que nadie llegó al 80'. Se ven los últimos {{ LIMIT }} de cada club.
        </p>

        <div v-if="failed.length" role="alert" class="alert alert-warning alert-soft text-sm mb-3">No responde el api de {{ failed.map((c) => c.name).join(" y ") }}.</div>

        <div v-if="loading" class="flex flex-col gap-2" aria-busy="true">
            <div v-for="n in 6" :key="n" class="skeleton on-page h-16 w-full"></div>
        </div>
        <p v-else-if="!visible.length" class="rounded-box bg-base-200 p-10 text-center text-base-content/75">Ningún partido en esta lista.</p>
        <ul v-else class="rounded-box bg-base-200 divide-y divide-base-content/10 overflow-hidden">
            <li v-for="r in visible.slice(0, shown)" :key="`${r.club.id}-${r.match.matchId}`" class="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <span class="size-2.5 rounded-full shrink-0" :class="resultTone(r.match)" aria-hidden="true"></span>
                    <ClubCrest v-if="CLUBS.length > 1" :club="r.club" class="size-6 shrink-0" />
                    <div class="min-w-0">
                        <a :href="matchUrl(r)" target="_blank" rel="noopener" class="font-bold hover-text-brand truncate block" :class="r.match.voided && 'line-through decoration-base-content/40'">
                            {{ ours(r.match).name }} {{ ours(r.match).matchStats.goals }}–{{ theirs(r.match).matchStats.goals }} {{ theirs(r.match).name }}
                        </a>
                        <p class="text-xs text-base-content/70 flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                            <span>{{ dateFmt.format(new Date(r.match.timestamp * 1000)) }}</span>
                            <span>· {{ TYPE_LABEL[r.match.matchType] ?? r.match.matchType }}</span>
                            <span>· {{ Math.round(maxSecondsPlayed(r.match) / 60) }}'</span>
                            <span v-for="fl in flags(r.match)" :key="fl.label" class="badge badge-xs" :class="fl.tone" :title="fl.title">{{ fl.label }}</span>
                        </p>
                    </div>
                </div>
                <div class="flex gap-1.5 shrink-0">
                    <button v-if="!r.match.voided" type="button" class="btn btn-xs sm:btn-sm btn-outline" :disabled="busy[`${r.club.id}-${r.match.matchId}`]" @click="setVoided(r, true)">Marcar nulo</button>
                    <button v-else type="button" class="btn btn-xs sm:btn-sm btn-outline" :disabled="busy[`${r.club.id}-${r.match.matchId}`]" @click="setVoided(r, false)">Quitar nulo</button>
                    <button v-if="r.match.voidedBy === 'admin'" type="button" class="btn btn-xs sm:btn-sm btn-ghost" :disabled="busy[`${r.club.id}-${r.match.matchId}`]"
                        title="Que decida el criterio automático (nadie llega a 15')" @click="setVoided(r, null)">Automático</button>
                    <span v-if="busy[`${r.club.id}-${r.match.matchId}`]" class="loading loading-spinner loading-xs self-center"></span>
                </div>
            </li>
        </ul>
        <div v-if="visible.length > shown" class="text-center mt-3">
            <button type="button" class="btn btn-sm btn-ghost" @click="shown += PAGE">Ver más ({{ visible.length - shown }})</button>
        </div>
    </div>
</template>
