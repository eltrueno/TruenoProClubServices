<template>
    <div class="w-full min-h-screen pb-2 rounded-xl" v-if="!isloading && !hasError && playerProfile">
        <!-- Breadcrumbs -->
        <div class="breadcrumbs text-sm ">
            <ul>
                <li><a href="/" class="">Inicio</a></li>
                <li><a href="/plantilla" class="">Plantilla</a></li>
                <li>{{ playerProfile.member.playerName }}</li>
            </ul>
        </div>
        <!-- Hero Section -->
        <section class="bg-base-200 rounded-2xl shadow-md">
            <div class=" mx-auto px-4 py-8 lg:py-12">
                <div class="flex flex-row items-end gap-5 lg:gap-8">
                    <!-- Avatar/Player Photo -->
                    <div class="relative shrink-0 w-28 lg:w-44 aspect-[8/9] dark:bg-base-100 bg-base-300 rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm">
                        <img 
                            :src="playerImage" 
                            :alt="playerProfile.member.playerName" 
                            class="w-full h-full object-contain object-top scale-[1.55] origin-top"
                            @error="handleImageError"
                        />
                    </div>
 
                    <!-- Info -->
                    <div class="flex-1 text-left pb-1">
                        <div class="mb-2 lg:mb-4">
                            <span class="text-primary font-bold text-sm lg:text-2xl uppercase tracking-widest block mb-0.5 lg:mb-1">{{ playerProfile.member.proName }}</span>
                            <h1 class="text-2xl lg:text-5xl font-black tracking-tighter leading-none">{{ playerProfile.member.playerName }}</h1>
                        </div>
                        
                        <div class="flex flex-wrap gap-2 mb-3 lg:mb-4">
                             <div v-for="pos in topPositions" :key="pos.name" class="badge badge-primary badge-sm lg:badge-lg uppercase font-bold py-2 lg:py-3 shadow-sm">
                                {{ translatePosition(pos.name) }}
                                <span class="ml-1.5 font-semibold italic text-[0.95em] bg-base-100/20 rounded">{{ pos.percentage }}%</span>
                             </div>
                        </div>
                        <p v-if="playerProfile.member.proOverall" class="text-base-content/60 text-sm lg:text-lg">
                            {{ playerProfile.member.proHeight }}cm · {{ playerProfile.member.proOverall }} OVR
                        </p>
                    </div>
                </div>

                <!-- Global Filter -->
                <div class="mt-6 flex justify-center">
                    <div class="join dark:bg-base-100 bg-base-300 p-1 rounded-2xl">
                        <button 
                            v-for="mode in ['all', 'official', 'friendly']" 
                            :key="mode"
                            @click="filterMode = mode"
                            class="btn btn-xs lg:btn-sm join-item capitalize border-none px-4 lg:px-6"
                            :class="filterMode === mode ? 'btn-primary shadow-sm' : 'btn-ghost'">
                            {{ mode === 'all' ? 'Todos' : mode === 'official' ? 'Oficiales' : 'Amistosos' }}
                        </button>
                    </div>
                </div>

                <!-- KPI Cards -->
                <div class="flex flex-wrap gap-4 mt-8 lg:mt-12">
                    <div v-for="kpi in kpis" :key="kpi.label" class="kpi-card card dark:bg-base-100 bg-base-300 shadow-sm overflow-hidden group">
                        <div class="card-body p-4 lg:p-6 items-center text-center">
                            <span class="text-base-content/50 uppercase text-xs font-black text-primary tracking-widest">{{ kpi.label }}</span>
                            <span class="text-2xl lg:text-4xl font-black mt-1 tabular-nums">{{ kpi.value }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Tab Navigation + Content (integrated block) -->
        <section class="mx-auto px-1 pt-8">
            <!-- Nav Bar (rounded top only) -->
            <div class="flex justify-around dark:bg-base-100 bg-base-300 rounded-t-2xl rounded-b-sm shadow-md p-1 gap-1">
                <!-- Estadísticas -->
                <button 
                    @click="activeTab = 'estadísticas'"
                    class="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all duration-200"
                    :class="activeTab === 'estadísticas' ? 'bg-primary text-primary-content shadow-sm' : 'hover:bg-base-200'">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span class="text-xs font-semibold hidden lg:block">Estadísticas</span>
                </button>
                <!-- Historial -->
                <button 
                    @click="activeTab = 'historial'"
                    class="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all duration-200"
                    :class="activeTab === 'historial' ? 'bg-primary text-primary-content shadow-sm' : 'hover:bg-base-200'">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span class="text-xs font-semibold hidden lg:block">Historial</span>
                </button>
                <!-- Logros -->
                <button 
                    @click="activeTab = 'logros'"
                    class="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all duration-200"
                    :class="activeTab === 'logros' ? 'bg-primary text-primary-content shadow-sm' : 'hover:bg-base-200'">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <span class="text-xs font-semibold hidden lg:block">Logros</span>
                </button>
                <!-- Comparador -->
                <button 
                    @click="activeTab = 'comparador'"
                    class="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all duration-200"
                    :class="activeTab === 'comparador' ? 'bg-primary text-primary-content shadow-sm' : 'hover:bg-base-200'">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span class="text-xs font-semibold hidden lg:block">Comparador</span>
                </button>
            </div>

            <!-- Tab Content (rounded bottom only, no gap) -->
            <div class="bg-base-200/50 rounded-b-2xl p-2">
                <PlayerDetailStats
                    v-if="activeTab === 'estadísticas'" 
                    :stats="activeStats" 
                    :matches="playerMatches"
                    :currentFilter="filterMode"
                />
                <PlayerDetailWIP v-else-if="activeTab === 'historial'" title="Historial y Progresión" icon="📈" />
                <PlayerDetailWIP v-else-if="activeTab === 'logros'" title="Logros y Premios" icon="🏆" />
                <PlayerDetailWIP v-else-if="activeTab === 'comparador'" title="Comparador" icon="⚔️" />
            </div>
        </section>
    </div>

    <!-- Loading State -->
    <PlayerDetailSkeleton v-else-if="isloading" />

    <!-- Error State -->
    <div class="flex flex-col h-full overflow-hidden" v-else>
        <div class="breadcrumbs text-sm">
            <ul>
                <li><a href="/" class="">Inicio</a></li>
                <li><a href="/plantilla" class="">Jugadores</a></li>
            </ul>
        </div>
        <h3 class="text-center text-2xl p-3">No se ha podido encontrar al jugador</h3>
        <div class="flex place-content-center p-6">
            <img src="/illustrations/bugfixingsvg.svg" class="lg:w-2/3 w-full select-none pointer-events-none" alt="Image representing error">
        </div>
    </div>
</template>

<script setup lang="ts">
    import { ref, computed, onBeforeMount, type Ref } from "vue";
    import PlayerProfileService from "@/services/PlayerProfileService";
    import ClubMatchByPlayerService from "@/services/ClubMatchByPlayerService";
    import PlayerStatsEntity from "@/model/PlayerStatsEntity";
    import { translatePosition } from "@/i18n/translations";

    // Subcomponents
    import PlayerDetailStats from "./PlayerDetailStats.vue";
    import PlayerDetailWIP from "./PlayerDetailWIP.vue";
    import PlayerDetailSkeleton from "./PlayerDetailSkeleton.vue";

    const props = defineProps({
        playerName: {
            type: String,
            required: true
        }
    })

    const playerProfileService = new PlayerProfileService(props.playerName)
    const isloading = playerProfileService.isloading as Ref<boolean>
    const playerProfile = playerProfileService.getData()

    const clubMatchByPlayerService = new ClubMatchByPlayerService(props.playerName)
    const playerMatches = clubMatchByPlayerService.getData()

    const hasError = playerProfileService.getHasError() || clubMatchByPlayerService.getHasError() as Ref<boolean>
    const errorText = playerProfileService.getError() || clubMatchByPlayerService.getError() as Ref<string>

    // State
    const filterMode = ref('all') // all, official, friendly
    const activeTab = ref('estadísticas')

    const fetchData = async () => {
        await playerProfileService.fetch()
        await clubMatchByPlayerService.fetch()
    }

    onBeforeMount(fetchData)

    const playerImage = computed(() => {
        if (!playerProfile.value) return '/players/placeholder_top_transp.png'
        return `/players/${playerProfile.value.member.playerName}_top_transp.png`
    })

    const handleImageError = (e: any) => {
        e.target.src = '/players/placeholder_top_transp.png'
    }

    const topPositions = computed(() => {
        if (!activeStats.value?.playedPositions || !activeStats.value.gamesPlayed) return []
        const total = activeStats.value.gamesPlayed
        return Object.entries(activeStats.value.playedPositions)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([pos, count]) => ({
                name: pos,
                percentage: Math.round(((count as number) / total) * 100)
            }))
    })

    const activeStats = computed(() => {
        if (!playerProfile.value) return {} as PlayerStatsEntity
        const { official, friendly } = playerProfile.value.stats as { official: PlayerStatsEntity, friendly: PlayerStatsEntity }
        if (filterMode.value === 'official') return official
        if (filterMode.value === 'friendly') return friendly

        const merged = new PlayerStatsEntity({ ...official })
        merged.gamesPlayed   += (friendly.gamesPlayed || 0)
        merged.goals         += (friendly.goals || 0)
        merged.assists       += (friendly.assists || 0)
        merged.wins          += (friendly.wins || 0)
        merged.losses        += (friendly.losses || 0)
        merged.ties          += (friendly.ties || 0)
        merged.minutesPlayed += (friendly.minutesPlayed || 0)
        merged.shots         += (friendly.shots || 0)
        merged.saves         += (friendly.saves || 0)
        merged.tacklesMade   += (friendly.tacklesMade || 0)
        merged.tacklesSuccess+= (friendly.tacklesSuccess || 0)
        merged.passesMade    += (friendly.passesMade || 0)
        merged.passesSuccess += (friendly.passesSuccess || 0)
        merged.cleanSheets   += (friendly.cleanSheets || 0)
        merged.goalsConceded += (friendly.goalsConceded || 0)
        merged.redCards      += (friendly.redCards || 0)
        merged.manOfTheMatch += (friendly.manOfTheMatch || 0)
        merged.hattricks     += (friendly.hattricks || 0)
        merged.pokers        += (friendly.pokers || 0)
        merged.ratingSum     += (friendly.ratingSum || 0)

        // Merge playedPositions
        const mergedPositions: Record<string, number> = { ...(official.playedPositions || {}) }
        if (friendly.playedPositions) {
            Object.entries(friendly.playedPositions).forEach(([pos, count]) => {
                mergedPositions[pos] = (mergedPositions[pos] || 0) + (count as number)
            })
        }
        merged.playedPositions = mergedPositions

        merged.computeAggregatedStats()
        return merged
    })

    const kpis = computed(() => [
        { label: 'Partidos', value: activeStats.value.gamesPlayed ?? 0 },
        { label: 'Goles', value: activeStats.value.goals ?? 0 },
        { label: 'Asistencias', value: activeStats.value.assists ?? 0 },
        { label: 'Valoración', value: (activeStats.value.ratingAve ?? 0).toFixed(1) },
        { label: 'Rojas', value: activeStats.value.redCards ?? 0 },
        { label: 'Winrate', value: (activeStats.value.winRate ?? 0).toFixed(1)+"%" },
        { label: 'MVP', value: activeStats.value.manOfTheMatch ?? 0 }
    ])
</script>

<style scoped>
    .tab-active {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .kpi-card {
        flex: 1 1 calc(50% - 1rem);
        max-width: 100%;
    }
    @media (min-width: 1024px) {
        .kpi-card {
            flex: 1 1 calc(25% - 1rem);
        }
    }
</style>
