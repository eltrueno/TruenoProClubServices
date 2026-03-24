<template>
  <div ref="atroposEl" class="atropos shrink-0 cursor-pointer" style="width: 188px;">

    <div class="atropos-scale">
      <div class="atropos-rotate">
        <div class="atropos-inner card-inner relative overflow-hidden rounded-xl" :class="variant" style="aspect-ratio: 8/9;">

          <div class="absolute inset-0" data-atropos-offset="3">
            <img
              :src="topImage"
              :alt="player.playerName"
              class="w-full h-full object-cover object-top scale-[1.5] origin-top"
              @error="defaultTopImage"
            />
          </div>

          <div class="absolute inset-0 img-overlay" />

          <div
            class="layer-foil absolute inset-0 rounded-xl pointer-events-none"
            data-atropos-offset="2"
            data-atropos-opacity="0;0.6"
          />

          <!-- rating + posición -->
          <div class="absolute top-2.5 left-2.5 flex flex-col items-center" data-atropos-offset="4">
            <span class="text-2xl font-black leading-none text-white drop-shadow-md">
              {{ player.avgRating.toFixed(1) }}
            </span>
            <span class="text-[10px] font-black tracking-widest text-amber-400 leading-none mt-0.5">
              {{ positionLabel }}
            </span>
            <span class="text-xl font-bold leading-none text-white drop-shadow-md mt-4">
              {{ player.gamesPlayed }}
            </span>
            <span class="text-[8px] font-bold tracking-widest text-amber-400 leading-none mt-0.5">
              PARTIDOS
            </span>
          </div>

          <!-- MOTM + tarjeta roja -->
          <div class="absolute top-2.5 right-2.5 flex flex-col gap-4 items-end" data-atropos-offset="5">
            <span v-if="player.manOfTheMatch > 0" class="text-xs font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-500/40">
              ★ {{ player.manOfTheMatch }}
            </span>
            <div class="indicator" v-if="player.redCards > 0">
              <span class="indicator-item indicator-bottom indicator-center badge badge-neutral badge-xs px-1.5 py-0.5 bg-opacity-50">{{ player.redCards }}</span>
              <div class="grid h-6 w-4 place-items-center bg-error/70 rounded-sm"></div>
            </div>
          </div>

          <!-- nombre + stats -->
          <div class="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-6 card-bottom" data-atropos-offset="3">
            <p class="text-xs font-black tracking-wider text-white truncate text-center mb-1.5 drop-shadow">
              {{ player.playerName }}
            </p>
            <div class="h-px w-full mb-1.5 divider-gold" />
            <div class="flex justify-around" data-atropos-offset="5">
              <div v-for="stat in positionStats" :key="stat.l" class="text-center">
                <span class="block text-sm font-black leading-none text-white drop-shadow">{{ stat.v }}</span>
                <span class="block text-[8px] uppercase tracking-wider text-amber-400/70 mt-0.5">{{ stat.l }}</span>
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
  player: { type: Object, required: true },
  variant: {
    type: String,
    default: 'best',
    validator: (v) => ['best', 'worst'].includes(v),
  },
})

const topImage = computed(() => `/players/${props.player.playerName}_top_transp.png`)
function defaultTopImage(e) { e.target.src = '/players/placeholder_top_transp.png' }

const POSITION_LABELS = { goalkeeper: 'POR', defender: 'DEF', midfielder: 'MC', forward: 'DEL' }
const positionLabel = computed(
  () => POSITION_LABELS[props.player.position] ?? props.player.position.slice(0, 3).toUpperCase()
)

const positionStats = computed(() => {
  const p = props.player
  switch (p.position) {
    case 'goalkeeper': return [{ l: 'PARADAS', v: p.saves }, { l: 'IMBATIDO', v: p.cleanSheets }, { l: 'PASE%', v: `${p.passAccuracy}%` }]
    case 'defender':   return [{ l: 'TAKLEES', v: p.tacklesSuccess }, { l: 'TAKLEES%', v: `${p.tackleAccuracy}%` }, { l: 'IMBATIDO', v: p.cleanSheets }]
    case 'midfielder': return [{ l: 'ASIST', v: p.assists }, { l: 'PASE%', v: `${p.passAccuracy}%` }, { l: 'GOLES', v: p.goals }]
    case 'forward':    return [{ l: 'GOLES', v: p.goals }, { l: 'ASIST', v: p.assists }, { l: 'TIROS%', v: `${p.shotAccuracy}%` }]
    default:           return [{ l: 'GOLES', v: p.goals }, { l: 'ASIST', v: p.assists }, { l: 'PASES', v: p.passesMade }]
  }
})

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

onBeforeUnmount(() => { atroposInstance?.destroy() })
</script>

<style scoped>
.card-inner {
  background: linear-gradient(160deg, #020d1f, #041830, #020d1f);
}

/* ── Borde + glow exterior — funciona en tema claro y oscuro ── */
.card-inner.best {
  /* box-shadow da el glow exterior visible sobre cualquier fondo */
  box-shadow:
    0 0 0 1.5px #b8860b,          /* borde sólido dorado */
    0 0 10px 1px rgba(184,134,11,0.5),  /* glow cercano */
    0 0 24px 2px rgba(255,215,0,0.2);   /* glow difuso */
}

.card-inner.worst {
  box-shadow:
    0 0 0 1.5px #cc0000,
    0 0 10px 1px rgba(200,0,0,0.5),
    0 0 24px 2px rgba(255,0,0,0.2);
}

/* ── Borde animado via ::after — encima del glow ── */
.card-inner::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 0.75rem;
  pointer-events: none;
  z-index: 10;
  padding: 1.5px;
  -webkit-mask:
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

.img-overlay {
  background: linear-gradient(
    to bottom,
    rgba(2, 13, 31, 0.1)  0%,
    rgba(2, 13, 31, 0.2)  40%,
    rgba(2, 13, 31, 0.85) 65%,
    rgba(2, 13, 31, 0.97) 100%
  );
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