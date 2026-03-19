<template>
<!-- <div role="container" v-if="isloading">Cargando...</div> -->
<div role="container" v-if="!hasError" class="flex flex-wrap  p-6 md:p-10 lg:p-12 justify-center items-center h-fit">

    <div v-if="stats && stats.updatedAt" class="w-full py-0 my-0 font-thin text-xs text-center"><i class="">Datos actualizados el {{new Date(stats.updatedAt).toLocaleDateString()}}</i></div>
    <div role="container" class="flex flex-col justify-between gap-16 items-center p-12 basis-2/2 lg:basis-1/2 h-full w-full statsleft">
        <div class="stats stats-vertical lg:stats-horizontal shadow-md w-full">
            <div class="stat dark:bg-base-200">
                <div class="stat-figure text-secondary">
                    <svg class="inline-block w-8 h-8 stroke-current text-primary" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-width="2" d="M11 5.1a1 1 0 0 1 2 0l1.7 4c.1.4.4.6.8.6l4.5.4a1 1 0 0 1 .5 1.7l-3.3 2.8a1 1 0 0 0-.3 1l1 4a1 1 0 0 1-1.5 1.2l-3.9-2.3a1 1 0 0 0-1 0l-4 2.3a1 1 0 0 1-1.4-1.1l1-4.1c.1-.4 0-.8-.3-1l-3.3-2.8a1 1 0 0 1 .5-1.7l4.5-.4c.4 0 .7-.2.8-.6l1.8-4Z"/>
                    </svg>
                </div>
                <div class="stat-title">Habilidad</div>
                <div class="stat-value">
                    <div v-if="isloading" class="skeleton dark:bg-base-100  w-full h-10 skeletondark"></div>
                    <count-up v-else :end-val="stats.stats.skill"></count-up>
                </div>
            </div>
            <div class="stat dark:bg-base-200">
                <div class="stat-figure text-secondary">
                    <svg class="inline-block w-8 h-8 text-primary" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path fill-rule="evenodd" d="M8.64 4.737A7.97 7.97 0 0 1 12 4a7.997 7.997 0 0 1 6.933 4.006h-.738c-.65 0-1.177.25-1.177.9 0 .33 0 2.04-2.026 2.008-1.972 0-1.972-1.732-1.972-2.008 0-1.429-.787-1.65-1.752-1.923-.374-.105-.774-.218-1.166-.411-1.004-.497-1.347-1.183-1.461-1.835ZM6 4a10.06 10.06 0 0 0-2.812 3.27A9.956 9.956 0 0 0 2 12c0 5.289 4.106 9.619 9.304 9.976l.054.004a10.12 10.12 0 0 0 1.155.007h.002a10.024 10.024 0 0 0 1.5-.19 9.925 9.925 0 0 0 2.259-.754 10.041 10.041 0 0 0 4.987-5.263A9.917 9.917 0 0 0 22 12a10.025 10.025 0 0 0-.315-2.5A10.001 10.001 0 0 0 12 2a9.964 9.964 0 0 0-6 2Zm13.372 11.113a2.575 2.575 0 0 0-.75-.112h-.217A3.405 3.405 0 0 0 15 18.405v1.014a8.027 8.027 0 0 0 4.372-4.307ZM12.114 20H12A8 8 0 0 1 5.1 7.95c.95.541 1.421 1.537 1.835 2.415.209.441.403.853.637 1.162.54.712 1.063 1.019 1.591 1.328.52.305 1.047.613 1.6 1.316 1.44 1.825 1.419 4.366 1.35 5.828Z" clip-rule="evenodd"/>
                    </svg>
                </div>
                <div class="stat-title">Reputación</div>
                <div class="stat-value">
                    <div v-if="isloading" class="skeleton dark:bg-base-100 dark:skeletondark  w-full h-10"></div>
                    <span v-else>{{stats.stats.reputationName}}</span>
                </div>
            </div>
        </div>
        
        <div class="stats stats-vertical lg:stats-horizontal shadow-md w-full">
            <div class="stat dark:bg-base-200">
                <div class="stat-figure text-secondary">
                    <svg class="inline-block w-8 h-8 stroke-current text-primary" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4.5V19c0 .6.4 1 1 1h15M7 14l4-4 4 4 5-5m0 0h-3.2M20 9v3.2"/>
                    </svg>
                </div>
                <div class="stat-title">Mejor división</div>
                <div class="stat-value">
                    <div v-if="isloading" class="skeleton dark:bg-base-100 dark:skeletondark  w-full h-10"></div>
                    <span v-else>{{stats.stats.bestDivisionName}}</span>
                </div>
            </div>
            <div class="stat dark:bg-base-200">
                <div class="stat-figure text-secondary">
                    <svg class="text-primary inline-block w-8 h-8" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.78552 9.5 12.7855 14l9-4.5-9-4.5-8.99998 4.5Zm0 0V17m3-6v6.2222c0 .3483 2 1.7778 5.99998 1.7778 4 0 6-1.3738 6-1.7778V11"/>
                    </svg>

                </div>
                <div class="stat-title">Mejor Playoff</div>
                <div class="stat-value">
                    <div v-if="isloading" class="skeleton dark:bg-base-100 dark:skeletondark  w-full h-10"></div>
                    <span v-else>{{stats.stats.bestFinishGroupName}}</span>
                </div>
            </div>
        </div>
        
        <div class="stats stats-vertical lg:stats-horizontal shadow-md w-full">
            <div class="stat dark:bg-base-200">
                <div class="stat-figure text-secondary">
                    <svg class="inline-block w-8 h-8 stroke-current text-primary" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.1 17.6A7.2 7.2 0 0 1 12 21a6.6 6.6 0 0 1-5.8-3c-2.7-4.6.3-8.8.9-9.7A4.4 4.4 0 0 0 8 4c1.3 1 6.4 3.3 5.5 10.6 1.5-1.1 2.7-3 2.9-6.2 1.4 1 4 5.5 1.7 9.2Z"/>
                    </svg>
                </div>
                <div class="stat-title">Racha victorias</div>
                <div class="stat-value">
                    <div v-if="isloading" class="skeleton dark:bg-base-100 dark:skeletondark w-16 h-10"></div>
                    <count-up v-else :end-val="stats.stats.winstreak"></count-up>
                </div>
            </div>
            <div class="stat dark:bg-base-200">
                <div class="stat-figure text-secondary">
                    <svg class="inline-block w-8 h-8 stroke-current text-primary" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.5 11.5 11 13l4-3.5M12 20A16.4 16.4 0 0 1 5 6.7L12 4l7 2.7A16.7 16.7 0 0 1 12 20Z"/>
                    </svg>
                </div>
                <div class="stat-title">Racha Imbatidos</div>
                <div class="stat-value">
                    <div v-if="isloading" class="skeleton dark:bg-base-100 dark:skeletondark  w-16 h-10 "></div>
                    <count-up v-else :end-val="stats.stats.unbeatenstreak"></count-up>
                </div>
            </div>
        </div>

        <div class="stats stats-vertical lg:stats-horizontal shadow-md w-full">
            <div class="stat dark:bg-base-200">
                <div class="stat-figure text-secondary">
                    <svg class="w-8 h-8 text-primary" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11c.889-.086 1.416-.543 2.156-1.057a22.323 22.323 0 0 0 3.958-5.084 1.6 1.6 0 0 1 .582-.628 1.549 1.549 0 0 1 1.466-.087c.205.095.388.233.537.406a1.64 1.64 0 0 1 .384 1.279l-1.388 4.114M7 11H4v6.5A1.5 1.5 0 0 0 5.5 19v0A1.5 1.5 0 0 0 7 17.5V11Zm6.5-1h4.915c.286 0 .372.014.626.15.254.135.472.332.637.572a1.874 1.874 0 0 1 .215 1.673l-2.098 6.4C17.538 19.52 17.368 20 16.12 20c-2.303 0-4.79-.943-6.67-1.475"/>
                    </svg>
                </div>
                <div class="stat-title">Ascensos</div>
                <div class="stat-value">
                    <div v-if="isloading" class="skeleton dark:bg-base-100 dark:skeletondark w-16 h-10"></div>
                    <count-up v-else :end-val="stats.stats.promotions"></count-up>
                </div>
            </div>
            <div class="stat dark:bg-base-200">
                <div class="stat-figure text-secondary">
                    <svg class="w-8 h-8 text-primary" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13c-.889.086-1.416.543-2.156 1.057a22.322 22.322 0 0 0-3.958 5.084 1.6 1.6 0 0 1-.582.628 1.549 1.549 0 0 1-1.466.087 1.587 1.587 0 0 1-.537-.406 1.666 1.666 0 0 1-.384-1.279l1.389-4.114M17 13h3V6.5A1.5 1.5 0 0 0 18.5 5v0A1.5 1.5 0 0 0 17 6.5V13Zm-6.5 1H5.585c-.286 0-.372-.014-.626-.15a1.797 1.797 0 0 1-.637-.572 1.873 1.873 0 0 1-.215-1.673l2.098-6.4C6.462 4.48 6.632 4 7.88 4c2.302 0 4.79.943 6.67 1.475"/>
                    </svg>
                </div>
                <div class="stat-title">Descensos</div>
                <div class="stat-value">
                    <div v-if="isloading" class="skeleton dark:bg-base-100 dark:skeletondark  w-16 h-10 "></div>
                    <count-up v-else :end-val="stats.stats.relegations"></count-up>
                </div>
            </div>
        </div>


    </div>
    <div role="container" class="flex flex-wrap p-8 basis-2/2 lg:basis-1/2 h-full w-full align-middle justify-center items-center">
        <div id="donutchartnotloaded" v-if="isloading" role="container" class="flex flex-col w-full lg:w-8/12 justify-start items-center dark:bg-base-200 dark:shadow rounded-xl shadow-lg  p-6 h-full statsright">
            <div class="w-full flex flex-col justify-center align-middle items-center">
                <div class="md:hidden w-full flex flex-col justify-center align-middle items-center">
                    <div class="skeleton dark:bg-base-100 dark:skeletondark w-2/3 h-8 p-2"></div>
                    <div class="skeleton dark:bg-base-100 dark:skeletondark w-2/3 h-8 p-2"></div>
                    <div class="skeleton dark:bg-base-100 dark:skeletondark w-2/3 h-8 p-2"></div>
                </div>
                
                <div class="hidden lg:block skeleton dark:bg-base-100 dark:skeletondark w-full h-8 p-2 "></div>

            </div>
            <div class="pt-10">
                <div class="skeleton dark:bg-base-100 dark:skeletondark w-48 h-48 rounded-full"></div>
            </div>
        </div>
        <div v-else class="statsright">
            <div class="hidden dark:block dark:bg-base-200 rounded-xl shadow-md  p-6 statsright">
                <vc-donut 
                :sections="donutsections" 
                :background="'#1D232A'" 
                :thickness=25
                :has-legend="true" legend-placement="top"
                :auto-adjust-text-size="true"
                >
                    <div>
                        <count-up class="text-base-content font-bold text-4xl text-center" :end-val="gamesData.played"></count-up>
                        <p>Partidos</p>
                    </div>
                </vc-donut>
            </div>
            <div class="dark:hidden dark:bg-base-200 rounded-xl shadow-md  p-6 statsright">
                <vc-donut
                :sections="donutsections" 
                :thickness=25
                :has-legend="true" legend-placement="top"
                :auto-adjust-text-size="true"
                >
                    <div>
                        <count-up class="text-base-content font-bold text-4xl text-center" :end-val="gamesData.played"></count-up>
                        <p>Partidos</p>
                    </div>
                </vc-donut>
            </div>
        </div>
    </div>


</div>
<div v-else>Error: {{ errorText }}</div>

</template>

<script lang="ts" setup>
    import ClubStatsService from '@services/ClubStatsService';
    import { onBeforeMount, computed, watch, reactive, ref } from 'vue';
    import CountUp from 'vue-countup-v3'


    const statsService = new ClubStatsService()
    const stats = statsService.getData()
    const isloading = statsService.isloading
    const errorText = statsService.getError()
    const hasError:Boolean = (errorText.value=='') ? false : true


    const gamesData = reactive({
        wins: 0,
        losses: 0,
        ties: 0,
        played: 0
    })


    watch(stats, (newStats) =>{
        if(newStats && (newStats.stats.wins!=null || newStats.stats.wins!=undefined)){
            gamesData.wins = newStats.stats.wins
            gamesData.played = newStats.stats.gamesPlayed
            gamesData.losses = newStats.stats.losses
            gamesData.ties = newStats.stats.ties
            donutsections.value = [
                {label:`Victorias:  ${gamesData.wins} (${trimDecimal(winsPercent.value)}%)`, value: winsPercent.value, color: '#00A96E'},
                {label:`Derrotas:  ${gamesData.losses} (${trimDecimal(lossesPercent.value)}%)`, value: lossesPercent.value, color: '#FF5861'},
                {label:`Empates:  ${gamesData.ties} (${trimDecimal(tiesPercent.value)}%)`, value: tiesPercent.value, color: '#A6ADBB'}
            ]
        }
    })


    const winsPercent = computed( ()=>{
        return (gamesData.wins / gamesData.played) * 100
    })

    const lossesPercent = computed( ()=>{
        return (gamesData.losses / gamesData.played) * 100
    })

    const tiesPercent = computed( ()=>{
        return (gamesData.ties / gamesData.played) * 100
    })

    const donutsections = ref([])

    function trimDecimal(decimal:number){
        return decimal.toFixed(0)
    }

    onBeforeMount(async ()=>{
        await statsService.fetch()
    })
</script>

<style>

@tailwind base;
@tailwind components;
@tailwind utilities;

    @keyframes stats-zoomin-anim {
        from{
            opacity: 0.1;
            scale: 0;
        }
		to {
			opacity: 1;
            scale: 1;
		}
	}
    @keyframes stats-slide-anim {
        from{
            opacity: 0.5;
            transform: translateX(100%);
        }
		to {
			opacity: 1;
		}
	}
    .statsleft {
		animation:  stats-zoomin-anim linear both;
		animation-timeline: view(y);
        animation-range: entry;
        animation-delay: 600ms;
	}
    .statsright {
		animation:  stats-slide-anim linear both;
		animation-timeline: view(y);
        /*animation-range: entry contain 33%;*/
        animation-range: entry;
        animation-delay: 600ms;
	}

    @layer components{
        .skeletondark{
            background-image: linear-gradient( 105deg, transparent 0%, transparent 35%, rgba(108, 108, 108, 0.2)50%, transparent 65%, transparent 100% );
        }
    }

</style>