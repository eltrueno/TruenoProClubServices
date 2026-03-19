<style scoped>



</style>
<template>
    <div :id="match.matchId.toString()" tabindex="0" class="collapse collapse-arrow border-base-200 bg-base-100 border my-3 w-full min-w-full shadow-lg dark:shadow">
        <input type="checkbox" />
        <div class="collapse-title flex flex-col w-full min-w-full px-2 py-0">
            <div class="flex items-center justify-center">
                <div class="badge badge-ghost badge-sm">{{ timestampToStr(match.timestamp) }}</div>
            </div>
            <div class="flex items-center justify-center align-middle h-full w-full">
                <div class="justify-self-start w-full flex justify-end">
                    <!-- Own Team -->
                    <div class="indicator self-center p-2 m-2" v-if="match.localClub.matchStats.redCards>0">
                        <span class="indicator-item badge badge-neutral badge-xs">{{ match.localClub.matchStats.redCards }}</span>
                        <div class="tooltip tooltip-right lg:tooltip-bottom" :data-tip="getRedCardPlayers(true)"><div class="grid h-6 w-4 place-items-center bg-error rounded-sm"></div></div>
                    </div>
                    <p class="text-end self-center font-medium text-2xl hidden md:flex">{{match.localClub.name}}</p>
                    <p class="text-end font-extrabold text-4xl bg-base-200 dark:bg-base-300 justify-self-end self-end p-4 m-4 mr-1 rounded-2xl"
                    :class=resultColorLocal>{{ match.localClub.matchStats.goals }}</p>
                </div>
                <div class="self-center justify-self-center text-xl font-extrabold m-2 relative text-center">
                    :
                </div>
                <div class="justify-self-end w-full flex justify-start">
                    <!-- Rival Team -->
                    <p class="text-start font-extrabold text-4xl bg-base-200 dark:bg-base-300 justify-self-end self-end p-4 m-4 ml-1 rounded-2xl"
                    :class=resultColorAway>{{ match.awayClub.matchStats.goals }}</p>
                    <p class="text-start self-center font-medium text-2xl hidden md:flex">{{match.awayClub.name}}</p>
                    <div class="indicator self-center p-2 m-2" v-if="match.awayClub.matchStats.redCards>0">
                        <span class="indicator-item badge badge-neutral badge-xs">{{ match.awayClub.matchStats.redCards }}</span>
                        <div class="tooltip tooltip-left lg:tooltip-bottom" :data-tip="getRedCardPlayers(false)"><div class="grid h-6 w-4 place-items-center bg-error rounded-sm"></div></div>
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-center align-middle  w-full md:hidden">
                <div class="justify-self-start w-full flex justify-end text-sm">
                    {{ match.localClub.name }}
                </div>
                <div class="self-center justify-self-center text-md font-extrabold mx-2 relative text-center">
                    VS
                </div>
                <div class="justify-self-end w-full flex justify-start text-sm">
                    {{ match.awayClub.name }}
                </div>
            </div>
            <div class="flex items-center justify-center mt-2 mb-1 md:mt-0 w-full space-x-4">
                <div v-if="match.winnerByDnf" class="badge badge-error badge-sm badge-outline">Desconexión</div>
                <div class="badge badge-primary badge-sm  p-2">{{ translateMatchType(match.matchType) }}</div>
            </div>
        </div>
        <div class="collapse-content flex flex-col w-full h-full min-h-full px-2 justify-center align-middle items-center overflow-x-hidden">
            <article class="mt-4 w-full">
                <header class="font-semibold text-lg md:text-xl text-primary text-center">RESUMEN DEL PARTIDO</header>
                <div class="flex w-full mt-2 items-center flex-col mx-auto lg:px-48">
                    <table class="w-full text-center px-1 table-fixed md:w-10/12 xl:w-8/12">
                        <tbody>
                            <tr class="" v-for="(stat, index) in orderedMatchStats(true)">
                                <td class="py-2 font-semibold w-3/12 ">
                                    <div class="w-full text-right">
                                        <span class="w-fit px-2 rounded-md text-right" :class="{'bg-base-300': stat.stat>orderedMatchStats(false)[index].stat,
                                            'font-bold': stat.stat>orderedMatchStats(false)[index].stat
                                        }">{{ trimDecimal(stat.stat, 1) }}<span class="text-right" v-if='stat.name.includes("%")'>%</span></span>
                                    </div>
                                </td>
                                <td class="py-2 text-sm md:text-md lg:text-lg font-bold text-center w-6/12 px-2">{{ stat.name }}</td>
                                <td class="py-2 font-semibold w-3/12 ">
                                    <div class="w-full text-left">
                                        <span class="w-fit px-2 rounded-md text-left" :class="{'bg-base-300': orderedMatchStats(false)[index].stat>stat.stat,
                                        'font-bold': orderedMatchStats(false)[index].stat>stat.stat
                                        }">{{ trimDecimal(orderedMatchStats(false)[index].stat, 1) }}<span v-if='stat.name.includes("%")'>%</span></span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </article>
            <article class="mt-4 w-full py-1 overflow-hidden">
                <header class="font-semibold text-lg md:text-xl text-primary text-center">JUGADORES</header>
                <div class="hidden lg:flex items-center justify-center align-middle w-full h-full p-2  lg:py-4 mt-2">
                    <div class="w-full flex flex-col h-full justify-start align-top items-start">
                        <table class="w-full lg:w-8/12 text-center self-end justify-end">
                            <thead class="bg-base-300 rounded-xl">
                                <tr class="bg-base-300 rounded-xl">
                                    <th class="bg-base-100 invisible"></th>
                                    <th class="p-2 text-lg rounded-s-xl hidden lg:table-cell">Goles</th>
                                    <th class="p-2 text-lg rounded-s-xl lg:hidden">Gol</th>
                                    <th class="p-2 text-lg hidden lg:table-cell">Asistencias</th>
                                    <th class="p-2 text-lg lg:hidden">Asis</th>
                                    <th class="p-2 text-lg rounded-e-xl hidden lg:table-cell">Valoración</th>
                                    <th class="p-2 text-lg rounded-e-xl lg:hidden">Val</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(p,index) in match.localClub.players">
                                    <td class="font-semibold text-md text-primary p-1 bg-base-300" :class="{
                                        'rounded-t-xl': index==0,
                                        'rounded-b-xl': index+1==match.localClub.players.length
                                    }">
                                        <p class="inline-flex">
                                            {{ p.playername }}
                                            <div class="tooltip tooltip-right tooltip-primary" data-tip="Mejor del partido" v-if="p.manOfTheMatch">
                                                <svg class="w-5 h-5 text-primary" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M13.849 4.22c-.684-1.626-3.014-1.626-3.698 0L8.397 8.387l-4.552.361c-1.775.14-2.495 2.331-1.142 3.477l3.468 
                                                    2.937-1.06 4.392c-.413 1.713 1.472 3.067 2.992 2.149L12 19.35l3.897 2.354c1.52.918 3.405-.436 2.992-2.15l-1.06-4.39 
                                                    3.468-2.938c1.353-1.146.633-3.336-1.142-3.477l-4.552-.36-1.754-4.17Z"/>
                                                </svg>
                                            </div>
                                        </p>
                                    </td>
                                    <td>{{ p.goals }}</td>
                                    <td>{{ p.assists }}</td>
                                    <td>{{ p.rating }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="self-center justify-self-center text-md font-extrabold mx-2 relative text-center h-full py-1 hidden lg:block">
                        <div class="divider divider-horizontal h-full">VS</div>
                    </div>
                    <div class="w-full flex flex-col h-full justify-start align-top items-start">
                        <table class="w-full lg:w-8/12 text-center self-start justify-start">
                            <thead class="bg-base-300 rounded-xl">
                                <tr class="bg-base-300 rounded-xl ">
                                    <th class="p-2 text-lg rounded-s-xl hidden lg:table-cell">Goles</th>
                                    <th class="p-2 text-lg rounded-s-xl lg:hidden">Gol</th>
                                    <th class="p-2 text-lg hidden lg:table-cell">Asistencias</th>
                                    <th class="p-2 text-lg lg:hidden">Asis</th>
                                    <th class="p-2 text-lg rounded-e-xl hidden lg:table-cell">Valoración</th>
                                    <th class="p-2 text-lg rounded-e-xl lg:hidden">Val</th>
                                    <th class="bg-base-100 invisible"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(p,index) in match.awayClub.players">
                                    <td>{{ p.goals }}</td>
                                    <td>{{ p.assists }}</td>
                                    <td>{{ p.rating }}</td>
                                    <td class="font-semibold text-md text-primary p-1 bg-base-300" :class="{
                                        'rounded-t-xl': index==0,
                                        'rounded-b-xl': index+1==match.awayClub.players.length
                                    }">
                                    <p class="inline-flex">
                                        <div class="tooltip tooltip-left tooltip-primary" data-tip="Mejor del partido" v-if="p.manOfTheMatch">
                                            <svg class="w-5 h-5 text-primary" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M13.849 4.22c-.684-1.626-3.014-1.626-3.698 0L8.397 8.387l-4.552.361c-1.775.14-2.495 2.331-1.142 3.477l3.468 
                                                2.937-1.06 4.392c-.413 1.713 1.472 3.067 2.992 2.149L12 19.35l3.897 2.354c1.52.918 3.405-.436 2.992-2.15l-1.06-4.39 
                                                3.468-2.938c1.353-1.146.633-3.336-1.142-3.477l-4.552-.36-1.754-4.17Z"/>
                                            </svg>
                                        </div>
                                        {{ p.playername }}
                                    </p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="lg:hidden flex flex-col w-full justify-center align-middle items-center mt-2">
                    <table class="w-full md:w-10/12 text-center self-center justify-center table-fixed">
                            <thead class="bg-base-300 rounded-xl table-fixed">
                                <tr class="bg-base-300 rounded-xl">
                                    <th class="bg-base-100 invisible w-6/12"></th>
                                    <th class="p-2  rounded-s-xl ">Gol</th>
                                    <th class="p-2  ">Asis</th>
                                    <th class="p-2  rounded-e-xl ">Val</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(p,index) in match.localClub.players">
                                    <td class="font-semibold text-md text-primary p-1 bg-base-300 flex items-center align-middle justify-center" :class="{
                                        'rounded-t-xl': index==0,
                                        'rounded-b-xl': index+1==match.localClub.players.length
                                    }">
                                        <p class="inline-flex truncate">
                                            {{ p.playername }}

                                        </p>
                                        <div class="tooltip tooltip-right tooltip-primary" data-tip="Mejor del partido" v-if="p.manOfTheMatch">
                                                <svg class="w-5 h-5 text-primary" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M13.849 4.22c-.684-1.626-3.014-1.626-3.698 0L8.397 8.387l-4.552.361c-1.775.14-2.495 2.331-1.142 3.477l3.468 
                                                    2.937-1.06 4.392c-.413 1.713 1.472 3.067 2.992 2.149L12 19.35l3.897 2.354c1.52.918 3.405-.436 2.992-2.15l-1.06-4.39 
                                                    3.468-2.938c1.353-1.146.633-3.336-1.142-3.477l-4.552-.36-1.754-4.17Z"/>
                                                </svg>
                                            </div>
                                    </td>
                                    <td>{{ p.goals }}</td>
                                    <td>{{ p.assists }}</td>
                                    <td>{{ p.rating }}</td>
                                </tr>
                            </tbody>
                    </table>
                    <div class="divider w-full px-2">VS</div>
                    <table class="w-full md:w-10/12 text-center self-center justify-center table-fixed">
                            <thead class="bg-base-300 rounded-xl table-fixed">
                                <tr class="bg-base-300 rounded-xl">
                                    <th class="bg-base-100 invisible w-6/12"></th>
                                    <th class="p-2 rounded-s-xl">Gol</th>
                                    <th class="p-2">Asis</th>
                                    <th class="p-2 rounded-e-xl">Val</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(p,index) in match.awayClub.players">
                                    <td class="font-semibold text-md text-primary p-1 bg-base-300 flex items-center align-middle justify-center" :class="{
                                        'rounded-t-xl': index==0,
                                        'rounded-b-xl': index+1==match.awayClub.players.length
                                    }">
                                        <p class="inline-flex  truncate">
                                            {{ p.playername }}

                                        </p>
                                        <div class="tooltip tooltip-right tooltip-primary" data-tip="Mejor del partido" v-if="p.manOfTheMatch">
                                                <svg class="w-5 h-5 text-primary" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M13.849 4.22c-.684-1.626-3.014-1.626-3.698 0L8.397 8.387l-4.552.361c-1.775.14-2.495 2.331-1.142 3.477l3.468 
                                                    2.937-1.06 4.392c-.413 1.713 1.472 3.067 2.992 2.149L12 19.35l3.897 2.354c1.52.918 3.405-.436 2.992-2.15l-1.06-4.39 
                                                    3.468-2.938c1.353-1.146.633-3.336-1.142-3.477l-4.552-.36-1.754-4.17Z"/>
                                                </svg>
                                            </div>
                                    </td>
                                    <td>{{ p.goals }}</td>
                                    <td>{{ p.assists }}</td>
                                    <td>{{ p.rating }}</td>
                                </tr>
                            </tbody>
                    </table>
                </div>
            </article>
            <article>
                <a :href=detailurl><button class="btn btn-sm btn-primary mt-4">Ver más</button></a>
            </article>
            <article>
                <span class="font-thin text-xs text-neutral">ID: #{{ match.matchId }}</span>
            </article>
        </div>
    </div>
</template>
<script setup lang="ts">
    import ClubMatchEntity from '@models/match/ClubMatchEntity'
    import MatchPlayerEntity from '@models/match/MatchPlayerEntity'
    import { translateMatchType  } from '@/i18n/translations'
    const props = defineProps<{
        match: ClubMatchEntity,
        index: number
        key
    }>()


    const detailurl = `/partido/${props.match.matchId}`

    function toMatchDetail() {
        window.location.href = `/partido/${props.match.matchId}`;
    }

    const resultColorLocal = {
        'text-error': props.match.result=="loose" && props.match.localTeam,
        'text-success': props.match.result=="win" && props.match.localTeam
    }

    const resultColorAway = {
        'text-error': props.match.result=="loose" && !props.match.localTeam,
        'text-success': props.match.result=="win" && !props.match.localTeam
    }


    function orderedMatchStats(local: boolean){
        var team = local ? "localClub": "awayClub"
          return [
            {
                name: "Goles",
                stat: props.match[team].matchStats.goals
            },
            {
                name: "Disparos",
                stat: props.match[team].matchStats.shots
            },
            {
                name: "Acierto disparos (%)",
                stat: props.match[team].matchStats.shotSuccessRate
            },
            {
                name: "Pases intentados",
                stat: props.match[team].matchStats.passesMade
            },
            {
                name: "Pases acertados",
                stat: props.match[team].matchStats.passesSuccess
            },
            {
                name: "Tarjetas rojas",
                stat: props.match[team].matchStats.redCards
            },
            {
                name: "Tacklees intentados",
                stat: props.match[team].matchStats.tacklesMade
            },
            {
                name: "Tacklees acertados",
                stat: props.match[team].matchStats.tackleSuccess
            },
            {
                name: "Acierto tacklees (%)",
                stat: props.match[team].matchStats.tackleSuccessRate
            }
        ]
    }
    

    function trimDecimal(decimal:number, trim:number){
        if(decimal.toString()==="NaN") return 0
        if(decimal.toString().split(".").length>1 && decimal.toString().split(".")[1].length>trim){
            return decimal.toFixed(trim)
        }else return decimal
    }

    function getRedCardPlayers(localclub:boolean){
        var plist = []
        if(localclub){
            for(var p in props.match.localClub.players){
                var parsedp:MatchPlayerEntity = props.match.localClub.players[p]
                if(parsedp.redCards!=0) plist.push(parsedp.playername);
            }
        }else{
            for(var p in props.match.awayClub.players){
                var parsedp:MatchPlayerEntity = props.match.awayClub.players[p]
                if(parsedp.redCards!=0) plist.push(parsedp.playername)
            }
        }
        return plist
    }

    function getPlayerNames(localClub:boolean){
        var plist = []
        if(localClub){
            props.match.localClub.players.forEach((p) => plist.push(p.playername));
        }else{
            props.match.awayClub.players.forEach((p) => plist.push(p.playername));
        }
        return plist
    }

    function timestampToStr(timestamp:number){
        const dt = new Date(timestamp*1000)
        var day = dt.getDate().toString()
        day = (day.toString().length==1) ? "0"+day : day
        var month = (dt.getMonth()+1).toString()
        month = (month.toString().length==1) ? "0"+month : month
        var h = dt.getHours().toString()
        h = (h.toString().length==1) ? "0"+h : h
        var m = dt.getMinutes().toString()
        m = (m.toString().length==1) ? "0"+m : m

        return day+"/"+month+"/"+dt.getFullYear()+" a las "+h+":"+m
    }
</script>