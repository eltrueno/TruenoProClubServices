<script setup lang="ts">
    import { computed, onBeforeMount, onMounted, ref} from 'vue';
    import CountUp from 'vue-countup-v3'
    import { translatePosition } from '@/i18n/translations';
    const dialog = ref<HTMLDialogElement>();
    const props = defineProps<{
        player: any
    }>()

    const emit = defineEmits([
        'detailModalClosed'
    ])

    function modalClosed(){
        emit('detailModalClosed')
    }


    const showModal = () => {
        dialog.value?.showModal();
    };


    const fullImage = computed(() => {
        return `/players/${props.player.playerName}_top_transp.png`
    })

    function defaultFullImage(e){
        e.target.src = '/players/placeholder_top_transp.png'
    }


    onMounted(async ()=>{
        showModal()
    })

</script>
<template>
    <dialog ref="dialog" id="modal" class="modal modal-middle p-2 lg:p-4" @close="modalClosed()">
        <div class="modal-box overflow-hidden p-1">
            <form method="dialog">
                <button class="btn btn-sm btn-circle btn-ghost fixed right-1 top-1">✕</button>
            </form>
            <header>
                <h3 class="font-bold text-xl text-primary text-center">{{ player.playerName }} <span class="font-semibold text-lg text-base-content">({{ player.proOverall? player.proOverall : "¿?" }})</span></h3>
            </header>
            <section >
                <div class="relative flex container w-full h-96  p-2 overflow-visible">
                    <img :src=fullImage class="absolute plimg select-none pointer-events-none md:w-4/6 h-full object-cover object-left" alt="Player ingame photo" @error="defaultFullImage">
                    <div class="absolute z-20 right-0 top-0 w-8/12 md:w-7/12 ploverlay  rounded-lg  h-full backdrop-blur-2xl">
                        <div v-if="player.stats" class="relative h-full overflow-y-scroll pt-2 w-full customscroll">
                            <div class="absolute h-full space-y-2 w-full pr-1">
                            <div class="font-semibold w-full flex content-center align-middle  space-x-1">
                                <p class="self-center w-full text-clip text-pretty">Valoración media</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.ratingAve" :decimal-places="1" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle  space-x-1">
                                <p class="self-center w-full text-clip text-pretty">Partidos jugados</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.gamesPlayed" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle  space-x-1">
                                <p class="self-center w-full text-clip text-pretty">Minutos jugados</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.minutesPlayed" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle  space-x-1  overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Porcentaje ganados</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.winRate" :decimal-places="1" class="inline"></count-up>%</p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle  space-x-1  overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Mejor del partido</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.manOfTheMatch" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle  space-x-1  overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Mejor del partido (%)</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.manOfTheMatchPercent" :decimal-places="1" class="inline"></count-up>%</p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Tarjetas rojas</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.redCards" :decimal-places="0" class="inline"></count-up></p>
                            </div>
                            <div class="divider p-0 m-0"></div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Goles</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.goals" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Goles por partido</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.goalsPerMatch" :decimal-places="2" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Disparos convertidos (%)</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.shotSuccessRate" :decimal-places="1" class="inline"></count-up>%</p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Hat tricks</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.hattricks" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Hat tricks por partido</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.hattricksPerMatch" :decimal-places="2" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Pokers</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.pokers" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Pokers por partido</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.pokersPerMatch" :decimal-places="2" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Asistencias</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.assists" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Asistencias por partido</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.assistsPerMatch" :decimal-places="2" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Goles+Asistencias</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.goalsPlusAssists" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">G+A Por partido</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.goalsPlusAssistsPerMatch" :decimal-places="2" class="inline"></count-up></p>
                            </div>
                            <div class="divider p-0 m-0"></div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Pases totales</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.passesMade" :decimal-places="0" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Pases exitosos</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.passesSuccess" :decimal-places="0" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Pases exitosos (%)</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.passSuccessRate" :decimal-places="1" class="inline"></count-up>%</p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Pases por partido</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.passesMadePerMatch" :decimal-places="1" class="inline"></count-up></p>
                            </div>
                            <div class="divider p-0 m-0"></div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Tacklees totales</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.tacklesMade" :decimal-places="0" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Tacklees existosos</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.tacklesSuccess" :decimal-places="0" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Tacklees existosos (%)</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.tackleSuccessRate" :decimal-places="1" class="inline"></count-up>%</p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Porteria imbatida</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.cleanSheets" :decimal-places="0" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Porteria imbatida (%)</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.cleanSheetsPercent" :decimal-places="1" class="inline"></count-up>%</p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Goles encajados</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.goalsConceded" :decimal-places="0" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Goles encajados por partido</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.goalsConcededPerMatch" :decimal-places="1" class="inline"></count-up></p>
                            </div>
                            <div class="divider p-0 m-0"></div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Paradas</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.saves" :decimal-places="0" class="inline"></count-up></p>
                            </div>
                            <div class="font-semibold w-full flex content-center align-middle space-x-1 overflow-hidden">
                                <p class="self-center w-full text-clip text-pretty">Paradas por partido</p>
                                <p class="self-center text-end text-primary text-lg"><count-up :end-val="player.stats.savesPerMatch" :decimal-places="1" class="inline"></count-up></p>
                            </div>
                            </div>
                        </div>
                        <div v-else class="flex h-full items-center justify-center p-4 text-center">
                            <p class="text-lg opacity-60 text-base-content">Este jugador aún no tiene estadísticas registradas en esta categoría.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </dialog>
</template>

<style scoped>

.plimg{
        aspect-ratio: 8/9;
    }


.ploverlay{
    /*background: rgba(0, 0, 0, 0.155);*/
    backdrop-filter: blur(5px);
}



@media (min-width: 768px) {
    .ploverlay{
        /*background: rgba(0, 0, 0, 0.155);*/
        backdrop-filter: blur(20px);
    }
}



.customscroll::-webkit-scrollbar-track
{
	display: none;
    border-radius: 10px;
}

.customscroll::-webkit-scrollbar
{
	width: 4px;
	background-color: #ffffff5b;
    border-radius: 10px;
}

.customscroll::-webkit-scrollbar-thumb
{
	background-color: #fecf00ba;
    border-radius: 10px;
}

</style>