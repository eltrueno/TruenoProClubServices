<template>
  <div class="w-full">
    <header class="w-fit mx-auto">
      <div role="tablist" class="tabs tabs-boxed">
        <a role="tab" class="tab lg:hidden" :class="{ 'tab-active': isBest }" @click="changeTab(true)">
          Mejores
        </a>
        <a role="tab" class="tab hidden lg:block" :class="{ 'tab-active': isBest }" @click="changeTab(true)">
          Hall of Fame (mejores)
        </a>
        <a role="tab" class="tab lg:hidden" :class="{ 'tab-active': !isBest }" @click="changeTab(false)">
          Peores
        </a>
        <a role="tab" class="tab hidden lg:block" :class="{ 'tab-active': !isBest }" @click="changeTab(false)">
          Hall of Shame (peores)
        </a>
      </div>
    </header>

    <div class="w-full mx-auto flex flex-col justify-center align-middle text-center dark:bg-base-200 bg-base-200 rounded-lg p-0 shadow-md mt-2">
      <div
        class="bg-gradient-to-b to-transparent rounded-xl px-6 py-10 transition-all duration-500 overflow-hidden"
        :class="{
          'from-orange-500/10': positions[currentPositionIndex] === 'goalkeeper',
          'from-yellow-500/10': positions[currentPositionIndex] === 'defender',
          'from-green-500/10': positions[currentPositionIndex] === 'midfielder',
          'from-blue-500/10': positions[currentPositionIndex] === 'forward',
        }">
        <!-- Timeline -->
        <div class="flex items-center justify-center mb-8 px-2">
          <template v-for="(position, index) in positions" :key="position">
            <button
            class="relative z-10 flex flex-col items-center group shrink-0"
            @click="direction = index > currentPositionIndex ? 'next' : 'prev'; currentPositionIndex = index">
            <div
                class="w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all duration-300 ease-out"
                :class="index <= currentPositionIndex
                  ? 'bg-primary border-primary text-primary-content shadow-lg shadow-primary/30 scale-105'
                  : 'bg-base-100 border-primary text-primary'">
                {{
                  {
                    goalkeeper: '🧤',
                    defender: '🛡',
                    midfielder: '⚽',
                    forward: '🎯',
                  }[position]
                }}
            </div>
            <span
                class="hidden sm:block mt-2 text-xs uppercase tracking-wider transition-colors duration-300"
                :class="index <= currentPositionIndex
                    ? 'text-primary font-bold'
                    : 'text-base-content/50'">
                {{ translatePosition(position) }}
            </span>
            </button>

            <div
                v-if="index < positions.length - 1"
                class="flex-1 h-0.5 mx-2 bg-base-300 rounded-full overflow-hidden">
                <div
                    class="h-full bg-primary origin-left transition-transform duration-500 ease-out"
                    :class="index < currentPositionIndex
                        ? 'scale-x-100'
                        : 'scale-x-0'">
                </div>
            </div>
          </template>
        </div>

        <Transition :name="direction === 'next' ? 'slide-left' : 'slide-right'" mode="out-in">
          <div :key="positions[currentPositionIndex]">
            <h2
              class="text-xl lg:text-3xl font-black text-center uppercase tracking-widest mb-8 transition-colors duration-500"
              :class="{
                'text-orange-400': positions[currentPositionIndex] === 'goalkeeper',
                'text-yellow-400': positions[currentPositionIndex] === 'defender',
                'text-green-400': positions[currentPositionIndex] === 'midfielder',
                'text-blue-400': positions[currentPositionIndex] === 'forward',
              }">
              {{ translatePosition(positions[currentPositionIndex]) }}
            </h2>

            <div class="flex items-center justify-center gap-3 md:gap-6 max-w-fit mx-auto">
              <button
                class="btn btn-circle btn-outline transition-all duration-300 hover:scale-110 active:scale-90 shrink-0"
                @click="prevPosition"
                :disabled="currentPositionIndex === 0">
                ←
              </button>

              <div class="flex flex-wrap justify-center gap-8">
                <TotwPlayerCard
                  v-for="player in currentPlayers"
                  :key="player.playerName"
                  :player="player"
                  :variant="isBest ? 'best' : 'worst'"
                  :imagePath="`/players/${player.playerName}_top_transp.png`"
                  :placeholderPath="`/players/placeholder_top_transp.png`"
                  @click="openModal(player)"
                />
              </div>

              <button
                class="btn btn-circle btn-outline transition-all duration-300 hover:scale-110 active:scale-90 shrink-0"
                @click="nextPosition"
                :disabled="currentPositionIndex === positions.length - 1">
                →
              </button>
            </div>
          </div>
        </Transition>
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
    import {Position, translatePosition} from '@/i18n/translations.ts';
    const props = defineProps<{
        totw: TotwEntity
    }>()

    const isBest = defineModel<boolean>('isBest', { default: true })

    function changeTab(val: boolean){
        isBest.value = val
        currentPositionIndex.value = 0
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
    
    const positions = computed(() => [...totwPlayersByPosition.value.keys()])
    const currentPositionIndex = ref(0)
    const direction = ref<'next' | 'prev'>('next')
    function nextPosition() {
        if (currentPositionIndex.value < positions.value.length - 1) {
            direction.value = 'next'
            currentPositionIndex.value++
        }
    }

    function prevPosition() {
        if (currentPositionIndex.value > 0) {
            direction.value = 'prev'
            currentPositionIndex.value--
        }
    }

    const currentPlayers = computed(() => {
        const key = positions.value[currentPositionIndex.value]
        return totwPlayersByPosition.value.get(key) ?? []
    })
    
    
    
    
</script>

<style scoped>

.slide-left-enter-active,
.slide-right-enter-active,
.slide-left-leave-active,
.slide-right-leave-active{
    transition:
        opacity .28s ease,
        transform .28s ease,
        filter .28s ease;
}

.slide-left-enter-from{
    opacity:0;
    transform:translateX(16px);
    filter:blur(4px);
}

.slide-left-leave-to{
    opacity:0;
    transform:translateX(-16px);
    filter:blur(4px);
}

.slide-right-enter-from{
    opacity:0;
    transform:translateX(-16px);
    filter:blur(4px);
}

.slide-right-leave-to{
    opacity:0;
    transform:translateX(16px);
    filter:blur(4px);
}

.slide-left-enter-active,
.slide-right-enter-active{
    animation: positionReveal .28s ease;
}

@keyframes positionReveal{
    from{
        opacity:0;
    }
    to{
        opacity:1;
    }
}



.slide-left-enter-active h2,
.slide-right-enter-active h2{
    animation:titleReveal .35s ease;
}

@keyframes titleReveal{

    from{
        opacity:0;
        letter-spacing:.35em;
    }

    to{
        opacity:1;
        letter-spacing:.1em;
    }

}



.btn-circle{
    transition:
        transform .25s ease,
        opacity .25s ease;
}

.btn-circle:hover:not(:disabled){
    transform:scale(1.12);
}

.btn-circle:active:not(:disabled){
    transform:scale(.92);
}
</style>
