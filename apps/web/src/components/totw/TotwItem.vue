<template>
    <div class="w-full">
        <header class="w-fit mx-auto">
            <div role="tablist" class="tabs tabs-boxed">
                <a role="tab" class="tab" :class="{ 'tab-active': isBest }" @click="changeTab(true)">Mejores</a>
                <a role="tab" class="tab" :class="{ 'tab-active': !isBest }" @click="changeTab(false)">Peores</a>
            </div>
        </header>
        <div class="w-full mx-auto flex flex-col justify-center align-middle text-center mt-4">
            <div v-for="([position,players]) in totwPlayersByPosition" :key="position">
                <div class="divider w-2/3 mx-auto font-bold text-lg text-primary"></div>
                <div class="flex flex-wrap justify-center align-middle text-center gap-6">
                    <TotwPlayerCard v-for="player in players" :key="player.playerName" :player="player" :variant="isBest ? 'best' : 'worst'"
                    :imagePath="`/players/${player.playerName}_top_transp.png`" :placeholderPath="`/players/placeholder_top_transp.png`" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import type { ITOTWPlayer } from '@/interfaces/totw.interface';
    import type TotwEntity from '@/model/totw/TotwEntity';
    import { computed, type ComputedRef } from 'vue';
    import { translatePosition } from '@/i18n/translations';
    import TotwPlayerCard from './TotwPlayerCard.vue';
    const props = defineProps<{
        totw: TotwEntity
    }>()

    const isBest = defineModel<boolean>('isBest', { default: true })

    function changeTab(val: boolean){
        isBest.value = val
    }

    const totwPlayers: ComputedRef<ITOTWPlayer[]> = computed(() => {
        return isBest.value ? props.totw.bestPlayers : props.totw.worstPlayers
    })

    const totwPlayersByPosition: ComputedRef<Map<string, ITOTWPlayer[]>> = computed(() => {
        const map = new Map<string, ITOTWPlayer[]>()
        totwPlayers.value.forEach((player) => {
            const position = translatePosition(player.position)
            if (!map.has(position)) {
                map.set(position, [])
            }
            map.get(position)!.push(player)
        })
        return map
    })
</script>
