<template>
    <div v-if="status==200">
        <div id="to_image" class="relative toimage flex flex-col w-full flex-initial overflow-hidden" v-if="!isLoading">
            <div class="flex flex-col w-2/3">
                <p class="px-2 text-primary font-extrabold leading-none drop-shadow-md" 
                :class="{
                'text-16xl': achievement.reached <= 999,
                'text-14xl': achievement.reached > 999 && achievement.reached <= 9999,
                'text-12xl': achievement.reached > 9999
                }
                ">{{ formatNumber(achievement.reached) }}</p>
                <p class="px-2 text-gray-300 font-bold drop-shadow-2xl z-10" 
                :class="{'text-9xl': achievement.type!='assists','text8-5xl': achievement.type==='assists' }">
                {{ AchievementType[achievement.type].toLocaleUpperCase() }}</p>
            </div>
            <img :src="'/players/' + player.playerName + '_full_transp.png'" class="absolute bottom-0 right-0 drop-shadow-2xl"  alt="Player ingame photo" @error="defaultFullImage"/>
            <div class="flex flex-col w-2/3 h-full justify-end mb-10">
                <p class="text-primary text-7xl self-center font-semibold drop-shadow-xl">{{ player.playerName }}</p>
                <p class="text-5xl self-center drop-shadow-lg">{{ translatePosition(player.favoritePositionEnum) }}</p>
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
import { ref, type Ref, computed, onBeforeMount, type ComputedRef } from 'vue';
import ClubMembersService from '@services/ClubMembersService';
import ClubMemberEntity from '@/model/ClubMemberEntity'
import type { IClubMemberAchievement } from '@/interfaces/clubMemberAchievement.interface';
import { AchievementType, translatePosition } from '@/i18n/translations';
const props = defineProps<{
        playerName: string,
        type: string,
        reached: number
    }>()

const memberService = new ClubMembersService()
const players:Ref<ClubMemberEntity[]> = memberService.getData()
const isLoading = memberService.isloading
const status = memberService.getStatus()


onBeforeMount(async ()=>{
     await memberService.fetch()
 })

const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('es-ES',{ useGrouping: true }).format(num);
};

const player:ComputedRef<ClubMemberEntity> = computed(() => {
    return players.value.find(e => e.playerName.toLocaleLowerCase() === props.playerName.toLocaleLowerCase())
})

const achievement:ComputedRef<IClubMemberAchievement> = computed(() => {
    const ach:IClubMemberAchievement = {
        type: props.type as "played" | "goals" | "assists" | "redcards" | "passes" | "motm",
        reached: props.reached
    }
    return ach
})

function defaultFullImage(e){
        e.target.src = '/players/placeholder_full_transp.png'
    }


</script>

<style scoped>
    .toimage{
        width: 960px;
        height: 1080px;
        background-image: url("/vestuario_blurred_1920x1080.jpg");
    }

    .text8-5xl {
        font-size: 6.6rem;
        line-height: 1;
    }
</style>