<template>
    <div role="contentinfo" class="w-full">
        <header class="flex w-full justify-end">
            <div class="basis-4/4 lg:basis-3/4 w-full py-4 px-6 flex flex-wrap justify-around items-center rounded-lg shadow-lg dark:shadow dark:bg-base-100">
                <div class="basis-2/2 lg:basis-1/2 flex flex-row justify-center align-middle items-center gap-2">
                    <span><strong>Filtrar por nombre</strong></span>
                    <label class="form-control w-full max-w-xs">
                        <input v-model="nameFilter" type="text" placeholder="Nickname o nombre del jugador" class="input input-bordered w-full max-w-xs" />
                    </label>
                </div>
                <div class="basis-2/2 lg:basis-1/2 flex flex-row justify-center align-middle items-center gap-2">
                    <span><strong>Tipo de estadísticas</strong></span>
                    <div class="form-control flex flex-row flex-wrap">
                        <label class="label cursor-pointer">
                            <input type="radio" name="radio-1" class="radio radio-primary" value="friendly" v-model="statsType"/>
                            <span class="label-text m-1">Amistosos</span>
                        </label>
                        <label class="label cursor-pointer">
                            <input type="radio" name="radio-1" class="radio radio-primary" value="official" v-model="statsType"/>
                            <span class="label-text m-1">Oficiales</span>
                        </label>
                        <label class="label cursor-pointer">
                            <input type="radio" name="radio-1" class="radio radio-primary" value="all" v-model="statsType"/>
                            <span class="label-text m-1">Combinados</span>
                        </label>
                    </div>
                </div>
                <div class="basis-2/2 lg:basis-1/2 flex flex-row justify-center align-middle items-center gap-1">
                    <div class="dropdown"><span><strong>Ordenar por </strong></span>
                        <div tabindex="0" role="button" class="btn m-1">{{orderTypes[selectedOrder]}}</div>
                        <ul tabindex="0" class="dropdown-content z-30 menu p-2 shadow bg-base-200 rounded-box w-52" ref="dropdownContent">
                            <li v-for="(value, index) in orderTypes"><a v-on:click="selectedOrder=index" @click="closeDropdown()">{{ value }}</a></li>
                        </ul>
                    </div>
                    <div class="tooltip tooltip-bottom" :data-tip="currentOrderStr">
                        <label class="swap">
                            <input type="checkbox" v-on:click="handleAscOrder"/>
                            <svg class="swap-off w-6 h-6"  aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7"/>
                            </svg>
                            <svg class="swap-on w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m5 15 7-7 7 7"/>
                            </svg>
                        </label>
                    </div>

                </div>
            </div>
            
        </header> 
        <div v-if="!isloading" class="flex justify-end w-3/4 ml-auto font-light text-xs"><p>{{ finalMembers.length }} resultados</p></div>  
        <div class="flex flex-wrap w-full mt-4 ">
            <aside class=" basis-4/4 lg:basis-1/4 w-full lg:px-4 min-h-full">
                <div role="complementary" class="p-4 min-h-full rounded-lg shadow-lg dark:shadow dark:bg-base-200">
                    <span class="px-3 justify-center"><strong>Filtrar por posición</strong></span>
                    <div class="form-control flex flex-wrap flex-row">
                            <label class="label cursor-pointer">
                                <span class="label-text p-2">Portero</span> 
                                <input type="checkbox" class="checkbox checkbox-sm" v-model="gkPosFilter" />  
                            </label>
                            <label class="label cursor-pointer">
                                <span class="label-text p-2">Defensa</span> 
                                <input type="checkbox" class="checkbox checkbox-sm" v-model="defPosFilter" />
                            </label>
                            <label class="label cursor-pointer">
                                <span class="label-text p-2">Centrocampista</span> 
                                <input type="checkbox" class="checkbox checkbox-sm" v-model="mcPosFilter" />
                            </label>
                            <label class="label cursor-pointer">
                                <span class="label-text p-2">Delantero</span> 
                                <input type="checkbox" class="checkbox checkbox-sm" v-model="fwPosFilter" />
                            </label>
                    </div>
                    <div class="mt-3">
                        <span class=" px-3 justify-center"><strong>Filtrar por media mínima: </strong> <span class="text-lg">{{ overallFilter }}</span> </span>
                        <input v-model="overallFilter" type="range" min="66" max="99"  class="range range-xs" />
                    </div>
                </div>
            </aside>
            <div class="basis-4/4 lg:basis-3/4 w-full p-4 rounded-lg shadow lg:shadow-md dark:shadow dark:bg-base-200">
                <!-- Ball loader -->
                <div v-if="isloading" class="w-full">
                    <svg class="footballloader" viewBox="0 0 866 866" xmlns="http://www.w3.org/2000/svg">
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
                </div>


                <!--<PlayerGridList v-else :players="finalMembers"/>-->


                <div v-else-if="finalMembers.length>0" class="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3  content-center justify-center">
                    <PlayerDetailModal v-if="modalVisible && !isSSR" :player="detailedPlayer" @detailModalClosed="handleClosedModal" />
                    <TransitionGroup name="playerlist">
                        <PlayerField v-for="(member, index) in finalMembers" :key="member.playerName" :player="member" :index="index" @clickedPlayer="handlePlayerClick"/>
                    </TransitionGroup>
			    </div>
                <div v-else class="w-full">
                    <h3 class="text-center text-lg p-3">No existe ningún resultado con los filtros aplicados</h3>
                    <div class="flex place-content-center p-6">
                        <img src="/illustrations/noresults.svg" class="lg:w-1/4 w-full select-none pointer-events-none" alt="background decoration">
                    </div>
                </div>

            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
    import { onBeforeMount, type Ref, ref, watch, computed, type ComputedRef, onMounted, defineAsyncComponent } from 'vue';
    import ClubMembersService from '@services/ClubMembersService';
    import PlayersStatsService from '@/services/PlayersStatsService';
    import ClubMember from '@/model/ClubMemberEntity'
    import PlayerStatsEntity from '@/model/PlayerStatsEntity';
    import PlayerField from '@components/player/PlayerField.vue';


    const PlayerDetailModal = defineAsyncComponent(() => 
        import('@components/player/PlayerDetailModal.vue')
    )

    const isSSR = ref(import.meta.env.SSR)


    const props = defineProps<{
        detailPlayerName: string
    }>()
    const selectedDetailedPlayer = ref(-1)

    const dropdownContent = ref();

    function closeDropdown() {
        dropdownContent.value.blur()
    }

    type StatsType = 'official' | 'friendly' | 'all'
    const statsType = ref<StatsType>('all')
    

    const memberService = new ClubMembersService()
    //const plStatsOfficialService = new PlayersStatsService('official')
    //const plStatsFriendlyService = new PlayersStatsService('friendly')
    const plStatsService = new PlayersStatsService()
    const members:Ref<ClubMember[]> = memberService.getData()
    const isloading = memberService.isloading || plStatsService.isloading
    const memberError = ref(memberService.getStatus().value !== 200 )
    const plstatsError = ref(plStatsService.getStatus().value !== 200 )
    const errorText = memberService.getError()
    const hasError:Boolean = (errorText.value=='') ? false : true

function mergeStats(
    official: PlayerStatsEntity[],
    friendly: PlayerStatsEntity[]
): PlayerStatsEntity[] {

    const map = new Map<string, PlayerStatsEntity>()

    const merge = (stats: PlayerStatsEntity[]) => {
        for (const s of stats) {

            if (!map.has(s.playerName)) {
                map.set(s.playerName, new PlayerStatsEntity({ ...s }))
                continue
            }

            const existing = map.get(s.playerName)!

            existing.gamesPlayed += s.gamesPlayed
            existing.goals += s.goals
            existing.assists += s.assists
            existing.wins += s.wins
            existing.losses += s.losses
            existing.ties += s.ties
            existing.minutesPlayed += s.minutesPlayed
            existing.shots += s.shots
            existing.saves += s.saves
            existing.tacklesMade += s.tacklesMade
            existing.tacklesSuccess += s.tacklesSuccess
            existing.passesMade += s.passesMade
            existing.passesSuccess += s.passesSuccess
            existing.cleanSheets += s.cleanSheets
            existing.redCards += s.redCards
            existing.manOfTheMatch += s.manOfTheMatch
            existing.hattricks += s.hattricks
            existing.pokers += s.pokers
            existing.ratingSum += s.ratingSum
        }
    }

    merge(official)
    merge(friendly)

    const result = Array.from(map.values())

    for (const p of result) {
        p.computeAggregatedStats()
    }

    return result
}


const plstats = computed<PlayerStatsEntity[]>(() => {
    const data = plStatsService.getData().value

    if (statsType.value === 'official') {
        return data.official ?? []
    }

    if (statsType.value === 'friendly') {
        return data.friendly ?? []
    }

    return mergeStats(data.official ?? [], data.friendly ?? [])

})


    const mergedPlayers = computed(() => {

        if (!members.value?.length) return []

        const statsMap = new Map(
            plstats.value.map(s => [s.playerName, s])
        )

        return members.value.map(member => ({
            ...member,
            stats: statsMap.get(member.playerName)
        }))
    })


    

    let ascOrder = false
    let currentOrderStr = "Mayor a menor"



    function handleAscOrder(){
        ascOrder = !ascOrder
        currentOrderStr = ascOrder ? "Menor a mayor" : "Mayor a menor" 
        members.value.reverse()
    }

    const orderTypes = ['Partidos jugados','Goles', 'Asistencias', 'Valoración media', 'Partidos ganados (%)', 
    'Porterías a cero', 'Goles encajados', 'Encajados por partido', 'Tarjetas rojas']
    const selectedOrder = ref(0)

    function handleOrder(fmembers){
        
        if(fmembers.length == 0) return fmembers
        switch(selectedOrder.value){
            case 0:
                fmembers.sort((a,b) => (a.stats?.gamesPlayed > b.stats?.gamesPlayed) ? 1 : ((b.stats?.gamesPlayed > a.stats?.gamesPlayed) ? -1 : 0))
                if(!ascOrder) fmembers.reverse()
                break;
            case 1:
                fmembers.sort((a,b) => (a.stats?.goals > b.stats?.goals) ? 1 : ((b.stats?.goals > a.stats?.goals) ? -1 : 0))
                if(!ascOrder) fmembers.reverse()
                break;
            case 2:
                fmembers.sort((a,b) => (a.stats?.assists > b.stats?.assists) ? 1 : ((b.stats?.assists > a.stats?.assists) ? -1 : 0))
                if(!ascOrder) fmembers.reverse()
                break;
            case 3:
                fmembers.sort((a,b) => (a.stats?.ratingAve > b.stats?.ratingAve) ? 1 : ((b.stats?.ratingAve > a.stats?.ratingAve) ? -1 : 0))
                if(!ascOrder) fmembers.reverse()
                break;
            case 4:
                fmembers.sort((a,b) => (a.stats?.winRate > b.stats?.winRate) ? 1 : ((b.stats?.winRate > a.stats?.winRate) ? -1 : 0))
                if(!ascOrder) fmembers.reverse()
                break;
            case 5:
                fmembers.sort((a,b) => (a.stats?.cleanSheets > b.stats?.cleanSheets) ? 1 : ((b.stats?.cleanSheets > a.stats?.cleanSheets) ? -1 : 0))
                if(!ascOrder) fmembers.reverse()
                break;
            case 6:
                fmembers.sort((a,b) => (a.stats?.goalsConceded > b.stats?.goalsConceded) ? 1 : ((b.stats?.goalsConceded > a.stats?.goalsConceded) ? -1 : 0))
                if(!ascOrder) fmembers.reverse()
                break;
            case 7:
                fmembers.sort((a,b) => (a.stats?.goalsConcededPerMatch > b.stats?.goalsConcededPerMatch) ? 1 : ((b.stats?.goalsConcededPerMatch > a.stats?.goalsConcededPerMatch) ? -1 : 0))
                if(!ascOrder) fmembers.reverse()
                break;
            case 8:
                fmembers.sort((a,b) => (a.stats?.redCards > b.stats?.redCards) ? 1 : ((b.stats?.redCards > a.stats?.redCards) ? -1 : 0))
                if(!ascOrder) fmembers.reverse()
                break;
            default:
                fmembers.sort((a,b) => (a.stats?.gamesPlayed > b.stats.gamesPlayed) ? 1 : ((b.stats.gamesPlayed > a.stats.gamesPlayed) ? -1 : 0))
                if(!ascOrder) fmembers.reverse()
        }
    //activePlayer.value = -1
        return fmembers
    }

    const nameFilter = ref("")
    const gkPosFilter = ref(true); const defPosFilter = ref(true); const mcPosFilter = ref(true); const fwPosFilter = ref(true)

    /*function handleFilters(){
        var filteredMembers = mergedPlayers.value.filter((el) => el.playerName.toLowerCase().includes(nameFilter.value.toLowerCase()) || el.proName.toLowerCase().includes(nameFilter.value.toLowerCase()));
        filteredMembers = filteredMembers.filter((el) => Object.keys(el.stats.playedPositions).some(pos => positionFilter.value.includes(pos))  )
        filteredMembers = filteredMembers.filter((el) => el.proOverall>=overallFilter.value)
        return filteredMembers
    }*/

    function handleFilters() {

        const search = nameFilter.value.toLowerCase()
        const filterSet = new Set(positionFilter.value)


        return mergedPlayers.value.filter(el => {

            const normalize = (str:string) =>
                str
                    ?.toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "") ?? "";

            const nameMatch =
                normalize(el.playerName).includes(normalize(search)) ||
                normalize(el.proName).includes(normalize(search))

            const positions = Object.keys(el.stats?.playedPositions ?? {})

            const positionMatch =
                positionFilter.value.length === 0 ||
                positions.some(pos => filterSet.has(pos))

            const overallMatch =
                el.proOverall === undefined ||
                el.proOverall === 0 ||
                el.proOverall >= overallFilter.value

            return nameMatch && positionMatch && overallMatch
        })
    }

    const finalMembers = computed(() => {
        var fmembers = handleFilters()
        fmembers = handleOrder(fmembers)

        return fmembers
    })

    const positionFilter = computed(() => {
        var posFilter = []
        if(gkPosFilter.value) posFilter.push("goalkeeper")
        if(defPosFilter.value) posFilter.push("defender")
        if(mcPosFilter.value) posFilter.push("midfielder")
        if(fwPosFilter.value) posFilter.push("forward")
        return posFilter
    })

    const overallFilter = ref(66)

    const preDetailedPL = ref(null)
    function handlePlayerClick(edata){
        preDetailedPL.value = edata.player;
        modalVisible.value = true
    }

    const modalVisible = ref(false)
    function handleClosedModal(){
        modalVisible.value = false
        if(props.detailPlayerName!=""){
            window.location.href = '.';
        }
        selectedDetailedPlayer.value = -1;
    }

    //const preDetailedPL = ref(ClubMember)
    const detailedPlayer:ComputedRef<ClubMember> = computed(() => {
        let p = null
        if(preDetailedPL.value!=null) p = preDetailedPL.value
        else{
            if(props.detailPlayerName!=""){
             p = members.value.filter((el) => el.playerName.toLowerCase() == props.detailPlayerName.toLowerCase() )[0]
            if(!p){
                window.location.href = '.';
            }
        }else if(selectedDetailedPlayer.value!=-1){
            p = members.value[selectedDetailedPlayer.value]
        }
        }
        return p;
    })

    onBeforeMount(async ()=>{
        await Promise.all([
            memberService.fetch(),
            //plStatsOfficialService.fetch(),
            //plStatsFriendlyService.fetch()
            plStatsService.fetch()
        ])
    })

    onMounted(async ()=>{
        if(props.detailPlayerName!="" || selectedDetailedPlayer.value!=-1){
            modalVisible.value = true
        }
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
        color: #fed000;

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

.playerlist-move, 
.playerlist-enter-active,
.playerlist-leave-active {
  transition: all 0.5s ease;
}

.playerlist-enter-from,
.playerlist-leave-to {
  opacity: 0;
  scale: 0;
}

</style>