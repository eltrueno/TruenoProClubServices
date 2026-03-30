<template>
    <div class="w-full">
        <header class="w-fit mx-auto">
            <div role="tablist" class="tabs tabs-boxed">
                <a role="tab" class="tab" :class="{ 'tab-active': isBest }" @click="changeTab(true)">Mejores</a>
                <a role="tab" class="tab" :class="{ 'tab-active': !isBest }" @click="changeTab(false)">Peores</a>
            </div>
        </header>
        <div class="w-full mx-auto flex flex-col justify-center align-middle text-center dark:bg-base-200 bg-base-200 rounded-lg p-2 shadow-md mt-2">
            <div v-for="([position,players]) in totwPlayersByPosition" :key="position">
                <div v-if="position!='goalkeeper'" class="divider w-full md:w-2/3 mx-auto font-bold text-lg text-primary relative z-0 pointer-events-none"></div>
                <TransitionGroup name="pop" tag="div" class="flex flex-wrap justify-center align-middle text-center gap-8 relative z-10">
                    <TotwPlayerCard v-for="player in players" :key="player.playerName" :player="player" :variant="isBest ? 'best' : 'worst'"
                    :imagePath="`/players/${player.playerName}_top_transp.png`" :placeholderPath="`/players/placeholder_top_transp.png`" 
                    @click="openModal(player)" />
                </TransitionGroup>
            </div>
        </div>
        
        <TotwPlayerModal ref="modalRef" :player="selectedPlayer" :variant="isBest ? 'best' : 'worst'" @close="selectedPlayer = null" />
    </div>
</template>

<script setup lang="ts">
    import type { ITOTWPlayer } from '@/interfaces/totw.interface';
    import type TotwEntity from '@/model/totw/TotwEntity';
    import { computed, type ComputedRef, ref } from 'vue';
    import TotwPlayerCard from './TotwPlayerCard.vue';
    import TotwPlayerModal from './TotwPlayerModal.vue';
    const props = defineProps<{
        totw: TotwEntity
    }>()

    const isBest = defineModel<boolean>('isBest', { default: true })

    function changeTab(val: boolean){
        isBest.value = val
    }

    const selectedPlayer = ref<ITOTWPlayer | null>(null)
    const modalRef = ref<InstanceType<typeof TotwPlayerModal> | null>(null)

    function openModal(player: ITOTWPlayer) {
        selectedPlayer.value = player
        if (modalRef.value) {
            modalRef.value.show()
        }
    }

    const totwPlayers: ComputedRef<ITOTWPlayer[]> = computed(() => {
        return isBest.value ? props.totw.bestPlayers : props.totw.worstPlayers
    })

    const totwPlayersByPosition: ComputedRef<Map<string, ITOTWPlayer[]>> = computed(() => {
        const map = new Map<string, ITOTWPlayer[]>()
        const orderedPositions = ['goalkeeper', 'defender', 'midfielder', 'forward']
        totwPlayers.value.forEach((player) => {
            const position = player.position
            if (!map.has(position)) {
                map.set(position, [])
            }
            map.get(position)!.push(player)
        })
        //ordenar el mapa por posicion
        const orderedMap = new Map<string, ITOTWPlayer[]>()
        orderedPositions.forEach((position) => {
            if (map.has(position)) {
                orderedMap.set(position, map.get(position)!)  
            }
        })
        return orderedMap
    })
</script>

<style scoped>
.pop-move,
.pop-enter-active,
.pop-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: scale(0.5) translateY(30px);
}

.pop-leave-active {
  position: absolute;
}
</style>
