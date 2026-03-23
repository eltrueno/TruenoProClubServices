<template>
  <div ref="atroposEl" class="atropos shrink-0" style="width: 150px;">

    <div class="atropos-scale">
      <div class="atropos-rotate">
        <div class="atropos-inner card-inner relative overflow-hidden rounded-xl" style="aspect-ratio: 8/9;">

          <!-- ── Imagen de fondo ── -->
          <div class="absolute inset-0" data-atropos-offset="-6">
            <img
              :src="topImage"
              :alt="player.playerName"
              class="w-full h-full object-cover object-top"
              @error="defaultTopImage"
            />
            <div class="absolute inset-0 img-overlay" />
          </div>

          <!-- ── Foil destello ── -->
          <div class="layer-foil absolute inset-0 rounded-xl pointer-events-none" data-atropos-offset="-2" data-atropos-opacity="0;0.6" />

          <!-- ── Borde dorado animado ── -->
          <div class="card-border absolute inset-0 rounded-xl pointer-events-none" />

          <!-- ── TOP: rating + posición ── -->
          <div class="absolute top-2.5 left-2.5 flex flex-col items-center" data-atropos-offset="4">
            <span class="text-2xl font-black leading-none text-white drop-shadow">
              {{ player.avgRating.toFixed(1) }}
            </span>
            <span class="text-[10px] font-black tracking-widest text-amber-400 leading-none mt-0.5">
              {{ positionLabel }}
            </span>
          </div>

          <!-- ── MOTM badge ── -->
          <div v-if="player.manOfTheMatch > 0" class="absolute top-2.5 right-2.5" data-atropos-offset="5">
            <span class="text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-500/40">
              ★ x{{ player.manOfTheMatch }}
            </span>
          </div>

          <!-- ── BOTTOM: nombre + stats ── -->
          <div class="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-6 card-bottom" data-atropos-offset="3">

            <p class="text-xs font-black tracking-wider text-white truncate text-center mb-1.5 drop-shadow">
              {{ player.playerName }}
            </p>

            <div class="h-px w-full mb-1.5 divider-gold" />

            <div class="flex justify-around" data-atropos-offset="5">
              <div v-for="stat in positionStats" :key="stat.l" class="text-center">
                <span class="block text-sm font-black leading-none text-white drop-shadow">
                  {{ stat.v }}
                </span>
                <span class="block text-[8px] uppercase tracking-wider text-amber-400/70 mt-0.5">
                  {{ stat.l }}
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import Atropos from 'atropos'
import 'atropos/css'

const props = defineProps({
  player: {
    type: Object, // ITOTWPlayer
    required: true,
  },
  variant: {
    type: String,
    default: 'best',
    validator: (v) => ['best', 'worst'].includes(v),
  },
})

// ── Imagen — misma convención que el resto del proyecto ──────────────────────
const topImage = computed(() => `/players/${props.player.playerName}_top_transp.png`)

function defaultTopImage(e) {
  e.target.src = '/players/placeholder_top_transp.png'
}

// ── Etiqueta corta de posición ────────────────────────────────────────────────
const POSITION_LABELS = {
  goalkeeper: 'POR',
  defender:   'DEF',
  midfielder: 'MC',
  forward:    'DEL',
}
const positionLabel = computed(
  () => POSITION_LABELS[props.player.position] ?? props.player.position.slice(0, 3).toUpperCase()
)

// ── Stats relevantes por posición ────────────────────────────────────────────
const positionStats = computed(() => {
  const p = props.player
  switch (p.position) {
    case 'goalkeeper':
      return [
        { l: 'PAR',  v: p.saves },
        { l: 'CS',   v: p.cleanSheets },
        { l: 'PAS%', v: `${p.passAccuracy}%` },
      ]
    case 'defender':
      return [
        { l: 'TKL',  v: p.tacklesSuccess },
        { l: 'TKL%', v: `${p.tackleAccuracy}%` },
        { l: 'CS',   v: p.cleanSheets },
      ]
    case 'midfielder':
      return [
        { l: 'AST',  v: p.assists },
        { l: 'PAS%', v: `${p.passAccuracy}%` },
        { l: 'GOL',  v: p.goals },
      ]
    case 'forward':
      return [
        { l: 'GOL',  v: p.goals },
        { l: 'AST',  v: p.assists },
        { l: 'PRE%', v: `${p.shotAccuracy}%` },
      ]
    default:
      return [
        { l: 'GOL',  v: p.goals },
        { l: 'AST',  v: p.assists },
        { l: 'PAS',  v: p.passesMade },
      ]
  }
})

// ── Atropos ───────────────────────────────────────────────────────────────────
const atroposEl = ref(null)
let atroposInstance = null

onMounted(() => {
  atroposInstance = Atropos({
    el: atroposEl.value,
    activeOffset: 40,
    shadowScale: 1.05,
    rotateTouch: true,
    rotateXMax: 15,
    rotateYMax: 15,
  })
})

onBeforeUnmount(() => {
  atroposInstance?.destroy()
})
</script>

<style scoped>
.card-inner {
  background: linear-gradient(160deg, #020d1f, #041830, #020d1f);
}

.img-overlay {
  background: linear-gradient(
    to bottom,
    rgba(2, 13, 31, 0.1)  0%,
    rgba(2, 13, 31, 0.2)  40%,
    rgba(2, 13, 31, 0.85) 65%,
    rgba(2, 13, 31, 0.97) 100%
  );
}

.card-border {
  border: 1px solid transparent;
  background:
    linear-gradient(#020d1f, #020d1f) padding-box,
    linear-gradient(135deg, #7a5c00, #ffd700, #fffacd, #ffd700, #7a5c00) border-box;
  background-size: 100% 100%, 300% 300%;
  animation: borderShimmer 4s linear infinite;
}

@keyframes borderShimmer {
  0%   { background-position: 0 0, 0% 50%; }
  50%  { background-position: 0 0, 100% 50%; }
  100% { background-position: 0 0, 0% 50%; }
}

.divider-gold {
  background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.6), transparent);
}

.card-bottom {
  background: linear-gradient(to top, rgba(2, 13, 31, 0.98) 60%, transparent);
}

.layer-foil {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0)    0%,
    rgba(255, 215, 0,   0.06) 35%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 215, 0,   0.06) 65%,
    rgba(255, 255, 255, 0)    100%
  );
}
</style>