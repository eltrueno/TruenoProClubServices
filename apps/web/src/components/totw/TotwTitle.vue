<template>
  <div class="text-center py-6">
    <div :class="variant === 'worst' ? 'glitch-wrap' : ''">
      <h1
        :class="['font-extrabold', 'tracking-widest', 'leading-none', 'select-none', variant === 'best' ? 'gold-shimmer' : 'glitch']"
        :data-text="title"
        :style="{ fontSize: 'clamp(2.5rem, 8vw, 4rem)' }"
      >
        {{ title }}
      </h1>
    </div>
    <p v-if="subtitle" class="mt-1 tracking-[0.15em] uppercase text-xs">
      {{ subtitle }}
    </p>
  </div>
</template>

<script setup>
defineProps({
  title:    { type: String, default: 'ONCE DE LA SEMANA' },
  subtitle: { type: String, default: '' },
  variant:  {
    type: String,
    default: 'best',
    validator: (v) => ['best', 'worst'].includes(v),
  },
})
</script>

<style scoped>
/* ── BEST: gold shimmer ── */
.gold-shimmer {
  background: linear-gradient(
    90deg,
    #7a4f00 0%,
    #b8860b 20%,
    #ffd700 35%,
    #fffacd 50%,
    #ffd700 65%,
    #b8860b 80%,
    #7a4f00 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: goldShimmer 7s linear infinite;
}

@keyframes goldShimmer {
  0%   { background-position: 200% center; }
  100% { background-position: -200% center; }
}

/* ── WORST: scanlines wrapper ── */
.glitch-wrap {
  position: relative;
  display: inline-block;
}

.glitch-wrap::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  animation: scanMove 6s linear infinite;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.35) 2px,
    rgba(0, 0, 0, 0.35) 4px
  );
  mix-blend-mode: overlay;
}

@media (prefers-color-scheme: dark) {
  .glitch-wrap::after {
    mix-blend-mode: screen;
  }
}

@keyframes scanMove {
  from { background-position: 0 0; }
  to   { background-position: 0 100px; }
}

/* ── WORST: RGB glitch ── */
.glitch {
  position: relative;
  display: inline-block;
  color: #C80D0D;
  /* Ciclo de 4s, bursts más largos y frecuentes */
  animation: glitchBase 4s steps(1) infinite;
}

.glitch::before {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  color: #00ffff;
  clip-path: polygon(0 15%, 100% 15%, 100% 40%, 0 40%);
  animation: glitchCyan 4s steps(1) infinite;
  opacity: 0;
}

.glitch::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  color: #ff00aa;
  clip-path: polygon(0 60%, 100% 60%, 100% 85%, 0 85%);
  animation: glitchMagenta 4s steps(1) infinite;
  opacity: 0;
}

@keyframes glitchBase {
  /* Quieto */
  0%, 100%  { transform: none; filter: none; }

  /* Burst 1 — largo (~0.4s a 4s = ~0.3s de duración) */
  10%  { transform: skewX(-8deg)  translateX(-4px);              filter: brightness(1.3); }
  12%  { transform: skewX(10deg)  translateX(6px);               filter: brightness(0.7); }
  14%  { transform: skewX(-5deg)  translateX(-3px);              filter: brightness(1.2); }
  16%  { transform: skewX(4deg)   translateX(2px); }
  18%  { transform: none;                                         filter: none; }

  /* Pausa */
  19%, 34%  { transform: none; filter: none; }

  /* Burst 2 — muy agresivo */
  35%  { transform: skewX(-14deg) translateX(-7px) scaleY(1.05); filter: brightness(1.6) saturate(2); }
  37%  { transform: skewX(12deg)  translateX(8px)  scaleY(0.96); filter: brightness(0.6); }
  39%  { transform: skewX(-6deg)  translateX(-4px) scaleY(1.02); filter: brightness(1.3); }
  41%  { transform: skewX(4deg)   translateX(3px); }
  43%  { transform: skewX(-2deg)  translateX(-1px);              filter: brightness(1.1); }
  45%  { transform: none;                                         filter: none; }

  /* Pausa */
  46%, 64%  { transform: none; filter: none; }

  /* Burst 3 — rápido y corto */
  65%  { transform: translateX(5px)  skewX(6deg);                filter: hue-rotate(40deg); }
  67%  { transform: translateX(-5px) skewX(-6deg); }
  69%  { transform: translateX(3px); }
  71%  { transform: none;                                         filter: none; }

  /* Pausa */
  72%, 84%  { transform: none; filter: none; }

  /* Burst 4 — leve, tipo temblor */
  85%  { transform: translateX(-3px) skewX(-3deg);               filter: hue-rotate(-20deg); }
  87%  { transform: translateX(3px)  skewX(3deg); }
  89%  { transform: translateX(-2px); }
  91%  { transform: translateX(2px); }
  93%  { transform: none;                                         filter: none; }
}

@keyframes glitchCyan {
  0%, 100%  { opacity: 0; transform: none; }

  /* Burst 1 */
  10%  { opacity: 0.9; transform: translateX(-7px) skewX(-8deg); }
  12%  { opacity: 0.9; transform: translateX(7px)  skewX(10deg); }
  14%  { opacity: 0.8; transform: translateX(-5px) skewX(-5deg); }
  16%  { opacity: 0.7; transform: translateX(3px); }
  18%  { opacity: 0; }

  19%, 34%  { opacity: 0; }

  /* Burst 2 */
  35%  { opacity: 0.9; transform: translateX(-9px) skewX(-14deg); clip-path: polygon(0 5%,  100% 5%,  100% 38%, 0 38%); }
  37%  { opacity: 0.9; transform: translateX(9px)  skewX(12deg);  clip-path: polygon(0 10%, 100% 10%, 100% 45%, 0 45%); }
  39%  { opacity: 0.8; transform: translateX(-6px) skewX(-6deg);  clip-path: polygon(0 8%,  100% 8%,  100% 40%, 0 40%); }
  41%  { opacity: 0.7; transform: translateX(4px); }
  43%  { opacity: 0.5; transform: translateX(-2px); }
  45%  { opacity: 0; }

  46%, 64%  { opacity: 0; }

  /* Burst 3 */
  65%  { opacity: 0.8; transform: translateX(6px)  skewX(6deg); }
  67%  { opacity: 0.8; transform: translateX(-6px) skewX(-6deg); }
  69%  { opacity: 0.6; transform: translateX(3px); }
  71%  { opacity: 0; }

  72%, 84%  { opacity: 0; }

  /* Burst 4 */
  85%  { opacity: 0.5; transform: translateX(-4px); }
  87%  { opacity: 0.5; transform: translateX(4px); }
  89%  { opacity: 0; }
}

@keyframes glitchMagenta {
  0%, 100%  { opacity: 0; transform: none; }

  /* Burst 1 */
  10%  { opacity: 0.9; transform: translateX(7px)  skewX(8deg); }
  12%  { opacity: 0.9; transform: translateX(-7px) skewX(-10deg); }
  14%  { opacity: 0.8; transform: translateX(5px)  skewX(5deg); }
  16%  { opacity: 0.7; transform: translateX(-3px); }
  18%  { opacity: 0; }

  19%, 34%  { opacity: 0; }

  /* Burst 2 */
  35%  { opacity: 0.9; transform: translateX(9px)  skewX(14deg);  clip-path: polygon(0 55%, 100% 55%, 100% 82%, 0 82%); }
  37%  { opacity: 0.9; transform: translateX(-9px) skewX(-12deg); clip-path: polygon(0 62%, 100% 62%, 100% 90%, 0 90%); }
  39%  { opacity: 0.8; transform: translateX(6px)  skewX(6deg);   clip-path: polygon(0 58%, 100% 58%, 100% 85%, 0 85%); }
  41%  { opacity: 0.7; transform: translateX(-4px); }
  43%  { opacity: 0.5; transform: translateX(2px); }
  45%  { opacity: 0; }

  46%, 64%  { opacity: 0; }

  /* Burst 3 */
  65%  { opacity: 0.8; transform: translateX(-6px) skewX(-6deg); }
  67%  { opacity: 0.8; transform: translateX(6px)  skewX(6deg); }
  69%  { opacity: 0.6; transform: translateX(-3px); }
  71%  { opacity: 0; }

  72%, 84%  { opacity: 0; }

  /* Burst 4 */
  85%  { opacity: 0.5; transform: translateX(4px); }
  87%  { opacity: 0.5; transform: translateX(-4px); }
  89%  { opacity: 0; }
}
</style>