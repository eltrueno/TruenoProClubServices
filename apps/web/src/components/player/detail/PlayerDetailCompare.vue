<template>
    <div class="flex flex-col gap-4 sm:gap-6 py-2 text-left [--a:var(--color-primary)] [--b:#2563eb] dark:[--b:#5b8def]">
        <!-- Sin rival elegido: a elegirlo -->
        <SectionCard v-if="!other && !loadingOther" title="Comparador" hint="Elige a otro jugador del club para verlos cara a cara.">
            <EmptyState icon="compare" title="¿Con quién lo comparamos?" text="Goles, pases, notas, lo que han jugado juntos y quién tiene más logros. Se puede compartir el enlace.">
                <button type="button" class="btn btn-primary" @click="openPicker">Elegir jugador</button>
                <p v-if="loadError" class="text-sm text-error mt-3">No se ha podido cargar ese jugador.</p>
            </EmptyState>
        </SectionCard>

        <div v-else-if="loadingOther" class="flex flex-col gap-4" aria-busy="true">
            <div class="skeleton h-40 w-full rounded-2xl"></div>
            <div class="skeleton h-96 w-full rounded-2xl"></div>
        </div>

        <template v-else-if="other">
            <!-- Al bajar: barra compacta pegada bajo las pestañas con las caras y el tanto a tanto -->
            <!-- Envoltorio pegado de alto 0: la barra va por encima del contenido, así que aparecer no mueve nada -->
            <div class="vs-mini-anchor sticky z-30 h-0 -mb-4 sm:-mb-6">
            <div class="vs-mini absolute inset-x-0 -mx-2 top-0 rounded-b-2xl border-t border-base-content/10 backdrop-blur-md shadow-lg shadow-black/25
                    [--ctl-bg:color-mix(in_oklab,var(--color-base-200)_94%,var(--color-base-content))]
                    dark:[--ctl-bg:color-mix(in_oklab,var(--color-base-200)_92%,var(--color-base-content))]
                    bg-[color-mix(in_oklab,var(--ctl-bg)_88%,transparent)]"
                :data-show="miniVisible" :aria-hidden="!miniVisible">
                <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4 px-3 py-2">
                    <span class="flex items-center gap-2 min-w-0 justify-end">
                        <span class="truncate text-xs sm:text-sm font-black text-(--a)">{{ profile.member.playerName }}</span>
                        <span class="size-8 shrink-0 rounded-full overflow-hidden outline-2 outline-(--a) bg-(--a)/45"><img :src="imageFor(profile.member.playerId)" alt="" class="size-full object-cover object-top scale-[2] origin-top" @error="onPlayerImageError" /></span>
                    </span>
                    <button type="button" class="text-xl sm:text-2xl font-black tabular-nums leading-none px-2 cursor-pointer" title="Volver arriba" :tabindex="miniVisible ? 0 : -1" @click="toTop">
                        <span class="text-(--a)">{{ score.a }}</span><span class="text-base-content/30 mx-1">–</span><span class="text-(--b)">{{ score.b }}</span>
                    </button>
                    <span class="flex items-center gap-2 min-w-0">
                        <span class="size-8 shrink-0 rounded-full overflow-hidden outline-2 outline-(--b) bg-(--b)/45"><img :src="imageFor(other.member.playerId)" alt="" class="size-full object-cover object-top scale-[2] origin-top" @error="onPlayerImageError" /></span>
                        <span class="truncate text-xs sm:text-sm font-black text-(--b)">{{ other.member.playerName }}</span>
                    </span>
                </div>
            </div>
            </div>

            <!-- Cabecera: los dos frente a frente y el marcador de "ventajas" -->
            <section ref="head" class="vs-head rounded-2xl bg-base-200 p-4 sm:p-6 shadow-md">
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
                        <span class="text-[0.65rem] text-base-content/50">en {{ rows.length }} stats<template v-if="score.ties"> · {{ score.ties }} {{ score.ties === 1 ? "empate" : "empates" }}</template></span>
                        <button type="button" class="btn btn-xs btn-ghost mt-1" @click="openPicker">Cambiar</button>
                    </div>
                </div>
                <ul v-if="warnings.length" class="mt-4 flex flex-col gap-1 text-xs text-warning">
                    <li v-for="w in warnings" :key="w">{{ w }}</li>
                </ul>
            </section>

            <!-- Perfil superpuesto -->
            <SectionCard title="Perfil" :hint="scale === 'fit' ? 'Escala ajustada: cada eje llega hasta el mayor de los dos, para ver quién gana en cada cosa.' : 'Los dos en las mismas ocho cosas, de 0 al máximo razonable.'">
                <template #actions>
                    <OptionToggle v-model="scale" :options="SCALE_OPTIONS" size="sm" />
                </template>
                <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-5 lg:gap-8 items-center">
                    <div>
                        <div class="relative w-full max-w-lg mx-auto aspect-square" @mouseleave="hovered = null">
                            <Radar ref="radarChart" :data="radarData" :options="radarOptions" />
                        </div>
                        <div class="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs font-bold text-base-content/70">
                            <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-(--a)"></span>{{ profile.member.playerName }}</span>
                            <span class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-(--b)"></span>{{ other.member.playerName }}</span>
                        </div>
                    </div>
                    <!-- Los ocho ejes, con quién gana cada uno; al pasar por una fila se marca en el radar, y al revés -->
                    <table class="w-full text-sm" aria-label="Valores del radar">
                        <thead>
                            <tr class="text-[0.65rem] uppercase tracking-wider">
                                <th class="text-left font-black pb-1.5 text-base-content/50"></th>
                                <th class="text-right font-black pb-1.5 text-(--a) truncate max-w-24">{{ profile.member.playerName }}</th>
                                <th class="text-right font-black pb-1.5 text-(--b) truncate max-w-24">{{ other.member.playerName }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(a, i) in radarRows" :key="a.label" class="cursor-default transition-colors"
                                :class="hovered === i ? 'bg-primary/12' : 'hover:bg-base-content/5'"
                                @mouseenter="hovered = i" @mouseleave="hovered = null">
                                <td class="py-1.5 pl-2 rounded-l-lg font-bold" :class="hovered === i && 'text-primary'">{{ a.label }}</td>
                                <td class="py-1.5 text-right tabular-nums" :class="a.win === 'a' ? 'font-black text-(--a)' : a.win === null ? 'font-bold text-base-content/80' : 'text-base-content/60'">{{ a.a }}</td>
                                <td class="py-1.5 pr-2 rounded-r-lg text-right tabular-nums" :class="a.win === 'b' ? 'font-black text-(--b)' : a.win === null ? 'font-bold text-base-content/80' : 'text-base-content/60'">{{ a.b }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            <!-- Stat a stat, barras enfrentadas -->
            <SectionCard title="Stat a stat" hint="En negrita, quien gana cada fila (con los números tal y como se ven: si se ven iguales, es empate). En rojas, gana quien tiene menos.">
                <template #actions>
                    <OptionToggle v-model="mode" :options="MODES.map((m) => ({ value: m.key, label: m.label }))" size="sm" label="Modo" />
                </template>
                <div class="flex flex-col gap-3">
                    <div v-for="(r, i) in rows" :key="`${mode}-${r.label}`" class="grid grid-cols-[3.25rem_minmax(0,1fr)_minmax(0,1fr)_3.25rem] sm:grid-cols-[4rem_minmax(0,1fr)_10rem_minmax(0,1fr)_4rem] items-center gap-x-2 gap-y-1">
                        <span class="text-right tabular-nums" :class="r.win === 'a' ? 'font-black text-(--a)' : r.win === null ? 'font-bold text-base-content/80' : 'text-base-content/60'">{{ r.aText }}</span>
                        <span class="h-2.5 rounded-full bg-base-content/8 overflow-hidden flex justify-end"><span class="bar h-full rounded-full bg-(--a)" :class="r.win === 'b' && 'opacity-45'" :style="{ width: `${r.aPct}%`, '--k': i }"></span></span>
                        <span class="hidden sm:block text-center text-xs font-black uppercase tracking-wider text-base-content/60 truncate">{{ r.label }}<span v-if="r.win === null" class="ml-1 text-base-content/40" title="Empate">=</span></span>
                        <span class="h-2.5 rounded-full bg-base-content/8 overflow-hidden"><span class="bar bar-b block h-full rounded-full bg-(--b)" :class="r.win === 'a' && 'opacity-45'" :style="{ width: `${r.bPct}%`, '--k': i }"></span></span>
                        <span class="tabular-nums" :class="r.win === 'b' ? 'font-black text-(--b)' : r.win === null ? 'font-bold text-base-content/80' : 'text-base-content/60'">{{ r.bText }}</span>
                        <span class="sm:hidden col-span-4 -order-1 text-center text-[0.65rem] font-black uppercase tracking-wider text-base-content/60">{{ r.label }}<span v-if="r.win === null" class="ml-1 text-base-content/40" title="Empate">=</span></span>
                    </div>
                </div>
            </SectionCard>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
                <!-- Juntos -->
                <SectionCard title="Juntos" hint="Partidos en los que jugaron los dos en el club (con el filtro de arriba).">
                    <EmptyState v-if="!together.games" compact icon="ball" title="Todavía no han coincidido" text="Cuando jueguen juntos un partido, aquí saldrá cómo les va." />
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
                </SectionCard>

                <!-- Logros -->
                <SectionCard title="Logros" hint="Los de este club, por rareza, y lo que tiene uno y el otro no.">
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
                                <!-- Al pasar por encima (o con el foco), qué es y cuánto vale -->
                                <li v-for="a in expanded[side.key] ? side.list : side.list.slice(0, 10)" :key="a.id" class="tooltip tooltip-top" @pointerenter="placeTooltip" @focusin="placeTooltip">
                                    <div class="tooltip-content text-left text-xs leading-snug px-3 py-2 max-w-60">
                                        <p class="font-black">{{ a.name }}</p>
                                        <p v-if="a.description" class="opacity-85">{{ a.description }}</p>
                                        <p class="opacity-70 mt-0.5">{{ ACHIEVEMENT_RARITY_LABELS[a.rarity] }} · {{ a.points }} pts</p>
                                    </div>
                                    <span tabindex="0" class="badge badge-sm font-semibold cursor-help focus-visible:outline-2 focus-visible:outline-primary" :class="RARITY_BADGE[a.rarity]">{{ a.name }}</span>
                                </li>
                                <li v-if="side.list.length > 10">
                                    <button type="button" class="badge badge-sm badge-ghost cursor-pointer hover:bg-base-content/10" :aria-expanded="!!expanded[side.key]"
                                        @click="expanded[side.key] = !expanded[side.key]">{{ expanded[side.key] ? "Ver menos" : `+${side.list.length - 10}` }}</button>
                                </li>
                            </ul>
                            <p v-else class="text-xs text-base-content/60">Nada que no tenga el otro.</p>
                        </div>
                    </div>
                </SectionCard>
            </div>

            <!-- Partido a partido: cada partido que jugaron juntos, quién tuvo mejor nota y qué hizo cada uno -->
            <SectionCard v-if="together.list.length" title="Partido a partido" hint="Los partidos que jugaron juntos, del más reciente al más antiguo. En negrita, la mejor nota de los dos.">
                <template #actions>
                    <span class="text-xs font-bold text-base-content/70">
                        Mejor nota: <b class="text-(--a)">{{ together.better.a }}</b> – <b class="text-(--b)">{{ together.better.b }}</b>
                    </span>
                </template>
                <ol class="flex flex-col divide-y divide-base-content/8">
                    <li v-for="m in together.list.slice(0, shownGames)" :key="m.matchId" class="py-2.5 grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[7rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                        <a :href="routes.match(m.matchId)" class="min-w-0 sm:col-start-1 col-span-2 sm:col-span-1 flex items-center gap-2 text-xs hover:text-primary">
                            <span class="size-2 rounded-full shrink-0" :class="m.result === 'win' ? 'bg-success' : m.result === 'loose' ? 'bg-error' : 'bg-base-content/40'" aria-hidden="true"></span>
                            <span class="font-black tabular-nums">{{ m.score }}</span>
                            <span class="text-base-content/60 truncate sm:hidden">{{ m.rival }} · {{ m.date }}</span>
                            <span class="text-base-content/60 hidden sm:inline">{{ m.date }}</span>
                        </a>
                        <a :href="routes.match(m.matchId)" class="hidden sm:block text-sm text-base-content/70 truncate hover:text-primary">{{ m.rival }}</a>
                        <span class="flex items-center gap-3 justify-end col-span-2 sm:col-span-1">
                            <span class="flex items-center gap-1.5">
                                <span class="text-[0.65rem] text-base-content/60 tabular-nums">{{ m.a.line }}</span>
                                <span class="rounded-md px-1.5 py-0.5 text-xs tabular-nums" :class="[RATING_TONE(m.a.rating), m.win === 'a' ? 'font-black ring-2 ring-(--a)' : '']">{{ fmt(m.a.rating, 1) }}</span>
                            </span>
                            <span class="text-base-content/50 text-xs">vs</span>
                            <span class="flex items-center gap-1.5">
                                <span class="rounded-md px-1.5 py-0.5 text-xs tabular-nums" :class="[RATING_TONE(m.b.rating), m.win === 'b' ? 'font-black ring-2 ring-(--b)' : '']">{{ fmt(m.b.rating, 1) }}</span>
                                <span class="text-[0.65rem] text-base-content/60 tabular-nums">{{ m.b.line }}</span>
                            </span>
                        </span>
                    </li>
                </ol>
                <button v-if="together.list.length > shownGames" type="button" class="btn btn-sm btn-ghost self-center" @click="shownGames += 15">Ver más ({{ together.list.length - shownGames }})</button>
            </SectionCard>
        </template>

        <!-- Elegir jugador: el selector genérico (el del filtro de partidos), abierto desde los botones -->
        <PlayerPickerModal
            ref="picker"
            :trigger="false"
            :model-value="vsId || null"
            :items="pickerItems"
            :clearable="false"
            zoom="2xl"
            :fallback-image="PLAYER_PLACEHOLDER"
            :title="`Comparar a ${profile.member.playerName} con…`"
            search-placeholder="Buscar jugador…"
            @update:model-value="(v) => { if (typeof v === 'string' && v) vsId = v }"
        />
    </div>
</template>

<script setup lang="ts">
/**
 * Pestaña "Comparador" de la ficha: este jugador contra otro del club (?vs=<playerId>, para compartir).
 * Cabecera con el marcador de "ventajas" (en cuántas stats gana cada uno), radar superpuesto, barras
 * enfrentadas stat a stat (por partido o totales), lo que han jugado juntos y sus logros.
 * Los dos con el mismo filtro de oficiales / amistosos que la ficha.
 */
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
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
import SectionCard from "@/components/ui/SectionCard.vue"
import OptionToggle, { type ToggleOption } from "@/components/ui/OptionToggle.vue"
import { useStickySubBar } from "@/composables/useStickySubBar"
import { radarAxisMax, radarNorm, type RadarScale } from "@/lib/radarScale"
import PlayerPickerModal, { type PickerItem } from "@/components/ui/PlayerPickerModal.vue"
import { usePlayerStats } from "@/composables/usePlayerStats"
import { PLAYER_PLACEHOLDER } from "@/lib/playerImage"
import EmptyState from "@/components/ui/EmptyState.vue"
import { navTop } from "@/lib/navOffset"
import { placeTooltip } from "@/lib/tooltipPlacement"
import { shownWinner, smartDecimals } from "@/lib/statCompare"

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

// ── Selector (el genérico; con posiciones para su filtro) ──
const picker = ref<InstanceType<typeof PlayerPickerModal> | null>(null)
const openPicker = () => picker.value?.open()
const { positionsOf, load: loadPositions } = usePlayerStats()
onMounted(() => loadPositions())
const pickerItems = computed<PickerItem[]>(() => members.value
    .filter((m) => m.playerId !== props.profile.member.playerId)
    .sort((a, b) => (b.lastSeenAt ?? 0) - (a.lastSeenAt ?? 0))
    .map((m) => ({ id: m.playerId, name: m.playerName, image: m.imageUrl, positions: positionsOf(m.playerId), member: m })))

// ── Barra compacta pegada (aparece cuando la cabecera queda por debajo de las pestañas) ──
const head = ref<HTMLElement | null>(null)
const miniVisible = ref(false)
const checkMini = () => {
    const el = head.value
    if (!el) { miniVisible.value = false; return }
    const top = navTop() + parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tabs-h") || "76")
    miniVisible.value = el.getBoundingClientRect().bottom < top
}
onMounted(() => { addEventListener("scroll", checkMini, { passive: true }); checkMini() })
useStickySubBar(miniVisible)
onUnmounted(() => removeEventListener("scroll", checkMini))
const toTop = () => head.value?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" })

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
        // Decimales según el tamaño (0,04 rojas por partido no se escribe "0,0") y quién gana, de lo
        // que se ve: si los dos se escriben igual, es empate (ver lib/statCompare)
        const d = m.pct ? smartDecimals([a, b], 0, true) : m.d ? smartDecimals([a, b], m.d) : 0
        const win = shownWinner(a, b, d, !!m.lowerBetter)
        const text = (v: number) => (m.pct ? `${fmt(v, d)}%` : fmt(v, d))
        return { label: m.label, aText: text(a), bText: text(b), aPct: (a / max) * 100, bPct: (b / max) * 100, win }
    })
})
const score = computed(() => ({ a: rows.value.filter((r) => r.win === "a").length, b: rows.value.filter((r) => r.win === "b").length, ties: rows.value.filter((r) => r.win === null).length }))

// ── Radar ──
// Ajustada por defecto: aquí lo que importa es ver quién gana en cada eje
const scale = ref<RadarScale>("fit")
const SCALE_OPTIONS: ToggleOption<RadarScale>[] = [{ value: "full", label: "Completa" }, { value: "fit", label: "Ajustada" }]
const hovered = ref<number | null>(null)
const radarChart = ref<{ chart?: ChartJS } | null>(null)
watch(hovered, (i) => {
    const chart = radarChart.value?.chart
    if (!chart) return
    chart.setActiveElements(i === null ? [] : chart.data.datasets.map((_, d) => ({ datasetIndex: d, index: i })))
    chart.update("none")
})
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
const axisMax = computed(() => radarAxisMax(sides.value.map((s) => RADAR.value.map((m) => m.get(s.stats))), RADAR.value.map((m) => m.max), scale.value))
const radarRows = computed(() => sides.value.length < 2 ? [] : RADAR.value.map((m) => {
    const a = m.get(sides.value[0].stats), b = m.get(sides.value[1].stats)
    const pctish = m.max === 100 || m.max === 30
    const d = pctish ? smartDecimals([a, b], 0, true) : m.max === 10 ? 1 : smartDecimals([a, b], 2)
    const text = (v: number) => (pctish ? `${fmt(v, d)}%` : fmt(v, d))
    return { label: m.label, a: text(a), b: text(b), win: shownWinner(a, b, d) }
}))
const B_COLOR = "#5b8def"
const radarData = computed(() => ({
    labels: RADAR.value.map((m) => m.label),
    datasets: sides.value.map((s, i) => ({
        label: s.profile.member.playerName,
        data: RADAR.value.map((m, k) => radarNorm(m.get(s.stats), axisMax.value[k])),
        fill: true,
        backgroundColor: hexToRgba(i === 0 ? CLUB.colors.primary : B_COLOR, 0.22),
        borderColor: i === 0 ? CLUB.colors.primary : B_COLOR,
        borderWidth: 2.5,
        pointBackgroundColor: i === 0 ? CLUB.colors.primary : B_COLOR,
        pointBorderColor: "#fff",
        pointRadius: 3,
        pointHoverRadius: 7,
        pointHoverBorderWidth: 2,
    })),
}))
const radarOptions = computed<ChartOptions<"radar">>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeOutQuart" as const },
    interaction: { mode: "index" as const, intersect: false },
    onHover: (_e, els) => { const i = els[0]?.index ?? null; if (hovered.value !== i) hovered.value = i },
    scales: {
        r: {
            type: "radialLinear", suggestedMin: 0, suggestedMax: 100,
            angleLines: { color: "rgba(166, 173, 187, 0.2)" },
            grid: { color: "rgba(166, 173, 187, 0.15)", circular: true },
            ticks: { display: false, stepSize: 25 },
            pointLabels: { font: { size: 11, weight: "bold" }, color: (ctx) => (ctx.index === hovered.value ? CLUB.colors.primary : "#A6ADBB"), padding: 6 },
        },
    },
    plugins: {
        legend: { display: false },
        tooltip: {
            enabled: typeof window !== "undefined" && window.innerWidth < 1024,
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
    type Game = { matchId: number; ts: number; score: string; rival: string; date: string; result: string; win: "a" | "b" | null; a: { rating: number; line: string }; b: { rating: number; line: string } }
    const t = { games: 0, wins: 0, ties: 0, losses: 0, goalsFor: 0, a: { goals: 0, assists: 0, rating: 0 }, b: { goals: 0, assists: 0, rating: 0 }, last: null as null | { matchId: number; label: string }, list: [] as Game[], better: { a: 0, b: 0 } }
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
        // Partido a partido: la mejor nota (empate si son iguales) y goles / asistencias de cada uno
        const line = (p: { goals: number; assists: number }) => [p.goals ? `${p.goals}G` : "", p.assists ? `${p.assists}A` : ""].filter(Boolean).join(" ")
        const win = shownWinner(pa.rating, pb.rating, 1)
        if (win) t.better[win]++
        t.list.push({
            matchId: m.matchId, ts: m.timestamp, result: m.result, win,
            score: `${m.ourClub.matchStats.goals}–${m.opponentClub.matchStats.goals}`, rival: m.opponentClub.name,
            date: new Date(m.timestamp * 1000).toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
            a: { rating: pa.rating, line: line(pa) }, b: { rating: pb.rating, line: line(pb) },
        })
        if (m.timestamp > lastTs) {
            lastTs = m.timestamp
            t.last = { matchId: m.matchId, label: `${m.ourClub.matchStats.goals}–${m.opponentClub.matchStats.goals} contra ${m.opponentClub.name}` }
        }
    }
    t.list.sort((x, y) => y.ts - x.ts)
    return t
})
const shownGames = ref(10)
const RATING_TONE = (r: number) => (r >= 8 ? "bg-success text-success-content" : r >= 7 ? "bg-lime-500 text-black" : r >= 6 ? "bg-warning text-warning-content" : "bg-error text-error-content")

// ── Logros (de club, en este club) ──
type Ach = { id: string; name: string; description: string; rarity: AchievementRarity; points: number }
type AchDef = { name: string; description?: string; rarity: AchievementRarity; points: number; hidden?: boolean }
const achOf = (p: PlayerProfileEntity): Ach[] => {
    const byId = new Map<string, Ach>()
    for (const a of p.achievements as unknown as { achievementId: string; definition?: AchDef }[]) {
        if (byId.has(a.achievementId)) continue
        const d = a.definition
        // Los ocultos no se destripan aquí (en la pestaña Logros se desvelan a quien también los tiene)
        byId.set(a.achievementId, d?.hidden
            ? { id: a.achievementId, name: "Logro oculto", description: "Uno de los ocultos: se ve en la pestaña Logros si tú también lo tienes.", rarity: d.rarity, points: d.points }
            : { id: a.achievementId, name: d?.name ?? a.achievementId, description: d?.description ?? "", rarity: d?.rarity ?? "common", points: d?.points ?? 0 })
    }
    return [...byId.values()]
}
/** "Solo X": se ven los 10 primeros y "+N" despliega el resto */
const expanded = ref<Record<string, boolean>>({})
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
    common: "text-base-content/70", rare: "text-sky-700 dark:text-sky-300", epic: "text-violet-700 dark:text-violet-300", legendary: "text-amber-800 dark:text-amber-300",
}
const RARITY_BADGE: Record<AchievementRarity, string> = {
    common: "badge-ghost", rare: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30", epic: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30", legendary: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
}
</script>

<style scoped>
/* Barra compacta: pegada justo bajo las pestañas. Sale de debajo de ellas (solo translate y opacidad,
   sin tocar alturas: nada se mueve) al pasar la cabecera */
.vs-mini-anchor { top: calc(var(--nav-top, 4rem) + var(--tabs-h, 4.75rem) - 1px); transition: top 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
.vs-mini {
    opacity: 0;
    translate: 0 -100%;
    pointer-events: none;
    transition: translate 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s;
}
.vs-mini[data-show="true"] { opacity: 1; translate: 0 0; pointer-events: auto; }
@media (prefers-reduced-motion: reduce) { .vs-mini { transition: opacity 0.2s; } }
.bar { transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
@media (prefers-reduced-motion: no-preference) {
    .bar { transform-origin: right; animation: grow 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: calc(var(--k, 0) * 35ms); }
    .bar-b { transform-origin: left; }
    .vs-head { animation: rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
}
@keyframes grow { from { scale: 0 1; } }
@keyframes rise { from { opacity: 0; translate: 0 0.5rem; } }
</style>
