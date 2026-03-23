<style>
.clip-half-circle-left {
  clip-path: inset(0 0 0 50%);
}

.clip-half-circle-right {
  clip-path: inset(0 50% 0 0);
}

.clip-half-circle-top {
  clip-path: inset(50% 0 0 0);
}

.clip-half-circle-bot {
  clip-path: inset(0 0 50% 0);
}

/* FIX: Expansion of player hitbox to compensate for 3D rotation shifts */
.player-card {
  position: relative !important;
  z-index: 100 !important;
  pointer-events: auto !important;
  cursor: pointer !important;
  touch-action: none !important;
  user-select: none !important;
}

.player-card::after {
  content: '';
  position: absolute;
  top: -15px;
  bottom: -15px;
  left: -15px;
  right: -15px;
  z-index: -1;
}

/* FIX: Atropos layers should not block events */
.atropos-rotate, .atropos-scale, .atropos-inner, .atropos-shadow, .atropos-highlight {
  pointer-events: none !important;
}

/* Re-enable events for players and field specifically if needed */
.atropos-football-field {
  pointer-events: auto !important;
}
</style>
<template>
    <div class="flex justify-center items-center">
      <div class="atropos atropos-football-field w-full max-w-md" ref="atroposElement">

        <div class="atropos-scale">
          <div class="atropos-rotate">
            <div class="atropos-inner relative bg-green-600 rounded-2xl overflow-hidden" style="aspect-ratio: 68/105;">

              <div data-atropos-offset="0" class="absolute inset-0 border-4 border-white border-opacity-80 rounded-lg pointer-events-none"></div>

              <!-- Línea central -->
              <div data-atropos-offset="1" class="absolute left-0 right-0 top-1/2 h-0.5 bg-white pointer-events-none"></div>

              <!-- Círculo central -->
              <div  class="absolute left-1/2 top-1/2 w-24 h-24 border-2 border-white rounded-full pointer-events-none" style="transform: translate(-50%, -50%)"></div>
              <div  class="absolute left-1/2 top-1/2 w-1.5 h-1.5 bg-white rounded-full pointer-events-none" style="transform: translate(-50%, -50%)"></div>

              <!-- Área superior -->
              <div class="absolute left-1/2 top-0 w-44 h-16 border-b-2 border-l-2 border-r-2 border-white pointer-events-none" style="transform: translateX(-50%)"></div>
              <div class="absolute left-1/2 top-0 w-20 h-6 border-b-2 border-l-2 border-r-2 border-white pointer-events-none" style="transform: translateX(-50%)"></div>
              <div class="absolute left-1/2 top-16 w-20 h-20 border-2 border-white rounded-full clip-half-circle-top pointer-events-none" style="transform: translate(-50%, -50%)"></div>
              <div class="absolute left-1/2 top-11 w-1.5 h-1.5 bg-white rounded-full pointer-events-none" style="transform: translateX(-50%)"></div>

              <!-- Área inferior -->
              <div class="absolute left-1/2 bottom-0 w-44 h-16 border-t-2 border-l-2 border-r-2 border-white pointer-events-none" style="transform: translateX(-50%)"></div>
              <div class="absolute left-1/2 bottom-0 w-20 h-6 border-t-2 border-l-2 border-r-2 border-white pointer-events-none" style="transform: translateX(-50%)"></div>
              <div class="absolute left-1/2 bottom-16 w-20 h-20 border-2 border-white rounded-full clip-half-circle-bot pointer-events-none" style="transform: translate(-50%, 50%)"></div>
              <div class="absolute left-1/2 bottom-11 w-1.5 h-1.5 bg-white rounded-full pointer-events-none" style="transform: translateX(-50%)"></div>

              <!-- Córners -->
              <div data-atropos-offset="1" class="absolute top-0 left-0 w-4 h-4 border-r-2 border-b-2 border-white pointer-events-none" style="border-bottom-right-radius: 100%"></div>
              <div data-atropos-offset="1" class="absolute top-0 right-0 w-4 h-4 border-l-2 border-b-2 border-white pointer-events-none" style="border-bottom-left-radius: 100%"></div>
              <div data-atropos-offset="1" class="absolute bottom-0 left-0 w-4 h-4 border-r-2 border-t-2 border-white pointer-events-none" style="border-top-right-radius: 100%"></div>
              <div data-atropos-offset="1" class="absolute bottom-0 right-0 w-4 h-4 border-l-2 border-t-2 border-white pointer-events-none" style="border-top-left-radius: 100%"></div>

              <div data-atropos-offset="-2" class="absolute -inset-2 bg-black opacity-20 blur-xl rounded-xl pointer-events-none"></div>

              <!-- JUGADORES -->
              <div data-atropos-offset="2" class="absolute inset-0 pointer-events-none" style="z-index: 9999;">
                <!-- Portero -->
                <div class="absolute left-1/2 top-[-1%] transform -translate-x-1/2 pointer-events-none w-full flex justify-center">

                  <div
                    class="flex-col bg-base-300/55 backdrop-blur-sm hover:bg-primary/90 hover:text-primary-content p-0 px-1 rounded-xl 
                    h-fit m-1 mt-4 items-center justify-center w-fit max-w-24 overflow-hidden flex cursor-pointer shadow-lg 
                    player-card"
                    v-for="pl in playersByPos('goalkeeper')"
                    @click="selectPlayer(players.indexOf(pl))"
                    :class="{'bg-primary hover:bg-primary': props.selectedplayer == players.indexOf(pl)}">
                    <div
                      class="grid h-5 w-4 place-items-center bg-error rounded-sm self-center"
                      v-if="pl.redCards>0">
                    </div>

                    <div class="w-full max-h-20 overflow-hidden">
                      <img
                        :src="topImage(pl.playername)"
                        class="h-full w-full object-contain select-none pointer-events-none scale-[2.3] origin-top"
                        alt="Player ingame top image"
                        @error="defaultTopImage"/>
                    </div>
                    <span
                      class="text-[12px] leading-tight truncate w-full max-w-full text-center"
                      :class="{
                        'text-primary-content ': props.selectedplayer == players.indexOf(pl)
                      }">
                      {{ pl.playername }}
                    </span>
                  </div>

                </div>
                
                <!-- Línea de defensa -->
                <div class="absolute left-0 right-0 top-[22%] flex justify-around pointer-events-none">
                  <div class="flex-col bg-base-300/55 backdrop-blur-sm hover:bg-primary/90 hover:text-primary-content p-0 px-1 rounded-xl 
                    h-fit m-1 mt-4 items-center justify-center w-fit max-w-24 overflow-hidden flex cursor-pointer shadow-lg 
                    player-card" 
                  v-for="pl in playersByPos('defender')" @click="selectPlayer(players.indexOf(pl))" :class="{
                    'bg-primary hover:bg-primary': props.selectedplayer == players.indexOf(pl)
                  }">
                    <div class="w-full max-h-20 overflow-hidden">
                      <img
                        :src="topImage(pl.playername)"
                        class="h-full w-full object-contain select-none pointer-events-none scale-[2.3] origin-top"
                        alt="Player ingame top image"
                        @error="defaultTopImage"/>
                    </div>
                    <span
                      class="text-[12px] leading-tight truncate w-full max-w-full text-center"
                      :class="{
                        'text-primary-content ': props.selectedplayer == players.indexOf(pl)
                      }">
                      {{ pl.playername }}
                    </span>
                  </div>
                </div>
                  
                <!-- Línea de mediocampo -->
                <div class="absolute left-0 right-0 top-[48%] flex justify-around pointer-events-none px-2">
                    <div class="flex-col bg-base-300/55 backdrop-blur-sm hover:bg-primary/90 hover:text-primary-content p-0 px-1 rounded-xl 
                    h-fit m-1 mt-4 items-center justify-center w-fit max-w-24 overflow-hidden flex cursor-pointer shadow-lg 
                    player-card" 
                    v-for="pl in playersByPos('midfielder')" @click="selectPlayer(players.indexOf(pl))" :class="{
                    'bg-primary hover:bg-primary': props.selectedplayer == players.indexOf(pl)
                  }">
                      <div class="w-full max-h-20 overflow-hidden">
                        <img
                          :src="topImage(pl.playername)"
                          class="h-full w-full object-contain select-none pointer-events-none scale-[2.3] origin-top"
                          alt="Player ingame top image"
                          @error="defaultTopImage"/>
                      </div>
                      <span
                        class="text-[12px] leading-tight truncate w-full max-w-full text-center"
                        :class="{
                          'text-primary-content ': props.selectedplayer == players.indexOf(pl)
                        }">
                        {{ pl.playername }}
                      </span>
                    </div>
                </div>
                
                <!-- Línea de delantera -->
                <div class="absolute left-0 right-0 bottom-[8%] flex justify-around pointer-events-none px-2">
                  <div class="flex-col bg-base-300/55 backdrop-blur-sm hover:bg-primary/90 hover:text-primary-content p-0 px-1 rounded-xl 
                    h-fit m-1 mt-4 items-center justify-center w-fit max-w-24 overflow-hidden flex cursor-pointer shadow-lg 
                    player-card" 
                  v-for="pl in playersByPos('forward')" @click="selectPlayer(players.indexOf(pl))" :class="{
                    'bg-primary hover:bg-primary': props.selectedplayer == players.indexOf(pl)
                  }">
                      <div class="w-full max-h-20 overflow-hidden">
                        <img
                          :src="topImage(pl.playername)"
                          class="h-full w-full object-contain select-none pointer-events-none scale-[2.3] origin-top"
                          alt="Player ingame top image"
                          @error="defaultTopImage"/>
                      </div>
                      <span
                        class="text-[12px] leading-tight truncate w-full max-w-full text-center"
                        :class="{
                          'text-primary-content ': props.selectedplayer == players.indexOf(pl)
                        }">
                        {{ pl.playername }}
                      </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
  </div>
  </template>
  <script setup lang="ts">
  import { computed, onMounted,ref } from 'vue';
  import Atropos from 'atropos';
  import 'atropos/css';
  import MatchPlayerEntity from '@/model/match/MatchPlayerEntity';

  const props = defineProps<{
        players: MatchPlayerEntity[],
        selectedplayer: number
  }>()

  const emit = defineEmits<{
    (e: 'selectplayer', player: number): void
  }>()

  function selectPlayer(index: number){
    emit('selectplayer', index)
  }


  function playersByPos (position){
    return props.players.filter((el) => el.position==position)
  }


    function topImage(playername){
      return `/players/${playername}_top_transp.png`
    }

    function defaultTopImage(e){
        e.target.src = '/players/placeholder_top_transp.png'
    }

  const atroposElement = ref(null);

  onMounted(() => {
    if(atroposElement.value){
      Atropos({
        el: atroposElement.value,
        shadow: true,
        highlight: false,
        shadowScale: 0.95,
        duration: 800,
        rotate: true,
        rotateXMax: 3,
        rotateYMax: 3,
        activeOffset: 10,
        rotateTouch: false,
        stretchX: 0,
        stretchZ: 0,
        stretchY: 0
      });
    }
  });
  </script>