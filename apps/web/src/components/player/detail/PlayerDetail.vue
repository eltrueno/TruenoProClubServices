<template>
    <div class="w-full min-h-screen bg-base-200/50 pb-2 rounded-xl" v-if="!isloading && !hasError && playerProfile">
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
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 lg:mt-12">
                    <div v-for="kpi in kpis" :key="kpi.label" class="card dark:bg-base-100 bg-base-300 shadow-sm overflow-hidden group">
                        <div class="card-body p-4 lg:p-6 items-center text-center">
                            <span class="text-base-content/50 uppercase text-xs font-black text-primary tracking-widest">{{ kpi.label }}</span>
                            <span class="text-2xl lg:text-4xl font-black mt-1 tabular-nums">{{ kpi.value }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Tabs Section -->
        <section class="mx-auto px-4 py-8">
            <div class="overflow-x-auto mb-8">
                <div role="tablist" class="tabs tabs-bordered flex-nowrap whitespace-nowrap min-w-max">
                    <a 
                        v-for="tab in ['estadísticas', 'historial y progresión', 'logros', 'comparador']" 
                        :key="tab"
                        role="tab" 
                        class="tab capitalize"
                        :class="activeTab === tab ? 'tab-active font-semibold !border-primary' : ''"
                        @click="activeTab = tab">
                        {{ tab }}
                    </a>
                </div>
            </div>

            <!-- Tab Content (Modularized) -->
            <PlayerDetailStats 
                v-if="activeTab === 'estadísticas'" 
                :stats="activeStats" 
                :matches="playerMatches"
                :currentFilter="filterMode"
            />
            <PlayerDetailWIP v-else-if="activeTab === 'historial y progresión'" title="Historial y Progresión" icon="📈" />
            <PlayerDetailWIP v-else-if="activeTab === 'logros'" title="Logros y Premios" icon="🏆" />
            <PlayerDetailWIP v-else-if="activeTab === 'comparador'" title="Comparador" icon="⚔️" />
        </section>
    </div>

    <!-- Loading State -->
    <PlayerDetailSkeleton v-else-if="isloading" />

    <!-- Error State -->
    <div v-else class="min-h-screen flex flex-col items-center justify-center bg-base-200 p-4">
        <div class="bg-base-100 p-10 rounded-3xl text-center max-w-md border border-error/30 shadow-2xl">
            <div class="bg-error/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h2 class="text-3xl font-black text-error mb-4 uppercase">Error en la carga</h2>
            <p class="mb-8 opacity-70 text-lg leading-relaxed">{{ errorText || 'No se han podido obtener los datos del jugador en este momento.' }}</p>
            <button class="btn btn-primary btn-block text-lg h-14" @click="fetchData">Intentar de nuevo</button>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { ref, computed, onBeforeMount, type Ref } from "vue";
    import PlayerProfileService from "@/services/PlayerProfileService";
    import ClubMatchByPlayerService from "@/services/ClubMatchByPlayerService";
    import PlayerStatsEntity from "@/model/PlayerStatsEntity";
    import ClubMatchEntity from "@/model/match/ClubMatchEntity";
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
            .slice(0, 2)
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
        merged.gamesPlayed   += friendly.gamesPlayed
        merged.goals         += friendly.goals
        merged.assists       += friendly.assists
        merged.wins          += friendly.wins
        merged.losses        += friendly.losses
        merged.ties          += friendly.ties
        merged.minutesPlayed += friendly.minutesPlayed
        merged.shots         += friendly.shots
        merged.saves         += friendly.saves
        merged.tacklesMade   += friendly.tacklesMade
        merged.tacklesSuccess+= friendly.tacklesSuccess
        merged.passesMade    += friendly.passesMade
        merged.passesSuccess += friendly.passesSuccess
        merged.cleanSheets   += friendly.cleanSheets
        merged.goalsConceded += friendly.goalsConceded
        merged.redCards      += friendly.redCards
        merged.manOfTheMatch += friendly.manOfTheMatch
        merged.hattricks     += friendly.hattricks
        merged.pokers        += friendly.pokers
        merged.ratingSum     += friendly.ratingSum
        merged.computeAggregatedStats()
        return merged
    })

    const kpis = computed(() => [
        { label: 'Partidos', value: activeStats.value.gamesPlayed },
        { label: 'Goles', value: activeStats.value.goals },
        { label: 'Asistencias', value: activeStats.value.assists },
        { label: 'Valoración', value: activeStats.value.ratingAve?.toFixed(1) }
    ])
</script>

<style scoped>
    .tab-active {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
</style>
