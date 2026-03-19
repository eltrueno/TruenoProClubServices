<style scoped>
@tailwind base;
@tailwind components;
@tailwind utilities;
.customscroll::-webkit-scrollbar-track
{
	display: none;
    border-radius: 10px;
}

.customscroll::-webkit-scrollbar
{
	width: 4px;
    height: 4px;
	background-color: #ffffff5b;
    border-radius: 10px;
}

.customscroll::-webkit-scrollbar-thumb
{
	background-color: #fecf00ba;
    border-radius: 10px;
}

    @layer components{
        .skeletondark{
            background-image: linear-gradient( 105deg, transparent 0%, transparent 35%, rgba(108, 108, 108, 0.2)50%, transparent 65%, transparent 100% );
        }
    }
</style>
<template>
    <div v-if="!hasError && !isLoading" class="w-full">
        <div class="flex w-full  flex-col items-center justify-center align-middle" v-if="!isLoading">
            <p class="w-full text-5xl md:text-6xl font-bold text-center" :class="resultColor">{{ translateMatchResult(match.result).toUpperCase() }}</p>
            <div class="items-center justify-center align-middle h-full w-full p-4 hidden md:flex">
                <p class="text-end self-center font-medium text-2xl">{{match.localClub.name}}</p>
                <p class="text-end font-extrabold text-4xl  ml-4">{{ match.localClub.matchStats.goals }}</p>
                <div class="self-center justify-self-center text-lg font-bold mx-6 relative text-center">
                    :
                </div>
                <p class="text-end font-extrabold text-4xl  mr-4">{{ match.awayClub.matchStats.goals }}</p>
                <p class="text-end self-center font-medium text-2xl">{{match.awayClub.name}}</p>
            </div>
            <div class="items-center justify-center align-middle h-full w-full p-4 flex flex-col md:hidden mt-2">
                <div class="items-center justify-center align-middle h-full w-full flex">
                    <p class="text-end self-center font-medium text-2xl">{{match.localClub.name}}</p>
                    <p class="text-end font-extrabold text-4xl  ml-4">{{ match.localClub.matchStats.goals }}</p>
                </div>
                <div class="self-center justify-self-center text-lg font-bold my-2 relative text-center">
                    vs
                </div>
                <div class="items-center justify-center align-middle h-full w-full flex">
                    <p class="text-end self-center font-medium text-2xl">{{match.awayClub.name}}</p>
                    <p class="text-end font-extrabold text-4xl  ml-4">{{ match.awayClub.matchStats.goals }}</p>
                </div>
            </div>
            <div class="py-2 px-4 flex justify-between gap-x-8 md:gap-x-12">
                <div v-if="match.winnerByDnf" class="badge badge-error badge-lg">Desconexión</div>
                <div class="badge badge-primary badge-lg">{{ translateMatchType(match.matchType) }}</div>
                <div v-if="match.matchType=='playoff'&&match.winnerByPen" class="badge badge-neutral badge-lg">Penaltis</div>
            </div>
            <div class="flex my-3 items-center justify-center text-center text-xl gap-x-1">
                <p class="font-semibold">Rating del equipo: </p>
                <p :class="ratingColor(teamAverageRating)" class="font-light text-2xl bg-neutral-900 p-1 rounded-lg">{{ teamAverageRating.toFixed(1) }}</p>
            </div>

            <div class="overflow-x-auto w-full customscroll py-4">
            <div class="flex min-w-max gap-4 py-2">
                <div class="flex-grow"></div>
                <div class="flex-shrink-0 bg-base-300 dark:bg-base-100 rounded-lg shadow-md w-56 flex p-2 align-middle cursor-pointer hover:shadow-xl" v-for="(pl, index) in players"
                :class="{
                    'bg-primary dark:bg-primary hover:bg-primary text-primary-content': selectedPlayer==index
                  }" @click="selectedPlayer=index">
                    <span class="font-light text-lg self-center bg-neutral-900 p-1 rounded-lg" :class="ratingColor(pl.rating)">{{ pl.rating }}</span>
                    <div class="flex flex-col w-full justify-center align-middle px-6 self-center">
                        <div class="inline-flex justify-center align-middle">
                            <p class="font-semibold self-center">{{ pl.playername }}</p>
                            <svg  v-if="pl.manOfTheMatch" xmlns="http://www.w3.org/2000/svg" class="mr-1 w-6 h-6  px-1 self-center font-semibold" width="24" height="24" fill="currentColor" viewBox="0 -960 960 960" ><path d="m363-310 117-71 117 71-31-133 104-90-137-11-53-126-53 126-137 11 104 90-31 133ZM480-28 346-160H160v-186L28-480l132-134v-186h186l134-132 134 132h186v186l132 134-132 134v186H614L480-28Zm0-112 100-100h140v-140l100-100-100-100v-140H580L480-820 380-720H240v140L140-480l100 100v140h140l100 100Zm0-340Z"/></svg>
                        </div>
                        <div class="mt-1 inline-flex justify-center align-middle gap-x-2">
                            <div class="inline-flex" v-if="pl.goals>0">
                                <svg  xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m414-168 12-56q3-13 12.5-21.5T462-256l124-10q13-2 24 5t16 19l16 38q39-23 70-55.5t52-72.5l-12-6q-11-8-16-19.5t-2-24.5l28-122q3-12 12.5-20t21.5-10q-5-25-12.5-48.5T764-628q-9 5-19.5 4.5T726-630l-106-64q-11-7-16-19t-2-25l8-34q-31-14-63.5-21t-66.5-7q-14 0-29 1.5t-29 4.5l30 68q5 12 2.5 25T442-680l-94 82q-10 9-23.5 10t-24.5-6l-92-56q-23 38-35.5 81.5T160-480q0 16 4 52l88-8q14-2 25.5 4.5T294-412l48 114q5 12 2.5 25T332-252l-38 32q27 20 57.5 33t62.5 19Zm72-172q-13 2-24-5t-16-19l-54-124q-5-12-1.5-25t13.5-21l102-86q9-9 22-10t24 6l112 66q11 7 17 19t3 25l-32 130q-3 13-12 21.5T618-352l-132 12Zm-6 260q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>
                                <span class="font-thin text-sm">x{{ pl.goals }}</span>
                            </div>
                            <div class="inline-flex" v-if="pl.assists>0">
                                <svg class="w-6 h-6" height="24px" width="24px" version="1.1" id="_x32_" fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
                                    viewBox="0 0 512 512"  xml:space="preserve">
                                <g>
                                    <path class="st0" d="M392.08,216.693c-0.489,0.91-0.971,1.837-1.74,2.616l-22.262,22.254c-4.216,4.225-11.057,4.225-15.282,0
                                        c-4.225-4.216-4.225-11.057,0-15.282l15.903-15.911c-8.091-2.528-16.41-5.45-24.834-8.686c-0.131,0.14-0.175,0.323-0.306,0.454
                                        l-25.429,25.429c-4.225,4.216-11.066,4.216-15.291,0c-4.225-4.234-4.225-11.065,0-15.299l19.411-19.411
                                        c-8.634-3.717-17.18-7.61-25.473-11.582c-0.534,1.234-1.268,2.406-2.274,3.421l-25.429,25.42c-4.216,4.224-11.066,4.224-15.291,0
                                        c-4.216-4.225-4.216-11.066,0-15.282l23.304-23.312c-22.481-11.512-41.524-22.551-52.363-29.786
                                        c-26.811-17.88-31.92-8.931-43.414-1.277c-11.494,7.654-38.306,41.586-80.442,41.586c-37.028,0-49.738-12.702-63.84-28.806
                                        C19.148,132.813,0,138.193,0,166.561c0,16.594,0,132.542,0,155.53c0,20.88,8.512,35.392,38.76,37.885l1.006,12.308
                                        c0.385,4.74,4.348,8.398,9.106,8.398h15.176c4.75,0,8.722-3.658,9.106-8.398l1.085-13.323c10.48-1.084,21.064-2.642,32.83-4.224
                                        l1.067,13.069c0.385,4.74,4.357,8.398,9.106,8.398h15.178c4.749,0,8.721-3.658,9.106-8.398l1.39-17.05
                                        c11.013-0.909,23.172-1.61,37.116-1.88c1.977-0.044,3.91-0.018,5.817,0.026l1.548,18.904c0.385,4.74,4.356,8.398,9.106,8.398
                                        h15.177c4.758,0,8.721-3.658,9.106-8.398l1.164-14.181c11.643,2.266,24.476,4.89,40.623,6.841l0.962,11.818
                                        c0.385,4.74,4.356,8.398,9.106,8.398h15.177c4.758,0,8.721-3.658,9.106-8.398l0.752-9.212c12.325,0.385,26.242,0.324,42.154-0.402
                                        l0.788,9.614c0.385,4.74,4.356,8.398,9.106,8.398h15.177c4.749,0,8.721-3.658,9.106-8.398l0.997-12.204
                                        c12.001-1.215,23.102-2.781,33.24-4.714l0.743,9.08c0.385,4.74,4.357,8.398,9.106,8.398h15.177c4.758,0,8.721-3.657,9.106-8.398
                                        l1.496-18.344C494.995,328.451,512,299.549,512,272.293C512,235.597,451.074,230.532,392.08,216.693z M63.27,220.306
                                        c-11.94,0-46.283,0-46.283,0s0-44.779,0-50.01c0-5.23,5.231-8.966,11.95-2.991c3,2.668,27.608,25.384,37.316,29.863
                                        C75.963,201.647,75.21,220.306,63.27,220.306z M137.275,314.359l-56.09-76.138h31.351l56.09,76.138H137.275z M201.044,314.359
                                        l-56.089-76.138h31.351l56.089,76.138H201.044z M268.225,314.359l-56.089-76.138h31.351l56.089,76.138H268.225z"/>
                                </g>
                                </svg>
                                    <span class="font-thin text-sm">x{{ pl.assists }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="grid h-5 w-4 place-items-center bg-error rounded-sm self-center" v-if="pl.redCards>0"></div>
                </div>
                <div class="flex-grow"></div>
            </div>
            </div>

            <div class="w-full flex flex-col md:flex-row mt-4 lg:mt-1 gap-4 h-fit">
                <div class="flex-1 flex align-middle bg-base-200 rounded-lg shadow-md p-4 overflow-hidden">
                    <img :src="playerImage(getSelectedPlayer().playername)" class="hidden md:flex drop-shadow-xl select-none pointer-events-none max-w-[30%] xl:max-w-[20%] h-auto object-contain mx-2" alt="Player ingame top image" style="aspect-ratio: 40/97;" @error="defaultPlayerImage"/>
                    <div class="flex flex-col w-full">
                        <div class="inline-flex gap-2 self-center">
                            <svg  v-if="getSelectedPlayer().manOfTheMatch" xmlns="http://www.w3.org/2000/svg" class="mr-1 w-8 h-8  px-1 self-center font-semibold text-primary" width="24" height="24" fill="currentColor" viewBox="0 -960 960 960" ><path d="m363-310 117-71 117 71-31-133 104-90-137-11-53-126-53 126-137 11 104 90-31 133ZM480-28 346-160H160v-186L28-480l132-134v-186h186l134-132 134 132h186v186l132 134-132 134v186H614L480-28Zm0-112 100-100h140v-140l100-100-100-100v-140H580L480-820 380-720H240v140L140-480l100 100v140h140l100 100Zm0-340Z"/></svg>
                            <p class="text-primary font-semibold text-lg md:text-xl lg:text-2xl">{{ getSelectedPlayer().playername }}</p>
                            <p class="font-medium text-lg md:text-xl lg:text-2xl">({{ getSelectedPlayer().rating }})</p>
                            <div class="grid h-6 w-4 place-items-center bg-error rounded-sm self-center" v-if="getSelectedPlayer().redCards>0"></div>
                        </div>
                        <p class="self-center text-lg font-light">{{ translatePosition(getSelectedPlayer().position) }}</p>
                        <div class="divider px-8 md:px-16 mb-1"></div>
                        <div class="relative overflow-hidden py-1 px-4 w-full rounded-lg my-1 text-center justify-center text-sm font-light">
                            <i>{{ getPlayerSummaryText(getSelectedPlayer()) }}</i>
                        </div>
                        <div class="relative overflow-hidden py-1 px-4 w-full bg-base-100 rounded-lg mt-1">
                            <img :src="playerImage(getSelectedPlayer().playername)" class="absolute block md:hidden top-0 left-1/2 -translate-x-1/2 opacity-30 h-full object-contain pointer-events-none select-none" alt="Player ingame top image" @error="defaultPlayerImage"/>
                            <div class="w-full flex my-4 text-lg text-clip text-pretty justify-between" v-for="stat in orderedPlayerStats(getSelectedPlayer())">
                                <p class="text-start font-medium">{{ stat.name }}</p>
                                <p class="text-right text-primary"><count-up :end-val="Number.isNaN(stat.stat)?0:stat.stat" class="inline" :decimalPlaces="stat.decimals"></count-up><span v-if="stat.percent">%</span></p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex justify-center items-center md:w-auto md:basis-5/12 xl:basis-4/12 md:flex-shrink-0">
                    <FootbalField :players="players" 
                    :selectedplayer="selectedPlayer" 
                    @selectplayer="selectedPlayer = $event" 
                    class="w-full max-w-md aspect-[4/3]"></FootbalField>
                </div>
            </div>

        </div>
    </div>
    <div class="flex flex-col h-full overflow-hidden" v-else-if="!isLoading">
        <h3 class="text-center text-2xl p-3">No se ha podido obtener los datos del partido :/</h3>
        <div class="flex place-content-center p-6">
            <img src="/illustrations/bugfixingsvg.svg" class="lg:w-2/3 w-full select-none pointer-events-none" alt="Image representing error">
        </div>
    </div>
    <div class="flex w-full flex-col items-center justify-center align-middle" v-else>
        <div class="skeleton dark:bg-base-100 w-64 h-10 skeletondark"></div>
        <div class="skeleton dark:bg-base-100 w-96 h-6 skeletondark mt-3"></div>
        <div class="flex gap-4 py-4 mt-2">
            <div class="skeleton dark:bg-base-100 w-56 h-16 skeletondark"></div>
            <div class="skeleton dark:bg-base-100 w-56 h-16 skeletondark hidden md:block"></div>
            <div class="skeleton dark:bg-base-100 w-56 h-16 skeletondark hidden md:block"></div>
        </div>
        <div class="w-full flex flex-col md:flex-row mt-4 lg:mt-1 gap-4 h-fit">
            <div class="flex-1 flex align-middle bg-base-200 rounded-lg shadow-md p-4 overflow-hidden">
                <div class="skeleton dark:bg-base-100  skeletondark hidden md:flex max-w-[30%] xl:max-w-[20%] object-contain" 
                style="aspect-ratio: 40/97;"></div>
                <div class="flex flex-col w-full">
                    <div class="inline-flex gap-2 self-center">
                        <div class="skeleton dark:bg-base-100 w-96 h-6 skeletondark"></div>
                    </div>
                    <div class="self-center skeleton dark:bg-base-100 w-64 h-3 skeletondark mt-2"></div>
                    <div class="relative overflow-hidden py-1 px-4 w-full bg-base-100 dark:bg-base-300 rounded-lg mt-4 mx-2">
                        <div class="w-full flex flex-col my-4 text-lg gap-y-3 p-4">
                            <div class="skeleton dark:bg-base-100 w-full h-4 skeletondark" v-for="n in [1,2,3,4,5,6,7,8,9]"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex justify-center items-center md:w-auto md:basis-5/12 xl:basis-4/12 md:flex-shrink-0">
                <div class="skeleton dark:bg-base-100 w-full max-w-md aspect-[3/4] skeletondark"></div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
    import { computed, onBeforeMount, ref, type Ref } from 'vue';
    import ClubMatchService from '@services/ClubMatchService';
    import ClubMatchEntity from '@models/match/ClubMatchEntity'
    import FootbalField from './FootbalField.vue';   
    import  MatchPlayerEntity from '@/model/match/MatchPlayerEntity';
    import { translateMatchResult, translatePosition, translateMatchType } from '@/i18n/translations';
    import CountUp from 'vue-countup-v3'

    const props = defineProps<{
        matchId: number
    }>()
    
    const selectedPlayer = ref<number>(0)

    const matchService = new ClubMatchService(props.matchId)
    const match:Ref<ClubMatchEntity> = matchService.getData()
    const isLoading = matchService.isloading
    const status = matchService.getStatus()
    const errorText = matchService.getError()
    const hasError = matchService.getHasError()



    function getSelectedPlayer(){
        return players.value.filter(el => (players.value.indexOf(el)==selectedPlayer.value))[0]
    }

    function playerImage(playername){
      return `/players/${playername}_top_transp.png`
    }

    function defaultPlayerImage(e){
        e.target.src = '/players/placeholder_top_transp.png'
    }


    const teamAverageRating = computed(()=>{
        return (players.value.reduce((sum, p) => sum + p.rating, 0) / players.value.length);
    })

function getPlayerSummaryText(player) {

    const phrases = []

    // Disciplina
    if (player.redCards > 0) {
        phrases.push("❝ Se fue a la ducha antes de tiempo ❞")
        phrases.push("❝ El árbitro le enseñó el camino al vestuario ❞")
        phrases.push("❝ Partido corto... demasiado ❞")
    }

    // GOLES
    if (player.goals >= 5) {
        phrases.push("❝ Hoy era ilegal defenderle ❞")
        phrases.push("❝ Desató el caos en la defensa rival ❞")
    }

    if (player.goals >= 4) {
        phrases.push("❝ No tiene cartas pero... Poker ❞")
        phrases.push("❝ Hizo lo que quiso en el área ❞")
    }

    if (player.goals >= 3) {
        phrases.push("❝ Se llevó el balón a casa ❞")
        phrases.push("❝ Hat trick de manual ❞")
    }

    if (player.goals >= 2) {
        phrases.push("❝ Ha hecho un doblete ❞")
        phrases.push("❝ Dos zarpazos letales ❞")
    }

    if (player.goals === 1 && player.shots === 1) {
        phrases.push("❝ Un tiro, un gol. Cirujano ❞")
    }

    if (player.goals === 0 && player.shots >= 6) {
        phrases.push("❝ Tiró hasta las botas ❞")
        phrases.push("❝ Hoy disparó con los ojos cerrados ❞")
        phrases.push("❝ Disparó mucho a puerta... a la puerta de su casa ❞")
    }

    if (player.shots >= 10) {
        phrases.push("❝ Tenía permiso para tirar desde donde fuera ❞")
    }

    if (player.shotAccuracyPercent >= 90 && player.shots >= 3) {
        phrases.push("❝ Puntería de francotirador ❞")
    }

    if (player.shotAccuracyPercent <= 20 && player.shots >= 3) {
        phrases.push("❝ Chutó hasta desde su casa... para las stats ❞")
        phrases.push("❝ Hoy no veía la portería, quizás su monitor estaba apagado ❞")
    }

    // ASISTENCIAS
    if (player.assists >= 5) {
        phrases.push("❝ Repartiendo fútbol como si fuera Navidad ❞")
    }

    if (player.assists >= 4) {
        phrases.push("❝ En modo Kevin De Bruyne ❞")
    }

    if (player.assists >= 3) {
        phrases.push("❝ Hat trick de asistencias ❞")
        phrases.push("❝ Hoy jugó para los demás ❞")
    }

    if (player.assists >= 2) {
        phrases.push("❝ Doblete de asistencias ❞")
        phrases.push("❝ Generoso con el gol ❞")
    }

    if (player.assists >= 1 && player.goals === 0) {
        phrases.push("❝ Trabajo sucio que no sale en portada ❞")
    }

    // PASES
    if(player.position !== "goalkeeper"){
            if (player.passesMade >= 40) {
        phrases.push("❝ Se ha creído Xavi Hernández ❞")
    }

    if (player.passSuccessRate >= 99) {
        phrases.push("❝ No ha fallado ni un pase ❞")
    }

    if (player.passSuccessRate >= 95 && player.passesMade >= 20) {
        phrases.push("❝ Precisión quirúrgica ❞")
        phrases.push("❝ Director de orquesta ❞")
    }

    if (player.passSuccessRate >= 85) {
        phrases.push("❝ Más preciso que un reloj suizo ❞")
    }

    if (player.passSuccessRate <= 40 && player.passesMade >= 10) {
        phrases.push("❝ Hoy el balón quemaba ❞")
    }

    if (player.passSuccessRate <= 20) {
        phrases.push("❝ No ha dado ni 2 pases seguidos ❞")
        phrases.push("❝ Hoy jugó para el rival ❞")
        phrases.push("❝ Ha perdido más balones que móviles se 'pierden' en Barcelona ❞")
    }

    if(player.passesMade < 5){
        phrases.push("❝ Ni ha olido el balón ❞")
        phrases.push("❝ Ha tocado menos balón que el chat de case tetas ❞")
        phrases.push("❝ Supuestamente ha jugado, pero no lo parece ❞")
    }

        // DEFENSA
    if (player.tacklesMade >= 8) {
        phrases.push("❝ Robó más balones que un carterista ❞")
    }

    if (player.tacklesMade >= 6 && player.tackleSuccessRate >= 80) {
        phrases.push("❝ Muralla defensiva ❞")
    }

    if (player.tackleSuccessRate === 100 && player.tacklesMade >= 3) {
        phrases.push("❝ Entradas perfectas ❞")
    }

    if (player.tackleSuccessRate <= 20 && player.tacklesMade >= 3) {
        phrases.push("❝ Pegó como un leñador, sin apuntar ❞")
    }

    }




    // PORTERO
    if (player.position == "goalkeeper") {
        console.log("portero")

        if (player.saves >= 10) {
            phrases.push("❝ Partido de superhéroe bajo palos ❞")
            phrases.push("❝ Sacó todo lo que le tiraron ❞")
        }

        if (player.saves >= 7) {
            phrases.push("❝ Hoy parecía un muro ❞")
            phrases.push("❝ Portería blindada ❞")
        }

        if (player.saves >= 5) {
            phrases.push("❝ Seguro bajo palos ❞")
            phrases.push("❝ Paradas de mucho mérito ❞")
        }

        if (player.saves >= 3 && player.goalsConceded === 0) {
            phrases.push("❝ Paradas clave para mantener la portería a cero ❞")
        }

        if (player.saves === 0 && player.goalsConceded === 0) {
            phrases.push("❝ Espectador de lujo ❞")
        }

        if (player.saves === 0 && player.goalsConceded >= 3) {
            phrases.push("❝ Hoy no era su día ❞")
        }

        if (player.goalsConceded >= 3) {
            phrases.push("❝ Difícil día para el portero ❞")
        }

          if (player.rating >= 9) {
            phrases.push("❝ Partido de superhéroe bajo palos ❞")
            phrases.push("❝ Imposible de superar ❞")
        } else if (player.rating >= 8) {
            phrases.push("❝ Hoy parecía un muro ❞")
            phrases.push("❝ Portería segura ❞")
        } else if (player.rating >= 7) {
            phrases.push("❝ Cumplió con solvencia ❞")
            phrases.push("❝ Seguro bajo palos ❞")
        } else if (player.rating >= 6) {
            phrases.push("❝ Partido correcto bajo palos ❞")
        } else {
            phrases.push("❝ Hoy no era su día ❞")
        }

    }

    // MVP
    if (player.manOfTheMatch) {
        phrases.push("❝ MVP del partido ❞")
        phrases.push("❝ El mejor sobre el campo ❞")
    }

    if (player.manOfTheMatch && player.rating >= 9) {
        phrases.push("❝ MVP indiscutible ❞")
    }

    // RATING
    if (player.rating >= 9.9) {
        phrases.push("❝ Partido perfecto ❞")
        phrases.push("❝ Exhibición absoluta ❞")
    }

    if (player.rating >= 8.5) {
        phrases.push("❝ Clase magistral, fútbol champagne ❞")
        phrases.push("❝ Partido de altos vuelos ❞")
    }

    if (player.rating <= 4) {
        phrases.push("❝ Partido para olvidar... ❞")
        phrases.push("❝ Mejor pasar página ❞")
    }

    // Jugo poco
    if (player.minutesPlayed < 20) {
        phrases.push("❝ Cameo rápido pero intenso ❞")
    }

    // fallback
    if (phrases.length === 0) {
        phrases.push("❝ Buen partido, sólido ❞")
    }

    return phrases[Math.floor(Math.random() * phrases.length)]
}

    const resultColor = computed((local?)=>{
        let resp = {
            'text-error': match.value.result=="loose",
            'text-success': match.value.result=="win"
        }
        return resp
    })

    function ratingColor(r) {

        if (r >= 9) return 'text-emerald-500'
        if (r >= 8) return 'text-green-500'
        if (r >= 7) return 'text-lime-500'
        if (r >= 6) return 'text-lime-400'
        if (r >= 5) return 'text-orange-500'
        return 'text-red-500'
    }

    function orderedPlayerStats(player: MatchPlayerEntity){
          return [
            {
                name: "Minutos jugados",
                stat: player.minutesPlayed,
                percent: false,
                decimals: 0
            },
            {
                name: "Goles",
                stat: player.goals,
                percent: false,
                decimals: 0
            },
            {
                name: "Tiros",
                stat: player.shots,
                percent: false,
                decimals: 0
            },
            {
                name: "Tiros convertidos (%)",
                stat: player.shotAccuracyPercent,
                percent: true,
                decimals: 1
            },
            {
                name: "Pases intentados",
                stat: player.passesMade,
                percent: false,
                decimals: 0
            },
            {
                name: "Pases acertados",
                stat: player.passesSuccess,
                percent: false,
                decimals: 0
            },
            {
                name: "Acierto pases (%)",
                stat: player.passSuccessRate,
                percent: true,
                decimals: 1
            },
            {
                name: "Asistencias",
                stat: player.assists,
                percent: false,
                decimals: 0
            },
            {
                name: "Tacklees intentados",
                stat: player.tacklesMade,
                percent: false,
                decimals: 0
            },
            {
                name: "Tacklees acertados",
                stat: player.tacklesSuccess,
                percent: false,
                decimals: 0
            },
            {
                name: "Acierto tacklees (%)",
                stat: player.tackleSuccessRate,
                percent: true,
                decimals: 1
            },
            {
                name: "Paradas",
                stat: player.saves,
                percent: false,
                decimals: 0
            }
        ]
    }

    /**OWN COPYPASTE FROM MATCHFIELD :D */
    function getRedCardPlayers(localclub:boolean){
        var plist = []
        if(localclub){
            for(var p in match.value.localClub.players){
                var parsedp:MatchPlayerEntity = match.value.localClub.players[p]
                if(parsedp.redCards!=0) plist.push(parsedp.playername);
            }
        }else{
            for(var p in match.value.awayClub.players){
                var parsedp:MatchPlayerEntity = match.value.awayClub.players[p]
                if(parsedp.redCards!=0) plist.push(parsedp.playername)
            }
        }
        return plist
    }

    const players = computed(() => {
        return match.value.localTeam ? match.value.localClub.players : match.value.awayClub.players
    });
    
    onBeforeMount(async ()=>{
        await matchService.fetch()
    })

</script>