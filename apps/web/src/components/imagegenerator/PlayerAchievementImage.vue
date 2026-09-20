<template>
    <div v-if="status==200">
        <div id="to_image" class="relative toimage flex flex-col w-full flex-initial overflow-hidden" v-if="!isLoading && profile">
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
                {{ translateAchievementCategory(achievement.type).toLocaleUpperCase() }}</p>
            </div>
            <img :src="playerImage(profile.member)" class="absolute bottom-0 right-0 max-h-full drop-shadow-2xl" alt="Player ingame photo" @error="onPlayerImageError" />
            <div class="flex flex-col w-2/3 h-full justify-end mb-10">
                <p class="text-primary text-7xl self-center font-semibold drop-shadow-xl">{{ profile.member.playerName }}</p>
                <p class="text-5xl self-center drop-shadow-lg">{{ translatePosition(profile.mostPlayedPosition) }}</p>
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
import { computed, onBeforeMount } from "vue"
import PlayerProfileService from "@services/PlayerProfileService"
import { translateAchievementCategory, translatePosition } from "@/i18n/translations"
import { getQueryParam } from "@/lib/query"
import { playerImage, onPlayerImageError } from "@/lib/playerImage"

// /imagegenerator/playerachievement?id=<playerId>&type=<categoría>&reached=<n>
const playerId = getQueryParam("id")
const achievement = {
    type: getQueryParam("type", "goals"),
    reached: Number(getQueryParam("reached", "0")) || 0
}

const profileService = new PlayerProfileService(playerId)
const profile = profileService.getData()
const isLoading = profileService.isloading
const status = profileService.getStatus()

onBeforeMount(async () => {
    if (playerId) await profileService.fetch()
    else status.value = 400
})

const formatNumber = (num: number): string => new Intl.NumberFormat("es-ES", { useGrouping: true }).format(num)
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