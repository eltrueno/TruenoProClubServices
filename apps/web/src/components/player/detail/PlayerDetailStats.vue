<template>
    <div class="flex flex-col gap-8 animate-in mt-2">
        <!-- Radar Card -->
        <div class="card bg-base-200 shadow-md relative">
            <div class="card-body p-6">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <h2 class="card-title text-xl font-black uppercase border-l-4 border-primary pl-4">Desempeño</h2>
                    
                    <div class="join dark:bg-base-100 bg-base-300 p-1 rounded-2xl w-full sm:w-auto">
                        <button
                            @click="statMode = 'total'"
                            class="grow sm:grow-0 btn btn-xs join-item"
                            :class="statMode === 'total' ? 'btn-primary' : 'btn-ghost'"
                        >Histórico</button>
                        <button
                            @click="statMode = 'last5'"
                            class="grow sm:grow-0 btn btn-xs join-item"
                            :class="statMode === 'last5' ? 'btn-primary' : 'btn-ghost'"
                        >Últ. 5</button>
                        <button
                            @click="statMode = 'last10'"
                            class="grow sm:grow-0 btn btn-xs join-item"
                            :class="statMode === 'last10' ? 'btn-primary' : 'btn-ghost'"
                        >Últ. 10</button>
                    </div>
                </div>
                
                <div class="flex flex-col lg:flex-row gap-12 items-center">
                    <div class="w-full max-w-[520px] mx-auto lg:mx-0 flex-shrink-0 aspect-square">
                        <Radar ref="radarChart" :data="radarData" :options="radarOptions" />
                    </div>
                    <div class="w-full grid grid-cols-2 gap-4">
                        <div 
                            v-for="(m, index) in radarMetrics" 
                            :key="m.label" 
                            @mouseenter="hoveredIdx = index; isHoveringChart = false"
                            @mouseleave="hoveredIdx = null"
                            class="dark:bg-base-100 bg-base-300 p-4 rounded-2xl text-center border-2 border-transparent transition-all duration-200 cursor-default"
                            :class="{ '!border-primary ring-1 ring-primary/20 shadow-lg': hoveredIdx === index }"
                        >
                            <p class="text-xs uppercase font-bold mb-1 transition-colors" :class="{ 'text-primary': hoveredIdx === index, 'opacity-50': hoveredIdx !== index }">{{ m.label }}</p>
                            <p class="text-2xl font-black tabular-nums transition-colors">{{ formatRadarDisplay(m) }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Detailed Stats Panels -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div v-for="group in statGroups" :key="group.title" class="group h-full">
                <div class="card h-full bg-base-200 border border-base-300 shadow-md transition-all duration-300">
                    <div class="card-body p-6">
                        <h3 class="flex items-center gap-3 text-lg font-black uppercase tracking-tight mb-6">
                            <span class="p-2 bg-primary/10 rounded-lg">
                                <!-- Dynamic Icon Placeholder -->
                                <svg v-if="group.icon === 'trophy'" class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <svg v-else-if="group.icon === 'sword'" class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                <svg v-else-if="group.icon === 'move'" class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                                <svg v-else class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                            </span>
                            {{ group.title }}
                        </h3>
                        <div class="space-y-4">
                            <div v-for="stat in group.stats" :key="stat.label" class="flex items-center justify-between pb-3 border-b border-base-content/5 last:border-0 group/row">
                                <span class="text-sm font-medium text-base-content/60">{{ stat.label }}</span>
                                <span class="text-lg font-bold tabular-nums">{{ formatValue(stat) }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { computed, ref, watch } from 'vue';
    import { 
        Chart as ChartJS, 
        RadialLinearScale, 
        PointElement, 
        LineElement, 
        Filler, 
        Tooltip, 
        Legend,
        RadarController,
        type ChartOptions
    } from 'chart.js';
    import { Radar } from 'vue-chartjs';
    import { translatePosition, Position } from '@/i18n/translations';
    import PlayerStatsEntity from '@/model/PlayerStatsEntity';
    import ClubMatchEntity from '@/model/match/ClubMatchEntity';

    ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, RadarController);

    const props = defineProps<{
        stats: PlayerStatsEntity,
        matches: ClubMatchEntity[] | undefined
        currentFilter: string
    }>()

    const hoveredIdx = ref<number | null>(null)
    const isHoveringChart = ref(false)
    const radarChart = ref<any>(null)

    const getAggregatedStats = (count: number) => {
        if (!props.matches || props.matches.length === 0) return props.stats
        
        // Filter matches based on the current filter mode
        const filteredMatches = props.matches.filter(m => {
            if (props.currentFilter === 'all') return true;
            if (props.currentFilter === 'official') return (m.matchType === 'league' || m.matchType === 'playoff');
            if (props.currentFilter === 'friendly') return (m.matchType !== 'league' && m.matchType !== 'playoff');
            return true;
        });

        if (filteredMatches.length === 0) return props.stats
        
        const recentMatches = filteredMatches.slice(0, count)
        const aggregated: any = {
            gamesPlayed: 0,
            ratingSum: 0,
            goals: 0,
            assists: 0,
            shots: 0,
            passesMade: 0,
            passesSuccess: 0,
            tacklesMade: 0,
            tacklesSuccess: 0,
            saves: 0,
            goalsConceded: 0,
            cleanSheets: 0,
            manOfTheMatch: 0,
            redCards: 0,
            wins: 0,
            losses: 0,
            ties: 0,
            minutesPlayed: 0,
            playedPositions: {},
            mostPlayedPosition: props.stats.mostPlayedPosition
        }

        recentMatches.forEach(match => {
            const playerInMatch = match.localClub.players.find(p => p.playername.toLowerCase() === props.stats.playerName.toLowerCase()) 
                                || match.awayClub.players.find(p => p.playername.toLowerCase() === props.stats.playerName.toLowerCase())
            
            if (playerInMatch) {
                aggregated.gamesPlayed++
                aggregated.ratingSum += playerInMatch.rating
                aggregated.goals += playerInMatch.goals
                aggregated.assists += playerInMatch.assists
                aggregated.shots += playerInMatch.shots
                aggregated.passesMade += playerInMatch.passesMade
                aggregated.passesSuccess += playerInMatch.passesSuccess
                aggregated.tacklesMade += playerInMatch.tacklesMade
                aggregated.tacklesSuccess += playerInMatch.tacklesSuccess
                aggregated.saves += playerInMatch.saves
                aggregated.goalsConceded += playerInMatch.goalsConceded
                if (playerInMatch.goalsConceded === 0) aggregated.cleanSheets++
                if (playerInMatch.manOfTheMatch) aggregated.manOfTheMatch++
                aggregated.redCards += playerInMatch.redCards
                aggregated.minutesPlayed += (playerInMatch.minutesPlayed || 0)

                const pos = playerInMatch.position as Position
                aggregated.playedPositions[pos] = (aggregated.playedPositions[pos] || 0) + 1
                
                if (match.result === 'win') aggregated.wins++
                else if (match.result === 'loose') aggregated.losses++
                else aggregated.ties++
            }
        })

        if (aggregated.gamesPlayed === 0) return props.stats

        let maxCount = -1
        Object.entries(aggregated.playedPositions).forEach(([pos, count]) => {
            if ((count as number) > maxCount) {
                maxCount = count as number
                aggregated.mostPlayedPosition = pos as Position
            }
        })

        return new PlayerStatsEntity(aggregated)
    }

    const last5Stats = computed(() => getAggregatedStats(5))
    const last10Stats = computed(() => getAggregatedStats(10))

    type StatMode = 'total' | 'last5' | 'last10'
    const statMode = ref<StatMode>('total')

    const currentStats = computed(() => {
        if (statMode.value === 'last5') return last5Stats.value
        if (statMode.value === 'last10') return last10Stats.value
        return props.stats
    })

    const formatValue = (stat: any) => {
        const raw = (props.stats as any)[stat.key]
        const val = raw ?? 0
        if (typeof val === 'number' && isNaN(val)) return '0'
        if (stat.type === 'percent' || stat.fixed) return val.toFixed(1) + '%'
        if (stat.type === 'decimal') return typeof val === 'number' ? val.toFixed(2) : val
        if (typeof val === 'number' && !Number.isInteger(val)) return val.toFixed(2)
        return val
    }

    const formatRadarDisplay = (m: any) => {
        const rawVal = m.raw !== undefined ? m.raw : (currentStats.value as any)[m.key]
        const val = rawVal ?? 0
        if (typeof val === 'number' && isNaN(val)) return '0'
        
        if (m.key === 'ratingAve') return val.toFixed(1)
        if (m.key.toLowerCase().includes('rate') || m.key.toLowerCase().includes('percent')) return val.toFixed(1) + '%'
        if (m.key === 'goalsPlusAssistsPerMatch') return val.toFixed(2)
        
        return Number.isInteger(val) ? val : val.toFixed(0)
    }

    const statGroups = computed(() => [
        {
            title: 'Participación',
            icon: 'trophy',
            stats: [
                { label: 'Partidos Jugados', key: 'gamesPlayed', type: 'count' },
                { label: 'Minutos Jugados', key: 'minutesPlayed', type: 'count' },
                { label: 'Rating medio', key: 'ratingAve', type: 'decimal' },
                { label: 'Tarjetas rojas', key: 'redCards', type: 'count' },
                { label: 'Tarjetas rojas/partido', key: 'redCardsPerMatch', type: 'decimal' },
                { label: 'Victorias', key: 'wins', type: 'count' },
                { label: '% Victorias', key: 'winRate', type: 'percent', fixed: true },
                { label: 'MVPs', key: 'manOfTheMatch', type: 'count' },
                { label: '% MVPs', key: 'manOfTheMatchPercent', type: 'percent', fixed: true },
                { label: 'Porterías a 0', key: 'cleanSheets', type: 'count' },
                { label: '% Porterías a 0', key: 'cleanSheetsPercent', type: 'percent', fixed: true }
            ]
        },
        {
            title: 'Ataque',
            icon: 'sword',
            stats: [
                { label: 'Goles', key: 'goals', type: 'count' },
                { label: 'Goles / partido', key: 'goalsPerMatch', type: 'decimal' },
                { label: 'Asistencias', key: 'assists', type: 'count' },
                { label: 'Asistencias/partido', key: 'assistsPerMatch', type: 'decimal' },
                { label: 'Goles+Asistencias', key: 'goalsPlusAssists', type: 'count' },
                { label: 'G+A por partido', key: 'goalsPlusAssistsPerMatch', type: 'decimal' },
                { label: '% Éxito Tiro', key: 'shotSuccessRate', type: 'percent', fixed: true },
                { label: 'Hattricks', key: 'hattricks', type: 'count' },
                { label: 'Pókers', key: 'pokers', type: 'count' }
            ]
        },
        {
            title: 'Distribución',
            icon: 'move',
            stats: [
                { label: 'Pases', key: 'passesMade', type: 'count' },
                { label: 'Pases / partido', key: 'passesMadePerMatch', type: 'decimal' },
                { label: 'Pases Completados', key: 'passesSuccess', type: 'count' },
                { label: '% Éxito Pase', key: 'passSuccessRate', type: 'percent', fixed: true }
            ]
        },
        {
            title: 'Defensa',
            icon: 'shield',
            stats: [
                { label: 'Entradas', key: 'tacklesMade', type: 'count' },
                { label: 'Entradas con éxito', key: 'tacklesSuccess', type: 'count' },
                { label: '% Éxito Entrada', key: 'tackleSuccessRate', type: 'percent', fixed: true },
                { label: 'Goles Concedidos', key: 'goalsConceded', type: 'count' },
                { label: 'Goles Conc. / partido', key: 'goalsConcededPerMatch', type: 'decimal' },
                { label: 'Paradas (GK)', key: 'saves', type: 'count' },
                { label: 'Paradas / partido', key: 'savesPerMatch', type: 'decimal' }
            ]
        }
    ])

    const radarMetrics = computed(() => {
        const s = currentStats.value
        const isGK = s.mostPlayedPosition === Position.goalkeeper
        
        return [
            { label: 'Valoración',   key: 'ratingAve',           raw: s.ratingAve,           max: 10,  val: s.ratingAve * 10 },
            { label: 'G+A por Partido',  key: 'goalsPlusAssistsPerMatch', max: 10,               val: s.goalsPlusAssistsPerMatch * 10 },
            { label: '% Pase',       key: 'passSuccessRate',     max: 100,                   val: s.passSuccessRate },
            { label: '% Tackles',    key: 'tackleSuccessRate',   max: 100,                   val: s.tackleSuccessRate },
            { label: '% Imbatido',    key: 'cleanSheetsPercent',  max: 100,                   val: s.cleanSheetsPercent },
            isGK 
                ? { label: '% Paradas', key: 'savesPercent', max: 100, val: s.savesPercent }
                : { label: '% Tiro',    key: 'shotSuccessRate', max: 100, val: s.shotSuccessRate },
            { label: '% MVP',        key: 'manOfTheMatchPercent', max: 100,                  val: s.manOfTheMatchPercent },
            { label: '% Victorias',  key: 'winRate',             max: 100,                   val: s.winRate }
        ]
    })

    const lastRecentMode = ref<'last5' | 'last10'>('last5')

    watch(statMode, (newMode) => {
        if (newMode !== 'total') {
            lastRecentMode.value = newMode
        }
    })

    const radarData = computed(() => {
        const historicalPoints = getRadarDataPoints(props.stats)
        
        const isTotal = statMode.value === 'total'
        const recentKey = isTotal ? lastRecentMode.value : statMode.value
        const recentStatsObj = recentKey === 'last10' ? last10Stats.value : last5Stats.value
        const recentPoints = getRadarDataPoints(recentStatsObj)
        const recentLabel = recentKey === 'last10' ? 'Últimos 10' : 'Últimos 5'
        
        const colors = {
            highlight: {
                bg: 'rgba(200, 13, 13, 0.45)',
                border: '#C80D0D',
                point: '#C80D0D'
            },
            faded: {
                bg: 'rgba(200, 13, 13, 0.1)',
                border: 'rgba(200, 13, 13, 0.5)',
                point: 'transparent'
            }
        }

        return {
            labels: radarMetrics.value.map(m => m.label),
            datasets: [
                {
                    label: 'Histórico',
                    data: historicalPoints,
                    fill: true,
                    backgroundColor: isTotal ? colors.highlight.bg : colors.faded.bg,
                    borderColor: isTotal ? colors.highlight.border : colors.faded.border,
                    borderWidth: isTotal ? 3 : 2,
                    borderDash: isTotal ? [] : [5, 5],
                    pointBackgroundColor: isTotal ? colors.highlight.point : colors.faded.point,
                    pointBorderColor: isTotal ? '#fff' : 'transparent',
                    pointRadius: isTotal ? 4 : 0,
                    order: isTotal ? 1 : 2
                },
                {
                    label: recentLabel,
                    data: recentPoints,
                    fill: true,
                    backgroundColor: !isTotal ? colors.highlight.bg : colors.faded.bg,
                    borderColor: !isTotal ? colors.highlight.border : colors.faded.border,
                    borderWidth: !isTotal ? 3 : 2,
                    borderDash: !isTotal ? [] : [5, 5],
                    pointBackgroundColor: !isTotal ? colors.highlight.point : colors.faded.point,
                    pointBorderColor: !isTotal ? '#fff' : 'transparent',
                    pointRadius: !isTotal ? 4 : 0,
                    order: !isTotal ? 1 : 2
                }
            ]
        }
    })

    const getRadarDataPoints = (s: PlayerStatsEntity) => {
        const isGK = s.mostPlayedPosition === Position.goalkeeper
        const points = [
            s.ratingAve * 10,
            s.goalsPlusAssistsPerMatch * 10,
            s.passSuccessRate,
            s.tackleSuccessRate,
            s.cleanSheetsPercent,
            isGK ? s.savesPercent : s.shotSuccessRate,
            s.manOfTheMatchPercent,
            s.winRate
        ]
        return points.map(v => Math.min(v ?? 0, 100))
    }

    const radarOptions = computed<ChartOptions<'radar'>>(() => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'nearest' as const,
            intersect: false,
        },
        onHover: (_event, activeElements) => {
            const nextIdx = activeElements.length > 0 ? activeElements[0].index : null;
            isHoveringChart.value = nextIdx !== null;
            if (hoveredIdx.value !== nextIdx) {
                hoveredIdx.value = nextIdx;
            }
        },
        onLeave: () => {
            isHoveringChart.value = false;
            hoveredIdx.value = null;
        },
        scales: {
            r: {
                type: 'radialLinear',
                angleLines: { display: true, color: 'rgba(166, 173, 187, 0.2)' },
                grid: { color: 'rgba(166, 173, 187, 0.15)', circular: true },
                suggestedMin: 0,
                suggestedMax: 100,
                ticks: { display: false, stepSize: 20 },
                pointLabels: {
                    font: { size: 12, weight: 'bold', family: 'Inter' },
                    color: '#A6ADBB',
                    padding: 10
                }
            }
        },
        plugins: {
            legend: { 
                display: true,
                position: 'top' as const,
                labels: {
                    color: 'rgba(200, 13, 13, 0.8)',
                    font: { size: 12, weight: 'bold' },
                    padding: 20,
                    usePointStyle: true,
                    generateLabels: (chart: any) => {
                        const data = chart.data;
                        return data.datasets.map((dataset: any, i: number) => ({
                            text: dataset.label,
                            datasetIndex: i,
                            fillStyle: dataset.backgroundColor,
                            strokeStyle: dataset.borderColor,
                            lineWidth: dataset.borderWidth,
                            lineDash: dataset.borderDash,
                            pointStyle: 'circle',
                            hidden: !chart.isDatasetVisible(i),
                            // This ensures the legend color matches the current state
                            fontColor: 'rgba(166, 173, 187, 0.8)'
                        }));
                    }
                }
            },
            tooltip: {
                backgroundColor: '#1D232A',
                padding: 12,
                cornerRadius: 8,
                displayColors: false
            }
        }
    }))

    watch(hoveredIdx, (newIdx) => {
        // Prevent feedback loop when hovering directly on the chart
        if (isHoveringChart.value) return

        const chart = radarChart.value?.chart
        if (!chart) return

        if (newIdx !== null) {
            chart.setActiveElements([{ datasetIndex: 0, index: newIdx }])
            chart.tooltip.setActiveElements([{ datasetIndex: 0, index: newIdx }], { x: 0, y: 0 })
        } else {
            chart.setActiveElements([])
            chart.tooltip.setActiveElements([], { x: 0, y: 0 })
        }
        chart.update('none')
    })
</script>

<style scoped>
    .animate-in {
        animation: slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    }
    @keyframes slideUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
