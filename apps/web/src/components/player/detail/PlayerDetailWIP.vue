<template>
    <div class="flex flex-col items-center justify-center p-20 bg-base-200 rounded-3xl animate-in mt-4">
        <div class="text-6xl mb-4">{{ icon }}</div>
        <h3 class="text-xl font-black uppercase tracking-widest">{{ title }}</h3>
        <p class="text-base-content mt-2 font-medium">Estamos trabajando en esta sección...</p>
    </div>
</template>

<script setup lang="ts">
    defineProps<{
        title: string
        icon: string
    }>()
</script>

<style scoped>
    .animate-in {
        animation: slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    }
    @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
