<template>
  <div class="text-center py-6">
    <h1 class="gold-shimmer font-extrabold tracking-widest leading-none select-none">
      {{ title }}
    </h1>
    <p v-if="subtitle" class="mt-1 tracking-[0.15em] uppercase text-xs">
      {{ subtitle }}
    </p>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: 'ONCE DE LA SEMANA',
  },
  subtitle: {
    type: String,
    default: '',
  },
})
</script>

<style scoped>
.gold-shimmer {
  font-size: clamp(2.5rem, 8vw, 4rem);
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
</style>