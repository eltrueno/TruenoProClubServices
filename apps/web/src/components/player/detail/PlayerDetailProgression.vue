<template>
    <div class="flex flex-col gap-8 animate-in mt-1">

        <!-- ═══ EVOLUCIÓN (Line Chart) ═══ -->
        <div class="card bg-base-200 shadow-md relative">
            <div class="card-body p-6">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <h2 class="card-title text-xl font-black uppercase border-l-4 border-primary pl-4">Evolución</h2>

                    <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto sm:justify-end">
                        <!-- Legend -->
                        <div class="hidden sm:flex items-center gap-4 text-xs text-base-content/60 mr-2">
                            <span class="flex items-center gap-1.5">
                                <span class="w-5 h-0.5 bg-[#C80D0D] rounded-full inline-block"></span>
                                Jugador
                            </span>
                            <span class="flex items-center gap-1.5">
                                <span class="w-5 h-0.5 border-t-2 border-dashed border-base-content/40 inline-block"></span>
                                Su media
                            </span>
                        </div>

                        <!-- Metric selector -->
                        <select
                            v-model="evolutionMetric"
                            class="select select-sm select-bordered dark:bg-base-100 bg-base-300 font-bold uppercase text-xs tracking-wide rounded-xl"
                        >
                            <option value="rating">Valoración</option>
                            <option value="goals">Goles</option>
                            <option value="assists">Asistencias</option>
                            <option value="goalsPlusAssists">G+A</option>
                        </select>
                    </div>
                </div>

                <!-- Date Range and Zoom Filter Controls -->
                <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3 dark:bg-base-100/40 bg-base-300/30 border border-base-content/5 rounded-2xl mb-6">
                    <div class="flex flex-wrap items-center gap-3 text-xs w-full md:w-auto">
                        <span class="font-black uppercase tracking-wider text-base-content/50 flex items-center gap-1">
                        Selector de rango temporal
                        </span>

                        <div class="relative w-full md:w-[260px]">
                            <VueTailwindDatepicker
                                i18n="es"
                                v-model="dateFilter"
                                class="w-full text-xs font-bold"
                                :formatter="dateFormatter"
                                :options="datePickerOptions"
                                :shortcuts="false"
                                as-single
                                use-range
                                @keypress.stop.prevent
                                @keyup.stop.prevent
                                @keydown.stop.prevent
                            />
                        </div>
                    </div>

                    <!-- Quick Presets -->
                    <div class="flex items-center gap-1 bg-base-300/50 dark:bg-base-100/60 p-1 rounded-xl w-full md:w-auto justify-around md:justify-start">
                        <button
                            v-for="preset in [
                                { val: 'all', label: 'Todo' },
                                { val: 5, label: 'Últ. 5' },
                                { val: 10, label: 'Últ. 10' },
                                { val: 20, label: 'Últ. 20' }
                            ]"
                            :key="preset.val"
                            @click="setQuickRange(preset.val as any)"
                            class="btn btn-xs btn-ghost hover:bg-primary/10 hover:text-primary rounded-lg text-[10px] uppercase font-black px-2.5 py-1 transition-all duration-200"
                            :class="activeQuickRange === preset.val ? 'bg-primary text-primary-content hover:bg-primary hover:text-primary-content shadow-sm' : 'text-base-content/60'"
                        >
                            {{ preset.label }}
                        </button>
                    </div>
                </div>

                <div class="w-full h-[260px] sm:h-[300px]">
                    <Line v-if="evolutionChartData" :data="evolutionChartData" :options="evolutionOptions" />
                </div>
            </div>
        </div>

        <!-- ═══ FORMA RECIENTE + MEJORES REGISTROS (Side-by-side on desktop) ═══ -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">

            <!-- Forma Reciente -->
            <div class="card bg-base-200 shadow-md relative">
                <div class="card-body p-6 flex flex-col justify-between gap-5">
                    <div>
                        <h2 class="card-title text-sm font-black uppercase border-l-4 border-primary pl-4 mb-6 tracking-widest">
                            Forma Reciente · Últimos {{ recentCount }}
                        </h2>

                        <div class="flex flex-col gap-5">
                            <!-- Delta Card -->
                            <div class="dark:bg-base-100 bg-base-300 rounded-2xl p-5 flex flex-col justify-center border-l-4"
                                 :class="recentDelta >= 0 ? 'border-green-500' : 'border-red-500'">
                                <div class="text-3xl font-black tabular-nums"
                                     :class="recentDelta >= 0 ? 'text-green-500' : 'text-red-500'">
                                    {{ recentDelta >= 0 ? '+' : '' }}{{ recentDelta.toFixed(2) }}
                                </div>
                                <div class="text-xs text-base-content/50 mt-1 font-medium">vs su media en valoración</div>
                            </div>

                            <!-- Recent Form Bar Chart -->
                            <div class="h-[140px]">
                                <Bar v-if="recentBarData" :data="recentBarData" :options="recentBarOptions" />
                            </div>
                        </div>
                    </div>

                    <!-- Additional details to fill the vertical space -->
                    <div class="flex flex-col gap-3 pt-4 border-t border-base-content/5">
                        <!-- Form circles -->
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-base-content/50 uppercase tracking-wider">Racha Reciente</span>
                            <div class="flex gap-1.5">
                                <div v-for="(res, idx) in recentResults" :key="idx"
                                     class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm transition-transform hover:scale-110"
                                     :class="res.class"
                                     :title="res.tooltip">
                                    {{ res.text }}
                                </div>
                            </div>
                        </div>

                        <!-- Stats summary grid -->
                        <div class="grid grid-cols-3 gap-2 text-center mt-1">
                            <div class="bg-base-300/30 dark:bg-base-100/40 border border-base-content/5 rounded-xl p-2">
                                <div class="text-[9px] uppercase font-black text-base-content/40 tracking-wider">Goles</div>
                                <div class="text-sm font-black text-primary mt-0.5">{{ recentStatsSummary.goals }}</div>
                            </div>
                            <div class="bg-base-300/30 dark:bg-base-100/40 border border-base-content/5 rounded-xl p-2">
                                <div class="text-[9px] uppercase font-black text-base-content/40 tracking-wider">Asistencias</div>
                                <div class="text-sm font-black text-primary mt-0.5">{{ recentStatsSummary.assists }}</div>
                            </div>
                            <div class="bg-base-300/30 dark:bg-base-100/40 border border-base-content/5 rounded-xl p-2">
                                <div class="text-[9px] uppercase font-black text-base-content/40 tracking-wider">Minutos</div>
                                <div class="text-sm font-black text-primary mt-0.5">{{ recentStatsSummary.minutes }}'</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mejores Registros -->
            <div class="card bg-base-200 shadow-md relative">
                <div class="card-body p-6">
                    <h2 class="card-title text-sm font-black uppercase border-l-4 border-primary pl-4 mb-6 tracking-widest">
                        Mejores Registros
                    </h2>

                    <div class="grid grid-cols-2 gap-3 lg:gap-4">
                        <div v-for="h in highlightStats" :key="h.label"
                             class="dark:bg-base-100 bg-base-300 border border-base-content/5 rounded-xl p-3 flex flex-col items-center text-center gap-1 group hover:-translate-y-0.5 hover:shadow-md hover:border-primary/25 transition-all duration-300">
                            <span class="text-xl group-hover:scale-110 transition-transform duration-300">{{ h.icon }}</span>
                            <span class="text-base-content/50 uppercase text-[0.65rem] lg:text-[0.7rem] font-black tracking-widest leading-tight">{{ h.label }}</span>
                            <span class="text-lg font-black tabular-nums mt-0.5">{{ h.value }}</span>
                            <span v-if="h.sub" class="text-[0.6rem] lg:text-[0.65rem] text-base-content/40 font-medium truncate max-w-full" :title="h.sub">{{ h.sub }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══ ÚLTIMOS PARTIDOS (Table) ═══ -->
        <div class="card bg-base-200 shadow-md relative">
            <div class="card-body p-6">
                <h2 class="card-title text-xl font-black uppercase border-l-4 border-primary pl-4 mb-6">Últimos Partidos</h2>

                <div class="overflow-x-auto">
                    <table class="table table-sm w-full">
                           <thead>
                               <tr class="text-xs uppercase text-base-content/40 tracking-widest border-b border-base-content/10">
                                   <th class="font-black">Rival</th>
                                   <th class="font-black text-center">Fecha</th>
                                   <th class="font-black text-center">Tipo</th>
                                   <th class="font-black text-center">Pos</th>
                                   <th class="font-black text-center">Val</th>
                                   <th class="font-black text-center">G</th>
                                   <th class="font-black text-center">A</th>
                                   <th class="font-black text-center">Min</th>
                               </tr>
                           </thead>
                           <tbody>
                               <tr v-for="row in visibleMatches" :key="row.matchId"
                                   @click="navigateToMatch(row.matchId)"
                                   class="border-b border-base-content/5 transition-colors duration-150 relative cursor-pointer"
                                   :class="row.manOfTheMatch
                                       ? 'bg-amber-400/[0.04] hover:bg-amber-400/[0.08] mvp-row'
                                       : 'hover:bg-base-100/30'"
                                   :title="row.manOfTheMatch ? '⭐ MVP del partido' : ''">
                                   <!-- MVP star indicator on left -->
                                   <td class="font-semibold py-3">
                                       <div class="flex items-center gap-2">
                                           <span v-if="row.manOfTheMatch"
                                                 class="tooltip tooltip-right cursor-default"
                                                 data-tip="MVP del partido"
                                                 @click.stop>
                                               <span class="text-amber-400 text-sm">★</span>
                                           </span>
                                           {{ row.rivalName }}
                                       </div>
                                   </td>
                                   <td class="text-center py-3 text-xs tabular-nums text-base-content/60">
                                       {{ row.date }}
                                   </td>
                                   <td class="text-center py-3">
                                       <span class="badge badge-xs badge-primary font-bold uppercase px-2 py-2.5 rounded-md">
                                           {{ translateMatchType(row.matchType) }}
                                       </span>
                                   </td>
                                   <td class="text-center py-3 text-xs font-bold text-base-content/70">
                                       {{ translatePosition(row.position) }}
                                   </td>
                                   <td class="text-center font-black tabular-nums py-3"
                                       :class="getRatingColor(row.rating)">
                                       {{ row.rating.toFixed(1) }}
                                   </td>
                                   <td class="text-center tabular-nums py-3">{{ row.goals }}</td>
                                   <td class="text-center tabular-nums py-3">{{ row.assists }}</td>
                                   <td class="text-center tabular-nums py-3 text-base-content/60">{{ row.minutes }}'</td>
                               </tr>
                           </tbody>
                    </table>
                </div>

                <!-- Show All Button -->
                <button
                    v-if="matchRows.length > initialShowCount"
                    @click="showAll = !showAll"
                    class="btn btn-outline btn-block mt-6 rounded-2xl uppercase font-black tracking-wider text-sm border-2 hover:btn-primary"
                >
                    {{ showAll ? 'Mostrar menos' : `Ver todos los partidos (${matchRows.length})` }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
    import {
        Chart as ChartJS,
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        BarElement,
        Filler,
        Tooltip,
        Legend,
        LineController,
        BarController,
        type ChartOptions
    } from 'chart.js';
    import { Line, Bar } from 'vue-chartjs';
    import { translateMatchType, translatePosition } from '@/i18n/translations';
    import VueTailwindDatepicker from 'vue-tailwind-datepicker';
    import type PlayerProfileEntity from '@/model/PlayerProfileEntity';
    import type PlayerStatsEntity from '@/model/PlayerStatsEntity';
    import type ClubMatchEntity from '@/model/match/ClubMatchEntity';

    ChartJS.register(
        CategoryScale, LinearScale, PointElement, LineElement,
        BarElement, Filler, Tooltip, Legend, LineController, BarController
    );

    const props = defineProps<{
        player: PlayerProfileEntity,
        stats: PlayerStatsEntity,
        matches: ClubMatchEntity[] | undefined,
        currentFilter: string,
        positionFilter?: string | null
    }>()

    // ── State ──
    const evolutionMetric = ref<'rating' | 'goals' | 'assists' | 'goalsPlusAssists'>('rating')
    const showAll = ref(false)
    const initialShowCount = 7
    const recentCount = 5

    // Chart Date Filter State using VueTailwindDatepicker
    const dateFilter = ref({
        startDate: '',
        endDate: ''
    })

    const dateFormatter = ref({
        date: 'DD/MM/YYYY',
        month: 'MM'
    })

    const datePickerOptions = ref({
        shortcuts: {
            today: "Hoy",
            yesterday: "Ayer",
            past: (period: number) => "Hace " + period + " Días",
            currentMonth: "Este mes",
            pastMonth: "Mes pasado",
        },
        footer: {
            apply: "Aplicar",
            cancel: "Cancelar",
        },
    })

    const activeQuickRange = ref<'all' | 5 | 10 | 20>('all')

    const isMobile = ref(false)
    const updateMobile = () => { isMobile.value = window.innerWidth < 640 }
    onMounted(() => { updateMobile(); window.addEventListener('resize', updateMobile) })
    onUnmounted(() => { window.removeEventListener('resize', updateMobile) })

    // ── Basic Helpers (Defined at the top to prevent access-before-initialization ReferenceErrors) ──
    const playerNameLower = computed(() => props.player?.member?.playerName?.toLowerCase() ?? '')

    /** Find this player's data inside a match */
    const findPlayer = (match: ClubMatchEntity) => {
        const name = playerNameLower.value
        return match.localClub.players.find(p => p.playername.toLowerCase() === name)
            || match.awayClub.players.find(p => p.playername.toLowerCase() === name)
    }

    /** Get rival name */
    const getRivalName = (match: ClubMatchEntity) => {
        const name = playerNameLower.value
        const inLocal = match.localClub.players.some(p => p.playername.toLowerCase() === name)
        return inLocal ? match.awayClub.name : match.localClub.name
    }

    /** Format Date to DD/MM/YYYY */
    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp * 1000)
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
    }

    /** Format timestamp to datepicker format DD/MM/YYYY */
    const formatToDatePicker = (timestamp: number) => {
        return formatDate(timestamp)
    }

    /** Navigate to match detail page */
    const navigateToMatch = (matchId: number) => {
        window.location.href = `/partido/${matchId}`
    }

    // ═══════════════════════════════════════════
    // ── FILTERING (Respects parent type & position filters) ──
    // ═══════════════════════════════════════════
    const filteredMatches = computed(() => {
        if (!props.matches || props.matches.length === 0) return []

        let list = props.matches

        // 1. Filter by match type (official / friendly / all)
        list = list.filter(m => {
            if (props.currentFilter === 'all') return true
            if (props.currentFilter === 'official') return (m.matchType === 'league' || m.matchType === 'playoff')
            if (props.currentFilter === 'friendly') return (m.matchType !== 'league' && m.matchType !== 'playoff')
            return true
        })

        // 2. Filter by position (if set in parent)
        if (props.positionFilter) {
            list = list.filter(m => {
                const p = findPlayer(m)
                return p && p.position === props.positionFilter
            })
        }

        return list
    })

    // ═══════════════════════════════════════════
    // ── CHART DATE FILTERING ──
    // ═══════════════════════════════════════════
    const minMatchDateStr = computed(() => {
        if (!filteredMatches.value.length) return ''
        const timestamps = filteredMatches.value.map(m => m.timestamp)
        return formatToDatePicker(Math.min(...timestamps))
    })

    const maxMatchDateStr = computed(() => {
        if (!filteredMatches.value.length) return ''
        const timestamps = filteredMatches.value.map(m => m.timestamp)
        return formatToDatePicker(Math.max(...timestamps))
    })

    const chartFilteredMatches = computed(() => {
        const matches = filteredMatches.value
        if (!matches.length) return []

        const parseDatePickerDate = (dateStr: string) => {
            if (!dateStr) return null
            const parts = dateStr.split('/')
            if (parts.length === 3) {
                const d = Number(parts[0])
                const m = Number(parts[1])
                const y = Number(parts[2])
                return new Date(y, m - 1, d)
            }
            return null
        }

        const start = parseDatePickerDate(dateFilter.value.startDate)
        const end = parseDatePickerDate(dateFilter.value.endDate)
        if (end) {
            end.setHours(23, 59, 59, 999)
        }

        return matches.filter(m => {
            const matchDate = new Date(m.timestamp * 1000)
            if (start && matchDate < start) return false
            if (end && matchDate > end) return false
            return true
        })
    })

    const setQuickRange = (range: 'all' | 5 | 10 | 20) => {
        activeQuickRange.value = range
        if (!filteredMatches.value.length) return

        if (range === 'all') {
            dateFilter.value = {
                startDate: minMatchDateStr.value,
                endDate: maxMatchDateStr.value
            }
        } else {
            const slice = filteredMatches.value.slice(0, range)
            if (slice.length) {
                const timestamps = slice.map(m => m.timestamp)
                const minT = Math.min(...timestamps)
                const maxT = Math.max(...timestamps)
                dateFilter.value = {
                    startDate: formatToDatePicker(minT),
                    endDate: formatToDatePicker(maxT)
                }
            }
        }
    }

    const checkActivePreset = () => {
        if (!filteredMatches.value.length) return

        if (dateFilter.value.startDate === minMatchDateStr.value && dateFilter.value.endDate === maxMatchDateStr.value) {
            activeQuickRange.value = 'all'
            return
        }

        for (const range of [5, 10, 20] as const) {
            const slice = filteredMatches.value.slice(0, range)
            if (slice.length) {
                const timestamps = slice.map(m => m.timestamp)
                const minStr = formatToDatePicker(Math.min(...timestamps))
                const maxStr = formatToDatePicker(Math.max(...timestamps))
                if (dateFilter.value.startDate === minStr && dateFilter.value.endDate === maxStr) {
                    activeQuickRange.value = range
                    return
                }
            }
        }

        activeQuickRange.value = '' as any
    }

    // Watch filteredMatches to set default dates
    watch(filteredMatches, (newMatches) => {
        if (newMatches && newMatches.length) {
            dateFilter.value = {
                startDate: minMatchDateStr.value,
                endDate: maxMatchDateStr.value
            }
            activeQuickRange.value = 'all'
        }
    }, { immediate: true })

    // Watch dates to synchronize quick range active state
    watch(() => dateFilter.value, () => {
        checkActivePreset()
    }, { deep: true })

    // ═══════════════════════════════════════════
    // ── MEJORES REGISTROS (Highlight Stats) ──
    // ═══════════════════════════════════════════
    const highlightStats = computed(() => {
        const matches = filteredMatches.value
        if (!matches.length) return []

        let bestRating = 0, bestRatingRival = ''
        let bestGoals = 0, bestGoalsRival = ''
        let bestAssists = 0, bestAssistsRival = ''
        let bestGA = 0, bestGARival = ''
        let currentStreak = 0, maxStreak = 0
        let totalMvp = 0

        // Walk matches newest→oldest for streak, collect bests
        for (const m of matches) {
            const p = findPlayer(m)
            if (!p) continue

            const rival = getRivalName(m)

            if (p.rating > bestRating) { bestRating = p.rating; bestRatingRival = rival }
            if (p.goals > bestGoals) { bestGoals = p.goals; bestGoalsRival = rival }
            if (p.assists > bestAssists) { bestAssists = p.assists; bestAssistsRival = rival }
            if ((p.goals + p.assists) > bestGA) { bestGA = p.goals + p.assists; bestGARival = rival }
            if (p.manOfTheMatch) totalMvp++
        }

        // Win streak (newest first = natural order from API)
        for (const m of matches) {
            if (m.result === 'win') currentStreak++
            else break
        }
        // Max streak scanning all
        let tmpStreak = 0
        for (const m of [...matches].reverse()) {
            if (m.result === 'win') { tmpStreak++; if (tmpStreak > maxStreak) maxStreak = tmpStreak }
            else tmpStreak = 0
        }

        return [
            { icon: '⭐', label: 'Mejor Valoración', value: bestRating.toFixed(1), sub: `vs ${bestRatingRival}` },
            { icon: '⚽', label: 'Máx. Goles', value: bestGoals, sub: `vs ${bestGoalsRival}` },
            { icon: '🅰️', label: 'Máx. Asistencias', value: bestAssists, sub: `vs ${bestAssistsRival}` },
            { icon: '🔥', label: 'Racha Victorias', value: currentStreak > 0 ? `${currentStreak} actual` : `${maxStreak} mejor`, sub: currentStreak > 0 ? 'Racha activa' : 'Récord histórico' },
            { icon: '💥', label: 'Máx. G+A', value: bestGA, sub: `vs ${bestGARival}` },
            { icon: '🏅', label: 'MVPs Totales', value: totalMvp, sub: `${matches.length} partidos` },
            { icon: '📊', label: 'Media Valoración', value: (props.stats?.ratingAve ?? 0).toFixed(2), sub: 'Histórica' },
            { icon: '🎯', label: 'G+A / Partido', value: (props.stats?.goalsPlusAssistsPerMatch ?? 0).toFixed(2), sub: 'Media por partido' },
        ]
    })

    // ═══════════════════════════════════════
    // ── EVOLUCIÓN (Line Chart) ──
    // ═══════════════════════════════════════
    const evolutionChartData = computed(() => {
        const matches = [...chartFilteredMatches.value].reverse() // oldest first
        if (matches.length === 0) return null

        const dataPoints: number[] = []
        const labels: string[] = []

        matches.forEach((m) => {
            const p = findPlayer(m)
            if (!p) return

            let val = 0
            if (evolutionMetric.value === 'rating') val = p.rating
            else if (evolutionMetric.value === 'goals') val = p.goals
            else if (evolutionMetric.value === 'assists') val = p.assists
            else if (evolutionMetric.value === 'goalsPlusAssists') val = p.goals + p.assists

            dataPoints.push(val)
            labels.push(formatDate(m.timestamp))
        })

        const avg = dataPoints.length > 0 ? dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length : 0

        return {
            labels,
            datasets: [
                {
                    label: 'Jugador',
                    data: dataPoints,
                    borderColor: '#C80D0D',
                    backgroundColor: 'rgba(200, 13, 13, 0.08)',
                    borderWidth: 3,
                    pointBackgroundColor: '#C80D0D',
                    pointBorderColor: '#fff',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Su media',
                    data: Array(dataPoints.length).fill(avg),
                    borderColor: 'rgba(166, 173, 187, 0.5)',
                    borderWidth: 2,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    fill: false,
                    tension: 0
                }
            ]
        }
    })

    const evolutionOptions = computed<ChartOptions<'line'>>(() => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
            x: {
                grid: { color: 'rgba(166, 173, 187, 0.08)' },
                ticks: {
                    color: 'rgba(166, 173, 187, 0.5)',
                    font: { size: 10, weight: 'bold' },
                    maxTicksLimit: isMobile.value ? 5 : 10
                }
            },
            y: {
                grid: { color: 'rgba(166, 173, 187, 0.08)' },
                ticks: {
                    color: 'rgba(166, 173, 187, 0.5)',
                    font: { size: 11 },
                    stepSize: evolutionMetric.value === 'rating' ? 1 : undefined
                },
                suggestedMin: evolutionMetric.value === 'rating' ? 4 : 0
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1D232A',
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                titleFont: { weight: 'bold' },
                callbacks: {
                    title: (context) => {
                        const idx = context[0].dataIndex
                        const matches = [...chartFilteredMatches.value].reverse()
                        const m = matches[idx]
                        if (m) {
                            return `${formatDate(m.timestamp)} · vs ${getRivalName(m)}`
                        }
                        return context[0].label
                    },
                    label: (context) => {
                        const isPlayer = context.datasetIndex === 0
                        const prefix = isPlayer ? 'Jugador: ' : 'Su media: '

                        let metricName = ''
                        if (evolutionMetric.value === 'rating') metricName = 'Val'
                        else if (evolutionMetric.value === 'goals') metricName = 'Goles'
                        else if (evolutionMetric.value === 'assists') metricName = 'Asistencias'
                        else if (evolutionMetric.value === 'goalsPlusAssists') metricName = 'G+A'

                        const valueStr = context.parsed.y.toFixed(evolutionMetric.value === 'rating' ? (isPlayer ? 1 : 2) : 0)
                        return `${prefix}${valueStr} (${metricName})`
                    }
                }
            }
        }
    }))

    // ═══════════════════════════════════════
    // ── FORMA RECIENTE ──
    // ═══════════════════════════════════════
    const recentMatchesData = computed(() => {
        const matches = filteredMatches.value.slice(0, recentCount)
        return matches.map(m => {
            const p = findPlayer(m)
            return p ? p.rating : 0
        }).reverse() // oldest → newest for display
    })

    const recentDelta = computed(() => {
        const ratings = recentMatchesData.value
        if (ratings.length === 0) return 0
        const recentAvg = ratings.reduce((a, b) => a + b, 0) / ratings.length
        const overallAvg = props.stats?.ratingAve ?? 0
        return recentAvg - overallAvg
    })

    const recentBarData = computed(() => {
        const ratings = recentMatchesData.value
        if (ratings.length === 0) return null
        const avg = props.stats?.ratingAve ?? 0

        return {
            labels: ratings.map(r => r.toFixed(1)),
            datasets: [{
                data: ratings,
                backgroundColor: ratings.map(r => r >= avg ? '#C80D0D' : 'rgba(200, 13, 13, 0.4)'),
                borderRadius: 4,
                barThickness: isMobile.value ? 28 : 40,
                maxBarThickness: 50
            }]
        }
    })

    const recentBarOptions = computed<ChartOptions<'bar'>>(() => ({
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: 'rgba(166, 173, 187, 0.5)',
                    font: { size: 11, weight: 'bold' }
                }
            },
            y: {
                display: false,
                suggestedMin: 0,
                suggestedMax: 10
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1D232A',
                padding: 12,
                cornerRadius: 8,
                displayColors: false
            }
        }
    }))

    // Form Outcome Circles (W / D / L)
    const recentResults = computed(() => {
        const matches = filteredMatches.value.slice(0, recentCount)
        return matches.map(m => {
            const rival = getRivalName(m)
            if (m.result === 'win') {
                return { text: 'V', class: 'bg-green-500', tooltip: `Victoria vs ${rival}` }
            } else if (m.result === 'tie') {
                return { text: 'E', class: 'bg-gray-500 dark:bg-neutral-600', tooltip: `Empate vs ${rival}` }
            } else {
                return { text: 'D', class: 'bg-red-500', tooltip: `Derrota vs ${rival}` }
            }
        }).reverse()
    })

    // Brief Stats Summary of the last 5 matches
    const recentStatsSummary = computed(() => {
        const slice = filteredMatches.value.slice(0, recentCount)
        let goals = 0, assists = 0, minutes = 0
        slice.forEach(m => {
            const p = findPlayer(m)
            if (p) {
                goals += p.goals ?? 0
                assists += p.assists ?? 0
                minutes += Math.round(p.minutesPlayed ?? 0)
            }
        })
        return { goals, assists, minutes }
    })

    // ═══════════════════════════════════════
    // ── ÚLTIMOS PARTIDOS (Table) ──
    // ═══════════════════════════════════════
    interface MatchRow {
        matchId: number
        rivalName: string
        matchType: string
        rating: number
        goals: number
        assists: number
        minutes: number
        manOfTheMatch: boolean
        position: string
        date: string
    }

    const matchRows = computed<MatchRow[]>(() => {
        return filteredMatches.value
            .map(m => {
                const p = findPlayer(m)
                if (!p) return null
                return {
                    matchId: m.matchId,
                    rivalName: getRivalName(m),
                    matchType: m.matchType,
                    rating: p.rating,
                    goals: p.goals,
                    assists: p.assists,
                    minutes: Math.round(p.minutesPlayed ?? 0),
                    manOfTheMatch: p.manOfTheMatch,
                    position: p.position,
                    date: formatDate(m.timestamp)
                }
            })
            .filter(Boolean) as MatchRow[]
    })

    const visibleMatches = computed(() => {
        if (showAll.value) return matchRows.value
        return matchRows.value.slice(0, initialShowCount)
    })

    const getRatingColor = (rating: number) => {
        if (rating >= 8) return 'text-green-400'
        if (rating >= 7) return 'text-emerald-400'
        if (rating >= 6) return 'text-amber-400'
        return 'text-red-400'
    }
</script>

<style scoped>
    .animate-in {
        animation: slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    }
    @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* MVP row golden left accent */
    .mvp-row {
        border-left: 3px solid rgb(251, 191, 36);
    }
</style>
