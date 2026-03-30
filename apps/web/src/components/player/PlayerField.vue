<template>
    <div class="bg-base-100 text-center rounded-lg shadow-md flex flex-col overflow-hidden">
        <header class="relative">
            <div class="w-full container relative" v-on:mouseover="hovered=true"  v-on:mouseleave="hovered=false" >
                <img :src=topImage class="relative plimg select-none pointer-events-none w-4/6 h-full m-auto z-10 drop-shadow-lg" alt="Player ingame photo" :class="{
                    'plimghover': hovered
                }" @error="defaultTopImage"/>
                <div class="top-0 absolute right-0 p-2 font-semibold text-8xl lg:text-9xl z-0 drop-shadow-lg">{{ player.proOverall? player.proOverall : "¿?" }}</div>
            </div>
            <div class="absolute ploverlay w-full bg-base-100 bg-opacity-70 flex flex-col z-20 " v-on:mouseover="hovered=true" v-on:mouseleave="hovered=false"
            :class="{
                    'plextrainfo-opened': hovered
                }">
                <p class="font-bold text-2xl">{{ player.playerName === "SweetYanira5" ? "SweetIAnira" : player.playerName }}
                
                <svg class="w-6 fixed top-2 right-0 animate-bounce" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" 
                :class="{
                    'invisible': hovered
                }">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m16 17-4-4-4 4m8-6-4-4-4 4"/>
                </svg>
                </p>
                <div role="contentinfo">
                    <p class="text-secondary dark:text-primary font-semibold text-xl">{{ player.proName? player.proName : "Desconocido"}}</p>
                </div>
                <div class="plextrainfo-container " >
                    <div class="divider px-4 my-1"></div>
                    <div class="plextrainfo p-1">
                        <div class="flex md:text-lg">
                            <div class="w-full flex justify-center space-x-4 flex-wrap mb-1">
                                <p v-for="pos in Object.keys(player.stats.playedPositions)" class="w-fit font-semibold text-xs flex text-center justify-center p-1 px-2 text-white rounded-full"
                                :class="{
                                    'bg-orange-600': pos==Position.goalkeeper,
                                    'bg-yellow-500': pos==Position.defender,
                                    'bg-green-700': pos==Position.midfielder,
                                    'bg-blue-700': pos==Position.forward
                                }"
                                >
                                    {{ translatePosition(pos).toUpperCase() }}
                                </p>
                            </div>
                        </div>
                        <button class="btn btn-sm btn-primary my-1 md:my-2"  v-on:click="clickPlayer(index,player)">Ver más</button>
                    </div>
                </div>
            </div>
        </header>
    </div>
</template>
<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { translatePosition } from '@/i18n/translations';
    import { Position } from '@/i18n/translations';
    const props = defineProps<{
        player: any,
        index: number
        key
    }>()

    const hovered = ref(false)


    const emit = defineEmits({
        clickedPlayer: ({index, player}) => {return true}
    })

    function clickPlayer(index, player){
        emit('clickedPlayer', {index, player})
    }

    function trimDecimal(decimal:number, trim:number){
        return decimal.toFixed(trim)
    }

    function getTranslatedPositions() {
        if (!props.player.stats.playedPositions) return ''

        return Object.keys(props.player.stats.playedPositions)
            .map(pos => translatePosition(pos))
            .join(', ')
    }


    const topImage = computed(() => {
        return `/players/${props.player.playerName}_top_transp.png`
    })

    function defaultTopImage(e){
        e.target.src = '/players/placeholder_top_transp.png'
    }


</script>
<style scoped>

    .ploverlay{
        /*background: rgba(255,255,255,0);*/
        backdrop-filter: blur(4px);
        bottom: 0;
    }

    .plextrainfo-container{
        max-height: 0;
        overflow: hidden;
        transition: max-height 1s ease-in-out;
    }

    .plextrainfo-opened .plextrainfo-container{
        max-height: 100vh;
    }


    .plimg{
        transform-origin: top;
        aspect-ratio: 8/9;
        transition: transform 0.25s ease-out;
    }

    .plimghover{
        transform: scale(1.5);
        transition: transform 0.8s ease-in-out;
    }

</style>