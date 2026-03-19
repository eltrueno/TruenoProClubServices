<template>
    <div v-if="status==200">
        <div id="to_image" class="toimage flex w-full flex-initial overflow-hidden" v-if="!isLoading">
            <div class="w-7/12 flex-initial flex flex-col">
                <p class="w-full text-9xl font-extrabold text-center" :class="resultColor">{{ translateMatchResult(match.result).toUpperCase() }}</p>
                <div class="mt-4 w-full flex-initial flex p-1 h-full flex-nowrap items-center justify-center place-content-evenly gap-0" :class="{'space-x-[-40px]': isAnyoneMvp}">
                    <div v-for="(p, index) in sortedPlayers" class="text-3xl text-center flex flex-initial flex-col justify-center items-center place-content-center"
                    >
                        <div class="backdrop-blur-md bg-base-300/50 rounded-xl w-fit py-2 px-6">
                            <div class="flex w-full text-center self-centeralign-middle place-content-center">
                                <svg  v-if="p.manOfTheMatch" xmlns="http://www.w3.org/2000/svg" class="mr-1 w-10 h-11 text-primary" width="24" height="24" fill="currentColor" viewBox="0 -960 960 960" ><path d="m363-310 117-71 117 71-31-133 104-90-137-11-53-126-53 126-137 11 104 90-31 133ZM480-28 346-160H160v-186L28-480l132-134v-186h186l134-132 134 132h186v186l132 134-132 134v186H614L480-28Zm0-112 100-100h140v-140l100-100-100-100v-140H580L480-820 380-720H240v140L140-480l100 100v140h140l100 100Zm0-340Z"/></svg>
                                <p class="text-primary font-semibold text-center">{{ p.playername }}</p>
                            </div>
                            <p class="text-neutral-content">{{ p.rating }}</p>
                        </div>
                        <img :src="'/players/' + p.playername + '_full_transp.png'" class="flex-shrink-0 z-0 drop-shadow-xl" 
                        :class="{'transform scale-115 mt-6 z-10 drop-shadow-2xl': p.manOfTheMatch}" alt="Player ingame photo" 
                        @error="defaultTopImage"/>
                    </div>
                </div>
            </div>
            <div class="w-5/12 h-full min-h-full max-h-full flex flex-col flex-initial justify-stretch backdrop-blur-md bg-base-300/75 rounded-l-2xl overflow-hidden">
                <div class="w-full grid grid-cols-12 grid-rows-1 content-center justify-center items-center bg-base-300 dark:bg-base-100">
                    <p class="col-span-9 text-6xl overflow-hidden truncate px-1">{{ match.localClub.name }}</p>
                    <p class="col-span-3 bg-base-100 dark:bg-base-300 text-10xl leading-none font-extrabold text-center text-primary ">{{ match.localClub.matchStats.goals }}</p>
                </div>
                <div class="h-full w-full flex flex-col flex-initial">
                    <div class="w-full h-full flex overflow-hidden flex-initial">
                        <div class="w-9/12 h-full flex-col px-12 py-6 flex-initial place-content-center">
                            <div class="w-full flex py-1" v-for="player in match.localClub.players">
                                <div v-if="player.redCards!=0" class="bg-error w-6 h-10 mr-2 rounded-sm"></div>
                                <svg  v-if="player.manOfTheMatch" xmlns="http://www.w3.org/2000/svg" class="mr-1 w-10 h-11 text-primary" width="24" height="24" fill="currentColor" viewBox="0 -960 960 960" ><path d="m363-310 117-71 117 71-31-133 104-90-137-11-53-126-53 126-137 11 104 90-31 133ZM480-28 346-160H160v-186L28-480l132-134v-186h186l134-132 134 132h186v186l132 134-132 134v186H614L480-28Zm0-112 100-100h140v-140l100-100-100-100v-140H580L480-820 380-720H240v140L140-480l100 100v140h140l100 100Zm0-340Z"/></svg>
                                <span class="text-4xl dark:text-primary mr-4">{{ player.playername }}</span>
                                <svg v-for="g in player.goals" xmlns="http://www.w3.org/2000/svg" class="w-12 h-12" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m414-168 12-56q3-13 12.5-21.5T462-256l124-10q13-2 24 5t16 19l16 38q39-23 70-55.5t52-72.5l-12-6q-11-8-16-19.5t-2-24.5l28-122q3-12 12.5-20t21.5-10q-5-25-12.5-48.5T764-628q-9 5-19.5 4.5T726-630l-106-64q-11-7-16-19t-2-25l8-34q-31-14-63.5-21t-66.5-7q-14 0-29 1.5t-29 4.5l30 68q5 12 2.5 25T442-680l-94 82q-10 9-23.5 10t-24.5-6l-92-56q-23 38-35.5 81.5T160-480q0 16 4 52l88-8q14-2 25.5 4.5T294-412l48 114q5 12 2.5 25T332-252l-38 32q27 20 57.5 33t62.5 19Zm72-172q-13 2-24-5t-16-19l-54-124q-5-12-1.5-25t13.5-21l102-86q9-9 22-10t24 6l112 66q11 7 17 19t3 25l-32 130q-3 13-12 21.5T618-352l-132 12Zm-6 260q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>
                                <svg v-for="a in player.assists" class="w-12 h-12 assistsvg" height="24px" width="24px" version="1.1" id="_x32_" fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
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
                            </div>
                        </div>
                        <div class="w-3/12 flex flex-col-reverse bg-base-200 rounded-bl-xl justify-evenly py-1">
                            <div class="w-full justify-center align-middle text-center">
                                <span class="text-primary text-3xl font-light">DISPAROS</span>
                                <p class="text-8xl ">{{ match.localClub.matchStats.shots }}</p>
                            </div>
                            <div class="w-full justify-center align-middle text-center">
                                <span class="text-primary text-3xl font-light">PASES</span>
                                <p class="text-8xl ">{{ match.localClub.matchStats.passesMade }}</p>
                            </div>
                        </div>
                    </div>
                    <div class="w-full divider divider-neutral px-2"></div>
                    <div class="w-full h-full flex">
                        <div class="w-9/12 flex-col px-12 py-6 flex-initial place-content-center ">
                            <div class="w-full flex py-1" v-for="player in match.awayClub.players">
                                <div v-if="player.redCards!=0" class="bg-error w-6 h-10 mr-2 rounded-sm"></div>
                                <svg  v-if="player.manOfTheMatch" xmlns="http://www.w3.org/2000/svg" class="mr-1 w-10 h-11 text-primary" width="24" height="24" fill="currentColor" viewBox="0 -960 960 960" ><path d="m363-310 117-71 117 71-31-133 104-90-137-11-53-126-53 126-137 11 104 90-31 133ZM480-28 346-160H160v-186L28-480l132-134v-186h186l134-132 134 132h186v186l132 134-132 134v186H614L480-28Zm0-112 100-100h140v-140l100-100-100-100v-140H580L480-820 380-720H240v140L140-480l100 100v140h140l100 100Zm0-340Z"/></svg>
                                <span class="text-4xl dark:text-primary mr-4">{{ player.playername }}</span>
                                <svg v-for="g in player.goals" xmlns="http://www.w3.org/2000/svg" class="w-12 h-12" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m414-168 12-56q3-13 12.5-21.5T462-256l124-10q13-2 24 5t16 19l16 38q39-23 70-55.5t52-72.5l-12-6q-11-8-16-19.5t-2-24.5l28-122q3-12 12.5-20t21.5-10q-5-25-12.5-48.5T764-628q-9 5-19.5 4.5T726-630l-106-64q-11-7-16-19t-2-25l8-34q-31-14-63.5-21t-66.5-7q-14 0-29 1.5t-29 4.5l30 68q5 12 2.5 25T442-680l-94 82q-10 9-23.5 10t-24.5-6l-92-56q-23 38-35.5 81.5T160-480q0 16 4 52l88-8q14-2 25.5 4.5T294-412l48 114q5 12 2.5 25T332-252l-38 32q27 20 57.5 33t62.5 19Zm72-172q-13 2-24-5t-16-19l-54-124q-5-12-1.5-25t13.5-21l102-86q9-9 22-10t24 6l112 66q11 7 17 19t3 25l-32 130q-3 13-12 21.5T618-352l-132 12Zm-6 260q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>
                                <svg v-for="a in player.assists" class="w-12 h-12 assistsvg" height="24px" width="24px" version="1.1" id="_x32_" fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
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
                            </div>
                        </div>
                        <div class="w-3/12 flex flex-col bg-base-200 rounded-tl-xl justify-evenly py-1">
                            <div class="w-full justify-center align-middle text-center">
                                <span class="text-primary text-3xl font-light">DISPAROS</span>
                                <p class="text-8xl">{{ match.awayClub.matchStats.shots }}</p>
                            </div>
                            <div class="w-full justify-center align-middle text-center">
                                <span class="text-primary text-3xl font-light">PASES</span>
                                <p class="text-8xl">{{ match.awayClub.matchStats.passesMade }}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="w-full grid grid-cols-12 grid-rows-1 content-center justify-center items-center bg-base-300 dark:bg-base-100 place-self-end">
                    <p class="col-span-9 text-6xl overflow-hidden truncate px-1">{{ match.awayClub.name }}</p>
                    <p class="col-span-3 bg-base-100 dark:bg-base-300 text-10xl leading-none font-extrabold text-center text-primary">{{ match.awayClub.matchStats.goals }}</p>
                </div>
            </div>
        </div>
    </div>
    <div id="to_image" class="toimage flex flex-col  h-full" v-else-if="!isLoading">
        <div class="m-auto p-28 pb-0 h-full">
            <p class="text-center font-bold text-5xl text-error">Ha ocurrido un error al generar la imágen</p>
        </div>
        <div class="flex place-content-center p-28 pt-4 h-full">
            <img src="/illustrations/bugfixingsvg.svg" class="select-none pointer-events-none" alt="Image representing error">
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, type Ref, computed, onBeforeMount } from 'vue';
import ClubMatchService from '@services/ClubMatchService';
import ClubMatchEntity from '@models/match/ClubMatchEntity'
import { translateMatchResult } from '@/i18n/translations';

const props = defineProps<{
        matchId: number
    }>()

const matchService = new ClubMatchService(props.matchId)
const match:Ref<ClubMatchEntity> = matchService.getData()
const isLoading = matchService.isloading
const status = matchService.getStatus()



const resultColor = computed((local?)=>{
    let resp = {
        'text-error': match.value.result=="loose",
        'text-lime-500': match.value.result=="win"
    }
    return resp
})

const isAnyoneMvp = computed(()=>{
    return sortedPlayers.value.find(i => i.manOfTheMatch)
})

onBeforeMount(async ()=>{
     await matchService.fetch()
 })

const sortedPlayers = computed(() => {
    const plys = match.value.localTeam ? match.value.localClub.players : match.value.awayClub.players

    const mvpPl = plys.find(item => item.manOfTheMatch);
    const filteredPlys = plys.filter(item => !item.manOfTheMatch);

    if (mvpPl) {
        const middleIndex = Math.floor(filteredPlys.length / 2);
        
        return [
        ...filteredPlys.slice(0, middleIndex),
        mvpPl,
        ...filteredPlys.slice(middleIndex)
        ];
  }else return plys;
});

function defaultTopImage(e){
        e.target.src = '/players/placeholder_full_transp.png'
    }

</script>

<style scoped>
    .toimage{
        width: 1920px;
        height: 1080px;
        background-image: url("/vestuario_blurred_1920x1080.jpg");
    }
    .assistsvg{
        transform: scaleX(-1) rotate(-45deg) translateY(-5px);
    }
</style>