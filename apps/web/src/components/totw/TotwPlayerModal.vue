<template>
  <Teleport to="body">
    <!-- El modifier .self en el modal preventa que el clic interno en la carta cierre la vista -->
    <dialog ref="dialogRef" class="modal" @close="onClose" @click.self="hide">
    <div class="modal-box p-0 bg-transparent shadow-none overflow-y-auto overflow-x-hidden max-w-none w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col sm:items-center sm:justify-center" @click.self="hide">
      <div 
        class="card-inner relative rounded-none sm:rounded-2xl w-full sm:w-[450px] flex flex-col my-auto overflow-hidden shrink-0" 
        :class="variant">
        <form method="dialog" class="absolute right-4 top-4 z-50">
          <button class="btn btn-sm btn-circle btn-neutral bg-black/40 border-white/20 text-white shadow-xl backdrop-blur-md hover:bg-black hover:border-white/50 transition-all">✕</button>
        </form>
        
        <!-- Bloque superior: Mantiene estríctamente el ratio 8/9 de la carta física 3D -->
        <div class="relative w-full shrink-0 overflow-hidden" style="aspect-ratio: 8/9;">
          <div class="absolute inset-0">
            <img
              :src="topImage"
              :alt="player?.playerName"
              class="w-full h-full object-cover object-top scale-[1.25] origin-top"
              @error="defaultTopImage"
            />
          </div>
          <div class="absolute inset-0 img-overlay pointer-events-none" />
          <div v-if="player" class="absolute top-6 left-6 flex flex-col items-center">
            <span class="text-5xl font-black leading-none text-white drop-shadow-md">
              {{ player.avgRating?.toFixed(2) }}
            </span>
            <span class="text-sm font-black tracking-widest text-[#FFD700] leading-none mt-1">
              {{ positionLabel }}
            </span>
            <span class="text-3xl font-bold leading-none text-white drop-shadow-md mt-6">
              {{ player.gamesPlayed }}
            </span>
            <span class="text-[10px] font-bold tracking-widest text-[#FFD700] leading-none mt-1">
              PARTIDOS
            </span>
            <span class="text-2xl font-bold leading-none text-white drop-shadow-md mt-4">
              {{ player.minutesPlayed ?? 0 }}'
            </span>
            <span class="text-[9px] font-bold tracking-widest text-[#FFD700] leading-none mt-1">
              MINUTOS
            </span>
          </div>
          <div v-if="player" class="absolute top-16 right-5 flex flex-col gap-4 items-end pointer-events-auto">
            <span v-if="player.manOfTheMatch > 0" class="text-xs font-bold tracking-wider px-2 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-500/40 backdrop-blur-sm shadow-[0_0_10px_rgba(255,191,0,0.3)]">
              ★ {{ player.manOfTheMatch }}
            </span>
            <div class="indicator drop-shadow-md" v-if="player.redCards > 0" title="Tarjetas Rojas">
              <span class="indicator-item indicator-bottom indicator-center badge badge-neutral px-1.5 py-0.5 bg-black/60 text-white font-bold text-xs ring-[1px] ring-error/30">{{ player.redCards }}</span>
              <div class="grid h-8 w-6 place-items-center bg-error/90 rounded-sm"></div>
            </div>
          </div>
          <div v-if="player" class="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-12 card-bottom flex flex-col items-center z-10">
            <h2 class="text-3xl font-black tracking-wider text-white text-center mb-1 drop-shadow truncate w-full px-2" style="text-shadow: 0 4px 10px rgba(0,0,0, 0.9);">
              {{ player.playerName === "SweetYanira5" ? "SweetIAnira" : player.playerName }}
            </h2>
            <div class="h-px w-full my-3 divider-gold shrink-0 scale-x-95" />
            <div class="flex flex-wrap justify-center gap-y-4 gap-x-2 w-full px-2">
              <template v-for="(stat, index) in topGridStats" :key="index">
                <div v-if="stat.l" class="text-center w-[22%] sm:w-[23%] shrink-0">
                    <span class="block text-2xl font-black leading-none text-white drop-shadow-md">{{ stat.v }}</span>
                    <span class="block text-[10px] uppercase tracking-wider text-[#FFD700]/90 mt-1 leading-tight font-bold">{{ stat.l }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>
        
        <!-- Sección flexible inferior: Crece automáticamente con el contenido detallado -->
        <div v-if="player" class="relative w-full z-10 px-6 pb-8 pt-2 flex flex-col gap-4 bg-[#020d1f]">
           
           <h3 class="text-xs uppercase tracking-widest font-black text-[#FFD700]/70 w-full text-center mt-2 mb-1">
             Rendimiento Detallado
           </h3>
           <div class="w-full rounded-xl bg-black/40 border border-white/5 py-4 px-5 shadow-inner flex flex-col gap-4 backdrop-blur-md">
              <div class="w-full">
                <div class="flex justify-between items-end mb-1.5">
                  <span class="text-[10px] font-bold text-white/50 tracking-wider">EFECTIVIDAD DE PASE</span>
                  <span class="text-xs font-black text-white">{{ player.passesSuccess ?? 0 }} / {{ player.passesMade ?? 0 }} <span class="text-[#FFD700] ml-1">({{ player.passAccuracy ?? 0 }}%)</span></span>
                </div>
                <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-white to-[#FFD700] rounded-full" :style="{ width: (player.passAccuracy ?? 0) + '%' }"></div>
                </div>
              </div>
              <div class="w-full">
                <div class="flex justify-between items-end mb-1.5">
                  <span class="text-[10px] font-bold text-white/50 tracking-wider">ÉXITO EN TACKLES</span>
                  <span class="text-xs font-black text-white">{{ player.tacklesSuccess ?? 0 }} / {{ player.tacklesMade ?? 0 }} <span class="text-[#FFD700] ml-1">({{ player.tackleAccuracy ?? 0 }}%)</span></span>
                </div>
                <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-white to-[#FFD700] rounded-full" :style="{ width: (player.tackleAccuracy ?? 0) + '%' }"></div>
                </div>
              </div>
              <div class="w-full">
                <div class="flex justify-between items-end mb-1.5">
                  <span class="text-[10px] font-bold text-white/50 tracking-wider">EFECTIVIDAD DE TIRO</span>
                  <span class="text-xs font-black text-white">{{ player.goals ?? 0 }} / {{ player.shots ?? 0 }} <span class="text-[#FFD700] ml-1">({{ player.shotAccuracy ?? 0 }}%)</span></span>
                </div>
                <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-white to-[#FFD700] rounded-full" :style="{ width: (player.shotAccuracy ?? 0) + '%' }"></div>
                </div>
              </div>
              <div class="w-full" v-if="player.position === 'goalkeeper'">
                <div class="flex justify-between items-end mb-1.5">
                  <span class="text-[10px] font-bold text-white/50 tracking-wider">EFECTIVIDAD DE PARADAS</span>
                  <span class="text-xs font-black text-white">{{ player.saves ?? 0 }} / {{ (player.saves ?? 0) + (player.goalsConceded ?? 0) }} <span class="text-[#FFD700] ml-1">({{ saveAccuracy }}%)</span></span>
                </div>
                <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-white to-[#FFD700] rounded-full" :style="{ width: saveAccuracy + '%' }"></div>
                </div>
              </div>

           </div>
        </div>
        <div class="layer-foil absolute inset-0 pointer-events-none rounded-none sm:rounded-2xl" />

      </div>
    </div>
    <form method="dialog" class="modal-backdrop bg-black/80 backdrop-blur-sm z-[-1]">
      <button class="cursor-default">close</button>
    </form>
  </dialog>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ITOTWPlayer } from '@/interfaces/totw.interface';
import { translatePosition } from '@i18n/translations';

const props = defineProps<{
  player?: ITOTWPlayer | null;
  variant?: 'best' | 'worst';
}>()

const dialogRef = ref<HTMLDialogElement | null>(null)

function show() {
  if (dialogRef.value) dialogRef.value.showModal()
}
function hide() {
  if (dialogRef.value) dialogRef.value.close()
}
defineExpose({ show, hide })

const emit = defineEmits(['close'])

function onClose() {
  emit('close')
}

const topImage = computed(() => props.player ? `/players/${props.player.playerName}_top_transp.png` : '')
function defaultTopImage(e: Event) {
  (e.target as HTMLImageElement).src = '/players/placeholder_top_transp.png'
}

const POSITION_LABELS: Record<string, string> = { goalkeeper: 'PORTERO', defender: 'DEFENSA', midfielder: 'MEDIO', forward: 'DELANTERO' }
const positionLabel = computed(() => {
  if (!props.player) return ''
  return POSITION_LABELS[props.player.position] ?? props.player.position.slice(0, 3).toUpperCase()
  //return translatePosition(props.player.position).toUpperCase()
})

const topGridStats = computed(() => {
  const p = props.player
  if (!p) return []
  const isGK = p.position === 'goalkeeper'
  
  return [
    { l: 'GOLES', v: p.goals ?? 0 },
    { l: 'ASISTENCIAS', v: p.assists ?? 0 },
    { l: 'IMBATIDO', v: p.cleanSheets ?? 0 },
    { l: 'TIROS', v: p.shots ?? 0 },
    { l: 'PASES', v: p.passesMade ?? 0 },
    { l: 'TACKLES', v: p.tacklesMade ?? 0 },
    { l: 'ENCAJADOS', v: p.goalsConceded ?? 0 },
    isGK ? { l: 'PARADAS', v: p.saves ?? 0 } : {},
    { l: 'PASES POR PARTIDO', v: (p.passesMade / p.gamesPlayed).toFixed(2) ?? 0 },
    { l: 'TACKLES POR PARTIDO', v: (p.tacklesMade / p.gamesPlayed).toFixed(2) ?? 0 },
    { l: 'ENCAJADOS POR PARTIDO', v: (p.goalsConceded / p.gamesPlayed).toFixed(2) ?? 0 },
    isGK ? { l: 'PARADAS POR PARTIDO', v: (p.saves / p.gamesPlayed).toFixed(2) ?? 0 } : {},
  ]
})

const saveAccuracy = computed(() => {
  if (!props.player) return 0;
  const saves = props.player.saves ?? 0;
  const conceded = props.player.goalsConceded ?? 0;
  const totalShotsFaced = saves + conceded;
  if (totalShotsFaced === 0) return 0;
  return Math.round((saves / totalShotsFaced) * 100);
})

</script>

<style scoped>
.card-inner {
  background: linear-gradient(160deg, #020d1f, #041830, #020d1f);
}

.img-overlay {
  background: linear-gradient(
    to bottom,
    rgba(2, 13, 31, 0.0)  0%,
    rgba(2, 13, 31, 0.2)  40%,
    rgba(2, 13, 31, 0.95) 75%,
    rgba(2, 13, 31, 1)    100%
  );
}

.divider-gold {
  background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.8), transparent);
}

.card-bottom {
  background: linear-gradient(to top, rgba(2, 13, 31, 1) 75%, transparent);
}

.layer-foil {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0)    0%,
    rgba(255, 215, 0,   0.06) 35%,
    rgba(255, 255, 255, 0.1)  50%,
    rgba(255, 215, 0,   0.06) 65%,
    rgba(255, 255, 255, 0)    100%
  );
}
.card-inner.best {
  box-shadow:
    0 0 0 1.5px #b8860b,
    0 0 15px 2px rgba(184,134,11,0.5),
    0 0 30px 5px rgba(255,215,0,0.2);
}

.card-inner.worst {
  box-shadow:
    0 0 0 1.5px #cc0000,
    0 0 15px 2px rgba(200,0,0,0.5),
    0 0 30px 5px rgba(255,0,0,0.2);
}
.card-inner::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 10;
  padding: 1.5px;
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  background-size: 300% 300%;
  animation: borderShimmer 3s linear infinite;
}

.card-inner.best::after {
  background-image: linear-gradient(135deg, #7a5c00, #ffd700, #fffacd, #ffd700, #7a5c00);
}

.card-inner.worst::after {
  background-image: linear-gradient(135deg, #4a0000, #ff0000, #ffaaaa, #ff0000, #4a0000);
  animation-duration: 2s;
}

@keyframes borderShimmer {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>
