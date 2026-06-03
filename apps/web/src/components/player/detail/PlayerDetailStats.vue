<template>
    <div class="flex flex-col gap-8 animate-in mt-1">
        <!-- Radar Card -->
        <div class="card bg-base-200 shadow-md relative">
            <div class="card-body p-6">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <h2 class="card-title text-xl font-black uppercase border-l-4 border-primary pl-4">Desempeño</h2>
                </div>
                
                <div class="flex flex-col lg:flex-row gap-10 items-center">
                    <div class="w-full max-w-[600px] mx-auto lg:mx-0 flex-shrink-0 flex flex-col gap-1">
                        <!-- Custom Legend -->
                        <div class="flex flex-wrap justify-center gap-x-4">
                            <!-- Histórico Toggle -->
                            <button 
                                @click="toggleDataset(0)"
                                class="group flex items-center gap-3 px-4 py-2 rounded-xl border-2 transition-all duration-300"
                                :class="visibleDatasets[0] ? 'border-primary/30 bg-primary/5 shadow-sm hover:border-primary/50' : 'border-base-content/5 bg-base-100 hover:bg-base-200 opacity-60 grayscale'"
                            >
                                <div class="relative flex items-center justify-center w-6 h-4">
                                    <div class="absolute w-full h-[3px] bg-[#C80D0D] rounded-full"></div>
                                    <div class="absolute w-2.5 h-2.5 rounded-full bg-[#C80D0D] border-[2px] border-white z-10 box-content shadow-sm"></div>
                                </div>
                                <span class="text-xs font-black uppercase tracking-wider text-base-content">Histórico</span>
                                <div class="relative w-4 h-4 ml-1">
                                    <svg class="absolute inset-0 text-primary transition-opacity duration-300" :class="visibleDatasets[0] ? 'opacity-100' : 'opacity-0'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    <svg class="absolute inset-0 text-base-content/60 transition-opacity duration-300" :class="!visibleDatasets[0] ? 'opacity-100' : 'opacity-0'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                </div>
                            </button>

                            <!-- Últimos Toggle -->
                            <button 
                                @click="toggleDataset(1)"
                                class="group flex items-center gap-3 px-4 py-2 rounded-xl border-2 transition-all duration-300"
                                :class="visibleDatasets[1] ? 'border-primary/30 bg-primary/5 shadow-sm hover:border-primary/50' : 'border-base-content/5 bg-base-100 hover:bg-base-200 opacity-60 grayscale'"
                            >
                                <div class="relative flex items-center justify-center w-6 h-4">
                                    <div class="absolute w-full h-0 border-t-[2.5px] border-dashed border-[rgba(200,13,13,0.5)]"></div>
                                    <div class="absolute w-2 h-2 rounded-full bg-[rgba(200,13,13,0.4)] border-[1.5px] border-[rgba(200,13,13,0.6)] z-10 box-content"></div>
                                </div>
                                <span class="text-xs font-black uppercase tracking-wider text-base-content">{{ recentLabelComputed }}</span>
                                <div class="relative w-4 h-4 ml-1">
                                    <svg class="absolute inset-0 text-primary transition-opacity duration-300" :class="visibleDatasets[1] ? 'opacity-100' : 'opacity-0'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    <svg class="absolute inset-0 text-base-content/60 transition-opacity duration-300" :class="!visibleDatasets[1] ? 'opacity-100' : 'opacity-0'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                </div>
                            </button>
                        </div>
                        <div class="aspect-square w-full relative">
                            <Radar ref="radarChart" :data="radarData" :options="radarOptions" />
                        </div>
                    </div>
                    <div class="w-full flex flex-col gap-4">
                        <div class="flex justify-center">
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
                                >Últimos 5</button>
                                <button
                                    @click="statMode = 'last10'"
                                    class="grow sm:grow-0 btn btn-xs join-item"
                                    :class="statMode === 'last10' ? 'btn-primary' : 'btn-ghost'"
                                >Últimos 10</button>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
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
    import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
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
    import PlayerProfileEntity from '@/model/PlayerProfileEntity';

    ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, RadarController);

    const props = defineProps<{
        profile: PlayerProfileEntity
        stats: PlayerStatsEntity,
        matches: ClubMatchEntity[] | undefined
        currentFilter: string
        positionFilter: Position | null
    }>()


    const hoveredIdx = ref<number | null>(null)
    const isHoveringChart = ref(false)
    const radarChart = ref<any>(null)

    const isMobile = ref(false)
    const updateMobile = () => {
        isMobile.value = window.innerWidth < 640
    }

    onMounted(() => {
        updateMobile()
        window.addEventListener('resize', updateMobile)
    })

    onUnmounted(() => {
        window.removeEventListener('resize', updateMobile)
    })

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
            mostPlayedPosition: props.profile.mostPlayedPosition
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
        const isGK = (props.profile.mostPlayedPosition === Position.goalkeeper && props.positionFilter === null) || props.positionFilter === Position.goalkeeper

        const norm = (val: number, expectedMax: number) =>
            Math.min(Math.max((val / expectedMax) * 100, 0), 100)

        return [
            { label: 'Valoración',    key: 'ratingAve',                raw: s.ratingAve,                max: 10,  val: norm(s.ratingAve, 10) },
            { label: 'G+A/Partido',   key: 'goalsPlusAssistsPerMatch', raw: s.goalsPlusAssistsPerMatch,  max: 1.5, val: norm(s.goalsPlusAssistsPerMatch, 1.5) },
            { label: '% Pase',        key: 'passSuccessRate',          max: 100,                         val: norm(s.passSuccessRate, 100) },
            { label: '% Tackles',     key: 'tackleSuccessRate',        max: 100,                         val: norm(s.tackleSuccessRate, 100) },
            { label: '% Imbatido',    key: 'cleanSheetsPercent',       max: 100,                         val: norm(s.cleanSheetsPercent, 100) },
            isGK
                ? { label: '% Paradas', key: 'savesPercent',    max: 100, val: norm(s.savesPercent, 100) }
                : { label: '% Tiro',    key: 'shotSuccessRate', max: 100, val: norm(s.shotSuccessRate, 100) },
            { label: '% MVP',         key: 'manOfTheMatchPercent',     max: 100,                         val: norm(s.manOfTheMatchPercent, 30) },
            { label: '% Victorias',   key: 'winRate',                  max: 100,                         val: norm(s.winRate, 100) }
        ]
    })

    const lastRecentMode = ref<'last5' | 'last10'>('last5')

    watch(statMode, (newMode) => {
        if (newMode !== 'total') {
            lastRecentMode.value = newMode
        }
    })

    const visibleDatasets = ref([true, true])
    
    const toggleDataset = (index: number) => {
        const isVisible = !visibleDatasets.value[index]
        visibleDatasets.value[index] = isVisible
        
        const chart = radarChart.value?.chart
        if (chart) {
            if (isVisible) {
                chart.show(index)
            } else {
                chart.hide(index)
            }
        }
    }

    const recentLabelComputed = computed(() => {
        const recentKey = statMode.value === 'total' ? lastRecentMode.value : statMode.value
        return recentKey === 'last10' ? 'Últimos 10' : 'Últimos 5'
    })

    const radarData = computed(() => {
        const historicalPoints = getRadarDataPoints(props.stats)
        
        const recentKey = statMode.value === 'total' ? lastRecentMode.value : statMode.value
        const recentStatsObj = recentKey === 'last10' ? last10Stats.value : last5Stats.value
        const recentPoints = getRadarDataPoints(recentStatsObj)
        
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
                    backgroundColor: colors.highlight.bg,
                    borderColor: colors.highlight.border,
                    borderWidth: 3,
                    borderDash: [],
                    pointBackgroundColor: colors.highlight.point,
                    pointBorderColor: '#fff',
                    pointRadius: 4,
                    order: 1
                },
                {
                    label: recentLabelComputed.value,
                    data: recentPoints,
                    fill: true,
                    backgroundColor: colors.faded.bg,
                    borderColor: colors.faded.border,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointBackgroundColor: 'rgba(200, 13, 13, 0.4)',
                    pointBorderColor: 'rgba(200, 13, 13, 0.6)',
                    pointRadius: 3,
                    order: 2
                }
            ]
        }
    })

    const getRadarDataPoints = (s: PlayerStatsEntity) => {
        const isGK = (props.profile.mostPlayedPosition === Position.goalkeeper && props.positionFilter === null) || props.positionFilter === Position.goalkeeper
        
        const norm = (val: number, expectedMax: number) =>
            Math.min(Math.max((val / expectedMax) * 100, 0), 100)

        return [
            norm(s.ratingAve, 10),
            norm(s.goalsPlusAssistsPerMatch, 1.5),
            norm(s.passSuccessRate, 100),
            norm(s.tackleSuccessRate, 100),
            norm(s.cleanSheetsPercent, 100),
            isGK ? norm(s.savesPercent, 100) : norm(s.shotSuccessRate, 100),
            norm(s.manOfTheMatchPercent, 30),
            norm(s.winRate, 100)
        ]
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
                    display: !isMobile.value,
                    font: { size: 12, weight: 'bold', family: 'Inter' },
                    color: '#A6ADBB',
                    padding: 10
                }
            }
        },
        plugins: {
            legend: { 
                display: false
            },
            tooltip: {
                backgroundColor: '#1D232A',
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: (context) => {
                        const idx = context.dataIndex
                        const metric = radarMetrics.value[idx]
                        if (!metric) return ''
                        
                        const isHistorical = context.datasetIndex === 0
                        const s = isHistorical ? props.stats : (statMode.value === 'total' ? (lastRecentMode.value === 'last10' ? last10Stats.value : last5Stats.value) : (statMode.value === 'last10' ? last10Stats.value : last5Stats.value))
                        
                        const rawVal = (s as any)[metric.key]
                        const val = rawVal ?? 0
                        let displayStr = ''
                        
                        if (typeof val === 'number' && isNaN(val)) displayStr = '0'
                        else if (metric.key === 'ratingAve') displayStr = val.toFixed(1)
                        else if (metric.key.toLowerCase().includes('rate') || metric.key.toLowerCase().includes('percent')) displayStr = val.toFixed(1) + '%'
                        else if (metric.key === 'goalsPlusAssistsPerMatch') displayStr = val.toFixed(2)
                        else displayStr = Number.isInteger(val) ? val.toString() : val.toFixed(0)

                        return `${context.dataset.label}: ${displayStr}`
                    }
    }
            }
        }
    }))

    watch(hoveredIdx, (newIdx) => {
        // Prevent feedback loop when hovering directly on the chart
        if (isHoveringChart.value) return

        const chart = radarChart.value?.chart
        if (!chart) return

        if (newIdx !== null) {
            const targetDataset = statMode.value === 'total' ? 0 : 1;
            chart.setActiveElements([{ datasetIndex: targetDataset, index: newIdx }])
            chart.tooltip.setActiveElements([{ datasetIndex: targetDataset, index: newIdx }], { x: 0, y: 0 })
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
