<template>
    <div role="container" class="w-full lg:px-10 xl:px-16 overflow-hidden">
        <header role="container" class="w-full py-4 px-6 h-full rounded-lg shadow-xl dark:shadow dark:bg-base-200">
            <div class="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-10 justify-around items-center h-full">
                <div class="flex flex-col h-full justify-between gap-1">
                    <div class="form-control flex flex-col h-full justify-between">
                        <span class="text-center font-semibold">Filtrar por ID</span>
                        <input type="number" placeholder="ID Partido" class="input input-bordered w-full" v-model="IDFilter"/>
                    </div>
                    <div class="form-control flex flex-col h-full justify-between">
                        <div class="w-full flex flex-row p-2 font-semibold">
                            <span class="self-start w-full">Jugadores mínimos</span>
                            <span class="self-end text-end">{{ minPlayersFilter }}</span>
                        </div>
                        <input v-model="minPlayersFilter" type="range" min="2" max="11"  class="range range-sm" v-if="memberStatus==200 && !isMembersLoading" />
                    </div>
                </div>
                <div class="flex flex-col h-full justify-start gap-1">
                    <span class="text-center font-semibold">Filtrar por fechas</span>
                    <VueTailwindDatepicker i18n="es" v-model="dateFilter" class="w-full"
                    as-single use-range :formatter="dateFormatter" :options="datePickerOptions" :shortcuts="false" @keypress.stop.prevent
                    @keyup.stop.prevent @keydown.stop.prevent></VueTailwindDatepicker>
                    <div class="form-control flex flex-col h-full justify-between">
                        <span class="text-center font-semibold">Filtrar por jugadores</span>
                        <div class="dropdown w-full justify-center self-center mt-1" v-if="memberStatus==200 && !isMembersLoading">
                            <div tabindex="0" role="button" class="btn btn-block btn-outline" v-if="filteredPlayerNames.length>0">{{ filteredPlayerNamesPretty }}</div>
                            <div tabindex="0" role="button" class="btn btn-block btn-outline" v-else>Desplegar lista de jugadores</div>
                            <ul tabindex="0" class="dropdown-content menu  bg-base-200 dark:bg-base-300 rounded-md z-20 w-full p-2 shadow-sm dark:shadow-md max-h-96 overflow-y-auto flex-nowrap">
                                <li>
                                    <input type="text" placeholder="Buscar por nombre de jugador" class="input input-bordered w-full" v-model="playerNameFilter"/>
                                </li>
                                <li v-for="pl, index in members.filter(m => m.playerName.toLowerCase().includes(playerNameFilter.toLowerCase()))" class="">
                                    <a class="flex flex-row w-full justify-between p-0" >
                                        <label class="label cursor-pointer h-full flex flex-row w-full justify-between">
                                            <span class="label-text">{{ pl.playerName }}</span> 
                                            <input type="checkbox" class="checkbox checkbox-sm" v-model="playersFilter[pl.playerName]" /> 
                                        </label>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="form-control flex flex-col h-full justify-between ">
                        <span class="text-center font-semibold">Filtrar por tipo de partido</span>
                        <label class="label cursor-pointer h-full">
                            <span class="label-text p-2">Partidos de liga</span> 
                            <input type="checkbox" class="checkbox checkbox-sm checkbox-primary" v-model="leagueFilter" />  
                        </label>
                        <label class="label cursor-pointer h-full">
                            <span class="label-text p-2">Partidos de playoff</span> 
                            <input type="checkbox" class="checkbox checkbox-sm checkbox-primary pb-0" v-model="playoffFilter" />
                        </label>
                        <label class="label cursor-pointer h-full pb-0">
                            <span class="label-text p-2 pb-0">Partidos amistosos</span> 
                            <input type="checkbox" class="checkbox checkbox-sm checkbox-primary pb-0" v-model="friendlyFilter" />
                        </label>
                </div>
            </div>
        </header>
        <div class="w-full flex justify-center flex-col lg:flex-row lg:justify-between">
            <Paginator v-if="!hasErrorComputed && !isLoading && finalMatchList.length>0" class="self-center" 
            :itemsCount="finalMatchList.length" :itemsPerPage="paginatorItemsPerPage" :currentPage="paginatorPage" :maxButtons="5" @pagechange="onPageChange"
            />
            <div class="self-center m-1">{{ finalMatchList.length }} resultados</div>
        </div>
        <div v-if="!hasErrorComputed" role="contentinfo" class="mt-3 w-full p-3 lg:p-4 flex rounded-lg shadow-lg dark:shadow dark:bg-base-200">
            <svg v-if="isLoading" class="footballloader" viewBox="0 0 866 866" xmlns="http://www.w3.org/2000/svg">
                    <svg class="footballloader" id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 164.83 151.5">
                        <path class="path-0 footballloader" d="M117.24,69.24A8,8,0,0,0,115.67,67c-4.88-4-9.8-7.89-14.86-11.62A4.93,4.93,0,0,0,96.93,55c-5.76,1.89-11.4,4.17-17.18,6a4.36,4.36,0,0,0-3.42,4.12c-1,6.89-2.1,13.76-3,20.66a4,4,0,0,0,1,3.07c5.12,4.36,10.39,8.61,15.68,12.76a3.62,3.62,0,0,0,2.92.75c6.29-2.66,12.52-5.47,18.71-8.36a3.49,3.49,0,0,0,1.68-2.19c1.34-7.25,2.54-14.55,3.9-22.58Z"
                            fill="#C80D0D" />
                        <path class="path-1 footballloader" d="M97.55,38.68A43.76,43.76,0,0,1,98,33.44c.41-2.36-.5-3.57-2.57-4.64C91.1,26.59,87,24,82.66,21.82a6.18,6.18,0,0,0-4-.71C73.45,22.55,68.32,24.25,63.22,26c-3.63,1.21-6.08,3.35-5.76,7.69a26.67,26.67,0,0,1-.6,4.92c-1.08,8.06-1.08,8.08,5.86,11.92,3.95,2.19,7.82,5.75,11.94,6.08s8.76-2.41,13.12-3.93c9.33-3.29,9.33-3.3,9.78-14Z"
                            fill="#C80D0D" />
                        <path class="path-2 footballloader" d="M66.11,126.56c5.91-.91,11.37-1.7,16.81-2.71a3.3,3.3,0,0,0,1.87-2.17c1-4.06,1.73-8.19,2.84-12.24.54-2-.11-3-1.55-4.15-5-4-9.9-8.12-15-12a6.19,6.19,0,0,0-4.15-1.1c-5.35.66-10.7,1.54-16,2.54A4,4,0,0,0,48.34,97a109.13,109.13,0,0,0-3,12.19,4.47,4.47,0,0,0,1.34,3.6c5.54,4.36,11.23,8.53,16.91,12.69a10.84,10.84,0,0,0,2.57,1.11Z"
                            fill="#C80D0D" />
                        <path class="path-3 footballloader" d="M127.42,104.12c4.1-2.1,8-3.93,11.72-6a6,6,0,0,0,2.27-3,58.22,58.22,0,0,0,3.18-29.92c-.26-1.7-8-7.28-9.71-6.85A5,5,0,0,0,133,59.65c-2.81,2.49-5.71,4.88-8.33,7.56a9.46,9.46,0,0,0-2.47,4.4c-1.29,6.49-2.38,13-3.35,19.55a5.73,5.73,0,0,0,.83,3.91c2.31,3.08,5,5.88,7.7,9Z"
                            fill="#C80D0D" />
                        <path class="path-4 footballloader" d="M52.58,29.89c-2.15-.36-3.78-.54-5.39-.9-2.83-.64-4.92.1-7,2.32A64.1,64.1,0,0,0,26.09,54.64c-2.64,7.92-2.62,7.84,5.15,10.87,1.76.69,2.73.45,3.93-1C39.79,59,44.54,53.65,49.22,48.2a4.2,4.2,0,0,0,1.13-2c.8-5.32,1.49-10.68,2.24-16.34Z"
                            fill="#C80D0D" />
                        <path class="path-5 footballloader" fill="#C80D0D" d="M23,68.13c0,2.51,0,4.7,0,6.87a60.49,60.49,0,0,0,9.75,32.15c1.37,2.13,6.4,3,7,1.2,1.55-5,2.68-10.2,3.82-15.34.13-.58-.58-1.38-.94-2.06-2.51-4.77-5.47-9.38-7.45-14.37C32.94,71,28.22,69.84,23,68.13Z" />
                        <path class="path-6 footballloader" fill="#C80D0D" d="M83.91,12.86c-.32.36-.66.71-1,1.07.9,1.13,1.57,2.62,2.73,3.33,4.71,2.84,9.56,5.48,14.39,8.1a9.29,9.29,0,0,0,3.13.83c5.45.69,10.89,1.38,16.35,1.94a10.41,10.41,0,0,0,3.07-.71c-11.48-9.9-24.26-14.61-38.71-14.56Z"
                        />
                        <path class="path-7 footballloader" fill="#C80D0D" d="M66.28,132.51c13.36,3.78,25.62,3.5,38-.9C91.68,129.59,79.36,128,66.28,132.51Z" />
                        <path class="path-8 footballloader" fill="#C80D0D" d="M127.2,30.66l-1.27.37a18.58,18.58,0,0,0,1,3.08c3,5.52,6.21,10.89,8.89,16.54,1.34,2.83,3.41,3.82,6.49,4.9a60.38,60.38,0,0,0-15.12-24.9Z" />
                        <path class="bb-9" fill="#C80D0D" d="M117.35,125c5.58-2.32,16.9-13.84,18.1-19.2-2.41,1.46-5.18,2.36-6.78,4.23-4.21,5-7.89,10.37-11.32,15Z" />
                    </svg>
            </svg>
            <div v-else-if="pagedMatchList.length>0" class="px-1 lg:px-4 w-full">
                <TransitionGroup name="matchlist">
                    <MatchField v-for="(match, index) in pagedMatchList" :key="match.matchId" :match="match" :index="index"/>
                </TransitionGroup>
            </div>
            <div v-else class="w-full">
                    <h3 class="text-center text-lg p-3">No existe ningún resultado con los filtros aplicados</h3>
                    <div class="flex place-content-center p-6">
                        <img src="/illustrations/noresults.svg" class="lg:w-1/4 w-full select-none pointer-events-none" alt="image representing no results with applied filters">
                    </div>
            </div>
        </div>
        <div v-else class="w-full">
            <h3 class="text-center text-lg p-3">Ha ocurrido un error. Prueba de nuevo más tarde</h3>
            <h3 class="text-center text-lg px-3 "><i>Más información: <a href="https://status.caracantosmeaos.club/">https://status.caracantosmeaos.club/</a></i></h3>
            <div class="flex place-content-center p-6">
                <img src="/illustrations/bugfixingsvg.svg" class="lg:w-1/4 w-full select-none pointer-events-none" alt="Image representing error">
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import { onBeforeMount, type Ref, ref, computed, watch, type ComputedRef } from 'vue';
    import ClubMatchesService from '@services/ClubMatchesService';
    import ClubMatchEntity from '@models/match/ClubMatchEntity'
    import MatchField from './MatchField.vue';
    import ClubMembersService from '@services/ClubMembersService';
    import ClubMember from '@/model/ClubMemberEntity'
    import Paginator from '@components/Paginator.vue';
    import VueTailwindDatepicker from "vue-tailwind-datepicker";
    import type MatchPlayerEntity from '@/model/match/MatchPlayerEntity';

    const matchService = new ClubMatchesService()
    const matches:Ref<ClubMatchEntity[]> = matchService.getData()
    const isLoading = matchService.isloading
    const status = matchService.getStatus()

    const memberService = new ClubMembersService()
    const members:Ref<ClubMember[]> = memberService.getData()
    const isMembersLoading = memberService.isloading
    const memberStatus = matchService.getStatus()


    const paginatorPage = ref(1)
    const paginatorItemsPerPage = 5

    onBeforeMount(async ()=>{
        await memberService.fetch()
        await matchService.fetch()
        members.value.forEach(e => {playersFilter.value[e.playerName]=false})
    })

    const props = defineProps<{
        matchId?: String,
        matchTypeLeague?: boolean,
        matchTypePlayoff?: boolean,
        matchTypeFriendly?: boolean,
        dateFrom?: String,
        dateTo?: String
    }>()

    
    function onPageChange(pagenum:number){
        paginatorPage.value = pagenum
    }

    const IDFilter = ref(props.matchId.toString()??"")
    const playerNameFilter = ref("")
    const leagueFilter = ref(props.matchTypeLeague);
    const playoffFilter = ref(props.matchTypePlayoff);
    const friendlyFilter = ref(props.matchTypeFriendly);
    const matchTypeFilter = computed(() => {
        var filter = []
        if(leagueFilter.value) filter.push("league")
        if(playoffFilter.value) filter.push("playoff")
        if(friendlyFilter.value) filter.push("friendly")
        return filter
    })
    const dateFilter = ref({
        startDate: props.dateFrom.toString(),
        endDate: props.dateTo.toString(),
    });
    const dateFormatter = ref({
        date: 'DD/MM/YYYY',
        month: 'MM'
    })
    const datePickerOptions = ref({
    shortcuts: {
        today: "Hoy",
        yesterday: "Ayer",
        past: (period) =>"Hace "+ period + " Días",
        currentMonth: "Este mes",
        pastMonth: "Mes pasado",
    },
    footer: {
        apply: "Aplicar",
        cancel: "Cancelar",
    },
    });
    const minPlayersFilter = ref(2)

    const playersFilter = ref({})

    function togglePlayerFilter(player){
        console.log(player)
        console.log(playersFilter.value)
    }

    const normalize = (str:string) =>
                str
                    ?.toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "") ?? "";

    const filteredPlayerNames = computed(()=>{
        var plnames = []
        //console.log(Object.entries(playersFilter.value))
        Object.entries(playersFilter.value).forEach(([plname, value]) => {
            if(value)plnames.push(plname)
        });
        return plnames
    })
    const filteredPlayerNamesPretty = computed(()=>{
        var str = ""
        for(var i in filteredPlayerNames.value){
            str+=filteredPlayerNames.value[i]
            if(filteredPlayerNames.value.length!=(Number(i)+1))str+=", "
        }
        return str
    })
    function playerNames(players: MatchPlayerEntity[]){
        var plnames = []
        players.forEach(e =>{
            plnames.push(e.playername)
        })
        return plnames
    }
    
    //watch for filter changes and reset pagination
    watch(
        [IDFilter,dateFilter,matchTypeFilter,minPlayersFilter,playersFilter],
        () =>{
            paginatorPage.value = 1
        }
    )


    function handleFilters(list: ClubMatchEntity[]){
        try{
            var filteredList = list.filter((el) => IDFilter.value.toString().includes(el.matchId.toString()) || el.matchId.toString().startsWith(IDFilter.value) || el.matchId===Number(IDFilter.value) );
            filteredList = filteredList.filter( (el) => matchTypeFilter.value.includes(el.matchType))
            filteredList = filteredList.filter(el => (el.localTeam ? filteredPlayerNames.value.every(fp =>playerNames(el.localClub.players).includes(fp)) : filteredPlayerNames.value.every(fp =>playerNames(el.awayClub.players).includes(fp))) )
            filteredList = filteredList.filter( (el) => el.localTeam ? el.localClub.players.length>=minPlayersFilter.value : el.awayClub.players.length>=minPlayersFilter.value )
            filteredList = dateFilter.value.startDate!=="" && dateFilter.value.endDate!=="" 
            ? filteredList.filter( (el) => (new Date(el.timestamp*1000).getTime() >= toDate(dateFilter.value.startDate).getTime() && new Date(el.timestamp*1000).getTime()<=toDate(dateFilter.value.endDate, true).getTime()) ) : filteredList
            return filteredList
        }catch(e){
            return []
        }

    }

    function firstChar(str: string){
        return str.charAt(0)
    }

    function toDate(isodate: string, end?: boolean){
        var splitted = isodate.split("/")
        var utcd = splitted[2]+"-"+splitted[1]+"-"+splitted[0]
        var d = new Date(utcd)
        d.setHours(end ? 23 : 0)
        d.setMinutes(end ? 59 : 0)

        return new Date(d)
    }

    function handleOrder(list: ClubMatchEntity[]){
        return list.sort((a:ClubMatchEntity,b:ClubMatchEntity) => (a.timestamp < b.timestamp) ? 1 : ((b.timestamp < a.timestamp) ? -1 : 0))
    }

    const finalMatchList = computed(() => {
        return handleOrder(handleFilters(matches.value))
    })

    const pagedMatchList = computed(() => {
        const startIndex = (paginatorPage.value - 1) * paginatorItemsPerPage;
        const endIndex = startIndex + paginatorItemsPerPage;

        return finalMatchList.value.slice(startIndex, endIndex);
    });

    const hasErrorComputed = computed(()=>{
        return (status.value!=200 && !isLoading.value)
    })
</script>

<style>
svg.footballloader {
      height: 200px;
      display: block;
      margin: 0 auto;
    
}

path.footballloader {
        animation-duration: 1s;
        animation-name: pulse;
        animation-iteration-count: infinite;
        color: #C80D0D;

}

.footballloader.path-7 {
          animation-delay: -1s
        }
        .footballloader.path-6 {
          animation-delay: -.875s
        }
        .footballloader.path-5 {
          animation-delay: -.75s
        }
        .footballloader.path-4 {
          animation-delay: -.625s
        }
        .footballloader.path-3 {
          animation-delay: -.5s
        }
        .footballloader.path-2 {
          animation-delay: -.375s
        }
        .footballloader.path-1 {
          animation-delay: -.25s
        }
        .footballloader.path-0 {
          animation-delay: -.125s
        }


@keyframes pulse {
  0%     { opacity: .1; }
  30%    { opacity: .8; }
  100%   { opacity: .1; }
}

.matchlist-move, 
.matchlist-enter-active,
.matchlist-leave-active {
  transition: all 0.5s ease;
}

.matchlist-enter-from,
.matchlist-leave-to {
  opacity: 0;
  scale: 0;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type=number] {
  -moz-appearance: textfield;
}

</style>ClubMatchesServiceClubMatchesService